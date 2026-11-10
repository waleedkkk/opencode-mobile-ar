import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchProviders,
  fetchDefaultModel,
  switchSessionModel,
  switchSessionAgent,
} from '@/services/opencode/modelsClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('modelsClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchProviders maps provider and model info', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'anthropic',
            name: 'Anthropic',
            models: [
              { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
              { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
            ],
          },
        ],
      }),
    } as Response)

    const providers = await fetchProviders(baseUrl, auth)

    expect(providers).toHaveLength(1)
    expect(providers[0].id).toBe('anthropic')
    expect(providers[0].models).toHaveLength(2)
    expect(providers[0].models[1].id).toBe('anthropic/claude-3-opus')
  })

  it('fetchDefaultModel returns the server default model', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'gemini-3.8-flash', providerID: 'antigravity' } }),
    } as Response)

    const model = await fetchDefaultModel(baseUrl, auth)

    expect(model).toBe('gemini-3.8-flash')
  })

  it('switchSessionModel posts provider and model ids', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
    } as Response)

    await switchSessionModel(baseUrl, auth, 'ses_1', 'anthropic/claude-3-opus')

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:4096/api/session/ses_1/model',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: { id: 'claude-3-opus', providerID: 'anthropic' },
        }),
      })
    )
  })

  it('switchSessionAgent posts the agent id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
    } as Response)

    await switchSessionAgent(baseUrl, auth, 'ses_1', 'coder')

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:4096/api/session/ses_1/agent',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ agent: 'coder' }),
      })
    )
  })
})
