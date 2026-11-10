import type { ChatAuth } from '@/types/chat'
import { readFile } from './filesClient'

function buildHeaders(auth: ChatAuth): Record<string, string> {
  const raw = `${auth.username || 'opencode'}:${auth.password || ''}`
  const encoded = typeof btoa === 'function' ? btoa(raw) : ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(raw).toString('base64') : raw)
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/octet-stream',
  }
}

export async function readFileContent(baseUrl: string, auth: ChatAuth, path: string): Promise<string> {
  return readFile(baseUrl, auth, path)
}

export async function writeFileContent(baseUrl: string, auth: ChatAuth, path: string, content: string): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/experimental/fs/write?path=${encodeURIComponent(path)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: content,
  })
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to save file: HTTP ${response.status}`)
  }
}
