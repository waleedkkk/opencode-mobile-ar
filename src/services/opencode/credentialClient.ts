import type { ChatAuth } from '@/types/chat'

export interface CredentialSummary {
  id: string
  label: string
  integrationID: string
  active: boolean
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

/**
 * Lists credentials with the raw secret values stripped.
 *
 * `GET /api/credential` returns the API key / oauth tokens in `value`; those are
 * never propagated out of this client.
 */
export async function fetchCredentials(baseUrl: string, auth: ChatAuth): Promise<CredentialSummary[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/credential`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to fetch credentials: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  const summaries: CredentialSummary[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const id = String((item as any).id || '')
    if (!id) continue
    const integrationID = String((item as any).integrationID || '')
    const label = typeof (item as any).label === 'string' && (item as any).label ? (item as any).label : integrationID
    summaries.push({
      id,
      label,
      integrationID,
      active: (item as any).active === true,
    })
  }
  return summaries
}

/** Renames a credential. The server only accepts `{ label }` — keys are server-managed. */
export async function renameCredential(
  baseUrl: string,
  auth: ChatAuth,
  id: string,
  label: string
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/credential/${encodeURIComponent(id)}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders(auth),
    body: JSON.stringify({ label }),
  })

  if (!response.ok) {
    throw new Error(`Failed to rename credential: HTTP ${response.status}`)
  }
}
