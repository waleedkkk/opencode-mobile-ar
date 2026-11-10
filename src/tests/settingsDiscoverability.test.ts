import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ChatHeader from '@/components/chat/ChatHeader.vue'
import SettingsScreen from '@/components/SettingsScreen.vue'
import { setWebviewDirection } from '@/services/storage/uiPreferences'

vi.mock('@/stores/serverStore', () => ({
  useServerStore: () => ({
    profiles: [{ id: 's1', name: 'Dev', baseUrl: 'http://127.0.0.1:4096', authEnabled: false }],
    getPassword: vi.fn().mockResolvedValue(''),
  }),
}))

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn(),
  },
}))

vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    getString: vi.fn().mockResolvedValue({ value: null }),
    setString: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

describe('settings discoverability', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    setWebviewDirection('ltr')
  })

  it('exposes a settings action in the chat header', () => {
    const wrapper = mount(ChatHeader, {
      props: { title: 'Chat', model: 'm', status: 'connected' },
    })
    flushPromises()

    const btn = wrapper.find('[data-action="open-settings"]')
    expect(btn.exists()).toBe(true)
  })

  it('emits openSettings when the chat header gear is tapped', async () => {
    const wrapper = mount(ChatHeader, {
      props: { title: 'Chat', model: 'm', status: 'connected' },
    })
    await wrapper.find('[data-action="open-settings"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('openSettings')).toBeTruthy()
  })

  it('renders every native settings section including advanced', () => {
    const wrapper = mount(SettingsScreen)
    flushPromises()

    expect(wrapper.find('[data-appearance-section]').exists()).toBe(true)
    expect(wrapper.find('[data-opencode-config-section]').exists()).toBe(true)
    expect(wrapper.find('[data-advanced-section]').exists()).toBe(true)
    expect(wrapper.find('[data-action="settings-open-webview"]').exists()).toBe(true)
  })
})
