// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, 3d, body, sexy, seeded, clit-set, journey, knobs, galactic
// preset: https://visuals.beadfamous.com/?shader=clit-set/2&controller=clit-set
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
#define LACE_AA_SAMPLES 1   // extra orbit samples per pixel where the lace is unresolved (see LACE AA). 1 for phones;
                            // the desktop show machine can raise it (2: flicker -6% more, 3: -9%, at +20% / +38% frame time)
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
    // 1.055 c^(1/2.4) - 0.055 as three square roots (within 0.4/255 of the pow everywhere): this runs in
    // every gamut fit, and three pows per fit were a measurable share of the frame on a phone-class GPU.
    vec3 s1 = sqrt(c), s2 = sqrt(s1), s3 = sqrt(s2);
    return mix(c * 12.92, 0.585122381 * s1 + 0.783140355 * s2 - 0.368262736 * s3, step(0.0031308, c));
}

float hwrap(float d) { return d - floor(d + 0.5); }
vec3 lchT(float L, float C, float h) { return vec3(L, C * cos(TAU * h), C * sin(TAU * h)); }

// GAMUT: pull toward the same-L grey just far enough to fit, then once more after shrinking
// chroma in OKLab, so L and hue stay put. Continuous in the input: no clipped flats, no bands.
float gamutT(vec3 c, float g) {
    // per channel: past 1 -> (1-g)/(c-g), below 0 -> g/(g-c), else 1; the tightest wins. Vector selects, not
    // the kit's loop over c[i]: same result, and on SwiftShader the loop cost a clit shader 10..20% of its frame.
    vec3 t = mix(vec3(1.0), (1.0 - g) / max(c - g, vec3(1e-6)), greaterThan(c, vec3(1.0)));
    t = min(t, mix(vec3(1.0), g / max(g - c, vec3(1e-6)), lessThan(c, vec3(0.0))));
    return max(min(min(t.x, t.y), t.z), 0.0);
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
// ember window only (27..41 deg), so no phone ever lands in hot magenta (indigo stays under 272 deg).
// Knobs and audio (HUE_TURN, cs_hue, cs_jump, cs_shift, TONE_LEAN) move the position ALONG the
// palette (pal_t), never the hues themselves: no dial can take the series off-theme.
// Lightness band: the series is velvet on black, darker than the kit's 0.45..0.85 band, so it keeps
// its own (lace L 0.16..0.70, the true OKLab lightness the old palette displayed). Chroma is
// requested past the kit's 0.13 and okFit maps it to the sRGB edge at constant L and hue: the series
// rule is never grey, and the edge is where every lace pixel was before.
// ============================================================================
#define THEME_H (0.095 + 0.02 * (2.0 * fract(seed * 7.31 + 0.13) - 1.0))
#define KEY_AMBER  0.04            // burnt amber, analogous to the ember (kept short of yellow: the kick turns it +45 deg)
#define KEY_TEAL   (5.0 / 12.0)    // the kit's split complement
#define KEY_INDIGO 0.64            // the velvet (lands 257..272 deg: the tone map and the trails lean it ~20 deg pinkward on screen;
                                   // at +0.68 the sparkle gate failed: flipMean +0.3)

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
// The four keys as OKLab directions (a, b per unit of requested chroma), set once per pixel by themeInit()
// at the top of mainImage: one sincos instead of eight per palette lookup (a lookup runs per lace sample,
// dust, braid and rim). All keys share L, so ramp4 on the full OKLab keys is L plus C times this ramp.
vec2 gKey0, gKey1, gKey2, gKey3;
vec2 turnDir(vec2 d, float turns) { float c = cos(TAU * turns), s = sin(TAU * turns); return vec2(c * d.x - s * d.y, s * d.x + c * d.y); }
void themeInit() {
    gKey0 = vec2(cos(TAU * THEME_H), sin(TAU * THEME_H));
    gKey1 = 0.85 * turnDir(gKey0, KEY_AMBER);
    gKey2 = 0.75 * turnDir(gKey0, KEY_TEAL);
    gKey3 = turnDir(gKey0, KEY_INDIGO);
}
vec2 themeDir(float t) {
    float x = themeHold(t) * 3.0;
    return mix(mix(mix(gKey0, gKey1, smoothstep(0.0, 1.0, x)), gKey2, smoothstep(1.0, 2.0, x)), gKey3, smoothstep(2.0, 3.0, x));
}
vec3 themeLab(float t, float L, float C) { return vec3(L, C * themeDir(t)); }
vec3 themeCol(float t, float L, float C) { return okOut(themeLab(t, L, C)); }
// The same colour with its brightest channel at m: a uniform scale keeps hue and saturation in linear and
// gamma-encoded RGB alike, so a second shade of an already-fitted colour costs no second gamut fit.
vec3 shadeTo(vec3 c, float m) { return c * min(m / max(max(c.r, c.g), max(c.b, 1e-3)), 12.0); }

// OKLab hue angle (radians) of an a,b pair, 0 for a grey: atan(0, 0) is NaN on some mobile GPUs, and a
// NaN hue in the beat rotation or the magenta guard would poison every black pixel.
float okHue(vec2 ab) { return dot(ab, ab) > 1e-24 ? atan(ab.y, ab.x) : 0.0; }

// Strict chromadepth for the glasses: red (29 deg, near) to violet (293 deg, far), on the kit's
// gamut fit. Physics, not theme: the seed does not turn it.
vec3 chromadepthLab(float t) {
    t = clamp(t, 0.0, 1.0);
    float boost = 1.0 + 0.2 * sin(t * TAU);
    return lchT(0.60 - 0.36 * t, 0.26 * boost * (1.0 - t * 0.3), 0.08 + t * 0.735);
}
vec3 chromadepth(float t) { return okOut(chromadepthLab(t)); }

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

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// ============================================================================
// MAIN
// ============================================================================
// Unit direction, or +x where the vector is 0: atan(0, 0) is NaN on some mobile GPUs
vec2 unitDir(vec2 v) { return dot(v, v) > 1e-24 ? normalize(v) : vec2(1.0, 0.0); }

struct LaceSample { float lace, fine, z, luma, pal_t; vec3 lab; };

// The lace one orbit sample paints: coverage (lace, and the braid where both traps cross), the rainbow's
// lightness, the palette position and the lace colour. A function so LACE AA can average several.
LaceSample laceSample(float x, float y, vec2 Z, float lace_lo, float lace_hi) {
    LaceSample r;
    vec2 zu = unitDir(Z);                  // atan(0, 0) is NaN on some mobile GPUs
    float lx = log(max(x, 1e-12)), ly = log(max(y, 1e-12));
    float z = 1. - smoothstep(1., -6., ly) * smoothstep(1., -6., lx);
    float lace_x = smoothstep(lace_lo, lace_hi, lx);
    float lace_y = smoothstep(lace_lo, lace_hi, ly);
    r.lace = pow(max(lace_x, lace_y), 3.0);
    r.fine = lace_x * lace_y;
    r.z = z;
    float phi = atan(zu.y, zu.x) + HUE_TURN;
    // The rainbow's luma is the lace's LIGHTNESS structure, so it takes only the fixed per-device phase.
    // Fed the moving hue turn (cs_jump +0.9 rad per drop, cs_hue), every drop re-lit the whole lace
    // over 1.5 s: a light morph the shiver probe read as zoom. The hue turn now moves colour only.
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(zu.y, zu.x) + SEED_PHASE - vec4(0, 2.1, 4.2, 0)), 0.0));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));
    r.luma = luma;
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
    r.pal_t = pal_t;
    // LACE COLOUR, built in OKLCH: the orbit rainbow's lightness (its structure) with the palette's hue
    // at full chroma. The raw rainbow went grey wherever z sat near 0 or 1 (the dark fan petals and the
    // dusty pale star); here every lace pixel carries a hue. Darker lace gets more chroma (deep wine,
    // deep teal), the pale star stays pale but tinted. Gamut-mapped, never clipped.
    // Lightness floor 0.16. At 0.13 the fan petals went near-black, and the braid's cream over them read khaki
    // (review of #215; 11% of lit pixels grey on the opening view). 0.20 fixed them too but lit the fine lace's
    // shimmer: sparkle gate flipMean +0.3, refMAE above main's.
    float lace_L = 0.16 + 0.54 * luma;
    float lace_C = (0.20 + 0.08 * (1.0 - luma)) * (1.0 - 0.1 * pale) * CHROMA_GAIN;
    // Kept in OKLab (unfitted) until the pixel needs it. GLASSES (K_DEPTH) mixes toward chromadepth only when
    // it is up: a uniform branch, free when it is down.
    r.lab = themeLab(pal_t, lace_L, lace_C);
    if (K_DEPTH > 0.0) r.lab = mix(r.lab, chromadepthLab(mix(0.15, 0.7, 1.0 - luma)), K_DEPTH);
    return r;
}

// One orbit of the lace map from C: the two axis traps (x, y), the closest approach Z, and the focal trap.
// A function so LACE AA can run it again at other points inside the pixel.
void orbit(vec2 C, float a_pow, float b_off, mat2 curl, float wph, out float x, out float y, out vec2 Z, out float focal_trap) {
    vec2 V = C;
    float v, z = 9.;
    x = y = 9.;
    Z = vec2(0.0);
    focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);
    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * a_pow;
        float c = dot(V, vec2(a, log(d) / 2.));
        V = exp(-a * V.y) * pow(d, V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * b_off;
        V = curl * V;
        x = min(x, abs(V.x));
        y = min(y, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;
        focal_trap = min(focal_trap, length(V - focal_center));
    }
}

void mainImage(out vec4 P, vec2 V) {
    themeInit();
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

    float a_pow = NAV_A;
    float b_off = NAV_B;
    mat2 curl = rot2(NAV_CURL);
    float x, y, focal_trap;
    vec2 Z;
    orbit(C, a_pow, b_off, curl, 0.0, x, y, Z, focal_trap);
    float lx = log(max(x, 1e-12)), ly = log(max(y, 1e-12));

    // Lace from the orbit traps. Thresholds slide with depth so deep zooms keep a dark floor.
    // The lace threshold is geometry: audio does not move it. Timbre shifts (cs_shift, 0.3 s attack) and
    // loudness used to slide it, which grew and shrank the whole lace area (the show's shiver probe).
    // Bass thickens the filigree (cs_bass: 40 ms attack, 0.5 s release); the threshold returns, never drifts
    float lace_lo = -2.0 + SEED_LACE + K_LACE * 0.9 + BASS_ENV * 0.9 * REACT - lz * 0.6;
    float lace_hi = lace_lo - 3.0;
    // Coherence gate, depth only: past ~3x, drop lace that changes faster than a pixel (speckle)
    float coh = smoothstep(0.6, 1.6, lz);
    float coh_gate = 1.0 - coh * smoothstep(1.5, 5.0, fwidth(min(lx, ly)));

    // LACE AA. In the dense lace the orbit is chaotic: one pixel step in C moves the traps across the whole lace
    // band, so one sample per pixel is noise, and any motion (spin, voyage, kick lurch) reshuffles it every frame.
    // That is the sparkle (scripts/sparkle-score.mjs: 1/4 resolution sparkles as much, a 16x supersample is the
    // clean reference; clock precision and every audio term ruled out). unres = how much the lace VALUE changes
    // across this pixel's 2x2 quad: 0 inside a clean thread (its core is lace on both sides), up in the noise.
    // There the pixel runs the orbit LACE_AA_SAMPLES more times inside its own footprint and averages the lace's
    // light and colour: spatial supersampling, no frame history, so nothing trails or ghosts.
    LaceSample ls = laceSample(x, y, Z, lace_lo, lace_hi);
    float unres = smoothstep(0.05, 0.25, fwidth(ls.lace) + fwidth(ls.fine) + ls.lace * fwidth(ls.luma));
    vec2 dCx = dFdx(C), dCy = dFdy(C);
    float lace = ls.lace, lace_fine = ls.fine, z = ls.z, luma = ls.luma, pal_t = ls.pal_t;
    vec3 lace_col = okOut(ls.lab);
    vec2 zdir = unitDir(Z);
    if (unres > 0.0) {
        float s_lace = ls.lace, s_fine = ls.fine, s_z = ls.z, s_luma = ls.luma, s_pal = ls.pal_t;
        vec3 s_col = lace_col * (ls.lace + ls.fine);
        vec2 s_dir = zdir;
        for (int s = 0; s < LACE_AA_SAMPLES; s++) {
            float ang = 0.7 + TAU * float(s) / float(LACE_AA_SAMPLES);
            vec2 o = 0.42 * vec2(cos(ang), sin(ang));      // a ring inside the pixel, the centre sample above
            float sx, sy, sft;
            vec2 sZ;
            orbit(C + o.x * dCx + o.y * dCy, a_pow, b_off, curl, 0.0, sx, sy, sZ, sft);
            LaceSample t = laceSample(sx, sy, sZ, lace_lo, lace_hi);
            s_lace += t.lace; s_fine += t.fine; s_z += t.z; s_luma += t.luma; s_pal += t.pal_t;
            s_col += okOut(t.lab) * (t.lace + t.fine);
            s_dir += unitDir(sZ);
        }
        float inv = 1.0 / float(LACE_AA_SAMPLES + 1);
        // the colour is weighted by how much lace each sample has, so dark samples do not grey it
        vec3 avg_col = s_col / max(s_lace + s_fine, 1e-4);
        lace = mix(lace, s_lace * inv, unres);
        lace_fine = mix(lace_fine, s_fine * inv, unres);
        z = mix(z, s_z * inv, unres);
        luma = mix(luma, s_luma * inv, unres);
        pal_t = mix(pal_t, s_pal * inv, unres);
        lace_col = mix(lace_col, avg_col, unres);
        zdir = mix(zdir, s_dir, unres);
    }
    lace *= coh_gate;
    lace_fine *= 1.0 - coh * 0.7;
    zdir = dot(zdir, zdir) > 1e-12 ? zdir : unitDir(Z);  // the averaged directions can cancel to 0
    float phi = atan(zdir.y, zdir.x) + HUE_TURN;
    float pale = smoothstep(0.66, 0.78, z);

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
    vec3 dust_col = vec3(0.10, 0.03, 0.22);
    dust_col = mix(dust_col, shadeTo(lace_col, 0.13), 0.5);   // the lace's hue, dimmed (the theme at L 0.18)
    float s1 = stars(sky * 38.0 / (1.0 + lz * 0.25) + cam * 22.0, 0.10 + 0.25 * K_NEBULA);
    float s2 = stars(sky * 17.0 / (1.0 + lz * 0.45) + cam * 48.0 + 31.0, 0.05 + 0.15 * K_NEBULA);
    float star = (s1 * 0.6 + s2) * (0.4 + 0.9 * TWINKLE);
    vec3 bg = vec3(0.04, 0.015, 0.08) + dust_col * dust * neb * 0.45 * (0.9 + 0.2 * BREATH + 0.15 * GRIT);

    vec3 col = mix(bg, lace_col * LACE_GAIN, lace);
    // The braid (where both traps cross) is where the beat lands: a bass punch lights the filigree, locally
    // Over the darkest lace (the fan petals) the braid's cream turns violet: cream over near-black read as
    // khaki-grey (review of #215). A fixed tint, not the lace's own hue lifted: that shimmered in the fine braid
    // (sparkle gate flipMean +0.7).
    if (lace_fine > 0.0) {
        vec3 braid = mix(lace_col, mix(vec3(1.0, 0.88, 0.7), vec3(0.56, 0.48, 1.0), smoothstep(0.35, 0.10, luma)), 0.55);
        col += braid * lace_fine * (0.3 + 0.9 * TREB_ENV * REACT + 0.6 * PUNCH * REACT);   // treble sparkles the braid
    }

    // Rim — body silhouette edges (fades at depth, where every pixel is an edge)
    float rim = smoothstep(0.1, 0.5, edge * 20.0) * (1.0 - smoothstep(0.8, 2.2, lz));
    rim *= smoothstep(0.0, 0.15, abs(C.y));
    // Rim hue walks its own way round the palette (a quarter turn off the lace); a build warms it to red
    float rim_t = mix(0.5 - 0.5 * cos(phi + 1.6), 0.0, RIM_WARMTH * 0.6);
    if (rim > 0.0) col += themeCol(rim_t, 0.50, 0.26 * CHROMA_GAIN) * rim * RIM_INTENSITY * 0.45;

    if (focal > 0.0) col = mix(col, chromadepth(depth) * 1.2, focal * 0.3);

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
    if (ang != 0.0 || cgain != 1.0) {
        // The turn works on the output values as they are (as on main). Decoding them first put the turn in the
        // hue the eye sees, but cost the sparkle gate (flipMean +0.25). The guard below reads the decoded hue.
        vec3 lab = rgb2oklab(col);
        // vibej iter 3: the rotation never carries a pixel into the hot-magenta arc. In OKLab atan range that
        // arc is (-1.25, 0.45) rad: between blue-violet (288 deg) and red (26 deg). Violet turned + and red
        // turned - (the signed wave) used to land there; now they stop at the arc's edge.
        float h0 = okHue(lab.yz);
        float h1 = h0 + ang;
        h1 -= TAU * floor((h1 + PI) / TAU);   // back into [-pi, pi): a turn past the seam is still a turn
        if (!(h0 > -1.25 && h0 < 0.45) && h1 > -1.25 && h1 < 0.45) h1 = h0 < -0.4 ? -1.25 : 0.45;
        // nor deeper into it: a pixel already inside may only turn back toward its own edge (review of #215)
        if (h0 > -1.25 && h0 < 0.45) h1 = h0 < -0.4 ? min(h1, h0) : max(h1, h0);
        // THEME: nor into the green gap between burnt amber and teal (90..160 deg = 1.57..2.79 rad)
        if (!(h0 > 1.57 && h0 < 2.79) && h1 > 1.57 && h1 < 2.79) h1 = h0 < 2.18 ? 1.57 : 2.79;
        lab.yz = length(lab.yz) * cgain * vec2(cos(h1), sin(h1));
        vec3 bc = max(oklab2rgb(lab), vec3(0.0));
        bc *= L0 / max(dot(bc, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
        float bhi = max(max(bc.r, bc.g), bc.b);
        if (bhi > 0.94) bc = mix(vec3(L0), bc, max(0.94 - L0, 0.0) / max(bhi - L0, 1e-4));
        col = mix(col, bc, step(1e-3, L0));
    }

    // NEVER HOT MAGENTA (vibej iter 5): whatever made it (trails blending red over violet, mids lifting chroma,
    // the per-channel gamma leaning violet pinkward), hues inside the arc are squeezed toward its two edges,
    // and only the arc's middle loses some chroma. L is kept. It reads the DISPLAYED hue: decoded to linear
    // first (rgb2oklab takes linear sRGB). Only colours near the arc pay for that: every displayed colour whose
    // OKLab hue is in 288..26 deg has min(r, b) above g - 0.032 (checked over the whole sRGB cube), so the
    // cheap test below is safe with its 0.05 margin.
    col = max(col, 0.0);
    vec3 gl = vec3(0.0);
    float gh = 1.0;
    if (min(col.r, col.b) > col.g - 0.05) { gl = rgb2oklab(srgb2lin(col)); gh = okHue(gl.yz); }
    if (gh > -1.25 && gh < 0.45) {
        float gt = (gh + 1.25) / 1.70;
        float gq = gt < 0.5 ? 0.5 * pow(2.0 * gt, 3.0) : 1.0 - 0.5 * pow(2.0 - 2.0 * gt, 3.0);
        float gc = length(gl.yz) * (1.0 - 0.45 * smoothstep(0.25, 0.0, abs(gt - 0.5)));
        float g2 = -1.25 + gq * 1.70;
        gl.yz = gc * vec2(cos(g2), sin(g2));
        col = okOut(gl);
    }

    P = vec4(clamp(col, 0.0, 1.0), 1.0);
}
