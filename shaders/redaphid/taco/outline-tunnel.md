# taco outline tunnel

## Origin

Forked from `taco-kandi/8` on **2026-05-09** during /vibej run iter 53 while *Give Me Anything — John Summit, Elderbrook* was playing. User: "I want to feel like I'm going through a 'tunnel' of the outline of the taco over time, having the outline forming a tunnel the camera is always going down."

## Iter 54 move: OUTLINE TUNNEL

Adapts the iter-46 OUTLINE_RADIATION form into a multi-depth z-tunnel:
- Several scaled copies of the outline at z=0..N, each rendered at its outline-distance ring
- The "depth" parameter scrolls over time — bands appear at the FAR end of the tunnel and grow toward the camera
- Brightness gradient: distant rings dim, near rings bright
- Audio modulates camera speed (bass_smooth + drop_glow accelerate)

## Inherited from /8 (iter 53)

- Strengthened ink contrast guard (95% pull-to-near-black + 4-tap halo) so the logo reads through any chaos
- Region-aware composite: SHELL=wooli-fractal, FILLING=plasma raymarch
- All flash sources removed; magenta path mathematically blocked
- Beat_pulse-driven zoom pulse for reliable beat-zoom on quiet tracks

## Baked knob values (at fork)

| knob | value | effect |
|---|---|---|
| knob_1 | 0.197 | SHAPE_TWIST |
| knob_2 | 0.126 | COLOR_SPIN |
| knob_3 | 0.016 | FRACTAL_DENSITY low |
| knob_4 | 0.803 | OUTLINE_GLOW high |
| knob_5 | 0.772 | RADIATION_RATE+palette mid-high |
| knob_6 | 0.465 | KALEIDOSCOPE mid |
| knob_7 | 0.409 | ZOOM mid |
| knob_8 | 1.0 | VJ_FRY MAX |
| knob_9 | 0.071 | FRINGE almost off |
| knob_10 | 0.394 | LENS_STRENGTH |
| knob_11 | 1.0 | DRIFT_SPEED max |
| knob_12 | 1.0 | PHOTON_RING_RADIUS max |
| knob_13 | 0.543 | JULIA c-radius |
| knob_14 | 0.402 | JULIA WARP |
| knob_15 | 0.62 | (drip disabled) |
| knob_16 | 0.205 | LOGO_ECHO low |

## Preset URL

```
http://localhost:6969/jam.html?shader=redaphid/taco/outline-tunnel&image=images/taco.png&controller=taco-kandi
```

## Controller

`controllers/taco-kandi.js` — latching beat_pulse + EMA bass_smooth + sustained drop_glow.

## Why this fork

User asked for a tunnel-of-outline-bands feel. Forking before adding this dramatic new motif — if it doesn't land, /8 is the user-approved baseline.
