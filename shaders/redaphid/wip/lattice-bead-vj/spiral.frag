// LATTICE-BEAD-VJ / spiral.frag (2026-09-04) - A SPIRAL OF BEAD OUTLINES.
// @fullscreen: true
// @mobile: false
// @tags: bead, mon, spiral, hero, redaphid
//
// hearts/spinny.frag rebuilt for the baked mon outline. There, 80 hearts flow along twisting
// lines (t = fract(i/N - time)), every line has its own hue offset, and hearts are max-composited
// over a dim radial glow. Here: ONE HERO at the centre, and N beads BORN at its rim that travel
// OUTWARD along a logarithmic spiral, growing as they go, each with its own hue inside ONE Oklch
// family, fading in at birth and out at the rim so the fract() wrap never pops.
//
// Channel discipline (iris/2 via dodeca-bloom): every angle and position reads a MONOTONIC phase
// (spin_angle / flow_phase / hue_phase). Audio sets rates and shading, never an angle.
// FAST channels (bass_pump / drop_glow / pitch_pulse) appear only inside drawBead, only on the
// contour, with a narrow band and a small punch range. Background lightness range is a few
// percent. Palette never reaches white. uv is normalised by iResolution.y and the SDF is sampled
// isotropically, so the outline is never stretched on any viewport.
//
// Requires ?controller=dodeca-bloom (or the phases pinned as URL params).
// Params (0 = default): ?beads=4..48 (28)  ?turns= (2.2)  ?arms=1..4 (1)  ?sizeExp= (0.6)
//   ?flow= (0.015 - travel rate on flow_phase)  ?heroScale= (0.20)  ?hueSpan= (0.32)
//   ?align=0..1 (1 - beads point along their radius)  ?tail=0..1 (1 - fade at both ends)

uniform float spin_angle;    // monotonic
uniform float morph_phase;
uniform float flow_phase;
uniform float hue_phase;

uniform float bass_env;      // slow levels
uniform float mids_env;
uniform float treble_env;
uniform float energy_env;
uniform float entropy_env;
uniform float centroid_env;
uniform float flux_env;

uniform float bass_pump;     // FAST - contour only
uniform float drop_glow;
uniform float pitch_pulse;

uniform float beads;
uniform float turns;
uniform float arms;
uniform float sizeExp;
uniform float flow;
uniform float heroScale;
uniform float hueSpan;
uniform float align;
uniform float tail;

#define TAU 6.28318530718
// The bake stores G = 0.5 + d_mm / 12 with the tile half-width = 6 mm, so (G-0.5)*2 is the true
// distance in TILE-HALF units (q). Multiplying back by r gives uv units. (hero.frag's 6.0 gives mm.)
#define BEAD_RANGE 1.0
#define N_BEADS  (beads     > 0.0 ? clamp(floor(beads), 4.0, 48.0) : 28.0)
#define TURNS    (turns     > 0.0 ? turns     : 2.2)
#define ARMS     (arms      > 0.0 ? clamp(floor(arms), 1.0, 4.0)  : 1.0)
#define SIZE_EXP (sizeExp   > 0.0 ? sizeExp   : 0.6)
#define FLOW     (flow      > 0.0 ? flow      : 0.015)
#define HERO_R   (heroScale > 0.0 ? heroScale : 0.20)
#define HUE_SPAN (hueSpan   > 0.0 ? hueSpan   : 0.32)
#define ALIGN    (align     > 0.0 ? align     : 1.0)
#define TAIL     (tail      > 0.0 ? tail      : 1.0)
#define R0       (HERO_R * 1.55)
#define R1       0.80
#define B0       (HERO_R * 0.30)

float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
mat2 rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

vec3 softClip(vec3 c){
    c = max(c, vec3(0.0));
    float mx = max(c.r, max(c.g, c.b));
    if (mx <= 0.0) return c;
    const float K = 0.80;
    float r = mx < K ? mx : 1.0 - (1.0 - K) * exp(-(mx - K) / (1.0 - K));
    return c * (r / mx);
}
vec3 lch(float h, float C, float L){ return oklch2rgb(vec3(L, C, fract(h) * TAU)); }

float beadDist(vec2 p, float r){
    vec2 q   = p / max(r, 1e-3);
    vec2 tc  = q * 0.5 + 0.5;
    vec2 tcc = clamp(tc, 0.0, 1.0);
    float d  = (getInitialFrameColor(tcc).g - 0.5) * 2.0 * BEAD_RANGE;
    d += length(tc - tcc) * 2.0;
    return d * r;
}

// ONE BEAD. The only place the fast channels appear; every fast term is on the contour band.
vec3 drawBead(vec2 p, vec2 centre, float r, float orient, float hue, float slowDrive, float w,
              inout vec3 col){
    vec2 q = p - centre;
    if (length(q) > r * 1.55) return col;             // bounding circle: skip the fetch
    q = rot(orient) * q;

    float d   = beadDist(q, r);
    float px  = 1.0 / iResolution.y;                  // one pixel in uv (true distance units now)
    float aa  = px * 1.25;
    float cov = smoothstep(aa, -aa, d);
    float rim = smoothstep(px * 3.0, 0.0, abs(d));    // narrow: ~3 px, never a halo
    float ins = smoothstep(px * 2.0, 0.0, abs(d + r * 0.16)) * cov;   // inset echo of the outline

    float L = 0.36 + 0.16 * slowDrive + 0.05 * treble_env;
    float C = 0.10 + 0.05 * entropy_env;
    vec3 body = lch(hue, C, L);
    vec3 edge = lch(hue + 0.08, C * 1.35, min(L + 0.40, 0.84));

    float punch = 0.55 + 0.45 * bass_pump + 0.65 * drop_glow + 0.25 * pitch_pulse;

    col = mix(col, body * 0.9, cov * w);
    col += edge * (0.35 * ins + rim * punch) * w;
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // BACKGROUND - slow only, and dark: the outline must be the brightest thing on screen.
    float rad = length(uv);
    float ang = atan(uv.y, uv.x);
    float f1 = sin(rad * 4.7 - flow_phase * 0.30 + ang * 2.0);
    float f2 = sin(rad * 7.9 + morph_phase * 0.19 - ang * 3.0);
    float field = 0.5 + 0.25 * f1 + 0.25 * f2;
    float bgHue = hue_phase * 0.05 + 0.60 + centroid_env * 0.08 + field * 0.05;
    float bgL   = 0.140 + 0.050 * field + 0.040 * energy_env + 0.020 * mids_env;
    vec3 col = lch(bgHue, 0.045 + 0.020 * entropy_env, bgL);
    col *= 1.0 - 0.45 * smoothstep(0.30, 0.85, rad);

    // THE SPIRAL - beads born at the hero's rim, travelling outward on flow_phase.
    float n = N_BEADS;
    float na = ARMS;
    float hueBase = 0.62 + hue_phase * 0.07;
    for (float a = 0.0; a < 4.0; a += 1.0){
        if (a >= na) break;
        for (float i = 0.0; i < 48.0; i += 1.0){
            if (i >= n) break;
            float id = i + a * 100.0 + 1.0;
            float h1 = hash11(id * 12.9898 + 3.1);
            float h2 = hash11(id * 78.233  + 7.7);

            float t   = fract((i + 0.5) / n + flow_phase * FLOW + a * 0.5 / na);
            float w   = mix(1.0, smoothstep(0.0, 0.10, t) * smoothstep(1.0, 0.82, t), TAIL);

            float th  = t * TURNS * TAU + a * TAU / na + spin_angle * 0.12;
            float sr  = R0 * pow(R1 / R0, t);
            float br  = B0 * pow(sr / R0, SIZE_EXP);
            vec2  c   = vec2(cos(th), sin(th)) * sr;

            float dir    = h1 < 0.75 ? -1.0 : 1.0;      // most beads counter-spin the arm
            float orient = ALIGN * th + spin_angle * (0.20 + h2 * 0.35) * dir;

            float hue = hueBase + (t - hue_phase * 0.10) * HUE_SPAN + a * 0.5 / na * HUE_SPAN;

            float k = mod(i, 6.0);
            float drive = k < 0.5 ? bass_env : k < 1.5 ? mids_env : k < 2.5 ? treble_env
                        : k < 3.5 ? entropy_env : k < 4.5 ? centroid_env : flux_env;

            drawBead(uv, c, br, orient, hue, clamp(drive, 0.0, 1.0), w, col);
        }
    }

    // THE HERO - centred, slowest spin, the still point everything is born from.
    drawBead(uv, vec2(0.0), HERO_R, spin_angle * 0.05, hueBase + 0.02, clamp(energy_env, 0.0, 1.0), 1.0, col);

    fragColor = vec4(pow(clamp(softClip(col), 0.0, 1.0), vec3(0.85)), 1.0);
}
