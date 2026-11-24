// VENDORED from hypnosound (github.com/hypnodroid/hypnosound, src/utils/onset.js)
// at c5384ab3, the head of hypnosound PR #18. No published hypnosound has the
// onset detector: npm stops at 2.0.0. OnsetProcessor prefers the installed
// hypnosound's copy when one exists, so delete this file once paper-cranes
// depends on a release that exports it. Change it upstream, not here.

// Onset detection: half-wave-rectified spectral flux gated by a robust adaptive
// threshold (rolling median + MAD) and a refractory period.
//
// Lives in utils, not src/audio: it is a stateful event detector, not a
// per-frame scalar feature, so it must stay out of the AudioFeatures barrel.
// Deliberately pure and dependency-free — no browser APIs, caller supplies the
// clock — so the same algorithm can run in workers, on the main thread, or on
// microcontrollers: spectrum bytes in, events out.
//
// ---------------------------------------------------------------------------
// BANDS ARE BINS, NOT Hz
//
// `lowBin`/`highBin` are FFT bin indices. There is no `sampleRate` or `fftSize`
// parameter and no Hz conversion — the caller owns it. Bin spacing for a
// spectrum of N bins produced from an FFT of size 2N is `sampleRate / (2 * N)`.
// Note that this repo's own bass/mids/treble use `sampleRate / fft.length`,
// which is off by 2× and is NOT a correct conversion for this detector.
//
// ---------------------------------------------------------------------------
// MEASURED LIMITATIONS
//
// These are real and characterized. Numbers come from synthetic ground truth
// (44.1 kHz, fftSize 2048, 1024 bins, 60 fps) — see scripts/test/onset-*.mjs.
// Full-band accuracy is excellent: P=1.000 R=1.000 on 90/120/128 BPM kick
// grids, timing error under one frame, and it never fires early.
//
// 1. NARROW BANDS FALSE-FIRE ON UNSMOOTHED FRAMES. On stationary noise, false
//    onsets over 20s by band width: 8 bins → 42, 16 → 39, 32 → 22, 64 → 3,
//    256 → 0, 1024 → 0. A kick band (25–180 Hz) is ~8 bins, which drops a kick
//    band detector to P=0.633 R=0.864. It is scale-invariant, so it is not a
//    tuning problem. Feeding frames from an AnalyserNode with its default
//    `smoothingTimeConstant: 0.8` restores P=1.000 R=1.000 at every band width.
//    If you set `smoothingTimeConstant = 0`, prefer wide bands.
//
// 2. SUSTAINED MODULATION FIRES ONCE PER CYCLE. A 4 Hz broadband tremolo with
//    no transients at all yields 40 onsets in 10s. There is no local-maximum
//    peak-picking stage — the standard third stage of an onset detector — so
//    the first frame crossing the threshold fires. `sensitivity` does not help
//    (3 and 6 both give 40). Relevant to sidechained/pumping material.
//
// 3. ON A PERFECTLY STEADY SPECTRUM, `sensitivity` IS BYPASSED. With mid=0 and
//    mad=0 the threshold falls back to `fluxFloor`, so a +1 LSB uniform rise
//    (0.2% of full scale) fires an onset. The 1e-3 MAD guard is far too small
//    to keep the sensitivity term meaningful there.

export const defaultOnsetConfig = {
    sensitivity: 3, // MAD multiplier above the rolling median
    ratio: 1.5, // flux must also exceed ratio * median — kills false fires on stationary noise, where MAD collapses
    refractoryMs: 120, // minimum time between onsets
    windowFrames: 64, // rolling flux history (~1s at 60fps); clamped to a minimum of 3
    warmupFrames: 12, // history required before the threshold is trustworthy
    fluxFloor: 0.5, // absolute per-bin flux gate (0-255 byte scale) so silence can't fire
    releaseRatio: 0.7, // Schmitt-trigger release: after firing, flux must fall back below releaseRatio * threshold before another onset can fire. 0 disables hysteresis.
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
    let warnedBand = false
    let armed = true

    return (spectrum, nowMs, overrides = {}) => {
        const cfg = { ...defaultOnsetConfig, ...defaults, ...overrides }

        // Resolve the band to a guaranteed non-empty, in-range window. An
        // inverted or out-of-range band used to leave flux pinned at 0 forever
        // with no signal to the caller — a dead detector that looked alive.
        const window = Math.max(1, spectrum.length)
        let lo = Number.isFinite(cfg.lowBin) ? Math.floor(cfg.lowBin) : 0
        let hi = Number.isFinite(cfg.highBin) ? Math.ceil(cfg.highBin) : window
        if (hi < lo) [lo, hi] = [hi, lo] // tolerate a swapped pair
        lo = Math.min(Math.max(0, lo), window - 1)
        hi = Math.max(lo + 1, Math.min(window, hi))
        const bandInvalid = lo !== Math.max(0, Math.floor(Number.isFinite(cfg.lowBin) ? cfg.lowBin : 0)) || (Number.isFinite(cfg.highBin) && hi !== Math.min(window, Math.ceil(cfg.highBin)))
        if (bandInvalid && !warnedBand) {
            warnedBand = true
            if (typeof console !== 'undefined' && console.warn) {
                console.warn(`[onset] band [${cfg.lowBin}, ${cfg.highBin}) is invalid for a ${spectrum.length}-bin spectrum; using [${lo}, ${hi}). Bands are BIN indices, not Hz.`)
            }
        }

        // A resolution change invalidates both the reference spectrum and the
        // flux history — the scale is different, so mixing them would bias the
        // median low for a full window. Re-warm instead.
        const resized = !previous || previous.length !== spectrum.length
        if (resized) {
            previous = new Float32Array(spectrum.length)
            history.length = 0
            armed = true
        }

        // Per-bin average of positive spectral change, so the scale is stable
        // across different FFT sizes and band widths
        let flux = 0
        if (!resized) {
            for (let i = lo; i < hi; i++) {
                const diff = spectrum[i] - previous[i]
                if (diff > 0) flux += diff
            }
            flux /= Math.max(hi - lo, 1)
        }
        previous.set(spectrum)

        // A backwards clock jump used to deafen the detector for the full
        // duration of the jump (300 frames measured for a 5s jump), because
        // nowMs - lastOnsetAt went negative and never cleared the refractory.
        if (nowMs < lastOnsetAt) {
            lastOnsetAt = -Infinity
            armed = true
        }

        // Floor of 3: with a 1- or 2-frame window the current flux IS the median,
        // so the `ratio * median` gate can never be satisfied and the detector
        // is mathematically incapable of firing — another silently-dead config.
        const windowFrames = Math.max(3, Math.floor(cfg.windowFrames) || 3)

        // `while`, not `if`: a push adds one and a shift removes at most one, so
        // an `if` could never shrink the window — lowering windowFrames through
        // overrides silently no-opped, and live tuning downward did nothing.
        history.push(flux)
        while (history.length > windowFrames) history.shift()

        // Median + MAD instead of mean + stddev: a sustained pad or swell drags a
        // mean-based threshold up and masks real hits; the median barely moves
        const sorted = [...history].sort((a, b) => a - b)
        const mid = median(sorted)
        const deviations = sorted.map((v) => Math.abs(v - mid)).sort((a, b) => a - b)
        const mad = median(deviations)
        const threshold = Math.max(mid + cfg.sensitivity * Math.max(mad, 1e-3), cfg.ratio * mid, cfg.fluxFloor)

        // Clamped to windowFrames: a warmup longer than the history cap can
        // never be reached, which used to disable the detector permanently and
        // silently (windowFrames: 8 with the default warmupFrames: 12 produced
        // zero onsets, forever, with no error). Clamping rather than throwing
        // because overrides are applied per-frame inside a render loop.
        const warmup = Math.min(Math.max(1, cfg.warmupFrames), windowFrames)
        const ready = history.length >= warmup
        const outsideRefractory = nowMs - lastOnsetAt >= cfg.refractoryMs

        // Hysteresis (Schmitt trigger). The refractory period alone is a purely
        // temporal gate: material that parks the flux just above the threshold
        // re-fires every refractoryMs forever, a metronome locked to the timer
        // rather than to the music. Requiring a fall back below
        // releaseRatio * threshold means one crossing yields one onset, however
        // long it stays up. Re-arming is evaluated before the fire decision,
        // which is safe: any flux low enough to re-arm is by definition below
        // the threshold, so it cannot fire on the same frame.
        // releaseRatio <= 0 disables hysteresis. It must be handled explicitly:
        // falling through to the comparison would test `flux < 0`, which is
        // never true, so the detector would latch off after its first onset and
        // go permanently deaf — the opposite of "disabled".
        if (cfg.releaseRatio <= 0) armed = true
        else if (!armed && flux < cfg.releaseRatio * threshold) armed = true

        const onset = ready && armed && outsideRefractory && flux > threshold

        if (onset) {
            if (cfg.releaseRatio > 0) armed = false // stays true when hysteresis is off, so `armed` never misreports
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
            // Infinity before the first onset; never negative, even if the
            // caller's clock runs backwards.
            timeSinceMs: Math.max(0, nowMs - lastOnsetAt),
            armed, // false while waiting for flux to fall back below releaseRatio * threshold
            lowBin: lo, // resolved band, so callers can see what was actually used
            highBin: hi,
        }
    }
}
