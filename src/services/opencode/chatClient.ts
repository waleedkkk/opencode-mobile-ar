import type {
  ChatAuth,
  ChatMessage,
  SessionInfo,
} from '@/types/chat'

function buildHeaders(auth: ChatAuth, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...extra,
  }

  if (auth.username || auth.password) {
    const raw = `${auth.username || 'opencode'}:${auth.password || ''}`
    const encoded = typeof btoa === 'function' ? btoa(raw) : Buffer.from(raw).toString('base64')
    headers['Authorization'] = `Basic ${encoded}`
  }

  return headers
}

function cleanBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

export async function fetchSessions(baseUrl: string, auth: ChatAuth): Promise<SessionInfo[]> {
  const url = `${cleanBaseUrl(baseUrl)}/api/session`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: HTTP ${response.status}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) return []

  return data.map((item: any) => ({
    id: String(item.id || item.sessionID || ''),
    title: String(item.title || item.name || 'Untitled session'),
    createdAt: String(item.createdAt || item.created || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.updated || item.createdAt || new Date().toISOString()),
  }))
}

export async function createSession(baseUrl: string, auth: ChatAuth, title?: string): Promise<SessionInfo> {
  const url = `${cleanBaseUrl(baseUrl)}/api/session`
  const body = title ? JSON.stringify({ title }) : JSON.stringify({})

  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body,
  })

  if (!response.ok) {
    throw new Error(`Failed to create session: HTTP ${response.status}`)
  }

  const item = await response.json()
  return {
    id: String(item.id || item.sessionID || ''),
    title: String(item.title || item.name || title || 'New session'),
    createdAt: String(item.createdAt || item.created || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.updated || new Date().toISOString()),
  }
}

export async function fetchSessionMessages(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string
): Promise<ChatMessage[]> {
  const url = `${cleanBaseUrl(baseUrl)}/api/session/${encodeURIComponent(sessionId)}/message`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: HTTP ${response.status}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) return []

  return data.map((item: any, idx: number) => ({
    id: String(item.id || `msg_${idx}`),
    role: item.role === 'user' ? 'user' : 'assistant',
    content: String(item.content || item.text || ''),
    createdAt: String(item.createdAt || item.timestamp || new Date().toISOString()),
    toolCalls: Array.isArray(item.toolCalls) ? item.toolCalls : undefined,
    pendingPermission: item.pendingPermission || undefined,
  }))
}

export async function sendPrompt(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  prompt: string,
  model?: string,
  agent?: string
): Promise<void> {
  const url = `${cleanBaseUrl(baseUrl)}/api/session/${encodeURIComponent(sessionId)}/prompt`
  const payload: Record<string, string> = { prompt }
  if (model) payload.model = model
  if (agent) payload.agent = agent

  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to send prompt: HTTP ${response.status}`)
  }
}

export async function interruptSession(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string
): Promise<void> {
  const url = `${cleanBaseUrl(baseUrl)}/api/session/${encodeURIComponent(sessionId)}/interrupt`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to interrupt session: HTTP ${response.status}`)
  }
}

export async function replyPermission(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  requestId: string,
  decision: 'allow' | 'deny'
): Promise<void> {
  const url = `${cleanBaseUrl(baseUrl)}/api/session/${encodeURIComponent(sessionId)}/permission/${encodeURIComponent(requestId)}/reply`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: JSON.stringify({ decision }),
  })

  if (!response.ok) {
    throw new Error(`Failed to reply to permission: HTTP ${response.status}`)
  }
}

export async function fetchAgents(baseUrl: string, auth: ChatAuth): Promise<string[]> {
  const url = `${cleanBaseUrl(baseUrl)}/api/agent`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })

  if (!response.ok) return ['general']

  const data = await response.json()
  if (!Array.isArray(data)) return ['general']

  return data.map((a: any) => String(a.id || a.name || a)).filter(Boolean)
}

export async function fetchModels(baseUrl: string, auth: ChatAuth): Promise<string[]> {
  const url = `${cleanBaseUrl(baseUrl)}/api/config`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(auth),
    })

    if (!response.ok) return []
    const data = await response.json()

    const models: string[] = []
    if (data && Array.isArray(data.providers)) {
      for (const provider of data.providers) {
        if (Array.isArray(provider.models)) {
          for (const m of provider.models) {
            if (m.id) models.push(m.id)
          }
        }
      }
    }
    return models
  } catch {
    return []
  }
}
