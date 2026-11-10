import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatFilesSheet from '@/components/chat/ChatFilesSheet.vue'
import * as filesClient from '@/services/opencode/filesClient'
import * as editorClient from '@/services/opencode/fileEditorClient'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

const rootEntries = [
  { path: 'workspace/app/src/index.ts', type: 'file' as const },
  { path: 'workspace/app/src/util.ts', type: 'file' as const },
]

describe('ChatFilesSheet native editor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.spyOn(filesClient, 'listDirectory').mockResolvedValue(rootEntries)
    vi.spyOn(filesClient, 'readFile').mockResolvedValue('const a = 1')
    vi.spyOn(editorClient, 'writeFileContent').mockResolvedValue(undefined)
  })

  async function openSheet() {
    return mount(ChatFilesSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
        rootPath: '/workspace/app',
      },
      attachTo: document.body,
    })
  }

  it('opens a file and saves the edited content', async () => {
    const wrapper = await openSheet()
    await flushPromises()

    const fileBtn = document.body.querySelector('[data-file-entry="workspace/app/src/index.ts"]') as HTMLElement
    fileBtn.click()
    await flushPromises()

    const editBtn = document.body.querySelector('[data-action="edit-file"]') as HTMLElement | null
    expect(editBtn).not.toBeNull()
    editBtn!.click()
    await flushPromises()

    const textarea = document.body.querySelector('[data-editor-textarea]') as HTMLTextAreaElement | null
    expect(textarea).not.toBeNull()
    expect(textarea!.value).toBe('const a = 1')

    textarea!.value = 'const a = 2'
    textarea!.dispatchEvent(new Event('input'))
    await flushPromises()

    const saveBtn = document.body.querySelector('[data-action="editor-save"]') as HTMLElement | null
    saveBtn!.click()
    await flushPromises()

    expect(editorClient.writeFileContent).toHaveBeenCalledWith(
      'http://127.0.0.1:4096',
      expect.any(Object),
      'workspace/app/src/index.ts',
      'const a = 2'
    )
    wrapper.unmount()
  })

  it('discards edits on cancel and returns to the viewer', async () => {
    const wrapper = await openSheet()
    await flushPromises()

    const fileBtn = document.body.querySelector('[data-file-entry="workspace/app/src/index.ts"]') as HTMLElement
    fileBtn.click()
    await flushPromises()

    const editBtn = document.body.querySelector('[data-action="edit-file"]') as HTMLElement | null
    editBtn!.click()
    await flushPromises()

    const textarea = document.body.querySelector('[data-editor-textarea]') as HTMLTextAreaElement | null
    textarea!.value = 'changed'
    textarea!.dispatchEvent(new Event('input'))
    await flushPromises()

    const cancelBtn = document.body.querySelector('[data-action="editor-cancel"]') as HTMLElement | null
    cancelBtn!.click()
    await flushPromises()

    expect(editorClient.writeFileContent).not.toHaveBeenCalled()
    expect(document.body.querySelector('[data-editor-textarea]')).toBeNull()
    wrapper.unmount()
  })

  it('keeps the buffer and shows an error when saving fails', async () => {
    vi.spyOn(editorClient, 'writeFileContent').mockRejectedValue(new Error('nope'))
    const wrapper = await openSheet()
    await flushPromises()

    const fileBtn = document.body.querySelector('[data-file-entry="workspace/app/src/index.ts"]') as HTMLElement
    fileBtn.click()
    await flushPromises()

    const editBtn = document.body.querySelector('[data-action="edit-file"]') as HTMLElement | null
    editBtn!.click()
    await flushPromises()

    const textarea = document.body.querySelector('[data-editor-textarea]') as HTMLTextAreaElement | null
    textarea!.value = 'changed'
    textarea!.dispatchEvent(new Event('input'))
    await flushPromises()

    const saveBtn = document.body.querySelector('[data-action="editor-save"]') as HTMLElement | null
    saveBtn!.click()
    await flushPromises()

    const stillThere = document.body.querySelector('[data-editor-textarea]') as HTMLTextAreaElement | null
    expect(stillThere).not.toBeNull()
    expect(stillThere!.value).toBe('changed')
    expect(document.body.textContent).toContain('nope')
    wrapper.unmount()
  })

  it('blocks switching files while the editor is dirty', async () => {
    const wrapper = await openSheet()
    await flushPromises()

    const fileBtn = document.body.querySelector('[data-file-entry="workspace/app/src/index.ts"]') as HTMLElement
    fileBtn.click()
    await flushPromises()

    const editBtn = document.body.querySelector('[data-action="edit-file"]') as HTMLElement | null
    editBtn!.click()
    await flushPromises()

    const textarea = document.body.querySelector('[data-editor-textarea]') as HTMLTextAreaElement | null
    textarea!.value = 'dirty'
    textarea!.dispatchEvent(new Event('input'))
    await flushPromises()

    const otherFile = document.body.querySelector('[data-file-entry="workspace/app/src/util.ts"]') as HTMLElement | null
    expect(otherFile).not.toBeNull()
    otherFile!.click()
    await flushPromises()

    // still editing the first file
    expect(document.body.querySelector('[data-editor-textarea]')).not.toBeNull()
    wrapper.unmount()
  })
})
