import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listPtys,
  requestPtyToken,
  buildPtySocketUrl,
} from '@/services/opencode/ptyClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('ptyClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('listPtys maps running terminal sessions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'pty_1', title: 'bash', cols: 80, rows: 24 },
          { id: 'pty_2', title: 'node', cols: 100, rows: 30 },
        ],
      }),
    } as Response)

    const ptys = await listPtys(baseUrl, auth)

    expect(ptys).toHaveLength(2)
    expect(ptys[0].id).toBe('pty_1')
    expect(ptys[0].title).toBe('bash')
  })

  it('requestPtyToken returns the connection token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: 'tok_abc', url: 'ws://x/y' } }),
    } as Response)

    const token = await requestPtyToken(baseUrl, auth, 'pty_1')

    expect(token).toBe('tok_abc')
  })

  it('buildPtySocketUrl builds a ws(s) url with token and base path', () => {
    const httpUrl = buildPtySocketUrl('http://127.0.0.1:4096', 'pty_1', 'tok_abc')
    expect(httpUrl).toBe('ws://127.0.0.1:4096/api/pty/pty_1/connect?token=tok_abc')

    const httpsUrl = buildPtySocketUrl('https://opencode.example.com', 'pty_1', 'tok_abc')
    expect(httpsUrl).toBe('wss://opencode.example.com/api/pty/pty_1/connect?token=tok_abc')
  })

  it('buildPtySocketUrl keeps an existing base path', () => {
    const url = buildPtySocketUrl('http://127.0.0.1:4096/base', 'pty_9', 't')
    expect(url).toBe('ws://127.0.0.1:4096/base/api/pty/pty_9/connect?token=t')
  })
})
