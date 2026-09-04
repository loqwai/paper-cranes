"""Fork 3.frag -> 4.frag: THE LEGIBLE BEAD.

3.frag deliberately let the lattice texture survive INSIDE the motif ("the lattice texture
survives INSIDE them" is in its own comment). Measured consequence: the mon never reads as a
SHAPE. The interior carries as much contrast as the exterior, so the eye has no silhouette to
lock onto, and the acceptance test - a stranger naming their own bead across a dark room -
fails at every framing and every seed pitch.

4.frag adds ONE hand lever, LEGIBLE, that buys figure/ground separation:
  1. the interior collapses toward the bead's own colour, so the silhouette becomes the
     dominant edge in frame;
  2. the ground between beads recedes much harder;
  3. the contour thickens into a real drawn line that survives at distance.

All three are cov/rim-masked and spatially structured - no global multiplier, so none of this
can strobe the frame - and LEGIBLE is a HAND knob, never per-frame audio, so no geometry moves
with the music. (2) is a ratchet, so (1) and (3) are its counter-ratchet in the same edit:
a deeper recede takes light out of most of the frame and the figure pays it back.

LEGIBLE = 0 reproduces 3.frag exactly.
"""
import io
import re
import os

SRC = "shaders/redaphid/wip/lattice-bead/3.frag"
DST = "shaders/redaphid/wip/lattice-bead/4.frag"

assert not os.path.exists(DST), "4.frag already exists - refusing to overwrite"
src = io.open(SRC, encoding="utf-8").read()

# Drop 3.frag's preset block; 4.frag gets its own (added separately).
src = re.sub(r"// ==== CURATED PRESETS.*?// ==== END PRESETS ====\n", "", src, flags=re.S)

HEADER = """// LATTICE-BEAD (4.frag - FORK of 3.frag on 2026-09-04, overnight, user asleep) - THE LEGIBLE BEAD.
// 3.frag stays the onset fork. 4 attacks the ONE thing the whole project is for and that every
// iteration so far has failed: RECOGNITION. A stranger, at a distance, in a dark room, should be
// able to NAME their own bead on the wall.
//
// WHY IT WAS FAILING. Measured this session, not assumed:
//   * all 11 mon are near-indistinguishable at playing framing - the dominant shapes in frame are
//     produced by the LATTICE FOLD, not the motif (76.1% common effect, 7.9pt between-motif spread)
//   * seed pitch (knob_169) 0.10..0.55 x amount 0.55/0.9/1.0 = 15 near-identical tiles
//   * navZoom moves the framing but never makes a bead legible at ANY setting
// The cause is figure/ground: 3.frag lets the lattice texture survive INSIDE the motif, so the
// interior carries as much contrast as the exterior and the eye has no silhouette to lock onto.
//
// THE LEVER. LEGIBLE (knob_180, or ?legible=0..1, default 0.55):
//   1. INTERIOR FLATTEN - the inside collapses toward the bead's own ink, so the silhouette
//      becomes the dominant edge in frame. This is the move that actually buys recognition.
//   2. DEEPER RECEDE    - the ground between beads drops much further than 3.frag's 0.25-0.50.
//   3. THICKER CONTOUR  - the rim becomes a drawn line that survives at distance.
// LEGIBLE = 0 reproduces 3.frag EXACTLY, so the texture look is not lost, it is one end of a dial.
//
// CONSTRAINTS HONOURED (all of these were paid for with live failures, see lattice-vj/HANDOFF.md):
//   * every term is cov/rim-masked and spatially structured - NO global multiplier, cannot strobe
//   * LEGIBLE is a HAND knob - no per-frame audio touches geometry
//   * (2) is a ratchet, so (1) and (3) are its COUNTER-RATCHET in the same edit: a deeper recede
//     removes light from most of the frame and the figure pays it back
//   * colour still follows the slowest music; light/shading still takes all the audio
//
// NOT YET CONFIRMED BY A HUMAN. Built while the user was asleep. The recognition claim is the
// one thing here that a measurement cannot settle - it needs an actual pair of eyes. The default
// of 0.55 is a deliberate midpoint, not a tuned value.
"""

src = HEADER + src

# ---- 1. rim width becomes a parameter of the seed octave --------------------------------
old_layer = """vec2 seedLayer(vec2 p, vec2 c, float k, float pitch, float aaBase){
    float d  = seedDist((p - c) * k + c, pitch);
    float aa = clamp(aaBase * k * 1.5, 1e-4, pitch * 0.04);
    return vec2(smoothstep(aa, -aa, d), smoothstep(aa * 4.0, 0.0, abs(d)));
}"""
new_layer = """vec2 seedLayer(vec2 p, vec2 c, float k, float pitch, float aaBase, float rimW){
    float d  = seedDist((p - c) * k + c, pitch);
    float aa = clamp(aaBase * k * 1.5, 1e-4, pitch * 0.04);
    // rimW: 4.0 is 3.frag's hairline contour. LEGIBLE widens it into a drawn line, which is
    // what actually survives downscaling to a phone screen or a projector across a room.
    return vec2(smoothstep(aa, -aa, d), smoothstep(aa * rimW, 0.0, abs(d)));
}"""
assert old_layer in src, "seedLayer not found"
src = src.replace(old_layer, new_layer)

# ---- 2. the LEGIBLE uniform + macro ------------------------------------------------------
anchor = "uniform float theme;"
assert anchor in src, "theme uniform not found"
src = src.replace(
    anchor,
    """uniform float legible;     // ?legible=0..1 figure/ground separation (see header); knob_180 wins
"""
    + anchor,
    1,
)

# Placed after DIAL_ON so both LVK and DIAL_ON exist. Nested LVK = knob_180, else ?legible=, else 0.55.
dial = "#define DIAL_ON(k) step(0.001, (k))"
assert dial in src
src = src.replace(
    dial,
    dial
    + """
// LEGIBLE: knob_180 if set, else ?legible= if set, else 0.55. A HAND lever - never audio.
#define LEGIBLE (LVK(knob_180, LVK(legible, 0.55, legible), knob_180))""",
    1,
)

# ---- 3. call sites pass the widened rim --------------------------------------------------
src = src.replace(
    "vec2  lA = seedLayer(uv, world, kA, seedPitch, aaBase);\n        vec2  lB = seedLayer(uv, world, kB, seedPitch, aaBase);",
    "float rimW = mix(4.0, 16.0, LEGIBLE);\n        vec2  lA = seedLayer(uv, world, kA, seedPitch, aaBase, rimW);\n        vec2  lB = seedLayer(uv, world, kB, seedPitch, aaBase, rimW);",
)

# ---- 4. the compositing: flatten, recede, and pay it back --------------------------------
old_comp = """        float seedDepth = mix(0.25, 0.50, pump);
        col *= mix(1.0, 1.0 - seedDepth, (1.0 - cov) * knob_168);
        col += lush(s, 0.95) * cov * knob_168 * (0.05 + 0.58 * pump);   // beads gain with the music
        col += lush(s + 0.33, 1.0) * rim * knob_168 * (0.22 + 0.45 * trebLive * QGATE);"""
new_comp = """        // ── FIGURE / GROUND (4.frag) ─────────────────────────────────────────────
        // THE recognition move. 3.frag kept the lattice texture inside the motif, which is
        // why the mon never read as a shape: interior and exterior carried the same contrast
        // and the eye had no silhouette to lock onto. Collapsing the interior toward the
        // bead's OWN ink makes the silhouette the dominant edge in frame. Masked by cov, so
        // it is spatially structured and cannot strobe; driven by a HAND knob, so no geometry
        // moves with the music. At LEGIBLE = 0 this line is a no-op and 3.frag is reproduced.
        vec3 beadInk = lush(s, mix(0.62, 0.80, pump));
        col = mix(col, beadInk, cov * LEGIBLE * 0.72);

        // Ground recede, deepened by LEGIBLE. This is the RATCHET.
        float seedDepth = mix(mix(0.25, 0.50, pump), mix(0.58, 0.82, pump), LEGIBLE);
        col *= mix(1.0, 1.0 - seedDepth, (1.0 - cov) * knob_168);
        // COUNTER-RATCHET, same edit: a deeper recede takes light out of most of the frame,
        // so the figure pays it back. Without this pair, raising LEGIBLE would just dim the
        // picture - which is exactly the mistake the ground-recede made on its first outing
        // (corr(energySpring, brightness) -0.68: a drop made the frame DARKER and FLATTER).
        col += lush(s, 0.95) * cov * knob_168 * (0.05 + 0.58 * pump) * mix(1.0, 1.9, LEGIBLE);
        col += lush(s + 0.33, 1.0) * rim * knob_168 * (0.22 + 0.45 * trebLive * QGATE) * mix(1.0, 1.6, LEGIBLE);"""
assert old_comp in src, "compositing block not found"
src = src.replace(old_comp, new_comp)

io.open(DST, "w", encoding="utf-8").write(src)
print("wrote", DST)
