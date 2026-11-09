import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ChatAuth,
  ChatMessage,
  FileAttachment,
  OpenCodeEvent,
  PermissionRequest,
  SessionInfo,
  ToolCall,
} from '@/types/chat'
import {
  connectSseStream,
  createSession,
  fetchAgents,
  fetchModels,
  fetchSessionMessages,
  fetchSessions,
  interruptSession,
  replyPermission,
  sendPrompt,
} from '@/services/opencode/chatClient'
import { useServerStore } from './serverStore'
import { t } from '@/i18n'
import { emitChatTaskNotification } from '@/services/platform/nativeNotifications'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export const useChatStore = defineStore('chat', () => {
  const currentServerId = ref<string | null>(null)
  const baseUrl = ref<string>('')
  const auth = ref<ChatAuth>({ username: 'opencode' })

  const currentSessionId = ref<string | null>(null)
  const sessions = ref<SessionInfo[]>([])
  const messages = ref<ChatMessage[]>([])
  const streamingStatus = ref<'idle' | 'thinking' | 'streaming' | 'tool_running'>('idle')

  const activeModel = ref<string>('')
  const activeAgent = ref<string>('general')
  const availableModels = ref<string[]>([])
  const availableAgents = ref<string[]>([])
  const pendingPermissions = ref<PermissionRequest[]>([])
  const isAppActive = ref(true)

  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', (state) => {
      isAppActive.value = state.isActive
    })
  }

  let sseDisconnect: (() => void) | null = null

  async function initForServer(serverId: string): Promise<void> {
    cleanup()
    currentServerId.value = serverId

    const serverStore = useServerStore()
    const profile = serverStore.profiles.find((p) => p.id === serverId)
    if (!profile) return

    baseUrl.value = profile.baseUrl
    const pw = await serverStore.getPassword(serverId)
    auth.value = {
      username: profile.authEnabled ? profile.username || 'opencode' : 'opencode',
      password: profile.authEnabled && pw ? pw : undefined,
    }

    // Connect SSE stream
    sseDisconnect = connectSseStream(
      baseUrl.value,
      auth.value,
      (ev) => handleEvent(ev),
      (err) => console.warn('[chatStore] SSE error:', err),
      async () => {
        // Reconnection hook: reconcile messages for active session
        if (currentSessionId.value) {
          try {
            await selectSession(currentSessionId.value)
          } catch (e) {
            console.warn('[chatStore] failed to reconcile messages on reconnect:', e)
          }
        }
      }
    )

    // Load available agents and models in parallel
    const [agents, models] = await Promise.all([
      fetchAgents(baseUrl.value, auth.value),
      fetchModels(baseUrl.value, auth.value),
    ])
    availableAgents.value = agents
    if (agents.length > 0 && !agents.includes(activeAgent.value)) {
      activeAgent.value = agents[0]
    }

    availableModels.value = models
    if (models.length > 0 && !activeModel.value) {
      activeModel.value = models[0]
    }

    // Load sessions
    await loadSessions()

    if (sessions.value.length > 0) {
      await selectSession(sessions.value[0].id)
    } else {
      await newSession()
    }
  }

  async function loadSessions(): Promise<void> {
    if (!baseUrl.value) return
    const list = await fetchSessions(baseUrl.value, auth.value)
    sessions.value = list
  }

  async function selectSession(sessionId: string): Promise<void> {
    currentSessionId.value = sessionId
    pendingPermissions.value = []
    streamingStatus.value = 'idle'
    if (!baseUrl.value) return
    const history = await fetchSessionMessages(baseUrl.value, auth.value, sessionId)
    messages.value = history
  }

  async function newSession(title?: string): Promise<SessionInfo | null> {
    if (!baseUrl.value) return null
    const created = await createSession(baseUrl.value, auth.value, title)
    sessions.value = [created, ...sessions.value]
    await selectSession(created.id)
    return created
  }

  async function sendMessage(promptText: string, files?: FileAttachment[]): Promise<void> {
    const text = promptText.trim()
    const hasFiles = Boolean(files && files.length > 0)
    if ((!text && !hasFiles) || !currentSessionId.value || !baseUrl.value) return

    // Add optimistic user message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      files: hasFiles ? files : undefined,
    }

    // Prepare streaming assistant message
    const assistantMsg: ChatMessage = {
      id: `ast_${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true,
      toolCalls: [],
    }

    messages.value.push(userMsg, assistantMsg)
    streamingStatus.value = 'streaming'

    try {
      await sendPrompt(
        baseUrl.value,
        auth.value,
        currentSessionId.value,
        text,
        activeModel.value || undefined,
        activeAgent.value || undefined,
        files
      )
    } catch (err) {
      assistantMsg.streaming = false
      assistantMsg.content = 'Failed to send message. Please check server connection.'
      streamingStatus.value = 'idle'
    }
  }

  function handleEvent(event: OpenCodeEvent): void {
    if (event.sessionId && currentSessionId.value && event.sessionId !== currentSessionId.value) {
      return
    }

    const lastMsg = messages.value[messages.value.length - 1]

    switch (event.type) {
      case 'session.message.delta': {
        const delta = String(event.payload.delta || event.payload.text || '')
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content += delta
          lastMsg.streaming = true
        }
        streamingStatus.value = 'streaming'
        break
      }

      case 'session.tool.start': {
        const toolId = String(event.payload.toolId || event.payload.id || Date.now())
        const toolName = String(event.payload.toolName || event.payload.tool || 'tool')
        const args = (event.payload.arguments || event.payload.input || {}) as Record<string, unknown>

        const tool: ToolCall = {
          id: toolId,
          name: toolName,
          arguments: args,
          status: 'running',
        }

        if (lastMsg && lastMsg.role === 'assistant') {
          if (!lastMsg.toolCalls) lastMsg.toolCalls = []
          lastMsg.toolCalls.push(tool)
        }
        streamingStatus.value = 'tool_running'
        break
      }

      case 'session.tool.finish': {
        const toolId = String(event.payload.toolId || event.payload.id || '')
        const status = event.payload.status === 'failed' ? 'failed' : 'completed'
        const result = typeof event.payload.result === 'string' ? event.payload.result : JSON.stringify(event.payload.result || '')

        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.toolCalls) {
          const target = lastMsg.toolCalls.find((t) => t.id === toolId) || lastMsg.toolCalls[lastMsg.toolCalls.length - 1]
          if (target) {
            target.status = status
            target.result = result
          }
        }
        streamingStatus.value = 'streaming'
        break
      }

      case 'session.permission.request': {
        const req: PermissionRequest = {
          id: String(event.payload.requestId || event.payload.id || Date.now()),
          toolName: String(event.payload.toolName || event.payload.tool || ''),
          description: String(event.payload.description || event.payload.message || 'Permission required to execute tool'),
          arguments: (event.payload.arguments || {}) as Record<string, unknown>,
          state: 'pending',
        }
        pendingPermissions.value.push(req)
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.pendingPermission = req
        }
        if (!isAppActive.value) {
          void emitChatTaskNotification(
            t('chat.notifPermissionTitle'),
            t('chat.notifPermissionBody')
          )
        }
        break
      }

      case 'session.status': {
        const status = String(event.payload.status || 'idle')
        if (status === 'idle') {
          const wasWorking = streamingStatus.value !== 'idle'
          streamingStatus.value = 'idle'
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.streaming = false
          }
          if (wasWorking && !isAppActive.value) {
            void emitChatTaskNotification(
              t('chat.notifTaskCompletedTitle'),
              t('chat.notifTaskCompletedBody')
            )
          }
        } else if (status === 'thinking') {
          streamingStatus.value = 'thinking'
        }
        break
      }
    }
  }

  async function interrupt(): Promise<void> {
    if (!baseUrl.value || !currentSessionId.value) return
    try {
      await interruptSession(baseUrl.value, auth.value, currentSessionId.value)
    } finally {
      streamingStatus.value = 'idle'
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg && lastMsg.role === 'assistant') {
        lastMsg.streaming = false
      }
    }
  }

  async function respondPermission(requestId: string, allow: boolean): Promise<void> {
    if (!baseUrl.value || !currentSessionId.value) return
    const decision = allow ? 'allow' : 'deny'

    await replyPermission(baseUrl.value, auth.value, currentSessionId.value, requestId, decision)

    pendingPermissions.value = pendingPermissions.value.filter((p) => p.id !== requestId)
    for (const msg of messages.value) {
      if (msg.pendingPermission && msg.pendingPermission.id === requestId) {
        msg.pendingPermission = undefined
      }
    }
  }

  function cleanup(): void {
    if (sseDisconnect) {
      sseDisconnect()
      sseDisconnect = null
    }
    currentServerId.value = null
    currentSessionId.value = null
    sessions.value = []
    messages.value = []
    pendingPermissions.value = []
    streamingStatus.value = 'idle'
  }

  return {
    currentServerId,
    baseUrl,
    auth,
    currentSessionId,
    sessions,
    messages,
    streamingStatus,
    activeModel,
    activeAgent,
    availableModels,
    availableAgents,
    pendingPermissions,
    isAppActive,
    initForServer,
    loadSessions,
    selectSession,
    newSession,
    sendMessage,
    handleEvent,
    interrupt,
    respondPermission,
    cleanup,
  }
})
