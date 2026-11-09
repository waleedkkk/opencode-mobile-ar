import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatDiffViewer from '@/components/chat/ChatDiffViewer.vue'

describe('ChatDiffViewer.vue', () => {
  const diffSample = `--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 import express from 'express'
-const port = 3000
+const port = 8080
+const app = express()
`

  it('renders diff file path, addition/deletion counts, and isolated ltr lines', () => {
    const wrapper = mount(ChatDiffViewer, { props: { diff: diffSample } })

    expect(wrapper.text()).toContain('src/app.ts')
    expect(wrapper.text()).toContain('+2')
    expect(wrapper.text()).toContain('-1')

    const diffContainer = wrapper.find('[data-diff-container]')
    expect(diffContainer.exists()).toBe(true)
    expect(diffContainer.attributes('dir')).toBe('ltr')

    const addedLines = wrapper.findAll('[data-diff-type="add"]')
    const deletedLines = wrapper.findAll('[data-diff-type="delete"]')

    expect(addedLines.length).toBe(2)
    expect(deletedLines.length).toBe(1)
    expect(deletedLines[0].text()).toContain('const port = 3000')
    expect(addedLines[0].text()).toContain('const port = 8080')
  })
})
