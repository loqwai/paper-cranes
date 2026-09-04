# kiku.frag — /lab H1: does the 12-fold chrysanthemum stay legible as the lattice cell?

Scratch fork of `1.frag` (the shared bead substrate) for one hypothesis, on `lab/kiku`, port 6981.
**Not art.** It exists to answer one question and carry the instruments that answered it.

> **H1: `kiku` stays legible as the lattice cell at fold levels 4–9.**
> **Verdict: NO, high confidence.** And the reason is *not* cell size: kiku is unnameable even at
> **804 px on screen**, 9× the largest cell the lattice draws at performance zoom.

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

## Why it fails: the cell never contains ONE flower

Measured, not assumed (`scripts/lab-crossings.mjs`):

- `fractal()` does `vec2 uv = abs(p)` **before** the cell distance — a 4-fold mirror on the
  sampling coordinate. The motif is symmetrised before it is ever drawn.
- `beadDist` maps that to `tc = uv / (2·gHexR) + 0.5`. With `gHexR ≈ 0.6` and `|uv|` reaching √2
  after the per-level rotation, **`tc` reaches 1.678** — past 1.0 — so `wrap: REPEAT` pulls
  neighbouring tiled copies of the mon into the same cell. The cell spans ~1.7 texture periods.

So what is drawn is a **mirrored, tiled composite of kiku fragments**, never one closed 12-lobe
rosette. The `1cell-L4-zoom` tile catches one fragment: a 3-lobe scalloped arc.

**This is a property of the substrate's fold, not of kiku.** Any motif whose identity lives in its
*global closed outline* loses that identity here.

> Corrected from an earlier reading of mine that claimed only the upper-right quadrant is sampled.
> The *unwrapped* coordinate is indeed always ≥ 0.5, but it exceeds 1.0 and wraps, so the whole
> texture is reached. Credit to the tomoe teammate; `texCoordMax = 1.678` confirms it.

## On-screen cell size — nameability is NOT what breaks first here

`uv = (fragCoord − 0.5·iResolution.xy) / iResolution.y`, then `uv *= 0.07 / navZoom`. So one world
unit = `res.y · navZoom / 0.07` px, and the pitch at level `i` is that over `gScale^(i+1)`
(`gScale ≈ 2.0`). At 900×900, `navZoom = 0.218` (the tuned performance zoom):

| level | analytic pitch | measured (`lab-pitch.mjs`) | reads as | nameable? |
|---|---|---|---|---|
| **4 (coarsest)** | **87.6 px** | 44.8 † | scalloped / antler-like lobed cells | no |
| 5 | 43.8 px | **43.8** ✓ | ornate carpet, scalloping clear | no |
| 6 | 21.9 px | **21.9** ✓ | scalloping still visible | no |
| 7 | 10.9 px | 19.0 ‡ | scallop aliasing into the line | no |
| 8 | 5.5 px | 9.4 ‡ | uniform fine lace | no |
| 9 (finest) | 2.7 px | 8.6 ‡ | speckle | no |

† L4 draws the cross term (`delt2`) as well as the ring, giving ~2 crossings per cell.
‡ saturates: `alias = aliasBase · 0.5 · scale` widens lines with depth, so adjacent crossings merge
below ~9 px. The exact agreement at L5 and L6 is what validates the ladder.

**High `i` = FINE** (`scale *= gScale` each iteration), so L4 is the largest cell the lattice ever
draws at performance zoom, at ~88 px.

**The decisive test:** at `navZoom = 2.0` a level-4 cell is **804 px** — it fills the frame, 9× the
performance-zoom size — and kiku is *still* not nameable (`1cell-L4-zoom` tile). So for kiku the
binding constraint is the mirror+tile composite above, **not** on-screen size. lab/split's
size→nameability finding is real and shows up here as the *scalloping* fading (visible to ~22 px at
L6, speckle by ~5 px at L8), but kiku hits the size-independent failure first.

## The bake never wrote the EXTERIOR of the signed field (defect, affects everyone)

| point | RGBA | decoded `d` |
|---|---|---|
| centre | `255, 45, 0, 255` | −0.65 (interior) |
| near boundary | `78, 121, 0, 255` | −0.05 |
| **just outside** | **`0, 0, 0, 0`** | **−1.00** |

**Max green anywhere in the image is 127/255**, decoding to `d = −0.004`: the field is **negative
everywhere and never crosses zero** (0 boundary crossings along every cell-space ray). Outside the
silhouette the PNG is fully transparent, so green reads `0` and `beadDist` returns −1.0 — the
*deepest interior* value — for every exterior pixel. Only the interior half was baked.

Consequence: `abs(cellD − gRingGap)` bottoms out at ≈ `gRingGap` instead of reaching 0, so every
bead-drawn line is systematically weaker than its hex equivalent, and the field is discontinuous at
the boundary.

## Brightness — n=4 with spread. Mean luminance does NOT discriminate; coverage does

Protocol adopted from `lab/split` for cross-teammate comparability (headed Chromium/real GPU,
1000×800, settle = `frameCount > 30` + 3000 ms), plus seed pinning and full-resolution metrics
(`scripts/lab-repeat.mjs`), n = 4, `time=8`:

| arm | mean lum (mean ± sd, range) | lit >20 % (mean ± sd, range) |
|---|---|---|
| hex (`knob_161=0`) | 14.34 ± 0.42 (13.62–14.62) | **17.38 ± 0.84 (15.92–17.91)** |
| kiku (`knob_161=1`) | 14.82 ± 0.30 (14.54–15.31) | **10.81 ± 0.73 (9.93–11.86)** |

- **Mean luminance: no usable difference.** kiku is nominally +3.3 %, and the ranges overlap. Any
  single-shot mean-luminance claim here — in either direction — is inside the noise.
- **Lit coverage: −37.8 %, and the ranges do not overlap at all** (hex min 15.92 > kiku max 11.86).
  That is the real, robust effect, and it is caused by the bake defect above.

**This reconciles kiku with tomoe rather than contradicting it.** kiku's mean luminance also comes
out slightly *up*, exactly like tomoe's. The disagreement was never real — `meanLum` simply does not
discriminate these arms. **Decide the counter-ratchet question on lit coverage, not on mean**, and
**fix the bake first**: compensating now would bake the defect in.

> An earlier note of mine guessed tomoe's brightening was a downsampling artifact. That guess was
> wrong and is withdrawn. The downsampling trap is real (a 160×160 downsample of these same frames
> reports kiku *brighter*, 12.62 → 15.02, flipping the sign of the coverage result) and
> `lab/fill`'s `lab-metrics.mjs` does resample to 384 px wide — but it is not what explains tomoe.

## Reproducibility — pinning the seeds cuts the spread ~3×

The ±8 % irreproducibility is **substantially seed-driven, not only `lattice-nav` real-time state.**
`index.js` seeds `seed..seed4` with `Math.random()` into `localStorage` (`paperCranes.seeds`), and
`seed3`/`seed4` drive lattice twist and swirl, so a fresh browser context re-rolls the picture on
every load. Same arm, n = 4, pinned vs not:

| | mean lum spread | lit % spread | distinct seed sets |
|---|---|---|---|
| kiku, seeds **pinned** | **5.2 %** | **17.8 %** | 1 |
| kiku, seeds **unpinned** | 9.3 % | **32.6 %** | 4 |

Unpinned mean-luminance spread (9.3 %) is essentially the ±8 % being reported fleet-wide. Pinning
via `addInitScript` before any page script runs (see `scripts/lab-shot.mjs` / `lab-repeat.mjs`)
roughly halves it, and cuts coverage spread by ~2.7×. **Recommended for every teammate.**

## Boundary crossings per radial direction (the candidate predictor)

720 rays from the motif centre:

| metric | kiku |
|---|---|
| rays crossing the silhouette **exactly once** | **694 / 720 (96 %)** |
| rays crossing 3× (the deep notches) | 26 / 720 (4 %) |
| radius modulation (`1 − rmin/rmax`) | **0.277** (rmin 331 px, rmax 458 px) |

**kiku scores LOW on this predictor, not high.** It is star-convex: a ray from the centre exits
exactly once, 12-fold or not. Its 12-fold-ness is *angular* frequency plus a 28 % radius wobble, not
radial crossings. The predictor survives — a low count correctly anticipates the mild scalloped
restyling the sheet shows — but the prediction that kiku would score high does not.
