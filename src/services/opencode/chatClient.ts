import type {
  ChatAuth,
  ChatMessage,
  FileAttachment,
  MessageRole,
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

function extractData(json: any): any {
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data
  }
  return json
}

function formatTimestamp(timeVal: unknown): string {
  if (!timeVal) return new Date().toISOString()
  if (typeof timeVal === 'number') {
    return new Date(timeVal).toISOString()
  }
  return String(timeVal)
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

  const raw = await response.json()
  const data = extractData(raw)
  if (!Array.isArray(data)) return []

  return data.map((item: any) => ({
    id: String(item.id || item.sessionID || ''),
    title: String(item.title || item.name || 'Untitled session'),
    createdAt: formatTimestamp(item.time?.created || item.createdAt || item.created),
    updatedAt: formatTimestamp(item.time?.updated || item.updatedAt || item.updated),
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

  const raw = await response.json()
  const item = extractData(raw)
  return {
    id: String(item.id || item.sessionID || ''),
    title: String(item.title || item.name || title || 'New session'),
    createdAt: formatTimestamp(item.time?.created || item.createdAt || item.created),
    updatedAt: formatTimestamp(item.time?.updated || item.updatedAt || item.updated),
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

  const raw = await response.json()
  const data = extractData(raw)
  if (!Array.isArray(data)) return []

  return data.map((item: any, idx: number) => {
    const role: MessageRole = item.type === 'assistant' || item.role === 'assistant' ? 'assistant' : 'user'
    let content = ''
    const toolCalls: any[] = []

    if (typeof item.text === 'string') {
      content = item.text
    } else if (typeof item.content === 'string') {
      content = item.content
    } else if (Array.isArray(item.content)) {
      // OpenCode 2.2.5 structured content parts
      for (const part of item.content) {
        if (part.type === 'text') {
          content += (part.text || '')
        } else if (part.type === 'tool') {
          toolCalls.push({
            id: String(part.id || `tool_${idx}`),
            name: String(part.name || 'tool'),
            arguments: (part.state?.input || part.input || {}) as Record<string, unknown>,
            status: part.state?.status === 'error' ? 'failed' : (part.state?.status === 'running' ? 'running' : 'completed'),
            result: part.state?.content ? part.state.content.map((c: any) => c.text || JSON.stringify(c)).join('\n') : undefined,
            error: part.state?.error?.message,
          })
        }
      }
    } else if (item.payload?.text) {
      content = String(item.payload.text)
    }

    return {
      id: String(item.id || `msg_${idx}`),
      role,
      content,
      createdAt: formatTimestamp(item.time?.created || item.createdAt || item.timestamp),
      toolCalls: toolCalls.length > 0 ? toolCalls : (Array.isArray(item.toolCalls) ? item.toolCalls : undefined),
      pendingPermission: item.pendingPermission || undefined,
    }
  })
}

export async function switchSessionModel(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  modelId: string
): Promise<void> {
  const url = `${cleanBaseUrl(baseUrl)}/api/session/${encodeURIComponent(sessionId)}/model`
  const parts = modelId.split('/')
  const providerID = parts.length > 1 ? parts[0] : 'default'
  const id = parts.length > 1 ? parts.slice(1).join('/') : modelId

  await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: JSON.stringify({
      model: { id, providerID },
    }),
  })
}

export async function switchSessionAgent(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  agentId: string
): Promise<void> {
  const url = `${cleanBaseUrl(baseUrl)}/api/session/${encodeURIComponent(sessionId)}/agent`
  await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: JSON.stringify({
      agent: agentId,
    }),
  })
}

export async function sendPrompt(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  prompt: string,
  model?: string,
  agent?: string,
  files?: FileAttachment[]
): Promise<void> {
  if (model) {
    try {
      await switchSessionModel(baseUrl, auth, sessionId, model)
    } catch {}
  }

  if (agent && agent !== 'general') {
    try {
      await switchSessionAgent(baseUrl, auth, sessionId, agent)
    } catch {}
  }

  const url = `${cleanBaseUrl(baseUrl)}/api/session/${encodeURIComponent(sessionId)}/prompt`
  // OpenCode 2.2.5 accepts { text: prompt, files?: [...] }
  const payload: Record<string, unknown> = { text: prompt }

  if (files && files.length > 0) {
    payload.files = files.map((f) => {
      const dataUri = f.data.startsWith('data:')
        ? f.data
        : `data:${f.mime || 'application/octet-stream'};base64,${f.data}`
      return {
        uri: dataUri,
        data: f.data,
        mime: f.mime,
        name: f.name,
        source: { type: 'inline' },
      }
    })
  }

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

  const raw = await response.json()
  const data = extractData(raw)
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
    const raw = await response.json()
    const data = extractData(raw)

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

