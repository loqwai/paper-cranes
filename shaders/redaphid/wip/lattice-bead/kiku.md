# kiku.frag — /lab H1: does the 12-fold chrysanthemum stay legible as the lattice cell?

Scratch fork of `1.frag` (the shared bead substrate) for one hypothesis, on `lab/kiku`, port 6981.
**Not art.** It exists to answer one question and carry the instrument that answered it.

> **H1: `kiku` stays legible as the lattice cell at fold levels 4–9.**
> **Verdict: NO, high confidence.** It is never nameable at *any* drawn level — including level 4
> (the coarsest) blown up until one cell fills the screen.

Evidence: `journals/lab/shots/kiku-sheet.png`.

## The instrument (the only edit to the substrate's logic)

Two uniforms, both pure diagnostics — **do not merge into `1.frag`**:

- `onlyLevel` — draw exactly one fold level, so "which level does it break at" can be answered
  without the other five overlaying it. `-1` = all levels (normal). Added *after* the fold, so
  geometry is untouched.
- `flatLevels` — bypass the depth window (`gLevelOpen`), so a single level isn't dimmed by its
  own depth.

⚠ Both default to `0.0` when absent from the URL, and `onlyLevel = 0` draws nothing (level 0 is
below `FIRST`). **Always pass `onlyLevel=-1` for a full render.**

## Why it fails

### 1. The cell never contains ONE flower — it contains a mirrored, tiled composite

Measured, not assumed (`scripts/lab-crossings.mjs`):

- `fractal()` does `vec2 uv = abs(p)` **before** the cell distance — a 4-fold mirror applied to the
  sampling coordinate. The motif is symmetrised before it is ever drawn.
- `beadDist` maps that to `tc = uv / (2·gHexR) + 0.5`. With `gHexR ≈ 0.6` and `|uv|` reaching
  √2 after the per-level rotation, **`tc` reaches 1.678** — well past 1.0, so `wrap: REPEAT` pulls
  neighbouring tiled copies of the mon into the same cell. The cell spans ~1.7 texture periods.

So what gets drawn is a **mirrored, tiled composite of kiku fragments**, not one closed 12-lobe
rosette. That is exactly what the sheet shows: scalloped arcs and lobed fragments. The
`1cell-L4-zoom` tile catches one such fragment — a 3-lobe scalloped arc.

**This is a property of the substrate's fold, not of kiku.** Any motif whose identity lives in its
*global closed outline* loses that identity here, because the cell never presents the outline whole.

> Corrected from an earlier reading of mine that claimed only the upper-right quadrant is sampled.
> The *unwrapped* coordinate is indeed always ≥ 0.5, but it exceeds 1.0 and wraps, so the whole
> texture is reached. Credit to the tomoe teammate for catching it; `texCoordMax = 1.678` confirms.

### 2. The bake never wrote the EXTERIOR of the signed field (defect, affects everyone)

Sampling `mon-kiku.png` directly:

| point | RGBA | decoded `d` |
|---|---|---|
| centre | `255, 45, 0, 255` | −0.65 (interior) |
| near boundary | `78, 121, 0, 255` | −0.05 |
| **just outside** | **`0, 0, 0, 0`** | **−1.00** |

**The maximum green value anywhere in the image is 127/255**, decoding to `d = −0.004`. The field is
**negative everywhere and never crosses zero** — measured 0 boundary crossings along every
cell-space ray. Outside the silhouette the PNG is fully transparent, so green reads `0` and
`beadDist` returns −1.0, the *deepest interior* value, for every exterior pixel.

Only the interior half of the signed field was baked. Consequence in the shader: `abs(cellD −
gRingGap)` bottoms out at ≈ `gRingGap` instead of reaching 0, so **every bead-drawn line is
systematically weaker than its hex equivalent**, and the field is discontinuous at the boundary.

## The darkening — measured, and it is motif-dependent

Full-resolution, 900×900, `noaudio`, fixed `time` (`scripts/lab-measure.mjs`):

| | mean lum | lit >20 | bright >50 |
|---|---|---|---|
| hex (`knob_161=0`), t=4/8/16 | 19.48 / 17.33 / 19.30 | **38.7 / 33.1 / 40.1 %** | 4.19 / 2.66 / 3.95 % |
| kiku (`knob_161=1`), t=4/8/16 | 17.26 / 16.91 / 16.78 | **21.4 / 20.1 / 19.6 %** | 4.10 / 3.82 / 3.75 % |

**kiku loses ~45 % of its lit coverage** (≈37 % → ≈20 %). Mean luminance is roughly flat
(−6 %) because the surviving lines are slightly brighter. So kiku *does* darken — in fill, not in
peak — which contrasts with tomoe's reported slight brightening. Cause is defect 2, so **fix the
bake before adding any brightness counter-ratchet**; compensating now would bake the defect in.

> ⚠ **Measurement trap that flips the sign.** A 160×160 downsample of these same frames reports the
> kiku variant as *brighter* (12.62 → 15.02) — the opposite of the truth — because downsampling
> averages thin bright lines into the dark ground. The magnitudes there (~12–15 mean, single-digit
> lit %) are close to the numbers reported for tomoe, so **tomoe's brightening should be re-measured
> at full resolution on lit coverage before it is trusted.**

## Boundary crossings per radial direction (the coordinator's candidate predictor)

Measured on the raw motif, 720 rays from centre:

| metric | kiku |
|---|---|
| rays crossing the silhouette **exactly once** | **694 / 720 (96 %)** |
| rays crossing 3× (the deep notches) | 26 / 720 (4 %) |
| radius modulation (`1 − rmin/rmax`) | **0.277** (rmin 331 px, rmax 458 px) |

**kiku scores LOW on this predictor, not high.** It is star-convex: a ray from the centre exits
exactly once, 12-fold or not. Its 12-fold-ness is *angular* frequency plus a 28 % radius wobble —
not radial crossings. So the prediction that kiku would score high is wrong, while the predictor
itself survives: a low crossing count correctly anticipates what the sheet shows, a lattice only
mildly restyled into scalloped edges rather than genuinely re-tiled.

## Legibility per fold level (`flatLevels=1`, one level at a time)

| level | reads as | nameable? |
|---|---|---|
| 4 (coarsest) | scalloped / antler-like lobed cells | no |
| 5–6 | ornate carpet, scalloping still visible | no |
| 7 | scallop starting to alias into the line | no |
| 8–9 | uniform fine lace, motif entirely gone | no |

**Visibly non-hexagonal through level 6; indistinguishable from ornament by 8. Nameable: never.**

## Determinism note for whoever repeats this

`index.js` seeds `seed..seed4` with `Math.random()` and persists them in `localStorage`
(`paperCranes.seeds`). A fresh browser profile therefore gets **new seeds every run**, and
`seed3`/`seed4` drive lattice twist and swirl — so baseline and variant would differ for reasons
unrelated to the edit. `scripts/lab-shot.mjs` pins them via `addInitScript` before any page script
runs, and asserts `:6981` in-process before it will save a frame.
