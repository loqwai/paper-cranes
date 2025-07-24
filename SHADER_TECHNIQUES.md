# Unique Shader Techniques in Paper Cranes

This document highlights interesting and unique shader techniques discovered in the Paper Cranes project.

## 1. Spectral Audio Feature Mapping

The system provides an extensive set of spectral audio features beyond typical bass/mids/treble:

- **Spectral Centroid**: Brightness of sound - used to control color hue shifts
- **Spectral Crest**: Peakiness - used for shape sharpness or edge detection
- **Spectral Entropy**: Randomness - drives noise and chaos parameters
- **Spectral Flux**: Change detection - triggers visual transitions
- **Spectral Kurtosis**: Distribution shape - affects particle spread patterns
- **Spectral Rolloff**: High-frequency cutoff - controls blur or glow intensity
- **Spectral Roughness**: Dissonance - creates visual distortion
- **Spectral Skew**: Asymmetry - biases directional effects
- **Spectral Spread**: Bandwidth - controls visual element distribution

## 2. Advanced Feedback Techniques

### Color Difference Ripples (melted-satin/1.frag)
```glsl
vec2 getRippleOffset(vec2 uv, vec4 lastFrame, vec4 currentColor) {
    vec3 lastHsl = rgb2hsl(lastFrame.rgb);
    vec3 currentHsl = rgb2hsl(currentColor.rgb);
    vec3 diff = abs(lastHsl.rgb - currentHsl.rgb);
    float colorDiff = diff.x;
    
    float rippleStrength = colorDiff * 0.1 * (1.0 + energyZScore);
    if(beat) rippleStrength *= 2.0;
    
    float angle = atan(uv.y - 0.5, uv.x - 0.5);
    float dist = length(uv - 0.5);
    
    return vec2(
        cos(angle + t) * rippleStrength * sin(dist * 10.0 + t),
        sin(angle + t) * rippleStrength * sin(dist * 10.0 + t)
    );
}
```
This creates ripples based on color differences between frames, creating a reactive feedback system.

### Conditional Frame Swapping
```glsl
if(hslPrevColor.z > finalColor.z && fract(random(uv)) > 0.9) {
    vec3 p = finalColor;
    finalColor = hslPrevColor;
    hslPrevColor = p;
    finalColor.x = fract(hslPrevColor.x + hueDiff);
}
```
Randomly swaps colors with previous frame based on lightness, creating glitch-like effects.

## 3. Dynamic Probe System

The system uses "probes" - dynamically calculated mixing factors based on audio:
```glsl
#define PROBE_A mix(0.19, 3., (1. + spectralCrestZScore)/2.)
#define PROBE_B mix(0.19, 0.65, spectralEntropyNormalized)
```
These create audio-responsive blending parameters that vary with the music's characteristics.

## 4. Multi-Scale Noise with Audio Modulation

```glsl
float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    vec3 pp = p * NOISE_FREQ;
    for (int i = 0; i < 4; i++) {
        f += amp * noise(pp);
        pp *= 2.0;
        amp *= 0.5;
    }
    return f;
}
// Applied with audio modulation:
d += fbm(p * NOISE_FREQ + time * 0.1) * NOISE_AMOUNT * (1.0 + currentPulse);
```

## 5. Complementary Color Generation

Using golden ratio for harmonic color palettes:
```glsl
vec3 getBaseColor(float f, float plasma) {
    float phi = 1.618033988749895;
    float hueOffset = fract(TIME * 0.1);
    
    vec3 colors[5];
    for(int i = 0; i < 5; i++) {
        float hue = fract(hueOffset + float(i) * phi);
        colors[i] = vec3(hue, 0.8 + float(i) * 0.04, 0.5 + float(i) * 0.1);
    }
    
    float t = fract(f * 0.5 + plasma * 0.2 + TIME * 0.1);
    int idx1 = int(t * 4.0);
    int idx2 = (idx1 + 1) % 5;
    float blend = fract(t * 4.0);
    
    return mix(colors[idx1], colors[idx2], smoothstep(0.0, 1.0, blend));
}
```

## 6. Touch-Responsive Distortion Fields

Touch input creates localized distortion fields:
```glsl
if(touched) {
    float touchDist = length(p.xy - vec2(touch.x*2.0-1.0, -(touch.y*2.0-1.0)));
    p += vec3(sin(touchDist*10.0 + t - spectralRolloffZScore)) * 0.1;
}
```

## 7. Audio-Driven Domain Repetition

The rainbow-waves pattern uses audio to control ripple placement:
```glsl
struct Ripple {
    vec2 center;
    float birth;
    float strength;
};

Ripple[MAX_RIPPLES] getRipples() {
    Ripple[MAX_RIPPLES] ripples;
    for(int i = 0; i < MAX_RIPPLES; i++) {
        float birthOffset = mod(TIME + float(i) * RIPPLE_BIRTH_STAGGER, RIPPLE_LIFE_DURATION);
        float angle = float(i) * PI * 2.0 / float(MAX_RIPPLES) + RIPPLE_CHAOS * PI;
        vec2 pos = vec2(cos(angle), sin(angle)) * RIPPLE_SPREAD;
        ripples[i] = Ripple(pos, TIME - birthOffset, RIPPLE_BASE_STRENGTH);
    }
    return ripples;
}
```

## 8. Smooth Minimum for Organic Blending

Used extensively for combining shapes:
```glsl
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}
```

## 9. Dynamic Resolution Scaling

The visualizer automatically adjusts resolution based on performance:
```glsl
const calculateResolutionRatio = (frameTime, renderTimes, lastResolutionRatio) => {
    renderTimes.push(frameTime)
    if (renderTimes.length > 20) renderTimes.shift()
    
    const avgFrameTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length
    
    if (avgFrameTime > 50) return Math.max(0.5, lastResolutionRatio - 0.5)
    if (avgFrameTime < 20 && lastResolutionRatio < 1) return Math.min(1, lastResolutionRatio + 0.1)
    return lastResolutionRatio
}
```

## 10. Controller System for Complex State

Controllers allow JavaScript-based state management:
```javascript
export function makeRender(cranes) {
    const state = {
        rotation: 0,
        particles: []
    }
    
    return function render(cranes) {
        const { measuredAudioFeatures: features } = cranes
        
        // Complex physics or state updates
        state.rotation += 0.01 * (1 + (features.bassNormalized || 0))
        
        // Particle system updates
        if(features.beat && state.particles.length < 100) {
            state.particles.push({
                x: Math.random(),
                y: Math.random(),
                vx: (Math.random() - 0.5) * 0.1,
                vy: (Math.random() - 0.5) * 0.1
            })
        }
        
        return {
            manualFeatures: {
                particleCount: state.particles.length,
                rotation: state.rotation
            }
        }
    }
}
```

## 11. HSL-based Color Morphing

The system makes extensive use of HSL color space for smooth transitions:
```glsl
vec3 hslmix(vec3 c1, vec3 c2, float t){
    vec3 hsl1 = rgb2hsl(c1);
    vec3 hsl2 = rgb2hsl(c2);
    vec3 hsl = mix(hsl1, hsl2, t);
    return hsl2rgb(hsl);
}
```

## 12. Beat-Responsive Flash with Decay

```glsl
if(beat) {
    cl.y = clamp(cl.y * 1.2, 0.0, 1.0);  // Saturation boost
    cl.z = clamp(cl.z * 1.1, 0.0, 1.0);  // Lightness boost
} else {
    cl.z *= 0.98;  // Gradual fade
}
```

## 13. Vignette and Post-Processing

Common pattern for edge darkening:
```glsl
float vignette = smoothstep(1.1, 0.3, length(uv));
finalColor *= vignette;
```

## 14. Audio Statistics Usage

The system provides multiple statistics per audio feature:
- `current`: Current frame value
- `normalized`: 0-1 range
- `mean`: Running average
- `median`: Middle value
- `zScore`: Standard deviations from mean
- `min`/`max`: Range boundaries
- `standardDeviation`: Spread of values

This allows for sophisticated audio analysis within shaders.

## 15. Knob Parameter Mapping

Knobs use creative mappings for better control:
```glsl
#define TIME_SCALE (0.1 + knob_1 * 2.0)        // Exponential scaling
#define ITERATIONS (1.0 + floor(knob_2 * 8.0)) // Discrete steps
#define MIX_FACTOR mix(0.05, 0.6, knob_3)      // Range mapping
```

These techniques combine to create a powerful, flexible system for audio-reactive visualizations that can range from subtle ambient effects to intense, beat-driven experiences.