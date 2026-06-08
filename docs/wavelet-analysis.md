# Wavelet (DWT) Audio Analysis

Opt-in multiresolution audio analysis that runs **alongside** the FFT pipeline. Enable with `?wavelet=true`.

## Why

A single-window FFT analyzes bass and treble at the *same* time resolution — wrong for music. A dyadic **Daubechies-4 DWT** gives octave bands, each at its own natural time resolution: bass updates smoothly, treble/transients update sharply. Better for deep-bass-drop detection (phone mics roll off below ~100Hz) and for frequency-motion features.

## Enabling

Append `?wavelet=true` to any visualization URL. Works with mic, `?audio=tab`, and `?audio_file=`. The wavelet features are then available as shader uniforms.

## Features

Wavelet bands are **first-class features** — each runs through the same statistics path as the FFT features, so it exposes the full 11 stat variations under the FFT naming convention (`waveletBand0`, `waveletBand0ZScore`, `waveletBand0Normalized`, `waveletBand0Slope`, …).

| Uniform | Meaning |
|---------|---------|
| `waveletBand0..5` (+ stats) | Octave-band energy, low→high (band0 ≈ 43-86Hz deep bass → band5 ≈ 1.4-2.8kHz) |
| `waveletBass` (+ stats) | Harmonic-weighted deep-bass energy (survives phone-mic rolloff) |
| `waveletCentroid` (+ stats) | Spectral brightness — rises as pitch glides up |
| `waveletSpread` (+ stats) | Spectral complexity — flat/noisy vs pure tone |
| `waveletTilt` (+ stats) | Bass-vs-treble balance |
| `wavelet_bassHit` | Sharp, un-smoothed deep-bass **drop trigger** |
| `wavelet_punch` | **Combination**: fast wavelet bass onset + FFT bass level |
| `wavelet_confirmedDrop` | **Combination**: wavelet hit lightly gated by FFT energy (fewer false drops) |

### Choosing the right variant

- **Raw / `Normalized`** → "where the frequency/level *is*" (shows pitch glides, sweeps, vibrato)
- **`ZScore`** → "is this *unusual* right now" (punchy reactive hits, drops) — hides steady trends
- **`Slope`** → "is it trending up or down"

## Low latency

The wavelet path uses a **128-sample sliding window** (analysis every ~3ms), independent of the FFT's larger window. The FFT×wavelet combinations lead with the fast wavelet component so they react on the wavelet timescale, not the FFT's ~85ms.

## Smoothing for animation

The raw wavelet features are fast but sawtooth-y. To get flowing, animation-ready lines (plus
derived musical signals like melody contour and dubstep wub detection), load the
[`wavelet-ease` controller](controllers.md#smooth-animation-ready-audio-features-wavelet-easejs):
`?controller=wavelet-ease`. It spring-smooths the features and exposes `*Spring` uniforms,
`melodyFlow`, `bassNoteFlow`, `wubDepth`, and more.

## Diagnostic shaders

`shaders/claude/wip/wavelet-scope/` contains scopes for inspecting the features: band meters, scrolling oscilloscopes, and the `independent` / `combined` tapestries. The mic-tuned ones (`legible`, `proof`, `melody`, `bassline`, `wub`) pair with the `wavelet-ease` controller. Load e.g. `?shader=claude/wip/wavelet-scope/legible&wavelet=true&controller=wavelet-ease&audio=tab`.

## Headless analysis

`scripts/wavelet-harness2.mjs` and `scripts/wavelet-fft-cross.mjs` score features (animation quality + cross-domain independence) from ffmpeg-decoded PCM — the same `createWaveletAnalyzer` that runs live, so offline analysis matches the live pipeline.

## Architecture

```
raw-tap-processor.js (AudioWorklet, sliding window)
  → waveletWorker.js (thin shell)
  → waveletAnalyzer.js (createWaveletAnalyzer — shared with the harness)
  → dwt.js (pure D4 transform)
  → window.cranes.waveletFeatures
```
