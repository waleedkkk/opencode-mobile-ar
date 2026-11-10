import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatInsightsSheet from '@/components/chat/ChatInsightsSheet.vue'
import * as insights from '@/services/opencode/insightsClient'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

describe('ChatInsightsSheet.vue', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()

    vi.spyOn(insights, 'fetchSessionStats').mockResolvedValue({
      sessions: 4,
      prompts: 12,
      totalTokens: 1250,
      cost: 0.42,
      models: [{ id: 'gpt', cost: 0.42, tokens: 1250 }],
    })
    vi.spyOn(insights, 'fetchMcpServers').mockResolvedValue([
      { id: 'github', name: 'GitHub', status: 'connected' },
    ])
    vi.spyOn(insights, 'fetchIntegrations').mockResolvedValue([
      { id: 'google', name: 'Google', connected: true },
    ])
    vi.spyOn(insights, 'fetchWorktrees').mockResolvedValue([
      { id: 'wt_1', branch: 'feat/x', directory: '/w/x' },
    ])
    vi.spyOn(insights, 'runWebSearch').mockResolvedValue([
      { title: 'OpenCode docs', url: 'https://opencode.ai/docs', snippet: '...' },
    ])
  })

  it('shows usage totals on the default tab', async () => {
    const wrapper = mount(ChatInsightsSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
      },
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.textContent).toContain('4')
    expect(document.body.textContent).toContain('1250')
    wrapper.unmount()
  })

  it('switches to the MCP tab and lists servers', async () => {
    const wrapper = mount(ChatInsightsSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
      },
      attachTo: document.body,
    })
    await flushPromises()

    const tab = document.body.querySelector('[data-tab="mcp"]') as HTMLElement | null
    expect(tab).not.toBeNull()
    tab!.click()
    await flushPromises()

    expect(insights.fetchMcpServers).toHaveBeenCalled()
    expect(document.body.textContent).toContain('GitHub')
    wrapper.unmount()
  })

  it('runs a web search from the search tab', async () => {
    const wrapper = mount(ChatInsightsSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
      },
      attachTo: document.body,
    })
    await flushPromises()

    const tab = document.body.querySelector('[data-tab="search"]') as HTMLElement | null
    tab!.click()
    await flushPromises()

    const input = document.body.querySelector('[data-search-input]') as HTMLInputElement | null
    input!.value = 'opencode'
    input!.dispatchEvent(new Event('input'))
    await flushPromises()

    const btn = document.body.querySelector('[data-action="run-search"]') as HTMLElement | null
    btn!.click()
    await flushPromises()

    expect(insights.runWebSearch).toHaveBeenCalled()
    expect(document.body.textContent).toContain('OpenCode docs')
    wrapper.unmount()
  })
})
