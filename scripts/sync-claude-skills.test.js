import { it, expect } from 'vitest'
import { actual, expected } from './sync-claude-skills.js'

it('.claude/skills is a byte copy of .agents/skills (edit .agents/skills, then run: node scripts/sync-claude-skills.js)', () => {
  const want = expected()
  const have = actual()
  expect(Object.keys(have).sort()).toEqual(Object.keys(want).sort())
  for (const [rel, body] of Object.entries(want)) expect(Buffer.compare(have[rel], body), rel).toBe(0)
})
