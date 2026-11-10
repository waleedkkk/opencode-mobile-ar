import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ChatView from '@/components/chat/ChatView.vue'
import { useChatStore } from '@/stores/chatStore'
import * as chatClient from '@/services/opencode/chatClient'

vi.mock('@/stores/serverStore', () => ({
  useServerStore: () => ({
    profiles: [
      { id: 's1', name: 'Dev Server', baseUrl: 'http://127.0.0.1:4096', authEnabled: false },
    ],
    getPassword: vi.fn().mockResolvedValue(''),
  }),
}))

describe('ChatView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()

    vi.spyOn(chatClient, 'connectSseStream').mockReturnValue(() => {})
    vi.spyOn(chatClient, 'fetchSessions').mockResolvedValue([
      { id: 'ses_1', title: 'First Session', createdAt: '2026-11-08T10:00:00Z', updatedAt: '2026-11-08T10:00:00Z' },
      { id: 'ses_2', title: 'Second Session', createdAt: '2026-11-08T11:00:00Z', updatedAt: '2026-11-08T11:00:00Z' },
    ])
    vi.spyOn(chatClient, 'fetchSessionMessages').mockResolvedValue([])
    vi.spyOn(chatClient, 'fetchAgents').mockResolvedValue(['general'])
    vi.spyOn(chatClient, 'fetchModels').mockResolvedValue(['gpt-4o'])
    vi.spyOn(chatClient, 'createSession').mockResolvedValue({
      id: 'ses_3',
      title: 'New Session',
      createdAt: '2026-11-08T12:00:00Z',
      updatedAt: '2026-11-08T12:00:00Z',
    })
  })

  it('renders chat components and opens sessions drawer on drawer button click', async () => {
    const store = useChatStore()
    await store.initForServer('s1')

    const wrapper = mount(ChatView, {
      attachTo: document.body,
      props: {
        serverId: 's1',
      },
    })

    // Header, Composer exist
    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)

    // Open drawer
    const drawerBtn = wrapper.find('[data-action="open-drawer"]')
    await drawerBtn.trigger('click')

    // Sessions drawer is teleported to document.body
    expect(document.body.textContent).toContain('First Session')
    expect(document.body.textContent).toContain('Second Session')
    wrapper.unmount()
  })

  it('emits openWebView when WebView button in header or drawer is clicked', async () => {
    const store = useChatStore()
    await store.initForServer('s1')

    const wrapper = mount(ChatView, {
      props: {
        serverId: 's1',
      },
    })

    const webviewBtn = wrapper.find('[data-action="open-webview"]')
    await webviewBtn.trigger('click')

    expect(wrapper.emitted('openWebView')).toBeTruthy()
  })

  it('creates new session when new session button is clicked in drawer', async () => {
    const store = useChatStore()
    await store.initForServer('s1')

    const wrapper = mount(ChatView, {
      attachTo: document.body,
      props: {
        serverId: 's1',
      },
    })

    // Open drawer
    await wrapper.find('[data-action="open-drawer"]').trigger('click')

    const newSessionBtn = document.body.querySelector('[data-action="new-session"]') as HTMLElement | null
    expect(newSessionBtn).not.toBeNull()
    newSessionBtn!.click()
    await flushPromises()

    expect(chatClient.createSession).toHaveBeenCalled()
    expect(store.currentSessionId).toBe('ses_3')
    wrapper.unmount()
  })

  it('renders suggested action chips when assistant finishes and sends prompt on click', async () => {
    const store = useChatStore()
    await store.initForServer('s1')

    store.messages = [
      { id: 'm1', role: 'user', content: 'hello', createdAt: '2026-11-08' },
      { id: 'm2', role: 'assistant', content: 'here is the solution', createdAt: '2026-11-08', streaming: false },
    ]
    store.streamingStatus = 'idle'

    const wrapper = mount(ChatView, {
      props: {
        serverId: 's1',
      },
    })

    const actionChips = wrapper.find('[data-action-chips]')
    expect(actionChips.exists()).toBe(true)

    const sendPromptSpy = vi.spyOn(chatClient, 'sendPrompt').mockResolvedValue(undefined)

    const testChip = wrapper.find('[data-action-chip="test"]')
    expect(testChip.exists()).toBe(true)
    await testChip.trigger('click')

    expect(sendPromptSpy).toHaveBeenCalled()
  })
})
