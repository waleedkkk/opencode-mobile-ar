<template>
  <div
    data-form-card
    class="my-2.5 rounded-xl border-2 border-primary/40 bg-primary/5 p-3.5 shadow-2xs"
  >
    <div class="flex items-start gap-2.5 mb-3">
      <div class="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
        <ListChecks class="size-4" />
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-semibold text-foreground leading-snug">{{ form.title }}</h4>
        <p class="text-[11px] text-muted-foreground mt-0.5">
          {{ t('chat.formHint') || 'The agent is waiting for your answer.' }}
        </p>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div v-for="field in form.fields" :key="field.key" class="flex flex-col gap-1">
        <div class="flex items-baseline justify-between gap-2">
          <label class="text-[11px] font-medium text-foreground" :for="field.key">
            {{ field.title }}
            <span v-if="field.required" class="text-destructive">*</span>
          </label>
          <span v-if="field.type === 'integer' || field.type === 'number'" class="text-[10px] text-muted-foreground font-mono">
            {{ field.minimum }}–{{ field.maximum }}
          </span>
        </div>

        <p v-if="field.description" class="text-[10px] text-muted-foreground leading-snug">
          {{ field.description }}
        </p>

        <!-- string / email / uri / date -->
        <input
          v-if="field.type === 'string' || field.type === 'external'"
          :id="field.key"
          v-model="answer[field.key] as string"
          :type="field.format === 'email' ? 'email' : field.format === 'date' ? 'date' : 'text'"
          :dir="field.type === 'string' && isTokenFormat(field) ? 'ltr' : undefined"
          class="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
          :placeholder="field.title"
        />

        <!-- number / integer -->
        <input
          v-else-if="field.type === 'number' || field.type === 'integer'"
          :id="field.key"
          v-model.number="answer[field.key] as number"
          type="number"
          dir="ltr"
          :min="field.minimum"
          :max="field.maximum"
          :step="field.type === 'integer' ? 1 : 'any'"
          class="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-mono outline-none"
        />

        <!-- boolean -->
        <div v-else-if="field.type === 'boolean'" class="flex items-center gap-2">
          <Switch :id="field.key" :model-value="Boolean(answer[field.key])" @update:model-value="(v) => setBoolean(field.key, Boolean(v))" />
          <span class="text-[11px] text-muted-foreground">{{ answer[field.key] ? t('common.confirm') : t('common.cancel') }}</span>
        </div>

        <!-- multiselect -->
        <div v-else-if="field.type === 'multiselect'" class="flex flex-wrap gap-1.5">
          <button
            v-for="option in field.options ?? []"
            :key="option.value"
            type="button"
            :data-option="option.value"
            class="px-2.5 py-1 rounded-full border text-[11px] font-medium cursor-pointer transition-colors"
            :class="isSelected(field.key, option.value) ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background text-foreground hover:bg-muted'"
            @click="toggleOption(field.key, option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-end gap-2 mt-3.5 pt-3 border-t border-primary/20">
      <span v-if="error" class="text-[11px] text-destructive me-auto">{{ error }}</span>
      <Button
        type="button"
        size="sm"
        data-action="form-submit"
        class="gap-1.5 cursor-pointer"
        @click="submit"
      >
        <Send class="size-3.5" />
        <span>{{ t('chat.formSubmit') || 'Submit' }}</span>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ListChecks, Send } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/i18n'
import {
  defaultAnswer,
  validateAnswer,
  type FormAnswer,
  type PendingForm,
} from '@/services/opencode/formClient'

const props = defineProps<{
  form: PendingForm
}>()

const emit = defineEmits<{
  submit: [formId: string, answer: FormAnswer]
}>()

const { t } = useI18n()

const answer = reactive<FormAnswer>(defaultAnswer(props.form.fields))
const error = ref('')

function isTokenFormat(field: { format?: string }): boolean {
  return field.format === 'uri'
}

function setBoolean(key: string, value: boolean): void {
  answer[key] = value
}

function isSelected(key: string, value: string): boolean {
  const current = answer[key]
  return Array.isArray(current) && current.includes(value)
}

function toggleOption(key: string, value: string): void {
  const current = Array.isArray(answer[key]) ? [...(answer[key] as string[])] : []
  const index = current.indexOf(value)
  if (index === -1) current.push(value)
  else current.splice(index, 1)
  answer[key] = current
}

function submit(): void {
  const invalid = validateAnswer(props.form.fields, answer)
  if (invalid) {
    error.value = t('chat.formInvalidField') + ': ' + invalid
    return
  }
  error.value = ''
  emit('submit', props.form.id, { ...answer })
}
</script>
