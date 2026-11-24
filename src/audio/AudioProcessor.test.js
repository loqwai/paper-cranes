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
