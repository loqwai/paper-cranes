// LATTICE-BEAD-VJ / satellites-chroma.frag (2026-09-04, from satellites.frag) - HERO + SATELLITES, FOR CHROMADEPTH GLASSES.
// @name: bead satellites 3D
// @fullscreen: true
// @mobile: false
// @tags: bead, mon, hero, orbit, chromadepth, 3d, redaphid
//
// satellites.frag with its colour pipeline replaced by the ChromaDepth discipline of chroma.frag:
// HUE IS A FUNCTION OF DEPTH AND NOTHING ELSE, and everything the music does arrives as EXPOSURE.
// Through the glasses red is near and violet is far, so the frame is laid out as a SCENE:
//
//   depth 0.00-0.12  THE HERO    nearest. Its contour is a hot red line (fresnel: the silhouette of a
//                                round thing is the part of it nearest your eye); the body is a shallow
//                                dome, red at the core through orange toward the edge.
//   depth 0.28-0.56  SATELLITES  a ring in the middle distance, TILTED toward the viewer: a bead at the
//                                bottom of its orbit is nearest (yellow), at the top it is farthest (cyan).
//                                The orbit angle is spin_angle (monotonic), so each satellite swims
//                                smoothly through depth as it goes round, and a small perspective scale
//                                (0.88..1.12) plus a squashed ellipse agree with the colour.
//   depth 0.74-0.96  GROUND      blue beside the hero falling to violet at the corners. The hero's outline
//                                echoes are a travelling STAIRCASE on it (bounded, zero-mean, one way),
//                                lit at the step edges. The radial field is a bounded texture wiggle.
//
// Everything satellites.frag did with the music still happens - as light: rim punch, interior lift,
// inset-echo flash, the drop ring (now red = it comes AT you), the ground echoes. The ONE hue move is
// the bead-masked BEAT POP: on the kick a bead's depth is pulled toward you (clamped, never wrapped),
// which is the guide's "shift toward red on the beat" made local, so it cannot strobe the frame.
//
// Forbidden here, allowed in satellites.frag: hue_phase on hue, the key/timbre medians on hue, per-bead
// hue offsets, K9 HUE SPREAD and K11 TILT (both rotated hue). K9/K11 are re-purposed, see KNOBS.
// Compositing is FRONT-MOST (mix by coverage), never additive: the sum of two depths' colours is a
// third, wrong depth. White is unreachable by construction: L <= 0.55, saturation 0.97.
//
// Requires ?controller=dodeca-bloom. ?cddebug=1 renders the depth field as greyscale
// (scripts/lab/cd-measure.mjs checks hue against it).

uniform float spin_angle;    // monotonic - orbit + per-bead spin
uniform float morph_phase;   // monotonic - background structure evolution
uniform float flow_phase;    // monotonic - ground staircase travel
uniform float hue_phase;     // monotonic - declared for parity with satellites.frag; deliberately NOT on hue

uniform float bass_env;      // slow smoothed levels
uniform float mids_env;
uniform float treble_env;
uniform float energy_env;
uniform float entropy_env;
uniform float centroid_env;
uniform float flux_env;

uniform float knob_1; uniform float knob_2; uniform float knob_3; uniform float knob_4; uniform float knob_7; uniform float knob_8; uniform float knob_9; uniform float knob_10; uniform float knob_11;   // K-knobs, see the KNOBS block
uniform float bass_pump;     // FAST - beads only
uniform float drop_glow;
uniform float pitch_pulse;

uniform float spectralCentroidMedian;  // SLOW timbre -> ground staircase pitch (a slow SHAPE, never hue)
uniform float satellites;    // ?satellites=0..9 how many orbit (default 6)
uniform float heroScale;     // ?heroScale= hero size (default 0.20)
uniform float bgAmount;      // ?bgAmount=0..1 ground presence (default 0.7)
uniform float cddebug;       // ?cddebug=1 paint the depth field as greyscale

#define TAU 6.28318530718
#define BEAD_RANGE 6.0
#define SAT_COUNT (satellites > 0.0 ? clamp(floor(satellites), 1.0, 9.0) : 6.0)
#define HERO_R    ((heroScale > 0.0 ? heroScale : 0.20) * SIZE)
// ── KNOBS ── URL ?knob_N=0..1 or the pad. 0 = unset = baked default (the house convention).
//   knob_5 SPIN RATE and knob_6 DROP SUSTAIN belong to the dodeca-bloom controller.
#define IMPACT    (knob_1 > 0.001 ? knob_1 * 2.4 : 1.0)   // K1 IMPACT   how hard the beat hits the beads (rim, interior, insets); 0.42 = baked
#define PUMP      (knob_2 > 0.001 ? knob_2 * 2.4 : 1.0)   // K2 PUMP     size swell on the kick and on drops; 0.42 = baked
#define RING      (knob_3 > 0.001 ? knob_3 * 2.4 : 1.0)   // K3 RING     brightness of the once-per-drop red ring; 0.42 = baked
#define GLOW      (knob_4 > 0.001 ? knob_4 * 1.8 : 1.0)   // K4 GLOW     ground light and echo amount; 0.55 = baked
#define SIZE      (knob_7 > 0.001 ? 0.5 + knob_7 : 1.0)   // K7 SIZE     hero size multiplier 0.5..1.5; 0.5 = baked
#define SPARK     (knob_8 > 0.001 ? knob_8 * 2.4 : 1.0)   // K8 SPARK    treble -> outline and inset light; 0.42 = baked
#define SPREAD    (knob_9 > 0.001 ? knob_9 * 2.4 : 1.0)   // K9 DEPTH SPREAD how far the satellites swim through depth around the orbit; 0.42 = baked
#define ORBIT     (knob_10 > 0.001 ? 0.5 + knob_10 : 1.0) // K10 ORBIT   satellite orbit radius 0.5..1.5; 0.5 = baked
#define POP       (knob_11 > 0.001 ? knob_11 * 2.4 : 1.0) // K11 POP     how far a kick pulls a bead toward the viewer; 0.42 = baked
#define BG_AMT    ((bgAmount  > 0.0 ? bgAmount  : 0.7) * GLOW)

// ── THE DEPTH LAYOUT (hue = depth * 0.75: 0 red, 0.33 green, 0.67 blue, 0.75 violet) ─────────
#define D_HERO   0.00   // hero contour and core
#define D_DOME   0.12   // the hero body falls to this at its edge (orange)
#define D_SAT_N  0.28   // a satellite at the bottom of its orbit (yellow)
#define D_SAT_F  0.56   // at the top (cyan)
#define D_GND_N  0.74   // ground beside the hero (blue)
#define D_GND_F  0.96   // ground at the corners (violet)

// ── CHROMADEPTH PALETTE (chroma.frag's, unchanged) ───────────────────────────────────────────
// HSL on purpose, not Oklch: the glasses are a prism and act on the RAW spectral order. seed2 gets
// one bounded offset (0.03 max) because it is constant per device: the whole map slides together, so
// the ORDER survives. Lightness capped at 0.55 with saturation 0.97: the largest channel hsl2rgb
// can emit is 0.964, so white is unreachable by construction, not by tuning.
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

// Stable hash. NEVER fract(sin(x)*43758.5453) - see satellites.frag.
float hash11(float p){
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}
mat2 rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

// The baked mon SDF: G is the signed distance (0.5 == boundary). Sampled at p/r and scaled back by r.
float beadDist(vec2 p, float r){
    vec2 q  = p / max(r, 1e-3);
    vec2 tc = q * 0.5 + 0.5;
    vec2 tcc = clamp(tc, 0.0, 1.0);
    float d = (getInitialFrameColor(tcc).g - 0.5) * 2.0 * BEAD_RANGE;
    d += length(tc - tcc) * 2.0;
    return d * r;
}

// ── ONE BEAD -> a (depth, exposure) layer composited FRONT-MOST over dl ──────────────────────
// dl.x is depth, dl.y is exposure. The only place the fast channels appear; every fast term is masked
// by coverage or the contour. Geometry (spin, flex, size) is byte-for-byte satellites.frag's.
void drawBead(vec2 p, vec2 centre, float r, float idx, float slowDrive, float baseDepth, inout vec2 dl, inout float cover){
    float h1 = hash11(idx * 12.9898 + 3.1);
    float h2 = hash11(idx * 78.233  + 7.7);
    float h3 = hash11(idx * 37.719  + 1.3);

    vec2 q = p - centre;
    float dir = h1 < 0.5 ? -1.0 : 1.0;
    q = rot(spin_angle * (0.25 + h2 * 0.55) * dir) * q;                       // forward only, never unwinds
    float flex = 1.0 + 0.08 * (slowDrive - 0.5) * 2.0 + 0.04 * sin(morph_phase * 0.7 + h3 * TAU);
    q /= max(flex, 0.6);                                                        // isotropic breath: the crest keeps its aspect
    float rr = r * (1.0 + 0.16 * (slowDrive - 0.5));

    float d  = beadDist(q, rr);
    float pumpS = 1.0 + (idx < 0.5 ? (0.07 * bass_pump + 0.10 * drop_glow) : (0.04 * bass_pump)) * PUMP;
    float dP = beadDist(q, rr * pumpS);                                         // pumped silhouette; echoes keep d
    float aa = max(BEAD_RANGE * 2.5 / iResolution.y, 1e-4);                     // AA from screen size (NEAREST-sampled SDF)
    float cov = smoothstep(aa, -aa, dP);
    float rim = smoothstep(aa * 3.0, 0.0, abs(dP)) * mix(0.30, 1.0, cov);      // 3 px, coverage-referenced outside
    float inner = clamp(-dP / (rr * 2.4), 0.0, 1.0);                            // 0 at the contour -> 1 at the core (d is 6x true distance)
    bool hero = idx < 0.5;

    // ── DEPTH: geometry, plus the bead-masked pop. Subtracted and CLAMPED, never wrapped, so the
    //    nearest things saturate at red instead of rolling over into violet.
    float dome  = hero ? D_DOME : 0.08;
    float pop   = (0.06 * bass_pump + 0.05 * drop_glow) * POP * (hero ? 1.0 : 0.7);
    float dBody = clamp(baseDepth + dome * (1.0 - inner) - pop, 0.0, 1.0);      // core nearest, edge falls away: a dome
    float dRim  = clamp(baseDepth - (hero ? 0.0 : 0.04) - pop, 0.0, 1.0);       // fresnel: the contour is thrown at the viewer

    // ── EXPOSURE: all the music, local. Never a global multiplier.
    float lift  = 0.85 + (0.65 * bass_pump + 0.80 * drop_glow) * IMPACT;
    float eBody = (0.34 + 0.24 * slowDrive) * lift * (hero ? 1.0 : 0.85);
    eBody *= mix(0.70, 1.0, sqrt(inner));                                       // a lit dome: bright core, edge falls off (fixed geometry)
    float ringP = rr * 1.15;                                                    // inset copies of the crest's own outline
    float inset = smoothstep(aa * 2.0, 0.0, abs(fract(-dP / ringP + 0.5) - 0.5) * ringP) * cov * smoothstep(0.0, aa * 6.0, -dP);
    eBody += inset * (0.22 + 0.18 * slowDrive + 0.35 * bass_pump * IMPACT + 0.25 * treble_env * SPARK);
    eBody = clamp(eBody, 0.0, 1.0);
    float eRim  = clamp((0.60 + 0.25 * (0.80 * bass_pump + 1.00 * drop_glow + 0.40 * pitch_pulse) * IMPACT + 0.10 * treble_env * SPARK) * (hero ? 1.0 : 0.85), 0.0, 1.0);

    if (hero){
        // GROUND STAIRCASE + ECHOES: the hero's outline ripples outward on flow_phase. The sawtooth is
        // mean-zero and bounded (+/-0.03 depth), so every ground point's mean depth is its true depth -
        // nothing drifts, nothing snaps - and the exposure line sits on each step edge. Masked to what is
        // still ground: outside this silhouette and not under a satellite.
        float P     = ringP * mix(1.4, 1.9, clamp((spectralCentroidMedian - 0.15) * 3.0, 0.0, 1.0));   // pitch: a slow SHAPE from the timbre median
        float ph    = flow_phase * 0.16;
        float saw   = fract(d / P - ph) - 0.5;
        float reach = exp(-max(d, 0.0) / (rr * 6.5)) * (1.0 - cov) * (1.0 - cover);
        dl.x = clamp(dl.x - saw * 0.06 * reach, 0.0, 1.0);
        float echo  = smoothstep(aa * 3.0, 0.0, abs(fract(d / P - ph + 0.5) - 0.5) * P) * reach;   // the line is AT the step
        dl.y = clamp(dl.y + echo * (0.28 + 0.22 * energy_env) * BG_AMT, 0.0, 1.0);
        // DROP RING: once per drop the hero's own outline leaves the rim and runs outward as drop_glow
        // decays. Painted at depth 0, RED: through the glasses it comes at you. Width in pixels.
        float tRing = 1.0 - clamp(drop_glow, 0.0, 1.0);
        float dropR = rr * mix(1.25, 7.0, tRing);
        float dring = smoothstep(4.0, 0.0, abs(d - dropR) / max(fwidth(d), 1e-5)) * (1.0 - cov);
        dl = mix(dl, vec2(0.0, 0.95), clamp(dring * clamp(drop_glow, 0.0, 1.0) * 1.4 * RING, 0.0, 1.0));
    }

    dl = mix(dl, vec2(dBody, eBody), cov);
    dl = mix(dl, vec2(dRim, eRim), rim);
    cover = max(cover, cov);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // ── GROUND: blue by the hero, violet at the corners; slow channels and phases only ────────
    float r  = length(uv);
    float a  = atan(uv.y, uv.x);
    float f1 = sin(r * 5.3 - flow_phase * 0.35 + a * 2.0);
    float f2 = sin(r * 8.1 + morph_phase * 0.21 - a * 3.0);
    float field = 0.5 + 0.25 * f1 + 0.25 * f2;
    float gDepth = mix(D_GND_N, D_GND_F, smoothstep(0.0, 0.85, r)) + (field - 0.5) * 0.03;   // bounded texture wiggle
    float gE = (0.15 + 0.10 * field + 0.05 * energy_env + 0.03 * mids_env) * BG_AMT;
    gE *= 1.0 - 0.55 * smoothstep(0.30, 0.80, r);                                            // vignette: corners quiet
    vec2 dl = vec2(gDepth, gE);

    float cover = 0.0;
    float fit = min(1.0, (0.5 * iResolution.x / iResolution.y) / 0.47);   // portrait: the whole group scales, uniformly

    // ── SATELLITES: a tilted ring. Bottom of the orbit = nearest = yellow, top = farthest = cyan ─
    float n = SAT_COUNT;
    for (float i = 0.0; i < 9.0; i += 1.0){
        if (i >= n) break;
        float t  = i / n;
        float hh = hash11(i * 5.17 + 2.3);
        float ang  = spin_angle * (0.12 + hh * 0.10) + t * TAU;             // monotonic, never a feature
        float near = 0.5 - 0.5 * sin(ang);                                   // 1 at the bottom of the orbit
        float orb  = (0.335 + 0.030 * sin(morph_phase * 0.33 + t * TAU)) * fit * ORBIT;
        vec2  c    = vec2(cos(ang), sin(ang) * 0.86) * orb;                  // the ring is tilted toward you
        float depth = mix(D_SAT_F, D_SAT_N, clamp(0.5 + (near - 0.5) * SPREAD, 0.0, 1.0));
        float psz   = mix(0.88, 1.12, near);                                 // perspective agrees with the colour

        float k = mod(i, 6.0);
        float drive = k < 0.5 ? bass_env
                    : k < 1.5 ? mids_env
                    : k < 2.5 ? treble_env
                    : k < 3.5 ? entropy_env
                    : k < 4.5 ? centroid_env
                    :           flux_env;

        drawBead(uv, c, (0.062 + hh * 0.030) * fit * psz, i + 1.0, clamp(drive, 0.0, 1.0), depth, dl, cover);
    }

    // ── THE HERO: centred, nearest, drawn last so it is front-most ─────────────────────────────
    drawBead(uv, vec2(0.0), HERO_R * fit, 0.0, clamp(energy_env, 0.0, 1.0), D_HERO, dl, cover);

    if (cddebug > 0.5){ fragColor = vec4(vec3(clamp(dl.x, 0.0, 1.0)), 1.0); return; }
    vec3 col = cdpal(dl.x, pow(clamp(dl.y, 0.0, 1.0), 0.85));
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
