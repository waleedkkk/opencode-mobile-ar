import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchServerConfig,
  fetchAvailableShells,
  setServerShell,
} from '@/services/opencode/configClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('configClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('unwraps the document envelope into providers and websearch provider', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          type: 'document',
          info: {
            websearch: { provider: 'opencode' },
            providers: [
              {
                id: 'anthropic',
                name: 'Anthropic',
                models: {
                  'claude-3-5-sonnet': {},
                  'claude-3-opus': { disabled: true },
                },
              },
            ],
          },
        },
      ],
    } as Response)

    const config = await fetchServerConfig(baseUrl, auth)

    expect(config.providers).toHaveLength(1)
    expect(config.providers[0].id).toBe('anthropic')
    expect(config.providers[0].name).toBe('Anthropic')
    expect(config.providers[0].models).toHaveLength(2)
    expect(config.providers[0].models[0]).toEqual({ id: 'claude-3-5-sonnet', disabled: false })
    expect(config.providers[0].models[1]).toEqual({ id: 'claude-3-opus', disabled: true })
    expect(config.websearchProvider).toBe('opencode')
  })

  it('returns empty structures for unrecognised payloads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: true }),
    } as Response)

    const config = await fetchServerConfig(baseUrl, auth)
    expect(config.providers).toEqual([])
    expect(config.websearchProvider).toBe('')
  })

  it('fetchAvailableShells keeps only acceptable shells', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        { path: '/bin/sh', name: 'sh', acceptable: true },
        { path: '/bin/false', name: 'false', acceptable: false },
      ],
    } as Response)

    const shells = await fetchAvailableShells(baseUrl, auth)

    expect(shells).toEqual([{ path: '/bin/sh', name: 'sh' }])
  })

  it('setServerShell PATCHes { shell } to the experimental config endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
    } as Response)

    await setServerShell(baseUrl, auth, '/bin/bash')

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/experimental/config`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ shell: '/bin/bash' }),
      })
    )
  })

  it('setServerShell throws on a non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    await expect(setServerShell(baseUrl, auth, '/bin/bash')).rejects.toThrow()
  })
})
