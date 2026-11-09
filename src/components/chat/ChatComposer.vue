<template>
  <footer class="border-t border-border bg-background/95 backdrop-blur px-3 py-2.5 z-10">
    <div class="max-w-3xl mx-auto flex items-end gap-2">
      <!-- Input container with autogrow textarea -->
      <div class="flex-1 min-w-0 rounded-2xl border border-input bg-card shadow-2xs focus-within:ring-2 focus-within:ring-ring/40 transition-shadow flex items-end px-3 py-1.5">
        <textarea
          ref="textareaRef"
          v-model="input"
          rows="1"
          :disabled="disabled"
          class="w-full resize-none bg-transparent text-xs leading-5 outline-none max-h-32 py-1 placeholder:text-muted-foreground text-foreground"
          :placeholder="t('chat.inputPlaceholder') || 'Type a prompt...'"
          @input="adjustHeight"
          @keydown="handleKeydown"
        />
      </div>

      <!-- Action Button: Send or Stop/Interrupt -->
      <div class="shrink-0">
        <Button
          v-if="streaming"
          type="button"
          size="icon-sm"
          variant="destructive"
          data-action="interrupt"
          class="rounded-xl size-8 cursor-pointer shadow-xs"
          :title="t('chat.interrupt') || 'Stop generation'"
          @click="emit('interrupt')"
        >
          <Square class="size-3.5 fill-current" />
        </Button>

        <Button
          v-else
          type="button"
          size="icon-sm"
          data-action="send"
          :disabled="disabled || !input.trim()"
          class="rounded-xl size-8 cursor-pointer shadow-xs disabled:opacity-40"
          :title="t('chat.send') || 'Send prompt'"
          @click="submit"
        >
          <ArrowUp class="size-4" />
        </Button>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ArrowUp, Square } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

const props = defineProps<{
  disabled?: boolean
  streaming?: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
  interrupt: []
}>()

const { t } = useI18n()
const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function adjustHeight(): void {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
}

function handleKeydown(e: KeyboardEvent): void {
  const isEnter = e.key === 'Enter' || e.key === 'enter' || e.keyCode === 13
  if (isEnter && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function submit(): void {
  if (props.streaming || props.disabled) return
  const text = input.value.trim()
  if (!text) return
  emit('send', text)
  input.value = ''
  nextTick(() => {
    adjustHeight()
  })
}
</script>
