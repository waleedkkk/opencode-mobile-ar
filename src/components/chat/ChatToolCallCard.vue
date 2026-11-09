<template>
  <div class="my-2.5 rounded-xl border border-border bg-card overflow-hidden shadow-xs text-xs">
    <!-- Header toggle -->
    <button
      type="button"
      data-action="toggle-tool"
      class="w-full flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 hover:bg-muted/70 transition-colors text-start cursor-pointer select-none"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-2 min-w-0">
        <component :is="toolIcon" class="size-3.5 shrink-0 text-muted-foreground" />
        <span class="font-semibold text-foreground truncate">{{ tool.name }}</span>
        <span class="text-muted-foreground truncate font-mono text-[11px] dir-ltr">{{ argsPreview }}</span>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <span
          class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
          :class="statusBadgeClass"
        >
          {{ statusLabel }}
        </span>
        <ChevronDown
          class="size-3.5 text-muted-foreground transition-transform duration-200"
          :class="{ 'rotate-180': expanded }"
        />
      </div>
    </button>

    <!-- Collapsible Output/Result Area -->
    <div
      v-if="expanded && (tool.result || tool.error || tool.status === 'running')"
      data-tool-output
      dir="ltr"
      class="p-2.5 border-t border-border bg-background/50 font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap break-all text-muted-foreground"
    >
      <div v-if="tool.status === 'running' && !tool.result" class="flex items-center gap-2 text-primary animate-pulse">
        <Loader2 class="size-3 animate-spin" />
        <span>{{ t('chat.toolRunning') }}</span>
      </div>
      <div v-else-if="tool.error" class="text-destructive font-medium">
        {{ tool.error }}
      </div>
      <div v-else>
        {{ tool.result }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Terminal,
  FileEdit,
  FileText,
  Wrench,
  ChevronDown,
  Loader2,
} from '@lucide/vue'
import type { ToolCall } from '@/types/chat'
import { useI18n } from '@/i18n'

const props = defineProps<{
  tool: ToolCall
}>()

const { t } = useI18n()
const expanded = ref(props.tool.status === 'running')

const toolIcon = computed(() => {
  const name = props.tool.name.toLowerCase()
  if (name.includes('bash') || name.includes('shell') || name.includes('cmd')) return Terminal
  if (name.includes('edit') || name.includes('write') || name.includes('patch')) return FileEdit
  if (name.includes('read') || name.includes('view') || name.includes('cat')) return FileText
  return Wrench
})

const argsPreview = computed(() => {
  const args = props.tool.arguments || {}
  if (args.command) return String(args.command)
  if (args.path) return String(args.path)
  if (args.query) return String(args.query)
  try {
    const json = JSON.stringify(args)
    return json === '{}' ? '' : json
  } catch {
    return ''
  }
})

const statusLabel = computed(() => {
  if (props.tool.status === 'running') return t('chat.toolRunning') || 'running'
  if (props.tool.status === 'failed') return t('chat.toolFailed') || 'failed'
  return t('chat.toolCompleted') || 'completed'
})

const statusBadgeClass = computed(() => {
  if (props.tool.status === 'running') return 'bg-primary/10 text-primary animate-pulse'
  if (props.tool.status === 'failed') return 'bg-destructive/10 text-destructive'
  return 'bg-green-500/10 text-green-600 dark:text-green-400'
})
</script>

<style scoped>
.dir-ltr {
  direction: ltr;
  unicode-bidi: isolate;
}
</style>
