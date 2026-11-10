<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent side="left" class="w-[90%] sm:max-w-lg p-0 flex flex-col h-full bg-card gap-0">
      <SheetHeader class="p-3 border-b border-border flex flex-row items-center justify-between">
        <SheetTitle class="text-sm font-semibold flex items-center gap-2">
          <BarChart3 class="size-4 text-primary" />
          <span>{{ t('chat.insightsTitle') || 'Insights' }}</span>
        </SheetTitle>
        <SheetDescription class="sr-only">Usage, MCP, integrations, worktrees and search</SheetDescription>
      </SheetHeader>

      <!-- Tabs -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-border overflow-x-auto" dir="ltr">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :data-tab="tab.id"
          class="px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-colors shrink-0"
          :class="activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        <p v-if="error" class="text-xs text-destructive">{{ error }}</p>

        <!-- Usage -->
        <template v-if="activeTab === 'usage'">
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-lg border border-border p-2.5">
              <p class="text-[10px] text-muted-foreground">{{ t('chat.statSessions') }}</p>
              <p class="text-lg font-semibold text-foreground">{{ stats.sessions }}</p>
            </div>
            <div class="rounded-lg border border-border p-2.5">
              <p class="text-[10px] text-muted-foreground">{{ t('chat.statPrompts') }}</p>
              <p class="text-lg font-semibold text-foreground">{{ stats.prompts }}</p>
            </div>
            <div class="rounded-lg border border-border p-2.5">
              <p class="text-[10px] text-muted-foreground">{{ t('chat.statTokens') }}</p>
              <p class="text-lg font-semibold text-foreground" dir="ltr">{{ stats.totalTokens }}</p>
            </div>
            <div class="rounded-lg border border-border p-2.5">
              <p class="text-[10px] text-muted-foreground">{{ t('chat.statCost') }}</p>
              <p class="text-lg font-semibold text-foreground" dir="ltr">${{ stats.cost.toFixed(2) }}</p>
            </div>
          </div>

          <div v-if="stats.models.length > 0" class="flex flex-col gap-1">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">
              {{ t('chat.statByModel') }}
            </p>
            <div
              v-for="model in stats.models"
              :key="model.id"
              class="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-border text-[11px]"
            >
              <span class="font-mono truncate" dir="ltr">{{ model.id }}</span>
              <span class="text-muted-foreground shrink-0" dir="ltr">${{ model.cost.toFixed(2) }}</span>
            </div>
          </div>
        </template>

        <!-- MCP -->
        <template v-else-if="activeTab === 'mcp'">
          <p v-if="mcpServers.length === 0" class="text-xs text-muted-foreground">
            {{ t('chat.mcpEmpty') }}
          </p>
          <div
            v-for="server in mcpServers"
            :key="server.id"
            class="flex items-center justify-between px-2.5 py-2 rounded-lg border border-border"
          >
            <span class="text-xs text-foreground truncate">{{ server.name }}</span>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
              :class="server.status === 'connected' ? 'bg-green-500/15 text-green-700 dark:text-green-300' : 'bg-muted text-muted-foreground'"
            >
              {{ server.status }}
            </span>
          </div>
        </template>

        <!-- Integrations -->
        <template v-else-if="activeTab === 'integrations'">
          <p v-if="integrations.length === 0" class="text-xs text-muted-foreground">
            {{ t('chat.integrationsEmpty') }}
          </p>
          <div
            v-for="item in integrations"
            :key="item.id"
            class="flex items-center justify-between px-2.5 py-2 rounded-lg border border-border"
          >
            <span class="text-xs text-foreground truncate">{{ item.name }}</span>
            <span class="text-[10px] text-muted-foreground shrink-0">
              {{ item.connected ? t('chat.credentialActive') : t('chat.credentialInactive') }}
            </span>
          </div>
        </template>

        <!-- Worktrees -->
        <template v-else-if="activeTab === 'worktrees'">
          <p v-if="worktrees.length === 0" class="text-xs text-muted-foreground">
            {{ t('chat.worktreesEmpty') }}
          </p>
          <div
            v-for="wt in worktrees"
            :key="wt.id"
            class="flex flex-col px-2.5 py-2 rounded-lg border border-border"
          >
            <span class="text-xs text-foreground font-mono truncate" dir="ltr">{{ wt.branch }}</span>
            <span class="text-[10px] text-muted-foreground font-mono truncate" dir="ltr">{{ wt.directory }}</span>
          </div>
        </template>

        <!-- Search -->
        <template v-else-if="activeTab === 'search'">
          <div class="flex items-center gap-2">
            <input
              v-model="query"
              data-search-input
              dir="ltr"
              type="text"
              class="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
              :placeholder="t('chat.searchPlaceholder')"
              @keydown.enter="search"
            />
            <Button size="sm" data-action="run-search" class="h-8" @click="search">
              {{ t('chat.searchAction') }}
            </Button>
          </div>
          <div
            v-for="(result, i) in results"
            :key="i"
            class="flex flex-col px-2.5 py-2 rounded-lg border border-border"
          >
            <a :href="result.url" target="_blank" rel="noopener noreferrer" class="text-xs text-primary underline truncate" dir="ltr">
              {{ result.title }}
            </a>
            <span class="text-[10px] text-muted-foreground truncate" dir="ltr">{{ result.url }}</span>
          </div>
        </template>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { BarChart3 } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import {
  fetchIntegrations,
  fetchMcpServers,
  fetchSessionStats,
  fetchWorktrees,
  runWebSearch,
  type IntegrationInfo,
  type McpServerInfo,
  type SessionStats,
  type WebSearchResult,
  type WorktreeInfo,
} from '@/services/opencode/insightsClient'

const props = defineProps<{
  open: boolean
  baseUrl: string
  auth: { username: string; password?: string }
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
}>()

const { t } = useI18n()

const tabs = [
  { id: 'usage', label: t('chat.tabUsage') },
  { id: 'mcp', label: t('chat.tabMcp') },
  { id: 'integrations', label: t('chat.tabIntegrations') },
  { id: 'worktrees', label: t('chat.tabWorktrees') },
  { id: 'search', label: t('chat.tabSearch') },
]
const activeTab = ref('usage')

const stats = ref<SessionStats>({ sessions: 0, prompts: 0, totalTokens: 0, cost: 0, models: [] })
const mcpServers = ref<McpServerInfo[]>([])
const integrations = ref<IntegrationInfo[]>([])
const worktrees = ref<WorktreeInfo[]>([])
const query = ref('')
const results = ref<WebSearchResult[]>([])
const error = ref('')

async function load(): Promise<void> {
  if (!props.baseUrl) return
  error.value = ''
  const [statsResult, mcpResult, integrationResult, worktreeResult] = await Promise.allSettled([
    fetchSessionStats(props.baseUrl, props.auth),
    fetchMcpServers(props.baseUrl, props.auth),
    fetchIntegrations(props.baseUrl, props.auth),
    fetchWorktrees(props.baseUrl, props.auth),
  ])
  if (statsResult.status === 'fulfilled') stats.value = statsResult.value
  if (mcpResult.status === 'fulfilled') mcpServers.value = mcpResult.value
  else mcpServers.value = []
  if (integrationResult.status === 'fulfilled') integrations.value = integrationResult.value
  else integrations.value = []
  if (worktreeResult.status === 'fulfilled') worktrees.value = worktreeResult.value
  else worktrees.value = []
  if (statsResult.status === 'rejected') {
    error.value = (statsResult.reason as any)?.message || 'Failed to load usage'
  }
}

async function search(): Promise<void> {
  const text = query.value.trim()
  if (!text || !props.baseUrl) return
  try {
    results.value = await runWebSearch(props.baseUrl, props.auth, text)
  } catch (err: any) {
    error.value = err?.message || 'Search failed'
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) void load()
  },
  { immediate: true }
)
</script>
