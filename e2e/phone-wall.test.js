// The phone wall end to end (docs/phone-wall.md): one browser stands in for the phone, the vjpad is
// the phone's own screen, and PROJECT opens the wall as a second window of the same browser, as it
// would on the external display. The room's relay is pointed at a port nothing listens on, so every
// pass here went over the local link and none over a network.
//   - PROJECT shows only when a second screen is seen, and opens the wall
//   - a knob turn, HANDS, PANIC, KEEP and a proposal card all work over the link
//   - an unplugged wall shows NO WALL; a replugged one links back and gets the pad's values
//   - the Presentation API path, with a stand-in PresentationConnection, does the same
// Ports 7180-7182 only (the dev server on 7180, a dead relay on 7182): other lanes own the rest.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const PORT = 7180
const DEAD_RELAY = '127.0.0.1:7182'
const DIR = 'claude/wip/phone-wall-e2e'
const BOOT = `${DIR}/boot`
const OTHER = `${DIR}/other`
const SHADER_DIR = resolve(ROOT, 'shaders', DIR)
const solid = (r, g, b) => `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  fragColor = vec4(${r}.0, ${g}.0, ${b}.0, knob_1 * 0.0 + 1.0); // K1 PAD
}
`
const GREEN = 'vec4(0.0, 1.0, 0.0'
const RED = 'vec4(1.0, 0.0, 0.0'
const PAD_URL = `http://127.0.0.1:${PORT}/vjpad.html?shader=${BOOT}&room=phone-wall-e2e&relay=${DEAD_RELAY}&noaudio=true&hands_ms=1000`

// The phone has a second screen: Chrome's Window Management API says so with screen.isExtended.
const SECOND_SCREEN = () => Object.defineProperty(window.screen, 'isExtended', { get: () => true, configurable: true })

let server, browser

const until = async (fn, ms = 10_000) => {
  for (const end = Date.now() + ms; ; await new Promise((r) => setTimeout(r, 50))) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error('timed out')
  }
}
const onWall = (wall, check, arg) => until(() => wall.evaluate(check, arg).catch(() => false))
const wallShows = (wall, color) => onWall(wall, (c) => (window.cranes?.shader ?? '').includes(c), color)
const pinned = (wall, key) => wall.evaluate((k) => window.cranes.messageParams?.[k], key)

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
})

afterAll(async () => {
  await browser?.close()
  await server?.close()
  await rm(SHADER_DIR, { recursive: true, force: true })
})

describe('phone wall over the local link', () => {
  let ctx, pad, wall

  beforeAll(async () => {
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
    await ctx.addInitScript(SECOND_SCREEN)
    pad = await ctx.newPage()
    await pad.goto(PAD_URL)
  })
  afterAll(() => ctx?.close())

  it('shows nothing new on a phone with no second screen', async () => {
    const plain = await browser.newPage()
    await plain.goto(PAD_URL)
    await plain.waitForFunction(() => window.vjpad?.phoneWall)
    expect(await plain.locator('#wallbar').isHidden()).toBe(true)
    await plain.close()
  })

  it('PROJECT opens the wall on the second screen and the pad says WALL ✓', async () => {
    const project = pad.locator('#project')
    await project.waitFor({ timeout: 10_000 })
    const [opened] = await Promise.all([ctx.waitForEvent('page'), project.click()])
    wall = opened
    expect(new URL(wall.url()).searchParams.get('wall')).toBe('1')
    expect(new URL(wall.url()).searchParams.get('shader')).toBe(BOOT)
    await wallShows(wall, GREEN)
    await until(() => pad.evaluate(() => window.vjpad.phoneWall.state.state === 'presenting'))
    expect(await pad.locator('.wallchip').textContent()).toBe('WALL ✓')
    expect(await pad.locator('#status').textContent()).toContain('wall')
  })

  it('a knob turn reaches the wall over the link, with no socket open on either side', async () => {
    await pad.evaluate(() => window.vjpad.send({ knob_1: 0.42 }))
    await until(async () => (await pinned(wall, 'knob_1')) === 0.42)
    expect(await wall.evaluate(() => window.cranes.remoteClient.stats.fromLink)).toBeGreaterThan(0)
    expect(await wall.evaluate(() => window.cranes.remoteClient.socket?.readyState === 1)).toBe(false)
    expect(await pad.evaluate(() => window.vjpad.client.socket?.readyState === 1)).toBe(false)
  })

  it('his pad move turns HANDS on in the wall, and it ends after the lock', async () => {
    await pad.evaluate(() => window.vjpad.send({ knob_2: 0.5 }))
    await onWall(wall, () => window.cranes.live.handsOn)
    await onWall(wall, () => !window.cranes.live.handsOn)
  })

  it('PANIC swaps the wall back to its boot fork, once', async () => {
    await pad.evaluate((s) => window.vjpad.setShader(s, { broadcast: true }), OTHER)
    await wallShows(wall, RED)
    await pad.locator('#panic').click()
    await wallShows(wall, GREEN)
  })

  it('KEEP saves the look on the wall exactly once', async () => {
    await wall.evaluate(() => { window.__kept = 0; window.cranes.snapshot = () => { window.__kept++ } })
    await pad.locator('#keep').click()
    await onWall(wall, () => window.__kept === 1)
    await new Promise((r) => setTimeout(r, 300))
    expect(await wall.evaluate(() => window.__kept)).toBe(1)
  })

  it('a proposal card reaches the pad, and KEEP on it applies on the wall', async () => {
    await wall.evaluate(() => window.cranes.live.propose({ id: 'warm', label: 'k3 to 0.9?', params: { knob_3: 0.9 } }))
    const card = pad.locator('.proposal[data-id="warm"]')
    await card.waitFor({ timeout: 5000 })
    await card.locator('button.take').click()
    await until(async () => (await pinned(wall, 'knob_3')) === 0.9)
  })

  it('an NFC sticker read by the pad reaches the wall over the link', async () => {
    await wall.evaluate(() => { window.__kept = 0 })
    await pad.evaluate(() => window.cranes.nfc.fire('s1')) // s1 = KEEP (nfc-show-controls.json)
    await onWall(wall, () => window.__kept === 1)
  })

  it('a sticker tapped while the pad is not in front (the roomless fallback tab) fires over the link after one tap', async () => {
    await pad.evaluate((s) => window.vjpad.setShader(s, { broadcast: true }), OTHER)
    await wallShows(wall, RED)
    // No remembered room: the tab's only way to the wall is the local link.
    await pad.evaluate(() => localStorage.removeItem('cranes-nfc-home'))
    const tab = await ctx.newPage()
    await tab.goto(`http://127.0.0.1:${PORT}/vjpad.html#nfc=s2`) // s2 = PANIC
    await tab.locator('#nfc-confirm-yes').click({ timeout: 6000 })
    await wallShows(wall, GREEN)
    await tab.close()
  })

  it('pulling the cable shows NO WALL; the pad keeps working; replugging links back with its values', async () => {
    const url = wall.url()
    await pad.evaluate(() => { window.vjpad.state.knob_7 = 0.33 })
    await wall.close()
    await pad.locator('.wallbar.lost').waitFor({ timeout: 6000 })
    expect(await pad.locator('.wallchip').textContent()).toBe('NO WALL')
    // Still playing: a send with no wall goes to the (dead) room and throws nothing.
    await pad.evaluate(() => window.vjpad.send({ knob_1: 0.1 }))

    wall = await ctx.newPage()
    await wall.goto(url)
    await until(() => pad.evaluate(() => window.vjpad.phoneWall.state.state === 'presenting'))
    await until(async () => (await pinned(wall, 'knob_7')) === 0.33)
    expect(await pad.locator('.wallchip').textContent()).toBe('WALL ✓')
  })
})

describe('phone wall over the Presentation API', () => {
  // Chrome only offers a presentation display for a real second screen, which headless Chromium
  // has none of. These stand-ins keep the page code real: PresentationRequest.start() opens the
  // receiver in a new window, and the two ends of the PresentationConnection talk through
  // localStorage events. BroadcastChannel is removed, so the connection is the only link.
  const STUBS = () => {
    delete window.BroadcastChannel
    const KEY = 'fake-presentation'
    const conn = (me) => {
      const listeners = {}
      const c = {
        id: 'fake-1',
        state: 'connected',
        addEventListener: (t, fn) => { (listeners[t] ??= []).push(fn) },
        send: (data) => localStorage.setItem(`${KEY}:${me}`, JSON.stringify({ data, at: Math.random() })),
        close: () => { c.state = 'closed'; (listeners.close ?? []).forEach((fn) => fn({})) },
      }
      window.addEventListener('storage', (e) => {
        if (e.key !== `${KEY}:${me === 'pad' ? 'wall' : 'pad'}` || !e.newValue) return
        const { data } = JSON.parse(e.newValue)
        ;(listeners.message ?? []).forEach((fn) => fn({ data }))
      })
      return c
    }
    // Decided when the page reads it, not when this script runs: a popup's first document is
    // about:blank, and its window carries over to the wall's document.
    let receiver = null
    Object.defineProperty(Navigator.prototype, 'presentation', {
      configurable: true,
      get: () => {
        if (new URLSearchParams(location.search).get('wall') !== '1') return {}
        receiver ??= { receiver: { connectionList: Promise.resolve({ connections: [conn('wall')], addEventListener: () => {} }) } }
        return receiver
      },
    })
    window.PresentationRequest = class {
      constructor(urls) { this.urls = urls }
      getAvailability() { return Promise.resolve({ value: true, addEventListener: () => {} }) }
      start() { window.open(this.urls[0], '_blank'); window.__presented = true; return Promise.resolve(conn('pad')) }
      reconnect() { return Promise.reject(new Error('none')) }
    }
  }

  let ctx, pad, wall
  beforeAll(async () => {
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
    await ctx.addInitScript(STUBS)
    pad = await ctx.newPage()
    await pad.goto(PAD_URL)
  })
  afterAll(() => ctx?.close())

  it('PROJECT starts a presentation, and the wall is driven over its connection', async () => {
    const project = pad.locator('#project')
    await project.waitFor({ timeout: 10_000 })
    const [opened] = await Promise.all([ctx.waitForEvent('page'), project.click()])
    wall = opened
    expect(await pad.evaluate(() => window.__presented)).toBe(true)
    await wallShows(wall, GREEN)
    await until(() => pad.evaluate(() => window.vjpad.phoneWall.state.state === 'presenting'))
    expect(await pad.evaluate(() => window.vjpad.phoneWall.state.via)).toBe('presentation')

    await pad.evaluate(() => window.vjpad.send({ knob_1: 0.77 }))
    await until(async () => (await pinned(wall, 'knob_1')) === 0.77)
    await pad.evaluate((s) => window.vjpad.setShader(s, { broadcast: true }), OTHER)
    await wallShows(wall, RED)
    await pad.locator('#panic').click()
    await wallShows(wall, GREEN)
  })

  it('a closed presentation shows NO WALL', async () => {
    await pad.evaluate(() => window.vjpad.client.link.peers.length && null)
    // The cable is pulled: Chrome closes the connection on the pad's side.
    await wall.close()
    await pad.locator('.wallbar.lost').waitFor({ timeout: 8000 })
  })
})
