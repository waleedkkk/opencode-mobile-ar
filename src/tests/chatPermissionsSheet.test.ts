import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatPermissionsSheet from '@/components/chat/ChatPermissionsSheet.vue'
import * as permissionClient from '@/services/opencode/permissionClient'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

describe('ChatPermissionsSheet.vue', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()

    vi.spyOn(permissionClient, 'fetchSavedPermissions').mockResolvedValue([
      { id: 'perm_1', action: 'shell', resource: 'git', effect: 'allow' },
      { id: 'perm_2', action: 'edit', resource: 'src/**', effect: 'ask' },
    ])
    vi.spyOn(permissionClient, 'updateSavedPermission').mockResolvedValue(undefined)
    vi.spyOn(permissionClient, 'removeSavedPermission').mockResolvedValue(undefined)
  })

  it('lists saved rules with action, resource and effect', async () => {
    const wrapper = mount(ChatPermissionsSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
      },
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.textContent).toContain('shell')
    expect(document.body.textContent).toContain('git')
    expect(document.body.textContent).toContain('src/**')
    wrapper.unmount()
  })

  it('removes a rule after confirmation', async () => {
    ;(globalThis as any).confirm = vi.fn().mockReturnValue(true)

    const wrapper = mount(ChatPermissionsSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
      },
      attachTo: document.body,
    })
    await flushPromises()

    const removeBtn = document.body.querySelector('[data-action="remove-perm_1"]') as HTMLElement | null
    expect(removeBtn).not.toBeNull()
    removeBtn!.click()
    await flushPromises()

    expect(permissionClient.removeSavedPermission).toHaveBeenCalledWith(
      'http://127.0.0.1:4096',
      expect.any(Object),
      'perm_1'
    )
    wrapper.unmount()
  })

  it('keeps the rule when the confirmation is declined', async () => {
    ;(globalThis as any).confirm = vi.fn().mockReturnValue(false)

    const wrapper = mount(ChatPermissionsSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
      },
      attachTo: document.body,
    })
    await flushPromises()

    const removeBtn = document.body.querySelector('[data-action="remove-perm_1"]') as HTMLElement | null
    removeBtn!.click()
    await flushPromises()

    expect(permissionClient.removeSavedPermission).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
