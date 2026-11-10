import type { ChatAuth } from '@/types/chat'

export interface ShellResult {
  shellId: string
  command: string
  status: string
  exitCode: number | null
  output: string
  truncated: boolean
}

function base64AuthHeader(auth: ChatAuth): Record<string, string> {
  const raw = `${auth.username || 'opencode'}:${auth.password || ''}`
  const encoded = typeof btoa === 'function' ? btoa(raw) : ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(raw).toString('base64') : raw)
  return { Authorization: `Basic ${encoded}` }
}

export async function runShellCommand(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  command: string
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/session/${encodeURIComponent(sessionId)}/shell`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...base64AuthHeader(auth),
    },
    body: JSON.stringify({ command }),
  })

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to run shell command: HTTP ${response.status}`)
  }
}

export async function fetchLatestShellOutput(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string
): Promise<ShellResult | null> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/session/${encodeURIComponent(sessionId)}/message`
  const response = await fetch(url, {
    method: 'GET',
    headers: base64AuthHeader(auth),
  })

  if (!response.ok) return null

  const raw = await response.json()
  const data = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : [])

  const shellMessages = data.filter((m: any) => m && m.type === 'shell')
  if (shellMessages.length === 0) return null

  // The API returns messages newest-first
  const latest = shellMessages[0]
  return {
    shellId: String(latest.shellID || latest.id || ''),
    command: String(latest.command || ''),
    status: String(latest.status || ''),
    exitCode: typeof latest.exit === 'number' ? latest.exit : null,
    output: String(latest.output?.output || ''),
    truncated: Boolean(latest.output?.truncated),
  }
}
