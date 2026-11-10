import type { ChatAuth } from '@/types/chat'

export type PermissionEffect = 'allow' | 'ask' | 'deny'

export interface PermissionRule {
  id: string
  action: string
  resource: string
  effect: PermissionEffect
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

function normalizeEffect(value: unknown): PermissionEffect {
  const effect = String(value || '').toLowerCase()
  if (effect === 'allow' || effect === 'deny') return effect
  return 'ask'
}

export async function fetchSavedPermissions(baseUrl: string, auth: ChatAuth): Promise<PermissionRule[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/permission/saved`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to fetch permissions: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || ''),
      action: String(item.action || ''),
      resource: String(item.resource || ''),
      effect: normalizeEffect(item.effect),
    }))
    .filter((rule: PermissionRule) => Boolean(rule.id))
}

export async function updateSavedPermission(
  baseUrl: string,
  auth: ChatAuth,
  id: string,
  patch: { action?: string | null; resource?: string | null }
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/permission/saved/${encodeURIComponent(id)}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders(auth),
    body: JSON.stringify(patch),
  })
  if (!response.ok) throw new Error(`Failed to update permission: HTTP ${response.status}`)
}

export async function removeSavedPermission(baseUrl: string, auth: ChatAuth, id: string): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/permission/saved/${encodeURIComponent(id)}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: buildHeaders(auth),
  })
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to remove permission: HTTP ${response.status}`)
  }
}
