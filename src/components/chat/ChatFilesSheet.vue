<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent side="left" class="w-[86%] sm:max-w-md p-0 flex flex-col h-full bg-card gap-0">
      <!-- Header -->
      <SheetHeader class="p-3 border-b border-border flex flex-row items-center justify-between">
        <SheetTitle class="text-sm font-semibold flex items-center gap-2">
          <FolderTree class="size-4 text-primary" />
          <span>{{ t('chat.filesTitle') || 'Files' }}</span>
        </SheetTitle>
        <SheetDescription class="sr-only">Browse server files and open them</SheetDescription>
      </SheetHeader>

      <!-- Breadcrumb + back -->
      <div class="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/30" dir="ltr">
        <Button
          v-if="currentPath !== rootPath"
          variant="ghost"
          size="icon-sm"
          data-action="files-up"
          class="size-7 shrink-0"
          :title="t('chat.filesUp') || 'Up'"
          @click="navigateUp"
        >
          <ArrowLeft class="size-3.5 rtl:rotate-180" />
        </Button>
        <span class="text-[11px] text-muted-foreground truncate font-mono">{{ currentPath || rootPath }}</span>
      </div>

      <!-- Search -->
      <div class="px-3 py-2 border-b border-border">
        <input
          v-model="searchQuery"
          dir="ltr"
          type="text"
          class="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-mono outline-none placeholder:text-muted-foreground"
          :placeholder="t('chat.filesSearchPlaceholder') || 'Search files…'"
          @keydown.enter="runSearch"
        />
      </div>

      <!-- Entries -->
      <div class="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5">
        <p v-if="loading" class="text-center text-xs text-muted-foreground py-6">
          {{ t('chat.loading') || 'Loading…' }}
        </p>
        <p v-else-if="entries.length === 0" class="text-center text-xs text-muted-foreground py-6">
          {{ t('chat.filesEmpty') || 'No files' }}
        </p>

        <button
          v-for="entry in entries"
          :key="entry.path"
          type="button"
          :data-file-entry="entry.path"
          class="flex items-center gap-2 px-2.5 py-2 rounded-lg text-start hover:bg-muted/80 transition-colors cursor-pointer"
          @click="openEntry(entry)"
        >
          <Folder v-if="entry.type === 'directory'" class="size-3.5 text-primary shrink-0" />
          <FileText v-else class="size-3.5 text-muted-foreground shrink-0" />
          <span class="text-xs truncate flex-1" dir="ltr">{{ entryName(entry.path) }}</span>
          <ChevronRight v-if="entry.type === 'directory'" class="size-3 text-muted-foreground rtl:rotate-180 shrink-0" />
        </button>
      </div>

      <!-- File viewer overlay -->
      <div
        v-if="openFilePath"
        data-file-viewer
        class="absolute inset-0 z-10 flex flex-col bg-card"
      >
        <div class="flex items-center justify-between px-3 py-2 border-b border-border">
          <span class="text-xs font-mono truncate" dir="ltr">{{ openFilePath }}</span>
          <div class="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              data-action="copy-file"
              class="size-7"
              :title="t('chat.copy') || 'Copy'"
              @click="copyFileContent"
            >
              <Copy class="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              data-action="edit-file"
              class="size-7"
              :title="t('common.edit') || 'Edit'"
              @click="startEditing"
            >
              <Pencil class="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              data-action="close-file"
              class="size-7"
              @click="openFilePath = ''; fileContent = ''"
            >
              <X class="size-3.5" />
            </Button>
          </div>
        </div>
        <pre
          dir="ltr"
          class="flex-1 overflow-auto p-3 text-[11px] font-mono whitespace-pre text-foreground"
        >{{ fileContent }}</pre>
      </div>

      <div v-if="editingPath" data-file-editor class="absolute inset-0 z-20 flex flex-col bg-card">
        <div class="flex items-center justify-between px-3 py-2 border-b border-border">
          <span class="text-xs font-mono truncate" dir="ltr">{{ editingPath }}</span>
          <div class="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" data-action="editor-save" class="h-7 text-[11px] text-primary cursor-pointer" :disabled="editorSaving" @click="saveEditing">
              <span>{{ editorSaving ? (t('form.saving') || 'Saving...') : (t('common.save') || 'Save') }}</span>
            </Button>
            <Button variant="ghost" size="sm" data-action="editor-cancel" class="h-7 text-[11px] cursor-pointer" @click="cancelEditing">
              <span>{{ t('common.cancel') || 'Cancel' }}</span>
            </Button>
          </div>
        </div>
        <p v-if="editorError" class="px-3 py-1.5 text-[11px] text-destructive border-b border-border">{{ editorError }}</p>
        <textarea data-editor-textarea v-model="editorValue" dir="ltr" spellcheck="false" class="flex-1 w-full resize-none bg-background p-3 text-[11px] font-mono leading-relaxed outline-none text-foreground" />
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  FolderTree,
  Folder,
  FileText,
  ChevronRight,
  ArrowLeft,
  Copy,
  X,
  Pencil,
} from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import {
  listDirectory,
  findFiles,
  readFile,
  fileNameOf,
  type FileEntry,
} from '@/services/opencode/filesClient'
import { writeFileContent } from '@/services/opencode/fileEditorClient'

const props = defineProps<{
  open: boolean
  baseUrl: string
  auth: { username: string; password?: string }
  rootPath?: string
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
}>()

const { t } = useI18n()

const normalizedRoot = computed(() => (props.rootPath || '/').replace(/\/+$/, ''))
const currentPath = ref('')
const entries = ref<FileEntry[]>([])
const loading = ref(false)
const searchQuery = ref('')
const openFilePath = ref('')
const fileContent = ref('')
const editingPath = ref('')
const editorValue = ref('')
const editorOriginal = ref('')
const editorSaving = ref(false)
const editorError = ref('')

const isDirty = computed(() => editingPath.value !== '' && editorValue.value !== editorOriginal.value)

function startEditing(): void {
  if (!openFilePath.value) return
  editingPath.value = openFilePath.value
  editorOriginal.value = fileContent.value
  editorValue.value = fileContent.value
  editorError.value = ''
}

function cancelEditing(): void {
  editingPath.value = ''
  editorValue.value = ''
  editorOriginal.value = ''
  editorError.value = ''
}

async function saveEditing(): Promise<void> {
  if (!editingPath.value || !props.baseUrl) return
  editorSaving.value = true
  editorError.value = ''
  try {
    await writeFileContent(props.baseUrl, props.auth, editingPath.value, editorValue.value)
    fileContent.value = editorValue.value
    editingPath.value = ''
  } catch (err: any) {
    editorError.value = err?.message || 'Failed to save file'
  } finally {
    editorSaving.value = false
  }
}

function entryName(path: string): string {
  return fileNameOf(path)
}

async function load(): Promise<void> {
  if (!props.baseUrl) return
  loading.value = true
  try {
    entries.value = props.rootPath
      ? await listDirectory(props.baseUrl, props.auth, normalizedRoot.value)
      : await listDirectory(props.baseUrl, props.auth)
  } catch (err) {
    console.warn('[files] list failed:', err)
    entries.value = []
  } finally {
    loading.value = false
  }
}

async function navigate(path: string): Promise<void> {
  if (!props.baseUrl) return
  loading.value = true
  try {
    entries.value = await listDirectory(props.baseUrl, props.auth, path)
    currentPath.value = path
  } catch (err) {
    console.warn('[files] navigate failed:', err)
  } finally {
    loading.value = false
  }
}

function navigateUp(): void {
  const target = currentPath.value || normalizedRoot.value
  const index = target.lastIndexOf('/')
  navigate(index > 0 ? target.substring(0, index) : '/')
}

async function openEntry(entry: FileEntry): Promise<void> {
  if (isDirty.value) return
  if (entry.type === 'directory') {
    await navigate(entry.path)
    return
  }
  if (!props.baseUrl) return
  try {
    fileContent.value = await readFile(props.baseUrl, props.auth, entry.path)
    openFilePath.value = entry.path
  } catch (err) {
    console.warn('[files] read failed:', err)
  }
}

async function runSearch(): Promise<void> {
  const query = searchQuery.value.trim()
  if (!query || !props.baseUrl) return
  loading.value = true
  try {
    entries.value = await findFiles(props.baseUrl, props.auth, query)
  } catch (err) {
    console.warn('[files] search failed:', err)
    entries.value = []
  } finally {
    loading.value = false
  }
}

function copyFileContent(): void {
  if (fileContent.value && navigator.clipboard) {
    void navigator.clipboard.writeText(fileContent.value)
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      currentPath.value = ''
      searchQuery.value = ''
      openFilePath.value = ''
      void load()
    }
  },
  { immediate: true }
)
</script>
