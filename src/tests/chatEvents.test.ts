import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseSseChunk,
  SseBuffer,
  connectSseStream,
} from '@/services/opencode/chatClient'
import type { ChatAuth } from '@/types/chat'

describe('parseSseChunk & SseBuffer', () => {
  it('parses complete SSE event with event and data lines', () => {
    const raw = `event: session.message.delta\ndata: {"sessionId":"s1","delta":"world"}\n\n`
    const events = parseSseChunk(raw)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('session.message.delta')
    expect(events[0].sessionId).toBe('s1')
    expect(events[0].payload.delta).toBe('world')
  })

  it('parses data-only event with type in payload', () => {
    const raw = `data: {"type":"session.status","sessionId":"s2","status":"thinking"}\n\n`
    const events = parseSseChunk(raw)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('session.status')
    expect(events[0].sessionId).toBe('s2')
    expect(events[0].payload.status).toBe('thinking')
  })

  it('handles multiple events in one chunk', () => {
    const raw = `event: session.tool.start\ndata: {"sessionId":"s1","tool":"bash"}\n\nevent: session.tool.finish\ndata: {"sessionId":"s1","status":"completed"}\n\n`
    const events = parseSseChunk(raw)

    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('session.tool.start')
    expect(events[1].type).toBe('session.tool.finish')
  })

  it('ignores comments and heartbeats', () => {
    const raw = `:keepalive\n:ping\n\n`
    const events = parseSseChunk(raw)
    expect(events).toHaveLength(0)
  })

  it('SseBuffer buffers split chunks across boundaries', () => {
    const buffer = new SseBuffer()
    const chunk1 = 'event: session.permission.request\ndata: {"sessionId":"s1",'
    const chunk2 = '"requestId":"r1","toolName":"shell"}\n\n'

    const events1 = buffer.feed(chunk1)
    expect(events1).toHaveLength(0)

    const events2 = buffer.feed(chunk2)
    expect(events2).toHaveLength(1)
    expect(events2[0].type).toBe('session.permission.request')
    expect(events2[0].payload.requestId).toBe('r1')
  })
})

describe('connectSseStream', () => {
  const baseUrl = 'http://127.0.0.1:4096'
  const auth: ChatAuth = { username: 'opencode', password: 'pass' }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('initiates fetch with text/event-stream header and abort controller', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('event: session.status\ndata: {"sessionId":"s1","status":"idle"}\n\n'))
        controller.close()
      },
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: stream,
    } as unknown as Response)

    const receivedEvents: any[] = []
    const disconnect = connectSseStream(
      baseUrl,
      auth,
      (ev) => receivedEvents.push(ev),
      vi.fn()
    )

    await new Promise((r) => setTimeout(r, 20))

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/api/event`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'text/event-stream',
        }),
      })
    )

    expect(typeof disconnect).toBe('function')
    disconnect()
  })
})
