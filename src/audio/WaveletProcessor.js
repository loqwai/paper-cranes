// WaveletProcessor.js
// Multiresolution (DWT) analysis running alongside the FFT pipeline. Gated behind
// ?wavelet=true. Each octave band is a FIRST-CLASS feature: it goes through the same
// hypnosound stats path as the FFT features (via waveletWorker.js → makeCalculateStats),
// so it exposes the full 11 statistical variations under the FFT naming convention.
//
// Exposed features (i = 0..5, low→high octave; band0 = 43-86Hz deep bass):
//   waveletBand{i}                 raw RMS energy of the octave's detail coefficients
//   waveletBand{i}ZScore           is this band unusual vs its own rolling baseline
//   waveletBand{i}Normalized       0-1 within recent range
//   waveletBand{i}Mean/Median/Min/Max/StandardDeviation/Slope/Intercept/RSquared
//   waveletBass + waveletBass{Stat} harmonic-weighted deep-bass energy (full stats)
//   waveletTilt{Stat}              bass-vs-treble balance  (+1 bass-heavy ↔ -1 bright)
//   waveletCentroid{Stat}          spectral brightness     (0 bass ↔ 1 treble)
//   waveletSpread{Stat}            spectral complexity     (0 pure/peaky ↔ 1 flat/complex)
//   wavelet_bassHit                sharp UN-smoothed deep-bass drop trigger (raw)
//   wavelet_bassHitSmooth          lightly smoothed trigger (for non-strobing visuals)
//
// The harness identified band0Z/band1Z/band2Z/band3N + centroid + spread + bassHit as a
// maximally-independent, lively set (all pairwise |corr|<0.45) — great for driving
// distinct visual params. tilt≈centroid (redundant) but kept for convenience.
//
// Names match the FFT convention (camelCase, capitalized stat suffix) so shaders and
// controllers treat wavelet bands exactly like bass/mids/treble. The two wavelet_bassHit
// keys keep the underscore form since they're a bespoke trigger, not a stat feature.

const NUM_BANDS = 6 // surface the 6 lowest octave bands (43Hz → ~2.8kHz)

// makeCalculateStats stat keys → flattened feature-name suffix (capitalized).
// 'current' becomes the bare feature name; the rest get a capitalized suffix.
const STAT_SUFFIX = {
    normalized: 'Normalized',
    mean: 'Mean',
    median: 'Median',
    min: 'Min',
    max: 'Max',
    standardDeviation: 'StandardDeviation',
    zScore: 'ZScore',
    slope: 'Slope',
    intercept: 'Intercept',
    rSquared: 'RSquared',
}

// Flatten one stats object into feature keys: base name + each suffixed stat.
const flattenStats = (out, base, stats) => {
    out[base] = stats.current
    for (const [key, suffix] of Object.entries(STAT_SUFFIX)) {
        out[`${base}${suffix}`] = stats[key]
    }
}

export class WaveletProcessor {
    constructor(audioContext, sourceNode, historySize = 500) {
        this.audioContext = audioContext
        this.sourceNode = sourceNode
        this.historySize = historySize
        this.worker = new Worker(new URL('./waveletWorker.js', import.meta.url), { type: 'module' })
        this.latest = null
        this.hitSmooth = 0
        this.worker.onmessage = (e) => { this.latest = e.data }
    }

    start = async () => {
        // Mirror the FFT worker config handshake — tell the DWT worker the history size
        // so its per-band makeCalculateStats windows match the rest of the pipeline.
        this.worker.postMessage({ type: 'config', historySize: this.historySize })

        await this.audioContext.audioWorklet.addModule('/raw-tap-processor.js')
        const tapNode = new AudioWorkletNode(this.audioContext, 'raw-tap-processor')
        tapNode.port.onmessage = (e) => this.worker.postMessage(e.data)
        // Tap the source directly (raw, un-windowed). No output path — not connected to destination.
        this.sourceNode.connect(tapNode)
        this.publish()
    }

    publish = () => {
        requestAnimationFrame(this.publish)
        if (!this.latest) return

        const { bandStats, bassStats, tiltStats, centroidStats, spreadStats, bassHit } = this.latest
        const out = {}

        // Each octave band → full 11-stat feature set under FFT naming.
        for (let i = 0; i < NUM_BANDS; i++) {
            if (bandStats[i]) flattenStats(out, `waveletBand${i}`, bandStats[i])
        }
        // Harmonic-weighted deep-bass energy → its own full-stats feature.
        if (bassStats) flattenStats(out, 'waveletBass', bassStats)
        // Derived cross-band features (independent animatable axes), full stats each.
        if (tiltStats) flattenStats(out, 'waveletTilt', tiltStats)
        if (centroidStats) flattenStats(out, 'waveletCentroid', centroidStats)
        if (spreadStats) flattenStats(out, 'waveletSpread', spreadStats)

        // Sharp drop trigger (kept raw — sharpness is the point) + a smoothed variant.
        this.hitSmooth = this.hitSmooth * 0.7 + bassHit * 0.3
        out.wavelet_bassHit = bassHit
        out.wavelet_bassHitSmooth = this.hitSmooth

        // ---- CROSS-DOMAIN COMBINATIONS (wavelet WHEN × FFT WHAT) ----
        // The harness showed wavelet onsets are independent from all FFT features, so these
        // blends add information rather than averaging noise.
        //
        // LATENCY NOTE (deliberate): the wavelet path (1024-window, ~21ms) is much faster
        // than the FFT path (4096-window, ~85ms). These combos prioritize LOW LATENCY by
        // leading with the FAST wavelet component and using the slower FFT signal only as a
        // light confirmation/refinement — so the combined feature still reacts on the
        // wavelet's timescale, not the FFT's.
        const fft = window.cranes?.measuredAudioFeatures ?? {}
        const band0Z = bandStats[0]?.zScore ?? 0
        const bassLevel = fft.bass ?? 0
        const energyZ = fft.energyZScore ?? 0
        // punch: led by the wavelet's FAST bass onset; FFT bass level only trims it.
        out.wavelet_punch = (band0Z * 0.2 + 0.5) * 0.7 + bassLevel * 0.3
        // confirmedDrop: the FAST wavelet bass-hit, lightly gated by FFT energy. The gate
        // softens (not zeroes) when FFT lags, so the drop still fires on wavelet timing.
        out.wavelet_confirmedDrop = bassHit * (0.5 + Math.max(0, energyZ) * 0.5)

        window.cranes.waveletFeatures = out
    }

    cleanup = () => {
        this.worker.terminate()
    }
}
