// @fullscreen: true
// @mobile: false
// @tags: urchin, blackhole, sun, lattice, psychedelic, vangogh, claude
// preset: https://visuals.beadfamous.com/?shader=claude/wip/black-sun/sun-1&controller=black-sun&wavelet=true
// BLACK SUN — SUN VARIANT (sun-1.frag): 1.frag with the rays in sun colours — molten pale gold at the
// eye cooling through saffron/amber/orange to ember-red tips — against the blue Van Gogh sky.
// Everything below is 1.frag's design; only the palette table differs.
// wip/urchin is the backbone: its spherized field of tube-spines radiates
// from a black hole (wip/black-hole) whose accretion is a psychedelic sun. Behind it, the Van Gogh
// tile sky from wip/sunflowers with the hex mirror-fold lattice from redaphid/lattice-interactive/3
// spiralling into the hole forever; a sunflower field along the bottom. Everything is lensed.
//   GEOMETRY: controller clocks only (bs_time + phase accumulators) (lens, urchin clock, perpetual log-polar lattice zoom, disk spin, drift).
//   LIGHT:    all the audio (corona glow, flares, rim punch, lattice sparkle, sky glow).
//   COLOR:    slow medians/means only.
// Needs ?controller=black-sun (controllers/black-sun.js) for all frame-persistent state.

#define TAU 6.28318530718
#define PI  3.14159265359
#define PAL(t, a, b, c, d) ( a + b*cos( TAU*(c*t+d) ) )

#define smoothing 0.006
#define lineSize  0.01

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================
#define GATE (smoothstep(0.003, 0.015, energyMean) * bs_presence * REACT)   // × K9 REACT; QUIET-SAFE: × presence (raw energy now) — a quiet gap relaxes every audio term instead of letting hiss z-scores brighten the scene
// AUDIO-5X: the BlackHole feed sits at energyMean ≈ 0.015–0.08; the old 0.01–0.06 gate held everything at ~25%
// #define GATE 0.0

// LIGHT: corona brightness swells with the low end
#define CORONA_GLOW (0.70 + 1.6 * bs_bass * GATE)   // AUDIO-5X: bass envelope, not raw normalized
// #define CORONA_GLOW 0.85

// LIGHT: flare reach — spiky spectra throw the corona further out
#define FLARE (clamp(spectralCrestZScore, 0.0, 1.0) * GATE)
// #define FLARE 0.0

// DISTORTION: kicks launch gravitational wavefronts (refraction of the previous frame, no paint)
#define KICK (clamp(bassZScore, 0.0, 1.0) * GATE)
// #define KICK 0.0

// LIGHT: sky tiles breathe with the mids
#define SKY_GLOW (0.90 + 0.22 * midsNormalized * GATE + 0.05 * BRIGHTEN)
// #define SKY_GLOW 1.0

// LIGHT: lattice line sparkle with the highs
#define SPARK (trebleNormalized * GATE)
// #define SPARK 0.0

// LIGHT: lattice brightness follows timbral motion
#define LATTICE_LIT (0.55 + 0.45 * clamp(spectralFluxZScore * 0.5 + 0.5, 0.0, 1.0) * GATE)
// #define LATTICE_LIT 0.7

// COLOR: only the slowest music — key median + brightness mean
#define HUE_BASE (pitchClassMedian * 0.35 + spectralCentroidMean * 0.15)
// #define HUE_BASE 0.0

// ── SLOW / LONG-TERM: section character over the ~8 s history window. One feature → one verb, all
// subtle, all amounts (never phases or positions), so the picture evolves across a set hands-off and
// none of it can flash. Ratios where the raw level depends on input gain. Quiet-safe: slow gate.
#define SLOW_GATE (smoothstep(0.003, 0.015, energyMean))
#define BAND_SUM  (max(bassMedian + midsMedian + trebleMedian, 1e-3))

// LIGHT: airy sections (treble share of the band medians) → the lattice glints more (deep space: stars brighten)
#define AIR (smoothstep(0.15, 0.40, trebleMedian / BAND_SUM) * SLOW_GATE)
// #define AIR 0.0

// SHAPE: full-bodied sections (mids share) → the gold cloud bands spread further (deep space: arms widen)
#define BODY (smoothstep(0.30, 0.65, midsMedian / BAND_SUM) * SLOW_GATE)
// #define BODY 0.0

// COLOR: tonal sections (crest median — clear notes vs noise) → the whole frame gets more vivid
#define TONAL (smoothstep(0.35, 1.2, spectralCrestMedian) * SLOW_GATE)
// #define TONAL 0.0

// SHAPE: gritty / dissonant sections (roughness median) → the sun's granulation boils harder
#define GRIT (smoothstep(0.04, 0.16, spectralRoughnessMedian) * SLOW_GATE)
// #define GRIT 0.0

// LIGHT: dynamic music (energy std / mean — drops and builds vs a flat wall) → a deeper dark floor (deep space: wider gaps)
#define DYN (smoothstep(0.25, 0.9, energyStandardDeviation / max(energyMean, 0.004)) * SLOW_GATE)
// #define DYN 0.0

// SHAPE: punchy low end (bass std / mean) → the corona reaches further
#define PUNCH (smoothstep(0.2, 0.7, bassStandardDeviation / max(bassMean, 0.01)) * SLOW_GATE)
// #define PUNCH 0.0

// LIGHT: a confident brightening trend (centroid slope × R²) → the sky lifts a touch; ±, clamped
#define BRIGHTEN (clamp(spectralCentroidSlope * spectralCentroidRSquared * 4000.0, -1.0, 1.0) * SLOW_GATE)
// #define BRIGHTEN 0.0

// Ray shape (slow stats), motion clocks (audio sets the rate) and light envelopes now come from
// controllers/black-sun.js as bs_* uniforms — see the CONTROLLER block below.

// ============================================================================
// KNOBS knob_1..knob_10 (MIDI) — 0 = the designed look. Swap a line for its constant to pin it.
// knob_5..7 are read by controllers/black-sun.js, not here:
// @knob: 5 STORY
// @knob: 6 REACH
// @knob: 7 KISS
// ============================================================================
#define ZOOM        (0.55 * exp(knob_4 * 1.0033))   // K4 ZOOM — eye/sun/rays/lens scale about the centre, 0.55×..1.5× on an exp curve (0 = eye ~28% of screen height)
// #define ZOOM 0.55
// BOOT: before the controller's first frame every bs_* is 0 — size 0 would hide the sun until it ran.
#define BS_SIZE (bs_time > 0.0 ? bs_size : 1.0)
#define BS_SCALE (bs_time > 0.0 ? bs_irisScale : 1.0)
float gSwell = 1.0;   // KICK-SWELL: the whole main star (ball, corona, ray roots, lens) swells on each kick
#define HOLE_R      ((0.16 + knob_1 * 0.10) * BS_SCALE * ZOOM * BS_SIZE * gSwell)   // K1 HOLE SIZE × section-change shutter size (controller) × K4 ZOOM
// #define HOLE_R (0.16 * BS_SCALE * ZOOM * BS_SIZE * gSwell)
#define HUE_SPIN    (knob_2)                  // K2 HUE SPIN
// #define HUE_SPIN 0.0
#define LATTICE_AMT (0.55 + knob_3 * 0.45)   // K3 LATTICE
// #define LATTICE_AMT 0.55
#define CLOUD_CALM  (knob_8 * 0.85)           // K8 CLOUD CALM — fades the contour-banded clouds back to blue brush tiles (1 = 85% calmer)
// #define CLOUD_CALM 0.0
#define REACT       (1.0 + knob_9 * 1.5)      // K9 REACT — scales every audio term through GATE, 1×..2.5× (the end-of-frame knee still guards white)
// #define REACT 1.0
#define FADE        (1.0 - knob_10)           // K10 FADE — master fade to black (1 = black wall)
// #define FADE 1.0

#define SUN vec2(bs_sunX, bs_sunY)   // SKY-PATH: the controller drifts the sun slowly (story acts set the rate; dying sinks it)

float gPhase;   // slow colour phase (HUE_BASE + set clock + knob)
float gH0;      // ONE-PALETTE key hue (turns) — every colour in the frame is an offset of this

// ── CONTROLLER (controllers/black-sun.js): frame-persistent state lives in JS, not the framebuffer.
// Seconds-based and double precision, so it survives hot-swaps, canvas resizes and the iTime wrap.
// Without ?controller=black-sun every bs_* is 0 and the shader sits on the black hole.
uniform float bs_time, bs_eye, bs_presence;
uniform float bs_bass, bs_mids, bs_treb, bs_energy, bs_entropy, bs_centroid, bs_pump, bs_drop;
uniform float bs_flux, bs_rough, bs_crest, bs_roll, bs_kick;
uniform float bs_curl, bs_dir, bs_flex, bs_wave, bs_len, bs_thick;
uniform float bs_flow, bs_twist, bs_flexPh, bs_pal, bs_kAge, bs_kAmp;
uniform float bs_irisScale, bs_shutter, bs_shutterAng, bs_diskPh;
uniform float bs_fAge, bs_fId, bs_fAmp;
float gBass, gMids, gTreb, gEnergy, gEntropy, gCentroid, gPump, gDrop, gFlow;
float gCurl, gDir, gFlex, gWave, gLen, gThick, gTwist, gFlexPh, gFlux, gRough;
float gKick, gKAge, gKAmp, gCrest, gPal, gRoll;
uniform float bs_wAge, bs_wAmp;
// STORY (controllers/black-sun.js ACTS): see docs/storylines.md
uniform float bs_sunX, bs_sunY, bs_night, bs_galPh, bs_wind, bs_fluxPh, bs_reach;
uniform float bs_billow, bs_bassS, bs_kickS;
// LEGIBLE: one musical element → one visual verb (see sun.md 'Legible channels')
uniform float bs_snAge, bs_snAmp, bs_pitchMove, bs_build, bs_bassSus, bs_midsS;   // background-rate envelopes (attack ~80 ms, release ~600 ms)
// bs_billow — NO-SHIVER: slow (~4 s) eased warp amplitude — the only audio that may scale a background warp
uniform float bs_cX, bs_cY, bs_cOn, bs_kiss, bs_waveX, bs_waveY;
float gHeatOv = -1.0;              // COMPANION: >= 0 overrides the story heat in sunLch (the companion is always dark red)
float gBendDir = 0.0, gBendAmt = 0.0;   // COMPANION: rays bend toward the other star
float gR0;   // ray root radius (set in urchin) — FAR-REACH measures ray length from it
uniform float bs_heat, bs_size, bs_power, bs_dark, bs_abstract, bs_chaos, bs_pull, bs_nova, bs_shell, bs_act, bs_actT;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec2 rotate2D(vec2 st, float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)) * st; }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float st(float a, float b, float s) { return smoothstep(a - s, a + s, b); }

float noise(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3. - 2. * f);
    return mix(mix(dot(hash22(i + vec2(0, 0)), f - vec2(0, 0)),
                   dot(hash22(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
               mix(dot(hash22(i + vec2(0, 1)), f - vec2(0, 1)),
                   dot(hash22(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}

float s_noise(vec2 p) { return noise(p) * 0.5 + 0.5; }

float fbm(vec2 p) {
    float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 4; ++i) { v += a * s_noise(p); p = rot * p * 2.0 + shift; a *= 0.5; }
    return v;
}

// OKLCH-PALETTE: h = hue turns (0..1), l = brightness 0..~0.6 (kept the old HSL-ish scale so call
// sites read the same). Chroma fades at the dark and bright ends so nothing clips to white.
vec3 psyC(float h, float l, float cs) {
    float L = clamp(l * 1.35, 0.0, 0.88);
    float C = 0.17 * cs * smoothstep(0.0, 0.30, l) * (1.0 - smoothstep(0.70, 0.95, L));
    vec3 lin = clamp(oklch2rgb(vec3(L, C, fract(h) * TAU)), 0.0, 1.0);
    return pow(lin, vec3(1.0 / 2.2));
}
vec3 psy(float h, float l) { return psyC(h, l, 1.0); }

// MIAMI-PALETTE — a designed palette (OKLCH L, C, hue°) with fixed offsets between colours, not one
// hue ± a bit. The whole table rotates together on gPal (bs_pal, a slow controller clock that starts at 0 on load),
// so the set opens on Miami beach and drifts into other psychedelic palettes over ~25 min.
const vec3 MIAMI[15] = vec3[15](
    vec3(0.80, 0.075, 78.0),   // 0  SAND            ┐
    vec3(0.70, 0.160, 30.0),   // 1  CORAL           │
    vec3(0.78, 0.125, 192.0),  // 2  AQUA/turquoise  │ the eye: Miami jewel
    vec3(0.60, 0.190, 35.0),   // 3  EMBER GLOW      │ (SUN-PALETTE: pupil glow + fibres at the pupil)
    vec3(0.74, 0.165, 58.0),   // 4  SUNSET ORANGE   │
    vec3(0.48, 0.105, 222.0),  // 5  DEEP OCEAN      │
    vec3(0.30, 0.110, 28.0),   // 6  DEEP EMBER      ┘ (SUN-PALETTE: pupil glow at rest)
    vec3(0.88, 0.130, 90.0),   // 7  PALE GOLD       ┐ SUN-PALETTE rays: hottest at the base
    vec3(0.81, 0.160, 76.0),   // 8  SAFFRON         │ tendrils: warm roots →
    vec3(0.74, 0.170, 62.0),   // 9  AMBER           │ cool tips
    vec3(0.65, 0.180, 46.0),   // 10 DEEP ORANGE     │
    vec3(0.55, 0.185, 30.0),   // 11 EMBER RED       ┘ cooling to the fading tips
    vec3(0.60, 0.120, 245.0),  // 12 VAN GOGH SKY    ┐ background
    vec3(0.38, 0.120, 262.0),  // 13 DEEP BLUE       ┘
    vec3(0.92, 0.100, 96.0)    // 14 PALE GOLD sparkle — glints, collarette, stars
);
// HUE-LOCK: only the sky (12, 13) rides the full slow palette rotation; the eye, tendrils and gold
// sway at most ±20° around their designed hues, so tendrils stay raspberry→violet and never drift
// into the gold of the sky strokes. K2 HUE SPIN still turns everything.
// GAMUT-MAP: shrink chroma at constant L/hue until the colour fits sRGB — clamping RGB instead
// flattened out-of-gamut hues (the neon-plastic teal) into saturated channels. Linear RGB out.
vec3 gamutLch(vec3 lch) {
    // GAMUT-FAST: one conversion, closed form, continuous. An out-of-gamut colour is pulled toward its
    // own-lightness grey just far enough that every channel fits — at constant L and (≈) hue. Continuous
    // in the input, so smooth gradients stay smooth: the old discrete L-step search terraced the
    // plasma, and its 9 conversions per call were most of the frame-time regression.
    vec3 c = oklch2rgb(lch);
    float g = lch.x * lch.x * lch.x;
    float t = 1.0;
    for (int i = 0; i < 3; i++) {
        float ci = c[i], di = ci - g;
        if (ci > 1.0) t = min(t, (1.0 - g) / di);
        if (ci < 0.0) t = min(t, g / (g - ci));
    }
    return clamp(vec3(g) + (c - vec3(g)) * max(t, 0.0), 0.0, 1.0);
}

// LSD-CLOUDS: 1960s poster-art contour bands for the cloud masses. Adjacent bands are near-
// complements at matched lightness (op-art vibration); the sequence opens on the sun's gold and
// walks warm → hot → psychedelic. Degrees; the whole set turns slowly on gPal.
const float LSD_HUES[8] = float[8](90.0, 265.0, 55.0, 295.0, 28.0, 190.0, 150.0, 215.0);   // NO-MAGENTA   // no lime: pairs that sing against the blue ground + gold sun
vec3 lsdBand(float k, float lit) {
    int i = int(mod(k, 8.0));
    float L = (mod(k, 2.0) < 0.5 ? 0.74 : 0.70) * lit;
    return pow(gamutLch(vec3(L, 0.17, radians(LSD_HUES[i]) + gPal * TAU * 0.5)), vec3(1.0 / 2.2));
}

// SOFT-BANDS: neighbouring LSD bands blend across the whole band width (smoothstep over fract),
// mixed in OKLab so the hue travels instead of stepping. The band sequence stays; the stair-steps go.
// GAS-HUE: the gas's colour is a CONTINUOUS function of its field — hue sweeps the wheel with the
// field value (no floor/fract band index anywhere), so the psychedelic multi-hue look comes from the
// gas's own variation and nothing can step. Anchored to the sun gold; turns slowly with the palette.
vec3 gasHue(float v, float L) {
    float hh = 28.0 + 268.0 * (0.5 + 0.5 * sin(v * 5.2 + gPal * TAU * 0.5));   // NO-MAGENTA: hue sweeps crimson → gold → green → cyan → violet and back, never through magenta (296°–388°)
    return pow(gamutLch(vec3(L, 0.15, radians(hh))), vec3(1.0 / 2.2));
}

// NO-GREY: blended in OKLCH, not OKLab — adjacent bands are near-complementary, so a straight OKLab
// mix passes through grey mid-way, and that grey laid a flat veil over the night sky. Hue travels the
// short way round the wheel and chroma never dips.
vec3 bandBlend(float k, float lit) {
    float f = fract(k);
    f = f * f * (3.0 - 2.0 * f);
    vec3 a = rgb2oklch(pow(lsdBand(floor(k), lit), vec3(2.2)));
    vec3 b = rgb2oklch(pow(lsdBand(floor(k) + 1.0, lit), vec3(2.2)));
    float dh = mod(b.z - a.z + PI, TAU) - PI;
    return pow(gamutLch(vec3(mix(a.x, b.x, f), max(a.y, b.y), a.z + dh * f)), vec3(1.0 / 2.2));
}

vec3 miamiLinR(int i, float lit, float cMul, bool sway) {
    vec3 e = MIAMI[i];
    float L = min(e.x * lit, 0.86);
    float C = e.y * cMul * (0.55 + 0.45 * smoothstep(0.05, 0.35, L)) * (1.0 - smoothstep(0.82, 0.92, L));
    float rot = (sway ? radians(i >= 12 && i <= 13 ? 15.0 : 20.0) * sin(gPal * TAU) : gPal * TAU) + HUE_SPIN * TAU;
    return gamutLch(vec3(L, C, radians(e.z) + rot));
}
vec3 miamiLin(int i, float lit) { return miamiLinR(i, lit, 1.0, true); }   // SKY-LOCK: every table colour sways at most ±20° (sky ±15°) — the ground stays Van Gogh blue; only the LSD cloud bands and plasma veins ride the full palette clock
// idx may be fractional: blends neighbouring palette entries (gradients along a tendril)
vec3 mc(float idx, float lit) {
    idx = clamp(idx, 0.0, 14.0);
    int i0 = int(floor(idx)); int i1 = min(i0 + 1, 14);
    return pow(mix(miamiLin(i0, lit), miamiLin(i1, lit), fract(idx)), vec3(1.0 / 2.2));
}


// ============================================================================
// LATTICE (hex mirror-fold, from redaphid/lattice-interactive/3)
// ============================================================================
float hexDist(vec2 p) {
    float dx = abs(p.x), dy = abs(p.y);
    return max(dx + dy * (1.0 / tan(PI / 3.0)), max(dx, dy * (1.0 / sin(PI / 3.0))));
}

// returns (lit, field, alpha)
vec3 lattice(vec2 p, float t) {
    float scale = 1.0, aliasBase = 1.0 / iResolution.y;
    float alpha = 0.0, lumAcc = 0.0, fieldAcc = 0.0;
    for (int i = 0; i < 9; i++) {
        p = 1.0 - abs(2.0 * fract(p - 0.5) - 1.0);
        float theta = float(i) * PI * 0.125 + t * 0.006 * (0.4 + float(i) * 0.05) + (seed3 - 0.5) * float(i) * 0.6;
        p *= rot2(theta);
        scale *= 2.0;
        if (i < 4) continue;
        vec2 uv = abs(p);
        float m = min(abs((hexDist(uv) - 0.60) - 0.1), min(length(uv) - 0.20, min(uv.x, uv.y)));
        float alias = aliasBase * 0.5 * scale;
        float f = smoothstep(0.10 + alias, 0.10, m) * 0.4 + smoothstep(0.22, 0.11, m) * 0.6;
        float ld = float(i - 4) / 4.0;
        float swirl = 0.5 + 0.5 * sin(atan(p.y, p.x) * 2.0 + length(p) * 3.0 + float(i) + seed4 * TAU);
        float lit = smoothstep(0.06 + alias, 0.06, m) * 0.5 + 0.2;
        float w = (1.0 - alpha) * f;
        lumAcc += w * lit;
        fieldAcc += w * (ld * 0.55 + swirl * 0.45);
        alpha += w;
    }
    return vec3(lumAcc, fieldAcc / max(alpha, 1e-3), alpha);
}

// ============================================================================
// SKY — Van Gogh tile rings around the black sun, lattice spiralling in
// ============================================================================
vec3 sky(vec2 uv, float t, float sm) {
    // STARRY-FLOW: the tile rows follow a slow swirl field (Starry Night flow) instead of perfect
    // circles around the sun — breaks the concentric-ring read; the field drifts forward on galPh
    vec2 sw = uv * 0.6 + vec2(bs_galPh * 0.04, 0.0);
    vec2 u = rotate2D(uv - SUN, noise(uv + t * .25) * .3) + vec2(noise(sw), noise(sw + 5.3)) * 0.7;
    float yd = 60.;
    vec2 id = vec2((length(u) + .01) * yd, 0.);
    float xd = max(floor(id.x) * .09, .09);
    float h = (hash12(floor(id.xx)) * .5 + .25) * (t + 10.) * .25;
    vec2 tt = rotate2D(u, h);
    id.y = atan(tt.y, tt.x) * xd;
    vec2 lc = fract(id);
    id -= lc;
    vec2 cc = vec2(cos((id.y + .5) / xd), sin((id.y + .5) / xd)) * (id.x + .5) / yd;
    cc = rotate2D(cc, -h) + SUN;
    float clN = noise(cc * vec2(.5, 1) - vec2(t * .2, 0));               // CLOUD-PRESENCE: clouds may sweep the whole frame, not just the upper part
    float clT = 0.012 - 0.018 * gEnergy * GATE - 0.006 * BODY;   // TILE-DANCE: the band's ragged edge advances with the energy envelope; BODY: mids-heavy sections spread it
    float cl = smoothstep(clT - 0.0015, clT + 0.0015, clN);
    lc += noise(lc * vec2(1, 4) + id) * vec2(.7, .2);
    // TILE-DANCE: every brush tile answers the music — the gold band leads, the blue tiles follow at a
    // quarter strength. Envelopes only (controller); per-tile hashed phases on a monotonic clock.
    float kT = mix(0.25, 1.0, cl);
    float hT = hash12(id + 7.3);
    float edgeN = 1.0 - smoothstep(0.0, 0.012, abs(clN - clT));          // tiles near the band edge
    float trebLit = 0.0;   // NO-SHIVER: treble brightens edge tiles (was a back-and-forth position jitter)
    float thX = 0.40 - 0.15 * bs_bassSus * GATE * kT;                         // bass: tiles thin, the dark gaps between them breathe open
    float thY = 0.45;            // mids: tiles stretch along their stroke
    float Lc = length(cc - vec2(bs_waveX, bs_waveY));
    float Rk = HOLE_R * 3.3 * 1.05 + bs_wAge * 1.5;                      // the distortion wavefront (same front as BIG-WAVES)
    float kFlash = exp(-pow((Lc - Rk) / 0.07, 2.0)) * bs_wAmp * exp(-bs_wAge * 1.5) * GATE;

    float L = length(uv - SUN);
    float ph = gPhase + 0.35 / (L + 0.35);                  // hue bends harder near the sun
    vec3 base = mc(12.0 + 0.8 * (0.5 + 0.5 * sin(sin(L - .1) + ph)), 0.55);   // VANGOGH-SKY: sky blue ↔ deep blue
    float bandK = floor(max(clN - clT, 0.0) / 0.022);                    // LSD-CLOUDS: contour band index from depth inside the cloud
    // SKY-CALM: the patchwork sits ~40% calmer by default, most of all around the sun so the sun owns the
    // centre — bands fade back toward the blue brush tiles (a hue move, never toward grey) and dim a touch.
    // K8 CLOUD CALM adds on top.
    float calmR = 0.40 * mix(1.0, 0.55, smoothstep(0.3, 1.5, L));
    float calm = clamp(calmR + CLOUD_CALM, 0.0, 0.92);
    vec3 tile = mix(mc(12.0 + 0.9 * hash12(id), 0.85), lsdBand(bandK, 0.9 + 0.1 * hT), cl * (1.0 - calm));
    tile *= 1.0 - 0.5 * calmR * (1.0 - smoothstep(0.3, 1.2, L));   // blue brush-tiles; psychedelic contour-banded clouds
    tile *= 1.0 + (1.4 * kFlash + 0.35 * bs_bassSus * GATE) * kT;              // the kick front lights the tiles it crosses
    vec3 f = mix(base * mix(0.45, 0.16, bs_night) * (0.85 - 0.3 * DYN), tile,   // DAY-BLUE: lit gaps by day, dark floor at night; DYN: dynamic music digs it deeper
                 st(abs(lc.x - .5), thX, sm * yd) * st(abs(lc.y - .5), thY, sm * xd));   // DARK-FLOOR3: the gaps between tiles are the dark floor
    f *= SKY_GLOW;

    // LATTICE: log-polar → it zooms into the hole forever (self-similar, monotonic), spiral arms
    vec2 d = uv - SUN;
    float ang = atan(d.y, d.x);
    vec2 q = vec2(ang / TAU * 6.0, log(max(L, 1e-3)) * 0.95 - t * 0.045);
    q.x += q.y * 0.5;
    vec3 lat = lattice(q, t);
    float vis = smoothstep(1.7, 0.30, L) * LATTICE_AMT;
    vec3 latCol = mc(14.0, 0.55 + 0.3 * lat.y) * lat.x * LATTICE_LIT * (1.0 + SPARK * 0.8 + 0.3 * AIR) * 1.6;   // + AIR: airy sections glint
    f = mix(f, f * 0.55 + latCol, clamp(lat.z, 0.0, 1.0) * vis);

    // sunlight scattered into the sky — hue-cycling bloom around the hole
    f *= 1.0 + (0.3 + 1.2 * bs_bassSus * GATE) * 0.8 / (1.0 + L * 6.0);   // SURGE-MULT: sunlight brightens the tiles already there (×), it never lays a flat peach layer over them   // sun-glow on the sand, swells with bass
    f *= mix(1.0, 0.75 + 0.5 * smoothstep(0.2, 1.6, L), gRoll * GATE);         // rolloff pushes light to the outer field
    return f;
}
// FIBRE-COIL: one shear field for tendrils AND iris fibres. sl = log(r / root radius): > 0 out along
// the tendrils, < 0 inward through the iris toward the pupil — the same formula continued, so each
// fibre coils into its tendril as one strand with no seam at the root.
float fieldShear(float sl, float layer) {
    float curl = mix(0.20, 1.0, gCurl) * mix(-1.0, 1.0, gDir) * (1.0 - 0.35 * layer);   // SUN-RAYS: corona-streamer sway, gentler than the old snakes
    float wave = mix(1.2, 4.0, gWave);
    float flexA = mix(0.03, 0.16, gFlex) * (1.0 + 0.8 * bs_chaos) * (0.5 + 2.2 * bs_midsS);   // LEGIBLE mids/vocals: the tendrils sway
    float swayPh = gFlexPh * TAU * (layer < 0.5 ? 1.0 : 2.0);           // integer multiples → wrap-safe
    return gTwist * TAU * (layer < 0.5 ? 1.0 : -1.0)                  // whole field turns (rate-driven)
         + curl * sl                                                  // curl: shear grows along the strand
         + flexA * sl * sin(sl * wave - swayPh);                      // flex: travelling sway, root pinned
}


// ============================================================================
// BLACK SUN — horizon + photon ring + turbulent psychedelic corona + tilted disk
// ============================================================================
// EYE-PLASMA: plasma-family interference (Ether's nested sin-fold, as in plasma.frag and
// redaphid/wip/plasma-event-horizon) laid into the iris body, in polar coords around the pupil.
// Only integer multiples of the angle (no seam) and of the monotonic flow clock (wrap-safe); the
// log-radius term moves inward as the clock advances, so the plasma spirals down into the pupil like
// matter falling into the hole. Audio never enters a phase — it scales brightness at the call site.
float eyePlasma(float a, float lr, float flowA) {
    float v = sin(3.0 * a + 2.6 * lr + 2.0 * flowA
            + 1.3 * sin(2.0 * a - 3.1 * lr + flowA
            + 0.9 * sin(5.0 * a + 4.2 * lr + 3.0 * flowA)));
    return 0.5 + 0.5 * v;
}

// SUN-DISC: the centre is no longer black — a luminous plasma sun. Plasma-family nested sin-folds
// (plasma.frag / clean-plasma / plasma-event-horizon) in disc-local coords, differentially rotated
// (inner faster) on the unwrapped controller orbit clock; granulation cells; fine bright filament
// loops (treble); slow-palette magenta/violet veins along the plasma seams; limb-darkened. Audio:
// bass → brightness + turbulence amplitude, mids → flow rate (via bs_diskPh), kick → surface flare.
vec3 sunDisc(vec2 d, float R) {
    vec2 p = d / R;
    float x = length(p);
    float G = GATE;
    // NO-WINDING: differential rotation as two RIGIDLY rotating layers (inner fast, outer slow)
    // blended by radius — a single radius-dependent spin winds tighter forever into rings.
    float amp = 0.9 + 0.9 * gBass * G;                                       // bass: turbulence amplitude
    vec2 pi_ = rot2(bs_diskPh * 0.55) * p, po = rot2(bs_diskPh * 0.25) * p;
    float vi = sin(pi_.x * 3.1 + bs_diskPh * 0.7 + amp * sin(pi_.y * 4.3 - bs_diskPh * 0.5 + amp * 0.8 * sin(length(pi_) * 6.0 - bs_diskPh * 0.9 + pi_.x * 2.0)));
    float vo = sin(po.x * 3.1 + bs_diskPh * 0.7 + amp * sin(po.y * 4.3 - bs_diskPh * 0.5 + amp * 0.8 * sin(length(po) * 6.0 - bs_diskPh * 0.9 + po.x * 2.0)));
    float v = mix(vi, vo, smoothstep(0.25, 0.85, x));
    p = mix(pi_, po, smoothstep(0.25, 0.85, x));
    float v01 = 0.5 + 0.5 * v;
    float gran = noise(p * 9.0 + vec2(bs_diskPh * 0.15, -bs_diskPh * 0.1));   // convection cells
    float fil = pow(1.0 - abs(sin(v * 3.0 + p.y * 2.0)), 14.0);              // filament loops
    float mu = sqrt(max(1.0 - x * x, 0.0));                                  // limb darkening
    float T = clamp(0.25 + 0.5 * v01 + 0.3 * gran, 0.0, 1.0);
    vec3 c = mc(mix(11.0, 7.0, T), 0.6 + 0.4 * T) * (0.5 + 0.7 * mu);   // SUN-DISC2: brighter photosphere
    float seam = exp(-v * v / 0.02) * (0.5 + 0.5 * mu);
    c = mix(c, psyC(0.88 + 0.06 * sin(gPal * TAU), 0.42, 1.0), seam * 0.55);   // magenta/violet veins (slow palette)
    c += mc(14.0, 1.0) * fil * mu * (0.15 + 1.6 * gTreb * G);               // treble: filament glints
    c *= 0.7 + 1.1 * gBass * G + 0.6 * gKick * G;                           // bass swell + kick flare
    float cM = max(max(c.r, c.g), max(c.b, 1e-4));
    float cK = cM < 0.55 ? cM : 0.55 + 0.33 * (1.0 - exp(-(cM - 0.55) / 0.33));
    return c * (cK / cM);
}

// STORY-HEAT: every sun colour runs through the story's temperature. Below 1 it cools toward red
// and ember and dims; above 1 it goes pale yellow (chroma falls as L rises — never white).
// NIGHT-SPACE: what the day sky turns into — indigo-black depth, a star field (soft, slow twinkle,
// dimmed where gas is dense) and nebula gas: the LSD contour bands as glowing filaments. Read in
// lensed coordinates, so the stars bend around the sun.
vec3 deepSpace(vec2 uv) {
    // GALAXY-AUDIO: the gas lies in spiral arms around the sun, and every part of it answers the
    // music — light and rate only. bass/kick: arm brightness + width breathe and the gas billows
    // (warp strength); mids: arm flow speed (bs_galPh, a rate); flux: a brightness wave running
    // outward along the arms (bs_fluxPh); treble: glints on the arm crests + star twinkle depth;
    // roughness/entropy: turbulence; drops/sections/supernova: the spiral winds tighter (bs_wind).
    float G = GATE;
    vec3 c = pow(gamutLch(vec3(0.21, 0.09, radians(268.0))), vec3(1.0 / 2.2));   // NIGHT-FLOOR: +0.05 L — moody, not off   // NIGHT-NAVY: a true navy-black floor (L 0.25 read as a grey veil); the gas carries the brightness
    vec2 dS = uv - SUN;
    float rS = max(length(dS), 1e-3), aS = atan(dS.y, dS.x), lr = log(rS);
    float arm = 0.5 + 0.5 * cos(2.0 * aS - (2.6 + 1.3 * bs_wind) * lr + bs_galPh);   // integer angle multiple → no seam
    float armM = pow(arm, mix(3.5 - 0.8 * BODY, 1.2, clamp(bs_bassSus * G * 1.3, 0.0, 1.0)));   // LEGIBLE bass sustain: the arms widen and breathe   // bass/kick: arms widen
    float turb = 1.0 + 1.2 * bs_billow + 0.5 * bs_chaos;                                    // NO-SHIVER: warp amplitude eases slowly (bs_billow), never per-beat
    vec2 q = uv * 1.1 + vec2(1.0, 0.35) * bs_galPh * 0.12;                 // FORWARD: the gas streams one way on the monotonic flow clock
    float dens = smoothstep(0.3, 0.7, s_noise(q * 0.7) * 0.6 + s_noise(q * 1.6 + 4.1) * 0.4);
    vec2 w = q + vec2(noise(q * 1.3), noise(q * 1.3 + 7.7)) * turb;            // FORWARD: no clock inside the warp
    float v = 0.5 + 0.5 * sin(w.x * 2.2 + sin(w.y * 2.7));
    float fil = exp(-pow(sin(w.x * 3.3 + w.y * 1.4), 2.0) / 0.03);
    vec3 gas = gasHue(v + 0.3 * fil, 0.62);
    float fwave = exp(-pow(fract(lr * 0.35 - bs_fluxPh * 0.25) - 0.5, 2.0) / 0.006) * 0.0;
    float gasLit = (0.4 + 1.6 * armM) * (0.6 + 1.8 * bs_bassSus * G);   // LEGIBLE bass sustain: big slow swell of the gas   // BUDGET: the surge lands on the arms (contrast), not the whole field
    float veil = dens * (0.4 + 0.6 * fil) * (1.0 - 0.3 * DYN);   // DYN: dynamic music opens wider gaps of empty space                       // TRANSLUCENT: thin veils, wide clear gaps of open space
    c += gas * veil * gasLit * 0.95;   // NIGHT-FLOOR: veils ×2.5
    float crest = smoothstep(0.8, 1.0, arm) * pow(max(0.0, sin(w.x * 9.0 + w.y * 5.0)), 18.0);
    c += pow(gamutLch(vec3(0.85, 0.08, radians(85.0))), vec3(1.0 / 2.2)) * crest * 0.0;          // treble glints on the crests
    vec2 sg = uv * 34.0;
    vec2 cid = floor(sg);
    float hs = hash12(cid);
    vec2 sp = fract(sg) - 0.5 - (hash22(cid + 3.1) - 0.5) * 0.6;
    // STAR-AUDIO: stars carry the fast music. treble: ±60% twinkle on per-star hashed slow phases (the
    // envelope is smoothed, so no flicker); kicks swell the brightest stars to 2–3 px
    float tw = 1.0 + 0.85 * clamp(gTreb * 1.8, 0.0, 1.0) * G * sin(bs_time * 1.3 + hs * 40.0) - 0.2;   // LEGIBLE hats: the star field twinkles
    float big = step(0.975, hs);
    float star = step(0.9, hs) * exp(-dot(sp, sp) / (0.012 * (1.0 + big * 3.0 * clamp(gTreb * 1.5, 0.0, 1.0) * G))) * tw;
    c += mix(vec3(0.75, 0.8, 1.0), vec3(1.0, 0.85, 0.7), hash12(cid + 9.0)) * star * 1.6 * (0.85 + 0.35 * AIR) * (1.0 - 0.6 * dens) * smoothstep(0.4, 0.8, bs_night);
    float cM = max(max(c.r, c.g), max(c.b, 1e-4));
    float cK = cM < 0.7 ? cM : 0.7 + 0.2 * (1.0 - exp(-(cM - 0.7) / 0.2));
    return c * (cK / cM);
}

vec3 sunLchK(float L, float C, float hDeg, float keepL) {
    float hc = clamp(gHeatOv >= 0.0 ? gHeatOv : bs_heat, 0.0, 1.6);
    if (hc < 1.0) {   // NO-MAGENTA: cooling stops at crimson
        hDeg = max(hDeg - (1.0 - hc) * 62.0, 22.0); L *= mix(0.45 + 0.55 * hc, 0.85 + 0.15 * hc, keepL); C *= 0.85 + 0.15 * hc; }
    else { L = min(L + (hc - 1.0) * 0.22, 0.88); C *= 1.0 - (hc - 1.0) * 0.6; hDeg += (hc - 1.0) * 12.0; }
    return pow(gamutLch(vec3(L, C, radians(hDeg))), vec3(1.0 / 2.2));
}
vec3 sunLch(float L, float C, float hDeg) { return sunLchK(L, C, hDeg, 0.0); }

// STORY-NEBULA: the scene dissolving into pure plasma (bs_abstract) — domain-warped flow through the
// LSD band palette, drifting on the orbit clock. Dim enough to sit under the sun.
vec3 nebula(vec2 p) {
    // NEBULA-AUDIO: this layer dominates NEBULA/REBIRTH, so it must answer the music from across the
    // room. bass: warp displacement (the gas bulges) + brightness; kick: a surge ×1.5 that billows
    // outward from the sun; mids: flow speed rides bs_galPh; flux: a brightness wave out along the
    // filaments; treble: glints on the filaments. Light/amplitude/rate only.
    float G = GATE;
    vec2 dS = p - SUN;
    float rS = length(dS);
    // FORWARD: the field TRANSLATES with the monotonic flow clock (it streams one way), and the warp
    // terms carry no clock — a clock inside sin() moves the field back and forth, which read as shiver.
    vec2 q = p * 1.2 + vec2(1.0, 0.35) * bs_galPh * 0.15;
    q += normalize(dS + 1e-4) * 0.3 * bs_billow * exp(-rS * 0.6);                     // NO-SHIVER: the bulge eases in over seconds, it never pumps per beat
    q += vec2(noise(q * 0.9), noise(q * 0.9 + 3.7)) * (1.4 + 0.8 * bs_chaos + 0.6 * bs_billow);
    for (float i = 1.0; i < 4.0; i++) q += sin(q.yx * (1.1 * i) + vec2(1.3, 2.1) * i) / i * 0.5;
    float v = 0.5 + 0.5 * sin(q.x * 1.7 + sin(q.y * 2.1));
    vec3 c = gasHue(v, 0.55);
    float fil = exp(-pow(sin(q.x * 3.0 + q.y), 2.0) / 0.02);
    float surge = 0.0;   // kick: the bright gas flares (patches, not a painted ring)
    float fwave = 0.0;  // flux wave along the filaments
    float lit = (0.4 + 0.35 * v) * (0.6 + (0.4 + 1.6 * smoothstep(0.45, 0.95, v)) * bs_bassSus * G) * (1.0 + 0.5 * surge);   // BUDGET: only the bright veils surge
    float dn = smoothstep(0.25, 0.85, s_noise(q * 0.45 + 2.3));             // TRANSLUCENT: density with clear gaps
    vec3 o = (c * lit + c * fil * (0.3 + 0.8 * fwave)) * dn;
    o += pow(gamutLch(vec3(0.86, 0.08, radians(85.0))), vec3(1.0 / 2.2)) * fil * 0.0 * 0.6;
    float oM = max(max(o.r, o.g), max(o.b, 1e-4));
    return o * ((oM < 0.65 ? oM : 0.65 + 0.2 * (1.0 - exp(-(oM - 0.65) / 0.2))) / oM);
}

vec3 plasmaBall(vec3 col, vec2 d, float R, float m) {
    float G = GATE;
    // SMALL-PULSE: a small or distant star pulses harder — swell and brightness scale inversely with
    // its radius (tiny DYING/REBIRTH sun or the companion: big kick swell; red giant: subtle)
    float pk = clamp(0.22 / max(R, 0.02), 0.6, 2.6);
    R *= 1.0 + pk * 0.06 * gKick * G;   // LEGIBLE kick: size punch (small/far stars punch harder)
    vec2 p = d / R;
    float x = length(p);
    float z = sqrt(max(1.0 - x * x, 0.0));                                   // sphere bulge
    vec2 q = p * (1.0 + 0.55 * (1.0 - z));                                   // texture compresses toward the limb → reads as a ball
    float swirl = 0.7 + 0.6 * bs_chaos;                  // bass: turbulence amplitude; story chaos
    // two rigidly rotating layers (inner fast, outer slow), blended by radius — no winding into rings
    vec2 qi = rot2(bs_diskPh * 0.45) * q, qo = rot2(bs_diskPh * 0.2) * q;
    vec2 qq = mix(qi, qo, smoothstep(0.2, 0.9, x));
    vec2 w = vec2(noise(qq * 1.7 + vec2(bs_diskPh * 0.21, 0.0)), noise(qq * 1.7 + vec2(5.2, -bs_diskPh * 0.17)));
    qq += w * 1.1 * swirl;                                                   // domain warp → curling, never straight
    for (float i = 1.0; i < 4.0; i++) qq += sin(qq.yx * (1.3 * i) + vec2(bs_diskPh * 0.35, -bs_diskPh * 0.27) * i) / i * 0.45 * swirl;
    float v = sin(qq.x * 2.6 + sin(qq.y * 3.1));
    // PLASMA-RICH: large swirl + two finer boiling octaves (granulation), all forward-flowing
    float gran = noise(qq * 7.0 + bs_diskPh * 0.1) * 0.6 + noise(qq * 15.0 - bs_diskPh * 0.17) * 0.4;
    float T = clamp(0.5 + 0.34 * v + 0.42 * gran + 0.35 * GRIT * (gran - 0.5), 0.0, 1.0);   // GRIT: rough sections boil harder (contrast only, mean kept)
    // magnetic arcs: thin bright curves where the warped field crosses zero; width floored by the
    // pixel footprint so they never alias into flicker
    float hot = 1.0 * (1.0 + 1.4 * bs_nova);   // CORE-HOT2: rest at 0.9, not 0.6 — the 0.6 rest was why the core sat below its corona   // bass core swell + kick surge; the supernova flash (knee-limited below)
    // PLASMA-RICH: a designed hot ramp, continuous — deep magenta/crimson lanes (chroma kept high at
    // low L, so they never read as mud) → red-orange → gold → pale-gold core. Spherical shading on top.
    float L = mix(0.86, 0.66, x * x) * mix(0.62, 1.0, T) + 0.06 * z;   // BLEND: the limb ends at the corona's own lightness — no dark rim to read as a circle   // BALL-BOIL: stronger cell contrast now the line work is gone
    L += 0.0;       // CORE-PULSE: the core breathes ±~25% with bass/kick   // BALL-HOT: hot yellow-gold core, the brightest thing on screen
    float Tr = clamp(T * (1.0 - 0.35 * x * x), 0.0, 1.0);
    float hue = Tr < 0.5 ? mix(24.0, 48.0, Tr * 2.0) : mix(48.0, 92.0, Tr * 2.0 - 1.0);   // NO-MAGENTA: lanes are deep crimson, not magenta
    vec3 ball = sunLchK(clamp(L, 0.36, 0.90), mix(0.21, 0.15, Tr), hue, 1.0 - x * x) * hot;   // VIVID: richer chroma   // CORE-HOT: a cool act shifts the core's hue but barely dims it — the core stays brighter than corona and rays in every act; only the limb takes the full cooling
    // NO-OUTLINE2: no line work on the surface at all — any thin bright curve over the cell pattern read
    // as an outline around the dark lanes. Treble now makes the hottest granules sparkle instead.
    ball += sunLch(0.86, 0.12, 84.0) * pow(smoothstep(0.55, 1.0, gran), 4.0) * z * 0.15;
    float bM = max(max(ball.r, ball.g), max(ball.b, 1e-4));
    float bK = bM < 0.7 ? bM : 0.7 + 0.22 * (1.0 - exp(-(bM - 0.7) / 0.22));
    ball *= bK / bM;
    float inside = 1.0 - smoothstep(0.62, 1.12, x);                         // SOFT-LIMB/BLEND: the ball dissolves into corona + ray roots over its outer ~40% — no edge to point at
    // corona boiling off the limb, red-orange, bleeding into the ray roots; flux throws flares
    float ang = atan(p.y, p.x);
    float boil = noise(vec2(ang * 3.0 / TAU * 6.0, x * 2.0 - bs_diskPh * 0.4)) * 0.5 + 0.5;
    float flare = 0.0;
    float cor = exp(-max(x - 0.75, 0.0) * mix(7.0, 3.5, boil * 0.6 + flare)) * (1.0 - 0.5 * inside) * 0.55;   // BLEND: corona overlaps the limb on both sides   // HAZE-CUT: steeper corona falloff
    vec3 corona = sunLch(0.66, 0.16, mix(34.0, 52.0, boil)) * cor;   // same hue band as the limb and the ray roots
    col = col * (1.0 - 0.6 * clamp(cor * 1.8, 0.0, 1.0)) + corona;   // NO-GREY-HALO: the glow occludes the blue under it (L down first) instead of adding orange onto blue → grey
    return mix(col, ball, inside);
}

vec3 blackSun(vec3 col, vec2 d, float t, float m) {   // m = EYE morph 0..1 (one-way)
    float RH = HOLE_R;
    float r = max(length(d), 1e-4);
    float a = atan(d.y, d.x);

    // turbulent log-polar corona (integer angular multiples → seamless)
    vec2 q = vec2(a * 3.0, log(r / RH) * 2.6 - t * 0.35);
    for (float i = 1.0; i < 6.0; i++) q += sin(q.yx * i + vec2(t * 0.5, -t * 0.3) + i * 1.7) / i * 0.55;
    float rays = 0.5 + 0.5 * cos(q.x * 2.0 + q.y * 0.6);
    float reach = RH * (0.55 + 0.9 * rays + FLARE * 0.9 + 1.8 * gFlux * GATE) * (0.9 + 0.25 * PUNCH);   // PUNCH: a punchy low end reaches further   // AUDIO-5X: flux throws flares
    float env = exp(-max(r - RH, 0.0) / reach);
    vec3 corona = mc(14.0, 0.75 + 0.2 * rays) * env * (0.55 + 0.75 * rays) * CORONA_GLOW * (1.0 + 2.0 * gFlux * GATE);   // orange ↔ coral flares

    // photon ring
    float pr = exp(-pow((r - RH * 1.06) / (RH * 0.05), 2.0));
    vec3 ring = mc(14.0, 0.8) * pr * 0.35 * (1.0 - m);   // KICK-WAVES: faint photon ring on the black hole only; gone once the eye forms, no kick slam

    float outside = smoothstep(RH * 0.98, RH * 1.03, r);
    col = mix(sunDisc(d, RH * (1.0 + 0.06 * gBass * GATE)), col, outside);   // SUN-DISC replaces the black horizon
    vec3 cAdd = (corona * (1.0 - 0.55 * m) + ring) * outside;
    col = col * (1.0 - 0.5 * clamp(max(cAdd.r, max(cAdd.g, cAdd.b)) * 1.5, 0.0, 1.0)) + cAdd;   // NO-GREY-HALO: occlude, don't stack orange on blue

    // PLASMA-BALL: the eye is one powerful glowing plasma sphere — no black, no straight spokes. The
    // sun disc swells into it as the morph runs. Domain-warped plasma with curling magnetic arcs over a
    // bulged (spherical) surface, bright volumetric core, limb glow, and a corona boiling off the edge
    // into the ray roots. Audio, all light/rate: bass swells the ball and its core, mids spin the
    // surface (bs_diskPh rate), treble crackles the arcs, flux throws limb flares, kicks surge it.
    float G = GATE;
    float RI = HOLE_R * 3.3;
    float pupR = RH * (1.0 - 0.16 * gPump * G * m);           // the shutter closes down to this
    float RB = mix(RH, RI * 0.92, m);
    col = plasmaBall(col, d, RB, m);

    // SHUTTER: on a section change the eye resizes behind a camera aperture — N overlapping blades
    // swing in (spiral edges) and out again while bs_shutterAng turns them. Cover is 0 between events.
    if (bs_shutter > 0.001) {
        float N = 8.0, seg = TAU / N;
        float ang = a - bs_shutterAng * TAU - 0.9 * log(r / RH);           // spiral blade edges
        float local = mod(ang, seg) - 0.5 * seg;
        float apR = mix(RI, pupR * 0.9, bs_shutter);                       // aperture closes to the pupil and reopens
        float poly = r * cos(local) / cos(0.5 * seg);                      // N-gon distance
        float blade = smoothstep(apR - 0.004, apR + 0.004, poly) * (1.0 - smoothstep(RI * 1.0, RI * 1.06, r));
        float edge = exp(-pow((poly - apR) / (RH * 0.04), 2.0)) + 0.6 * exp(-pow(local / 0.02, 2.0)) * step(apR, poly);
        vec3 bladeC = mc(10.0, 0.45 + 0.25 * (0.5 + 0.5 * cos(local * N))) + mc(8.0, 0.9) * edge * 0.8;
        col = mix(col, bladeC, blade * smoothstep(0.0, 0.25, bs_shutter));
    }

    // GARGANTUA: tilted accretion disk around the shadow (black-hole phase; a ghost of it stays as the
    // eye forms). Analytic 2D lensing: the near side crosses in front of the shadow, the far side is
    // lensed UP and over the top (and faintly under) as a ring hugging the shadow; thin photon ring;
    // Doppler beaming — the approaching side hot pale gold, the receding side ember. Turbulence turns
    // on the monotonic controller clock bs_diskPh, inner orbits faster than outer.
    float G2 = GATE;
    float diskAmp = (0.45 + 1.6 * gBass * G2 + 0.8 * gKick * G2) * (1.0 - m);   // NO-HAT: the disk belongs to the black-hole phase; a ghost of it over the ball read as a dome     // AUDIO-5X: bass + kick flare
    vec3 diskSum = vec3(0.0);
    vec2 dd = rot2(-0.12) * d;
    float incl = 0.20;                                                     // edge-on squash
    vec2 de = vec2(dd.x, dd.y / incl);
    float er = length(de);
    float ea = atan(de.y, de.x);
    float rin = RH * 1.45, rout = RH * 5.5;
    float bandP = smoothstep(rin, rin * 1.12, er) * (1.0 - smoothstep(rout * 0.7, rout, er));
    // NO-WINDING: inner and outer disk rotate rigidly at different speeds and blend by radius
    // (a radius-dependent orbit phase winds into ever-tighter rings).
    float turbI, turbO;
    {
        vec2 qd = vec2(ea * 4.0 + bs_diskPh * 4.0, log(er / RH) * 2.4);
        for (float i = 1.0; i < 4.0; i++) qd += sin(qd.yx * i + i * 1.3) / i * (0.45 + 0.5 * gMids * G2);   // mids: turbulence
        turbI = 0.5 + 0.5 * sin(qd.x + qd.y * 0.5);
        qd = vec2(ea * 4.0 + bs_diskPh * 1.6, log(er / RH) * 2.4);
        for (float i = 1.0; i < 4.0; i++) qd += sin(qd.yx * i + i * 1.3) / i * (0.45 + 0.5 * gMids * G2);
        turbO = 0.5 + 0.5 * sin(qd.x + qd.y * 0.5);
    }
    float turb = mix(turbI, turbO, smoothstep(rin, rout * 0.7, er));
    turb = mix(0.5, turb, 0.7 + 0.6 * gMids * G2);
    float dop = 0.5 + 0.5 * cos(ea);                                       // approaching side = +x
    float glint = pow(turb, 10.0) * clamp(gTreb * 2.5, 0.0, 1.0) * G2;    // treble hot spots
    vec3 diskC = sunLch(0.55 + 0.2 * turb, 0.19, mix(24.0, 40.0, dop)) * (0.35 + 1.1 * dop * dop);   // DISK-MAGENTA: hot magenta/red so it separates from the gold ball
    diskC += mc(14.0, 1.0) * glint * 1.5;
    // near (front) half of the primary image: drawn over the shadow
    float front = step(dd.y, 0.0);
    diskSum += diskC * bandP * diskAmp * mix(outside, 1.0, front) * (0.5 + 0.5 * turb);
    // lensed far side: a ring hugging the shadow, bright over the top, faint underneath
    float sa = atan(dd.y, dd.x);
    float halo = exp(-pow((r - RH * 1.42) / (RH * 0.26), 2.0)) * outside;
    float over = mix(0.30, 1.0, smoothstep(-0.4, 0.7, sin(sa)));
    vec2 q2 = vec2(sa * 4.0 + bs_diskPh * 2.4, log(r / RH) * 2.4);
    for (float i = 1.0; i < 3.0; i++) q2 += sin(q2.yx * i + i * 2.1) / i * 0.5;
    float turb2 = 0.5 + 0.5 * sin(q2.x + q2.y * 0.5);
    float dop2 = 0.5 + 0.5 * cos(sa);
    diskSum += sunLch(0.55 + 0.15 * turb2, 0.18, mix(24.0, 40.0, dop2)) * halo * over * (0.4 + 0.6 * turb2) * (0.3 + 0.9 * dop2) * diskAmp * 0.9;
    // photon ring: thin, hugging the shadow, swells with the bass
    float prW = RH * (0.018 + 0.03 * gBass * G2);
    float pr2 = exp(-pow((r - RH * 1.04) / prW, 2.0));
    diskSum += mc(mix(9.0, 7.0, dop2), 0.95) * pr2 * (0.5 + 1.6 * gBass * G2 + 0.8 * gKick * G2) * (1.0 - m);   // photon ring only in the black-hole phase — no gold outline on the ball
    float dM = max(max(diskSum.r, diskSum.g), max(diskSum.b, 1e-4));
    float dK = dM < 0.5 ? dM : 0.5 + 0.35 * (1.0 - exp(-(dM - 0.5) / 0.35));
    col = col * (1.0 - 0.5 * clamp(dM, 0.0, 1.0)) + diskSum * (dK / dM);   // GARGANTUA: knee-limited, and the disk occludes what's behind it
    return col;
}

// ============================================================================
// TENDRILS (TENDRILS-CONT) — the urchin, rebuilt as continuous curves rooted on the limbal ring and
// running out past the frame edge. Log-polar around the eye: the whole field shares one curl
// (shear in log-radius) + one sway, so each pixel only checks its own tendril and its neighbours.
// Shape ← slow stats (controller-smoothed); motion ← monotonic phases whose RATE audio sets; light ←
// smoothed envelopes. Nothing audio-driven touches an angle directly.
// ============================================================================
vec4 tendrilLayer(float a, float sl, float N, float layer, float m) {
    float wave = mix(1.2, 4.0, gWave);
    float swayPh = gFlexPh * TAU * (layer < 0.5 ? 1.0 : 2.0);
    float shear = fieldShear(sl, layer);
    shear += gBendAmt * min(sl, 2.5) * sin(gBendDir - a);           // COMPANION: rays lean toward the other star (gravity / magnetic pull)
    float x = (a - shear) / TAU * N;
    vec3 acc = vec3(0.0); float cov = 0.0;
    for (float k = -1.0; k <= 1.0; k++) {
        float id = floor(x) + k;
        float h = hash12(vec2(id - N * floor(id / N), layer * 7.31 + 3.0));
        float own = 0.10 * sl * sin(sl * wave * 0.7 - swayPh + h * TAU);   // per-ray sway (< half a cell)
        float dx = x - (id + 0.5 + own / TAU * N);
        // SUN-RAYS: a few long dominant rays among many short thin ones; wide glowing base at the eye,
        // tapering to a fine fading tip; soft volumetric falloff across the ray, no tube rim.
        float major = step(0.68, h);
        float reachA = (0.8 + 0.7 * bs_build) * sqrt(max(bs_power, 0.05));   // LEGIBLE build: rays lengthen as the energy builds   // story power: reach   // AUDIO-5X: ray reach pumps with bass/energy envelopes
        float len = reachA * (major > 0.5 ? mix(1.6, 2.6, gLen) * (0.9 + 0.3 * fract(h * 7.13))
                                : mix(0.45, 1.3, gLen) * (0.55 + 0.9 * fract(h * 3.71)));   // reach in log-radius (edge ≈ 1.7)
        // FAR-REACH: in reach mode (bs_reach) a ray's length is set in SCREEN distance, not relative to
        // the ball — a tiny sun throws rays past the frame edges. Bass/energy still pump it (reachA).
        float far = log(max(reachA * (major > 0.5 ? mix(2.6, 3.4, fract(h * 5.3)) : mix(1.0, 2.2, fract(h * 2.9))) / max(gR0, 1e-3), 1.2));
        len = mix(len, max(len, far), bs_reach);
        float u = sl / len;                                              // 0 base → 1 tip
        if (u >= 1.0) continue;
        float w = mix(0.36, 0.66, gThick) * (major > 0.5 ? 1.0 : 0.5)   /* SUN-RAYS2: glowing bases — DARK-FLOOR: slimmer so the blue ground survives */ * (1.0 - 0.45 * layer)
                * (1.0 - 0.82 * u) / (1.0 + 0.45 * sl);
        w = max(w, 0.02) * 0.75;                  // HAZE-CUT: slimmer at rest; HAZE-CAP: half the bass width pump (loud frames flooded the sky pink)                  // bass: glow width pumps with the brightness
        float e = exp(-pow(dx / w, 2.0));                                // body glow
        float halo = exp(-abs(dx) / (w * 2.4));                          // light thrown onto the sky
        float core = exp(-pow(dx / (w * 0.30), 2.0));                    // hot filament
        float I = smoothstep(-0.05, 0.3, sl) * pow(1.0 - u, 1.2)   /* NO-SPOKES: roots fade up just outside the ball body, so bright rays never show as straight spokes across it */ * (major > 0.5 ? 1.0 : 0.7) * bs_power   // fades with distance from the eye; story power: brightness
                * 0.75;   /* SURGE-GAIN: the big bass/kick surge is applied after compositing as a gain on what's there (see SURGE-GAIN below) */   /* CALM-1: lower rest + softer kick — lum was 0.5, flicker 0.68 */                    // AUDIO-5X: bass + kick pump the rays (rest lower → headroom to pump into)
        float G = GATE;
        float flux = 0.0;   // flux pulses run outward
        float grain = 1.0 - 0.8 * gRough * G * (0.5 + 0.5 * cos(sl * 38.0 + h * 40.0));                  // roughness crackle
        float grad = mix(1.45 - 0.9 * u, 0.55 + 0.9 * u, gCentroid);                                       // centroid: bright bases ↔ bright tips
        float rootBoost = 1.0;                                   // bass floods the bases
        float lit = grad * grain;   // SUN-RAYS3: rays read as light even in a quiet passage
        float rHue = mix(88.0, 24.0, pow(u, 0.8))   /* NO-MAGENTA: tips end crimson */ + 15.0 * (h - 0.5) * 2.0 - (layer > 0.5 ? 18.0 : 0.0);   // RAY-GRADE: yellow root → amber → ember → red-magenta tip, ±15° per ray
        vec3 rayC = sunLch(mix(0.80, 0.62, u) * (0.75 + 0.25 * core), 0.16, rHue);
        vec3 c = rayC * (1.3 * e + 0.07 * halo + 0.7 * core) * lit * I;
        float tipSpark = pow(max(0.0, cos(sl * 14.0 - gFlow * TAU * 4.0 + h * TAU)), mix(18.0, 6.0, clamp(gTreb * 1.5, 0.0, 1.0))) * smoothstep(0.25, 0.9, u);   // treble: sparks thicken and race out; low spatial freq so they don't shimmer
        c += mc(14.0, 1.0) * tipSpark * core * clamp(gTreb * 3.0, 0.0, 1.0) * G * 3.2 * smoothstep(1.0, 0.8, u);   // LEGIBLE hats: glints race out at the tips
        // LEGIBLE snare: one bright spark ring bursts out along every ray per mid-band hit — countable
        float snF = exp(-pow((u - bs_snAge * 1.15) / 0.04, 2.0)) * bs_snAmp * pow(1.0 - bs_snAge, 2.0) * (layer < 0.5 ? 1.0 : 0.5);   // eased fade as the ring flies out
        c += pow(gamutLch(vec3(0.86, 0.12, radians(95.0))), vec3(1.0 / 2.2)) * snF * (0.6 * e + 1.2 * core) * 2.2;   // AUDIO-5X   // treble: gold glints race out along the rays
        if (layer < 0.5 && abs(mod(id, N) - floor(bs_fId * N)) < 0.5) {      // FLUX-FLARE: a plasma blob breaks off the limb and rides one ray out
            float fb = exp(-pow((u - bs_fAge * 1.1) / 0.07, 2.0)) * (1.0 - bs_fAge) * bs_fAmp;
            c += sunLch(0.82, 0.14, 70.0) * fb * e * 2.2;
        }
        acc += c;                                                        // rays EMIT: light adds, the final soft-limit keeps it off white
        cov = max(cov, e * I);
    }
    return vec4(acc, cov);
}

// returns (colour, cover); q = position relative to the eye
vec4 urchin(vec2 q, float m) {
    float r = max(length(q), 1e-4);
    float a = atan(q.y, q.x);
    float r0 = mix(HOLE_R * 1.4, HOLE_R * 3.3 * 0.86, m);              // roots start inside the iris and grow out of its fibres
    gR0 = r0;
    float sl = log(r / r0);
    if (sl < -0.12) return vec4(0.0);                                  // SOFT-LIMB: roots start inside the limb and fade up through the glow
    vec4 back = tendrilLayer(a, sl, 41.0, 1.0, m);                    // thin, counter-turning
    vec4 front = tendrilLayer(a, sl, 26.0, 0.0, m);                   // fat, the main field
    vec4 o;
    o.rgb = front.rgb + back.rgb * 0.6;   // SUN-RAYS: light from both layers adds
    o.a = max(front.a, back.a * 0.8);
    return o;
}

void mainImage(out vec4 O, in vec2 g) {
    vec2 r = iResolution.xy;
    float ar = r.x / r.y;
    vec2 uv0 = (g + g - r) / r.y;
    float t = bs_time;                                        // monotonic, no 1000 s wrap (controller)
    float sm = 3. / r.y;
    gPhase = HUE_BASE + t * 0.006 + HUE_SPIN + seed;
    // controller state first — sky() and everything after reads it
    float m = smoothstep(0.0, 1.0, bs_eye);                  // one-way black-hole → eye morph
    gBass = bs_bass; gMids = bs_mids; gTreb = bs_treb; gEnergy = bs_energy; gEntropy = bs_entropy;
    gCentroid = bs_centroid; gPump = bs_pump; gDrop = bs_drop; gFlow = bs_flow;
    gCurl = bs_curl; gDir = bs_dir; gFlex = bs_flex; gWave = bs_wave; gLen = bs_len; gThick = bs_thick;
    gTwist = bs_twist; gFlexPh = bs_flexPh; gFlux = bs_flux; gRough = bs_rough;
    gSwell = 1.0 + 0.13 * bs_kick * GATE;   // LEGIBLE kick: the main star punches ~13% bigger on each kick   // ~+10% on a kick (kick envelope: ~3 frame attack, ~400 ms release)
    gKick = bs_kick; gKAge = bs_kAge; gKAmp = bs_kAmp; gCrest = bs_crest; gPal = bs_pal; gRoll = bs_roll;

    // ── gravitational lens: everything bends around the hole (flips inside the Einstein ring)
    vec2 d0 = uv0 - SUN;
    float rr = max(length(d0), 1e-4);
    float RE = HOLE_R * 1.6 * (1.0 + 1.6 * bs_pull);           // story pull: the collapse bends space harder
    vec2 uv = SUN + d0 * (1.0 - RE * RE / (rr * rr));

    // backdrop: Van Gogh tile sky + lattice spiralling into the hole, kept dim behind the urchin
    vec3 bg = mix(sky(uv, t, sm), deepSpace(uv), smoothstep(0.0, 0.7, bs_night)) * (1.0 - 0.35 * bs_dark);   // NIGHT-FLOOR: dark acts dim the sky less (night acts sat at lum 0.03)   // NIGHT-LIFT: dark acts stay readable on a projector (0.8 left DYING at lum 0.03)   // story night: Van Gogh day → deep space; dark dims


    // the urchin radiates from the eye: same centre, unlensed, roots on the limbal ring
    gBendDir = atan(bs_cY - SUN.y, bs_cX - SUN.x); gBendAmt = 0.3 * bs_cOn * smoothstep(1.6, 0.4, length(vec2(bs_cX, bs_cY) - SUN));
    vec4 urc = urchin(d0, m);
    gBendAmt = 0.0;
    float rayM = max(max(urc.r, urc.g), max(urc.b, 1e-4));
    float rayK = rayM < 0.55 ? rayM : 0.55 + 0.25 * (1.0 - exp(-(rayM - 0.55) / 0.25));   // rays peak (≤ 0.80) below the ball core (≤ 0.92)
    vec3 rays = urc.rgb * (rayK / rayM);   // SUN-RAYS: hue-preserving knee — linear up to 0.55 so pumps read, soft above
    // HAZE-CAP: summed ray light may not swamp the sky — beyond twice the sky's own brightness the
    // glow is soft-limited (hue-preserving), so the ground keeps its colour even on the loudest frame
    vec3 sky0 = bg * 0.8;                                        // NIGHT-FLOOR: deep space is already dark; scaling it again crushed night to black                // DAY-BLUE: the cobalt tile sky is back by day; night keeps the deep floor
    float skyL = max(dot(sky0, vec3(0.2126, 0.7152, 0.0722)), 0.03);
    float rayL = dot(rays, vec3(0.2126, 0.7152, 0.0722));
    float capL = 0.08 + 1.4 * skyL;                             // SURGE-MULT: ray light capped relative to the sky it sits on, so ≥ a third of the frame keeps its blue base on a peak
    rays *= rayL > capL ? (capL + 0.25 * (rayL - capL)) / rayL : 1.0;
    vec3 f = sky0 + rays;
    // SURGE-GAIN: the beat surge multiplies the tiles + rays already under the ray field (brighter and
    // more saturated where there is content), instead of adding peach light. Rides the background-rate
    // envelopes so a whole-region gain can't strobe; ray-free sky keeps its base.
    float sg = 1.0;
    f *= sg;   // CLEAN-HALO: rays only add light onto the sky, never darken beside themselves   // DARK-FLOOR2: deeper ground so the frame has a dark floor

    // PERF-NOFLOWERS: sunflower field removed (user: too slow) — urchin + sky fill the frame

    f -= fbm(uv0 * 100.0) * 0.05;                           // canvas grain (unlensed — it's the canvas)
    f = max(f, vec3(0.0));

    // ── the black sun at the urchin's heart, drawn in screen space over the lensed world
    f = f * (1.0 - 0.45 * clamp(bs_abstract, 0.0, 1.0)) + nebula(uv0) * clamp(bs_abstract, 0.0, 1.0) * 0.55;   // story abstract: translucent plasma veils over a darkened scene — stars and sky show through
    // BINARY: the companion's rays (bending toward the main star) go in before the main star is drawn
    vec2 C = vec2(bs_cX, bs_cY);
    vec2 dC = uv0 - C;
    float compR = 0.16 * 3.3 * 0.92 * ZOOM * 0.42;
    float sepV = length(C - SUN);
    if (bs_cOn > 0.01) {
        float sb = gBass, sk = gKick;
        gKick = 0.0;   // LEGIBLE melody: the companion answers pitch movement (bs_pitchMove), nothing else
        gHeatOv = 0.32;
        gBendDir = atan(SUN.y - C.y, SUN.x - C.x); gBendAmt = 0.55 * smoothstep(1.6, 0.4, sepV);
        float rC = max(length(dC), 1e-4), r0C = compR * 0.85;
        gR0 = r0C;
        float slC = log(rC / r0C);
        if (slC > -0.12 && rC < 1.3) {   // PERF: companion rays only within reach
            vec4 cr = tendrilLayer(atan(dC.y, dC.x), slC, 14.0, 0.0, 1.0);
            f += cr.rgb * (0.4 + 1.3 * bs_pitchMove) * bs_cOn;
            // RAY-CROSS: where a main-star ray and a companion ray overlap, the touch shows in a stark
            // contrasting colour — the gold/crimson rays' complement (electric cyan → violet, swaying on
            // the slow palette clock), brightest where both are strong, flaring on kicks/treble and kisses
            float xr = urc.a * cr.a * bs_cOn;
            float xAmp = xr * 0.9 * (1.0 + 1.5 * bs_kiss + smoothstep(1.2, 0.4, sepV));
            f += pow(gamutLch(vec3(0.78, 0.15, radians(200.0 + 25.0 * sin(gPal * TAU)))), vec3(1.0 / 2.2)) * xAmp * 1.4;
            f += pow(gamutLch(vec3(0.88, 0.07, radians(215.0))), vec3(1.0 / 2.2)) * pow(xr, 3.0) * 1.2;   // sparkle at the crossing points
        }
        gBass = sb; gKick = sk; gHeatOv = -1.0; gBendAmt = 0.0;
    }
    f = blackSun(f, d0, t, m);
    if (bs_cOn > 0.01) {
        // BRIDGE: when the stars are close a plasma bridge arcs between them; a kiss flares it.
        // Turbulent glow along a bowed path, flowing on the orbit clock; hue runs gold → crimson.
        vec2 ab = C - SUN;
        float L2 = max(dot(ab, ab), 1e-4);
        float tB = clamp(dot(uv0 - SUN, ab) / L2, 0.0, 1.0);
        vec2 nrm = vec2(-ab.y, ab.x) / sqrt(L2);
        vec2 onB = SUN + ab * tB + nrm * sin(3.14159 * tB) * (0.12 + 0.08 * sin(bs_diskPh * 0.3));
        float dB = length(uv0 - onB);
        float bAmt = bs_cOn * (0.45 * smoothstep(1.4, 0.45, sepV) + 1.4 * bs_kiss);
        float flow = 0.5 + 0.5 * sin(tB * 14.0 - bs_diskPh * 2.0 + noise(uv0 * 3.0) * 3.0);
        float wB = 0.025 + 0.03 * bs_kiss + 0.02 * flow;
        gHeatOv = mix(1.0, 0.32, tB);
        f += sunLch(0.78, 0.15, 60.0) * exp(-dB * dB / (wB * wB)) * bAmt * (0.5 + 0.7 * flow) * smoothstep(0.0, 0.08, tB) * smoothstep(1.0, 0.92, tB);
        // the companion itself: small dark-red plasma ball, same rendering language as the main star
        float sb = gBass, sk = gKick;
        gKick = 0.0;
        gHeatOv = 0.32;
        if (length(dC) < compR * 3.0) {   // PERF: the companion ball + corona only near it
            vec3 withC = plasmaBall(f, dC, compR * (1.0 + 0.12 * bs_pitchMove + 0.15 * bs_kiss), 1.0);
            // NO-DISC: the melody gain rides the ball + corona only and is 1.0 well inside the PERF cutoff —
            // scaling the whole 3×compR circle (sky included) drew a hard-edged pale/dark disc round the companion
            float cGain = mix(1.0, 0.7 + 0.7 * bs_pitchMove, 1.0 - smoothstep(compR * 0.9, compR * 2.0, length(dC)));
            f = mix(f, withC * cGain, bs_cOn);
        }
        gBass = sb; gKick = sk; gHeatOv = -1.0;
    }

    // STORY-SUPERNOVA: no painted shell. The shock is a distortion front (below, in the previous-frame
    // warp); here it only LIGHTS what it has crossed — everything inside the expanding front glows in
    // the gas hues, wall to wall within ~6 s, fading with the flash. Brightness stays in the frame budget.
    float Rs = bs_shell * 0.35;
    float lit = smoothstep(Rs + 0.25, Rs - 0.35, rr) * bs_nova;
    float shN = s_noise(uv0 * 1.3 + bs_galPh * 0.1);
    f += gasHue(shN + rr * 0.4, 0.6) * lit * (0.25 + 0.35 * shN);

    // KICK-WAVES (replaces the painted ripple): the eye keeps the black hole's gravity, and every kick
    // launches a gravitational wavefront. It is pure DISTORTION — the previous frame is refracted
    // through a travelling lens bump; nothing on the wavefront is painted or brightened. Radius grows
    // monotonically with the controller kick-age (0→1 over 3 s, reset only by a new kick); audio sets
    // only the amplitude. Between kicks a slow inward swirl keeps the gravity well alive.
    vec2 sUV = g / r;
    float RIg = HOLE_R * 3.3;
    float fallG = smoothstep(RIg * 1.02, RIg * 1.35, rr) * exp(-max(rr - RIg, 0.0) * 0.9);
    float outG = smoothstep(RIg * 1.0, RIg * 1.3, rr);
    float Rk = RIg * 1.05 + bs_wAge * 1.5;                     // BIG-WAVES: one front per LARGE audio change (controller), ~0.25/s over a 6 s life — crosses the frame
    float wW = 0.035 + 0.03 * bs_wAge;                          // thin front, spreads a little as it travels
    vec2 dW = uv0 - vec2(bs_waveX, bs_waveY);
    float rw = max(length(dW), 1e-4);
    float xk = (rw - Rk) / wW;                                 // BINARY: fronts expand from where they were fired (sun, or the kiss point)
    float envK = bs_wAmp * exp(-bs_wAge * 1.5) * GATE;
    float lens = -xk * exp(-xk * xk) * 1.6487;                  // derivative-of-gaussian bump, peak ±1
    float ampK = 1.3 * envK * outG;   // BIG-WAVES: ~2.4× the lensing of the old kick fronts   // KICK-BEND: fronts bend the rays ~2.5× harder     // KICK-WAVES2: thin + intense lensing line  // kick front + a little bass breathing
    float xs = (rr - bs_shell * 0.35) / 0.06;
    vec2 pS = rot2(0.006 * fallG) * d0 * (1.0 - 0.003 * fallG - 0.03 * bs_kick * GATE * exp(-rr * 2.0)) +   /* LEGIBLE kick: a short lensing thump around the sun */ dW / rw * lens * ampK - d0 / rr * xs * exp(-xs * xs) * 1.6487 * 0.35 * bs_nova;   // + the supernova shock front
    vec2 uvS = ((pS + SUN) * r.y + r) / (2.0 * r);
    vec3 prevG = getLastFrameColor(uvS).rgb;
    float eyeZone = m * (1.0 - smoothstep(HOLE_R * 3.3, HOLE_R * 3.6, rr));
    eyeZone = max(eyeZone, bs_cOn * (1.0 - smoothstep(compR * 1.6, compR * 2.2, length(uv0 - vec2(bs_cX, bs_cY)))));   // the companion renders fresh too — no 8-bit feedback over it
    float waveW = exp(-xk * xk * 0.5) * clamp(envK * 3.0, 0.0, 1.0) * outG;   // let the refracted frame show through on the front
    f = mix(f, prevG * 0.96, clamp(0.42 * fallG + 0.45 * waveW, 0.0, 0.8) * (1.0 - eyeZone));
    // NO-TERRACE: the old EYE-LOWPASS mixed 35% of the previous frame back into the ball every frame.
    // The framebuffer is 8-bit, so that feedback snapped slow gradients to flat steps — the terraces
    // in the sun's interior. The fibres it was smoothing are long gone; the ball renders fresh.

    f = max(f, vec3(0.0));
    // BUDGET: one hue-preserving soft knee on the FINISHED frame, in OKLab L (chroma kept), instead of
    // per-layer limiters that still stacked into whole-frame washes on loud moments. Below L 0.6 nothing
    // changes, so surges still read as local contrast; above it everything converges toward ~0.82.
    // GAMMA: f is sRGB-encoded (every colour is built in linear OKLCH and encoded once), so decode
    // before OKLab and re-encode after. The knee only ever lowers L; chroma is kept and lifted 15%
    // (VIVID — additive layers of different hues average toward grey), then gamut-mapped in OKLCH.
    // Nothing is ever mixed toward grey.
    vec3 lchB = rgb2oklch(pow(max(f, vec3(0.0)), vec3(2.2)));
    float LB = lchB.x < 0.6 ? lchB.x : 0.6 + 0.22 * (1.0 - exp(-(lchB.x - 0.6) / 0.22));
    f = pow(gamutLch(vec3(LB, lchB.y * (1.15 + 0.12 * TONAL), lchB.z)), vec3(1.0 / 2.2));
    f *= min(1.0, 0.93 / max(max(f.r, f.g), max(f.b, 1e-4)));   // NEVER-WHITE: scale, don't clip — hue survives
    f *= FADE;   // K10: after the knee, so fading never shifts hue; the feedback zone reads it back and dims a touch faster
    f += (hash12(g + fract(bs_time) * 61.0) - 0.5) / 255.0;   // SOFT-BANDS: 1-LSB dither against 8-bit stepping in dark gas
    f = clamp(f, 0.0, 1.0);   // NO-OVERFLOW: never an out-of-range value into the framebuffer (the feedback reads it back). NOT isnan/isinf: on this GPU (ANGLE/Metal, fast-math) that blacked the whole wall
    O = vec4(f, 1.0);
}
