# Handstand Aurora Portal

A dancer mid-handstand, rendered as a being of light suspended in a deep nebula —
built for **ChromaDepth 3D glasses**.

**Preset:**
```
https://visuals.beadfamous.com/?shader=redaphid/handstand/1&wavelet=true&controller=wavelet-ease&image=images/handstand.png&fullscreen=true
```

## Visual concept

ChromaDepth maps hue → depth: red = near, green = mid, blue/violet = far. This shader
leans into that hard:

- **Figure interior → red/near.** A multi-tap *interior fill* (8 mask samples at radius
  0.035) turns the flat black/white stencil into a pseudo-3D bulge: the dense core of the
  body reads as deepest red (nearest), thinning toward green at the limbs.
- **Rim → pure red, maximum pop.** The silhouette edge glows `t = 0.0` (reddest), so the
  whole figure punches forward off the screen.
- **Background → blue/violet, recedes.** A domain-warped flow-noise nebula with sparse
  twinkling stars sits in the far depth band (`t ≈ 0.55–0.95`).

The image mask is a **black figure on a white background** (`public/images/handstand.png`,
521×532). `mask = 1.0 - getInitialFrameColor(uv).r` → 1 inside the figure, 0 outside.
Texture upload uses `UNPACK_FLIP_Y`, so sampling `uv` directly gives the figure upright
(hands at the bottom). Aspect-corrected against `IMG_ASPECT = 521/532`.

## Audio mapping

Wavelet (DWT) features drive **motion/energy**; FFT spectral features drive **texture**.
Everything reactive is gated by `quietGate` so silence never flashes.

| Target | Feature | Why |
|--------|---------|-----|
| Figure zoom/pulse | `waveletBassSpring` (swell) + `waveletBassZScore` (kick) + `wavelet_bassHit` (drop) | body surges toward you on the low end |
| Figure redness (depth) | `waveletBassSpring` | bass pulls the whole body nearer |
| Internal plasma churn | `wubPulse`, `melodyFlow`, `morphPhase`/`flowPhase` | warm energy flows through the body; monotonic phases never rock back |
| Rim flare width/gain | `waveletBassZScore`, `wavelet_bassHit` | the red edge pops forward on each kick |
| Far-field brightness | `waveletCentroidSpring`, `waveletBand5Spring` | brightness + treble/air |
| Violet shift (further) | `waveletBand5Spring` | treble pushes the background deeper |
| Nebula turbulence | `spectralEntropyNormalized`, `spectralRoughnessNormalized` | filament chaos |
| Saturation | `tonalStrength` | melodic = saturated, noisy = desaturated |
| Beat | `beat` | brightness pulse only (hue is reserved for depth) |

**Requires** `?wavelet=true&controller=wavelet-ease`. Without them the wavelet/controller
uniforms read 0 and the piece falls back to a static portal with a slow `iTime` nebula drift
(every motion phase has a small `iTime` term so it never fully freezes).

## Iteration notes

- **1.frag** — first version. Originally had a melodic left/right `SWAY` on the figure;
  removed per feedback in favour of a pure **bass zoom/pulse** (smooth `waveletBassSpring`
  swell + punchy `waveletBassZScore`/`wavelet_bassHit` spikes). Figure stays centered.

## Ideas to pick up later

- Ease-back on the zoom: snap in fast on the kick, relax out slowly (needs a controller
  accumulator or a `getLastFrameColor`-style decay — GLSL alone can't hold the envelope).
- Drive internal plasma hue by `pitchClass` for note-reactive color inside the body.
- A second, smaller "echo" silhouette offset in depth (more blue) for a layered portal.
- Tune `@mobile` — currently `false` (17 texture taps/pixel: 1 center + 16 in the ring loop).
  Drop the interior-fill loop to 4 taps to make it mobile-safe.
