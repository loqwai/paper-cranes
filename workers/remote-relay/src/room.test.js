// The relay room's broker, driven with plain fake sockets (no Workers runtime): what it relays, what
// it drops, how it routes inspect point to point, and the display registry kept in attachments.
import { describe, it, expect, beforeEach } from 'vitest'
import { createRoomHub, routeMessage, attachmentRegistry, displayOriginAllowed, siteShaders, decodeRoom } from './room.js'

const fakeSocket = (name, { mayDisplay = true } = {}) => {
  const ws = {
    name,
    readyState: 1,
    sent: [],
    att: null,
    send(t) { this.sent.push(t) },
    serializeAttachment(a) { this.att = JSON.parse(JSON.stringify(a)) },
    deserializeAttachment() { return this.att },
    close() { this.readyState = 3 },
  }
  ws.serializeAttachment({ mayDisplay })
  return ws
}
const types = (ws) => ws.sent.map((t) => JSON.parse(t).type)
const KEY_A = 'a1b2c3d4-0000-4000-8000-000000000000'
const KEY_B = 'b2c3d4e5-0000-4000-8000-000000000000'

let sockets, ctx, hub, n
const room = () => {
  sockets = []
  ctx = { getWebSockets: () => sockets.filter((s) => s.readyState === 1) }
  n = 0
  hub = createRoomHub(ctx, { uuid: () => `req-${++n}` })
}
const join = (name, opts) => { const ws = fakeSocket(name, opts); sockets.push(ws); return ws }
const say = (ws, type, data) => routeMessage({ ctx, hub, ws, message: JSON.stringify({ type, data }) })
const hello = (ws, key = KEY_A, extra = {}) => say(ws, 'display-hello', { key, shader: 'plasma', href: 'https://visuals.beadfamous.com/?shader=plasma&room=x', ...extra })

beforeEach(room)

describe('relay room: plain relaying is unchanged', () => {
  it('relays a message verbatim to every other socket, never back to the sender', async () => {
    const pad = join('pad'), tv = join('tv'), laptop = join('laptop')
    const raw = '{"type":"update-params","data":{"knob_1":0.5}}'
    expect(await routeMessage({ ctx, hub, ws: pad, message: raw })).toBe('relay')
    expect(tv.sent).toEqual([raw])
    expect(laptop.sent).toEqual([raw])
    expect(pad.sent).toEqual([])
  })

  it('drops binary and non-JSON frames', async () => {
    const pad = join('pad'), tv = join('tv')
    expect(await routeMessage({ ctx, hub, ws: pad, message: 'not json' })).toBe('drop')
    expect(await routeMessage({ ctx, hub, ws: pad, message: new ArrayBuffer(4) })).toBe('drop')
    expect(tv.sent).toEqual([])
  })
})

describe('relay room: hub traffic never reaches peers', () => {
  it('drops an inspect a room peer forges, so the display never sees it', async () => {
    const tv = join('tv'), pad = join('pad')
    await hello(tv)
    tv.sent.length = 0
    expect(await say(pad, 'inspect', { id: 'spoof', cmd: 'shot', args: {} })).toBe('drop')
    expect(await say(pad, 'display-welcome', { id: 'a1b2c3' })).toBe('drop')
    expect(await say(pad, 'display-rekey', { id: 'a1b2c3' })).toBe('drop')
    expect(tv.sent).toEqual([])
  })

  it('keeps a display hello off the wire and welcomes only that display', async () => {
    const tv = join('tv'), pad = join('pad')
    expect(await hello(tv)).toBe('hub')
    expect(pad.sent).toEqual([])
    expect(types(tv)).toEqual(['display-welcome'])
    expect(JSON.parse(tv.sent[0]).data).toEqual({ id: 'a1b2c3' })
  })

  it('does not register a hello from a page on another origin, and does not relay it either', async () => {
    const evil = join('evil', { mayDisplay: false }), pad = join('pad')
    expect(await hello(evil)).toBe('drop')
    expect(hub.list()).toEqual([])
    expect(pad.sent).toEqual([])
    expect(evil.sent).toEqual([])
  })

  it('sends inspect to the one display asked, and only that display’s reply resolves it', async () => {
    const tv = join('tv'), tv2 = join('tv2'), pad = join('pad')
    await hello(tv, KEY_A)
    await hello(tv2, KEY_B)
    for (const s of sockets) s.sent.length = 0
    const pending = hub.request(hub.resolve('b2c'), 'state', { features: 'none' })
    expect(types(tv2)).toEqual(['inspect'])
    expect(tv.sent).toEqual([])
    expect(pad.sent).toEqual([])
    const { id } = JSON.parse(tv2.sent[0]).data
    // A peer cannot answer for the display, and its reply is not relayed.
    expect(await say(pad, 'inspect-reply', { id, ok: true, result: { forged: true } })).toBe('hub')
    expect(await say(tv, 'inspect-reply', { id, ok: true, result: { forged: true } })).toBe('hub')
    expect(await say(tv2, 'inspect-reply', { id, ok: true, result: { shader: 'plasma' } })).toBe('hub')
    await expect(pending).resolves.toEqual({ shader: 'plasma' })
    expect(tv.sent).toEqual([])
    expect(pad.sent).toEqual([])
  })
})

describe('relay room: display registry', () => {
  it('lists a display, and survives a hibernation (a fresh hub over the same sockets)', async () => {
    const tv = join('tv')
    await hello(tv)
    expect(hub.list().map((d) => [d.id, d.shader])).toEqual([['a1b2c3', 'plasma']])
    hub = createRoomHub(ctx)
    expect(hub.list().map((d) => d.id)).toEqual(['a1b2c3'])
    expect(hub.resolve().sock).toBe(tv)
  })

  it('forgets a display when its socket closes, with a display-left event', async () => {
    const tv = join('tv')
    await hello(tv)
    const since = hub.seq
    tv.readyState = 3
    hub.onClose(tv)
    expect(hub.list()).toEqual([])
    const { events } = await hub.waitFor({ since, timeoutMs: 10 })
    expect(events.map((e) => e.type)).toEqual(['display-left'])
  })

  it('tells a duplicated tab to rekey while the first tab still answers', async () => {
    const a = join('a'), b = join('b')
    await hello(a)
    a.sent.length = 0
    const pending = hello(b)
    // The hub pings the first tab; it answers (even an unknown-cmd error is a sign of life).
    const ping = JSON.parse(a.sent.at(-1))
    expect(ping.data.cmd).toBe('ping')
    await say(a, 'inspect-reply', { id: ping.data.id, ok: false, error: 'unknown cmd ping' })
    await pending
    expect(types(b)).toEqual(['display-rekey'])
    expect(hub.list().map((d) => d.id)).toEqual(['a1b2c3'])
    expect(hub.resolve().sock).toBe(a)
  })

  it('lets a reconnecting tab take over its id when the old socket is dead', async () => {
    const a = join('a'), b = join('b')
    await hello(a)
    a.readyState = 3 // the phone dropped off wifi; the runtime has not noticed yet
    sockets.push(a)
    await hello(b)
    expect(hub.list().map((d) => d.id)).toEqual(['a1b2c3'])
    expect(hub.resolve().sock).toBe(b)
    expect(types(b)).toEqual(['display-welcome'])
  })

  it('drops the old entry when a socket says hello again under a new key', async () => {
    const tv = join('tv')
    await hello(tv, KEY_A)
    await hello(tv, KEY_B)
    expect(hub.list().map((d) => d.id)).toEqual(['b2c3d4'])
  })

  it('keeps every attachment under the 2 KiB limit even for a huge hello', async () => {
    const tv = join('tv')
    await hello(tv, KEY_A, { href: 'x'.repeat(5000), ua: 'y'.repeat(5000), shader: 'z'.repeat(5000) })
    expect(JSON.stringify(tv.att).length).toBeLessThan(2048)
    expect(attachmentRegistry(ctx).all()).toHaveLength(1)
  })

  it('accepts display pages only from the site, previews, tunnels and localhost', () => {
    for (const o of ['https://visuals.beadfamous.com', 'https://clit.beadfamous.com', 'https://vj-mcp-live.paper-cranes-visuals.pages.dev', 'http://localhost:6969', 'https://cranes-local.hypnodroid.com'])
      expect(displayOriginAllowed(o), o).toBe(true)
    for (const o of [null, '', 'https://evil.example', 'https://beadfamous.com.evil.example', 'http://visuals.beadfamous.com'])
      expect(displayOriginAllowed(o), String(o)).toBe(false)
  })
})

describe('relay room: shaders come from the display’s own site', () => {
  it('fetches from the one site the displays were served by, and refuses an HTML shell as a shader', async () => {
    const tv = join('tv')
    await hello(tv, KEY_A, { href: 'https://clit.beadfamous.com/?shader=clit-set/2&room=x' })
    const asked = []
    const fetchImpl = async (url) => {
      asked.push(url)
      if (url.endsWith('/missing.frag')) return new Response('<!doctype html><html></html>', { status: 200 })
      return new Response('void mainImage(out vec4 c, in vec2 f) { c = vec4(1); }')
    }
    const shaders = siteShaders({ hub, env: {}, fetchImpl })
    expect((await shaders.read('clit-set/2')).code).toMatch(/mainImage/)
    await expect(shaders.read('missing')).rejects.toThrow(/not found/)
    expect(asked[0]).toBe('https://clit.beadfamous.com/shaders/clit-set/2.frag')
  })
})

describe('relay room: room names from the path', () => {
  it('decodes a room, and answers null (a 400) for one that is not valid percent-encoding', () => {
    expect(decodeRoom('my%20room')).toBe('my room')
    expect(decodeRoom('%E0')).toBeNull()
    expect(decodeRoom('%')).toBeNull()
    expect(decodeRoom('')).toBeNull()
  })
})
