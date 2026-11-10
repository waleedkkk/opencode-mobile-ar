import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DemoSessionMock from '@/components/DemoSessionMock.vue'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

describe('demo session safe area', () => {
  it('reserves the status bar inset on the sticky header', () => {
    const wrapper = mount(DemoSessionMock, { props: { profileName: 'Demo' } })

    const header = wrapper.find('header')
    expect(header.exists()).toBe(true)
    expect(header.classes()).toContain('pt-[env(safe-area-inset-top)]')
    // the legacy body padding must not double the inset
    expect(wrapper.classes()).not.toContain('pt-[env(safe-area-inset-top)]')
  })
})
