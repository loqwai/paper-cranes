import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMidiMapper } from './MidiMapper.js'

beforeEach(() => {
  const store = {}
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } }
})
afterEach(() => { delete globalThis.localStorage })

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
