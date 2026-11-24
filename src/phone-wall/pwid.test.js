// The `pwid` tag lets the wall and the pad act once on a message they hear over the local link and
// the room both. A room peer sees every pwid the pad sends there and can send any message with any
// pwid, so the tag must never let a peer suppress a message that arrives over the link.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPadClient } from './pad.js'
import { createWallClient } from './wall.js'

const makeBus = () => {
  const members = []
  class FakeChannel {
    constructor(name) { this.name = name; members.push(this) }
    postMessage(data) { for (const m of members) if (m !== this && m.name === this.name && m.onmessage) m.onmessage({ data: structuredClone(data) }) }
    close() { members.splice(members.indexOf(this), 1) }
  }
  return FakeChannel
}
const loc = (search) => ({ search, protocol: 'https:', host: 'visuals.beadfamous.com', hash: '' })
const makeRoom = () => {
  const members = []
  const make = (onMessage) => {
    const me = {
      connect() {},
      disconnect() {},
      isConnected: true,
      url: 'ws://relay/ws/r',
      onMessage,
      send(type, data, extra) {
        const text = JSON.stringify({ ...extra, type, data })
        for (const m of members) if (m !== me) m.onMessage(JSON.parse(text))
        return true
      },
    }
    members.push(me)
    return me
  }
  return { make }
}
const nextIds = (pwid, count) => {
  const cut = pwid.lastIndexOf('.')
  const id = pwid.slice(0, cut)
  const n = Number(pwid.slice(cut + 1))
  return Array.from({ length: count }, (_, i) => `${id}.${n + 1 + i}`)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('pwid from a room peer', () => {
  const rig = () => {
    const BC = makeBus()
    const room = makeRoom()
    const wallGot = []
    const padGot = []
    const peerSaw = []
    const wall = createWallClient((m) => wallGot.push(m), () => {}, { loc: loc('?wall=1&room=r'), nav: {}, BroadcastChannel: BC, makeSocket: room.make })
    wall.connect()
    const peer = room.make((m) => peerSaw.push(m))
    const pad = createPadClient((m) => padGot.push(m), () => {}, { loc: loc('?room=r'), makeSocket: room.make, BroadcastChannel: BC })
    pad.connect()
    return { wall, pad, peer, wallGot, padGot, peerSaw }
  }

  it("cannot suppress the pad's next PANIC or knob move by pre-sending its pwids", () => {
    const { pad, peer, wallGot, peerSaw } = rig()
    pad.send('update-params', { knob_1: 0.3 })
    for (const pwid of nextIds(peerSaw.findLast((m) => m.pwid).pwid, 50)) peer.send('update-params', { knob_9: 0 }, { pwid })
    wallGot.length = 0
    pad.send('vj-panic', {})
    pad.send('update-params', { knob_1: 0.4 })
    expect(wallGot.map((m) => m.type)).toEqual(['vj-panic', 'update-params'])
  })

  it("cannot suppress the wall's next status line to the pad by pre-sending its pwid", () => {
    const { wall, peer, padGot, peerSaw } = rig()
    wall.send('vj-status', { text: 'a' })
    for (const pwid of nextIds(peerSaw.findLast((m) => m.pwid).pwid, 5)) peer.send('vj-status', { text: 'fake' }, { pwid })
    padGot.length = 0
    wall.send('vj-status', { text: 'PANIC -> plasma' })
    expect(padGot.map((m) => m.data.text)).toEqual(['PANIC -> plasma'])
  })

  it('a peer message with an unrelated pwid still reaches the wall, as one without would', () => {
    const { peer, wallGot } = rig()
    wallGot.length = 0
    peer.send('update-params', { knob_2: 0.5 }, { pwid: 'someoneelse.1' })
    peer.send('update-params', { knob_2: 0.6 })
    expect(wallGot.map((m) => m.data.knob_2)).toEqual([0.5, 0.6])
  })
})
