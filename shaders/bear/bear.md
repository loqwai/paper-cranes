# Phosphor Bear

Music visuals for the **bear charm** — the 34 mm NFC keychain in the sibling `3d-bear` project
(`print-ready/keychain-bear-r4b-TRELLIS-corded-nfc-embedded.stl`, a sealed NTAG215 cavity
in the plinth). It is the round-4 candidate `b` bear: a grizzly roaring with both arms up
on a rock, the same one printed as the Goldrush totem in strontium-aluminate glow filament
and lit from inside by blacklight ("Phosphor Bear", `3d-bear/docs/index.html`).

**Preset (what the NFC tag should point at):**
```
https://visuals.beadfamous.com/?shader=claude/wip/bear/2&image=images/bear.png
```
(`bear/1` is the same without onset envelopes.)

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
a = Image.open('../3d-bear/outputs/stage2_mesh/round4z/b_cutout.png').split()[-1]
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

## Onset mapping (2.frag)

The events layer comes from the onset envelopes (`docs/onset-detection.md`): one designed
curve per detected hit, immediate and smooth. Each is `max()`ed with a z-score fallback so
the shader still moves on builds where the onset uniforms read 0 (hypnosound < 2.1 — the
installed 1.14.0 is one of them; the fallbacks are what you see today).

| Uniform | Envelope | Drives | Fallback |
|---|---|---|---|
| `onsetKick` | 220 ms | bear punch (`BEAR_SCALE`), flash-charge, **mouth flare + mouth afterglow**, mouth ring | `bassZScore × 0.6` |
| `onsetKick × onsetKickStrength` | — | how white the mouth flare goes (hard hits whiter) | none |
| `onsetSnare` | 150 ms | the wide shockwave ring | `spectralFluxZScore × 0.4` |
| `onsetHat` | 90 ms | white rim ticks, mote density | `trebleZScore × 0.4` |

Test the onset state without a mic: add `&onsetKick=0.9&onsetKickStrength=0.9&onsetSnare=0.7&onsetHat=0.8`
to the roar URL below (the uniforms are plain built-ins; query params outrank measured audio).

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
- **2.frag** — events moved to the onset envelopes: kick → punch/flash/mouth, snare → wide
  shockwave, hat → rim ticks and motes, each with a z-score fallback underneath. One
  elaboration: the **open mouth** is a soft spot in mask-image space that takes the kick
  hardest — it flares white-green on the hit (whiter for hard hits) and, because the flare is
  also fed into the stored charge, its afterglow lingers longest, so the roar visibly comes
  from the mouth. No extra texture taps. Verified rest and onset states via query-param URLs;
  the mouth flare only reads on transient kicks, not in a sustained still. Then tuned against
  real music through the mic loopback (144 fps desk): `bassZScore` peaks ~0.7–1.1,
  `spectralFluxZScore` ~0.2–0.45, `trebleZScore` ~0.45, `energyZScore` rarely above 0.6,
  `energyNormalized` 0.1–0.8. `energyMedian` is a raw level (~0.02), so the afterglow/ring
  "loudness" terms now use `LOUD = smoothstep(0.3, 0.8, energyNormalized)`. Body flash
  power halved so a steady beat no longer pins the whole bear at full charge — the beam
  sweep stays visible and the mouth stays the hottest point.

## Ideas to pick up later

- Portrait check on a real phone (the desk window would not resize below ~1280 wide).
- A `spectralRoughness`-driven "crackle" in the phosphor at high charge.
- Mouth-locked roar: brighten the mouth region itself on `DROP` (needs the mouth mask, not
  just the point).
- Promote to `shaders/bear/1.frag` once it has been jammed with real music.

## 3.frag and 4.frag — /vibej2 live session (2026-09-11)

Two versions of the same shader, differing only in which face image they read:

| Shader | Image | Face source | Preset |
|---|---|---|---|
| `3.frag` | `bear-face.png` (556×945) | the reference photo | [preset](https://visuals.beadfamous.com/?shader=claude/wip/bear/3&image=images/bear-face.png&wavelet=true&controller=wavelet-ease) |
| `4.frag` | `bear-model.png` (563×945) | a front orthographic render of the printed mesh | [preset](https://visuals.beadfamous.com/?shader=claude/wip/bear/4&image=images/bear-model.png&wavelet=true&controller=wavelet-ease) |

Both images keep the mask contract (R = 255 − inside, byte-identical to `bear.png` for the
photo version) and add G = relief and B = features. Phosphor glows brighter where the relief is
thicker, features stay engraved dark at full charge, the UV beam rakes across the relief, and the
eyes carry a small lamp. The printed mesh has no modelled eyes, so on `4.frag` the lamp is the
only eye cue.

The controller is REQUIRED — without it every spring reads 0 and the bear rests.

**Feature-space corners**

| Corner | Condition | Effect |
|---|---|---|
| WARM | mids spring high, centroid spring low, energy spring low | amber hearth halo |
| BRIGHT | energy spring high, centroid spring high | god rays from the mouth, cyan as centroid rises |
| LIFT | energySpring − energyLong | layer lines sharpen with build tension, charge washes them |
| DROP | large lift | roar rings and flash-charge |
| KICK | bass spring top 10% | punch, flash, mouth flare |
| SHAKE | bass+energy, roughness, and lift all at their p99s | subtronics-eye camera shake, peak-only per the user |

Continuous drivers are wavelet-ease springs; z-scores remain only in the SNARE and HAT ring
and glint events. Onsets are off by user request.

See `journals/bear-cool-moments.md` for the per-beat history.

### bear-zoom ratchet (4.frag)

A moderate camera push-in from the lowest wavelet band, built as a ratcheting gate with a cooldown.
`controllers/bear-zoom.js` runs chained after `wavelet-ease` and outputs `bearZoom` (0..1). Without
it `bearZoom` reads 0 and the shader is unchanged.

**Preset:**
```
https://visuals.beadfamous.com/?shader=claude/wip/bear/4&image=images/bear-model.png&wavelet=true&controller=wavelet-ease&controller=bear-zoom
```

3.frag (photo face) runs the same zoom:
```
https://visuals.beadfamous.com/?shader=claude/wip/bear/3&image=images/bear-face.png&wavelet=true&controller=wavelet-ease&controller=bear-zoom
```
3.frag does not have 4.frag's later ring fixes (beats 19-31), so its ring source is gated against the
ABSOLUTE max extent (deepest punch at full zoom) rather than a gate that follows the zoom.

- **Signal: `waveletBand0ZScore`.** `src/audio/dwt.js` reverses the octave list, so band0 is the lowest
  detail band (43-86 Hz). The z-score only fires events; it never scales anything (moveGate rule 1).
- **Ratchet.** A rising crossing of 0.8 steps one notch, up to 3. On 150 s of live mic music, 0.8 sits at
  about p98: band0 z was p50 -0.07, p90 0.43, p95 0.61, p99 0.90, with jitter 0.045/frame. The gate re-arms
  under 0.2, with a 0.35 s refractory.
- **Cooldown (the counter-ratchet, same controller).** The slope is a least-squares fit over the last 1 s
  of the EMA-smoothed z, because the built-in `*Slope` features read 0 on this input.
  - A slope below -0.3 z/s starts a 0.8 s cooldown.
  - A new surge, or the slope rising past +0.15, cancels it. A cooldown cannot start within 0.5 s of a surge:
    the 1 s fit has not seen the surge yet, and live it restarted on the same frame the surge cancelled it.
  - When it completes the ratchet drops to notch 0 (normal zoom), and new steps are locked out for 1.5 s so
    it cannot flap.
  - 10 s with no surge also starts cooling, so a plateau never pins the zoom in.
  - Replaying this logic over the calibration trace gave ~12 steps/min, ~6 releases/min, a median hold of
    2.2 s (p90 4.8 s), zoomed ~40% of the time, and no release->step inside 1 s. An arm threshold of 0.55
    held the zoom in ~80% of the time, i.e. on every kick.
  - Live, with the controller running (175 s of mic music): 7.9 steps/min, 3.8 releases/min, a median hold
    of 5.4 s (1.6-11.6 s), zoomed 39% of the time and at full ratchet 6%, with no release->step inside 1 s
    (fastest re-entry 1.9 s). Steps land on energy lift 0.044 against a 0.017 average. In the 1.5 s after a
    release, violet fill was 4.0% vs 3.8% otherwise, and violet touching the silhouette 1.3 vs 1.4 cells (of
    96x96), so the release draws no outline and no flood.
- **Motion.** A critically-damped spring in the controller: in over ~0.35 s, back out over ~1.3 s.
- **Shader.**
  - `ZOOM_DEPTH 0.14`: base scale 1.18 -> 1.04 at full ratchet, a bear ~13% bigger.
  - It zooms about `ZOOM_FOCUS` (0.5, 0.70), the upper chest, so the head and raised arms grow and the
    plinth takes any crop.
  - The kick/energy punch rides the same low end, so it is halved at full zoom (deepest scale 0.96;
    moveGate rule 2).
  - Mouth rings and god rays are taken at the zoomed base.
  - The ring-field gate `getMaxReach` follows the zoom with 0.08 headroom instead of a fixed max extent.
    A fixed gate at full zoom would be a halo ~23% wider than the resting bear and would choke the mouth
    rings in the arm gaps.
- **Pinned framing checks.** Add `&noaudio=true&bearZoom=1` (or `0`) to the usual feature pins; URL params
  outrank controller output.
