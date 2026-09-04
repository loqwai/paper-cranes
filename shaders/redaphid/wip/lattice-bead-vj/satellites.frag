// LATTICE-BEAD (satellites.frag - 2026-09-04, from hero.frag) - THE HERO BEAD AND ITS SATELLITES.
// @name: bead satellites
// @fullscreen: true
// @mobile: false
// @tags: bead, mon, hero, orbit, redaphid
//
// A DIFFERENT ARCHITECTURE from the rest of this family. 3/4/detail are an infinite fract()
// tiling, and a tiling has no centre - so it can never have a hero. This draws a FIXED, SMALL
// NUMBER OF DISCRETE INSTANCES instead, which is what the hearts shaders do (hearts/1.frag
// orbits 25 hearts along a Mandelbrot path; hearts/spinny.frag runs 80 along twisting lines),
// and it is the only way to say "this bead, in the middle, is the one".
//
//   ONE HERO   centred, large, the subject of the frame.
//   SATELLITES on an orbit, each with its OWN slow feature for scale, its OWN spin rate, its
//              OWN hue offset and its OWN flex axis - so they read as a group of individuals
//              rather than one thing drawn N times.
//
// ── NOTHING SNAPS ────────────────────────────────────────────────────────────────────────
// User: "I don't want the overall camera animation to SNAP back and forth with rotations - it
// should use gates or whatever iris/2 uses." iris/2's model, from the dodeca-bloom controller:
//
//     "evolving states move UNIDIRECTIONALLY - monotonic accumulators whose RATE the music
//      sets (forward only, never snap back). Levels use smoothed envelopes."
//
// So EVERY rotation and every orbit here reads `spin_angle`, a monotonic accumulator. Audio
// sets how FAST it advances and can never rewind it. There is not one `rot(someFeature)` in
// this file, because that is precisely what snaps: the feature falls, and the angle unwinds.
//
// ── THE BACKGROUND IS SLOW, BY CONSTRUCTION ──────────────────────────────────────────────
// User: "NO shuddering or quick breathing of the background."
// The controller separates its channels and so does this shader:
//     SLOW  *_env (bass/mids/treble/energy/entropy/centroid/flux) + the monotonic phases
//     FAST  bass_pump, drop_glow, pitch_pulse
// The background reads ONLY the slow set and the phases. The fast channels are referenced
// exclusively inside the bead draw, masked by coverage. A grep for bass_pump / drop_glow /
// pitch_pulse outside `drawBead` should return nothing - that is the invariant.
//
// ── CHANNEL HIERARCHY (paid for with live failures, see lattice-vj/HANDOFF.md) ───────────
//   * brightness NEVER in a global multiplier - it becomes a strobe channel
//   * geometry only EVOLVES: per-frame audio must not move a boundary. Scale here rides slow
//     envelopes and monotonic phases only, and is capped.
//   * a ratchet needs a counter-ratchet in the same edit
//   * colour follows the SLOWEST music; light and shading take the fast audio
//
// Requires ?controller=dodeca-bloom for the phases and envelopes. Without it every uniform
// below reads 0 and the frame is static - which is a legible failure, not a broken one.

uniform float spin_angle;    // monotonic - orbit + per-bead spin
uniform float morph_phase;   // monotonic - background structure evolution
uniform float flow_phase;    // monotonic - background flow
uniform float hue_phase;     // monotonic - palette journey

uniform float bass_env;      // slow smoothed levels
uniform float mids_env;
uniform float treble_env;
uniform float energy_env;
uniform float entropy_env;
uniform float centroid_env;
uniform float flux_env;

uniform float bass_pump;     // FAST - beads only
uniform float drop_glow;
uniform float pitch_pulse;

uniform float satellites;    // ?satellites=0..9 how many orbit (default 6)
uniform float heroScale;     // ?heroScale= hero size (default 0.20; the 0.62 first cut more than filled the frame)
uniform float bgAmount;      // ?bgAmount=0..1 background presence (default 0.7)

#define TAU 6.28318530718
#define BEAD_RANGE 6.0
#define SAT_COUNT (satellites > 0.0 ? clamp(floor(satellites), 1.0, 9.0) : 6.0)
// uv is normalised by iResolution.y, so the visible frame is +/-0.5 vertically. The first
// version used 0.62 here and an orbit of 0.86 - the hero more than filled the screen and
// every satellite sat outside it. Sizes are in those half-height units.
#define HERO_R    (heroScale > 0.0 ? heroScale : 0.20)
#define BG_AMT    (bgAmount  > 0.0 ? bgAmount  : 0.7)

// Stable hash. NEVER fract(sin(x)*43758.5453): it is unstable in float32 - its ULP near the
// values this shader produces is comparable to sin's own error - and it caused a two-state
// flicker in this family that took a full session to find.
float hash11(float p){
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

mat2 rot(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

// oklab2rgb / oklch2rgb are provided by the paperCranes wrapper - do NOT redefine them
// (GLSL reports 'function already has a body' and the compile dies).
// Hue-preserving soft clip: scale the whole triple by a roll-off on its MAX, so an over-bright
// colour desaturates toward white the way film does instead of shifting hue. (The lattice
// family learned this the hard way - clipping ONE channel produced a flat fuchsia.)
vec3 softClip(vec3 c){
    c = max(c, vec3(0.0));
    float mx = max(c.r, max(c.g, c.b));
    if (mx <= 0.0) return c;
    const float K = 0.80;
    float r = mx < K ? mx : 1.0 - (1.0 - K) * exp(-(mx - K) / (1.0 - K));
    return c * (r / mx);
}
vec3 lch(float h, float C, float L){
    return oklch2rgb(vec3(L, C, fract(h) * TAU));
}

// The baked mon SDF: A silhouette, R ink, G the signed distance (0.5 == boundary), B spare.
// Sampled at p/r and multiplied back by r, so one texture serves any bead size.
float beadDist(vec2 p, float r){
    vec2 q  = p / max(r, 1e-3);
    vec2 tc = q * 0.5 + 0.5;
    vec2 tcc = clamp(tc, 0.0, 1.0);
    float d = (getInitialFrameColor(tcc).g - 0.5) * 2.0 * BEAD_RANGE;
    d += length(tc - tcc) * 2.0;          // monotone exterior beyond the texture
    return d * r;
}

// ── ONE BEAD ─────────────────────────────────────────────────────────────────────────────
// The ONLY place the fast channels (bass_pump / drop_glow / pitch_pulse) are allowed. Every
// term is masked by coverage or the contour, so none of them can reach the background and
// none is a global multiplier.
//
//   spin   monotonic phase x a per-bead rate  - forward only, never unwinds
//   flex   anisotropic scale on a SLOW env    - breathes, cannot pump
//   tint   hue_phase + a per-bead offset      - colour follows the slowest music
vec3 drawBead(vec2 p, vec2 centre, float r, float idx, float slowDrive, inout float cover){
    float h1 = hash11(idx * 12.9898 + 3.1);
    float h2 = hash11(idx * 78.233  + 7.7);
    float h3 = hash11(idx * 37.719  + 1.3);

    vec2 q = p - centre;
    // SPIN: rate varies per bead, direction fixed per bead. spin_angle only ever increases,
    // so a tempo change alters speed and never reverses the bead mid-turn.
    float dir = h1 < 0.5 ? -1.0 : 1.0;
    q = rot(spin_angle * (0.25 + h2 * 0.55) * dir) * q;

    // FLEX: a gentle anisotropic squash on this bead's own slow driver, plus an always-on
    // breath so a bead is never frozen when its feature happens to sit still. Capped at 12%
    // because this is geometry, and geometry only evolves.
    float flex = 1.0 + 0.08 * (slowDrive - 0.5) * 2.0 + 0.04 * sin(morph_phase * 0.7 + h3 * TAU);
    q.x /= max(flex, 0.6);
    q.y *= max(flex, 0.6);

    // GROW / SHRINK: also on the slow driver. Same reasoning, same cap.
    float rr = r * (1.0 + 0.16 * (slowDrive - 0.5));

    float d  = beadDist(q, rr);
    // AA FROM SCREEN SIZE, NOT FROM d. The mon SDF is uploaded NEAREST with no mipmaps, so at
    // this magnification d is stair-stepped and fwidth(d) reports the STEP, not the true
    // gradient - which rendered as heavy dither along every edge on the first look. d runs at
    // roughly BEAD_RANGE per uv unit regardless of r, and uv is normalised by height, so one
    // pixel is BEAD_RANGE/iResolution.y of d.
    float aa = max(BEAD_RANGE * 2.5 / iResolution.y, 1e-4);
    float cov = smoothstep(aa, -aa, d);
    // RIM - THE FLASH FIX (2026-09-04). The first cut used a symmetric aa*9 band with punch up to
    // 4.2x, and hero-deaf.mjs measured the fast channels repainting 53% of the frame: the halo
    // WAS the background flash the user forbade. "Confined to drawBead" is not "confined to the
    // bead" - measure the extent, never reason from the call site. Now a 3-px band, and the part
    // OUTSIDE the silhouette is referenced to coverage so the swing lives on the contour.
    float rim = smoothstep(aa * 3.0, 0.0, abs(d)) * mix(0.30, 1.0, cov);

    // TINT: each bead sits at its own place on the palette journey. hue_phase is monotonic,
    // so the whole group drifts through colour together without any of them jumping.
    float hue = hue_phase * 0.08 + h1 * 0.55 + centroid_env * 0.06;
    float L   = 0.34 + 0.30 * slowDrive + 0.10 * treble_env;
    float C   = 0.10 + 0.05 * entropy_env;

    vec3 body = lch(hue, C, L);
    vec3 edge = lch(hue + 0.10, C * 1.25, min(L + 0.30, 0.86));

    // FAST channels, confined here and masked. drop_glow is a LATCHED envelope with decay, so
    // it swells and falls rather than strobing; bass_pump lifts the contour, which is a thin
    // high-contrast line and therefore reads as punch without lifting frame luminance much.
    float punch = 0.55 + 0.45 * bass_pump + 0.75 * drop_glow + 0.30 * pitch_pulse;   // was 1.30/1.90/0.80 (7.6x swing)
    // interior relief on the kick - masked by coverage, so it is local light inside the bead
    // (the hero-folded "dome" rule), and it keeps the beads visibly answering the music now that
    // the halo no longer carries the punch.
    float lift  = 0.85 + 0.30 * bass_pump + 0.45 * drop_glow;

    vec3 col = body * cov * lift + edge * rim * punch;
    cover = max(cover, cov);
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // ── BACKGROUND ───────────────────────────────────────────────────────────────────────
    // SLOW ONLY. Reads the monotonic phases and the smoothed envelopes; never bass_pump,
    // drop_glow or pitch_pulse. Two incommensurate rates so the field never visibly repeats,
    // and both are driven by phases, so it drifts rather than breathes.
    float r  = length(uv);
    float a  = atan(uv.y, uv.x);
    float f1 = sin(r * 5.3 - flow_phase * 0.35 + a * 2.0);
    float f2 = sin(r * 8.1 + morph_phase * 0.21 - a * 3.0);
    float field = 0.5 + 0.25 * f1 + 0.25 * f2;

    float bgHue = hue_phase * 0.05 + 0.55 + centroid_env * 0.10 + field * 0.06;
    // Lightness rides ONLY slow envelopes, and gently: this is the surface the user asked to
    // stop shuddering, so its whole dynamic range is a few percent.
    float bgL   = 0.10 + 0.05 * field + 0.045 * energy_env + 0.03 * mids_env;
    float bgC   = 0.035 + 0.020 * entropy_env;
    vec3  col   = lch(bgHue, bgC, bgL) * BG_AMT;

    // vignette keeps the hero the subject and the corners quiet
    col *= 1.0 - 0.55 * smoothstep(0.30, 0.80, r);

    float cover = 0.0;

    // ── SATELLITES ───────────────────────────────────────────────────────────────────────
    // Drawn first so the hero composites over them. Each takes a DIFFERENT slow envelope as
    // its driver, so neighbours grow and flex on different musical quantities instead of in
    // unison - which is what makes a group read as individuals.
    float n = SAT_COUNT;
    for (float i = 0.0; i < 9.0; i += 1.0){
        if (i >= n) break;
        float t  = i / n;
        float hh = hash11(i * 5.17 + 2.3);
        // ORBIT: angle is a monotonic phase plus a fixed per-bead offset. Never a feature.
        float ang = spin_angle * (0.12 + hh * 0.10) + t * TAU;
        float orb = 0.335 + 0.030 * sin(morph_phase * 0.33 + t * TAU);
        vec2  c   = vec2(cos(ang), sin(ang)) * orb;

        // one slow driver per bead, six ways
        float k = mod(i, 6.0);
        float drive = k < 0.5 ? bass_env
                    : k < 1.5 ? mids_env
                    : k < 2.5 ? treble_env
                    : k < 3.5 ? entropy_env
                    : k < 4.5 ? centroid_env
                    :           flux_env;

        col += drawBead(uv, c, 0.062 + hh * 0.030, i + 1.0, clamp(drive, 0.0, 1.0), cover);
    }

    // ── THE HERO ─────────────────────────────────────────────────────────────────────────
    // Centred, large, spinning slowest of anything on screen so it reads as the still point.
    float heroCover = 0.0;
    col += drawBead(uv, vec2(0.0), HERO_R, 0.0, clamp(energy_env, 0.0, 1.0), heroCover);

    // Counter-ratchet: the vignette and the satellites both take light out of the frame, so
    // the hero's own ground lifts a little as the music does - a drop buys contrast rather
    // than only dimming the surround. Masked to the hero, so not a global multiplier.
    col += lch(hue_phase * 0.08 + 0.12, 0.06, 0.20) * heroCover * (0.10 + 0.25 * energy_env);

    fragColor = vec4(pow(clamp(softClip(col), 0.0, 1.0), vec3(0.85)), 1.0);
}
