import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ChatView from '@/components/chat/ChatView.vue'
import * as projectClient from '@/services/opencode/projectClient'
import * as chatClient from '@/services/opencode/chatClient'
import * as modelsClient from '@/services/opencode/modelsClient'

vi.mock('@/stores/serverStore', () => ({
  useServerStore: () => ({
    profiles: [{ id: 's1', name: 'Dev', baseUrl: 'http://127.0.0.1:4096', authEnabled: false }],
    getPassword: vi.fn().mockResolvedValue(''),
  }),
}))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

describe('ChatView project switching', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
    vi.restoreAllMocks()

    vi.spyOn(chatClient, 'connectSseStream').mockReturnValue(() => {})
    vi.spyOn(chatClient, 'fetchSessions').mockResolvedValue([
      { id: 'ses_1', title: 'S1', createdAt: 'x', updatedAt: 'y' },
    ])
    vi.spyOn(chatClient, 'fetchSessionMessages').mockResolvedValue([])
    vi.spyOn(chatClient, 'fetchAgents').mockResolvedValue(['general'])
    vi.spyOn(chatClient, 'fetchModels').mockResolvedValue(['gpt'])
    vi.spyOn(modelsClient, 'fetchModelGroups').mockResolvedValue([])
    vi.spyOn(projectClient, 'fetchProjects').mockResolvedValue([
      { id: 'prj_1', name: 'app', directory: '/workspace/app' },
      { id: 'prj_2', name: 'other', directory: '/workspace/other' },
    ])
    vi.spyOn(projectClient, 'fetchLocation').mockResolvedValue({
      directory: '/workspace/app',
      projectID: 'prj_1',
    })
  })

  it('shows the current project and its directory in the session drawer', async () => {
    const wrapper = mount(ChatView, {
      attachTo: document.body,
      props: { serverId: 's1' },
    })
    await flushPromises()

    await wrapper.find('[data-action="open-drawer"]').trigger('click')
    await flushPromises()

    expect(projectClient.fetchLocation).toHaveBeenCalled()
    expect(document.body.textContent).toContain('/workspace/app')
    wrapper.unmount()
  })

  it('lists projects and switches, reloading the chat', async () => {
    vi.spyOn(projectClient, 'updateProject').mockResolvedValue(undefined)
    const reloadSpy = vi.spyOn(projectClient, 'reloadLocation').mockResolvedValue(undefined)

    const wrapper = mount(ChatView, {
      attachTo: document.body,
      props: { serverId: 's1' },
    })
    await flushPromises()

    await wrapper.find('[data-action="open-drawer"]').trigger('click')
    await flushPromises()

    const projBtn = document.body.querySelector('[data-project="prj_2"]') as HTMLElement | null
    expect(projBtn).not.toBeNull()
    projBtn!.click()
    await flushPromises()
    await flushPromises()

    expect(reloadSpy).toHaveBeenCalled()
    wrapper.unmount()
  })
})
