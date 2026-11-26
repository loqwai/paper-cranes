# Signal conditioning: which number drives what

The difference between twitchy and musical is mostly which signal you feed in and how motion is
integrated. The full treatment is [docs/advanced-shader-techniques.md](../../../../docs/advanced-shader-techniques.md) §1-2;
feature independence is [docs/unique-feature-guide.md](../../../../docs/unique-feature-guide.md).
This page is the short version plus the traps those docs miss.

## The channel hierarchy

From `shaders/redaphid/wip/lattice-vj/HANDOFF.md` §2. Every violation there cost a live complaint.

| Channel | Takes | Never takes |
|---|---|---|
| Geometry (zoom, pan, rotation, fold and fractal parameters) | one-way clocks; his own knobs; one-way eased steps on drops | audio values, sines |
| Light and shading (rim, relief, lace thickness, sparks, local glow, chroma) | all the audio, through envelopes and smoothed levels | a whole-frame gain |
| Colour (base hue, palette) | medians, means, the slow set clock, rare drop mutations | z-scores, raw values, fast hue spin |

## Pick the variation by job

| Job | Use | Why |
|---|---|---|
| Size, thickness, intensity that should flow | `*Normalized`, or a controller's `*Spring` | 0-1, follows the music without jumps |
| Baseline mood, slow colour | `*Median`, `*Mean`, `pitchClassMedian`, `melodyFlow` (wavelet-ease) | changes over tens of seconds |
| A hit (punch, spark, glint) | `onsetKick`, `onsetSnare`, `onsetHat`, `onsetFull` | built-in attack/decay envelopes, no lag, no jitter |
| How hard the last hit was | `onsetKickStrength` | latched 0-1 |
| A custom curve after a hit | `onsetKickAge` (seconds since) | `exp(-age * 6.0)`, `step(age, 0.08)` |
| "Is this unusual?" (drop, spike) | `*ZScore` with a threshold, clamped | z-scores swing 0.12-0.17 per frame; never drive smooth motion with them |
| Build or drop trend | `energySlope * energyRSquared * 10.0` | slope alone is tiny and noisy |
| Pulse to the beat | `wavelet_bassHit`, `wavelet_punch` (`wavelet=true`) or onset envelopes | never the `beat` uniform |

Raw `spectralCrest`, `spectralRoughness` and `spectralEntropy` jump 0.12-0.17 per frame. Use
wavelet-ease's `*Smooth` versions or keep them on tiny local details.

## Gate the quiet

In silence the Normalized and z-score stats divide by a near-zero range and swing full scale. A
quiet room's noise then drives the picture, and quiet reads as brighter than loud.

```glsl
// Presence: 0 in silence, 1 once real music plays. clit-set's phone-mic gate (tuned at a club, 2026-11-22).
#define PRESENCE smoothstep(0.0008, 0.006, energy)
#define Z(x) (clamp(x, -1.0, 1.0) * PRESENCE)
```

- **Know the input level.** A phone mic gives energy 0.01-0.07. wavelet-ease's `quietGate` ramps
  from 0.015 to 0.065, so on a phone it sits around half open. If you use it, check its value at
  phone level before you trust it.
- Gate the audio term, not the whole look: in silence the shader still draws its resting picture and
  its clocks still run.

## Decorrelate from loudness

Bass, treble, flux and mids all rise when the music gets loud, so eight "different" features can
move as one. Subtract the energy z-score: full for bass and treble, half for flux and mids, none for
entropy, crest, pitch class, skew, rolloff and kurtosis. Pick features from different domains
(bands, spectral shape, spectral quality, temporal, tonal). The tested 8-feature set is in
[docs/unique-feature-guide.md](../../../../docs/unique-feature-guide.md).

## Clocks: the part GLSL cannot do

A shader has no memory between frames, so it cannot integrate `phase += rate * dt`. That decides a
lot.

- **Never put an audio value into `iTime * rate`.** When the rate changes, the angle jumps by
  `iTime * Δrate`, and that jump grows the longer the page runs: the spin appears to speed up over a
  set, and a fast-changing rate shivers.
- **Never put audio inside a phase.** `sin(r * 9.0 - iTime * LOUDNESS)` flashed black every other
  frame on plasma-event-horizon/3. Audio scales the amplitude of a traveling wave, never its phase.
- **`iTime` wraps at 1000 s** (`index.js`: `% 1000`). Any `iTime`-driven motion jumps every 16.7
  minutes unless its period divides 1000 s (200 s, 250 s, 500 s). Use `fract(iTime / 200.0)` style
  clocks or a controller clock.
- **`?time=T` holds only the `time` uniform.** `iTime` keeps running (measured 2026-11-25: two
  screenshots of plasma 1 s apart at `?time=5` differ, and match with `&iTime=5` added). For a still,
  pass both.
- **Shader-only motion:** constant-rate clocks from `iTime`, with audio on amplitude, thickness,
  light, chroma and thresholds. A traveling wave windowed so its seam is invisible:
  `amp * sin(phase * PI) * wave(x - phase)`.
- **When the music must change the speed**, use a controller clock: wavelet-ease gives `spinPhase`,
  `morphPhase`, `flowPhase`, `huePhase` (monotonic) and `evoPhase` (minutes-scale, frozen in
  silence); clit-set gives `cs_flow`, `cs_drift`, `cs_beat` (+1 per kick, eased), `cs_jump`
  (+1 per drop). A kick steps a clock forward; it never adds a transient to a phase.
- **Guard an unbounded accumulator in a rate term.** A coefficient is only valid at the level where
  you measured it, and rooms get louder: `evoPhase * 25` was 70% of the way to running the zoom
  backward 25 minutes after it was written. Clamp it against something that grows the same way
  (HANDOFF §5).

## Light that reads without strobing

- **Local, not global.** Raise rims, lace, sparks and relief. Leave the frame's overall gain alone.
- **Luminance-neutral beats.** On clit-vibej the kick's hue step and chroma lift are scaled back to
  each pixel's luminance, so the flicker meter stays quiet while the colour still punches.
- **One soft knee for the whole frame**, hue-preserving, applied once at the end, so loud passages
  raise contrast instead of lifting everything.
- **Size the reaction for the back of the room**: start at 3-5x what feels tasteful, then back off
  only if he says "too flashy".

## A conditioning block to start from

```glsl
// ---- conditioned inputs (one place to retune) --------------------------------------------------
#define PRESENCE   smoothstep(0.0008, 0.006, energy)
#define KICK       (onsetKick * PRESENCE)                          // envelope: punch, rim flash
#define SNARE      (onsetSnare * PRESENCE)                         // sparks
#define HAT        (onsetHat * PRESENCE)                           // glints
#define BODY       (bassNormalized * PRESENCE)                     // sustained bass: breathing
#define BRIGHTNESS_MOOD spectralCentroidMedian                     // slow: palette warmth
#define TEXTURE    (clamp(spectralRoughnessZScore - energyZScore * 0.3, -1.0, 1.0) * PRESENCE)
#define HUE_BASE   (pitchClassMedian * 0.15 + seed * 0.2)          // slow, per-device
```
