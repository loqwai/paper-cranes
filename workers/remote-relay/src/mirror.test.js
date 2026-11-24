// Board mirrors in a relay room (docs/board-mirror.md): a viewer watches and is never heard.
import { describe, it, expect, beforeEach } from 'vitest'
import { createRoomHub, routeMessage, roomSecretControl } from './room.js'
import { createDisplayLock } from './secret.js'
import { roomCounts, isViewer } from './mirror.js'

const fakeSocket = (name, att) => ({
  name,
  readyState: 1,
  sent: [],
  att,
  send(t) { this.sent.push(t) },
  serializeAttachment(a) { this.att = JSON.parse(JSON.stringify(a)) },
  deserializeAttachment() { return this.att },
  close() { this.readyState = 3 },
})
const KEY_A = 'a1b2c3d4-0000-4000-8000-000000000000'
const memoryStorage = () => { const m = new Map(); return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v) }, delete: async (k) => { m.delete(k) } } }

let sockets, ctx, hub, lock
const join = (name, att = { mayDisplay: true }) => { const ws = fakeSocket(name, att); sockets.push(ws); return ws }
// What the relay's fetch writes for a socket that came in on /view/<id>.
const viewer = (name) => join(name, { viewer: true, mayDisplay: false })
const say = (ws, type, data) => routeMessage({ ctx, hub, ws, message: JSON.stringify({ type, data }), lock })
const hello = (ws, extra = {}) => say(ws, 'display-hello', { key: KEY_A, shader: 'plasma', href: 'https://visuals.beadfamous.com/?shader=plasma&room=x', ...extra })
const types = (ws) => ws.sent.map((t) => JSON.parse(t).type)

beforeEach(() => {
  sockets = []
  ctx = { getWebSockets: () => sockets.filter((s) => s.readyState === 1) }
  hub = createRoomHub(ctx, { uuid: () => 'req' })
  lock = createDisplayLock(memoryStorage())
})

describe('board mirror: a viewer cannot be heard', () => {
  it('drops every message a viewer sends: knobs, a display hello, a forged feed, a vj-signal', async () => {
    const tv = join('tv'), pad = join('pad'), mirror = viewer('mirror')
    await hello(tv)
    tv.sent = []
    expect(await say(mirror, 'update-params', { knob_1: 1 })).toBe('drop')
    expect(await say(mirror, 'display-hello', { key: KEY_A })).toBe('drop')
    expect(await say(mirror, 'mirror-frame', { t: 1, f: {} })).toBe('drop')
    expect(await say(mirror, 'vj-signal', { data: { type: 'boot' } })).toBe('drop')
    expect(tv.sent).toEqual([])
    expect(pad.sent).toEqual([])
  })

  it('never lists a viewer as a display', async () => {
    const mirror = viewer('mirror')
    await say(mirror, 'display-hello', { key: KEY_A })
    expect(hub.list()).toEqual([])
    expect(isViewer(mirror)).toBe(true)
  })
})

describe('board mirror: a viewer hears the feed alone', () => {
  it('does not pass the room traffic (knobs, audio) to a viewer', async () => {
    const pad = join('pad'), tv = join('tv'), mirror = viewer('mirror')
    expect(await say(pad, 'update-params', { knob_1: 0.5 })).toBe('relay')
    expect(await say(pad, 'audio-features', { bass: 1 })).toBe('relay')
    expect(types(tv)).toEqual(['update-params', 'audio-features'])
    expect(mirror.sent).toEqual([])
  })

  it('sends a registered display\'s feed to viewers only, verbatim', async () => {
    const tv = join('tv'), pad = join('pad'), a = viewer('a'), b = viewer('b')
    await hello(tv)
    const raw = JSON.stringify({ type: 'mirror-frame', data: { t: 1.5, f: { knob_1: 0.25 }, sent: 1 } })
    expect(await routeMessage({ ctx, hub, ws: tv, message: raw, lock })).toBe('mirror')
    expect(a.sent).toEqual([raw])
    expect(b.sent).toEqual([raw])
    expect(pad.sent).toEqual([])
  })

  it('drops a feed from a socket that is not a registered display', async () => {
    const pad = join('pad'), mirror = viewer('mirror')
    expect(await say(pad, 'mirror-state', { code: 'void main(){}' })).toBe('drop')
    expect(await say(pad, 'mirror-frame', { t: 0, f: {} })).toBe('drop')
    expect(mirror.sent).toEqual([])
  })

  it('in a locked room, takes the feed only from a display that proved the secret', async () => {
    const control = roomSecretControl({ ctx, hub, lock, room: 'r', relayHost: 'relay.beadfamous.com' })
    const { link } = await control.rotate()
    const secret = new URLSearchParams(new URL(link).hash.slice(1)).get('display_secret')
    const impostor = join('impostor'), tv = join('tv'), mirror = viewer('mirror')
    expect(await hello(impostor)).toBe('refused')
    expect(await say(impostor, 'mirror-frame', { t: 0, f: { knob_1: 1 } })).toBe('drop')
    expect(await hello(tv, { displaySecret: secret })).toBe('hub')
    expect(await say(tv, 'mirror-frame', { t: 0, f: { knob_1: 0.5 } })).toBe('mirror')
    expect(mirror.sent.map((t) => JSON.parse(t).data.f)).toEqual([{ knob_1: 0.5 }])
  })
})

describe('board mirror: the room counts viewers apart', () => {
  it('leaves viewers out of connectedClients and counts them as viewers', () => {
    join('tv'); join('pad'); viewer('a'); viewer('b'); viewer('c')
    expect(roomCounts(ctx)).toEqual({ connectedClients: 2, viewers: 3 })
  })
})
