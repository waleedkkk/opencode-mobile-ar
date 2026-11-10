<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent side="bottom" class="h-[80vh] p-0 flex flex-col bg-card gap-0">
      <!-- Header -->
      <SheetHeader class="p-3.5 border-b border-border flex flex-row items-center justify-between">
        <SheetTitle class="text-sm font-semibold flex items-center gap-2">
          <SquareTerminal class="size-4 text-primary" />
          <span>{{ t('chat.quickShell') || 'Quick shell' }}</span>
        </SheetTitle>
        <SheetDescription class="sr-only">Run a shell command on the connected OpenCode session</SheetDescription>
      </SheetHeader>

      <!-- Output area -->
      <div
        dir="ltr"
        class="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-foreground bg-background/60"
      >
        <p v-if="!lastResult" class="text-muted-foreground font-sans">
          {{ t('chat.shellEmpty') }}
        </p>
        <template v-else>
          <div class="mb-2 text-muted-foreground font-sans">
            <span class="text-primary">$</span> <span class="text-foreground font-mono">{{ lastResult.command }}</span>
          </div>
          <pre class="m-0! font-mono">{{ lastResult.output }}</pre>
          <div
            class="mt-2 font-sans text-[10px]"
            :class="lastResult.exitCode === 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'"
          >
            {{ t('chat.shellExit') }}: {{ lastResult.exitCode ?? '—' }}
          </div>
        </template>
      </div>

      <!-- Input row -->
      <div class="p-3 border-t border-border flex items-end gap-2 bg-card">
        <div class="flex-1 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring/40">
          <input
            v-model="command"
            dir="ltr"
            type="text"
            class="w-full bg-transparent text-xs font-mono outline-none placeholder:text-muted-foreground"
            :placeholder="t('chat.shellPlaceholder') || 'git status…'"
            :disabled="running"
            @keydown.enter="run"
          />
        </div>
        <Button
          type="button"
          size="sm"
          data-action="shell-run"
          class="gap-1.5 h-9 cursor-pointer"
          :disabled="running || !command.trim()"
          @click="run"
        >
          <Play v-if="!running" class="size-3.5" />
          <Loader2 v-else class="size-3.5 animate-spin" />
          <span>{{ running ? (t('chat.shellRunning') || 'Running…') : (t('chat.shellRun') || 'Run') }}</span>
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { SquareTerminal, Play, Loader2 } from '@lucide/vue'
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
  runShellCommand,
  fetchLatestShellOutput,
  type ShellResult,
} from '@/services/opencode/shellClient'

const props = defineProps<{
  open: boolean
  baseUrl: string
  auth: { username: string; password?: string }
  sessionId: string | null
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
}>()

const { t } = useI18n()
const command = ref('')
const running = ref(false)
const lastResult = ref<ShellResult | null>(null)
const lastShellId = ref<string | null>(null)

async function run(): Promise<void> {
  const cmd = command.value.trim()
  if (!cmd || !props.sessionId || running.value) return

  running.value = true
  try {
    await runShellCommand(props.baseUrl, props.auth, props.sessionId, cmd)
    command.value = ''
    // Poll for output since the endpoint returns 204 (background execution)
    await pollForResult()
  } catch (err) {
    console.warn('[quickShell] run failed:', err)
  } finally {
    running.value = false
  }
}

async function pollForResult(attempt = 0): Promise<void> {
  if (!props.sessionId || attempt > 12) return

  await new Promise((r) => setTimeout(r, 700))
  try {
    const result = await fetchLatestShellOutput(props.baseUrl, props.auth, props.sessionId)
    if (result && result.shellId !== lastShellId.value && result.command) {
      if (result.status === 'running') {
        await pollForResult(attempt + 1)
        return
      }
      lastShellId.value = result.shellId
      lastResult.value = result
      return
    }
    await pollForResult(attempt + 1)
  } catch {
    // retry until the poll budget is exhausted
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      command.value = ''
    }
  }
)
</script>
