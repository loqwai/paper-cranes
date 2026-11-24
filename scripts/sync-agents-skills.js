// sync-agents-skills — .agents/skills (Codex and other harnesses) is a copy of .claude/skills with
// CLAUDE.md read as AGENTS.md. Hand copies drifted for six weeks (2026-10-12 to 2026-11-24) and
// kept skills that no longer existed, so the copy is made here and checked by a test.
//   node scripts/sync-agents-skills.js          rewrite .agents/skills from .claude/skills
//   (scripts/sync-agents-skills.test.js fails when they differ)
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const FROM = join(ROOT, '.claude', 'skills')
export const TO = join(ROOT, '.agents', 'skills')

// Skills that only make sense in Claude Code stay out of the copy. None today.
const CLAUDE_ONLY = new Set([])

export const translate = (text) => text.replaceAll('CLAUDE.md', 'AGENTS.md')

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path) : [path]
})

// What .agents/skills should hold: { 'show/SKILL.md': '<text>' }.
export const expected = () => Object.fromEntries(
  readdirSync(FROM)
    .filter((skill) => !CLAUDE_ONLY.has(skill) && statSync(join(FROM, skill)).isDirectory())
    .flatMap((skill) => walk(join(FROM, skill)))
    .map((file) => [relative(FROM, file), /\.(md|json|txt)$/.test(file) ? translate(readFileSync(file, 'utf8')) : readFileSync(file)]),
)

export const actual = () => Object.fromEntries(walk(TO).map((file) => [relative(TO, file), readFileSync(file)]))

const main = () => {
  rmSync(TO, { recursive: true, force: true })
  for (const [rel, body] of Object.entries(expected())) {
    mkdirSync(dirname(join(TO, rel)), { recursive: true })
    writeFileSync(join(TO, rel), body)
  }
  console.log(`synced ${Object.keys(expected()).length} files into ${relative(ROOT, TO)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
