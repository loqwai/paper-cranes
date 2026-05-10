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
// PRESETS — paste any URL into the browser (or the mobile list page).
// Mic mode (default for NFC bracelets):
// http://localhost:6969/?shader=redaphid/taco/tapestry&image=images/taco-stencil.png&controller=taco-kandi
// Tab-audio mode (Spotify/SoundCloud — Chrome desktop):
// http://localhost:6969/?shader=redaphid/taco/tapestry&image=images/taco-stencil.png&controller=taco-kandi&audio=tab
// Live jam editor:
// http://localhost:6969/jam.html?shader=redaphid/taco/tapestry&image=images/taco-stencil.png&controller=taco-kandi&audio=tab
// Seeded variants (each phone gets a unique look):
// http://localhost:6969/?shader=redaphid/taco/tapestry&image=images/taco-stencil.png&controller=taco-kandi&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029
// http://localhost:6969/?shader=redaphid/taco/tapestry&image=images/taco-stencil.png&controller=taco-kandi&seed=0.236&seed2=0.373&seed3=0.51&seed4=0.647
// http://localhost:6969/?shader=redaphid/taco/tapestry&image=images/taco-stencil.png&controller=taco-kandi&seed=0.854&seed2=0.991&seed3=0.128&seed4=0.265

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

// SPACE/NEBULA PALETTE in oklch — coat-25 + plasma-event-horizon aesthetic.
// User flag iter 22: "color scheme closer to coat — space, nebula, god rays. Not rainbow. oklab."
// All hues in oklch radians (TAU-based). Coat-25 anchor was hue~0.78 in HSL = magenta/purple.
// Plasma's space palette: hot core orange→ corona deep blue-violet.
// We blend gently between two coat-friendly families via knob_5 (FREEZE/PICK):
//   k5 ≈ 0   → COSMIC: orange-magenta core (0.4 rad) + deep blue-violet corona (4.2 rad)
//   k5 ≈ 1   → NEBULA: magenta-pink core (0.0 rad)   + cyan corona (3.4 rad)
// pitchClass + slow time drift add tiny modulation but stay within the coat family.
// seed2/seed4 give per-device tilt (small) so each phone is unique within the palette.
#define HUE_DRIFT (iTime * 0.005 + pitchClassNormalized * 0.04 + midsNormalized * 0.06)
#define CORE_HUE   (mix(0.4, 0.0, knob_5) + HUE_DRIFT + seed2 * 0.15)
#define CORONA_HUE (mix(4.2, 3.4, knob_5) + HUE_DRIFT * 0.5 + seed4 * 0.10)

// BIPOLAR knob_7 (iter 36 — user flags "I am not seeing that zoom happening" +
// "The knob works - just not reacting to the audio"):
//   k7 ∈ [0.0, 1.0] — controls BOTH zoom level AND pulse depth, linear ramp.
//   Pulse is ALWAYS on (uses latching bass_smooth + drop_glow + bassNormalized
//   peak), knob_7 just controls how big it gets. At k7=0 → big still taco, no
//   pulse. At k7=1 → tight zoom-in WITH heavy bass-driven contraction.
// Removed bipolar split — pulse was being hidden behind the 0.5 threshold.
#define ZOOM_BASE   (mix(0.85, 0.35, knob_7))  // iter 57b: taco fills frame at k7=0 (tighter than the old 1.6 default), even tighter at k7=1
#define PULSE_DEPTH (0.4 + knob_7 * 0.7)       // ALWAYS some pulse, knob scales it

// Pulse signal: instant bass peak detector + latching controller signals.
// No cubic ease — linear so even moderate audio produces visible motion.
#define BASS_PEAK     (smoothstep(0.25, 0.80, bassNormalized) + smoothstep(0.3, 0.9, bass_smooth) * 0.6)
#define ZOOM_INTENSITY (clamp(BASS_PEAK * 0.5 + drop_glow * 0.6, 0.0, 1.4))

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
// OUTLINE EDGE GLOW (wooli-2 signature, lines 87-94)
// 8-sample ring; if any neighbor hits the ink, this pixel glows.
// Result = 1 just outside the silhouette boundary, 0 elsewhere outside.
// Caller composites this with hue/wave/pulse for the actual visual.
// ============================================================================

float getEdgeGlow(vec2 uv, float width) {
    float nearInk = 0.0;
    for (int i = 0; i < 8; i++) {
        float a = float(i) * PI * 0.25;
        vec2 m_off = getTacoMask(uv + vec2(cos(a), sin(a)) * width);
        // m_off.y = ink darkness — silhouette boundary
        nearInk = max(nearInk, m_off.y);
    }
    return nearInk;
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
    vec2 maskInfo = getTacoMask(uv_fringed);
    float silhouette = maskInfo.x;          // 1 inside taco image bounds
    float ink        = maskInfo.y;           // dark ink lines (the outline)

    // SHARP INK — sampled at un-perturbed uv to keep the logo's internal lines
    // crisp regardless of fringe/feedback effects. User flag iter 30: "the
    // blurriness of the internal lines is making it hard to tell it's a taco."
    // This gets re-overlaid at the end of main() so ink ALWAYS reads as logo.
    vec2 sharpMaskInfo = getTacoMask(uv);
    float sharp_ink = sharpMaskInfo.y;

    // Coat-style: dilate to fill interior. Sample mask at 4 points to fill the white interior of the taco.
    float px = 1.0 / min(res.x, res.y);
    float interior_fill = silhouette;
    // Use multiple offset samples to detect "inside the taco shape" via boundary lookup
    vec2 m1 = getTacoMask(uv_fringed + vec2(px * 30.0, 0.0));
    vec2 m2 = getTacoMask(uv_fringed - vec2(px * 30.0, 0.0));
    vec2 m3 = getTacoMask(uv_fringed + vec2(0.0, px * 30.0));
    vec2 m4 = getTacoMask(uv_fringed - vec2(0.0, px * 30.0));
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

    // EVENT HORIZON RADIAL STRUCTURE
    float coreGlow   = smoothstep(0.5, 0.0, r_horizon) * HORIZON_POWER;
    // PHOTON_RING_RADIUS — knob_12 (auto-wired iter 22, +0.94 gesture, matches plasma iter-9 wiring)
    // 0=tight ring at singularity, 0.5=baseline 0.32, 1=wide ring near edge.
    // RING_PULSE on bassZ pushes the ring outward briefly on kicks (matter-impact feel).
    float photon_ring_r = mix(0.15, 0.55, knob_12) + max(bassZScore, 0.0) * 0.04;
    float photonRing = exp(-pow((r_horizon - photon_ring_r) * 6.0, 2.0))
                       * (0.6 + bass_smooth * 0.5 + DROP_FLARE);

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
    // Chrome rim hue — anchored to CORE_HUE family with subtle angular drift.
    // Was full rainbow (atan/TAU + time + pitch). Now ranges only ±90° around core.
    float chrome_angle = atan(uv.y - taco_center_uv.y, uv.x - taco_center_uv.x);
    vec3 chrome_lch = vec3(
        0.72,
        0.18,
        CORE_HUE + chrome_angle * 0.25 + iTime * 0.08 + pitchClassNormalized * 0.4
    );
    vec3 chrome = oklch2rgb(chrome_lch);
    // RIM ZAP — REMOVED iter 38 (the white-cyan flash on beat could read as
    // "green flash" combined with the palette). User flag: "I don't like the green flash."
    float rim_boost = 2.0 + RIM_GLOW * 2.0 + bass_smooth * 1.2;
    vec3 rim_col = chrome * ink * rim_boost * 0.4;

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
                vec2 srcMask = getTacoMask(scrollUV);
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
                if (beat) lineLayer *= 1.2;
            }
            // Composite using bounded mix (no feedback amplification possible)
            float line_gain = clamp(0.5 * dot(lineLayer, vec3(1.0)), 0.0, 0.4);
            col = mix(col, max(col, lineLayer), line_gain);
        }
    }

    // ---- NEBULA FOG (coat-23 lines 419-435 ported) ----
    // Slow drifting cosmic haze — adds atmospheric depth behind the taco.
    // Smooth-math only (no hash), oklch palette anchored to corona blue-violet.
    // Gated by treble + entropy so it only fires on bright/chaotic passages.
    {
        float nebula_gate = smoothstep(0.4, 0.85, trebleNormalized)
                          * smoothstep(0.5, 0.9, spectralEntropyNormalized);
        if (nebula_gate > 0.02) {
            float nt = iTime * 0.05;
            vec2 np = (uv - 0.5) * 1.3;
            float n1 = sin(np.x * 1.7 + nt * 1.3) * sin(np.y * 2.1 - nt * 0.9);
            float n2 = sin(np.x * 3.1 - nt * 0.7) * sin(np.y * 2.7 + nt * 1.1);
            float n3 = sin((np.x + np.y) * 0.9 + nt * 0.6);
            float fog = (n1 + n2 * 0.6 + n3 * 0.4) * 0.25 + 0.5;
            fog = smoothstep(0.25, 0.95, fog);
            vec3 nebula_col = oklch2rgb(vec3(0.40, 0.16, CORONA_HUE - 0.3));
            col += nebula_col * fog * nebula_gate * 0.20 * (1.0 - silhouette);
        }
    }

    // Plasma fills the taco interior
    vec3 plasma_with_trail = mix(prev, plasma_col, 0.35);
    col = mix(col, plasma_with_trail, interior);

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
    {
        float heart_d_dist = length((uv - taco_center_uv) * vec2(1.2, 1.0));
        float heart = exp(-heart_d_dist * 6.0);
        float heart_pulse = 0.3 + bass_smooth * 1.2 + bassNormalized * 0.5 + midsNormalized * 0.4;
        vec3 heart_col = hsl2rgb(vec3(
            fract(0.92 + pitchClassNormalized * 0.10 + sin(iTime * 0.4) * 0.03),
            1.0,
            0.55
        ));
        col += heart * heart_col * heart_pulse * interior * 0.6;
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
    if (knob_8 > 0.001) {
        vec3 lch_fry = rgb2oklch(max(col, vec3(0.001)));
        // Chroma boost (max +0.10 oklch chroma even at k8=1 — perceptual cap)
        lch_fry.y = clamp(lch_fry.y + knob_8 * 0.08, 0.0, 0.30);
        // Lightness midtone S-curve (smooth, no banding)
        lch_fry.x = mix(lch_fry.x, smoothstep(0.0, 1.0, lch_fry.x) * 0.7 + 0.15, knob_8 * 0.4);
        // Hue rotation: capped at SLOW drift even at k8=1 so no wrap banding.
        // Was time*0.04 (full rotation per ~25s); now time*0.008 (1/5 speed) AND
        // multiplied by fixed 0.5 ceiling so max hue shift per frame is tiny.
        lch_fry.z += knob_8 * 0.5 * (iTime * 0.008 + spectralCentroidNormalized * 0.04);
        col = mix(col, oklch2rgb(lch_fry), knob_8);
        // Final contrast push — same smoothstep, but reduced max from 0.4 to 0.25
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

    // ---- CRISP INK OVERLAY (logo recognition guard) ----
    // Re-asserts the taco's ink lines AT FULL CONTRAST after all the feedback
    // effects, fringe perturbation, and color blending. Ink is sampled from the
    // un-perturbed uv (sharp_ink) so internal logo lines stay readable as a TACO.
    // We darken the existing color where ink is present, then add a chromed highlight.
    {
        // Darken: ink lines pull color down toward pure dark (logo readability)
        col = mix(col, col * 0.15, sharp_ink * 0.75);
        // Chrome highlight on the very darkest stroke pixels (anti-flat ink)
        vec3 chromeInk = oklch2rgb(vec3(0.65, 0.18, CORE_HUE + 0.4));
        col += chromeInk * sharp_ink * (0.25 + bass_smooth * 0.3);
    }

    // Reinhard tonemap (from the-coat-25)
    float white = 2.0;
    col = col * (1.0 + col / (white * white)) / (1.0 + col);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
