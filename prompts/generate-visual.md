# Audio Visualization Shader Generation Prompt

## Core Philosophy: Museum Curator Standards

Every visual must meet **professional exhibition quality**. Ask yourself critically at each iteration:

1. **Is this ugly?** Could any element look like noise, blur, or artifacts?
2. **Is the audio-visual mapping obvious?** Would a viewer immediately understand what's driving what?
3. **Does it evolve over time?** Are patterns aperiodic and non-repetitive?
4. **Is it aesthetically beautiful?** Color harmony, balanced composition, graceful motion?
5. **Could this impress potential customers in a product demo?** This is the ultimate bar.

If the answer to any quality question is no, **iterate immediately**. "Passable but not good" is **unacceptable**.

---

## Critical Design Principles

### 1. Aperiodic Evolution Using Frame Feedback as Entropy

**Audio uniforms are biased noise functions, not direct drivers.**

```glsl
// Use previous frame luminance as entropy seed
float frameLuminance(vec2 uv) {
    vec4 prev = getLastFrameColor(uv);
    return dot(prev.rgb, vec3(0.299, 0.587, 0.114));
}

// Audio-biased noise - treat audio as offset to deterministic noise
float audioBiasedNoise(float seed, float audioOffset) {
    return hash(seed + audioOffset * 100.0);
}

// Example: Evolving particle positions
float centerLum = frameLuminance(vec2(0.5));
float phaseNoise = audioBiasedNoise(particleIndex, fluxVal + time * 0.1);
float angleSpeed = 0.5 + bassAnim * 2.0 + phaseNoise * entropyVal * 0.5;
```

**Why:** This creates organic, never-repeating patterns that evolve based on musical history, not just current state.

### 2. Nonlinear Animation Functions

**Never use raw audio values directly.** Always transform through animation curves:

```glsl
// Available animation functions (from shader-wrapper.js):
animateSmooth(t)           // Smoothstep ease in/out
animateBounce(t)           // Bouncing effect
animatePulse(t)            // Sine wave pulse
animateEaseInQuad(t)       // Quadratic ease in
animateEaseOutQuad(t)      // Quadratic ease out
animateEaseInOutQuad(t)    // Quadratic ease in/out
animateEaseInCubic(t)      // Cubic ease in
animateEaseOutCubic(t)     // Cubic ease out
animateEaseInOutCubic(t)   // Cubic ease in/out
animateEaseInExpo(t)       // Exponential ease in
animateEaseOutExpo(t)      // Exponential ease out
animateEaseInOutExpo(t)    // Exponential ease in/out
animateEaseInSine(t)       // Sine ease in
animateEaseOutSine(t)      // Sine ease out
animateEaseInOutSine(t)    // Sine ease in/out
animateEaseInElastic(t)    // Elastic ease in
animateEaseOutElastic(t)   // Elastic ease out (use for dramatic peaks)
animateEaseInOutElastic(t) // Elastic ease in/out
animateSmoothBounce(t)     // Smooth bouncing

// Example: Bass creates elastic expansion
float bassAnim = animateEaseOutElastic(bassZ);
float orbitRadius = 0.35 + bassAnim * 0.4;

// Example: Energy creates exponential growth
float energyAnim = animateEaseOutExpo(energyZ);
float particleSize = 0.025 + energyAnim * 0.03;
```

**Why:** Creates visually interesting, physically-plausible motion that responds dramatically to audio.

### 3. Frame Feedback with UV Distortion

**Create flowing trails by distorting UV coordinates when sampling previous frame:**

```glsl
// Multi-layered distortion
vec2 distortedUV = fragCoord.xy / resolution.xy;
vec2 center = vec2(0.5);
vec2 toCenter = distortedUV - center;
float distFromCenter = length(toCenter);
float spiralAngle = atan(toCenter.y, toCenter.x);

// Bass creates vortex spiral
float bassAnim = animateEaseInOutSine(bassVal);
float vortex = bassAnim * 0.035 * distFromCenter;
distortedUV += vec2(
    cos(spiralAngle + time * (1.0 + fluxVal * 2.0)) * vortex,
    sin(spiralAngle + time * (1.0 + fluxVal * 2.0)) * vortex
);

// Energy creates radial push/pull
float energyPulse = animatePulse(energyVal);
distortedUV += normalize(toCenter) * energyPulse * 0.02;

// Flux adds chaotic turbulence
float turbulence = animateEaseOutElastic(fluxZ);
distortedUV += vec2(
    sin(distortedUV.y * 20.0 + time * 3.0) * turbulence * 0.015,
    cos(distortedUV.x * 20.0 + time * 2.5) * turbulence * 0.015
);

vec4 prevFrame = getLastFrameColor(distortedUV);
```

**Why:** Creates organic flowing motion trails that respond to musical dynamics.

### 4. Chromatic Aberration for Shimmer

```glsl
// Enhanced chromatic aberration based on audio features
float aberrationAmount = roughnessVal * 0.004 + fluxZ * 0.002;
vec2 rOffset = vec2(aberrationAmount, 0.0);
vec2 bOffset = vec2(-aberrationAmount, 0.0);
vec2 gOffset = vec2(0.0, aberrationAmount * 0.5);

float r = getLastFrameColor(distortedUV + rOffset).r;
float g = getLastFrameColor(distortedUV + gOffset).g;
float b = getLastFrameColor(distortedUV + bOffset).b;
vec3 aberratedTrails = vec3(r, g, b);
```

**Why:** Adds prismatic shimmer and visual richness without noise.

### 5. Brightness Control - CRITICAL

**Frame feedback WILL cause white-out if not controlled aggressively:**

```glsl
// Aggressive fade to prevent accumulation (0.75-0.90 range)
float fadeAmount = 0.80 + energyZ * 0.10;
vec3 aberratedTrails = vec3(r, g, b) * fadeAmount;

// NEVER use additive blending - always mix with controlled ratio
float mixAmount = 0.15 + entropyVal * 0.10;  // 15-25% new, 75-85% trails
vec3 finalColor = mix(aberratedTrails, newContent, mixAmount);

// Always clamp to prevent white-out
finalColor = min(finalColor, vec3(1.0));

// Particle brightness must be 2-4x higher than trails to stay visible
col += particleColor * (particle * 2.0 + glow * 0.8) * (0.6 + energyAnim * 0.4);

// Core/center glow must be VERY subtle (0.3x or less)
float centerGlow = smoothstep(0.15, 0.0, dist) * coreAnim * 0.3;
```

**Critical Rules:**
- Fade rate 0.75-0.90 (lower = faster fade = less accumulation)
- Mix ratio max 25% new content, 75% trails
- Always clamp final output
- Particles 2-4x brighter than ambient
- Center glow very subtle or it dominates

### 6. Color Palette Evolution

**Use HSL for evolving, harmonious colors:**

```glsl
// Evolving hue using audio-biased noise + frame feedback
float colorSeed = particleIndex * 7.0 + time * roughnessVal * 0.05;
float colorNoise = audioBiasedNoise(colorSeed, centroidVal);
float centerLum = frameLuminance(vec2(0.5));

float hue = (particleIndex / totalParticles) * 0.9 +
            fluxVal * 0.3 +
            colorNoise * 0.4 +
            centerLum * 0.2;
hue = mod(hue, 1.0);

// Saturation varies with roughness
float sat = 0.85 + roughnessVal * 0.15;
vec3 color = hsl2rgb(vec3(hue, sat, lightness));
```

**Warm palette guidance:**
- Hue base 0.0-0.2 (reds/oranges/yellows)
- Saturation 0.85-1.0 for vibrant colors
- Add 0.5 to hue to shift warm (wraps via mod)

### 7. Audio Feature Independence

**Choose features from DIFFERENT domains to avoid covariance:**

**Highly Covariant (avoid pairing):**
- energy + bass (both loud low frequencies)
- energy + spectralFlux (both measure change)
- spectralCentroid + pitchClass (both pitch-related)

**Independent Pairings (good):**
- bass vs treble (opposite frequencies)
- spectralCentroid vs spectralRoughness (pitch vs dissonance)
- spectralFlux vs spectralRolloff (change vs cutoff)
- energy vs spectralEntropy (loudness vs chaos)

**Feature Domains:**
- **Frequency Bands:** bass, mids, treble
- **Spectral Shape:** centroid, spread, skew, kurtosis
- **Spectral Quality:** roughness, entropy, crest
- **Temporal:** spectralFlux
- **Tonal:** pitchClass, rolloff
- **Energy:** energy

**Statistical Variations:**
- Use `normalized` (0-1) for smooth modulation
- Use `zScore` (-1 to 1) for detecting peaks/drops
- Use `mean/median` for baseline character

### 8. Organic Motion Patterns

**Break geometric rigidity with aperiodic wobbles:**

```glsl
// Not just circles - organic figure-eight wobble
float radiusPhase = animateEaseInOutSine(fract(time * (0.3 + noise * 0.2)));
float wobblePhase = sin(time * 1.5 + particleIndex) * spreadVal;
float orbitRadius = baseRadius + wobblePhase * 0.1;

// Perpendicular offset for organic flow
float perpAngle = orbitAngle + PI * 0.5;
float perpNoise = audioBiasedNoise(seed, entropyVal);
float perpOffset = perpNoise * 0.12;

vec2 particlePos = vec2(
    cos(orbitAngle) * orbitRadius + cos(perpAngle) * perpOffset,
    sin(orbitAngle) * orbitRadius + sin(perpAngle) * perpOffset
);
```

---

## Iterative Quality Process

### For Each Variation:

1. **Screenshot and analyze critically:**
   - Is anything blurry, noisy, or ugly?
   - Are all audio features visually represented?
   - Does it evolve uniquely over time?
   - Is the color palette harmonious?

2. **Common failures and fixes:**
   - **White-out:** Reduce fade (0.80), lower mix ratio (0.15), clamp output
   - **Noise/blur:** Remove UV distortion or reduce distortion amount
   - **Static/repetitive:** Add audio-biased noise, use frame feedback as entropy
   - **Boring colors:** Evolve hue with noise + feedback, vary saturation
   - **Invisible particles:** Increase particle brightness 2-4x vs trails
   - **Audio mapping unclear:** Add more distinct visual elements per feature

3. **Minimum 20 iterations per shader:**
   - Try completely different approaches (5-10 variations)
   - Refine promising approaches (20-30 parameter tweaks)
   - Screenshot each, analyze, iterate

4. **Success criteria:**
   - ✓ Visual-audio mapping is OBVIOUS
   - ✓ Responds clearly to musical changes
   - ✓ Aesthetically beautiful
   - ✓ Shows pattern repetition when song loops
   - ✓ Aperiodic evolution - never exactly repeats
   - ✓ Could impress customers in demo video

---

## Shader-Specific Patterns

### Particle Systems (energy-pulse style)
- 12-20 particles orbiting with audio-biased phases
- Elastic/exponential animation on bass/energy
- Perpendicular wobble for organic flow
- Evolving colors using noise + frame feedback
- Treble sparkles as accent layer

### Wave/Line Systems (line-dance style)
- 6 independent features as crossing waveforms
- Thick lines (0.020+) for clarity
- Dynamic glow based on zScore intensity
- Slow fade (0.995) for full-screen trails
- Shimmer effects with intensity modulation

### Field Systems (harmonic-field style)
- Scrolling particles showing frequency distribution
- Spectral shape features (centroid, spread, kurtosis, skew)
- Aperiodic vertical/horizontal displacement
- Color mapped to frequency position

### Rhythm Systems
- Concentric rings pulsing with mids
- Beat explosions with elastic animation
- Bass-driven vortex distortion
- Temporal evolution through frame feedback

---

## Technical Reference

### Available Uniforms

**Audio Features (each has 8 variations):**
```glsl
// Core features
bass, mids, treble, energy, pitchClass

// Spectral analysis
spectralCentroid, spectralSpread, spectralSkew, spectralKurtosis
spectralFlux, spectralRolloff, spectralRoughness, spectralEntropy, spectralCrest

// Statistical variations (append to any feature)
Normalized      // 0-1 range (min-max normalized)
Mean           // Historical average
Median         // Historical median
Min, Max       // Historical bounds
StandardDeviation
ZScore         // -1 to 1 (standardized, detects peaks)
```

**Time/Beat:**
```glsl
time      // Seconds since start
beat      // Boolean beat detection
```

**Utility Functions:**
```glsl
hsl2rgb(vec3 hsl) -> vec3
rgb2hsl(vec3 rgb) -> vec3
getLastFrameColor(vec2 uv) -> vec4
random(vec2 st) -> float
hash(float n) -> float
```

---

## Example: Complete Aperiodic Particle System

```glsl
// Sample frame for entropy
float centerLum = frameLuminance(vec2(0.5));

for (float i = 0.0; i < 12.0; i++) {
    // Audio-biased phase breaks periodicity
    float phaseNoise = audioBiasedNoise(i, fluxVal + time * 0.1);

    // Elastic bass response with entropy variation
    float bassAnim = animateEaseOutElastic(bassZ);
    float angleSpeed = 0.5 + bassAnim * 2.0 + phaseNoise * entropyVal * 0.5;
    float orbitAngle = (i / 12.0) * TWO_PI + time * angleSpeed;

    // Evolving radius using frame feedback
    float radiusNoise = audioBiasedNoise(i + centerLum * 10.0, spreadVal);
    float radiusPhase = animateEaseInOutSine(fract(time * (0.3 + radiusNoise * 0.2)));
    float orbitRadius = 0.35 + bassAnim * 0.4 * radiusPhase + radiusNoise * 0.15;

    // Organic perpendicular wobble
    float perpNoise = audioBiasedNoise(i * 3.0 + time * kurtosisVal * 0.1, entropyVal);
    vec2 particlePos = vec2(
        cos(orbitAngle) * orbitRadius + cos(orbitAngle + PI/2) * perpNoise * 0.12,
        sin(orbitAngle) * orbitRadius + sin(orbitAngle + PI/2) * perpNoise * 0.12
    );

    // Evolving color
    float colorNoise = audioBiasedNoise(i * 7.0 + time * roughnessVal * 0.05, centroidVal);
    float hue = (i / 12.0) * 0.9 + fluxVal * 0.3 + colorNoise * 0.4 + centerLum * 0.2 + 0.5;
    vec3 color = hsl2rgb(vec3(mod(hue, 1.0), 0.92, 0.62));

    // Controlled brightness
    col += color * (particle * 2.0 + glow * 0.8) * (0.6 + energyAnim * 0.4);
}
```

---

## Final Checklist Before Commit

- [ ] No white-out (test at high energy)
- [ ] No blur/noise (clean rendering)
- [ ] Colors evolve over time (not static palette)
- [ ] Patterns never exactly repeat (aperiodic)
- [ ] All audio features clearly mapped to visual elements
- [ ] Beautiful composition (balanced, harmonious)
- [ ] Frame feedback creates flowing trails
- [ ] Animation curves create dramatic responses
- [ ] Could be used in professional demo video

**If any box unchecked: ITERATE MORE.**

---

*Remember: "Passable but not good" means **keep iterating**. These visualizations represent the product's capabilities. Museum curator standards only.*
