---
name: knobify
description: Convert a shader's audio-reactive parameters into knob-controlled #defines with commented-out audio alternatives. Takes a shader path as input, or defaults to the shader modified in the git worktree.
allowed-tools: Bash Read Write Edit Grep Glob Agent
---

# Knobify a Shader

Transform a shader so its tunable parameters use `knob_*` uniforms, with commented-out audio-reactive `#define` alternatives for quick switching.

## Context

Target shader (from arguments or git diff):
!`if [ -n "$ARGUMENTS" ]; then echo "$ARGUMENTS"; else git diff --name-only HEAD | grep '\.frag$' | head -1 || git diff --cached --name-only | grep '\.frag$' | head -1 || echo "(no .frag files modified in worktree)"; fi`

Highest knob number already used across all shaders (to avoid collisions):
!`grep -roh 'knob_[0-9]\+' shaders/ 2>/dev/null | sed 's/knob_//' | sort -n | tail -1 || echo "0"`

## Determine the target shader

1. If `$ARGUMENTS` contains a path to a `.frag` file, use that.
2. Otherwise, find the first `.frag` file modified in the git worktree (`git diff --name-only HEAD`).
3. If neither yields a result, ask the user which shader to knobify.

## Steps

Read the target shader fully before making any changes.

### 1. Identify tunable parameters

Scan the shader for values that control the visual output and would benefit from live tweaking. These include:

- **Inline magic numbers** used for visual parameters (radii, speeds, thresholds, intensities, decay rates, color offsets, scale factors, etc.)
- **Audio feature references** used directly in expressions (e.g., `bassNormalized * 0.5`, `spectralCentroidZScore`)
- **Existing `#define` macros** that wrap audio features or constants
- **Hardcoded blend factors**, zoom amounts, feedback strengths, iteration counts mapped from floats
- **Raw `knob_*` uniforms used directly in the shader body** (e.g., `knob_71 * 0.5` inline in a function) — these must be refactored behind `#define` macros too

Do NOT knobify:
- Mathematical constants (`PI`, `TAU`, `EPSILON`)
- Resolution/UV calculations
- Structural constants (`MAX_STEPS`, loop bounds that must be compile-time integers)
- Time references (`iTime`, `time`) unless they're scaling time speed

### 2. Extract parameters into `#define` block

Create a clearly marked section near the top of the shader (after `#version` and `precision` declarations, before any functions). Group related parameters with comments:

```glsl
// ============================================================================
// KNOB CONTROLS
// Each knob is 0-1. Uncomment audio lines to switch back to audio-reactive.
// Test: ?shader=<name>&knob_1=0.5&knob_2=0.8&noaudio=true
// ============================================================================
```

### 3. Map to knob uniforms

For each parameter, create a `#define` that uses a `knob_*` uniform. Use `mapValue()` when the parameter needs a range other than 0-1:

```glsl
// Warp depth: 0=subtle, 1=heavy
#define WARP_DEPTH mapValue(knob_1, 0., 1., 0.3, 0.8)
// #define WARP_DEPTH mapValue(bassNormalized, 0., 1., 0.3, 0.8)
```

For simple 0-1 parameters, direct assignment is fine:
```glsl
#define COLOR_MIX (knob_2)
// #define COLOR_MIX (spectralCentroidNormalized)
```

### 4. Comment out audio alternatives

Every knob `#define` must have a commented-out audio-reactive version directly below it. Include a brief comment explaining what the knob controls and what 0 vs 1 means:

```glsl
// God ray intensity: 0=none, 1=blinding
#define GODRAY_INTENSITY mapValue(knob_3, 0., 1., 1.0, 4.0)
// #define GODRAY_INTENSITY mapValue(energyNormalized, 0., 1., 1.0, 4.0)
```

### 5. Choose good audio feature mappings for the commented alternatives

When creating the audio alternative, pick features from **different domains** (see CLAUDE.md Feature Independence Matrix). The commented-out audio mapping should make musical sense:

- Visual intensity/size/brightness -> `energy`, `bass`, `mids`, `treble` (frequency bands)
- Color/hue shifts -> `pitchClass`, `spectralCentroid` (tonal)
- Complexity/chaos -> `spectralEntropy`, `spectralRoughness` (quality)
- Motion/speed -> `spectralFlux` (temporal)
- Width/spread -> `spectralSpread`, `spectralRolloff` (shape)

Use the appropriate statistical variation:
- **Normalized** for smooth 0-1 modulation
- **ZScore** for detecting spikes, drops, anomalies
- **Slope** + **RSquared** for trend detection (builds/drops)

### 6. Assign knob numbers

- **Preserve existing knob numbers.** If the shader already uses `knob_72`, keep it as `knob_72`.
- For newly created knob parameters (from audio features or magic numbers that didn't have knobs before), start from `knob_1` and number sequentially, skipping any numbers already in use.
- Add a knob index comment block at the top of the knob section listing all assignments:

```glsl
// knob_1: warp depth (0=subtle, 1=heavy)
// knob_2: color mix (0=cool, 1=warm)
// knob_72: ripple frequency (0=wide, 1=tight)  [preserved from original]
```

### 7. Refactor bare `knob_*` references

If the shader already uses `knob_*` uniforms directly in the body (e.g., `float x = knob_72 * 0.3;`), refactor each one:

1. Create a descriptive `#define` name based on what the knob controls in context (read the surrounding code to understand its purpose)
2. Move the knob reference into the `#define` block with the others
3. Add a commented-out audio alternative
4. **Keep the original knob number** — do NOT renumber. If the shader uses `knob_72`, the `#define` should still reference `knob_72`.
5. Replace the inline usage with the new `#define` name

**Before:**
```glsl
float ripple = sin(d * knob_72 * 10.0);
col += glow * knob_78;
```

**After (in #define block):**
```glsl
// Ripple frequency: 0=wide, 1=tight
#define RIPPLE_FREQ mapValue(knob_72, 0., 1., 2.0, 10.0)
// #define RIPPLE_FREQ mapValue(spectralCentroidNormalized, 0., 1., 2.0, 10.0)

// Glow strength: 0=none, 1=full
#define GLOW_STRENGTH (knob_78)
// #define GLOW_STRENGTH (energyNormalized)
```

**After (in body):**
```glsl
float ripple = sin(d * RIPPLE_FREQ);
col += glow * GLOW_STRENGTH;
```

### 8. Replace remaining inline usages

Replace all other inline occurrences of extracted values with the new `#define` names. The body of the shader should reference the `#define` macros, not raw knob uniforms or audio features directly.

### 9. Generate a preset URL

Add a comment near the top of the knob controls block with a test URL that sets all knobs to values approximating the shader's original look. This lets someone load the knobified shader and see roughly the same visual as before.

To determine default values:
- For knobs that replaced a constant (e.g., `#define HUE_BASE 0.78` → `knob_20`): reverse the mapping. If using `mapValue(knob_20, 0., 1., 0.0, 1.0)`, set `knob_20=0.78`.
- For knobs that replaced audio features with typical mid-range values: use ~0.3-0.5 as a reasonable default.
- For knobs that replaced z-scores (which hover near 0 in calm audio): use 0.0 or a low value.
- For on/off style knobs (triggers, booleans): use 0.0 (off).

Format:
```glsl
// Test: ?shader=<path>&knob_1=0.5&knob_2=0.3&...&noaudio=true
```

Keep it on one line if possible. If there are many knobs, it's OK to wrap or split across lines.

## Quality checks

Before finishing:
- Every `#define` that uses a knob has a commented-out audio alternative
- No audio features are referenced directly in the shader body (they should all go through `#define` macros)
- Knob numbers are sequential starting from 1 (or continuing from existing knobs)
- The knob index comment block matches the actual `#define` assignments
- No structural constants or math constants were accidentally knobified
- `mapValue` ranges make sense (outMin < outMax, reasonable aesthetic range)
