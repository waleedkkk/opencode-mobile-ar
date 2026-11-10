import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ChatGitSheet from '@/components/chat/ChatGitSheet.vue'
import * as vcsClient from '@/services/opencode/vcsClient'

describe('ChatGitSheet.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
    vi.restoreAllMocks()

    vi.spyOn(vcsClient, 'fetchVcsStatus').mockResolvedValue({
      files: [
        { path: 'src/index.ts', status: 'modified', additions: 5, deletions: 1 },
        { path: 'src/new.ts', status: 'added', additions: 12, deletions: 0 },
      ],
    })
    vi.spyOn(vcsClient, 'fetchVcsInfo').mockResolvedValue({ branchName: 'feat/native-chat', isRepository: true })
    vi.spyOn(vcsClient, 'fetchVcsDiff').mockResolvedValue('--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,2 +1,3 @@\n-old\n+new\n+extra\n')
    vi.spyOn(vcsClient, 'fetchVcsBranches').mockResolvedValue(['main', 'feat/native-chat'])
  })

  it('renders branch, changed files with counters, and diff for a selected file', async () => {
    const wrapper = mount(ChatGitSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
      },
      attachTo: document.body,
    })

    await flushPromises()

    expect(vcsClient.fetchVcsInfo).toHaveBeenCalled()
    expect(document.body.textContent).toContain('feat/native-chat')
    expect(document.body.textContent).toContain('src/index.ts')
    expect(document.body.textContent).toContain('+5')
    expect(document.body.textContent).toContain('-1')

    const fileBtn = document.body.querySelector('[data-vcs-file="src/index.ts"]') as HTMLElement | null
    expect(fileBtn).not.toBeNull()
    fileBtn!.click()
    await flushPromises()

    expect(vcsClient.fetchVcsDiff).toHaveBeenCalled()
    expect(document.body.textContent).toContain('src/index.ts')
    wrapper.unmount()
  })

  it('lists branches when the branch chip is tapped', async () => {
    const wrapper = mount(ChatGitSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
      },
      attachTo: document.body,
    })

    await flushPromises()

    const branchBtn = document.body.querySelector('[data-action="show-branches"]') as HTMLElement | null
    expect(branchBtn).not.toBeNull()
    branchBtn!.click()
    await flushPromises()

    expect(vcsClient.fetchVcsBranches).toHaveBeenCalled()
    expect(document.body.textContent).toContain('main')
    wrapper.unmount()
  })
})
