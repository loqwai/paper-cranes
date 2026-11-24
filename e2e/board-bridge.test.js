// The draw control surface end to end (docs/draw-control-surface.md), with no model and no network:
// a real dev server and display in headless Chromium, the real board-bridge.js process, and a stand-in
// for draw that speaks the two routes the bridge uses (the /api/listen long poll and the read-only
// /api/listen/<board>/portal socket), so the test drives a press and a drag exactly as a phone's
// commits reach the bridge. Measured against real draw: scripts/vj/board-bridge.measure.js.
//   - a Send selecting a widget button's face presses it: knob button → knob value on the wall
//   - a portal delta moving a fader knob → knob value on the wall, through the display's socket
//   - the whole frame sent on connect writes nothing; SIGTERM stops the bridge with exit 0
// Port E2E_PORT, else 7143 (6969/6977/6978/6991 belong to live sessions on this machine).
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { createServer as httpServer } from 'node:http'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { WebSocketServer } from 'ws'
import { FADER } from '../scripts/vj/board-controls.js'

const ROOT = new URL('..', import.meta.url).pathname
const PORT = Number(process.env.E2E_PORT || 7143)
const TICKET = 'ticket-e2e'
const BOARD = 'show-e2e'

let server, browser, display, bridge, draw, portalSockets = [], lines = []
const sends = []
let waiters = []

const until = async (fn, ms = 10_000) => {
  for (const end = Date.now() + ms; ; await new Promise((r) => setTimeout(r, 50))) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error('timed out')
  }
}
const pinned = (key) => display.evaluate((k) => window.cranes.messageParams?.[k], key)

// A fader widget's parts as draw lays them out (vj-fader at width 140, value 0.5).
const part = (name) => {
  const { draw: d } = FADER.parts.find((p) => p.part === name)
  return { id: `fad-k7-${name}`, type: d.type, x: 20 + d.x, y: 40 + (name === 'knob' ? 0.5 * d.y : d.y), width: d.width, height: d.height, version: 1 }
}
const frameElements = () => [{ id: 'controls', type: 'frame', x: 0, y: 0, width: 390, height: 900 }, part('well'), part('track'), part('knob'), part('label')]

// The stand-in for draw: the listen long poll hands out queued Sends; the portal socket answers a watch with the frame.
const startDraw = () => new Promise((ready) => {
  const http = httpServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (req.headers['draw-listen-ticket'] !== TICKET) return res.writeHead(403).end('{"error":"listen ticket refused"}')
    if (url.pathname !== `/api/listen/${BOARD}`) return res.writeHead(404).end('{}')
    const answer = () => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ send: sends.shift() ?? null }))
    if (sends.length) return answer()
    const timer = setTimeout(answer, 2000)
    waiters.push(() => { clearTimeout(timer); answer() })
  })
  const wss = new WebSocketServer({ noServer: true })
  http.on('upgrade', (req, socket, head) => {
    if (req.url !== `/api/listen/${BOARD}/portal` || req.headers['draw-listen-ticket'] !== TICKET) return socket.destroy()
    wss.handleUpgrade(req, socket, head, (ws) => {
      portalSockets.push(ws)
      ws.on('message', (raw) => {
        const m = JSON.parse(String(raw))
        if (m.t === 'watch' && m.frame === 'controls') ws.send(JSON.stringify({ t: 'frame', frame: 'controls', seq: 1, elements: frameElements(), theme: null }))
      })
    })
  })
  http.listen(0, '127.0.0.1', () => ready(http))
})
const queueSend = (send) => { sends.push(send); waiters.splice(0).forEach((w) => w()) }

beforeAll(async () => {
  server = await createServer({ configFile: resolve(ROOT, 'vite.config.js'), server: { port: PORT, host: '127.0.0.1', strictPort: true }, logLevel: 'silent' })
  await server.listen()
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  display = await browser.newPage({ viewport: { width: 320, height: 240 } })
  await display.goto(`http://127.0.0.1:${PORT}/?shader=plasma&remote=display&noaudio=true`)
  await until(() => display.evaluate(() => !!window.cranes?.messageParams))
  draw = await startDraw()
  bridge = spawn('node', ['scripts/vj/board-bridge.js', '--board', BOARD, '--ticket', TICKET], {
    cwd: ROOT,
    env: { ...process.env, MCP_URL: `http://127.0.0.1:${PORT}/mcp`, DRAW_URL: `http://127.0.0.1:${draw.address().port}` },
  })
  bridge.stdout.on('data', (b) => lines.push(...String(b).split('\n').filter(Boolean)))
  await until(() => lines.some((l) => l.includes('"faders":"watching"')), 20_000)
})

afterAll(async () => {
  bridge?.kill('SIGKILL')
  await browser?.close()
  await server?.close()
  draw?.close()
})

describe('the board bridge', () => {
  it('writes nothing for the frame it is sent on connect', async () => {
    await new Promise((r) => setTimeout(r, 500))
    expect(await pinned('knob_7')).toBeUndefined()
  })

  it('presses a widget button when a Send selects its face', async () => {
    queueSend({ sent: 'send-1', scope: 'selection', selected: ['ctl-k3-80-face', 'ctl-k3-80-label'] })
    await until(async () => (await pinned('knob_3')) === 0.8)
    expect(await pinned('knob_3')).toBe(0.8)
  })

  it('ignores a Send of the whole view', async () => {
    queueSend({ sent: 'send-2', scope: 'viewport', selected: ['ctl-k3-20-face', 'ctl-panic-face'] })
    await until(() => lines.some((l) => l.includes('"sent":"send-2"')))
    expect(await pinned('knob_3')).toBe(0.8)
  })

  it('turns a fader drag on the portal socket into the knob on the wall', async () => {
    const track = part('track')
    const knob = { ...part('knob'), y: track.y, version: 2 } // dragged to the top
    portalSockets.at(-1).send(JSON.stringify({ t: 'delta', frame: 'controls', seq: 2, elements: [knob] }))
    await until(async () => (await pinned('knob_7')) === 1)
    const bottom = { ...knob, y: track.y + track.height - knob.height, version: 3 }
    portalSockets.at(-1).send(JSON.stringify({ t: 'delta', frame: 'controls', seq: 3, elements: [bottom] }))
    await until(async () => (await pinned('knob_7')) === 0)
    expect(await pinned('knob_7')).toBe(0)
  })

  it('stops cleanly on SIGTERM', async () => {
    const exit = new Promise((r) => bridge.once('exit', (code) => r(code)))
    bridge.kill('SIGTERM')
    expect(await exit).toBe(0)
    expect(lines.some((l) => l.includes('"bridge":"stopped"'))).toBe(true)
  })
})
