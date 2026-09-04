# lattice-bead-vj/grid — the lattice of bead cells

Built 2026-09-04 for MOGEE from `lattice-bead/grid.frag` (the flat translation-repeat grid whose
coordinate math is proven in `lattice-bead/grid.md`). One whole mon crest per cell, never mirrored,
never folded, so every cell is nameable at a glance — the clearest answer to "a lattice whose cells
are directly, clearly related to the beads".

## URL

```
?shader=redaphid/wip/lattice-bead-vj/grid&controller=wavelet-ease&controller=lattice-nav
  &image=images/beads/mon-hakkaku.png&wavelet=true
```

Swap the mon freely: tomoe reads best (chirality survives because nothing is folded), hakkaku and
kiku are clean, ume fine. Drag pans, pinch zooms (lattice-nav). Knobs, 0 = baked default:

| knob | name | does |
|---|---|---|
| knob_1 | TILES | crests across the screen height (baked 3.2 → 4×3 at 4:3, 2×3 on a phone; 0.1..1 → 1.5..8) |
| knob_2 | ECHO | outline-echo ring amount (baked 1.0, dial 0..2) |
| knob_3 | TINT | per-cell hue spread (baked 1.0, dial 0..2) |
| knob_4 | GROUND | ground light (baked 1.0, dial 0..2) |
| knob_5 | DRIFT | tide rate (baked 1.0, dial 0..2) |

## What the cells do — all shading, no audio on geometry

- **Outline-echo rings** (from the 1.frag lab keeper): concentric copies of the crest's own outline,
  inset inside so the fill is made of the bead, ripples outside that meet the neighbour's at the tile
  boundary. They travel one way on `flowPhase`; spacing 0.07..0.11 tile follows the
  spectral-spread **median** (a slow shape); amplitude only from `waveletBand2/3Spring`.
- **Per-cell tint**: `fract(dot(tileIndex, vec2(0.618034, 0.381966)))`, so neighbours always differ
  but stay one family (±0.1 hue turn). Per-cell slow spin on `spinPhase` with a tiny rate spread and
  a constant direction per cell — never in unison, never reversing.
- **Slow palette**: `s = seed + (pitchClassMedian-0.5)*0.30 + (spectralCentroidMedian-0.35)*0.25 +
  huePhase*0.02 + tint`. Blue/teal body, warm heart at the core (energySpring breathes it, masked to
  the core), rim at `s+0.30` lit by `waveletBassSpring`, hue nudged by `waveletCentroidSpring`.
- **Rim** is the only bright line: ~3 px, Oklch L 0.79 with chroma kept (never white), soft glow.
- **Ground**: dark plum complement (L≈0.17), gentle spatial vignette (a constant mask, not audio).

## Measured (headless, `scripts/lab/grid-shot.mjs`, everything stubbed, `time=8` pinned)

| frame | lum/255 | dark <20 | bright >50 | white |
|---|---|---|---|---|
| 1200×900 hakkaku | 28.1 | 51.5% | 13.1% | 0 |
| 900×1600 hakkaku | 21.3 | 56% | 6.5% | 0 |
| 1200×900 tomoe | 38 | — | — | 0 |

Aspect: the crest is the same shape at 1200×900 and 900×1600 (aspect-corrected ndc, one p-unit =
one tile on both axes). Motion (`PIN=0`, controller running, 4 frames 1.5 s apart): echoes travel
outward, cells turn a few degrees each, ~8 px diagonal tide, no snap.

## Hero cell (critic round 1: "wallpaper, no hero, no path for the eye")

One lit crest travels a gentle diagonal across the screen, corridor-light style. The traverse runs on
`u = fract(flowPhase * 0.06 + seed)` (one direction, ~80 s per pass) and is fract-wrapped the
documented way: its brightness envelope is `sin(u * PI)`, so the hero fades in at the bottom-left,
peaks at SCREEN CENTRE, fades out top-right, and the wrap is invisible. The cell hand-off is a
continuous distance weight `smoothstep(1.35, 0.15, |tileIndex - heroP|)`, never a jump. Lighting
only: rim and interior lifted, neighbours dimmed up to 18% in a soft local falloff (`heroDim`),
audio (bass spring) touches the hero rim only. Screen-relative, so it stays near the centre under
pan. Frames `grid-5m-1..4.jpg`: lum 31, dark 50%, bright 16%, white 0.1%.

## Traps

- The wrapper already defines `oklch2rgb`; defining another is a compile error.
- Rotating the crest inside its square tile pushes `tc` past [0,1] at the corners: clamp and extend
  the SDF analytically (`+ length(tc - tcc)`), or the neighbour bleeds in.
- Bash heredocs with apostrophes in comments broke; write via the scratchpad and copy in place.
  Never delete files under `shaders/` — the dev server's watcher crashed on a deleted temp `.frag`.
