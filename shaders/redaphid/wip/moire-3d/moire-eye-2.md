# moire-eye-2

Fork of `moire-eye-1` — snapshot of the live `/vibej` eye after ~20 iterations, with the
dialed-in knob preset baked in.

## Origin
- Forked from `redaphid/wip/moire-3d/moire-eye-1` on 2026-06-07 during a `/vibej` run.
- Music at fork time: **Carbon Based Lifeforms — "Frog"** (ambient psybient rotation incl.
  AstroPilot "Distant Worlds", Applefish/Lauge "Blue Airglow", Sync24 "Replicant").
- `moire-eye-1 ← moire-3d-1 ← shadertoy lc3SWN` (ChunderFPV "Moire 3d template") × `iris-7`.

## Baked knob preset
| knob | value | controls |
|------|-------|----------|
| knob_1  | 0.575 | eye zoom (FOV) |
| knob_2  | 0.276 | iris hue tint |
| knob_6  | 0.402 | gold-core strength |
| knob_9  | 0.748 | gaze Y |
| knob_12 | 0.913 | gaze X |
| knob_14 | 0.551 | pupil size |
| knob_16 | 0.244 | sparkle / ember intensity |
| knob_19 | 0.300 | catchlight + gaze strength |
| knob_4/7/8/15 | 0.567/0.323/0.346/0.205 | unwired (free for future mapping) |

## Preset URL
```
?shader=redaphid/wip/moire-3d/moire-eye-2&remote=display&fullscreen=true&knob_1=0.575&knob_2=0.276&knob_6=0.402&knob_9=0.748&knob_12=0.913&knob_14=0.551&knob_16=0.244&knob_19=0.3
```
(append `&remote=display` to receive remote knob control — required for the controller to reach the display.)

## Audio mapping (15-feature)
- **bass** → pupil dilation + sphere z-pulse bloom + catchlight pulse
- **mids** → stroma "arms" fiber-band brightness
- **treble** (norm + zScore) → tip sparkle + airglow rim shimmer
- **entropy** → per-fiber stroma hue shimmer
- **centroid** → iris temperature (dark=warm/red, bright=cool) + pupil-maw redness
- **pitch** → collarette ring hue
- **flux** → micro-saccade dart + catchlight glint
- **energy** (norm + zScore) → calm-breath swell + pupil dilation

## Why this fork
Locked in as a keeper after the eye reached full anatomy + a complete frequency-band map and
was trimmed back (airglow tightened iter 20). moire-eye-1 stays the live `/vibej` canvas; this
is the stable snapshot.
