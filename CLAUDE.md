# Paper Cranes GLSL Shader Guide for LLMs

This guide explains the shader format and patterns used in the Paper Cranes audio-reactive visualization system, designed specifically to help LLMs generate new shaders in the correct format.

## Overview

Paper Cranes is a real-time audio-reactive visualization system that uses GLSL fragment shaders. The system processes audio input, extracts features, and passes them as uniforms to the shaders. Shaders can also receive touch input, controller data, and access the previous frame for feedback effects.

## Shader Format Requirements

### 1. Basic Structure

All shaders MUST follow this structure:

```glsl
// Optional: Uniform declarations for knobs not auto-generated
uniform float knob_X;  // Where X is a number 1-200

// Optional: Define macros for readability
#define TIME_SCALE (0.1 + knob_1 * 2.0)
#define SHAPE_COMPLEXITY (knob_2 * 10.0)

// REQUIRED: Main image function with exact signature
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Your shader code here
    fragColor = vec4(color, 1.0);
}
```

### 2. Available Built-in Uniforms

#### Time and Frame
- `float iTime` / `float time` - Current time in seconds
- `int iFrame` / `int frame` - Current frame number
- `float iRandom` - Random value (0-1) that changes each frame

#### Resolution and Mouse
- `vec3 iResolution` - Resolution (x, y, 0)
- `vec2 resolution` - Resolution (x, y)
- `vec4 iMouse` - Mouse position (x, y, clicked, 0)
- `vec2 touch` - Normalized touch position (0-1)
- `bool touched` - Whether screen is being touched

#### Textures
- `sampler2D prevFrame` - Previous frame texture
- `sampler2D initialFrame` - Initial image texture
- `sampler2D iChannel0-3` - Additional texture channels

#### Audio Features (all floats unless noted)
Each audio feature has multiple statistics:
- Base value: `bass`, `energy`, `mids`, `treble`
- Normalized (0-1): `bassNormalized`, `energyNormalized`, etc.
- Z-Score (-3 to 3 typically): `bassZScore`, `energyZScore`, etc.
- Statistics: `bassMean`, `bassMedian`, `bassMin`, `bassMax`, `bassStandardDeviation`

Available audio features:
- `bass`, `mids`, `treble` - Frequency bands
- `energy` - Overall audio energy
- `spectralCentroid` - Brightness of sound
- `spectralCrest` - Peakiness of spectrum
- `spectralEntropy` - Randomness of spectrum
- `spectralFlux` - Change in spectrum
- `spectralKurtosis` - Tailedness of spectrum
- `spectralRolloff` - Frequency containing 85% of energy
- `spectralRoughness` - Dissonance
- `spectralSkew` - Asymmetry of spectrum
- `spectralSpread` - Width of spectrum
- `bool beat` - Beat detection

#### Knobs (User Controls)
- `float knob_1` through `float knob_200` - User-controllable parameters (0-1 by default)

### 3. Built-in Helper Functions

```glsl
// Color Conversion
vec3 hsl2rgb(vec3 hsl)  // Convert HSL to RGB
vec3 rgb2hsl(vec3 rgb)  // Convert RGB to HSL
vec3 hslmix(vec3 c1, vec3 c2, float t)  // Mix colors in HSL space

// Random
float random(vec2 st)  // Random value based on position
float random(vec2 st, float seed)  // Seeded random
float staticRandom(vec2 st)  // Static random (doesn't change with iRandom)

// Frame Access
vec4 getLastFrameColor(vec2 uv)  // Get color from previous frame
vec4 getInitialFrameColor(vec2 uv)  // Get color from initial image

// Utilities
float mapValue(float val, float inMin, float inMax, float outMin, float outMax)
vec2 centerUv(vec2 coord)  // Center UV coordinates
float pingpong(float t)  // Oscillate between 0 and 1

// Animation Easing Functions
float animateSmooth(float t)
float animateBounce(float t)
float animatePulse(float t)
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
float animateSmoothBounce(float t)
```

## Common Shader Patterns

### 1. Raymarching Pattern
Used for 3D volumetric effects:

```glsl
// Define SDF shapes
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Domain operations
vec3 opRep(vec3 p, vec3 c) { return mod(p + 0.5 * c, c) - 0.5 * c; }
mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

// Main SDF
float map(vec3 p) {
    p.xz *= rot(iTime * 0.2);
    vec3 q = opRep(p, vec3(2.0));
    return sdSphere(q, 0.5);
}

// Normal calculation
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    vec3 ro = vec3(0, 0, 3);  // Ray origin
    vec3 rd = normalize(vec3(uv, -1));  // Ray direction
    
    // Raymarch
    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if(d < 0.001) break;
        t += d * 0.7;
        if(t > 10.0) break;
    }
    
    vec3 col = vec3(0);
    if(t < 10.0) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        float diff = max(dot(n, vec3(0.5, 0.5, 1)), 0.0);
        col = vec3(diff);
    }
    
    fragColor = vec4(col, 1.0);
}
```

### 2. Feedback/Trail Pattern
Uses previous frame for motion trails and persistence:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    
    // Get previous frame with slight offset for motion
    vec2 offset = vec2(sin(iTime), cos(iTime)) * 0.002;
    vec4 prev = getLastFrameColor(uv + offset);
    
    // New content
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float d = length(p - vec2(sin(iTime * 2.0) * 0.3, 0));
    vec3 new_color = vec3(1, 0.5, 0) * smoothstep(0.1, 0.0, d);
    
    // Blend with fade
    vec3 col = mix(prev.rgb * 0.95, new_color, 0.1);
    
    fragColor = vec4(col, 1.0);
}
```

### 3. Audio-Reactive Pattern
Responds to audio features:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Scale based on bass
    float scale = 1.0 + bassNormalized * 0.5;
    uv *= scale;
    
    // Rotate based on energy
    float angle = iTime + energyZScore * 0.2;
    mat2 m = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    uv = m * uv;
    
    // Color based on spectral features
    vec3 color = vec3(
        spectralCentroidNormalized,
        spectralRoughnessNormalized,
        0.5
    );
    
    // Flash on beat
    if(beat) {
        color += vec3(0.2);
    }
    
    // Pattern
    float pattern = sin(uv.x * 10.0) * sin(uv.y * 10.0);
    color *= 0.5 + 0.5 * pattern;
    
    fragColor = vec4(color, 1.0);
}
```

### 4. HSL Color Manipulation Pattern
Using HSL for smooth color transitions:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec4 prev = getLastFrameColor(uv);
    
    // Convert to HSL
    vec3 hsl = rgb2hsl(prev.rgb);
    
    // Rotate hue based on audio
    hsl.x = fract(hsl.x + energyNormalized * 0.01);
    
    // Modulate saturation
    hsl.y = mix(0.5, 1.0, spectralCrestNormalized);
    
    // Pulse lightness on beat
    if(beat) {
        hsl.z = min(1.0, hsl.z * 1.2);
    } else {
        hsl.z *= 0.98;  // Fade
    }
    
    // Convert back to RGB
    vec3 color = hsl2rgb(hsl);
    
    fragColor = vec4(color, 1.0);
}
```

### 5. Knob-Controlled Pattern
Using knobs for user control:

```glsl
// Define readable names for knobs
#define SPEED (0.1 + knob_1 * 2.0)
#define COMPLEXITY (1.0 + floor(knob_2 * 8.0))
#define COLOR_SHIFT knob_3
#define ZOOM (0.5 + knob_4 * 2.0)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    uv *= ZOOM;
    
    float pattern = 0.0;
    for(float i = 0.0; i < COMPLEXITY; i++) {
        vec2 p = uv * (2.0 + i);
        pattern += sin(p.x + iTime * SPEED) * cos(p.y + iTime * SPEED * 0.7);
    }
    pattern /= COMPLEXITY;
    
    vec3 color = hsl2rgb(vec3(COLOR_SHIFT + pattern * 0.1, 0.8, 0.5 + pattern * 0.3));
    
    fragColor = vec4(color, 1.0);
}
```

## Best Practices for Paper Cranes Shaders

1. **Performance Considerations**
   - Keep raymarch steps reasonable (32-128)
   - Limit complex calculations in loops
   - Use built-in functions when possible
   - Consider mobile performance

2. **Audio Reactivity**
   - Use normalized values (0-1) for predictable behavior
   - Use Z-scores for detecting peaks and anomalies
   - Smooth rapid changes: `mix(oldValue, newValue, 0.1)`
   - Layer multiple audio features for complex reactions

3. **Visual Aesthetics**
   - Use HSL for smooth color transitions
   - Apply easing functions for natural motion
   - Add rim lighting and fog for depth
   - Use feedback effects sparingly to avoid muddy visuals

4. **Knob Usage**
   - Define clear ranges and purposes
   - Use macros for readable code
   - Consider non-linear mappings for better control
   - Document what each knob does

5. **Common Techniques**
   - **Domain Repetition**: Create infinite patterns with `mod()`
   - **Smooth Blending**: Use `smoothstep()` and `smin()` for soft transitions
   - **Coordinate Transformation**: Apply rotations, scaling, and warping to UV
   - **Noise**: Use `fbm()` for organic variation
   - **Feedback**: Blend with previous frame for trails and persistence

## Example: Complete Audio-Reactive Shader

```glsl
// Knob definitions
#define TIME_SCALE (0.1 + knob_1 * 2.0)
#define WAVE_COUNT (1.0 + floor(knob_2 * 8.0))
#define COLOR_SPEED (knob_3 * 2.0)
#define FEEDBACK_AMOUNT (0.8 + knob_4 * 0.19)
#define DISTORTION (knob_5 * 0.1)

uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;

float wave(vec2 p, float freq, float amp, float offset) {
    return sin(p.x * freq + iTime * TIME_SCALE + offset) * 
           cos(p.y * freq + iTime * TIME_SCALE * 0.7 + offset) * amp;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // Audio-driven distortion
    vec2 distort = vec2(
        sin(p.y * 10.0 + bassZScore),
        cos(p.x * 10.0 + energyZScore)
    ) * DISTORTION * energyNormalized;
    
    // Get feedback with distortion
    vec4 prev = getLastFrameColor(uv + distort);
    
    // Create waves
    float waves = 0.0;
    for(float i = 0.0; i < WAVE_COUNT; i++) {
        float freq = 5.0 + i * 2.0;
        float amp = 1.0 / (i + 1.0);
        float offset = i * 1.234;
        waves += wave(p + distort * i * 0.1, freq, amp, offset);
    }
    waves = waves / WAVE_COUNT * 0.5 + 0.5;
    
    // Color based on position and audio
    vec3 color = hsl2rgb(vec3(
        fract(waves + iTime * COLOR_SPEED * 0.1 + spectralCentroidNormalized * 0.2),
        0.7 + spectralRoughnessNormalized * 0.3,
        0.3 + waves * 0.4 + energyNormalized * 0.3
    ));
    
    // Beat flash
    if(beat) {
        color += vec3(0.1, 0.2, 0.3) * bassNormalized;
    }
    
    // Touch interaction
    if(touched) {
        float touchDist = length(p - (touch * 2.0 - 1.0));
        color += vec3(1.0, 0.5, 0.0) * smoothstep(0.2, 0.0, touchDist);
    }
    
    // Blend with feedback
    color = mix(color, prev.rgb, FEEDBACK_AMOUNT);
    
    // Vignette
    float vignette = smoothstep(1.2, 0.5, length(p));
    color *= vignette;
    
    fragColor = vec4(color, 1.0);
}
```

## Generating New Shaders

When creating new shaders:

1. Start with a clear concept (e.g., "pulsing geometric shapes", "flowing liquids", "particle systems")
2. Choose appropriate techniques (raymarching for 3D, feedback for trails, etc.)
3. Map audio features to visual parameters meaningfully
4. Use knobs for user customization
5. Test with different audio inputs
6. Optimize for performance

Remember: The goal is to create visually engaging, audio-reactive experiences that respond dynamically to music while maintaining good performance.