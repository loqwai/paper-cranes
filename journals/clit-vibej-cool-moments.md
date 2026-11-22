# clit-vibej — Session Journal

(Named after the folder, not `1-cool-moments.md`: "1" is ambiguous across shaders.)

## Status
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

## Todo

## History of changes
- iter 3 (03:31): hot-pink specks in the dense lace at `bass 0.77, bZ 0.9, cs_thump 0.99, mids 0.72,
  centroid 0.32`. Cause: the beat hue rotation crossing into the magenta arc, amplified by iter 1's
  mids chroma lift. Fix: clamp the rotated OKLab hue at the arc edge. Don't remove that guard.

## Forks
- `clit-vibej/1 ← clit-set/2` (2026-11-22, 0de6d953): fork for the live /vibej show.

## Design hypotheses for v(next)
- Hard colour rules belong at the output, not per term. Any motion plus trails blends neighbouring
  hues, so a palette that avoids magenta per term still makes magenta once things move.
- "Undulate and coil" without sway means traveling waves on a one-way phase: a barber-pole twist in the
  iteration plus crossed domain waves. Audio sets only the phase rate.
