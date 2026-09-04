# satellites.frag — hero bead + satellites (from lattice-bead/hero.frag, 2026-09-04)

Discrete instances: one hero centred, 4–9 satellites on a monotonic orbit. Needs
`?controller=dodeca-bloom` (no iTime in the file; every phase is a controller accumulator).

## Run
```
?shader=redaphid/wip/lattice-bead-vj/satellites&controller=dodeca-bloom&image=images/beads/mon-tomoe.png&satellites=6&wavelet=true&onset_refractory_ms=380
```
`satellites=` 4–6 is the useful range (0 means unset → 6). `heroScale=` (default 0.20), `bgAmount=`.

## What changed vs hero.frag
1. **THE FLASH FIX** (HANDOFF-substrate2 §3). The rim halo was a symmetric `aa*9` band with punch
   up to 4.2× → the fast channels repainted **53%** of the frame. Now: `aa*3` band, the part
   outside the silhouette referenced to coverage (`mix(0.30, 1.0, cov)`), punch max 1.7, and a
   coverage-masked interior lift so the beads still answer the kick.
   Measured with `scripts/lab/satellites-deaf.mjs` (560², pinned pose, noise floor 0.00%):
   fast footprint **19.9%** vs bead coverage **18.0%** (ratio 1.11), outer radial bands 1/0/0/0 %;
   slow phases 10.6%. Reactivity kept: centre lum 57.7→84.6, contrast 21.9→36.2 on a drop.
2. **Made of the bead**: inset copies of each crest's own outline inside (spacing 1.15 r → a
   star within the star), and the hero's outline ripples outward into the ground on `flow_phase`
   (monotonic, slow channels only) so the field is patterned by the bead and drifts one way.
3. **One palette family**: base hue = `hue_phase` + key median (`pitchClassMedian`) + centroid
   median; satellites within ±0.14 of the base, hero at the base. Outline is the brightest thing,
   L ≤ 0.80, never white.
4. **Portrait fit**: the whole group scales by `min(1, halfWidth/0.47)` so nothing crops or
   overlaps on a phone; uniform scale, so the outline aspect ratio is untouched (verified 1200×900
   vs 900×1200).
5. Stale `heroScale` comment fixed (0.20).

Channel discipline unchanged: every rotation on `spin_angle`, geometry on slow envelopes only
(capped), fast channels only inside `drawBead` and masked by coverage/contour.

## Scripts
- `scripts/lab/satellites-deaf.mjs` — background-deafness + coverage + reactivity (run from repo root).
- `scripts/lab/satellites-shot.mjs <prefix> [frames] [gapMs] [mon] [extraQuery]` — headless frames with the controller running.
