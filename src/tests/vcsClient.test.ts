import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchVcsStatus,
  fetchVcsDiff,
  fetchVcsBranches,
  fetchVcsInfo,
} from '@/services/opencode/vcsClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('vcsClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchVcsStatus maps changed files with status codes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { path: 'src/app.ts', status: 'modified', additions: 10, deletions: 2 },
          { path: 'src/new.ts', status: 'added' },
        ],
      }),
    } as Response)

    const status = await fetchVcsStatus(baseUrl, auth)

    expect(status.files).toHaveLength(2)
    expect(status.files[0].path).toBe('src/app.ts')
    expect(status.files[0].additions).toBe(10)
    expect(String((globalThis.fetch as any).mock.calls[0][0])).toContain('/api/vcs/status')
  })

  it('fetchVcsDiff returns the raw diff text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { diff: '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n' } }),
    } as Response)

    const diff = await fetchVcsDiff(baseUrl, auth)

    expect(diff).toContain('+++ b/x')
  })

  it('fetchVcsBranches returns the branch list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ name: 'main' }, { name: 'feat/x' }] }),
    } as Response)

    const branches = await fetchVcsBranches(baseUrl, auth)

    expect(branches).toEqual(['main', 'feat/x'])
  })

  it('fetchVcsInfo returns the current branch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { branch: { name: 'main', current: true } } }),
    } as Response)

    const info = await fetchVcsInfo(baseUrl, auth)

    expect(info.branchName).toBe('main')
    expect(info.isRepository).toBe(true)
  })

  it('fetchVcsInfo reports a non-repository when branch data is absent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { branch: {} } }),
    } as Response)

    const info = await fetchVcsInfo(baseUrl, auth)

    expect(info.isRepository).toBe(false)
  })
})
