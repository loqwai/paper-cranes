# magic-peach

A pink/magenta event-horizon disk with warm peach/orange accretion glow, captured 2026-05-02 during a /vibej run on *PressureGENESI – Laherte*.

The disk reads as a hot core radiating outward through soft fold structure, with the photon ring sitting wide near the edge. Bass kicks pulse the ring outward. The fractal evolves over ~25-90 second aperiodic cycles. The composition sits dead-center regardless of viewport aspect.

## What it is, technically

Started life as the canonical [Ether by nimitz](https://www.shadertoy.com/view/MsjSW3). Repurposed in 14 iterations of live-VJ:

- The swirling raymarched plasma → the **accretion disk**
- New layers added on top: aspect-aware UV center, gravitational lensing (twist-enveloped), 3-layer radial composition (hot core / photon ring / outer void fade), oklch color space, autonomous SHAPE_DRIFT, evolving fractal with per-axis phase drift inside `map()`
- Color path migrated from HSL to oklch (perceptually uniform) — orange↔blue gradient reads smoothly without HSL's greenish midpoint
- Three clipping artifacts diagnosed and fixed by screenshot-debug rather than guessing: dark annular band (inverted smoothstep), angular wedge (SDF wander + extreme central twist), interior black voids (multiplicative dark-compounding across raymarch iterations)

## Audio mappings

| Signal | Effect |
|---|---|
| `bassZScore` | BASS_PUMP (SDF density), HORIZON_POWER, RING_PULSE |
| `energyZScore` | T_ADVANCE (time speed), SAT_BOOST, DROP_FLARE, HORIZON_POWER |
| `energyNormalized` | LENS_STRENGTH (audio adds on top of knob) |
| `spectralCentroid` | hue rotation around the color circle |
| `spectralRoughnessZScore` | T_ADVANCE |
| `trebleZScore` | T_ADVANCE |
| `pitchClassZScore` | PITCH_FLASH (hue flash on melodic jumps) |
| `midsNormalized` | L_LIFT (gentle warmth) |
| `CALM_WARM` corner gate | BREATH (0.4Hz pump) + warm hue tint |

## Knob preset (baked at fork moment)

| Knob | Value | Controls |
|---|---|---|
| knob_1 | 1.000 | SHAPE_TWIST (rotation rate) |
| knob_2 | 0.000 | COLOR_SPIN (time-based hue rotation) |
| knob_3 | 0.441 | FRACTAL_DENSITY (sin-fold packing) |
| knob_4 | 0.567 | WARM_DEPTH (darken w/ warm tilt) |
| knob_5 | 0.268 | THEME_ROT (manual hue offset) |
| knob_7 | 1.000 | WAVE_STRENGTH (fold amplitude) |
| knob_8 | 0.150 | SOFTNESS (SDF log falloff) |
| knob_9 | 0.173 | FRAC_EVO_RATE (fractal evolution speed) |
| knob_10 | 0.346 | LENS_STRENGTH (gravitational pull baseline) |
| knob_11 | 1.000 | DRIFT_SPEED (autonomous shape rotation rate) |
| knob_12 | 1.000 | PHOTON_RING_RADIUS |
| knob_14 | 0.835 | BRIGHT_LIFT (additive brightness) |
| knob_16 | 0.480 | VOID_INNER (where outer fade begins) |

## Preset URL

```
http://localhost:6969/jam.html?shader=claude/wip/magic-peach/magic-peach&fullscreen=true&knob_1=1&knob_2=0&knob_3=0.441&knob_4=0.567&knob_5=0.268&knob_7=1&knob_8=0.15&knob_9=0.173&knob_10=0.346&knob_11=1&knob_12=1&knob_14=0.835&knob_16=0.48
```

## See also

- `journals/plasma-cool-moments.md` — iter 1-10 of the journey on canonical plasma.frag
- `journals/plasma-event-horizon-1-cool-moments.md` — iter 11-14, the bug fixes and aesthetic lockdown
- `journals/magic-peach-cool-moments.md` — celebratory recap of what worked
