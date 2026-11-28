import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WaveletProcessor } from './WaveletProcessor.js'

let rafQueue
beforeEach(() => {
    rafQueue = []
    vi.stubGlobal('requestAnimationFrame', (fn) => { rafQueue.push(fn); return rafQueue.length })
    vi.stubGlobal('Worker', class { postMessage() {} terminate() {} })
    vi.stubGlobal('window', { cranes: {} })
})
afterEach(() => vi.unstubAllGlobals())

const stats = (v) => ({ current: v, normalized: v, mean: v, median: v, min: 0, max: 1, standardDeviation: 0, zScore: 0, slope: 0, intercept: v, rSquared: 0 })

describe('WaveletProcessor cleanup', () => {
    // After cleanup the publish loop kept running on its last frame, writing
    // frozen wavelet features into window.cranes every frame. On ?audio=tab
    // that raced the next processor's live values after a re-share.
    it('stops publishing', () => {
        const wavelet = new WaveletProcessor({}, {}, 500)
        wavelet.latest = { bandStats: [stats(0.5)], bassStats: stats(0.5), bassHit: 0 }
        wavelet.publish()
        expect(window.cranes.waveletFeatures.waveletBand0).toBe(0.5)

        wavelet.cleanup()
        window.cranes.waveletFeatures = { fromNewProcessor: 1 }
        const queued = rafQueue
        rafQueue = []
        queued.forEach((fn) => fn())

        expect(window.cranes.waveletFeatures).toEqual({ fromNewProcessor: 1 })
        expect(rafQueue).toHaveLength(0)
    })
})
