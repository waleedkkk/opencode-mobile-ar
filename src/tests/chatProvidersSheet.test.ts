import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatProvidersSheet from '@/components/chat/ChatProvidersSheet.vue'
import * as credentialClient from '@/services/opencode/credentialClient'
import * as modelsClient from '@/services/opencode/modelsClient'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

describe('ChatProvidersSheet.vue', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()

    vi.spyOn(modelsClient, 'fetchProviders').mockResolvedValue([
      {
        id: 'anthropic',
        name: 'Anthropic',
        models: [
          { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
          { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
        ],
      },
    ])
    vi.spyOn(credentialClient, 'fetchCredentials').mockResolvedValue([
      { id: 'cred_1', label: 'Work key', integrationID: 'anthropic', active: true },
      { id: 'cred_2', label: 'Old token', integrationID: 'github', active: false },
    ])
    vi.spyOn(credentialClient, 'renameCredential').mockResolvedValue(undefined)
  })

  it('lists providers with models and credentials without secrets', async () => {
    mount(ChatProvidersSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
        sessionId: 'ses_1',
      },
      attachTo: document.body,
    })

    await flushPromises()

    expect(document.body.textContent).toContain('Anthropic')
    expect(document.body.textContent).toContain('anthropic/claude-3-opus')
    expect(document.body.textContent).toContain('Work key')
    expect(document.body.textContent).toContain('anthropic')
    // raw key material must never be rendered
    expect(document.body.textContent).not.toContain('sk-')
    expect(document.body.textContent).not.toContain('oauth')
    expect(document.body.textContent).not.toContain('secret')
  })

  it('renames a credential inline', async () => {
    const wrapper = mount(ChatProvidersSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
        sessionId: 'ses_1',
      },
      attachTo: document.body,
    })

    await flushPromises()

    const renameBtn = document.body.querySelector('[data-action="rename-cred-cred_1"]') as HTMLElement | null
    expect(renameBtn).not.toBeNull()
    renameBtn!.click()
    await flushPromises()

    const input = document.body.querySelector('[data-rename-input]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    input!.value = 'Renamed key'
    input!.dispatchEvent(new Event('input'))
    await flushPromises()

    const saveBtn = document.body.querySelector('[data-action="save-rename"]') as HTMLElement | null
    saveBtn!.click()
    await flushPromises()

    expect(credentialClient.renameCredential).toHaveBeenCalledWith(
      'http://127.0.0.1:4096',
      expect.any(Object),
      'cred_1',
      'Renamed key'
    )
    wrapper.unmount()
  })
})
