// fft.mjs — compact iterative radix-2 Cooley-Tukey FFT (no deps), plus a helper that
// replicates the browser's AnalyserNode.getByteFrequencyData so headless hypnosound FFT
// features match the live pipeline.

// In-place FFT of real input → returns magnitude spectrum (length N/2).
// re/im are scratch Float64Arrays of length N.
export const magnitudeSpectrum = (frame) => {
    const N = frame.length // must be power of two
    const re = Float64Array.from(frame)
    const im = new Float64Array(N)

    // bit-reversal permutation
    for (let i = 1, j = 0; i < N; i++) {
        let bit = N >> 1
        for (; j & bit; bit >>= 1) j ^= bit
        j ^= bit
        if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti }
    }
    // butterflies
    for (let len = 2; len <= N; len <<= 1) {
        const ang = -2 * Math.PI / len
        const wr = Math.cos(ang), wi = Math.sin(ang)
        for (let i = 0; i < N; i += len) {
            let cr = 1, ci = 0
            for (let k = 0; k < len / 2; k++) {
                const a = i + k, b = i + k + len / 2
                const tr = re[b] * cr - im[b] * ci
                const ti = re[b] * ci + im[b] * cr
                re[b] = re[a] - tr; im[b] = im[a] - ti
                re[a] += tr; im[a] += ti
                const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr
            }
        }
    }
    const half = N >> 1
    const mag = new Float64Array(half)
    for (let i = 0; i < half; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / N
    return mag
}

// Replicate AnalyserNode.getByteFrequencyData:
//   smoothing across frames, dB conversion, scale to 0..255 over [minDb, maxDb].
export const makeByteFreq = ({ minDb = -100, maxDb = -30, smoothing = 0.4 } = {}) => {
    let smoothed = null
    return (mag) => {
        if (!smoothed) smoothed = new Float64Array(mag.length)
        const out = new Uint8Array(mag.length)
        for (let i = 0; i < mag.length; i++) {
            smoothed[i] = smoothing * smoothed[i] + (1 - smoothing) * mag[i]
            const db = 20 * Math.log10(smoothed[i] + 1e-12)
            let v = 255 * (db - minDb) / (maxDb - minDb)
            out[i] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
        }
        return out
    }
}

// Hanning window (the browser applies one before the FFT via window-processor.js).
export const hann = (N) => {
    const w = new Float64Array(N)
    for (let i = 0; i < N; i++) w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)))
    return w
}
