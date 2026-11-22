# clit-vibej — Session Journal

(Named after the folder, not `1-cool-moments.md`: "1" is ambiguous across shaders.)

## Status
04:11: the phone is on `clit-vibej/2` (the roller coaster). 1.frag is the fallback.

2026-11-22 03:30 MST. New show. Phone moved in place to `claude/wip/clit-vibej/1` (fork of
clit-set/2). Audio running, fps 90. Subtle moves only.

## Opening audio fingerprint
`energy 0.015 (mean 0.011, max 0.065)`, `bass 0.24 (norm 0.28)`, `mids 0.67 (norm 0.80)`,
`treble 0.07`, `centroid 0.24`, `entropy 0.65`. Mid-dominant, dark, quiet phone mic.

## Cool moments
- **03:38, iter 5 after coil + undulate**: periwinkle-violet lace mass under a coral/orange ribbon arc
  with teal edges, on deep black. The filaments visibly coil and ripple one way. Audio `energy 0.045,
  mids high (0.95 norm), centroid very low (0.02)`. What worked: the traveling waves on a one-way phase
  (1.8 rad/s) plus the output magenta guard, which kept the violet and red clean.
- **03:41, iter 6, jellyfish tendrils (voyage ≈3.7)**: coral-red ring tendrils hanging from a
  periwinkle-lace canopy, teal-edged, over a wide black gap. With the coil and undulate waves they
  ripple like a jellyfish. Audio `energy 0.021, bass 0.48, mids 0.80, centroid 0.32, entropy 0.53`.
  Hot pink 0.065. What worked: domain waves are most legible on long isolated filaments over black;
  in the dense lace mass they read as churn.
- **03:56, iter 13, the vortex (voyage 5.37)**: periwinkle loops spiral into a black-striped tunnel,
  with lace chains (orange/teal beads) running along each loop and coral flares on the left rim. Audio
  `energy 0.026, bass 0.40, mids 0.53, treble 0.48, centroid 0.51, entropy 0.73`. Hot pink 0.02, grey 4%.
  What worked: clean filaments after iter 13, and the coil reading as the loops winding inward.

## Todo

## History of changes
- iter 3 (03:31): hot-pink specks in the dense lace at `bass 0.77, bZ 0.9, cs_thump 0.99, mids 0.72,
  centroid 0.32`. Cause: the beat hue rotation crossing into the magenta arc, amplified by iter 1's
  mids chroma lift. Fix: clamp the rotated OKLab hue at the arc edge. Don't remove that guard.

- iter 13 (03:54): iters 10 and 11 dotted thread cores dark (fwidth of an unclamped log trap). Clamp
  to the transition band before any fwidth gate on the orbit-trap logs.

## Forks
- `clit-vibej/2 ← clit-vibej/1` (04:11, after iter 14): the roller coaster. Aaron: "It's been pretty samey for a while. Give me a 'roller coaster' view going down the fractal tube". A log-polar tube with one-way travel, roll and curve, plus rails and ties. moveStyle → dramatic for this move.
- `clit-vibej/1 ← clit-set/2` (2026-11-22, 0de6d953): fork for the live /vibej show.

## Design hypotheses for v(next)
- On a 408 px phone canvas the dense orbit-trap lace averages to chalky grey. Gate lace by its own
  fwidth at every depth, not only at deep zoom. Bass thickening and the coil both feed the speckle.
- Hard colour rules belong at the output, not per term. Any motion plus trails blends neighbouring
  hues, so a palette that avoids magenta per term still makes magenta once things move.
- "Undulate and coil" without sway means traveling waves on a one-way phase: a barber-pole twist in the
  iteration plus crossed domain waves. Audio sets only the phase rate.
