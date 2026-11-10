import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatStore } from '@/stores/chatStore'

vi.mock('@/stores/serverStore', () => ({
  useServerStore: () => ({
    profiles: [{ id: 's1', name: 'Dev', baseUrl: 'http://127.0.0.1:4096', authEnabled: false }],
    getPassword: vi.fn().mockResolvedValue(''),
  }),
}))

vi.mock('@/services/opencode/modelsClient', () => ({
  fetchModelGroups: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/platform/nativeNotifications', () => ({
  emitChatTaskNotification: vi.fn().mockResolvedValue({}),
}))

// The real OpenCode 2.2.5 payload shape: an untitled session simply omits
// `title` and carries its timestamps nested under `time`.
const SESSIONS_PAYLOAD = {
  data: [
    {
      id: 'ses_e3a461458ffewfvedXw4T0rxsn',
      projectID: 'e22c0befcd3aab577c593974d56decf884468691',
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      outcome: 'succeeded',
      time: { created: 1794150825947, updated: 1794150825947 },
      location: { directory: '/' },
    },
    {
      id: 'ses_named',
      title: 'فورك مستودع opencode-mobile-client',
      projectID: 'global',
      time: { created: 1794150825947, updated: 1794319013902 },
    },
  ],
}

function stubApi(sessions = SESSIONS_PAYLOAD) {
  vi.stubGlobal('fetch', vi.fn(async (url: any) => {
    const path = String(url)
    if (path.includes('/api/session') && !path.includes('/message') && !path.includes('/form')) {
      return { ok: true, json: async () => sessions } as Response
    }
    return { ok: true, json: async () => ({ data: [] }) } as Response
  }))
}

describe('session titles (real payload shape)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
    stubApi()
  })

  it('never renders a raw session id when the title is missing', async () => {
    const store = useChatStore()
    await store.initForServer('s1')

    const untitled = store.sessions.find((s) => s.id === 'ses_e3a461458ffewfvedXw4T0rxsn')
    const named = store.sessions.find((s) => s.id === 'ses_named')

    expect(untitled!.title).not.toBe('ses_e3a461458ffewfvedXw4T0rxsn')
    expect(untitled!.title).toMatch(/\d/)
    expect(named!.title).toBe('فورك مستودع opencode-mobile-client')
  })

  it('uses the session own creation date, not today', async () => {
    const store = useChatStore()
    await store.initForServer('s1')

    const untitled = store.sessions.find((s) => s.id === 'ses_e3a461458ffewfvedXw4T0rxsn')
    // 1794150825947 ms = 2026-11-08, a day that is not today
    expect(untitled!.title).toContain('2026-11-08')
    expect(untitled!.title).not.toContain(new Date().toISOString().slice(0, 10))
  })

  it('falls back to the localized label when there is no timestamp', async () => {
    stubApi({ data: [{ id: 'ses_notime', projectID: 'global' } as any] })
    const store = useChatStore()
    await store.initForServer('s1')

    const untitled = store.sessions.find((s) => s.id === 'ses_notime')
    expect(untitled!.title).not.toBe('ses_notime')
    expect(untitled!.title.length).toBeGreaterThan(0)
  })
})
