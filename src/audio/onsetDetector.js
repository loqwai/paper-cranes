// Onset detection: half-wave-rectified spectral flux gated by a robust adaptive
// threshold (rolling median + MAD) and a refractory period.
//
// Deliberately pure and dependency-free: no browser APIs, no imports, caller
// supplies the clock. The same algorithm is destined for hypnosound (see the
// feat/onset-detection branch there) and eventually ESP32 firmware, so keep it
// that way — spectrum bytes in, events out.

export const defaultOnsetConfig = {
    sensitivity: 3, // MAD multiplier above the rolling median
    ratio: 1.5, // flux must also exceed ratio * median — kills false fires on stationary noise, where MAD collapses
    refractoryMs: 120, // minimum time between onsets
    windowFrames: 64, // rolling flux history (~1s at 60fps)
    warmupFrames: 12, // history required before the threshold is trustworthy
    fluxFloor: 0.5, // absolute per-bin flux gate (0-255 byte scale) so silence can't fire
    lowBin: 0, // inclusive band start
    highBin: Infinity, // exclusive band end
}

const median = (sorted) => {
    if (!sorted.length) return 0
    const mid = sorted.length >> 1
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export const makeOnsetDetector = (defaults = {}) => {
    let previous = null
    const history = []
    let lastOnsetAt = -Infinity
    let strength = 0

    return (spectrum, nowMs, overrides = {}) => {
        const cfg = { ...defaultOnsetConfig, ...defaults, ...overrides }
        const lo = Math.max(0, Math.floor(cfg.lowBin))
        const hi = Math.min(spectrum.length, Number.isFinite(cfg.highBin) ? Math.ceil(cfg.highBin) : spectrum.length)

        // Per-bin average of positive spectral change, so the scale is stable
        // across different FFT sizes and band widths
        let flux = 0
        if (previous && previous.length === spectrum.length) {
            for (let i = lo; i < hi; i++) {
                const diff = spectrum[i] - previous[i]
                if (diff > 0) flux += diff
            }
            flux /= Math.max(hi - lo, 1)
        }
        if (!previous || previous.length !== spectrum.length) previous = new Float32Array(spectrum.length)
        previous.set(spectrum)

        history.push(flux)
        if (history.length > cfg.windowFrames) history.shift()

        // Median + MAD instead of mean + stddev: a sustained pad or swell drags a
        // mean-based threshold up and masks real hits; the median barely moves
        const sorted = [...history].sort((a, b) => a - b)
        const mid = median(sorted)
        const deviations = sorted.map((v) => Math.abs(v - mid)).sort((a, b) => a - b)
        const mad = median(deviations)
        const threshold = Math.max(mid + cfg.sensitivity * Math.max(mad, 1e-3), cfg.ratio * mid, cfg.fluxFloor)

        const ready = history.length >= cfg.warmupFrames
        const outsideRefractory = nowMs - lastOnsetAt >= cfg.refractoryMs
        const onset = ready && outsideRefractory && flux > threshold

        if (onset) {
            lastOnsetAt = nowMs
            // Scale-free: ~0 for a grazing hit, → 1 as flux dwarfs the threshold;
            // latched until the next onset so responses can scale with hit intensity
            strength = 1 - threshold / flux
        }

        return {
            onset,
            flux,
            threshold,
            strength,
            timeSinceMs: nowMs - lastOnsetAt, // Infinity before the first onset
        }
    }
}
