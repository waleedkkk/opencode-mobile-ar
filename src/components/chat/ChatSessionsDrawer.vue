<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent :side="drawerSide" class="w-[82%] sm:max-w-xs p-0 flex flex-col h-full bg-card">
      <!-- Drawer Header -->
      <SheetHeader class="p-4 border-b border-border flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <SheetTitle class="text-sm font-semibold flex items-center gap-2">
            <MessageSquare class="size-4 text-primary" />
            <span>{{ t('chat.sessions') || 'Sessions' }}</span>
          </SheetTitle>
          <SheetDescription class="sr-only">List of previous sessions</SheetDescription>
        </div>

        <Button
          type="button"
          size="sm"
          data-action="new-session"
          class="w-full gap-2 justify-center font-medium"
          @click="emit('newSession')"
        >
          <Plus class="size-4" />
          <span>{{ t('chat.newSession') || 'New session' }}</span>
        </Button>
      </SheetHeader>

      <!-- Active project -->
      <div class="px-3 pb-2 border-b border-border flex flex-col gap-1.5">
        <p class="text-[10px] uppercase tracking-wide text-muted-foreground">{{ t('chat.projectTitle') || 'Project' }}</p>
        <p class="text-[11px] text-foreground font-mono truncate" dir="ltr">{{ currentDirectory || currentProjectID }}</p>
        <p class="text-[10px] text-muted-foreground">{{ t('chat.projectSwitchHint') }}</p>
        <div v-if="projects && projects.length > 0" class="flex flex-wrap gap-1.5 pt-1">
          <button
            v-for="project in projects"
            :key="project.id"
            type="button"
            :data-project="project.id"
            class="px-2.5 py-1 rounded-full border text-[11px] font-medium cursor-pointer transition-colors"
            :class="project.id === currentProjectID ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background text-foreground hover:bg-muted'"
            @click="emit('selectProject', project.id)"
          >
            {{ project.name || project.id }}
          </button>
        </div>
      </div>

      <!-- Sessions List -->
      <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        <div v-if="sessions.length === 0" class="py-8 text-center text-xs text-muted-foreground">
          {{ t('chat.noSessions') || 'No sessions yet' }}
        </div>

        <button
          v-for="s in sessions"
          :key="s.id"
          type="button"
          class="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-start text-xs transition-colors cursor-pointer"
          :class="s.id === currentSessionId ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'"
          @click="emit('select', s.id)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <MessageCircle class="size-3.5 shrink-0 opacity-70" />
            <span class="truncate">{{ s.title }}</span>
          </div>
          <span v-if="s.id === currentSessionId" class="size-1.5 rounded-full bg-primary shrink-0" />
        </button>
      </div>

      <!-- Drawer Footer: session details -->
      <div class="p-3 border-t border-border bg-muted/30 flex flex-col gap-1.5">
        <Button
          v-if="currentSessionId"
          type="button"
          variant="outline"
          size="sm"
          data-action="drawer-session-details"
          class="w-full justify-center gap-2 text-xs font-medium"
          @click="emit('openSessionDetails')"
        >
          <Info class="size-3.5" />
          <span>{{ t('chat.sessionDetails') || 'Session details' }}</span>
        </Button>

      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MessageSquare, MessageCircle, Plus, Info } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { SessionInfo } from '@/types/chat'
import { useI18n, isRtl } from '@/i18n'

defineProps<{
  open: boolean
  sessions: SessionInfo[]
  currentSessionId: string | null
  projects?: { id: string; name: string; directory: string }[]
  currentDirectory?: string
  currentProjectID?: string
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  select: [id: string]
  newSession: []
  openSessionDetails: []
  selectProject: [id: string]
}>()

const { t, locale } = useI18n()
const drawerSide = computed(() => isRtl(locale.value) ? 'right' : 'left')
</script>
