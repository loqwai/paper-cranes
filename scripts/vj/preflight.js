// preflight — the /show checks as one line each, so a launch reads a few lines instead of a
// checklist and a page of get_state JSON. Fixes for a ❌ live in .claude/skills/show/check.md.
//
//   node scripts/vj/preflight.js [--shader clit-set/2]          before launch: server, checkout, branch, projector
//   node scripts/vj/preflight.js --after [--shader clit-set/2]  after launch, over the VJ MCP: display, audio,
//                                                              runtime, controller, gate, pad
//
// Prints `✅ <key> <detail>` or `❌ <key> <detail>` per check, then one `say:` line of what no
// script can check. Exit 0 when every check passed, 1 otherwise. PORT as scripts/dev-port.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPort } from '../dev-port.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const port = getPort()
const args = process.argv.slice(2)
const opt = (name, fallback) => { const i = args.indexOf(name); return i === -1 ? fallback : args[i + 1] }
const shader = opt('--shader', 'clit-set/2')
const after = args.includes('--after')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const lines = []
const check = (key, ok, detail = '') => lines.push(`${ok ? '✅' : '❌'} ${key}${detail ? ` ${detail}` : ''}`)
const sh = (cmd, argv, timeout = 20000) => execFileSync(cmd, argv, { cwd: ROOT, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] }).trim()

// ---- pure: judge two get_state reads (exported for the test) ----

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

// A controller's clock is any output named *_time (cs_time, bs_time); it must rise between reads.
export const clockRises = (a, b) => {
  const keys = Object.keys(b?.controller ?? {}).filter((k) => /_time$/.test(k))
  if (!keys.length) return { ok: false, detail: 'no *_time output (controller not loaded or throwing)' }
  const k = keys[0]
  const [x, y] = [num(a?.controller?.[k]), num(b.controller[k])]
  return { ok: x !== null && y !== null && y > x, detail: `${k} ${x} → ${y}` }
}

// The quiet gate: a controller output named *presence or quietGate, near 1 with music playing.
export const gateOpen = (st) => {
  const k = Object.keys(st?.controller ?? {}).find((n) => /presence$|quietgate$/i.test(n))
  if (!k) return { ok: true, detail: '(no gate output; skipped)' }
  const v = num(st.controller[k])
  return { ok: v !== null && v >= 0.5, detail: `${k} ${v}` }
}

export const judgeAfter = (displays, a, b) => {
  const out = []
  const add = (key, ok, detail) => out.push({ key, ok, detail })
  add('display', displays.length > 0 && b.shaderError == null, displays.length ? `${b.shader} error=${b.shaderError ?? 'none'}` : 'no ?remote=display page')
  const energy = Math.max(num(a.audio?.energy) ?? 0, num(b.audio?.energy) ?? 0)
  add('audio', b.audio?.state === 'running' && energy >= 0.02, `${b.audio?.state} energy ${energy} input "${b.audio?.input ?? 'none'}"`)
  add('runtime', b.meter != null, b.meter != null ? 'meter up' : 'no meter (?vj=1 missing?)')
  const c = clockRises(a, b)
  add('controller', c.ok, c.detail)
  const g = gateOpen(b)
  add('gate', g.ok, g.detail)
  add('pad', (b.live?.pads ?? 0) >= 1, `pads ${b.live?.pads ?? 0}`)
  return out
}

// ---- checks ----

const before = async () => {
  const status = await fetch(`http://localhost:${port}/`).then((r) => r.status, () => 'down')
  check('server', status === 200, `:${port} ${status}`)
  if (status === 200) {
    const served = await fetch(`http://localhost:${port}/shaders/${shader}.frag`).then((r) => r.text(), () => null)
    let local = null
    try { local = readFileSync(join(ROOT, 'shaders', `${shader}.frag`), 'utf8') } catch { /* missing */ }
    check('checkout', served !== null && served === local, served === local ? 'serving this checkout' : 'SERVING ANOTHER CHECKOUT (or no such shader)')
  }
  try {
    try { sh('git', ['fetch', '-q', 'origin']) } catch { /* offline: judge what we have */ }
    const head = sh('git', ['status', '-sb']).split('\n')[0]
    check('branch', !/behind/.test(head), head.replace(/^## /, ''))
  } catch (e) {
    check('branch', false, e.message.split('\n')[0])
  }
  try {
    const displays = JSON.parse(sh('node', ['scripts/vj/show.js', 'displays']))
    check('projector', displays.length > 1, `${displays.length} display(s); launch uses the last`)
  } catch (e) {
    check('projector', false, String(e.stderr || e.message).trim().split('\n').pop())
  }
}

const afterLaunch = async () => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
  const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js')
  const client = new Client({ name: 'preflight', version: '0.1.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(process.env.MCP_URL || `http://localhost:${port}/mcp`)))
  const call = async (name, a = {}) => {
    const res = await client.callTool({ name, arguments: a })
    const t = res.content.find((c) => c.type === 'text')?.text ?? '{}'
    if (res.isError) throw new Error(t)
    return JSON.parse(t)
  }
  try {
    const { displays } = await call('list_displays')
    if (!displays.length) return check('display', false, 'no ?remote=display page')
    const a = await call('get_state', { features: 'none' })
    await sleep(2000)
    const b = await call('get_state', { features: 'none' })
    for (const r of judgeAfter(displays, a, b)) check(r.key, r.ok, r.detail)
  } finally {
    await client.close()
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  try {
    await (after ? afterLaunch() : before())
  } catch (e) {
    check(after ? 'display' : 'server', false, e.message.split('\n')[0])
  }
  console.log(lines.join('\n'))
  if (!after) console.log('say: Do Not Disturb on; overlay, break-reminder and dimming apps quit (Windows: Game Bar, Discord, Steam, GeForce); the OS input on the line feed or mic; Windows: keep the show window in front')
  process.exitCode = lines.some((l) => l.startsWith('❌')) ? 1 : 0
}
