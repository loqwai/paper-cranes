# grid.frag — tiling the mon SDF as a plain periodic grid

**Hypothesis (H-grid):** the mon PNG can be laid down as a plain N×N periodic
grid — no fractal fold, no audio, no frame feedback — with crisp SDF-derived
edges, correct aspect handling, and a boundary that lands in the same
relative position in the tile regardless of N. If true, the same coordinate
math is the seed path for `lattice-bead/2.frag`.

**Verdict: yes.** Confirmed at 3×3, 8×8, 12×12, on a chiral motif (tomoe),
and on a deliberately non-square viewport (1200×500). Shots:
`journals/lab/shots/kikyo-3x3.png`, `kikyo-8x8.png`, `kikyo-12x12-nearest.png`,
`kikyo-12x12-mipmap.png`, `tomoe-5x5.png`, `tomoe-5x5-mirror.png`,
`kikyo-3x3-mirror.png`, `nonsquare-1200x500.png`, plus tile crops
`crop-3x3-tile.png` / `crop-8x8-tile.png` for the scale-invariance check.

---

## 1. The tiling expression and its coordinate spaces

```glsl
vec2 uv01 = fragCoord / iResolution.xy;          // SPACE 1->2a: pixels -> [0,1]^2
vec2 ndc  = uv01 * 2.0 - 1.0;                     // SPACE 2b: centred, [-1,1]^2
ndc.x *= iResolution.x / iResolution.y;           // SPACE 2c: aspect-corrected

float N = mix(1.0, 12.0, clamp(knob_1, 0.0, 1.0));
vec2 p  = ndc * (N * 0.5);                        // SPACE 3: tile-pitch space, 1 p-unit = 1 tile

vec2 tileIndex = floor(p + 0.5);                  // SPACE 4a: integer tile index
vec2 f         = fract(p + 0.5) - 0.5;            // SPACE 4b: in-tile coord, [-0.5, 0.5)

float r  = 0.5;                                   // tile half-pitch, constant by construction
vec2  q  = f / r;                                 // SPACE 5a: bead-normalised, [-1,1)
vec2  tc = q * 0.5 + 0.5;                         // SPACE 5b: texture coord, [0,1)

vec4 tex = getInitialFrameColor(tc);
float dNorm = (tex.g - 0.5) * 2.0;                // SPACE 6: bake-normalised SDF, unitless, 0 at boundary
float dTile = dNorm * r;                          // SPACE 7: p-space (lattice) units
float dPx   = dTile * (iResolution.y / N);        // SPACE 8: screen pixels
float covered = 1.0 - smoothstep(-aaWidth, aaWidth, dPx);
```

| Space | Name | Range |
|---|---|---|
| 1 | `fragCoord` — screen px | `[0, iResolution.xy]`, origin bottom-left |
| 2a | `uv01` | `[0,1]²` |
| 2b | `ndc` (pre-aspect) | `[-1,1]²` |
| 2c | `ndc` (aspect-corrected) | x: `[-aspect,aspect]`, y: `[-1,1]` |
| 3 | `p` — tile-pitch space | y: `[-N/2, N/2)`, x scaled by aspect too |
| 4a | `tileIndex` | integers |
| 4b | `f` — in-tile offset | `[-0.5, 0.5)` per axis |
| 5a | `q` — bead-normalised | `[-1, 1)` |
| 5b | `tc` — texture coord | `[0, 1)` |
| 6 | `dNorm` — bake-normalised SDF | unitless, 0 = boundary, ±1 ≈ bake edge |
| 7 | `dTile` — lattice units | same units `hexDist`/`beadDist` use in `2.frag` |
| 8 | `dPx` — screen pixels | used directly as the `smoothstep` argument |

The key move is Space 3: scaling the aspect-corrected `ndc` by `N/2` makes
**one p-unit equal exactly one tile pitch on both axes simultaneously**,
because the aspect correction already equalised the physical size of an x-step
and a y-step before this scale was applied. Every later step (fold, texture
lookup, SDF) is written purely in these tile-pitch units and only converts
back to pixels at the very end, for antialiasing.

## 2. `fract` vs mirror-repeat

The baseline `fract`-only form used here is:

```glsl
vec2 f = fract(p + 0.5) - 0.5;     // always in [-0.5, 0.5) — TRANSLATION repeat
vec2 tc = (f / r) * 0.5 + 0.5;     // spans the WHOLE texture, once, unmirrored, per tile
```

I also built the mirror-repeat form (`knob_2 >= 0.5`) as an explicit A/B:

```glsl
vec2 parity  = mod(tileIndex, 2.0);         // 0 or 1 per axis
vec2 fMirror = mix(f, -f, parity);          // flip sign on every OTHER tile
```

This is algebraically the same operation as `lattice-bead/2.frag`'s triangle
wave, `p = 1.0 - abs(s*fract(p-0.5) - s*0.5)` with `s=2` — that expression is
just the fold and the per-tile flip fused into one line and biased to land at
a tile corner instead of a tile centre. Decomposed here as
`floor`+`fract`+parity-flip, the two behaviours are easy to tell apart on
screen instead of having to read a triangle-wave identity.

**Effect on tomoe (the chirality check):** `tomoe-5x5.png` (translation
repeat) shows all 25 swirls with **identical handedness** — the shape is
literally the same PNG region redrawn 25 times. `tomoe-5x5-mirror.png` shows
a checkerboard: adjacent columns/rows alternate handedness, because every
other tile samples the texture through a sign flip. `kikyo-3x3-mirror.png`
is less visually diagnostic only because kikyo happens to have a near-mirror
symmetry of its own — which is exactly why the brief calls for testing on
tomoe: a symmetric motif can silently hide a mirroring bug.

**Which do we want for seeding, and why:** translation repeat, unambiguously.
A seed frame is supposed to encode "the mon shape, repeated" — if every other
copy is mirrored, the seed no longer represents a single consistent motif,
and (worse for the lattice's own downstream math) a mirrored copy is not
obtainable from the un-mirrored one by any `p ↦ p·M` the fractal fold already
applies per level, so recovering "which cells are flipped" downstream would
require carrying an extra parity bit that nothing else in `2.frag` tracks.
Confirms `tile.md`'s H12 finding at the flat-grid level too: mirror is what
you get for free, translation is what you have to build and is what you want
for identity.

## 3. Where the seams are

None, at any N tested (3, 5, 8, 12), in translation-repeat mode. Two reasons,
both structural:

1. **`f` never leaves `[-0.5, 0.5)` by construction.** `fract` guarantees
   this algebraically — there is no code path where `tc` can walk past
   `[0,1)` into a neighbouring period, so `gl.REPEAT` wrap is never invoked
   for this shader's own coordinate math. Every tile samples exactly one
   full, un-repeated copy of the texture.
2. **The bake's 1.12× bleed margin becomes irrelevant here** because the
   grid never samples close to `tc = 0` or `tc = 1` from a wrapped neighbour
   — those texel rows only get touched by *this tile's own* motif corners,
   which are already zero-coverage (`A = 0`) in the padding region (verified:
   `mon-kikyo.png` at `(50,50)` and `(512,80)` — both padding pixels — read
   `A=0`, confirming the bleed margin is empty canvas, not spillover from an
   adjacent copy).

**Do I need `beadDist`'s `ONETILE` clamp here? No — and this is the one
place `2.frag` and `grid.frag` genuinely differ.** `beadDist(p, r)` computes
`q = p / r` where `p` is the *fractal fold's output* — a coordinate that has
already been rotated, translated per recursion level, and (in TILE/LOCK
mode) can legitimately walk outside `[-r, r)` before `beadDist` ever sees it,
because the fold's translation offset (`tileOff`, driven by `seed3`/`seed4`)
is applied *before* the modulus in some level configurations. That's what
made the un-clamped lookup wrap ~1.48 periods and mosaic in `tile.frag`'s own
measured history. My grid's `f` is the *direct* output of a single
`fract(p+0.5)-0.5`, nothing is applied to it afterward before the texture
lookup, so it is analytically guaranteed to stay in-range — clamping would be
a no-op here. **The lesson for seeding:** the clamp is not a property of
"sampling an SDF PNG," it's a property of *how far downstream of the modulus*
the sample site is. A seed pass that samples immediately after its own
`fract` (as this shader does) doesn't need it; if the seed pass shares
coordinate plumbing with the recursive fold (i.e. becomes a `BEAD_MIX=1`-style
level *inside* `fractal()`) it inherits the same risk `beadDist` was built to
cover, and should keep the clamp.

## 4. Scale invariance — the important one

`hexDist` in the real lattice is a **norm** (homogeneous of degree 1):
`hexDist(k·p) = k·hexDist(p)`, so `hexDist(p) - r` is correct for any `r`
because the norm rescales itself. A baked SDF is **not** a norm — `G(tc)` is
a distance measured once, at the bake's fixed 1024×1024 resolution, with no
notion of "current cell size." Substituting it directly into `(... - r)` the
way you would `hexDist` is dimensionally wrong (this is exactly the trap
`2.frag`'s own comment flags at `beadDist`).

The fix — and the reason this shader is a clean, minimal proof of it — is
**"sample at `p/r`, multiply back by `r`":**

```glsl
vec2 q = f / r;                 // r = 0.5 here: normalise the in-tile coord to a fixed [-1,1) window
float dNorm = (G(tc) - 0.5) * 2.0;   // read the bake's OWN normalised distance (already ±1-at-edge by construction)
float dTile = dNorm * r;             // rescale that normalised distance back into THIS cell's actual size
```

In this shader `r` is a compile-time constant (0.5, because Space 3 defined
tile pitch = 1 p-unit deliberately) so the rescale multiplies by a constant —
which makes it easy to miss that anything is happening at all. The
non-trivial case is `N` changing: `N` does **not** change `r` in p-space (a
tile is always half-a-p-unit wide by definition), it changes how many screen
pixels one p-unit covers (`iResolution.y / N`). So the part of this pipeline
that truly has to track scale is the **pixel conversion**, `dPx = dTile *
(iResolution.y / N)`, not the texture lookup — the texture lookup is already
scale-correct because `tc` is computed from the *normalised* `q`, never from
raw screen pixels.

**Numerical confirmation:** `crop-3x3-tile.png` and `crop-8x8-tile.png` are
both a single tile, extracted from the *centre* tile of each render (the
centre screen pixel is always a tile centre regardless of N, since `p=0`
there for every N) and upscaled to the same 300×300 output. The two crops
show the silhouette occupying the *same fraction* of the tile square — same
margins top/bottom/left/right, same petal proportions — which is exactly
what "the boundary lands in the same relative position at every N" means in
practice. The 8×8 crop shows visible staircasing on the edge (see §5) but the
*location* of the 50%-coverage contour relative to the tile bounds is
unchanged. This is the load-bearing property for seeding: whatever cell
radius the lattice hands this code at a given recursion level, `beadDist`'s
`p/r * r` idiom guarantees the same relative silhouette, just resampled at a
different pixel density.

## 5. Filtering — NEAREST vs mipmap

Tested `kikyo-8x8` and `kikyo-12x12` under both the default (`NEAREST`, no
mipmaps, `gl.REPEAT`) and `?image_filter=mipmap` (`LINEAR_MIPMAP_LINEAR` /
`LINEAR`). **Visually indistinguishable in both cases** — see
`kikyo-8x8.png` vs `kikyo-8x8-mipmap.png`, and `kikyo-12x12-nearest.png` vs
`kikyo-12x12-mipmap.png`.

This is expected, and it is a direct consequence of §1/§4: **this shader
never relies on the texture filter for antialiasing.** The edge is drawn by
`smoothstep(-aaWidth, aaWidth, dPx)`, where `aaWidth` is fixed in *screen
pixels* and `dPx` comes from a single analytic-SDF point sample, converted to
pixel units by the exact `iResolution.y/N` factor derived above. Averaging
raw `G` values across a mip level (or bilinearly across neighbouring texels)
would not obviously help this: `G` is already a distance field, and while
*averaging distances* is more defensible than averaging colours or alpha
(the mean of several nearby signed distances is still a reasonable distance
estimate near a flat boundary), it competes with a technique — analytic SDF +
screen-pixel `smoothstep` — that's strictly better because it doesn't depend
on how many texels happen to land in a pixel's footprint.

Where a real difference *would* show up: the residual jaggedness visible in
`kikyo-12x12-nearest.png` (fine sawtooth on the petal edges) is not mip
aliasing — mipmap and NEAREST render nearly the same jaggedness at the same
N — it is **8-bit `G`-channel quantization**. At 12×12 the source PNG (1024²)
is minified by roughly 13.6× per axis into a ~75px tile, and `NEAREST`
picks one of a small number of already-coarse `G` values near the boundary;
each of those steps by `1/255` in `dNorm`, which after the `*r*(iResolution.y/N)`
chain is a visible fraction of a screen pixel at high N. **This is what
`2.frag`'s `knob_176` 5-tap box-filter probe was built to test on the real
lattice** (documented as "residual darkness is LIGHTING, not coverage" —
i.e. a similar conclusion: at the framing tested there, the missing
signal was not a filtering artefact). My finding agrees directionally: for
*this* pipeline, filtering mode is a minor lever; the field to improve if
edge quality at very high N matters is either encoding `G` at higher bit
depth, or multi-tap sampling `G` inside `beadDist` the way `knob_176`
already does (that codepath is filter-agnostic and would fix both NEAREST
and mipmap the same way).

**Recommendation:** keep `NEAREST`/no-mipmap as the default. It costs
nothing, matches what `2.frag` already ships, and mipmapping an SDF channel
risks a subtler failure than a jaggy edge — averaging distances across mip
levels built by simple 2×2 box-downsampling is only locally valid near a
roughly-planar boundary; deep in a concave corner (kikyo's petal notches) a
coarse mip can blend distances from *two different sides* of the shape and
produce a wrong-sign or discontinuous value. I did not observe this at the
N tested, but it is a known failure mode of mipmapped SDFs and worth a flag
for future higher-N or fisheye-zoom work.

## 6. Seeding recommendation

**Recommendation: use this shader's Space-3–8 pipeline verbatim as a
pre-pass that writes into the frame `2.frag` reads via `getLastFrameColor` /
`prevFrame` on frame 0 (or behind a `iFrame < 1` gate), rather than trying to
make `fractal()`'s recursive fold produce a flat grid as one of its levels.**

Concretely: run `grid.frag`'s logic (translation-repeat, fixed N, no fold) as
its own draw, store the RGBA result as the "initial condition," and let
`2.frag`'s existing frame-feedback machinery (`getLastFrameColor`) treat it as
if it were any other previous frame — i.e. the lattice's recursive structure
still draws every subsequent frame, but frame 0 is a legible, recognisable
grid of mon instead of black or noise. This is the "cleanest injection
point" because:

- It requires **zero changes to `fractal()`** — no new fold mode, no new
  `BEAD_MIX`-style channel-hierarchy hazard, nothing that risks the
  standing "geometry is monotonic/one-way" discipline documented at length
  in `2.frag`'s own comments.
- It reuses machinery that already exists and is trusted (`prevFrame` /
  `getLastFrameColor` is exactly how `2.frag` already accesses "the frame
  before this one" for its feedback effects).
- The grid pipeline here is *provably* scale-correct (§4) and seam-free (§3)
  on its own, so whatever N and image the seed pass uses, it hands the
  lattice a clean starting frame with no artefacts of its own to debug.

**Risks:**

1. **One-frame seed vs persistent seed.** If the lattice's feedback loop
   only reads `prevFrame` with heavy blending/decay (as `2.frag`'s comments
   describe — `mix(prev*0.99, new, 0.1)`-style accumulation), a single seed
   frame may wash out in a few seconds and the grid will never be
   recognisable once the fractal takes over. Whether that's desired (a grid
   "flash" that resolves into the fractal) or undesired (wanting the grid
   to persist as a visible substrate) needs a product decision before this
   is wired up — it changes whether the seed pass runs once or needs to be
   periodically re-asserted.
2. **N and cell placement mismatch with the fractal's own lattice.** This
   grid's tile pitch is driven by a flat knob (`knob_1`→N); `2.frag`'s cell
   radius (`gHexR`) is driven by a different, audio/knob-reactive chain.
   If the seed grid's tile size doesn't roughly match the fractal's level-0
   cell size, the "grid dissolving into the lattice" transition will look
   like a jump-cut rather than a continuous reveal. Matching them requires
   either computing the seed's N from `gHexR` at seed time, or accepting a
   deliberate visual snap.
3. **Texture-unit / render-target plumbing is outside this lab's
   constraints.** Wiring an actual pre-pass that writes to `prevFrame` on
   frame 0 touches `src/Visualizer.js`'s frame buffer ping-pong — which this
   brief explicitly forbids editing. That file (or an equivalent seed-frame
   hook) is the coordinator's call, not something this experiment can land;
   this section is the recommendation for *when* that plumbing exists, not a
   claim that it's ready today.
4. **Aspect/centring drift.** This shader centres N tiles on the *screen*.
   `2.frag`'s fractal is centred on the *pan/zoom-adjusted world origin*
   (`navX`/`navY`/`navZoom`), which is not generally screen-centre once a
   viewer has panned. A seed frame generated at `navX=navY=0` and then read
   back after the viewer has panned away would show the grid in the wrong
   place relative to the fractal's own coordinate frame — the seed pass
   would need to either always run before any pan state is applied (frame 0
   only, before `lattice-nav` has moved anything) or be computed in world
   space using the same `navX/navY/navZoom` uniforms the fractal itself
   reads.

**Opinionated bottom line:** the coordinate math in this file is ready to
copy-paste as-is into a seed pre-pass; the open work is entirely on the
*integration* side (render-target plumbing, one-shot vs persistent seeding,
and matching N to `gHexR`), not on the tiling math itself.

---

## Surprises / corrections to the brief

- **The brief's "hard step vs smoothstep" framing undersells how little the
  hard/soft choice matters once you have an analytic SDF at all.** The real
  finding is that *deriving AA width in screen pixels* (via `iResolution.y/N`)
  matters far more than NEAREST-vs-mipmap texture filtering — see §5. A flat
  `step(0.5, A)` on the coverage channel would still look bad at high N for a
  different reason than "no smoothstep": it has no way to know how many
  screen pixels the boundary should span, so it can't self-scale as N grows.
  Worth stating precisely for whoever reads this next: the win from using
  `G` isn't "SDFs are smoother than alpha," it's "a distance field lets you
  size the antialiasing ramp in real units, alpha coverage alone doesn't."
- **`ONETILE`'s clamp is unnecessary for a flat grid** (§3) — I initially
  assumed I'd need to port it and found the assumption wrong once I traced
  where `beadDist`'s upstream coordinate can actually leave `[-r,r)` and
  confirmed mine provably can't. Worth flagging so nobody copies the clamp
  into a seed pass "just in case" and pays its cost (an added `length()` and
  a branchless mix per sample) for nothing.
- Everything else in the brief (channel layout, bleed margin, `beadDist`'s
  rescale trick, the mirror-vs-translation distinction) checked out exactly
  as stated.
