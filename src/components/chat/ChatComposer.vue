<template>
  <footer class="border-t border-border bg-background/95 backdrop-blur px-3 py-2 z-10">
    <div class="max-w-3xl mx-auto flex flex-col gap-2">
      <!-- Attached files preview strip -->
      <div
        v-if="attachments.length > 0"
        class="flex items-center gap-2 overflow-x-auto py-1 px-1"
      >
        <div
          v-for="file in attachments"
          :key="file.id"
          class="relative flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs shrink-0 max-w-44 shadow-2xs"
        >
          <img
            v-if="file.previewUrl"
            :src="file.previewUrl"
            class="size-5 rounded object-cover shrink-0"
            alt="Preview"
          />
          <FileText v-else class="size-3.5 text-muted-foreground shrink-0" />
          <span class="truncate text-[11px] font-medium text-foreground">{{ file.name }}</span>
          <button
            type="button"
            class="ms-1 size-4 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
            aria-label="Remove attachment"
            @click="removeAttachment(file.id)"
          >
            <X class="size-2.5" />
          </button>
        </div>
      </div>

      <!-- Main Input Row -->
      <div class="flex items-end gap-2">
        <!-- Hidden native file input -->
        <input
          ref="fileInputRef"
          type="file"
          class="hidden"
          multiple
          accept="image/*,text/*,application/json,.ts,.js,.py,.md,.sh"
          @change="handleFileChange"
        />

        <!-- Attachment Button -->
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-action="attach"
          :disabled="disabled || streaming"
          class="size-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
          :title="t('chat.attachFile') || 'Attach file'"
          @click="fileInputRef?.click()"
        >
          <Paperclip class="size-4" />
        </Button>

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
            :disabled="disabled || (!input.trim() && attachments.length === 0)"
            class="rounded-xl size-8 cursor-pointer shadow-xs disabled:opacity-40"
            :title="t('chat.send') || 'Send prompt'"
            @click="submit"
          >
            <ArrowUp class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ArrowUp, Square, Paperclip, X, FileText } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { FileAttachment } from '@/types/chat'
import { useI18n } from '@/i18n'

const props = defineProps<{
  disabled?: boolean
  streaming?: boolean
}>()

const emit = defineEmits<{
  send: [text: string, files?: FileAttachment[]]
  interrupt: []
}>()

const { t } = useI18n()
const input = ref('')
const attachments = ref<FileAttachment[]>([])
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

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

async function handleFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  for (const file of Array.from(target.files)) {
    try {
      const base64Data = await readFileAsBase64(file)
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined

      attachments.value.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        mime: file.type || 'application/octet-stream',
        data: base64Data,
        size: file.size,
        previewUrl,
      })
    } catch (e) {
      console.warn('Failed to read file:', file.name, e)
    }
  }

  // Clear native input so the same file can be picked again if removed
  target.value = ''
}

function removeAttachment(id: string): void {
  const index = attachments.value.findIndex((f) => f.id === id)
  if (index !== -1) {
    const item = attachments.value[index]
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
    attachments.value.splice(index, 1)
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      // Strip data:*/*;base64, prefix to leave pure Base64 for OpenCode Prompt.Base64
      const base64 = res.includes(',') ? res.split(',')[1] : res
      resolve(base64)
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

function submit(): void {
  if (props.streaming || props.disabled) return
  const text = input.value.trim()
  if (!text && attachments.value.length === 0) return

  const filesToSend = attachments.value.length > 0 ? [...attachments.value] : undefined
  if (filesToSend) {
    emit('send', text, filesToSend)
  } else {
    emit('send', text)
  }

  input.value = ''
  attachments.value = []

  nextTick(() => {
    adjustHeight()
  })
}
</script>
