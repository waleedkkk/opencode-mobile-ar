import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchSessions,
  createSession,
  fetchSessionMessages,
  sendPrompt,
  interruptSession,
  replyPermission,
  fetchAgents,
  fetchModels,
} from '@/services/opencode/chatClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: 'secretpassword' }

describe('chatClient REST methods', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchSessions calls GET /api/session with basic auth', async () => {
    const mockSessions = [
      { id: 'ses_1', title: 'Session 1', createdAt: '2026-11-08T10:00:00Z', updatedAt: '2026-11-08T10:05:00Z' },
    ]
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockSessions,
    } as Response)

    const result = await fetchSessions(baseUrl, auth)

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/session`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      })
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('ses_1')
  })

  it('createSession calls POST /api/session with title', async () => {
    const newSession = { id: 'ses_2', title: 'New Work', createdAt: '2026-11-08T11:00:00Z', updatedAt: '2026-11-08T11:00:00Z' }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => newSession,
    } as Response)

    const result = await createSession(baseUrl, auth, 'New Work')

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/session`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'New Work' }),
      })
    )
    expect(result.id).toBe('ses_2')
  })

  it('fetchSessionMessages maps messages to ChatMessage array', async () => {
    const rawMessages = [
      { id: 'msg_1', role: 'user', content: 'hello', createdAt: '2026-11-08T10:00:00Z' },
      { id: 'msg_2', role: 'assistant', content: 'hi there', createdAt: '2026-11-08T10:00:05Z' },
    ]
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => rawMessages,
    } as Response)

    const messages = await fetchSessionMessages(baseUrl, auth, 'ses_1')
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('user')
    expect(messages[1].content).toBe('hi there')
  })

  it('sendPrompt sends prompt body to /api/session/{id}/prompt', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response)

    await sendPrompt(baseUrl, auth, 'ses_1', 'do this task', 'claude-3-5-sonnet', 'coder')

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/session/ses_1/prompt`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          prompt: 'do this task',
          model: 'claude-3-5-sonnet',
          agent: 'coder',
        }),
      })
    )
  })

  it('interruptSession calls POST /api/session/{id}/interrupt', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'interrupted' }),
    } as Response)

    await interruptSession(baseUrl, auth, 'ses_1')

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/session/ses_1/interrupt`,
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('replyPermission calls reply endpoint with decision', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response)

    await replyPermission(baseUrl, auth, 'ses_1', 'req_99', 'allow')

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/session/ses_1/permission/req_99/reply`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ decision: 'allow' }),
      })
    )
  })

  it('fetchAgents returns list of available agents', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'general' }, { id: 'coder' }],
    } as Response)

    const agents = await fetchAgents(baseUrl, auth)
    expect(agents).toEqual(['general', 'coder'])
  })

  it('fetchModels returns list of available models', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        providers: [
          { models: [{ id: 'anthropic/claude-3-5-sonnet' }, { id: 'openai/gpt-4o' }] },
        ],
      }),
    } as Response)

    const models = await fetchModels(baseUrl, auth)
    expect(models).toEqual(['anthropic/claude-3-5-sonnet', 'openai/gpt-4o'])
  })
})
