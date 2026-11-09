import type {
  ChatAuth,
  ChatMessage,
  SessionInfo,
  OpenCodeEvent,
  OpenCodeEventType,
} from '@/types/chat'

function buildHeaders(auth: ChatAuth, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...extra,
  }

  if (auth.username || auth.password) {
    const raw = `${auth.username || 'opencode'}:${auth.password || ''}`
    const encoded = typeof btoa === 'function' ? btoa(raw) : ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(raw).toString('base64') : raw)
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

function parseSseBlock(block: string): OpenCodeEvent | null {
  const lines = block.split('\n')
  let eventType = ''
  const dataLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(':')) continue
    if (trimmed.startsWith('event:')) {
      eventType = trimmed.substring(6).trim()
    } else if (trimmed.startsWith('data:')) {
      dataLines.push(trimmed.substring(5).trim())
    }
  }

  if (dataLines.length === 0) return null

  try {
    const dataStr = dataLines.join('\n')
    const parsed = JSON.parse(dataStr)

    const type = (eventType || parsed.type || 'session.status') as OpenCodeEventType
    const sessionId = String(parsed.sessionId || parsed.sessionID || '')

    return {
      type,
      sessionId,
      payload: parsed,
    }
  } catch {
    return null
  }
}

export class SseBuffer {
  private buffer = ''

  feed(chunk: string): OpenCodeEvent[] {
    this.buffer += chunk
    const parts = this.buffer.split('\n\n')
    this.buffer = parts.pop() || ''

    const events: OpenCodeEvent[] = []
    for (const part of parts) {
      const ev = parseSseBlock(part)
      if (ev) events.push(ev)
    }
    return events
  }
}

export function parseSseChunk(chunk: string): OpenCodeEvent[] {
  const buf = new SseBuffer()
  return buf.feed(chunk)
}

export function connectSseStream(
  baseUrl: string,
  auth: ChatAuth,
  onEvent: (event: OpenCodeEvent) => void,
  onError?: (err: Error) => void,
  onReconnect?: () => void
): () => void {
  let controller = new AbortController()
  let isClosed = false
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000]

  async function start(): Promise<void> {
    try {
      controller = new AbortController()
      const url = `${cleanBaseUrl(baseUrl)}/api/event`
      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(auth, { 'Accept': 'text/event-stream' }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`SSE stream failed: HTTP ${response.status}`)
      }

      const body = response.body
      if (!body) return

      if (reconnectAttempts > 0) {
        reconnectAttempts = 0
        onReconnect?.()
      }

      const reader = body.getReader()
      const decoder = new TextDecoder()
      const sseBuffer = new SseBuffer()

      while (!isClosed) {
        const { value, done } = await reader.read()
        if (done) break

        if (value) {
          const text = decoder.decode(value, { stream: true })
          const events = sseBuffer.feed(text)
          for (const ev of events) {
            onEvent(ev)
          }
        }
      }

      // Stream closed by server - schedule reconnect if not manually closed
      if (!isClosed) {
        scheduleReconnect()
      }
    } catch (err: any) {
      if (!isClosed && err?.name !== 'AbortError') {
        onError?.(err instanceof Error ? err : new Error(String(err)))
        scheduleReconnect()
      }
    }
  }

  function scheduleReconnect(): void {
    if (isClosed || reconnectTimer) return
    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempts, RECONNECT_DELAYS.length - 1)]
    reconnectAttempts++
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (!isClosed) {
        void start()
      }
    }, delay)
  }

  void start()

  return () => {
    isClosed = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    controller.abort()
  }
}

