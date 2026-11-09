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
import { ref, watch, nextTick, onMounted } from 'vue'
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
}>()

const { t } = useI18n()
const listContainer = ref<HTMLElement | null>(null)
const showScrollButton = ref(false)
let userIsScrolledUp = false

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
