import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchCredentials,
  renameCredential,
} from '@/services/opencode/credentialClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('credentialClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('redacts the raw secret and exposes only safe metadata', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'cred_1',
            integrationID: 'anthropic',
            label: 'API key',
            active: true,
            value: { type: 'key', key: 'sk-super-secret-value' },
          },
          {
            id: 'cred_2',
            integrationID: 'github',
            active: false,
            value: { type: 'oauth', access: 'ya29.secret', refresh: '1//secret' },
          },
        ],
      }),
    } as Response)

    const credentials = await fetchCredentials(baseUrl, auth)

    expect(credentials).toHaveLength(2)
    expect(credentials[0].id).toBe('cred_1')
    expect(credentials[0].label).toBe('API key')
    expect(credentials[0].integrationID).toBe('anthropic')
    expect(credentials[0].active).toBe(true)
    // No secret material anywhere in the result.
    const serialized = JSON.stringify(credentials)
    expect(serialized).not.toContain('sk-super-secret-value')
    expect(serialized).not.toContain('ya29.secret')
    expect(serialized).not.toContain('1//secret')
    expect(serialized).not.toContain('value')
  })

  it('falls back to the integration id when a label is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'cred_3', integrationID: 'google', value: { type: 'key', key: 'x' } }] }),
    } as Response)

    const credentials = await fetchCredentials(baseUrl, auth)
    expect(credentials[0].label).toBe('google')
    expect(credentials[0].active).toBe(false)
  })

  it('renameCredential PATCHes { label }', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)

    await renameCredential(baseUrl, auth, 'cred_1', 'Work key')

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/credential/cred_1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ label: 'Work key' }),
      })
    )
  })

  it('renameCredential throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)
    await expect(renameCredential(baseUrl, auth, 'cred_1', 'x')).rejects.toThrow()
  })
})
