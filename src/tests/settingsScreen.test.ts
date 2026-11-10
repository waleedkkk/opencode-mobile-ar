import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SettingsScreen from '@/components/SettingsScreen.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import * as configClient from '@/services/opencode/configClient'

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

vi.mock('@/services/opencode/configClient', () => ({
  fetchServerConfig: vi.fn().mockResolvedValue({ providers: [], websearchProvider: '' }),
  fetchAvailableShells: vi.fn().mockResolvedValue([]),
  setServerShell: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/stores/serverStore', () => ({
  useServerStore: () => ({
    profiles: [
      { id: 's1', name: 'Dev', baseUrl: 'http://127.0.0.1:4096', authEnabled: true, username: 'opencode' },
    ],
    getPassword: () => Promise.resolve('pw'),
  }),
}))

async function connectActiveServer() {
  const { useConnectionStore } = await import('@/stores/connectionStore')
  const store = useConnectionStore()
  store.activeServerId = 's1'
  return store
}

describe('SettingsScreen native settings sections', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.className = ''
    vi.clearAllMocks()

    vi.mocked(configClient.fetchAvailableShells).mockResolvedValue([
      { path: '/bin/sh', name: 'sh' },
      { path: '/bin/bash', name: 'bash' },
    ])
    vi.mocked(configClient.setServerShell).mockResolvedValue(undefined)
    await connectActiveServer()
  })

  it('renders appearance and OpenCode config sections', () => {
    const wrapper = mount(SettingsScreen)

    expect(wrapper.find('[data-appearance-section]').exists()).toBe(true)
    expect(wrapper.find('[data-opencode-config-section]').exists()).toBe(true)
  })

  it('offers three theme options and persists the choice', async () => {
    const wrapper = mount(SettingsScreen)
    const store = useSettingsStore()

    const select = wrapper.find('[data-theme-select]')
    expect(select.exists()).toBe(true)
    expect(wrapper.findAll('[data-theme-select] option')).toHaveLength(3)

    await select.setValue('dark')
    expect(store.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('renders a shell selector populated from the server', async () => {
    const wrapper = mount(SettingsScreen)
    await flushPromises()

    const select = wrapper.find('[data-shell-select]')
    expect(select.exists()).toBe(true)
    expect(wrapper.findAll('[data-shell-select] option').length).toBeGreaterThan(0)
  })

  it('shows a read-only hint explaining that full config is server-managed', () => {
    const wrapper = mount(SettingsScreen)
    expect(wrapper.text()).toContain('opencode.json')
  })
})
