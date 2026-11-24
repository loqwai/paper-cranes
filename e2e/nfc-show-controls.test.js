// NFC show controls end to end (docs/nfc-show-controls.md): a vjpad with a stubbed Web NFC reader
// and a display page join the same room on a local relay that speaks the relay Worker's protocol
// (relay every message verbatim to the room's other sockets). A simulated tag read on the vjpad
// must land on the display, exactly as the sticker on Aaron's arm will.
//
// Needs a build: `npm run build`. Ports: the static site on E2E_PORT (7168 by default), the relay on
// E2E_NFC_RELAY_PORT (7170 by default).
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'

process.env.E2E_PORT ??= '7168'
const { startSmoke, hasTarget, until, PHONE } = await import('./smoke-env.js')

const RELAY_PORT = Number(process.env.E2E_NFC_RELAY_PORT || 7170)
// E2E_NFC_LIVE=1: use the deployed relay instead, to measure the real network hop.
const LIVE = Boolean(process.env.E2E_NFC_LIVE)
const RELAY = LIVE ? 'relay.beadfamous.com' : `127.0.0.1:${RELAY_PORT}`
const WS = LIVE ? 'wss' : 'ws'

// The relay Worker's room behaviour, minus the hub: verbatim to everyone else, status on join/leave.
const startRelay = () => new Promise((resolve) => {
  const rooms = new Map()
  const server = http.createServer((_, res) => res.end('relay'))
  const wss = new WebSocketServer({ server })
  const status = (room) => {
    const peers = rooms.get(room)
    for (const p of peers) p.send(JSON.stringify({ type: 'status', data: { connectedClients: peers.size } }))
  }
  wss.on('connection', (ws, req) => {
    const room = decodeURIComponent(req.url.replace(/^\/ws\//, ''))
    if (!rooms.has(room)) rooms.set(room, new Set())
    rooms.get(room).add(ws)
    status(room)
    ws.on('message', (m) => {
      const text = String(m)
      try { JSON.parse(text) } catch { return }
      for (const p of rooms.get(room)) if (p !== ws && p.readyState === 1) p.send(text)
    })
    ws.on('close', () => { rooms.get(room).delete(ws); status(room) })
  })
  server.listen(RELAY_PORT, '127.0.0.1', () => resolve({ close: () => new Promise((r) => { wss.close(); server.close(r) }) }))
})

// Web NFC as Chrome on Android exposes it, driven from the test: window.__tap(url) is a sticker.
const NFC_STUB = () => {
  window.__readers = []
  window.NDEFReader = class extends EventTarget {
    constructor() { super(); window.__readers.push(this) }
    async scan() { this.scanning = true }
  }
  window.__tap = (url) => {
    const e = new Event('reading')
    e.serialNumber = '04:aa:bb'
    e.message = { records: [{ recordType: 'url', data: new TextEncoder().encode(url) }] }
    window.__tappedAt = Date.now()
    for (const r of window.__readers) if (r.scanning) r.dispatchEvent(e)
  }
}

const tag = (id) => `https://visuals.beadfamous.com/vjpad#nfc=${id}`
const roomName = () => `nfc-${Math.random().toString(36).slice(2, 10)}`

describe.skipIf(!hasTarget() || process.env.E2E_BASE_URL)('NFC smiley stickers drive the display', () => {
  let env, relay
  beforeAll(async () => {
    if (!LIVE) relay = await startRelay()
    env = await startSmoke()
  })
  afterAll(async () => {
    await env?.close()
    await relay?.close()
  })

  const joinPeer = async (room) => {
    const peer = new WebSocket(`${WS}://${RELAY}/ws/${room}`, { headers: { Origin: 'https://visuals.beadfamous.com' } })
    const inbound = []
    peer.on('message', (m) => inbound.push(JSON.parse(String(m))))
    await new Promise((r) => peer.once('open', r))
    return { peer, inbound }
  }

  it('a tap lands on the display, KEEP reaches the room, a wrong tag sends nothing', async () => {
    const room = roomName()
    const q = `room=${room}&relay=${RELAY}`
    const display = await env.newPage({ name: 'nfc-display' })
    await display.page.goto(`${env.base}/?shader=plasma&noaudio=true&time=5&remote=display&vj=1&${q}`)
    const { peer, inbound } = await joinPeer(room)

    const pad = await env.newPage({ name: 'nfc-vjpad', viewport: PHONE, init: NFC_STUB })
    await pad.page.goto(`${env.base}/vjpad?${q}&nfc_show=clit-set`)
    await until(() => pad.page.evaluate(() => /connected/.test(document.getElementById('status')?.textContent ?? '') || window.vjpad?.client?.socket?.readyState === 1), { what: 'the vjpad to connect' })
    await pad.page.click('#nfc')
    await until(() => pad.page.evaluate(() => window.cranes?.nfc?.armed), { what: 'NFC to arm' })
    await until(async () => (await display.page.evaluate(() => document.readyState)) === 'complete')

    // FAV A: s5 -> update-params {shader: clit-set/2}. The display switches shader.
    await pad.page.evaluate((u) => window.__tap(u), tag('s5'))
    const landed = await until(() => display.page.evaluate(() => {
      const f = document.getElementById('nfc-flash')
      return f?.dataset.type === 'update-params' && new URLSearchParams(location.search).get('shader') === 'clit-set/2' && Date.now()
    }), { interval: 20, what: 'FAV A to switch the display' })
    const tappedAt = await pad.page.evaluate(() => window.__tappedAt)
    process.stderr.write(`[nfc e2e] tap -> display on the new shader (URL updated, flash shown): ${landed - tappedAt} ms\n`)

    let keepAt = 0
    // KEEP: the contract's vj-keep, marked via nfc, reaches every other socket in the room.
    await pad.page.evaluate((u) => window.__tap(u), tag('s1'))
    const keep = await until(() => inbound.find((m) => m.type === 'vj-keep') && ((keepAt = Date.now()), inbound.find((m) => m.type === 'vj-keep')), { interval: 2, what: 'vj-keep in the room' })
    process.stderr.write(`[nfc e2e] tap -> vj-keep at a room peer (${LIVE ? 'live relay' : 'local relay'}): ${keepAt - await pad.page.evaluate(() => window.__tappedAt)} ms\n`)
    expect(keep).toEqual({ via: 'nfc', type: 'vj-keep', data: {} })
    await until(() => display.page.evaluate(() => document.getElementById('nfc-flash')?.dataset.type === 'vj-keep'), { what: 'the display flash for KEEP' })

    // A sticker that is not on the map, and a tag from the giveaway batch: nothing goes out.
    const before = inbound.length
    await pad.page.evaluate((u) => window.__tap(u), tag('s99'))
    await pad.page.evaluate(() => window.__tap('https://2cb.pw/clit-new/4'))
    await new Promise((r) => setTimeout(r, 400))
    expect(inbound.slice(before).filter((m) => m.type !== 'status' && m.type !== 'pad-hello' && m.type !== 'vjpad-peer')).toEqual([])
    expect(await pad.page.locator('#nfc').textContent()).toBe('?')

    // The fallback: the tag's URL opened by Android in a new tab with no room. It goes to the room
    // this phone's vjpad last used, and fires the sticker once, only after one tap on the page:
    // a link from any web page or message opens exactly this URL, and must not fire on its own.
    const panics = () => inbound.filter((m) => m.type === 'vj-panic')
    const tab = await pad.ctx.newPage()
    const n = panics().length
    await tab.goto(`${env.base}/vjpad#nfc=s2`)
    await tab.locator('#nfc-confirm-yes').waitFor()
    expect(new URL(tab.url()).searchParams.get('room')).toBe(room)
    expect(new URL(tab.url()).hash).toBe('')
    expect(await tab.locator('#nfc-confirm').textContent()).not.toContain(room)
    await until(() => tab.evaluate(() => window.vjpad?.client?.isConnected ?? /connected/.test(document.getElementById('status')?.textContent ?? '')), { what: 'the fallback tab to connect' })
    await new Promise((r) => setTimeout(r, 600))
    expect(panics().length).toBe(n)
    await tab.click('#nfc-confirm-yes')
    const panic = await until(() => panics()[n], { what: 'the fallback tab to send PANIC after the tap' })
    // The vjpad PANIC button's own message: the display picks its boot fork.
    expect(panic).toEqual({ via: 'nfc', type: 'vj-panic', data: {} })
    await new Promise((r) => setTimeout(r, 300))
    expect(panics().length).toBe(n + 1)

    // Cancel, and a reload of the tab: neither fires anything.
    const tab2 = await pad.ctx.newPage()
    await tab2.goto(`${env.base}/vjpad#nfc=s2`)
    await tab2.click('#nfc-confirm-no')
    await tab2.reload()
    await new Promise((r) => setTimeout(r, 800))
    expect(await tab2.locator('#nfc-confirm').count()).toBe(0)
    expect(panics().length).toBe(n + 1)

    peer.close()
    await pad.close()
    await display.close()
    expect(display.pageErrors).toEqual([])
    expect(pad.pageErrors).toEqual([])
  })

  it('a stranger\'s phone that reads a sticker gets a vjpad with no room, and nothing is sent', async () => {
    const { peer, inbound } = await joinPeer('any-room')
    const stranger = await env.newPage({ name: 'nfc-stranger', viewport: PHONE })
    await stranger.page.goto(`${env.base}/vjpad#nfc=s2`)
    await new Promise((r) => setTimeout(r, 1500))
    expect(new URL(stranger.page.url()).searchParams.has('room')).toBe(false)
    expect(await stranger.page.locator('#nfc-confirm').count()).toBe(0)
    expect(inbound.filter((m) => m.type === 'vj-panic')).toEqual([])
    peer.close()
    await stranger.close()
  })
})
