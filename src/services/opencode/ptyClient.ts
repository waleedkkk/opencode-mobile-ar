import type { ChatAuth } from '@/types/chat'

export interface PtySummary {
  id: string
  title: string
  cols: number
  rows: number
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

export async function listPtys(baseUrl: string, auth: ChatAuth): Promise<PtySummary[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/pty`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to list PTYs: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data.map((item: any) => ({
    id: String(item.id || ''),
    title: String(item.title || 'terminal'),
    cols: Number(item.cols) || 80,
    rows: Number(item.rows) || 24,
  }))
}

export async function requestPtyToken(
  baseUrl: string,
  auth: ChatAuth,
  ptyId: string
): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/pty/${encodeURIComponent(ptyId)}/connect-token`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to request PTY token: HTTP ${response.status}`)

  const data = extractData(await response.json())
  return String(data?.token || '')
}

export function buildPtySocketUrl(baseUrl: string, ptyId: string, token: string): string {
  const clean = baseUrl.replace(/\/+$/, '')
  const wsScheme = clean.startsWith('https') ? 'wss' : 'ws'
  const withoutScheme = clean.replace(/^https?:\/\//, '')
  return `${wsScheme}://${withoutScheme}/api/pty/${encodeURIComponent(ptyId)}/connect?token=${encodeURIComponent(token)}`
}
