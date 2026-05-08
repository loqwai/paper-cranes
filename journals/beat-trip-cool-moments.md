# beat-trip — Session Journal

## Status
Iter 48 on /vibej run (swapped from clit/7). Subtle move style. Base shader is minimal — hue rotation + distortion + binary beat color injection.

## Cool moments
- **Iter 50, audio fingerprint** `bass 0.50 + treble 0.00 + energy 0.17 + entropy 0.60 + centroid 0.24 + pitch 0.82, beat=true` (dark bassy drone passage, no highs)
  - **What worked**: prior iter (49) had everything wired through treble/centroidZ — most effects went silent on this passage.
  - **What was missed**: no visible response to bass-only/dark passages. Treble-driven chromatic aberration was idle.
  - **Design hypothesis**: every shader needs at least one effect that fires on bass-only inputs (no treble, low centroid). Drone breath now fills that gap.

## Todo
- `[x]` "It's mostly black a lot of the time" — partially fixed iter 51, oscillated to all-white. Real fix iter 52 (OKLab rewrite).
- `[x]` "Now it's almost white all of the time" — fixed iter 52. Root cause: HSL pipeline with additive lightness lift + additive ambient + multiplicative breath/beat-punch all compounding through feedback. Switched entire color pipeline to **OKLab/LCh** with target-seeking L and C (mix toward target, never additive). Feedback can't run away if every frame relaxes toward a stable point.
- `[x]` "It needs to be smoother, less glitchy or harsh color gradient" — fixed iter 53. Roughness shear 10× softer, 5-tap box blur on prevFrame (was single sample causing high-freq noise), L/C/H relax rates 2.5× slower, spatial hue freq 8→2.5 for smooth gradients.
- `[x]` "I refreshed the page. it's black" — fixed iter 55. Cold-start: `prevFrame` is zeroed after refresh, target-seeking mix can't bootstrap from 0. Added near-black-detection escape: when prev brightness < 0.05, mix in a generative pitch-driven OKLab seed pattern (radial gradient, chroma 0.12). Also protects any future trapped-at-black state.

## History of changes
- Iter 48: replaced binary red/blue `colorToMixIn` with `pitchClassNormalized`-driven hue (full-saturation HSL → RGB). Added bassZScore saturation pump (`hslColor.y += bassZScore * 0.15`) before hue rotation. Moves the shader from "red on beat, blue otherwise" to "color tracks the note being played, brighter on beat".
- Iter 58: Wired `roughness` perceptually. Spatial hash noise rotates H by `(hash-0.5) * roughness² * 0.4` rad just before OKLab reconstruction. Quadratic on roughness keeps it subliminal at typical values; only buzzes on dissonant/clashing passages. Per-pixel jitter so colors get a subtle shimmer that mirrors the harmonic beating in the audio.
- Iter 57: Wired `mids` for the first time. `midDominance = mids*(1-bass)*(1-treble)` fires only when mids genuinely dominate the spectrum (not when everything is loud). Adds 0.06 to Ltarget and 0.4 rad warm-bias to Htarget — when track is mid-heavy, the field warms toward orange/amber and brightens slightly. Stays bounded by existing OKLab clamps.
- Iter 56: Added soft radial bass pulse to chroma target. Center-biased ring (`smoothstep(0.55, 0, pulseR)`) × `max(fluxZ*0.5 + bassZ, 0) × 0.06` adds to Ctarget. Strictly additive on transients (the `max(..., 0)` floor), bounded by existing C clamp at 0.18. Center saturates briefly on bass kicks/flux spikes; edges unaffected.
- Iter 55: **Cold-start fix.** Added near-black-detection escape: when prevFrame brightness < 0.05, mix in a generative pitch-driven OKLab seed pattern (radial gradient, chroma 0.12). `seedMix = smoothstep(0.05, 0, prevBrightness) * 0.6`. Fixes refresh-shows-black and prevents trapped-at-black states.
- Iter 54: Added slow conveyor-belt UV drift before swirl — direction wanders with `time*0.05 + pitchClass*2π`, magnitude tied to `bass + |fluxZ|*0.4` × 0.0015. Gives the field gentle ongoing motion on calm/low-energy passages where the swirl is damped.
- Iter 53: **Smoothing pass.** Roughness shear 10× softer; replaced single-sample chromatic aberration with 5-tap box blur on prevFrame (kills high-freq color noise / banding); reduced L/C/H relax rates by ~2.5×; lowered spatial hue frequency 8→2.5 for large coherent color regions; halved breath; softer beat punch.
- Iter 52: **OKLab pipeline rewrite.** Replaced HSL with OKLab→LCh. Lightness and chroma now use target-seeking `mix(value, target, alpha)` instead of additive deltas — feedback can't compound to white or black. Pitch-driven hue anchor with angular interpolation. Ambient is mix-toward (not additive). Color space: oklab-lch.
- Iter 51: **Black-frame fix.** Feedback shader was decaying to black on dark/low-energy passages. Five fixes: (1) `hslColor.z` lift now always positive (`centroid*0.06 + 0.008`), (2) vignette floored at 55% edges, (3) `grayThreshold` lowered from `~0.67` to `0.45` so colorToMixIn fires more often, (4) off-beat colorToMixIn alpha bumped 0.02→0.025 with 0.55× pitchHue (was 0.3×), (5) **ambient floor**: pitch-driven dim color mixed in every frame at 4.5% so the feedback loop never starves of light.
- Iter 50: Added drone-breath modulation (`sin(time*0.7 + entropy*pi) * bassNormalized * entropy * 0.18`) — gives a visible swell on bass-only passages where treble is zero. Damped swirl twist by `mix(0.35, 1.0, energyNormalized)` so calm passages don't feel jittery.
- Iter 49: **Sophistication pass.** Added `@fullscreen: true` + `@mobile: true` metadata (auto-stretch to viewport). Refactored distortion into 3-octave field (treble + flux + entropy each drive a different frequency band). Added `swirl()` rotation (centroidZScore drives twist amount, slow time wobble, gentle inward zoom for feedback bloom). Added radial chromatic aberration (treble-scaled, beat-amplified — RGB samples split along radial direction). Added centroid-driven lightness lift + spatial hue drift. Added entropy-scaled vignette (chaos darkens edges). Added beat-punch brightness lift on output. Six independent audio mappings now layered.

## Forks
- `beat-trip ← clit/7` (iter 48): user-initiated shader swap mid-session.

## Design hypotheses for v(next)
- Original shader had no audio-reactive saturation — adding it gave the shader a breath that lined up with kick energy.
- `pitchClassNormalized` works well as the hue source for accent colors when the underlying field is already hue-rotating slowly via time.
