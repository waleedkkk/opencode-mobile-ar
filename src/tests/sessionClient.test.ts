import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchSessionDetail,
  forkSession,
  exportSession,
} from '@/services/opencode/sessionClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('sessionClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchSessionDetail returns session metadata', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'ses_1',
          title: 'Refactor api',
          projectID: 'prj_1',
          agent: 'build',
          time: { created: 1794228206502, updated: 1794228306502 },
        },
      }),
    } as Response)

    const detail = await fetchSessionDetail(baseUrl, auth, 'ses_1')

    expect(detail.id).toBe('ses_1')
    expect(detail.title).toBe('Refactor api')
    expect(detail.agent).toBe('build')
  })

  it('forkSession posts the fork boundary when provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'ses_fork', title: 'Fork' } }),
    } as Response)

    await forkSession(baseUrl, auth, 'ses_1', 'msg_1')

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:4096/api/session/ses_1/fork',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ before: 'msg_1' }),
      })
    )
  })

  it('forkSession posts an empty body when no boundary is given', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'ses_fork2', title: 'Fork' } }),
    } as Response)

    await forkSession(baseUrl, auth, 'ses_1')

    const body = (fetchSpy.mock.calls[0][1] as any).body
    expect(body).toBeUndefined()
  })

  it('exportSession returns the download url from the response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'exp_1', url: 'https://example.com/export.json' } }),
    } as Response)

    const result = await exportSession(baseUrl, auth, 'ses_1')

    expect(result.id).toBe('exp_1')
    expect(result.url).toBe('https://example.com/export.json')
  })
})
