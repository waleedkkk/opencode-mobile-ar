import type { ChatAuth } from '@/types/chat'

export interface ProviderModel {
  id: string
  name: string
}

export interface ProviderInfo {
  id: string
  name: string
  models: ProviderModel[]
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

export async function fetchProviders(baseUrl: string, auth: ChatAuth): Promise<ProviderInfo[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/provider`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to fetch providers: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data.map((item: any) => ({
    id: String(item.id || item.providerID || ''),
    name: String(item.name || item.id || ''),
    models: Array.isArray(item.models)
      ? item.models.map((m: any) => ({
          id: String(m.id || ''),
          name: String(m.name || m.id || ''),
        }))
      : [],
  }))
}

export async function fetchDefaultModel(baseUrl: string, auth: ChatAuth): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/model/default`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) return ''

  const data = extractData(await response.json())
  return String(data?.id || '')
}

export function splitModelId(modelId: string): { providerID: string; id: string } {
  const parts = String(modelId).split('/')
  if (parts.length > 1) {
    return { providerID: parts[0], id: parts.slice(1).join('/') }
  }
  return { providerID: 'default', id: modelId }
}

export async function switchSessionModel(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  modelId: string
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/session/${encodeURIComponent(sessionId)}/model`
  const { providerID, id } = splitModelId(modelId)

  await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: JSON.stringify({ model: { id, providerID } }),
  })
}

export async function switchSessionAgent(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  agentId: string
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/session/${encodeURIComponent(sessionId)}/agent`

  await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: JSON.stringify({ agent: agentId }),
  })
}
