import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ChatAuth } from '@/types/chat'
import {
  fetchAvailableShells,
  fetchServerConfig,
  setServerShell,
  type ProviderConfig,
  type ShellInfo,
} from '@/services/opencode/configClient'

export type ThemePreference = 'system' | 'light' | 'dark'

const THEME_KEY = 'opencode-mobile.theme'

function isTheme(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function loadTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (isTheme(stored)) return stored
  } catch {}
  return 'system'
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
}

export const useSettingsStore = defineStore('settings', () => {
  const serverBaseUrl = ref('')
  const serverAuth = ref<ChatAuth>({ username: 'opencode' })
  const providers = ref<ProviderConfig[]>([])
  const websearchProvider = ref('')
  const shells = ref<ShellInfo[]>([])
  const settingsShell = ref('')
  const shellError = ref('')
  const configError = ref('')
  const theme = ref<ThemePreference>(loadTheme())

  const providerCount = computed(() => providers.value.length)

  const enabledModelCount = computed(() =>
    providers.value.reduce((sum, p) => sum + p.models.filter((m) => !m.disabled).length, 0)
  )

  function applyTheme(): void {
    if (typeof document === 'undefined') return
    const dark = theme.value === 'dark' || (theme.value === 'system' && prefersDark())
    document.documentElement.classList.toggle('dark', dark)
  }

  function setTheme(value: ThemePreference): void {
    theme.value = value
    try {
      localStorage.setItem(THEME_KEY, value)
    } catch {}
    applyTheme()
  }

  async function bindServer(baseUrl: string, auth: ChatAuth): Promise<void> {
    serverBaseUrl.value = baseUrl
    serverAuth.value = auth
  }

  async function loadServerConfig(): Promise<void> {
    if (!serverBaseUrl.value) return
    configError.value = ''
    try {
      const config = await fetchServerConfig(serverBaseUrl.value, serverAuth.value)
      providers.value = config.providers
      websearchProvider.value = config.websearchProvider
    } catch (err: any) {
      configError.value = err?.message || 'Failed to load configuration'
      providers.value = []
    }
  }

  async function loadShells(baseUrl?: string, auth?: ChatAuth): Promise<void> {
    const url = baseUrl || serverBaseUrl.value
    const credentials = auth || serverAuth.value
    if (!url) return
    try {
      shells.value = await fetchAvailableShells(url, credentials)
      if (shells.value.length > 0 && !settingsShell.value) {
        settingsShell.value = shells.value[0].path
      }
    } catch {
      shells.value = []
    }
  }

  async function applyShell(shell: string): Promise<void> {
    if (!serverBaseUrl.value || !shell) return
    shellError.value = ''
    const previous = settingsShell.value
    try {
      await setServerShell(serverBaseUrl.value, serverAuth.value, shell)
      settingsShell.value = shell
    } catch (err: any) {
      settingsShell.value = previous
      shellError.value = err?.message || 'Failed to apply shell'
    }
  }

  // Apply the initial theme as soon as the store is created.
  applyTheme()

  return {
    providers,
    websearchProvider,
    shells,
    settingsShell,
    shellError,
    configError,
    theme,
    providerCount,
    enabledModelCount,
    bindServer,
    loadServerConfig,
    loadShells,
    applyShell,
    setTheme,
    applyTheme,
  }
})
