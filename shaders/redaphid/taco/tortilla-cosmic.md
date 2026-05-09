# taco tortilla cosmic

## Origin

Forked from `taco-kandi/8` on **2026-05-09** during /vibej run iter 57 while *Tanglewood — Of The Trees* was playing. Captures the "tortilla-cosmic landed" cool moment as a clean baseline. /9 (with OUTLINE_TUNNEL experiment) stays alive as a parallel branch.

## What's new in /10

- **knob_12 audio-reactive** — was static `mix(0.012, 0.045, knob_12)` for outline photon ring radius. Now: bass_smooth modulates ring radius outward on bass kicks (bigger ring on heavy bass), drop_glow widens it sustained on drops.
- All iter 57 wins inherited: shellFractal reacts to spectralKurtosis/Skew/Crest/pitchMean (fresh features), exclusive R−G region tagging, 3-tier ink halo, in-shader z-score multi-signal kick detector, no-magenta locked palette, beat_kick controller signal ready.

## Baked knob values (at fork)

| knob | value | effect |
|---|---|---|
| knob_1 | 0.976 | SHAPE_TWIST near-max |
| knob_2 | 0.472 | COLOR_SPIN mid |
| knob_3 | 0.409 | FRACTAL_DENSITY mid |
| knob_4 | 0.157 | OUTLINE_GLOW low |
| knob_5 | 1.0 | RADIATION_RATE+palette MAX |
| knob_6 | 0 | KALEIDOSCOPE off |
| knob_7 | 0.173 | ZOOM low |
| knob_8 | 1.0 | VJ_FRY MAX |
| knob_9 | 0.071 | FRINGE almost off |
| knob_10 | 0 | LENS_STRENGTH off |
| knob_11 | 0 | DRIFT_SPEED off (frozen plasma) |
| knob_12 | 0.472 | PHOTON_RING_RADIUS mid (now audio-reactive) |
| knob_13 | 0.953 | JULIA c-radius near-max |
| knob_14 | 0.339 | JULIA WARP |
| knob_15 | 0.803 | (drip disabled) |
| knob_16 | 0.457 | LOGO_ECHO mid |

## Preset URL

```
http://localhost:6969/jam.html?shader=redaphid/taco/tortilla-cosmic&image=images/taco.png&controller=taco-kandi
```

## Why this fork

User: "Also whatever knob_12 is doing should be audio reactive". Forking from the post-iter-57 baseline (Tanglewood cool moment) so the knob_12 audio rewiring lands on a clean known-good composition.
