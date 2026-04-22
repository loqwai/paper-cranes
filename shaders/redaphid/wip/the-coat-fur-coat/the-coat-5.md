# the-coat-5

Forked from `the-coat-3.frag` during a `/vj` live session (dramatic-mode run, iteration ~35).

## Why

User didn't like the RGB-split chromatic aberration reading as a "checkerboard" on the coat. Forked to preserve the rest of the dramatic-mode evolution (black hole, aurora, rotor gear, mercury flow, ground quake, volumetric beams, crystalline facets, cosmic shockwave, time-echo, water pool, scan line, sub-ring, heart pulse, fur shimmer) without the RGB split layer.

## What changed vs the-coat-3

- **Removed** the `VJ RGB SPLIT` block (was `if (aber > 0.0005) col = mix(col, rgb-offset, 0.55)` on roughness × entropy). That was producing the chromatic checkerboard on the silhouette.

## Baked knob state at fork time

| Knob | Value | Role |
|---|---|---|
| knob_1 | 0.291 | zoom (0=wide, 1=tight) |
| knob_2 | 0.646 | nebula fog density |
| knob_3 | 0.953 | god ray intensity override |
| knob_4 | 0.764 | eye wash override |
| knob_5 | 0.457 | drop zoom override |
| knob_6 | 0 | camera tilt swagger (off) |
| knob_7 | 1 | fur thickness |
| knob_8 | 0 | unwired |
| knob_9 | 0 | feedback/trails (crisp) |
| knob_10 | 0 | unwired |
| knob_11 | 0 | unwired |

## Preset URL

`?shader=redaphid/wip/the-coat-fur-coat/the-coat-5&controller=the-coat&knob_1=0.291&knob_2=0.646&knob_3=0.953&knob_4=0.764&knob_5=0.457&knob_6=0&knob_7=1&knob_8=0&knob_9=0&knob_10=0&knob_11=0`

## Controller

`controllers/the-coat.js` — drop-sustain with exponential decay.
