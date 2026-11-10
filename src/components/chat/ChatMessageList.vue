<template>
  <div
    ref="listContainer"
    class="flex-1 overflow-y-auto px-3.5 py-3 relative overscroll-contain"
    @scroll="handleScroll"
  >
    <div class="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
      <!-- Empty state when no messages -->
      <div
        v-if="messages.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3 my-auto"
      >
        <div class="size-10 rounded-full bg-muted flex items-center justify-center text-primary">
          <Sparkles class="size-5" />
        </div>
        <p class="text-sm font-medium text-foreground">
          {{ t('demo.welcome') || 'Start a conversation with OpenCode' }}
        </p>
        <p class="text-xs max-w-xs leading-relaxed text-muted-foreground">
          {{ t('demo.hint') || 'Ask about code, debug an issue, or run a shell command.' }}
        </p>
      </div>

      <!-- Messages loop -->
      <ChatMessageItem
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        @allow-permission="(id) => emit('allowPermission', id)"
        @deny-permission="(id) => emit('denyPermission', id)"
      />

      <!-- Suggested Quick Action Chips -->
      <div
        v-if="showActionChips"
        data-action-chips
        class="flex items-center gap-1.5 overflow-x-auto py-2 px-1 my-1 select-none"
      >
        <button
          type="button"
          data-action-chip="test"
          class="shrink-0 px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted text-[11px] font-medium text-foreground transition-colors cursor-pointer shadow-2xs"
          @click="emit('selectAction', 'Run the project tests and report any failures.')"
        >
          {{ t('chat.actionRunTests') || '⚡ Run tests' }}
        </button>
        <button
          type="button"
          data-action-chip="commit"
          class="shrink-0 px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted text-[11px] font-medium text-foreground transition-colors cursor-pointer shadow-2xs"
          @click="emit('selectAction', 'Review current git diff and commit the changes.')"
        >
          {{ t('chat.actionCommit') || '📝 Commit changes' }}
        </button>
        <button
          type="button"
          data-action-chip="explain"
          class="shrink-0 px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted text-[11px] font-medium text-foreground transition-colors cursor-pointer shadow-2xs"
          @click="emit('selectAction', 'Please explain how this solution works in more detail.')"
        >
          {{ t('chat.actionExplain') || '💡 Explain more' }}
        </button>
      </div>
    </div>

    <!-- Floating jump to bottom button -->
    <Transition name="fade">
      <button
        v-if="showScrollButton"
        type="button"
        class="fixed bottom-20 end-5 z-20 size-8 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:opacity-90 cursor-pointer"
        aria-label="Scroll to bottom"
        @click="scrollToBottom(true)"
      >
        <ArrowDown class="size-4" />
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { Sparkles, ArrowDown } from '@lucide/vue'
import type { ChatMessage } from '@/types/chat'
import ChatMessageItem from './ChatMessageItem.vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  messages: ChatMessage[]
  streaming?: boolean
}>()

const emit = defineEmits<{
  allowPermission: [id: string]
  denyPermission: [id: string]
  selectAction: [prompt: string]
}>()

const { t } = useI18n()
const listContainer = ref<HTMLElement | null>(null)
const showScrollButton = ref(false)
let userIsScrolledUp = false

const showActionChips = computed(() => {
  if (props.streaming || props.messages.length === 0) return false
  const last = props.messages[props.messages.length - 1]
  return last && last.role === 'assistant' && !last.streaming
})

function handleScroll(): void {
  if (!listContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = listContainer.value
  const distanceToBottom = scrollHeight - scrollTop - clientHeight

  userIsScrolledUp = distanceToBottom > 80
  showScrollButton.value = distanceToBottom > 160
}

function scrollToBottom(smooth = false): void {
  nextTick(() => {
    if (!listContainer.value) return
    if (typeof listContainer.value.scrollTo === 'function') {
      listContainer.value.scrollTo({
        top: listContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    } else {
      listContainer.value.scrollTop = listContainer.value.scrollHeight
    }
    userIsScrolledUp = false
    showScrollButton.value = false
  })
}

// Auto scroll on messages change unless user intentionally scrolled up
watch(
  () => props.messages.length,
  () => {
    if (!userIsScrolledUp) scrollToBottom()
  }
)

// Auto scroll during active streaming
watch(
  () => props.streaming,
  (isStreaming) => {
    if (isStreaming && !userIsScrolledUp) scrollToBottom()
  }
)

// Auto scroll during active streaming as content grows
watch(
  () => props.messages[props.messages.length - 1]?.content,
  () => {
    if (props.streaming && !userIsScrolledUp) scrollToBottom()
  }
)

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
