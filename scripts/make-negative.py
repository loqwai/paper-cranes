"""Fork 4.frag -> negative.frag: LET THE BLACK IN.

Written in response to the art critic's verdict on 4.frag, which was that recognition does NOT
pass: 4 crests clear, 2 arguable, 5 failed. Their diagnosis, which measurement supports:

  "You have eleven cookie cutters and one dough."

Every mon rendered with the same interior - same field, same dot rows, same chevron spine - so
the silhouette was the only thing carrying identity, and a soft halo was blurring even that.
Blur eats corners first and curves last, which is exactly why every crest that PASSED has a
straight line in it (kikko, hakkaku, matsukawa, kiku) and every rounded one collapsed into
every other rounded one (kikyo == ume, suhama == katabami).

A mon is not an outline. It is a figure/ground composition in which the gaps do half the
drawing. We had filled the gaps in.

WHERE THE NEGATIVE SPACE HAS TO COME FROM. Not from the source art: measured, every one of the
eleven generators in nfc-bead/beads/glow-set/japanese.py produces EXACTLY ONE contour, with
zero discarded area. (japanese.py:195 does keep only the largest-area loop, but there is never
a second one to lose - the mon are authored as solid silhouettes because they are printed as
solid beads.) So the interior structure must be DERIVED, and the baked G channel is a true
signed distance field, which is exactly the tool for it.

THE MOVE: erode the silhouette inward by `inset` and carve the band between outline and inset.
The gap then follows each motif's OWN geometry, so it differs per mon precisely where the mon
differ - under erosion a sharp lobe pinches off while a round lobe stays open. That is what
separates kikyo (pointed bellflower) from ume (round plum), which the outline alone does not.
It is also, not by coincidence, the actual construction of several of these crests: kikyo is
drawn with a ring, ume with separated petals.

Also here, both from the same critique:
  * the halo is tightened - it was bleeding past every edge and eating the corners that carry ID
  * the default palette moves off theme 0 / paletteShift 1.35, which is the JET COLORMAP
    (yellow-green body, cyan mids, orange-red hotspots on black) - thermal-instrument default
    output, and it was on the hero image

NEGATIVE defaults to 0, which reproduces 4.frag exactly. Opt in with ?negative=0..1 or knob_181.
"""
import io
import os
import re

SRC = "shaders/redaphid/wip/lattice-bead/4.frag"
DST = "shaders/redaphid/wip/lattice-bead/negative.frag"

assert not os.path.exists(DST), "negative.frag already exists - refusing to overwrite"
src = io.open(SRC, encoding="utf-8").read()
src = re.sub(r"// ==== PRESETS.*?// ==== END PRESETS ====\n", "", src, flags=re.S)

HEADER = """// LATTICE-BEAD (negative.frag - FORK of 4.frag on 2026-09-04) - LET THE BLACK IN.
//
// 4.frag claimed recognition was solved. An art critic reviewing the render grid disagreed, and
// they were right: 4 crests clear, 2 arguable, 5 FAILED. kikyo and ume were "the same picture";
// suhama collapsed into katabami; tomoe read as "an egg with a scratch on it".
//
// THE DIAGNOSIS, which measurement supports: "eleven cookie cutters and one dough". Every mon
// got the same interior - same field, same dot rows, same chevron spine - so the SILHOUETTE was
// the only thing carrying identity, and a soft halo was blurring even that. Blur eats corners
// first and curves last, which is why every crest that passed has a STRAIGHT LINE in it (kikko,
// hakkaku, matsukawa, kiku) and every rounded one collapsed into every other rounded one.
//
// A mon is a FIGURE/GROUND composition: the gaps do half the drawing. 4.frag filled them in.
//
// WHERE THE GAPS COME FROM. Not from the source art. Measured: all eleven generators in
// nfc-bead/beads/glow-set/japanese.py produce EXACTLY ONE contour, zero discarded area. (That
// file's trace() does keep only the largest-area loop, but there is never a second loop to
// lose - the mon are authored as solid silhouettes because they are printed as solid beads.)
// So the interior must be DERIVED, and the baked G channel is a true signed distance field,
// which is precisely the right tool.
//
// THE MOVE (knob_181, or ?negative=0..1; default 0 = 4.frag exactly):
//   erode the silhouette inward by `inset` and carve the band between outline and inset to
//   BLACK. The gap follows each motif's OWN geometry, so it differs per mon exactly where the
//   mon differ: under erosion a SHARP lobe pinches off while a ROUND lobe stays open. That is
//   what separates kikyo (pointed bellflower) from ume (round plum), which the outline alone
//   does not. It also happens to be how several of these crests are actually drawn - kikyo with
//   a ring, ume with separated petals.
//
// Two more fixes from the same critique:
//   * HALO TIGHTENED. It bled past every edge and ate the corners that carry identity.
//   * DEFAULT PALETTE MOVED OFF THE JET COLORMAP. theme 0 + paletteShift 1.35 is yellow-green
//     body, cyan mids, orange-red hotspots on black - thermal-instrument default output, "the
//     visual signature of nobody having made a decision", and it was on the hero image. The
//     presets here lead with Deep Cyan and Ember, which were judged the only two schemes that
//     read as chosen rather than sampled.
//
// WHY BLACK AND NOT A DARK TINT: a true black gap is a VALUE contrast, and value contrast is
// the one thing every palette in the set lacked - all five rotated hue while keeping the same
// brights and darks. A jet colormap cannot survive next to real black, which is the point.
"""

src = HEADER + src

# ---- 1. the seed octave also returns the eroded-band gap -----------------------------------
old_layer = """vec2 seedLayer(vec2 p, vec2 c, float k, float pitch, float aaBase, float rimW){
    float d  = seedDist((p - c) * k + c, pitch);
    float aa = clamp(aaBase * k * 1.5, 1e-4, pitch * 0.04);
    // rimW: 4.0 is 3.frag's hairline contour. LEGIBLE widens it into a drawn line, which is
    // what actually survives downscaling to a phone screen or a projector across a room.
    return vec2(smoothstep(aa, -aa, d), smoothstep(aa * rimW, 0.0, abs(d)));
}"""
new_layer = """vec3 seedLayer(vec2 p, vec2 c, float k, float pitch, float aaBase, float rimW, float inset){
    float d  = seedDist((p - c) * k + c, pitch);
    float aa = clamp(aaBase * k * 1.5, 1e-4, pitch * 0.04);
    // rimW: 4.0 is 3.frag's hairline contour. LEGIBLE widens it into a drawn line, which is
    // what actually survives downscaling to a phone screen or a projector across a room.
    float cov = smoothstep(aa, -aa, d);
    float rim = smoothstep(aa * rimW, 0.0, abs(d));
    // THE INSET SILHOUETTE: the same shape eroded inward by `inset`. The band between the two
    // (cov - inner) is a gap that follows the motif's OWN geometry, which is the whole point -
    // a sharp lobe pinches off under erosion while a round one stays open, so this separates
    // crests that share an outline. z = 0 when inset = 0, so NEGATIVE = 0 is a clean no-op.
    float inner = smoothstep(aa, -aa, d + inset);
    return vec3(cov, rim, max(cov - inner, 0.0));
}"""
assert old_layer in src, "seedLayer (4.frag form) not found"
src = src.replace(old_layer, new_layer)

# ---- 2. the NEGATIVE uniform + macro --------------------------------------------------------
anchor = "uniform float legible;"
assert anchor in src
src = src.replace(anchor, "uniform float negative;    // ?negative=0..1 carve shape-following black gaps; knob_181 wins\n" + anchor, 1)

leg = "#define LEGIBLE (clamp(max(knob_180, legible), 0.0, 1.0))"
assert leg in src
src = src.replace(leg, leg + """
// NEGATIVE: how hard the eroded band is carved to black. Uses max() rather than the house LVK
// convention deliberately - LVK cannot express zero (it reads 0 as "unset, use the baked
// default"), which silently made ?legible=0 render as 0.55 and cost a sweep to catch.
#define NEGATIVE (clamp(max(knob_181, negative), 0.0, 1.0))""", 1)

# ---- 3. call sites ---------------------------------------------------------------------------
old_calls = """        float rimW = mix(4.0, 16.0, LEGIBLE);
        vec2  lA = seedLayer(uv, world, kA, seedPitch, aaBase, rimW);
        vec2  lB = seedLayer(uv, world, kB, seedPitch, aaBase, rimW);
        vec2  sl = mix(lA, lB, smoothstep(0.0, 1.0, zf));"""
new_calls = """        // HALO TIGHTENED (critic: the soft bleed past every edge was eating the corners that
        // carry identity, and blur eats corners before curves). 16.0 -> 11.0 keeps a drawn
        // contour without the lavender fringe.
        float rimW = mix(4.0, 11.0, LEGIBLE);
        // Erosion depth as a fraction of cell pitch. Zero when NEGATIVE is zero, so the whole
        // feature collapses to 4.frag exactly.
        float inset = seedPitch * 0.085 * NEGATIVE;
        vec3  lA = seedLayer(uv, world, kA, seedPitch, aaBase, rimW, inset);
        vec3  lB = seedLayer(uv, world, kB, seedPitch, aaBase, rimW, inset);
        vec3  sl = mix(lA, lB, smoothstep(0.0, 1.0, zf));"""
assert old_calls in src, "seedLayer call sites not found"
src = src.replace(old_calls, new_calls)

# ---- 4. carve the gap to black, AFTER the interior flatten, BEFORE the rim ------------------
old_ink = """        vec3 beadInk = lush(s, mix(0.62, 0.80, pump));
        col = mix(col, beadInk, cov * LEGIBLE * 0.72);"""
new_ink = """        vec3 beadInk = lush(s, mix(0.62, 0.80, pump));
        col = mix(col, beadInk, cov * LEGIBLE * 0.72);

        // ── LET THE BLACK IN ─────────────────────────────────────────────────────
        // Carve the eroded band to TRUE black. Applied AFTER the interior flatten so it cuts
        // through the flattened ink rather than being painted over by it, and BEFORE the rim
        // so the contour still draws on top and the gap reads as an interior line rather than
        // a nibbled edge. Spatially structured and mask-bound: no global multiplier, so this
        // cannot strobe, and it takes no per-frame audio at all - it is pure drawing.
        col *= 1.0 - gap * NEGATIVE * 0.92;"""
assert old_ink in src, "beadInk block not found"
src = src.replace(old_ink, new_ink)

# `gap` must exist before it is used; cov/rim are unpacked just above the ink block.
old_unpack = """        float cov = sl.x;                                          // 1 inside the motif
        float rim = sl.y;                                          // edge band, reads at distance"""
new_unpack = """        float cov = sl.x;                                          // 1 inside the motif
        float rim = sl.y;                                          // edge band, reads at distance
        float gap = sl.z;                                          // eroded band = the negative space"""
assert old_unpack in src, "cov/rim unpack not found"
src = src.replace(old_unpack, new_unpack)

io.open(DST, "w", encoding="utf-8").write(src)
print("wrote", DST)
