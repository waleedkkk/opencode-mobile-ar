<template>
  <div class="flex flex-col h-dvh bg-background text-foreground overflow-hidden relative pt-[env(safe-area-inset-top)]">
    <!-- Header -->
    <ChatHeader
      :title="currentSessionTitle"
      :model="chatStore.activeModel"
      :status="connectionStatus"
      @open-drawer="drawerOpen = true"
      @open-web-view="emit('openWebView')"
      @open-quick-shell="quickShellOpen = true"
      @open-files="filesSheetOpen = true"
      @open-git="gitSheetOpen = true"
    />

    <!-- Offline banner -->
    <div
      v-if="chatStore.isOffline"
      data-offline-banner
      class="flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium"
    >
      <span>{{ t('chat.offlineBanner') }}</span>
      <button
        type="button"
        class="underline shrink-0 cursor-pointer"
        @click="retryConnection"
      >
        {{ t('chat.retryConnection') }}
      </button>
    </div>

    <!-- Message history list -->
    <ChatMessageList
      :messages="chatStore.messages"
      :streaming="chatStore.streamingStatus !== 'idle'"
      @allow-permission="(id) => chatStore.respondPermission(id, true)"
      @deny-permission="(id) => chatStore.respondPermission(id, false)"
      @select-action="(prompt) => chatStore.sendMessage(prompt)"
    />

    <!-- Composer -->
    <ChatComposer
      :disabled="chatStore.streamingStatus === 'thinking' || chatStore.streamingStatus === 'tool_running'"
      :streaming="chatStore.streamingStatus !== 'idle'"
      @send="(text, files) => chatStore.sendMessage(text, files)"
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

    <!-- Quick Shell Sheet -->
    <ChatQuickShell
      v-model:open="quickShellOpen"
      :base-url="chatStore.baseUrl"
      :auth="chatStore.auth"
      :session-id="chatStore.currentSessionId"
    />

    <!-- Files Sheet -->
    <ChatFilesSheet
      v-model:open="filesSheetOpen"
      :base-url="chatStore.baseUrl"
      :auth="chatStore.auth"
      root-path="/"
    />

    <!-- Git Sheet -->
    <ChatGitSheet
      v-model:open="gitSheetOpen"
      :base-url="chatStore.baseUrl"
      :auth="chatStore.auth"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/i18n'
import { useChatStore } from '@/stores/chatStore'
import { useConnectionStore } from '@/stores/connectionStore'
import ChatHeader from './ChatHeader.vue'
import ChatMessageList from './ChatMessageList.vue'
import ChatComposer from './ChatComposer.vue'
import ChatSessionsDrawer from './ChatSessionsDrawer.vue'
import ChatQuickShell from './ChatQuickShell.vue'
import ChatFilesSheet from './ChatFilesSheet.vue'
import ChatGitSheet from './ChatGitSheet.vue'

const props = defineProps<{
  serverId: string
}>()

const emit = defineEmits<{
  openWebView: []
}>()

const chatStore = useChatStore()
const connectionStore = useConnectionStore()
const { t } = useI18n()
const drawerOpen = ref(false)
const quickShellOpen = ref(false)
const filesSheetOpen = ref(false)
const gitSheetOpen = ref(false)

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

async function retryConnection(): Promise<void> {
  if (props.serverId) {
    await chatStore.initForServer(props.serverId)
  }
}

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
