# lattice-bead / tile.frag — H12, the translation-repeat fold (lab/tile, wave 2)

## Hypothesis
Replacing the mirror-repeat fold with a translation-repeat, so every lattice cell holds one
whole UNMIRRORED motif, makes the bead recognisable at every depth.

## Verdict — YES, but only in the LOCKED form. Confidence: high.

`knob_166` selects the fold. `knob_167` weights the hex skeleton.

| knob_166 | mode | whole motif? | seams | kaleidoscope |
|---|---|---|---|---|
| 0 | MIRROR (baseline 2.frag) | no — one quadrant, mirrored 4x | none | intact |
| 0.5 | TILE (translation, free twist) | yes | **yes, everywhere** | shattered |
| 1 | LOCK (translation + lattice-locked) | yes | **none, exactly** | replaced by a p4 wallpaper |

## Why the baseline could never work
`2.frag:303` is a triangle wave:
```glsl
p = 1.0 - abs(s * fract(p - 0.5) - s * 0.5);
```
With `s = 2` it maps every axis into `[0,1]` and puts the drawn cell at `p = 0`, a CORNER.
So `p` is never negative, `abs(p)` at the sampling site is a no-op (hence wave 1's 0.36%
result when it was deleted), and the bead texcoord `tc = p/r*0.5+0.5` only ever reaches
`[0.5,1]` — **one quadrant of the bake, mirrored four ways. Three quarters of every mon is
unreachable.** No amount of size, brightness or mipmapping can recover it.

## What changed in fractal()
1. `pTile = (fract(p + 0.5 + tileOff) - 0.5) * s` alongside the mirror fold, selected by
   `tileOn`. Same |derivative| (`s`), same cell pitch, same cell radius, so TILE vs MIRROR
   is apples-to-apples geometry. Output now spans `[-s/2, s/2)`, so `tc` spans the whole bake.
2. `bp = mix(abs(p), p, tileOn)` at the sampling site, and `hexTerm/beadTerm` read `bp`.
   `hexDist` abs()es internally so it is unaffected; `delt2` keeps `abs(p)` because the cross
   is a cell-centred plus sign, 4-fold by construction not by accident.
3. LOCK (`lockOn`): `s` pinned to 2, per-level rotation replaced by a STATIC quarter-turn
   count from `seed3/seed4` with an EXACT integer matrix, and per-level variety recovered as a
   free translation of the tiling phase.
4. `knob_167` CROSS WEIGHT: 0 untouched, 0.5 skeleton clipped to outside the motif (it becomes
   the string the beads are threaded on), 1 skeleton gone.

## The seam cost is a theorem, not a tuning bug
A continuous periodic map onto a full tile must turn around inside the period — it must
mirror. **Unmirrored therefore requires a jump.** Here `p` jumps by exactly `s` at each tile
wall. That jump is harmless to the level that made it (the wall sits at `|p| = 1`, outside the
cell radius 0.6) but it is fed through `p *= rot2(theta)` into every deeper level.

It is invisible to the next level's period-1 `fract()` **iff the rotated jump vector is an
integer vector**. `|jump| = s`, so that needs `s` integer AND `theta` a multiple of PI/2
(cos and sin must both be in {0,+-1}; +-60 deg gives `2 sin 60 = 1.732`). That is LOCK, and it
removes the seam exactly rather than hiding it.

## What LOCK costs
`gThetaStep` (K141), `gSpin`, `gTwistFall` (K142), `gLevelSkew` (K145), `evoWarp`'s fold term
and the drifting fold ratio (K131) all stop acting on the fold. With them go the b1 symmetry
plateaus, b2 spin-follows-low-end, and the b4 spatial permutations of the fold params.
The result is a p4 wallpaper, not a kaleidoscope. It is beautiful and it is not the same thing.
One consolation: locked `s = 2.0` exactly matches the default K148 ZOOM OCTAVE of 2.0, so the
~60 s infinite-zoom wrap stays seamless by construction.

## Numbers (controller OFF, all four seeds pinned, 900x900 full res, n=3, ume, navZoom 0.8)
litPct = Rec.709 luma > 20; brightPct > 50; darkPct < 5. Spread is max-min of 3.

| mode | mean | litPct | brightPct | darkPct |
|---|---|---|---|---|
| MIRROR | 10.08 +-0.19 | 7.19 +-0.08 | 5.04 +-0.04 | 54.2 +-1.7 |
| TILE | 13.79 +-0.05 | 9.22 +-0.02 | 6.45 +-0.01 | 29.2 +-0.4 |
| LOCK | 19.70 +-0.28 | **19.35 +-0.36** | **10.65 +-0.13** | 28.5 +-1.0 |

LOCK is 2.69x lit and 2.11x bright over the baseline at 34x signal-to-noise. It also gives up
half the deep black (54 -> 28.5), which is the one brightness regression.

## Seam measurement — exact, not eyeballed (`scripts/lab-seams.py`)
Reimplements the fold recursion in numpy and counts, per level, the % of adjacent samples where
the drawn field STEPS by more than the line half-width. That step IS the seam.

| level | MIRROR | TILE | LOCK |
|---|---|---|---|
| 4 | 0.000 | 0.292 | 0.000 |
| 5 | 0.000 | 0.571 | 0.000 |
| 6 | 0.000 | 1.975 | 0.000 |
| 7 | 0.000 | 2.225 | 0.000 |
| 8 | 0.000 | 0.151 | 0.000 |
| 9 | 0.000 | 0.209 | 0.000 |

(levels 4-7 from a full level-0 cell at 4096^2; levels 8-9 from a 1/32 window at the same
count, which resolves them but undercounts walls from levels 0-4.) MIRROR is the known-continuous
control and reads exactly 0 — the metric is calibrated. **LOCK reads exactly 0 at every level
and both sample pitches.**

## Identity check
`knob_166 = 0, knob_167 = 0` reproduces the untouched `2.frag` to within 0.06 pt of lit
coverage (8.20 vs 8.147 +-0.04, n=3), against an 11.2 pt effect. Pixel-diffing is useless here:
two captures of the SAME shader differ in 21-30% of pixels from frame-count jitter alone.

## Which mon to ship
`ume` — the 5-lobed plum blossom. Round, high negative space, unmistakable at 15% scale, and it
nests into itself beautifully at navZoom 2.0. `kikko` (hexagon) and `hakkaku` (8-point star) are
close behind and read at least as fast. `tomoe` is the interesting one: its chirality survives
LOCK and cannot exist at all under a mirror fold.

## Shots
`journals/lab/shots/sheet-recognition.png`, `sheet-15pct.png`, `sheet-forced-choice.png`,
`seamcrop-z8-tile-ume.png` (the cost, unmistakable), `aes-lock-ume-z2.png` (blossoms inside
blossoms).
