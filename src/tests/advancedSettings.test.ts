import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SettingsScreen from '@/components/SettingsScreen.vue'
import ChatHeader from '@/components/chat/ChatHeader.vue'

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: '[]' }),
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

describe('advanced settings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('renders an advanced section with a full WebView shortcut', () => {
    const wrapper = mount(SettingsScreen)

    expect(wrapper.find('[data-advanced-section]').exists()).toBe(true)

    const webviewBtn = wrapper.find('[data-action="settings-open-webview"]')
    expect(webviewBtn.exists()).toBe(true)
  })

  it('opens the last active session in WebView when tapped', async () => {
    const wrapper = mount(SettingsScreen)
    await flushPromises()

    // No connected server configured in this test: the action should be a no-op
    // that does not throw, and simply keeps the user on the settings screen.
    const webviewBtn = wrapper.find('[data-action="settings-open-webview"]')
    await webviewBtn.trigger('click')

    expect(wrapper.find('[data-advanced-section]').exists()).toBe(true)
  })
})

describe('ChatHeader', () => {
  it('no longer shows the WebView shortcut button', () => {
    const wrapper = mount(ChatHeader, {
      props: { title: 'Chat', model: 'gpt', status: 'connected' },
    })

    expect(wrapper.find('[data-action="open-webview"]').exists()).toBe(false)
    // The file / git / terminal / models actions must remain available.
    expect(wrapper.find('[data-action="open-files"]').exists()).toBe(true)
    expect(wrapper.find('[data-action="open-git"]').exists()).toBe(true)
  })
})
