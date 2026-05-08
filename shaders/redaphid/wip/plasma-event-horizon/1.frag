// @favorite: true
// @fullscreen: true
// @name: plasma event horizon 1
// @tags: black-hole, radial, event-horizon, oklch
//
// plasma-event-horizon/1.frag — forked from canonical shaders/plasma.frag at iter 10
// of /vibej run during *PressureGENESI – Laherte* (2026-05-02). Event-horizon aesthetic
// pivot built up across iters 1-10; oklch color space; 12 wired knobs.
//
// Original: Ether by nimitz 2014 (https://www.shadertoy.com/view/MsjSW3)
// License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// Time advance — pushed faster on energy spikes / roughness / treble
#define T_ADVANCE (energyZScore + spectralRoughnessZScore + max(trebleZScore, 0.0) * 0.6)
// #define T_ADVANCE 0.0

// Saturation pump — full color on energy rises, washed on calm
#define SAT_BOOST (0.15 + max(energyZScore, 0.0) * 0.35)
// #define SAT_BOOST 0.3

// Lightness lift — mids body adds warmth
#define L_LIFT (midsNormalized * 0.06)
// #define L_LIFT 0.0

// Bass pump — thickens plasma on bass spikes (less-negative density offset = more visual mass)
#define BASS_PUMP (max(bassZScore, 0.0) * 0.35)
// #define BASS_PUMP 0.0

// Theme rotation — knob_5 anchors hue offset on top of centroid cycling (user-grabbed knob, auto-wired iter 2)
#define THEME_ROT (knob_5 * 0.5)
// #define THEME_ROT 0.0

// Warm depth tint — knob_4 darkens with cool->warm tilt (auto-wired iter 3, user pushed k4 to ~1.0)
#define WARM_DEPTH (knob_4 * 0.18)
// #define WARM_DEPTH 0.0

// Organism breath — sub-Hz sine pumps lightness on calm warm-bass passages
// Coherent at 0.4Hz with future slow modulations (the-coat lesson: shared frequency = one organism)
#define BREATH_RATE 0.4
#define BREATH (sin(iTime * BREATH_RATE * 6.2831) * 0.5 + 0.5)
// #define BREATH 0.5

// Calm-warm gate: fires when low energy + mid-dominant + dark centroid (warm-bass corner)
#define CALM_WARM (smoothstep(0.4, 0.0, energyNormalized) * smoothstep(0.4, 0.7, midsNormalized) * smoothstep(0.5, 0.15, spectralCentroidNormalized))
// #define CALM_WARM 0.0

// ============================================================================
// SHAPE EVOLUTION KNOBS (iter 4 — user request: "evolve the shape over time")
// All centered around 0.5 = baseline so default knob position keeps original look
// ============================================================================

// SHAPE_TWIST — knob_1: rotation rate of the SDF axes (0=frozen, 0.5=baseline, 1=double-spin)
#define SHAPE_TWIST (mix(0.2, 1.8, knob_1))

// FRACTAL_DENSITY — knob_3: how tightly the sin-fold layers pack (0.5=baseline 2.0)
#define FRACTAL_DENSITY (mix(1.0, 4.0, knob_3))

// WAVE_STRENGTH — knob_7: amplitude of the nested-sin fold (0=smooth blob, 0.5=baseline, 1=lumpy chaos)
#define WAVE_STRENGTH (mix(0.0, 1.2, knob_7))

// SOFTNESS — knob_8: log-offset that controls falloff (0=hard SDF, 0.5=baseline, 1=very soft)
#define SOFTNESS (mix(0.3, 2.5, knob_8))

// DRIFT_SPEED — knob_11: multiplies the autonomous SHAPE_DRIFT rate (0=frozen, 0.5=baseline 1x, 1=2x faster)
// Lets user freeze or accelerate the shape's time-evolution
#define DRIFT_SPEED (mix(0.0, 2.0, knob_11))

// SHAPE_DRIFT — autonomous slow time evolution so the shape mutates even with knobs static
// Two coprime sub-Hz oscillators give long-period morphing without periodic snap-back
// Multiplied by DRIFT_SPEED so user can pause / speed up the autonomous evolution
#define SHAPE_DRIFT_A (sin(iTime * 0.07 * DRIFT_SPEED) * 0.5 + sin(iTime * 0.13 * DRIFT_SPEED) * 0.3)
#define SHAPE_DRIFT_B (cos(iTime * 0.11 * DRIFT_SPEED) * 0.4 + cos(iTime * 0.05 * DRIFT_SPEED) * 0.6)

// COLOR_SPIN — knob_2: continuous time-based hue rotation rate (independent of audio centroid)
// 0=frozen palette, 0.5=slow drift, 1=rainbow cycle. User-driven chromatic motion.
#define COLOR_SPIN (knob_2 * iTime * 0.05)

// BRIGHT_LIFT — knob_14: additive brightness, paired with WARM_DEPTH to give user push/pull control
// 0=baseline, 1=fully blown out. User just pushed k14 to 1.0 = max brightness intent.
#define BRIGHT_LIFT (knob_14 * 0.25)

// PITCH_FLASH — pitchZ spikes flash hue (this iter audio: pitchZ 0.91 was huge melodic jump)
#define PITCH_FLASH (smoothstep(0.5, 1.0, abs(pitchClassZScore)) * 0.15)
// #define PITCH_FLASH 0.0

// ============================================================================
// EVENT HORIZON (iter 6 — user request: "powerful, radiating from the center")
// ============================================================================

// Singularity power — bass spikes pump the core glow (kicks = gravitational shockwaves)
#define HORIZON_POWER (1.2 + max(bassZScore, 0.0) * 1.0 + max(energyZScore, 0.0) * 0.6)

// Lensing strength — knob_10 anchors gravitational pull, audio energy adds on top
// Auto-wired iter 7 (user pushed k10 down 0.701→0.307, exploring lens intensity)
#define LENS_STRENGTH (knob_10 * 0.4 + energyNormalized * 0.25)
// #define LENS_STRENGTH 0.3

// Drop flare — rising energy pumps the photon ring's brightness for "matter being torn apart" payoff
// energyZScore 0.78 was firing at iter 7 audio — this catches that signal
#define DROP_FLARE (smoothstep(0.3, 1.0, energyZScore) * 0.8)
// #define DROP_FLARE 0.0

// Photon ring radius — knob_12: where the bright ring sits in the frame
// Auto-wired iter 9 (user grabbed k12 0→0.732 in one tick — biggest gesture)
// 0=tight ring around singularity, 0.5=baseline 0.32, 1=wide ring near edge
#define PHOTON_RING_RADIUS (mix(0.15, 0.55, knob_12))

// Photon ring bass pulse — kicks briefly push the ring outward (matter accreting impact)
// Decays back to PHOTON_RING_RADIUS so it's a transient, not a state
#define RING_PULSE (max(bassZScore, 0.0) * 0.04)

// Void edge — knob_16: where the outer fade-to-black BEGINS
// Fixed iter 11 (2026-05-02): previous wiring created a dark annular band that ate the photon ring.
// Now: VOID_INNER is where darkening starts (must be > photon ring radius),
//      VOID_OUTER is where pure void begins. voidFade = 1 inside, 0 outside, smooth between.
// 0=void starts very close to center (mostly dark), 0.5=baseline, 1=void only at far corners
#define VOID_INNER (mix(0.45, 0.95, knob_16))
#define VOID_OUTER (VOID_INNER + 0.2)

// Accretion glow color — oklch hue in radians (TAU = 6.2832)
// 0.6 rad ≈ orange-yellow (hot core), 4.2 rad ≈ deep blue-violet (corona)
// Oklch is perceptually uniform — same delta = same perceived color shift everywhere
#define CORE_HUE 0.6
#define CORONA_HUE 4.2
#define TAU 6.2831853

#define t iTime+T_ADVANCE
mat2 m(float a){float c=cos(a), s=sin(a);return mat2(c,-s,s,c);}

// EVOLVING FRACTAL (iter 11 — user request: "I want evolving fractal")
// Sub-Hz autonomous modulators inside map() so the FRACTAL STRUCTURE morphs over time,
// not just rotates. Coprime frequencies = aperiodic evolution (~25-90 second cycles)
//
// FRAC_EVO_RATE — knob_9: multiplies fractal-evolution frequency
// Auto-wired iter 12 (user pushed k9 0→1.0 in one tick — biggest gesture this session)
// 0=frozen fractal (good for analyzing a single moment), 0.5=baseline, 1=2x faster morph
#define FRAC_EVO_RATE (mix(0.0, 2.0, knob_9))
#define FRAC_EVO_A (sin(iTime * 0.041 * FRAC_EVO_RATE) * 0.5 + cos(iTime * 0.067 * FRAC_EVO_RATE) * 0.4)
#define FRAC_EVO_B (sin(iTime * 0.029 * FRAC_EVO_RATE) * 0.6 + cos(iTime * 0.083 * FRAC_EVO_RATE) * 0.3)
#define FRAC_EVO_C (sin(iTime * 0.053 * FRAC_EVO_RATE) * 0.4 + cos(iTime * 0.037 * FRAC_EVO_RATE) * 0.5)

float map(vec3 p){
    // Rotation rates respond to SHAPE_TWIST (k1) + slow autonomous drift (no snap-back)
    p.xz *= m(t * 0.4 * SHAPE_TWIST + SHAPE_DRIFT_A);
    p.xy *= m(t * 0.3 * SHAPE_TWIST + SHAPE_DRIFT_B);
    // Fractal density (k3) drifts slowly so the fold-spacing morphs even with knob static
    float dens = FRACTAL_DENSITY * (1.0 + FRAC_EVO_A * 0.3);
    vec3 q = p * dens + t;
    // Secondary fold layer with phase offsets that drift independently — this is the
    // primary "evolving fractal" axis. Each axis gets its own slow modulator so the
    // sin-fold pattern shifts and reforms over long aperiodic cycles.
    float fold1 = sin(q.x + FRAC_EVO_A + sin(q.z + FRAC_EVO_B + sin(q.y + FRAC_EVO_C)));
    // Octave-2 fold at half spatial frequency for fractal depth — drifts with FRAC_EVO_B
    vec3 q2 = q * 0.5 + vec3(FRAC_EVO_B, FRAC_EVO_C, FRAC_EVO_A);
    float fold2 = sin(q2.x + sin(q2.z + sin(q2.y))) * 0.5;
    // Wander offset minimized so the disk stays centered on origin
    // tanh keeps the fold contribution bounded to ±~0.95 even when fold1+fold2 spike,
    // preventing rz from exceeding the smoothstep(2.5, 0, rz) window — that overflow
    // was creating black holes in the disk (iter 14 fix for "sdf still clipped").
    float foldSum = tanh((fold1 + fold2) * 0.6) * WAVE_STRENGTH;
    return length(p + vec3(0.0, 0.0, sin(t * 0.7) * 0.2)) * log(length(p) + SOFTNESS)
        + foldSum
        - 1.0 + BASS_PUMP;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    // Aspect-aware centered UV — dead center is (0,0) regardless of viewport
    vec2 uv = (fragCoord.xy - iResolution.xy * 0.5) / iResolution.y;

    // Radial distance from center (0 at singularity, ~0.7 at corner of square viewport)
    float r = length(uv);

    // Gravitational lensing: warp space inward as a function of radius and audio
    // Iter 13 fix: capped lensSwirl to prevent extreme central twist that created
    // angular discontinuity wedges in the disk. Twist now smoothly fades to 0 at center
    // (preventing the "wedge cut" artifact) and at edges (preventing whole-frame spin).
    float lensSwirl = LENS_STRENGTH * smoothstep(0.0, 0.15, r) * smoothstep(0.9, 0.4, r);
    vec2 p = uv * (1.0 - lensSwirl * 0.3);
    float ca = cos(lensSwirl * 0.4), sa = sin(lensSwirl * 0.4);
    p = mat2(ca, -sa, sa, ca) * p;

    vec3 cl = vec3(0.0);
    float d = 2.5;
    for(int i=0; i<=5; i++) {
        vec3 pp = vec3(0,0,5.) + normalize(vec3(p, -1.))*d;
        float rz = map(pp);
        // Gradient clamped [0,1] so dark regions can't compound across iterations
        float f = clamp((rz - map(pp+.1))*0.5, 0.0, 1.0);
        vec3 l = vec3(0.1, 0.3, 0.4) + vec3(5.0, 2.5, 3.0) * f;
        // Additive accumulator with original smoothstep window (2.5, 0.0) — only
        // near-surface pixels light up, preserving fold detail + silhouette,
        // but no multiplicative dark-compounding. (iter 14c — middle ground.)
        cl += smoothstep(2.5, 0.0, rz) * 0.18 * l;
        d += min(rz, 1.);
    }

    // EVENT HORIZON RADIAL FALLOFF
    // Hot core: smoothstep gives 1.0 at center, fades to 0 at r ~ 0.4
    float coreGlow = smoothstep(0.5, 0.0, r) * HORIZON_POWER;
    // Outer rim: bright ring at the photon sphere (~r=0.35), dark beyond
    float photonRing = exp(-pow((r - (PHOTON_RING_RADIUS + RING_PULSE)) * 6.0, 2.0)) * (0.6 + max(bassZScore, 0.0) * 0.5 + DROP_FLARE);
    // Outer fade-to-void: 1.0 inside r=VOID_INNER, smoothly drops to 0.0 at r=VOID_OUTER
    // Always allows the photon ring + accretion disk to render fully bright
    float voidFade = 1.0 - smoothstep(VOID_INNER, VOID_OUTER, r);

    // Convert to oklch (L=lightness 0-1 perceptual, C=chroma 0-~0.4, H=hue radians 0-TAU)
    vec3 lch = rgb2oklch(cl);
    // Hue rotations — all in radians now (was 0-1 in HSL)
    // spectralCentroid + knob offsets sweep around the full color circle
    lch.z += (spectralCentroid + THEME_ROT + PITCH_FLASH + COLOR_SPIN) * TAU;
    // Chroma boost: oklch chroma maxes around 0.4, so SAT_BOOST scaled down
    lch.y = clamp(lch.y + SAT_BOOST * 0.25, 0.0, 0.4);
    // Lightness with radial structure — oklch L is perceptual so smaller numbers go further
    lch.x = clamp(lch.x * voidFade + coreGlow * 0.25 + photonRing * 0.22 + L_LIFT + BREATH * CALM_WARM * 0.06 - WARM_DEPTH + BRIGHT_LIFT * 0.35, 0.0, 1.0);
    // Hue zones — pull toward CORE_HUE near center, CORONA_HUE at photon ring
    float coreHueBlend = smoothstep(0.4, 0.0, r);
    // For circular hue interpolation in radians, mix the unit-circle representation
    // Simple approach: lerp the hue scalar (works fine when target & source are within π)
    lch.z = mix(lch.z, CORE_HUE, coreHueBlend * 0.7);
    lch.z = mix(lch.z, CORONA_HUE, photonRing * 0.4);
    lch.z += CALM_WARM * 0.04 * TAU;
    cl = oklch2rgb(lch);

    // Radial bloom add — hot core radiates oklch-pure orange light additively
    // L=0.75 high lightness, C=0.18 saturated, H=CORE_HUE (orange)
    vec3 coreLight = oklch2rgb(vec3(0.75, 0.18, CORE_HUE)) * coreGlow * 0.6;
    fragColor = vec4(cl + coreLight, 1.0);
}
