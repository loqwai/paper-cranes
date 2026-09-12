/**
 * bear-move — motion state for the phosphor bear (shaders/bear/1.frag)
 *
 * Fills the gaps GLSL cannot hold across frames:
 *   - bearPunch : a DAMPED beat punch (0..1) for in/out scale. Critically-damped spring,
 *                 so the bear surges rather than snapping. (journal beat 27: a 3-frame
 *                 attack reads as a strobe; ~100 ms of swell reads as a punch.)
 *   - bearSpin  : a MONOTONIC rotation accumulator, radians, always the same direction.
 *                 Audio modulates the RATE, never the angle — so the angle can never jump
 *                 backwards when a feature dips (the rate-not-angle discipline).
 *   - eyeSpin   : the same, faster, for the rezz spiral eyes.
 *   - bearTilt  : a slow body sway in radians, amplitude follows the music.
 *
 * The punch driver is a TRANSIENT detector (fast EMA minus slow EMA of bass), not a raw
 * z-score: z-scores are designed to be spiky and manufacture false edges (journal beat 29).
 */

const EMA = (prev, next, a) => prev + (next - prev) * a

export function make(cranes) {
    const s = {
        t: performance.now() / 1000,
        bassFast: 0,
        bassSlow: 0,
        midFast: 0,
        midSlow: 0,
        punch: 0,
        punchVel: 0,
        breath: 0,
        env: 0,
        lo: 0,
        hi: 0.5,
        intn: 0,
        intSec: 0,
        iLo: 0,
        iHi: 0.4,
        notches: 0,
        refr: 0,
        cool: 0,
        eyeOpen: 0,
        spin: 0,
        eye: 0,
        tilt: 0,
        lastLift: 0,
    }

    return (features) => {
        const now = performance.now() / 1000
        // real dt, clamped so an alt-tab stall cannot teleport the geometry
        const dt = Math.min(Math.max(now - s.t, 1 / 240), 1 / 20)
        s.t = now

        const bass = features.bassNormalized ?? 0
        const mids = features.midsNormalized ?? 0
        const energy = features.energyNormalized ?? 0

        // quiet gate: in silence everything settles, matching the shader's MOTION
        const gate = Math.min(Math.max((energy - 0.04) / 0.12, 0), 1)

        // ---- transient detectors: fast EMA above slow EMA = something just hit ----
        // rates are per-second, converted to per-frame so 60 and 144 Hz behave alike
        const aF = 1 - Math.exp(-dt * 14.0)
        const aS = 1 - Math.exp(-dt * 1.1)
        s.bassFast = EMA(s.bassFast, bass, aF)
        s.bassSlow = EMA(s.bassSlow, bass, aS)
        s.midFast = EMA(s.midFast, mids, aF)
        s.midSlow = EMA(s.midSlow, mids, aS)

        // ---- KICK ENVELOPE FOLLOWER + AUTO-GAIN ----
        // A fast-minus-slow EMA was measured at lift p50 0.008 / p90 0.337 over 3169 frames:
        // it subtracted away almost the whole bass swing, so ordinary beats moved the bear ~1%.
        // An envelope follower keeps the shape instead of differencing it: snap up to a kick,
        // fall back slowly between kicks.
        const atk = 1 - Math.exp(-dt * 34.0)
        const rel = 1 - Math.exp(-dt * 4.2)
        s.env = EMA(s.env, bass, bass > s.env ? atk : rel)

        // Adaptive normalisation: the running floor creeps up and the ceiling creeps down, so
        // whatever the input level, the envelope is re-spread across the full 0..1. This is why
        // the zoom stays obvious on quiet material AND on a hot line-in.
        s.lo = Math.min(s.env, s.lo + dt * 0.20)
        s.hi = Math.max(s.env, s.hi - dt * 0.20)
        const span = Math.max(s.hi - s.lo, 0.06)
        const kick = Math.min(Math.max((s.env - s.lo) / span, 0), 1)

        // 0.65 power expands the MIDDLE of the range: an ordinary beat (kick ~0.35) becomes
        // ~0.50 of the zoom instead of ~0.35, while the ceiling is unchanged. Without it the
        // auto-gain's ceiling, held up by occasional huge hits, left typical beats small.
        const lift = Math.pow(kick, 0.65) * gate
        const midLift = Math.pow(Math.min(Math.max((s.midFast - s.midSlow) * 5.5, 0), 1) * gate, 0.6)

        // ---- PUNCH: critically damped spring chasing the transient ----
        // omega sets the attack (~90 ms to peak); zeta 1 = no overshoot ringing.
        const omega = 26.0
        const zeta = 0.9
        const target = lift
        s.punchVel += (omega * omega * (target - s.punch) - 2 * zeta * omega * s.punchVel) * dt
        s.punch += s.punchVel * dt
        s.punch = Math.min(Math.max(s.punch, 0), 1.12)

        // ---- SPIN: monotonic. Audio only ever ADDS rate, so it never reverses. ----
        const spinRate = 0.22 + energy * 0.55 + lift * 2.2        // rad/s
        s.spin += spinRate * dt

        const eyeRate = 1.15 + energy * 1.6 + lift * 5.5          // rad/s, hypnotic
        s.eye += eyeRate * dt

        // ---- TILT: slow sway, amplitude follows the music, phase is a pure clock ----
        s.tilt += dt * (0.33 + energy * 0.25)
        const tilt = Math.sin(s.tilt) * (0.035 + gate * 0.075) + Math.sin(s.tilt * 0.41) * 0.02

        // ---- BREATH: continuous, always-moving. The punch is an EVENT and is silent between
        // hits; this keeps the bear alive through a groove by tracking the bass LEVEL (a
        // smooth normalized feature, never a z-score) with a slow follower.
        // Deliberately driven by ENERGY, not bass: the punch already owns the bass transient, so
        // pairing them would be one signal drawn twice. This is the slow "is the track big right
        // now" swell underneath the per-beat punch.
        s.breath = EMA(s.breath, energy * gate, 1 - Math.exp(-dt * 1.3))

        // ---- INTENSITY RATCHET -> the rezz spiral eyes ----
        // "Intense" is deliberately NOT bass: bass already owns the zoom, and driving the eyes
        // from it would be one signal drawn twice. This blend is loudness + spectral chaos +
        // brightness, i.e. "the track is going hard", which is a different musical question.
        // Measured raw: p50 0.34, p85 0.56, p95 0.71, but jitter 0.159 per 70 ms - far too
        // spiky to threshold directly, so it is smoothed BEFORE the ratchet sees it.
        const intRaw =
            (features.energyNormalized ?? 0) * 0.45 +
            (features.spectralEntropyNormalized ?? 0) * 0.30 +
            (features.trebleNormalized ?? 0) * 0.25
        s.intn = EMA(s.intn, intRaw * gate, 1 - Math.exp(-dt * 1.6))
        // SECTION scale (~6 s time constant). The de-jittered signal still swings on a ~1 s
        // beat scale, and a ratchet fed from that refilled faster than it could drain, so the
        // eyes never closed. A section is not a beat: smooth to the timescale of the QUESTION.
        s.intSec = EMA(s.intSec, s.intn, 1 - Math.exp(-dt * 0.17))

        // Adaptive again, but on a MUCH slower window (~50 s) than the kick's: "intense" has to
        // mean intense relative to this track's recent range, or the thresholds only suit one
        // song. Measured with fixed thresholds: intensity p10 0.45 never fell under REARM 0.34,
        // so the ratchet sat pinned at max and the eyes were permanently on.
        s.iLo = Math.min(s.intSec, s.iLo + dt * 0.02)
        s.iHi = Math.max(s.intSec, s.iHi - dt * 0.02)
        const iNorm = Math.min(Math.max((s.intSec - s.iLo) / Math.max(s.iHi - s.iLo, 0.06), 0), 1)

        // Ratchet: each crossing of ARM adds a notch (up to MAX) and starts a refractory.
        // Notches HOLD while the section stays hot, and only bleed off after the intensity has
        // sat below REARM for the hold time - so the eyes come out during an intense section
        // and stay out, instead of flickering on individual transients.
        const ARM = 0.74, REARM = 0.46, MAX = 3
        s.refr = Math.max(0, s.refr - dt)
        if (iNorm > ARM && s.refr === 0 && s.notches < MAX) {
            s.notches += 1
            s.refr = 0.5
        }
        if (iNorm < REARM) {
            s.cool += dt
            if (s.cool > 1.2) s.notches = Math.max(0, s.notches - dt * 0.55)
        } else {
            s.cool = 0
        }
        // eased follower so the spiral fades in/out rather than stepping
        s.eyeOpen = EMA(s.eyeOpen, Math.min(s.notches / MAX, 1), 1 - Math.exp(-dt * 2.4))

        s.lastLift = lift

        return {
            bearBreath: s.breath,
            bearPunch: s.punch,
            bearLift: lift,
            bearMidLift: midLift,
            bearSpin: s.spin % (Math.PI * 2),
            bearSpinRaw: s.spin,
            eyeSpin: s.eye % (Math.PI * 2),
            bearTilt: tilt,
            bearGate: gate,
            eyeOpen: s.eyeOpen,
            bearIntensity: iNorm,
            bearIntensityRaw: s.intn,
            eyeNotches: s.notches,
        }
    }
}
