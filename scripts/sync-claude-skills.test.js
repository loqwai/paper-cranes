import { it, expect } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { actual, expected, sync } from './sync-claude-skills.js'

it('.claude/skills holds a byte copy of every .agents/skills skill (edit .agents/skills, then run: node scripts/sync-claude-skills.js)', () => {
  const want = expected()
  const have = actual()
  expect(Object.keys(have).sort()).toEqual(Object.keys(want).sort())
  for (const [rel, body] of Object.entries(want)) expect(Buffer.compare(have[rel], body), rel).toBe(0)
})

it('replaces the mirrored skills and leaves a local-only skill alone', () => {
  const root = mkdtempSync(join(tmpdir(), 'sync-skills-'))
  const from = join(root, 'agents')
  const to = join(root, 'claude')
  const put = (path, text) => { mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, text) }
  try {
    put(join(from, 'show', 'SKILL.md'), 'new show')
    put(join(to, 'show', 'SKILL.md'), 'old show')
    put(join(to, 'show', 'stale.md'), 'gone from the source')
    put(join(to, 'mine', 'SKILL.md'), 'local, untracked')

    const { kept } = sync(from, to)

    expect(readFileSync(join(to, 'show', 'SKILL.md'), 'utf8')).toBe('new show')
    expect(existsSync(join(to, 'show', 'stale.md'))).toBe(false)
    expect(readFileSync(join(to, 'mine', 'SKILL.md'), 'utf8')).toBe('local, untracked')
    expect(kept).toEqual(['mine'])
    expect(Object.keys(actual(from, to))).toEqual(['show/SKILL.md'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
