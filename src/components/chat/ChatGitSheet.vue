<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent side="left" class="w-[86%] sm:max-w-md p-0 flex flex-col h-full bg-card gap-0">
      <!-- Header -->
      <SheetHeader class="p-3 border-b border-border flex flex-row items-center justify-between">
        <SheetTitle class="text-sm font-semibold flex items-center gap-2">
          <GitBranch class="size-4 text-primary" />
          <span>{{ t('chat.gitTitle') || 'Git' }}</span>
        </SheetTitle>
        <SheetDescription class="sr-only">Version control status and diffs</SheetDescription>
      </SheetHeader>

      <!-- Branch chip -->
      <div class="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
        <button
          v-if="isRepository"
          type="button"
          data-action="show-branches"
          class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-border bg-background text-[11px] font-medium cursor-pointer hover:bg-muted"
          @click="toggleBranches"
        >
          <GitBranch class="size-3 text-primary" />
          <span class="font-mono">{{ branchName }}</span>
        </button>
        <span v-if="changedCount > 0" class="text-[11px] text-muted-foreground">
          {{ changedCount }} {{ t('chat.gitChanged') || 'changed' }}
        </span>
      </div>

      <!-- Branches list -->
      <div v-if="showBranches" class="px-1.5 py-1 border-b border-border flex flex-col gap-0.5">
        <p class="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {{ t('chat.gitBranches') || 'Branches' }}
        </p>
        <button
          v-for="branch in branches"
          :key="branch"
          type="button"
          class="px-2.5 py-1.5 rounded-lg text-start text-xs font-mono hover:bg-muted/80 cursor-pointer"
          :class="branch === branchName ? 'text-primary font-semibold' : 'text-foreground'"
          @click="showBranches = false"
        >
          {{ branch }}
        </button>
      </div>

      <!-- Changed files -->
      <div class="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5">
        <p v-if="loading" class="text-center text-xs text-muted-foreground py-6">
          {{ t('chat.loading') || 'Loading…' }}
        </p>
        <p v-else-if="statusFiles.length === 0" class="text-center text-xs text-muted-foreground py-6">
          {{ isRepository ? (t('chat.gitClean') || 'Working tree clean') : (t('chat.gitNoRepo') || 'Not a git repository') }}
        </p>

        <button
          v-for="file in statusFiles"
          :key="file.path"
          type="button"
          :data-vcs-file="file.path"
          class="flex items-center gap-2 px-2.5 py-2 rounded-lg text-start hover:bg-muted/80 transition-colors cursor-pointer"
          @click="openDiff(file.path)"
        >
          <FileDiff class="size-3.5 text-muted-foreground shrink-0" />
          <span class="text-xs truncate flex-1 font-mono" dir="ltr">{{ file.path }}</span>
          <span class="text-[10px] shrink-0 flex items-center gap-1">
            <span v-if="file.additions > 0" class="text-green-600 dark:text-green-400">+{{ file.additions }}</span>
            <span v-if="file.deletions > 0" class="text-destructive">-{{ file.deletions }}</span>
          </span>
        </button>
      </div>

      <!-- Diff overlay -->
      <div v-if="diffPath" data-diff-viewer class="absolute inset-0 z-10 flex flex-col bg-card">
        <div class="flex items-center justify-between px-3 py-2 border-b border-border">
          <span class="text-xs font-mono truncate" dir="ltr">{{ diffPath }}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            data-action="close-diff"
            class="size-7"
            @click="diffPath = ''; diffText = ''"
          >
            <X class="size-3.5" />
          </Button>
        </div>
        <div class="flex-1 overflow-auto p-2">
          <ChatDiffViewer :diff="diffText" />
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { GitBranch, FileDiff, X } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import ChatDiffViewer from './ChatDiffViewer.vue'
import {
  fetchVcsStatus,
  fetchVcsDiff,
  fetchVcsInfo,
  fetchVcsBranches,
  type VcsStatusFile,
} from '@/services/opencode/vcsClient'

const props = defineProps<{
  open: boolean
  baseUrl: string
  auth: { username: string; password?: string }
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
}>()

const { t } = useI18n()

const branchName = ref('')
const isRepository = ref(false)
const statusFiles = ref<VcsStatusFile[]>([])
const loading = ref(false)
const showBranches = ref(false)
const branches = ref<string[]>([])
const diffPath = ref('')
const diffText = ref('')

const changedCount = computed(() => statusFiles.value.length)

async function load(): Promise<void> {
  if (!props.baseUrl) return
  loading.value = true
  try {
    const [info, status] = await Promise.all([
      fetchVcsInfo(props.baseUrl, props.auth),
      fetchVcsStatus(props.baseUrl, props.auth),
    ])
    isRepository.value = info.isRepository
    branchName.value = info.branchName
    statusFiles.value = status.files
  } catch (err) {
    console.warn('[git] load failed:', err)
  } finally {
    loading.value = false
  }
}

async function toggleBranches(): Promise<void> {
  showBranches.value = !showBranches.value
  if (!showBranches.value || branches.value.length > 0 || !props.baseUrl) return
  try {
    branches.value = await fetchVcsBranches(props.baseUrl, props.auth)
  } catch (err) {
    console.warn('[git] branches failed:', err)
  }
}

async function openDiff(path: string): Promise<void> {
  if (!props.baseUrl) return
  diffPath.value = path
  diffText.value = ''
  try {
    diffText.value = await fetchVcsDiff(props.baseUrl, props.auth)
  } catch (err) {
    console.warn('[git] diff failed:', err)
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) void load()
  },
  { immediate: true }
)
</script>
