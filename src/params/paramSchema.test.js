import { describe, it, expect } from 'vitest'
import { PARAM_SCHEMA, SETTINGS_ORDER, isKnobValue, isKnobRange, knobsUsedBy, LIVE, RELOAD } from './paramSchema.js'

describe('isKnobValue / isKnobRange', () => {
    it('separates a knob value from its range sidecars', () => {
        expect(isKnobValue('knob_7')).toBe(true)
        expect(isKnobValue('knob_7.min')).toBe(false)
        expect(isKnobRange('knob_7.min')).toBe(true)
        expect(isKnobRange('knob_7.max')).toBe(true)
        expect(isKnobRange('knob_7')).toBe(false)
    })

    it('does not treat other params as knobs', () => {
        for (const key of ['shader', 'knob', 'knobs_3', 'my_knob_3', 'knob_x']) {
            expect(isKnobValue(key)).toBe(false)
            expect(isKnobRange(key)).toBe(false)
        }
    })
})

describe('knobsUsedBy', () => {
    it('finds declared knob uniforms', () => {
        expect(knobsUsedBy('uniform float knob_3;\nuniform float knob_71;')).toEqual([3, 71])
    })

    it('finds knobs the shader only references, since the wrapper injects those', () => {
        // shader-wrapper.js declares knob_1..knob_200 for shaders that never
        // declare them, so a bare reference is a real usage.
        expect(knobsUsedBy('#define WARP (knob_42 * 2.0)')).toEqual([42])
    })

    it('sorts numerically rather than lexically', () => {
        expect(knobsUsedBy('knob_10 knob_9 knob_100 knob_2')).toEqual([2, 9, 10, 100])
    })

    it('deduplicates a knob that is both declared and used', () => {
        expect(knobsUsedBy('uniform float knob_5;\nfloat x = knob_5 + knob_5;')).toEqual([5])
    })

    it('is empty for a shader with no knobs, and safe on missing source', () => {
        expect(knobsUsedBy('void main() {}')).toEqual([])
        expect(knobsUsedBy('')).toEqual([])
        expect(knobsUsedBy(null)).toEqual([])
        expect(knobsUsedBy(undefined)).toEqual([])
    })
})

describe('PARAM_SCHEMA', () => {
    it('marks fft_size as needing a reload but smoothing as live', () => {
        // AudioProcessor takes fftSize in its constructor, but re-reads
        // smoothing and history_size from manualFeatures every frame.
        expect(PARAM_SCHEMA.fft_size.apply).toBe(RELOAD)
        expect(PARAM_SCHEMA.smoothing.apply).toBe(LIVE)
        expect(PARAM_SCHEMA.history_size.apply).toBe(LIVE)
    })

    it('gives every select an unset option so it never renders blank', () => {
        for (const [name, spec] of Object.entries(PARAM_SCHEMA)) {
            if (spec.control !== 'select') continue
            expect(spec.options, `${name} needs an unset option`).toContain('')
        }
    })

    it('gives every range a default, so an unset slider does not sit at its minimum', () => {
        for (const [name, spec] of Object.entries(PARAM_SCHEMA)) {
            if (spec.control !== 'range') continue
            expect(spec.default, `${name} needs a default`).toBeDefined()
            expect(spec.default).toBeGreaterThanOrEqual(spec.min)
            expect(spec.default).toBeLessThanOrEqual(spec.max)
        }
    })

    it('lists every schema param exactly once in the settings order', () => {
        expect([...SETTINGS_ORDER].sort()).toEqual(Object.keys(PARAM_SCHEMA).sort())
    })
})
