// VENDORED from hypnosound (github.com/hypnodroid/hypnosound,
// src/utils/onsetEnvelope.js) at c5384ab3, the head of hypnosound PR #18 (which
// carries PR #19). No published hypnosound has it: npm stops at 2.0.0.
// OnsetProcessor prefers the installed hypnosound's copy when one exists, so
// delete this file once paper-cranes depends on a release that exports it.
// Change it upstream, not here.

// Synthesized attack-decay envelope driven by discrete onset events.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
//
// A single audio signal cannot be both a MEASUREMENT and an ANIMATION DRIVER.
// A measurement wants fidelity and immediacy; an animation driver wants
// continuity. Asking one smoothed feature to do both is what produces the
// classic tradeoff: raw features jitter, so you smooth them, and smoothing hard
// enough to stop the jitter also puts the visuals a beat behind the music.
//
// Splitting the two dissolves the tradeoff. The detector measures — it stays
// fast and is allowed to be noisy, because its output is a discrete event, and
// an event is either there or it isn't. This generator animates — it plays back
// a DESIGNED curve. The envelope cannot shudder no matter how noisy the audio
// is, because after the trigger fires there is no audio left in its path: the
// value is a pure function of time-since-trigger and one latched peak.
//
// That is the whole trick, and it is the same one a drum machine uses. You do
// not smooth a kick drum's waveform to get a nice-looking VU response; you
// detect the hit and play an envelope.
//
// ---------------------------------------------------------------------------
// FRAME-RATE INDEPENDENCE
//
// The value is computed from an ABSOLUTE timestamp, not accumulated per frame.
// A per-frame recurrence (`v *= 0.9` each frame) silently changes its decay
// time whenever the frame rate changes — the same code decays twice as fast on
// a 120Hz display, and stutters visibly when frames drop. Evaluating a closed
// form at `nowMs` means a dropped frame produces a correctly-placed value
// rather than a delayed one, and the curve is identical at 30, 60 or 144 fps.
//
// ---------------------------------------------------------------------------
// STATE
//
// Three floats and a timestamp, no allocation, no history buffer. Deliberately
// portable to a microcontroller: the only transcendental is a single exp() on
// the decay, which a fixed-point port can replace with a small lookup table or
// swap for `curve: 'linear'`, which needs no transcendental at all.

export const defaultEnvelopeConfig = {
    attackMs: 12, // rise time to the peak. ~1 frame at 60fps: instant to the eye, but not a single-frame pop
    decayMs: 140, // exponential time constant of the tail (NOT the time to reach zero)
    curve: 'exp', // 'exp' = percussive, natural. 'linear' = ramp down, no transcendental — for fixed-point ports
    floor: 0, // resting value between events; raise it to keep a visual from going fully dark
    retrigger: 'peak', // 'peak' keeps the louder of the current value and the new hit; 'reset' always jumps to the new hit
}

// Shape of the tail, normalized 0-1, as a function of time since the attack ended.
const decayShape = (elapsedMs, decayMs, curve) => {
    if (decayMs <= 0) return 0
    if (curve === 'linear') return Math.max(0, 1 - elapsedMs / decayMs)
    return Math.exp(-elapsedMs / decayMs)
}

/**
 * Build an envelope generator.
 *
 * The returned function is called once per frame with the trigger state and the
 * current clock, and returns a number in [floor, 1] to animate from.
 *
 *   const detect = makeOnsetDetector({ lowBin: 0, highBin: 16 })
 *   const kickEnv = makeOnsetEnvelope({ decayMs: 180 })
 *   // per frame:
 *   const { onset, strength } = detect(spectrum, now)
 *   const kick = kickEnv(onset, strength, now)
 *
 * @param {object} defaults config overrides, merged over defaultEnvelopeConfig
 * @returns {(triggered: boolean, level: number, nowMs: number, overrides?: object) => number}
 */
export const makeOnsetEnvelope = (defaults = {}) => {
    let peak = 0 // value the current attack is heading toward
    let base = 0 // value at the instant of the last trigger, so the attack never steps downward
    let triggeredAt = -Infinity
    let last = 0 // most recent output, needed as the `base` of the next retrigger

    return (triggered, level = 1, nowMs = 0, overrides = {}) => {
        const cfg = { ...defaultEnvelopeConfig, ...defaults, ...overrides }
        const attackMs = Math.max(0, cfg.attackMs)
        const floor = cfg.floor

        // A backwards clock (a seek, a test harness, a wrapped timer) would
        // otherwise leave the envelope stuck at its last value until the clock
        // caught up. Treat it as a fresh start.
        if (nowMs < triggeredAt) {
            triggeredAt = -Infinity
            peak = 0
            base = 0
        }

        if (triggered) {
            // `level` is the detector's `strength`: ~0 for a graze, →1 for a
            // hit that dwarfs the threshold. Clamped because a caller may pass
            // an unbounded feature here instead.
            const hit = Math.min(1, Math.max(0, level))
            // 'peak' retrigger: a soft hit landing on top of a loud tail must
            // not yank the value DOWN — that reads as a flicker, the exact
            // artifact this whole design exists to remove. Take the louder.
            base = last
            peak = cfg.retrigger === 'reset' ? hit : Math.max(last, hit)
            triggeredAt = nowMs
        }

        const age = nowMs - triggeredAt
        let shape
        if (!isFinite(age)) {
            shape = 0 // no onset has ever fired
        } else if (age < attackMs) {
            // Rise from wherever we were, not from zero, so the curve is
            // continuous across a retrigger.
            const t = attackMs === 0 ? 1 : age / attackMs
            shape = base + (peak - base) * t
            last = Math.max(floor, shape)
            return last
        } else {
            shape = peak * decayShape(age - attackMs, cfg.decayMs, cfg.curve)
        }

        last = Math.max(floor, shape)
        return last
    }
}

/**
 * Convenience: detector output straight to an envelope value.
 *
 * Wraps makeOnsetDetector's result object so a caller that already has one can
 * drive an envelope without unpacking it.
 *
 *   const env = makeOnsetEnvelope()
 *   const value = envelopeFrom(env, detect(spectrum, now), now)
 */
export const envelopeFrom = (envelope, result, nowMs, overrides) =>
    envelope(result.onset, result.strength, nowMs, overrides)
