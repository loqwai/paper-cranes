// sync-claude-skills — .agents/skills is the one source for the repo's skills. Claude Code finds
// skills only in .claude/skills, so this writes a byte-for-byte copy there. No symlink: the repo is
// checked out on Windows. Hand copies drifted for six weeks (2026-10-12 to 2026-11-24), so the copy
// is made here and checked by a test.
//   node scripts/sync-claude-skills.js          rewrite .claude/skills from .agents/skills
//   (scripts/sync-claude-skills.test.js fails when they differ)
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const FROM = join(ROOT, '.agents', 'skills')
export const TO = join(ROOT, '.claude', 'skills')

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path) : [path]
})

const tree = (dir) => Object.fromEntries(walk(dir).map((file) => [relative(dir, file), readFileSync(file)]))

// What .claude/skills should hold: { 'show/SKILL.md': <Buffer> }.
export const expected = () => tree(FROM)

export const actual = () => tree(TO)

const main = () => {
  rmSync(TO, { recursive: true, force: true })
  const files = expected()
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(TO, rel)), { recursive: true })
    writeFileSync(join(TO, rel), body)
  }
  console.log(`synced ${Object.keys(files).length} files into ${relative(ROOT, TO)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
