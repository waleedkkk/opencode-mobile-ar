import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ChatFilesSheet from '@/components/chat/ChatFilesSheet.vue'
import * as filesClient from '@/services/opencode/filesClient'
import type { FileEntry } from '@/services/opencode/filesClient'

const rootEntries: FileEntry[] = [
  { path: 'workspace/app/src', type: 'directory' },
  { path: 'workspace/app/package.json', type: 'file' },
]

describe('ChatFilesSheet.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.spyOn(filesClient, 'listDirectory').mockResolvedValue(rootEntries)
    vi.spyOn(filesClient, 'readFile').mockResolvedValue('{ "name": "demo" }')
  })

  it('lists directory entries and opens a file on click', async () => {
    const wrapper = mount(ChatFilesSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
        rootPath: '/workspace/app',
      },
      attachTo: document.body,
    })

    await flushPromises()

    expect(filesClient.listDirectory).toHaveBeenCalledWith(
      'http://127.0.0.1:4096',
      expect.any(Object),
      '/workspace/app'
    )
    expect(document.body.textContent).toContain('src')
    expect(document.body.textContent).toContain('package.json')

    const fileBtn = document.body.querySelector('[data-file-entry="workspace/app/package.json"]') as HTMLElement | null
    expect(fileBtn).not.toBeNull()
    fileBtn!.click()
    await flushPromises()

    expect(filesClient.readFile).toHaveBeenCalled()
    expect(document.body.textContent).toContain('{ "name": "demo" }')
    wrapper.unmount()
  })

  it('navigates into a directory when it is clicked', async () => {
    vi.spyOn(filesClient, 'listDirectory')
      .mockResolvedValueOnce(rootEntries)
      .mockResolvedValue([{ path: 'workspace/app/src/index.ts', type: 'file' as const }])

    const wrapper = mount(ChatFilesSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
        rootPath: '/workspace/app',
      },
      attachTo: document.body,
    })

    await flushPromises()

    const dirBtn = document.body.querySelector('[data-file-entry="workspace/app/src"]') as HTMLElement | null
    expect(dirBtn).not.toBeNull()
    dirBtn!.click()
    await flushPromises()

    expect(filesClient.listDirectory).toHaveBeenCalledWith(
      'http://127.0.0.1:4096',
      expect.any(Object),
      'workspace/app/src'
    )
    wrapper.unmount()
  })
})
