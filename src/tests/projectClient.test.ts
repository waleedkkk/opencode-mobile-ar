import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchProjects,
  updateProject,
  fetchLocation,
  reloadLocation,
  moveSession,
  compactSession,
} from '@/services/opencode/projectClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('projectClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchProjects returns project ids and directories', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'prj_1', directory: '/workspace/app', name: 'app' },
          { id: 'prj_2', directory: '/workspace/other' },
        ],
      }),
    } as Response)

    const projects = await fetchProjects(baseUrl, auth)

    expect(projects).toHaveLength(2)
    expect(projects[0].id).toBe('prj_1')
    expect(projects[0].directory).toBe('/workspace/app')
    expect(projects[0].name).toBe('app')
    expect(String((globalThis.fetch as any).mock.calls[0][0])).toContain('/api/project')
  })

  it('fetchLocation unwraps directory and project', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        location: { directory: '/workspace/app', project: { id: 'prj_1', directory: '/workspace/app' } },
      }),
    } as Response)

    const location = await fetchLocation(baseUrl, auth)

    expect(location.directory).toBe('/workspace/app')
    expect(location.projectID).toBe('prj_1')
  })

  it('reloadLocation POSTs to the reload endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)

    await reloadLocation(baseUrl, auth)

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/location/reload`,
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('updateProject PATCHes the project', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)

    await updateProject(baseUrl, auth, 'prj_1', { name: 'new name' })

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/project/prj_1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'new name' }),
      })
    )
  })

  it('moveSession POSTs { directory }', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)

    await moveSession(baseUrl, auth, 'ses_1', '/workspace/other')

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/session/ses_1/move`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ directory: '/workspace/other' }),
      })
    )
  })

  it('compactSession POSTs an optional message id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)

    await compactSession(baseUrl, auth, 'ses_1', 'msg_9')

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/session/ses_1/compact`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ id: 'msg_9' }),
      })
    )
  })

  it('compactSession omits the body when no message is given', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)

    await compactSession(baseUrl, auth, 'ses_1')

    expect((fetchSpy.mock.calls[0][1] as any).body).toBeUndefined()
  })
})
