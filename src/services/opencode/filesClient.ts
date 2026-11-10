import type { ChatAuth } from '@/types/chat'

export type FileEntryType = 'file' | 'directory'

export interface FileEntry {
  path: string
  type: FileEntryType
}

function buildHeaders(auth: ChatAuth): Record<string, string> {
  const raw = `${auth.username || 'opencode'}:${auth.password || ''}`
  const encoded = typeof btoa === 'function' ? btoa(raw) : ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(raw).toString('base64') : raw)
  return { Authorization: `Basic ${encoded}` }
}

function encodePath(path: string): string {
  return path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')
}

function extractData(json: any): any {
  if (json && typeof json === 'object' && 'data' in json) return json.data
  return json
}

export async function listDirectory(
  baseUrl: string,
  auth: ChatAuth,
  path?: string
): Promise<FileEntry[]> {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/api/fs/list`)
  if (path) url.searchParams.set('path', path)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to list directory: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data
    .filter((item: any) => item && typeof item.path === 'string')
    .map((item: any) => ({
      path: String(item.path),
      type: item.type === 'directory' ? 'directory' : 'file',
    }))
}

export async function readFile(
  baseUrl: string,
  auth: ChatAuth,
  path: string
): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/fs/read/${encodePath(path)}`
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to read file: HTTP ${response.status}`)
  return response.text()
}

export async function findFiles(
  baseUrl: string,
  auth: ChatAuth,
  query: string,
  type?: 'file' | 'directory',
  limit?: number
): Promise<FileEntry[]> {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/api/fs/find`)
  url.searchParams.set('query', query)
  if (type) url.searchParams.set('type', type)
  if (typeof limit === 'number') url.searchParams.set('limit', String(limit))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(auth),
  })
  if (!response.ok) throw new Error(`Failed to find files: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data
    .filter((item: any) => item && typeof item.path === 'string')
    .map((item: any) => ({
      path: String(item.path),
      type: item.type === 'directory' ? 'directory' : 'file',
    }))
}

export async function writeFile(
  baseUrl: string,
  auth: ChatAuth,
  path: string,
  content: string
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/experimental/fs/write?path=${encodeURIComponent(path)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildHeaders(auth),
      'Content-Type': 'application/octet-stream',
    },
    body: content,
  })
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to write file: HTTP ${response.status}`)
  }
}

/** Derives a file name from a full path, ignoring trailing slashes. */
export function fileNameOf(path: string): string {
  const clean = path.replace(/\/+$/, '')
  const segments = clean.split('/')
  return segments[segments.length - 1] || clean
}

/** Derives the parent directory of a path. */
export function parentOf(path: string): string {
  const clean = path.replace(/\/+$/, '')
  const index = clean.lastIndexOf('/')
  if (index <= 0) return '/'
  return clean.substring(0, index)
}
