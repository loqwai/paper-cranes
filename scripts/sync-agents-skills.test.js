import { it, expect } from 'vitest'
import { actual, expected, translate } from './sync-agents-skills.js'

it('.agents/skills is .claude/skills with CLAUDE.md read as AGENTS.md (run: node scripts/sync-agents-skills.js)', () => {
  const want = expected()
  const have = actual()
  expect(Object.keys(have).sort()).toEqual(Object.keys(want).sort())
  for (const [rel, body] of Object.entries(want)) expect(String(have[rel]), rel).toBe(String(body))
})

it('reads CLAUDE.md as AGENTS.md and nothing else', () => {
  expect(translate('see CLAUDE.md and claude-in-chrome')).toBe('see AGENTS.md and claude-in-chrome')
})
