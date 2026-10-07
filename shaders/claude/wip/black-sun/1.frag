// @fullscreen: true
// @mobile: false
// @tags: urchin, blackhole, sun, lattice, psychedelic, vangogh, claude
// preset: https://visuals.beadfamous.com/?shader=claude/wip/black-sun/1
// BLACK SUN (1.frag) — wip/urchin is the backbone: its spherized field of tube-spines radiates
// from a black hole (wip/black-hole) whose accretion is a psychedelic sun. Behind it, the Van Gogh
// tile sky from wip/sunflowers with the hex mirror-fold lattice from redaphid/lattice-interactive/3
// spiralling into the hole forever; a sunflower field along the bottom. Everything is lensed.
//   GEOMETRY: iTime only (lens, urchin clock, perpetual log-polar lattice zoom, disk spin, drift).
//   LIGHT:    all the audio (corona glow, flares, rim punch, lattice sparkle, sky glow).
//   COLOR:    slow medians/means only.
// Shader-only — no controller needed.

#define TAU 6.28318530718
#define PI  3.14159265359
#define PAL(t, a, b, c, d) ( a + b*cos( TAU*(c*t+d) ) )

#define smoothing 0.006
#define lineSize  0.01

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================
#define GATE (smoothstep(0.01, 0.06, energyMean))
// #define GATE 0.0

// LIGHT: corona brightness swells with the low end
#define CORONA_GLOW (0.70 + 0.45 * bassNormalized * GATE)
// #define CORONA_GLOW 0.85

// LIGHT: flare reach — spiky spectra throw the corona further out
#define FLARE (clamp(spectralCrestZScore, 0.0, 1.0) * GATE)
// #define FLARE 0.0

// DISTORTION: kicks launch gravitational wavefronts (refraction of the previous frame, no paint)
#define KICK (clamp(bassZScore, 0.0, 1.0) * GATE)
// #define KICK 0.0

// LIGHT: sky tiles breathe with the mids
#define SKY_GLOW (0.90 + 0.22 * midsNormalized * GATE)
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

// ── TENDRIL SHAPE: slow stats only, each EMA'd again in the stash (a=0.004, ~4 s) so a median
//    stepping at a track change bends the field instead of snapping it. All map to 0..1.
// curl amount ← brightness centre of the mix (tonal domain)
#define F_CURL (smoothstep(0.08, 0.40, spectralCentroidMedian))
// #define F_CURL 0.5
// curl direction ← spectral tilt (dark-leaning mixes curl one way, bright-leaning the other)
#define F_DIR (smoothstep(0.30, 0.70, spectralSkewMean))
// #define F_DIR 0.75
// flex sway amplitude ← the low end's typical level
#define F_FLEX (smoothstep(0.03, 0.16, bassMedian))
// #define F_FLEX 0.5
// waviness (sway wavelength along the tendril) ← how chaotic the spectrum usually is
#define F_WAVE (smoothstep(0.60, 0.95, spectralEntropyMedian))
// #define F_WAVE 0.5
// reach ← where the highs usually die off
#define F_LEN (smoothstep(0.10, 0.45, spectralRolloffMean))
// #define F_LEN 0.5
// thickness ← peakedness (focused spectra → thin wiry tendrils, diffuse → fat)
#define F_THICK (1.0 - smoothstep(0.25, 0.75, spectralKurtosisMedian))
// #define F_THICK 0.5
// ── TENDRIL MOTION: audio sets the RATE of monotonic accumulators, never an angle
// twist rate ← confident energy trend (building drives the field round faster; ~0 when chaotic)
#define R_TWIST (0.006 + 0.03 * clamp(energySlope * energyRSquared * 3000.0, -0.15, 1.0))
// #define R_TWIST 0.006
// sway rate ← harmonic width
#define R_FLEX (0.03 + 0.10 * smoothstep(0.10, 0.40, spectralSpreadMean))
// #define R_FLEX 0.05
// ── TENDRIL LIGHT: smoothed envelopes, amplitude only
// outward light pulses ← timbral change (flux z-score, EMA'd)
#define L_FLUX (clamp(spectralFluxZScore * 0.5 + 0.5, 0.0, 1.0))
// #define L_FLUX 0.0
// grain/crackle along the tubes ← dissonance (roughness z-score, EMA'd)
#define L_ROUGH (clamp(spectralRoughnessZScore * 0.5 + 0.5, 0.0, 1.0))
// #define L_ROUGH 0.0
// gravity-wave amplitude ← low-end / loudness surges (z-scores, EMA'd) — AMPLITUDE only
#define L_GRAV (clamp(max(bassZScore, energyZScore) * 0.5 + 0.5, 0.0, 1.0))
// #define L_GRAV 0.3

// ── knobs (0 = the designed look) ──
#define HOLE_R      (0.12 + knob_1 * 0.10)   // K1 HOLE SIZE
#define HUE_SPIN    (knob_2)                  // K2 HUE SPIN
#define LATTICE_AMT (0.55 + knob_3 * 0.45)   // K3 LATTICE

#define SUN vec2(0.0, 0.10)
#define EYE_SECS 180.0
   // black-hole sun → iris eye, one way

float gPhase;   // slow colour phase (HUE_BASE + set clock + knob)
float gH0;      // ONE-PALETTE key hue (turns) — every colour in the frame is an offset of this

// ── IRIS-AUDIO: dodeca-bloom's controller, ported into the shader. Its state lives in a stash row
// (pixels 0..9 of row 0 of the feedback buffer, 16-bit per value, blue=77 signature), so no
// ?controller= and no reload. Same maths: slow EMAs (a=0.05), fast bass pump (a=0.28), latched
// drop glow, and a MONOTONIC flow phase whose RATE the music sets.
#define S_EYE 0.
#define S_BASS 1.
#define S_MIDS 2.
#define S_TREB 3.
#define S_ENERGY 4.
#define S_ENTROPY 5.
#define S_CENTROID 6.
#define S_PUMP 7.
#define S_DROP 8.
#define S_FLOW 9.
#define S_CURL 10.
#define S_DIR 11.
#define S_FLEX 12.
#define S_WAVE 13.
#define S_LEN 14.
#define S_THICK 15.
#define S_TWIST 16.
#define S_FLEXPH 17.
#define S_FLUX 18.
#define S_ROUGH 19.
#define S_RIPPH 20.
#define S_RIPA 21.
#define S_KICK 22.
#define S_KAGE 23.
#define S_KAMP 24.
#define S_CREST 25.
#define S_PAL 26.
#define S_ROLL 27.
#define S_COUNT 28.
float gBass, gMids, gTreb, gEnergy, gEntropy, gCentroid, gPump, gDrop, gFlow;
float gCurl, gDir, gFlex, gWave, gLen, gThick, gTwist, gFlexPh, gFlux, gRough, gRipPh, gRipA;
float gKick, gKAge, gKAmp, gCrest, gPal, gRoll;

float stashRead(float i) {
    vec3 c = getLastFrameColor((vec2(i, 0.0) + 0.5) / iResolution.xy).rgb;
    float ok = step(abs(c.b * 255.0 - 77.0), 0.5);           // anything not ours (hot-swap, reset) reads 0
    return ok * (floor(c.r * 255.0 + 0.5) + c.g) / 255.0;
}
vec4 stashWrite(float v) { v = clamp(v, 0.0, 0.99999); return vec4(floor(v * 255.0) / 255.0, fract(v * 255.0), 77.0 / 255.0, 1.0); }
float ema(float p, float x, float a) { return p + (clamp(x, 0.0, 1.0) - p) * a; }
// attack-fast / release-slow envelope: punches on the hit, glides back down — reactive without flicker
float envAR(float p, float x, float att, float rel) { x = clamp(x, 0.0, 1.0); return p + (x - p) * (x > p ? att : rel); }

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
// hue ± a bit. The whole table rotates together on gPal (a slow stash clock that starts at 0 on load),
// so the set opens on Miami beach and drifts into other psychedelic palettes over ~25 min.
const vec3 MIAMI[15] = vec3[15](
    vec3(0.80, 0.075, 78.0),   // 0  SAND            ┐
    vec3(0.70, 0.160, 30.0),   // 1  CORAL           │
    vec3(0.78, 0.125, 192.0),  // 2  AQUA/turquoise  │ the eye: Miami jewel
    vec3(0.64, 0.215, 352.0),  // 3  HOT PINK        │
    vec3(0.74, 0.165, 58.0),   // 4  SUNSET ORANGE   │
    vec3(0.48, 0.105, 222.0),  // 5  DEEP OCEAN      │
    vec3(0.46, 0.165, 300.0),  // 6  VIOLET          ┘
    vec3(0.58, 0.210, 12.0),   // 7  RED-MAGENTA     ┐
    vec3(0.60, 0.220, 352.0),  // 8  RASPBERRY       │ tendrils: warm roots →
    vec3(0.62, 0.220, 332.0),  // 9  MAGENTA         │ cool tips
    vec3(0.58, 0.190, 316.0),  // 10 RED-VIOLET      │
    vec3(0.66, 0.160, 304.0),  // 11 VIOLET-PINK     ┘
    vec3(0.60, 0.120, 245.0),  // 12 VAN GOGH SKY    ┐ background
    vec3(0.38, 0.120, 262.0),  // 13 DEEP BLUE       ┘
    vec3(0.86, 0.150, 95.0)    // 14 GOLD — glints, rim, kicks, stars
);
// HUE-LOCK: only the sky (12, 13) rides the full slow palette rotation; the eye, tendrils and gold
// sway at most ±20° around their designed hues, so tendrils stay raspberry→violet and never drift
// into the gold of the sky strokes. K2 HUE SPIN still turns everything.
vec3 miamiLinR(int i, float lit, float cMul, bool sway) {
    vec3 e = MIAMI[i];
    float L = min(e.x * lit, 0.86);
    float C = e.y * cMul * (0.55 + 0.45 * smoothstep(0.05, 0.35, L)) * (1.0 - smoothstep(0.82, 0.92, L));
    float rot = (sway ? radians(20.0) * sin(gPal * TAU) : gPal * TAU) + HUE_SPIN * TAU;
    float h = radians(e.z) + rot;
    // GAMUT-MAP: shrink chroma at constant L/hue until the colour fits sRGB — clamping RGB instead
    // flattened out-of-gamut hues (the neon-plastic teal) into saturated channels.
    vec3 c = oklch2rgb(vec3(L, C, h));
    if (min(min(c.r, c.g), c.b) < 0.0 || max(max(c.r, c.g), c.b) > 1.0) {
        float lo = 0.0, hi = C;
        for (int k = 0; k < 5; k++) {
            float mid = 0.5 * (lo + hi);
            vec3 cm = oklch2rgb(vec3(L, mid, h));
            if (min(min(cm.r, cm.g), cm.b) < 0.0 || max(max(cm.r, cm.g), cm.b) > 1.0) hi = mid; else lo = mid;
        }
        c = oklch2rgb(vec3(L, lo, h));
    }
    return clamp(c, 0.0, 1.0);
}
vec3 miamiLin(int i, float lit) { return miamiLinR(i, lit, 1.0, i != 12 && i != 13); }   // GOLD-LOCK: gold (14) is an accent, it sways ±20° like the eye/tendrils
// EYE-SKY: the sky's blues as the eye wears them — hue-locked like the tendrils, so the iris stays blue
// while the sky itself drifts.
vec3 skyLocked(int i, float lit) { return pow(miamiLinR(i, lit, 1.0, true), vec3(1.0 / 2.2)); }
// idx may be fractional: blends neighbouring palette entries (gradients along a tendril)
vec3 mc(float idx, float lit) {
    idx = clamp(idx, 0.0, 14.0);
    int i0 = int(floor(idx)); int i1 = min(i0 + 1, 14);
    return pow(mix(miamiLin(i0, lit), miamiLin(i1, lit), fract(idx)), vec3(1.0 / 2.2));
}

// EYE-TONE: the eye's additive stack (fibres × intensity × shimmer + collarette + limbus + pupil
// bloom) ran 3–10× over range on loud passages, so the frame-wide NEVER-WHITE scale flattened up to
// 79% of the eye into one plateau at 0.93. Compress it in OKLab instead: soft knee on L (peaks stay
// brighter, never flat), chroma eased off near the cap, then pulled toward the same-L grey just far
// enough to fit the gamut — hue survives, no channel saturates.
vec3 eyeTone(vec3 c) {
    vec3 lab = rgb2oklab(max(c, vec3(0.0)));
    float L = lab.x;
    float Lt = L < 0.62 ? L : 0.62 + 0.28 * (1.0 - exp(-(L - 0.62) / 0.28));   // EYE-TONE2
    vec2 ab = lab.yz * (Lt / max(L, 1e-4)) * (1.0 - 0.25 * smoothstep(0.74, 0.90, Lt));
    vec3 rgb = oklab2rgb(vec3(Lt, ab));
    vec3 grey = vec3(Lt * Lt * Lt);
    float hi = max(max(rgb.r, rgb.g), rgb.b), lo = min(min(rgb.r, rgb.g), rgb.b);
    float k = 1.0;
    if (hi > 0.90) k = min(k, (0.90 - grey.r) / max(hi - grey.r, 1e-4));
    if (lo < 0.0) k = min(k, grey.r / max(grey.r - lo, 1e-4));
    return mix(grey, rgb, clamp(k, 0.0, 1.0));
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
    vec2 u = rotate2D(uv - SUN, noise(uv + t * .25) * .3);
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
    float cl = noise(cc * vec2(.5, 1) - vec2(t * .2, 0)) * step(-.25, cc.y);
    cl = smoothstep(.052, .055, cl);
    lc += noise(lc * vec2(1, 4) + id) * vec2(.7, .2);

    float L = length(uv - SUN);
    float ph = gPhase + 0.35 / (L + 0.35);                  // hue bends harder near the sun
    vec3 base = mc(12.0 + 0.8 * (0.5 + 0.5 * sin(sin(L - .1) + ph)), 0.55);   // VANGOGH-SKY: sky blue ↔ deep blue
    vec3 tile = mix(mc(12.0 + 0.9 * hash12(id), 0.85), mc(14.0, 0.80), cl);   // blue brush-tiles, gold star/cloud strokes
    vec3 f = mix(base * .35, tile, st(abs(lc.x - .5), .4, sm * yd) * st(abs(lc.y - .5), .48, sm * xd));
    f *= SKY_GLOW;

    // LATTICE: log-polar → it zooms into the hole forever (self-similar, monotonic), spiral arms
    vec2 d = uv - SUN;
    float ang = atan(d.y, d.x);
    vec2 q = vec2(ang / TAU * 6.0, log(max(L, 1e-3)) * 0.95 - t * 0.045);
    q.x += q.y * 0.5;
    vec3 lat = lattice(q, t);
    float vis = smoothstep(1.7, 0.30, L) * LATTICE_AMT;
    vec3 latCol = mc(14.0, 0.55 + 0.3 * lat.y) * lat.x * LATTICE_LIT * (1.0 + SPARK * 0.8) * 1.6;
    f = mix(f, f * 0.55 + latCol, clamp(lat.z, 0.0, 1.0) * vis);

    // sunlight scattered into the sky — hue-cycling bloom around the hole
    f += mc(14.0, 0.85) * (0.25 + 0.9 * gBass * GATE) * 0.30 / (1.0 + L * 5.0);   // sun-glow on the sand, swells with bass
    f *= mix(1.0, 0.75 + 0.5 * smoothstep(0.2, 1.6, L), gRoll * GATE);         // rolloff pushes light to the outer field
    return f;
}
// FIBRE-COIL: one shear field for tendrils AND iris fibres. sl = log(r / root radius): > 0 out along
// the tendrils, < 0 inward through the iris toward the pupil — the same formula continued, so each
// fibre coils into its tendril as one strand with no seam at the root.
float fieldShear(float sl, float layer) {
    float curl = mix(0.20, 1.0, gCurl) * mix(-1.0, 1.0, gDir) * (1.0 - 0.35 * layer);   // SUN-RAYS: corona-streamer sway, gentler than the old snakes
    float wave = mix(1.2, 4.0, gWave);
    float flexA = mix(0.03, 0.16, gFlex);
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

vec3 blackSun(vec3 col, vec2 d, float t, float m) {   // m = EYE morph 0..1 (one-way)
    float RH = HOLE_R;
    float r = max(length(d), 1e-4);
    float a = atan(d.y, d.x);

    // turbulent log-polar corona (integer angular multiples → seamless)
    vec2 q = vec2(a * 3.0, log(r / RH) * 2.6 - t * 0.35);
    for (float i = 1.0; i < 6.0; i++) q += sin(q.yx * i + vec2(t * 0.5, -t * 0.3) + i * 1.7) / i * 0.55;
    float rays = 0.5 + 0.5 * cos(q.x * 2.0 + q.y * 0.6);
    float reach = RH * (0.55 + 0.9 * rays + FLARE * 0.9);
    float env = exp(-max(r - RH, 0.0) / reach);
    vec3 corona = mc(14.0, 0.75 + 0.2 * rays) * env * (0.55 + 0.75 * rays) * CORONA_GLOW;   // orange ↔ coral flares

    // photon ring
    float pr = exp(-pow((r - RH * 1.06) / (RH * 0.05), 2.0));
    vec3 ring = mc(14.0, 0.8) * pr * 0.35 * (1.0 - m);   // KICK-WAVES: faint photon ring on the black hole only; gone once the eye forms, no kick slam

    float outside = smoothstep(RH * 0.98, RH * 1.03, r);
    col = mix(vec3(0.02, 0.0, 0.035), col, outside);        // event horizon
    col += (corona * (1.0 - 0.55 * m) + ring) * outside;

    // EYE (EYE-NEON + IRIS-AUDIO): pupil + iris in the spines' language — glowing tubes on a dark
    // ground, same OKLCH wheel. Audio → anatomy is iris/7's mapping, fed by the in-shader
    // controller (smoothed envelopes, quiet-gated, phases monotonic; audio on amplitude/rate only).
    float G = GATE;
    float RI = HOLE_R * 3.3;                                  // limbus fixed; the pupil breathes inside it
    float pupR = RH * (1.0 - 0.16 * gPump * G * m);           // bass pump contracts the pupil (iris/7)
    float ir = clamp((r - pupR) / (RI - pupR), 0.0, 1.0);    // 0 pupil edge → 1 limbus
    vec2 cs = vec2(cos(a), sin(a));                           // circle coords → no atan seam
    float flowA = gFlow * TAU;                                // monotonic; only integer multiples used
    float wob = noise(cs * 2.0 + vec2(0.0, t * 0.01));
    float slI = log(r / mix(HOLE_R * 1.4, HOLE_R * 3.3 * 0.86, m)) * (1.0 - 0.5 * smoothstep(1.4 * pupR, pupR, r));   // FIBRE-COIL: tendril sl continued inward; coil eased right at the pupil where fibres converge
    float sx = (a - fieldShear(slI, 0.0)) / TAU * 26.0;       // FIBRES-ARE-TENDRILS: same index space + same curl as the front tendril layer
    float sx2 = (a - fieldShear(slI, 1.0)) / TAU * 41.0;      // …and the thin counter-turning layer
    float ph = sx * TAU;
    float aaW = clamp(fwidth(ph) * 0.6, 0.0, 1.0);
    float strandD = min(abs(fract(sx) - 0.5) * 2.0, abs(fract(sx2) - 0.5) * 2.0 * 1.6);
    float strand = exp(-pow(strandD / (0.55 * (1.0 - ir * 0.35)), 2.0));
    float core = exp(-pow(strandD / 0.10, 2.0));
    strand = mix(strand, 0.45, aaW); core = mix(core, 0.15, aaW);
    float ph2 = a * 17.0 - wob * 3.0 - ir * 3.0;              // broad under-stroma so the iris isn't spokes on black
    float under = 0.5 + 0.5 * cos(ph2);
    float collR = 0.32 + 0.03 * cos(a * 8.0);
    float coll = exp(-pow((ir - collR) / 0.035, 2.0));
    float limb = exp(-pow((ir - 0.95) / 0.07, 2.0));
    float crypts = pow(0.5 + 0.5 * cos(a * 12.0 + 1.3), 8.0) * exp(-pow((ir - 0.55) / 0.07, 2.0));

    // regions (iris/7): bass lights the core, mids the arms, treble the tips
    float coreW = smoothstep(0.45, 0.0, ir), tipW = smoothstep(0.55, 1.0, ir);
    float armW = clamp(1.0 - coreW - tipW, 0.0, 1.0);
    float bassDrive = clamp(gBass + gPump * 0.6, 0.0, 1.6);
    float regionGlow = (bassDrive * coreW + gMids * armW + gTreb * tipW) * G;
    float intensity = 0.45 + 2.0 * (1.0 - exp(-1.4 * regionGlow)) + 0.6 * gDrop * G;   // EYE-TONE: saturating, not multiplicative
    // radiation: bright bands travel outward on the flow phase, sized by bass
    float radiation = 1.0;   // KICK-WAVES: concentric travelling bands removed (user: no rings)
    // treble shimmer only when the low end is quiet (iris/7 trebleShimmer)
    // crypt blink: on chaotic passages the dark crypts open into glowing eyes (iris/7 cryptWink)
    float wink = clamp(gEntropy * 1.6, 0.0, 1.0) * G * smoothstep(0.4, 0.85, 0.5 + 0.5 * cos(a * 12.0 + flowA * 2.0));
    // sparkle glints on the strands with the highs
    float sparkle = pow(max(0.0, cos(ir * 23.0 + hash12(vec2(floor(sx), 5.7)) * 40.0 + flowA * 3.0)), 12.0)   /* GLINT-SCATTER: per-fibre phase so glints never line up into rings */ * clamp(gTreb * 2.0, 0.0, 1.0) * G * core;   // IRIS-GLINTS: on strand cores only

    // MIAMI-IRIS: each fibre wears its tendril's colour (same index space), graded to hot pink at
    // the pupil; violet/ocean ground for depth. Audio is BIG and enveloped (attack-fast/release-slow).
    float fid = floor(sx);
    float fc3 = mod(fid - 26.0 * floor(fid / 26.0), 3.0);
    float fibreCol = 7.0 + fc3 * 0.7;                                   // EYE-FROM-SCENE: each fibre wears its own tendril's raspberry/magenta root colour
    float shimmerM = 1.0 + 1.6 * gMids * G * (0.5 + 0.5 * cos(fid * 2.39996 + flowA * 4.0));     // mids shimmer the fibres, per fibre (not concentric)
    vec3 iris = mix(skyLocked(13, 0.95), skyLocked(12, 0.85), ir) * (0.35 + 0.25 * under) * intensity;     // the sky's deep blues, lifted
    float pl = eyePlasma(a, log(r / pupR), flowA);
    float plLow = smoothstep(pupR, pupR * 1.7, r) * (1.0 - smoothstep(0.80, 1.0, ir));   // low-passed out at the pupil (fibres converge there) and under the limbus
    iris += mc(8.0 + 3.0 * pl, 0.75) * pl * pl * plLow * (0.30 + 0.9 * gEnergy * G + 0.5 * gFlux * G);   // EYE-PLASMA: flows under the fibres in the rays' colours
    vec3 fibre = mix(mc(3.0, 0.9), mc(fibreCol, 1.0), smoothstep(0.15, 0.7, ir));   // hot pink at the pupil → tendril colour at the root
    iris += fibre * (0.30 + 0.55 * core) * strand * (0.5 + 0.5 * ir) * intensity * shimmerM * (0.8 + 0.7 * radiation * bassDrive * G);
    iris = mix(iris, mc(14.0, 0.75) * (0.75 + 0.6 * gMids * G), clamp(coll * 0.9, 0.0, 1.0));     // gold collarette (the sky's gold) — EYE-OPAQUE: laid over, not summed, so it can't wash to white
    iris *= 1.0 - 0.7 * crypts * (1.0 - wink);
    iris += mc(11.0, 0.9) * crypts * wink * 2.0;                                                   // crypts open violet-pink
    iris += mc(14.0, 1.0) * sparkle * 2.2;                                                         // gold glints
    iris = mix(iris, skyLocked(12, 0.9) * (0.7 + 0.5 * bassDrive * G + 0.3 * gDrop * G), clamp(limb * 0.9, 0.0, 1.0)); // EYE-OPAQUE limbus
    float irisMask = smoothstep(pupR * 0.97, pupR * 1.0, r) * (1.0 - smoothstep(RI * 0.93, RI * 1.06, r));   // EYE-FEATHER (EYE-CRISP: opaque right to the pupil — no black outline; outer feather halved)
    col = mix(col, iris, irisMask * m);
    // pupil interior: dark, with a faint deep glow riding the slow bass so it never reads as a hole
    col = mix(col, vec3(0.012, 0.006, 0.022), (1.0 - smoothstep(pupR * 0.97, pupR * 1.0, r)) * m);
    // pupil: deep violet → hot-pink glow that blooms with the bass (BIG); EYE-CRISP2: glow runs to the same edge the iris starts at — no dark seam
    col += mix(mc(6.0, 0.6), mc(3.0, 0.8), gBass) * (1.0 - smoothstep(pupR * 0.97, pupR, r)) * m * (0.15 + 1.4 * gBass * G + 0.8 * gKick * G) * smoothstep(0.1 * pupR, pupR, r);
    col = mix(col, eyeTone(col), m * (1.0 - smoothstep(RI * 1.0, RI * 1.25, r)));   // EYE-TONE

    // tilted accretion disk; front half crosses the horizon
    vec2 dd = rot2(0.20) * d;
    vec2 de = vec2(dd.x, dd.y * 4.2);
    float er = length(de);
    float ea = atan(de.y, de.x);
    float band = smoothstep(RH * 1.2, RH * 1.6, er) * smoothstep(RH * 3.8, RH * 2.0, er);
    float streak = 0.5 + 0.5 * sin(ea * 3.0 - t * 1.4 + log(er) * 14.0);
    float doppler = 0.55 + 0.45 * cos(ea + 0.4);
    float front = step(dd.y, 0.0);
    float show = max(front, outside);
    vec3 disk = mc(3.0 + 1.0 * streak, 0.85) * band * (0.35 + 0.65 * streak) * doppler * CORONA_GLOW * 1.1 * (1.0 - m);
    col += disk * show;
    return col;
}

// ============================================================================
// TENDRILS (TENDRILS-CONT) — the urchin, rebuilt as continuous curves rooted on the limbal ring and
// running out past the frame edge. Log-polar around the eye: the whole field shares one curl
// (shear in log-radius) + one sway, so each pixel only checks its own tendril and its neighbours.
// Shape ← slow stats (stash-smoothed); motion ← monotonic phases whose RATE audio sets; light ←
// smoothed envelopes. Nothing audio-driven touches an angle directly.
// ============================================================================
vec4 tendrilLayer(float a, float sl, float N, float layer, float m) {
    float wave = mix(1.2, 4.0, gWave);
    float swayPh = gFlexPh * TAU * (layer < 0.5 ? 1.0 : 2.0);
    float shear = fieldShear(sl, layer);
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
        float len = major > 0.5 ? mix(1.6, 2.6, gLen) * (0.9 + 0.3 * fract(h * 7.13))
                                : mix(0.45, 1.3, gLen) * (0.55 + 0.9 * fract(h * 3.71));   // reach in log-radius (edge ≈ 1.7)
        float u = sl / len;                                              // 0 base → 1 tip
        if (u >= 1.0) continue;
        float w = mix(0.50, 0.85, gThick) * (major > 0.5 ? 1.0 : 0.55)   /* SUN-RAYS2: fat glowing bases */ * (1.0 - 0.45 * layer)
                * (1.0 - 0.82 * u) / (1.0 + 0.45 * sl) * (1.0 + 0.9 * gCrest * GATE);   // crest widens the glow
        w = max(w, 0.02);
        float e = exp(-pow(dx / w, 2.0));                                // body glow
        float halo = exp(-abs(dx) / (w * 2.4));                          // light thrown onto the sky
        float core = exp(-pow(dx / (w * 0.30), 2.0));                    // hot filament
        float I = smoothstep(0.0, 0.04, sl) * pow(1.0 - u, 1.2) * (major > 0.5 ? 1.0 : 0.7);   // fades with distance from the eye
        float G = GATE;
        float cidx = layer < 0.5 ? 7.0 + mod(id - N * floor(id / N), 3.0) * 0.7 + u * 2.4 : 9.5 + mod(id, 2.0) * 0.5 + u * 1.0;   // RASPBERRY-TENDRILS: red-magenta roots → violet-pink tips
        float flux = smoothstep(0.55, 1.0, 0.5 + 0.5 * cos(sl * 5.0 - gFlow * TAU * 3.0 + h * TAU)) * gFlux;   // flux pulses run outward
        float grain = 1.0 - 0.8 * gRough * G * (0.5 + 0.5 * cos(sl * 38.0 + h * 40.0));                  // roughness crackle
        float grad = mix(1.45 - 0.9 * u, 0.55 + 0.9 * u, gCentroid);                                       // centroid: bright bases ↔ bright tips
        float rootBoost = 1.0 + 2.2 * gBass * G * (1.0 - u) * (1.0 - u);                                   // bass floods the bases
        float lit = (1.0 + 0.9 * gMids * G) * grad * rootBoost * (1.0 + 1.6 * flux * G) * grain;   // SUN-RAYS3: rays read as light even in a quiet passage
        vec3 c = mc(cidx, 0.6 + 0.4 * core) * (1.6 * e + 0.45 * halo + 0.7 * core) * lit * I;
        float tipSpark = pow(max(0.0, cos(sl * 24.0 - gFlow * TAU * 6.0 + h * TAU)), 16.0) * smoothstep(0.35, 0.9, u);
        c += mc(14.0, 1.0) * tipSpark * core * clamp(gTreb * 3.0, 0.0, 1.0) * G * 1.6 * smoothstep(1.0, 0.8, u);   // treble: gold glints race out along the rays
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
    float sl = log(r / r0);
    if (sl < 0.0) return vec4(0.0);
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
    float t = iTime;
    float sm = 3. / r.y;
    gPhase = HUE_BASE + t * 0.006 + HUE_SPIN + seed;

    // ── gravitational lens: everything bends around the hole (flips inside the Einstein ring)
    vec2 d0 = uv0 - SUN;
    float rr = max(length(d0), 1e-4);
    float RE = HOLE_R * 1.6;
    vec2 uv = SUN + d0 * (1.0 - RE * RE / (rr * rr));

    // backdrop: Van Gogh tile sky + lattice spiralling into the hole, kept dim behind the urchin
    vec3 bg = sky(uv, t, sm);

    // EYE morph: one-way accumulator stashed 16-bit in pixel (0,0) of the feedback buffer
    // (iTime wraps every 1000 s, so it cannot carry a monotonic morph). 0 on load → 1 after EYE_SECS.
    float eyeM = clamp(stashRead(S_EYE) + 1.0 / (EYE_SECS * 60.0), 0.0, 1.0);
    float m = smoothstep(0.0, 1.0, eyeM);
    // the ported controller (dodeca-bloom), one step per frame
    // AUDIO-BIG: attack-fast/release-slow on z-scores (relative to the track) — these swing 0↔1 with
    // the music; the old slow EMAs of *Normalized hovered at ~0.5, which is why it read as static.
    gBass     = envAR(stashRead(S_BASS),  bassZScore * 0.7 + 0.25,   0.35, 0.05);
    gMids     = envAR(stashRead(S_MIDS),  midsZScore * 0.7 + 0.25,   0.25, 0.04);
    gTreb     = envAR(stashRead(S_TREB),  trebleZScore * 0.7 + 0.2,  0.35, 0.05);
    gEnergy   = ema(stashRead(S_ENERGY),   energyNormalized,           0.05);
    gEntropy  = ema(stashRead(S_ENTROPY),  spectralEntropyNormalized,  0.04);
    gCentroid = envAR(stashRead(S_CENTROID), spectralCentroidZScore * 0.5 + 0.5, 0.10, 0.03);
    gPump     = ema(stashRead(S_PUMP),     bassNormalized,             0.28);
    float spike = max(energyZScore, bassZScore * 0.9);
    float dropP = stashRead(S_DROP);
    gDrop = spike > 0.2 ? max(dropP, min(spike, 1.0)) : dropP * 0.955;
    gFlow = fract(stashRead(S_FLOW) + (0.20 + gEntropy * 1.1 + gCentroid * 0.4) / TAU / 60.0);
    gCurl  = ema(stashRead(S_CURL),  F_CURL,  0.004);
    gDir   = ema(stashRead(S_DIR),   F_DIR,   0.004);
    gFlex  = ema(stashRead(S_FLEX),  F_FLEX,  0.004);
    gWave  = ema(stashRead(S_WAVE),  F_WAVE,  0.004);
    gLen   = ema(stashRead(S_LEN),   F_LEN,   0.004);
    gThick = ema(stashRead(S_THICK), F_THICK, 0.004);
    gTwist  = fract(stashRead(S_TWIST)  + R_TWIST / 60.0);
    gFlexPh = fract(stashRead(S_FLEXPH) + R_FLEX / 60.0);
    gFlux  = envAR(stashRead(S_FLUX),  spectralFluxZScore * 0.8 + 0.1, 0.45, 0.06);
    gRough = envAR(stashRead(S_ROUGH), spectralRoughnessZScore * 0.6 + 0.3, 0.20, 0.04);
    gRipPh = fract(stashRead(S_RIPPH) + 0.22 / 60.0);          // ripple clock: constant rate, monotonic
    gRipA  = envAR(stashRead(S_RIPA),  L_GRAV,  0.30, 0.05);
    gCrest = envAR(stashRead(S_CREST), spectralCrestZScore * 0.6 + 0.3, 0.25, 0.04);
    gRoll  = envAR(stashRead(S_ROLL),  spectralRolloffZScore * 0.5 + 0.5, 0.10, 0.03);
    // KICK: envelope + onset-triggered travelling pulse (age 0→1 over 2 s, refractory 0.5 s)
    float kRaw = clamp((max(bassZScore, energyZScore) - 0.2) * 1.8, 0.0, 1.0) * GATE;
    float kPrev = stashRead(S_KICK);
    gKick = envAR(kPrev, kRaw, 0.6, 0.10);
    gKAge = stashRead(S_KAGE);
    gKAmp = stashRead(S_KAMP);
    if (kRaw > 0.45 && kPrev < 0.30 && gKAge > 0.55) { gKAge = 0.0; gKAmp = kRaw; }   // KICK-WAVES3: ~1.6 s refractory — one deliberate front per kick, no pile-up
    else gKAge = min(gKAge + 1.0 / 180.0, 0.99999);                                    // 3 s life
    gPal = fract(stashRead(S_PAL) + (1.0 / 1500.0) * (0.6 + 0.8 * GATE) / 60.0);   // ~25 min round the wheel, starts Miami

    // the urchin radiates from the eye: same centre, unlensed, roots on the limbal ring
    vec4 urc = urchin(d0, m);
    float rayM = max(max(urc.r, urc.g), max(urc.b, 1e-4));
    vec3 rays = urc.rgb * (1.0 - exp(-1.3 * rayM)) / (1.3 * rayM) * 1.15;   // SUN-RAYS: hue-preserving soft limit on summed ray light
    vec3 f = bg * 0.62 * (1.0 - 0.35 * clamp(urc.a, 0.0, 1.0)) + rays;

    // PERF-NOFLOWERS: sunflower field removed (user: too slow) — urchin + sky fill the frame

    f -= fbm(uv0 * 100.0) * 0.05;                           // canvas grain (unlensed — it's the canvas)
    f = max(f, vec3(0.0));

    // ── the black sun at the urchin's heart, drawn in screen space over the lensed world
    f = blackSun(f, d0, t, m);

    // KICK-WAVES (replaces the painted ripple): the eye keeps the black hole's gravity, and every kick
    // launches a gravitational wavefront. It is pure DISTORTION — the previous frame is refracted
    // through a travelling lens bump; nothing on the wavefront is painted or brightened. Radius grows
    // monotonically with the stash kick-age (0→1 over 2 s, reset only by a new kick); audio sets
    // only the amplitude. Between kicks a slow inward swirl keeps the gravity well alive.
    vec2 sUV = g / r;
    float RIg = HOLE_R * 3.3;
    float fallG = smoothstep(RIg * 1.02, RIg * 1.35, rr) * exp(-max(rr - RIg, 0.0) * 0.9);
    float outG = smoothstep(RIg * 1.0, RIg * 1.3, rr);
    float Rk = RIg * 1.05 + gKAge * 1.6;                       // wavefront radius, monotonic per kick (~0.53/s — slow, deliberate)
    float wW = 0.035 + 0.03 * gKAge;                            // thin front, spreads a little as it travels
    float xk = (rr - Rk) / wW;
    float envK = gKAmp * exp(-gKAge * 2.2) * GATE;
    float lens = -xk * exp(-xk * xk) * 1.6487;                  // derivative-of-gaussian bump, peak ±1
    float ampK = (0.22 * envK + 0.03 * gBass * GATE) * outG;     // KICK-WAVES2: thin + intense lensing line  // kick front + a little bass breathing
    vec2 pS = rot2(0.006 * fallG) * d0 * (1.0 - 0.003 * fallG) + d0 / rr * lens * ampK;
    vec2 uvS = ((pS + SUN) * r.y + r) / (2.0 * r);
    uvS.y = max(uvS.y, 1.5 / r.y);                             // never sample the stash row
    vec3 prevG = getLastFrameColor(uvS).rgb;
    float eyeZone = m * (1.0 - smoothstep(HOLE_R * 3.3, HOLE_R * 3.6, rr));
    float waveW = exp(-xk * xk * 0.5) * clamp(envK * 3.0, 0.0, 1.0) * outG;   // let the refracted frame show through on the front
    f = mix(f, prevG * 0.96, clamp(0.42 * fallG + 0.45 * waveW, 0.0, 0.8) * (1.0 - eyeZone));
    vec3 still = getLastFrameColor(sUV).rgb;                  // EYE-LOWPASS: ~4-frame temporal smoothing on the iris
    f = mix(f, still, 0.35 * eyeZone);

    f = max(f, vec3(0.0));
    f *= min(1.0, 0.93 / max(max(f.r, f.g), max(f.b, 1e-4)));   // NEVER-WHITE: scale, don't clip — hue survives
    O = vec4(f, 1.0);
    if (g.y < 1.0 && g.x < S_COUNT) {                         // stash row
        float i = floor(g.x);
        float v = i == S_EYE ? eyeM : i == S_BASS ? gBass : i == S_MIDS ? gMids : i == S_TREB ? gTreb
                : i == S_ENERGY ? gEnergy : i == S_ENTROPY ? gEntropy : i == S_CENTROID ? gCentroid
                : i == S_PUMP ? gPump : i == S_DROP ? gDrop : i == S_FLOW ? gFlow
                : i == S_CURL ? gCurl : i == S_DIR ? gDir : i == S_FLEX ? gFlex : i == S_WAVE ? gWave
                : i == S_LEN ? gLen : i == S_THICK ? gThick : i == S_TWIST ? gTwist
                : i == S_FLEXPH ? gFlexPh : i == S_FLUX ? gFlux : i == S_ROUGH ? gRough
                : i == S_RIPPH ? gRipPh : i == S_RIPA ? gRipA : i == S_KICK ? gKick : i == S_KAGE ? gKAge
                : i == S_KAMP ? gKAmp : i == S_CREST ? gCrest : i == S_PAL ? gPal : gRoll;
        O = stashWrite(v);
    }
}
