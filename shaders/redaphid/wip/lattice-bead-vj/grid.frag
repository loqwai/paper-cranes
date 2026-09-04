// GRID (lab/tile) -- the dumbest possible thing that could work: tile the
// initial-frame texture (a baked mon SDF PNG) into an N x N grid, crisp,
// square, centred, no fractal, no audio, no frame feedback. Written to
// answer one question before touching the real lattice: exactly what
// coordinate-space arithmetic turns "one mon PNG" into "a plain periodic
// grid of mon", so that arithmetic can be reused as a SEED for
// lattice-bead/2.frag instead of the recursive-fold-and-sample path it
// uses today.
//
// See grid.md for the full methods writeup (coordinate spaces, mirror vs
// translation repeat, seam analysis, scale invariance, filtering, and the
// seeding recommendation).
//
// @fullscreen: true
// @mobile: true
// @tags: lab, tiling, mon, redaphid
//
// KNOBS:
//   knob_1  = tile count N.  0 -> 1 tile, 1 -> 12 tiles. Sweep this.
//   knob_2  = fold mode.     < 0.5 = TRANSLATION REPEAT (tc = f+0.5, whole
//                             motif once per cell, unmirrored -- what we
//                             want for seeding). >= 0.5 = MIRROR REPEAT
//                             (per-tile parity flip, algebraically the
//                             same triangle wave 2.frag's fractal() fold
//                             uses) -- kept here ONLY as an A/B control,
//                             see grid.md Q2.
//   knob_3  = AA width in screen pixels (0 -> 0.5px, 1 -> 3px). Debug only;
//             default (knob_3 unset = 0) gives a tight ~0.5px edge.

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // ---- SPACE 1: screen pixels -----------------------------------------
    // fragCoord in [0, iResolution.xy], origin bottom-left (GL convention).

    // ---- SPACE 2: normalised device coords, centred, ASPECT-CORRECTED ---
    // uv01 in [0,1]^2 -> ndc in [-1,1]^2 -> ndc.x scaled by the screen aspect
    // ratio so a unit step in x and a unit step in y cover the SAME physical
    // screen distance. This is what keeps tiles square on a non-square
    // viewport (e.g. 1200x500) instead of stretched.
    vec2 uv01 = fragCoord / iResolution.xy;
    vec2 ndc  = uv01 * 2.0 - 1.0;
    ndc.x *= iResolution.x / iResolution.y;               // range: x in [-aspect,aspect], y in [-1,1]

    // ---- SPACE 3: tile-pitch space p --------------------------------------
    // N tiles span the screen HEIGHT (y in [-1,1]); N is swept 1..12 by knob_1.
    // Scaling ndc by N/2 makes ONE unit of p equal to ONE tile pitch on both
    // axes (since ndc was already aspect-corrected, this scale is isotropic).
    float N = mix(1.0, 12.0, clamp(knob_1, 0.0, 1.0));
    vec2 p = ndc * (N * 0.5);                              // range: y spans [-N/2, N/2), x spans [-aspect*N/2, aspect*N/2)

    // ---- SPACE 4: tile index + in-tile coord ------------------------------
    // Each tile occupies p in [i-0.5, i+0.5). f is the in-tile offset,
    // centred at 0, range [-0.5, 0.5) -- ONE tile pitch wide, the same units
    // hexDist/beadDist call "lattice units" in the real lattice shader.
    vec2 tileIndex = floor(p + 0.5);
    vec2 f         = fract(p + 0.5) - 0.5;                 // range: [-0.5, 0.5) per axis

    // MIRROR REPEAT (knob_2 >= 0.5): flip f's sign on odd tiles. This is
    // algebraically the same triangle wave 2.frag's fractal() fold uses
    // (p = 1 - abs(s*fract(p-0.5) - s*0.5) with s=2) decomposed into
    // "per-tile parity flip" -- see grid.md Q2 for the derivation and why
    // it is NOT what we want to feed the lattice.
    float foldOn = step(0.5, knob_2);
    vec2 parity  = mod(tileIndex, 2.0);                    // 0 or 1 per axis
    vec2 fMirror = mix(f, -f, parity);
    vec2 fUsed   = mix(f, fMirror, foldOn);

    // ---- SPACE 5: bead-normalised space q, then texture coord tc ---------
    // Tile half-pitch r = 0.5 (by construction: SPACE 3 defined 1 p-unit =
    // 1 tile). q = f / r puts the in-tile coord on [-1,1) regardless of N --
    // this is the SAME "sample at p/r" step beadDist() in 2.frag uses to
    // make a fixed-scale SDF bake usable at an arbitrary cell radius r. Here
    // r is a constant 0.5 (the grid has one fixed pitch), so the rescale is
    // trivial in VALUE, but the SHAPE of the operation is identical and is
    // exactly what the seeding step will need once r varies per lattice cell.
    float r = 0.5;
    vec2 q  = fUsed / r;                                    // [-1,1)
    vec2 tc = q * 0.5 + 0.5;                                // [0,1) -- direct texture coord, no clamping needed:
                                                              // f already stays inside one tile by construction, so
                                                              // there is no cross-tile bleed to clamp against (contrast
                                                              // with beadDist's ONETILE clamp, which exists because ITS
                                                              // upstream coord can wrap past 1 period -- see grid.md Q3).

    vec4 tex = getInitialFrameColor(tc);
    float G = tex.g;                                        // baked SDF, 0.5 == boundary

    // signed distance in BAKE-NORMALISED units: 0 at boundary, +-1 at the
    // 1.12x bleed edge. Convert to LATTICE (p-space) units the same way
    // beadDist() does: multiply by r. Here r is constant so this is a no-op
    // in value (r=0.5 always) but it is the correct general form.
    float dNorm  = (G - 0.5) * 2.0;                          // bake-normalised, unitless
    float dTile  = dNorm * r;                                // p-space (tile-pitch) units

    // Convert p-space units to SCREEN-space (pixel) units for antialiasing.
    // 1 p-unit = (iResolution.y / N) screen pixels (that's how SPACE 3 was
    // built: N p-units of height = iResolution.y pixels).
    float pxPerTileUnit = iResolution.y / N;
    float dPx = dTile * pxPerTileUnit;

    // Crisp SDF edge via smoothstep, antialiasing width in real SCREEN
    // PIXELS regardless of N -- this is the "SDF buys a clean edge" case:
    // the boundary is exactly G==0.5, and because dPx is already in pixel
    // units, a fixed +-0.5px smoothstep width stays ~1px wide whether the
    // grid is 3x3 or 8x8. A hard step() on alpha cannot do this: alpha is
    // a coverage value with no notion of "how many texels to the edge", so
    // its step boundary aliases identically at every N.
    float aaWidth = mix(0.5, 3.0, clamp(knob_3, 0.0, 1.0));
    float covered = 1.0 - smoothstep(-aaWidth, aaWidth, dPx);

    vec3 fg = vec3(0.95, 0.85, 0.55);                        // warm silhouette
    vec3 bg = vec3(0.04, 0.05, 0.08);                        // near-black field
    vec3 col = mix(bg, fg, covered);

    fragColor = vec4(col, 1.0);
}
