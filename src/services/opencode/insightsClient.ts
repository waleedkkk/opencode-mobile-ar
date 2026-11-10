import type { ChatAuth } from '@/types/chat'

export interface SessionStats {
  sessions: number
  prompts: number
  totalTokens: number
  cost: number
  models: { id: string; cost: number; tokens: number }[]
}

export interface McpServerInfo {
  id: string
  name: string
  status: string
}

export interface IntegrationInfo {
  id: string
  name: string
  connected: boolean
}

export interface WorktreeInfo {
  id: string
  branch: string
  directory: string
}

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
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

function totalOf(tokens: any): number {
  if (!tokens || typeof tokens !== 'object') return 0
  return (Number(tokens.input) || 0) + (Number(tokens.output) || 0) + (Number(tokens.reasoning) || 0)
}

export async function fetchSessionStats(baseUrl: string, auth: ChatAuth): Promise<SessionStats> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/experimental/session/stats`
  const response = await fetch(url, { method: 'GET', headers: buildHeaders(auth) })
  if (!response.ok) throw new Error(`Failed to fetch stats: HTTP ${response.status}`)

  const data = extractData(await response.json())
  if (!data || typeof data !== 'object') {
    return { sessions: 0, prompts: 0, totalTokens: 0, cost: 0, models: [] }
  }

  const models = Array.isArray(data.models)
    ? data.models.map((m: any) => ({
        id: String(m?.model?.id || m?.model || ''),
        cost: Number(m?.cost) || 0,
        tokens: totalOf(m?.tokens),
      }))
    : []

  return {
    sessions: Number(data.sessions) || 0,
    prompts: Number(data.prompts) || 0,
    totalTokens: totalOf(data.tokens),
    cost: Number(data.cost) || 0,
    models,
  }
}

export async function fetchMcpServers(baseUrl: string, auth: ChatAuth): Promise<McpServerInfo[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/mcp`
  const response = await fetch(url, { method: 'GET', headers: buildHeaders(auth) })
  if (!response.ok) return []

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data
    .filter((item: any) => item && item.id)
    .map((item: any) => ({
      id: String(item.id),
      name: String(item.name || item.id),
      status: String(item.status || 'unknown'),
    }))
}

export async function fetchIntegrations(baseUrl: string, auth: ChatAuth): Promise<IntegrationInfo[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/integration`
  const response = await fetch(url, { method: 'GET', headers: buildHeaders(auth) })
  if (!response.ok) return []

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data
    .filter((item: any) => item && item.id)
    .map((item: any) => ({
      id: String(item.id),
      name: String(item.name || item.id),
      connected: item.connected === true,
    }))
}

export async function fetchWorktrees(baseUrl: string, auth: ChatAuth): Promise<WorktreeInfo[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/worktree`
  const response = await fetch(url, { method: 'GET', headers: buildHeaders(auth) })
  if (!response.ok) return []

  const data = extractData(await response.json())
  if (!Array.isArray(data)) return []

  return data
    .filter((item: any) => item && item.id)
    .map((item: any) => ({
      id: String(item.id),
      branch: String(item.branch || ''),
      directory: String(item.directory || ''),
    }))
}

export async function runWebSearch(
  baseUrl: string,
  auth: ChatAuth,
  query: string,
  providerID?: string
): Promise<WebSearchResult[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/websearch`
  const payload: Record<string, string> = { query }
  if (providerID) payload.providerID = providerID

  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Search failed: HTTP ${response.status}`)

  const data = extractData(await response.json())
  const results = Array.isArray(data) ? data : data?.results

  if (!Array.isArray(results)) return []

  return results.map((item: any) => ({
    title: String(item?.title || ''),
    url: String(item?.url || ''),
    snippet: String(item?.snippet || ''),
  }))
}
