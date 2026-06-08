// dwt.js — pure Daubechies-4 (D4) Discrete Wavelet Transform + band energies.
//
// No DOM/worker/audio globals — pure functions, so this is importable from the
// worker, a headless Node harness, or (eventually) a standalone library.
//
// The dyadic DWT is O(n) and gives octave-spaced bands, each at its OWN natural time
// resolution: low bands (bass) update slowly/smoothly, high bands (treble/transients)
// update fast/sharp. That multiresolution property is why bass and treble aren't forced
// to share a single analysis window the way they are in a single FFT.

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

// One in-place D4 step over the first `n` elements of `a`: [0..n/2)=approx, [n/2..n)=detail.
const dwtStep = (a, n) => {
    const tmp = new Float32Array(n)
    const half = n >> 1
    for (let i = 0; i < half; i++) {
        const j = i << 1
        const k0 = j
        const k1 = (j + 1) % n
        const k2 = (j + 2) % n
        const k3 = (j + 3) % n
        tmp[i] = a[k0] * H0 + a[k1] * H1 + a[k2] * H2 + a[k3] * H3
        tmp[half + i] = a[k0] * G0 + a[k1] * G1 + a[k2] * G2 + a[k3] * G3
    }
    for (let i = 0; i < n; i++) a[i] = tmp[i]
}

// Full multilevel DWT (in a fresh copy). Detail bands live at [n/2..n), [n/4..n/2), ...
// and the final approximation at [0..smallest).
export const dwt = (signal) => {
    const a = Float32Array.from(signal)
    let n = a.length
    while (n >= 4) {
        dwtStep(a, n)
        n >>= 1
    }
    return a
}

export const rms = (arr, start, end) => {
    let sum = 0
    for (let i = start; i < end; i++) sum += arr[i] * arr[i]
    const len = end - start
    return len > 0 ? Math.sqrt(sum / len) : 0
}

// Decompose a time-domain frame into octave-band RMS energies (low→high) plus the
// coarse approximation energy. band0 is the lowest detail band (deep bass).
export const bandEnergies = (frame) => {
    const N = frame.length
    const coeffs = dwt(frame)
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

// Harmonic-weighted deep-bass energy. Phone mics roll off below ~100Hz so a drop's
// fundamental (band0, 43-86Hz) is attenuated but its harmonic in band1 (86-172Hz)
// survives — weight band1 highest so the bass signal holds up on bass-starved input.
export const harmonicBass = (bands, approxEnergy) => {
    const b0 = bands[0] ?? 0
    const b1 = bands[1] ?? 0
    return b1 * 1.0 + b0 * 0.8 + approxEnergy * 0.5
}
