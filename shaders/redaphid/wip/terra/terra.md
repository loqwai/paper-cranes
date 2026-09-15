# Terra

An **infinite, non-repeating world** — built the way Minecraft generates terrain: from hash-based
noise, *not* a periodic fold. This is the answer to the "breaking tiling" problem that the
mirror-fold lattice shaders couldn't solve (see
[advanced-shader-techniques.md §7](../../../../docs/advanced-shader-techniques.md)): a kaleidoscope
always repeats when you zoom out; noise never does.

## How it works

- **Geometry = Worley/Voronoi cells.** Each grid cell gets one hash-jittered feature point. The
  cell map is therefore non-periodic — roaming always reveals new shapes. 3×3 neighbour search gives
  `f1` (distance to nearest point) and `f2` (second nearest); `f2 - f1` is small at borders → glowing
  seams.
- **Character = low-frequency FBM "biome" field.** Two FBM samples drive (a) the **palette zone**
  (which part of the hue wheel a region sits in) and (b) **cell density** (some regions are
  fine-grained, others coarse). So panning crosses distinct "biomes."
- **Color = oklch**, hue from per-cell hash + biome zone + melody + device seed.

## Per-device uniqueness

`seedOff = vec2(seed, seed2) * 8.0` offsets each device into its own region of the infinite world —
every phone sees a different terrain. (Kept modest, not ×53, for float precision — see below.)

## The precision gotcha (why it first looked like streaks)

The first build used the classic `fract(sin(dot(p, k)) * 43758.5)` hash. Combined with the per-device
offset × cell density, world coords reached the **thousands**, where `sin(huge)` aliases — the
Voronoi collapsed into diagonal **streaky bands** instead of cells (Minecraft's "Far Lands", but
immediate). Fix: **Dave Hoskins multiply-based hashes** (well-distributed across the roaming range) +
a smaller per-device offset. Like real Minecraft, 32-bit float still limits how *far* you can pan
before noise degrades — fine for normal roaming, not literally infinite.

## Audio (iris/1 discipline)

Smooth springs + `quietGate`, life in **light not geometry motion** (cells hold still):

- `melodyFlow` → slow hue drift across regions
- `energySpring` / `waveletBassSpring` → brightness swell + bass bloom
- `waveletBand5Spring` / `spectralCrestSmooth` → border fatten + point sparkle (treble/articulation)

## Navigation

`controller=lattice-nav` (structure-agnostic — terra reuses it): drag to roam (`navX/navY` from drag
deltas, momentum), pinch to zoom (`navZoom`), `knob_1` = pan speed, permanent palette mutation on big
drops (`paletteShift`).

## Iterations

- **1.frag** — first build of the series. Voronoi cells + FBM biomes, oklch, lattice-nav, per-device
  seeds, music reactivity. (Initial streaky-bands bug fixed via the hash swap above before first
  commit.)
