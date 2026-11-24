import { describe, it, expect } from 'vitest'
import { createMidiActions, parseBinding } from './MidiActions.js'

const store = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }
}
const cc = (n, v, ch = 1) => [0xb0 + ch - 1, n, v]
const noteOn = (n, v = 100, ch = 1) => [0x90 + ch - 1, n, v]

describe('MIDI PANIC / KEEP bindings', () => {
  it('parses cc:N, note:N and an optional channel, refusing junk', () => {
    expect(parseBinding('cc:64')).toEqual({ kind: 'cc', number: 64 })
    expect(parseBinding('note:36:10')).toEqual({ kind: 'note', number: 36, channel: 10 })
    expect(parseBinding('cc:200')).toBeNull()
    expect(parseBinding('pitch:1')).toBeNull()
  })

  it('a URL binding fires once per press, swallows its release, and persists across loads', () => {
    const storage = store()
    const a = createMidiActions({ search: '?midi_panic=cc:64&midi_keep=note:36', storage })
    expect(a.handle(cc(64, 127))).toEqual({ action: 'panic' })
    expect(a.handle(cc(64, 120))).toEqual({ consumed: true }) // still held: no second PANIC
    expect(a.handle(cc(64, 0))).toEqual({ consumed: true })
    expect(a.handle(cc(64, 127))).toEqual({ action: 'panic' })
    expect(a.handle(noteOn(36))).toEqual({ action: 'keep' })
    expect(a.handle(noteOn(36, 0))).toEqual({ consumed: true })
    const again = createMidiActions({ search: '', storage })
    expect(again.handle(noteOn(36))).toEqual({ action: 'keep' })
  })

  it('leaves every other control to the knob mapper', () => {
    const a = createMidiActions({ search: '?midi_panic=cc:64:2', storage: store() })
    expect(a.handle(cc(64, 127, 1))).toBeNull() // other channel
    expect(a.handle(cc(10, 127))).toBeNull()
    expect(a.handle(cc(64, 127, 2))).toEqual({ action: 'panic' })
  })

  it('learn binds the next pressed control', () => {
    const a = createMidiActions({ storage: store() })
    a.learn('keep')
    expect(a.handle(cc(20, 10))).toBeNull() // a knob turning low is not a press; it stays a knob
    expect(a.handle(cc(20, 127))).toEqual({ consumed: true })
    expect(a.bindings.keep).toEqual({ kind: 'cc', number: 20, channel: 1 })
    expect(a.handle(cc(20, 0))).toEqual({ consumed: true })
    expect(a.handle(cc(20, 127))).toEqual({ action: 'keep' })
  })
})
