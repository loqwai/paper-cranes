#!/usr/bin/env node
// Move a shader directory (e.g. quarantine `sun` into `claude/wip/sun`, or promote it back) and
// rewrite every reference to it: `shaders/<from>/…` file paths, `<from>/N` shader ids
// (`?shader=sun/17`, beats.json "path", docs), and relative links inside the moved Markdown.
//
//   node scripts/move-shader-dir.mjs sun claude/wip/sun          # dry run: lists what changes
//   node scripts/move-shader-dir.mjs sun claude/wip/sun --write  # git mv + rewrite
//
// Archived snapshots under .claude/vj-tools/ are history and are left as they were.
import { execFileSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { posix } from 'path'

const [from, to, flag] = process.argv.slice(2)
if (!from || !to) {
  console.error('usage: node scripts/move-shader-dir.mjs <from> <to> [--write]   (paths relative to shaders/)')
  process.exit(1)
}
const write = flag === '--write'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20 })
const fromDir = `shaders/${from}`
const toDir = `shaders/${to}`
if (!existsSync(fromDir)) { console.error(`${fromDir} does not exist`); process.exit(1) }
if (existsSync(toDir)) { console.error(`${toDir} already exists`); process.exit(1) }

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const SKIP = [/^\.claude\/vj-tools\//, /^shader-dates\.json$/, /^package-lock\.json$/]
const TEXT = /\.(frag|md|js|mjs|cjs|json|html|txt|ya?ml)$/

// `shaders/sun/…` file paths, then bare `sun/<digits>` / `sun/lamp/<digits>` shader ids. The
// lookbehind keeps `black-sun/1`, `shots/sun/17-moment.png` and `controller=sun-17` untouched.
const rewrite = text => text
  .replace(new RegExp(`(?<![\\w-])${esc(fromDir)}/`, 'g'), `${toDir}/`)
  .replace(new RegExp(`(?<![\\w/.-])${esc(from)}/((?:[a-z-]+/)?\\d+)(?![\\w-])`, 'g'), `${to}/$1`)

// A relative link inside a moved doc resolved against the old directory; re-point it from the new one.
const relink = (text, oldFile, newFile) => text.replace(/(?<=[(\s`"'])((?:\.\.\/)+[\w./-]+)/g, link => {
  const target = posix.normalize(posix.join(posix.dirname(oldFile), link))
  if (target.startsWith(fromDir + '/') || !existsSync(target)) return link
  return posix.relative(posix.dirname(newFile), target)
})

const moved = git('ls-files', fromDir).trim().split('\n').filter(Boolean)
const files = git('ls-files').trim().split('\n').filter(f => TEXT.test(f) && !SKIP.some(r => r.test(f)))
const changes = []
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  const inMoved = f.startsWith(fromDir + '/')
  const dest = inMoved ? toDir + f.slice(fromDir.length) : f
  let out = rewrite(src)
  if (inMoved && f.endsWith('.md')) out = relink(out, f, dest)
  if (out !== src) changes.push({ f, dest, out, n: out.split('\n').filter((l, i) => l !== src.split('\n')[i]).length })
}

console.log(`${moved.length} files move ${fromDir} -> ${toDir}`)
for (const c of changes) console.log(`  rewrite ${c.f} (${c.n} lines)`)
if (!write) { console.log('dry run; pass --write to apply'); process.exit(0) }

mkdirSync(posix.dirname(toDir), { recursive: true })
git('mv', fromDir, toDir)
for (const c of changes) writeFileSync(c.dest, c.out)
console.log('done')
