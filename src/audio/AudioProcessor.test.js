import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeCalculateStats } from 'hypnosound'
import { AudioProcessor } from './AudioProcessor.js'

// AudioProcessor runs on requestAnimationFrame and reads window.cranes. These
// tests drive its frame loop by hand with a fake context and fake workers.
const fakeContext = () => ({
    sampleRate: 48000,
    createAnalyser: () => ({ frequencyBinCount: 2048, getByteFrequencyData: () => {} }),
})

// A worker stand-in that returns hypnosound stats for a value stream, the same
// shape WorkerRPC.getResult() hands back.
const fakeWorker = () => {
    const stats = makeCalculateStats(500)
    let message = null
    return {
        push: (value) => { message = { type: 'computedValue', value, stats: stats(value) } },
        getResult: () => message,
        setHistorySize: () => {},
        sendData: () => {},
        terminate: vi.fn(),
    }
}

const frames = (processor, n) => { for (let i = 0; i < n; i++) processor.updateCurrentFeatures() }

let rafQueue
beforeEach(() => {
    rafQueue = []
    vi.stubGlobal('requestAnimationFrame', (fn) => { rafQueue.push(fn); return rafQueue.length })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    vi.stubGlobal('window', {})
})
afterEach(() => vi.unstubAllGlobals())

// A worker that reports a hand-set normalized value.
const fixedWorker = () => {
    let normalized = 0
    return {
        set: (v) => { normalized = v },
        getResult: () => ({ type: 'computedValue', value: normalized, stats: { current: normalized, normalized, zScore: 0, min: 0, max: 1 } }),
    }
}

describe('smoothing', () => {
    // audio_file defaults smoothing to 0.85, and ZScore/Normalized keys get
    // 1.5x that: 1.275. An EMA weight above 1 overshoots, so a 0-1 feature
    // left its range and rang on every step.
    it.each([0.15, 0.85, 1])('keeps a Normalized feature inside 0-1 at smoothing %s', (smoothing) => {
        const processor = new AudioProcessor(fakeContext(), {}, 500, 4096)
        processor.smoothingFactor = smoothing
        const bass = fixedWorker()
        processor.workers.set('bass', bass)

        frames(processor, 150) // past warm-up, settled at 0
        bass.set(1)
        const seen = []
        for (let i = 0; i < 20; i++) {
            processor.updateCurrentFeatures()
            seen.push(processor.getFeatures().bassNormalized)
        }
        expect(Math.max(...seen)).toBeLessThanOrEqual(1)
        expect(seen.at(-1)).toBeGreaterThan(0.9)
    })
})

describe('cleanup', () => {
    // ?audio=tab calls cleanup() and builds a new processor every time the
    // user stops sharing and picks another tab. The old frame loops kept
    // running, reading a closed analyser and running onset detection, one
    // more pair per re-share.
    it('stops both frame loops', () => {
        const ctx = fakeContext()
        const processor = new AudioProcessor(ctx, {}, 500, 4096)
        const read = vi.spyOn(processor.fftAnalyzer, 'getByteFrequencyData')
        processor.updateCurrentFeatures()
        processor.updateFftData()

        processor.cleanup()
        read.mockClear()
        for (let i = 0; i < 5; i++) {
            const queued = rafQueue
            rafQueue = []
            queued.forEach((fn) => fn())
        }
        expect(read).not.toHaveBeenCalled()
        expect(rafQueue).toHaveLength(0)
    })
})

describe('beat', () => {
    it('stays off in silence, when every spectralFlux value is the same', () => {
        // hypnosound reports zScore 1 when its history is flat (max === min).
        // Digital silence, or a file whose AudioContext is still suspended,
        // gives exactly that, and beat used to latch on.
        const processor = new AudioProcessor(fakeContext(), {}, 500, 4096)
        const flux = fakeWorker()
        processor.workers.set('spectralFlux', flux)

        for (let i = 0; i < 200; i++) {
            flux.push(0)
            processor.updateCurrentFeatures()
        }
        expect(processor.getFeatures().beat).toBe(false)
    })

    it('still fires on a real spike in spectralFlux', () => {
        const processor = new AudioProcessor(fakeContext(), {}, 500, 4096)
        const flux = fakeWorker()
        processor.workers.set('spectralFlux', flux)

        for (let i = 0; i < 200; i++) {
            flux.push(0.1 + 0.01 * Math.sin(i))
            processor.updateCurrentFeatures()
        }
        flux.push(5)
        processor.updateCurrentFeatures()
        expect(processor.getFeatures().beat).toBe(true)
    })
})
