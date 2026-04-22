# the-coat-8

Forked from `the-coat-7.frag` at `/vj` iter 45. Confetti block removed.

## Changes vs the-coat-7

- **Removed** `VJ CONFETTI` block (falling spinning pitch-colored squares, gated `treble > 0.35 AND entropy > 0.5`). User request mid-session.

## Known issue carried over from the-coat-7

**Mercury-flow diamond lattice** on the coat — the `VJ MERCURY FLOW` block creates a diamond-cell pattern from `sin(uv.x * 18 + sin(uv.y * 4 + flow_t) * 2.5 - flow_t * 2)` that scrolls fast during bass-heavy low-centroid phases. Coat-silhouette-gated, so always visible when the gate fires. Next fix.

## Baked knob state at fork time

| Knob | Value | Role |
|---|---|---|
| knob_1 | 0 | zoom (wide) |
| knob_2 | 0.85 | nebula fog density |
| knob_3 | 1.0 | god rays (max) |
| knob_4 | 0.362 | eye wash |
| knob_5 | 0.622 | drop zoom |
| knob_7 | 1 | fur thickness |

## Preset URL

`?shader=redaphid/wip/the-coat-fur-coat/the-coat-8&controller=the-coat&knob_1=0&knob_2=0.85&knob_3=1&knob_4=0.362&knob_5=0.622&knob_6=0&knob_7=1&knob_8=0&knob_9=0&knob_10=0&knob_11=0`

## Music during fork

*Watch Me – Scorsi*.
