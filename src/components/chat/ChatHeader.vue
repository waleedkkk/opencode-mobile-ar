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

    <!-- Right / End: Git, Files, Terminal, Models, Quick shell -->
    <div class="flex items-center gap-1 shrink-0">
      <Button
        variant="ghost"
        size="icon-sm"
        data-action="open-git"
        class="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
        :title="t('chat.gitTitle') || 'Git'"
        @click="emit('openGit')"
      >
        <GitBranch class="size-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        data-action="open-files"
        class="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
        :title="t('chat.filesTitle') || 'Files'"
        @click="emit('openFiles')"
      >
        <FolderTree class="size-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        data-action="open-terminal"
        class="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
        :title="t('chat.terminalTitle') || 'Terminal'"
        @click="emit('openTerminal')"
      >
        <SquareTerminal class="size-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        data-action="open-models"
        class="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
        :title="t('chat.modelsTitle') || 'Models'"
        @click="emit('openModels')"
        @click.alt="emit('openProviders')"
        @click.meta="emit('openPermissions')"
      >
        <Boxes class="size-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        data-action="quick-shell"
        class="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
        :title="t('chat.quickShell') || 'Quick shell'"
        @click="emit('openQuickShell')"
      >
        <SquareTerminal class="size-3.5" />
      </Button>

    </div>
  </header>
</template>

<script setup lang="ts">
import { Menu, SquareTerminal, GitBranch, FolderTree, Boxes } from '@lucide/vue'
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
  openQuickShell: []
  openTerminal: []
  openModels: []
  openProviders: []
  openPermissions: []
  openFiles: []
  openGit: []
}>()

const { t } = useI18n()
</script>
