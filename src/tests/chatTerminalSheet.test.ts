import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatTerminalSheet from '@/components/chat/ChatTerminalSheet.vue'
import * as ptyClient from '@/services/opencode/ptyClient'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onclose: (() => void) | null = null
  onerror: ((event: any) => void) | null = null
  sent: string[] = []
  closed = false
  url: string

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
  }

  triggerOpen(): void {
    this.onopen?.()
  }

  triggerMessage(text: string): void {
    this.onmessage?.({ data: text })
  }
}

describe('ChatTerminalSheet.vue', () => {
  beforeEach(() => {
    FakeWebSocket.instances = []
    ;(globalThis as any).WebSocket = FakeWebSocket
    vi.restoreAllMocks()

    vi.spyOn(ptyClient, 'listPtys').mockResolvedValue([
      { id: 'pty_1', title: 'bash', cols: 80, rows: 24 },
    ])
    vi.spyOn(ptyClient, 'requestPtyToken').mockResolvedValue('tok_1')
  })

  it('lists PTYs and connects on open, sending typed input over the socket', async () => {
    const wrapper = mount(ChatTerminalSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
      },
      attachTo: document.body,
    })

    await flushPromises()

    expect(ptyClient.listPtys).toHaveBeenCalled()
    const ptyBtn = document.body.querySelector('[data-pty="pty_1"]') as HTMLElement | null
    expect(ptyBtn).not.toBeNull()
    ptyBtn!.click()
    await flushPromises()

    expect(ptyClient.requestPtyToken).toHaveBeenCalled()
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(FakeWebSocket.instances[0].url).toContain('token=tok_1')

    FakeWebSocket.instances[0].triggerOpen()
    FakeWebSocket.instances[0].triggerMessage('total 12\r\n')
    await flushPromises()

    expect(document.body.textContent).toContain('total 12')

    const input = document.body.querySelector('[data-terminal-input]') as HTMLInputElement | null
    expect(input).not.toBeNull()
    input!.value = 'ls'
    input!.dispatchEvent(new Event('input'))
    await flushPromises()

    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()

    expect(FakeWebSocket.instances[0].sent).toContain('ls\r')
    wrapper.unmount()
  })
})
