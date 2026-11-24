import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMidiMapper } from './MidiMapper.js'

const KEY = 'cranes-midi-profiles'
const memory = new Map()

beforeEach(() => {
  memory.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('MidiMapper stored profiles', () => {
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

describe('MidiMapper across tabs', () => {
  it('keeps a mapping made in /midi.html when the open show page auto-assigns a new CC', async () => {
    const show = createMidiMapper() // the jam/show page, loaded first
    show.autoAssign('Twister', 1, 1) // CC1 -> knob_1

    const page = createMidiMapper() // /midi.html in another tab
    const learned = page.startLearn(42)
    page.handleLearnCC('Twister', 7, 1) // CC7 -> knob_42
    await learned

    show.autoAssign('Twister', 2, 1) // the show page sees a new CC and saves its profiles

    const fresh = createMidiMapper()
    expect(fresh.mapCCToKnob('Twister', 7, 1)).toBe('knob_42')
    expect(fresh.mapCCToKnob('Twister', 2, 1)).toBe('knob_2')
  })

  it('does not resurrect a profile deleted in another tab', () => {
    const show = createMidiMapper()
    show.autoAssign('Old Pad', 1, 1)
    createMidiMapper().deleteProfile('Old Pad')
    show.autoAssign('Twister', 1, 1)
    expect(createMidiMapper().getProfile('Old Pad')).toBeNull()
  })
})
