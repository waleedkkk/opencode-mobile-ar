<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent side="left" class="w-[88%] sm:max-w-md p-0 flex flex-col h-full bg-card gap-0">
      <SheetHeader class="p-3 border-b border-border flex flex-row items-center justify-between">
        <SheetTitle class="text-sm font-semibold flex items-center gap-2">
          <Boxes class="size-4 text-primary" />
          <span>{{ t('settings.opencodeConfig') || 'Settings' }}</span>
        </SheetTitle>
        <SheetDescription class="sr-only">Providers, models and credentials</SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-5">
        <p v-if="error" class="text-xs text-destructive">{{ error }}</p>

        <!-- Providers & models -->
        <section class="flex flex-col gap-2">
          <p class="text-[10px] uppercase tracking-wide text-muted-foreground">
            {{ t('chat.providersTitle') || 'Providers' }}
          </p>
          <p v-if="loading" class="text-xs text-muted-foreground">{{ t('chat.loading') || 'Loading…' }}</p>
          <div v-for="provider in providers" :key="provider.id" class="flex flex-col gap-1">
            <p class="text-xs font-semibold text-foreground">{{ provider.name || provider.id }}</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="model in provider.models.slice(0, 12)"
                :key="model.id"
                class="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] font-mono"
                :class="model.id === activeModel ? 'text-primary border-primary' : 'text-muted-foreground'"
                dir="ltr"
              >
                {{ model.id }}
              </span>
              <span v-if="provider.models.length > 12" class="text-[10px] text-muted-foreground">
                +{{ provider.models.length - 12 }}
              </span>
            </div>
          </div>
        </section>

        <!-- Credentials -->
        <section class="flex flex-col gap-2">
          <p class="text-[10px] uppercase tracking-wide text-muted-foreground">
            {{ t('chat.credentialsTitle') || 'Credentials' }}
          </p>
          <div
            v-for="cred in credentials"
            :key="cred.id"
            class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-border"
          >
            <div class="flex items-center gap-2 min-w-0">
              <KeyRound class="size-3.5 text-muted-foreground shrink-0" />
              <div class="min-w-0">
                <p class="text-xs font-medium truncate">{{ cred.label }}</p>
                <p class="text-[10px] text-muted-foreground truncate font-mono" dir="ltr">
                  {{ cred.integrationID }} · {{ cred.active ? t('chat.credentialActive') : t('chat.credentialInactive') }}
                </p>
              </div>
            </div>

            <template v-if="renamingId !== cred.id">
              <Button
                variant="ghost"
                size="xs"
                :data-action="`rename-cred-${cred.id}`"
                class="h-7 text-[11px] cursor-pointer"
                @click="startRename(cred)"
              >
                {{ t('common.edit') }}
              </Button>
            </template>
            <template v-else>
              <div class="flex items-center gap-1">
                <input
                  v-model="renameValue"
                  data-rename-input
                  class="w-28 rounded-md border border-input bg-background px-2 py-1 text-[11px] outline-none"
                  dir="auto"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  data-action="save-rename"
                  class="size-7 text-primary cursor-pointer"
                  @click="saveRename"
                >
                  <Check class="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="size-7 cursor-pointer"
                  @click="renamingId = ''"
                >
                  <X class="size-3.5" />
                </Button>
              </div>
            </template>
          </div>
          <p v-if="credentials.length === 0 && !loading" class="text-xs text-muted-foreground">
            {{ t('chat.credentialsEmpty') || 'No credentials' }}
          </p>
        </section>

        <!-- Read-only notice -->
        <p class="text-[10px] text-muted-foreground leading-relaxed">
          {{ t('chat.credentialsReadOnly') }}
        </p>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Boxes, KeyRound, Check, X } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { fetchProviders, type ProviderInfo } from '@/services/opencode/modelsClient'
import {
  fetchCredentials,
  renameCredential,
  type CredentialSummary,
} from '@/services/opencode/credentialClient'

const props = defineProps<{
  open: boolean
  baseUrl: string
  auth: { username: string; password?: string }
  sessionId: string | null
  activeModel?: string
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
}>()

const { t } = useI18n()

const providers = ref<ProviderInfo[]>([])
const credentials = ref<CredentialSummary[]>([])
const loading = ref(false)
const error = ref('')
const renamingId = ref('')
const renameValue = ref('')

async function load(): Promise<void> {
  if (!props.baseUrl) return
  loading.value = true
  error.value = ''
  try {
    const [providerList, credentialList] = await Promise.all([
      fetchProviders(props.baseUrl, props.auth),
      fetchCredentials(props.baseUrl, props.auth),
    ])
    providers.value = providerList
    credentials.value = credentialList
  } catch (err: any) {
    error.value = err?.message || 'Failed to load settings'
  } finally {
    loading.value = false
  }
}

function startRename(cred: CredentialSummary): void {
  renamingId.value = cred.id
  renameValue.value = cred.label
}

async function saveRename(): Promise<void> {
  if (!props.baseUrl || !renamingId.value) return
  const label = renameValue.value.trim()
  if (!label) return
  try {
    await renameCredential(props.baseUrl, props.auth, renamingId.value, label)
    const target = credentials.value.find((c) => c.id === renamingId.value)
    if (target) target.label = label
    renamingId.value = ''
  } catch (err: any) {
    error.value = err?.message || 'Failed to rename credential'
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      renamingId.value = ''
      void load()
    }
  },
  { immediate: true }
)
</script>
