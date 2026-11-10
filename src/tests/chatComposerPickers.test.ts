import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import * as modelsClient from '@/services/opencode/modelsClient'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

describe('ChatComposer model and agent pickers', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.spyOn(modelsClient, 'fetchProviders').mockResolvedValue([
      {
        id: 'anthropic',
        name: 'Anthropic',
        models: [
          { id: 'anthropic/claude-opus-4-5', name: 'claude-opus-4-5' },
          { id: 'anthropic/claude-sonnet-4-5', name: 'claude-sonnet-4-5' },
        ],
      },
      {
        id: 'nvidia',
        name: 'Nvidia',
        models: [{ id: 'stepfun-ai/step-5-preview', name: 'stepfun-ai/step-5-preview' }],
      },
    ])
  })

  it('renders a model chip and an agent chip above the input', () => {
    const wrapper = mount(ChatComposer, {
      props: {
        streaming: false,
        availableModels: ['anthropic/claude-opus-4-5', 'anthropic/claude-sonnet-4-5'],
        availableAgents: ['build', 'coder'],
        activeModel: 'anthropic/claude-opus-4-5',
        activeAgent: 'build',
        modelGroups: [
          { provider: 'anthropic', providerName: 'Anthropic', models: ['anthropic/claude-opus-4-5', 'anthropic/claude-sonnet-4-5'] },
        ],
      },
    })
    flushPromises()

    expect(wrapper.find('[data-action="pick-model"]').exists()).toBe(true)
    expect(wrapper.find('[data-action="pick-agent"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('claude-opus-4-5')
    expect(wrapper.text()).toContain('build')
  })

  it('opens a model list from the composer chip and emits the selection', async () => {
    const wrapper = mount(ChatComposer, {
      props: {
        streaming: false,
        availableModels: ['anthropic/claude-opus-4-5', 'anthropic/claude-sonnet-4-5'],
        availableAgents: ['build'],
        activeModel: 'anthropic/claude-opus-4-5',
        activeAgent: 'build',
        modelGroups: [
          { provider: 'anthropic', providerName: 'Anthropic', models: ['anthropic/claude-opus-4-5', 'anthropic/claude-sonnet-4-5'] },
        ],
      },
    })
    await flushPromises()

    await wrapper.find('[data-action="pick-model"]').trigger('click')
    await flushPromises()

    const list = wrapper.find('[data-model-list]')
    expect(list.exists()).toBe(true)
    // grouped by provider, never a flat unreadable dump
    expect(wrapper.text()).toContain('Anthropic')

    const option = wrapper.find('[data-model-option="anthropic/claude-sonnet-4-5"]')
    expect(option.exists()).toBe(true)
    await option.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('select-model')).toBeTruthy()
    expect(wrapper.emitted('select-model')![0]).toEqual(['anthropic/claude-sonnet-4-5'])
  })

  it('opens an agent list and emits the selection', async () => {
    const wrapper = mount(ChatComposer, {
      props: {
        streaming: false,
        availableModels: [],
        availableAgents: ['build', 'coder'],
        activeAgent: 'build',
      },
    })
    await flushPromises()

    await wrapper.find('[data-action="pick-agent"]').trigger('click')
    await flushPromises()

    const option = wrapper.find('[data-agent-option="coder"]')
    expect(option.exists()).toBe(true)
    await option.trigger('click')

    expect(wrapper.emitted('select-agent')).toBeTruthy()
    expect(wrapper.emitted('select-agent')![0]).toEqual(['coder'])
  })

  it('keeps the model chip readable by stripping the provider prefix', () => {
    const wrapper = mount(ChatComposer, {
      props: {
        streaming: false,
        availableModels: ['stepfun-ai/step-5-preview'],
        availableAgents: ['build'],
        activeModel: 'stepfun-ai/step-5-preview',
        activeAgent: 'build',
      },
    })
    flushPromises()

    const chip = wrapper.find('[data-action="pick-model"]')
    expect(chip.text()).toContain('step-5-preview')
    expect(chip.text()).not.toContain('stepfun-ai')
  })
})
