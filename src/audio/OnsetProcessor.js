// OnsetProcessor.js
//
// Event-driven audio reactivity: detect transients, then SYNTHESIZE the response.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS — the ~1 second lag
//
// Every other feature in this pipeline is a level that has been smoothed to
// stop it jittering. That smoothing is the lag. The chain, measured on the
// existing FFT path:
//
//   AnalyserNode smoothingTimeConstant 0.4  ~1 frame
//   worker round-trip (getResult polls last frame's answer)  ~1 frame
//   AudioProcessor EMA at 0.10              ~10 frames to 63%, ~30 to settle
//   rolling stats window (historySize 500)  seconds, by design
//
// The EMA is the expensive one, and it exists for a reason: raw features jitter
// frame to frame, jittery features make visuals strobe, and the only knob
// anyone had was "smooth harder". Smoothing hard enough to kill the shudder is
// also smoothing hard enough to arrive late.
//
// The real problem is that one signal was being asked to be two things at once:
// a MEASUREMENT (wants fidelity, wants to be immediate) and an ANIMATION DRIVER
// (wants continuity, must never jump). Those are opposing requirements and no
// single smoothing constant satisfies both — every value of it is a compromise
// between strobing and lag.
//
// So don't ask one signal to do both. The detector measures and is allowed to
// be noisy, because its output is a discrete EVENT — an event is either there
// or it isn't, and "noisy" has no meaning for it. The envelope animates, and it
// cannot shudder, because after the trigger fires there is no audio left in its
// path at all: the value is a designed curve, a pure function of time since the
// trigger. This is how a drum machine works. You do not smooth a kick drum to
// get a nice-looking meter; you detect the hit and play an envelope.
//
// ---------------------------------------------------------------------------
// WHERE IT RUNS, AND WHY THAT IS THE LATENCY WIN
//
// This runs on the MAIN THREAD against `fftData` the moment it comes out of the
// AnalyserNode — before the worker hop and before the EMA. It is the earliest
// point in the pipeline at which a spectrum exists, so onsets land as close to
// the audio as this architecture allows. It is cheap enough to belong there:
// one subtract-and-accumulate over a bin range, plus a sort of a 64-entry
// window, per band per frame.
//
// The detector is deliberately NOT an entry in hypnosound's AudioFeatures
// barrel. AudioProcessor spawns one worker per entry, and this is a stateful
// event detector, not a per-frame scalar — it would be both wrong and wasteful
// there.
//
// ---------------------------------------------------------------------------
// UNIFORMS (see docs/onset-detection.md)
//
//   onsetKick / onsetSnare / onsetHat / onsetFull      envelope 0-1  ← animate from these
//   onsetKickTrigger / …                               1.0 on the firing frame only
//   onsetKickAge / …                                   seconds since the last onset
//   onsetKickStrength / …                              how hard the last hit was, latched
//
// The envelopes are the point. `onsetKick` is smooth, immediate, and bounded —
// drive brightness, scale, displacement from it directly, with no smoothing of
// your own and no `mix(prev, …)` damping.

import * as hypnosound from 'hypnosound'

// Band edges in Hz. Converted to FFT bins at construction, once the real
// sampleRate is known. Deliberately WIDER than the textbook drum ranges:
// hypnosound's detector documents that narrow bands false-fire on
// frame-uncorrelated input (an 8-bin band drops to P=0.633), and this pipeline
// runs smoothingTimeConstant 0.4 — some smoothing, but not the 0.8 that makes
// the problem vanish entirely. Wider bands buy robustness that costs little,
// since drums are broadband anyway.
export const ONSET_BANDS = {
    kick: { lowHz: 20, highHz: 200, decayMs: 220 }, // longer tail: a kick should feel like it has weight
    snare: { lowHz: 200, highHz: 2000, decayMs: 150 },
    hat: { lowHz: 4000, highHz: 12000, decayMs: 90 }, // short and dry, so hats read as ticks not washes
    full: { lowHz: 0, highHz: Infinity, decayMs: 140 },
}

// A spectrum of N bins comes from an FFT of size 2N, so bin spacing is
// sampleRate / (2 * N). NOTE: this repo's bass/mids/treble use
// sampleRate / fft.length, which is off by 2x and is NOT correct here.
export const hzToBin = (hz, sampleRate, binCount) => {
    if (!isFinite(hz)) return binCount
    const spacing = sampleRate / (2 * binCount)
    return Math.max(0, Math.min(binCount, Math.round(hz / spacing)))
}

const AGE_CAP_SECONDS = 10 // so a shader dividing by age can't blow up during silence

export class OnsetProcessor {
    /**
     * @param {number} sampleRate  audioContext.sampleRate
     * @param {number} binCount    analyser.frequencyBinCount
     * @param {object} deps        injectable for tests; defaults to the hypnosound exports
     */
    constructor(sampleRate, binCount, deps = {}) {
        this.sampleRate = sampleRate
        this.binCount = binCount

        const makeOnsetDetector = deps.makeOnsetDetector ?? hypnosound.makeOnsetDetector
        const makeOnsetEnvelope = deps.makeOnsetEnvelope ?? hypnosound.makeOnsetEnvelope

        // The installed hypnosound may predate the onset detector. Degrade to a
        // no-op that publishes resting values rather than throwing: a missing
        // optional feature must not take the whole visualizer down.
        this.available = typeof makeOnsetDetector === 'function' && typeof makeOnsetEnvelope === 'function'
        if (!this.available) {
            console.warn('[onset] hypnosound has no makeOnsetDetector/makeOnsetEnvelope — onset uniforms will stay at rest. Needs hypnosound >= 2.1.')
            this.bands = []
            return
        }

        this.bands = Object.entries(ONSET_BANDS).map(([name, { lowHz, highHz, decayMs }]) => ({
            name,
            detect: makeOnsetDetector({
                lowBin: hzToBin(lowHz, sampleRate, binCount),
                highBin: hzToBin(highHz, sampleRate, binCount),
            }),
            envelope: makeOnsetEnvelope({ decayMs }),
        }))
    }

    /**
     * Run one frame. Call with the freshest spectrum available.
     * @param {Uint8Array} spectrum  raw getByteFrequencyData output
     * @param {number} nowMs         performance.now()
     * @param {object} out           object to write uniforms into (mutated, no allocation)
     */
    process(spectrum, nowMs, out = {}) {
        for (const band of this.bands) {
            const result = band.detect(spectrum, nowMs)
            const key = band.name.charAt(0).toUpperCase() + band.name.slice(1)

            out[`onset${key}`] = band.envelope(result.onset, result.strength, nowMs)
            out[`onset${key}Trigger`] = result.onset ? 1 : 0
            out[`onset${key}Strength`] = result.strength
            out[`onset${key}Age`] = Math.min(AGE_CAP_SECONDS, result.timeSinceMs / 1000)
        }
        return out
    }
}

// Every uniform name this processor publishes. shader-wrapper declares these so
// shaders don't have to, exactly as it does for the FFT and wavelet features.
export const getOnsetUniformNames = () =>
    Object.keys(ONSET_BANDS).flatMap((name) => {
        const key = name.charAt(0).toUpperCase() + name.slice(1)
        return [`onset${key}`, `onset${key}Trigger`, `onset${key}Strength`, `onset${key}Age`]
    })
