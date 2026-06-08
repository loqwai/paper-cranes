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
    // Derived cross-band features also get full stats (they earned their place in the
    // harness as lively + independent animatable axes).
    let tiltStats = null     // bass-vs-treble balance
    let centroidStats = null // spectral brightness (energy-weighted band index)
    let spreadStats = null   // spectral complexity (normalized band entropy)

    const build = (count) => {
        bandCount = count
        bandStats = Array.from({ length: count }, () => makeCalculateStats(historySize))
        bassStats = makeCalculateStats(historySize)
        tiltStats = makeCalculateStats(historySize)
        centroidStats = makeCalculateStats(historySize)
        spreadStats = makeCalculateStats(historySize)
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

            // ---- DERIVED cross-band features (independent animatable axes) ----
            const cur = (i) => bands[i] ?? 0
            const lowE = cur(0) + cur(1) + cur(2)
            const highE = cur(3) + cur(4) + cur(5)
            // tilt: bass-heavy (+1) ↔ bright (-1)
            const tilt = (lowE - highE) / (lowE + highE + 1e-6)
            // centroid: energy-weighted band index, normalized 0(bass)..1(treble)
            let num = 0, den = 0
            for (let i = 0; i < 6; i++) { num += i * cur(i); den += cur(i) }
            const centroid = den > 1e-6 ? num / den / 5 : 0
            // spread: normalized spectral entropy — flat/complex (1) ↔ peaky/pure (0)
            const total = den + 1e-6
            let ent = 0
            for (let i = 0; i < 6; i++) { const p = cur(i) / total; if (p > 1e-6) ent -= p * Math.log(p) }
            const spread = ent / Math.log(6)

            return {
                bandStats: bandStatsOut,
                bassStats: bassStatsOut,
                tiltStats: tiltStats(tilt),
                centroidStats: centroidStats(centroid),
                spreadStats: spreadStats(spread),
                approxEnergy,
                bassHit,
            }
        },
        setHistorySize(h) {
            historySize = h
            bandStats = null // rebuild on next frame
        },
    }
}
