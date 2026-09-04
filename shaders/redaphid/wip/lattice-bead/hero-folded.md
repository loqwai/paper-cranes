# hero.frag -- H11, THE HERO BEAD

Fork of `2.frag` (wave-2 substrate: stage brightness from `lab/bright` + one-tile
lookup from `lab/whole`). Lab branch `lab/hero`, 2026-09-03.

## SHIP THIS URL

Safest form -- no `wavelet=true`, which HANDOFF §11 records as having black-screened
Chrome, and which this shader does not need (measured meanLum 48.3 without vs 49.6 with):

```
https://visuals.beadfamous.com/?shader=redaphid/wip/lattice-bead/hero&image=images/beads/mon-ume.png&controller=lattice-nav&fullscreen=true&navZoom=0.218&knob_1=0.429&knob_134=0.507
```

Swap `mon-ume` for any of: hakkaku katabami kikko kiku kikyo matsukawa mokko ogi
suhama tomoe ume. Everything else is baked into the shader defaults.

Add `&wavelet=true` for the full wavelet-driven light if you are on a machine you
trust. `&knob_180=1` disables the hero and gives you the plain lattice back.

## What it does, and why it works

Wave 1's terminal finding: `fractal()` mirror-folds the plane and lands the drawn
cell at a CORNER of the folded domain, so ANY function of `p` is 4-fold mirrored.
The lattice can only show the FOLD's symmetry, never the motif's -- so the motif is
unnameable inside it at any size, and the fix looked like rewriting `fractal()`.

**H11 does not rewrite `fractal()`. It changes what the fold is FOR.** The motif is
drawn once, whole, un-folded, in SCREEN space at hero scale. The bead is the subject;
the lattice is its material and its field. `fractal()` is untouched -- every wave-1
win (brightness preset, one-tile lookup, the learned CHURN/WUB mappings) survives.

| Part | What it does |
|---|---|
| **APERTURE** | inside the silhouette the SAME field is magnified (`HERO_LENS`), rotated (`HERO_SPIN`) and shifted (`HERO_SHIFT`), so the bead is a LENS onto the lattice, not a decal. It inherits the perpetual zoom ratchet, so the interior never stops moving. |
| **BEND** | outside, the field is pushed along the hero SDF gradient: the lattice bows AROUND the object. |
| **BEVEL / RIM** | the hero SDF gradient is a surface normal, lit by the same sweeping sun as the lattice -- relief, so it reads as an object with depth. |
| **OUTLINE** | one crisp palette-lit stroke on `|hd| = 0`. This is the signature that survives distance, darkness and a 15% downscale. |
| **QUIET** | the field outside is dimmed + desaturated. Measured: without it the motif is NOT nameable at the 15%-scale dark-field proxy; with it, it is. |
| **SETTLE** | a monotonic one-way ease: on load the bead grows out of the lattice and locks. The NFC-tap moment. |

## Channel hierarchy (lattice-vj HANDOFF §7) is intact

- **Geometry lane** -- `HERO_R`, `HERO_LENS`, `HERO_BEND`, `HERO_SHIFT`, `HERO_SPIN`
  are constants x a MONOTONIC settle. No per-frame audio value ever touches the
  silhouette. A bead that morphs with the kick is the failure fixed four times.
- **Shading lane** -- outline, rim, halo, dome and contact shadow take audio freely.
  The dome multiplier is masked to the interior, so it is local relief, not the
  forbidden global-brightness strobe.

## Two traps this cost, recorded so nobody re-pays them

1. **Do not mix the interior toward a flat colour.** The first version did
   `mix(col, lush(...), heroIn)`, which fills the cell GAPS as well as the lines: the
   bead goes to a dead grey wash and stops being made of lattice. Rebuild the interior
   the way the exterior is built -- lattice over ground, weighted by `alpha` (coverage).
2. **Do not scale `uv` about the screen centre for the lens.** Screen centre is the
   fold's SYMMETRY CENTRE, where every recursion level's ring converges and `lumAcc`
   saturates -- the interior clips chalky white. `HERO_SHIFT` moves the interior sample
   into ordinary lattice and the colour comes back.

## Measured

Controller OFF, seeds pinned `[0.11,0.22,0.33,0.44]`, 900x900, n=3, frameCount 61.

| | meanLum | lit>20 | bright>50 |
|---|---|---|---|
| hero ON (shipped defaults) | 49.60 +- 0.50 | 54.96% +- 0.69 | 26.01% +- 0.20 |
| hero OFF (`knob_180=1`) | 66.62 +- 0.57 | 63.22% +- 1.16 | 50.67% +- 1.01 |
| delta | **-25.5%** | **-8.27 pt** | **-24.66 pt** |

The hero COSTS LIGHT -- that is the price of subject/ground separation and it is
real, not noise. A first pass at `HERO_QUIET=0.25 / HERO_INL=-0.30` cost -43.6%
meanLum; lifting the interior back (`HERO_INL=0`, `HERO_QUIET=0.38`) recovered
+10.8 meanLum at no measurable loss of recognition at 15% scale. That is the
counter-ratchet, applied in the same edit per HANDOFF §7.4.

**Alive, not a logo** (one page load, controller OFF, 2.5 s apart, resampled to a
common size because the dynamic-resolution scaler moves the canvas):
whole frame 60-72% of pixels change, **bead interior 83-90%**. The interior is the
liveliest region of the frame while the silhouette does not move at all -- see
`journals/lab/shots/mo-longexposure.png` (a 10 s average in which the mon is still
crisp) and `mo-motionmap.png` (temporal SD: all the motion is inside the bead).
