import { describe, it, expect, vi } from 'vitest'
import { OnsetProcessor, ONSET_BANDS, hzToBin, getOnsetUniformNames } from './OnsetProcessor.js'

// The detection ALGORITHM is tested in hypnosound, over synthetic ground truth.
// What is worth testing here is the integration: Hz→bin conversion, the uniform
// contract the shader layer depends on, and graceful degradation when the
// installed hypnosound predates the detector.

// Minimal hand-rolled fakes so this suite does not depend on the installed
// hypnosound version (see the degradation test below for why that matters).
const fakeDeps = (fireOn = new Set()) => {
    const state = { frame: -1 }
    return {
        state,
        makeOnsetDetector: () => () => ({
            onset: fireOn.has(state.frame),
            strength: 0.8,
            flux: 1,
            threshold: 0.5,
            timeSinceMs: state.frame * 16,
            armed: true,
        }),
        makeOnsetEnvelope:
            ({ decayMs } = {}) =>
            (triggered, level) =>
                triggered ? level : 0,
    }
}

const SAMPLE_RATE = 48000
const BINS = 2048 // fftSize 4096, matching AudioProcessor's default

describe('hzToBin', () => {
    it('uses sampleRate / (2 * binCount) spacing, not the off-by-2x convention used elsewhere in this repo', () => {
        // Spacing here is 48000 / 4096 = 11.72 Hz.
        expect(hzToBin(0, SAMPLE_RATE, BINS)).toBe(0)
        expect(hzToBin(11.72, SAMPLE_RATE, BINS)).toBe(1)
        expect(hzToBin(SAMPLE_RATE / 2, SAMPLE_RATE, BINS)).toBe(BINS) // Nyquist is the last bin
    })

    it('clamps out-of-range and infinite edges into the spectrum', () => {
        expect(hzToBin(Infinity, SAMPLE_RATE, BINS)).toBe(BINS)
        expect(hzToBin(-100, SAMPLE_RATE, BINS)).toBe(0)
        expect(hzToBin(999999, SAMPLE_RATE, BINS)).toBe(BINS)
    })
})

describe('band layout', () => {
    it('gives every band enough bins to resist narrow-band false firing', () => {
        // hypnosound documents that an 8-bin band drops to P=0.633 on
        // frame-uncorrelated input. Keep every band comfortably wider.
        for (const [name, { lowHz, highHz }] of Object.entries(ONSET_BANDS)) {
            const width = hzToBin(highHz, SAMPLE_RATE, BINS) - hzToBin(lowHz, SAMPLE_RATE, BINS)
            expect(width, `${name} band width`).toBeGreaterThan(8)
        }
    })

    it('orders the drum bands low to high without gaps', () => {
        expect(ONSET_BANDS.kick.highHz).toBe(ONSET_BANDS.snare.lowHz)
        expect(ONSET_BANDS.snare.highHz).toBeLessThan(ONSET_BANDS.hat.lowHz)
    })

    it('gives a kick a longer tail than a hat', () => {
        expect(ONSET_BANDS.kick.decayMs).toBeGreaterThan(ONSET_BANDS.hat.decayMs)
    })
})

describe('uniform contract', () => {
    it('publishes envelope, trigger, strength and age for every band', () => {
        const names = getOnsetUniformNames()
        for (const band of Object.keys(ONSET_BANDS)) {
            const key = band.charAt(0).toUpperCase() + band.slice(1)
            expect(names).toContain(`onset${key}`)
            expect(names).toContain(`onset${key}Trigger`)
            expect(names).toContain(`onset${key}Strength`)
            expect(names).toContain(`onset${key}Age`)
        }
        expect(names).toHaveLength(Object.keys(ONSET_BANDS).length * 4)
    })

    it('every published name is a valid GLSL identifier', () => {
        for (const name of getOnsetUniformNames()) {
            expect(name).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/)
        }
    })

    it('process() writes exactly the declared uniforms and nothing else', () => {
        const processor = new OnsetProcessor(SAMPLE_RATE, BINS, fakeDeps())
        const out = processor.process(new Uint8Array(BINS), 0)
        expect(Object.keys(out).sort()).toEqual(getOnsetUniformNames().sort())
    })
})

describe('OnsetProcessor integration', () => {
    it('writes into a caller-supplied object, allocating nothing per frame', () => {
        const deps = fakeDeps()
        const processor = new OnsetProcessor(SAMPLE_RATE, BINS, deps)
        const out = {}
        const returned = processor.process(new Uint8Array(BINS), 0, out)
        expect(returned).toBe(out) // same object, not a copy
    })

    it('maps a trigger to 1 and no trigger to 0', () => {
        const deps = fakeDeps(new Set([3]))
        const processor = new OnsetProcessor(SAMPLE_RATE, BINS, deps)
        const out = {}

        deps.state.frame = 2
        processor.process(new Uint8Array(BINS), 0, out)
        expect(out.onsetKickTrigger).toBe(0)

        deps.state.frame = 3
        processor.process(new Uint8Array(BINS), 16, out)
        expect(out.onsetKickTrigger).toBe(1)
        expect(out.onsetKick).toBeCloseTo(0.8, 5) // envelope took the strength
    })

    it('caps age so a shader dividing by it cannot blow up during silence', () => {
        const deps = fakeDeps()
        deps.state.frame = 100000 // timeSinceMs = 1.6M ms
        const processor = new OnsetProcessor(SAMPLE_RATE, BINS, deps)
        const out = processor.process(new Uint8Array(BINS), 0)
        expect(out.onsetKickAge).toBe(10)
    })

    it('converts each band to the right bin range', () => {
        const ranges = []
        const deps = {
            makeOnsetDetector: (cfg) => {
                ranges.push(cfg)
                return () => ({ onset: false, strength: 0, timeSinceMs: 0 })
            },
            makeOnsetEnvelope: () => () => 0,
        }
        new OnsetProcessor(SAMPLE_RATE, BINS, deps)
        // kick 20-200Hz at 11.72Hz spacing → bins 2..17
        expect(ranges[0]).toEqual({ lowBin: 2, highBin: 17 })
        // full band spans the whole spectrum
        expect(ranges.at(-1)).toEqual({ lowBin: 0, highBin: BINS })
    })
})

describe('degradation when hypnosound predates the detector', () => {
    it('warns and publishes nothing rather than throwing', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const processor = new OnsetProcessor(SAMPLE_RATE, BINS, { makeOnsetDetector: undefined, makeOnsetEnvelope: undefined })

        expect(processor.available).toBe(false)
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('hypnosound'))
        // Must not throw, and must not invent uniform values.
        expect(() => processor.process(new Uint8Array(BINS), 0)).not.toThrow()
        expect(processor.process(new Uint8Array(BINS), 0)).toEqual({})
        warn.mockRestore()
    })
})
