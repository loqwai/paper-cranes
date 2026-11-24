// A board mirror, end to end (docs/board-mirror.md): `wrangler dev` running the relay Worker and its
// Durable Object on :7171, the Vite dev server on :7172 serving a real display page and a real
// mirror.html, a phone-style controller as a plain socket in the room, and an MCP client. A knob
// change reaches the wall and the mirror; the mirror cannot steer; list_displays never shows it.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { WebSocket } from 'ws'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const ROOT = new URL('..', import.meta.url).pathname
// Fixed ports, never one the live show uses (6969, 6977, 6978, 6991).
const RELAY_PORT = Number(process.env.E2E_RELAY_PORT ?? 7171)
const VITE_PORT = Number(process.env.E2E_VITE_PORT ?? 7172)
const RELAY = `127.0.0.1:${RELAY_PORT}`
const ROOM = `mirror-e2e-${Math.random().toString(36).slice(2)}`
// Red is the knob, so one pixel says which knob value a page drew with.
const SHADER = '#version 300 es\nprecision highp float;\nuniform float knob_1;\nout vec4 fragColor;\nvoid main(){ fragColor = vec4(knob_1, 0.2, 0.5, 1.0); }'

let vite, relay, relayLog = '', browser, client, display, mirror, pad, view

const until = async (fn, ms = 15_000) => {
  for (const end = Date.now() + ms; ; await new Promise((r) => setTimeout(r, 100))) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error('timed out')
  }
}
// The red channel at the middle of a page's canvas, 0-255.
const red = (page) => page.evaluate(() => {
  const c = document.getElementById('visualizer')
  const probe = document.createElement('canvas')
  probe.width = probe.height = 1
  const g = probe.getContext('2d')
  g.drawImage(c, c.width / 2, c.height / 2, 1, 1, 0, 0, 1, 1)
  return g.getImageData(0, 0, 1, 1).data[0]
})

beforeAll(async () => {
  vite = await createServer({ configFile: resolve(ROOT, 'vite.config.js'), server: { port: VITE_PORT, host: '127.0.0.1', strictPort: true }, logLevel: 'silent' })
  await vite.listen()
  relay = spawn('npx', ['wrangler', 'dev', '--config', 'workers/remote-relay/wrangler.jsonc', '--ip', '127.0.0.1', '--port', String(RELAY_PORT),
    '--var', 'VJ_MCP_LOCAL:1', '--var', `SITE_ORIGIN:http://localhost:${VITE_PORT}`,
    '--local-upstream', RELAY, '--show-interactive-dev-session=false', '--persist-to', resolve(ROOT, '.wrangler/e2e-mirror-state')],
  { cwd: ROOT, env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' }, detached: true })
  relay.stdout.on('data', (d) => { relayLog += d })
  relay.stderr.on('data', (d) => { relayLog += d })
  await until(async () => fetch(`http://${RELAY}/`).then((r) => r.ok, () => false), 60_000).catch(() => { throw new Error(`wrangler dev never answered:\n${relayLog.slice(-2000)}`) })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  client = new Client({ name: 'board-mirror-e2e', version: '0.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://${RELAY}/mcp/${ROOM}`)))
}, 120_000)

afterAll(async () => {
  pad?.close()
  await client?.close()
  await browser?.close()
  await vite?.close()
  if (relay?.pid) { try { process.kill(-relay.pid, 'SIGTERM') } catch {} }
})

describe('board mirror on the relay', () => {
  it('turns the room into a view id that does not contain it', async () => {
    const res = await fetch(`http://${RELAY}/view-key/${encodeURIComponent(ROOM)}`)
    view = (await res.json()).view
    expect(view).toMatch(/^[0-9a-f]{64}$/)
    expect(view).not.toContain(ROOM)
    expect((await fetch(`http://${RELAY}/view/not-an-id`)).status).toBe(400)
  })

  it('a mirror draws what the wall draws, from the wall\'s knob', async () => {
    display = await browser.newPage({ viewport: { width: 640, height: 360 } })
    await display.goto(`http://127.0.0.1:${VITE_PORT}/?shaderCode=${encodeURIComponent(SHADER)}&remote=display&room=${ROOM}&relay=${RELAY}&noaudio=true&knob_1=0.1`)
    await until(() => display.evaluate(() => window.cranes?.frameCount > 5))
    mirror = await browser.newPage({ viewport: { width: 320, height: 180 } })
    await mirror.goto(`http://127.0.0.1:${VITE_PORT}/mirror.html?view=${view}&relay=${RELAY}`)
    await until(() => mirror.evaluate(() => window.mirror?.drawn > 5))

    pad = new WebSocket(`ws://${RELAY}/ws/${ROOM}`)
    await new Promise((r) => pad.once('open', r))
    pad.send(JSON.stringify({ type: 'update-params', data: { knob_1: 0.73 } }))

    await until(() => display.evaluate(() => window.cranes.messageParams.knob_1 === 0.73))
    await until(() => mirror.evaluate(() => window.mirror.uniforms?.knob_1 === 0.73))
    await until(async () => Math.abs((await red(mirror)) - 186) <= 3)
    expect(Math.abs((await red(display)) - 186)).toBeLessThanOrEqual(3)
  })

  it('a mirror cannot steer the wall', async () => {
    const heard = []
    pad.on('message', (m) => heard.push(JSON.parse(m.toString()).type))
    await mirror.evaluate(() => {
      window.mirror.socket.send(JSON.stringify({ type: 'update-params', data: { knob_1: 0.01 } }))
      window.mirror.socket.send(JSON.stringify({ type: 'display-hello', data: { key: 'f00dfeed-0000-4000-8000-000000000000', shader: 'x' } }))
    })
    await new Promise((r) => setTimeout(r, 1000))
    expect(await display.evaluate(() => window.cranes.messageParams.knob_1)).toBe(0.73)
    expect(heard.filter((t) => t !== 'status')).toEqual([])
  })

  it('list_displays shows the wall and never the mirror', async () => {
    const res = await client.callTool({ name: 'list_displays', arguments: {} })
    const text = res.content.find((c) => c.type === 'text')?.text ?? ''
    const displays = JSON.parse(text).displays
    expect(displays).toHaveLength(1)
    expect(displays[0].href).toContain('remote=display')
  })

  it('the room counts the mirror as a viewer, not a client', async () => {
    const status = await new Promise((r) => {
      const ws = new WebSocket(`ws://${RELAY}/ws/${ROOM}`)
      ws.on('message', (m) => { const msg = JSON.parse(m.toString()); if (msg.type === 'status') { ws.close(); r(msg.data) } })
    })
    expect(status.viewers).toBe(1)
    // the wall, the pad, and the socket asking
    expect(status.connectedClients).toBe(3)
  })

  it('the wall runs its feed only while a mirror watches', async () => {
    expect(await display.evaluate(() => window.cranes.mirrorFeed.running())).toBe(true)
    await mirror.close()
    await until(() => display.evaluate(() => window.cranes.mirrorFeed.running() === false))
    // A new mirror starts it again, and hears the shader before any frame.
    const ws = new WebSocket(`ws://${RELAY}/view/${view}`)
    const first = await new Promise((r) => ws.on('message', (m) => { const t = JSON.parse(m.toString()).type; if (t !== 'status') r(t) }))
    ws.close()
    expect(first).toBe('mirror-state')
  })
})
