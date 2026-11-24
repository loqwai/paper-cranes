// The page half of the live show (docs/live-show-contract.md), driven the way RemoteDisplay drives it.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLiveShow } from './live.js'

let applied, signals, sent, swaps, snaps
const make = (opts = {}) => createLiveShow({
  apply: (d) => applied.push(d),
  post: (s) => signals.push(s),
  broadcast: (type, data) => sent.push({ type, data }),
  swap: async (fork) => { swaps.push(fork) },
  snapshot: async () => { snaps.push(1) },
  state: () => ({ shader: 'clit-set/2-wip', params: { knob_1: 0.5 } }),
  bootFork: 'clit-set/2',
  ...opts,
})
const types = () => signals.map((s) => s.type)

beforeEach(() => {
  vi.useFakeTimers()
  applied = []; signals = []; sent = []; swaps = []; snaps = []
})
afterEach(() => vi.useRealTimers())

describe('HANDS lock', () => {
  it('an agent write lands at once while his hands are off', () => {
    const live = make()
    expect(live.fromAgent({ knob_3: 0.9 })).toEqual({ held: false })
    expect(applied).toEqual([{ knob_3: 0.9 }])
  })

  it('his dial turns HANDS on, holds agent writes newest-wins, and applies them 8 s after the last move', () => {
    const live = make()
    live.fromHands({ knob_1: 0.2 })
    expect(signals[0]).toEqual({ type: 'hands', on: true, knob: 'knob_1' })
    expect(live.fromAgent({ knob_3: 0.1, knob_4: 0.4 })).toEqual({ held: true })
    expect(live.fromAgent({ knob_3: 0.9 })).toEqual({ held: true })
    expect(applied).toEqual([])
    vi.advanceTimersByTime(5000)
    live.fromHands({ knob_1: 0.3 }) // still turning: the 8 s restarts
    vi.advanceTimersByTime(7999)
    expect(live.handsOn).toBe(true)
    expect(applied).toEqual([])
    vi.advanceTimersByTime(1)
    expect(live.handsOn).toBe(false)
    expect(applied).toEqual([{ knob_3: 0.9, knob_4: 0.4 }])
    expect(signals.at(-1)).toEqual({ type: 'hands', on: false, knob: null, idleMs: 8000 })
  })

  it('never applies a shader write mid-lock, and a newer shader write replaces a held one', () => {
    const live = make({ handsMs: 300 })
    live.fromHands({ knob_2: 1 })
    live.fromAgent({ shaderCode: 'void main(){}' })
    live.fromAgent({ shader: 'sun/7' })
    vi.advanceTimersByTime(299)
    expect(applied).toEqual([])
    vi.advanceTimersByTime(1)
    expect(applied).toEqual([{ shader: 'sun/7' }])
  })

  it('measures the lock from his last move, and says so when a blocked main thread fires it late', () => {
    let clock = 0
    let fire
    const live = make({ now: () => clock, setTimer: (fn, ms) => { if (ms >= 1000) fire = fn; return 1 } }) // the HANDS timer only
    live.fromHands({ knob_1: 0.2 })
    clock = 3000; live.fromHands({ knob_1: 0.3 }) // the last move
    clock = 8000; fire() // the first timer: only 5 s since the last move, so it re-arms
    expect(live.handsOn).toBe(true)
    clock = 11200; fire() // fired late: a 3.2 s frame was in the way
    expect(signals.at(-1)).toEqual({ type: 'hands', on: false, knob: null, idleMs: 8200 })
  })

  it('applies held writes exactly once: a second lock that holds nothing applies nothing', () => {
    const live = make({ handsMs: 300 })
    live.fromHands({ knob_1: 0.2 })
    live.fromAgent({ knob_3: 0.9 })
    vi.advanceTimersByTime(300)
    live.fromHands({ knob_1: 0.3 })
    vi.advanceTimersByTime(300)
    expect(applied).toEqual([{ knob_3: 0.9 }])
  })

  it('his own later write to a held key wins: the lock\'s end never moves that dial back', () => {
    const live = make({ handsMs: 300 })
    live.fromHands({ knob_1: 0.2 })
    live.fromAgent({ knob_1: 0.9, knob_4: 0.4 })
    live.fromHands({ knob_1: 0.25 }) // he is still on knob_1, after the agent's write
    live.moved('knob_4', 0.7) // MIDI path: RemoteDisplay never sees it
    vi.advanceTimersByTime(300)
    expect(applied).toEqual([])
    expect(live.status().held).toEqual([])
  })

  it('his own shader pick or release mid-lock drops a held agent shader or value for that key', () => {
    const live = make({ handsMs: 300 })
    live.fromHands({ knob_1: 0.2 })
    live.fromAgent({ shaderCode: 'void main(){}', knob_9: 0.5, gain: 2 })
    live.fromHands({ shader: 'his/pick', gain: null })
    vi.advanceTimersByTime(300)
    expect(applied).toEqual([{ knob_9: 0.5 }])
  })

  it('only knob keys count as hands: a LEARN stamp or a release (null) does not lock', () => {
    const live = make()
    live.fromHands({ vjConfirm: 123, knob_5: null })
    expect(live.handsOn).toBe(false)
    expect(signals).toEqual([])
  })

  it('emits release ~50 ms after a dial goes still, once per gesture', () => {
    const live = make()
    live.fromHands({ knob_7: 0.1 })
    vi.advanceTimersByTime(30)
    live.fromHands({ knob_7: 0.6 })
    vi.advanceTimersByTime(49)
    expect(types()).not.toContain('release')
    vi.advanceTimersByTime(1)
    expect(signals.filter((s) => s.type === 'release')).toEqual([{ type: 'release', knob: 'knob_7', value: 0.6 }])
  })
})

describe('proposals', () => {
  it('a proposal is broadcast to the pads; KEEP applies it unheld and emits proposal-taken', () => {
    const live = make()
    live.fromHands({ knob_1: 0.2 }) // even mid-lock: KEEP is his own press
    live.onMessage({ type: 'vj-propose', data: { id: 'p1', label: 'k9 to max?', params: { knob_9: 1 } } })
    expect(sent[0]).toMatchObject({ type: 'proposal', data: { id: 'p1', label: 'k9 to max?', params: { knob_9: 1 } } })
    live.onMessage({ type: 'proposal-answer', data: { id: 'p1', take: true } })
    expect(applied).toEqual([{ knob_9: 1 }])
    expect(signals.at(-1)).toEqual({ type: 'proposal-taken', id: 'p1' })
    expect(sent.at(-1)).toEqual({ type: 'proposal-clear', data: { id: 'p1', why: 'taken' } })
  })

  it('dismiss, timeout (30 s) and a repeated id each drop with their reason', () => {
    const live = make()
    live.propose({ id: 'a', label: 'a', params: { knob_1: 1 } })
    live.answer({ id: 'a', take: false })
    live.propose({ id: 'b', label: 'b', params: {} })
    live.propose({ id: 'b', label: 'b2', params: {} })
    vi.advanceTimersByTime(30000)
    expect(signals.filter((s) => s.type === 'proposal-dropped')).toEqual([
      { type: 'proposal-dropped', id: 'a', why: 'dismissed' },
      { type: 'proposal-dropped', id: 'b', why: 'replaced' },
      { type: 'proposal-dropped', id: 'b', why: 'timeout' },
    ])
    expect(applied).toEqual([])
  })

  it('a display ignores another display\'s proposal broadcast (no echo loop)', () => {
    const live = make()
    expect(live.onMessage({ type: 'proposal', data: { id: 'x', label: 'x', params: {} } })).toBe(false)
    expect(sent).toEqual([])
  })
})

describe('KEEP and PANIC', () => {
  it('KEEP emits what is on screen and saves a snapshot', async () => {
    const live = make()
    live.onMessage({ type: 'vj-keep', data: {} })
    await vi.runAllTimersAsync()
    expect(signals[0]).toMatchObject({ type: 'keep', shader: 'clit-set/2-wip', params: { knob_1: 0.5 } })
    expect(typeof signals[0].t).toBe('string')
    expect(snaps).toEqual([1])
  })

  it('PANIC swaps to the boot fork, drops held writes and open proposals', async () => {
    const live = make()
    live.fromHands({ knob_1: 0.2 })
    live.fromAgent({ shader: 'bad/1', knob_2: 1 })
    live.propose({ id: 'p', label: 'p', params: { knob_3: 1 } })
    await live.panic()
    expect(swaps).toEqual(['clit-set/2'])
    expect(signals).toContainEqual({ type: 'panic', fork: 'clit-set/2' })
    expect(signals).toContainEqual({ type: 'proposal-dropped', id: 'p', why: 'panic' })
    vi.advanceTimersByTime(8000)
    expect(applied).toEqual([])
  })

  it('a PANIC fork from the room must be a shader name; anything else falls back to the boot fork', async () => {
    const live = make()
    for (const fork of ['https://evil.example/x', '../../etc/passwd', '//evil.example/x', 42]) live.onMessage({ type: 'vj-panic', data: { fork } })
    live.onMessage({ type: 'vj-panic', data: { fork: 'sun/7.frag' } })
    await vi.advanceTimersByTimeAsync(0)
    expect(swaps).toEqual(['clit-set/2', 'clit-set/2', 'clit-set/2', 'clit-set/2', 'sun/7'])
  })

  it('PANIC to a named fork overrides the boot fork', async () => {
    const live = make()
    live.onMessage({ type: 'vj-panic', data: { fork: 'sun/7' } })
    await vi.runAllTimersAsync()
    expect(swaps).toEqual(['sun/7'])
  })
})

describe('pad-alive', () => {
  it('true on the first pad, false once the last has been silent more than 5 s', () => {
    const live = make()
    live.onMessage({ type: 'pad-hello', data: { pad: 'a' } })
    live.onMessage({ type: 'pad-hello', data: { pad: 'b' } })
    expect(signals).toEqual([{ type: 'pad-alive', alive: true, pads: 1 }])
    for (let i = 0; i < 4; i++) { vi.advanceTimersByTime(2000); live.padHello({ pad: 'a' }) }
    expect(signals).toHaveLength(1)
    vi.advanceTimersByTime(7000)
    expect(signals.at(-1)).toEqual({ type: 'pad-alive', alive: false, pads: 0 })
  })

  it('a pad that joins late is sent the open proposal cards', () => {
    const live = make()
    live.propose({ id: 'p', label: 'p', params: {} })
    sent.length = 0
    live.padHello({ pad: 'late' })
    expect(sent).toMatchObject([{ type: 'proposal', data: { id: 'p' } }])
  })
})
