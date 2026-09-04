// GRID BEAD LATTICE (lattice-bead-vj/grid, 2026-09-04) -- the clearest "lattice of bead cells":
// a translation-repeat grid of WHOLE mon crests (one per cell, never mirrored, never folded), so
// every cell is nameable at a glance. Built on lattice-bead/grid.frag's coordinate proof (grid.md):
// aspect-corrected ndc scaled by N/2 makes one p-unit = one tile pitch on both axes, so tiles stay
// square and the crest keeps its aspect ratio on any viewport.
//
// What the cells DO (all shading, no audio on geometry, monotonic phases only):
//   * OUTLINE-ECHO RINGS -- concentric copies of the crest's OWN outline: inset inside (the fill is
//     made of the bead), ripples outside that meet the neighbour's at the tile boundary (every cell
//     interaction on screen IS the crest). They travel one way on flowPhase; spacing follows the
//     spectral-spread MEDIAN (a slow shape); audio touches amplitude only.
//   * PER-CELL TINT -- golden-ratio spread over the tile id, so neighbours always differ but stay
//     one family. Per-cell slow spin on spinPhase with a tiny rate spread, never in unison.
//   * SLOW PALETTE -- hue from the key median + timbre median + a monotonic hue tide. Blue body,
//     warm heart at the core, crisp palette-lit rim as the ONLY bright line, dark plum ground.
//   * TOUCH -- lattice-nav: drag pans (navX/navY), pinch zooms (navZoom). One-way tide otherwise.
//
// @fullscreen: true
// @mobile: true
// @tags: mogee, lattice-bead, mon, redaphid
//
// URL: ?shader=redaphid/wip/lattice-bead-vj/grid&controller=wavelet-ease&controller=lattice-nav
//      &image=images/beads/mon-hakkaku.png&wavelet=true
// KNOBS (0 = baked default):
//   knob_1 TILES      crests across the screen height (baked 3.2; 0.1..1 -> 1.5..8)
//   knob_2 ECHO       ring amount (baked 1.0; dial 0..2)
//   knob_3 TINT       per-cell hue spread (baked 1.0; dial 0..2)
//   knob_4 GROUND     ground light (baked 1.0; dial 0..2)
//   knob_5 DRIFT      tide rate (baked 1.0; dial 0..2)

uniform float flowPhase;              // wavelet-ease: monotonic
uniform float spinPhase;              // wavelet-ease: monotonic
uniform float huePhase;               // wavelet-ease: monotonic
uniform float quietGate;              // wavelet-ease: 0 in silence
uniform float energySpring;           // wavelet-ease: smoothed level
uniform float waveletBassSpring;
uniform float waveletBand1Spring;
uniform float waveletBand2Spring;
uniform float waveletBand3Spring;
uniform float waveletCentroidSpring;
uniform float navX;                   // lattice-nav: world pan
uniform float navY;
uniform float navZoom;                // lattice-nav: pinch zoom (1 = rest)
uniform float pitchClassMedian;       // SLOW: what key we are in
uniform float spectralCentroidMedian; // SLOW: timbre brightness
uniform float spectralSpreadMedian;   // SLOW: harmonic width -> echo spacing

#define TAU 6.283185307
#define LVK(k, def, expr) (((k) > 0.001) ? (expr) : (def))

// oklch2rgb(vec3(L, C, hueRadians)) comes from the shader wrapper.
// palette: s in hue turns, lit 0..1 -> lightness 0.10..0.80 (never white, never black)
vec3 lush(float s, float lit){
    float L = mix(0.10, 0.86, clamp(lit, 0.0, 1.0));
    float C = 0.11 + 0.05 * sin(s * TAU * 0.5 + 1.3);
    C *= smoothstep(0.0, 0.25, L) * (1.0 - 0.45 * smoothstep(0.62, 0.95, L));   // no grey crush, no white wash
    return oklch2rgb(vec3(L, C, fract(s) * TAU));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // ---- screen -> aspect-corrected ndc (tiles stay square on any viewport) ----
    vec2 ndc = fragCoord / iResolution.xy * 2.0 - 1.0;
    ndc.x *= iResolution.x / iResolution.y;

    // ---- tile-pitch space: 1 p-unit = 1 tile on both axes ----
    float nz    = navZoom > 0.001 ? navZoom : 1.0;
    float N     = LVK(knob_1, 3.2, mix(1.5, 8.0, knob_1)) / nz;              // K1 TILES
    float drift = LVK(knob_5, 1.0, knob_5 * 2.0);                            // K5 DRIFT
    vec2  tide  = vec2(0.030, 0.012) * flowPhase * drift;                   // one-way tide, never back
    vec2  p     = ndc * (N * 0.5) + tide + vec2(navX, navY) * (N * nz / 0.07);   // lattice-nav pan in the lattice's own units

    vec2  tileIndex = floor(p + 0.5);
    vec2  f         = fract(p + 0.5) - 0.5;                                  // in-tile, [-0.5, 0.5)

    // ---- per-cell identity: golden-ratio spread, neighbours always differ, nothing flickers ----
    float gid  = fract(dot(tileIndex, vec2(0.618034, 0.381966)) + seed);
    float gid2 = fract(dot(tileIndex, vec2(0.246979, 0.554958)) + seed2);
    float ang  = spinPhase * (0.06 + 0.05 * gid2) * (gid2 < 0.5 ? -1.0 : 1.0);   // slow, monotonic, constant direction per cell
    float ca = cos(ang), sa = sin(ang);
    vec2  fr = mat2(ca, -sa, sa, ca) * f;

    // ---- whole crest per cell: sample the baked SDF once, clamped to the tile, extended outside ----
    vec2  tc  = fr + 0.5;                                                    // r = 0.5 -> q*0.5+0.5 == f+0.5
    vec2  tcc = clamp(tc, 0.0, 1.0);
    float d   = (getInitialFrameColor(tcc).g - 0.5) + length(tc - tcc);     // tile units, < 0 inside, monotone outside
    float pxPerUnit = iResolution.y / N;
    float dPx = d * pxPerUnit;

    float cov     = 1.0 - smoothstep(-1.0, 1.0, dPx);                        // 1 px edge
    float rim     = 1.0 - smoothstep(0.8, 3.4, abs(dPx));                    // the crisp outline, ~3 px
    float rimSoft = exp(-abs(dPx) / 16.0);                                   // glow either side
    float inner   = clamp(-d / 0.30, 0.0, 1.0);                              // 0 at the outline -> 1 at the core

    // ---- slow palette parameter: key + timbre medians, hue tide, per-cell tint ----
    float tintAmt = LVK(knob_3, 1.0, knob_3 * 2.0);                          // K3 TINT
    float s = seed + (pitchClassMedian - 0.5) * 0.30 + (spectralCentroidMedian - 0.35) * 0.25
            + huePhase * 0.02 + (gid - 0.5) * 0.20 * tintAmt;

    // ---- outline-echo rings: one-way outward on flowPhase, spacing from the spread MEDIAN ----
    float echoAmt = LVK(knob_2, 1.0, knob_2 * 2.0);                          // K2 ECHO
    float ringP   = mix(0.07, 0.11, clamp((spectralSpreadMedian - 0.20) * 2.5, 0.0, 1.0));
    float ph      = flowPhase * 0.25;
    float rq      = abs(fract(d / ringP - ph) - 0.5) * ringP * pxPerUnit;    // px to the nearest echo
    float ring    = 1.0 - smoothstep(0.4, 2.2, rq);
    float reachIn  = exp(-max(-d, 0.0) / 0.30);
    float reachOut = exp(-max( d, 0.0) / 0.34);

    // ---- ground: dark plum complement, ripples between neighbours ----
    float groundLit = LVK(knob_4, 1.0, knob_4 * 2.0);                        // K4 GROUND
    vec3 col = lush(s + 0.5, 0.10 * groundLit);
    col += lush(s + 0.33, 0.55) * ring * reachOut * (1.0 - cov) * echoAmt
         * (0.60 + 0.40 * waveletBand2Spring * quietGate);

    // ---- body: blue family, warm heart at the core, inset echoes made of the outline ----
    vec3 body = lush(s, mix(0.40, 0.50, inner));
    body = mix(body, lush(s + 0.42, 0.68), smoothstep(0.45, 1.0, inner) * 0.90);
    body += lush(s + 0.42, 0.80) * smoothstep(0.55, 1.0, inner) * energySpring * quietGate * 0.30;   // the heart breathes with level
    body += lush(s + 0.12, 0.88) * ring * reachIn * echoAmt * (0.55 + 0.35 * waveletBand3Spring * quietGate);
    col = mix(col, body, cov);

    // ---- rim: the only bright line; bass lights it, centroid tilts its hue a touch ----
    float rimHue = s + 0.30 + 0.05 * (waveletCentroidSpring - 0.5) * quietGate;
    col += lush(rimHue, 1.0) * rim * (1.0 + 0.40 * waveletBassSpring * quietGate);
    col += lush(rimHue, 0.75) * rimSoft * (0.28 + 0.22 * waveletBand1Spring * quietGate);

    // ---- keep a floor: gentle spatial vignette (constant mask, not audio) ----
    col *= 1.0 - 0.35 * smoothstep(0.7, 1.7, length(ndc));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
