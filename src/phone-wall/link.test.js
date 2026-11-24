import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLink, HELLO_MS, PEER_TTL_MS } from './link.js'
import { createPadClient, mountPhoneWall, TO_WALL, TO_BOTH } from './pad.js'
import { createWallClient, FROM_PAD } from './wall.js'
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

const loc = (search) => ({ search, protocol: 'https:', host: 'visuals.beadfamous.com', hash: '' })

// One relay room: what a member sends, every other member hears, as the broker relays it verbatim.
const makeRoom = () => {
  const members = []
  const make = (onMessage) => {
    const me = {
      connect: () => {},
      disconnect: () => {},
      send: (type, data, extra) => {
        const text = JSON.stringify({ ...extra, type, data })
        for (const m of members) if (m !== me) m.onMessage(JSON.parse(text))
        return true
      },
      isConnected: true,
      url: 'ws://relay/ws/r',
      onMessage,
    }
    members.push(me)
    return me
  }
  return { make }
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

  it('ignores anything on the channel that is not a link envelope', () => {
    const BC = makeBus()
    const got = []
    const wall = createLink({ role: 'wall', BroadcastChannel: BC, onMessage: (m) => got.push(m) }).start()
    const stranger = new BC('cranes-phone-wall')
    stranger.postMessage({ from: 'x', role: 'pad', n: 1, msg: { type: 'vj-keep', data: {} } })
    stranger.postMessage({ pw: 2, from: 'y', role: 'pad', n: 1, msg: { type: 'vj-keep', data: {} } })
    expect(wall.linked).toBe(false)
    expect(got).toEqual([])
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
  it('routes display-bound messages to a linked wall, and to the room only while it is up; bank claims to the room', () => {
    const BC = makeBus()
    const sock = fakeSocket()
    const wallGot = []
    const pad = createPadClient(() => {}, () => {}, { loc: loc('?room=r'), makeSocket: sock.make, BroadcastChannel: BC })
    pad.connect()
    pad.send('update-params', { knob_1: 0.1 })
    expect(sock.sent.map((m) => m.type)).toEqual(['update-params']) // no wall yet: the room

    createLink({ role: 'wall', BroadcastChannel: BC, onMessage: (m) => wallGot.push(m) }).start()
    sock.sent.length = 0
    pad.send('update-params', { knob_1: 0.2 })
    pad.send('vj-panic', {}, { via: 'nfc' })
    pad.send('pad-hello', { pad: 'x' })
    pad.send('vjpad-peer', { id: 'x' })
    expect(wallGot.map(({ pwid, ...m }) => m)).toEqual([
      { type: 'update-params', data: { knob_1: 0.2 } },
      { type: 'vj-panic', data: {}, via: 'nfc' },
      { type: 'pad-hello', data: { pad: 'x' } },
    ])
    expect(new Set(wallGot.map((m) => m.pwid)).size).toBe(3)
    // This room socket is down: no per-frame "not connected" warning for the moves.
    expect(sock.sent.map((m) => m.type)).toEqual(['vjpad-peer'])
  })

  it('opens no socket on a static host with no room; a room or the dev server gets one', () => {
    // Production with no room= used to retry wss://visuals.beadfamous.com/ws, a static host that
    // answers 200: a console error every few seconds for the whole show, and battery.
    const made = []
    const makeSocket = (...a) => (made.push(a), fakeSocket().make(...a))
    const pad = createPadClient(() => {}, () => {}, { loc: loc(''), makeSocket, BroadcastChannel: makeBus() })
    pad.connect()
    expect(made).toEqual([])
    expect(pad.send('update-params', { knob_1: 0.1 })).toBe(false)
    expect(pad.isConnected).toBe(false)
    pad.disconnect()
    createPadClient(() => {}, () => {}, { loc: loc('?room=abc'), makeSocket, BroadcastChannel: makeBus() })
    createPadClient(() => {}, () => {}, { loc: loc(''), dev: true, makeSocket, BroadcastChannel: makeBus() })
    expect(made.length).toBe(2)
  })

  it('reports connected while a wall is linked even with no room socket', () => {
    const BC = makeBus()
    const statuses = []
    const pad = createPadClient(() => {}, (s) => statuses.push(s), { loc: loc('?room=r'), makeSocket: fakeSocket().make, BroadcastChannel: BC })
    pad.connect()
    const wall = createLink({ role: 'wall', BroadcastChannel: BC }).start()
    expect(pad.isConnected).toBe(true)
    wall.stop()
    expect(statuses).toEqual(['connected', 'reconnecting'])
  })
})

describe('wall client', () => {
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

  it('acts only on what a pad sends: the broker\'s inspect, welcome and rekey never cross the link', () => {
    const BC = makeBus()
    const got = []
    const wall = createWallClient((m) => got.push(m.type), () => {}, { loc: loc('?wall=1'), nav: {}, BroadcastChannel: BC })
    wall.connect()
    // Any same-origin page can post to the channel claiming to be a pad.
    const forger = createLink({ role: 'pad', BroadcastChannel: BC }).start()
    for (const type of ['inspect', 'display-welcome', 'display-refused', 'display-rekey', 'vj-agent-shader', 'vjpad-peer', 'update-params', 'vj-keep']) forger.send({ type, data: {} })
    expect(got).toEqual(['update-params', 'vj-keep'])
    expect(wall.stats.fromLink).toBe(2)
    // Whatever pad.js routes to a wall, the wall takes, and nothing else.
    expect([...FROM_PAD].sort()).toEqual([...TO_WALL, ...TO_BOTH].sort())
    wall.disconnect()
    forger.stop()
  })

  it('a fresh wall takes the pad\'s whole state; a second pad page linking mid-set does not reset it', () => {
    const BC = makeBus()
    const got = []
    const wall = createWallClient((m) => m.type === 'update-params' && got.push(m.data), () => {}, { loc: loc('?wall=1&shader=a'), nav: {}, BroadcastChannel: BC })
    wall.connect()
    const mountPad = (state) => {
      const client = createPadClient(() => {}, () => {}, { makeSocket: fakeSocket().make, BroadcastChannel: BC })
      mountPhoneWall({ client, host: null, getShader: () => 'a', getState: () => state, loc: loc(''), win: {} })
      client.connect()
      return client
    }
    const first = mountPad({ knob_1: 0.9 })
    vi.advanceTimersByTime(HELLO_MS)
    expect(got).toEqual([{ knob_1: 0.9 }])
    // The NFC fallback tab, or the pad reloaded: its own defaults must not land on the wall.
    const second = mountPad({ knob_1: 0.2 })
    vi.advanceTimersByTime(HELLO_MS * 3)
    expect(got).toEqual([{ knob_1: 0.9 }])
    expect(second.link.linked).toBe(true)
    first.disconnect(); second.disconnect(); wall.disconnect()
  })

  it('a linked wall does not starve the room: another display gets every move, and the wall acts on each once', () => {
    const BC = makeBus()
    const room = makeRoom()
    const wallGot = []
    const otherGot = []
    const wall = createWallClient((m) => wallGot.push(m.type), () => {}, { loc: loc('?wall=1&room=r'), nav: {}, BroadcastChannel: BC, makeSocket: room.make })
    wall.connect()
    room.make((m) => otherGot.push(m.type)) // a second display in the same room
    const pad = createPadClient(() => {}, () => {}, { loc: loc('?room=r'), makeSocket: room.make, BroadcastChannel: BC })
    pad.connect()
    expect(pad.link.linked).toBe(true)
    pad.send('update-params', { knob_1: 0.3 })
    pad.send('vj-keep', {})
    pad.send('vj-panic', {}, { via: 'nfc' })
    pad.send('proposal-answer', { id: 'a', take: true })
    const moves = ['update-params', 'vj-keep', 'vj-panic', 'proposal-answer']
    expect(otherGot).toEqual(moves)
    expect(wallGot.filter((t) => t !== 'pad-hello')).toEqual(moves)
    pad.disconnect(); wall.disconnect()
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
