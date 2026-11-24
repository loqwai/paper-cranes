// Measure a fader drag, finger to wall, on one clock. Not a test: a rerunnable measurement against real
// draw and a dev server (docs/draw-control-surface.md has the numbers it gave).
// The phone (headless Chromium as an iPhone 13) drags a vj-fader knob with real touch events; draw's
// read-only portal socket hears each commit; the knob value goes to the display as board-bridge.js sends
// it (the display's socket, `hub`) or as a set_params (`mcp`); the display applies it.
// The portal socket opens with the phone's own sign-in here, so it runs on a draw without the ticket route.
//   LAB_URL (the `open` link of a scratch board, never a show board), KNOB (part id, e.g. fad-k7-knob),
//   FRAME (its frame), KH (knob height), KX (knob centre x), UP / DOWN (target centre y), EX / EY (an empty
//   spot in the frame, tapped to deselect), BOARD, PORT
// Usage: node scripts/vj/board-fader.measure.js [drags=8] [hub|mcp]
import { writeFileSync } from 'node:fs'
import WebSocket from 'ws'
import { chromium, devices } from 'playwright'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const BOARD = process.env.BOARD || 'fader-lab'
const PORT = process.env.PORT || '7157'
const DRAGS = Number(process.argv[2] ?? 3)
const url = process.env.LAB_URL
if (!url) throw new Error('set LAB_URL')
const now = () => performance.now()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const KID = process.env.KID || 'fad-k2', KNOB = process.env.KNOB || KID, FRAME = process.env.FRAME || 'lab'
const TRACK = { top: 240, height: 480 }, KNOB_H = Number(process.env.KH || 60)
const movedIds = new Set()

const mcp = new Client({ name: 'fader-measure', version: '0.1.0' })
await mcp.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${PORT}/mcp`)))

const browser = await chromium.launch()
const wallCtx = await browser.newContext({ viewport: { width: 640, height: 360 } })
const wall = await wallCtx.newPage()
const seen = []
await wall.exposeBinding('__seen', (_, key, value) => seen.push({ at: now(), key, value }))
await wall.goto(`http://127.0.0.1:${PORT}/?remote=display&shader=plasma&noaudio=true`)
await wall.waitForTimeout(4000)
await wall.evaluate(() => {
  let last
  const tick = () => {
    const v = window.cranes?.messageParams?.knob_2
    if (v !== last) { window.__seen('knob_2', v ?? null); last = v }
    requestAnimationFrame(tick)
  }
  tick()
})

const phoneCtx = await browser.newContext({ ...devices['iPhone 13'] })
const phone = await phoneCtx.newPage()
let look = null
phone.on('websocket', (ws) => ws.on('framesent', (f) => { const s = String(f.payload); if (s.startsWith('{"t":"look"')) look = JSON.parse(s).bounds }))
await phone.goto(url)
await phone.waitForTimeout(7000)
await phone.evaluate(() => {
  const root = document.querySelector('.excalidraw')
  const key = Object.keys(root).find((k) => k.startsWith('__reactFiber'))
  for (let f = root[key]; f; f = f.return) if (f.stateNode?.setActiveTool && f.stateNode.state?.activeTool) return f.stateNode.setActiveTool({ type: 'selection' })
})
await phone.waitForTimeout(500)
const VW = devices['iPhone 13'].viewport.width
const toScreen = (x, y) => ({ x: (x - look.x) * (VW / look.width), y: (y - look.y) * (VW / look.width) })

// ---- the portal socket, as the bridge would hold it ----
const cookie = (await phoneCtx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ')
const portal = new WebSocket(`wss://draw.hypnodroid.com/api/boards/${BOARD}/portal`, { headers: { Origin: 'https://draw.hypnodroid.com', Cookie: cookie } })
const deltas = []
const errors = []
let knobTop = null
let inflight = false, pending = null
const HUB = process.argv[3] === 'hub' ? new WebSocket(`ws://127.0.0.1:${PORT}/ws`) : null
if (HUB) await new Promise((r) => HUB.once('open', r))
const push = async (value, at) => {
  if (HUB) return HUB.send(JSON.stringify({ type: 'update-params', data: { knob_2: value }, source: 'board' }))
  if (inflight) { pending = { value, at }; return } // newest wins while a call is out
  inflight = true
  try { await mcp.callTool({ name: 'set_params', arguments: { params: { knob_2: value }, source: 'board' } }) } catch (e) { errors.push(e.message) } finally { inflight = false }
  if (pending) { const p = pending; pending = null; push(p.value, p.at) }
}
portal.on('message', (raw) => {
  const at = now()
  const m = JSON.parse(String(raw))
  for (const e of m.elements ?? []) if (m.t === 'delta') movedIds.add(e.id)
  const el = (m.elements ?? []).find((e) => e.id === KNOB && !e.isDeleted)
  if (!el) return
  knobTop = el.y
  if (m.t !== 'delta') return
  const value = Math.round(1000 * Math.min(1, Math.max(0, 1 - (el.y - TRACK.top) / (TRACK.height - KNOB_H)))) / 1000
  deltas.push({ at, y: el.y, value })
  push(value, at)
})
await new Promise((r, j) => { portal.once('open', r); portal.once('error', j) })
portal.send(JSON.stringify({ t: 'watch', frame: FRAME, since: null }))
await sleep(1500)

const cdp = await phoneCtx.newCDPSession(phone)
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] })
const runs = []
for (let d = 0; d < DRAGS; d++) {
  const up = d % 2 === 0
  const a = knobTop + KNOB_H / 2, b = up ? Number(process.env.UP || 280) : Number(process.env.DOWN || 680) // knob centre now → target centre, scene y
  const from = toScreen(Number(process.env.KX || 70), a), to = toScreen(Number(process.env.KX || 70), b)
  const moves = []
  { const e = toScreen(Number(process.env.EX || 260), Number(process.env.EY || 735)); await phone.touchscreen.tap(e.x, e.y); await sleep(300) } // deselect: no resize handles under the thumb
  const d0 = deltas.length, s0 = seen.length
  const start = now()
  await touch('touchStart', from.x, from.y)
  for (let k = 1; k <= 40; k++) {
    const y = from.y + ((to.y - from.y) * k) / 40
    await touch('touchMove', from.x, y)
    moves.push({ at: now(), knobTop: a + ((b - a) * k) / 40 - KNOB_H / 2 })
  }
  await touch('touchEnd')
  const end = now()
  await sleep(2500)
  const ds = deltas.slice(d0), ws = seen.slice(s0).filter((s) => s.value != null)
  // finger→portal: when did the finger first reach the position the delta reports
  const fingerAt = (y) => (up ? moves.find((m) => m.knobTop <= y + 0.5) : moves.find((m) => m.knobTop >= y - 0.5))?.at
  const portalLag = ds.map((x) => fingerAt(x.y) && x.at - fingerAt(x.y)).filter((v) => v > 0)
  const wallLag = ws.map((w) => {
    const dl = ds.find((x) => Math.abs(x.value - w.value) < 1e-9)
    const f = dl && fingerAt(dl.y)
    return f ? w.at - f : null
  }).filter((v) => v > 0)
  runs.push({ up, ms: Math.round(end - start), deltas: ds.length, wallUpdates: ws.length, portalLag, wallLag,
    gaps: ds.slice(1).map((x, i) => x.at - ds[i].at), firstDelta: ds[0] && ds[0].at - start, settle: ws.at(-1) && ws.at(-1).at - end })
  console.log(`drag ${d} ${up ? 'up' : 'down'}: ${ds.length} deltas, ${ws.length} wall updates, first delta ${Math.round(ds[0]?.at - start)} ms after touch, settle ${Math.round(ws.at(-1)?.at - end)} ms after lift`)
}
portal.close()
await mcp.close()
await browser.close()
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]) : null }
const stats = (xs) => ({ n: xs.length, median: q(xs, 0.5), p95: q(xs, 0.95), min: q(xs, 0), max: q(xs, 1) })
const summary = {
  fingerToPortal: stats(runs.flatMap((r) => r.portalLag)),
  fingerToWall: stats(runs.flatMap((r) => r.wallLag)),
  updateGap: stats(runs.flatMap((r) => r.gaps)),
  firstDelta: stats(runs.map((r) => r.firstDelta).filter(Boolean)),
  settleAfterLift: stats(runs.map((r) => r.settle).filter(Boolean)),
}
writeFileSync(`board-fader-measure-${process.argv[3] ?? 'mcp'}.json`, JSON.stringify({ runs, summary }, null, 1))
console.log(JSON.stringify(summary)); console.log('errors', errors.length, errors[0] ?? ''); console.log('moved ids', [...movedIds].join(','))
process.exit(0)
