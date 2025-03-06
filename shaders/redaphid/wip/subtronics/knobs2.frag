#define ZOOM_LEVEL mapValue(knob_40, 0., 1., 0.9, 2.5)
#define RIPPLE_SPEED knob_47
#define RIPPLE_FREQUENCY knob_31
#define RIPPLE_STRENGTH knob_47  // Controls how far outside waves the ripple spreads & its intensity
#define COLOR_SHIFT knob_45
#define BLEND_STRENGTH knob_46
#define CENTER vec2(0.46, 0.65)

vec3 last(vec2 uv) {
    return getInitialFrameColor(fract(uv)).rgb; // Wrap UVs to repeat pattern
}

// Detect Cyclops' body
float isCyclopsBody(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));
    return smoothstep(0.1, 0.2, hsl.z) * (1.0 - smoothstep(0.7, 0.8, hsl.z)) *
           smoothstep(0.1, 0.12, hsl.x) * (1.0 - smoothstep(0.16, 0.18, hsl.x));
}

// Detect wave-like areas
float isWaves(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));
    return smoothstep(0.55, 0.57, hsl.x) * (1.0 - smoothstep(0.63, 0.65, hsl.x)) *
           smoothstep(0.3, 0.4, hsl.y) * smoothstep(0.2, 0.3, hsl.z) *
           (1.0 - smoothstep(0.7, 0.8, hsl.z));
}

// Generate rippling effect, now influenced by RIPPLE_STRENGTH
vec2 getRippleDistortion(vec2 uv, float waves) {
    vec2 delta = uv - CENTER;
    float distFromCenter = length(delta);

    // **Expand the ripple effect outward based on RIPPLE_STRENGTH**
    float rippleRange = mix(0.1, 1.2, RIPPLE_STRENGTH); // More strength = wider area affected
    float rippleIntensity = mix(0.005, 0.03, RIPPLE_STRENGTH); // More strength = stronger distortion

    float ripple = sin(distFromCenter * (10.0 + RIPPLE_FREQUENCY * 10.0) - iTime * (1.0 + RIPPLE_SPEED * 2.0));

    // **Apply ripple distortion more strongly near waves but also outside of them**
    float influence = smoothstep(0.0, rippleRange, waves);
    return normalize(delta) * ripple * rippleIntensity * influence;
}

// Generate shifting psychedelic colors **without hue banding**
vec3 trippyColor(vec3 color, float intensity) {
    vec3 hsl = rgb2hsl(color);

    // **Fix hue shifts to prevent green banding**
    hsl.x += sin(iTime * 0.5) * intensity * 0.1;
    hsl.x = mod(hsl.x, 1.0); // Use `mod()` instead of `fract()` to prevent hard hue jumps

    // **Keep saturation high without over-saturating**
    hsl.y = mix(hsl.y, 1.0, intensity * 0.3);

    // **Create smooth brightness pulsing instead of clamping**
    float wave = sin(iTime * 1.5) * intensity * 0.15;
    hsl.z = mix(hsl.z, hsl.z + wave, 0.5);
    hsl.z = clamp(hsl.z, 0.2, 0.8); // Ensure valid brightness range

    return hsl2rgb(hsl);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = CENTER;

    if (frame < 3) {
        fragColor = getInitialFrameColor(uv);
        return;
    }

    // Apply zoom
    float zoomAmount = ZOOM_LEVEL;
    uv = (uv - center) / zoomAmount + center;
    uv = fract(uv); // Ensure seamless tiling when zooming out

    // Get initial colors
    vec3 originalColor = getInitialFrameColor(uv).rgb;
    vec3 lastFrameColor = last(uv);

    if (bassZScore > 0.5) {
        lastFrameColor = mix(lastFrameColor, originalColor, 0.3); // Less aggressive mixing
    }

    // Detect features
    float cyclopsBody = isCyclopsBody(uv);
    float waves = isWaves(uv);

    // Apply ripple distortion safely
    vec2 rippleOffset = getRippleDistortion(uv, waves);
    vec3 warpedFrame = getLastFrameColor(fract(uv + rippleOffset)).rgb;

    // Create trippy color effect with fixed hue shifting
    vec3 psychedelic = trippyColor(lastFrameColor, COLOR_SHIFT);

    // **Fix color blending to prevent banding**
    vec3 blendedColor = originalColor;
    blendedColor = mix(blendedColor, warpedFrame, smoothstep(0.0, 1.0, waves) * 0.7); // Smooth wave blending
    blendedColor = mix(blendedColor, psychedelic, cyclopsBody * 0.8);

    fragColor = vec4(blendedColor, 1.0);
}
