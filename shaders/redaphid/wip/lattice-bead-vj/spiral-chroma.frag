// LATTICE-BEAD-VJ / spiral-chroma.frag (2026-09-04, from spiral.frag) - THE SPIRAL OF BEADS, FOR CHROMADEPTH GLASSES.
// @name: bead spiral 3D
// @fullscreen: true
// @mobile: false
// @tags: bead, mon, spiral, hero, chromadepth, 3d, redaphid
//
// spiral.frag's geometry untouched; its colour pipeline replaced by the ChromaDepth discipline (chroma.frag,
// satellites-chroma.frag): hue is a function of DEPTH and nothing else, the music arrives as exposure,
// layers composite front-most, L <= 0.55 so white is unreachable.
//
// THE DEPTH IS THE SPIRAL ITSELF. A bead's place on the path (t: 0 born at the hero, 1 at the rim) is its
// distance from you:
//   ?cdmode=0  TUNNEL (default)  the hero is the VANISHING POINT, deep violet. Beads are born far away, small
//                                and blue, and spiral TOWARD you - growing (spiral.frag already grows them,
//                                sizeExp 0.6) and warming through green and yellow to red as they reach the
//                                rim: a tunnel of crests flying at the viewer. The drop ripple runs down the
//                                arms toward you and arrives red.
//   ?cdmode=1  FOUNTAIN          the hero is nearest, red; beads recede outward to violet and SHRINK as they
//                                go (sizeExp -0.40), so perspective and colour agree.
// The dust ribbon is painted at the depth of the path it traces, so each arm reads as one stroke sinking
// into (or rising out of) the picture. The ground is violet and dim. The fade at birth and at the rim is an
// EXPOSURE fade (the bead stays at its own depth; only the last third of the fade touches coverage, when
// the bead is already dark), so the fract() wrap never averages red into violet.
// Beat pop: a kick pulls a bead toward you (clamped, bead-masked) - the guide's "shift toward red" made local.
// Per-bead hue offsets are gone (they rotated hue); each bead has its own EXPOSURE instead.
//
// Requires ?controller=dodeca-bloom. Params as spiral.frag, plus ?cdmode= and ?cddebug=1 (depth as grey).
// Best look: ?shader=redaphid/wip/lattice-bead-vj/spiral-chroma&image=images/beads/mon-tomoe.png
//            &controller=dodeca-bloom&arms=2&beads=20&turns=1.6&wavelet=true

uniform float spin_angle;    // monotonic
uniform float morph_phase;
uniform float flow_phase;
uniform float hue_phase;     // monotonic - drives the SURGE (a position), never hue here

uniform float bass_env;      // slow levels
uniform float mids_env;
uniform float treble_env;
uniform float energy_env;
uniform float entropy_env;
uniform float centroid_env;
uniform float flux_env;

uniform float bass_pump;     // FAST - contour and pop only
uniform float drop_glow;
uniform float pitch_pulse;

uniform float beads;
uniform float turns;
uniform float arms;
uniform float sizeExp;
uniform float flow;
uniform float heroScale;
uniform float align;
uniform float tail;
uniform float dust;
uniform float surge;
uniform float chiral;
uniform float cdmode;        // 0 TUNNEL (hero far, beads approach) / 1 FOUNTAIN (hero near, beads recede)
uniform float cddebug;       // ?cddebug=1 paint the depth field as greyscale

#define TAU 6.28318530718
#define BEAD_RANGE 1.0
#define CD_MODE  (cdmode > 0.5 ? 1.0 : 0.0)
#define N_BEADS  (beads     > 0.0 ? clamp(floor(beads), 4.0, 48.0) : 28.0)
#define TURNS    (turns     > 0.0 ? turns     : 2.2)
#define ARMS     (arms      > 0.0 ? clamp(floor(arms), 1.0, 4.0)  : 1.0)
#define SIZE_EXP (sizeExp   > 0.0 ? sizeExp   : (CD_MODE < 0.5 ? 0.6 : -0.40))
#define FLOW     (flow      > 0.0 ? flow      : 0.015)
#define HERO_R   (heroScale > 0.0 ? heroScale : 0.22)
#define ALIGN    (align     > 0.0 ? align     : 1.0)
#define TAIL     (tail      > 0.0 ? tail      : 1.0)
#define DUST     (dust      > 0.0 ? dust      : 1.0)
#define SURGE    (surge     > 0.0 ? surge     : 0.03)
#define CHIRAL   (chiral    > 0.0 ? chiral    : 1.0)
#define R0       (HERO_R * 1.55)
#define R1       0.80
#define B0       (HERO_R * (CD_MODE < 0.5 ? 0.30 : 0.48))

// ── DEPTH LAYOUT ──
#define D_NEAR   0.02
#define D_FAR    0.88
#define D_GROUND 0.95
// the path: t = 0 at the hero, 1 at the rim. The near end is reached at t = 0.80 - exactly where
// spiral.frag's rim fade begins - so the beads arrive RED and fade out red, instead of fading at yellow.
float pathDepth(float t){
    float u = smoothstep(0.0, 0.80, clamp(t, 0.0, 1.0));
    return CD_MODE < 0.5 ? mix(D_FAR, D_NEAR, u) : mix(D_NEAR, D_FAR, u);
}

// ── CHROMADEPTH PALETTE (chroma.frag's) - HSL, hue = depth only, seed2 one bounded slide, L <= 0.55 ──
#define CD_SAT  0.97
#define CD_LMIN 0.07
#define CD_LMAX 0.55
#define CD_SEED 0.03
vec3 cdpal(float t, float lit){
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.75 + seed2 * CD_SEED;
    float sat = clamp(CD_SAT - t * 0.05, 0.0, 1.0);
    float L   = mix(CD_LMIN, CD_LMAX, clamp(lit, 0.0, 1.0));
    return hsl2rgb(vec3(hue, sat, L));
}

float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
mat2 rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

float beadDist(vec2 p, float r){
    vec2 q   = p / max(r, 1e-3);
    vec2 tc  = q * 0.5 + 0.5;
    vec2 tcc = clamp(tc, 0.0, 1.0);
    float d  = (getInitialFrameColor(tcc).g - 0.5) * 2.0 * BEAD_RANGE;
    d += length(tc - tcc) * 2.0;
    return d * r;
}

// ONE BEAD -> a (depth, exposure) layer composited front-most over dl. The only place the fast channels appear.
//   mirror +1/-1 flips the shape (chirality)   born 1 for a newborn   fill 0 = dark interior (the hero)
//   w      the birth/rim fade, applied to EXPOSURE; coverage only for its last third
void drawBead(vec2 p, vec2 centre, float r, float orient, float mirror, float depthBase, float slowDrive,
              float w, float born, float fill, float ringBoost, float eScale, inout vec2 dl){
    vec2 q = p - centre;
    if (length(q) > r * 1.55) return;             // bounding circle: skip the fetch
    q = rot(orient) * q;
    q.x *= mirror;

    float d   = beadDist(q, r);
    float px  = 1.0 / iResolution.y;
    float aa  = px * 1.25;
    float cov = smoothstep(aa, -aa, d);
    float rim = smoothstep(px * 3.0, 0.0, abs(d));                       // ~3 px, never a halo
    float ins = smoothstep(px * 2.0, 0.0, abs(d + r * 0.16)) * cov;      // inset echo of the outline
    float inner = clamp(-d / (r * 0.45), 0.0, 1.0);                      // 0 at the contour -> 1 at the core

    // depth: the path, a shallow dome, a fresnel rim, and the bead-masked pop (clamped, never wrapped)
    float pop   = 0.05 * bass_pump + 0.05 * drop_glow * born + 0.04 * ringBoost;
    float dBody = clamp(depthBase + 0.06 * (1.0 - inner) - pop, 0.0, 1.0);
    float dRim  = clamp(depthBase - 0.03 - pop, 0.0, 1.0);

    // exposure: all the music
    float e     = (0.36 + 0.16 * slowDrive + 0.05 * treble_env) * eScale;
    float eBody = mix(0.08, e, fill) * mix(0.75, 1.0, sqrt(inner)) + ins * 0.30;
    float punch = 0.55 + 0.45 * bass_pump + 0.35 * drop_glow + 0.25 * pitch_pulse + 0.6 * drop_glow * born + ringBoost;
    float eRim  = clamp(0.40 + 0.35 * punch, 0.0, 1.0);                 // 0.59 at rest, saturates on a hit or the ripple
    float wA    = min(1.0, w * 3.0);
    dl = mix(dl, vec2(dBody, clamp(eBody * w, 0.0, 1.0)), cov * wA);
    dl = mix(dl, vec2(dRim,  clamp(eRim  * w, 0.0, 1.0)), rim * wA);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float n  = N_BEADS;
    float na = ARMS;

    // GROUND - violet, dim, slow only. The outline must be the brightest thing on screen.
    float rad = length(uv);
    float ang = atan(uv.y, uv.x);
    float f1 = sin(rad * 4.7 - flow_phase * 0.30 + ang * 2.0);
    float f2 = sin(rad * 7.9 + morph_phase * 0.19 - ang * 3.0);
    float field = 0.5 + 0.25 * f1 + 0.25 * f2;
    float gE = 0.10 + 0.05 * field + 0.04 * energy_env + 0.02 * mids_env;
    gE *= 1.0 - 0.45 * smoothstep(0.30, 0.85, rad);
    vec2 dl = vec2(D_GROUND + (field - 0.5) * 0.03, gE);

    // DUST RIBBON - the radial gap from this pixel to the nearest turn of each arm's log spiral, painted at
    // the depth of the path there, so the arm reads as one stroke through the picture.
    float kk = log(R1 / R0) / (TURNS * TAU);
    float uu = log(max(rad, 1e-4) / R0) / kk;
    float tt = clamp(uu / (TURNS * TAU), 0.0, 1.0);
    float ribbon = 0.0;
    for (float a = 0.0; a < 4.0; a += 1.0){
        if (a >= na) break;
        float off  = a * TAU / na + spin_angle * 0.12;
        float dphi = uu - (ang - off);
        float wr   = (fract(dphi / TAU + 0.5) - 0.5) * TAU;
        float gap  = rad * kk * wr;
        ribbon = max(ribbon, exp(-gap * gap / 0.0006));
    }
    ribbon *= smoothstep(0.0, 0.15, tt) * smoothstep(1.0, 0.85, tt) * smoothstep(R0 * 0.8, R0, rad);
    float fadeOut = pow(1.0 - tt, 1.3);
    // RIPPLE: tRing = 1 - drop_glow runs hero -> rim as the latch decays; one-way, once per drop.
    float tRing   = clamp(1.0 - drop_glow, 0.0, 1.0);
    float ringAmp = smoothstep(0.0, 0.33, drop_glow);
    float ringG   = exp(-pow((tt - tRing) / 0.09, 2.0));
    float ribA = clamp(ribbon * DUST * mix(0.55, 1.0, fadeOut) / sqrt(na), 0.0, 1.0);
    float ribE = (0.22 + 0.12 * energy_env) * mix(0.6, 1.0, fadeOut) + ringG * ringAmp * 0.7;
    dl = mix(dl, vec2(pathDepth(tt), clamp(ribE, 0.0, 1.0)), ribA);

    // THE SPIRAL - beads born at the hero's rim, travelling on flow_phase, surging on hue_phase (both monotonic).
    for (float a = 0.0; a < 4.0; a += 1.0){
        if (a >= na) break;
        float mirror = (CHIRAL > 0.5 && mod(a, 2.0) > 0.5) ? -1.0 : 1.0;
        for (float i = 0.0; i < 48.0; i += 1.0){
            if (i >= n) break;
            float id = i + a * 100.0 + 1.0;
            float h1 = hash11(id * 12.9898 + 3.1);
            float h2 = hash11(id * 78.233  + 7.7);

            float t   = fract((i + 0.5) / n + flow_phase * FLOW + hue_phase * SURGE + a * 0.5 / na);
            float w   = mix(1.0, smoothstep(0.0, 0.10, t) * smoothstep(1.0, 0.82, t), TAIL);

            float th  = t * TURNS * TAU + a * TAU / na + spin_angle * 0.12;
            float sr  = R0 * pow(R1 / R0, t);
            float br  = B0 * pow(sr / R0, SIZE_EXP);
            vec2  c   = vec2(cos(th), sin(th)) * sr;

            float dir    = (h1 < 0.75 ? -1.0 : 1.0) * mirror;
            float orient = ALIGN * th + spin_angle * (0.20 + h2 * 0.35) * dir;

            float k = mod(i, 6.0);
            float drive = k < 0.5 ? bass_env : k < 1.5 ? mids_env : k < 2.5 ? treble_env
                        : k < 3.5 ? entropy_env : k < 4.5 ? centroid_env : flux_env;

            float born  = smoothstep(0.30, 0.0, t);
            float ringB = 2.5 * ringAmp * exp(-pow((t - tRing) / 0.12, 2.0));
            drawBead(uv, c, br, orient, mirror, pathDepth(t), clamp(drive, 0.0, 1.0), w, born, 1.0, ringB, 0.85 + 0.15 * h1, dl);
        }
    }

    // THE HERO - centred, slowest spin, the still point everything is born from: the vanishing point in
    // TUNNEL mode (violet), the nearest thing in FOUNTAIN mode (red). Dark interior, outline like its children.
    float heroDepth = CD_MODE < 0.5 ? D_FAR + 0.06 : D_NEAR + 0.03;
    drawBead(uv, vec2(0.0), HERO_R, spin_angle * 0.05, 1.0, heroDepth, clamp(energy_env, 0.0, 1.0), 1.0, 0.0, 0.15, 0.35 + 2.0 * drop_glow, 1.0, dl);

    if (cddebug > 0.5){ fragColor = vec4(vec3(clamp(dl.x, 0.0, 1.0)), 1.0); return; }
    vec3 col = cdpal(dl.x, pow(clamp(dl.y, 0.0, 1.0), 0.85));
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
