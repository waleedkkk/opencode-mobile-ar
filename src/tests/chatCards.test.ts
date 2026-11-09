import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatToolCallCard from '@/components/chat/ChatToolCallCard.vue'
import ChatPermissionCard from '@/components/chat/ChatPermissionCard.vue'
import type { ToolCall, PermissionRequest } from '@/types/chat'

describe('ChatToolCallCard.vue', () => {
  const tool: ToolCall = {
    id: 't_1',
    name: 'bash',
    arguments: { command: 'git status' },
    status: 'completed',
    result: 'On branch feat/native-chat\nnothing to commit',
  }

  it('renders tool name, arguments, and status', () => {
    const wrapper = mount(ChatToolCallCard, { props: { tool } })

    expect(wrapper.text()).toContain('bash')
    expect(wrapper.text()).toContain('git status')
  })

  it('isolates output with dir="ltr" and toggles collapse state on click', async () => {
    const wrapper = mount(ChatToolCallCard, { props: { tool } })

    const resultBox = wrapper.find('[data-tool-output]')
    expect(resultBox.exists()).toBe(true)
    expect(resultBox.attributes('dir')).toBe('ltr')
    expect(resultBox.text()).toContain('On branch feat/native-chat')

    // Click header to collapse
    const toggleBtn = wrapper.find('[data-action="toggle-tool"]')
    await toggleBtn.trigger('click')

    // After collapse, output should not be displayed
    expect(wrapper.find('[data-tool-output]').exists()).toBe(false)

    // Click again to expand
    await toggleBtn.trigger('click')
    expect(wrapper.find('[data-tool-output]').exists()).toBe(true)
  })
})

describe('ChatPermissionCard.vue', () => {
  const request: PermissionRequest = {
    id: 'p_1',
    toolName: 'shell',
    description: 'Execute dangerous command',
    arguments: { command: 'rm -rf /tmp/test' },
    state: 'pending',
  }

  it('renders permission details and emits allow/deny events on action click', async () => {
    const wrapper = mount(ChatPermissionCard, { props: { request } })

    expect(wrapper.text()).toContain('Execute dangerous command')
    expect(wrapper.text()).toContain('rm -rf /tmp/test')

    const allowBtn = wrapper.find('[data-action="allow"]')
    const denyBtn = wrapper.find('[data-action="deny"]')

    expect(allowBtn.exists()).toBe(true)
    expect(denyBtn.exists()).toBe(true)

    await allowBtn.trigger('click')
    expect(wrapper.emitted('allow')).toBeTruthy()
    expect(wrapper.emitted('allow')![0]).toEqual(['p_1'])

    await denyBtn.trigger('click')
    expect(wrapper.emitted('deny')).toBeTruthy()
    expect(wrapper.emitted('deny')![0]).toEqual(['p_1'])
  })
})
