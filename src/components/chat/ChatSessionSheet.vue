<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent side="left" class="w-[88%] sm:max-w-md p-0 flex flex-col h-full bg-card gap-0">
      <SheetHeader class="p-3 border-b border-border flex flex-row items-center justify-between">
        <SheetTitle class="text-sm font-semibold flex items-center gap-2">
          <Info class="size-4 text-primary" />
          <span>{{ detail?.title || t('chat.title') || 'Session' }}</span>
        </SheetTitle>
        <SheetDescription class="sr-only">Session details, actions, commands and skills</SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        <!-- Metadata -->
        <div v-if="detail" class="flex flex-col gap-1.5 text-[11px]">
          <div class="flex justify-between gap-2">
            <span class="text-muted-foreground">{{ t('chat.sessionId') || 'Session' }}</span>
            <span class="font-mono truncate" dir="ltr">{{ detail.id }}</span>
          </div>
          <div class="flex justify-between gap-2">
            <span class="text-muted-foreground">{{ t('chat.sessionAgent') || 'Agent' }}</span>
            <span class="font-mono">{{ detail.agent || '—' }}</span>
          </div>
          <div class="flex justify-between gap-2">
            <span class="text-muted-foreground">{{ t('chat.sessionProject') || 'Project' }}</span>
            <span class="font-mono truncate" dir="ltr">{{ detail.projectID || '—' }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-1.5">
          <button
            type="button"
            data-action="fork-session"
            class="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border hover:bg-muted/80 transition-colors cursor-pointer text-start"
            @click="fork"
          >
            <GitFork class="size-3.5 text-primary shrink-0" />
            <span class="text-xs flex-1">{{ t('chat.forkSession') || 'Fork session' }}</span>
          </button>
          <button
            type="button"
            data-action="export-session"
            class="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border hover:bg-muted/80 transition-colors cursor-pointer text-start"
            @click="runExport"
          >
            <Download class="size-3.5 text-primary shrink-0" />
            <span class="text-xs flex-1">{{ t('chat.exportSession') || 'Export session' }}</span>
          </button>
          <a
            v-if="exportUrl"
            :href="exportUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[11px] text-primary underline truncate px-2.5"
            dir="ltr"
          >
            {{ exportUrl }}
          </a>
        </div>

        <!-- Commands -->
        <div v-if="commands.length > 0" class="flex flex-col gap-1">
          <p class="text-[10px] uppercase tracking-wide text-muted-foreground">
            {{ t('chat.commandsTitle') || 'Commands' }}
          </p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="cmd in commands"
              :key="cmd.id"
              type="button"
              :data-command="cmd.id"
              class="px-2.5 py-1 rounded-full border border-border bg-background text-[11px] font-mono hover:bg-muted cursor-pointer"
              :title="cmd.description"
              @click="emit('run-command', cmd.id)"
            >
              {{ cmd.id }}
            </button>
          </div>
        </div>

        <!-- Skills -->
        <div v-if="skills.length > 0" class="flex flex-col gap-1">
          <p class="text-[10px] uppercase tracking-wide text-muted-foreground">
            {{ t('chat.skillsTitle') || 'Skills' }}
          </p>
          <div class="flex flex-col gap-0.5">
            <button
              v-for="skill in skills"
              :key="skill.id"
              type="button"
              :data-skill="skill.id"
              class="flex flex-col px-2.5 py-2 rounded-lg hover:bg-muted/80 cursor-pointer text-start"
              @click="emit('run-skill', skill.id)"
            >
              <span class="text-xs font-medium">{{ skill.name }}</span>
              <span v-if="skill.description" class="text-[10px] text-muted-foreground leading-snug">
                {{ skill.description }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Info, GitFork, Download } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useI18n } from '@/i18n'
import {
  fetchSessionDetail,
  forkSession,
  exportSession,
  type SessionDetail,
} from '@/services/opencode/sessionClient'
import { fetchCommands, fetchSkills } from '@/services/opencode/metaClient'

const props = defineProps<{
  open: boolean
  baseUrl: string
  auth: { username: string; password?: string }
  sessionId: string | null
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  'session-forked': [sessionId: string]
  'run-command': [commandName: string]
  'run-skill': [skillId: string]
}>()

const { t } = useI18n()

const detail = ref<SessionDetail | null>(null)
const commands = ref<{ id: string; name: string; description: string }[]>([])
const skills = ref<{ id: string; name: string; description: string }[]>([])
const exportUrl = ref('')

async function load(): Promise<void> {
  if (!props.baseUrl) return
  const [meta, cmds, skillList] = await Promise.all([
    props.sessionId ? fetchSessionDetail(props.baseUrl, props.auth, props.sessionId) : Promise.resolve(null),
    fetchCommands(props.baseUrl, props.auth),
    fetchSkills(props.baseUrl, props.auth),
  ])
  detail.value = meta
  commands.value = cmds
  skills.value = skillList
}

async function fork(): Promise<void> {
  if (!props.baseUrl || !props.sessionId) return
  try {
    const result = await forkSession(props.baseUrl, props.auth, props.sessionId)
    emit('session-forked', result.id)
    emit('update:open', false)
  } catch (err) {
    console.warn('[session] fork failed:', err)
  }
}

async function runExport(): Promise<void> {
  if (!props.baseUrl || !props.sessionId) return
  try {
    const result = await exportSession(props.baseUrl, props.auth, props.sessionId)
    exportUrl.value = result.url
  } catch (err) {
    console.warn('[session] export failed:', err)
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      exportUrl.value = ''
      void load()
    }
  },
  { immediate: true }
)
</script>
