<template>
  <div class="min-h-dvh flex flex-col">
    <header class="flex items-center gap-3 px-4 pt-4">
      <Button variant="ghost" size="icon" @click="goBack" :aria-label="t('common.back')">
        <ArrowLeft class="h-4 w-4 rtl:rotate-180" />
      </Button>
      <h1 class="text-lg font-semibold">{{ t('common.settings') }}</h1>
    </header>

    <div class="flex-1 p-4 flex flex-col gap-6 pb-6">
      <section>
        <h2 class="mt-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">{{ t('settings.connection') }}</h2>

        <div class="flex flex-col gap-1.5 mb-3 mx-auto w-full max-w-sm">
          <Label class="text-center justify-center">{{ t('settings.timeout') }}</Label>
          <Input v-model.number="timeoutMs" type="number" min="1000" max="30000" step="100" class="w-full text-muted-foreground" />
        </div>

        <div class="flex flex-col gap-1.5 mb-6 mx-auto w-full max-w-sm">
          <Label class="text-center justify-center">{{ t('settings.poll') }}</Label>
          <Input v-model.number="pollMs" type="number" min="2000" max="60000" step="1000" class="w-full text-muted-foreground" />
        </div>

        <div class="flex items-center gap-2">
          <Switch id="expReconnect" v-model="exponentialReconnect" />
          <Label for="expReconnect">{{ t('settings.reconnect') }}</Label>
        </div>
      </section>

      <section>
        <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ t('settings.notifications') }}</h2>
        <div class="flex items-start gap-3">
          <Switch id="nativeNotifications" v-model="notificationsEnabled" />
          <div class="flex flex-col gap-1">
            <Label for="nativeNotifications">{{ t('settings.enableNotifications') }}</Label>
            <p class="text-xs text-muted-foreground leading-relaxed">
              {{ t('settings.notificationDescription') }}
            </p>
          </div>
        </div>
        <div class="mt-5 flex flex-col items-center gap-3">
          <p class="text-xs text-muted-foreground text-center leading-relaxed">{{ t('app.continueHint') }}</p>
          <StoreBadges />
        </div>
      </section>

      <section class="mt-auto">
        <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ t('settings.about') }}</h2>
        <p class="text-sm mb-2">OpenCode Mobile AR</p>
        <p class="text-xs text-muted-foreground leading-relaxed" v-html="t('settings.aboutText')" />
      </section>
      <section>
        <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ t('settings.language') }}</h2>
        <select v-model="locale" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option v-for="option in supportedLocales" :key="option.code" :value="option.code">{{ option.label }}</option>
        </select>
      </section>
      <section class="mt-4">
        <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ t('settings.webviewDirection') }}</h2>
        <select v-model="webviewDirection" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option value="ltr">{{ t('settings.webviewDirectionLtr') }}</option>
          <option value="rtl">{{ t('settings.webviewDirectionRtl') }}</option>
        </select>
        <p class="text-xs text-muted-foreground mt-1 leading-relaxed">{{ t('settings.webviewDirectionHint') }}</p>
      </section>

      <section class="mt-4" data-appearance-section>
        <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ t('settings.appearance') }}</h2>
        <select v-model="themeModel" data-theme-select class="w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option value="system">{{ t('settings.themeSystem') }}</option>
          <option value="light">{{ t('settings.themeLight') }}</option>
          <option value="dark">{{ t('settings.themeDark') }}</option>
        </select>
        <p class="text-xs text-muted-foreground mt-1 leading-relaxed">{{ t('settings.themeHint') }}</p>
      </section>

      <section class="mt-4" data-opencode-config-section>
        <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ t('settings.opencodeConfig') }}</h2>

        <div v-if="configError" class="text-xs text-destructive mb-2">{{ configError }}</div>

        <div v-if="shells.length > 0" class="flex flex-col gap-1.5 mb-3">
          <Label class="text-center justify-center">{{ t('settings.shell') }}</Label>
          <select v-model="shellModel" data-shell-select class="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono" dir="ltr">
            <option v-for="shell in shells" :key="shell.path" :value="shell.path">{{ shell.name || shell.path }}</option>
          </select>
          <p v-if="shellError" class="text-xs text-destructive">{{ shellError }}</p>
        </div>

        <div class="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          <p class="mb-1">
            {{ t('settings.providersCount') }}: <span class="font-mono text-foreground">{{ providerCount }}</span>
            · {{ t('settings.enabledModels') }}: <span class="font-mono text-foreground">{{ enabledModelCount }}</span>
          </p>
          <p v-if="websearchProvider" class="mb-1">
            {{ t('settings.websearchProvider') }}: <span class="font-mono text-foreground" dir="ltr">{{ websearchProvider }}</span>
          </p>
          <p>{{ t('settings.configReadOnlyHint') }}</p>
        </div>
      </section>

      <section class="mt-4" data-advanced-section>
        <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ t('settings.advanced') }}</h2>
        <p class="text-xs text-muted-foreground leading-relaxed mb-3">
          {{ t('settings.advancedHint') }}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-action="settings-open-webview"
          class="w-full justify-center gap-2 text-xs font-medium"
          @click="openFullWebInterface"
        >
          <Globe class="size-3.5" />
          <span>{{ t('settings.openFullWeb') }}</span>
        </Button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Globe } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import StoreBadges from '@/components/StoreBadges.vue'
import { useConnectionStore } from '@/stores/connectionStore'
import {
  disableNativeNotificationsFromSettings,
  enableNativeNotificationsFromSettings,
  loadNativeNotificationSettings,
} from '@/services/platform/nativeNotifications'
import { useI18n, type Locale } from '@/i18n'
import {
  getWebviewDirection,
  setWebviewDirection,
  type WebviewDirection,
} from '@/services/storage/uiPreferences'
import { useServerStore } from '@/stores/serverStore'
import { useSettingsStore } from '@/stores/settingsStore'

const router = useRouter()
const connectionStore = useConnectionStore()
const serverStore = useServerStore()
const settingsStore = useSettingsStore()
const { t, locale, setLocale, supportedLocales } = useI18n()

const timeoutMs = ref(connectionStore.healthCheckTimeout)
const pollMs = ref(connectionStore.healthPollInterval)
const exponentialReconnect = ref(connectionStore.exponentialReconnectEnabled)
const notificationsEnabled = ref(false)
const webviewDirection = ref<WebviewDirection>(getWebviewDirection())
  const shells = computed(() => settingsStore.shells)
  const providerCount = computed(() => settingsStore.providerCount)
  const enabledModelCount = computed(() => settingsStore.enabledModelCount)
  const websearchProvider = computed(() => settingsStore.websearchProvider)
  const shellError = computed(() => settingsStore.shellError)
  const configError = computed(() => settingsStore.configError)
  const shellModel = ref(settingsStore.settingsShell)

  const themeModel = computed({
    get: () => settingsStore.theme,
    set: (value) => settingsStore.setTheme(value),
  })

  watch(shellModel, (value) => {
    if (value) void settingsStore.applyShell(value)
  })

let notificationsLoaded = false
let syncingNotificationsSwitch = false

watch(locale, (value) => setLocale(value as Locale))
watch(webviewDirection, (value) => setWebviewDirection(value))

watch(timeoutMs, (val) => { if (val >= 1000 && val <= 30000) connectionStore.setHealthCheckTimeout(val) })
watch(pollMs, (val) => { if (val >= 2000 && val <= 60000) connectionStore.setHealthPollInterval(val) })
watch(exponentialReconnect, (val) => { connectionStore.setExponentialReconnect(val) })
watch(notificationsEnabled, async (val) => {
  if (!notificationsLoaded || syncingNotificationsSwitch) return

  if (val) {
    const granted = await enableNativeNotificationsFromSettings()
    if (!granted) {
      syncingNotificationsSwitch = true
      notificationsEnabled.value = false
      syncingNotificationsSwitch = false
    }
  } else {
    await disableNativeNotificationsFromSettings()
  }
})

onMounted(async () => {
  if (connectionStore.activeServerId && connectionStore.activeServer) {
    await settingsStore.bindServer(
      connectionStore.activeServer.baseUrl,
      {
        username: connectionStore.activeServer.authEnabled ? connectionStore.activeServer.username : 'opencode',
      }
    )
    await settingsStore.loadServerConfig()
    await settingsStore.loadShells()
  }
  const settings = await loadNativeNotificationSettings()
  notificationsEnabled.value = settings.enabled
  notificationsLoaded = true
})

/**
 * Advanced action: open the last connected (or default) server directly in the
 * full OpenCode Web interface. The connect route reacts to the ?webview=1 flag.
 */
function openFullWebInterface(): void {
  const serverId =
    connectionStore.activeServerId ??
    serverStore.profiles.find((p) => p.isDefault)?.id ??
    serverStore.profiles[0]?.id

  if (!serverId) return
  router.push(`/connect/${serverId}?webview=1`)
}

function goBack(): void {
  // Return to whatever opened Settings (a chat session) instead of always
  // dumping the user on the landing screen.
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  router.push('/')
}
</script>
