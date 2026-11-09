<template>
  <div class="flex flex-col h-dvh bg-background text-foreground overflow-hidden relative">
    <!-- Header -->
    <ChatHeader
      :title="currentSessionTitle"
      :model="chatStore.activeModel"
      :status="connectionStatus"
      @open-drawer="drawerOpen = true"
      @open-web-view="emit('openWebView')"
    />

    <!-- Message history list -->
    <ChatMessageList
      :messages="chatStore.messages"
      :streaming="chatStore.streamingStatus !== 'idle'"
      @allow-permission="(id) => chatStore.respondPermission(id, true)"
      @deny-permission="(id) => chatStore.respondPermission(id, false)"
    />

    <!-- Composer -->
    <ChatComposer
      :disabled="chatStore.streamingStatus === 'thinking' || chatStore.streamingStatus === 'tool_running'"
      :streaming="chatStore.streamingStatus !== 'idle'"
      @send="(text) => chatStore.sendMessage(text)"
      @interrupt="chatStore.interrupt"
    />

    <!-- Sessions Drawer -->
    <ChatSessionsDrawer
      v-model:open="drawerOpen"
      :sessions="chatStore.sessions"
      :current-session-id="chatStore.currentSessionId"
      @select="handleSelectSession"
      @new-session="handleNewSession"
      @open-web-view="handleOpenWebViewFromDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useChatStore } from '@/stores/chatStore'
import { useConnectionStore } from '@/stores/connectionStore'
import ChatHeader from './ChatHeader.vue'
import ChatMessageList from './ChatMessageList.vue'
import ChatComposer from './ChatComposer.vue'
import ChatSessionsDrawer from './ChatSessionsDrawer.vue'

const props = defineProps<{
  serverId: string
}>()

const emit = defineEmits<{
  openWebView: []
}>()

const chatStore = useChatStore()
const connectionStore = useConnectionStore()
const drawerOpen = ref(false)

const currentSessionTitle = computed(() => {
  const current = chatStore.sessions.find((s) => s.id === chatStore.currentSessionId)
  return current ? current.title : ''
})

const connectionStatus = computed(() => {
  return connectionStore.state || 'connected'
})

onMounted(async () => {
  if (props.serverId && chatStore.currentServerId !== props.serverId) {
    await chatStore.initForServer(props.serverId)
  }
})

async function handleSelectSession(sessionId: string): Promise<void> {
  drawerOpen.value = false
  await chatStore.selectSession(sessionId)
}

async function handleNewSession(): Promise<void> {
  drawerOpen.value = false
  await chatStore.newSession()
}

function handleOpenWebViewFromDrawer(): void {
  drawerOpen.value = false
  emit('openWebView')
}
</script>
