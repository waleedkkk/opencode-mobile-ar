import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatSessionSheet from '@/components/chat/ChatSessionSheet.vue'
import * as sessionClient from '@/services/opencode/sessionClient'
import * as metaClient from '@/services/opencode/metaClient'

describe('ChatSessionSheet.vue', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()

    vi.spyOn(sessionClient, 'fetchSessionDetail').mockResolvedValue({
      id: 'ses_1',
      title: 'Refactor api',
      projectID: 'prj_1',
      agent: 'build',
      createdAt: 1794228206502,
      updatedAt: 1794228306502,
    })
    vi.spyOn(sessionClient, 'forkSession').mockResolvedValue({ id: 'ses_fork' })
    vi.spyOn(sessionClient, 'exportSession').mockResolvedValue({ id: 'exp_1', url: 'https://x/y.json' })
    vi.spyOn(metaClient, 'fetchCommands').mockResolvedValue([
      { id: 'commit', name: 'commit', description: 'Commit changes' },
    ])
    vi.spyOn(metaClient, 'fetchSkills').mockResolvedValue([
      { id: 'tdd', name: 'Test Driven Development', description: 'Write tests first' },
    ])
  })

  it('shows session metadata, commands and skills, and emits fork', async () => {
    const wrapper = mount(ChatSessionSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
        sessionId: 'ses_1',
      },
      attachTo: document.body,
    })

    await flushPromises()

    expect(document.body.textContent).toContain('Refactor api')
    expect(document.body.textContent).toContain('commit')
    expect(document.body.textContent).toContain('Test Driven Development')

    const forkBtn = document.body.querySelector('[data-action="fork-session"]') as HTMLElement | null
    expect(forkBtn).not.toBeNull()
    forkBtn!.click()
    await flushPromises()

    expect(sessionClient.forkSession).toHaveBeenCalled()
    expect(wrapper.emitted('session-forked')).toBeTruthy()
    wrapper.unmount()
  })

  it('emits run-command when a command chip is tapped', async () => {
    const wrapper = mount(ChatSessionSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
        sessionId: 'ses_1',
      },
      attachTo: document.body,
    })

    await flushPromises()

    const cmdBtn = document.body.querySelector('[data-command="commit"]') as HTMLElement | null
    expect(cmdBtn).not.toBeNull()
    cmdBtn!.click()
    await flushPromises()

    expect(wrapper.emitted('run-command')).toBeTruthy()
    expect(wrapper.emitted('run-command')![0]).toEqual(['commit'])
    wrapper.unmount()
  })
})
