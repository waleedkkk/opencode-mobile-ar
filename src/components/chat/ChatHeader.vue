<template>
  <header class="sticky top-0 z-20 flex items-center justify-between gap-2.5 px-3.5 py-2.5 border-b border-border bg-background/95 backdrop-blur">
    <!-- Left / Start: Drawer toggle + Session title -->
    <div class="flex items-center gap-2 min-w-0">
      <Button
        variant="ghost"
        size="icon-sm"
        data-action="open-drawer"
        class="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Sessions history"
        @click="emit('openDrawer')"
      >
        <Menu class="size-4" />
      </Button>

      <div class="flex flex-col min-w-0">
        <div class="flex items-center gap-1.5 min-w-0">
          <StatusDot :status="status" />
          <h2 class="text-xs font-semibold truncate text-foreground leading-tight">
            {{ title || t('chat.title') || 'OpenCode Chat' }}
          </h2>
        </div>
        <span v-if="model" class="text-[10px] text-muted-foreground truncate font-mono">
          {{ model }}
        </span>
      </div>
    </div>

    <!-- Right / End: Switch to full WebView button -->
    <div class="flex items-center gap-1 shrink-0">
      <Button
        variant="outline"
        size="xs"
        data-action="open-webview"
        class="h-7 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
        :title="t('chat.openWebView') || 'Open in WebView'"
        @click="emit('openWebView')"
      >
        <Globe class="size-3.5" />
        <span class="hidden sm:inline">{{ t('chat.openWebView') || 'WebView' }}</span>
      </Button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Menu, Globe } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import StatusDot from '@/components/StatusDot.vue'
import { useI18n } from '@/i18n'

defineProps<{
  title?: string
  model?: string
  status: string
}>()

const emit = defineEmits<{
  openDrawer: []
  openWebView: []
}>()

const { t } = useI18n()
</script>
