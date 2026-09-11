# Phosphor Bear

Music visuals for the **bear charm** — the 34 mm NFC keychain in `D:\Projects\3d-bear`
(`print-ready/keychain-bear-r4b-TRELLIS-corded-nfc-embedded.stl`, a sealed NTAG215 cavity
in the plinth). It is the round-4 candidate `b` bear: a grizzly roaring with both arms up
on a rock, the same one printed as the Goldrush totem in strontium-aluminate glow filament
and lit from inside by blacklight ("Phosphor Bear", `3d-bear/docs/index.html`).

**Preset (what the NFC tag should point at):**
```
https://visuals.beadfamous.com/?shader=claude/wip/bear/1&image=images/bear.png
```

## The mask

`public/images/bear.png` (556×945, black bear on white) — cut from the rembg cutout the
mesh pipeline made of the generating image
(`3d-bear/outputs/stage2_mesh/round4z/b_cutout.png`, itself from `assets/round4z/b.png`).
Alpha inverted, cropped to the bear with 4 % padding, soft edge kept. Same contract as
`wooli.png`: `mask = 1.0 - getInitialFrameColor(uv).r`, aspect-corrected against
`IMG_ASPECT = 556/945`. The open mouth is at image uv `(0.505, 0.867)`.

Regenerate with:
```bash
python - <<'PY'
from PIL import Image
a = Image.open('D:/Projects/3d-bear/outputs/stage2_mesh/round4z/b_cutout.png').split()[-1]
x0,y0,x1,y1 = a.point(lambda v: 255 if v > 8 else 0).getbbox(); pad = 35
Image.eval(a.crop((x0-pad,y0-pad,x1+pad,y1+pad)), lambda v: 255-v).convert('RGB').save('public/images/bear.png')
PY
```

## Visual concept — glow-in-the-dark physics

The charm *is* phosphor under a blacklight, so the shader does what the plastic does:

- **A UV beam sweeps the bear** (per-device direction from `seed`, ping-pong so it never
  teleports; faintly visible in the air as violet dust). Where it passes, the phosphor
  **charges**.
- **Charge persists** in the frame buffer's alpha channel and fades per second —
  afterglow. Colour is a pure function of the stored charge (mottle and layer lines are
  applied on the way *out* only), so nothing compounds across frames.
- **Bass kicks flash-charge** the whole bear and punch it outward; **drops** (`energyZScore`)
  make it **roar**: two violet rings are seeded — one at the mouth that pours out through the
  gaps between head and arms, one wide enough to clear the raised arms — and advected outward
  through the exterior, frame to frame. A slow "breath" pulses faint rings in silence.
- **Layer lines**: 170 horizontal stripes inside the silhouette — 34 mm at 0.2 mm layers.
- **Rim**: phosphor-green edge glow just outside the silhouette; treble and roars widen it.
- Exterior is blacklight-dark with violet UV dust motes.

## Audio mapping

| Target | Feature | Family | Why |
|---|---|---|---|
| Bear scale (punch out) | `bassNormalized`, `bassZScore`, `energyZScore` | LEVEL | the roar hits you |
| Charge flash | `bassZScore` (kick), `energyZScore` (drop) | LEVEL | phosphor lights up on the hit |
| Beam power / width | `spectralFluxNormalized`, `midsNormalized` / `spectralSpreadNormalized` | TEXTURE | timbral motion = more UV |
| Afterglow (kept per second) | `energyMedian` | LEVEL | loud sets stay responsive, quiet rooms linger |
| Phosphor hue drift | `spectralCentroidSlope × RSquared` | PITCH | slow, confident drift green↔aqua |
| Motes / rim | `spectralCrestNormalized`, `trebleNormalized` | TEXTURE | sparkle on air |
| Beat | `beat` | — | 6 % brightness pulse |

Everything audio is multiplied by `MOTION = smoothstep(0.12, 0.5, energyNormalized)` so a
quiet room only gets the base beam sweep and the breath rings.

Seeds: `seed` beam direction · `seed2` phosphor hue (yellow-green ↔ aqua) · `seed3` violet
hue + mottle offset · `seed4` sweep rate/phase + breath phase.

## Test URLs (uniforms via query params, no mic needed)

```
rest    ?shader=claude/wip/bear/1&image=images/bear.png&noaudio=true
groove  …&noaudio=true&energyNormalized=0.6&bassNormalized=0.5&spectralFluxNormalized=0.5&midsNormalized=0.5&trebleNormalized=0.4&spectralCrestNormalized=0.4&energyMedian=0.5&spectralSpreadNormalized=0.4
roar    …&noaudio=true&energyNormalized=0.8&bassNormalized=0.6&bassZScore=0.6&energyZScore=0.6&spectralFluxNormalized=0.5&midsNormalized=0.5&trebleNormalized=0.5&spectralCrestNormalized=0.5&energyMedian=0.4
loud    …&noaudio=true&energyNormalized=0.9&bassNormalized=0.85&bassZScore=0.9&energyZScore=0.9&spectralFluxNormalized=0.7&midsNormalized=0.6&trebleNormalized=0.7&spectralCrestNormalized=0.6&energyMedian=0.5
debug   add &knob_199=1 — paints the stored field: red = previous charge, green = new, blue = inside the mask
```

Give the page ~5 s after load before judging a still (async shader compile).

## Engineering notes (read before touching the feedback)

- **State lives in alpha.** `fragColor.a` is the field (interior: phosphor charge, exterior:
  ring intensity). The FBOs are RGBA8 and the canvas blit ignores alpha, so it is a free slot.
- **`pow(x, 2.0)` is undefined for negative x** and produced NaN here; the NaN clamped to 1.0
  and leaked through the advection until the whole field read saturated. Use `sq()`.
- **Frame-rate independent.** There is no `iTimeDelta`, so the bottom-left pixel stores
  `fract(iTime/4)` as 16 bits (r, g); next frame reads it back → `dt`. Every decay is
  `pow(keepPerSecond, dt)`, every speed is px/s. The desk display runs ~140 fps; a phone 60.
- **±0.5 LSB dither** on the stored field, or 8-bit rounding stalls the slow decay at a floor.
- **Advection steps ≥ 1 px** (NEAREST sampling) so rings never stall at high fps.

## Iteration notes

- **1.frag** — first version. Found and fixed: `pow` NaN, per-frame decay running 2.3× fast on
  the 140 fps desk, ring seeded inside the head (only leaked through the armpits — added the
  wide second ring), rim too thick (tight line + faint halo), rest state too dark (ambient floor
  0.20, beam visible in the air).

## Ideas to pick up later

- Portrait check on a real phone (the desk window would not resize below ~1280 wide).
- A `spectralRoughness`-driven "crackle" in the phosphor at high charge.
- Mouth-locked roar: brighten the mouth region itself on `DROP` (needs the mouth mask, not
  just the point).
- Promote to `shaders/bear/1.frag` once it has been jammed with real music.
