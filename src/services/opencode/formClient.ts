import type { ChatAuth } from '@/types/chat'

export type FormFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'multiselect' | 'external'

export interface FormOption {
  value: string
  label: string
}

export interface FormField {
  key: string
  type: FormFieldType
  title: string
  description?: string
  required?: boolean
  hidden?: boolean
  default?: string | number | boolean | string[]
  format?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  minItems?: number
  maxItems?: number
  options?: FormOption[]
}

export interface PendingForm {
  id: string
  sessionID: string
  title: string
  fields: FormField[]
}

export type FormAnswer = Record<string, string | number | boolean | string[]>

function buildHeaders(auth: ChatAuth): Record<string, string> {
  const raw = `${auth.username || 'opencode'}:${auth.password || ''}`
  const encoded = typeof btoa === 'function' ? btoa(raw) : ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(raw).toString('base64') : raw)
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  }
}

function extractData(json: any): any {
  if (json && typeof json === 'object' && 'data' in json) return json.data
  return json
}

function mapForm(raw: any): PendingForm | null {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || '')
  if (!id) return null
  const state = raw.state || {}
  if (state.status && state.status !== 'pending') return null

  const fields: FormField[] = Array.isArray(raw.fields)
    ? raw.fields.filter((f: any) => f && f.key && f.type).map((f: any) => ({
        key: String(f.key),
        type: String(f.type) as FormFieldType,
        title: String(f.title || f.key),
        description: typeof f.description === 'string' ? f.description : undefined,
        required: f.required === true,
        hidden: f.hidden === true,
        default: f.default,
        format: typeof f.format === 'string' ? f.format : undefined,
        minLength: typeof f.minLength === 'number' ? f.minLength : undefined,
        maxLength: typeof f.maxLength === 'number' ? f.maxLength : undefined,
        minimum: typeof f.minimum === 'number' ? f.minimum : undefined,
        maximum: typeof f.maximum === 'number' ? f.maximum : undefined,
        minItems: typeof f.minItems === 'number' ? f.minItems : undefined,
        maxItems: typeof f.maxItems === 'number' ? f.maxItems : undefined,
        options: Array.isArray(f.options)
          ? f.options.map((o: any) => ({ value: String(o?.value ?? ''), label: String(o?.label ?? o?.value ?? '') }))
          : undefined,
      }))
    : []

  return {
    id,
    sessionID: String(raw.sessionID || ''),
    title: String(raw.title || 'Form'),
    fields,
  }
}

export async function fetchPendingForms(
  baseUrl: string,
  auth: ChatAuth,
  sessionId?: string
): Promise<PendingForm[]> {
  const clean = baseUrl.replace(/\/+$/, '')
  const urls = sessionId
    ? [`${clean}/api/form`, `${clean}/api/session/${encodeURIComponent(sessionId)}/form`]
    : [`${clean}/api/form`]

  const seen = new Set<string>()
  const forms: PendingForm[] = []

  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'GET', headers: buildHeaders(auth) })
      if (!response.ok) continue
      const data = extractData(await response.json())
      if (!Array.isArray(data)) continue
      for (const raw of data) {
        const form = mapForm(raw)
        if (form && !seen.has(form.id)) {
          seen.add(form.id)
          forms.push(form)
        }
      }
    } catch {
      // A failing source must not hide the other one.
    }
  }

  return forms
}

export async function replyToForm(
  baseUrl: string,
  auth: ChatAuth,
  sessionId: string,
  formId: string,
  answer: FormAnswer
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/session/${encodeURIComponent(sessionId)}/form/${encodeURIComponent(formId)}/reply`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(auth),
    body: JSON.stringify({ answer }),
  })

  if (!response.ok) {
    throw new Error(`Failed to reply to form: HTTP ${response.status}`)
  }
}

/** Builds an initial answer object from the field defaults. */
export function defaultAnswer(fields: FormField[]): FormAnswer {
  const answer: FormAnswer = {}
  for (const field of fields) {
    if (field.default !== undefined && field.default !== null) {
      answer[field.key] = field.default as string | number | boolean | string[]
    } else if (field.type === 'boolean') {
      answer[field.key] = false
    } else if (field.type === 'multiselect') {
      answer[field.key] = []
    } else if (field.type === 'integer' || field.type === 'number') {
      answer[field.key] = field.minimum ?? 0
    } else {
      answer[field.key] = ''
    }
  }
  return answer
}

/** Validates required fields and numeric/selection bounds. */
export function validateAnswer(fields: FormField[], answer: FormAnswer): string | null {
  for (const field of fields) {
    const value = answer[field.key]

    if (field.required && (value === '' || value === undefined || value === null)) {
      return field.title
    }

    if ((field.type === 'number' || field.type === 'integer')) {
      const numeric = typeof value === 'number' ? value : Number(value)
      if (Number.isNaN(numeric)) return field.title
      if (field.type === 'integer' && !Number.isInteger(numeric)) return field.title
      if (field.minimum !== undefined && numeric < field.minimum) return field.title
      if (field.maximum !== undefined && numeric > field.maximum) return field.title
    }

    if (field.type === 'multiselect') {
      const list = Array.isArray(value) ? value : []
      if (field.minItems !== undefined && list.length < field.minItems) return field.title
      if (field.maxItems !== undefined && list.length > field.maxItems) return field.title
    }

    if (field.type === 'string' && typeof value === 'string') {
      if (field.minLength !== undefined && value.length < field.minLength) return field.title
      if (field.maxLength !== undefined && value.length > field.maxLength) return field.title
    }
  }
  return null
}
