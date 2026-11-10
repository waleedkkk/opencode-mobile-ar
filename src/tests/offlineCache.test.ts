import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveOfflineSnapshot,
  loadOfflineSnapshot,
  clearOfflineSnapshot,
} from '@/services/storage/offlineCache'
import type { ChatMessage, SessionInfo } from '@/types/chat'

const KEY = 'opencode-mobile.offlineChat.v1'

beforeEach(() => {
  localStorage.clear()
})

describe('offline cache service', () => {
  const sessions: SessionInfo[] = [
    { id: 'ses_1', title: 'Local session', createdAt: '2026-11-08T10:00:00Z', updatedAt: '2026-11-08T10:05:00Z' },
  ]
  const messages: ChatMessage[] = [
    { id: 'm1', role: 'user', content: 'cached question', createdAt: '2026-11-08T10:00:00Z' },
    { id: 'm2', role: 'assistant', content: 'cached answer', createdAt: '2026-11-08T10:00:10Z' },
  ]

  it('saves and restores a session snapshot with messages', () => {
    saveOfflineSnapshot({
      serverId: 'srv_1',
      serverName: 'Dev Server',
      currentSessionId: 'ses_1',
      sessions,
      messages,
      savedAt: Date.now(),
    })

    const snapshot = loadOfflineSnapshot()
    expect(snapshot).not.toBeNull()
    expect(snapshot!.currentSessionId).toBe('ses_1')
    expect(snapshot!.serverName).toBe('Dev Server')
    expect(snapshot!.messages).toHaveLength(2)
    expect(snapshot!.messages[1].content).toBe('cached answer')
  })

  it('returns null when no snapshot was saved', () => {
    expect(loadOfflineSnapshot()).toBeNull()
  })

  it('returns null on corrupted snapshot data', () => {
    localStorage.setItem(KEY, '{not-valid-json')
    expect(loadOfflineSnapshot()).toBeNull()
  })

  it('clears the snapshot', () => {
    saveOfflineSnapshot({
      serverId: 'srv_1',
      serverName: 'Dev Server',
      currentSessionId: 'ses_1',
      sessions,
      messages,
      savedAt: Date.now(),
    })
    clearOfflineSnapshot()
    expect(loadOfflineSnapshot()).toBeNull()
  })
})
