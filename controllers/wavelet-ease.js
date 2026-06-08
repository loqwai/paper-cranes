/**
 * wavelet-ease — smooth, animation-ready features from the wavelet audio pipeline.
 *
 * Load with: ?controller=wavelet-ease  (requires ?wavelet=true for the inputs)
 *
 * WHY THIS EXISTS
 * The raw wavelet features (waveletBand0..5, etc.) are fast and low-latency but SAWTOOTH-Y:
 * a kick makes them snap up then decay, which lurches when used to animate. This controller
 * smooths them into flowing lines WITHOUT adding any easing code to your shader — you just
 * read a clean uniform. It also derives a few musical signals the raw features can't express
 * (melody contour, bassline contour, wub/wobble detection).
 *
 * Smoothing method: a critically-damped SPRING. We compared spring vs EMA vs slew-limiting
 * vs attack/release (headless over 22 signals + live), and the spring won for general
 * animation — it eases in AND out with gentle accel/decel (silky curves), reacts fast on
 * big jumps, and never overshoots. So every feature below gets a `*Spring` variant.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * WHAT YOU GET (declare each as `uniform float <name>;` in your shader)
 *
 * SMOOTH LEVELS — spring-eased, 0..1, flowing. Drive size/brightness/intensity off these:
 *   waveletBand0Spring .. waveletBand5Spring   per-octave energy, low→high (bass→treble)
 *   waveletBassSpring                          harmonic-weighted deep-bass energy
 *   waveletCentroidSpring                      spectral brightness (bright vs muddy)
 *   energySpring                               overall loudness / song dynamics
 *
 * MUSICAL CONTOURS — flowing lines that track PITCH (which the level/energy features miss):
 *   melodyFlow      the synth MELODY/KEY as a smooth contour. pitchClass is categorical
 *                   (jumps between notes) and circular (note 11→0 adjacent); we ease along
 *                   the shorter arc, gated by tonal confidence so drums don't yank it. Holds
 *                   on sustained notes, glides on melodic movement. A contour, not transcription.
 *   bassNoteFlow    the BASSLINE notes as a contour — an energy-weighted "bass centroid"
 *                   across the low bands (low note→0, higher bass note→1). Distinct from bass
 *                   ENERGY (how much) — this tracks WHICH note. Coarse (band-resolution).
 *   tonalStrength   how MELODIC the audio is right now (tonal/sustained vs noisy/percussive).
 *
 * WUB / WOBBLE-BASS (dubstep) — a wub is an LFO modulating the bass, so the low end pulses:
 *   wubDepth        HOW HARD it's wobbling (smoothed wobble amplitude, 0..1). The animatable
 *                   one — point glow/scale/distortion intensity at this and it pumps with the
 *                   wob. Stays near 0 when there's no wob, rises on a real wobble drop.
 *   wubPulse        the RAW wob throb (0.5 = center, oscillates with each wob). Un-smoothed —
 *                   use to SEE the wobble waveform; for driving visuals prefer wubDepth.
 *
 * Mic note: a laptop/phone mic flattens the deepest sub-bass, so wub/bass features are
 * weaker than with line-in or ?audio=tab. The wob RATE still comes through; depth is muted.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */

// Features that get a spring-smoothed `*Spring` variant. Each: [outputBase, sourceKey].
// Levels use their Normalized variant (the low-latency 0..1 input).
const SPRING_FEATURES = [
    ['waveletBand0', 'waveletBand0Normalized'], ['waveletBand1', 'waveletBand1Normalized'],
    ['waveletBand2', 'waveletBand2Normalized'], ['waveletBand3', 'waveletBand3Normalized'],
    ['waveletBand4', 'waveletBand4Normalized'], ['waveletBand5', 'waveletBand5Normalized'],
    ['waveletCentroid', 'waveletCentroidNormalized'], ['waveletBass', 'waveletBassNormalized'],
    ['energy', 'energyNormalized'],
]

export function make() {
    // critically-damped spring constants. DAMP ≈ 2*sqrt(STIFF) → critical (no overshoot).
    const SPRING_STIFF = 120
    const SPRING_DAMP = 22

    // persistent state across frames
    const spring = {}        // per-feature { pos, vel }
    let melodyFlow = null     // flowing pitch contour
    let tonalSmooth = 0       // smoothed tonal strength
    const spectralSmooth = { crest: 0, rough: 0, entropy: 0 } // smoothed jittery spectral texture
    let bassNoteFlow = null   // flowing bassline-pitch contour
    let wubBaseline = 0       // slow bass average, for wub-depth detection
    let wubDepth = 0          // smoothed wobble amplitude
    let lastT = performance.now() / 1000

    return function controller(features) {
        const now = performance.now() / 1000
        const dt = Math.min(0.05, now - lastT) // clamp dt so a long frame can't blow up the spring
        lastT = now

        const out = {}

        // ── spring-smooth each level feature ──
        for (const [f, srcKey] of SPRING_FEATURES) {
            const target = features[srcKey] ?? 0
            const s = spring[f] ?? (spring[f] = { pos: target, vel: 0 })
            const force = SPRING_STIFF * (target - s.pos) - SPRING_DAMP * s.vel
            s.vel += force * dt
            s.pos += s.vel * dt
            out[`${f}Spring`] = s.pos
        }

        // ── MELODY FLOW: ease the (categorical, circular) pitch into a flowing contour ──
        const pitch = features.pitchClassNormalized ?? 0
        const tonal = features.spectralCrest ?? 0
        // Looser gate (was tonal>0.3) so melodic instruments with MODERATE crest — flutes,
        // strings, pads, slides — still drive the melody, and a faster chase (0.18) so the
        // contour follows gliding/portamento pitch instead of lagging behind it.
        const confident = Math.min(1, Math.max(0, (tonal - 0.15) * 2.5))
        if (melodyFlow === null) melodyFlow = pitch
        let diff = pitch - melodyFlow            // step along the SHORTER arc (pitch wraps at 1.0)
        if (diff > 0.5) diff -= 1.0
        if (diff < -0.5) diff += 1.0
        // RATE-LIMIT the step so a melodic LEAP (or pitch jumping to the opposite side of the
        // circle) can't teleport melodyFlow ~1.0 in one frame — that flashed everything driven
        // by it. Now it always GLIDES between notes, even across big intervals (slew cap 0.03/frame).
        let step = diff * 0.18 * confident
        step = Math.max(-0.03, Math.min(0.03, step))
        melodyFlow += step
        melodyFlow = (melodyFlow + 1.0) % 1.0
        out.melodyFlow = melodyFlow
        out.tonalStrength = (tonalSmooth = tonalSmooth * 0.85 + tonal * 0.15)

        // ── SMOOTHED SPECTRAL TEXTURE features ── these raw FFT features (crest/roughness/
        // entropy) are JITTERY frame-to-frame (jump 0.12-0.17/frame) and make any visual they
        // drive SHIVER. EMA-smooth them here so shaders can use texture features without flicker.
        spectralSmooth.crest = spectralSmooth.crest * 0.85 + (features.spectralCrestNormalized ?? 0) * 0.15
        spectralSmooth.rough = spectralSmooth.rough * 0.85 + (features.spectralRoughnessNormalized ?? 0) * 0.15
        spectralSmooth.entropy = spectralSmooth.entropy * 0.85 + (features.spectralEntropyNormalized ?? 0) * 0.15
        out.spectralCrestSmooth = spectralSmooth.crest
        out.spectralRoughnessSmooth = spectralSmooth.rough
        out.spectralEntropySmooth = spectralSmooth.entropy

        // ── BASS NOTE FLOW: energy-weighted "bass centroid" across the low bands ──
        const e0 = features.waveletBand0 ?? 0, e1 = features.waveletBand1 ?? 0
        const e2 = features.waveletBand2 ?? 0, e3 = features.waveletBand3 ?? 0
        const lowTot = e0 + e1 + e2 + e3 + 1e-6
        const bassCentroid = (e1 * 0.33 + e2 * 0.66 + e3 * 1.0) / lowTot // 0 (low note) .. 1 (higher)
        const bassPresent = Math.min(1, (e0 + e1) * 2)                   // gate: is there bass energy?
        if (bassNoteFlow === null) bassNoteFlow = bassCentroid
        bassNoteFlow += (bassCentroid - bassNoteFlow) * 0.1 * bassPresent // hold when bass is silent
        out.bassNoteFlow = bassNoteFlow

        // ── WUB detection: bass oscillating around its slow baseline = the wobble ──
        const bassNow = features.waveletBass ?? 0
        wubBaseline = wubBaseline * 0.92 + bassNow * 0.08    // slow average bass
        const deviation = bassNow - wubBaseline              // current swing above/below baseline
        wubDepth = wubDepth * 0.9 + Math.abs(deviation) * 0.1
        out.wubDepth = Math.min(1, wubDepth * 4)             // "how hard is it wobbling" (animatable)
        out.wubPulse = Math.max(0, Math.min(1, deviation * 6 + 0.5)) // raw wob throb (0.5 = center)

        return out
    }
}
