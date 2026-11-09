import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatMarkdown from '@/components/chat/ChatMarkdown.vue'

describe('ChatMarkdown.vue', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders standard markdown elements correctly', () => {
    const md = 'Here is **bold** and *italic* and a [link](https://opencode.ai)'
    const wrapper = mount(ChatMarkdown, { props: { content: md } })

    expect(wrapper.find('strong').text()).toBe('bold')
    expect(wrapper.find('em').text()).toBe('italic')
    expect(wrapper.find('a').attributes('href')).toBe('https://opencode.ai')
  })

  it('wraps code blocks in dir="ltr" container with language and copy button', () => {
    const md = '```typescript\nconst greet = "hello"\n```'
    const wrapper = mount(ChatMarkdown, { props: { content: md } })

    const codeContainer = wrapper.find('[data-code-block]')
    expect(codeContainer.exists()).toBe(true)
    expect(codeContainer.attributes('dir')).toBe('ltr')

    const copyBtn = wrapper.find('[data-action="copy-code"]')
    expect(copyBtn.exists()).toBe(true)
    expect(wrapper.text()).toContain('typescript')
    expect(wrapper.find('pre code').text()).toContain('const greet = "hello"')
  })

  it('escapes raw HTML script tags to prevent XSS', () => {
    const md = '<script>evil()</script>'
    const wrapper = mount(ChatMarkdown, { props: { content: md } })

    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('<script>')
  })

  it('copies code to clipboard when copy button is clicked', async () => {
    const md = '```python\nprint("hi")\n```'
    const wrapper = mount(ChatMarkdown, { props: { content: md } })

    const copyBtn = wrapper.find('[data-action="copy-code"]')
    await copyBtn.trigger('click')

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('print("hi")\n')
  })

  it('highlights diff additions and deletions inside markdown diff blocks', () => {
    const md = '```diff\n-old line\n+new line\n```'
    const wrapper = mount(ChatMarkdown, { props: { content: md } })

    expect(wrapper.html()).toContain('text-green-700')
    expect(wrapper.html()).toContain('text-destructive')
    expect(wrapper.text()).toContain('new line')
    expect(wrapper.text()).toContain('old line')
  })
})
