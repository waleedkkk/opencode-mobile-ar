import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchProviders } from '@/services/opencode/modelsClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('fetchProviders model merging', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('attaches models from every config document, not just the first', async () => {
    vi.spyOn(globalThis, 'fetch')
      // /api/provider
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 'opencode', name: 'Personal / OpenCode' },
            { id: 'nvidia', name: 'Nvidia' },
            { id: 'beatapi', name: 'BeatAPI' },
          ],
        }),
      } as Response)
      // /api/config — models split across three documents
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { type: 'document', info: { providers: { opencode: { name: 'Personal / OpenCode', models: { 'claude-opus-5': {} } } } } },
          { type: 'document', info: { providers: { beatapi: { name: 'BeatAPI', models: { 'gpt-5o': {} } } } } },
          { type: 'directory', info: {} },
        ],
      } as Response)

    const providers = await fetchProviders(baseUrl, auth)

    const byId = new Map(providers.map((p) => [p.id, p]))
    expect(byId.get('opencode')!.models.map((m) => m.id)).toEqual(['claude-opus-5'])
    expect(byId.get('beatapi')!.models.map((m) => m.id)).toEqual(['gpt-5o'])
    // a provider with no config entry keeps an empty list, it is not dropped
    expect(byId.get('nvidia')!.models).toEqual([])
    // metadata from /api/provider wins for the name
    expect(byId.get('opencode')!.name).toBe('Personal / OpenCode')
  })

  it('is resilient when the config endpoint fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'nvidia', name: 'Nvidia' }] }),
      } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)

    const providers = await fetchProviders(baseUrl, auth)
    expect(providers).toHaveLength(1)
    expect(providers[0].id).toBe('nvidia')
    expect(providers[0].models).toEqual([])
  })
})
