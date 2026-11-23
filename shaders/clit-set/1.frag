// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, 3d, body, sexy, seeded, clit-set
// preset: https://visuals.beadfamous.com/?shader=clit-set/1&controller=clit-set
// CLIT-SET/1 — clit/2's chromadepth anatomy, modernized with the sun-set lessons:
// controller envelopes (controllers/clit-set.js), per-device seeds, eased knobs, no dead zones.
// Red = closest (focal pops out), blue/violet = farthest. Based on Dom Mandy's complex power fractal.
// Colour: the repo OKLCH harmony kit (docs/oklch-palettes.md), theme EMBER & NEBULA: ember / amber body,
// teal / indigo galaxy, one base hue, okFit gamut mapping. Never grey, never hot magenta.
// Renders without the controller: every cs_* reads 0 and the #defines fall back to raw features.

uniform float cs_on, cs_time, cs_presence, cs_flow;
uniform float cs_kick, cs_bass, cs_mids, cs_treb;
uniform float cs_build, cs_drop, cs_jump, cs_shift, cs_hue;
uniform float cs_pearl, cs_focus, cs_spread;
uniform float cs_k1, cs_k2, cs_k3, cs_k4, cs_k5, cs_k6, cs_k7, cs_k8;

#define HAS_CTL (cs_on > 0.5)

// ============================================================================
// KNOBS — all 0 = the default look (no MIDI attached still looks right). Eased by the controller.
// ============================================================================
#define K_ZOOM   (HAS_CTL ? cs_k1 : knob_1)   // 0 full body … 1 close on the focal
#define K_REACT  (HAS_CTL ? cs_k2 : knob_2)   // reaction size ×1 … ×2.5
#define K_TRAILS (HAS_CTL ? cs_k3 : knob_3)   // feedback trails
#define K_HUE    (HAS_CTL ? cs_k4 : knob_4)   // lace palette rotation (one full turn)
#define K_LACE   (HAS_CTL ? cs_k5 : knob_5)   // lace density
#define K_DEPTH  (HAS_CTL ? cs_k6 : knob_6)   // recolor lace in strict chromadepth (for the glasses)
#define K_DROP   (HAS_CTL ? cs_k7 : knob_7)   // hold the drop spotlight by hand
#define K_GLOW   (HAS_CTL ? cs_k8 : knob_8)   // focal ember size

#define REACT (1.0 + K_REACT * 1.5)

// ============================================================================
// PER-DEVICE SEEDS — every phone gets its own palette phase, lace density and drift direction.
// ?seed= in the URL pins it.
// ============================================================================
#define SEED_PHASE ((seed - 0.5) * 2.4)              // lace rainbow phase, ±70°
#define SEED_LACE  ((seed2 - 0.5) * 0.6)             // lace threshold shift
#define SEED_WARM  (seed3 * 0.5)                     // rim warmth bias (toward ember)
#define SEED_SPIN  (seed4 < 0.5 ? -1.0 : 1.0)        // idle drift direction

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (controller envelope, else raw-feature fallback)
// ============================================================================

// Forward clock: never stops, so quiet passages still breathe
#define FLOW (HAS_CTL ? cs_flow : iTime * 0.03)
// #define FLOW 0.0

// Fractal power and body offset are pinned (clit/2's home shape) with a slow idle drift on the forward
// clock. Audio never touches the fractal coordinates: on clit/4 that strobed and blacked out the frame.
// Music only changes how fast FLOW runs, never where the shape is.
#define A (1.5 + 0.045 * sin(6.2831853 * FLOW * SEED_SPIN))
// #define A 1.5
#define B (0.55 + 0.02 * sin(6.2831853 * FLOW * 0.618 + 1.3))
// #define B 0.55

// Drop: confirmed drop envelope (controller) or the confident-fall fallback, plus the hand knob
#define DROP_INTENSITY clamp((HAS_CTL ? cs_drop : clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)) + K_DROP, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

#define BUILD_INTENSITY (HAS_CTL ? cs_build : clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0))
// #define BUILD_INTENSITY 0.0

// Kick: instant punch, cubic ease-out (never the `beat` uniform)
#define KICK (HAS_CTL ? cs_kick : clamp(bassZScore - 0.4, 0.0, 1.0))
// #define KICK 0.0

// Bass sustain breathes the whole body
#define PULSE (1.0 + (HAS_CTL ? cs_bass : clamp(bassZScore, 0.0, 1.0)) * 0.06 * REACT)
// #define PULSE 1.0

// Mids light the lace
#define LACE_GAIN (0.7 + (HAS_CTL ? cs_mids : midsNormalized) * 0.6 * REACT)
// #define LACE_GAIN 1.0

// Treble drives the rim
#define RIM_INTENSITY (0.4 + (HAS_CTL ? cs_treb : trebleNormalized) * 0.8 * REACT)
// #define RIM_INTENSITY 0.7

// Rim warmth: per-device bias, warmed further by a build
#define RIM_WARMTH clamp(0.25 + SEED_WARM + BUILD_INTENSITY * 0.35, 0.0, 1.0)
// #define RIM_WARMTH 0.5

// Timbral shift blooms the lace (thicker lines for a moment)
#define LACE_BLOOM (HAS_CTL ? cs_shift : 0.0)
// #define LACE_BLOOM 0.0

// Crest sparkles the pearly lace intersections
#define PEARL (0.15 + (HAS_CTL ? cs_pearl : clamp(spectralCrestNormalized, 0.0, 1.0)) * 0.25)
// #define PEARL 0.25

// Kurtosis tightens / widens the focal hot spot
#define FOCAL_RADIUS (0.5 + K_GLOW * 0.35 + (HAS_CTL ? cs_focus : clamp(spectralKurtosisZScore, -1.0, 1.0)) * 0.05)
// #define FOCAL_RADIUS 0.5

// Slow colour: the key (20 s) plus a step on every drop (never fast features)
#define HUE_TURN ((HAS_CTL ? cs_hue : 0.0) * 1.2 + (HAS_CTL ? cs_jump : 0.0) * 0.9 + K_HUE * 6.2831853 + SEED_PHASE)

// Feedback trails
#define LACE_AA_SAMPLES 1   // extra orbit samples per pixel where the lace is unresolved (see LACE AA). 1 for phones;
                            // the desktop show machine can raise it (2: flicker -6% more, 3: -9%, at +20% / +38% frame time)
#define FEEDBACK_MIX clamp(0.22 + energyNormalized * 0.08 + K_TRAILS * 0.55, 0.0, 0.85)

// Spread opens the vignette a touch
#define VIGN_OPEN ((HAS_CTL ? cs_spread : clamp(spectralSpreadNormalized, 0.0, 1.0)) * 0.06)

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

// ============================================================================
// MAIN
// ============================================================================


// Unit direction, or +x where the vector is 0: atan(0, 0) is NaN on some mobile GPUs
vec2 unitDir(vec2 v) { return dot(v, v) > 1e-24 ? normalize(v) : vec2(1.0, 0.0); }

struct LaceSample { float lace, fine, z, luma; vec3 lab; };

// The lace one orbit sample paints: coverage (lace, and the braid where both traps cross), the rainbow's
// lightness and the lace colour. A function so LACE AA can average several.
LaceSample laceSample(float x, float y, vec2 Z, float lace_lo) {
    LaceSample r;
    vec2 zu = unitDir(Z);                  // atan(0, 0) is NaN on some mobile GPUs
    float z = 1. - smoothstep(1., -6., log(y)) * smoothstep(1., -6., log(x));
    float lace_x = smoothstep(lace_lo, -5.0, log(x));
    float lace_y = smoothstep(lace_lo, -5.0, log(y));
    r.lace = pow(max(lace_x, lace_y), 3.0);
    r.fine = lace_x * lace_y;
    r.z = z;
    // The sexy/1 rainbow's luma is the lace's LIGHTNESS structure, so it takes only the fixed per-device phase.
    // The moving hue turn (knob, slow key, drops) moves the palette position instead: colour, never light.
    float ang = atan(zu.y, zu.x);
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(ang + SEED_PHASE - vec4(0, 2.1, 4.2, 0)), 0.0));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));
    r.luma = luma;
    // Palette position: the orbit angle as a triangle wave (0 ember … 1 indigo … 0 ember), so the hue never
    // crosses magenta. Threads that cross the x trap and the y trap sit half a leg apart (the braid).
    float pal_t = abs(fract((ang + HUE_TURN + 1.07) / 6.2831853 + (lace_x - lace_y) * 0.12 + (luma - 0.6) * 0.6) * 2.0 - 1.0);
    pal_t = mix(pal_t, 0.85 + 0.15 * pal_t, smoothstep(0.3, 0.05, luma));   // the darkest lace: indigo velvet
    float pale = smoothstep(0.66, 0.78, z);
    pal_t = mix(pal_t, 0.93, pale);                                         // the pale body: periwinkle (far)
    float lace_L = 0.16 + 0.54 * luma;   // floor 0.16: at 0.13 the darkest lace went near-black and grey
    float lace_C = (0.20 + 0.08 * (1.0 - luma)) * (1.0 - 0.1 * pale);
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

    // Zoom: the knob only (audio stays out of the coordinates; kicks flare the ember instead)
    float zoom = mix(1.0, 0.55, K_ZOOM);

    vec2 Z = iResolution.xy,
         C = 0.6 * zoom * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    V = C;

    float a_pow = A;
    float b_off = B;
    float x, y, focal_trap;
    orbit(C, a_pow, b_off, mat2(1.0), 0.0, x, y, Z, focal_trap);
    // Lace / filigree from the orbit traps. Knob, seed and timbral shift move the threshold.
    float lace_lo = -2.0 + SEED_LACE + K_LACE * 0.9 + LACE_BLOOM * 0.6;

    // LACE AA. In the dense lace the orbit is chaotic: one pixel step in C moves the traps across the whole lace
    // band, so one sample per pixel is noise, and any motion (spin, pan, zoom, shape morph) reshuffles it every
    // frame. That is the sparkle (scripts/sparkle-score.mjs: 1/4 resolution sparkles as much, a 16x supersample is
    // the clean reference; clock precision and every audio term ruled out). unres = how much the lace VALUE
    // changes across this pixel's 2x2 quad: 0 inside a clean thread, up in the noise. There the pixel runs the
    // orbit LACE_AA_SAMPLES more times inside its own footprint and averages the lace's light and colour:
    // spatial supersampling, no frame history, so nothing trails or ghosts.
    LaceSample ls = laceSample(x, y, Z, lace_lo);
    float unres = smoothstep(0.05, 0.25, fwidth(ls.lace) + fwidth(ls.fine) + ls.lace * fwidth(ls.luma));
    vec2 dCx = dFdx(C), dCy = dFdy(C);
    float lace = ls.lace, lace_fine = ls.fine, z = ls.z, luma = ls.luma;
    vec3 lace_col = okOut(ls.lab);
    if (unres > 0.0) {
        float s_lace = ls.lace, s_fine = ls.fine, s_z = ls.z, s_luma = ls.luma;
        vec3 s_col = lace_col * (ls.lace + ls.fine);
        for (int s = 0; s < LACE_AA_SAMPLES; s++) {
            float ang = 0.7 + 6.2831853 * float(s) / float(LACE_AA_SAMPLES);
            vec2 o = 0.42 * vec2(cos(ang), sin(ang));      // a ring inside the pixel, the centre sample above
            float sx, sy, sft;
            vec2 sZ;
            orbit(C + o.x * dCx + o.y * dCy, a_pow, b_off, mat2(1.0), 0.0, sx, sy, sZ, sft);
            LaceSample t = laceSample(sx, sy, sZ, lace_lo);
            s_lace += t.lace; s_fine += t.fine; s_z += t.z; s_luma += t.luma;
            s_col += okOut(t.lab) * (t.lace + t.fine);
        }
        float inv = 1.0 / float(LACE_AA_SAMPLES + 1);
        // the colour is weighted by how much lace each sample has, so dark samples do not grey it
        lace = mix(lace, s_lace * inv, unres);
        lace_fine = mix(lace_fine, s_fine * inv, unres);
        z = mix(z, s_z * inv, unres);
        luma = mix(luma, s_luma * inv, unres);
        lace_col = mix(lace_col, s_col / max(s_lace + s_fine, 1e-4), unres);
    }

    // FOCAL
    float focal = pow(smoothstep(FOCAL_RADIUS, 0.01, focal_trap), 3.0);
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    // CHROMADEPTH depth: 0 = closest (red), 1 = farthest (violet)
    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float depth = mix(base_depth, 0.0, pow(focal, 1.5));
    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = clamp(mix(depth, 0.0, drop * focal), 0.0, 1.0);

    // Lace is the only lit content; everything else is deep velvet violet
    vec3 bg_purple = vec3(0.04, 0.015, 0.08);
    vec3 col = mix(bg_purple, lace_col * LACE_GAIN, lace);

    // pale gold pearls (L 0.80 C 0.07 amber is inside sRGB for every seed: no fit needed)
    if (lace_fine > 0.0) col += lin2srgb(oklab2rgb(themeLab(1.0 / 3.0, 0.80, 0.07 / 0.85))) * lace_fine * PEARL;

    // Rim — body silhouette edges
    float rim = smoothstep(0.1, 0.5, edge * 20.0);
    rim *= smoothstep(0.0, 0.15, abs(C.y));
    vec2 zu0 = unitDir(Z);                                  // atan(0, 0) is NaN on some mobile GPUs
    float rim_t = mix(0.5 - 0.5 * cos(atan(zu0.y, zu0.x) + HUE_TURN + 1.6), 0.0, RIM_WARMTH * 0.6);
    if (rim > 0.0) col += themeCol(rim_t, 0.46, 0.22) * rim * RIM_INTENSITY * 0.3;

    // Focal → chromadepth red
    if (focal > 0.0) col = mix(col, chromadepth(depth) * 1.2, focal * 0.3);

    // DROP SPOTLIGHT: dim the body, blaze the focal
    float spotlight = mix(mix(1.0, 0.2, drop), 1.0, focal);
    col *= spotlight;

    vec3 hot_red = vec3(1.0, 0.15, 0.05);
    float ember = focal * (0.2 + kick * 0.35 * REACT);   // always glowing, kicks flare it
    float blaze = focal * mix(1.0, 2.5, drop) * 0.5 * drop;
    col += hot_red * (ember + blaze);
    col += vec3(1.0, 0.7, 0.4) * pow(focal, 3.0) * drop * 0.6;

    col *= PULSE;

    // Feedback — sanitized so a bad frame never sticks
    vec4 prev = getLastFrameColor(gl_FragCoord.xy / iResolution.xy);
    vec3 prevc = clamp(prev.rgb, 0.0, 1.0);
    col = mix(col, prevc * 0.95, FEEDBACK_MIX);

    // Vignette, tighter on drops
    float vign = 1.0 - pow(length(uv) * (0.65 - VIGN_OPEN), 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Darkness enforcement: only lace, rim, focal get to be bright
    col *= mix(0.15, 1.0, max(max(lace, rim * 0.5), focal));

    // Tone map on luminance, not per channel (as clit-set/2): per-channel Reinhard pulled the pale body toward
    // grey. Anything that still overshoots is pulled toward its own grey just far enough to fit.
    float lum = dot(max(col, vec3(0.0)), vec3(0.2126, 0.7152, 0.0722));
    col = max(col, vec3(0.0)) / (lum + 0.7);
    float tl = lum / (lum + 0.7);
    float hi = max(max(col.r, col.g), col.b);
    if (hi > 0.94) col = mix(vec3(tl), col, max(0.94 - tl, 0.0) / max(hi - tl, 1e-4));
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    // NEVER HOT MAGENTA (clit-vibej iter 5): hues inside the arc between blue-violet (288 deg) and red
    // (26 deg) are squeezed toward the two edges, and only the arc's middle loses some chroma. L is kept.
    // On the DISPLAYED colour: decoded to linear first, so the arc is the hue the eye sees (2026-11-22)
    // Only hues near the magenta arc can need the squeeze. Every displayed colour whose OKLab hue is in
    // 288..26 deg has min(r, b) above g - 0.032 (checked over the whole sRGB cube), so this cheap test
    // skips the decode and two colour-space trips for everything else (the margin is 0.05).
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
