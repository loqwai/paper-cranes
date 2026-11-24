// Measure draw as a control surface, phone to wall, on one clock (this process). Not a test: a rerunnable
// measurement against real draw and a dev server (docs/draw-control-surface.md has the numbers it gave).
//   tap:  a phone (headless Chromium as an iPhone 13) taps a control, then "▶ Send to Claude" → a probe
//         listener sees the Send → board-bridge.js presses it → the display applies knob_1
//   drag: the phone drags a shape; does any listener hear it? (no: a drag makes no Send)
// Needs a scratch board (never a show board) holding ctl-k1-50 / ctl-k1-10 widgets or shapes, and:
//   LAB_URL       the board link the draw MCP `open` returns (signs the phone in for an hour; keep it private)
//   BRIDGE_TICKET a `listener` ticket for the bridge's agent; PROBE_TICKET one for a second agent
//   BOARD (default fader-lab), PORT (dev server, default 7157), OUT (results file)
// Usage: node scripts/vj/board-bridge.measure.js [taps=32] [nodrag]
import { writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium, devices } from 'playwright'

const REPO = new URL('../..', import.meta.url).pathname
const BOARD = process.env.BOARD || 'fader-lab'
const PORT = process.env.PORT || '7157'
const OUT = process.env.OUT || 'board-bridge-measure.json'
const TAPS = Number(process.argv[2] ?? 32)
const DO_DRAG = process.argv[3] !== 'nodrag'
const url = process.env.LAB_URL
const bridgeTicket = process.env.BRIDGE_TICKET
const probeTicket = process.env.PROBE_TICKET
if (!url || !bridgeTicket || !probeTicket) throw new Error('set LAB_URL, BRIDGE_TICKET and PROBE_TICKET')
const now = () => performance.now()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { taps: [], drag: null, bridge: [], probe: [] }

// ---- probe listener: a second watcher, so the bridge's own acks never steal a Send from it ----
let probing = true
const probe = (async () => {
  let ack
  while (probing) {
    const q = new URLSearchParams(ack ? { ack, timeout: '20' } : { timeout: '20' })
    try {
      const res = await fetch(`https://draw.hypnodroid.com/api/listen/${BOARD}?${q}`, { headers: { 'Draw-Listen-Ticket': probeTicket } })
      const at = now()
      const { send } = await res.json()
      if (!send) continue
      ack = send.sent
      out.probe.push({ at, sent: send.sent, scope: send.scope, selected: send.selected, changed: send.changed?.map((c) => c.id) })
    } catch (e) { await sleep(500) }
  }
})()

// ---- the bridge, as /show would start it ----
const bridge = spawn('node', ['scripts/vj/board-bridge.js', '--board', BOARD, '--ticket', bridgeTicket], { cwd: REPO, env: { ...process.env, PORT } })
bridge.stdout.on('data', (b) => String(b).split('\n').filter(Boolean).forEach((l) => { out.bridge.push({ at: now(), line: l.slice(0, 300) }) }))
bridge.stderr.on('data', (b) => console.error('bridge!', String(b).slice(0, 300)))

const browser = await chromium.launch()

// ---- the display (the wall) ----
const wallCtx = await browser.newContext({ viewport: { width: 640, height: 360 } })
const wall = await wallCtx.newPage()
const seen = []
await wall.exposeBinding('__seen', (_, key, value) => seen.push({ at: now(), key, value }))
await wall.goto(`http://127.0.0.1:${PORT}/?remote=display&shader=plasma&noaudio=true`)
await wall.waitForTimeout(4000)
await wall.evaluate(() => {
  let last = {}
  const tick = () => {
    const p = window.cranes?.messageParams ?? {}
    for (const k of ['knob_1', 'knob_2']) if (p[k] !== last[k]) { window.__seen(k, p[k] ?? null); last = { ...last, [k]: p[k] } }
    requestAnimationFrame(tick)
  }
  tick()
})

// ---- the phone ----
const phoneCtx = await browser.newContext({ ...devices['iPhone 13'] })
const phone = await phoneCtx.newPage()
let look = null
const pushes = []
phone.on('websocket', (ws) => {
  ws.on('framesent', (f) => {
    const s = String(f.payload)
    if (s.startsWith('{"t":"look"')) look = JSON.parse(s).bounds
    if (s.includes('fad-k2')) pushes.push({ at: now(), bytes: s.length, t: s.slice(0, 20) })
  })
})
await phone.goto(url)
await phone.waitForTimeout(7000)
if (!look) throw new Error('no look from the phone')
// A phone opens on the hand tool (draw frontend/src/board/tool.ts): a touch pans. The person must
// switch to the selection tool once before a tap can select a control; do that switch here.
const tool = await phone.evaluate(() => {
  const root = document.querySelector('.excalidraw')
  const key = Object.keys(root).find((k) => k.startsWith('__reactFiber'))
  for (let f = root[key]; f; f = f.return) {
    const app = f.stateNode
    if (app && typeof app.setActiveTool === 'function' && app.state?.activeTool) {
      const before = app.state.activeTool.type
      app.setActiveTool({ type: 'selection' })
      return before
    }
  }
  return null
})
console.log('phone tool was', tool, '→ selection')
await phone.waitForTimeout(500)
const VW = devices['iPhone 13'].viewport.width
const toScreen = (x, y) => ({ x: (x - look.x) * (VW / look.width), y: (y - look.y) * (VW / look.width) })
const sendBtn = phone.locator('button[title^="Send to Claude now"]')
const sb = await sendBtn.boundingBox()
console.log('look', look, 'send button', sb)

// ---- an observer tab: what a websocket peer (a browser-side bridge) would see of a drag ----
const obsCtx = await browser.newContext({ viewport: { width: 800, height: 900 } })
const obs = await obsCtx.newPage()
const heard = []
obs.on('websocket', (ws) => ws.on('framereceived', (f) => {
  const s = String(f.payload)
  if (!s.includes('fad-k2')) return
  try {
    const m = JSON.parse(s)
    const find = (v) => {
      if (!v || typeof v !== 'object') return null
      if (v.id === 'fad-k2' && typeof v.y === 'number') return v
      for (const c of Object.values(v)) { const r = find(c); if (r) return r }
      return null
    }
    const el = find(m)
    heard.push({ at: now(), t: m.t, y: el ? el.y : null, bytes: s.length })
  } catch { heard.push({ at: now(), raw: s.slice(0, 80) }) }
}))
await obs.goto(url)
await obs.waitForTimeout(5000)

// ---- taps ----
const targets = [{ id: 'ctl-k1-50', x: 260, y: 535, v: 0.5 }, { id: 'ctl-k1-10', x: 260, y: 655, v: 0.1 }]
for (let i = 0; i < TAPS; i++) {
  const c = targets[i % 2]
  const p = toScreen(c.x, c.y)
  const sel = now()
  await phone.touchscreen.tap(p.x, p.y)
  await sleep(120)
  const send = now()
  await phone.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2)
  const tapDone = now()
  const deadline = now() + 6000
  let hit = null
  while (now() < deadline && !hit) {
    hit = seen.find((s) => s.at > send && s.key === 'knob_1' && Math.abs((s.value ?? -1) - c.v) < 1e-6)
    if (!hit) await sleep(5)
  }
  const pr = out.probe.find((r) => r.at > send && r.selected?.includes(c.id))
  out.taps.push({ i, id: c.id, sel, send, tapDone, probe: pr ? pr.at - send : null, wall: hit ? hit.at - send : null, gesture: hit ? hit.at - sel : null })
  console.log(i, c.id, 'probe', pr ? Math.round(pr.at - send) : '-', 'wall', hit ? Math.round(hit.at - send) : 'MISS')
  await sleep(900)
}

// ---- drag the k2 fader from 480 up to 260 over ~1 s with real touch events ----
if (DO_DRAG) {
  const cdp = await phoneCtx.newCDPSession(phone)
  const from = toScreen(70, 480), to = toScreen(70, 260)
  const steps = 60, moves = []
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] })
  const probeBefore = out.probe.length
  const heardBefore = heard.length
  const start = now()
  await touch('touchStart', from.x, from.y)
  for (let k = 1; k <= steps; k++) {
    const y = from.y + ((to.y - from.y) * k) / steps
    await touch('touchMove', from.x, y)
    moves.push({ at: now(), sceneY: 480 + ((260 - 480) * k) / steps })
    await sleep(16)
  }
  await touch('touchEnd')
  const end = now()
  await sleep(3000)
  const h = heard.slice(heardBefore)
  out.drag = {
    start, end, moves: moves.length,
    pushes: pushes.filter((p) => p.at >= start).map((p) => Math.round(p.at - start)),
    heard: h.map((x) => ({ ms: Math.round(x.at - start), y: x.y, t: x.t })),
    probeSends: out.probe.slice(probeBefore).length,
    // latency of each heard position: heard time minus the time the finger first reached that position
    lags: h.filter((x) => x.y != null).map((x) => {
      const m = moves.find((mv) => mv.sceneY - 20 <= x.y + 0.5)
      return m ? Math.round(x.at - m.at) : null
    }).filter((v) => v != null),
  }
  console.log('drag', JSON.stringify(out.drag).slice(0, 1500))
}

probing = false
bridge.kill('SIGTERM')
await browser.close()
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]) : null }
const stats = (xs) => ({ n: xs.length, median: q(xs, 0.5), p95: q(xs, 0.95), min: q(xs, 0), max: q(xs, 1) })
out.summary = {
  sendToProbe: stats(out.taps.map((t) => t.probe).filter((v) => v != null)),
  sendToWall: stats(out.taps.map((t) => t.wall).filter((v) => v != null)),
  gestureToWall: stats(out.taps.map((t) => t.gesture).filter((v) => v != null)),
  misses: out.taps.filter((t) => t.wall == null).length,
  dragLag: out.drag ? stats(out.drag.lags) : null,
}
writeFileSync(OUT, JSON.stringify(out, null, 1))
console.log(JSON.stringify(out.summary, null, 1))
process.exit(0)
