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
          text: 'do this task',
        }),
      })
    )
  })

  it('sendPrompt sends files in payload conforming to OpenCode v2.2.5 schema', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response)

    const files = [
      { id: 'f1', name: 'screenshot.png', mime: 'image/png', data: 'iVBORw0KGgo=' },
    ]

    await sendPrompt(baseUrl, auth, 'ses_1', 'look at this image', undefined, undefined, files)

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/session/ses_1/prompt`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: 'look at this image',
          files: [
            {
              uri: 'data:image/png;base64,iVBORw0KGgo=',
              data: 'iVBORw0KGgo=',
              mime: 'image/png',
              name: 'screenshot.png',
              source: { type: 'inline' },
            },
          ],
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

  it('fetchSessions supports OpenCode v2.2.5 { data: [...] } envelope', async () => {
    const envelope = {
      data: [
        { id: 'ses_225', title: 'OpenCode 2.2.5 Session', time: { created: 1794228228285, updated: 1794228228285 } },
      ],
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => envelope,
    } as Response)

    const result = await fetchSessions(baseUrl, auth)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('ses_225')
    expect(result[0].title).toBe('OpenCode 2.2.5 Session')
    expect(result[0].createdAt).toContain('T')
  })

  it('fetchSessionMessages supports OpenCode v2.2.5 structured content parts', async () => {
    const envelope = {
      data: [
        {
          id: 'msg_u',
          type: 'user',
          text: 'show git status',
          time: { created: 1794228200000 },
        },
        {
          id: 'msg_a',
          type: 'assistant',
          time: { created: 1794228205000 },
          content: [
            { type: 'text', text: 'Running git status now' },
            {
              type: 'tool',
              id: 't_bash_1',
              name: 'bash',
              state: {
                status: 'completed',
                input: { command: 'git status' },
                content: [{ type: 'text', text: 'On branch main' }],
              },
            },
          ],
        },
      ],
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => envelope,
    } as Response)

    const messages = await fetchSessionMessages(baseUrl, auth, 'ses_225')
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('show git status')
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].content).toBe('Running git status now')
    expect(messages[1].toolCalls).toHaveLength(1)
    expect(messages[1].toolCalls![0].name).toBe('bash')
    expect(messages[1].toolCalls![0].status).toBe('completed')
    expect(messages[1].toolCalls![0].result).toBe('On branch main')
  })
})
