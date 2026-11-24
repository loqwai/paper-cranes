import { describe, it, expect } from 'vitest'
import { createMirrorFeed, frameUniforms, namesIn } from './mirrorFeed.js'

const SHADER = 'uniform float knob_1;\nvoid main(){ fragColor = vec4(bassNormalized * knob_1, beat ? 1.0 : 0.0, touch.x, 1.0); }'

const fakeTimers = () => {
  const live = new Set()
  return {
    live,
    setInterval: (fn) => { const t = { fn }; live.add(t); return t },
    clearInterval: (t) => live.delete(t),
    tick: () => [...live].forEach((t) => t.fn()),
  }
}

const harness = () => {
  const sent = []
  const clock = { at: 1000 }
  const wall = { code: SHADER, shader: 'plasma', last: { time: 12.345678, features: { bassNormalized: 0.123456789, knob_1: 0.5, knob_2: 0.9, beat: true, touch: [0.1, 0.2], spectralFlux: 3, label: 'x' } } }
  const timers = fakeTimers()
  const feed = createMirrorFeed({ send: (type, data) => sent.push({ type, data }), read: () => wall, now: () => clock.at, ...timers })
  return { sent, wall, timers, feed, clock, typesSent: () => sent.map((m) => m.type) }
}

describe('mirror feed: what a frame carries', () => {
  it('keeps only the uniforms the shader names, rounded, and no strings', () => {
    const f = frameUniforms({ bassNormalized: 0.123456789, knob_1: 0.5, knob_2: 0.9, beat: true, touch: [0.1, 0.2], label: 'x' }, namesIn(SHADER))
    expect(f).toEqual({ bassNormalized: 0.1235, knob_1: 0.5, beat: true, touch: [0.1, 0.2] })
  })

  it('drops NaN and Infinity, which JSON would turn into null', () => {
    expect(frameUniforms({ knob_1: NaN, bassNormalized: Infinity }, namesIn(SHADER))).toEqual({})
  })
})

describe('mirror feed: runs only while someone watches', () => {
  it('sends nothing with no viewers', () => {
    const { feed, sent, timers } = harness()
    feed.viewers(0)
    feed.viewers(undefined) // a relay that predates mirrors
    timers.tick()
    expect(sent).toEqual([])
    expect(feed.running()).toBe(false)
  })

  it('starts with the shader, then sends frames, and stops when the last viewer leaves', () => {
    const { feed, sent, timers, typesSent } = harness()
    feed.viewers(1)
    timers.tick()
    timers.tick()
    expect(typesSent()).toEqual(['mirror-state', 'mirror-frame', 'mirror-frame'])
    expect(sent[0].data).toEqual({ code: SHADER, shader: 'plasma', fullscreen: false })
    expect(sent[1].data).toEqual({ t: 12.3457, f: { bassNormalized: 0.1235, knob_1: 0.5, beat: true, touch: [0.1, 0.2] }, sent: 1000 })
    feed.viewers(0)
    expect(timers.live.size).toBe(0)
  })

  it('sends the shader again when a second viewer joins, and when the wall changes shader', () => {
    const { feed, wall, timers, clock, typesSent } = harness()
    feed.viewers(1)
    clock.at += 1000
    feed.viewers(2)
    wall.code = 'void main(){ fragColor = vec4(trebleNormalized); }'
    wall.last.features.trebleNormalized = 0.75
    timers.tick()
    expect(typesSent()).toEqual(['mirror-state', 'mirror-state', 'mirror-state', 'mirror-frame'])
    expect(feed.running()).toBe(true)
  })

  it('answers a crowd of joins with one shader resend a second, not one per join', () => {
    const { feed, timers, clock, typesSent } = harness()
    feed.viewers(1)
    for (let n = 2; n <= 30; n++) feed.viewers(n)
    timers.tick()
    expect(typesSent().filter((t) => t === 'mirror-state')).toHaveLength(1)
    clock.at += 1000
    timers.tick()
    timers.tick()
    expect(typesSent().filter((t) => t === 'mirror-state')).toHaveLength(2)
  })
})
