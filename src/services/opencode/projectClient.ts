import type { ChatAuth } from '@/types/chat'

export interface ProjectSummary {
  id: string
  name: string
  directory: string
}

export interface LocationInfo {
  directory: string
  projectID: string
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

export async function fetchProjects(baseUrl: string, auth: ChatAuth): Promise<ProjectSummary[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/project`
  const response = await fetch(url, { method: 'GET', headers: buildHeaders(auth) })
  if (!response.ok) throw new Error(`Failed to fetch projects: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || ''),
      name: String(item.name || item.id || ''),
      directory: String(item.directory || ''),
    }))
    .filter((p: ProjectSummary) => Boolean(p.id))
}

export async function updateProject(
  baseUrl: string,
  auth: ChatAuth,
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/project/${encodeURIComponent(id)}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders(auth),
    body: JSON.stringify(patch),
  })
  if (!response.ok) throw new Error(`Failed to update project: HTTP ${response.status}`)
}

export async function fetchLocation(baseUrl: string, auth: ChatAuth): Promise<LocationInfo> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/location`
  const response = await fetch(url, { method: 'GET', headers: buildHeaders(auth) })
  if (!response.ok) throw new Error(`Failed to fetch location: HTTP ${response.status}`)

  const raw = await response.json()
  const location = raw?.location ?? raw?.data ?? raw
  return {
    directory: String(location?.directory || ''),
    projectID: String(location?.project?.id || location?.projectID || ''),
  }
}

export async function reloadLocation(baseUrl: string, auth: ChatAuth): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/location/reload`
  const response = await fetch(url, { method: 'POST', headers: buildHeaders(auth) })
  if (!response.ok) throw new Error(`Failed to reload location: HTTP ${response.status}`)
}

export async function moveSession(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  directory: string
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/session/${encodeURIComponent(sessionId)}/move`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: JSON.stringify({ directory }),
  })
  if (!response.ok) throw new Error(`Failed to move session: HTTP ${response.status}`)
}

export async function compactSession(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  messageId?: string
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/session/${encodeURIComponent(sessionId)}/compact`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: messageId ? JSON.stringify({ id: messageId }) : undefined,
  })
  if (!response.ok) throw new Error(`Failed to compact session: HTTP ${response.status}`)
}
