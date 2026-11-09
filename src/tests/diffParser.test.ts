import { describe, it, expect } from 'vitest'
import {
  isUnifiedDiff,
  parseUnifiedDiff,
} from '@/services/diff/diffParser'

describe('diffParser', () => {
  const sampleDiff = `--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,4 +1,5 @@
 function add(a: number, b: number) {
-  return a - b
+  return a + b
 }
+export default add
`

  it('detects unified diff format', () => {
    expect(isUnifiedDiff(sampleDiff)).toBe(true)
    expect(isUnifiedDiff('Just normal prose with no diff headers.')).toBe(false)
  })

  it('parses unified diff into structured files, chunks, and lines', () => {
    const files = parseUnifiedDiff(sampleDiff)

    expect(files).toHaveLength(1)
    const file = files[0]
    expect(file.oldPath).toBe('src/utils.ts')
    expect(file.newPath).toBe('src/utils.ts')
    expect(file.additions).toBe(2)
    expect(file.deletions).toBe(1)

    const lines = file.lines
    expect(lines.some((l) => l.type === 'delete' && l.content.includes('return a - b'))).toBe(true)
    expect(lines.some((l) => l.type === 'add' && l.content.includes('return a + b'))).toBe(true)
    expect(lines.some((l) => l.type === 'add' && l.content.includes('export default add'))).toBe(true)
    expect(lines.some((l) => l.type === 'context' && l.content.includes('function add'))).toBe(true)
  })

  it('handles multiple files in a single git diff', () => {
    const multiDiff = `--- a/file1.txt
+++ b/file1.txt
@@ -1,2 +1,2 @@
-old line
+new line
--- a/file2.txt
+++ b/file2.txt
@@ -1,1 +1,2 @@
 line
+added
`
    const files = parseUnifiedDiff(multiDiff)
    expect(files).toHaveLength(2)
    expect(files[0].newPath).toBe('file1.txt')
    expect(files[1].newPath).toBe('file2.txt')
  })
})
