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
uniform float bass_smooth;  // taco-kandi controller — EMA-smoothed bassNormalized
uniform float drop_glow;    // taco-kandi controller — sustained drop signal

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

// Coat-style chrome rim — knob_4
#define RIM_GLOW (knob_4 + spectralFluxNormalized * 0.5)

// Drop / event horizon power
#define BUILD            clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
#define IS_DROP          clamp(BUILD + smoothstep(0.35, 0.85, energyZScore) * 0.75, 0.0, 1.0)
// Use latched drop_glow + smoothed bass — sustained payoff, not flicker
#define HORIZON_POWER    (1.2 + bass_smooth * 1.0 + drop_glow * 0.6)
#define DROP_FLARE       (drop_glow * 0.8)

// PALETTE MODE ROTATION — auto-cycles through 4 distinct color families.
// User flagged: "looking for variety." Adds variety without needing user input.
// Each palette holds for ~25s, transitions over ~5s.
// Modes (oklch radians):
//   0  ember:    core orange (0.6) + corona blue-violet (4.2)  — hot/cold
//   1  emerald:  core green (2.5) + corona magenta (5.6)         — biomedical
//   2  arctic:   core cyan (3.5) + corona gold (1.0)             — icy w/ warm halo
//   3  prism:    core magenta (5.0) + corona green (2.5)         — high contrast
//
// MODE_T cycles 0→1 over PALETTE_PERIOD seconds. seed offsets the start.
// knob_5 → PALETTE FREEZE (auto-wired iter 13, +0.48 fresh-grab gesture).
//   knob_5 = 0 → full auto-rotation (default 25s cycle)
//   knob_5 = 1 → frozen at the mode determined by knob_5 itself (pick a palette)
// At knob_5 > 0, MODE_T = knob_5 directly so the user dials the palette family.
#define PALETTE_PERIOD 25.0
#define MODE_T (mix(fract((iTime + seed * PALETTE_PERIOD) / PALETTE_PERIOD * 0.25), knob_5, smoothstep(0.05, 0.15, knob_5)))
// Smooth blend between adjacent palette anchors via sin curves (cyclic)
#define MODE_PHASE (MODE_T * TAU)
#define CORE_HUE   (mix(0.6, 2.5, smoothstep(0.0, 0.5, abs(sin(MODE_PHASE * 0.5)))) \
                    + mix(0.0, 2.5, smoothstep(0.0, 0.5, abs(sin(MODE_PHASE * 0.5 + PI * 0.5)))) \
                    + seed2 * 0.4)
#define CORONA_HUE (mix(4.2, 5.6, smoothstep(0.0, 0.5, abs(sin(MODE_PHASE * 0.5)))) \
                    + mix(0.0, 1.0, smoothstep(0.0, 0.5, abs(sin(MODE_PHASE * 0.5 + PI * 0.5)))) \
                    + seed4 * 0.3)

// Coat-style smooth zoom (iter 10): no float(beat) anywhere.
//   1. INTENSITY = max of two slow signals (smooth bass + groove from mids/centroid)
//   2. CUBIC EASE-IN crushes low values so only big moments punch — buttery
//   3. drop_glow latched controller signal handles the drop payoff
// Reference: shaders/redaphid/wip/the-coat-fur-coat/the-coat-23.frag lines 367-372
#define INTENSITY     (max(bass_smooth + drop_glow * 0.3, midsNormalized * 0.8 + spectralCentroidNormalized * 0.2))
// Cubic ease-in (smoothstep^3) — reads as "buttery": stays at 0 until intensity > 0.5
#define ZOOM_INTENSITY_RAW (smoothstep(0.2, 0.9, INTENSITY))
#define ZOOM_INTENSITY     (ZOOM_INTENSITY_RAW * ZOOM_INTENSITY_RAW * ZOOM_INTENSITY_RAW)
// Drop punch — sustained glow * coefficient (no per-frame flicker)
#define DROP_PUNCH    (drop_glow * 0.25)
// Taco scale: knob_7 base zoom, plus smooth intensity + drop punch
#define TACO_SCALE    (ZOOM_K7 - ZOOM_INTENSITY * 0.18 - DROP_PUNCH)
// Plasma-interior zoom: same smooth signal, gentler coefficient
#define ZOOM_PULSE    (1.0 - ZOOM_INTENSITY * 0.10 - DROP_PUNCH * 0.5)

// Slow autonomous shape drift (plasma jam: organism breath at 0.4Hz)
// knob_11 → DRIFT_SPEED (auto-wired iter 6, +0.55 gesture, matches plasma iter-5 wiring)
// 0=frozen shape, 0.5=baseline 1x rate, 1=2x faster organic morphing
#define DRIFT_SPEED (mix(0.0, 2.0, knob_11))
#define SHAPE_DRIFT_A (sin(iTime * 0.07 * DRIFT_SPEED) * 0.5 + sin(iTime * 0.13 * DRIFT_SPEED) * 0.3)
#define SHAPE_DRIFT_B (cos(iTime * 0.11 * DRIFT_SPEED) * 0.4 + cos(iTime * 0.05 * DRIFT_SPEED) * 0.6)

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
// TACO MASK
// taco.png: transparent background, dark ink lines on white interior
// returns: alpha (1=inside image), ink (0..1, 1=black ink stroke)
// ============================================================================

vec2 getTacoMask(vec2 uv) {
    vec2 res = iResolution.xy;
    float screenAspect = res.x / res.y;
    vec2 c = (uv - 0.5) * TACO_SCALE;
    if (screenAspect > 1.0) c.x *= screenAspect;
    else                    c.y /= screenAspect;
    vec2 imgUV = c + 0.5;
    float margin = 0.02;
    if (imgUV.x < margin || imgUV.x > 1.0 - margin ||
        imgUV.y < margin || imgUV.y > 1.0 - margin) return vec2(0.0);
    vec4 tex = getInitialFrameColor(imgUV);
    return vec2(tex.a, tex.a * (1.0 - tex.r));
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
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    // Centered aspect-aware UV (plasma convention)
    vec2 p_centered = (fragCoord - res * 0.5) / min(res.x, res.y);
    vec2 uv = fragCoord / res;
    bool hasHistory = iFrame > 2;

    // ---- TACO MASK ----
    vec2 maskInfo = getTacoMask(uv);
    float silhouette = maskInfo.x;          // 1 inside taco image bounds
    float ink        = maskInfo.y;           // dark ink lines (the outline)

    // Coat-style: dilate to fill interior. Sample mask at 4 points to fill the white interior of the taco.
    float px = 1.0 / min(res.x, res.y);
    float interior_fill = silhouette;
    // Use multiple offset samples to detect "inside the taco shape" via boundary lookup
    vec2 m1 = getTacoMask(uv + vec2(px * 30.0, 0.0));
    vec2 m2 = getTacoMask(uv - vec2(px * 30.0, 0.0));
    vec2 m3 = getTacoMask(uv + vec2(0.0, px * 30.0));
    vec2 m4 = getTacoMask(uv - vec2(0.0, px * 30.0));
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
        float kaleido_n = mix(2.0, 12.0, knob_6);
        float kal_a = atan(p_lensed.y, p_lensed.x);
        float kal_r = length(p_lensed);
        float seg = TAU / kaleido_n;
        kal_a = mod(kal_a + iTime * 0.05, seg);
        // Mirror within each segment for kaleido symmetry
        kal_a = abs(kal_a - seg * 0.5);
        p_lensed = vec2(cos(kal_a), sin(kal_a)) * kal_r;
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

    // EVENT HORIZON RADIAL STRUCTURE
    float coreGlow   = smoothstep(0.5, 0.0, r_horizon) * HORIZON_POWER;
    float photonRing = exp(-pow((r_horizon - 0.32) * 6.0, 2.0))
                       * (0.6 + bass_smooth * 0.5 + DROP_FLARE);

    // ---- COLOR (oklch from plasma) ----
    vec3 lch = rgb2oklch(max(cl, vec3(0.001)));
    lch.z += (spectralCentroidNormalized + COLOR_SPIN + seed * 0.3 + PITCH_FLASH) * TAU;
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

    // ---- SIGIL SWIRL (from the-coat-23 lines 685-701) ----
    // Iridescent radial spiral on mids + pitchClass — fires on melodic/groove passages.
    {
        vec2 sc = uv - taco_center_uv;
        float sr = length(sc);
        float sa = atan(sc.y, sc.x);
        float spiral = sin(sa * 5.0 + sr * 14.0 - iTime * 1.2 + midsNormalized * 3.0);
        float swirl_band = smoothstep(0.05, 0.22, sr) * smoothstep(0.45, 0.28, sr);
        float swirl = pow(0.5 + 0.5 * spiral, 3.0) * swirl_band;
        float swirl_hue = fract(0.7 + sa / TAU + iTime * 0.08 + pitchClassNormalized * 0.25);
        vec3 swirl_col = hsl2rgb(vec3(swirl_hue, 0.85, 0.55));
        float mids_gain = 0.4 + midsNormalized * 0.8 + bass_smooth * 0.5;
        plasma_col += swirl_col * swirl * mids_gain * 0.6;
    }

    // ---- COAT-STYLE CHROME RIM on taco ink lines ----
    float chrome_hue = fract(atan(uv.y - taco_center_uv.y, uv.x - taco_center_uv.x) / TAU
                             + iTime * (0.10 + pitchClassNormalized * 0.25)
                             + seed2 * 0.3);
    vec3 chrome = hsl2rgb(vec3(chrome_hue, 1.0, 0.65));
    // RIM ZAP — flux spikes on beat = punk rock snap. Latched beat_pulse keeps it
    // groovy not twitchy. Saturated white-cyan zap rides the chrome rim.
    float rim_zap = beat_pulse * smoothstep(0.2, 0.8, spectralFluxNormalized);
    float rim_boost = 2.0 + RIM_GLOW * 2.0 + bass_smooth * 1.2 + rim_zap * 2.0;
    vec3 rim_col = chrome * ink * rim_boost * 0.4
                 + vec3(0.85, 1.0, 1.2) * ink * rim_zap * 0.6;

    // ---- COAT-STYLE GOD RAYS from taco center on drops ----
    vec2 d_c = uv - taco_center_uv;
    float r_c = length(d_c);
    float a_c = atan(d_c.y, d_c.x);
    float fan = pow(abs(cos(a_c * 7.0 + iTime * 0.6 + seed * TAU)), 14.0);
    float fall = exp(-r_c * 1.5);
    float god_rays = fan * fall * IS_DROP;
    vec3 ray_col = oklch2rgb(vec3(0.78, 0.20, CORE_HUE + 0.4));

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

    // Plasma fills the taco interior
    vec3 plasma_with_trail = mix(prev, plasma_col, 0.35);
    col = mix(col, plasma_with_trail, interior);

    // Chrome rim on the ink strokes (always visible inside silhouette)
    col += rim_col * silhouette;

    // God rays inside taco only
    col += god_rays * ray_col * silhouette * 0.8;

    // Beat flash inside silhouette — uses latched beat_pulse, smoothly fades over ~1s
    col = mix(col, col * 1.25, silhouette * 0.5 * beat_pulse);

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
            float hearth_hue = fract(seed2 * 0.3 + 0.1);  // warm complement of seeded palette
            vec3 hearth_col = hsl2rgb(vec3(hearth_hue, 0.85, 0.45));
            col += hearth_col * hearth * warm_gate * breath * 0.7;
        }
    }

    // ---- VJ CHAOS HALO (from the-coat-25 lines 1125-1171) — knob_14 ----
    // Multi-mode concentric rings expanding from the taco center.
    //   k14 < 0.33: TIGHT — 1-2 slow rings, narrow spacing
    //   0.33-0.66: WIDE — 3-5 rings, faster phase, ring-pulse on entropy
    //   k14 > 0.66: SPIRAL — rings warp into rotating logarithmic spirals
    // Track-name signal "Ghost of You" — ghostly emanating rings.
    if (knob_14 > 0.01) {
        float entropy_mod = 0.4 + smoothstep(0.3, 0.9, spectralEntropyNormalized) * 0.6;
        float halo_gate = knob_14 * entropy_mod;
        float w_spiral = smoothstep(0.5, 1.0, knob_14);
        float ring_speed = 0.2 + knob_14 * 1.0;
        float ring_phase = fract(iTime * ring_speed);
        int max_rings = int(2.0 + knob_14 * 5.0);
        float halo_theta = atan(uv.y - taco_center_uv.y, uv.x - taco_center_uv.x);
        float spiral_arms = mix(0.0, 8.0, w_spiral);
        float spiral_warp = sin(halo_theta * spiral_arms + iTime * 0.8 * w_spiral) * 0.04 * w_spiral;
        float ring_spacing = mix(0.10, 0.22, smoothstep(0.0, 0.5, knob_14)) - w_spiral * 0.05;
        float halo = 0.0;
        // Distance-from-center approach (taco lacks SDF; use radial distance)
        float halo_d = length(uv - taco_center_uv);
        for (int i = 0; i < 7; i++) {
            if (i >= max_rings) break;
            float ri = float(i);
            float ring_r = ring_phase * 0.4 + ri * ring_spacing + spiral_warp * ri;
            float ring_d_dist = abs(halo_d - ring_r);
            float ring_sharp = mix(900.0, 350.0, w_spiral);
            halo += exp(-ring_d_dist * ring_d_dist * ring_sharp) * (1.0 - ri * 0.12);
        }
        // Halo lives OUTSIDE the silhouette so it reads as emanation, not interior overlay
        float halo_mask = (1.0 - silhouette) * smoothstep(0.0, 0.5, halo_d);
        float hue_speed = mix(0.02, 0.25, smoothstep(0.0, 1.0, knob_14));
        float angular_hue = w_spiral * halo_theta / TAU;
        vec3 halo_col = hsl2rgb(vec3(
            fract(0.1 + pitchClassNormalized * 1.0 + iTime * hue_speed + angular_hue),
            mix(0.7, 1.0, knob_14),
            0.55
        ));
        col += halo_col * halo * halo_mask * halo_gate * 0.9;
    }

    // ---- VJ FRY (from the-coat-25 lines 1235-1251) — knob_8 ----
    // Hypersaturated/fried-color tween toward later-series VJ style.
    // The coat-25 finale signature: pumps sat + midtone lift + hue drift + contrast.
    // User has had knob_8 pinned at 0.961 for many ticks — auto-wire to dramatic motif
    // (plasma jam lesson: pinned-knob = "give it a binary on/off role").
    if (knob_8 > 0.001) {
        vec3 hsl_fry = rgb2hsl(col);
        hsl_fry.y = clamp(hsl_fry.y * (1.0 + knob_8 * 0.6), 0.0, 1.0);
        hsl_fry.z = mix(hsl_fry.z, smoothstep(0.0, 1.0, hsl_fry.z) * 0.7 + 0.15, knob_8 * 0.5);
        hsl_fry.x = fract(hsl_fry.x + knob_8 * (iTime * 0.04 + spectralCentroidNormalized * 0.15 + max(spectralFluxZScore, 0.0) * 0.08));
        col = mix(col, hsl2rgb(hsl_fry), knob_8);
        col = mix(col, smoothstep(vec3(0.05), vec3(0.95), col), knob_8 * 0.4);
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

    // Reinhard tonemap (from the-coat-25)
    float white = 2.0;
    col = col * (1.0 + col / (white * white)) / (1.0 + col);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
