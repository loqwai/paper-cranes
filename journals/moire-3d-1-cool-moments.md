# moire-3d-1 — Session Journal

## Status
Iter 1 — first audio coupling landed. Base = ChunderFPV "Moire 3d template" fork (hex-grid sphere raymarch, time-driven rainbow hue + camera dolly). Track: Carbon Based Lifeforms "Betula Pendula" (ambient psybient). moveStyle subtle.

## Cool moments
_(none yet)_

## Todo
_(none yet)_

## History of changes
- Iter 0: imported raw ShaderToy fork as `moire-3d-1.frag`. Macros: `A`=rotate, `O`=oscillate, `H`=hue. Sphere pulse `sin(nt*6.2832)`, hue `H(nt)`, camera dolly `O(t/2,80,110)`.
- Iter 1: bass-coupled the sphere z-pulse depth — `sin(nt*6.2832) * (1. + bassNormalized*0.6)`. Spheres now breathe deeper on bass swells. Audio at time: bass 0.65, centroid 0.13, treble 0.07, beat false (calm ambient). Subtle, can't blow out (amplitude only).

## Forks
- `moire-3d-1 ← shadertoy.com/view/lc3SWN` (ChunderFPV "Moire 3d template").
- `moire-eye-1 → moire-3d-1` (iter 1): moire-3d-1 fused with iris-7 anatomy to make an eye; /vibej run swapped onto moire-eye-1.

## Design hypotheses for v(next)
- Slow ambient → couple to slow signals (energyMean, bass swells, pitchClass) not jittery flux.
