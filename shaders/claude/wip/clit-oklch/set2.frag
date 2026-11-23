// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, 3d, body, sexy, seeded, clit-set, journey, knobs, galactic
// preset: https://visuals.beadfamous.com/?shader=claude/wip/clit-oklch/set2&controller=clit-set
// CLIT-SET/2 — THE VOYAGE. A slow, knob-steered journey through Dom Mandy's complex power fractal,
// the place clit/2 lives. All knobs at 0 = home: the clit/2 silhouette, the landmark you return to.
// With every dial at 0 the autopilot walks a curated loop of beautiful places; knob_3 (VOYAGE) scrubs
// that loop by hand, and the other knobs steer on top of it.
// controllers/clit-set.js eases every move (zoom in log-depth) so the drift feels like floating.
// Audio sets the RATE of the always-on spin (it quickens with the music) and the slow colour; it never
// steers and never pulses the light (that read as flicker and shiver on the show wall, 2026-11-21).
// Colour: the repo OKLCH harmony kit (docs/oklch-palettes.md), theme EMBER & NEBULA: ember / amber body,
// teal / indigo galaxy, one base hue, okFit gamut mapping. Never grey, never hot magenta.
// Renders without the controller: cs_* read 0 and the knobs drive the camera directly (no voyage path).

uniform float cs_on, cs_time, cs_presence, cs_flow;
uniform float cs_A, cs_B, cs_kick, cs_bass, cs_mids, cs_treb;
uniform float cs_build, cs_drop, cs_jump, cs_shift, cs_hue;
uniform float cs_cx, cs_cy, cs_lz, cs_rot, cs_curl, cs_navA, cs_navB, cs_breath;
uniform float cs_pearl, cs_focus, cs_spread, cs_grit, cs_tone, cs_beat, cs_punch, cs_thump;
uniform float cs_k9, cs_k10, cs_k11, cs_k12, cs_k13, cs_k14, cs_k15, cs_k16;

#define HAS_CTL (cs_on > 0.5)
#define TAU 6.2831853

// ============================================================================
// KNOB MAP (MIDI Fighter Twister 4x4). Every dial at 0 looks right: after a reload all dials read 0.
//   row 1  k1 X        k2 Y        k3 VOYAGE   k4 ZOOM      ← navigation (eased in the controller)
//   row 2  k5 TURN     k6 POWER    k7 BODY     k8 CURL      ← the shape of the world
//   row 3  k9 HUE      k10 NEBULA  k11 TRAILS  k12 REACT
//   row 4  k13 GLASSES k14 EMBER   k15 SPOT    k16 LACE
// k1/k2/k3 at 0 = AUTOPILOT: the voyage drifts by itself through the waypoint loop and returns home.
// X/Y push the camera from wherever the voyage has it (dial × PAN_SPAN), so a nudge is a small move.
// VOYAGE blends to a hand scrub over its first 8%, along the shorter way round the loop.
// ============================================================================
#define K_HUE     (HAS_CTL ? cs_k9  : knob_9)
#define K_NEBULA  (HAS_CTL ? cs_k10 : knob_10)
#define K_TRAILS  (HAS_CTL ? cs_k11 : knob_11)
#define K_REACT   (HAS_CTL ? cs_k12 : knob_12)
#define K_DEPTH   (HAS_CTL ? cs_k13 : knob_13)
#define K_GLOW    (HAS_CTL ? cs_k14 : knob_14)
#define K_DROP    (HAS_CTL ? cs_k15 : knob_15)
#define K_LACE    (HAS_CTL ? cs_k16 : knob_16)

// ============================================================================
// NAVIGATION. Audio never touches these (audio in fractal coordinates strobes: clit/4).
// Controller: eased voyage + manual blend. Fallback: the same manual mapping, no voyage.
// Keep the fallbacks in sync with nav() in controllers/clit-set.js.
// ============================================================================
#define HOME_CX 0.77
#define ZOOM_MAX 1.1                                   // log-zoom cap (3x): past ~3x the lace turns to speckle
#define PAN_SPAN 0.8                                   // PAN_SPAN in controllers/clit-set.js
#define NAV_CX  (HAS_CTL ? cs_cx  : HOME_CX - knob_2 * PAN_SPAN)
#define NAV_CY  (HAS_CTL ? cs_cy  : knob_1 * PAN_SPAN)
#define NAV_LZ  (HAS_CTL ? cs_lz  : knob_4 * ZOOM_MAX)
#define NAV_ROT (HAS_CTL ? cs_rot : knob_5 * TAU)
#define NAV_A   (HAS_CTL ? cs_navA : 1.5 + knob_6 * 1.4)
#define NAV_B   (HAS_CTL ? cs_navB : 0.55 - knob_7 * 0.4)
#define NAV_CURL (HAS_CTL ? cs_curl : knob_8 * 0.45)

#define REACT (1.0 + K_REACT * 1.5)

// ============================================================================
// PER-DEVICE SEEDS — palette phase, lace density, rim warmth, star scatter. ?seed= pins it.
// ============================================================================
#define SEED_PHASE ((seed - 0.5) * 2.4)
#define SEED_LACE  ((seed2 - 0.5) * 0.6)
#define SEED_WARM  (seed3 * 0.5)
#define SEED_STARS (seed4 * 97.0)

// ============================================================================
// AUDIO TEXTURE (controller envelope, else raw-feature fallback)
// ============================================================================
#define FLOW (HAS_CTL ? cs_flow : iTime * 0.03)
// A detected drop does not dim the frame: on a hot line the detector fires every ~8 s, and its 50 ms
// spotlight was a whole-frame flash the shiver probe read as zoom in-and-out. Drops show as the hue
// turn (cs_jump) only. The SPOT knob (k15) still reaches the full spotlight.
#define DROP_INTENSITY K_DROP
#define BUILD_INTENSITY (HAS_CTL ? cs_build : clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0))
#define KICK (HAS_CTL ? cs_kick : clamp(bassZScore - 0.4, 0.0, 1.0))
// Many subtle features, each on its own channel, all slow-released envelopes: alive, never flashing.
#define BREATH (HAS_CTL ? cs_breath : energyNormalized)                       // energy, 1.5 s
// Bass punch: LOCAL only (rim, braid, ember). It used to multiply the whole frame, and whole-frame
// light on a 0.04 s attack is flicker, not rhythm (show 2026-11-21: flicker 1.3-1.6 on a line input).
#define PULSE ((HAS_CTL ? cs_bass : clamp(bassZScore, 0.0, 1.0)) * REACT)
// Lace light is steady: only music presence (a 0.25 s gate, track starts and stops) lifts it.
// It used to swell with mids (0.25 s) x loudness (1.5 s): global light on envelopes that release
// AFTER the hit, so the frame changed most while the music fell (motionVsEnergy -0.35 at the show).
#define PRESENCE (HAS_CTL ? cs_presence : 1.0)
#define LACE_GAIN ((1.0 + 0.3 * PRESENCE) * (1.0 + 0.45 * PUNCH * REACT))
// Rim, braid and stars hold steady. Any light that pulses with the beat shifts the frame's radial
// brightness profile, which the show's shiver probe reads as zoom jitter (measured 2026-11-22: kick
// light on rim + braid doubled zoomAbs). The beat lives in the spin rate (controllers/clit-set.js SPIN).
// PUNCH: every kick, 30 ms attack, 0.2 s fall (controller cs_punch). Lands on lace, rim and ember; the
// darkness pass and the luminance tone map keep it off the whole frame. Techno-venue build (Aaron, live:
// "I need it way more music reactive").
#define PUNCH (HAS_CTL ? cs_punch : clamp(bassZScore - 0.4, 0.0, 1.0))
#define BASS_ENV (HAS_CTL ? max(cs_thump, cs_bass) : clamp(bassZScore, 0.0, 1.0))   // local kick thump or z-score swell
#define TREB_ENV (HAS_CTL ? cs_treb : clamp(trebleNormalized, 0.0, 1.0))
#define RIM_INTENSITY (0.5 + 1.6 * PUNCH * REACT + 0.5 * TREB_ENV)
#define TWINKLE (0.2 + 1.5 * TREB_ENV * REACT)
#define RIM_WARMTH clamp(0.25 + SEED_WARM + BUILD_INTENSITY * 0.35, 0.0, 1.0)
#define PEARL (0.15 + (HAS_CTL ? cs_pearl : clamp(spectralCrestNormalized, 0.0, 1.0)) * 0.35)
// Focal size and vignette are fixed against audio: both are radial, and an eased radius that grows and
// shrinks with kurtosis / spread reads as a zoom in and out (the show's shiver probe, 2026-11-21)
#define FOCAL_RADIUS (0.5 + K_GLOW * 0.35)
#define GRIT (HAS_CTL ? cs_grit : 0.0)                                         // roughness: nebula shimmer
#define HUE_TURN ((HAS_CTL ? cs_hue : 0.0) * 1.2 + (HAS_CTL ? cs_jump : 0.0) * 0.9 + K_HUE * TAU + SEED_PHASE)
// Slow colour only: the 8 s centroid mean leans the palette warm on bright music, cool on dark
#define TONE_LEAN ((HAS_CTL ? cs_tone : 0.5) - 0.5)
// Loudness (1.5 s) lifts chroma a little: loud is more vivid, quiet more velvet
#define CHROMA_GAIN (0.85 + 0.3 * BREATH)
// Trails do not grow with loudness: more smear on loud passages made the loud frames move LESS
#define LACE_AA_HOLD 0.9   // where the lace is unresolved, the share of last frame's output kept (see unres)
#define FEEDBACK_MIX clamp(0.22 + K_TRAILS * 0.55, 0.0, 0.85)
#define VIGN_OPEN 0.03

// ============================================================================
// COLOR
// ============================================================================
// ============================================================================
// OKLCH HARMONY KIT — hue is in TURNS (0..1) everywhere in this kit.
// Builds on the wrapper's rgb2oklab/oklab2rgb (Ottosson matrices, LINEAR sRGB in/out).
// Public functions take and return DISPLAY sRGB (gamma-encoded), like fragColor.
// ============================================================================
#ifndef TAU
#define TAU 6.28318530718
#endif
#ifndef PI
#define PI 3.14159265359
#endif
#define KIT_CMAX 0.14
#define HARM_W   0.09

vec3 srgb2lin(vec3 c) {
    c = max(c, 0.0);
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 lin2srgb(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hwrap(float d) { return d - floor(d + 0.5); }
vec3 lchT(float L, float C, float h) { return vec3(L, C * cos(TAU * h), C * sin(TAU * h)); }

// GAMUT: pull toward the same-L grey just far enough to fit, then once more after shrinking
// chroma in OKLab, so L and hue stay put. Continuous in the input: no clipped flats, no bands.
float gamutT(vec3 c, float g) {
    float t = 1.0;
    for (int i = 0; i < 3; i++) {
        if (c[i] > 1.0) t = min(t, (1.0 - g) / (c[i] - g));
        if (c[i] < 0.0) t = min(t, g / (g - c[i]));
    }
    return max(t, 0.0);
}
vec3 okFit(vec3 lab) {
    lab.x = clamp(lab.x, 0.0, 0.999);
    float g = lab.x * lab.x * lab.x;
    lab.yz *= gamutT(oklab2rgb(lab), g);
    vec3 c = oklab2rgb(lab);
    return clamp(vec3(g) + (c - vec3(g)) * gamutT(c, g), 0.0, 1.0);
}
vec3 okOut(vec3 lab) { return lin2srgb(okFit(lab)); }

vec3 oklch2rgb(float L, float C, float h) { return okOut(lchT(L, C, h)); }
vec3 srgb2oklch(vec3 rgb) {
    vec3 lab = rgb2oklab(srgb2lin(rgb));
    return vec3(lab.x, length(lab.yz), fract(atan(lab.z, lab.y + 1e-7) / TAU));
}

// 4 keys, smoothstep-held: lingers on each key, glides between (C1, no bands). Mixed in OKLab,
// so a far hue jump passes through soft low chroma instead of a rainbow.
vec3 ramp4(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
    float x = clamp(t, 0.0, 1.0) * 3.0;
    return mix(mix(mix(a, b, smoothstep(0.0, 1.0, x)), c, smoothstep(1.0, 2.0, x)), d, smoothstep(2.0, 3.0, x));
}
float palCycle(float t) { return 0.5 - 0.5 * cos(TAU * t); }   // any t → seamless 0..1..0 for non-cyclic palettes

vec3 palAnalogousLab(float t, float baseH, float spread) {
    float s = smoothstep(0.0, 1.0, t);
    return lchT(mix(0.52, 0.80, s), 0.13 - 0.03 * abs(2.0 * s - 1.0), baseH + spread * (s - 0.5));
}
vec3 palSplitCompLab(float t, float baseH) {   // cyclic: t=0 and t=1 are the same colour
    vec3 dom = lchT(0.70, 0.13, baseH);
    return ramp4(dom, lchT(0.80, 0.085, baseH + 5.0 / 12.0), lchT(0.58, 0.08, baseH + 7.0 / 12.0), dom, t);
}
vec3 palTriadSoftLab(float t, float baseH) {   // cyclic
    vec3 dom = lchT(0.72, 0.11, baseH);
    return ramp4(dom, lchT(0.60, 0.07, baseH + 1.0 / 3.0), lchT(0.80, 0.06, baseH + 2.0 / 3.0), dom, t);
}
vec3 palMonoRampLab(float t, float baseH) {
    float s = clamp(t, 0.0, 1.0);
    return lchT(mix(0.45, 0.85, s), 0.04 + 0.09 * sin(PI * s), baseH + 0.03 * (s - 0.5));
}

vec3 palAnalogous(float t, float baseH, float spread) { return okOut(palAnalogousLab(t, baseH, spread)); }
vec3 palSplitComp(float t, float baseH) { return okOut(palSplitCompLab(t, baseH)); }
vec3 palTriadSoft(float t, float baseH) { return okOut(palTriadSoftLab(t, baseH)); }
vec3 palMonoRamp(float t, float baseH) { return okOut(palMonoRampLab(t, baseH)); }

// warmth 0..1 pulls the base hue toward saffron (~68°) the short way; chroma 0..1 walks
// mono → analogous → split-complement and scales chroma 0.55..1.
vec3 palMood(float t, float baseH, float warmth, float chroma) {
    float h = baseH + 0.6 * clamp(warmth, 0.0, 1.0) * hwrap(0.19 - baseH);
    float c = clamp(chroma, 0.0, 1.0);
    vec3 lab = mix(palMonoRampLab(t, h), palAnalogousLab(t, h, 0.14), smoothstep(0.0, 0.5, c));
    lab = mix(lab, palSplitCompLab(t, h), smoothstep(0.5, 1.0, c));
    lab.yz *= 0.55 + 0.45 * c;
    return okOut(lab);
}

// Squeeze any colour's hue into the ±HARM_W window around baseH; the far side of the wheel also
// loses chroma (hides the wrap seam), and chroma soft-saturates at KIT_CMAX.
vec3 harmonize(vec3 rgb, float baseH, float amt) {
    vec3 lab = rgb2oklab(srgb2lin(rgb));
    float a = clamp(amt, 0.0, 1.0);
    float C = length(lab.yz);
    float d = hwrap(atan(lab.z, lab.y + 1e-7) / TAU - baseH);
    float h = baseH + mix(d, clamp(d, -HARM_W, HARM_W), a);
    C *= 1.0 - 0.6 * a * smoothstep(0.25, 0.5, abs(d));
    C = mix(C, C * inversesqrt(1.0 + C * C / (KIT_CMAX * KIT_CMAX)), a);
    return okOut(lchT(lab.x, C, h));
}
// Keep hue and L; drain chroma from colours that sit off-scheme.
vec3 desatTowardScheme(vec3 rgb, float baseH, float amt) {
    vec3 lab = rgb2oklab(srgb2lin(rgb));
    float d = hwrap(atan(lab.z, lab.y + 1e-7) / TAU - baseH);
    lab.yz *= 1.0 - clamp(amt, 0.0, 1.0) * smoothstep(0.06, 0.30, abs(d));
    return okOut(lab);
}
// ============================================================================
// THEME: EMBER & NEBULA. A warm body adrift in a cold galaxy. The lace is the body: ember red and
// burnt amber, lit from inside. The galaxy behind and around it is cool: teal (the kit's split
// complement of the ember, +150 deg) and indigo velvet (the darkest lace, the pale star's tint).
// Warm = near and cool = far, so the theme agrees with ChromaDepth glasses even with K_DEPTH at 0.
// One base hue (THEME_H, in turns) sets all four keys. The per-device seed turns it within the
// ember window only (27..41 deg), so no phone ever lands in hot magenta (indigo stays under 286 deg).
// Knobs and audio (HUE_TURN, cs_hue, cs_jump, cs_shift, TONE_LEAN) move the position ALONG the
// palette (pal_t), never the hues themselves: no dial can take the series off-theme.
// Lightness band: the series is velvet on black, darker than the kit's 0.45..0.85 band, so it keeps
// its own (lace L 0.13..0.70, the true OKLab lightness the old palette displayed). Chroma is
// requested past the kit's 0.13 and okFit maps it to the sRGB edge at constant L and hue: the series
// rule is never grey, and the edge is where every lace pixel was before.
// ============================================================================
#define THEME_H (0.095 + 0.02 * (2.0 * fract(seed * 7.31 + 0.13) - 1.0))
#define KEY_AMBER  0.04            // burnt amber, analogous to the ember (kept short of yellow: the kick turns it +45 deg)
#define KEY_TEAL   (5.0 / 12.0)    // the kit's split complement
#define KEY_INDIGO 0.68            // the velvet (lands 272..286 deg: violet, never magenta)

// The theme ramp in OKLab at lightness L and chroma C. t: 0 ember, 1/3 amber, 2/3 teal, 1 indigo.
// Callers ping-pong t, so it never wraps indigo -> ember across magenta. ramp4 glides between keys in
// OKLab, so the far amber -> teal step passes through soft chroma instead of a green band. themeHold
// holds each key longer first (the glide takes the middle half of each leg): the olive-green midpoint
// of that step drops from ~9% of a uniform t sweep to ~3%.
float themeHold(float t) {
    float x = clamp(t, 0.0, 1.0) * 3.0;
    float i = min(floor(x), 2.0);
    return (i + smoothstep(0.25, 0.75, x - i)) / 3.0;
}
vec3 themeLab(float t, float L, float C) {
    float h = THEME_H;
    return ramp4(lchT(L, C, h), lchT(L, 0.85 * C, h + KEY_AMBER),
                 lchT(L, 0.75 * C, h + KEY_TEAL), lchT(L, C, h + KEY_INDIGO), themeHold(t));
}
vec3 themeCol(float t, float L, float C) { return okOut(themeLab(t, L, C)); }

// Strict chromadepth for the glasses: red (29 deg, near) to violet (293 deg, far), on the kit's
// gamut fit. Physics, not theme: the seed does not turn it.
vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float boost = 1.0 + 0.2 * sin(t * TAU);
    return oklch2rgb(0.60 - 0.36 * t, 0.26 * boost * (1.0 - t * 0.3), 0.08 + t * 0.735);
}

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
               mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}

// One parallax layer of stars: cell-jittered points, each with its own twinkle phase
float stars(vec2 p, float density) {
    vec2 cell = floor(p), f = fract(p) - 0.5;
    float h = hash21(cell + SEED_STARS);
    if (h > density) return 0.0;
    vec2 o = vec2(hash21(cell + 7.1), hash21(cell + 3.7)) - 0.5;
    float d = length(f - o * 0.7);
    float tw = 0.6 + 0.4 * sin(FLOW * 40.0 * (0.5 + h) + h * 60.0);
    return smoothstep(0.06, 0.0, d) * tw * (0.4 + 0.6 * fract(h * 13.0));
}

vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 P, vec2 V) {
    float drop = DROP_INTENSITY;
    float build = BUILD_INTENSITY;
    float kick = KICK;

    float lz = NAV_LZ;                                     // log zoom: 0 = home, 1.1 = 3x
    float zoom = exp(lz);

    // Screen → fractal plane. Screen x maps to C.y (the mirror axis), screen y to C.x, as clit/2.
    vec2 p = (iResolution.xy - V - V) / iResolution.y;
    p = rot2(NAV_ROT) * p;
    // Zoom dives toward a lace-dense point on the right wing (a zoom into the pale core is empty).
    vec2 home = vec2(NAV_CX, NAV_CY);
    vec2 dive = home + vec2(0.23, 0.33);
    vec2 C = dive + (home + 0.6 * p.yx - dive) / zoom;
    V = C;

    float v, x, y,
          z = y = x = 9.;
    vec2 Z = vec2(0.0);

    float focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);
    float a_pow = NAV_A;
    float b_off = NAV_B;
    mat2 curl = rot2(NAV_CURL);

    // LACE AA: D = dV/dC rides along the orbit (the map is holomorphic), so
    // each trap knows how fast it changes across one pixel. See unres below.
    vec2 D = vec2(1.0, 0.0);
    float dx = 0.0, dy = 0.0;                      // |D|^2 where each trap was last lowered
    float pixC = max(length(dFdx(C)), length(dFdy(C)));
    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * a_pow;
        float c = dot(V, vec2(a, log(d) / 2.));
        vec2 Lg = vec2(log(d) / 2. + 1.0, a);           // d/dV of V log V, with the power's constant folded in
        V = exp(-a * V.y) * pow(d, V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        D = 2.0 * cmul(V, cmul(Lg, D));
        V -= C * b_off;
        D -= vec2(b_off, 0.0);
        V = curl * V;
        D = curl * D;

        D *= dot(D, D) > 1e20 ? 1e-10 : 1.0;            // chaos grows D without bound; past this it is unresolved anyway
        if (abs(V.x) < x) { x = abs(V.x); dx = dot(D, D); }
        if (abs(V.y) < y) { y = abs(V.y); dy = dot(D, D); }
        z > (v = dot(V, V)) ? z = v, Z = V : Z;

        focal_trap = min(focal_trap, length(V - focal_center));
    }

    float lx = log(max(x, 1e-12)), ly = log(max(y, 1e-12));
    z = 1. - smoothstep(1., -6., ly) * smoothstep(1., -6., lx);

    // Lace from the orbit traps. Thresholds slide with depth so deep zooms keep a dark floor.
    // The lace threshold is geometry: audio does not move it. Timbre shifts (cs_shift, 0.3 s attack) and
    // loudness used to slide it, which grew and shrank the whole lace area (the show's shiver probe).
    // Bass thickens the filigree (cs_bass: 40 ms attack, 0.5 s release); the threshold returns, never drifts
    float lace_lo = -2.0 + SEED_LACE + K_LACE * 0.9 + BASS_ENV * 0.9 * REACT - lz * 0.6;
    float lace_hi = lace_lo - 3.0;
    // LACE AA. In the dense lace the orbit is chaotic: one pixel step in C moves the traps across the whole lace band,
    // so one sample per pixel is noise, and any motion (spin, voyage, kick lurch) reshuffles it every frame. That is
    // the sparkle: scripts/sparkle-score.mjs measured 1/4 resolution sparkling just as much, a 16x supersample cutting
    // it by 55%, and float precision of the clocks and every audio term ruled out. unres = this pixel's footprint in
    // log-trap units, from the tracked derivative (floored a unit under the band, so thread cores, where log(trap)
    // runs to -inf, do not count). There the output averages frames: LACE AA at the end.
    float tfloor = exp(lace_hi - 1.0);
    float fpx = max(sqrt(dx) * pixC / max(x, tfloor), sqrt(dy) * pixC / max(y, tfloor));
    float unres = smoothstep(0.3, 2.0, fpx < 1e30 ? fpx : 1e30);
    float lace_x = smoothstep(lace_lo, lace_hi, lx);
    float lace_y = smoothstep(lace_lo, lace_hi, ly);
    float lace = pow(max(lace_x, lace_y), 3.0);
    float lace_fine = lace_x * lace_y;
    // Coherence gate, depth only: past ~3x, drop lace that changes faster than a pixel (speckle)
    float coh = smoothstep(0.6, 1.6, lz);
    lace *= 1.0 - coh * smoothstep(1.5, 5.0, fwidth(min(lx, ly)));
    lace_fine *= 1.0 - coh * 0.7;

    float phi = atan(Z.y, Z.x) + HUE_TURN;
    // The rainbow's luma is the lace's LIGHTNESS structure, so it takes only the fixed per-device phase.
    // Fed the moving hue turn (cs_jump +0.9 rad per drop, cs_hue), every drop re-lit the whole lace
    // over 1.5 s: a light morph the shiver probe read as zoom. The hue turn now moves colour only.
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) + SEED_PHASE - vec4(0, 2.1, 4.2, 0)), 0.0));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));
    // Palette position: the orbit angle as a triangle wave (0 red … 1 violet … 0 red), so the hue never
    // crosses the magenta arc. The offset lands the dense lace's bunched orbit angles on amber and teal.
    // Threads that cross the x trap and the y trap sit half a leg apart, so the filigree braids colours.
    // Bright music leans warm (8 s centroid mean).
    float pal_t = abs(fract((phi + 1.07) / TAU + (lace_x - lace_y) * 0.12 + (luma - 0.6) * 0.6 - TONE_LEAN * 0.1) * 2.0 - 1.0);
    // The darkest lace (the fan petals) goes deep violet, the velvet body: never brown or grey
    pal_t = mix(pal_t, 0.85 + 0.15 * pal_t, smoothstep(0.3, 0.05, luma));
    // The pale star (the smooth high-z body, z ~0.8) is the landmark: keep it pale, tinted periwinkle
    // (far), so the red ember pops in front of it
    float pale = smoothstep(0.66, 0.78, z);
    pal_t = mix(pal_t, 0.93, pale);

    // FOCAL — one hot spot at home, fading out with depth (at depth every orbit grazes the trap)
    float focal = pow(smoothstep(FOCAL_RADIUS, 0.01, focal_trap), 3.0);
    focal *= 1.0 - smoothstep(0.5, 2.0, lz);
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float depth = mix(base_depth, 0.0, pow(focal, 1.5));
    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = clamp(mix(depth, 0.0, drop * focal), 0.0, 1.0);

    // GALAXY BEHIND THE BODY: velvet violet, nebula dust tinted by the orbit colour, parallax stars.
    // Stars sit on a far plane: they drift at a fraction of the camera's move, so travel reads as travel.
    vec2 cam = vec2(NAV_CY, NAV_CX - HOME_CX);
    vec2 sky = rot2(NAV_ROT * 0.5) * uv;
    float neb = 0.35 + 0.65 * K_NEBULA;
    vec2 dustP = sky * 2.2 / (1.0 + lz * 0.15) + cam * 1.6 + vec2(FLOW * 0.4, 0.0);
    float dust = vnoise(dustP) * 0.6 + vnoise(dustP * 2.3 + 4.0) * 0.4;
    dust = smoothstep(0.45, 0.95, dust);
    vec3 dust_col = mix(vec3(0.10, 0.03, 0.22), themeCol(pal_t, 0.18, 0.20), 0.5);
    float s1 = stars(sky * 38.0 / (1.0 + lz * 0.25) + cam * 22.0, 0.10 + 0.25 * K_NEBULA);
    float s2 = stars(sky * 17.0 / (1.0 + lz * 0.45) + cam * 48.0 + 31.0, 0.05 + 0.15 * K_NEBULA);
    float star = (s1 * 0.6 + s2) * (0.4 + 0.9 * TWINKLE);
    vec3 bg = vec3(0.04, 0.015, 0.08) + dust_col * dust * neb * 0.45 * (0.9 + 0.2 * BREATH + 0.15 * GRIT);

    // LACE COLOUR, built in OKLCH: the orbit rainbow's lightness (its structure) with the palette's hue
    // at full chroma. The raw rainbow went grey wherever z sat near 0 or 1 (the dark fan petals and the
    // dusty pale star); here every lace pixel carries a hue. Darker lace gets more chroma (deep wine,
    // deep teal), the pale star stays pale but tinted. Gamut-mapped, never clipped.
    float lace_L = 0.13 + 0.57 * luma;
    float lace_C = (0.20 + 0.08 * (1.0 - luma)) * (1.0 - 0.1 * pale) * CHROMA_GAIN;
    vec3 vivid = themeCol(pal_t, lace_L, lace_C);
    vec3 lace_col = mix(vivid, chromadepth(mix(0.15, 0.7, 1.0 - luma)), K_DEPTH);
    vec3 col = mix(bg, lace_col * LACE_GAIN, lace);
    // The braid (where both traps cross) is where the beat lands: a bass punch lights the filigree, locally
    col += mix(lace_col, vec3(1.0, 0.88, 0.7), 0.55) * lace_fine * (0.3 + 0.9 * TREB_ENV * REACT + 0.6 * PUNCH * REACT);   // treble sparkles the braid

    // Rim — body silhouette edges (fades at depth, where every pixel is an edge)
    float rim = smoothstep(0.1, 0.5, edge * 20.0) * (1.0 - smoothstep(0.8, 2.2, lz));
    rim *= smoothstep(0.0, 0.15, abs(C.y));
    // Rim hue walks its own way round the palette (a quarter turn off the lace); a build warms it to red
    float rim_t = mix(0.5 - 0.5 * cos(phi + 1.6), 0.0, RIM_WARMTH * 0.6);
    vec3 rim_col = themeCol(rim_t, 0.50, 0.26 * CHROMA_GAIN);
    col += rim_col * rim * RIM_INTENSITY * 0.45;

    col = mix(col, chromadepth(depth) * 1.2, focal * 0.3);

    float spotlight = mix(mix(1.0, 0.2, drop), 1.0, focal);
    col *= spotlight;

    vec3 hot_red = vec3(1.0, 0.15, 0.05);
    // Ember steady: it sits at the centre of the frame, and a kick-pulsed ember breathed the centre
    // rings (the show's shiver probe). The beat now lives in the spin rate.
    float ember = focal * (0.22 + 0.6 * PUNCH * REACT);
    float blaze = focal * mix(1.0, 2.5, drop) * 0.5 * drop;
    col += hot_red * (ember + blaze);
    col += vec3(1.0, 0.7, 0.4) * pow(focal, 3.0) * drop * 0.6;


    vec4 prev = getLastFrameColor(gl_FragCoord.xy / iResolution.xy);
    vec3 prevc = clamp(prev.rgb, 0.0, 1.0);
    col = mix(col, prevc * 0.95, FEEDBACK_MIX);

    float vign = 1.0 - pow(length(uv) * (0.65 - VIGN_OPEN), 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + K_DROP * 2.0), K_DROP);   // the SPOT knob only: radial
    col *= max(vign, 0.02);

    // Darkness enforcement: lace, rim, focal are bright; the galaxy stays a dim floor behind them
    float lit = max(max(lace, rim * 0.5), focal);
    col *= mix(0.15 + 0.35 * dust * neb, 1.0, lit);
    // Stars after the darkness pass, only in the dark gaps, dimmed in the drop spotlight
    col += vec3(0.85, 0.8, 1.0) * star * (1.0 - lit) * neb * mix(1.0, 0.3, drop) * max(vign, 0.0);

    // Tone map on luminance, not per channel: per-channel Reinhard pulled every bright hue toward grey
    // (the dusty look). Same curve for brightness; hue and saturation survive. Anything that still
    // overshoots is pulled toward its own grey just far enough to fit, so no channel clips.
    float lum = dot(max(col, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));
    col = max(col, vec3(0.0)) / (lum + 0.7);
    float tl = lum / (lum + 0.7);
    // Knee at 0.94, not 1.0: a hot red ember landed exactly on 1.0 and counted as clipped (show clip 0.01-0.04)
    float hi = max(max(col.r, col.g), col.b);
    if (hi > 0.94) col = mix(vec3(tl), col, max(0.94 - tl, 0.0) / max(hi - tl, 1e-4));
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    // THE BEAT, IN COLOUR ONLY. The show's meters (scripts/vj/aesthetic-meter.js) read Rec.709 luminance
    // of the output: flicker and motion from |ΔL|, shiver from L edges and L in rings. So the beat turns
    // hue and lifts chroma in OKLab, then each pixel is scaled back to its own luminance: the kick is
    // vivid to the eye and invisible to the meters. Three layers, on the lit lace and rim only:
    //   kick    hue step (+0.45 rad: red leans amber, violet leans orchid, never hot magenta) and chroma
    //           lift (+100%), eased out over the 0.4 s kick
    //   beat    cs_beat steps forward on every kick and never goes back: a colour wave that travels
    //           along the filaments (orbit angle + trap depth) one notch per beat
    float beatOn = HAS_CTL ? 1.0 : 0.0;
    float L0 = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float wave = sin(phi * 2.0 + lx * 0.7 - cs_beat * TAU);
    float ang = (PUNCH * 0.5 + kick * 0.2 + 0.35 * wave) * REACT * lit * beatOn;
    float cgain = 1.0 + 1.0 * PUNCH * REACT * lit * beatOn;
    vec3 lab = rgb2oklab(col);
    // The rotation never carries a pixel into the hot-magenta arc (clit-vibej iter 3). In OKLab atan range
    // that arc is (-1.25, 0.45) rad: between blue-violet (288 deg) and red (26 deg). Violet turned + and
    // red turned - (the signed wave) used to land there; now they stop at the arc's edge.
    float h0 = atan(lab.z, lab.y);
    float h1 = h0 + ang;
    if (!(h0 > -1.25 && h0 < 0.45) && h1 > -1.25 && h1 < 0.45) h1 = h0 < -0.4 ? -1.25 : 0.45;
    // THEME: nor into the green gap between burnt amber and teal (90..160 deg = 1.57..2.79 rad)
    if (!(h0 > 1.57 && h0 < 2.79) && h1 > 1.57 && h1 < 2.79) h1 = h0 < 2.18 ? 1.57 : 2.79;
    lab.yz = length(lab.yz) * cgain * vec2(cos(h1), sin(h1));
    vec3 bc = max(oklab2rgb(lab), vec3(0.0));
    bc *= L0 / max(dot(bc, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
    float bhi = max(max(bc.r, bc.g), bc.b);
    if (bhi > 0.94) bc = mix(vec3(L0), bc, max(0.94 - L0, 0.0) / max(bhi - L0, 1e-4));
    col = mix(col, bc, step(1e-3, L0));

    // LACE AA, the other half: where the lace is unresolved (unres), this frame's output averages with the last one's,
    // an EMA over ~1/(1-LACE_AA_HOLD) frames: the motion that reshuffled the noise now supersamples it. On the final
    // colour, so the vignette and tone map are not compounded. Averaging random orbit hues loses chroma (red + teal
    // reads grey), so the averaged hue gets back the chroma one sample has: a vivid wash, not a grey one.
    if (unres > 0.0) {
        const vec3 REC709 = vec3(0.2126, 0.7152, 0.0722);
        float c_now = length(col - dot(col, REC709));
        col = mix(col, prevc, LACE_AA_HOLD * unres);
        float l_avg = dot(col, REC709);
        vec3 ch = col - l_avg;                          // chroma about the luminance axis: scaling it keeps L
        col = max(l_avg + ch * mix(1.0, clamp(c_now / max(length(ch), 1e-4), 1.0, 1.6), unres), vec3(0.0));
    }

    // NEVER HOT MAGENTA (clit-vibej iter 5): hues inside the arc between blue-violet (288 deg) and red
    // (26 deg) are squeezed toward the two edges, and only the arc's middle loses some chroma. L is kept.
    vec3 gl = rgb2oklab(col);
    float gh = atan(gl.z, gl.y);
    if (gh > -1.25 && gh < 0.45) {
        float gt = (gh + 1.25) / 1.70;
        float gq = gt < 0.5 ? 0.5 * pow(2.0 * gt, 3.0) : 1.0 - 0.5 * pow(2.0 - 2.0 * gt, 3.0);
        float gc = length(gl.yz) * (1.0 - 0.45 * smoothstep(0.25, 0.0, abs(gt - 0.5)));
        float g2 = -1.25 + gq * 1.70;
        gl.yz = gc * vec2(cos(g2), sin(g2));
        col = oklab2rgb(gl);
    }

    P = vec4(clamp(col, 0.0, 1.0), 1.0);
}
