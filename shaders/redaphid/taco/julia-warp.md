# taco julia warp

## Origin

Forked from `taco-kandi/2` on **2026-05-09** mid-`/vibej` run (iter 27) while *Stay With Me — John Summit, Of The Trees* was playing. Captures the **Julia-warped feedback** experiment that just landed (replacing the chaos halo).

## Inherited features (from taco-kandi/2, iters 17-27)

Logo-aware composition for the taco branded VJ set:

**From taco-kandi/1 (foundation, iters 1-17):**
- Plasma raymarched accretion disk (from `shaders/plasma.frag`) inside taco silhouette
- Event horizon: core glow + photon ring (knob_12) + lens envelope (knob_10)
- Coat-25 chrome rim, INNER GLOW, TIME-ECHO, VJ FRY (knob_8)
- Smoothing pass: `taco-kandi.js` controller — latched `beat_pulse`, EMA `bass_smooth`, `drop_glow`
- Coat-style cubic ease-in zoom (smoothstep^3 over INTENSITY)
- Heart pulse, warm hearth, calm 0.4Hz breath, sigil swirl, fractal fur fibers
- Reinhard tonemap, oklch palette path
- knob_5=palette pick, knob_7=zoom, knob_9=fringe thickness, knob_11=drift speed
- Drip on knob_15

**From taco-kandi/2 (iters 18-27):**
- Iter 18: Kaleidoscope seam fix (atan + π for [0, TAU] continuity, even fold count)
- Iter 19: Heart pulse port from coat-23
- Iter 20: Fringe edge perturbation (FBM mask sample wiggle, capped 25% for logo recognition)
- Iter 21: knob_9 → fringe thickness (capped after user flag)
- Iter 22: knob_12 → PHOTON_RING_RADIUS (plasma iter-9 wiring)
- Iter 23: SPACE/NEBULA OKLCH palette (kill the rainbow — anchored CORE_HUE/CORONA_HUE)
- Iter 24: Wooli-2 outline edge glow
- Iter 25: **Logo-shaped feedback echo** (sample getLastFrame at point pulled toward center)
- Iter 26: Prismatic R/G/B edge split (coat-25 PRISM)
- Iter 27: **Julia-warped feedback** (moody-octopus2 technique — replaces chaos halo)

## Baked knob values (live state at fork time)

| knob | value | effect |
|---|---|---|
| knob_1 | 0.858 | SHAPE_TWIST (plasma swirl rate) |
| knob_2 | 0.386 | COLOR_SPIN (anchored, small drift only) |
| knob_3 | 0.882 | FRACTAL_DENSITY (rich folds) |
| knob_4 | 0 | RIM_GLOW (off — chrome rim minimal) |
| knob_5 | 0.74 | PALETTE FREEZE (locked ~3/4 toward nebula family) |
| knob_6 | 0.37 | KALEIDOSCOPE FOLD (mid — 5-fold mirror) |
| knob_7 | 0.165 | ZOOM (wide-ish — taco fills frame nicely) |
| knob_8 | 0.976 | VJ FRY (near-max — hypersaturated finale signature) |
| knob_9 | 0.772 | FRINGE thickness (high but capped) |
| knob_10 | 0 | LENS_STRENGTH (off — clean plasma disk) |
| knob_11 | 0.488 | DRIFT_SPEED (baseline) |
| knob_12 | 0.866 | PHOTON_RING_RADIUS (wide ring near edge) |
| knob_13 | 0.362 | (free — unwired, set value) |
| knob_14 | 0.803 | **JULIA WARP intensity** (high — fractal tendrils prominent) |
| knob_15 | 0.583 | DRIP intensity (moderate) |
| knob_16 | 0.228 | LOGO ECHO intensity (mild — subtle outline echo) |

## Preset URL

```
http://localhost:6969/jam.html?shader=redaphid/taco/julia-warp&image=images/taco.png&controller=taco-kandi
```

## Controller

`controllers/taco-kandi.js` — latching beat_pulse + EMA bass_smooth + sustained drop_glow.

## Why this fork

Iter 27's Julia-warped feedback (moody-octopus2 technique) just landed and read very well. Forking to lock in this composition state as a checkpoint — Julia warp + logo echo + outline glow + prism + warm hearth + heart pulse all coexisting cleanly. Future iters can experiment without losing this baseline.

## Long-form set context

This is for a multi-hour branded VJ set tomorrow for taco (the taco IS the company logo). Logo recognition is sacred — every effect must enhance, never obscure, the silhouette.
