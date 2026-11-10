import { describe, it, expect } from 'vitest'
import {
  SLASH_COMMANDS,
  filterSlashCommands,
} from '@/services/chat/commands'

describe('slash commands service', () => {
  it('contains essential developer slash commands', () => {
    const keys = SLASH_COMMANDS.map((c) => c.key)
    expect(keys).toContain('test')
    expect(keys).toContain('git')
    expect(keys).toContain('fix')
    expect(keys).toContain('explain')
    expect(keys).toContain('review')
    expect(keys).toContain('compact')
  })

  it('filters commands by query', () => {
    expect(filterSlashCommands('/t')).toHaveLength(1)
    expect(filterSlashCommands('/t')[0].key).toBe('test')

    expect(filterSlashCommands('gi')).toHaveLength(1)
    expect(filterSlashCommands('gi')[0].key).toBe('git')

    expect(filterSlashCommands('/')).toHaveLength(SLASH_COMMANDS.length)
  })
})
