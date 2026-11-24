// Remote display through the live relay (wss://relay.beadfamous.com): a display page joins a
// random ?room=, a raw WebSocket peer joins the same room, and we check what crosses. Needs the
// network and the deployed relay Worker, so it runs only with E2E_RELAY=1 (npm run test:smoke:prod
// sets it). Target page: the same E2E_BASE_URL / local dist as e2e/smoke.test.js.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebSocket } from 'ws'
import { startSmoke, hasTarget, until, untilRendered } from './smoke-env.js'

const RELAY = process.env.E2E_RELAY_URL || 'wss://relay.beadfamous.com'
const ORIGIN = 'https://visuals.beadfamous.com'
let env

const joinRoom = async room => {
  const peer = new WebSocket(`${RELAY}/ws/${encodeURIComponent(room)}`, { headers: { Origin: ORIGIN } })
  const inbound = []
  peer.on('message', m => { try { inbound.push(JSON.parse(String(m))) } catch { inbound.push({ type: '?' }) } })
  await new Promise((resolve, reject) => { peer.once('open', resolve); peer.once('error', reject) })
  return { peer, inbound }
}
const roomName = () => `e2e-${Math.random().toString(36).slice(2, 12)}`
// The relay's own count of who is in the room, from its status frames.
const peersIn = inbound => inbound.filter(m => m.type === 'status').map(m => m.data?.connectedClients).filter(Number.isFinite).at(-1) ?? 0

describe.skipIf(!process.env.E2E_RELAY || !hasTarget())('remote display over the live relay', () => {
  beforeAll(async () => { env = await startSmoke() })
  afterAll(async () => { await env?.close() })

  it('applies a peer\'s knob but refuses its controller', async () => {
    const room = roomName()
    const { page, close } = await env.newPage({ name: 'remote-refused' })
    await page.goto(`${env.base}/?shader=plasma&noaudio=true&time=5&remote=display&room=${room}`)
    await untilRendered(page)
    const { peer } = await joinRoom(room)
    // The display may join after the peer's socket opens; resend until the knob lands.
    const knob = await until(async () => {
      peer.send(JSON.stringify({ type: 'update-params', data: { knob_7: 0.42, controller: 'evil' } }))
      return page.evaluate(() => window.cranes?.messageParams?.knob_7)
    }, { interval: 1_000, what: 'knob_7 to reach the display' })
    // The URL mirror is debounced (750ms); wait for it to carry the knob, then read it.
    const href = await until(() => page.evaluate(() => /knob_7=0\.42/.test(location.href) && location.href),
      { what: 'the URL mirror' })
    const params = await page.evaluate(() => ({ ...window.cranes.messageParams }))
    peer.close()
    await close()
    expect(knob).toBe(0.42)
    expect(params).not.toHaveProperty('controller')
    expect(new URL(href).searchParams.has('controller')).toBe(false)
  })

  it('a peer sees the display join, and vj-signal frames are not relayed to it', async () => {
    const room = roomName()
    const { peer, inbound } = await joinRoom(room)
    const { page, close } = await env.newPage({ name: 'relay-peer' })
    const sent = []
    page.on('websocket', ws => ws.on('framesent', f => { try { sent.push(JSON.parse(f.payload).type) } catch {} }))
    await page.goto(`${env.base}/?shader=plasma&noaudio=true&time=5&remote=display&room=${room}&vj=1`)
    // The display is in the room once the relay's status frame counts two clients.
    await until(() => peersIn(inbound) >= 2, { what: 'the relay to report the display joining' })
    // vj=1 sends a vj-signal on boot; wait until the page has sent at least one.
    await until(() => sent.includes('vj-signal'), { what: 'the page to send a vj-signal' })
    // Fence: a round trip through the room after that signal. Once the display has applied the
    // peer's knob, a vj-signal the relay forwarded would have reached the peer too.
    await until(async () => {
      peer.send(JSON.stringify({ type: 'update-params', data: { knob_8: 0.25 } }))
      return page.evaluate(() => window.cranes?.messageParams?.knob_8 === 0.25)
    }, { interval: 1_000, what: 'the fence knob to reach the display' })
    const peerTypes = inbound.map(m => m.type)
    peer.close()
    await close()
    expect(peerTypes).toContain('status')
    expect(peerTypes).not.toContain('vj-signal')
  })
})
