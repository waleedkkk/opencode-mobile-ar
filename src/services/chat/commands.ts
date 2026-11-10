export interface SlashCommand {
  key: string
  label: string
  descriptionKey: string
  prompt: string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    key: 'test',
    label: '/test',
    descriptionKey: 'chat.cmdTestDesc',
    prompt: 'Run the project tests and report any failures.',
  },
  {
    key: 'git',
    label: '/git',
    descriptionKey: 'chat.cmdGitDesc',
    prompt: 'Check git status, recent commits, and modified files.',
  },
  {
    key: 'fix',
    label: '/fix',
    descriptionKey: 'chat.cmdFixDesc',
    prompt: 'Inspect the last failure or issue and fix it.',
  },
  {
    key: 'explain',
    label: '/explain',
    descriptionKey: 'chat.cmdExplainDesc',
    prompt: 'Explain how this code works and clarify the architecture.',
  },
  {
    key: 'review',
    label: '/review',
    descriptionKey: 'chat.cmdReviewDesc',
    prompt: 'Review the recent changes for bugs, edge cases, and best practices.',
  },
  {
    key: 'compact',
    label: '/compact',
    descriptionKey: 'chat.cmdCompactDesc',
    prompt: 'Compact the conversation context to save tokens and keep memory clean.',
  },
]

export function filterSlashCommands(query: string): SlashCommand[] {
  const clean = query.replace(/^\//, '').toLowerCase().trim()
  if (!clean) return SLASH_COMMANDS
  return SLASH_COMMANDS.filter(
    (c) => c.key.toLowerCase().startsWith(clean) || c.label.toLowerCase().startsWith(clean)
  )
}
