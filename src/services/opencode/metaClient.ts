import type { ChatAuth } from '@/types/chat'

export interface MetaItem {
  id: string
  name: string
  description: string
}

function buildHeaders(auth: ChatAuth): Record<string, string> {
  const raw = `${auth.username || 'opencode'}:${auth.password || ''}`
  const encoded = typeof btoa === 'function' ? btoa(raw) : ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(raw).toString('base64') : raw)
  return { Authorization: `Basic ${encoded}` }
}

function extractData(json: any): any {
  if (json && typeof json === 'object' && 'data' in json) return json.data
  return json
}

export async function fetchCommands(baseUrl: string, auth: ChatAuth): Promise<MetaItem[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/command`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) return []

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data
    .map((item: any) => ({
      id: String(item.name || item.id || ''),
      name: String(item.name || item.id || ''),
      description: String(item.description || ''),
    }))
    .filter((item: MetaItem) => Boolean(item.id))
}

export async function fetchSkills(baseUrl: string, auth: ChatAuth): Promise<MetaItem[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/skill`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) return []

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data
    .map((item: any) => ({
      id: String(item.id || item.name || ''),
      name: String(item.name || item.id || ''),
      description: String(item.description || ''),
    }))
    .filter((item: MetaItem) => Boolean(item.id))
}
