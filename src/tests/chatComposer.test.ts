import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import ChatHeader from '@/components/chat/ChatHeader.vue'
import ChatMessageItem from '@/components/chat/ChatMessageItem.vue'
import type { ChatMessage } from '@/types/chat'

describe('ChatComposer.vue', () => {
  it('emits send with trimmed text on button click and clears input', async () => {
    const wrapper = mount(ChatComposer, { props: { streaming: false } })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Fix the bug   ')

    const sendBtn = wrapper.find('[data-action="send"]')
    await sendBtn.trigger('click')

    expect(wrapper.emitted('send')).toBeTruthy()
    expect(wrapper.emitted('send')![0]).toEqual(['Fix the bug'])
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })

  it('emits send on Enter keypress without Shift', async () => {
    const wrapper = mount(ChatComposer, { props: { streaming: false } })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Deploy now')

    await textarea.trigger('keydown.enter')

    expect(wrapper.emitted('send')).toBeTruthy()
    expect(wrapper.emitted('send')![0]).toEqual(['Deploy now'])
  })

  it('transforms send button to interrupt button when streaming is true', async () => {
    const wrapper = mount(ChatComposer, { props: { streaming: true } })

    const interruptBtn = wrapper.find('[data-action="interrupt"]')
    expect(interruptBtn.exists()).toBe(true)

    await interruptBtn.trigger('click')
    expect(wrapper.emitted('interrupt')).toBeTruthy()
  })

  it('renders attachment button and hidden file input', () => {
    const wrapper = mount(ChatComposer, { props: { streaming: false } })

    const attachBtn = wrapper.find('[data-action="attach"]')
    const fileInput = wrapper.find('input[type="file"]')

    expect(attachBtn.exists()).toBe(true)
    expect(fileInput.exists()).toBe(true)
  })

  it('renders voice input button and toggles voice listening', () => {
    const wrapper = mount(ChatComposer, { props: { streaming: false } })

    const voiceBtn = wrapper.find('[data-action="voice"]')
    expect(voiceBtn.exists()).toBe(true)
  })

  it('shows slash command suggestions when typing / and populates prompt on click', async () => {
    const wrapper = mount(ChatComposer, { props: { streaming: false } })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('/te')

    const slashMenu = wrapper.find('[data-slash-menu]')
    expect(slashMenu.exists()).toBe(true)
    expect(wrapper.text()).toContain('/test')

    const testItem = wrapper.find('[data-command="test"]')
    await testItem.trigger('click')

    expect((textarea.element as HTMLTextAreaElement).value).toContain('Run the project tests')
  })
})

describe('ChatHeader.vue', () => {
  it('renders title and emits openDrawer and openWebView', async () => {
    const wrapper = mount(ChatHeader, {
      props: {
        title: 'Project Discussion',
        model: 'claude-3-5-sonnet',
        status: 'connected',
      },
    })

    expect(wrapper.text()).toContain('Project Discussion')
    expect(wrapper.text()).toContain('claude-3-5-sonnet')

    const drawerBtn = wrapper.find('[data-action="open-drawer"]')
    const webviewBtn = wrapper.find('[data-action="open-webview"]')

    expect(drawerBtn.exists()).toBe(true)
    expect(webviewBtn.exists()).toBe(true)

    await drawerBtn.trigger('click')
    expect(wrapper.emitted('openDrawer')).toBeTruthy()

    await webviewBtn.trigger('click')
    expect(wrapper.emitted('openWebView')).toBeTruthy()
  })
})

describe('ChatMessageItem.vue', () => {
  it('renders user message bubble aligned logically', () => {
    const userMsg: ChatMessage = {
      id: 'm1',
      role: 'user',
      content: 'Can you refactor this?',
      createdAt: '2026-11-08T10:00:00Z',
    }

    const wrapper = mount(ChatMessageItem, { props: { message: userMsg } })
    expect(wrapper.text()).toContain('Can you refactor this?')
    expect(wrapper.find('[data-role="user"]').exists()).toBe(true)
  })

  it('renders assistant message with tool calls', () => {
    const astMsg: ChatMessage = {
      id: 'm2',
      role: 'assistant',
      content: 'Sure, I executed:',
      createdAt: '2026-11-08T10:00:05Z',
      toolCalls: [
        { id: 't1', name: 'bash', arguments: { cmd: 'git diff' }, status: 'completed' },
      ],
    }

    const wrapper = mount(ChatMessageItem, { props: { message: astMsg } })
    expect(wrapper.text()).toContain('Sure, I executed:')
    expect(wrapper.text()).toContain('bash')
  })

  it('renders attached files inside the bubble', () => {
    const msgWithFile: ChatMessage = {
      id: 'm3',
      role: 'user',
      content: 'See attached diagram',
      createdAt: '2026-11-08T10:00:10Z',
      files: [
        { id: 'f1', name: 'architecture.png', mime: 'image/png', data: '123' },
      ],
    }

    const wrapper = mount(ChatMessageItem, { props: { message: msgWithFile } })
    expect(wrapper.text()).toContain('architecture.png')
    expect(wrapper.find('[data-attachment]').exists()).toBe(true)
  })
})
