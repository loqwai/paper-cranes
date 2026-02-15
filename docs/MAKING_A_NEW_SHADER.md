# Creating New Shaders for Paper Cranes

This guide explains how to create music-reactive WebGL visualizations for the Paper Cranes system. These shaders run in the browser, react to audio input, and can be used to drive LED lights (Hue, Nanoleaf) through screen scraping.

## Table of Contents

1. [System Overview](#system-overview)
2. [Shader Basics](#shader-basics)
3. [Available Uniforms](#available-uniforms)
4. [Utility Functions](#utility-functions)
5. [Audio Feature Deep Dive](#audio-feature-deep-dive)
6. [Design Patterns](#design-patterns)
7. [Common Techniques](#common-techniques)
8. [Testing Your Shader](#testing-your-shader)
9. [Common Pitfalls](#common-pitfalls)
10. [Example Shaders to Study](#example-shaders-to-study)

---

## System Overview

Paper Cranes is a real-time music visualization system that:

1. Captures audio from the microphone
2. Performs FFT analysis and extracts 14 audio features
3. Passes features as uniforms to GLSL fragment shaders
4. Renders at 60fps with WebGL2
5. Supports frame feedback (previous frame access) for temporal effects

The shader files live in `/shaders/` and are loaded via query parameter: `?shader=filename` (without `.frag` extension).

---

## Shader Basics

### File Structure

Create a `.frag` file in the `/shaders/` directory. The system uses a ShaderToy-compatible format:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // fragCoord: pixel coordinates (0 to iResolution.xy)
    // fragColor: output color (RGBA, 0.0 to 1.0)

    vec2 uv = fragCoord / iResolution.xy;  // Normalized 0-1
    fragColor = vec4(uv.x, uv.y, 0.5, 1.0);
}
```

### Coordinate Systems

```glsl
// Normalized UV (0 to 1, origin bottom-left)
vec2 uv = fragCoord / iResolution.xy;

// Centered UV (-0.5 to 0.5, origin center)
vec2 centered = uv - 0.5;

// Aspect-corrected centered (-aspect to aspect, -1 to 1)
vec2 aspectCorrected = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
```

---

## Available Uniforms

### Core Uniforms

| Uniform | Type | Description |
|---------|------|-------------|
| `iTime` | float | Time in seconds since start |
| `iResolution` | vec3 | Screen resolution (width, height, 0) |
| `iFrame` | int | Frame counter |
| `iMouse` | vec4 | Mouse position and click state |
| `time` | float | Alias for iTime |
| `resolution` | vec2 | Screen size (x, y) |
| `frame` | int | Alias for iFrame |

### Texture Samplers

| Uniform | Description |
|---------|-------------|
| `iChannel0-3` | Texture samplers (ShaderToy compatibility) |
| `prevFrame` | Previous frame texture (for feedback effects) |
| `initialFrame` | First frame / fallback texture |

### Audio Feature Uniforms

Each of the 14 audio features has 11 statistical variations, giving 154 audio uniforms total. See [Audio Feature Deep Dive](#audio-feature-deep-dive) for details.

**The 14 core features:**
- `bass`, `mids`, `treble` (frequency bands)
- `energy` (overall loudness)
- `pitchClass` (detected note 0-11, normalized to 0-1)
- `spectralCentroid`, `spectralSpread`, `spectralSkew`, `spectralKurtosis` (spectral shape)
- `spectralFlux` (rate of timbral change)
- `spectralRolloff` (high frequency cutoff)
- `spectralRoughness` (dissonance)
- `spectralEntropy` (chaos/unpredictability)
- `spectralCrest` (peakiness)

**Statistical variations for each feature:**
- `bass` - raw value
- `bassNormalized` - min-max normalized to 0-1
- `bassMean` - historical average
- `bassMedian` - historical median
- `bassMin`, `bassMax` - historical range
- `bassStandardDeviation` - variability
- `bassZScore` - standardized (-1 to 1 roughly), detects anomalies
- `bassSlope` - linear regression slope (is bass rising or falling over the history window?)
- `bassIntercept` - regression intercept (predicted value at start of window)
- `bassRSquared` - regression fit (0-1, how steady/linear the trend is)

### Special Uniforms

| Uniform | Type | Description |
|---------|------|-------------|
| `beat` | bool | True when beat detected |
| `iRandom` | float | Random value that changes each frame |
| `touch` | vec2 | Touch/mouse position (normalized 0-1) |
| `touched` | bool | Whether user is touching/clicking |
| `knob_1` to `knob_200` | float | MIDI controller knobs (0-1) |

---

## Utility Functions

These are auto-injected and available in all shaders:

### Color Conversion

```glsl
// HSL
vec3 hsl2rgb(vec3 hsl)           // HSL to RGB
vec3 rgb2hsl(vec3 rgb)           // RGB to HSL
vec3 hslmix(vec3 c1, vec3 c2, float t)  // Mix colors in HSL space

// Oklab — perceptual color space, better gradients than HSL or RGB
vec3 rgb2oklab(vec3 c)           // RGB to Oklab (L, a, b)
vec3 oklab2rgb(vec3 lab)         // Oklab to RGB
vec3 oklabmix(vec3 c1, vec3 c2, float t)  // Mix in Oklab space

// Oklch — polar form of Oklab, best for hue rotation
// vec3(L, C, h) where L=lightness(0-1), C=chroma(0-~0.37), h=hue(radians)
vec3 rgb2oklch(vec3 c)           // RGB to Oklch
vec3 oklch2rgb(vec3 lch)         // Oklch to RGB
vec3 oklab2oklch(vec3 lab)       // Oklab to Oklch
vec3 oklch2oklab(vec3 lch)       // Oklch to Oklab
vec3 oklchmix(vec3 c1, vec3 c2, float t)  // Mix with shortest-path hue interpolation
```

All color functions have vec4 overloads that pass alpha through.

#### When to Use Which Color Space

| Task | Best Space | Why |
|------|-----------|-----|
| Hue rotation | Oklch | Just add to `h` — perceptually uniform |
| Color mixing/gradients | Oklch or Oklab | No unexpected dark bands like HSL |
| Boost saturation | Oklch | Scale `C` without affecting lightness |
| Brighten without washing out | Oklch | Change `L` only |
| Create a color from L/C/hue | Oklch | `oklch2rgb(vec3(0.7, 0.15, angle))` |
| Quick additive glow | RGB | `col += glow` (oklch breaks with additive) |
| Simple lerp (mask on/off) | RGB | `mix(bg, col, mask)` is fine |

#### Oklch Quick Reference
```glsl
// Rotate hue
vec3 lch = rgb2oklch(color);
lch.z += 1.0;  // rotate ~57 degrees
color = oklch2rgb(lch);

// Boost saturation
lch.y *= 1.5;

// Brighten
lch.x = min(lch.x + 0.1, 1.0);

// Create vivid color from scratch
vec3 col = oklch2rgb(vec3(0.7, 0.15, 1.0));  // bright, vivid, yellow-green hue

// Mix two colors with proper hue interpolation
vec3 result = oklchmix(red, blue, 0.5);  // goes through purple, not grey
```

### Previous Frame Access

```glsl
vec4 getLastFrameColor(vec2 uv)    // Sample previous frame (UV 0-1)
vec4 getInitialFrameColor(vec2 uv) // Sample initial frame
```

### Random Numbers

```glsl
float random(vec2 st, float seed)  // Deterministic random with seed
float random(vec2 st)              // Random using iRandom
float staticRandom(vec2 st)        // Consistent random (seed=0)
```

### Value Mapping

```glsl
float mapValue(float val, float inMin, float inMax, float outMin, float outMax)
// Remaps value from input range to output range with clamping
```

### UV Utilities

```glsl
vec2 centerUv(vec2 res, vec2 coord)  // Center coordinates
vec2 centerUv(vec2 coord)            // Using global resolution
```

### Animation & Easing

```glsl
float pingpong(float t)              // Oscillates 0→1→0
float animateSmooth(float t)         // Cubic smoothstep
float animateBounce(float t)         // Bouncing animation
float animatePulse(float t)          // Sine wave pulse

// Easing functions (all take t from 0-1):
float animateEaseInQuad(float t)
float animateEaseOutQuad(float t)
float animateEaseInOutQuad(float t)
float animateEaseInCubic(float t)
float animateEaseOutCubic(float t)
float animateEaseInOutCubic(float t)
float animateEaseInExpo(float t)
float animateEaseOutExpo(float t)
float animateEaseInOutExpo(float t)
float animateEaseInSine(float t)
float animateEaseOutSine(float t)
float animateEaseInOutSine(float t)
float animateEaseInElastic(float t)
float animateEaseOutElastic(float t)
float animateEaseInOutElastic(float t)
```

---

## Audio Feature Deep Dive

### When to Use Each Statistical Variation

| Variation | Use Case | Example |
|-----------|----------|---------|
| `Normalized` | Smooth 0-1 modulation | `bassNormalized * 0.5` for half-intensity effect |
| `ZScore` | Detect spikes, drops, anomalies | `if (energyZScore > 0.5)` for detecting loud moments |
| `Mean/Median` | Baseline behavior, slow changes | Background color based on `spectralCentroidMean` |
| `Min/Max` | Historical context | Scale effects relative to `bassMax` |
| `StandardDeviation` | Detect stability vs volatility | More chaos when `energyStandardDeviation` high |
| `Slope` | Detect rising/falling trends | `energySlope > 0.0` = energy building up over time |
| `Intercept` | Trend baseline/extrapolation | Use with slope to predict where a feature is heading |
| `RSquared` | Trend confidence (0-1) | `energyRSquared > 0.5` = steady trend, not chaotic noise |
| Raw value | Direct analysis (less common) | Usually prefer Normalized |

### Feature Independence

**Good pairings (independent, use together for variety):**
- `bass` + `treble` (opposite frequency ranges)
- `spectralCentroid` + `spectralRoughness` (pitch vs dissonance)
- `spectralEntropy` + `spectralCrest` (chaos vs peakiness)
- `spectralFlux` + `spectralRolloff` (change rate vs cutoff)
- `pitchClass` + `spectralKurtosis` (pitch vs distribution shape)

**Bad pairings (correlated, avoid using together):**
- `energy` + `bass` (both increase with loud low frequencies)
- `spectralCentroid` + `pitchClass` (both relate to pitch)
- `spectralSpread` + `spectralEntropy` (wider = more complex)

### Feature Domains

Choose features from DIFFERENT domains for variety:

| Domain | Features |
|--------|----------|
| Frequency Bands | `bass`, `mids`, `treble` |
| Spectral Shape | `spectralCentroid`, `spectralSpread`, `spectralSkew`, `spectralKurtosis` |
| Spectral Quality | `spectralRoughness`, `spectralEntropy`, `spectralCrest` |
| Temporal | `spectralFlux` |
| Tonal | `pitchClass`, `spectralRolloff` |
| Energy | `energy` |

---

## Design Patterns

### Pattern 1: Slow Evolution (Recommended for LED sync)

For visuals that will drive LED lights, avoid rapid changes. Use heavy feedback blending:

```glsl
// Get previous frame
vec3 prev = getLastFrameColor(uv).rgb;

// Compute new color
vec3 newColor = /* your fractal/effect */;

// Blend heavily toward previous (90% old, 10% new)
vec3 color = mix(prev, newColor, 0.1);
```

### Pattern 2: Audio Affects Structure, Not Color

Map audio to structural parameters rather than directly to color for smoother results:

```glsl
// GOOD: Audio affects fractal parameters
#define WARP_DEPTH mapValue(bassNormalized, 0., 1., 0.3, 0.8)
#define SPIRAL_TIGHTNESS mapValue(spectralCentroidNormalized, 0., 1., 1.2, 3.5)

// AVOID: Audio directly controlling color
vec3 color = vec3(bassNormalized, trebleNormalized, midsNormalized); // Too flashy
```

### Pattern 3: Use ZScores for Events, Normalized for Modulation

```glsl
// ZScore for detecting moments (drops, spikes)
if (energyZScore > 0.5) {
    // Something special happens
}

// Normalized for smooth continuous modulation
float radius = 0.5 + spectralCentroidNormalized * 0.3;
```

### Pattern 4: Trend-Aware Evolution with Linear Regression

Use `Slope`, `Intercept`, and `RSquared` to make visuals that respond to *where the music is heading*, not just where it is now:

```glsl
// Slope: positive = rising, negative = falling
// Use it to drive evolution direction
#define EVOLVE_DIRECTION (energySlope * 10.0)  // Scale up — raw slope values are small

// RSquared: 0 = chaotic, 1 = steady trend
// Use it to control confidence/stability of the visual response
#define TREND_CONFIDENCE (energyRSquared)

// Combine: only evolve strongly when trend is confident
#define CONFIDENT_EVOLUTION (energySlope * energyRSquared * 10.0)

// Detect musical sections:
// Confident build = positive slope + high rSquared
// Confident drop = negative slope + high rSquared
// Chaos/transition = low rSquared (any slope)
#define IS_BUILDING (energySlope > 0.001 && energyRSquared > 0.4)
#define IS_DROPPING (energySlope < -0.001 && energyRSquared > 0.4)
#define IS_CHAOTIC (energyRSquared < 0.2)

// Different features have different trend meanings:
#define GETTING_BRIGHTER (spectralCentroidSlope > 0.0)   // Timbre brightening
#define BASS_BUILDING (bassSlope > 0.0)                  // Low-end building
#define TEXTURE_EVOLVING (spectralEntropySlope)           // Complexity changing
```

**Key insight:** `Slope` values are small (they represent change per history-window index), so multiply by 5-20 to get useful visual ranges. `RSquared` is already 0-1 and works well as a confidence gate.

### Pattern 5: Incommensurate Frequencies for Aperiodic Motion

Use irrational ratios (golden ratio, sqrt(2), etc.) to prevent repetitive loops:

```glsl
#define PHI 1.61803398875

// These will never sync up, creating endless variation
float x = sin(iTime * 0.13);
float y = cos(iTime * 0.17 * PHI);
float z = sin(iTime * 0.11 * sqrt(2.0));
```

### Pattern 6: Layered Fractals

Combine multiple fractal calculations at different scales:

```glsl
vec4 layer1 = fractalFunction(uv, time);
vec4 layer2 = fractalFunction(uv * 2.1, time * PHI);
vec4 layer3 = fractalFunction(uv * 0.5, time * 0.7);

// Blend based on fractal depth/characteristics
vec3 color = mix(mix(color1, color2, blend2), color3, blend3);
```

---

## Common Techniques

### 2D Rotation Matrix

```glsl
mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// Usage
vec2 rotatedUV = rot(iTime * 0.1) * uv;
```

### Complex Number Operations

```glsl
vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

vec2 cdiv(vec2 a, vec2 b) {
    float d = dot(b, b);
    return vec2(a.x*b.x + a.y*b.y, a.y*b.x - a.x*b.y) / d;
}

vec2 cpow(vec2 z, float n) {
    float r = length(z);
    float theta = atan(z.y, z.x);
    return pow(r, n) * vec2(cos(n*theta), sin(n*theta));
}
```

### Julia Set Fractal

```glsl
vec2 julia(vec2 z, vec2 c, int maxIter) {
    for (int i = 0; i < maxIter; i++) {
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        if (dot(z, z) > 4.0) break;
    }
    return z;
}
```

### Orbit Trap Coloring

Track minimum distances during iteration for smooth coloring:

```glsl
float minDist = 1e10;
vec2 z = startZ;
for (int i = 0; i < maxIter; i++) {
    z = iterate(z);
    minDist = min(minDist, abs(z.x));  // Line trap
    // or: minDist = min(minDist, length(z - trapPoint));  // Point trap
}
float color = exp(-minDist * 10.0);  // Glow effect
```

### Domain Warping with FBM

```glsl
float noise(vec2 p) { /* your noise function */ }

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Warp coordinates
vec2 warpedUV = uv + vec2(fbm(uv * 3.0), fbm(uv * 3.0 + 5.0)) * 0.3;
```

### Cosine Palette

```glsl
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

// Rich preset
vec3 color = palette(t,
    vec3(0.5), vec3(0.5), vec3(1.0),
    vec3(0.0, 0.1, 0.2));
```

### Kaleidoscope Effect

```glsl
vec2 kaleidoscope(vec2 uv, float segments) {
    float angle = atan(uv.y, uv.x);
    float segment = 6.28318 / segments;
    angle = mod(angle + segment * 0.5, segment) - segment * 0.5;
    angle = abs(angle);
    return vec2(cos(angle), sin(angle)) * length(uv);
}
```

### Smooth Minimum (for blending shapes)

```glsl
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}
```

---

## Testing Your Shader

### Local Development

```bash
npm run dev  # Starts server on localhost:6969
```

Access your shader: `http://localhost:6969/?shader=your-shader-name`

### Query Parameters for Testing

| Parameter | Description | Example |
|-----------|-------------|---------|
| `shader` | Shader file to load | `?shader=fractal-abyss` |
| `noaudio` | Disable audio (use defaults) | `?shader=test&noaudio` |
| `fft_size` | FFT window size | `?fft_size=2048` |
| `smoothing` | Audio smoothing factor | `?smoothing=0.2` |

### Debug Tips

1. **Check browser console** for shader compilation errors
2. **Start simple** - get basic output before adding complexity
3. **Test without audio** first using `?noaudio`
4. **Visualize individual features** to understand their behavior:

```glsl
// Debug: visualize a single audio feature
fragColor = vec4(vec3(bassNormalized), 1.0);
```

---

## Common Pitfalls

### 1. White-Out / Blown Highlights

**Problem:** Colors exceed 1.0 and clip to white.

**Solution:** Use tone mapping:
```glsl
color = color / (1.0 + color * 0.3);  // Soft clamp
color = clamp(color, 0.0, 1.0);
```

### 2. Rapid Color Flashing

**Problem:** Colors change too quickly, especially with audio.

**Solutions:**
- Use heavy feedback blending (90%+ previous frame)
- Map audio to structure, not color directly
- Use `Normalized` instead of `ZScore` for color
- Slow down time: `float t = iTime * 0.3;`

### 3. Division by Zero

**Problem:** `NaN` or `Inf` from dividing by zero.

**Solution:** Always protect divisions:
```glsl
float d = max(dot(z, z), 0.0001);
float result = x / d;
```

### 4. Log of Zero/Negative

**Problem:** `log()` of zero or negative produces `NaN`.

**Solution:**
```glsl
float safeLog = log(max(value, 0.0001));
```

### 5. Feedback Accumulation Drift

**Problem:** Colors drift toward white or black over time with feedback.

**Solution:** Gently pull toward target values:
```glsl
vec3 prevHSL = rgb2hsl(prev);
prevHSL.y = mix(prevHSL.y, 0.6, 0.01);  // Pull saturation to 0.6
prevHSL.z *= 0.995;  // Slight darkening to prevent white-out
```

### 6. Audio Features Not Varying

**Problem:** Audio uniforms seem static.

**Causes:**
- Microphone not permitted
- Audio muted at OS level
- Using raw values instead of Normalized/ZScore

**Debug:**
```glsl
// Visualize if audio is working
fragColor = vec4(energy, spectralFlux, bass, 1.0);
```

### 7. Everything is the Same Color (Depth-Based Coloring)

**Problem:** Using distance/depth for color but it's all one hue.

**Causes:**
- Visible surfaces are at similar distances from camera
- Depth range parameters don't match visible range
- Using ray distance when world position would work better

**Debug approach:**
```glsl
// Output raw depth as grayscale to see if it varies
float normDist = result.dist / MAX_DIST;
fragColor = vec4(vec3(normDist), 1.0);  // Should show gradient
```

**Solutions:**

1. **Tighten the depth range** to match what's visible:
```glsl
#define DEPTH_MIN 1.5   // Start of visible range
#define DEPTH_MAX 4.0   // End of visible range
float normDist = (dist - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN);
```

2. **Try different depth sources** - ray distance isn't always best:
```glsl
// Ray distance (from camera)
float depth = result.dist / MAX_DIST;

// World Z position (depth into scene)
float depth = (p.z - Z_MIN) / (Z_MAX - Z_MIN);

// Orbit trap (varies with fractal structure!)
float depth = sqrt(trap.trapMin) * TRAP_SCALE;

// Distance from world origin
float depth = length(p) / MAX_RADIUS;
```

3. **Mix multiple sources** for richer variation:
```glsl
float hue = depthHue * 0.5 + trapHue * 0.3 + normalHue * 0.2;
```

**Key insight:** If your camera sees a "flat" view of a fractal (all surfaces at similar ray distances), use orbit traps or world position instead of ray distance for color variation.

---

## Example Shaders to Study

### `/shaders/sexy/2.frag` - Elegant Complex Exponential Fractal

- Compact, elegant code
- Orbit tracking for smooth coloring
- Audio mapped to narrow parameter ranges
- No feedback, pure mathematical beauty

**Key technique:** Angle-based coloring from orbit position:
```glsl
P = sqrt(z + (z - z*z*z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)));
```

### `/shaders/moody-octopus.frag` - Julia Set with Feedback

- Julia set distortion
- White-out prevention system
- HSL color manipulation
- Beat-reactive ripples

### `/shaders/fractal-abyss.frag` - Layered Evolving Fractal

- Multiple fractal layers at different scales
- Heavy feedback for slow evolution
- Domain warping with FBM
- Rich jewel-tone palette
- Audio affects structure, not color
- Designed for LED light sync

**Key techniques:**
- 92% feedback blend for slow evolution
- Three fractal layers (2x complex exponential + Mandelbrot)
- Incommensurate frequencies (PHI-based) for aperiodicity
- Orbit trap glow effects

---

## Workflow Summary

1. **Create file:** `/shaders/your-name.frag`

2. **Start with template:**
```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float t = iTime * 0.3;  // Slow time

    // Your visualization here
    vec3 color = vec3(0.0);

    // Feedback for smooth evolution
    vec3 prev = getLastFrameColor(fragCoord / iResolution.xy).rgb;
    color = mix(prev, color, 0.1);

    fragColor = vec4(color, 1.0);
}
```

3. **Test:** `http://localhost:6969/?shader=your-name`

4. **Iterate:** Add complexity gradually, test frequently

5. **Polish:** Add tone mapping, vignette, prevent white-out

---

## The #define Swap Pattern (Simplest Approach)

The easiest way to toggle between constant values and audio-reactive uniforms is the **comment swap pattern**:

```glsl
// ============================================================================
// TUNABLE PARAMETERS - swap constants for audio uniforms
// ============================================================================

// Active: audio-reactive
#define SCALE_MOD (-spectralEntropyZScore * 0.08)
// #define SCALE_MOD 0.0

// Active: constant (for testing)
// #define HUE_SHIFT (pitchClassNormalized * 0.3)
#define HUE_SHIFT 0.0

// Active: audio-reactive
#define BRIGHTNESS (1.0 + bassZScore * 0.15)
// #define BRIGHTNESS 1.0
```

**Why this works:**
- Comment/uncomment one line to toggle
- Test without audio: `?noaudio=true`
- Tune constant values before mapping to audio
- Documentation stays inline with the code
- Easy to see what's currently active at a glance

### Grouping Parameters

Organize by function for clarity:

```glsl
// ============================================================================
// COLOR PARAMETERS
// ============================================================================
#define HUE_BASE 0.0
#define HUE_RANGE 0.7
#define SATURATION 0.95

// ============================================================================
// STRUCTURE PARAMETERS
// ============================================================================
#define DEPTH_MIN 1.5
#define DEPTH_MAX 6.0

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================
#define ZOOM (spectralFluxZScore * 0.18)
// #define ZOOM 0.0
```

---

## Knob-to-Audio Workflow (Alternative Pattern)

For more complex parameter relationships, use `#ifdef` blocks to switch entire parameter sets:

### Why This Pattern Works

1. **Testable states** - Use query params to test specific parameter combinations
2. **No microphone needed** - Develop without audio setup
3. **Reproducible** - Same URL = same visual state for debugging
4. **Playwright-friendly** - Automated visual testing with different knob values
5. **Easy transition** - Just flip a `#define` to switch to audio mode

### The Pattern

```glsl
// ============================================================================
// KNOB MODE: Use query params to test different states
// Example: ?shader=my-shader&knob_1=0.5&knob_2=0.8
// ============================================================================

// Uncomment to enable knob testing mode
// #define KNOB_MODE

#ifdef KNOB_MODE
    // Knob declarations
    uniform float knob_1; // PARAM_A: describe what 0 and 1 mean
    uniform float knob_2; // PARAM_B: describe what 0 and 1 mean

    // Map knobs to aesthetic ranges
    #define PARAM_A mapValue(knob_1, 0., 1., 0.3, 0.8)
    #define PARAM_B mapValue(knob_2, 0., 1., 1.0, 3.0)
#else
    // AUDIO MODE: Map audio features to the same parameters
    #define PARAM_A mapValue(bassNormalized, 0., 1., 0.3, 0.8)
    #define PARAM_B mapValue(spectralCentroidNormalized, 0., 1., 1.0, 3.0)
#endif
```

### Development Steps

1. **Start with `#define KNOB_MODE` uncommented**
2. **Test via URL**: `?shader=my-shader&knob_1=0.2&knob_2=0.8&noaudio=true`
3. **Find aesthetic ranges** by adjusting knob values
4. **Document each knob** with comments explaining what low/high values produce
5. **Switch to audio** by commenting out `#define KNOB_MODE`
6. **Choose appropriate audio features** from different domains (see Feature Domains in CLAUDE.md)

### Testing with Playwright

Use Playwright to capture different states for visual comparison:

```javascript
// Navigate with specific knob values
await page.goto('http://localhost:6969/?shader=my-shader&knob_1=0.0&knob_2=0.5&noaudio=true');
await page.screenshot({ path: 'state-low.png' });

await page.goto('http://localhost:6969/?shader=my-shader&knob_1=1.0&knob_2=0.5&noaudio=true');
await page.screenshot({ path: 'state-high.png' });
```

### Example: fractal-abyss.frag

```glsl
#ifdef KNOB_MODE
    uniform float knob_1; // WARP_DEPTH: 0=subtle, 1=heavy warping
    uniform float knob_2; // SPIRAL_TIGHTNESS: 0=loose, 1=tight spirals

    #define WARP_DEPTH mapValue(knob_1, 0., 1., 0.3, 0.8)
    #define SPIRAL_TIGHTNESS mapValue(knob_2, 0., 1., 1.2, 3.5)
#else
    #define WARP_DEPTH mapValue(bassNormalized, 0., 1., 0.3, 0.8)
    #define SPIRAL_TIGHTNESS mapValue(spectralCentroidNormalized, 0., 1., 1.2, 3.5)
#endif
```

### Common Knob Assignments

| Knob Range | Typical Use |
|------------|-------------|
| `knob_1-7` | Primary shader parameters |
| `knob_70-79` | Secondary/fine-tune parameters |
| `knob_14-22` | MIDI controller banks |

---

## Tips for LED Light Sync

When creating shaders for driving Hue/Nanoleaf lights via screen scraping:

1. **Avoid rapid changes** - LEDs have latency, fast changes look bad
2. **Use saturated colors** - Desaturated colors look washed out on LEDs
3. **Large color regions** - Small details are lost in screen sampling
4. **Smooth gradients** - Harsh edges create flickering
5. **Test at low resolution** - Screen scraping often downsamples significantly
