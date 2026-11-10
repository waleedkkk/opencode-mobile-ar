import type { ChatAuth } from '@/types/chat'

export type VcsFileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'unknown'

export interface VcsStatusFile {
  path: string
  status: VcsFileStatus
  additions: number
  deletions: number
}

export interface VcsStatus {
  files: VcsStatusFile[]
}

export interface VcsInfo {
  branchName: string
  isRepository: boolean
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

function normalizeStatus(value: unknown): VcsFileStatus {
  const status = String(value || '').toLowerCase()
  if (['added', 'modified', 'deleted', 'renamed', 'untracked'].includes(status)) {
    return status as VcsFileStatus
  }
  return 'unknown'
}

export async function fetchVcsStatus(baseUrl: string, auth: ChatAuth): Promise<VcsStatus> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/vcs/status`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to fetch VCS status: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return { files: [] }

  return {
    files: data
      .filter((item: any) => item && typeof item.path === 'string')
      .map((item: any) => ({
        path: String(item.path),
        status: normalizeStatus(item.status),
        additions: Number(item.additions) || 0,
        deletions: Number(item.deletions) || 0,
      })),
  }
}

export async function fetchVcsDiff(baseUrl: string, auth: ChatAuth): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/vcs/diff`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to fetch VCS diff: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (typeof data === 'string') return data
  if (data && typeof data.diff === 'string') return data.diff
  return ''
}

export async function fetchVcsBranches(baseUrl: string, auth: ChatAuth): Promise<string[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/vcs/branch`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to fetch VCS branches: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data.map((item: any) => String(item.name || item.id || '')).filter(Boolean)
}

export async function fetchVcsInfo(baseUrl: string, auth: ChatAuth): Promise<VcsInfo> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/vcs`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to fetch VCS info: HTTP ${response.status}`)

  const data = extractData(await response.json())
  const branch = data?.branch || {}
  const name = typeof branch.name === 'string' ? branch.name : ''

  return {
    branchName: name,
    isRepository: Boolean(name),
  }
}
