// @fullscreen: true
// @tags: taco, kandi, plasma, event-horizon, coat, fractal, unique
//
// Taco Event Horizon — plasma accretion disk swirling inside the taco silhouette.
// Based on shaders/plasma.frag (Ether by nimitz) + the-coat chrome rim + god rays.
// The taco is the gravitational well; the plasma is matter falling in.
//
// seed/seed2/seed3/seed4 = unique per device (palette + lensing seed).
//
// KNOBS (live jam):
//   knob_1 — SHAPE_TWIST (plasma swirl rate)
//   knob_2 — COLOR_SPIN (palette rotation)
//   knob_3 — FRACTAL_DENSITY (sin-fold packing)
//   knob_4 — RIM_GLOW (chrome edge intensity)
//
// http://localhost:6969/jam.html?shader=redaphid/wip/taco-kandi/1&image=images/taco.png&controller=taco-kandi

uniform float beat_pulse;   // taco-kandi controller — latched beat, exp-decay (~1s)
uniform float beat_kick;    // taco-kandi controller (iter 55) — multi-signal kick detector
uniform float bass_smooth;  // taco-kandi controller — EMA-smoothed bassNormalized
uniform float drop_glow;    // taco-kandi controller — sustained drop signal
uniform float zoom_pulse;   // taco-kandi controller (iter 67) — spring-physics smoothed kick envelope

#define TAU 6.2831853
#define PI 3.14159265

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern from plasma.frag)
// ============================================================================

#define T_ADVANCE (energyZScore + spectralRoughnessZScore + max(trebleZScore, 0.0) * 0.6)
#define SAT_BOOST (0.15 + max(energyZScore, 0.0) * 0.35)
#define L_LIFT    (midsNormalized * 0.06)
#define BASS_PUMP (bass_smooth * 0.35 + drop_glow * 0.15)

// Plasma shape — knob_1 / knob_3 from the plasma jam-discovered controls
#define SHAPE_TWIST     (mix(0.2, 1.8, knob_1))
#define FRACTAL_DENSITY (mix(1.0, 4.0, knob_3))
// WAVE_STRENGTH default — knob_7 was here, moved to ZOOM per user request iter 5
#define WAVE_STRENGTH   0.5
#define SOFTNESS        1.0
// knob_7 → ZOOM (user request iter 5). 0 = wide, 1 = tight zoom-in.
// Multiplies the centered UV coords; smaller multiplier = more zoom-in.
#define ZOOM_K7        (mix(2.0, 0.4, knob_7))

// Color spin — knob_2
#define COLOR_SPIN (knob_2 * iTime * 0.05)

// Pitch flash — melodic jumps flash hue (from plasma jam, iter 4 lesson)
// Fires when pitchClassZScore spikes — track *Paralyzer* hit pitch=1.0 here
#define PITCH_FLASH (smoothstep(0.5, 1.0, abs(pitchClassZScore)) * 0.15)

// Treble shimmer — high-treble spikes pump core lightness for sparkle (matches Paralyzer riffs)
#define TREBLE_SHIMMER (smoothstep(0.3, 1.0, max(trebleZScore, 0.0)) * 0.18)

// CALM_WARM breath — slow 0.4Hz lightness pump on warm-bass-calm passages.
// Fires when: low energy + mid-dominant + dark centroid (warm/intimate music).
// At 0.4Hz it's an "organism breath" coherent with future slow modulations
// (the-coat lesson: shared frequency = one body breathing). Gated so it doesn't
// fight energetic passages. Ported from plasma jam iter-3.
#define CALM_WARM (smoothstep(0.5, 0.0, energyNormalized) * smoothstep(0.4, 0.7, midsNormalized) * smoothstep(0.5, 0.15, spectralCentroidNormalized))
#define BREATH (sin(iTime * 0.4 * TAU) * 0.5 + 0.5)
#define CALM_BREATH (CALM_WARM * BREATH * 0.07)

// MONSTER_BASS gate (ported from plasma-event-horizon/4 iter 22-23).
// Fires when bass HIGH but mids/treble/energy LOW + dark centroid — the
// "lurking sub-bass-only" pocket (dr-fresch territory). Distinct from
// CALM_WARM (which needs mid-dominance). Gives the long-form set a fourth
// corner to inhabit: chaos-bright (shiver), warm-mid (hearth), bass-with-body
// (heart-pulse-zoom), and now sub-bass-only (monster compression).
#define MONSTER_BASS (smoothstep(0.55, 0.85, bassNormalized) * smoothstep(0.55, 0.20, midsNormalized) * smoothstep(0.45, 0.05, energyNormalized) * smoothstep(0.30, 0.05, spectralCentroidNormalized))

// OUTLINE_RADIATION — slow concentric outgoing waves emanating FROM the
// silhouette outline (ported FORM from plasma-event-horizon/4 iter 19+).
// Phase moves on iTime ONLY (audio in phase = strobing — plasma-event-horizon
// iter 19b lesson). Audio modulates AMPLITUDE only via RADIATION_LOUDNESS.
// rate is bounded slow (0.15 → 0.65 Hz, "powerful slowish radiation").
// MONSTER_BASS adds extra amplitude on lurking-monster pockets.
#define RADIATION_RATE     mix(0.15, 0.65, knob_5)
#define RADIATION_LOUDNESS (bass_smooth * 0.7 + midsNormalized * 0.5 + 0.18)
// Iter 66 (user: "more reactivity with different audio uniforms"): added
// spectralKurtosisZScore (peaked spectra = focused tonal center → bigger
// ripples) and spectralRolloffNormalized (high-freq cutoff position →
// brightens radiation). Bounded so total gain stays banding-safe (max 0.55).
#define RADIATION_GAIN     (0.30 * (1.0 + spectralEntropyNormalized * 0.35 + MONSTER_BASS * 0.40 + max(spectralKurtosisZScore, 0.0) * 0.30 + spectralRolloffNormalized * 0.20))
// Note: phase = iTime * RATE * TAU only. NO audio in phase. Strobe-safe.
// Wave density (cycles across the outline-distance horizon, d∈[0, 0.144]):
//   N=80  (seed=0) → ~1.8 cycles ≈ 3 bands
//   N=200 (seed=1) → ~4.6 cycles ≈ 9 bands (mandala-territory).
// Per-device fract(seed) decides where in this range the device sits.
#define OUTLINE_WAVE(d)    (sin(d * mix(80.0, 200.0, fract(seed)) - iTime * RADIATION_RATE * TAU) * 0.5 + 0.5)

// Coat-style chrome rim — knob_4
#define RIM_GLOW (knob_4 + spectralFluxNormalized * 0.5)

// Drop / event horizon power
#define BUILD            clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
#define IS_DROP          clamp(BUILD + smoothstep(0.35, 0.85, energyZScore) * 0.75, 0.0, 1.0)
// Use latched drop_glow + smoothed bass — sustained payoff, not flicker
#define HORIZON_POWER    (1.2 + bass_smooth * 1.0 + drop_glow * 0.6)
#define DROP_FLARE       (drop_glow * 0.8)

// SPACE/NEBULA PALETTE in oklch — locked to plasma-event-horizon/4 aesthetic.
// User flag iter 45: "I'm also not a fan of the bright magenta border. We need to
// bring it closer to plasma. And remember to use oklab color scheme."
// HARD-LOCKED to plasma-event-horizon/4 anchors:
//   CORE_HUE   = 0.6 rad (hot orange-yellow)         — DO NOT cycle into magenta
//   CORONA_HUE = 4.2 rad (deep blue-violet)          — DO NOT cycle into magenta
// Magenta lives at ~3.0-3.5 rad; we deliberately skip past it via a mid-circle anchor.
// Drift restricted to ±0.20 rad so the hue stays in family even with seeds + pitch.
// seeds shrink to *0.05 so per-device tilt is barely-perceptible (was 0.15 — too loud).
#define HUE_DRIFT (iTime * 0.004 + pitchClassNormalized * 0.03 + midsNormalized * 0.04)
// Core: hot orange family, knob_5 nudges 0.55 → 0.75 (orange→amber). Capped, no magenta.
#define CORE_HUE   (mix(0.55, 0.75, knob_5) + HUE_DRIFT * 0.5 + seed2 * 0.05)
// Corona: deep blue-violet family, knob_5 nudges 4.0 → 4.4 (cobalt→indigo). No magenta path.
#define CORONA_HUE (mix(4.0, 4.4, knob_5) + HUE_DRIFT * 0.5 + seed4 * 0.05)

// BIPOLAR knob_7 (iter 36 — user flags "I am not seeing that zoom happening" +
// "The knob works - just not reacting to the audio"):
//   k7 ∈ [0.0, 1.0] — controls BOTH zoom level AND pulse depth, linear ramp.
//   Pulse is ALWAYS on (uses latching bass_smooth + drop_glow + bassNormalized
//   peak), knob_7 just controls how big it gets. At k7=0 → big still taco, no
//   pulse. At k7=1 → tight zoom-in WITH heavy bass-driven contraction.
// Removed bipolar split — pulse was being hidden behind the 0.5 threshold.
#define ZOOM_BASE   (mix(1.6, 0.6, knob_7))   // larger taco at k7=0, tighter at k7=1
#define PULSE_DEPTH (0.4 + knob_7 * 0.7)       // ALWAYS some pulse, knob scales it

// Pulse signal: instant bass peak detector + latching controller signals.
// No cubic ease — linear so even moderate audio produces visible motion.
// Iter 50 fix (user: "It's not zooming reliably with the beat"):
// Added beat_pulse (controller's latched beat with exp-decay) as a third trigger
// so EVERY beat fires some pulse, even on tracks with quiet bass that don't
// cross the bassN > 0.25 threshold. beat_pulse stays high for ~1s after each
// beat so the zoom holds visibly through the kick. Also widened the bassN
// smoothstep range (0.15→0.65 instead of 0.25→0.80) so quieter bass triggers.
// Iter 60 (user: "Could we use energy? or energyZScore? Or slope?"): added
// energyZScore (the most universal "something got louder" detector — catches
// claps, kicks, snares, drum fills, anything percussive across the spectrum)
// AND energySlope (sustained build-ups — captures gradual energy rises that
// aren't single-frame spikes). Six independent kick channels now stack:
//   1. bassZScore > 0.20            — bass kick
//   2. spectralFluxZScore > 0.25    — timbral attack
//   3. trebleZScore > 0.30          — high-freq burst (claps)
//   4. spectralRoughnessZScore > 0.30 — dissonant transient (claps)
//   5. energyZScore > 0.20          — overall loudness spike (universal)
//   6. energySlope * R²             — confident build trend (sustained rise)
//   plus continuous: bass_smooth + beat_kick controller signal
// MAX of the six spike-detectors so the strongest signal of any flavor
// drives the pulse. energySlope*R² is bounded at 0.6 since it can be
// near-constant during builds and we don't want the pulse pinned high.
// Iter 65 (user: "We need better zooming still on the beat!! more extreme"):
// Two-tier strategy — TREND baseline stays smooth (no shivery jitter), but
// INSTANT kick signal hits HARD on real percussion peaks.
//
// KICK_INSTANT: MAX of 4 percussion channels (bassZ, energyZ, fluxZ, trebleZ)
//   each smoothstep'd from a clear "real kick" threshold. NOT capped at 0.5
//   anymore — full 0..1 range so a real kick punches the zoom maximally.
//   Different thresholds: bassZ (kick) > 0.25, energyZ (universal) > 0.30,
//   fluxZ (timbral) > 0.35, trebleZ (clap) > 0.35. Whichever percussion
//   element of the song is loudest wins each frame.
//
// BASS_PEAK now leads with KICK_INSTANT * 1.4 (extreme kick contraction)
// and stacks the trend/baseline at lower weights for smooth between-beat.
// Total cap raised to 2.4 so a real drop+kick stack-up can really punch.
// Iter 67: the-coat-25's smoothstep + cubic-ease pattern. Normalized inputs
// (smooth) → smoothstep filter (drops jitter) → cubic ease (peaks pass).
// zoom_pulse (spring) stacks on top for kick punches.
#define KICK_TREND    clamp(energySlope * energyRSquared * 12.0 + max(bassSlope, 0.0) * bassRSquared * 6.0, 0.0, 1.0)
#define RAW_INTENSITY (bass_smooth * 0.55 + max(trebleZScore, 0.0) * 0.25 + KICK_TREND * 0.4 + drop_glow * 0.5 + zoom_pulse * 1.0)
#define EASED_INTENSITY (smoothstep(0.15, 0.95, RAW_INTENSITY) * smoothstep(0.15, 0.95, RAW_INTENSITY) * smoothstep(0.15, 0.95, RAW_INTENSITY))
#define BASS_PEAK     (EASED_INTENSITY)
#define ZOOM_INTENSITY (clamp(BASS_PEAK * 1.6, 0.0, 1.6))

// Pulse contraction — DOUBLED coefficient (was 0.45) so the bass kick visibly
// punches the zoom. At PULSE_DEPTH=1.1 + heavy bass: contraction up to ~0.6
// (very visible — taco grows ~50% on the kick).
#define PULSE_CONTRACT (ZOOM_INTENSITY * 0.55 * PULSE_DEPTH)

// Taco scale: zoom base + pulse contraction
#define TACO_SCALE    (max(ZOOM_BASE - PULSE_CONTRACT, 0.25))
// Plasma-interior zoom: same pulse, slightly gentler
#define ZOOM_PULSE    (1.0 - PULSE_CONTRACT * 0.4)

// Slow autonomous shape drift (plasma jam: organism breath at 0.4Hz)
// knob_11 → DRIFT_SPEED (auto-wired iter 6, +0.55 gesture, matches plasma iter-5 wiring)
// 0=frozen shape, 0.5=baseline 1x rate, 1=2x faster organic morphing
#define DRIFT_SPEED (mix(0.0, 2.0, knob_11))
#define SHAPE_DRIFT_A (sin(iTime * 0.07 * DRIFT_SPEED + fract(seed)  * TAU) * 0.5 + sin(iTime * 0.13 * DRIFT_SPEED + fract(seed2) * TAU) * 0.3)
#define SHAPE_DRIFT_B (cos(iTime * 0.11 * DRIFT_SPEED + fract(seed3) * TAU) * 0.4 + cos(iTime * 0.05 * DRIFT_SPEED + fract(seed4) * TAU) * 0.6)

// ============================================================================
// PLASMA SDF (from plasma.frag — Ether by nimitz)
// ============================================================================

#define t (iTime + T_ADVANCE)
mat2 m(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float plasmaMap(vec3 p) {
    p.xz *= m(t * 0.4 * SHAPE_TWIST + SHAPE_DRIFT_A);
    p.xy *= m(t * 0.3 * SHAPE_TWIST + SHAPE_DRIFT_B);
    vec3 q = p * FRACTAL_DENSITY + t;
    return length(p + vec3(0.0, 0.0, sin(t * 0.7) * 0.2)) * log(length(p) + SOFTNESS)
         + sin(q.x + sin(q.z + sin(q.y))) * WAVE_STRENGTH
         - 1.0 + BASS_PUMP;
}

// ============================================================================
// TACO MASK (iter 51 — region-colored PNG, shell + filling separable)
// taco.png: SHELL=red(1, .31, .31), FILLING=green(.31, 1, .31), INK=black,
//           OUTSIDE=transparent.
// Returns vec4(silhouette, ink, isShell, isFilling). Every caller uses .xyzw.
// ============================================================================

vec4 getTacoRegions(vec2 uv) {
    vec2 res = iResolution.xy;
    float screenAspect = res.x / res.y;
    vec2 c = (uv - 0.5) * TACO_SCALE;
    if (screenAspect > 1.0) c.x *= screenAspect;
    else                    c.y /= screenAspect;
    vec2 imgUV = c + 0.5;
    float margin = 0.02;
    if (imgUV.x < margin || imgUV.x > 1.0 - margin ||
        imgUV.y < margin || imgUV.y > 1.0 - margin) return vec4(0.0);
    vec4 tex = getInitialFrameColor(imgUV);
    float silhouette = tex.a;
    float maxRGB = max(max(tex.r, tex.g), tex.b);
    // Iter 56 fix: AA pixels at red/green boundaries had BOTH isShell AND
    // isFilling > 0.5, causing wrong region tagging at the boundary line.
    // Use channel DOMINANCE — region with the higher RGB component wins
    // exclusively. This gives a clean 1px transition with no overlap.
    float ink = tex.a * (1.0 - smoothstep(0.3, 0.6, maxRGB));
    float redDominant = tex.a * smoothstep(0.0, 0.2, tex.r - tex.g);
    float greenDominant = tex.a * smoothstep(0.0, 0.2, tex.g - tex.r);
    // Both gates also require non-ink (so black isn't mistaken for either).
    float nonInk = step(0.5, maxRGB);
    float isShell   = redDominant * nonInk;
    float isFilling = greenDominant * nonInk;
    return vec4(silhouette, ink, isShell, isFilling);
}

// ============================================================================
// WOOLI-STYLE SHELL FRACTAL (iter 50 — seed-unique per device)
// User: "target the fill of just the taco shell with the kind of fractals the
// wooli shaders do, that are unique on seed."
// Adapted from shaders/wooli/2.frag's juliaSet + orbit traps. Lean version:
// 8 iterations (vs wooli's 80) since this is a fill texture, not the hero.
// Julia constant 'jc' is seeded so each device's shell shows a unique fractal
// family. Audio modulates 'jc' subtly so the fractal breathes with the music.
// ============================================================================

vec3 shellFractal(vec2 fragUV) {
    // Centered, aspect-corrected coords scaled into Julia coordinate space.
    vec2 z = (fragUV - 0.5) * 3.5;
    z.x *= iResolution.x / iResolution.y;
    // Iter 57 (user: "make the fractals inside the shell react to audio
    // features that we haven't used yet"). Wired four fresh untapped
    // features into different aspects of the fractal so the shell breathes
    // with multiple independent textures of the music:
    //
    //   spectralKurtosis  → JULIA C-RADIUS WOBBLE (peakedness)
    //                       Peaked spectra (tonal/centered notes) shrink
    //                       jr → fractal becomes more SOLID/blob-like.
    //                       Diffuse spectra (chaos) expand jr → spreading filaments.
    //   spectralSkew      → C-COORD ROTATION BIAS (harmonic tilt)
    //                       Dark-tilted spectra rotate fractal one way,
    //                       bright-tilted the other → fractal "leans" with
    //                       the music's harmonic balance.
    //   spectralCrest     → ITERATION-CONTRAST (spiky vs smooth)
    //                       Spiky audio (transient-rich) increases the
    //                       contrast between fractal layers; smooth audio
    //                       softens them. Bands sharpen on snare hits.
    //   pitchClassMean    → SLOW C-COORD DRIFT (tonal baseline)
    //                       The rolling-average pitch slowly drifts the
    //                       Julia center, so different keys produce
    //                       different fractal families over long timescales.
    //
    // All inputs are bounded and either smoothed or capped — no per-frame
    // jitter survives into the Julia constant, so the fractal stays stable.
    float jt = iTime * 0.05 + bass_smooth * 0.3 + pitchClassMean * 0.6;
    float jr_base = mix(0.55, 0.85, fract(seed));
    // spectralKurtosis ~0..1; we let it move jr by ±0.06 (so jr ∈ [0.49, 0.91]).
    float jr = jr_base + (spectralKurtosisNormalized - 0.5) * 0.12;
    // spectralSkew can be negative; clamp to ±0.5 then bias rotation phase.
    float skew_bias = clamp(spectralSkewNormalized - 0.5, -0.5, 0.5) * 0.30;
    vec2  jc = vec2(
        cos(jt + fract(seed)  * TAU + skew_bias) * jr,
        sin(jt + fract(seed2) * TAU - skew_bias) * jr
    );
    // 8-iter Julia with orbit traps.
    float trapO = 1e10, trapY = 1e10;
    float sIter = 8.0;
    for (int i = 0; i < 8; i++) {
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + jc;
        float r2 = dot(z, z);
        trapO = min(trapO, r2);
        trapY = min(trapY, abs(z.y));
        if (r2 > 64.0) { sIter = float(i) - log2(log2(r2)) + 2.0; break; }
    }
    // Three oklch anchors in the orange-amber-cream family.
    // pitch_lift unchanged — pitchClassNormalized is the per-frame note,
    // which we still want for instant melodic warmth on the cream highlight.
    float pitch_lift = (pitchClassNormalized - 0.5) * 0.18;
    float shell_lift = bass_smooth * 0.06;
    vec3 deep   = oklch2rgb(vec3(0.30 + shell_lift, 0.10, CORE_HUE - 0.05));
    vec3 mid    = oklch2rgb(vec3(0.55 + shell_lift, 0.15, CORE_HUE));
    vec3 bright = oklch2rgb(vec3(0.78 + shell_lift * 0.4, 0.13, CORE_HUE + 0.10 + pitch_lift));
    // Iter as primary mixer; traps add detail bands.
    // spectralCrest sharpens or softens the iteration-band transitions.
    // crest 0..1 → contrast multiplier 0.6..1.4 (smooth on calm, sharp on spiky).
    float crest_contrast = mix(0.6, 1.4, spectralCrestNormalized);
    float t1 = clamp(sIter / 8.0, 0.0, 1.0);
    // smoothstep(0, 1/contrast) sharpens or smooths the transition: high contrast
    // makes mid take over very fast, low contrast keeps the deep→mid blend gentle.
    vec3 col = oklabmix(deep, mid, smoothstep(0.0, 0.5 / crest_contrast, t1));
    col = oklabmix(col, bright, smoothstep(0.0, 0.20 / crest_contrast, sqrt(trapY)));
    // Bass breathing on overall brightness — unchanged.
    col *= (0.85 + bass_smooth * 0.30);
    return col;
}

// ============================================================================
// NOISE HELPERS (from the-coat — for fractal fur fibers)
// ============================================================================

float th(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(th(i), th(i + vec2(1, 0)), f.x),
               mix(th(i + vec2(0, 1)), th(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; }
    return s;
}

// ============================================================================
// OUTLINE EDGE GLOW (wooli-2 signature, lines 87-94)
// 8-sample ring; if any neighbor hits the ink, this pixel glows.
// Result = 1 just outside the silhouette boundary, 0 elsewhere outside.
// Caller composites this with hue/wave/pulse for the actual visual.
// ============================================================================

float getEdgeGlow(vec2 uv, float width) {
    float nearInk = 0.0;
    for (int i = 0; i < 8; i++) {
        float a = float(i) * PI * 0.25;
        vec4 m_off = getTacoRegions(uv + vec2(cos(a), sin(a)) * width);
        // m_off.y = ink darkness — silhouette boundary
        nearInk = max(nearInk, m_off.y);
    }
    return nearInk;
}

// ============================================================================
// OUTLINE DISTANCE FIELD (iter 46 — for logo-shape radiation waves)
// Returns approximate distance from the SILHOUETTE OUTLINE in UV-space units.
// 0 at the outline, growing positive both inward (interior) and outward (exterior).
// Sampled by binary-search across 6 ring radii. Cheap and good enough for a
// soft wave field — exact SDF not needed for radial sin() modulation.
// Caller pairs with sign(silhouette - 0.5) to differentiate inside/outside.
// ============================================================================

float getOutlineDistance(vec2 uv) {
    // 7 logarithmically-spaced radii out to ~18% screen — enough horizon for
    // 3-4 visible concentric radiation bands rippling outward from the silhouette.
    const int N_RADII = 7;
    // Pre-computed: r[i] = 0.006 * 1.7^i ≈ 0.006, 0.010, 0.017, 0.029, 0.050, 0.085, 0.144
    float radii[7];
    radii[0] = 0.006; radii[1] = 0.010; radii[2] = 0.017;
    radii[3] = 0.029; radii[4] = 0.050; radii[5] = 0.085; radii[6] = 0.144;
    // Are we inside (silhouette=1) or outside (silhouette=0) right now?
    float sCenter = getTacoRegions(uv).x;
    float boundary = 0.144;  // larger than max radius
    // Find smallest radius where ANY of 6 angular samples crosses the silhouette
    // (6 samples instead of 8 — small perf win since horizon doubled)
    for (int ri = 0; ri < N_RADII; ri++) {
        float r = radii[ri];
        bool crossed = false;
        for (int i = 0; i < 6; i++) {
            float a = float(i) * PI / 3.0;
            float sN = getTacoRegions(uv + vec2(cos(a), sin(a)) * r).x;
            if ((sCenter > 0.5) != (sN > 0.5)) { crossed = true; break; }
        }
        if (crossed) { boundary = r; break; }
    }
    return boundary;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    // Centered aspect-aware UV (plasma convention)
    vec2 p_centered = (fragCoord - res * 0.5) / min(res.x, res.y);
    vec2 uv = fragCoord / res;
    bool hasHistory = iFrame > 2;

    // ---- FRINGE / FUR EDGE PERTURBATION ----
    // SUBTLE only — branded set, logo MUST stay clearly recognizable.
    // User flag iter 21: "Actually don't distort the taco that much — we need the
    // outline clearly recognizable." Capped fringe at ~25% of previous amplitudes.
    // knob_9 → FUR thickness: 0=tight outline, 1=lightly shaggy (NOT very shaggy).
    float fringe_amt = (0.002 + knob_9 * 0.006)
                     + bass_smooth * 0.004 + spectralRoughnessNormalized * 0.003
                     + smoothstep(0.5, 0.9, spectralEntropyNormalized) * 0.005;
    vec2 fringe_p = uv * 22.0 + vec2(0.0, sin(iTime * 1.3) * 0.4);
    float fringe_n1 = fbm(fringe_p);
    float fringe_n2 = fbm(fringe_p + vec2(7.3, -3.1));
    vec2 fringe_offset = vec2(fringe_n1 - 0.5, fringe_n2 - 0.5) * fringe_amt;
    vec2 uv_fringed = uv + fringe_offset;

    // ---- TACO MASK (with fringed sampling) ----
    vec4 maskInfo = getTacoRegions(uv_fringed);
    float silhouette = maskInfo.x;          // 1 inside taco image bounds
    float ink        = maskInfo.y;           // dark ink lines (the outline)

    // SHARP INK — sampled at un-perturbed uv to keep the logo's internal lines
    // crisp regardless of fringe/feedback effects. User flag iter 30: "the
    // blurriness of the internal lines is making it hard to tell it's a taco."
    // This gets re-overlaid at the end of main() so ink ALWAYS reads as logo.
    // Iter 50: now uses 4-component getTacoRegions so we can target shell vs filling.
    vec4 sharpRegions = getTacoRegions(uv);
    float sharp_ink = sharpRegions.y;
    float isShell   = sharpRegions.z;
    float isFilling = sharpRegions.w;

    // Coat-style: dilate to fill interior. Sample mask at 4 points to fill the white interior of the taco.
    float px = 1.0 / min(res.x, res.y);
    float interior_fill = silhouette;
    // Use multiple offset samples to detect "inside the taco shape" via boundary lookup
    vec4 m1 = getTacoRegions(uv_fringed + vec2(px * 30.0, 0.0));
    vec4 m2 = getTacoRegions(uv_fringed - vec2(px * 30.0, 0.0));
    vec4 m3 = getTacoRegions(uv_fringed + vec2(0.0, px * 30.0));
    vec4 m4 = getTacoRegions(uv_fringed - vec2(0.0, px * 30.0));
    // The interior of the taco is where ink is on multiple sides
    float ink_sides = 0.0;
    if (m1.y > 0.3) ink_sides += 0.25;
    if (m2.y > 0.3) ink_sides += 0.25;
    if (m3.y > 0.3) ink_sides += 0.25;
    if (m4.y > 0.3) ink_sides += 0.25;
    float interior = max(ink, smoothstep(0.5, 0.85, ink_sides)) * silhouette;

    // ---- PLASMA / EVENT HORIZON RAYMARCH (from plasma.frag) ----
    // Center the raymarch on the taco's visual center
    vec2 taco_center_uv = vec2(0.5, 0.48);
    // Zoom-pulse: contract toward center on beat — plasma swirl punches in
    vec2 p_taco = (uv - taco_center_uv) * 2.0 * ZOOM_PULSE;
    p_taco.x *= res.x / res.y;

    float r_horizon = length(p_taco);

    // Gravitational lensing — plasma-event-horizon iter 13 fix (envelope, no hot center)
    // knob_10 (auto-wired iter 2 of vibej run, matches plasma iter-7 LENS_STRENGTH wiring)
    // User wiggled k10 0.031→0.465 (+0.43) — strongest gesture this tick.
    float lens_envelope = smoothstep(0.0, 0.15, r_horizon) * smoothstep(0.9, 0.4, r_horizon);
    float lens_strength = (knob_10 * 0.6 + energyNormalized * 0.25) * lens_envelope;
    vec2 p_lensed = p_taco * (1.0 - lens_strength * 0.3);
    float ca = cos(lens_strength * 0.5), sa = sin(lens_strength * 0.5);
    p_lensed = mat2(ca, -sa, sa, ca) * p_lensed;

    // ---- KALEIDOSCOPE FOLD (knob_6) — radical visual variety ----
    // 0 = no fold (linear plasma), 1 = 12-fold mirror = full kaleidoscope.
    // Folds the plasma sample coords so a single swirl repeats around N axes.
    // Auto-wired iter 9 (user: "I'm twisting knobs for variety, it's samey").
    if (knob_6 > 0.05) {
        // SEAM FIX (iter 18): atan() wraps at -π/+π causing a horizontal seam.
        // Add π first to bring angle into [0, TAU], then mod is continuous.
        // Also ensure kaleido_n folds an EVEN number of segments so the mirror
        // boundaries align (odd folds create another visible discontinuity).
        float kaleido_n = floor(mix(2.0, 12.0, knob_6) * 0.5) * 2.0;  // force even
        float kal_a = atan(p_lensed.y, p_lensed.x) + PI;  // [0, TAU]
        float kal_r = length(p_lensed);
        float seg = TAU / kaleido_n;
        kal_a = mod(kal_a + iTime * 0.05, seg);
        // Mirror within each segment for kaleido symmetry
        kal_a = abs(kal_a - seg * 0.5);
        // Subtract π back when reconstructing — cancels the offset above
        p_lensed = vec2(cos(kal_a - PI), sin(kal_a - PI)) * kal_r;
    }

    // Raymarch
    vec3 cl = vec3(0.0);
    float d = 2.5;
    for (int i = 0; i <= 5; i++) {
        vec3 pp = vec3(0.0, 0.0, 5.0) + normalize(vec3(p_lensed, -1.0)) * d;
        float rz = plasmaMap(pp);
        float f = clamp((rz - plasmaMap(pp + 0.1)) * 0.5, -0.1, 1.0);
        vec3 l = vec3(0.1, 0.3, 0.4) + vec3(5.0, 2.5, 3.0) * f;
        cl = cl * l + smoothstep(2.5, 0.0, rz) * 0.7 * l;
        d += min(rz, 1.0);
    }

    // EVENT HORIZON RADIAL STRUCTURE — beat-flash REMOVED iter 43.
    // User flag: "I am still seeing that flash occasionally! radiating out from
    // behind the taco in a circle." Root cause identified: photonRing brightness
    // multiplied by `(0.6 + bass_smooth*0.5 + DROP_FLARE)` was a circular ring
    // that pulsed brighter on every bass kick + sustained drop_glow. Combined
    // with coreGlow * HORIZON_POWER (also bass-pumped), the result was a
    // circular flash radiating from taco_center on every musical pulse.
    // Both are now FIXED-brightness — stable structural elements only.
    float coreGlow   = smoothstep(0.5, 0.0, r_horizon) * 1.2;  // was * HORIZON_POWER (bass-pumped)
    float photon_ring_r = mix(0.15, 0.55, knob_12);  // removed bassZScore radius push
    float photonRing = exp(-pow((r_horizon - photon_ring_r) * 6.0, 2.0)) * 0.6;
    // ^ was multiplied by (0.6 + bass_smooth*0.5 + DROP_FLARE) — REMOVED to kill the flash

    // ---- COLOR (oklch from plasma) ----
    vec3 lch = rgb2oklch(max(cl, vec3(0.001)));
    // Anchor the plasma color in the cosmic CORE_HUE family — was full-rainbow.
    // Tiny modulation only (centroid * 0.3 instead of 1.0, no COLOR_SPIN turn).
    // Coat aesthetic: stay in the magenta-violet-blue family.
    lch.z = mix(lch.z, CORE_HUE, 0.5)
          + (spectralCentroidNormalized * 0.15 + COLOR_SPIN * 0.1 + PITCH_FLASH * 0.3) * TAU;
    lch.y  = clamp(lch.y + SAT_BOOST * 0.25, 0.0, 0.4);
    lch.x  = clamp(lch.x + coreGlow * 0.25 + photonRing * 0.22 + L_LIFT + TREBLE_SHIMMER + CALM_BREATH, 0.0, 1.0);

    // Hue zones — core is hot (orange), corona is cool (blue)
    float coreHueBlend = smoothstep(0.4, 0.0, r_horizon);
    lch.z = mix(lch.z, CORE_HUE, coreHueBlend * 0.7);
    lch.z = mix(lch.z, CORONA_HUE, photonRing * 0.4);
    cl = oklch2rgb(lch);

    // Hot core additive bloom
    vec3 coreLight = oklch2rgb(vec3(0.75, 0.18, CORE_HUE)) * coreGlow * 0.6;
    vec3 plasma_col = cl + coreLight;

    // ---- FRACTAL FUR FIBERS (from the-coat-23 lines 613-644) ----
    // Domain-warped FBM ridges that activate on entropy + roughness — chaos signal.
    // Independent from energy/bass plasma so they react to DIFFERENT musical qualities.
    float fur_trigger = clamp(spectralEntropyNormalized * 0.7 + spectralRoughnessNormalized * 0.5, 0.0, 1.0);
    float fur_amt = smoothstep(0.55, 0.90, fur_trigger);
    if (fur_amt > 0.01) {
        vec2 fp = uv * 18.0;
        float warp_t = iTime * 0.3 + (spectralCentroidNormalized * 0.6 + spectralFluxNormalized * 0.2);
        vec2 warp = vec2(fbm(fp + vec2(warp_t, 0.0)),
                         fbm(fp + vec2(0.0, warp_t + 3.7)));
        vec2 fp2 = fp + warp * 3.5;
        float fibers = fbm(fp2 + vec2(fbm(fp2 + vec2(warp_t * 0.7, 1.3)),
                                      fbm(fp2 + vec2(2.1, warp_t * 0.5))) * 1.5);
        float strand = pow(abs(sin(fibers * PI * (4.0 + spectralFluxZScore * 1.5))), 3.0);
        // Tint toward icy white-cyan (catches light like fur strands)
        vec3 strand_col = mix(plasma_col * 1.5, vec3(0.7, 0.9, 1.0), 0.3 + strand * 0.4);
        plasma_col = mix(plasma_col, strand_col, strand * fur_amt * 0.5);
    }

    // ---- SIGIL SWIRL (REMOVED iter 40 — DO NOT RE-ADD) ----
    // User flagged TWICE: "I do not like This spinning, multicolored thing we
    // have right now." + "We need to back out of that. I've seen variations of
    // this effect a lot. Remember I don't like it."
    // The radial spiral with hsl2rgb hue-cycling on the coat surface is REJECTED.
    // Future iters: NEVER re-introduce angular spirals with continuous hue rotation.

    // ---- COAT-STYLE CHROME RIM on taco ink lines ----
    // User flag iter 45: "I'm also not a fan of the bright magenta border. We need
    // to bring it closer to plasma." Root cause: chrome hue was
    //   CORE_HUE + chrome_angle*0.25 + iTime*0.08 + pitchClassN*0.4
    // The +iTime*0.08 alone rotates the hue through the FULL circle every ~78s,
    // crossing magenta (3.0-3.5 rad) on every cycle — guaranteed magenta-border
    // moments. Plus pitchClassN*0.4 jumps another ±2 rad on melodic shifts.
    //
    // FIX: hue is anchored between CORE_HUE (~0.6 rad orange) and CORONA_HUE
    //      (~4.2 rad deep blue-violet) via a slow, bounded breath. Chroma capped
    //      at 0.13 (was 0.18) and rim_boost capped at 1.4 (was up to 4.4) so the
    //      OUTLINE remains readable without screaming. The taco logo gets a
    //      plasma-orange ↔ blue-violet glow that NEVER cycles through magenta.
    float rim_breath = 0.5 + 0.5 * sin(iTime * 0.4 * TAU);  // 0.4Hz — shared organism breath
    // Iter 49 fix: previous "mix(CORE_HUE, CORONA_HUE+TAU)" was MATHEMATICALLY WRONG
    // — at breath=0.5 it gave hue=5.55 rad which IS magenta-purple territory.
    // SAFER PATTERN: pick TWO discrete plasma-family hues and mix between them
    // directly. CORE_HUE (~0.65) is orange. We want to oscillate to indigo (~5.0)
    // — the path 0.65→5.0 (forward) goes through yellow→green→cyan→blue (the LONG
    // way, 4.35 rad), the path 5.0→0.65 (backward) goes through purple→red→orange
    // which crosses MAGENTA. Solution: mix between two SAFE colors, not two hues.
    // Mix the actual oklab colors (perceptually uniform) so no wraparound.
    vec3 chrome_warm = oklch2rgb(vec3(0.70, 0.13, CORE_HUE));         // hot orange
    vec3 chrome_cool = oklch2rgb(vec3(0.70, 0.13, CORONA_HUE - 0.4)); // indigo (4.0-0.4 = 3.6, on the SAFE side)
    vec3 chrome = mix(chrome_warm, chrome_cool, rim_breath);
    // ^^^ Cannot pass through magenta because magenta isn't on the line between
    //     orange and indigo in oklab — perceptual interpolation goes through grey
    //     in the middle, which is desaturated → safe.
    // rim_boost capped: plasma's signature rim isn't loud, it's a clean halo.
    float rim_boost = 1.0 + RIM_GLOW * 0.4 + bass_smooth * 0.4;  // was 2.0+RIM*2+bass*1.2 (max 4.4)
    vec3 rim_col = chrome * ink * rim_boost * 0.4;

    // ---- GOD RAYS REMOVED iter 44 — THIS WAS THE CIRCULAR FLASH ----
    // User: "I am still seeing that flash occasionally! radiating out from behind
    // the taco in a circle." Tracked it here: god_rays = pow(cos(angle*7), 14) *
    // exp(-r*1.5) * IS_DROP — center-radial fan of 7 sharp beams, gated by
    // IS_DROP (energyZ > 0.35) which fires on every drop. Confined to silhouette
    // but the alpha mask extends past the visible taco, so the rays appeared to
    // radiate "from behind the taco in a circle" on every drop. Plus IS_DROP
    // includes BUILD (energySlope*energyRSquared*10) so it ALSO fires on rising
    // energy passages — which is "occasionally" from the user's perspective.
    // PERMANENT FIX: zero out god_rays. Don't re-add IS_DROP-gated radial fans.
    float god_rays = 0.0;
    vec3 ray_col = vec3(0.0);

    // ---- FRAME FEEDBACK (coat-style smear) ----
    vec3 prev = hasHistory ? getLastFrameColor(uv).rgb : plasma_col;
    vec3 plch = rgb2oklch(max(prev, vec3(0.001)));
    plch.x *= 0.94;  // decay
    prev = oklch2rgb(plch);

    // ---- COMPOSITE ----
    // Outside silhouette: pure black
    // Inside silhouette: plasma + feedback
    // On ink lines: chrome rim
    vec3 col = vec3(0.0);

    // ---- STARFIELD (coat-23 lines 396-416 ported) ----
    // Sparkle crosses outside the silhouette, twinkle rate scales with treble.
    // Confined to exterior via (1.0 - silhouette). Fires on treble-bright passages.
    {
        vec2 sp = uv * 14.0;
        vec2 scell = floor(sp);
        vec2 scf = fract(sp) - 0.5;
        float sr = th(scell);
        float sr2 = th(scell + vec2(3.7, 1.3));
        float star_active = step(0.82, sr);  // ~18% of cells host a star
        vec2 spos = (vec2(sr2, th(scell + vec2(2.1, 5.9))) - 0.5) * 0.4;
        vec2 sdelta = scf - spos;
        float sd = length(sdelta);
        float cross_h = exp(-sdelta.y * sdelta.y * 2500.0) * exp(-abs(sdelta.x) * 15.0);
        float cross_v = exp(-sdelta.x * sdelta.x * 2500.0) * exp(-abs(sdelta.y) * 15.0);
        float core = exp(-sd * sd * 800.0);
        float tw_s = 0.5 + 0.5 * sin(iTime * (2.0 + sr * 4.0 + trebleNormalized * 6.0) + sr * 30.0);
        float twinkle = 0.35 + 0.65 * tw_s * tw_s;
        float star = (core + (cross_h + cross_v) * 0.6) * star_active * twinkle;
        // Soft warm sparkle, gated by treble + exterior
        col += vec3(1.0, 0.95, 0.85) * star * smoothstep(0.3, 0.8, trebleNormalized) * (1.0 - silhouette) * 0.6;
    }

    // ---- HORIZON SCAN BAR (REMOVED iter 38) ----
    // User flag: "I don't like the horizontal 'scanline'."

    // ---- PLASMA-STYLE GOD RAYS (REMOVED iter 40, user flag re-fired) ----
    // The iter-39 god rays flashed on bass_smooth + drop_glow which read as the
    // "green flash" the user keeps rejecting. The beams pulsed on every kick.
    // Try again with a different audio path that avoids on-beat flashing.

    // ---- OUTLINE PHOTON RING (iter 49 — plasma signature, outline-anchored) ----
    // Plasma's photon-ring form is a sharp gaussian-bright band at a specific
    // radius from the gravitational singularity. We apply the same technique to
    // OUTLINE distance: a sharp ring sits just outside the silhouette, tracing
    // its contour. Provides crisp logo definition without overpowering radiation.
    // CRITICAL: brightness is CONSTANT (NOT bass-pumped) — bass-pulsed gaussian
    // bands were the iter 43 flash bug. This is purely structural texture.
    // knob_12 → outline photon ring base radius (0=hugging outline, 1=outer halo).
    // Iter 58 (user: "whatever knob_12 is doing should be audio reactive"):
    // ring radius PUMPS with bass_smooth + drop_glow on top of the knob value.
    // Bass kicks push the ring outward, drops sustain it wider. Sharpness
    // also breathes (tighter on calm, softer on heavy bass). All inputs are
    // EMA/latched so no per-frame jitter. Stays inside the 0.144 horizon.
    // Banding-safe: ring_gain still hard-capped at 0.30.
    {
        if (silhouette < 0.3) {
            float od = getOutlineDistance(uv);
            float ring_r_base = mix(0.012, 0.045, knob_12);
            float ring_pump = bass_smooth * 0.018 + drop_glow * 0.012;
            float ring_r = ring_r_base + ring_pump;
            // Iter 66: ring sharpness modulated by treble-build (treble slope ×
            // R² — confident rising-treble = tightening ring; chaotic treble
            // = softer ring). Bounded so ring stays visible in all regimes.
            float treb_build = clamp(max(trebleSlope, 0.0) * trebleRSquared * 8.0, 0.0, 1.0);
            float ring_sharp = mix(100.0, 60.0, bass_smooth) + treb_build * 25.0;
            float ring = exp(-pow((od - ring_r) * ring_sharp, 2.0));
            // Color: oklch CORONA family. seed3 is unbounded — must use fract()
            // and bound to ±0.05 rad max so we stay in the deep blue-violet family.
            // CORONA_HUE itself is mix(4.0, 4.4); +0.10 max would push to 4.5
            // which is approaching magenta (5.0+). Clamped to ±0.05 max tilt.
            float ring_hue = CORONA_HUE + (fract(seed3) - 0.5) * 0.10;
            vec3 ring_col = oklch2rgb(vec3(0.72, 0.16, ring_hue));
            // Bounded blend, max 0.30 — flash-safe forever.
            float ring_gain = clamp(ring * 0.55, 0.0, 0.30) * (1.0 - silhouette);
            col = mix(col, max(col, col + ring_col * 0.85), ring_gain);
        }
    }

    // ---- OUTLINE RADIATION WAVES (iter 46 — the headline FORM port) ----
    // User: "Not just palette - the 'forms'." + "focus on the taco logo. based off
    // of the borders or outline and making sure it is discernable." Ported from
    // plasma-event-horizon/4 RADIATION_WAVES, but the wave argument is
    // distance-from-the-SILHOUETTE-OUTLINE, not distance-from-center. Plasma's
    // gravitational ripples become OUTLINE ripples expanding outward from the
    // taco's contour. The logo's shape is the source of the energy.
    //
    // Form: a few concentric bands of brightness following the taco's outline,
    // breathing outward at 0.15-0.65 Hz ("powerful slowish radiation"). Audio
    // gates AMPLITUDE only (RADIATION_LOUDNESS). Phase is iTime-only (no strobe).
    // Banding-safe: bounded mix() blend, max gain capped at 0.32. Far-from-outline
    // pixels see no contribution, so corners stay dark — never reads as a flash.
    {
        // Compute outline distance — only sampling exterior pixels (silhouette < 0.3).
        // Interior gets handled by the plasma raymarch already.
        if (silhouette < 0.3) {
            float od = getOutlineDistance(uv);
            // od ∈ [0, 0.144]. Bands ripple outward from the outline. Wave brightens
            // where sin>0, dark valleys between. Bands TRAVEL outward over time
            // (phase = -iTime, so as t advances, sin's argument shrinks, meaning
            // a constant-d sample passes through bright→dark→bright as bands move
            // past it — visually reads as bands flowing outward).
            float wave = OUTLINE_WAVE(od);
            // Gentle exponential falloff so the radiation fades into the void.
            // Tuned so bands at d=0.10 are ~37% as bright as d=0 (10*0.10 = 1, e^-1 ≈ 0.37)
            // and d=0.144 is ~24% (e^-1.44 ≈ 0.24). 3-4 bands stay visible.
            float falloff = exp(-od * 10.0);
            // Audio-amplitude (NOT phase) — this is what the journals warn about.
            float amp = wave * falloff * RADIATION_LOUDNESS * RADIATION_GAIN;
            // Color in plasma family: CORONA at the outline (cool blue-violet),
            // bleeding toward CORE+0.6 further out (warm orange-red). Same gradient
            // as plasma's photon-ring → core, but here applied to OUTLINE distance
            // rather than center distance — the taco is the gravitational well, its
            // contour is the photon ring, and gravitational waves ripple outward.
            vec3 wave_col_near = oklch2rgb(vec3(0.66, 0.15, CORONA_HUE));
            vec3 wave_col_far  = oklch2rgb(vec3(0.50, 0.12, CORE_HUE + 0.6));
            vec3 wave_col = mix(wave_col_near, wave_col_far, smoothstep(0.005, 0.10, od));
            // Bounded blend — flash-safe forever. max gain 0.42 (≤0.5 so feedback
            // amplification mathematically impossible). col can never exceed
            // (1 + max(wave_col)) and never amplifies prev-frame content.
            float wave_gain = clamp(amp, 0.0, 0.42) * (1.0 - silhouette);
            col = mix(col, max(col, col + wave_col * 0.65), wave_gain);
        }
    }

    // ---- WOOLI SCROLLING TAPESTRY LINE ----
    // Horizontal scrolling line: rightmost column draws new line at Y tracking
    // spectralCentroid, all other columns sample 1px right from prev frame for trail.
    // Confined to exterior — scrolls AROUND the taco silhouette. NOT a radial wave.
    // Ported from wooli/2 lines 171-223 (simplified: no stipple/glow particles).
    if (hasHistory) {
        float pxX = floor(fragCoord.x);
        float lastX = floor(res.x) - 1.0;
        float static_silhouette = silhouette;  // no fringe perturbation, stable boundary

        if (static_silhouette < 0.3) {
            vec3 lineLayer = vec3(0.0);
            if (pxX < lastX) {
                vec2 scrollUV = vec2((fragCoord.x + 1.0) / res.x, uv.y);
                vec4 srcMask = getTacoRegions(scrollUV);
                if (srcMask.x < 0.3) {
                    lineLayer = getLastFrameColor(scrollUV).rgb;
                    lineLayer *= 0.992;  // gentle decay along the trail
                }
            } else {
                // Rightmost column draws new line tracking centroid
                float lineY = 0.5 + spectralCentroidZScore * 0.25;
                float dist = abs(uv.y - lineY) * res.y;
                float lw = 1.0 + spectralRoughnessNormalized * 4.0 + abs(spectralCentroidZScore) * 1.2;
                float line = smoothstep(lw + 1.0, max(lw - 0.5, 0.0), dist);
                vec3 lineCol = oklch2rgb(vec3(0.72, 0.18, CORONA_HUE));
                lineLayer = lineCol * line;
                lineLayer *= 1.0 + beat_kick * 0.25;  // smooth kick boost (no `beat` uniform — iter 55)
            }
            // Composite using bounded mix (no feedback amplification possible)
            float line_gain = clamp(0.5 * dot(lineLayer, vec3(1.0)), 0.0, 0.4);
            col = mix(col, max(col, lineLayer), line_gain);
        }
    }

    // ---- NEBULA FOG — REMOVED iter 45 — THE CIRCULAR FLASH CULPRIT ----
    // User: "I saw the flash several times for sure over the last 40s."
    // Hunter peakBg=0.36 fingerprint: drop_glow 0.74 + entropy 0.84 + centroid 0.90
    //   + spread 0.90 + rolloff 0.94 + treb 0.56 + bass 0.09 (LOW). NOT bass-driven.
    // Match: NEBULA FOG gate = smoothstep(treb) * smoothstep(entropy) — fires
    // strong on chaotic-bright passages exactly. The radial sin() field × (1-silhouette)
    // brightens the exterior toward CORONA_HUE-0.3 (~3.7 rad = purple) reading as
    // "circular flash radiating out from behind the taco." Additive composite means
    // it could push exterior bg to bg=0.36+ — the user's flash. REMOVED. Pattern:
    // additive radial-sin fields gated on bright/chaotic features will read as a flash.

    // ---- INTERIOR FILL (iter 51 — region-aware, no fallbacks) ----
    // SHELL → wooli-style seeded fractal (warm orange-amber tortilla, per-device unique).
    // FILLING → plasma raymarch (the lettuce/textured top stays cosmic).
    // Both blend with prev-frame trail for fluidity. Anything outside both regions
    // belongs to the EXTERIOR (already painted by starfield + radiation + photon
    // ring above). The taco.png defines exactly two interior regions; trust it.
    vec3 plasma_with_trail = mix(prev, plasma_col, 0.35);
    vec3 shell_trail       = mix(prev, shellFractal(uv), 0.35);
    col = mix(col, shell_trail,        isShell);
    col = mix(col, plasma_with_trail,  isFilling);

    // ---- AURORA RIBBONS (iter 48 — coat-style flowing color bands inside taco) ----
    // Three thin sinuous bands threading through the taco interior, each tracking
    // an INDEPENDENT audio domain so they don't all fire in unison. Adapted from
    // the-coat-25 + plasma's ribbon technique. Confined via interior mask so the
    // outline stays the loudest read. Banding-safe: bounded mix() blend.
    //
    // INDEPENDENCE (key principle from CLAUDE.md feature-domain matrix):
    //   ribbon 1 → spectralCentroidNormalized   (brightness/pitch domain)
    //   ribbon 2 → spectralEntropyNormalized    (chaos domain)
    //   ribbon 3 → pitchClassNormalized         (tonal domain)
    // Three independent domains → three ribbons rarely peak together → richness.
    if (interior > 0.05) {
        // Aspect-corrected centered uv for ribbon paths.
        vec2 ru = (uv - taco_center_uv);
        ru.x *= res.x / res.y;
        // Ribbon 1: horizontal-ish, bright (centroid)
        float r1_y = sin(ru.x * 4.0 + iTime * 0.35 + seed * TAU) * 0.10
                   + cos(ru.x * 2.3 - iTime * 0.21) * 0.05;
        float r1 = exp(-pow((ru.y - r1_y) * 30.0, 2.0));
        float r1_amp = smoothstep(0.3, 0.85, spectralCentroidNormalized) * 0.55;
        vec3 r1_col = oklch2rgb(vec3(0.78, 0.18, CORE_HUE + 0.3));  // amber-yellow
        // Ribbon 2: diagonal-flowing, chaos (entropy)
        float r2_a = ru.x + ru.y * 0.6;
        float r2_y = sin(r2_a * 3.5 - iTime * 0.27 + seed3 * TAU) * 0.09;
        float r2 = exp(-pow((ru.y - 0.04 - r2_y) * 28.0, 2.0));
        float r2_amp = smoothstep(0.4, 0.9, spectralEntropyNormalized) * 0.50;
        vec3 r2_col = oklch2rgb(vec3(0.74, 0.16, CORONA_HUE - 1.2));  // teal-cyan (CORONA - 0.6 = ~3.5 rad = cyan, NOT magenta)
        // Ribbon 3: counter-flowing, tonal (pitchClass)
        float r3_x_phase = iTime * 0.18 + pitchClassNormalized * TAU * 0.5 + seed4 * TAU;
        float r3_y = cos(ru.x * 3.0 + r3_x_phase) * 0.12;
        float r3 = exp(-pow((ru.y + 0.05 - r3_y) * 32.0, 2.0));
        float r3_amp = smoothstep(0.2, 0.8, pitchClassNormalized) * 0.40;
        vec3 r3_col = oklch2rgb(vec3(0.76, 0.17, CORE_HUE + 0.7));  // peach-coral
        // Iter 66: spectralRolloff modulates overall ribbon brightness — when
        // the track has high-freq content reaching far up the spectrum (bright
        // hi-hat passages, airy synths), the ribbons GLOW brighter. Slow
        // signal — uses normalized rolloff (rolling 500-frame baseline).
        float rolloff_glow = 0.7 + spectralRolloffNormalized * 0.5;  // 0.7..1.2
        // Combined ribbon contribution (additive, then bounded mix)
        vec3 ribbon = (r1_col * r1 * r1_amp + r2_col * r2 * r2_amp + r3_col * r3 * r3_amp) * rolloff_glow;
        // Bounded blend — interior gates so it doesn't bleed past outline.
        float ribbon_total = clamp(r1*r1_amp + r2*r2_amp + r3*r3_amp, 0.0, 0.45) * interior;
        col = mix(col, max(col, col + ribbon * 0.65), ribbon_total);
    }

    // Chrome rim on the ink strokes (always visible inside silhouette)
    col += rim_col * silhouette;

    // God rays inside taco only
    col += god_rays * ray_col * silhouette * 0.8;

    // ---- BEAT FLASH (REMOVED iter 38) ----
    // User flag: "I don't like the green flash." Was multiplying the silhouette
    // by 1.25 on each beat_pulse — combined with the green/cyan plasma palette
    // it read as a green flash. Removed entirely.

    // ---- VJ INNER GLOW (from the-coat-25 line 970-977) ----
    // Chrome-tinted bloom inside the silhouette edge. Falls off toward center
    // so the body has color depth without losing the silhouette reading.
    {
        // inner_d is roughly the distance from the ink edge inward into the body.
        // We approximate it: full inside = high, near edge = low.
        float inner_d = max(interior - 0.5, 0.0) * 2.0;
        float inner_glow = exp(-inner_d * 4.0) * smoothstep(0.0, 0.2, interior);
        col += chrome * inner_glow * 0.5;
    }

    // ---- VJ DRIP (REMOVED iter 38) ----
    // User flag: "I don't like the sphere that's dropping down from the taco over time."
    // knob_15 left wired but the effect block is disabled.
    if (false && knob_15 > 0.01) {
        vec2 drip_src = taco_center_uv;
        float bass_hit = clamp(bassZScore, 0.0, 2.0);
        float drip_phase = fract(iTime * 0.6);
        float drip_y = drip_src.y - drip_phase * 0.55;
        vec2  dp = uv - vec2(drip_src.x, drip_y);
        float drip_r = 0.022 + bass_hit * 0.01;
        float tail_y = max(0.0, uv.y - drip_y) * 2.5;
        float drop_sd = length(vec2(dp.x, dp.y + tail_y * 0.15)) - drip_r;
        float drop_glow_d = exp(-max(drop_sd, 0.0) * 80.0);
        // Faint tail from source to current drop position
        float trail_dist = abs(uv.x - drip_src.x);
        float trail_mask = smoothstep(drip_src.y, drip_y, uv.y) * smoothstep(drip_y - 0.02, drip_y, uv.y);
        float trail = exp(-trail_dist * trail_dist * 3000.0) * trail_mask * (0.4 + bass_hit * 0.6);
        vec3 drip_col = hsl2rgb(vec3(fract(0.58 + pitchClassNormalized * 0.15), 0.85, 0.6));
        col += drip_col * (drop_glow_d + trail * 0.5) * (0.4 + bass_hit * 0.8) * knob_15 * 1.3;
    }

    // ---- VJ HEART PULSE (from the-coat-23 lines 718-727) ----
    // Red glow from taco center, pulses with bass. Fires on the
    // high-bass-low-centroid archetype — kicks read as actual heartbeats.
    // No knob — auto-fires whenever bass is in front of the music.
    // ---- HEART PULSE (REMOVED iter 41) ----
    // User flag: "And now we need to remove the green flashing on beat!"
    // The heart pulse used `hsl2rgb(fract(0.92 + pitchClassN*0.10 + ...))` which
    // rotates hue through the full circle as pitchClass changes — landing on
    // green at certain values. Multiplied by bass_smooth*1.2 made it FLASH
    // GREEN ON EVERY BEAT. This is the same hsl-fract-rainbow pattern user
    // rejected for SIGIL SWIRL. REMOVED. Don't re-add hsl2rgb(fract(hue+pitch))
    // anywhere in this shader.

    // ---- VJ WARM HEARTH (from the-coat-23 lines 661-684) ----
    // Fires on mid-dominant warm-dark-instrumental corner. Music's *identity* signal
    // (sustained mids + dark centroid + low energy = warm intimate ballad/instrumental).
    // Slow amber glow radiating outward from silhouette. Perfect for MCR Ghost ballad.
    // No knob — pure audio-corner gating, fires automatically when track shape matches.
    {
        float warm_gate = smoothstep(0.45, 0.75, midsNormalized)
                        * smoothstep(0.50, 0.25, spectralCentroidNormalized)
                        * smoothstep(0.65, 0.20, energyNormalized);
        if (warm_gate > 0.02) {
            // Outside the silhouette, distance from the taco edge — proxy via radial
            // distance from center minus a "silhouette radius."
            float hearth_d = max(length(uv - taco_center_uv) - 0.18, 0.0);
            float hearth = exp(-hearth_d * 8.0) * (1.0 - silhouette);
            float breath = 0.85 + 0.15 * sin(iTime * 0.4 * TAU);  // shares 0.4Hz with CALM_BREATH
            // Iter 45: was hsl2rgb(vec3(fract(seed2*0.3 + 0.1), 0.85, 0.45)) — unbounded
            // hue could land on GREEN with the wrong seed. Replaced with oklch in
            // CORE_HUE family — warm hearth stays warm regardless of seed value.
            vec3 hearth_col = oklch2rgb(vec3(0.65, 0.18, CORE_HUE + seed2 * 0.05));
            // Iter 45: gate bounded with mix() instead of additive blend so this
            // can never flash bright on a fingerprint shift.
            float hearth_gain = clamp(hearth * warm_gate * breath * 0.5, 0.0, 0.4);
            col = mix(col, max(col, col + hearth_col * 0.6), hearth_gain);
        }
    }

    // ---- OUTLINE EDGE GLOW (wooli-2 signature, tight) ----
    // knob_4 → OUTLINE GLOW intensity (auto-wired iter 38, RIM_GLOW repurposed).
    // Single very thin halo right at the silhouette edge for definition.
    {
        float edgeWidth = 0.004 + bass_smooth * 0.005;
        float edgeGlow = getEdgeGlow(uv, edgeWidth);
        edgeGlow *= (1.0 - silhouette);
        vec3 edgeCol = oklch2rgb(vec3(0.74, 0.18, CORONA_HUE));
        // knob_4 lets user dial the halo prominence: 0=subtle, 1=hero glow.
        // Was hardcoded at 0.7. Now (0.3 + knob_4 * 1.5) — full range from
        // barely-visible to dominant outline halo.
        float edgeBoost = (0.3 + knob_4 * 1.5) + drop_glow * 0.5;
        col += edgeCol * edgeGlow * edgeBoost;
    }

    // ---- PRISMATIC R/G/B EDGE SPLIT (coat-25 knob_2 PRISM signature) ----
    // Three-channel chromatic aberration on the outline. Each channel sampled at
    // a slightly different X-offset so the halo splits into red-on-the-right and
    // blue-on-the-left fringes. Activates on flux+drop. Stays subtle so the logo
    // outline reads cleanly. From the-coat-25 lines 632-647 (adapted for our edge).
    {
        float prism_amt = 0.003 + spectralFluxNormalized * 0.005 + drop_glow * 0.004;
        float thin = 0.005 + bass_smooth * 0.004;
        float eR = getEdgeGlow(uv + vec2( prism_amt, 0.0), thin);
        float eG = getEdgeGlow(uv,                            thin);
        float eB = getEdgeGlow(uv + vec2(-prism_amt, 0.0), thin);
        float exterior = 1.0 - silhouette;
        // Map to oklch hot palette so split reads as proper prism, not raw RGB clipping
        vec3 prism_r = oklch2rgb(vec3(0.65, 0.20, CORE_HUE + 0.3));   // warm side
        vec3 prism_g = oklch2rgb(vec3(0.65, 0.18, CORE_HUE + 1.6));   // mid
        vec3 prism_b = oklch2rgb(vec3(0.65, 0.20, CORONA_HUE));       // cool side
        col += (prism_r * eR + prism_g * eG + prism_b * eB) * exterior * 0.35
             * (0.5 + drop_glow + spectralFluxNormalized * 0.6);
    }

    // ---- LOGO-SHAPED FEEDBACK ECHO (the killer move) ----
    // User: "I want the taco use getLastFrameColor to radiate the taco logo outline
    // instead of just radial waves." Sample previous frame from a point pulled SLIGHTLY
    // INWARD toward the taco center. Over many frames, the outline-glow content drifts
    // OUTWARD, creating expanding rings in the SHAPE of the taco — a true logo echo.
    // knob_16 → echo intensity (auto-wired iter 25).
    if (hasHistory) {
        // BANDING FIX (iter 32): user surfaced banding when turning a knob to extreme.
        // Root cause: at high knob_16, the multiplicative chain
        //   echo_decay (0.96) × echo_strength (0.8) × additive blend (col +=)
        // gives effective per-frame feedback gain ~0.46. Recursive sampling
        // through getLastFrameColor causes the integrator to BUILD UP at certain
        // radii where the echo loop aligns, creating bright concentric bands.
        // PERMANENT FIX:
        //   1. Cap total per-frame feedback gain to <0.35 (decisively below 0.5).
        //   2. Compute as `col = mix(col, echo, gain)` — bounded blend, can never
        //      produce output brighter than max(col, echo) regardless of knob_16.
        //   3. Knob_16 reduced to a soft scale instead of multiplying decay.
        float echo_pull = 0.006 + knob_16 * 0.008 + bass_smooth * 0.004;
        vec2 toward_center = normalize(taco_center_uv - uv + vec2(1e-5));
        vec2 jitter = (vec2(fbm(uv * 80.0 + iTime), fbm(uv * 80.0 - iTime + 3.7)) - 0.5) * echo_pull * 0.6;
        vec2 sample_uv = uv + toward_center * echo_pull + jitter;
        vec3 echo_prev = getLastFrameColor(sample_uv).rgb;
        // Hard cap: even at knob_16=1, total gain stays <0.35. mix() blend can't
        // exceed max(col, echo_prev) so no banding accumulator possible.
        float echo_gain = clamp(knob_16 * 0.35, 0.0, 0.35) * (1.0 - silhouette);
        col = mix(col, echo_prev, echo_gain);
    }

    // ---- JULIA-WARPED EXTERIOR (moody-octopus2 technique) ----
    // User flag iter 27: "harsh rainbow banding bad. Permute a Julia set or
    // something more interesting. Look at moody-octopus-2."
    // Each exterior pixel iterates a Julia set on its own uv, then samples the
    // PREVIOUS FRAME at the transformed coordinate. Creates organic fractal
    // tendrils that pull the taco's outline through fractal space — every frame
    // the previous frame is re-warped, building tendrils that twist and breathe.
    // knob_14 → Julia warp intensity (was CHAOS HALO; reused).
    if (knob_14 > 0.01 && hasHistory) {
        // Centered uv for julia iteration (per moody-octopus2 line 65)
        vec2 jUV = (uv - 0.5) * 2.0;
        jUV.x *= res.x / res.y;
        // Julia constant on a slow circle. knob_13 controls the c-radius:
        //   k13=0.0 → c = 0.55 (compact Julia, dense tendrils)
        //   k13=0.5 → c = 0.7885 (classic moody-octopus default)
        //   k13=1.0 → c = 0.95 (spreading filaments, wild)
        // Auto-wired iter 29 — knob_13 has been held set/zero for many ticks.
        float c_radius = mix(0.55, 0.95, knob_13);
        float jt = iTime * 0.08 + bass_smooth * 0.4;
        float cRe = sin(jt) * c_radius + (spectralRoughnessNormalized * 0.005);
        float cIm = cos(jt) * c_radius + (spectralCentroidNormalized * 0.005);
        const int jSteps = 4;
        for (int i = 0; i < jSteps; i++) {
            float xn = jUV.x * jUV.x - jUV.y * jUV.y + cRe;
            float yn = 2.0 * jUV.x * jUV.y + cIm;
            jUV = vec2(xn, yn);
            if (length(jUV) > 2.0) break;
        }
        vec2 sample_offset = jUV * 0.005 * knob_14;
        vec2 jSampleUV = uv + sample_offset;
        vec3 julia_prev = getLastFrameColor(jSampleUV).rgb;
        // BANDING FIX (iter 32, same as echo): replaced additive blend (which can
        // accumulate per-frame and create concentric brightness bands at high
        // knob_14) with a bounded mix() that can't exceed max(col, julia_prev).
        // Hard cap: knob_14 → max blend gain of 0.30 (below 0.5 to prevent loop).
        float julia_gain = clamp(knob_14 * 0.30, 0.0, 0.30) * (1.0 - silhouette);
        col = mix(col, julia_prev, julia_gain);
    }

    // ---- VJ FRY (from the-coat-25 lines 1235-1251) — knob_8 ----
    // Hypersaturated/fried-color tween toward later-series VJ style.
    // The coat-25 finale signature: pumps sat + midtone lift + hue drift + contrast.
    // User has had knob_8 pinned at 0.961 for many ticks — auto-wire to dramatic motif
    // (plasma jam lesson: pinned-knob = "give it a binary on/off role").
    // BANDING FIX (iter 30): User flag "extreme color banding when knob turned all
    // the way up." Root cause: HSL hue is non-perceptual — fract() wraparound at
    // knob_8=1 with continuous time rotation creates harsh hue-wrapping bands as
    // adjacent pixels with similar luminance land on different sides of the wrap.
    // Switched to OKLCH (perceptually uniform). Hue rotation is in radians (not
    // wrapping fract), so no banding at extreme knob values.
    // CAPS: knob_8 contribution to hue rotation capped at *fixed* small value so
    // even at k8=1 the hue doesn't whip-around per frame.
    // Iter 54 fix (user: "Ah, that's driven by knob_8" + "colors are shivering
    // and changing every frame"): VJ_FRY's per-frame audio-modulated hue
    // rotation was causing the shivering. spectralCentroidNormalized varies
    // every frame (~5-10% jitter), and at knob_8=1 with the chroma-boosted
    // brightness, that jitter became VISIBLE color flicker.
    // Replaced ALL per-frame audio inputs with stable smoothed variants:
    //   - Removed spectralCentroidNormalized → bounded sine-breath only
    //   - Hue uses ONLY iTime-based slow oscillator (no audio in hue)
    //   - Chroma uses Mean (long-window average) instead of raw
    //   - Lightness S-curve unchanged (no audio there)
    // Result: knob_8 still gives the saturated VJ-fry feel but the colors
    // STAY STILL frame-to-frame regardless of audio jitter.
    if (knob_8 > 0.001) {
        vec3 lch_fry = rgb2oklch(max(col, vec3(0.001)));
        // Chroma boost — uses no audio, just knob (stable per-frame).
        lch_fry.y = clamp(lch_fry.y + knob_8 * 0.08, 0.0, 0.30);
        // Lightness midtone S-curve — no audio.
        lch_fry.x = mix(lch_fry.x, smoothstep(0.0, 1.0, lch_fry.x) * 0.7 + 0.15, knob_8 * 0.4);
        // Hue rotation: STABLE bounded sine-breath only. No audio in hue.
        // Period 20s, peak-to-peak 0.20 rad. Cannot pass through magenta.
        float fry_breath = sin(iTime * 0.05 * TAU) * 0.5 + 0.5;
        lch_fry.z += knob_8 * 0.20 * (fry_breath - 0.5);
        col = mix(col, oklch2rgb(lch_fry), knob_8);
        // Final contrast push — same smoothstep, no audio.
        col = mix(col, smoothstep(vec3(0.05), vec3(0.95), col), knob_8 * 0.25);
    }

    // ---- VJ TIME-ECHO (from the-coat-25 line 982-993) ----
    // On energy surges, triple-expose the previous frame around the taco center
    // with R/G/B offsets. Evolves naturally over the long-form set as content shifts.
    {
        float echo = clamp(energyZScore - 0.5, 0.0, 1.0);
        if (echo > 0.05) {
            vec3 e1 = getLastFrameColor(uv + vec2( 0.020,  0.006)).rgb;
            vec3 e2 = getLastFrameColor(uv + vec2(-0.024,  0.009)).rgb;
            vec3 e3 = getLastFrameColor(uv + vec2( 0.004, -0.018)).rgb;
            vec3 echoed = (e1 * vec3(1.2, 0.7, 0.7)
                         + e2 * vec3(0.7, 1.1, 0.9)
                         + e3 * vec3(0.8, 0.9, 1.2)) * 0.34;
            col = mix(col, col + echoed * 0.5, echo * 0.9);
        }
    }

    // ---- SHIVER (iter 41 — user-marked audio corner) ----
    // User rewound to a specific section ("Now is where I meant. I rewound so
    // you can see it") — captured fingerprint:
    //   entropy 0.97 + treble 0.65 + centroid 0.91 + roughness 0.80 + bass 0.13
    // = chaotic-bright-rough texture. The "shiver" is high-frequency micro-jitter
    // of the chrome ink — taco TREMBLES on this corner. NOT a flash, NOT a hue
    // rotation. Pure positional jitter. Brightness/color stay anchored.
    {
        // Iter 42 — user pointed at THIS section saying "look at whatever audio
        // feature is dominant." Sampled live: top features were entropy 0.96,
        // spectralSpread 0.89, spectralRolloff 0.87, centroid 0.70, treble 0.61,
        // roughness 0.52. The user's instinct (roughness) was close but spread
        // and rolloff are stronger. Rewrote the gate to use those:
        //   entropy: peak chaos
        //   spectralSpread: wide harmonic distribution = "wash" texture
        //   spectralRolloff: high-freq energy reach
        // All three are characteristic of the bright-chaotic-rough-wash that
        // user wants shivering on. The gate now FIRES strong here (was 0.03,
        // now ~0.5+ at the marked moment).
        float shiver_gate = smoothstep(0.6, 0.95, spectralEntropyNormalized)
                          * smoothstep(0.6, 0.92, spectralSpreadNormalized)
                          * smoothstep(0.55, 0.9, spectralRolloffNormalized);
        if (shiver_gate > 0.02) {
            // High-freq per-pixel hash with fast time — sub-pixel jitter (~1-2px max)
            float shiver_x = (th(floor(fragCoord) + iTime * 60.0) - 0.5);
            float shiver_y = (th(floor(fragCoord) + iTime * 60.0 + vec2(7.3)) - 0.5);
            // Sample a fresh sharp_ink at the shivered position — ink line jitters,
            // not the color. The logo trembles, no color shifting.
            float px2 = 1.5 / min(res.x, res.y);
            vec2 shivered_uv = uv + vec2(shiver_x, shiver_y) * px2 * shiver_gate;
            float shivered_ink = getTacoRegions(shivered_uv).y;
            // Darken at shivered ink positions — adds extra ink edges that flicker
            col = mix(col, col * 0.5, shivered_ink * shiver_gate * 0.6);
        }
    }

    // ---- CRISP INK OVERLAY (logo recognition guard, iter 56 deepened) ----
    // User flag iter 56: ink contrast still not strong enough vs busy filling.
    // Three-zone strategy: dim ring around stroke + DEEP shadow on stroke +
    // bright chrome highlight on the brightest part of the stroke. The dim
    // ring guarantees boundary contrast even when ink is plotted on white.
    {
        // 1. Sample ink at 2px AND 4px rings → wider shadow halo. Take max so
        //    the halo is the union of close-and-far ink.
        float pxr  = 1.5 / min(res.x, res.y);
        float pxr2 = 3.0 / min(res.x, res.y);
        float halo_close = max(max(getTacoRegions(uv + vec2( pxr, 0)).y,
                                   getTacoRegions(uv + vec2(-pxr, 0)).y),
                               max(getTacoRegions(uv + vec2(0,  pxr)).y,
                                   getTacoRegions(uv + vec2(0, -pxr)).y));
        float halo_far   = max(max(getTacoRegions(uv + vec2( pxr2, 0)).y,
                                   getTacoRegions(uv + vec2(-pxr2, 0)).y),
                               max(getTacoRegions(uv + vec2(0,  pxr2)).y,
                                   getTacoRegions(uv + vec2(0, -pxr2)).y));
        // 2. Three-tier ink strength field:
        //    - sharp_ink itself     → STROKE (legitimately black)
        //    - halo_close * 0.6     → 1px dim shadow ring
        //    - halo_far   * 0.30    → 2-3px shallow shadow
        float ink_field_stroke = sharp_ink;                     // stroke = full pull
        float ink_field_halo   = max(halo_close * 0.6, halo_far * 0.30);
        // 3. STROKE: pull to ABSOLUTE BLACK (vec3(0)). User flag iter 62:
        //    "whatever is in black in the mask has to legitimately be black or
        //    mostly black so the logo is discernable." Was `col * 0.04` (4% of
        //    chaotic underlying color, still visibly tinted at high chroma);
        //    now the target is vec3(0) so 95% of black + 5% of color = pure
        //    near-black regardless of how saturated the underlying col is.
        col = mix(col, vec3(0.0), ink_field_stroke * 0.95);
        // 4. HALO: shallow darken keeps shadow ring around strokes for
        //    boundary contrast. Pulls toward 8% of underlying color (NOT
        //    pure black) so the halo reads as "shadow", not "another stroke".
        col = mix(col, col * 0.08, ink_field_halo * 0.85);
        // 5. Subtle warm sheen (iter 63 user flag: "Let's add some contrast
        //    like we had before. Just make it darker than it was"). Brought
        //    back the chrome highlight but at ~1/3 the previous strength and
        //    much darker (L 0.78→0.42, C 0.16→0.06) so it's a faint warm
        //    glint on the stroke, not a color fill. Net result: ink is much
        //    darker than the original iter-56 chrome version but has a thin
        //    warm "depth" to it instead of being totally flat black.
        vec3 chromeInk = oklch2rgb(vec3(0.42, 0.06, CORE_HUE + 0.2));
        col += chromeInk * sharp_ink * (0.10 + bass_smooth * 0.08);
    }

    // Reinhard tonemap (from the-coat-25)
    float white = 2.0;
    col = col * (1.0 + col / (white * white)) / (1.0 + col);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
