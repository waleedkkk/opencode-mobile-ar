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
      @open-terminal="terminalSheetOpen = true"
      @open-models="modelsSheetOpen = true"
      @open-permissions="permissionsSheetOpen = true"
      @open-providers="providersSheetOpen = true"
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
      :forms="chatStore.pendingForms"
      :streaming="chatStore.streamingStatus !== 'idle'"
      @allow-permission="(id) => chatStore.respondPermission(id, true)"
      @deny-permission="(id) => chatStore.respondPermission(id, false)"
      @select-action="(prompt) => chatStore.sendMessage(prompt)"
      @submit-form="(id, answer) => chatStore.submitForm(id, answer)"
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
      :projects="chatStore.projects"
      :current-directory="chatStore.currentDirectory"
      :current-project-i-d="chatStore.currentProjectID"
      @select="handleSelectSession"
      @new-session="handleNewSession"
      @open-web-view="handleOpenWebViewFromDrawer"
      @open-session-details="openSessionDetails"
      @select-project="handleSelectProject"
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

    <!-- Terminal Sheet -->
    <ChatTerminalSheet
      v-model:open="terminalSheetOpen"
      :base-url="chatStore.baseUrl"
      :auth="chatStore.auth"
    />

    <!-- Models Sheet -->
    <ChatModelsSheet
      v-model:open="modelsSheetOpen"
      :base-url="chatStore.baseUrl"
      :auth="chatStore.auth"
      :active-model="chatStore.activeModel"
      :session-id="chatStore.currentSessionId"
      @model-selected="handleModelSelected"
    />

    <!-- Session details sheet -->
    <ChatSessionSheet
      v-model:open="sessionSheetOpen"
      :base-url="chatStore.baseUrl"
      :auth="chatStore.auth"
      :session-id="chatStore.currentSessionId"
      @session-forked="handleSessionForked"
      @run-command="handleRunCommand"
      @run-skill="handleRunSkill"
    />

    <!-- Providers & credentials sheet -->
    <ChatPermissionsSheet
      v-model:open="permissionsSheetOpen"
      :base-url="chatStore.baseUrl"
      :auth="chatStore.auth"
    />

    <ChatProvidersSheet
      v-model:open="providersSheetOpen"
      :base-url="chatStore.baseUrl"
      :auth="chatStore.auth"
      :session-id="chatStore.currentSessionId"
      :active-model="chatStore.activeModel"
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
import ChatTerminalSheet from './ChatTerminalSheet.vue'
import ChatModelsSheet from './ChatModelsSheet.vue'
import ChatSessionSheet from './ChatSessionSheet.vue'
import ChatProvidersSheet from './ChatProvidersSheet.vue'
import ChatPermissionsSheet from './ChatPermissionsSheet.vue'

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
const terminalSheetOpen = ref(false)
const modelsSheetOpen = ref(false)
const sessionSheetOpen = ref(false)
const providersSheetOpen = ref(false)
const permissionsSheetOpen = ref(false)

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

async function handleSessionForked(sessionId: string): Promise<void> {
  sessionSheetOpen.value = false
  if (!sessionId) return
  await chatStore.loadSessions()
  await chatStore.selectSession(sessionId)
}

function handleRunCommand(commandName: string): void {
  sessionSheetOpen.value = false
  void chatStore.sendMessage('/' + commandName)
}

function handleRunSkill(skillId: string): void {
  sessionSheetOpen.value = false
  void chatStore.sendMessage('Use skill ' + skillId)
}

async function handleSelectProject(projectId: string): Promise<void> {
  drawerOpen.value = false
  await chatStore.switchProject(projectId)
}

function openSessionDetails(): void {
  sessionSheetOpen.value = true
}

async function handleModelSelected(modelId: string): Promise<void> {
  modelsSheetOpen.value = false
  chatStore.activeModel = modelId
  if (!chatStore.baseUrl || !chatStore.currentSessionId) return
  try {
    const { switchSessionModel } = await import('@/services/opencode/modelsClient')
    await switchSessionModel(chatStore.baseUrl, chatStore.auth, chatStore.currentSessionId, modelId)
  } catch (err) {
    console.warn('[chat] model switch failed:', err)
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
