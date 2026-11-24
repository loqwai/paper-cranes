import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMidiMapper } from './MidiMapper.js'

const KEY = 'cranes-midi-profiles'
const memory = new Map()

describe('MidiMapper stored profiles', () => {
  beforeEach(() => {
    memory.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, String(value)),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('keeps a well-formed mapping', () => {
    memory.set(KEY, JSON.stringify({ version: 1, profiles: { Pad: { deviceName: 'Pad', mappings: { 7: 3 } } } }))
    expect(createMidiMapper().mapCCToKnob('Pad', 7, 1)).toBe('knob_3')
  })

  it.each([
    ['a profile with no mappings', { version: 1, profiles: { Pad: { deviceName: 'Pad' } } }],
    ['a null profile', { version: 1, profiles: { Pad: null } }],
    ['null profiles', { version: 1, profiles: null }],
    ['profiles as a list', { version: 1, profiles: [] }],
  ])('still maps knobs when storage holds %s', (_, stored) => {
    memory.set(KEY, JSON.stringify(stored))
    const mapper = createMidiMapper()
    expect(mapper.mapCCToKnob('Pad', 7, 1)).toBe(null)
    expect(mapper.autoAssign('Pad', 7, 1)).toBe('knob_1')
    expect(mapper.mapCCToKnob('Pad', 7, 1)).toBe('knob_1')
    expect(Object.values(mapper.getAllProfiles()).every((profile) => profile.mappings)).toBe(true)
  })
})
