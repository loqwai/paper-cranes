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

import { makeCalculateStats } from 'hypnosound'

// D4 scaling (low-pass) coefficients
const SQRT3 = Math.sqrt(3)
const DENOM = 4 * Math.SQRT2
const H0 = (1 + SQRT3) / DENOM
const H1 = (3 + SQRT3) / DENOM
const H2 = (3 - SQRT3) / DENOM
const H3 = (1 - SQRT3) / DENOM
// Wavelet (high-pass) coefficients — quadrature mirror of the scaling filter
const G0 = H3
const G1 = -H2
const G2 = H1
const G3 = -H0

// One in-place D4 step over the first `n` elements of `a`.
// Even indices ← approximation (low-pass), odd indices ← detail (high-pass),
// then they're deinterleaved so [0..n/2) = approx, [n/2..n) = detail.
const dwtStep = (a, n) => {
    const tmp = new Float32Array(n)
    const half = n >> 1
    for (let i = 0; i < half; i++) {
        const j = i << 1
        const k0 = j
        const k1 = (j + 1) % n
        const k2 = (j + 2) % n
        const k3 = (j + 3) % n
        tmp[i] = a[k0] * H0 + a[k1] * H1 + a[k2] * H2 + a[k3] * H3        // approx
        tmp[half + i] = a[k0] * G0 + a[k1] * G1 + a[k2] * G2 + a[k3] * G3 // detail
    }
    for (let i = 0; i < n; i++) a[i] = tmp[i]
}

// Full multilevel DWT. Returns the transformed array in place; detail bands live at
// [n/2..n), [n/4..n/2), [n/8..n/4), ... and the final approx at [0..smallest).
const dwt = (signal) => {
    const a = Float32Array.from(signal)
    let n = a.length
    while (n >= 4) {
        dwtStep(a, n)
        n >>= 1
    }
    return a
}

const rms = (arr, start, end) => {
    let sum = 0
    for (let i = start; i < end; i++) sum += arr[i] * arr[i]
    const len = end - start
    return len > 0 ? Math.sqrt(sum / len) : 0
}

// Track per-band history for a cheap z-score so the scope can show "is this band
// spiking vs its own recent baseline" — the same statistical idea as the FFT side.
// Per-band stats functions (one per octave band + one for the harmonic bass energy),
// each holding its own rolling history. Built lazily once we know historySize and how
// many bands the frame produces. This mirrors the FFT side: one calculateStats per
// feature, fed one scalar per frame.
let DEFAULT_HISTORY = 500 // matches the FFT default (history_size)
let bandStats = null      // array of calculateStats fns, one per band
let bassStats = null      // calculateStats for the harmonic-weighted bass energy
let bandCount = 0

const buildStats = (count, historySize) => {
    bandCount = count
    bandStats = Array.from({ length: count }, () => makeCalculateStats(historySize))
    bassStats = makeCalculateStats(historySize)
}

// The bass-HIT trigger is deliberately NOT run through stats — it's a sharp,
// un-smoothed rising-edge signal so drops pop instantly.
let prevBassEnergy = 0

const bandEnergies = (frame) => {
    const N = frame.length
    const coeffs = dwt(frame)
    // Detail bands, finest first; band b occupies [N>>(b+1) .. N>>b).
    const bands = []
    let n = N
    while (n >= 4) {
        const half = n >> 1
        bands.push(rms(coeffs, half, n))
        n = half
    }
    bands.reverse() // low→high so band0 = deep bass
    const approxEnergy = rms(coeffs, 0, Math.max(2, N >> bands.length))
    return { bands, approxEnergy }
}

const analyze = (frame, historySize) => {
    const { bands, approxEnergy } = bandEnergies(frame)
    if (!bandStats || bandCount !== bands.length) buildStats(bands.length, historySize)

    // Full 11-stat object per octave band — identical path to the FFT features.
    const bandStatsOut = bands.map((v, i) => bandStats[i](v))

    // ---- DEEP BASS HIT (harmonic-weighted) ----
    // Phone mics roll off below ~100Hz, so a drop's 48Hz fundamental is attenuated but
    // its harmonic in band1 (86-172Hz) survives. Weight band1 highest so the detector
    // still fires when the fundamental is mic-murdered.
    const sub = approxEnergy
    const b0 = bands[0] ?? 0
    const b1 = bands[1] ?? 0
    const bassEnergy = b1 * 1.0 + b0 * 0.8 + sub * 0.5
    const bassStatsOut = bassStats(bassEnergy) // bass energy gets full stats too

    // Sharp un-smoothed hit: positive jump above a slow adaptive baseline.
    const bassHit = Math.max(0, bassEnergy - prevBassEnergy)
    prevBassEnergy = prevBassEnergy * 0.85 + bassEnergy * 0.15

    return { bandStats: bandStatsOut, bassStats: bassStatsOut, approxEnergy, bassHit }
}

self.onmessage = (e) => {
    // Config message: set history size (mirrors the FFT worker's config path).
    if (e.data && e.data.type === 'config') {
        DEFAULT_HISTORY = e.data.historySize ?? DEFAULT_HISTORY
        bandStats = null // rebuild on next frame with the new history size
        return
    }
    const frame = e.data
    if (!(frame instanceof Float32Array)) return
    self.postMessage(analyze(frame, DEFAULT_HISTORY))
}
