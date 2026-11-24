import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLink, HELLO_MS, PEER_TTL_MS } from './link.js'
import { createPadClient } from './pad.js'
import { createWallClient } from './wall.js'
import { wallUrlFor } from './project.js'

// One in-memory "browser": every channel of the same name hears every other one, synchronously.
const makeBus = () => {
  const members = []
  class FakeChannel {
    static members = members
    constructor(name) { this.name = name; members.push(this) }
    postMessage(data) {
      if (this.unplugged) return
      for (const m of members) if (m !== this && m.name === this.name && m.onmessage) m.onmessage({ data: structuredClone(data) })
    }
    close() { members.splice(members.indexOf(this), 1) }
  }
  return FakeChannel
}

// A PresentationConnection pair: what one side sends, the other's listeners hear.
const makeConnectionPair = () => {
  const side = () => {
    const listeners = {}
    return {
      state: 'connected',
      id: 'p1',
      listeners,
      addEventListener: (t, fn) => { (listeners[t] ??= []).push(fn) },
      fire: (t, e = {}) => (listeners[t] ?? []).forEach((fn) => fn(e)),
    }
  }
  const a = side()
  const b = side()
  a.send = (s) => b.fire('message', { data: s })
  b.send = (s) => a.fire('message', { data: s })
  const close = () => { a.state = b.state = 'closed'; a.fire('close'); b.fire('close') }
  return { a, b, close }
}

const fakeSocket = () => {
  const sent = []
  return {
    sent,
    make: (onMessage, onStatus) => ({
      connect: () => {},
      disconnect: () => {},
      send: (type, data, extra) => { sent.push({ ...extra, type, data }); return true },
      isConnected: false,
      url: 'ws://x/ws',
      onMessage,
      onStatus,
    }),
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('local link', () => {
  it('a pad and a wall find each other and carry room-style messages', () => {
    const BC = makeBus()
    const got = []
    const pad = createLink({ role: 'pad', BroadcastChannel: BC }).start()
    const wall = createLink({ role: 'wall', BroadcastChannel: BC, onMessage: (m) => got.push(m), info: () => ({ boot: 'b1' }) }).start()
    vi.advanceTimersByTime(HELLO_MS)
    expect(pad.linked).toBe(true)
    expect(pad.peers[0]).toMatchObject({ info: { boot: 'b1' }, via: 'channel' })
    pad.send({ type: 'update-params', data: { knob_1: 0.4 } })
    expect(got).toEqual([{ type: 'update-params', data: { knob_1: 0.4 } }])
  })

  it('two pads never hear each other, and a wall never hears another wall', () => {
    const BC = makeBus()
    const heard = []
    const a = createLink({ role: 'pad', BroadcastChannel: BC, onMessage: (m) => heard.push(m) }).start()
    const b = createLink({ role: 'pad', BroadcastChannel: BC, onMessage: (m) => heard.push(m) }).start()
    vi.advanceTimersByTime(HELLO_MS * 3)
    expect(a.linked).toBe(false)
    expect(b.send({ type: 'update-params', data: {} })).toBe(false)
    expect(heard).toEqual([])
  })

  it('a wall that goes quiet is gone after the TTL; one that says bye is gone at once', () => {
    const BC = makeBus()
    const peers = []
    const pad = createLink({ role: 'pad', BroadcastChannel: BC, onPeers: (p) => peers.push(p.length) }).start()
    const wall = createLink({ role: 'wall', BroadcastChannel: BC }).start()
    expect(pad.linked).toBe(true)
    wall.stop()
    expect(pad.linked).toBe(false) // bye

    const wall2 = createLink({ role: 'wall', BroadcastChannel: BC }).start()
    expect(pad.linked).toBe(true)
    // Silence it with no bye, as a pulled cable or a killed tab does: its posts stop arriving.
    BC.members.at(-1).unplugged = true
    vi.advanceTimersByTime(PEER_TTL_MS - HELLO_MS)
    expect(pad.linked).toBe(true)
    vi.advanceTimersByTime(HELLO_MS * 2)
    expect(pad.linked).toBe(false)
    expect(peers).toEqual([1, 0, 1, 0])
    // Replugged: the same wall's next hello links it again.
    BC.members.at(-1).unplugged = false
    vi.advanceTimersByTime(HELLO_MS)
    expect(pad.linked).toBe(true)
    void wall2
  })

  it('a message reaching a peer over two ports is acted on once', () => {
    const BC = makeBus()
    const got = []
    const pad = createLink({ role: 'pad', BroadcastChannel: BC }).start()
    const wall = createLink({ role: 'wall', BroadcastChannel: BC, onMessage: (m) => got.push(m.type) }).start()
    const { a, b } = makeConnectionPair()
    pad.attach(a)
    wall.attach(b)
    pad.send({ type: 'vj-keep', data: {} })
    expect(got).toEqual(['vj-keep'])
  })

  it('works over a PresentationConnection alone, and a close is a lost wall at once', () => {
    const got = []
    const pad = createLink({ role: 'pad', BroadcastChannel: null }).start()
    const wall = createLink({ role: 'wall', BroadcastChannel: null, onMessage: (m) => got.push(m.type) }).start()
    const { a, b, close } = makeConnectionPair()
    wall.attach(b)
    pad.attach(a)
    expect(pad.linked).toBe(true)
    expect(pad.peers[0].via).toBe('presentation')
    pad.send({ type: 'vj-panic', data: {} })
    expect(got).toEqual(['vj-panic'])
    close()
    expect(pad.linked).toBe(false)
  })
})

describe('pad client', () => {
  it('routes display-bound messages to a linked wall only, bank claims to the room only', () => {
    const BC = makeBus()
    const sock = fakeSocket()
    const wallGot = []
    const pad = createPadClient(() => {}, () => {}, { makeSocket: sock.make, BroadcastChannel: BC })
    pad.connect()
    pad.send('update-params', { knob_1: 0.1 })
    expect(sock.sent.map((m) => m.type)).toEqual(['update-params']) // no wall yet: the room

    createLink({ role: 'wall', BroadcastChannel: BC, onMessage: (m) => wallGot.push(m) }).start()
    sock.sent.length = 0
    pad.send('update-params', { knob_1: 0.2 })
    pad.send('vj-panic', {}, { via: 'nfc' })
    pad.send('pad-hello', { pad: 'x' })
    pad.send('vjpad-peer', { id: 'x' })
    expect(wallGot).toEqual([
      { type: 'update-params', data: { knob_1: 0.2 } },
      { type: 'vj-panic', data: {}, via: 'nfc' },
      { type: 'pad-hello', data: { pad: 'x' } },
    ])
    expect(sock.sent.map((m) => m.type)).toEqual(['pad-hello', 'vjpad-peer'])
  })

  it('reports connected while a wall is linked even with no room socket', () => {
    const BC = makeBus()
    const statuses = []
    const pad = createPadClient(() => {}, (s) => statuses.push(s), { makeSocket: fakeSocket().make, BroadcastChannel: BC })
    pad.connect()
    const wall = createLink({ role: 'wall', BroadcastChannel: BC }).start()
    expect(pad.isConnected).toBe(true)
    wall.stop()
    expect(statuses).toEqual(['connected', 'reconnecting'])
  })
})

describe('wall client', () => {
  const loc = (search) => ({ search, protocol: 'https:', host: 'visuals.beadfamous.com', hash: '' })

  it('opens no socket on a static host with no room, and tells pads only what pads use', () => {
    const BC = makeBus()
    const padGot = []
    const made = []
    const link = createLink({ role: 'wall', BroadcastChannel: BC, info: () => ({ boot: 'w' }) })
    const wall = createWallClient(() => {}, () => {}, { loc: loc('?wall=1'), nav: {}, link, makeSocket: (...a) => made.push(a) })
    wall.connect()
    expect(made).toEqual([])
    createLink({ role: 'pad', BroadcastChannel: BC, onMessage: (m) => padGot.push(m.type) }).start()
    wall.send('proposal', { id: 'a' })
    wall.send('display-shot', { png: 'x'.repeat(10) })
    expect(padGot).toEqual(['proposal'])
  })

  it('opens the room socket when the link has a room', () => {
    const made = []
    createWallClient(() => {}, () => {}, { loc: loc('?wall=1&room=abc'), nav: {}, link: createLink({ role: 'wall', BroadcastChannel: null }), makeSocket: (...a) => (made.push(a), fakeSocket().make(...a)) })
    expect(made.length).toBe(1)
  })
})

describe('wallUrlFor', () => {
  const loc = { protocol: 'https:', host: 'visuals.beadfamous.com', search: '?room=r1&shader=ignored&knob_3=0.2&audio_file=a.mp3&wall_url=https://evil.example/x', hash: '#display_secret=s3' }

  it('builds a same-origin display link with the room, the audio and the secret, never a foreign wall_url', () => {
    const u = new URL(wallUrlFor(loc, { shader: 'clit/2' }))
    expect(u.origin).toBe('https://visuals.beadfamous.com')
    expect(u.pathname).toBe('/')
    expect(Object.fromEntries(u.searchParams)).toEqual({ room: 'r1', audio_file: 'a.mp3', shader: 'clit/2', remote: 'display', wall: '1' })
    expect(u.hash).toBe('#display_secret=s3')
  })

  it('takes a same-origin wall_url, keeping its own shader', () => {
    const u = new URL(wallUrlFor({ ...loc, search: '?wall_url=%2Fshow.html%3Fshader%3Dsun', hash: '' }, { shader: 'other' }))
    expect(u.pathname).toBe('/show.html')
    expect(u.searchParams.get('shader')).toBe('sun')
    expect(u.searchParams.get('wall')).toBe('1')
  })
})
