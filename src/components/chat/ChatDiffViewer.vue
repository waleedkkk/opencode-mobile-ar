<template>
  <div data-diff-container dir="ltr" class="my-2.5 rounded-xl border border-border bg-card overflow-hidden text-left font-mono text-[11px] shadow-2xs">
    <div
      v-for="(file, fIdx) in files"
      :key="fIdx"
      class="border-b last:border-b-0 border-border"
    >
      <!-- File header -->
      <div class="flex items-center justify-between px-3 py-1.5 bg-muted/80 text-muted-foreground text-xs select-none">
        <span class="font-medium text-foreground truncate max-w-[70%]">{{ file.newPath || file.oldPath }}</span>
        <div class="flex items-center gap-1.5 text-[10px] font-semibold shrink-0">
          <span v-if="file.additions > 0" class="text-green-600 dark:text-green-400">+{{ file.additions }}</span>
          <span v-if="file.deletions > 0" class="text-destructive">-{{ file.deletions }}</span>
        </div>
      </div>

      <!-- Diff lines container -->
      <div class="overflow-x-auto divide-y divide-border/20 max-h-80">
        <div
          v-for="(line, lIdx) in file.lines"
          :key="lIdx"
          :data-diff-type="line.type"
          class="flex items-start px-2 py-0.5 whitespace-pre font-mono leading-relaxed"
          :class="lineClass(line.type)"
        >
          <!-- Prefix marker: +, -, or space -->
          <span class="w-4 select-none shrink-0 font-bold opacity-70">{{ linePrefix(line.type) }}</span>
          <!-- Line content -->
          <span class="flex-1 overflow-x-visible break-normal">{{ line.content }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { parseUnifiedDiff } from '@/services/diff/diffParser'

const props = defineProps<{
  diff: string
}>()

const files = computed(() => {
  return parseUnifiedDiff(props.diff)
})

function linePrefix(type: string): string {
  if (type === 'add') return '+'
  if (type === 'delete') return '-'
  if (type === 'header') return '@'
  return ' '
}

function lineClass(type: string): string {
  if (type === 'add') return 'bg-green-500/15 text-green-700 dark:text-green-300'
  if (type === 'delete') return 'bg-destructive/15 text-destructive'
  if (type === 'header') return 'bg-muted/40 text-muted-foreground text-[10px] italic'
  return 'text-foreground hover:bg-muted/30'
}
</script>
