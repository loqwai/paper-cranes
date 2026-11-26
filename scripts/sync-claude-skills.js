// sync-claude-skills — .agents/skills is the one source for the repo's skills. Claude Code finds
// skills only in .claude/skills, so this writes a byte-for-byte copy of each one there. No symlink:
// the repo is checked out on Windows. Hand copies drifted for six weeks (2026-10-12 to 2026-11-24),
// so the copy is made here and checked by a test.
// Only the skills in .agents/skills are replaced. Any other folder in .claude/skills (a local,
// untracked skill) is left alone and named in the output.
//   node scripts/sync-claude-skills.js          rewrite .claude/skills/<skill> for each .agents skill
//   (scripts/sync-claude-skills.test.js fails when they differ)
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const FROM = join(ROOT, '.agents', 'skills')
export const TO = join(ROOT, '.claude', 'skills')

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? walk(path) : [path]
})

const skillsIn = (dir) => (existsSync(dir) ? readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory()) : [])

// { 'show/SKILL.md': <Buffer> } for the named skills under dir.
const tree = (dir, skills) => Object.fromEntries(skills
  .filter((skill) => existsSync(join(dir, skill)))
  .flatMap((skill) => walk(join(dir, skill)))
  .map((file) => [relative(dir, file), readFileSync(file)]))

export const expected = (from = FROM) => tree(from, skillsIn(from))

// What the mirrored skills hold in .claude/skills now. Folders that are not in .agents/skills are not read.
export const actual = (from = FROM, to = TO) => tree(to, skillsIn(from))

// Folders in .claude/skills with no .agents/skills source: kept, never touched.
export const localOnly = (from = FROM, to = TO) => skillsIn(to).filter((skill) => !skillsIn(from).includes(skill))

export const sync = (from = FROM, to = TO) => {
  for (const skill of skillsIn(from)) rmSync(join(to, skill), { recursive: true, force: true })
  const files = expected(from)
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(to, rel)), { recursive: true })
    writeFileSync(join(to, rel), body)
  }
  return { files: Object.keys(files).length, kept: localOnly(from, to) }
}

const main = () => {
  const { files, kept } = sync()
  console.log(`synced ${files} files into ${relative(ROOT, TO)}`)
  if (kept.length) console.log(`left alone (not in .agents/skills): ${kept.join(', ')}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
