import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatModelsSheet from '@/components/chat/ChatModelsSheet.vue'
import * as modelsClient from '@/services/opencode/modelsClient'

describe('ChatModelsSheet.vue', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()

    vi.spyOn(modelsClient, 'fetchProviders').mockResolvedValue([
      {
        id: 'anthropic',
        name: 'Anthropic',
        models: [
          { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
          { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
        ],
      },
    ])
  })

  it('lists providers and models and emits the selected model', async () => {
    const wrapper = mount(ChatModelsSheet, {
      props: {
        open: true,
        baseUrl: 'http://127.0.0.1:4096',
        auth: { username: 'opencode' },
        activeModel: 'anthropic/claude-3-5-sonnet',
        sessionId: 'ses_1',
      },
      attachTo: document.body,
    })

    await flushPromises()

    expect(document.body.textContent).toContain('Anthropic')
    expect(document.body.textContent).toContain('Claude 3 Opus')

    const modelBtn = document.body.querySelector('[data-model="anthropic/claude-3-opus"]') as HTMLElement | null
    expect(modelBtn).not.toBeNull()
    modelBtn!.click()
    await flushPromises()

    expect(wrapper.emitted('model-selected')).toBeTruthy()
    expect(wrapper.emitted('model-selected')![0]).toEqual(['anthropic/claude-3-opus'])
    wrapper.unmount()
  })
})
