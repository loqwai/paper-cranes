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
//   DUST RIBBON   a faint coloured glow along each arm's exact spiral path (slow channels only),
//                 so the curve reads between the beads.
//   DROP SURGE    the birth position rides hue_phase, a monotonic accumulator whose RATE jumps on
//                 flux spikes and settles back (dodeca-bloom: 0.012 + max(0,fluxZ)*0.05 + ...).
//                 On a drop the whole arm surges outward and beads are born faster; it can never
//                 run backward. The counter-ratchet: the surge lives in a fract()-wrapped
//                 POSITION, not in a rate, so nothing accumulates without bound. Newborn beads
//                 flare on drop_glow, contour only.
//   CHIRALITY     with 2+ arms, odd arms are mirrored and spin the other way (tomoe curls both
//                 ways) - a stand-in for a second mon while there is one texture per page.
//
// Channel discipline (iris/2 via dodeca-bloom): every angle and position reads a MONOTONIC phase
// (spin_angle / flow_phase / hue_phase). Audio sets rates and shading, never an angle.
// FAST channels (bass_pump / drop_glow / pitch_pulse) appear only inside drawBead, only on the
// contour, narrow band, small punch range. Background lightness range is a few percent.
// Palette never reaches white. uv is normalised by iResolution.y and the SDF is sampled
// isotropically, so the outline is never stretched on any viewport (measured 1.012 / 1.008).
//
// Requires ?controller=dodeca-bloom (or the phases pinned as URL params). wavelet not needed.
// Params (0 = default): ?beads=4..48 (28)  ?turns= (2.2)  ?arms=1..4 (1)  ?sizeExp= (0.6)
//   ?flow= (0.015 - travel rate on flow_phase)  ?heroScale= (0.20)  ?hueSpan= (0.32)
//   ?align=0..1 (1)  ?tail=0..1 (1)  ?dust= (0.45; 0.001 = off)  ?surge= (0.03; 0.001 = off)
//   ?chiral=0..1 (1 - mirror odd arms; 0.001 = off)
//
// Best look (2026-09-04): the tomoe galaxy
//   ?shader=redaphid/wip/lattice-bead-vj/spiral&image=images/beads/mon-tomoe.png
//   &controller=dodeca-bloom&arms=2&beads=20&turns=1.6

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
uniform float dust;
uniform float surge;
uniform float chiral;

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
#define DUST     (dust      > 0.0 ? dust      : 0.45)
#define SURGE    (surge     > 0.0 ? surge     : 0.03)
#define CHIRAL   (chiral    > 0.0 ? chiral    : 1.0)
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
