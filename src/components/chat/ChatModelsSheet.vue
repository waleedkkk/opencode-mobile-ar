<template>
  <Sheet :open="open" @update:open="(val) => emit('update:open', val)">
    <SheetContent side="left" class="w-[86%] sm:max-w-md p-0 flex flex-col h-full bg-card gap-0">
      <SheetHeader class="p-3 border-b border-border flex flex-row items-center justify-between">
        <SheetTitle class="text-sm font-semibold flex items-center gap-2">
          <Boxes class="size-4 text-primary" />
          <span>{{ t('chat.modelsTitle') || 'Models' }}</span>
        </SheetTitle>
        <SheetDescription class="sr-only">Select provider and model</SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-3">
        <p v-if="loading" class="text-center text-xs text-muted-foreground py-6">
          {{ t('chat.loading') || 'Loading…' }}
        </p>
        <p v-else-if="providers.length === 0" class="text-center text-xs text-muted-foreground py-6">
          {{ t('chat.modelsEmpty') || 'No models' }}
        </p>

        <div v-for="provider in providers" :key="provider.id" class="flex flex-col gap-1">
          <p class="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {{ provider.name || provider.id }}
          </p>
          <button
            v-for="model in provider.models"
            :key="model.id"
            type="button"
            :data-model="model.id"
            class="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-start hover:bg-muted/80 cursor-pointer"
            :class="model.id === activeModel ? 'text-primary font-semibold' : 'text-foreground'"
            @click="selectModel(model.id)"
          >
            <span class="text-xs truncate" dir="ltr">{{ model.name || model.id }}</span>
            <Check v-if="model.id === activeModel" class="size-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Boxes, Check } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useI18n } from '@/i18n'
import { fetchProviders } from '@/services/opencode/modelsClient'

const props = defineProps<{
  open: boolean
  baseUrl: string
  auth: { username: string; password?: string }
  activeModel: string
  sessionId: string | null
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  'model-selected': [modelId: string]
}>()

const { t } = useI18n()
const providers = ref<{ id: string; name: string; models: { id: string; name: string }[] }[]>([])
const loading = ref(false)

const canSwitch = computed(() => Boolean(props.sessionId))

async function load(): Promise<void> {
  if (!props.baseUrl) return
  loading.value = true
  try {
    providers.value = await fetchProviders(props.baseUrl, props.auth)
  } catch (err) {
    console.warn('[models] load failed:', err)
    providers.value = []
  } finally {
    loading.value = false
  }
}

function selectModel(modelId: string): void {
  if (!canSwitch.value) return
  emit('model-selected', modelId)
  emit('update:open', false)
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) void load()
  },
  { immediate: true }
)
</script>
