# moire-eye-5

Checkpoint fork of `moire-eye-4` — a stable keeper of the **full-frame** composition (iris +
curling fractal tendrils + pupil tunnel) before further experimentation.

## Origin
- Forked from `redaphid/wip/moire-3d/moire-eye-4` on 2026-06-07 during a `/vibej` run (user `/fork`).
- Music at fork time: **Effin — "What's In Your Heart"** (OTT / Tipper / GWN rotation).
- Lineage: `moire-eye-5 ← moire-eye-4 ← moire-eye-3 ← moire-eye-1 ← moire-3d-1 ← shadertoy lc3SWN` × `iris-7`.

## What it is
Identical code to `moire-eye-4` at fork time — a snapshot so the full-frame look is locked while
eye-4 keeps evolving. Carries:
- **Full-frame fractal tendrils** — spiralling radial arms beyond the iris, curl from flux+energy,
  count from spread, two octaves, bass-pulsed, fading to corners.
- **Pupil tunnel** — concentric rings receding inward (`1/er` perspective), bass-deepened.
- **Clean de-noised iris anatomy** — fibres/crypts/furrows/collarette/ruff/limbal.
- **Spectral colour map** — energy→saturation, centroid→hue, crest→sharpness.
- **TREND / Rslopes** — slope×rSquared → pupil dilates on builds, constricts on drops (knob_8).

## Baked knob preset (manualFeatures at fork)
| knob | value | controls |
|------|-------|----------|
| knob_1  | 1.000 | zoom (iris size) |
| knob_2  | 0.433 | hue tint |
| knob_6  | 1.000 | gold-core |
| knob_7  | 1.000 | fibre density |
| knob_8  | 0.433 | TREND amount |
| knob_11 | 0.827 | MASTER REACT |
| knob_13 | 0.000 | anti-flicker (light) |
| knob_14 | 0.488 | pupil size |
| knob_15 | 0.386 | airglow |
| knob_16 | 0.220 | outer glow |

## Preset URL
```
?shader=redaphid/wip/moire-3d/moire-eye-5&remote=display&fullscreen=true&knob_1=1&knob_2=0.433&knob_6=1&knob_7=1&knob_8=0.433&knob_11=0.827&knob_13=0&knob_14=0.488&knob_15=0.386&knob_16=0.22
```
