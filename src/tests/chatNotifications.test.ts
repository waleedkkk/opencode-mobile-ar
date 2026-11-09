import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  emitChatTaskNotification,
  enableNativeNotificationsFromSettings,
} from '@/services/platform/nativeNotifications'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(true),
    getPlatform: vi.fn().mockReturnValue('android'),
  },
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: vi.fn().mockResolvedValue({}),
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    createChannel: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@capacitor/preferences', () => {
  let store: Record<string, string> = {}
  return {
    Preferences: {
      get: vi.fn(async ({ key }: { key: string }) => ({ value: store[key] || null })),
      set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
        store[key] = value
      }),
      clear: vi.fn(async () => {
        store = {}
      }),
    },
  }
})

describe('emitChatTaskNotification', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await Preferences.clear()
  })

  it('does not emit notification if notifications are not enabled in settings', async () => {
    await emitChatTaskNotification('Task done', 'The agent finished.')
    expect(LocalNotifications.schedule).not.toHaveBeenCalled()
  })

  it('emits local notification when enabled in settings', async () => {
    await enableNativeNotificationsFromSettings()

    await emitChatTaskNotification('Task done', 'The agent finished.')

    expect(LocalNotifications.schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({
          title: 'Task done',
          body: 'The agent finished.',
          channelId: 'opencode-web-notifications',
        }),
      ],
    })
  })
})
