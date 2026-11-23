// VJ MCP end to end: a real dev server, a real display page in headless Chromium, and an MCP
// client over streamable HTTP calling the tools the way Claude Code would. Every assertion is
// on something observable: the page's pixels (decoded from the tool's own screenshot), the
// page's live uniforms, or the file on disk. docs/vj-mcp.md.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { WebSocket } from 'ws'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const ROOT = new URL('..', import.meta.url).pathname
const SHADER = 'claude/wip/vj-mcp-e2e/1'
const SHADER_DIR = resolve(ROOT, 'shaders/claude/wip/vj-mcp-e2e')
// Red when knob_1 = 1, blue when knob_1 = 0: a knob you can see in a screenshot.
const KNOB_SHADER = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(knob_1, 0.05, 1.0 - knob_1, 1.0); // K1 RED BLUE
}
`
const GREEN_SHADER = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
`

let server, port, browser, display, decoder, client

const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args }, undefined, { timeout: 60_000 })
  const textPart = res.content.find((c) => c.type === 'text')?.text
  let json = null
  try { json = JSON.parse(textPart) } catch {}
  return { res, text: textPart, json, image: res.content.find((c) => c.type === 'image') }
}

// Average colour of a tool-returned JPEG, decoded in a blank browser page (no image deps).
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
    const n = d.length / 4
    return sum.map((s) => Math.round(s / n))
  }, `data:${image.mimeType};base64,${image.data}`)

const until = async (fn, ms = 10_000) => {
  for (const end = Date.now() + ms; ; await new Promise((r) => setTimeout(r, 200))) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error('timed out')
  }
}

beforeAll(async () => {
  await mkdir(SHADER_DIR, { recursive: true })
  await writeFile(resolve(SHADER_DIR, '1.frag'), KNOB_SHADER)
  server = await createServer({
    configFile: resolve(ROOT, 'vite.config.js'),
    server: { port: 0, host: '127.0.0.1', strictPort: false },
    logLevel: 'silent',
  })
  await server.listen()
  port = server.httpServer.address().port
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  decoder = await browser.newPage()
  client = new Client({ name: 'vj-mcp-e2e', version: '0.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)))
})

afterAll(async () => {
  await client?.close()
  await browser?.close()
  await server?.close()
  await rm(SHADER_DIR, { recursive: true, force: true })
})

describe('vj mcp', () => {
  it('lists the tools over streamable HTTP', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(
      ['get_state', 'list_displays', 'list_shaders', 'read_shader', 'screenshot', 'set_params', 'set_shader', 'wait_for_event', 'write_shader'],
    )
  })

  it('answers a clear error when no display is connected', async () => {
    const { res, text } = await call('get_state')
    expect(res.isError).toBe(true)
    expect(text).toMatch(/no display connected/)
  })

  it('sees a display join, with a stable id', async () => {
    const { json: before } = await call('list_displays')
    const waiting = call('wait_for_event', { since: before.seq, types: ['display-joined'], timeout_s: 30 })
    display = await browser.newPage({ viewport: { width: 320, height: 240 } })
    await display.goto(`http://127.0.0.1:${port}/?shader=${SHADER}&remote=display&noaudio=true&knob_1=0`)
    const { json: evt } = await waiting
    expect(evt.events[0]).toMatchObject({ type: 'display-joined', shader: SHADER })
    const { json } = await call('list_displays')
    expect(json.displays).toHaveLength(1)
    expect(json.displays[0].id).toBe(evt.events[0].display)
  })

  it('turns a knob and the screen changes', async () => {
    await until(async () => (await call('get_state', { features: 'none' })).json?.frameCount > 5)
    const blue = await meanRgb((await call('screenshot', { width: 64 })).image)
    expect(blue[2]).toBeGreaterThan(200)
    expect(blue[0]).toBeLessThan(40)

    const { json: set } = await call('set_params', { params: { knob_1: 1 } })
    expect(set).toMatchObject({ ok: true, readBack: { knob_1: 1 } })
    // The page's own uniforms, read in the page, not through the MCP:
    expect(await display.evaluate(() => window.cranes.flattenFeatures().knob_1)).toBe(1)

    const red = await until(async () => {
      const rgb = await meanRgb((await call('screenshot', { width: 64 })).image)
      return rgb[0] > 200 ? rgb : null
    })
    expect(red[2]).toBeLessThan(40)

    const { json: state } = await call('get_state', { features: 'none' })
    expect(state.knobs.knob_1).toEqual({ value: 1, name: 'RED BLUE' })

    const { json: released } = await call('set_params', { params: { knob_1: null } })
    expect(released).toMatchObject({ ok: true, readBack: { knob_1: null } })
  })

  it('refuses to write a shader that does not compile, and leaves the file alone', async () => {
    const { res, text } = await call('write_shader', { shader: SHADER, code: 'void mainImage(out vec4 c, in vec2 f) { c = nope; }' })
    expect(res.isError).toBe(true)
    expect(text).toMatch(/not written: compile failed/)
    expect(await readFile(resolve(SHADER_DIR, '1.frag'), 'utf-8')).toBe(KNOB_SHADER)
  })

  it('writes a shader to disk and the display hot-swaps to it', async () => {
    const { json } = await call('write_shader', { shader: SHADER, code: GREEN_SHADER })
    expect(json.validatedOn).toMatch(/^[0-9a-f]{6}$/)
    expect(await readFile(resolve(SHADER_DIR, '1.frag'), 'utf-8')).toBe(GREEN_SHADER)
    expect(json.displays).toEqual([expect.objectContaining({ pickedUp: true })])
    const green = await until(async () => {
      const rgb = await meanRgb((await call('screenshot', { width: 64 })).image)
      return rgb[1] > 200 ? rgb : null
    })
    expect(green[0]).toBeLessThan(40)
  })

  it('switches shader in place and reports the compile verdict', async () => {
    const { json } = await call('set_shader', { shader: 'plasma' })
    expect(json).toMatchObject({ shader: 'plasma', loaded: true, compiles: true })
    expect(await display.evaluate(() => new URLSearchParams(location.search).get('shader'))).toBe('plasma')
  })

  it('keeps inspect traffic point-to-point: another /ws client can neither ask nor overhear', async () => {
    const peer = new WebSocket(`ws://127.0.0.1:${port}/ws`)
    const seen = []
    peer.on('message', (m) => seen.push(JSON.parse(m.toString()).type))
    await new Promise((r) => peer.once('open', r))
    peer.send(JSON.stringify({ type: 'inspect', data: { id: 'spoof', cmd: 'shot', args: {} } }))
    await call('get_state', { features: 'none' })
    await new Promise((r) => setTimeout(r, 500))
    peer.close()
    expect(seen.filter((t) => t !== 'status')).toEqual([])
  })

  it('reports a display leaving, and a clear error after', async () => {
    const { json: before } = await call('list_displays')
    const waiting = call('wait_for_event', { since: before.seq, types: ['display-left'], timeout_s: 30 })
    await display.close()
    const { json: evt } = await waiting
    expect(evt.events[0].type).toBe('display-left')
    const { res, text } = await call('screenshot')
    expect(res.isError).toBe(true)
    expect(text).toMatch(/no display connected/)
  })
})
