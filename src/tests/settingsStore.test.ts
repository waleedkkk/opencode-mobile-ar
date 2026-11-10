import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '@/stores/settingsStore'
import * as configClient from '@/services/opencode/configClient'

vi.mock('@/services/opencode/configClient', () => ({
  fetchServerConfig: vi.fn(),
  fetchAvailableShells: vi.fn(),
  setServerShell: vi.fn(),
}))

describe('settingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.className = ''
    vi.clearAllMocks()
  })

  it('loads server config and shells', async () => {
    vi.mocked(configClient.fetchServerConfig).mockResolvedValue({
      providers: [
        { id: 'anthropic', name: 'Anthropic', models: [{ id: 'claude-3-5-sonnet', disabled: false }] },
      ],
      websearchProvider: 'opencode',
    })
    vi.mocked(configClient.fetchAvailableShells).mockResolvedValue([{ path: '/bin/sh', name: 'sh' }])

    const store = useSettingsStore()
    await store.bindServer('http://127.0.0.1:4096', { username: 'opencode' })
    await store.loadServerConfig()
    await store.loadShells()

    expect(store.providerCount).toBe(1)
    expect(store.enabledModelCount).toBe(1)
    expect(store.shells).toHaveLength(1)
  })

  it('applies a shell successfully and records it', async () => {
    vi.mocked(configClient.setServerShell).mockResolvedValue(undefined)
    vi.mocked(configClient.fetchAvailableShells).mockResolvedValue([{ path: '/bin/sh', name: 'sh' }])

    const store = useSettingsStore()
    await store.bindServer('http://127.0.0.1:4096', { username: 'opencode' })
    await store.applyShell('/bin/sh')

    expect(configClient.setServerShell).toHaveBeenCalled()
    expect(store.settingsShell).toBe('/bin/sh')
    expect(store.shellError).toBe('')
  })

  it('surfaces an error and keeps the previous value when the API rejects', async () => {
    vi.mocked(configClient.setServerShell).mockRejectedValue(new Error('boom'))

    const store = useSettingsStore()
    await store.bindServer('http://127.0.0.1:4096', { username: 'opencode' })
    await store.loadShells()
    store.settingsShell = '/bin/sh'

    await store.applyShell('/bin/nope')

    expect(store.settingsShell).toBe('/bin/sh')
    expect(store.shellError).not.toBe('')
  })

  it('persists the theme and applies the dark class to html', () => {
    const store = useSettingsStore()
    expect(store.theme).toBe('system')

    store.setTheme('dark')
    expect(localStorage.getItem('opencode-mobile.theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    store.setTheme('light')
    expect(localStorage.getItem('opencode-mobile.theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('restores a persisted theme on store creation', () => {
    localStorage.setItem('opencode-mobile.theme', 'dark')
    const store = useSettingsStore()
    expect(store.theme).toBe('dark')
  })

  it('ignores a corrupted persisted theme', () => {
    localStorage.setItem('opencode-mobile.theme', '{"weird"')
    const store = useSettingsStore()
    expect(store.theme).toBe('system')
  })
})
