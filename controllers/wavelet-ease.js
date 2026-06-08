/**
 * wavelet-ease — easing controller for wavelet features.
 *
 * Goal: turn the FAST, low-latency wavelet Normalized features (which are lively but
 * sawtooth-y — sharp kick attack then decay) into SMOOTH, eased animation lines, WITHOUT
 * adding complexity to shaders. The shader author just reads e.g. `waveletBand1Eased`.
 *
 * This is an experiment harness: it exposes several easing STRATEGIES side by side so we
 * can compare which gives the best animation feel, then graduate the winner into the
 * audio engine as a first-class feature variant.
 *
 * Strategies (each applied to the same fast inputs):
 *   *Ema      — exponential moving average (simple low-pass). Smooth but symmetric.
 *   *Spring   — critically-damped spring toward the target. Eases in AND out, no overshoot.
 *               Reacts fast on big jumps, settles gently — the most "animation-grade" feel.
 *   *AttackRelease — fast attack (snap up on hits, low latency), slow release (smooth decay).
 *               Best when you want punch on the hit but no sawtooth cliff on the way down.
 *
 * Load: ?controller=wavelet-ease  (needs ?wavelet=true for the inputs)
 * Shader declares e.g.: uniform float waveletBand1Spring;
 */

// Each entry: [outputBaseName, sourceFeatureKey]. The controller exposes <base>Spring etc.
// Band/derived levels use their Normalized variant; exotic ones use their natural key.
const FEATURES = [
    // level features (use Normalized as the low-latency input)
    ['waveletBand0', 'waveletBand0Normalized'], ['waveletBand1', 'waveletBand1Normalized'],
    ['waveletBand2', 'waveletBand2Normalized'], ['waveletBand3', 'waveletBand3Normalized'],
    ['waveletBand4', 'waveletBand4Normalized'], ['waveletBand5', 'waveletBand5Normalized'],
    ['waveletCentroid', 'waveletCentroidNormalized'], ['waveletBass', 'waveletBassNormalized'],
    ['energy', 'energyNormalized'],
    // exotic / derived features (use their natural variant)
    ['waveletTilt', 'waveletTilt'], ['waveletSpread', 'waveletSpread'],
    ['waveletCentroidSlope', 'waveletCentroidSlope'], ['waveletBassRSquared', 'waveletBassRSquared'],
    ['waveletPunch', 'wavelet_punch'], ['waveletConfirmedDrop', 'wavelet_confirmedDrop'],
]

export function make() {
    // per-feature persistent state for each strategy
    const ema = {}
    const spring = {}   // {pos, vel}
    const ar = {}       // attack/release value
    const slew = {}     // slew-rate-limited value (the headless grid winner)
    let lastT = performance.now() / 1000

    const SLEW_MAX = 0.06 // max change per frame — grid optimum (avg score 0.932)

    const EMA_ALPHA = 0.15        // ema smoothing
    const SPRING_STIFF = 120      // spring stiffness (higher = snappier)
    const SPRING_DAMP = 22        // damping (critically damped ~ 2*sqrt(stiff))
    const ATTACK = 0.6            // fast attack toward rising target
    const RELEASE = 0.06          // slow release when target falls

    return function controller(features) {
        const now = performance.now() / 1000
        const dt = Math.min(0.05, now - lastT) // clamp dt for stability
        lastT = now

        const out = {}
        for (const [f, srcKey] of FEATURES) {
            const target = features[srcKey] ?? 0

            // --- EMA ---
            ema[f] = ema[f] === undefined ? target : ema[f] * (1 - EMA_ALPHA) + target * EMA_ALPHA
            out[`${f}Ema`] = ema[f]

            // --- critically-damped spring (best general animation easing) ---
            const s = spring[f] ?? (spring[f] = { pos: target, vel: 0 })
            const force = SPRING_STIFF * (target - s.pos) - SPRING_DAMP * s.vel
            s.vel += force * dt
            s.pos += s.vel * dt
            out[`${f}Spring`] = s.pos

            // --- attack/release (fast up, slow down) ---
            const prev = ar[f] ?? target
            const rate = target > prev ? ATTACK : RELEASE
            ar[f] = prev + (target - prev) * rate
            out[`${f}AttackRelease`] = ar[f]

            // --- slew-rate-limited (low-latency alt; tight cap stays curvy) ---
            const sp = slew[f] ?? (slew[f] = target)
            const d = target - sp
            slew[f] = sp + Math.max(-SLEW_MAX, Math.min(SLEW_MAX, d))
            out[`${f}Slew`] = slew[f]
        }
        return out
    }
}
