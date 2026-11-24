// The live show's in-page half end to end (docs/live-show-contract.md): a real dev server, a real
// display and a real vjpad in headless Chromium, and an MCP client calling tools as an agent would.
//   - his pad turns HANDS on; an agent's set_params is held, then lands once the lock ends
//   - propose -> KEEP on the pad's card -> the param is applied and proposal-taken is signalled
//   - PANIC on the pad swaps the display to its boot fork with no reload
// Port 7142 (6969/6977/6978/6991 belong to live sessions on this machine).
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const ROOT = new URL('..', import.meta.url).pathname
const PORT = 7142
const DIR = 'claude/wip/live-show-e2e'
const BOOT = `${DIR}/boot`
const OTHER = `${DIR}/other`
const SHADER_DIR = resolve(ROOT, 'shaders', DIR)
const solid = (r, g, b) => `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(${r}.0, ${g}.0, ${b}.0, knob_1 * 0.0 + 1.0); // K1 PAD
}
`

let server, browser, display, pad, client, loads = 0

const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args }, undefined, { timeout: 60_000 })
  const text = res.content.find((c) => c.type === 'text')?.text
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { res, text, json }
}

const until = async (fn, ms = 10_000) => {
  for (const end = Date.now() + ms; ; await new Promise((r) => setTimeout(r, 50))) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error('timed out')
  }
}

// The next live-show signal of this type after seq, via the MCP (the way an agent hears it).
const nextSignal = async (since, type, timeout_s = 15) => {
  const { json } = await call('wait_for_event', { since, types: [type], timeout_s })
  const evt = json.events.find((e) => e.signal === type)
  if (!evt) throw new Error(`no ${type} signal within ${timeout_s} s`)
  return evt.data
}
const seqNow = async () => (await call('list_displays')).json.seq
const pinned = (key) => display.evaluate((k) => window.cranes.messageParams?.[k], key)

beforeAll(async () => {
  await mkdir(SHADER_DIR, { recursive: true })
  await writeFile(resolve(SHADER_DIR, 'boot.frag'), solid(0, 1, 0))
  await writeFile(resolve(SHADER_DIR, 'other.frag'), solid(1, 0, 0))
  server = await createServer({
    configFile: resolve(ROOT, 'vite.config.js'),
    server: { port: PORT, host: '127.0.0.1', strictPort: true },
    logLevel: 'silent',
  })
  await server.listen()
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  client = new Client({ name: 'live-show-e2e', version: '0.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${PORT}/mcp`)))

  const since = await seqNow()
  display = await browser.newPage({ viewport: { width: 320, height: 240 } })
  // A reload fires load; replaceState (the URL mirror, PANIC's own ?shader=) is a same-document
  // navigation that Playwright also reports as framenavigated, so count loads, not loads.
  display.on('load', () => { loads++ })
  await display.goto(`http://127.0.0.1:${PORT}/?shader=${BOOT}&remote=display&noaudio=true&vj=1&hands_ms=300`)
  await call('wait_for_event', { since, types: ['display-joined'], timeout_s: 30 })
  await until(() => display.evaluate(() => (window.cranes?.shader ?? '').includes('vec4(0.0, 1.0, 0.0')))

  pad = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
  await pad.goto(`http://127.0.0.1:${PORT}/vjpad.html`)
  await until(() => pad.evaluate(() => window.vjpad?.client?.isConnected))
})

afterAll(async () => {
  await client?.close()
  await browser?.close()
  await server?.close()
  await rm(SHADER_DIR, { recursive: true, force: true })
})

describe('live show: the page half', () => {
  it('a connected vjpad makes the display signal pad-alive', async () => {
    await until(() => display.evaluate(() => window.cranes.live.status().pads > 0))
    const { json } = await call('get_state', { features: 'none' })
    expect(json.live).toMatchObject({ pads: 1, hands: false, bootFork: BOOT })
  })

  it('holds an agent set_params while his pad moves, and applies it once the lock ends', async () => {
    const since = await seqNow()
    // His finger on a pad: the real pad send path (coalesced per frame), every 50 ms.
    await pad.evaluate(() => { window.__finger = setInterval(() => window.vjpad.send({ knob_1: Math.random() }), 50) })
    expect(await nextSignal(since, 'hands')).toMatchObject({ on: true, knob: 'knob_1' })

    const { json } = await call('set_params', { params: { knob_2: 0.7 } })
    expect(json).toMatchObject({ held: true })
    expect(await pinned('knob_2')).toBeUndefined()
    expect(await display.evaluate(() => window.cranes.live.status().held)).toEqual(['knob_2'])

    const lifted = Date.now()
    await pad.evaluate(() => clearInterval(window.__finger))
    await until(async () => (await pinned('knob_2')) === 0.7, 5000)
    expect(Date.now() - lifted).toBeGreaterThanOrEqual(250) // not before the 300 ms lock ran out
    expect(await nextSignal(since, 'release')).toMatchObject({ knob: 'knob_1' })
  })

  it('an agent write with his hands off lands at once', async () => {
    await until(() => display.evaluate(() => !window.cranes.live.handsOn))
    const { json } = await call('set_params', { params: { knob_4: 0.25 } })
    expect(json).toMatchObject({ ok: true, readBack: { knob_4: 0.25 } })
  })

  it('propose -> KEEP on the pad card applies the param and signals proposal-taken', async () => {
    const since = await seqNow()
    await call('propose', { id: 'warm', label: 'k3 to 0.9?', params: { knob_3: 0.9 } })
    const card = pad.locator('.proposal[data-id="warm"]')
    await card.waitFor({ timeout: 5000 })
    expect(await card.locator('.label').textContent()).toBe('k3 to 0.9?')
    expect(await pinned('knob_3')).toBeUndefined()
    await card.locator('button.take').click()
    expect(await nextSignal(since, 'proposal-taken')).toMatchObject({ id: 'warm' })
    expect(await pinned('knob_3')).toBe(0.9)
    await expect(card.count()).resolves.toBe(0)
  })

  it('PANIC on the pad swaps to the boot fork with no reload', async () => {
    const { json: set } = await call('set_shader', { shader: OTHER })
    expect(set).toMatchObject({ loaded: true })
    await display.evaluate(() => { window.__sameDocument = true })
    const before = loads
    const since = await seqNow()
    await pad.locator('#panic').click()
    expect(await nextSignal(since, 'panic')).toMatchObject({ fork: BOOT })
    expect(await display.evaluate(() => window.cranes.shader.includes('vec4(0.0, 1.0, 0.0'))).toBe(true)
    expect(await display.evaluate(() => new URLSearchParams(location.search).get('shader'))).toBe(BOOT)
    expect(await display.evaluate(() => window.__sameDocument)).toBe(true)
    expect(loads).toBe(before)
  })

  it('KEEP through the MCP signals what is on screen', async () => {
    const since = await seqNow()
    await call('keep')
    expect(await nextSignal(since, 'keep')).toMatchObject({ shader: BOOT, params: { knob_3: 0.9 } })
  })
})
