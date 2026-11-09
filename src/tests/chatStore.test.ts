import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '@/stores/chatStore'
import * as chatClient from '@/services/opencode/chatClient'
import type { OpenCodeEvent } from '@/types/chat'

vi.mock('@/stores/serverStore', () => ({
  useServerStore: () => ({
    profiles: [
      { id: 'srv_1', name: 'Dev Server', baseUrl: 'http://127.0.0.1:4096', authEnabled: true, username: 'opencode' },
    ],
    getPassword: vi.fn().mockResolvedValue('testpass'),
  }),
}))

vi.mock('@/services/platform/nativeNotifications', () => ({
  emitChatTaskNotification: vi.fn().mockResolvedValue({}),
}))

describe('chatStore', () => {
  let sseCallback: ((ev: OpenCodeEvent) => void) | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    sseCallback = null

    vi.spyOn(chatClient, 'connectSseStream').mockImplementation((_url, _auth, onEvent) => {
      sseCallback = onEvent
      return () => {}
    })

    vi.spyOn(chatClient, 'fetchSessions').mockResolvedValue([
      { id: 'ses_1', title: 'Main session', createdAt: '2026-11-08T10:00:00Z', updatedAt: '2026-11-08T10:00:00Z' },
    ])

    vi.spyOn(chatClient, 'fetchSessionMessages').mockResolvedValue([
      { id: 'm1', role: 'user', content: 'prior question', createdAt: '2026-11-08T10:00:00Z' },
      { id: 'm2', role: 'assistant', content: 'prior answer', createdAt: '2026-11-08T10:00:05Z' },
    ])

    vi.spyOn(chatClient, 'fetchAgents').mockResolvedValue(['general', 'coder'])
    vi.spyOn(chatClient, 'fetchModels').mockResolvedValue(['anthropic/claude-3-5-sonnet'])
    vi.spyOn(chatClient, 'sendPrompt').mockResolvedValue(undefined)
    vi.spyOn(chatClient, 'interruptSession').mockResolvedValue(undefined)
    vi.spyOn(chatClient, 'replyPermission').mockResolvedValue(undefined)
  })

  it('initializes for server, loads sessions, and selects active session', async () => {
    const store = useChatStore()
    await store.initForServer('srv_1')

    expect(store.sessions).toHaveLength(1)
    expect(store.currentSessionId).toBe('ses_1')
    expect(store.messages).toHaveLength(2)
    expect(store.availableAgents).toContain('general')
  })

  it('sendMessage adds optimistic user message and sends prompt', async () => {
    const store = useChatStore()
    await store.initForServer('srv_1')

    await store.sendMessage('Please fix this test')

    expect(store.messages).toHaveLength(4) // 2 prior + 1 user + 1 streaming assistant
    expect(store.messages[2].role).toBe('user')
    expect(store.messages[2].content).toBe('Please fix this test')
    expect(store.messages[3].role).toBe('assistant')
    expect(store.messages[3].streaming).toBe(true)
    expect(chatClient.sendPrompt).toHaveBeenCalled()
  })

  it('sendMessage attaches files to user message and passes to sendPrompt', async () => {
    const store = useChatStore()
    await store.initForServer('srv_1')

    const file = { id: 'f1', name: 'photo.jpg', mime: 'image/jpeg', data: 'abc===' }
    await store.sendMessage('Check this photo', [file])

    const userMsg = store.messages[2]
    expect(userMsg.files).toEqual([file])
    expect(chatClient.sendPrompt).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      'ses_1',
      'Check this photo',
      expect.anything(),
      expect.anything(),
      [file]
    )
  })

  it('accumulates streaming deltas from SSE events', async () => {
    const store = useChatStore()
    await store.initForServer('srv_1')
    await store.sendMessage('stream test')

    expect(sseCallback).not.toBeNull()

    // simulate SSE streaming deltas
    sseCallback!({
      type: 'session.message.delta',
      sessionId: 'ses_1',
      payload: { delta: 'Thinking ' },
    })
    sseCallback!({
      type: 'session.message.delta',
      sessionId: 'ses_1',
      payload: { delta: 'about code...' },
    })

    const lastMsg = store.messages[store.messages.length - 1]
    expect(lastMsg.content).toBe('Thinking about code...')
  })

  it('creates and finishes tool call cards on SSE tool events', async () => {
    const store = useChatStore()
    await store.initForServer('srv_1')
    await store.sendMessage('run tool')

    sseCallback!({
      type: 'session.tool.start',
      sessionId: 'ses_1',
      payload: {
        toolId: 't1',
        toolName: 'bash',
        arguments: { command: 'ls -la' },
      },
    })

    const streamingMsg = store.messages[store.messages.length - 1]
    expect(streamingMsg.toolCalls).toBeDefined()
    expect(streamingMsg.toolCalls).toHaveLength(1)
    expect(streamingMsg.toolCalls![0].name).toBe('bash')
    expect(streamingMsg.toolCalls![0].status).toBe('running')

    sseCallback!({
      type: 'session.tool.finish',
      sessionId: 'ses_1',
      payload: {
        toolId: 't1',
        status: 'completed',
        result: 'total 64',
      },
    })

    expect(streamingMsg.toolCalls![0].status).toBe('completed')
    expect(streamingMsg.toolCalls![0].result).toBe('total 64')
  })

  it('adds pending permission on permission request and removes on decision', async () => {
    const store = useChatStore()
    await store.initForServer('srv_1')

    await store.sendMessage('run sensitive action')

    sseCallback!({
      type: 'session.permission.request',
      sessionId: 'ses_1',
      payload: {
        requestId: 'p_1',
        toolName: 'shell',
        description: 'run git push',
        arguments: { cmd: 'git push' },
      },
    })

    expect(store.pendingPermissions).toHaveLength(1)
    expect(store.pendingPermissions[0].id).toBe('p_1')

    const streamingMsg = store.messages[store.messages.length - 1]
    expect(streamingMsg.pendingPermission).toBeDefined()
    expect(streamingMsg.pendingPermission?.id).toBe('p_1')

    await store.respondPermission('p_1', true)

    expect(chatClient.replyPermission).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      'ses_1',
      'p_1',
      'allow'
    )
    expect(store.pendingPermissions).toHaveLength(0)
    expect(streamingMsg.pendingPermission).toBeUndefined()
  })

  it('interrupt calls interruptSession and resets streamingStatus', async () => {
    const store = useChatStore()
    await store.initForServer('srv_1')
    await store.sendMessage('long task')

    store.streamingStatus = 'streaming'
    await store.interrupt()

    expect(chatClient.interruptSession).toHaveBeenCalled()
    expect(store.streamingStatus).toBe('idle')
  })

  it('emits background task notification when task finishes and app is in background', async () => {
    const store = useChatStore()
    await store.initForServer('srv_1')
    await store.sendMessage('run long background task')

    store.isAppActive = false

    sseCallback!({
      type: 'session.status',
      sessionId: 'ses_1',
      payload: { status: 'idle' },
    })

    const notifModule = await import('@/services/platform/nativeNotifications')
    expect(notifModule.emitChatTaskNotification).toHaveBeenCalled()
  })
})
