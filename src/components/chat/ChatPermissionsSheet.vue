<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent side="left" class="w-[88%] sm:max-w-md p-0 flex flex-col h-full bg-card gap-0">
      <SheetHeader class="p-3 border-b border-border flex flex-row items-center justify-between">
        <SheetTitle class="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck class="size-4 text-primary" />
          <span>{{ t('chat.permissionsTitle') || 'Permissions' }}</span>
        </SheetTitle>
        <SheetDescription class="sr-only">Saved permission rules</SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        <p v-if="loading" class="text-xs text-muted-foreground">{{ t('chat.loading') || 'Loading…' }}</p>
        <p v-else-if="rules.length === 0" class="text-xs text-muted-foreground">
          {{ t('chat.permissionsEmpty') || 'No saved rules' }}
        </p>

        <div
          v-for="rule in rules"
          :key="rule.id"
          class="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border"
        >
          <div class="flex-1 min-w-0">
            <p class="text-xs text-foreground truncate">
              <span class="font-semibold">{{ rule.action }}</span>
              <span class="text-muted-foreground"> · </span>
              <span class="font-mono" dir="ltr">{{ rule.resource }}</span>
            </p>
            <p class="text-[10px] text-muted-foreground">{{ t('chat.permissionEffect') }}: {{ rule.effect }}</p>
          </div>

          <select
            :value="rule.effect"
            class="rounded-md border border-input bg-background px-1.5 py-1 text-[11px]"
            dir="ltr"
            @change="(e) => changeEffect(rule, (e.target as HTMLSelectElement).value as any)"
          >
            <option value="allow">allow</option>
            <option value="ask">ask</option>
            <option value="deny">deny</option>
          </select>

          <Button
            variant="ghost"
            size="icon-sm"
            :data-action="`remove-${rule.id}`"
            class="size-7 text-destructive cursor-pointer"
            :title="t('common.delete') || 'Delete'"
            @click="removeRule(rule.id)"
          >
            <Trash2 class="size-3.5" />
          </Button>
        </div>
      </div>

      <p class="px-3 pb-3 text-[10px] text-muted-foreground leading-relaxed">
        {{ t('chat.permissionsHint') }}
      </p>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ShieldCheck, Trash2 } from '@lucide/vue'
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
  fetchSavedPermissions,
  removeSavedPermission,
  updateSavedPermission,
  type PermissionEffect,
  type PermissionRule,
} from '@/services/opencode/permissionClient'

const props = defineProps<{
  open: boolean
  baseUrl: string
  auth: { username: string; password?: string }
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
}>()

const { t } = useI18n()

const rules = ref<PermissionRule[]>([])
const loading = ref(false)
const error = ref('')

async function load(): Promise<void> {
  if (!props.baseUrl) return
  loading.value = true
  error.value = ''
  try {
    rules.value = await fetchSavedPermissions(props.baseUrl, props.auth)
  } catch (err: any) {
    error.value = err?.message || 'Failed to load permissions'
  } finally {
    loading.value = false
  }
}

async function changeEffect(rule: PermissionRule, effect: PermissionEffect): Promise<void> {
  if (!props.baseUrl) return
  const previous = rule.effect
  rule.effect = effect
  try {
    await updateSavedPermission(props.baseUrl, props.auth, rule.id, {
      action: rule.action,
      resource: rule.resource,
    })
  } catch (err: any) {
    rule.effect = previous
    error.value = err?.message || 'Failed to update permission'
  }
}

async function removeRule(id: string): Promise<void> {
  if (!props.baseUrl) return
  if (typeof confirm === 'function' && !confirm(t('chat.permissionDeleteConfirm') || 'Delete this rule?')) {
    return
  }
  try {
    await removeSavedPermission(props.baseUrl, props.auth, id)
    rules.value = rules.value.filter((r) => r.id !== id)
  } catch (err: any) {
    error.value = err?.message || 'Failed to remove permission'
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
