<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent side="bottom" class="h-[88vh] p-0 flex flex-col bg-card gap-0">
      <!-- Header -->
      <SheetHeader class="p-3 border-b border-border flex flex-row items-center justify-between">
        <SheetTitle class="text-sm font-semibold flex items-center gap-2">
          <TerminalSquare class="size-4 text-primary" />
          <span>{{ t('chat.terminalTitle') || 'Terminal' }}</span>
        </SheetTitle>
        <SheetDescription class="sr-only">Interactive PTY session</SheetDescription>
      </SheetHeader>

      <!-- PTY chooser -->
      <div v-if="!activePty" class="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        <p v-if="loading" class="text-center text-xs text-muted-foreground py-6">
          {{ t('chat.loading') || 'Loading…' }}
        </p>
        <p v-else-if="ptys.length === 0" class="text-center text-xs text-muted-foreground py-6">
          {{ t('chat.terminalEmpty') || 'No terminals' }}
        </p>
        <button
          v-for="pty in ptys"
          :key="pty.id"
          type="button"
          :data-pty="pty.id"
          class="flex items-center gap-2 px-2.5 py-2 rounded-lg text-start hover:bg-muted/80 cursor-pointer"
          @click="connect(pty.id)"
        >
          <TerminalSquare class="size-3.5 text-primary shrink-0" />
          <span class="text-xs flex-1 truncate" dir="ltr">{{ pty.title }}</span>
          <span class="text-[10px] text-muted-foreground">{{ pty.cols }}×{{ pty.rows }}</span>
        </button>
      </div>

      <!-- Active terminal -->
      <template v-else>
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30">
          <span class="text-[11px] text-muted-foreground font-mono" dir="ltr">{{ activePty }}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            data-action="terminal-disconnect"
            class="size-7"
            @click="disconnect"
          >
            <X class="size-3.5" />
          </Button>
        </div>

        <pre
          ref="outputRef"
          dir="ltr"
          class="flex-1 overflow-y-auto p-3 text-[11px] font-mono whitespace-pre-wrap text-foreground"
        >{{ output }}</pre>

        <div class="p-2 border-t border-border flex items-center gap-2">
          <span class="text-primary text-xs font-mono">$</span>
          <input
            v-model="input"
            data-terminal-input
            dir="ltr"
            type="text"
            class="flex-1 bg-transparent text-xs font-mono outline-none placeholder:text-muted-foreground"
            :placeholder="t('chat.terminalInputPlaceholder') || 'type a command…'"
            @keydown.enter="sendInput"
          />
          <Button size="sm" data-action="terminal-send" class="h-7" @click="sendInput">
            {{ t('chat.send') || 'Send' }}
          </Button>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { TerminalSquare, X } from '@lucide/vue'
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
  listPtys,
  requestPtyToken,
  buildPtySocketUrl,
} from '@/services/opencode/ptyClient'

const props = defineProps<{
  open: boolean
  baseUrl: string
  auth: { username: string; password?: string }
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
}>()

const { t } = useI18n()

const ptys = ref<{ id: string; title: string; cols: number; rows: number }[]>([])
const loading = ref(false)
const activePty = ref('')
const output = ref('')
const input = ref('')
const outputRef = ref<HTMLElement | null>(null)
let socket: WebSocket | null = null

async function load(): Promise<void> {
  if (!props.baseUrl) return
  loading.value = true
  try {
    ptys.value = await listPtys(props.baseUrl, props.auth)
  } catch (err) {
    console.warn('[terminal] list failed:', err)
    ptys.value = []
  } finally {
    loading.value = false
  }
}

async function connect(ptyId: string): Promise<void> {
  if (!props.baseUrl) return
  try {
    const token = await requestPtyToken(props.baseUrl, props.auth, ptyId)
    const url = buildPtySocketUrl(props.baseUrl, ptyId, token)

    socket = new WebSocket(url)
    socket.onopen = () => {
      output.value += ''
    }
    socket.onmessage = (event: any) => {
      output.value += String(event.data ?? '')
      nextTick(() => {
        if (outputRef.value) outputRef.value.scrollTop = outputRef.value.scrollHeight
      })
    }
    socket.onerror = () => {
      output.value += '\r\n[connection error]\r\n'
    }
    socket.onclose = () => {
      socket = null
    }

    activePty.value = ptyId
    output.value = ''
  } catch (err) {
    console.warn('[terminal] connect failed:', err)
  }
}

function disconnect(): void {
  socket?.close()
  socket = null
  activePty.value = ''
  output.value = ''
}

function sendInput(): void {
  const text = input.value
  if (!text || !socket) return
  socket.send(text.endsWith('\r') ? text : text + '\r')
  input.value = ''
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void load()
    } else {
      disconnect()
    }
  },
  { immediate: true }
)

defineExpose({ connect, sendInput, socket: computed(() => socket) })
</script>
