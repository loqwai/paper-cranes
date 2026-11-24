// The VJ MCP on the relay Worker, end to end: `wrangler dev` running workers/remote-relay (the real
// Worker and Durable Object in workerd), the Vite dev server only to serve the pages, a display page
// and the real vjpad page joined to one ?room= through the relay, and an MCP client calling
// POST /mcp/<room> the way Claude Code would. Access is skipped with VJ_MCP_LOCAL=1, which the
// Worker honours only on a loopback hostname (unit-tested in workers/remote-relay/src/access.test.js).
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises'
import { createServer as netServer } from 'node:net'
import { resolve } from 'node:path'
import { WebSocket, WebSocketServer } from 'ws'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const ROOT = new URL('..', import.meta.url).pathname
const SHADER = 'claude/wip/vj-mcp-relay-e2e/1'
const SHADER_DIR = resolve(ROOT, 'shaders/claude/wip/vj-mcp-relay-e2e')
const ROOM = `e2e-${Math.random().toString(36).slice(2)}`
const KNOB_SHADER = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(knob_1, 0.05, 1.0 - knob_1, 1.0); // K1 RED BLUE
}
`
const GREEN_SHADER = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
`

let vite, vitePort, relay, relayPort, relayLog = '', browser, display, decoder, client

const freePort = () => new Promise((r) => { const s = netServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => r(port)) }) })
const until = async (fn, ms = 15_000) => {
  for (const end = Date.now() + ms; ; await new Promise((r) => setTimeout(r, 200))) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error('timed out')
  }
}
const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args }, undefined, { timeout: 60_000 })
  const textPart = res.content.find((c) => c.type === 'text')?.text
  let json = null
  try { json = JSON.parse(textPart) } catch {}
  return { res, text: textPart, json, image: res.content.find((c) => c.type === 'image') }
}
const meanRgb = (image) =>
  decoder.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    const sum = [0, 0, 0]
    for (let i = 0; i < d.length; i += 4) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2] }
    return sum.map((s) => Math.round(s / (d.length / 4)))
  }, `data:${image.mimeType};base64,${image.data}`)
const peer = async () => {
  const ws = new WebSocket(`ws://127.0.0.1:${relayPort}/ws/${ROOM}`)
  const seen = []
  ws.on('message', (m) => seen.push(m.toString()))
  await new Promise((r) => ws.once('open', r))
  return { ws, seen, types: () => seen.map((t) => JSON.parse(t).type).filter((t) => t !== 'status') }
}
const roomQuery = () => `room=${ROOM}&relay=127.0.0.1:${relayPort}`
const mcpUrl = () => `http://127.0.0.1:${relayPort}/mcp/${ROOM}`

beforeAll(async () => {
  await mkdir(SHADER_DIR, { recursive: true })
  await writeFile(resolve(SHADER_DIR, '1.frag'), KNOB_SHADER)
  vite = await createServer({ configFile: resolve(ROOT, 'vite.config.js'), server: { port: 0, host: '127.0.0.1', strictPort: false }, logLevel: 'silent' })
  await vite.listen()
  vitePort = vite.httpServer.address().port
  relayPort = await freePort()
  relay = spawn('npx', ['wrangler', 'dev', '--config', 'workers/remote-relay/wrangler.jsonc', '--ip', '127.0.0.1', '--port', String(relayPort),
    '--var', 'VJ_MCP_LOCAL:1',
    // wrangler dev otherwise rewrites request.url to the route's host (relay.beadfamous.com), where
    // the Worker would rightly refuse the local bypass.
    '--local-upstream', `127.0.0.1:${relayPort}`, '--show-interactive-dev-session=false', '--persist-to', resolve(ROOT, '.wrangler/e2e-state')],
  { cwd: ROOT, env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' }, detached: true })
  relay.stdout.on('data', (d) => { relayLog += d })
  relay.stderr.on('data', (d) => { relayLog += d })
  await until(async () => fetch(`http://127.0.0.1:${relayPort}/`).then((r) => r.ok, () => false), 60_000).catch((e) => { throw new Error(`wrangler dev never answered:\n${relayLog.slice(-2000)}`) })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  decoder = await browser.newPage()
  client = new Client({ name: 'vj-mcp-relay-e2e', version: '0.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(mcpUrl())))
}, 120_000)

afterAll(async () => {
  await client?.close()
  await browser?.close()
  await vite?.close()
  if (relay?.pid) { try { process.kill(-relay.pid, 'SIGTERM') } catch {} }
  await rm(SHADER_DIR, { recursive: true, force: true })
})

describe('vj mcp on the relay', () => {
  it('serves the same tools over streamable HTTP at /mcp/<room>', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(
      ['answer_proposal', 'display_secret', 'get_state', 'keep', 'list_displays', 'list_shaders', 'panic', 'propose', 'read_shader', 'screenshot', 'set_params', 'set_shader', 'wait_for_event', 'write_shader'],
    )
  })

  it('refuses GET (no SSE), browser origins, and a missing room', async () => {
    expect((await fetch(mcpUrl())).status).toBe(405)
    const post = (url, headers = {}) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers }, body: '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' })
    expect((await post(mcpUrl(), { origin: 'https://evil.example' })).status).toBe(403)
    expect((await post(`http://127.0.0.1:${relayPort}/mcp`)).status).toBe(404)
  })

  it('answers 400, not 500, for a room that is not valid percent-encoding', async () => {
    expect((await fetch(`http://127.0.0.1:${relayPort}/mcp/%E0`, { method: 'POST', body: '{}' })).status).toBe(400)
    expect((await fetch(`http://127.0.0.1:${relayPort}/ws/%E0`)).status).toBe(400)
  })

  it('sees a ?room= display join through the relay', async () => {
    const { json: before } = await call('list_displays')
    expect(before.displays).toEqual([])
    const waiting = call('wait_for_event', { since: before.seq, types: ['display-joined'], timeout_s: 40 })
    display = await browser.newPage({ viewport: { width: 320, height: 240 } })
    await display.goto(`http://127.0.0.1:${vitePort}/?shader=${SHADER}&remote=display&noaudio=true&knob_1=0&hands_ms=300&${roomQuery()}`)
    const { json: evt } = await waiting
    expect(evt.events[0]).toMatchObject({ type: 'display-joined', shader: SHADER })
    const { json } = await call('list_displays')
    expect(json.displays.map((d) => d.id)).toEqual([evt.events[0].display])
  })

  it('still lets vjpad.html?room= drive the display, relayed byte for byte', async () => {
    const watcher = await peer()
    const pad = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await pad.goto(`http://127.0.0.1:${vitePort}/vjpad.html?${roomQuery()}`)
    await until(() => pad.evaluate(() => document.body.innerText.length > 0))
    await pad.click('#reset')
    const sent = await until(() => watcher.seen.find((t) => JSON.parse(t).type === 'update-params'))
    const params = JSON.parse(sent).data
    expect(Object.keys(params).length).toBeGreaterThan(0)
    const applied = await until(async () => {
      const got = await display.evaluate(() => ({ ...window.cranes.messageParams }))
      return Object.entries(params).every(([k, v]) => got[k] === v) ? got : null
    })
    expect(applied).toMatchObject(params)
    // Release what the pad pinned, so the knob test below starts clean.
    const release = Object.fromEntries(Object.keys(params).map((k) => [k, null]))
    watcher.ws.send(JSON.stringify({ type: 'update-params', data: release }))
    await until(() => display.evaluate((keys) => keys.every((k) => !(k in window.cranes.messageParams)), Object.keys(params)))
    // The pad's RESET was his hands on the dials: the HANDS lock (docs/live-show-contract.md) holds
    // agent writes until it ends, 300 ms here (hands_ms), so the agent tests below wait it out.
    await until(() => display.evaluate(() => !window.cranes.live.handsOn))
    await pad.close()
    watcher.ws.close()
  })

  it('turns a knob on the live display and the screen changes', async () => {
    await until(async () => (await call('get_state', { features: 'none' })).json?.frameCount > 5)
    const blue = await meanRgb((await call('screenshot', { width: 64 })).image)
    expect(blue[2]).toBeGreaterThan(200)
    expect(blue[0]).toBeLessThan(40)
    const { json: set } = await call('set_params', { params: { knob_1: 1 } })
    expect(set).toMatchObject({ ok: true, readBack: { knob_1: 1 } })
    expect(await display.evaluate(() => window.cranes.flattenFeatures().knob_1)).toBe(1)
    const red = await until(async () => {
      const rgb = await meanRgb((await call('screenshot', { width: 64 })).image)
      return rgb[0] > 200 ? rgb : null
    })
    expect(red[2]).toBeLessThan(40)
    const { json: state } = await call('get_state', { features: 'none' })
    expect(state.knobs.knob_1).toEqual({ value: 1, name: 'RED BLUE' })
  })

  it('drops an inspect a room peer forges: the peer hears nothing and the display answers nothing', async () => {
    const p = await peer()
    p.ws.send(JSON.stringify({ type: 'inspect', data: { id: 'spoof', cmd: 'shot', args: {} } }))
    p.ws.send(JSON.stringify({ type: 'display-welcome', data: { id: 'x' } }))
    await call('get_state', { features: 'none' })
    await new Promise((r) => setTimeout(r, 500))
    expect(p.types()).toEqual([])
    p.ws.close()
  })

  it('write_shader compiles on the display, applies live, and saves nothing', async () => {
    const bad = await call('write_shader', { shader: SHADER, code: 'void mainImage(out vec4 c, in vec2 f) { c = nope; }' })
    expect(bad.res.isError).toBe(true)
    expect(bad.text).toMatch(/not applied: compile failed/)
    const { json } = await call('write_shader', { shader: SHADER, code: GREEN_SHADER })
    expect(json).toMatchObject({ persisted: false, displays: [expect.objectContaining({ pickedUp: true })] })
    const green = await until(async () => {
      const rgb = await meanRgb((await call('screenshot', { width: 64 })).image)
      return rgb[1] > 200 ? rgb : null
    })
    expect(green[0]).toBeLessThan(40)
    expect(await readFile(resolve(SHADER_DIR, '1.frag'), 'utf-8')).toBe(KNOB_SHADER)
  })

  it('switches shader in place, reading it from the site the display came from', async () => {
    const { json } = await call('set_shader', { shader: 'plasma' })
    expect(json).toMatchObject({ shader: 'plasma', loaded: true, compiles: true })
    const { json: src } = await call('read_shader', { shader: SHADER })
    expect(src.code).toBe(KNOB_SHADER)
  })

  it('a room peer cannot steer the display to another relay (update-params {relay, room} then a reconnect)', async () => {
    // A stand-in hostile relay on loopback: it welcomes whoever says hello and asks for a screenshot.
    const hostile = new WebSocketServer({ host: '127.0.0.1', port: 0 })
    await new Promise((r) => hostile.once('listening', r))
    const hostilePort = hostile.address().port
    const got = { connections: 0, replies: 0 }
    hostile.on('connection', (ws) => {
      got.connections++
      ws.on('message', (m) => {
        const msg = JSON.parse(m.toString())
        if (msg.type === 'display-hello') {
          const id = String(msg.data.key).replace(/-/g, '').slice(0, 6).toLowerCase()
          ws.send(JSON.stringify({ type: 'display-welcome', data: { id } }))
          ws.send(JSON.stringify({ type: 'inspect', data: { id: 'steal', cmd: 'state', args: {} } }))
        }
        if (msg.type === 'inspect-reply') got.replies++
      })
    })
    const p = await peer()
    p.ws.send(JSON.stringify({ type: 'update-params', data: { relay: `127.0.0.1:${hostilePort}`, room: 'elsewhere' } }))
    await new Promise((r) => setTimeout(r, 1200)) // past the 750 ms URL mirror
    // The connection drops (as a network blip would) and the client reconnects on its own. A
    // client-initiated close() would sit in CLOSING against workerd, so fire the drop handler.
    await display.evaluate(() => {
      const s = window.cranes.remoteClient.socket
      const dropped = s.onclose
      s.onclose = null
      s.close()
      dropped({ code: 1006, reason: 'e2e: connection dropped' })
    })
    await until(async () => got.connections > 0 || (await call('list_displays')).json.displays.length === 1, 20_000)
    await new Promise((r) => setTimeout(r, 1500))
    expect(got).toEqual({ connections: 0, replies: 0 })
    expect((await call('list_displays')).json.displays).toHaveLength(1)
    const after = await display.evaluate(() => {
      const q = new URLSearchParams(location.search)
      return { relay: q.get('relay'), room: q.get('room'), params: [window.cranes.messageParams?.relay ?? null, window.cranes.messageParams?.room ?? null] }
    })
    expect(after).toEqual({ relay: `127.0.0.1:${relayPort}`, room: ROOM, params: [null, null] })
    p.ws.close()
    hostile.close()
  })

  it('hears a ?vj=1 page\'s signals through the room, and no peer does', async () => {
    const { json: before } = await call('list_displays')
    const p = await peer()
    const waiting = call('wait_for_event', { since: before.seq, types: ['boot'], timeout_s: 40 })
    const vj = await browser.newPage({ viewport: { width: 320, height: 240 } })
    await vj.goto(`http://127.0.0.1:${vitePort}/?shader=plasma&remote=display&noaudio=true&vj=1&${roomQuery()}`)
    const { json: evt } = await waiting
    expect(evt.events[0]).toMatchObject({ type: 'vj-signal', signal: 'boot', data: { type: 'boot', flags: { vj: '1', room: ROOM } } })
    expect(p.types()).not.toContain('vj-signal')
    await vj.close()
    p.ws.close()
  })

  it('reports the display leaving', async () => {
    const { json: before } = await call('list_displays')
    const waiting = call('wait_for_event', { since: before.seq, types: ['display-left'], timeout_s: 40 })
    await display.close()
    const { json: evt } = await waiting
    expect(evt.events[0].type).toBe('display-left')
    const { res, text } = await call('screenshot')
    expect(res.isError).toBe(true)
    expect(text).toMatch(/no display connected/)
  })
})
