# kiku.frag — /lab H1: does the 12-fold chrysanthemum stay legible as the lattice cell?

Scratch fork of `1.frag` (the shared bead substrate) for one hypothesis, on `lab/kiku`, port 6981.
**Not art.** It exists to answer one question and carry the instruments that answered it.

> **H1: `kiku` stays legible as the lattice cell at fold levels 4–9.**
> **Verdict: NO, high confidence.** And the reason is *not* cell size: kiku is unnameable even at
> **804 px on screen**, 9× the largest cell the lattice draws at performance zoom.

Evidence: `journals/lab/shots/kiku-sheet.png`.

## ⚠ Retraction: my "bake defect" was wrong

An earlier version of this document claimed the mon bake was broken — "max green 127, the field
never crosses zero, only the interior half was baked, no legibility test is clean until re-baked."
**All of that was false and is withdrawn in full. The bake is correct. Nothing is blocked.**

The cause was my own tooling. I read the PNG through canvas2D `drawImage` + `getImageData`, which
stores **premultiplied alpha** and therefore returns `RGB = 0` wherever `alpha = 0`. The mon
exterior is `alpha = 0`, so the green channel read as 0 there and the field looked like it never
went positive. Re-read with PIL/numpy:

| | value |
|---|---|
| G overall | 45–200 (156 unique) |
| G **exterior** (alpha = 0) | **128–200** |
| G interior (alpha > 0) | 45–127 ← *this* is where my bogus "127 ceiling" came from |
| zero crossings, centre row | **2** |
| effective crossings per cell-space ray | **2.84** (min 1, max 9) |

**Rule: never read a baked SDF through canvas2D or anything that composites alpha.** Use
numpy/PIL or a GPU readback. My `scripts/lab-crossings.mjs` carried this bug and has been deleted
and replaced by `scripts/lab_sdf.py`. Screenshot tools (`lab-measure`, `lab-pitch`, `lab-repeat`)
may keep using canvas — rendered frames are opaque, so premultiplication cannot destroy anything.

**The H1 verdict does not depend on any of this** — it rests on `texCoordMax = 1.678` (pure
arithmetic, no image read), the `abs(p)` mirror (code), and the 804 px zoom test (screenshots).

## Why it fails: the cell never contains ONE flower

- `fractal()` does `vec2 uv = abs(p)` **before** the cell distance — a 4-fold mirror on the
  sampling coordinate. The motif is symmetrised before it is ever drawn.
- `beadDist` maps that to `tc = uv / (2·gHexR) + 0.5`. With `gHexR ≈ 0.6` and `|uv|` reaching √2
  after the per-level rotation, **`tc` reaches 1.678** — past 1.0 — so `wrap: REPEAT` pulls
  neighbouring tiled copies of the mon into the same cell. The cell spans ~1.7 texture periods.

So what is drawn is a **mirrored, tiled composite of kiku fragments**, never one closed 12-lobe
rosette. The `1cell-L4-zoom` tile catches one fragment: a 3-lobe scalloped arc.

**This is a property of the substrate's fold, not of kiku.** Any motif whose identity lives in its
*global closed outline* loses that identity here. Independently confirmed by `lab/ume`.

## On-screen cell size — nameability is NOT what breaks first here

`uv = (fragCoord − 0.5·iResolution.xy) / iResolution.y`, then `uv *= 0.07 / navZoom`. So one world
unit = `res.y · navZoom / 0.07` px, and the pitch at level `i` is that over `gScale^(i+1)`
(`gScale ≈ 2.0`). At 900×900, `navZoom = 0.218`:

| level | analytic pitch | measured | reads as | nameable? |
|---|---|---|---|---|
| **4 (coarsest)** | **87.6 px** | 44.8 † | scalloped / antler-like lobed cells | no |
| 5 | 43.8 px | **43.8** ✓ | ornate carpet, scalloping clear | no |
| 6 | 21.9 px | **21.9** ✓ | scalloping still visible | no |
| 7 | 10.9 px | 19.0 ‡ | scallop aliasing into the line | no |
| 8 | 5.5 px | 9.4 ‡ | uniform fine lace | no |
| 9 (finest) | 2.7 px | 8.6 ‡ | speckle | no |

† L4 also draws the cross term (`delt2`), giving ~2 crossings per cell.
‡ saturates below ~9 px: `alias = aliasBase · 0.5 · scale` widens lines with depth so adjacent
crossings merge. The exact agreement at L5 and L6 validates the ladder.

**High `i` = FINE**, so L4 is the largest cell the lattice draws at performance zoom, at ~88 px.

**The decisive test:** at `navZoom = 2.0` a level-4 cell is **804 px**, filling the frame — and
there texel sampling is ~1:1, so there is **no aliasing** either. kiku is *still* not nameable.
That single test isolates the sampling geometry from cell size and from minification alike.
lab/split's size→nameability result is real, and shows up here as the *scalloping* fading (visible
to ~22 px at L6, speckle by ~5 px at L8) — but kiku hits the size-independent failure first.

## The −37.8 % lit coverage: sampling, not the bake

With the bake exonerated, the coverage loss needed a new explanation. It is **not** fewer contours:

- **The field is fine.** Measured over a 4-texel finite-difference step, `|grad|` is **1.00 for the
  bead vs 1.15 for the hexagon** — comparable.
- **The bead has MORE contour area than the hexagon**, not less — line-area ratio **1.22–2.51×**
  depending on `gRingGap`. So "fewer lines" is ruled out.
- **The cause is undersampling of the tiled, mirrored field.** The fold doubles the sampling rate
  every level, so at 900 px / `navZoom = 0.218` one screen pixel spans:

| level | texels per pixel (linear) | per pixel **area** |
|---|---|---|
| 4 | 9.7 | 95 |
| 6 | 39.0 | 1 519 |
| 9 | 311.8 | 97 193 |

With `min: NEAREST` and **no mipmaps**, each pixel takes *one arbitrary point sample* out of those.
The contour band `|cellD − gRingGap| < gBorder` is therefore hit erratically pixel-to-pixel instead
of forming a coherent band. Line **cores** still reach full brightness where a sample lands in the
band — which is why `brightPct > 50` is preserved at ~4 % — but the connected mid-tone shoulder
painted by `smoothstep(gBorder + 0.06, gBorder + 0.01, m) * 0.35` never forms. Hence `litPct > 20`
down 37.8 % with mean luminance flat. **The hexagon is immune because `hexDist` is pure ALU with no
texture fetch**, so its shoulders are exact at every level.

**Fix:** mipmap + `LINEAR_MIPMAP_LINEAR` for the bead texture (a `Visualizer.js` change, and a
shared serialisation point), or restrict the bead to coarse levels (§8 variant 2), or evaluate the
motif analytically instead of sampling a texture.

## Brightness — n=4 with spread. Mean luminance does NOT discriminate; coverage does

Protocol adopted from `lab/split` (headed Chromium/real GPU, 1000×800, settle = `frameCount > 30`
+ 3000 ms), plus seed pinning and full-resolution metrics (`scripts/lab-repeat.mjs`), n = 4:

| arm | mean lum (mean ± sd, range) | lit >20 % (mean ± sd, range) |
|---|---|---|
| hex (`knob_161=0`) | 14.34 ± 0.42 (13.62–14.62) | **17.38 ± 0.84 (15.92–17.91)** |
| kiku (`knob_161=1`) | 14.82 ± 0.30 (14.54–15.31) | **10.81 ± 0.73 (9.93–11.86)** |

- **Mean luminance: no usable difference in my run** (kiku nominally +3.3 %, ranges overlap).
- **Lit coverage: −37.8 %, ranges non-overlapping.**

A later fleet measurement found **all 11 motifs brighten (+30–43 %)** at full resolution under
proper controls. My kiku meanLum moves the same *direction* but far less; the two were taken at
different viewport/zoom, so treat the fleet number as the headline and mine as same-sign
corroboration. Either way this confirms my withdrawal of the claim that tomoe's brightening was a
downsampling artifact — it was not.

> A downsampling trap is real, separately: a 160×160 downsample of these same frames reports kiku
> *brighter* (12.62 → 15.02), flipping the sign of the coverage result, and `lab/fill`'s
> `lab-metrics.mjs` resamples to 384 px wide before measuring.

## Reproducibility — pinning the seeds cuts the spread ~3×

`index.js` seeds `seed..seed4` with `Math.random()` into `localStorage` (`paperCranes.seeds`), and
`seed3`/`seed4` drive lattice twist and swirl, so a fresh browser context re-rolls the picture on
every load. Same arm, n = 4:

| | mean lum spread | lit % spread | distinct seed sets |
|---|---|---|---|
| seeds **pinned** | **5.2 %** | **17.8 %** | 1 |
| seeds **unpinned** | 9.3 % | **32.6 %** | 4 |

Unpinned mean-luminance spread (9.3 %) is essentially the ±8 % reported fleet-wide. Pinning via
`addInitScript` before any page script runs roughly halves it. **Recommended for every teammate.**

## Boundary crossings per radial direction (the candidate predictor)

720 rays from the motif centre (alpha-based, so never affected by the canvas bug):

| metric | kiku |
|---|---|
| rays crossing the silhouette **exactly once** | **694 / 720 (96 %)** |
| rays crossing 3× (the deep notches) | 26 / 720 (4 %) |
| radius modulation (`1 − rmin/rmax`) | **0.277** (rmin 331 px, rmax 458 px) |

**kiku scores LOW on this predictor, not high.** It is star-convex: a ray exits exactly once,
12-fold or not. Its 12-fold-ness is *angular* frequency plus a 28 % radius wobble. The predictor
survives — a low count correctly anticipates the mild scalloped restyling — but the prediction that
kiku would score high does not.

## The instrument (the only edit to the substrate's logic)

Two uniforms, both pure diagnostics — **do not merge into `1.frag`**:

- `onlyLevel` — draw exactly one fold level. `-1` = all levels (normal). Added *after* the fold, so
  geometry is untouched.
- `flatLevels` — bypass the depth window (`gLevelOpen`), so a single level isn't dimmed by depth.

⚠ Both default to `0.0` when absent from the URL, and `onlyLevel = 0` draws nothing (level 0 is
below `FIRST`). **Always pass `onlyLevel=-1` for a full render.**
