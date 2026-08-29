// @fullscreen: true
// @mobile: false
// @favorite: true
// @tags: taco, plasma, event-horizon, wavelet, iris, lattice, reactive, claude
//
// PLASMA TACO LIVE — the plasma taco rebuilt on the iris/lattice reactivity stack.
//
// Lineage: shaders/redaphid/taco/plasma.frag (Ether-by-nimitz plasma fold inside a taco
// silhouette) — but every audio path has been replaced with the signal-conditioning
// discipline from redaphid/iris/1.frag and redaphid/chromadepth-lattice/6.frag.
//
// WHAT CHANGED vs redaphid/taco/plasma (and why it reacts harder, not just faster):
//   1. WAVELET, not FFT z-scores. Drive comes from the DWT octave bands via the
//      wavelet-ease controller's spring-smoothed *Spring uniforms (128-sample sliding
//      window, ~3ms, vs the FFT's ~85ms). Bass lands ON the kick instead of after it.
//   2. NO AUDIO IN A PHASE. The original did `#define t (iTime + T_ADVANCE)` and then
//      rotated by `m(t * 0.4)` — injecting raw z-scores straight into the plasma's time
//      AND its rotation angle. Per advanced-shader-techniques §1/§2 that shivers and
//      rocks backward when the feature falls. Here every clock is a MONOTONIC ACCUMULATOR
//      from the controller (flowPhase/morphPhase/spinPhase/huePhase, phase += rate*dt),
//      scaled only by a static knob. Audio moves AMPLITUDE and SHAPE, never the phase.
//   3. quietGate ON EVERY AUDIO OFFSET. A quiet room's mic noise blows up the Normalized
//      /z-score ranges; the original had no gate, so silence drove full-range swings.
//      Now quiet = calm, dark, slow, and loud = bloom. They look like different shaders.
//   4. DEPTH-COHERENT REACTIVITY (lattice bandForDepth): the raymarch's near steps
//      shimmer with treble, mid steps with the low-mids, far steps throb with deep bass.
//      The frequency spectrum is laid out THROUGH the plasma volume, front to back.
//   5. FEATURE→REGION FAMILIES (iris/1): bass=core, mids=arms, treble=tips, radially.
//      PITCH (melodyFlow) → colour; LEVEL (bands) → size/depth; TEXTURE (crest/rough) →
//      detail/sparkle. Related sounds move related parts.
//   6. SECTION-DRIVEN PALETTE. The original rotated palette on a 25-second wall clock.
//      Here the palette family advances on sectionMode — the controller's breakdown→drop
//      detector — and crossfades over sectionMix. The colour changes because the MUSIC
//      changed sections, not because a timer fired.
//   7. BASS YOU CAN FEEL (§5): a smooth swell (waveletBassSpring) for the build plus a
//      snappy raw transient (waveletBassZScore / wavelet_bassHit) for the hit, both
//      driving a zoom punch that springs back. Transient → amplitude, never a phase.
//   8. LOUD BLOOMS OUTSIDE THE SILHOUETTE. Quiet: plasma sits inside the taco, void is
//      black (the original's look). Loud: the plasma corona bursts past the ink and
//      lights the whole frame. The silhouette reading is the RESTING state.
//
// REQUIRES ?wavelet=true&controller=wavelet-ease — without them the controller uniforms
// read 0 and the shader falls back to a calm, still, dim taco (by design, not by accident).
//
// PRESETS — paste into the browser:
// Tab audio (Spotify/SoundCloud, Chrome desktop):
// http://localhost:6969/?shader=redaphid/taco/plasma-taco-live&image=images/taco-stencil.png&wavelet=true&controller=wavelet-ease&fullscreen=true
// Mic:
// http://localhost:6969/?shader=redaphid/taco/plasma-taco-live&image=images/taco-stencil.png&wavelet=true&controller=wavelet-ease&fullscreen=true&knob_1=0.5&knob_4=0.6
// Live jam (knob drawer):
// http://localhost:6969/jam.html?shader=redaphid/taco/plasma-taco-live&image=images/taco-stencil.png&wavelet=true&controller=wavelet-ease&audio=tab
//
// KNOBS — every knob is a 0→1 DEPTH and 0 is a good default (unset knobs read 0):
//   knob_1  PLASMA FLOW   speed of the fold field            (0 = slow drift, 1 = churning)
//   knob_2  ZOOM          0 = wide taco, 1 = pushed in
//   knob_3  DENSITY       sin-fold packing / detail
//   knob_4  REACTIVITY    master depth of ALL audio motion   (0 = still, 1 = wild)
//   knob_5  CORONA        how far loud passages burst outside the silhouette
//   knob_6  KALEIDO       0 = linear plasma, 1 = 12-fold mirror
//   knob_7  RIM GLOW      chrome on the taco ink lines
//   knob_8  TUNNEL        feedback rush inside the taco (event-horizon fall-in)
//   knob_9  SPARKLE       iridescent treble glints
//   knob_10 LENS          gravitational lensing strength
//
// License: CC0. Plasma fold field after "Ether" by nimitz (via shaders/plasma.frag).

// ── wavelet-ease controller outputs (hand-declared; read 0 without ?controller=) ────────
uniform float waveletBand2Spring;      // low-mid  — body / vocal
uniform float waveletBand3Spring;      // mid
uniform float waveletBand5Spring;      // treble / air
uniform float waveletBassSpring;       // harmonic-weighted deep bass (smooth swell)
uniform float waveletCentroidSpring;   // brightness
uniform float energySpring;            // loudness
uniform float melodyFlow;              // smooth melodic contour → the palette journey
uniform float tonalStrength;           // tonal vs percussive
uniform float wubDepth;                // wobble-bass amplitude
uniform float spectralCrestSmooth;     // articulation (EMA — raw crest shivers)
uniform float spectralRoughnessSmooth; // grit
uniform float spectralEntropySmooth;   // chaos
uniform float quietGate;               // 0 in silence → 1 loud. Gates EVERY audio offset.
uniform float spinPhase;               // monotonic accumulators (phase += rate*dt).
uniform float morphPhase;              // Never iTime*rate — that ACCELERATES over a set.
uniform float flowPhase;
uniform float huePhase;
uniform float evoWarp;                 // minutes-scale drifters — the look never repeats
uniform float evoPlasma;
uniform float sectionMode;             // advances on breakdown→drop (discrete visual mode)
uniform float sectionMix;              // 0→1 crossfade into the new mode
// waveletBassZScore, wavelet_bassHit, waveletTiltNormalized and all FFT features
// auto-declare via the shader wrapper.

#define PI  3.14159265359
#define TAU 6.28318530718

// ════════════════════════════════════════════════════════════════════════════════════════
// SIGNAL CONDITIONING — the iris/1 discipline.
// Every continuous driver is spring-smoothed AND quietGate'd. Raw values appear ONLY as
// local transients (the kick punch), and only ever scale an amplitude.
// ════════════════════════════════════════════════════════════════════════════════════════

#define REACT      (0.55 + knob_4 * 1.25)          // master reactivity depth (knob_4)
#define GATE       (quietGate * REACT)

// LEVEL family → SIZE / DEPTH / THICKNESS
#define BASS_LVL   (waveletBassSpring   * quietGate)
#define LOWMID_LVL (waveletBand2Spring  * quietGate)
#define MID_LVL    (waveletBand3Spring  * quietGate)
#define AIR_LVL    (waveletBand5Spring  * quietGate)
#define LOUD       (energySpring        * quietGate)

// PITCH family → COLOUR
#define MELODY     (melodyFlow)
#define BRIGHT     (waveletCentroidSpring * quietGate)

// TEXTURE family → DETAIL / SPARKLE / EDGE
#define GRIT       (spectralRoughnessSmooth)
#define ARTIC      (spectralCrestSmooth)
#define CHAOS      (spectralEntropySmooth)

// TRANSIENT — raw, self-calibrating, amplitude-only. waveletBassZScore fires on the beat at
// ANY input gain; wavelet_bassHit is the sharp un-smoothed deep-bass trigger.
#define KICK       (clamp(clamp(waveletBassZScore, 0.0, 1.0) * 0.65 \
                        + clamp(wavelet_bassHit,   0.0, 1.0) * 0.45, 0.0, 1.0))

// DROP GLOW — smooth swell + articulation. Replaces the old controller's latched drop_glow.
#define DROP_GLOW  (clamp(energySpring * 0.6 + spectralCrestSmooth * 0.4, 0.0, 1.0) * quietGate)

// MONOTONIC CLOCKS. flowPhase/morphPhase/spinPhase accumulate rate*dt in the controller, so
// multiplying by a STATIC knob can never introduce the iTime*Δrate acceleration bug.
#define PLASMA_PHASE (flowPhase * mix(3.0, 16.0, knob_1) + morphPhase * 0.8)
#define SWIRL_PHASE  (spinPhase * mix(1.0, 4.0, knob_1))

// SHAPE — audio moves these, NOT any phase.
#define DENSITY     (1.1 + knob_3 * 2.6 + evoPlasma * 0.5 + MID_LVL * 1.1 * REACT)
#define WAVE_AMP    (0.42 + CHAOS * 0.35 + wubDepth * 0.30 * REACT)
#define SOFTNESS    (1.0 + (evoWarp - 0.5) * 0.25)
#define BASS_PUMP   (BASS_LVL * 0.30 * REACT + wubDepth * 0.10)

// ZOOM — knob base, breathed by loudness, punched by the kick (springs back on its own
// because the smooth term decays with the spring, §5 "bass you can feel").
#define ZOOM_BASE   (mix(2.0, 0.55, knob_2))
#define KICK_ZOOM   (clamp(KICK * 0.085 * REACT + BASS_LVL * 0.05 * REACT, 0.0, 0.17))

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// ════════════════════════════════════════════════════════════════════════════════════════
// DEPTH-COHERENT REACTIVITY — ported from chromadepth-lattice/6 bandForDepth().
// Near raymarch steps shimmer with treble, middle with low-mids, far with deep bass, so the
// spectrum is laid out THROUGH the plasma volume instead of modulating it uniformly.
// ════════════════════════════════════════════════════════════════════════════════════════
float bandForDepth(float ld) {
    if (ld < 0.34) return AIR_LVL;
    if (ld < 0.67) return LOWMID_LVL;
    return BASS_LVL;
}

// Plasma fold field (Ether/nimitz). `ph` is a MONOTONIC phase — never audio.
float plasmaMap(vec3 p, float ph, float dens, float amp) {
    p.xz *= rot2(ph * 0.40);
    p.xy *= rot2(ph * 0.31);
    vec3 q = p * dens + ph;
    return length(p + vec3(0.0, 0.0, sin(ph * 0.7) * 0.2)) * log(length(p) + SOFTNESS)
         + sin(q.x + sin(q.z + sin(q.y))) * amp
         - 1.0 + BASS_PUMP;
}

// ════════════════════════════════════════════════════════════════════════════════════════
// PALETTE — lattice/6 lush() (bounded Oklch, high chroma, no muddy mid-mixes) driven by the
// iris/1 single-L discipline: gather everything into ONE traversal scalar + ONE lightness,
// instead of a cascade of L *= and C *= multipliers that stack into washout.
// ════════════════════════════════════════════════════════════════════════════════════════
vec3 lush(float s, float lit) {
    float h = fract(s) * TAU;
    // L floor is LOW (unlike the lattice, whose lit background had to glow) so quiet reads
    // dark; the loud swell lifts it. Hard ceiling = single point of white-out failure.
    float L = clamp(0.10 + 0.72 * clamp(lit, 0.0, 1.0), 0.0, 0.93);
    float C = clamp((0.105 + seed2 * 0.05) + 0.045 * sin(s * TAU * 0.5 + 1.3) + ARTIC * 0.03,
                    0.0, 0.32);
    return oklch2rgb(vec3(L, C, h));
}

// ════════════════════════════════════════════════════════════════════════════════════════
// TACO MASK — unchanged from redaphid/taco/plasma.frag (known-good with taco-stencil.png:
// transparent background, dark ink lines on a white interior).
// returns: (alpha = inside image bounds, ink = 0..1 darkness of the stroke)
// ════════════════════════════════════════════════════════════════════════════════════════
float gTacoScale;
vec2 getTacoMask(vec2 uv) {
    vec2 res = iResolution.xy;
    float screenAspect = res.x / res.y;
    vec2 c = (uv - 0.5) * gTacoScale;
    if (screenAspect > 1.0) c.x *= screenAspect;
    else                    c.y /= screenAspect;
    vec2 imgUV = c + 0.5;
    float margin = 0.02;
    if (imgUV.x < margin || imgUV.x > 1.0 - margin ||
        imgUV.y < margin || imgUV.y > 1.0 - margin) return vec2(0.0);
    vec4 tex = getInitialFrameColor(imgUV);
    return vec2(tex.a, tex.a * (1.0 - tex.r));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv  = fragCoord / res;
    vec2 sp  = uv * 2.0 - 1.0;
    bool hasHistory = iFrame > 2;

    vec2 tacoCenter = vec2(0.5, 0.48);

    // ── TACO SCALE: knob base + smooth loudness breath + kick punch (springs back) ───────
    gTacoScale = ZOOM_BASE - LOUD * 0.14 * REACT - KICK_ZOOM * 0.9;

    vec2 maskInfo  = getTacoMask(uv);
    float silhouette = maskInfo.x;
    float ink        = maskInfo.y;

    // BODY = the stencil's alpha channel, i.e. the whole taco shape. The original derived its
    // fill by probing 4 neighbours 30px away for ink and only filling where ink surrounded the
    // pixel — so the taco's large smooth areas never filled and sat black, and the plasma only
    // peeked through near the drawn detail. The alpha IS the silhouette, so use it: the plasma
    // now fills the entire taco. inkZone is kept as a DETAIL weight (near the drawn strokes)
    // rather than as the fill mask.
    float px = 1.0 / min(res.x, res.y);
    float ink_sides = 0.0;
    if (getTacoMask(uv + vec2(px * 30.0, 0.0)).y > 0.3) ink_sides += 0.25;
    if (getTacoMask(uv - vec2(px * 30.0, 0.0)).y > 0.3) ink_sides += 0.25;
    if (getTacoMask(uv + vec2(0.0, px * 30.0)).y > 0.3) ink_sides += 0.25;
    if (getTacoMask(uv - vec2(0.0, px * 30.0)).y > 0.3) ink_sides += 0.25;
    float body   = silhouette;
    float inkZone = max(ink, smoothstep(0.5, 0.85, ink_sides)) * silhouette;

    // ── PLASMA SAMPLE COORDS ────────────────────────────────────────────────────────────
    vec2 pT = (uv - tacoCenter) * 2.0 * (1.0 - KICK_ZOOM * 0.55);
    pT.x *= res.x / res.y;
    float rr = length(pT);

    // Gravitational lensing — envelope so there's no hot singularity at the centre.
    float lensEnv = smoothstep(0.0, 0.15, rr) * smoothstep(0.9, 0.4, rr);
    float lens = (knob_10 * 0.6 + LOUD * 0.30 * REACT) * lensEnv;
    vec2 pL = pT * (1.0 - lens * 0.3);
    pL = rot2(lens * 0.5) * pL;

    // Kaleidoscope fold (knob_6). Rotation comes from SWIRL_PHASE (monotonic), not iTime.
    if (knob_6 > 0.05) {
        float n   = mix(2.0, 12.0, knob_6);
        float ang = atan(pL.y, pL.x);
        float rad = length(pL);
        float seg = TAU / n;
        ang = mod(ang + SWIRL_PHASE * 0.5, seg);
        ang = abs(ang - seg * 0.5);
        pL = vec2(cos(ang), sin(ang)) * rad;
    }

    // ── RAYMARCH with per-depth band ownership (lattice bandForDepth) ────────────────────
    float ph   = PLASMA_PHASE;
    float dens = DENSITY;
    float amp  = WAVE_AMP;
    vec3  cl   = vec3(0.0);
    float glow = 0.0;
    float d    = 2.5;
    for (int i = 0; i <= 5; i++) {
        float ld   = float(i) / 5.0;              // 0 = near, 1 = far
        float band = bandForDepth(ld);            // this depth slice's owning frequency
        float dD   = dens + band * 0.85 * REACT;  // its band packs the fold tighter
        float aD   = amp * (0.80 + band * 0.85 * REACT);
        vec3  p3   = vec3(0.0, 0.0, 5.0) + normalize(vec3(pL, -1.0)) * d;
        float rz   = plasmaMap(p3, ph, dD, aD);
        float f    = clamp((rz - plasmaMap(p3 + 0.1, ph, dD, aD)) * 0.5, -0.1, 1.0);
        vec3  emit = vec3(0.10, 0.30, 0.40) + vec3(5.0, 2.5, 3.0) * f;
        emit *= 1.0 + band * 1.15 * REACT;        // the owning band lights its own depth
        cl    = cl * emit + smoothstep(2.5, 0.0, rz) * 0.7 * emit;
        glow += smoothstep(2.0, 0.0, rz) * (0.12 + band * 0.30 * REACT);
        d    += min(rz, 1.0);
    }
    float lum = clamp(dot(cl, vec3(0.33)) * 0.9 + glow * 0.5, 0.0, 1.6);

    // ── FEATURE→REGION FAMILIES (iris/1): bass=core, mids=arms, treble=tips ─────────────
    float coreW = smoothstep(0.34, 0.0, rr);
    float tipW  = smoothstep(0.22, 0.62, rr);
    float armW  = clamp(1.0 - coreW - tipW, 0.0, 1.0);
    float bassDrive = clamp(BASS_LVL + KICK * 0.5, 0.0, 1.6);
    float regionGlow = bassDrive * coreW + MID_LVL * armW + AIR_LVL * tipW;

    // EVENT HORIZON structure — smooth swell for the ring, raw kick only as amplitude.
    float horizonPower = 1.0 + BASS_LVL * 1.1 * REACT + DROP_GLOW * 0.6;
    float coreGlow   = smoothstep(0.5, 0.0, rr) * horizonPower;
    float photonRing = exp(-pow((rr - 0.32) * 6.0, 2.0)) * (0.55 + BASS_LVL * 0.6 + KICK * 0.5);

    // ── SECTION-DRIVEN PALETTE FAMILY ───────────────────────────────────────────────────
    // The original rotated palette on a 25s wall clock. sectionMode only advances when the
    // controller sees a real breakdown→drop, and sectionMix crossfades over ~4s, so the
    // colour family changes BECAUSE the music changed section.
    float modeNow  = fract(sectionMode * 0.61803);        // golden-ratio hop = maximally distinct
    float modePrev = fract((sectionMode - 1.0) * 0.61803);
    float sectionHue = mix(modePrev, modeNow, clamp(sectionMix, 0.0, 1.0));

    // ── ONE traversal scalar (iris single-L discipline) ─────────────────────────────────
    float fold = sin(lum * 3.0 + rr * 2.0);
    float s = 0.09 * fold
            + 0.42 * rr                              // radius = the hot-core→cool-corona axis
            + 0.20 * huePhase / TAU                  // monotonic palette drift
            + 0.30 * MELODY * quietGate              // PITCH family → the palette journey
            + 0.14 * BRIGHT                          // brightness tints it
            + 0.10 * (waveletTiltNormalized - 0.5) * GATE   // bass↔treble lean
            + 0.10 * CHAOS * sin(TAU * fold + flowPhase * 0.5)
            + sectionHue                             // section change = new colour family
            + seed;                                  // per-device palette identity

    // ONE lightness. Region glow + drop lift + core/ring, then a single ceiling.
    float lit = lum * (0.50 + 1.05 * regionGlow)
              + coreGlow * 0.20
              + photonRing * 0.22
              + DROP_GLOW * 0.16;
    lit *= 1.0 + ARTIC * 0.22 * REACT;

    vec3 plasmaCol = lush(s, lit);
    plasmaCol += lush(s + 0.18, 1.0) * photonRing * 0.35;   // hue-shifted ring accent

    // ── CHROME RIM on the ink strokes ───────────────────────────────────────────────────
    // Hue rides huePhase (monotonic) + melody, NOT iTime*rate and NOT raw pitchClass.
    float chromeHue = fract(atan(uv.y - tacoCenter.y, uv.x - tacoCenter.x) / TAU
                            + huePhase * 0.35 + MELODY * 0.25 + seed2 * 0.3);
    vec3 chrome = hsl2rgb(vec3(chromeHue, 1.0, 0.65));
    // The original ADDED the rim on top at ~5x gain, which clipped the ink to a flat white
    // outline and threw the chrome hue away. Now the ink strokes are TINTED toward chrome
    // (a mix, so they stay coloured no matter how bright the plasma behind them is) and only
    // the kick zap stays additive.
    float rimZap  = KICK * (0.35 + ARTIC * 0.7);             // transient → amplitude only
    float inkMask = clamp(ink * silhouette, 0.0, 1.0);
    vec3 chromeCol = chrome * (0.55 + knob_7 * 0.85 + BASS_LVL * 0.5 * REACT + rimZap * 0.6);

    // ── GOD RAYS from the core on drops ─────────────────────────────────────────────────
    vec2  dc = uv - tacoCenter;
    float rc = length(dc);
    float ac = atan(dc.y, dc.x);
    float fan  = pow(abs(cos(ac * 7.0 + flowPhase * 1.2 + seed * TAU)), 14.0);
    // Tight falloff + gated to the silhouette (as in the original) — unbounded rays took over
    // the whole frame and buried the plasma. Only a faint spill is allowed into the corona.
    float rays = fan * exp(-rc * 3.2) * clamp(DROP_GLOW * 1.0 + KICK * 0.45, 0.0, 1.0);

    // ════════════════════════════════════════════════════════════════════════════════════
    // COMPOSITE — quiet holds the silhouette, loud bursts past it.
    // ════════════════════════════════════════════════════════════════════════════════════
    vec3 col = vec3(0.0);

    // INTERIOR: plasma + tunnel feedback (iris/1 "coming at you" rush — the prior frame is
    // sampled INWARD so content scales outward each frame = falling into the event horizon).
    vec3 prevIn = plasmaCol;
    if (hasHistory) {
        float rush = (0.004 + BASS_LVL * 0.016 * REACT + DROP_GLOW * 0.012 + GRIT * 0.008)
                   * mix(0.5, 2.0, knob_8);
        float mrot = (0.002 + DROP_GLOW * 0.008) * mix(0.5, 2.0, knob_8);
        vec2 ruv = rot2(mrot) * (uv - 0.5) * (1.0 - rush) + 0.5;
        prevIn = getLastFrameColor(ruv).rgb * 0.955;
    }
    // Plasma fills the WHOLE taco body; the drawn detail (inkZone) gets extra brightness so the
    // filling/lettuce strokes still read as structure inside the glow.
    vec3 interiorCol = mix(prevIn, plasmaCol, 0.42) * (1.0 + inkZone * 0.35);
    col = mix(col, interiorCol, body);

    // CORONA: outside the ink the plasma is invisible when quiet and bursts out when loud.
    // This is the single biggest quiet-vs-loud difference — the void is the RESTING state.
    float coronaGate = smoothstep(0.10, 0.62, LOUD + BASS_LVL * 0.5 + DROP_GLOW * 0.6)
                     * mix(0.35, 1.0, knob_5);
    float coronaFall = exp(-max(rr - 0.25, 0.0) * mix(3.6, 1.4, knob_5));
    col += plasmaCol * coronaGate * coronaFall * (1.0 - silhouette) * 0.85;

    // Rim + rays
    col = mix(col, chromeCol, inkMask * 0.78);                       // chrome TINT on the ink
    col += vec3(0.85, 1.0, 1.2) * inkMask * rimZap * 0.35;           // kick zap rides the rim
    col += rays * lush(s + 0.08, 1.0) * (0.55 * silhouette + 0.12 * coronaGate);

    // ── IRIDESCENT SPARKLE (lattice/6 TEXTURE family) — drifting patches, not a grid ─────
    float g1 = 0.5 + 0.5 * sin(uv.x * 190.0 + flowPhase * 9.0);
    float g2 = 0.5 + 0.5 * sin(uv.y * 163.0 - flowPhase * 7.0);
    float sparkPatch = 0.5 + 0.5 * sin(uv.x * 6.0 + uv.y * 4.3 - flowPhase * 3.0);
    float spark = pow(g1 * g2, 16.0) * sparkPatch;
    // Gated to STRUCTURE (lattice multiplies sparkle by coverage) — ungated it painted a
    // regular dot grid across the empty void, which reads as a screen artefact, not shimmer.
    float sparkMask = body * smoothstep(0.06, 0.38, lum);
    col += vec3(1.0, 0.97, 0.92) * spark * sparkMask
         * (AIR_LVL * 0.30 + ARTIC * 0.25 + GRIT * 0.12) * REACT * mix(0.4, 2.0, knob_9);

    // ── MUSICAL BLOOM (lattice/6): smooth swell lifts everything, kick thumps on top ─────
    col *= 1.0 + BASS_LVL * 0.13 * REACT + DROP_GLOW * 0.13 + KICK * 0.11 * REACT;

    // Glow lift — gamma up then a gentle gain so mid-tones emit (reads from across a room)
    col = pow(clamp(col, 0.0, 1.0), vec3(0.86));
    col *= 1.10;

    // Reinhard tonemap — bounded, never blows to white
    float white = 2.0;
    col = col * (1.0 + col / (white * white)) / (1.0 + col);

    // Minimal vignette
    col = mix(col, vec3(0.0), dot(sp, sp) * 0.10);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
