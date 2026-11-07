// context — one shell-agnostic snapshot of the live-VJ rig, for a skill's `!` context line.
// Usage: node scripts/vj/context.js   (run from the repo root)
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getPort } from '../dev-port.js'

const here = dirname(fileURLToPath(import.meta.url))
const port = getPort()

const server = await fetch(`http://localhost:${port}/`).then(r => r.status, () => 'not running')
const read = (file, fallback) => { try { return readFileSync(file, 'utf8').trim() } catch { return fallback } }
const show = (() => {
  try { return execFileSync('node', [join(here, 'show.js'), 'status'], { encoding: 'utf8', timeout: 15000 }).trim() } catch (e) { return `error: ${e.message.split('\n')[0]}` }
})()
const signals = read('.claude/vj-signals.jsonl', '').split('\n').filter(Boolean).slice(-5).join('\n') || '(none)'

console.log(`platform: ${process.platform}
port: ${port}
dev server: ${server}
state file: ${read('.claude/vj-state.json', '(none)')}
show browser: ${show}
recent signals:
${signals}`)
