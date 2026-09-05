# grid-chroma.frag — grid of crests for ChromaDepth glasses (2026-09-04)

`grid.frag`'s cell mechanics untouched (square tiles on any viewport, a whole crest per cell, one-way tide,
lattice-nav pan/zoom, the travelling hero cell); colour replaced by the ChromaDepth discipline.

## Run
```
?shader=redaphid/wip/lattice-bead-vj/grid-chroma&controller=wavelet-ease&controller=lattice-nav&image=images/beads/mon-hakkaku.png&wavelet=true
```

## Per cell, through the glasses
- **Outline** — nearest, a hot red line, the one bright thing.
- **Interior** — a staircase stepping back from the outline to a dark green well (0.02 → 0.42). The steps
  *are* the outline-echo rings: depth uses the signed distance **quantised** to the ring pitch, so every
  terrace is flat and the exposure line sits exactly on its edge. Pitch follows the spectral-spread median;
  the terraces travel inward one way on `flowPhase` as a bounded, zero-mean correction of the true distance.
  Every step is darker (exposure 0.42 → 0.14).
- **Ground** — steps out through cyan and blue to violet (0.56 → 0.96) at the tile boundary, where it meets
  the neighbour's steps: every cell interaction is the crest's own outline receding.
- **Per-cell depth** — each interior pushed back by 0..0.12 (golden-ratio spread); rims stay nearest.
- **Hero cell** — more exposure and pulled 0.05 toward you on a monotonic phase.
- **Beat** — `wavelet_bassHitSmooth` pulls the crest toward the viewer (K6 POP) and lights its interior
  (+0.16 exposure), crest-masked; every rim breathes with `waveletBassSpring`; the terrace-edge lines ride
  bands 2/3; the well breathes with `energySpring`.

## Knobs (0 = baked)
K1 TILES, K2 ECHO, K4 GROUND, K5 DRIFT as `grid.frag`. K3 **DEPTH SPREAD** (was TINT — rotated hue).
K6 **POP** (new): kick pull toward the viewer, baked 0.05, dial 0..0.12.

## Measured (`cd-measure.mjs`, 384², hakkaku, pinned)
Spearman ρ(depth, hue) **0.999**; mean hue error 0.0009; near-white **0.000%**; lum 64 (was 70 before the
exposure ladder was darkened), dark 14%, bright 58%. Band coverage: red 21%, orange 16%, green 7%, cyan 14%,
blue 25%, violet 17%.
