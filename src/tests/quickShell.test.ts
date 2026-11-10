import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  runShellCommand,
  fetchLatestShellOutput,
} from '@/services/opencode/shellClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('quick shell service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('posts a shell command to the active session endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
    } as Response)

    await runShellCommand('http://127.0.0.1:4096', auth, 'ses_1', 'echo hi')

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:4096/api/session/ses_1/shell',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ command: 'echo hi' }),
      })
    )
  })

  it('extracts latest shell output from session messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'msg_1', type: 'shell', shellID: 'sh_1', command: 'echo hi', status: 'exited', exit: 0, output: { output: 'hi\n' } },
          { id: 'msg_2', type: 'user', text: 'normal message' },
        ],
      }),
    } as Response)

    const result = await fetchLatestShellOutput(baseUrl, auth, 'ses_1')
    expect(result).toEqual({
      shellId: 'sh_1',
      command: 'echo hi',
      status: 'exited',
      exitCode: 0,
      output: 'hi\n',
      truncated: false,
    })
  })

  it('returns null when no shell messages exist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'msg_1', type: 'user', text: 'hello' }] }),
    } as Response)

    const result = await fetchLatestShellOutput(baseUrl, auth, 'ses_1')
    expect(result).toBeNull()
  })
})
