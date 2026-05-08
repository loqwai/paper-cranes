# plasma-event-horizon

Event-horizon aesthetic forked from canonical `shaders/plasma.frag` (Ether by nimitz, 2014). Built up live across a 10-iteration `/vibej` run on 2026-05-02 during *PressureGENESI – Laherte*.

## Concept

The original Ether plasma is a swirling raymarched logarithmic SDF with sin-fold noise — it's all texture, no composition. This fork repurposes the swirl as the **accretion disk** of a black hole and adds explicit radial structure on top:

- **Aspect-aware centered UV** so the singularity sits dead-center
- **Gravitational lensing** that warps space inward + frame-dragging twist
- **3-layer radial composition**: hot core glow + photon ring at adjustable radius + outer void fade
- **oklch color space** for perceptually-uniform hue gradients (orange CORE_HUE → blue CORONA_HUE)
- **HORIZON_POWER** pumped by bass-Z and energy-Z so kicks read as gravitational shockwaves
- **Autonomous SHAPE_DRIFT** (coprime sub-Hz oscillators) so the disk morphs even with knobs static

## Audio mappings

| Feature | Drives | Why |
|---|---|---|
| `bassZScore` | BASS_PUMP (SDF density), HORIZON_POWER, RING_PULSE | Kicks = gravitational shockwaves rocking the singularity |
| `energyZScore` | T_ADVANCE, SAT_BOOST, DROP_FLARE, HORIZON_POWER | Rising energy pumps photon ring + saturates colors |
| `energyNormalized` | LENS_STRENGTH | Loud passages bend space harder |
| `spectralCentroid` | hue rotation | Brightness center maps to hue position |
| `spectralRoughnessZScore` | T_ADVANCE | Dissonant passages push time forward |
| `trebleZScore` | T_ADVANCE | Trebly transients accelerate disk swirl |
| `pitchClassZScore` | PITCH_FLASH | Big melodic jumps flash hue |
| `midsNormalized` | L_LIFT | Mids body adds gentle warmth |
| `CALM_WARM` gate | BREATH (0.4Hz pump), warm hue tint | Mid-dominant + dark-centroid + low-energy = warm-bass corner |

## Baked knob preset (from iter 10 fork moment)

| Knob | Value | Controls |
|---|---|---|
| knob_1 | 0.000 | SHAPE_TWIST (rotation rate) — frozen |
| knob_2 | 0.354 | COLOR_SPIN (time-based hue rotation) |
| knob_3 | 0.512 | FRACTAL_DENSITY (sin-fold packing) |
| knob_4 | 0.756 | WARM_DEPTH (darken w/ warm tilt) |
| knob_5 | 0.409 | THEME_ROT (manual hue offset) |
| knob_7 | 0.323 | WAVE_STRENGTH (fold amplitude) |
| knob_8 | 0.433 | SOFTNESS (SDF log falloff) |
| knob_10 | 0.441 | LENS_STRENGTH (gravitational pull baseline) |
| knob_11 | 0.969 | DRIFT_SPEED (autonomous shape evolution rate) |
| knob_12 | 0.465 | PHOTON_RING_RADIUS (where the bright ring sits) |
| knob_14 | 0.370 | BRIGHT_LIFT (additive brightness) |
| knob_16 | 0.929 | VOID_DARKNESS (outer fade cutoff sharpness) |

## Preset URL

```
http://localhost:6969/jam.html?shader=redaphid/wip/plasma-event-horizon/1&fullscreen=true&knob_1=0&knob_2=0.354&knob_3=0.512&knob_4=0.756&knob_5=0.409&knob_6=0.449&knob_7=0.323&knob_8=0.433&knob_9=0.173&knob_10=0.441&knob_11=0.969&knob_12=0.465&knob_13=0.394&knob_14=0.37&knob_15=0.535&knob_16=0.929&knob_21=0.402
```

## Iteration history (preserved from canonical fork)

- **Iter 1** — #define scaffolding (T_ADVANCE, SAT_BOOST, L_LIFT)
- **Iter 2** — BASS_PUMP density thickening + k5 → THEME_ROT (auto-wire)
- **Iter 3** — CALM_WARM gate + 0.4Hz BREATH + k4 → WARM_DEPTH
- **Iter 4** — Shape evolution bank: k1 SHAPE_TWIST, k3 FRACTAL_DENSITY, k7 WAVE_STRENGTH, k8 SOFTNESS + autonomous SHAPE_DRIFT (coprime sub-Hz oscillators) + PITCH_FLASH
- **Iter 5** — Triple auto-wire: k2 → COLOR_SPIN, k11 → DRIFT_SPEED, k14 → BRIGHT_LIFT
- **Iter 6** — **Aesthetic pivot to event-horizon**: aspect-aware center, gravitational lensing, 3-layer radial structure, CORE/CORONA hue zones, additive radial bloom, `@fullscreen: true` metadata
- **Iter 7** — k10 → LENS_STRENGTH (auto-wire) + DROP_FLARE on rising energy
- **Iter 8** — Color path migrated HSL → **oklch** (perceptually uniform), CORE_HUE 0.6 rad / CORONA_HUE 4.2 rad
- **Iter 9** — k12 → PHOTON_RING_RADIUS (auto-wire, biggest user gesture) + RING_PULSE on bass
- **Iter 10** — k16 → VOID_DARKNESS (auto-wire) — outer-fade cutoff sharpness

## Forks
- `plasma-event-horizon/1.frag ← canonical shaders/plasma.frag` (iter 10, 2026-05-02): event-horizon variant separated from canonical to give the experiment room to evolve without affecting the original.

## Notes

The user explicitly asked for "event horizon of a black hole, powerful, radiating from the center" at iter 6, then "use oklab" at iter 8. The user actively tuned knobs across all 10 ticks — the journal at `journals/plasma-cool-moments.md` records each wiggle pattern and the auto-wire decisions made in response.

This fork preserves all 12 knob mappings but lets future `/vibej` runs against `plasma-event-horizon/2.frag`, `3.frag`, etc. evolve the aesthetic without disturbing `plasma.frag`.
