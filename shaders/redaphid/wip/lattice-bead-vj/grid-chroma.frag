// GRID BEAD LATTICE, FOR CHROMADEPTH GLASSES (lattice-bead-vj/grid-chroma, 2026-09-04, from grid.frag).
// @name: bead grid 3D
// @fullscreen: true
// @mobile: true
// @tags: mogee, lattice-bead, mon, chromadepth, 3d, redaphid
//
// grid.frag's coordinate proof and cell mechanics are untouched (square tiles on any viewport, a WHOLE
// crest per cell, one-way tide, lattice-nav pan/zoom, the travelling hero cell). The colour pipeline is
// chroma.frag's: hue is DEPTH and nothing else, the music arrives as exposure, L <= 0.55 so white is
// unreachable, and layers composite front-most. What the glasses see, per cell:
//   the OUTLINE      nearest: a hot red line, the one bright thing.
//   the INTERIOR     a STAIRCASE that steps back from the outline to a dark green well at the core. The
//                    steps ARE the outline-echo rings: depth uses the signed distance QUANTISED to the ring
//                    pitch, so every terrace is flat and the exposure line sits exactly on its edge. The
//                    pitch follows the spectral-spread MEDIAN (a slow shape); the terraces travel inward
//                    one way on flowPhase as a bounded, zero-mean correction of the true distance, so
//                    nothing drifts and nothing snaps. Every step is darker (chroma.md's exposure ladder).
//   the GROUND       steps OUT from the outline through cyan and blue to violet at the tile boundary, where
//                    it meets the neighbour's steps: every interaction between cells is the crest's own
//                    outline receding.
//   PER-CELL DEPTH   each crest's interior is pushed back by 0..0.12 (golden-ratio spread over the tile id),
//                    so neighbours sit at different depths; rims stay nearest.
//   THE HERO CELL    grid.frag's lit crest travelling the diagonal: more exposure, and pulled a little
//                    toward you (lighting-only in grid.frag; here the pull is a bounded depth term on a
//                    monotonic phase, so it is smooth).
// Beat pop: wavelet_bassHitSmooth pulls the crest toward the viewer, bead-masked and clamped - never global.
// Forbidden here, allowed in grid.frag: the key/timbre medians on hue, the hue tide, per-cell TINT.
//
// URL: ?shader=redaphid/wip/lattice-bead-vj/grid-chroma&controller=wavelet-ease&controller=lattice-nav
//      &image=images/beads/mon-hakkaku.png&wavelet=true
// KNOBS (0 = baked default):
//   knob_1 TILES        crests across the screen height (baked 3.2; 0.1..1 -> 1.5..8)
//   knob_2 ECHO         terrace-edge light (baked 1.0; dial 0..2)
//   knob_3 DEPTH SPREAD per-cell push back, 0..this (baked 0.12; dial 0..0.30)
//   knob_4 GROUND       ground light (baked 1.0; dial 0..2)
//   knob_5 DRIFT        tide rate (baked 1.0; dial 0..2)
//   knob_6 POP          kick pull toward the viewer (baked 0.05; dial 0..0.12)

uniform float flowPhase;              // wavelet-ease: monotonic
uniform float spinPhase;              // wavelet-ease: monotonic
uniform float quietGate;              // wavelet-ease: 0 in silence
uniform float energySpring;           // wavelet-ease: smoothed level
uniform float waveletBassSpring;
uniform float waveletBand1Spring;
uniform float waveletBand2Spring;
uniform float waveletBand3Spring;
uniform float wavelet_bassHitSmooth;  // wavelet analyser: lightly smoothed kick trigger (non-strobing)
uniform float navX;                   // lattice-nav: world pan
uniform float navY;
uniform float navZoom;                // lattice-nav: pinch zoom (1 = rest)
uniform float spectralSpreadMedian;   // SLOW: harmonic width -> terrace pitch
uniform float cddebug;                // ?cddebug=1 paint the depth field as greyscale

#define TAU 6.283185307
#define LVK(k, def, expr) (((k) > 0.001) ? (expr) : (def))

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

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // ---- screen -> aspect-corrected ndc (tiles stay square on any viewport) ----
    vec2 ndc = fragCoord / iResolution.xy * 2.0 - 1.0;
    ndc.x *= iResolution.x / iResolution.y;

    // ---- tile-pitch space: 1 p-unit = 1 tile on both axes ----
    float nz    = navZoom > 0.001 ? navZoom : 1.0;
    float N     = LVK(knob_1, 3.2, mix(1.5, 8.0, knob_1)) / nz;              // K1 TILES
    float drift = LVK(knob_5, 1.0, knob_5 * 2.0);                            // K5 DRIFT
    vec2  tide  = vec2(0.045, 0.018) * flowPhase * drift;                   // one-way tide, never back
    vec2  p     = ndc * (N * 0.5) + tide + vec2(navX, navY) * (N * nz / 0.07);

    vec2  tileIndex = floor(p + 0.5);
    vec2  f         = fract(p + 0.5) - 0.5;

    // ---- HERO CELL: one lit crest travels the diagonal on a monotonic phase, peaking at screen centre ----
    float aspect  = iResolution.x / iResolution.y;
    float u       = fract(flowPhase * 0.24 + seed);
    float heroEnv = sin(u * 3.14159265);
    vec2  heroNdc = mix(vec2(-0.85 * aspect, -0.80), vec2(0.85 * aspect, 0.80), u);
    vec2  heroP   = heroNdc * (N * 0.5) + tide + vec2(navX, navY) * (N * nz / 0.07);
    float heroD   = length(tileIndex - heroP);
    float hero    = heroEnv * smoothstep(1.35, 0.15, heroD);
    float heroDim = heroEnv * smoothstep(3.0, 0.9, heroD) * (1.0 - smoothstep(1.35, 0.15, heroD)) * 0.18;

    // ---- per-cell identity: golden-ratio spread, neighbours always differ, nothing flickers ----
    float gid  = fract(dot(tileIndex, vec2(0.618034, 0.381966)) + seed);
    float gid2 = fract(dot(tileIndex, vec2(0.246979, 0.554958)) + seed2);
    float ang  = spinPhase * (0.10 + 0.08 * gid2) * (gid2 < 0.5 ? -1.0 : 1.0);
    float ca = cos(ang), sa = sin(ang);
    vec2  fr = mat2(ca, -sa, sa, ca) * f;

    // ---- whole crest per cell: sample the baked SDF once, clamped to the tile, extended outside ----
    vec2  tc  = fr + 0.5;
    vec2  tcc = clamp(tc, 0.0, 1.0);
    float d   = (getInitialFrameColor(tcc).g - 0.5) + length(tc - tcc);     // tile units, < 0 inside
    float pxPerUnit = iResolution.y / N;
    float dPx = d * pxPerUnit;

    float cov     = 1.0 - smoothstep(-1.0, 1.0, dPx);                        // 1 px edge
    float rim     = 1.0 - smoothstep(0.8, 3.4, abs(dPx));                    // the crisp outline, ~3 px
    float rimSoft = exp(-abs(dPx) / 16.0);                                   // glow either side

    // ---- the staircase: d quantised to the travelling ring pitch (bounded, zero-mean correction) ----
    float echoAmt = LVK(knob_2, 1.0, knob_2 * 2.0);                          // K2 ECHO
    float ringP   = mix(0.07, 0.11, clamp((spectralSpreadMedian - 0.20) * 2.5, 0.0, 1.0));
    float ph      = flowPhase * 0.25;
    float saw     = fract(d / ringP - ph) - 0.5;                             // mean-zero sawtooth
    float dq      = d - saw * ringP;                                         // d snapped to the staircase
    float rq      = abs(fract(d / ringP - ph + 0.5) - 0.5) * ringP * pxPerUnit;   // px to the nearest STEP EDGE
    float ring    = 1.0 - smoothstep(0.4, 2.2, rq);
    float reachIn  = exp(-max(-d, 0.0) / 0.30);
    float reachOut = exp(-max( d, 0.0) / 0.34);

    // ---- DEPTH: geometry only, plus the bead-masked pop and the hero pull (both clamped, never wrapped) ----
    float spread = LVK(knob_3, 0.12, knob_3 * 0.30);                         // K3 DEPTH SPREAD
    float off    = spread * gid;
    float innerQ = clamp(-dq / 0.22, 0.0, 1.0);                              // 0 at the outline -> 1 at the core, in steps (a crest's interior reaches ~0.25)
    float outerQ = clamp( dq / 0.20, 0.0, 1.0);                              // 0 at the outline -> 1 at the tile boundary, in steps
    float popAmt = LVK(knob_6, 0.05, knob_6 * 0.12);                         // K6 POP
    float pop    = popAmt * clamp(wavelet_bassHitSmooth, 0.0, 1.0) * quietGate + 0.05 * hero;
    float dIn    = clamp(0.02 + off + 0.40 * innerQ - pop, 0.0, 1.0);       // orange -> green well
    float dOut   = clamp(0.56 + 0.5 * off + 0.40 * outerQ, 0.0, 0.97);      // cyan -> violet
    float dRim   = clamp(0.3 * off - pop, 0.0, 1.0);                         // red, nearest

    // ---- EXPOSURE: all the music, local ----
    float groundLit = LVK(knob_4, 1.0, knob_4 * 2.0);                        // K4 GROUND
    float kick = clamp(wavelet_bassHitSmooth, 0.0, 1.0) * quietGate;                                     // the smoothed kick: crest-masked below, never global
    float eG = 0.09 * groundLit
             + ring * reachOut * echoAmt * (0.18 + 0.34 * waveletBand2Spring * quietGate + 0.35 * hero)
             + rimSoft * (0.08 + 0.07 * waveletBand1Spring * quietGate) * mix(0.73, 1.0, hero);
    eG *= 1.0 - heroDim;
    float eB = mix(0.42, 0.14, innerQ) + 0.24 * hero + 0.16 * kick                                       // every step darker: a well; the kick lights the crest
             + smoothstep(0.55, 1.0, innerQ) * energySpring * quietGate * 0.35                          // the well breathes with level
             + ring * reachIn * echoAmt * (0.18 + 0.34 * waveletBand3Spring * quietGate) * mix(0.73, 1.0, hero);
    eB *= 1.0 - heroDim;
    float eR = clamp((0.62 + 0.20 * hero) * (1.0 + 0.32 * waveletBassSpring * quietGate) + 0.08 * waveletBand1Spring * quietGate, 0.0, 1.0)
             * mix(0.80, 1.0, hero);                                                                      // crowd rim dimmer than the hero's

    // ---- front-most compositing ----
    vec2 dl = vec2(dOut, clamp(eG, 0.0, 1.0));
    dl = mix(dl, vec2(dIn, clamp(eB, 0.0, 1.0)), cov);
    dl = mix(dl, vec2(dRim, eR), rim);
    dl.y *= 1.0 - 0.35 * smoothstep(0.7, 1.7, length(ndc));                  // gentle spatial vignette (constant mask)

    if (cddebug > 0.5){ fragColor = vec4(vec3(clamp(dl.x, 0.0, 1.0)), 1.0); return; }
    fragColor = vec4(clamp(cdpal(dl.x, pow(clamp(dl.y, 0.0, 1.0), 0.85)), 0.0, 1.0), 1.0);
}
