import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '@/stores/chatStore'
import * as chatClient from '@/services/opencode/chatClient'
import * as projectClient from '@/services/opencode/projectClient'

vi.mock('@/stores/serverStore', () => ({
  useServerStore: () => ({
    profiles: [{ id: 's1', name: 'Dev', baseUrl: 'http://127.0.0.1:4096', authEnabled: false }],
    getPassword: vi.fn().mockResolvedValue(''),
  }),
}))

vi.mock('@/services/opencode/modelsClient', () => ({
  fetchModelGroups: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/opencode/chatClient', () => ({
  connectSseStream: vi.fn().mockReturnValue(() => {}),
  fetchSessions: vi.fn().mockResolvedValue([]),
  fetchSessionMessages: vi.fn().mockResolvedValue([]),
  fetchAgents: vi.fn().mockResolvedValue(['general', 'coder']),
  fetchModels: vi.fn().mockResolvedValue(['gpt']),
  fetchModelGroups: vi.fn().mockResolvedValue([]),
  createSession: vi.fn().mockResolvedValue({ id: 'ses_new', title: 'New', createdAt: 'x', updatedAt: 'y' }),
  sendPrompt: vi.fn().mockResolvedValue(undefined),
  interruptSession: vi.fn().mockResolvedValue(undefined),
  replyPermission: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/platform/nativeNotifications', () => ({
  emitChatTaskNotification: vi.fn().mockResolvedValue({}),
}))

describe('session titles and project names', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('gives untitled sessions a readable fallback instead of a hex id', async () => {
    const created = 1794150825947
    vi.mocked(chatClient.fetchSessions).mockResolvedValue([
      { id: '9a6ce7afdc9b48d2424439941b4733e276d33b42', title: '', createdAt: String(created), updatedAt: String(created) },
      { id: 'ses_named', title: 'Fork repo', createdAt: 'x', updatedAt: 'y' },
    ] as any)

    const store = useChatStore()
    vi.spyOn(store, 'loadSessions').mockImplementation(async () => {
      store.sessions = [
        { id: '9a6ce7afdc9b48d2424439941b4733e276d33b42', title: '', createdAt: String(created), updatedAt: String(created) } as any,
        { id: 'ses_named', title: 'Fork repo', createdAt: 'x', updatedAt: 'y' },
      ]
    })

    await store.initForServer('s1')

    const untitled = store.sessions.find((s) => s.id === '9a6ce7afdc9b48d2424439941b4733e276d33b42')
    const named = store.sessions.find((s) => s.id === 'ses_named')

    expect(named!.title).toBe('Fork repo')
    // a dated fallback, never the raw hex id
    expect(untitled!.title).not.toBe('9a6ce7afdc9b48d2424439941b4733e276d33b42')
    expect(untitled!.title.length).toBeGreaterThan(0)
    expect(untitled!.title).toMatch(/\d/)
  })

  it('names projects by their directory so hex ids are never shown', async () => {
    vi.spyOn(projectClient, 'fetchProjects').mockResolvedValue([
      { id: 'global', name: 'global', directory: '/' },
      { id: '9a6ce7', name: '9a6ce7', directory: '/workspace/orphan-system' },
    ] as any)
    vi.spyOn(projectClient, 'fetchLocation').mockResolvedValue({ directory: '/', projectID: 'global' })
    vi.mocked(chatClient.fetchSessions).mockResolvedValue([])

    const store = useChatStore()
    await store.initForServer('s1')

    expect(store.projectNames.global).toBe('/')
    expect(store.projectNames['9a6ce7']).toBe('/workspace/orphan-system')
  })
})
