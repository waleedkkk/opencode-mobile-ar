import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchSavedPermissions,
  updateSavedPermission,
  removeSavedPermission,
} from '@/services/opencode/permissionClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('permissionClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('maps the saved permission ruleset', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'perm_1', action: 'shell', resource: 'git', effect: 'allow' },
          { id: 'perm_2', action: 'edit', resource: 'src/**', effect: 'ask' },
        ],
      }),
    } as Response)

    const rules = await fetchSavedPermissions(baseUrl, auth)

    expect(rules).toHaveLength(2)
    expect(rules[1].effect).toBe('ask')
    expect(rules[0].resource).toBe('git')
  })

  it('updateSavedPermission PATCHes action and resource', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)

    await updateSavedPermission(baseUrl, auth, 'perm_1', { action: 'shell', resource: 'docker' })

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/permission/saved/perm_1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ action: 'shell', resource: 'docker' }),
      })
    )
  })

  it('removeSavedPermission DELETEs the rule', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 204 } as Response)

    await removeSavedPermission(baseUrl, auth, 'perm_1')

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/permission/saved/perm_1`,
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)
    await expect(fetchSavedPermissions(baseUrl, auth)).rejects.toThrow()
  })
})
