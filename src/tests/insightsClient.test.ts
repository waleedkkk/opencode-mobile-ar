import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchSessionStats,
  fetchMcpServers,
  fetchIntegrations,
  fetchWorktrees,
  runWebSearch,
} from '@/services/opencode/insightsClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('insightsClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchSessionStats maps usage, cost and model breakdown', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          range: { from: 1, to: 2 },
          sessions: 4,
          prompts: 12,
          tokens: { input: 1000, output: 200, reasoning: 50, cache: { read: 10, write: 5 } },
          cost: 0.42,
          models: [{ model: { id: 'gpt', providerID: 'openai' }, cost: 0.42, tokens: { input: 1000, output: 200, reasoning: 50, cache: { read: 0, write: 0 } } }],
        },
      }),
    } as Response)

    const stats = await fetchSessionStats(baseUrl, auth)

    expect(stats.sessions).toBe(4)
    expect(stats.prompts).toBe(12)
    expect(stats.totalTokens).toBe(1250)
    expect(stats.cost).toBe(0.42)
    expect(stats.models).toHaveLength(1)
    expect(stats.models[0].id).toBe('gpt')
    expect(String((globalThis.fetch as any).mock.calls[0][0])).toContain('/api/experimental/session/stats')
  })

  it('fetchMcpServers maps server status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'github', name: 'GitHub', status: 'connected' }] }),
    } as Response)

    const servers = await fetchMcpServers(baseUrl, auth)

    expect(servers).toHaveLength(1)
    expect(servers[0].id).toBe('github')
    expect(servers[0].status).toBe('connected')
  })

  it('fetchIntegrations maps integration list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'github', name: 'GitHub', connected: true }] }),
    } as Response)

    const integrations = await fetchIntegrations(baseUrl, auth)

    expect(integrations[0].id).toBe('github')
    expect(integrations[0].connected).toBe(true)
  })

  it('fetchWorktrees maps branches and directories', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'wt_1', branch: 'feat/x', directory: '/w/x' }] }),
    } as Response)

    const worktrees = await fetchWorktrees(baseUrl, auth)

    expect(worktrees[0].branch).toBe('feat/x')
    expect(worktrees[0].directory).toBe('/w/x')
  })

  it('runWebSearch POSTs the query', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { results: [{ title: 'Result', url: 'https://x', snippet: '...' }] } }),
    } as Response)

    const results = await runWebSearch(baseUrl, auth, 'opencode docs', 'opencode')

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/websearch`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'opencode docs', providerID: 'opencode' }),
      })
    )
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Result')
  })
})
