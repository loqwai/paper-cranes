# ChromaDepth versions

ChromaDepth glasses turn hue into depth: red floats nearest, then orange, yellow, green, blue, and
violet sits farthest back. A ChromaDepth shader is a depth map painted in spectral hue order. Basic
recipe: [docs/MAKING_A_NEW_SHADER.md](../../../../docs/MAKING_A_NEW_SHADER.md#creating-chromadepth-versions-of-existing-shaders).
How to make it pop: [docs/advanced-shader-techniques.md](../../../../docs/advanced-shader-techniques.md) §3.
Study `tesla/chromadepth/diamond.frag`, `wooli/chromadepth-1.frag` and `-2.frag`,
`redaphid/chromadepth-lattice/*`, `claude/chromadepth-julia.frag`.

## Rules

1. **HSL here, not OKLCH.** The one exception to the house colour rule: ChromaDepth needs raw
   spectral hue order, and OKLCH hue is not that order (vault `kb/facts/paper-cranes-colour-work-uses-oklab.md`).
   `hue = depth * 0.75` (0 red near, 0.75 violet far), saturation 0.9 or more, lightness 0.05-0.55.
2. **Hue stays locked to depth.** Audio, seeds, knobs and evolution change structure, brightness,
   warp or how depth is distributed. They never rotate the hue, or red stops meaning near. The
   exception: on a hit, a small shift toward red (`hue -= 0.05`) throws the object forward.
3. **Never average depth across layers.** Coverage-weighted averaging pulls everything to the middle
   of the range and the frame turns green-pastel mush. Composite front-most, discretely.
4. **The background is dark violet and recedes.** A bright background reads as present and flattens
   the depth. On handstand-portal/3 the fix for "chromadepth isn't popping — background too bright
   sometimes" was a darker field (lit cap 0.40 to 0.26), a deeper violet far hue, and a steeper depth
   ramp across the figure so its core reads pure red (`journals/3-cool-moments.md`, iter 36).
5. **A hot red rim on silhouettes** (fresnel) throws edges toward you; a blue inner depth on faces
   that point at you lets you see into the form.
6. **"bass should make it pop OUT of the screen more"** (handstand-portal): bass pushes depth toward
   red on the near object, scaled to its size, never a whole-frame hue shift.
7. **No white.** White has no hue, so it has no depth. Keep lightness bounded.

## Making a ChromaDepth fork of an existing shader

1. Fork to the next number in the same folder, or `chromadepth-N.frag`, and say so in the doc.
2. Find the shader's natural depth signal: ray distance, fractal escape count, orbit-trap distance,
   SDF distance, layer index. Map it to 0..1 with a smoothstep so the interesting range covers most of
   the hue span.
3. Replace the palette with `hsl2rgb(vec3(depth * 0.75 + seedBias, 0.92, light))`, `seedBias` from
   `seed2` and small (per-device variety without breaking the order).
4. Keep the original's motion and audio mapping, then re-check that no audio term reaches hue.
5. Run `bin/shader-check.mjs`. Expect high `vivid`, near-zero `grey`, `clip` 0. The `hotPink` and
   `hueConc` warnings are calibrated for OKLCH palettes: a red-heavy ChromaDepth frame can trip
   them. Open the PNGs before you act on them.
