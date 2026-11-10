import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listDirectory,
  readFile,
  findFiles,
  writeFile,
} from '@/services/opencode/filesClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('filesClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('listDirectory returns files and directories from the data envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { path: 'workspace/app/src', type: 'directory' },
          { path: 'workspace/app/package.json', type: 'file' },
        ],
      }),
    } as Response)

    const entries = await listDirectory(baseUrl, auth, '/workspace/app')

    expect(entries).toEqual([
      { path: 'workspace/app/src', type: 'directory' },
      { path: 'workspace/app/package.json', type: 'file' },
    ])
    const url = String((globalThis.fetch as any).mock.calls[0][0])
    expect(url).toContain('/api/fs/list')
    expect(url).toContain('path=%2Fworkspace%2Fapp')
  })

  it('readFile returns the raw file text content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => '{ "name": "demo" }',
    } as Response)

    const content = await readFile(baseUrl, auth, '/workspace/app/package.json')

    expect(content).toBe('{ "name": "demo" }')
    const url = String((globalThis.fetch as any).mock.calls[0][0])
    expect(url).toContain('/api/fs/read/workspace/app/package.json')
  })

  it('findFiles searches by query and maps the envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { path: 'workspace/app/index.ts', type: 'file' },
          { path: 'workspace/app/src', type: 'directory' },
        ],
      }),
    } as Response)

    const results = await findFiles(baseUrl, auth, 'index')

    expect(results).toHaveLength(2)
    const url = String((globalThis.fetch as any).mock.calls[0][0])
    expect(url).toContain('query=index')
  })

  it('writeFile posts raw content to the write endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
    } as Response)

    await writeFile(baseUrl, auth, '/workspace/app/notes.txt', 'hello')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/experimental/fs/write'),
      expect.objectContaining({
        method: 'POST',
        body: 'hello',
      })
    )
  })
})
