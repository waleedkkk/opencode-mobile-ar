import type { ChatMessage, SessionInfo } from '@/types/chat'

const CACHE_KEY = 'opencode-mobile.offlineChat.v1'
/** Keep the cached payload bounded so localStorage cannot blow past quota. */
const MAX_CACHED_MESSAGES = 200

export interface OfflineChatSnapshot {
  serverId: string
  serverName: string
  currentSessionId: string | null
  sessions: SessionInfo[]
  messages: ChatMessage[]
  savedAt: number
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function saveOfflineSnapshot(snapshot: OfflineChatSnapshot): void {
  try {
    // Drop attachment payloads: Base64 blobs are the largest part of a message.
    const trimmedMessages = snapshot.messages.slice(-MAX_CACHED_MESSAGES).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
      streaming: false,
      toolCalls: m.toolCalls,
      pendingPermission: m.pendingPermission,
      files: m.files?.map((f) => ({ id: f.id, name: f.name, mime: f.mime, data: '' })),
    }))

    const payload: OfflineChatSnapshot = {
      ...snapshot,
      messages: trimmedMessages as ChatMessage[],
      savedAt: Date.now(),
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn('[offlineCache] failed to persist snapshot:', err)
  }
}

export function loadOfflineSnapshot(): OfflineChatSnapshot | null {
  const raw = localStorage.getItem(CACHE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null

    const snapshot = parsed as Partial<OfflineChatSnapshot>

    if (!isNonEmptyString(snapshot.serverId) || !isNonEmptyString(snapshot.serverName)) {
      return null
    }
    if (!Array.isArray(snapshot.messages)) return null

    return {
      serverId: snapshot.serverId,
      serverName: snapshot.serverName,
      currentSessionId: typeof snapshot.currentSessionId === 'string' ? snapshot.currentSessionId : null,
      sessions: Array.isArray(snapshot.sessions) ? snapshot.sessions : [],
      messages: snapshot.messages as ChatMessage[],
      savedAt: typeof snapshot.savedAt === 'number' ? snapshot.savedAt : 0,
    }
  } catch {
    return null
  }
}

export function clearOfflineSnapshot(): void {
  localStorage.removeItem(CACHE_KEY)
}
