import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchCommands, fetchSkills } from '@/services/opencode/metaClient'
import type { ChatAuth } from '@/types/chat'

const baseUrl = 'http://127.0.0.1:4096'
const auth: ChatAuth = { username: 'opencode', password: undefined }

describe('metaClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchCommands maps available server commands', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { name: 'commit', description: 'Commit changes' },
          { name: 'test', description: 'Run tests' },
        ],
      }),
    } as Response)

    const commands = await fetchCommands(baseUrl, auth)

    expect(commands).toHaveLength(2)
    expect(commands[0].id).toBe('commit')
    expect(commands[0].description).toBe('Commit changes')
    expect(String((globalThis.fetch as any).mock.calls[0][0])).toContain('/api/command')
  })

  it('fetchSkills maps available skills', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'tdd', name: 'Test Driven Development', description: 'Write tests first' },
        ],
      }),
    } as Response)

    const skills = await fetchSkills(baseUrl, auth)

    expect(skills).toHaveLength(1)
    expect(skills[0].id).toBe('tdd')
    expect(skills[0].name).toBe('Test Driven Development')
    expect(String((globalThis.fetch as any).mock.calls[0][0])).toContain('/api/skill')
  })
})
