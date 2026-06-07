# moire-eye-4

Fork of `moire-eye-3` — the clean, de-noised, full-anatomy iris opened up to **fill the full
frame** with curling fractal tendrils and a deeper pupil tunnel.

## Origin
- Forked from `redaphid/wip/moire-3d/moire-eye-3` on 2026-06-07 during a `/vibej` run (user `/fork`).
- Music at fork time: rotation of **Of The Trees** (Pressure / Honeydust / Dream Atlas), **Tipper
  "Mariscos"**, **Ganja White Night "Mask Off"**, deadmau5, Subtronics.
- Lineage: `moire-eye-4 ← moire-eye-3 ← moire-eye-1 ← moire-3d-1 ← shadertoy lc3SWN` (ChunderFPV) × `iris-7`.

## Why this fork — the new direction (user request)
> "Let's start taking up the full frame now. Have like tendrils or arms of fractals radiate
> around the eye, moving in curly ways with the music features. Give me more of a tunneling
> effect into the pupil."

Three additions on top of eye-3's clean iris:

1. **Full-frame fractal TENDRILS** — the moiré field `c` already spans the whole frame; beyond
   the iris (er > 0.46) it's carved into spiralling radial arms: `curl = ang*armN + er*twist*TAU
   - iTime*speed`. `armN` (count) from `spectralSpread`, `twist` (curl amount) from
   `spectralFlux + energy`, rotation speed from `energy`. Two octaves layered for a fractal feel.
   Bass pulses them. They fade toward the corners (`exp(-(er-0.46)*2.2)`).
2. **Pupil TUNNEL** — concentric rings receding into the pupil: `sin(1/er*5 - iTime*1.5 + ang*3)`.
   `1/er` compresses rings toward centre (perspective), they rush inward on time and spiral with
   angle. Bass deepens. Lives only inside the pupil → real depth into the eye.
3. The full eye-3 anatomy + spectral colour map (fibres/crypts/furrows/collarette/ruff/limbal,
   energy→saturation, centroid→hue, crest→sharpness, TREND/Rslopes→pupil dilation) carries over.

## Knobs
| knob | controls |
|------|----------|
| 11 | MASTER REACT (0.5×..2×) — crank to make the tendrils curl harder with the music |
| 8  | TREND amount (slope×rSquared: pupil dilates on builds) |
| 1  | zoom (iris size in frame) |
| 7  | stroma fibre density |
| 9 / 12 | gaze Y / X |
| 14 | pupil size |
| 2  | hue tint · 6 gold-core · 13 anti-flicker · 15/16 glow · 19 catchlight |

## Preset URL
```
?shader=redaphid/wip/moire-3d/moire-eye-4&remote=display&fullscreen=true&knob_11=0.8&knob_1=0.85&knob_14=0.5&knob_13=0.6
```
(Crank `knob_11` for more tendril curl; `knob_1` sizes the iris vs the surrounding tendril field.)
