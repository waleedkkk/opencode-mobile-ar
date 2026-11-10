import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  readFileContent,
  writeFileContent,
} from '@/services/opencode/fileEditorClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('fileEditorClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('reads file content verbatim', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'line1\nline2',
    } as Response)

    const content = await readFileContent(baseUrl, auth, '/w/app/a.ts')
    expect(content).toBe('line1\nline2')
  })

  it('round-trips a read-then-write', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, text: async () => 'original' } as Response)
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response)

    const content = await readFileContent(baseUrl, auth, '/w/app/a.ts')
    const next = content + '\nappended'
    await writeFileContent(baseUrl, auth, '/w/app/a.ts', next)

    const writeCall = (globalThis.fetch as any).mock.calls[1]
    expect(writeCall[1].method).toBe('POST')
    expect(writeCall[1].body).toBe(next)
    // raw body, no JSON envelope
    expect(writeCall[1].body.startsWith('{')).toBe(false)
  })

  it('throws on a failed write', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)
    await expect(writeFileContent(baseUrl, auth, '/w/a.ts', 'x')).rejects.toThrow()
  })
})
