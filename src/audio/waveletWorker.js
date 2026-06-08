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
// Per frame we emit:
//   bands[]      — RMS energy of each octave's detail coefficients (low→high)
//   onset        — sharp transient signal from the finest detail band's peak energy
//   approxEnergy — the coarse approximation (bass) energy

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
const HISTORY = 120 // ~2.5s of frames
const bandHistory = []
const bassEnergyHistory = []
let prevBassEnergy = 0
let bassHitRaw = 0

const analyze = (frame) => {
    const N = frame.length
    const coeffs = dwt(frame)

    // Detail bands, finest first. Band b occupies [N>>(b+1) .. N>>b).
    // b=0 is the finest (highest freq), increasing b → lower freq.
    const bands = []
    let n = N
    while (n >= 4) {
        const half = n >> 1
        bands.push(rms(coeffs, half, n)) // detail coeffs for this octave
        n = half
    }
    // bands is currently high→low; reverse to low→high so band0 = bass-ish.
    bands.reverse()
    const approxEnergy = rms(coeffs, 0, Math.max(2, N >> bands.length))

    // ---- DEEP BASS HIT DETECTION ----
    // band0 = 43-86Hz (deep bass), band1 = 86-172Hz (low bass / first harmonic).
    // Phone mics roll off hard below ~100Hz, so the 48Hz fundamental of a drop is
    // heavily attenuated — but its harmonic in band1 survives. We combine band0,
    // band1, and the sub-approximation, weighting the harmonic so the detector still
    // fires when the fundamental is mic-murdered. This is the whole point for the
    // live-phone use case: detect the HIT even when the sub-tone barely arrives.
    const sub = approxEnergy           // below ~43Hz (mostly gone on phone mics)
    const b0 = bands[0] ?? 0           // 43-86Hz  deep bass
    const b1 = bands[1] ?? 0           // 86-172Hz low bass — survives the mic best
    // Harmonic-weighted bass energy: lean on b1 (survives) + b0, sub as a bonus.
    const bassEnergy = b1 * 1.0 + b0 * 0.8 + sub * 0.5

    // BASS HIT: sharp POSITIVE jump in bass energy above an adaptive baseline.
    // The baseline tracks the room's bass floor slowly, so a hit is the spike above it.
    bassHitRaw = Math.max(0, bassEnergy - prevBassEnergy)
    // Slow baseline (0.85 decay) so sustained bass doesn't keep re-triggering — only
    // the rising EDGE of a hit fires. Fast enough to re-arm between drops (~0.5s).
    prevBassEnergy = prevBassEnergy * 0.85 + bassEnergy * 0.15

    // Per-band z-scores against rolling history.
    bandHistory.push(bands)
    if (bandHistory.length > HISTORY) bandHistory.shift()
    const zScores = bands.map((v, i) => {
        let mean = 0
        for (const h of bandHistory) mean += h[i] ?? 0
        mean /= bandHistory.length
        let varSum = 0
        for (const h of bandHistory) {
            const d = (h[i] ?? 0) - mean
            varSum += d * d
        }
        const std = Math.sqrt(varSum / bandHistory.length)
        return std > 1e-6 ? (v - mean) / (std * 2.5) : 0
    })

    // Bass z-score: self-calibrating hit strength relative to the recent bass floor.
    // This is what makes it work across wildly different mic levels (line-in vs phone
    // in a loud club) — it measures "is this bass UNUSUAL for right now", not absolute level.
    bassEnergyHistory.push(bassEnergy)
    if (bassEnergyHistory.length > HISTORY) bassEnergyHistory.shift()
    let bMean = 0
    for (const v of bassEnergyHistory) bMean += v
    bMean /= bassEnergyHistory.length
    let bVar = 0
    for (const v of bassEnergyHistory) bVar += (v - bMean) * (v - bMean)
    const bStd = Math.sqrt(bVar / bassEnergyHistory.length)
    const bassZ = bStd > 1e-6 ? (bassEnergy - bMean) / (bStd * 2.5) : 0

    return { bands, zScores, onset: bassHitRaw, bassEnergy, bassZ, approxEnergy }
}

self.onmessage = (e) => {
    const frame = e.data
    if (!(frame instanceof Float32Array)) return
    self.postMessage(analyze(frame))
}
