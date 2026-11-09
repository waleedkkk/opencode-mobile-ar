<template>
  <div
    class="flex flex-col gap-1.5 my-2.5 transition-opacity"
    :class="isUser ? 'items-end' : 'items-start'"
    :data-role="message.role"
  >
    <!-- Role badge / Author label -->
    <div class="text-[11px] font-medium text-muted-foreground px-1 select-none flex items-center gap-1.5">
      <span>{{ isUser ? (t('demo.you') || 'You') : 'OpenCode' }}</span>
      <span v-if="timeLabel" class="text-[10px] opacity-70">{{ timeLabel }}</span>
    </div>

    <!-- Bubble content -->
    <div
      class="max-w-[88%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-2xs text-xs"
      :class="bubbleClass"
    >
      <!-- User message: plain text -->
      <p v-if="isUser" class="whitespace-pre-wrap leading-relaxed">
        {{ message.content }}
      </p>

      <!-- Assistant message: rich markdown + tools -->
      <div v-else class="flex flex-col gap-2">
        <ChatMarkdown v-if="message.content" :content="message.content" />

        <!-- Tool calls if any -->
        <div v-if="message.toolCalls && message.toolCalls.length > 0" class="flex flex-col gap-1.5 mt-1">
          <ChatToolCallCard
            v-for="tool in message.toolCalls"
            :key="tool.id"
            :tool="tool"
          />
        </div>

        <!-- Inline permission request if present -->
        <ChatPermissionCard
          v-if="message.pendingPermission"
          :request="message.pendingPermission"
          @allow="(id) => emit('allowPermission', id)"
          @deny="(id) => emit('denyPermission', id)"
        />

        <!-- Live streaming pulsing dot -->
        <div v-if="message.streaming && !message.content" class="flex items-center gap-1.5 py-1 text-muted-foreground">
          <span class="size-1.5 rounded-full bg-primary animate-ping" />
          <span class="text-[11px]">Thinking...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@/types/chat'
import ChatMarkdown from './ChatMarkdown.vue'
import ChatToolCallCard from './ChatToolCallCard.vue'
import ChatPermissionCard from './ChatPermissionCard.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  message: ChatMessage
}>()

const emit = defineEmits<{
  allowPermission: [id: string]
  denyPermission: [id: string]
}>()

const { t } = useI18n()

const isUser = computed(() => props.message.role === 'user')

const bubbleClass = computed(() => {
  if (isUser.value) {
    return 'bg-primary text-primary-foreground ms-6 rounded-be-xs'
  }
  return 'bg-card text-card-foreground border border-border me-6 rounded-bs-xs'
})

const timeLabel = computed(() => {
  if (!props.message.createdAt) return ''
  try {
    const d = new Date(props.message.createdAt)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
})
</script>
