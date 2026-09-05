# spiral-chroma.frag — the spiral of beads for ChromaDepth glasses (2026-09-04)

`spiral.frag`'s geometry untouched (log spiral, births at the hero rim, chirality, dust ribbon, drop ripple,
surge on `hue_phase`); colour replaced by the ChromaDepth discipline: hue = depth, music = exposure,
front-most compositing, L ≤ 0.55.

## Run
```
?shader=redaphid/wip/lattice-bead-vj/spiral-chroma&image=images/beads/mon-tomoe.png&controller=dodeca-bloom&arms=2&beads=20&turns=1.6&wavelet=true
```

## The depth is the spiral
A bead's place on the path (t = 0 born at the hero, 1 at the rim) is its distance from you.
- `?cdmode=0` **TUNNEL (default)** — the hero is the vanishing point (violet, 0.94; its rim 0.91). Beads are
  born far (0.88, blue), spiral toward you growing (sizeExp 0.6, as before) and warm through green and yellow
  to **red by t = 0.80** — exactly where `spiral.frag`'s rim fade begins, so they arrive red and fade out red.
  The drop ripple runs down the arms toward you and arrives red.
- `?cdmode=1` **FOUNTAIN** — hero nearest (red), beads recede to violet and shrink (sizeExp −0.40) so
  perspective agrees with colour.
- The dust ribbon is painted at the depth of the path it traces; the ground is violet (0.95) and dim.
- The birth/rim fade is an **exposure** fade; coverage only fades in its last third, when the bead is already
  dark — so the `fract()` wrap never averages red into violet (the "no averaging" rule).
- Per-bead hue offsets are gone (they rotated hue); each bead has its own exposure (0.85–1.0) instead.
- Beat pop: `bass_pump`, a newborn's `drop_glow` flare and the ripple crossing pull a bead toward you, clamped.

## Measured (`cd-measure.mjs`, 384², tomoe, 2 arms)
Spearman ρ(depth, hue) **0.998**; mean hue error 0.0009; near-white **0.000%**; lum 46, dark 25%, bright 30%.
Depth-band coverage after the t = 0.80 fix: red 3.5% (was 0.6%), violet 62%.
Reactivity (`react-stat.mjs`): the centre is the dark vanishing point by design, so the harness's centre metric
does not apply; the beat lives on the bead contours (rim punch 0.59 → 1.0) and the drop ripple.
