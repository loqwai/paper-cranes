# Onset Detection: Events + Designed Responses

Fixes the shudder-vs-lag dilemma: raw features jitter, smoothed features lag.
The fix separates **measurement** (detect that a hit happened — wants fidelity)
from **animation** (how visuals respond — wants continuity). A detector fires a
discrete event; the shader shapes a designed response from it. Nothing noisy
remains in the response path, and nothing smoothed delays the attack.

## Architecture

```
mic → windowNode ─→ fftAnalyzer (smoothing 0.4, fft 4096) → workers → features  (unchanged)
                └─→ onsetAnalyzer (smoothing 0, fft 1024) → onsetDetector → onset event uniforms
```

- `src/audio/onsetDetector.js` — pure, dependency-free, caller supplies the
  clock. Spectrum bytes in, events out. This is the piece that ports to
  hypnosound / ESP32 firmware; keep it free of browser APIs.
- `src/audio/AudioProcessor.js` — creates the dedicated unsmoothed analyser,
  runs the detector each frame in `updateCurrentFeatures`, sets the onset keys
  *after* the exponential-smoothing loop (events are never smoothed).

## Algorithm

Half-wave-rectified spectral flux (per-bin average, so scale is stable across
FFT sizes), gated by ALL of:

1. `median + sensitivity × MAD` over a rolling ~1s window — robust adaptive
   threshold; a sustained pad drags a mean up but barely moves the median.
2. `ratio × median` — kills false fires on stationary noise, where flux is
   stable, MAD collapses to its floor, and gate 1 becomes a hair trigger.
3. `fluxFloor` — absolute silence gate.
4. Refractory period in **milliseconds** (not frames — frame rate varies).

Edge-triggered: `onset` is true for exactly one frame per event.

## Shader surface (additive — nothing existing changed)

| Uniform | Type | Meaning |
|---|---|---|
| `onset` | bool | True on the trigger frame only (contrast `beat`: level-triggered, smears) |
| `timeSinceOnset` | float | Seconds since last onset (1000.0 before the first). The response primitive. |
| `onsetStrength` | float | 0–1 hit intensity (`1 - threshold/flux`), latched until the next onset |
| `onsetFlux` / `onsetThreshold` | float | Detector internals, for diagnostic shaders |

GLSL helper (injected header): `onsetEnvelope(attack, release)` — one-shot
0→1 over `attack` seconds then exponential decay with `release` time constant.
The `animate*` family can't do this (they all wrap `pingpong(iTime)` — free
oscillators, not retriggerable one-shots).

```glsl
float kick = onsetEnvelope(0.01, 0.25) * (0.5 + onsetStrength);
```

## Live tunables

URL params or edit-page sliders / `window.cranes.manualFeatures` (read every
frame): `onset_sensitivity` (3), `onset_ratio` (1.5), `onset_refractory_ms`
(120), `onset_flux_floor` (0.5), `onset_low_hz` / `onset_high_hz` (full band;
try `onset_high_hz=200` for kick focus), `onset_fft_size` (1024, constructor
only).

## Seeing it work

- `?shader=wip/claude/onset-graph` — scrolling plot: cyan flux, orange adaptive
  threshold, green strobe per onset, magenta ticks for the old `beat` on the
  same timeline (watch it smear/double-fire), envelope strip at the bottom.
- `?shader=wip/claude/onset-compare` — split screen, same music: left = old way
  (smoothed feature drives size), right = onset + envelope. `knob_71`/`knob_72`
  = attack/release.
- `node scripts/test/onset-detector.js` — 15 deterministic synthetic-spectra
  checks (first-frame triggering, refractory, band limiting, noise immunity).

## Cross-repo state / how to pick this up

The algorithm exists **identically in two places** on purpose:

- `paper-cranes/src/audio/onsetDetector.js` — the live copy.
- `hypnosound/src/utils/onset.js` — on the local `feat/onset-detection` branch
  (commit `d48f9af`, unpushed as of 2026-07-08), exported as
  `makeOnsetDetector`, with vitest coverage. Kept in `src/utils/`, NOT
  `src/audio/` — the audio barrel is auto-generated into `AudioFeatures`, and
  paper-cranes spawns one worker per entry.

Why not import from hypnosound today: paper-cranes pins `hypnosound@1.9.0`
via esm.sh URLs in `src/audio/analyzer.js` + `vite.config.js` (and
node_modules). Bumping to current (1.14+) changes existing shader rendering
(energy rescaled to 0–1 in 1.11) and adds rms/dbfs features whose workers
would 404 against the old esm.sh path. Untangling that is a separate task;
when it happens, publish hypnosound with the onset branch merged, delete the
paper-cranes copy, and import `makeOnsetDetector` from hypnosound.

Not done here (deliberately): tempo estimation / beat prediction; any change
to `beat`, existing features, smoothing, or the 1.9.0 pins.
