// waveletWorker.js
// Fast in-place Daubechies-4 (D4) Discrete Wavelet Transform.
//
// Why DWT and not CWT: a full CWT scalogram per frame is far too expensive for
// 60fps on mobile. The dyadic DWT is O(n) and gives exactly what we want for music:
// octave-spaced bands, each sampled at its OWN natural time resolution. Low bands
// (bass) update slowly and smoothly; high bands (treble/transients) update fast and
// sharp. That's the multiresolution property — bass and treble are NOT forced to
// share a single analysis window like they are in a single FFT.
//
// The transform decomposes the FRAME into levels:
//   level 0 detail = finest / highest frequency  (air, transient edges)
//   level 1 detail = next octave down
//   ...
//   level N detail = lowest detail band
//   final approximation = bass / sub
//
// Each octave band's RMS energy is run through hypnosound's makeCalculateStats —
// the SAME stats path the FFT features use — so wavelet bands get the full 11
// statistical variations (mean, median, zScore, normalized, slope, rSquared, ...)
// over a rolling history window. This is what makes them first-class features that
// shaders can treat exactly like bass/mids/treble, and it fixes the near-zero-std
// z-score blowup the hand-rolled version had on quiet material.
//
// The bass-HIT trigger stays a separate, deliberately UN-smoothed sharp signal.

import { createWaveletAnalyzer } from './waveletAnalyzer.js'

// The worker is now a thin transport shell around the shared analyzer — the same
// createWaveletAnalyzer the headless harness uses, so what we measure offline is
// exactly what runs live.
let analyzer = createWaveletAnalyzer(500)

self.onmessage = (e) => {
    // Config message: set history size (mirrors the FFT worker's config path).
    if (e.data && e.data.type === 'config') {
        if (e.data.historySize) analyzer.setHistorySize(e.data.historySize)
        return
    }
    const frame = e.data
    if (!(frame instanceof Float32Array)) return
    self.postMessage(analyzer.analyze(frame))
}
