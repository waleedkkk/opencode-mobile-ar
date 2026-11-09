<template>
  <div class="my-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-3.5 text-xs shadow-xs">
    <div class="flex items-start gap-2.5 mb-2.5">
      <div class="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
        <ShieldAlert class="size-4" />
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-semibold text-foreground text-xs leading-snug">
          {{ t('chat.permissionTitle') || 'Tool Permission Request' }}: <span class="font-mono text-primary">{{ request.toolName }}</span>
        </h4>
        <p class="text-muted-foreground mt-0.5 leading-relaxed">
          {{ request.description }}
        </p>
      </div>
    </div>

    <!-- Command / Arguments display -->
    <div
      v-if="argsPreview"
      dir="ltr"
      class="p-2 mb-3 rounded-lg border border-border bg-background/80 font-mono text-[11px] overflow-x-auto text-foreground break-all text-left"
    >
      {{ argsPreview }}
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
      <Button
        type="button"
        variant="outline"
        size="xs"
        data-action="deny"
        class="border-destructive/30 text-destructive hover:bg-destructive/10"
        @click="emit('deny', request.id)"
      >
        <X class="size-3 me-1" />
        {{ t('chat.deny') || 'Deny' }}
      </Button>

      <Button
        type="button"
        size="xs"
        data-action="allow"
        class="bg-amber-600 hover:bg-amber-700 text-white"
        @click="emit('allow', request.id)"
      >
        <Check class="size-3 me-1" />
        {{ t('chat.allow') || 'Allow' }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ShieldAlert, Check, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { PermissionRequest } from '@/types/chat'
import { useI18n } from '@/i18n'

const props = defineProps<{
  request: PermissionRequest
}>()

const emit = defineEmits<{
  allow: [id: string]
  deny: [id: string]
}>()

const { t } = useI18n()

const argsPreview = computed(() => {
  const args = props.request.arguments || {}
  if (args.command) return String(args.command)
  if (args.cmd) return String(args.cmd)
  if (args.path) return String(args.path)
  try {
    const json = JSON.stringify(args, null, 2)
    return json === '{}' ? '' : json
  } catch {
    return ''
  }
})
</script>
