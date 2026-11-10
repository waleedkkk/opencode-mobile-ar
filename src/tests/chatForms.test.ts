import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '@/stores/chatStore'
import * as formClient from '@/services/opencode/formClient'
import type { PendingForm } from '@/services/opencode/formClient'

vi.mock('@/stores/serverStore', () => ({
  useServerStore: () => ({
    profiles: [{ id: 's1', name: 'Dev', baseUrl: 'http://127.0.0.1:4096', authEnabled: true, username: 'opencode' }],
    getPassword: vi.fn().mockResolvedValue('testpass'),
  }),
}))

vi.mock('@/services/opencode/chatClient', () => ({
  connectSseStream: vi.fn().mockReturnValue(() => {}),
  fetchSessions: vi.fn().mockResolvedValue([{ id: 'ses_1', title: 'S', createdAt: 'x', updatedAt: 'y' }]),
  fetchSessionMessages: vi.fn().mockResolvedValue([]),
  fetchAgents: vi.fn().mockResolvedValue(['general']),
  fetchModels: vi.fn().mockResolvedValue(['gpt']),
  fetchModelGroups: vi.fn().mockResolvedValue([]),
  createSession: vi.fn().mockResolvedValue({ id: 'ses_2', title: 'New', createdAt: 'x', updatedAt: 'y' }),
  sendPrompt: vi.fn().mockResolvedValue(undefined),
  interruptSession: vi.fn().mockResolvedValue(undefined),
  replyPermission: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/opencode/modelsClient', () => ({
  fetchModelGroups: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/platform/nativeNotifications', () => ({
  emitChatTaskNotification: vi.fn().mockResolvedValue({}),
}))

const form: PendingForm = {
  id: 'frm_1',
  sessionID: 'ses_1',
  title: 'Choose a branch',
  fields: [
    { key: 'branch', type: 'string', title: 'Branch name', required: true },
    { key: 'count', type: 'integer', title: 'Count', minimum: 1, maximum: 5, default: 2 },
  ],
}

describe('chatStore forms', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('exposes pending forms after refreshForms', async () => {
    vi.spyOn(formClient, 'fetchPendingForms').mockResolvedValue([form])
    const store = useChatStore()
    await store.initForServer('s1')

    expect(store.pendingForms).toHaveLength(1)
    expect(store.pendingForms[0].title).toBe('Choose a branch')
  })

  it('submits an answer and removes the form', async () => {
    const replySpy = vi.spyOn(formClient, 'replyToForm').mockResolvedValue(undefined)
    vi.spyOn(formClient, 'fetchPendingForms').mockResolvedValue([form])

    const store = useChatStore()
    await store.initForServer('s1')

    await store.submitForm('frm_1', { branch: 'main' })

    expect(replySpy).toHaveBeenCalledWith(
      'http://127.0.0.1:4096',
      expect.any(Object),
      'ses_1',
      'frm_1',
      { branch: 'main' }
    )
    expect(store.pendingForms).toHaveLength(0)
  })

  it('keeps the form pending when the reply fails', async () => {
    vi.spyOn(formClient, 'replyToForm').mockRejectedValue(new Error('nope'))
    vi.spyOn(formClient, 'fetchPendingForms').mockResolvedValue([form])

    const store = useChatStore()
    await store.initForServer('s1')

    await store.submitForm('frm_1', { branch: 'main' })

    expect(store.pendingForms).toHaveLength(1)
    expect(store.formError).not.toBe('')
  })
})
