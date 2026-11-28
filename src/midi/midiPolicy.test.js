import { describe, expect, it, vi } from 'vitest'
import { isLiveMode, midiStart, onFirstGesture, shouldLoadMidi, startGated } from './midiPolicy.js'

const q = (s) => new URLSearchParams(s)

describe('shouldLoadMidi', () => {
  it.each([
    ['shader=plasma', false],
    ['shader=plasma&midi=true', true],
    ['shader=plasma&remote=display', true],
    ['wall=1', true],
    ['vj=1', true],
    ['remote=control', false],
    ['vj=0', false],
    ['remote=display&midi=false', false],
    ['vj=1&wall=1&midi=false', false],
  ])('index.html ?%s -> %s', (search, want) => expect(shouldLoadMidi(q(search))).toBe(want))

  it('jam and show load it always, unless ?midi=false', () => {
    expect(shouldLoadMidi(q('shader=x'), { always: true })).toBe(true)
    expect(shouldLoadMidi(q('shader=x&midi=false'), { always: true })).toBe(false)
  })
})

describe('midiStart', () => {
  it('asks at load for an explicit ?midi=true or a page that is not a wall', () => {
    expect(midiStart(q('midi=true'))).toBe('now')
    expect(midiStart(q('remote=display&midi=true'))).toBe('now')
    expect(midiStart(q('shader=x'))).toBe('now')
  })

  it('gates a wall', () => {
    for (const s of ['remote=display', 'wall=1', 'vj=1']) {
      expect(isLiveMode(q(s))).toBe(true)
      expect(midiStart(q(s))).toBe('gated')
    }
  })
})

// A navigator whose midi permission is `state`; null means query() rejects (no 'midi' name).
const nav = (state) => {
  const status = state ? { state } : null
  return {
    status,
    requestMIDIAccess: () => {},
    permissions: { query: async ({ name }) => { if (name !== 'midi' || !status) throw new TypeError('no'); return status } },
  }
}

describe('startGated', () => {
  it('connects at once when granted, without waiting for a gesture', async () => {
    const connect = vi.fn(); const onGesture = vi.fn()
    expect(await startGated({ nav: nav('granted'), connect, onGesture })).toBe('connected')
    expect(connect).toHaveBeenCalledTimes(1)
    expect(onGesture).not.toHaveBeenCalled()
  })

  it('waits for the first gesture when the browser would prompt', async () => {
    const connect = vi.fn(); let tap
    expect(await startGated({ nav: nav('prompt'), connect, onGesture: (fn) => { tap = fn } })).toBe('waiting')
    expect(connect).not.toHaveBeenCalled()
    tap(); tap()
    expect(connect).toHaveBeenCalledTimes(1)
  })

  it('connects when the permission is granted later (the show browser over CDP), once', async () => {
    const connect = vi.fn(); let tap
    const n = nav('prompt')
    await startGated({ nav: n, connect, onGesture: (fn) => { tap = fn } })
    n.status.state = 'granted'; n.status.onchange()
    tap()
    expect(connect).toHaveBeenCalledTimes(1)
  })

  it('denied: one console line, no connect, no gesture listener', async () => {
    const connect = vi.fn(); const log = vi.fn(); const onGesture = vi.fn()
    expect(await startGated({ nav: nav('denied'), connect, onGesture, log })).toBe('denied')
    expect(connect).not.toHaveBeenCalled()
    expect(onGesture).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('no Web MIDI (Safari): one console line, no connect', async () => {
    const connect = vi.fn(); const log = vi.fn()
    expect(await startGated({ nav: { permissions: {} }, connect, log })).toBe('unsupported')
    expect(connect).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('a browser that cannot query midi asks on the first gesture', async () => {
    const connect = vi.fn(); let tap
    expect(await startGated({ nav: nav(null), connect, onGesture: (fn) => { tap = fn } })).toBe('waiting')
    expect(connect).not.toHaveBeenCalled()
    tap()
    expect(connect).toHaveBeenCalledTimes(1)
  })
})

describe('onFirstGesture', () => {
  it('fires once and removes its listeners', () => {
    const target = new EventTarget(); const fn = vi.fn()
    onFirstGesture(fn, target)
    target.dispatchEvent(new Event('keydown'))
    target.dispatchEvent(new Event('pointerdown'))
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
