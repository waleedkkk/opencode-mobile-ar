import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChatFormCard from '@/components/chat/ChatFormCard.vue'
import type { PendingForm } from '@/services/opencode/formClient'

const form: PendingForm = {
  id: 'frm_1',
  sessionID: 'ses_1',
  title: 'Choose a branch',
  fields: [
    { key: 'branch', type: 'string', title: 'Branch name', required: true },
    { key: 'count', type: 'integer', title: 'Count', minimum: 1, maximum: 5, default: 2 },
    { key: 'confirm', type: 'boolean', title: 'Confirm?' },
    {
      key: 'targets',
      type: 'multiselect',
      title: 'Targets',
      options: [
        { value: 'android', label: 'Android' },
        { value: 'ios', label: 'iOS' },
      ],
    },
  ],
}

describe('ChatFormCard.vue', () => {
  it('renders every field type and emits the collected answer', async () => {
    const wrapper = mount(ChatFormCard, { props: { form } })

    expect(wrapper.text()).toContain('Choose a branch')
    expect(wrapper.text()).toContain('Branch name')
    expect(wrapper.find('input[type="number"]').exists()).toBe(true)
    expect(wrapper.find('[data-option="android"]').exists()).toBe(true)

    await wrapper.find('input[type="text"]').setValue('main')
    await wrapper.find('[data-option="android"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-action="form-submit"]').trigger('click')

    expect(wrapper.emitted('submit')).toBeTruthy()
    const emitted = wrapper.emitted('submit')![0]
    expect(emitted[0]).toBe('frm_1')
    expect(emitted[1]).toEqual({
      branch: 'main',
      count: 2,
      confirm: false,
      targets: ['android'],
    })
  })

  it('blocks submission when a required field is empty', async () => {
    const wrapper = mount(ChatFormCard, { props: { form } })

    await wrapper.find('[data-action="form-submit"]').trigger('click')

    expect(wrapper.emitted('submit')).toBeFalsy()
    expect(wrapper.text()).toContain('Branch name')
  })

  it('multiselect toggles a selection off again', async () => {
    const wrapper = mount(ChatFormCard, { props: { form } })

    await wrapper.find('[data-option="ios"]').trigger('click')
    await wrapper.find('[data-option="ios"]').trigger('click')
    await flushPromises()

    await wrapper.find('input[type="text"]').setValue('x')
    await wrapper.find('[data-action="form-submit"]').trigger('click')

    const emitted = wrapper.emitted('submit')![0][1] as any
    expect(emitted.targets).toEqual([])
  })
})
