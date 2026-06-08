// waveletAnalyzer.js — the per-frame wavelet feature computation, as a pure factory.
//
// Pulled out of the worker so the SAME code runs in three places: the live worker,
// a headless Node harness, and (eventually) a standalone library. createWaveletAnalyzer
// returns a stateful analyze(frame) — it holds the per-band rolling-stats history.

import { makeCalculateStats } from 'hypnosound'
import { bandEnergies, harmonicBass } from './dwt.js'

// historySize: rolling window for the stats (matches the FFT history_size).
export const createWaveletAnalyzer = (historySize = 500) => {
    let bandStats = null   // one makeCalculateStats per octave band
    let bassStats = null   // makeCalculateStats for the harmonic-weighted bass energy
    let bandCount = 0
    let prevBassEnergy = 0 // for the sharp un-smoothed bass-hit trigger

    const build = (count) => {
        bandCount = count
        bandStats = Array.from({ length: count }, () => makeCalculateStats(historySize))
        bassStats = makeCalculateStats(historySize)
    }

    return {
        analyze(frame) {
            const { bands, approxEnergy } = bandEnergies(frame)
            if (!bandStats || bandCount !== bands.length) build(bands.length)

            // Full 11-stat object per octave band — identical path to FFT features.
            const bandStatsOut = bands.map((v, i) => bandStats[i](v))

            // Harmonic-weighted deep-bass energy, also given full stats.
            const bassEnergy = harmonicBass(bands, approxEnergy)
            const bassStatsOut = bassStats(bassEnergy)

            // Sharp un-smoothed hit: positive jump above a slow adaptive baseline.
            const bassHit = Math.max(0, bassEnergy - prevBassEnergy)
            prevBassEnergy = prevBassEnergy * 0.85 + bassEnergy * 0.15

            return { bandStats: bandStatsOut, bassStats: bassStatsOut, approxEnergy, bassHit }
        },
        setHistorySize(h) {
            historySize = h
            bandStats = null // rebuild on next frame
        },
    }
}
