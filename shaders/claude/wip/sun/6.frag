// @fullscreen: true
// @mobile: false
// @tags: urchin, blackhole, sun, lattice, psychedelic, vangogh, claude
// preset: https://visuals.beadfamous.com/?shader=claude/wip/sun/6&controller=sun-6&wavelet=true
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
#define GATE (smoothstep(0.003, 0.015, energyMean))   // AUDIO-5X: the BlackHole feed sits at energyMean ≈ 0.015–0.08; the old 0.01–0.06 gate held everything at ~25%
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

// Ray shape (slow stats), motion clocks (audio sets the rate) and light envelopes now come from
// controllers/black-sun.js as bs_* uniforms — see the CONTROLLER block below.

// ── knobs (0 = the designed look) ──
#define ZOOM        (0.55 * exp(knob_4 * 1.0033))   // K4 ZOOM — eye/sun/rays/lens scale about the centre, 0.55×..1.5× on an exp curve (0 = eye ~28% of screen height)
#define HOLE_R      ((0.16 + knob_1 * 0.10) * bs_irisScale * ZOOM * bs_size)   // K1 HOLE SIZE × section-change shutter size (controller) × K4 ZOOM
#define HUE_SPIN    (knob_2)                  // K2 HUE SPIN
#define LATTICE_AMT (0.55 + knob_3 * 0.45)   // K3 LATTICE

#define SUN vec2(bs_sunX, bs_sunY)   // SKY-PATH: the controller drifts the sun slowly (story acts set the rate; dying sinks it)

float gPhase;   // slow colour phase (HUE_BASE + set clock + knob)
float gH0;      // ONE-PALETTE key hue (turns) — every colour in the frame is an offset of this

// ── CONTROLLER (controllers/black-sun.js): frame-persistent state lives in JS, not the framebuffer.
// Seconds-based and double precision, so it survives hot-swaps, canvas resizes and the iTime wrap.
// Without ?controller=black-sun every bs_* is 0 and the shader sits on the black hole.
uniform float bs_time, bs_eye;
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
uniform float bs_billow, bs_bassS, bs_kickS;   // NO-FLICKER (ported from black-sun/sun-1): background light rides slow envelopes (attack ~80 ms, release ~600 ms)
// bs_billow —   // NO-SHIVER: slow (~4 s) eased warp amplitude — the only audio that may scale a background warp
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
    vec3 c = oklch2rgb(lch);
    if (min(min(c.r, c.g), c.b) < 0.0 || max(max(c.r, c.g), c.b) > 1.0) {
        float lo = 0.0, hi = lch.y;
        for (int k = 0; k < 5; k++) {
            float mid = 0.5 * (lo + hi);
            vec3 cm = oklch2rgb(vec3(lch.x, mid, lch.z));
            if (min(min(cm.r, cm.g), cm.b) < 0.0 || max(max(cm.r, cm.g), cm.b) > 1.0) hi = mid; else lo = mid;
        }
        c = oklch2rgb(vec3(lch.x, lo, lch.z));
    }
    return clamp(c, 0.0, 1.0);
}

// LSD-CLOUDS: 1960s poster-art contour bands for the cloud masses. Adjacent bands are near-
// complements at matched lightness (op-art vibration); the sequence opens on the sun's gold and
// walks warm → hot → psychedelic. Degrees; the whole set turns slowly on gPal.
const float LSD_HUES[8] = float[8](90.0, 340.0, 55.0, 300.0, 22.0, 190.0, 355.0, 215.0);   // no lime: pairs that sing against the blue ground + gold sun
vec3 lsdBand(float k, float lit) {
    int i = int(mod(k, 8.0));
    float L = (mod(k, 2.0) < 0.5 ? 0.74 : 0.70) * lit;
    return pow(gamutLch(vec3(L, 0.17, radians(LSD_HUES[i]) + gPal * TAU * 0.5)), vec3(1.0 / 2.2));
}

// SOFT-BANDS: neighbouring LSD bands blend across the whole band width (smoothstep over fract),
// mixed in OKLab so the hue travels instead of stepping. The band sequence stays; the stair-steps go.
vec3 bandBlend(float k, float lit) {
    float f = fract(k);
    vec3 a = rgb2oklab(pow(lsdBand(floor(k), lit), vec3(2.2)));
    vec3 b = rgb2oklab(pow(lsdBand(floor(k) + 1.0, lit), vec3(2.2)));
    return pow(max(oklab2rgb(mix(a, b, f * f * (3.0 - 2.0 * f))), 0.0), vec3(1.0 / 2.2));
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
    float clN = noise(cc * vec2(.5, 1) - vec2(t * .2, 0));               // CLOUD-PRESENCE: clouds may sweep the whole frame, not just the upper part
    float clT = 0.012 - 0.018 * gEnergy * GATE;                         // TILE-DANCE: the gold band's ragged edge advances with the energy envelope
    float cl = smoothstep(clT - 0.0015, clT + 0.0015, clN);
    lc += noise(lc * vec2(1, 4) + id) * vec2(.7, .2);
    // TILE-DANCE: every brush tile answers the music — the gold band leads, the blue tiles follow at a
    // quarter strength. Envelopes only (controller); per-tile hashed phases on a monotonic clock.
    float kT = mix(0.25, 1.0, cl);
    float hT = hash12(id + 7.3);
    float edgeN = 1.0 - smoothstep(0.0, 0.012, abs(clN - clT));          // tiles near the band edge
    float trebLit = 0.35 * gTreb * GATE * kT * (0.35 + 0.65 * edgeN) * (0.5 + 0.5 * sin(hT * TAU + bs_flow * TAU * 3.0));   // NO-SHIVER: treble brightens edge tiles (was a back-and-forth position jitter)
    float thX = 0.40 - 0.15 * gBass * GATE * kT;                         // bass: tiles thin, the dark gaps between them breathe open
    float thY = min(0.497, 0.43 + 0.065 * gMids * GATE * kT);            // mids: tiles stretch along their stroke
    float Lc = length(cc - vec2(bs_waveX, bs_waveY));
    float Rk = HOLE_R * 3.3 * 1.05 + bs_wAge * 1.5;                      // the distortion wavefront (same front as BIG-WAVES)
    float kFlash = exp(-pow((Lc - Rk) / 0.07, 2.0)) * bs_wAmp * exp(-bs_wAge * 1.5) * GATE;

    float L = length(uv - SUN);
    float ph = gPhase + 0.35 / (L + 0.35);                  // hue bends harder near the sun
    vec3 base = mc(12.0 + 0.8 * (0.5 + 0.5 * sin(sin(L - .1) + ph)), 0.55);   // VANGOGH-SKY: sky blue ↔ deep blue
    float bandK = floor(max(clN - clT, 0.0) / 0.022);                    // LSD-CLOUDS: contour band index from depth inside the cloud
    vec3 tile = mix(mc(12.0 + 0.9 * hash12(id), 0.85), lsdBand(bandK, 0.9 + 0.1 * hT), cl);   // blue brush-tiles; psychedelic contour-banded clouds
    tile *= 1.0 + (1.4 * kFlash + 0.35 * gBass * GATE) * kT + trebLit;              // the kick front lights the tiles it crosses
    vec3 f = mix(base * .16, tile, st(abs(lc.x - .5), thX, sm * yd) * st(abs(lc.y - .5), thY, sm * xd));   // DARK-FLOOR3: the gaps between tiles are the dark floor
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
    f += mc(14.0, 0.85) * (0.25 + 0.9 * gBass * GATE) * 0.12 / (1.0 + L * 8.0);   // DARK-FLOOR: tighter, dimmer   // sun-glow on the sand, swells with bass
    f *= mix(1.0, 0.75 + 0.5 * smoothstep(0.2, 1.6, L), gRoll * GATE);         // rolloff pushes light to the outer field
    return f;
}
// FIBRE-COIL: one shear field for tendrils AND iris fibres. sl = log(r / root radius): > 0 out along
// the tendrils, < 0 inward through the iris toward the pupil — the same formula continued, so each
// fibre coils into its tendril as one strand with no seam at the root.
float fieldShear(float sl, float layer) {
    float curl = mix(0.20, 1.0, gCurl) * mix(-1.0, 1.0, gDir) * (1.0 - 0.35 * layer);   // SUN-RAYS: corona-streamer sway, gentler than the old snakes
    float wave = mix(1.2, 4.0, gWave);
    float flexA = mix(0.03, 0.16, gFlex) * (1.0 + 0.8 * bs_chaos);
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
    vec3 c = pow(gamutLch(vec3(0.25, 0.08, radians(278.0))), vec3(1.0 / 2.2));
    vec2 dS = uv - SUN;
    float rS = max(length(dS), 1e-3), aS = atan(dS.y, dS.x), lr = log(rS);
    float arm = 0.5 + 0.5 * cos(2.0 * aS - (2.6 + 1.3 * bs_wind) * lr + bs_galPh);   // integer angle multiple → no seam
    float armM = pow(arm, mix(3.5, 1.4, clamp(bs_bassS * G + 0.6 * bs_kickS * G, 0.0, 1.0)));   // bass/kick: arms widen
    float turb = 1.0 + 1.2 * bs_billow + 0.5 * bs_chaos;                                    // NO-SHIVER: warp amplitude eases slowly (bs_billow), never per-beat
    vec2 q = uv * 1.1 + vec2(1.0, 0.35) * bs_galPh * 0.12;                 // FORWARD: the gas streams one way on the monotonic flow clock
    float dens = smoothstep(0.3, 0.7, s_noise(q * 0.7) * 0.6 + s_noise(q * 1.6 + 4.1) * 0.4);
    vec2 w = q + vec2(noise(q * 1.3), noise(q * 1.3 + 7.7)) * turb;            // FORWARD: no clock inside the warp
    float v = 0.5 + 0.5 * sin(w.x * 2.2 + sin(w.y * 2.7));
    float fil = exp(-pow(sin(w.x * 3.3 + w.y * 1.4), 2.0) / 0.03);
    float k = v * 7.0;
    vec3 gas = bandBlend(k, 0.5);                                           // SPACEY: darker gas
    float fwave = exp(-pow(fract(lr * 0.35 - bs_fluxPh * 0.25) - 0.5, 2.0) / 0.006) * gFlux * G;   // flux: a wave along the arms
    float gasLit = (0.5 + 1.6 * armM) * (0.9 + 1.6 * bs_bassS * G + 0.8 * bs_kickS * G) * (1.0 + 2.0 * fwave);
    c += gas * (0.35 + 0.65 * dens) * (1.0 + 1.3 * fil) * gasLit * 0.55;
    float crest = smoothstep(0.8, 1.0, arm) * pow(max(0.0, sin(w.x * 9.0 + w.y * 5.0)), 18.0);
    c += pow(gamutLch(vec3(0.85, 0.08, radians(85.0))), vec3(1.0 / 2.2)) * crest * clamp(gTreb * 2.5, 0.0, 1.0) * G * 0.8;          // treble glints on the crests
    vec2 sg = uv * 34.0;
    vec2 cid = floor(sg);
    float hs = hash12(cid);
    vec2 sp = fract(sg) - 0.5 - (hash22(cid + 3.1) - 0.5) * 0.6;
    // STAR-AUDIO: stars carry the fast music. treble: ±60% twinkle on per-star hashed slow phases (the
    // envelope is smoothed, so no flicker); kicks swell the brightest stars to 2–3 px
    float tw = 1.0 + 0.6 * clamp(gTreb * 1.6, 0.0, 1.0) * G * sin(bs_time * 1.3 + hs * 40.0) - 0.15;
    float big = step(0.975, hs);
    float star = step(0.9, hs) * exp(-dot(sp, sp) / (0.012 * (1.0 + big * 5.0 * bs_kickS * G))) * tw * (1.0 + big * 0.8 * bs_kickS * G);
    c += mix(vec3(0.75, 0.8, 1.0), vec3(1.0, 0.85, 0.7), hash12(cid + 9.0)) * star * 1.6 * (1.0 - 0.6 * dens) * smoothstep(0.4, 0.8, bs_night);
    float cM = max(max(c.r, c.g), max(c.b, 1e-4));
    float cK = cM < 0.7 ? cM : 0.7 + 0.2 * (1.0 - exp(-(cM - 0.7) / 0.2));
    return c * (cK / cM);
}

vec3 sunLchK(float L, float C, float hDeg, float keepL) {
    float hc = clamp(gHeatOv >= 0.0 ? gHeatOv : bs_heat, 0.0, 1.6);
    if (hc < 1.0) { hDeg -= (1.0 - hc) * 62.0; L *= mix(0.45 + 0.55 * hc, 0.85 + 0.15 * hc, keepL); C *= 0.85 + 0.15 * hc; }
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
    float k = v * 7.0;
    vec3 c = bandBlend(k, 0.42);                                          // SPACEY: dim luminous veils (band L ~0.2–0.35), not a painted rainbow wall
    float fil = exp(-pow(sin(q.x * 3.0 + q.y), 2.0) / 0.02);
    float surge = bs_kickS * G * (0.4 + 1.2 * smoothstep(0.35, 0.9, v));   // kick: the bright gas flares (patches, not a painted ring)
    float fwave = exp(-pow(fract(q.x * 0.15 - bs_fluxPh * 0.3) - 0.5, 2.0) / 0.01) * gFlux * G;  // flux wave along the filaments
    float lit = (0.25 + 0.45 * v * v) * (0.8 + 1.1 * bs_bassS * G + 0.6 * bs_kickS * G) * (1.0 + 0.6 * surge);   // SPACEY: deep gaps between veils; audio surges the bright edges
    vec3 o = c * lit + c * fil * (0.3 + 0.8 * fwave);
    o += pow(gamutLch(vec3(0.86, 0.08, radians(85.0))), vec3(1.0 / 2.2)) * fil * pow(max(0.0, sin(q.y * 7.0 + q.x * 3.0)), 12.0) * clamp(gTreb * 2.5, 0.0, 1.0) * G * 0.6;
    float oM = max(max(o.r, o.g), max(o.b, 1e-4));
    return o * ((oM < 0.65 ? oM : 0.65 + 0.2 * (1.0 - exp(-(oM - 0.65) / 0.2))) / oM);
}

vec3 plasmaBall(vec3 col, vec2 d, float R, float m) {
    float G = GATE;
    vec2 p = d / R;
    float x = length(p);
    float z = sqrt(max(1.0 - x * x, 0.0));                                   // sphere bulge
    vec2 q = p * (1.0 + 0.55 * (1.0 - z));                                   // texture compresses toward the limb → reads as a ball
    float swirl = 0.55 + 0.5 * gBass * G + 0.6 * bs_chaos;                  // bass: turbulence amplitude; story chaos
    // two rigidly rotating layers (inner fast, outer slow), blended by radius — no winding into rings
    vec2 qi = rot2(bs_diskPh * 0.45) * q, qo = rot2(bs_diskPh * 0.2) * q;
    vec2 qq = mix(qi, qo, smoothstep(0.2, 0.9, x));
    vec2 w = vec2(noise(qq * 1.7 + vec2(bs_diskPh * 0.21, 0.0)), noise(qq * 1.7 + vec2(5.2, -bs_diskPh * 0.17)));
    qq += w * 1.1 * swirl;                                                   // domain warp → curling, never straight
    for (float i = 1.0; i < 4.0; i++) qq += sin(qq.yx * (1.3 * i) + vec2(bs_diskPh * 0.35, -bs_diskPh * 0.27) * i) / i * 0.45 * swirl;
    float v = sin(qq.x * 2.6 + sin(qq.y * 3.1));
    float gran = noise(qq * 7.0 + bs_diskPh * 0.1);
    float T = clamp(0.5 + 0.45 * v + 0.35 * (gran - 0.5), 0.0, 1.0);
    // magnetic arcs: thin bright curves where the warped field crosses zero; width floored by the
    // pixel footprint so they never alias into flicker
    float hot = (0.9 + 0.3 * gBass * G + 0.25 * gKick * G) * (1.0 + 1.4 * bs_nova);   // CORE-HOT2: rest at 0.9, not 0.6 — the 0.6 rest was why the core sat below its corona   // bass core swell + kick surge; the supernova flash (knee-limited below)
    float L = mix(0.87, 0.66, x * x) + 0.28 * (T - 0.5) * (1.0 - 0.6 * x * x) + 0.06 * z;   // BLEND: the limb ends at the corona's own lightness — no dark rim to read as a circle   // BALL-BOIL: stronger cell contrast now the line work is gone
    L += 0.13 * (gBass * G + 0.7 * gKick * G - 0.35) * (1.0 - x * x);       // CORE-PULSE: the core breathes ±~25% with bass/kick   // BALL-HOT: hot yellow-gold core, the brightest thing on screen
    float hue = mix(92.0, 32.0, clamp((1.0 - T) * 0.6 + x * x * 0.55, 0.0, 1.0));
    vec3 ball = sunLchK(clamp(L, 0.40, 0.90), 0.15 + 0.03 * T, hue, 1.0 - x * x) * hot;   // CORE-HOT: a cool act shifts the core's hue but barely dims it — the core stays brighter than corona and rays in every act; only the limb takes the full cooling
    // NO-OUTLINE2: no line work on the surface at all — any thin bright curve over the cell pattern read
    // as an outline around the dark lanes. Treble now makes the hottest granules sparkle instead.
    ball += sunLch(0.86, 0.12, 84.0) * pow(smoothstep(0.55, 1.0, gran), 4.0) * z * (0.15 + 1.4 * gTreb * G);
    float bM = max(max(ball.r, ball.g), max(ball.b, 1e-4));
    float bK = bM < 0.7 ? bM : 0.7 + 0.22 * (1.0 - exp(-(bM - 0.7) / 0.22));
    ball *= bK / bM;
    float inside = 1.0 - smoothstep(0.62, 1.12, x);                         // SOFT-LIMB/BLEND: the ball dissolves into corona + ray roots over its outer ~40% — no edge to point at
    // corona boiling off the limb, red-orange, bleeding into the ray roots; flux throws flares
    float ang = atan(p.y, p.x);
    float boil = noise(vec2(ang * 3.0 / TAU * 6.0, x * 2.0 - bs_diskPh * 0.4)) * 0.5 + 0.5;
    float flare = pow(0.5 + 0.5 * cos(ang * 3.0 + bs_diskPh * 0.3), 6.0) * gFlux * G;
    float cor = exp(-max(x - 0.75, 0.0) * mix(7.0, 3.5, boil * 0.6 + flare)) * (1.0 - 0.5 * inside) * (0.5 + 0.3 * gBass * G + 0.9 * flare);   // BLEND: corona overlaps the limb on both sides   // HAZE-CUT: steeper corona falloff
    vec3 corona = sunLch(0.66, 0.16, mix(34.0, 52.0, boil)) * cor;   // same hue band as the limb and the ray roots
    col += corona;
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
    float reach = RH * (0.55 + 0.9 * rays + FLARE * 0.9 + 1.8 * gFlux * GATE);   // AUDIO-5X: flux throws flares
    float env = exp(-max(r - RH, 0.0) / reach);
    vec3 corona = mc(14.0, 0.75 + 0.2 * rays) * env * (0.55 + 0.75 * rays) * CORONA_GLOW * (1.0 + 2.0 * gFlux * GATE);   // orange ↔ coral flares

    // photon ring
    float pr = exp(-pow((r - RH * 1.06) / (RH * 0.05), 2.0));
    vec3 ring = mc(14.0, 0.8) * pr * 0.35 * (1.0 - m);   // KICK-WAVES: faint photon ring on the black hole only; gone once the eye forms, no kick slam

    float outside = smoothstep(RH * 0.98, RH * 1.03, r);
    col = mix(sunDisc(d, RH * (1.0 + 0.06 * gBass * GATE)), col, outside);   // SUN-DISC replaces the black horizon
    col += (corona * (1.0 - 0.55 * m) + ring) * outside;

    // PLASMA-BALL: the eye is one powerful glowing plasma sphere — no black, no straight spokes. The
    // sun disc swells into it as the morph runs. Domain-warped plasma with curling magnetic arcs over a
    // bulged (spherical) surface, bright volumetric core, limb glow, and a corona boiling off the edge
    // into the ray roots. Audio, all light/rate: bass swells the ball and its core, mids spin the
    // surface (bs_diskPh rate), treble crackles the arcs, flux throws limb flares, kicks surge it.
    float G = GATE;
    float RI = HOLE_R * 3.3;
    float pupR = RH * (1.0 - 0.16 * gPump * G * m);           // the shutter closes down to this
    float RB = mix(RH, RI * 0.92, m) * (1.0 + 0.07 * gBass * G + 0.04 * gKick * G);
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
    vec3 diskC = sunLch(0.55 + 0.2 * turb, 0.19, mix(345.0, 15.0, dop)) * (0.35 + 1.1 * dop * dop);   // DISK-MAGENTA: hot magenta/red so it separates from the gold ball
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
    diskSum += sunLch(0.55 + 0.15 * turb2, 0.18, mix(345.0, 15.0, dop2)) * halo * over * (0.4 + 0.6 * turb2) * (0.3 + 0.9 * dop2) * diskAmp * 0.9;
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
        float reachA = (0.8 + 0.45 * gEnergy * GATE + 0.35 * gBass * GATE + 0.25 * gDrop * GATE) * sqrt(max(bs_power, 0.05));   // story power: reach   // AUDIO-5X: ray reach pumps with bass/energy envelopes
        float len = reachA * (major > 0.5 ? mix(1.6, 2.6, gLen) * (0.9 + 0.3 * fract(h * 7.13))
                                : mix(0.45, 1.3, gLen) * (0.55 + 0.9 * fract(h * 3.71)));   // reach in log-radius (edge ≈ 1.7)
        // FAR-REACH: in reach mode (bs_reach) a ray's length is set in SCREEN distance, not relative to
        // the ball — a tiny sun throws rays past the frame edges. Bass/energy still pump it (reachA).
        float far = log(max(reachA * (major > 0.5 ? mix(2.6, 3.4, fract(h * 5.3)) : mix(1.0, 2.2, fract(h * 2.9))) / max(gR0, 1e-3), 1.2));
        len = mix(len, max(len, far), bs_reach);
        float u = sl / len;                                              // 0 base → 1 tip
        if (u >= 1.0) continue;
        float w = mix(0.36, 0.66, gThick) * (major > 0.5 ? 1.0 : 0.5)   /* SUN-RAYS2: glowing bases — DARK-FLOOR: slimmer so the blue ground survives */ * (1.0 - 0.45 * layer)
                * (1.0 - 0.82 * u) / (1.0 + 0.45 * sl) * (1.0 + 0.9 * gCrest * GATE);   // crest widens the glow
        w = max(w, 0.02) * (0.55 + 0.5 * gBass * GATE);                  // HAZE-CUT: slimmer at rest; HAZE-CAP: half the bass width pump (loud frames flooded the sky pink)                  // bass: glow width pumps with the brightness
        float e = exp(-pow(dx / w, 2.0));                                // body glow
        float halo = exp(-abs(dx) / (w * 2.4));                          // light thrown onto the sky
        float core = exp(-pow(dx / (w * 0.30), 2.0));                    // hot filament
        float I = smoothstep(-0.12, 0.2, sl) * pow(1.0 - u, 1.2) * (major > 0.5 ? 1.0 : 0.7) * bs_power   // fades with distance from the eye; story power: brightness
                * (0.5 + 1.5 * gBass * GATE + 0.7 * gKick * GATE);   /* CALM-1: lower rest + softer kick — lum was 0.5, flicker 0.68 */                    // AUDIO-5X: bass + kick pump the rays (rest lower → headroom to pump into)
        float G = GATE;
        float flux = smoothstep(0.55, 1.0, 0.5 + 0.5 * cos(sl * 5.0 - gFlow * TAU * 3.0 + h * TAU)) * gFlux;   // flux pulses run outward
        float grain = 1.0 - 0.8 * gRough * G * (0.5 + 0.5 * cos(sl * 38.0 + h * 40.0));                  // roughness crackle
        float grad = mix(1.45 - 0.9 * u, 0.55 + 0.9 * u, gCentroid);                                       // centroid: bright bases ↔ bright tips
        float rootBoost = 1.0 + 2.2 * gBass * G * (1.0 - u) * (1.0 - u);                                   // bass floods the bases
        float lit = (1.0 + 0.9 * gMids * G) * grad * rootBoost * (1.0 + 1.6 * flux * G) * grain;   // SUN-RAYS3: rays read as light even in a quiet passage
        float rHue = mix(88.0, -12.0, pow(u, 0.8)) + 15.0 * (h - 0.5) * 2.0 - (layer > 0.5 ? 18.0 : 0.0);   // RAY-GRADE: yellow root → amber → ember → red-magenta tip, ±15° per ray
        vec3 rayC = sunLch(mix(0.80, 0.62, u) * (0.75 + 0.25 * core), 0.16, rHue);
        vec3 c = rayC * (1.3 * e + 0.07 * halo + 0.7 * core) * lit * I;
        float tipSpark = pow(max(0.0, cos(sl * 14.0 - gFlow * TAU * 4.0 + h * TAU)), mix(18.0, 6.0, clamp(gTreb * 1.5, 0.0, 1.0))) * smoothstep(0.25, 0.9, u);   // treble: sparks thicken and race out; low spatial freq so they don't shimmer
        c += mc(14.0, 1.0) * tipSpark * core * clamp(gTreb * 3.0, 0.0, 1.0) * G * 3.2 * smoothstep(1.0, 0.8, u);   // AUDIO-5X   // treble: gold glints race out along the rays
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
    gKick = bs_kick; gKAge = bs_kAge; gKAmp = bs_kAmp; gCrest = bs_crest; gPal = bs_pal; gRoll = bs_roll;

    // ── gravitational lens: everything bends around the hole (flips inside the Einstein ring)
    vec2 d0 = uv0 - SUN;
    float rr = max(length(d0), 1e-4);
    float RE = HOLE_R * 1.6 * (1.0 + 1.6 * bs_pull);           // story pull: the collapse bends space harder
    vec2 uv = SUN + d0 * (1.0 - RE * RE / (rr * rr));

    // backdrop: Van Gogh tile sky + lattice spiralling into the hole, kept dim behind the urchin
    vec3 bg = mix(sky(uv, t, sm), deepSpace(uv), smoothstep(0.0, 1.0, bs_night)) * (1.0 - 0.5 * bs_dark);   // NIGHT-LIFT: dark acts stay readable on a projector (0.8 left DYING at lum 0.03)   // story night: Van Gogh day → deep space; dark dims


    // the urchin radiates from the eye: same centre, unlensed, roots on the limbal ring
    gBendDir = atan(bs_cY - SUN.y, bs_cX - SUN.x); gBendAmt = 0.3 * bs_cOn * smoothstep(1.6, 0.4, length(vec2(bs_cX, bs_cY) - SUN));
    vec4 urc = urchin(d0, m);
    gBendAmt = 0.0;
    float rayM = max(max(urc.r, urc.g), max(urc.b, 1e-4));
    float rayK = rayM < 0.55 ? rayM : 0.55 + 0.25 * (1.0 - exp(-(rayM - 0.55) / 0.25));   // rays peak (≤ 0.80) below the ball core (≤ 0.92)
    vec3 rays = urc.rgb * (rayK / rayM);   // SUN-RAYS: hue-preserving knee — linear up to 0.55 so pumps read, soft above
    // HAZE-CAP: summed ray light may not swamp the sky — beyond twice the sky's own brightness the
    // glow is soft-limited (hue-preserving), so the ground keeps its colour even on the loudest frame
    vec3 sky0 = bg * 0.48;
    float skyL = max(dot(sky0, vec3(0.2126, 0.7152, 0.0722)), 0.03);
    float rayL = dot(rays, vec3(0.2126, 0.7152, 0.0722));
    float capL = 0.12 + 2.0 * skyL;
    rays *= rayL > capL ? (capL + 0.25 * (rayL - capL)) / rayL : 1.0;
    vec3 f = sky0 + rays;   // CLEAN-HALO: rays only add light onto the sky, never darken beside themselves   // DARK-FLOOR2: deeper ground so the frame has a dark floor

    // PERF-NOFLOWERS: sunflower field removed (user: too slow) — urchin + sky fill the frame

    f -= fbm(uv0 * 100.0) * 0.05;                           // canvas grain (unlensed — it's the canvas)
    f = max(f, vec3(0.0));

    // ── the black sun at the urchin's heart, drawn in screen space over the lensed world
    f = mix(f, nebula(uv0), clamp(bs_abstract, 0.0, 1.0) * 0.85);   // story abstract: the scene dissolves into plasma
    // BINARY: the companion's rays (bending toward the main star) go in before the main star is drawn
    vec2 C = vec2(bs_cX, bs_cY);
    vec2 dC = uv0 - C;
    float compR = 0.16 * 3.3 * 0.92 * ZOOM * 0.42;
    float sepV = length(C - SUN);
    if (bs_cOn > 0.01) {
        float sb = gBass, sk = gKick;
        gBass = gMids; gKick = clamp(gRough * 0.9 + gTreb * 0.4, 0.0, 1.0);   // the companion answers mids/treble/roughness
        gHeatOv = 0.32;
        gBendDir = atan(SUN.y - C.y, SUN.x - C.x); gBendAmt = 0.55 * smoothstep(1.6, 0.4, sepV);
        float rC = max(length(dC), 1e-4), r0C = compR * 0.85;
        gR0 = r0C;
        float slC = log(rC / r0C);
        if (slC > -0.12) {
            vec4 cr = tendrilLayer(atan(dC.y, dC.x), slC, 14.0, 0.0, 1.0);
            f += cr.rgb * 0.8 * bs_cOn;
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
        gBass = gMids; gKick = clamp(gRough * 0.9 + gTreb * 0.4, 0.0, 1.0);
        gHeatOv = 0.32;
        vec3 withC = plasmaBall(f, dC, compR * (1.0 + 0.08 * gBass * GATE + 0.15 * bs_kiss), 1.0);
        f = mix(f, withC, bs_cOn);
        gBass = sb; gKick = sk; gHeatOv = -1.0;
    }

    // STORY-SUPERNOVA: a thick turbulent shell blown out from the detonation, crossing the frame in
    // ~7 s, in the LSD palette heated toward gold; it fades with the flash. Its edge also lenses
    // the previous frame (below) — the shock is distortion, the shell is the light.
    float Rs = bs_shell * 0.28;
    float shellW = 0.10 + 0.12 * Rs;
    float sh = exp(-pow((rr - Rs) / shellW, 2.0)) * bs_nova;
    float shN = noise(vec2(atan(d0.y, d0.x) * 3.0, rr * 4.0 - bs_shell * 0.5)) * 0.5 + 0.5;
    vec3 shellC = mix(lsdBand(floor(shN * 6.0 + bs_shell * 0.2), 0.95), sunLch(0.84, 0.12, 80.0), 0.4);
    f += shellC * sh * (0.5 + 0.8 * shN);

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
    float ampK = (1.3 * envK + 0.04 * gBass * GATE) * outG;   // BIG-WAVES: ~2.4× the lensing of the old kick fronts   // KICK-BEND: fronts bend the rays ~2.5× harder     // KICK-WAVES2: thin + intense lensing line  // kick front + a little bass breathing
    float xs = (rr - bs_shell * 0.28) / 0.06;
    vec2 pS = rot2(0.006 * fallG) * d0 * (1.0 - 0.003 * fallG) + dW / rw * lens * ampK - d0 / rr * xs * exp(-xs * xs) * 1.6487 * 0.35 * bs_nova;   // + the supernova shock front
    vec2 uvS = ((pS + SUN) * r.y + r) / (2.0 * r);
    vec3 prevG = getLastFrameColor(uvS).rgb;
    float eyeZone = m * (1.0 - smoothstep(HOLE_R * 3.3, HOLE_R * 3.6, rr));
    float waveW = exp(-xk * xk * 0.5) * clamp(envK * 3.0, 0.0, 1.0) * outG;   // let the refracted frame show through on the front
    f = mix(f, prevG * 0.96, clamp(0.42 * fallG + 0.45 * waveW, 0.0, 0.8) * (1.0 - eyeZone));
    vec3 still = getLastFrameColor(sUV).rgb;                  // EYE-LOWPASS: ~4-frame temporal smoothing on the iris
    f = mix(f, still, 0.35 * eyeZone);

    f = max(f, vec3(0.0));
    f *= min(1.0, 0.93 / max(max(f.r, f.g), max(f.b, 1e-4)));   // NEVER-WHITE: scale, don't clip — hue survives
    f += (hash12(g + fract(bs_time) * 61.0) - 0.5) / 255.0;   // SOFT-BANDS: 1-LSB dither against 8-bit stepping in dark gas
    O = vec4(f, 1.0);
}
