import type { ChatAuth } from '@/types/chat'

export interface ProviderModelInfo {
  id: string
  disabled: boolean
}

export interface ProviderConfig {
  id: string
  name: string
  models: ProviderModelInfo[]
}

export interface ServerConfig {
  providers: ProviderConfig[]
  websearchProvider: string
}

export interface ShellInfo {
  path: string
  name: string
}

function buildHeaders(auth: ChatAuth): Record<string, string> {
  const raw = `${auth.username || 'opencode'}:${auth.password || ''}`
  const encoded = typeof btoa === 'function' ? btoa(raw) : ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(raw).toString('base64') : raw)
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Reads the OpenCode global configuration.
 *
 * `GET /api/config` returns a document envelope:
 * `[{ type: 'document', info: { providers: {…}, websearch: {…} } }]`.
 */
export async function fetchServerConfig(baseUrl: string, auth: ChatAuth): Promise<ServerConfig> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/config`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to fetch config: HTTP ${response.status}`)

  const raw = await response.json()
  const documents = Array.isArray(raw) ? raw : [raw]

  let info: any = null
  for (const doc of documents) {
    if (doc && doc.type === 'document' && doc.info) {
      info = doc.info
      break
    }
  }
  if (!info) return { providers: [], websearchProvider: '' }

  const providers: ProviderConfig[] = []
  const rawProviders = info.providers
  if (rawProviders && typeof rawProviders === 'object') {
    const byId = Array.isArray(rawProviders)
      ? rawProviders
      : Object.entries(rawProviders).map(([id, value]: [string, any]) => ({ id, ...value }))

    for (const entry of byId) {
      if (!entry || !entry.id) continue
      const models: ProviderModelInfo[] = []
      const rawModels = entry.models
      if (rawModels && typeof rawModels === 'object') {
        const entries = Array.isArray(rawModels)
          ? rawModels.map((m: any) => ({ id: String(m.id || m.modelID || ''), disabled: m.disabled === true }))
          : Object.entries(rawModels).map(([id, value]: [string, any]) => ({
              id,
              disabled: Boolean((value as any)?.disabled),
            }))
        for (const m of entries) {
          if (m.id) models.push({ id: m.id, disabled: m.disabled })
        }
      }
      providers.push({ id: String(entry.id), name: String(entry.name || entry.id), models })
    }
  }

  const websearch = info.websearch
  const websearchProvider = websearch && typeof websearch === 'object' ? String(websearch.provider || '') : ''

  return { providers, websearchProvider }
}

export async function fetchAvailableShells(baseUrl: string, auth: ChatAuth): Promise<ShellInfo[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/config/shell`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) return []

  const data = await response.json()
  const list = Array.isArray(data) ? data : []

  return list
    .filter((item: any) => item && item.acceptable === true)
    .map((item: any) => ({ path: String(item.path || ''), name: String(item.name || item.path || '') }))
    .filter((s: ShellInfo) => Boolean(s.path))
}

/**
 * Updates the global configuration. OpenCode 2.2.5 only accepts `{ shell }` —
 * anything else is rejected by the server, so the UI must treat the rest as read-only.
 */
export async function setServerShell(baseUrl: string, auth: ChatAuth, shell: string): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/experimental/config`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders(auth),
    body: JSON.stringify({ shell }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update config: HTTP ${response.status}`)
  }
}
