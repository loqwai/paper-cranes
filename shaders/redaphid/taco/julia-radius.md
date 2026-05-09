# taco julia radius

## Origin

Forked from `taco-kandi/3` on **2026-05-09** mid-`/vibej` run (iter 29) while *comedown — John Summit* was playing. Captures state after the **knob_13 → JULIA c-radius wiring** + **Julia banding fix** landed. Both feedback effects (logo echo + Julia warp) are now banding-free.

## Inherited features (from taco-kandi/3, iters 27-29)

Logo-aware composition for the taco branded VJ set, with Julia-warped feedback as the killer move:

**Active effects:**
- **Julia-warped feedback** (knob_14, c-radius via knob_13) — moody-octopus2 technique. Each exterior pixel iterates `z² + c` 4 steps. knob_13 picks fractal family: 0=compact, 0.5=classic, 1=spreading filaments. Banding-free additive blend (no per-frame hue rotation).
- **Logo-shaped echo** (knob_16) — sample getLastFrameColor at point pulled toward taco_center; FBM-jittered for smooth ring transitions; banding-free additive blend.
- **Prismatic R/G/B edge split** — coat-25 PRISM, three offset edge-glow samples (warm right / cool left).
- **Wooli-style outline edge glow** (tight) — single-radius halo right at silhouette boundary.
- **Inner glow + Time-echo + VJ FRY (knob_8) + Fringe (knob_9, capped for logo recognition)** — coat-25 finale ports.
- **Heart pulse, Warm hearth, Calm 0.4Hz breath, Sigil swirl, Fractal fur fibers** — coat-23 ports.
- **Plasma raymarched accretion disk** with event horizon radial structure (knob_10 lens, knob_12 photon ring).
- **Auto-cycling palette modes** with knob_5 freeze + space/nebula oklch palette anchored.

## Baked knob values (live state at fork time)

| knob | value | effect |
|---|---|---|
| knob_1 | 1.000 | SHAPE_TWIST max (fast plasma swirl) |
| knob_2 | 0.047 | COLOR_SPIN ~off (palette stable) |
| knob_3 | 0.732 | FRACTAL_DENSITY (rich folds) |
| knob_4 | 0.252 | RIM_GLOW low |
| knob_5 | 0.717 | PALETTE FREEZE (locked ~3/4 toward nebula family) |
| knob_6 | 0.134 | KALEIDOSCOPE FOLD off-ish |
| knob_7 | 0.323 | ZOOM (mid-wide) |
| knob_8 | 0.126 | VJ FRY low (subtle hypersaturation) |
| knob_9 | 0 | FRINGE thickness OFF (clean outline) |
| knob_10 | 0.110 | LENS_STRENGTH low |
| knob_11 | 1.000 | DRIFT_SPEED MAX (faster shape evolution) |
| knob_12 | 0.465 | PHOTON_RING_RADIUS (just below default) |
| knob_13 | **0.598** | **JULIA c-RADIUS** (~0.79 — slightly wider than classic moody-octopus) |
| knob_14 | 1.000 | JULIA WARP intensity MAX |
| knob_15 | 1.000 | DRIP MAX |
| knob_16 | 0.520 | LOGO ECHO intensity (mid) |

## Preset URL

```
http://localhost:6969/jam.html?shader=redaphid/taco/julia-radius&image=images/taco.png&controller=taco-kandi
```

## Controller

`controllers/taco-kandi.js` — latching beat_pulse + EMA bass_smooth + sustained drop_glow.

## Why this fork

After iter 28's logo-echo banding fix and iter 29's Julia banding fix + knob_13 wiring, both feedback effects are fully clean. This is the "everything banding-free" checkpoint. The composition reads as cosmic plasma logo with organic Julia tendrils + smooth logo echoes — no hard ring artifacts. Forking now to lock this state in for the live set.

## Long-form set context

Branded VJ set tomorrow for taco (taco logo). Logo recognition is sacred. Multi-hour duration — auto-corner-gated effects (warm hearth, heart pulse, calm breath) ensure the shader self-adapts to musical character changes without manual intervention.
