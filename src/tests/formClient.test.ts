import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchPendingForms,
  replyToForm,
} from '@/services/opencode/formClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

const sampleForm = {
  id: 'frm_1',
  sessionID: 'ses_1',
  title: 'Choose a branch',
  metadata: {},
  fields: [
    { key: 'branch', type: 'string', title: 'Branch name', required: true },
    { key: 'count', type: 'integer', title: 'Count', minimum: 1, maximum: 5, default: 2 },
    { key: 'confirm', type: 'boolean', title: 'Confirm?', default: false },
    {
      key: 'targets',
      type: 'multiselect',
      title: 'Targets',
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
    },
  ],
  state: { status: 'pending' },
}

describe('formClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('merges global pending forms with session forms', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [sampleForm] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [sampleForm] }) } as Response)

    const forms = await fetchPendingForms(baseUrl, auth, 'ses_1')

    expect(forms).toHaveLength(1)
    expect(forms[0].id).toBe('frm_1')
    expect(forms[0].fields).toHaveLength(4)
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/form')
    expect(String(fetchSpy.mock.calls[1][0])).toContain('/api/session/ses_1/form')
  })

  it('works without a session id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [sampleForm] }) } as Response)

    const forms = await fetchPendingForms(baseUrl, auth)

    expect(forms).toHaveLength(1)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('returns an empty list when nothing is pending', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: [] }) } as Response)
    const forms = await fetchPendingForms(baseUrl, auth, 'ses_1')
    expect(forms).toEqual([])
  })

  it('replyToForm POSTs the answer to the reply endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)

    await replyToForm(baseUrl, auth, 'ses_1', 'frm_1', { branch: 'main' })

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/session/ses_1/form/frm_1/reply`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ answer: { branch: 'main' } }),
      })
    )
  })

  it('replyToForm throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response)
    await expect(replyToForm(baseUrl, auth, 'ses_1', 'frm_1', {})).rejects.toThrow()
  })
})
