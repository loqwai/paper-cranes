// The relay room's broker, driven with plain fake sockets (no Workers runtime): what it relays, what
// it drops, how it routes inspect point to point, and the display registry kept in attachments.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoomHub, routeMessage, attachmentRegistry, displayOriginAllowed, siteShaders, decodeRoom, roomSecretControl, displayLink } from './room.js'
import { createDisplayLock, REFUSED } from './secret.js'

const fakeSocket = (name, { mayDisplay = true } = {}) => {
  const ws = {
    name,
    readyState: 1,
    sent: [],
    att: null,
    send(t) { this.sent.push(t) },
    // workerd refuses an attachment over 16 KiB. Count two bytes per UTF-16 unit: the worst case
    // for the structured-clone size of a string that is not Latin-1.
    serializeAttachment(a) {
      const s = JSON.stringify(a)
      if (s.length * 2 > ATTACHMENT_LIMIT_BYTES) throw new RangeError('attachment over the size limit')
      this.att = JSON.parse(s)
    },
    deserializeAttachment() { return this.att },
    close() { this.readyState = 3 },
  }
  ws.serializeAttachment({ mayDisplay })
  return ws
}
const types = (ws) => ws.sent.map((t) => JSON.parse(t).type)
// The serialized-size limit of WebSocket.serializeAttachment (Cloudflare docs, "Durable Objects >
// WebSockets": 16,384 bytes). It was never 2 KiB.
const ATTACHMENT_LIMIT_BYTES = 16 * 1024
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

describe('relay room: ?vj=1 signals reach wait_for_event', () => {
  it('turns a display page\'s vj-signal into a hub event, and never relays it', async () => {
    const tv = join('tv'), pad = join('pad')
    await hello(tv)
    const since = hub.seq
    pad.sent.length = 0
    expect(await say(tv, 'vj-signal', { type: 'flicker', flicker: 0.8 })).toBe('hub')
    expect(pad.sent).toEqual([])
    const { events } = await hub.waitFor({ since, types: ['flicker'], timeoutMs: 10 })
    expect(events).toMatchObject([{ type: 'vj-signal', signal: 'flicker', display: 'a1b2c3', data: { type: 'flicker', flicker: 0.8 } }])
  })

  it('takes a boot signal that arrives before the hello, with no display id yet', async () => {
    const tv = join('tv')
    const since = hub.seq
    expect(await say(tv, 'vj-signal', { type: 'boot', url: 'https://visuals.beadfamous.com/?vj=1' })).toBe('hub')
    const { events } = await hub.waitFor({ since, types: ['boot'], timeoutMs: 10 })
    expect(events).toMatchObject([{ type: 'vj-signal', signal: 'boot', display: null }])
  })

  it('drops a vj-signal from a socket whose page may not be a display, or one that is too big', async () => {
    const stranger = join('stranger', { mayDisplay: false }), tv = join('tv')
    const since = hub.seq
    expect(await say(stranger, 'vj-signal', { type: 'boot' })).toBe('drop')
    expect(await say(tv, 'vj-signal', { type: 'knobtrack', pad: 'x'.repeat(70 * 1024) })).toBe('drop')
    expect(await say(tv, 'vj-signal', 'not an object')).toBe('drop')
    expect(tv.sent).toEqual([])
    expect((await hub.waitFor({ since, timeoutMs: 10 })).events).toEqual([])
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
    await vi.waitFor(() => expect(a.sent).toHaveLength(1))
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

  it('keeps every attachment under the 16 KiB limit even for a huge hello', async () => {
    const tv = join('tv')
    await hello(tv, KEY_A, { href: 'x'.repeat(5000), ua: 'y'.repeat(5000), shader: 'z'.repeat(5000) })
    expect(JSON.stringify(tv.att).length * 2).toBeLessThan(ATTACHMENT_LIMIT_BYTES)
    expect(attachmentRegistry(ctx).all()).toHaveLength(1)
  })

  it('still registers a huge non-ASCII hello, which packs to more than 2 KiB', async () => {
    const tv = join('tv')
    const wide = '光'.repeat(5000)
    await hello(tv, KEY_A, { href: wide, ua: wide, shader: wide, path: wide, audio: { state: wide, energy: 0.5 } })
    const bytes = JSON.stringify(tv.att).length * 2
    expect(bytes).toBeGreaterThan(2048)
    expect(bytes).toBeLessThan(ATTACHMENT_LIMIT_BYTES)
    expect(hub.list().map((d) => d.id)).toHaveLength(1)
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

describe('relay room: a display secret locks who may be a display', () => {
  let lock, held, control
  const memoryStorage = () => { const m = new Map(); return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v) }, delete: async (k) => { m.delete(k) } } }
  const sayL = (ws, type, data) => routeMessage({ ctx, hub, ws, message: JSON.stringify({ type, data }), lock, held })
  const helloL = (ws, extra = {}, key = KEY_A) => sayL(ws, 'display-hello', { key, shader: 'plasma', href: 'https://visuals.beadfamous.com/?shader=plasma&room=x', ...extra })
  const lastData = (ws) => JSON.parse(ws.sent.at(-1)).data
  const secretOf = (link) => new URLSearchParams(new URL(link).hash.slice(1)).get('display_secret')
  const allText = () => JSON.stringify({ list: hub.list(), atts: sockets.map((s) => s.att), sent: sockets.map((s) => s.sent) })

  beforeEach(() => {
    lock = createDisplayLock(memoryStorage())
    held = new WeakMap()
    control = roomSecretControl({ ctx, hub, lock, held, room: 'show night', relayHost: 'relay.beadfamous.com' })
  })

  it('an open room registers a hello with no secret, exactly as before', async () => {
    const tv = join('tv')
    expect(await control.status()).toEqual({ locked: false, since: null })
    expect(await helloL(tv)).toBe('hub')
    expect(types(tv)).toEqual(['display-welcome'])
  })

  it('refuses a hello with no secret or a wrong one, and never lists it', async () => {
    const { link } = await control.rotate()
    const secret = secretOf(link)
    const noKey = join('noKey'), wrongKey = join('wrongKey'), pad = join('pad')
    expect(await helloL(noKey)).toBe('refused')
    expect(await helloL(wrongKey, { displaySecret: `${secret.slice(0, -1)}A` }, KEY_B)).toBe('refused')
    expect(hub.list()).toEqual([])
    expect(types(noKey)).toEqual(['display-refused'])
    expect(lastData(noKey)).toEqual({ reason: REFUSED.missing })
    expect(lastData(wrongKey)).toEqual({ reason: REFUSED.wrong })
    expect(pad.sent).toEqual([])
  })

  it('registers a hello with the right secret, and keeps the secret out of everything it stores or sends', async () => {
    const { link } = await control.rotate()
    const secret = secretOf(link)
    const tv = join('tv'), pad = join('pad')
    const href = `https://visuals.beadfamous.com/?shader=plasma&remote=display&room=x#display_secret=${secret}`
    expect(await helloL(tv, { displaySecret: secret, href })).toBe('hub')
    expect(types(tv)).toEqual(['display-welcome'])
    expect(hub.list().map((d) => d.id)).toEqual(['a1b2c3'])
    expect(hub.list()[0].href).toBe('https://visuals.beadfamous.com/?shader=plasma&remote=display&room=x#display_secret=REDACTED')
    expect(allText()).not.toContain(secret)
    expect(pad.sent).toEqual([])
  })

  it('holds a signal that beats the hello, and lets it through once the hello proves the secret', async () => {
    const { link } = await control.rotate()
    const secret = secretOf(link)
    const tv = join('tv')
    const since = hub.seq
    expect(await sayL(tv, 'vj-signal', { type: 'boot', url: `https://visuals.beadfamous.com/?vj=1#display_secret=${secret}` })).toBe('held')
    expect((await hub.waitFor({ since, timeoutMs: 10 })).events).toEqual([])
    await helloL(tv, { displaySecret: secret })
    expect(await sayL(tv, 'vj-signal', { type: 'pulse' })).toBe('hub')
    const { events } = await hub.waitFor({ since, types: ['vj-signal'], timeoutMs: 10 })
    expect(events.map((e) => e.signal)).toEqual(['boot', 'pulse'])
    expect(events[0].data.url).toBe('https://visuals.beadfamous.com/?vj=1#display_secret=REDACTED')
    expect(JSON.stringify(events)).not.toContain(secret)
  })

  it('drops what a forged display signalled once its hello is refused, and holds only a few', async () => {
    await control.rotate()
    const fake = join('fake')
    const since = hub.seq
    for (let i = 0; i < 5; i++) expect(await sayL(fake, 'vj-signal', { type: 'too-dark', i })).toBe('held')
    expect(await sayL(fake, 'vj-signal', { type: 'too-dark', i: 5 })).toBe('drop')
    await helloL(fake, { displaySecret: 'ds_forged-forged-forged-forged-forged' })
    expect(await sayL(fake, 'vj-signal', { type: 'clip' })).toBe('held')
    expect((await hub.waitFor({ since, types: ['vj-signal'], timeoutMs: 10 })).events).toEqual([])
  })

  it('rotation drops every registered display at once and refuses the old secret; the display stays a room peer', async () => {
    const first = secretOf((await control.rotate()).link)
    const tv = join('tv'), pad = join('pad')
    await helloL(tv, { displaySecret: first })
    const since = hub.seq
    const { link, dropped } = await control.rotate()
    expect(dropped).toEqual(['a1b2c3'])
    expect(hub.list()).toEqual([])
    expect(lastData(tv)).toEqual({ reason: REFUSED.rotated })
    expect((await hub.waitFor({ since, timeoutMs: 10 })).events.map((e) => e.type)).toEqual(['display-left'])
    expect(await sayL(tv, 'vj-signal', { type: 'pulse' })).toBe('held')
    expect(await helloL(tv, { displaySecret: first })).toBe('refused')
    // Knobs from a phone still reach it.
    await routeMessage({ ctx, hub, ws: pad, message: '{"type":"update-params","data":{"knob_1":0.5}}', lock, held })
    expect(tv.sent.at(-1)).toBe('{"type":"update-params","data":{"knob_1":0.5}}')
    expect(await helloL(tv, { displaySecret: secretOf(link) })).toBe('hub')
    expect(hub.list().map((d) => d.id)).toEqual(['a1b2c3'])
  })

  it('a hello still waiting on the hub when the secret rotates is refused, and keeps no old proof', async () => {
    const first = secretOf((await control.rotate()).link)
    const a = join('a'), b = join('b')
    await helloL(a, { displaySecret: first })
    a.sent.length = 0
    // Same key: the hub pings the first tab before it decides, so this hello is mid-flight.
    const pending = helloL(b, { displaySecret: first })
    await vi.waitFor(() => expect(a.sent).toHaveLength(1))
    await control.rotate()
    expect(await pending).toBe('refused')
    expect(lastData(b)).toEqual({ reason: REFUSED.rotated })
    expect(b.att).not.toHaveProperty('gen')
    expect(hub.list()).toEqual([])
  })

  it('a peer cannot forge display-refused to a display', async () => {
    const tv = join('tv'), pad = join('pad')
    await helloL(tv)
    tv.sent.length = 0
    expect(await sayL(pad, 'display-refused', { reason: 'go away' })).toBe('drop')
    expect(tv.sent).toEqual([])
  })

  it('clear opens the room again', async () => {
    await control.rotate()
    expect((await control.status()).locked).toBe(true)
    expect(await control.clear()).toEqual({ locked: false, since: null })
    expect(await helloL(join('tv'))).toBe('hub')
  })

  it('the link opens a display in this room with the secret in its hash, and names the shader on screen', async () => {
    const tv = join('tv')
    await helloL(tv)
    const { link } = await control.rotate()
    const url = new URL(link)
    expect(url.origin).toBe('https://visuals.beadfamous.com')
    expect(Object.fromEntries(url.searchParams)).toEqual({ shader: 'plasma', remote: 'display', room: 'show night' })
    expect(url.search).not.toContain('ds_')
    expect(secretOf(link)).toMatch(/^ds_/)
    expect(new URL((await control.rotate({ shader: 'clit-set/2' })).link).searchParams.get('shader')).toBe('clit-set/2')
  })

  it('a link for a local relay names that relay', () => {
    const link = displayLink({ site: 'http://localhost:7125', room: 'r', relayHost: 'localhost:8798', secret: 'ds_x' })
    expect(link).toBe('http://localhost:7125/?remote=display&room=r&relay=localhost%3A8798#display_secret=ds_x')
  })
})
