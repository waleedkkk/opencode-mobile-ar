export interface DiffLine {
  type: 'add' | 'delete' | 'context' | 'header'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface DiffFile {
  oldPath: string
  newPath: string
  lines: DiffLine[]
  additions: number
  deletions: number
}

export function isUnifiedDiff(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return (
    (text.includes('--- ') && text.includes('+++ ')) ||
    /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/m.test(text)
  )
}

export function parseUnifiedDiff(diffText: string): DiffFile[] {
  if (!diffText || !diffText.trim()) return []

  const files: DiffFile[] = []
  let currentFile: DiffFile | null = null
  let oldLine = 0
  let newLine = 0

  const lines = diffText.split('\n')

  for (const line of lines) {
    if (line.startsWith('--- ')) {
      const oldPath = line.substring(4).replace(/^a\//, '').trim()
      if (currentFile && currentFile.oldPath && currentFile.newPath) {
        files.push(currentFile)
      }
      currentFile = {
        oldPath,
        newPath: '',
        lines: [],
        additions: 0,
        deletions: 0,
      }
      continue
    }

    if (line.startsWith('+++ ')) {
      const newPath = line.substring(4).replace(/^b\//, '').trim()
      if (currentFile) {
        currentFile.newPath = newPath
      } else {
        currentFile = {
          oldPath: newPath,
          newPath,
          lines: [],
          additions: 0,
          deletions: 0,
        }
      }
      continue
    }

    if (!currentFile) {
      if (/^@@ -\d+/.test(line)) {
        currentFile = {
          oldPath: 'diff',
          newPath: 'diff',
          lines: [],
          additions: 0,
          deletions: 0,
        }
      } else {
        continue
      }
    }

    if (line.startsWith('@@')) {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
      if (match) {
        oldLine = parseInt(match[1], 10)
        newLine = parseInt(match[2], 10)
      }
      currentFile.lines.push({
        type: 'header',
        content: line,
      })
      continue
    }

    if (line.startsWith('+')) {
      currentFile.additions++
      currentFile.lines.push({
        type: 'add',
        content: line.substring(1),
        newLineNumber: newLine++,
      })
    } else if (line.startsWith('-')) {
      currentFile.deletions++
      currentFile.lines.push({
        type: 'delete',
        content: line.substring(1),
        oldLineNumber: oldLine++,
      })
    } else if (line.startsWith(' ') || line === '') {
      currentFile.lines.push({
        type: 'context',
        content: line.startsWith(' ') ? line.substring(1) : line,
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
      })
    }
  }

  if (currentFile && (currentFile.lines.length > 0 || currentFile.newPath)) {
    files.push(currentFile)
  }

  return files
}
