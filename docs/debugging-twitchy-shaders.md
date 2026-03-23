# Debugging Twitchy Shaders

A "twitchy" shader is one where the visuals jerk, flash, stutter, or move erratically with the music instead of flowing. The audio is driving the visuals, but it feels wrong — reactive without being musical.

This guide covers how to diagnose the root cause and fix it.

---

## Table of Contents

1. [Recognize the Symptom](#recognize-the-symptom)
2. [Root Causes](#root-causes)
3. [Diagnosis Workflow](#diagnosis-workflow)
4. [Fixes by Cause](#fixes-by-cause)
5. [The Query Param Test Kit](#the-query-param-test-kit)

---

## Recognize the Symptom

Twitchiness shows up in a few distinct forms:

| Symptom | Likely Cause |
|---------|-------------|
| Visuals flash white or blow out on every beat | Additive energy stacking, no clamp |
| Elements jerk to random positions frame-to-frame | Using raw or zScore values for position/scale |
| Everything moves in sync — no variety between elements | Correlated features, all tracking energy |
| Visuals are calm then suddenly chaotic (or vice versa) | zScore used for smooth modulation |
| Flicker even with `?noaudio=true` | Time-based instability, not audio |

---

## Root Causes

### 1. Wrong statistical variation for the job

`zScore` is designed to be spiky — it fires hard on anomalies and is near-zero during "normal" audio. Using it for smooth continuous modulation will cause jitter.

```glsl
// Twitchy: zScore spikes on beats, near-zero otherwise
float radius = 0.5 + bassZScore * 0.4;

// Smooth: normalized tracks the relative energy level over time
float radius = 0.5 + bassNormalized * 0.4;
```

**Rule:** Use `Normalized` for smooth modulation. Use `ZScore` only for event detection (beats, drops, spikes).

### 2. Additive energy stacking

When you add multiple energy-correlated features together and map the sum to brightness/alpha/scale, you get luminance blowout on every loud moment.

```glsl
// Blows out: all three terms spike together when music is loud
float brightness = bassNormalized + energyNormalized + spectralFluxNormalized;
```

Each term hits ~1.0 simultaneously, so `brightness` reaches 3.0. Fix by multiplying instead of adding, or dividing by the count, or clamping:

```glsl
// Bounded: product stays 0-1 even when all are high
float brightness = bassNormalized * energyNormalized;

// Or: explicit average
float brightness = (bassNormalized + energyNormalized + spectralFluxNormalized) / 3.0;

// Or: explicit clamp
float brightness = clamp(bassNormalized + midsNormalized, 0.0, 1.0);
```

### 3. Direct position/scale mapping without damping

Mapping audio directly to position or scale with no smoothing causes frame-to-frame jumps:

```glsl
// Jittery: position jumps every frame with the audio
vec2 pos = vec2(bassZScore * 0.5, trebleZScore * 0.3);

// Smooth: feed through frame feedback to damp the motion
vec2 prevPos = getLastFrameColor(uv).xy;  // encode pos in previous frame
vec2 targetPos = vec2(bassNormalized * 0.5, trebleNormalized * 0.3);
vec2 pos = mix(prevPos, targetPos, 0.1);  // only 10% of the way each frame
```

### 4. All features track the same signal

If every visual element responds to energy-correlated features (`bass`, `energy`, `spectralFlux` together), they all pulse in sync. The shader feels monotonous and hyperactive at the same time.

Fix: decorrelate features from energy, and pick from different domains. See [unique-feature-guide.md](unique-feature-guide.md).

```glsl
// All spike with loudness — effectively 1 feature drawn 3 times
#define A bassZScore
#define B energyZScore
#define C spectralFluxZScore

// Independent signals with different characters
#define A (bassZScore - energyZScore)          // Bass CHARACTER, not loudness
#define B spectralEntropyNormalized            // Complexity (independent of energy)
#define C pitchClassNormalized                 // Which note (totally independent)
```

### 5. Frame feedback accumulating to white

`mix(prev, new, 0.1)` decays the previous frame by 10% each frame — but if `new` is consistently bright, the frame accumulates to white over seconds.

```glsl
// Accumulates if newColor is bright for a sustained period
vec3 color = mix(prev, newColor, 0.1);

// Add a small decay factor to prevent runaway accumulation
vec3 color = mix(prev * 0.98, newColor, 0.1);
```

### 6. The audio pipeline itself is jittery

If the shader looks bad even with clean audio-reactive values, the source data may be the problem. Too-small FFT size or too-low smoothing makes the raw audio noisy.

Check via query params:
```
?fft_size=4096&smoothing=0.15   # Default — usually fine
?fft_size=2048&smoothing=0.08   # Noisy — may cause shader jitter
```

Increase smoothing or FFT size to stabilize the input signal.

---

## Diagnosis Workflow

### Step 1: Isolate audio vs time

Add `?noaudio=true` to disable audio input. If the shader is still twitchy, the issue is in your time-based math (not audio). Fix there first.

### Step 2: Freeze the audio with query params

Use URL params to simulate a stable audio state and confirm the shader looks correct at rest:

```
?noaudio=true&bassMedian=0.3&energyMedian=0.4&spectralEntropyMedian=0.5
```

If the shader looks broken even at these steady values, you have a logic/math issue.

### Step 3: Use the #define swap pattern to isolate variables

Comment out one audio-reactive `#define` at a time, replacing it with a constant:

```glsl
// Active: audio-reactive (potentially twitchy)
#define SCALE_MOD (bassZScore * 0.3)
// #define SCALE_MOD 0.1

// Active: frozen constant (for diagnosis)
// #define SCALE_MOD (bassZScore * 0.3)
#define SCALE_MOD 0.1
```

Swap them one by one until you find the variable causing the jitter.

### Step 4: Check for value range issues

Log uniform values by encoding them as colors temporarily:

```glsl
// Debugging: map a value to red channel to see its range
fragColor = vec4(bassZScore * 0.5 + 0.5, 0.0, 0.0, 1.0);
// A stable mid-gray = value near 0. Flashing bright red = spikes.
// Remapping by * 0.5 + 0.5 centers zScore's -1..1 range to 0..1
```

### Step 5: Simulate different music profiles

Test these URL param profiles to see how the shader behaves across musical contexts:

```
# Silent
?noaudio=true

# Heavy bass drop
?noaudio=true&bassNormalized=0.9&energyNormalized=0.85&bassZScore=0.8

# Bright and chaotic
?noaudio=true&trebleNormalized=0.8&spectralEntropyNormalized=0.9&spectralFluxNormalized=0.7

# Confident build (rising energy with steady trend)
?noaudio=true&energySlope=0.002&energyRSquared=0.8&energyNormalized=0.6

# Energy drop
?noaudio=true&energySlope=-0.003&energyRSquared=0.75&energyNormalized=0.2
```

A good shader should look different but coherent across all of these — not white-out on the bass drop or go dead on silence.

---

## Fixes by Cause

### Fix 1: Replace zScore with Normalized for modulation

| Before (twitchy) | After (smooth) |
|------------------|----------------|
| `bassZScore * 0.5` | `bassNormalized * 0.5` |
| `energyZScore + 0.5` | `energyNormalized` |
| `spectralFluxZScore * scale` | `spectralFluxNormalized * scale` |

Keep `ZScore` only where you want event detection:
```glsl
if (energyZScore > 0.5) { /* beat! */ }  // Good use of zScore
float scale = energyZScore * 0.5;         // Bad — use Normalized instead
```

### Fix 2: Add frame feedback as a low-pass filter

Wrap any fast-moving value in a feedback mix to smooth it over time:

```glsl
// Without feedback: jumps every frame
float brightness = energyNormalized;

// With feedback: exponential moving average
// (requires encoding the value into a previous-frame channel)
float prev = getLastFrameColor(uv).a;  // store brightness in alpha
float brightness = mix(prev, energyNormalized, 0.08);
```

For colors, the same pattern applies:
```glsl
vec3 prev = getLastFrameColor(uv).rgb;
vec3 target = computeColor();
vec3 color = mix(prev * 0.97, target, 0.12);  // decay + blend
```

### Fix 3: Use mean/median as a stable baseline

Instead of directly using the current value, offset from the historical baseline:

```glsl
// Reacts to current moment but anchored to average character
float intensity = bassMean + (bassNormalized - bassMean) * 0.5;

// Use median as a low-noise baseline for structural parameters
float structureSize = 0.3 + bassMedian * 0.4;
```

### Fix 4: Clamp everything that feeds into color

Before the final color output, clamp or saturate:

```glsl
vec3 color = computeColor();
color = clamp(color, 0.0, 1.0);       // Hard clamp
// or
color = color / (1.0 + color);        // Soft tonemap (Reinhard)
fragColor = vec4(color, 1.0);
```

### Fix 5: Scale slope values before use

Raw slope values are tiny (they represent per-frame deltas). Multiply by 5-20 before using them visually, and gate with rSquared:

```glsl
// Raw slope: ~0.0001 to ~0.001 range — nearly invisible
#define BAD_TREND energySlope

// Scaled + confidence-gated: actually useful
#define ENERGY_TREND (energySlope * energyRSquared * 15.0)
```

---

## The Query Param Test Kit

Paste these into your browser URL bar (after the `?shader=your-shader`) to stress-test your shader without needing to play music:

```
# Absolute silence
&noaudio=true&bassNormalized=0&energyNormalized=0&trebleNormalized=0

# Average electronic music
&noaudio=true&bassNormalized=0.5&energyNormalized=0.5&midsNormalized=0.4&spectralEntropyNormalized=0.4

# Hard bass hit
&noaudio=true&bassNormalized=0.95&energyNormalized=0.9&bassZScore=1.0&energyZScore=0.9&beat=1

# Bright airy pad
&noaudio=true&trebleNormalized=0.8&spectralEntropyNormalized=0.85&bassNormalized=0.1&energyNormalized=0.3

# Building section (rising trend, high confidence)
&noaudio=true&energySlope=0.003&energyRSquared=0.85&energyNormalized=0.55&bassNormalized=0.6

# Breakdown (low energy, chaotic trend)
&noaudio=true&energyNormalized=0.15&energyRSquared=0.1&spectralEntropyNormalized=0.9
```

A shader that passes all six profiles — looks distinct in each, never whites out, never goes to black — is ready for live audio.
