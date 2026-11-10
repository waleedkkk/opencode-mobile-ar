import type { ChatAuth } from '@/types/chat'

export interface SessionDetail {
  id: string
  title: string
  projectID: string
  agent: string
  createdAt: number
  updatedAt: number
}

export interface SessionExport {
  id: string
  url: string
}

function buildHeaders(auth: ChatAuth): Record<string, string> {
  const raw = `${auth.username || 'opencode'}:${auth.password || ''}`
  const encoded = typeof btoa === 'function' ? btoa(raw) : ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(raw).toString('base64') : raw)
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  }
}

function extractData(json: any): any {
  if (json && typeof json === 'object' && 'data' in json) return json.data
  return json
}

export async function fetchSessionDetail(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string
): Promise<SessionDetail> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/session/${encodeURIComponent(sessionId)}`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to fetch session: HTTP ${response.status}`)

  const data = extractData(await response.json())
  return {
    id: String(data?.id || sessionId),
    title: String(data?.title || ''),
    projectID: String(data?.projectID || ''),
    agent: String(data?.agent || ''),
    createdAt: Number(data?.time?.created) || 0,
    updatedAt: Number(data?.time?.updated) || 0,
  }
}

export async function forkSession(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  messageId?: string
): Promise<{ id: string }> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/session/${encodeURIComponent(sessionId)}/fork`
  const body = messageId ? JSON.stringify({ before: messageId }) : undefined

  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body,
  })
  if (!response.ok) throw new Error(`Failed to fork session: HTTP ${response.status}`)

  const data = extractData(await response.json())
  return { id: String(data?.id || '') }
}

export async function exportSession(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string
): Promise<SessionExport> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/experimental/session/${encodeURIComponent(sessionId)}/export`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to export session: HTTP ${response.status}`)

  const data = extractData(await response.json())
  return {
    id: String(data?.id || ''),
    url: String(data?.url || ''),
  }
}
