import type { ChatAuth } from '@/types/chat'

export interface ProviderModel {
  id: string
  name: string
  disabled?: boolean
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

function dedupeModels(models: ProviderModel[]): ProviderModel[] {
  const seen = new Set<string>()
  const result: ProviderModel[] = []
  for (const model of models) {
    if (!model.id || seen.has(model.id)) continue
    seen.add(model.id)
    result.push(model)
  }
  return result
}

function modelsFromEntry(entry: any): ProviderModel[] {
  const raw = entry?.models
  if (Array.isArray(raw)) {
    return raw.map((m: any) => ({ id: String(m?.id || ''), name: String(m?.name || m?.id || '') }))
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([modelId, value]: [string, any]) => ({
      id: modelId,
      name: modelId,
      disabled: Boolean((value as any)?.disabled),
    }))
  }
  return []
}

/**
 * Reads `/api/config` and merges the providers declared in **every** document.
 * The endpoint returns several documents (`document`, `directory`, …) and the
 * model catalogue is split across them, so stopping at the first match loses
 * most providers.
 */
async function fetchConfigModels(baseUrl: string, auth: ChatAuth): Promise<Map<string, ProviderModel[]>> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/config`
  const response = await fetch(url, { method: 'GET', headers: buildHeaders(auth) })
  if (!response.ok) return new Map()

  const raw = await response.json()
  const documents = Array.isArray(raw) ? raw : [raw]
  const byProvider = new Map<string, ProviderModel[]>()

  for (const doc of documents) {
    const providers = doc?.info?.providers
    if (!providers || typeof providers !== 'object') continue

    const entries = Array.isArray(providers)
      ? providers
      : Object.entries(providers).map(([id, value]: [string, any]) => ({ id, ...value }))

    for (const entry of entries) {
      if (!entry || !entry.id) continue
      const id = String(entry.id)
      const existing = byProvider.get(id) ?? []
      byProvider.set(id, [...existing, ...modelsFromEntry(entry)])
    }
  }

  return byProvider
}

export async function fetchProviders(baseUrl: string, auth: ChatAuth): Promise<ProviderInfo[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/provider`
  const headers = buildHeaders(auth)
  const [response, configModels] = await Promise.all([
    fetch(url, { method: 'GET', headers }),
    fetchConfigModels(baseUrl, auth).catch(() => new Map<string, ProviderModel[]>()),
  ])
  if (!response.ok) throw new Error(`Failed to fetch providers: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  const providers: ProviderInfo[] = []
  for (const item of data) {
    if (!item || !item.id) continue
    const id = String(item.id)
    providers.push({
      id,
      name: String(item.name || item.id || ''),
      models: dedupeModels(configModels.get(id) ?? []),
    })
  }

  // Providers that only appear in the config catalogue still deserve a row.
  for (const [id, models] of configModels.entries()) {
    if (providers.some((p) => p.id === id)) continue
    providers.push({ id, name: id, models: dedupeModels(models) })
  }

  return providers
}

export interface ModelGroup {
  provider: string
  providerName: string
  models: string[]
}

/** Flattens the merged provider catalogue into display-ready model groups. */
export async function fetchModelGroups(baseUrl: string, auth: ChatAuth): Promise<ModelGroup[]> {
  const providers = await fetchProviders(baseUrl, auth)
  return providers.map((provider) => ({
    provider: provider.id,
    providerName: provider.name || provider.id,
    models: provider.models.map((model) => model.id),
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
