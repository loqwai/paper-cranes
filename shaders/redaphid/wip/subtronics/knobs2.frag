#define t (iTime*0.05 + energyZScore*0.01)


#define ZOOM_FACTOR knob_33
#define MIN_WAVES_LIGHTNESS knob_34
#define MAX_WAVES_LIGHTNESS knob_35
#define MIN_WAVES_SATURATION knob_36
// Function to smoothly check if a pixel is part of the Cyclops' body
float isCyclopsBody(vec2 uv) {
    vec3 hsl = rgb2hsl(getInitialFrameColor(uv).rgb);

    float minLightness = 0.1;
    float maxLightness = 0.8;
    float minHue = 0.1;
    float maxHue = 0.18;

    float lightnessScore = smoothstep(minLightness, minLightness + 0.1, hsl.z) *
                          (1.0 - smoothstep(maxLightness - 0.1, maxLightness, hsl.z));

    float hueScore = smoothstep(minHue, minHue + 0.02, hsl.x) *
                    (1.0 - smoothstep(maxHue - 0.02, maxHue, hsl.x));

    return lightnessScore * hueScore;
}

// Function to detect wave-like blue areas
float isWaves(vec2 uv) {
    vec3 hsl = rgb2hsl(getInitialFrameColor(uv).rgb);

    float minHue = knob_30;
    float maxHue = knob_31;
    float minSaturation = MIN_WAVES_SATURATION;
    float minLightness = MIN_WAVES_LIGHTNESS;
    float maxLightness = MAX_WAVES_LIGHTNESS;

    float hueScore = smoothstep(minHue, minHue + 0.02, hsl.x) *
                    (1.0 - smoothstep(maxHue - 0.02, maxHue, hsl.x));

    float saturationScore = smoothstep(minSaturation, minSaturation + 0.1, hsl.y);
    float lightnessScore = smoothstep(minLightness, minLightness + 0.1, hsl.z) *
                          (1.0 - smoothstep(maxLightness - 0.1, maxLightness, hsl.z));

    return hueScore * saturationScore * lightnessScore;
}

// Dynamic zoom based on knobs and detected features
float getZoomFactor(vec2 uv) {
    float baseZoom = 1.0 + ZOOM_FACTOR;
    float waveEffect = isWaves(uv) * knob_31 * 0.3;
    float cyclopsEffect = isCyclopsBody(uv) * knob_32 * 0.01;

    return clamp(baseZoom - waveEffect + cyclopsEffect, 0.5, 2.0);
}


// Create a trippy color transformation that maintains richness
vec3 trippyColor(vec3 color, float intensity) {
    vec3 hsl = rgb2hsl(color);

    // Add psychedelic hue shifting while maintaining saturation
    hsl.x = fract(hsl.x + sin(time * 0.0005) * intensity * 0.1);

    // Enhance saturation while preventing washing out
    hsl.y = min(1.0, hsl.y * (1.0 + intensity * 0.3));

    // Add subtle pulsing to lightness while keeping colors rich
    float lightnessPulse = sin(time * 0.00001) * intensity * 0.15;
    hsl.z = clamp(hsl.z * (1.0 + lightnessPulse), 0.2, 0.8);

    return hsl2rgb(hsl);
}

// Enhanced color mixing that preserves vibrancy
vec3 richMix(vec3 color1, vec3 color2, float factor) {
    vec3 hsl1 = rgb2hsl(color1);
    vec3 hsl2 = rgb2hsl(color2);

    // Mix in HSL space to preserve color richness
    vec3 mixedHsl = mix(hsl1, hsl2, factor);

    // Ensure minimum saturation and appropriate lightness
    mixedHsl.y = max(mixedHsl.y, 0.3);
    mixedHsl.z = clamp(mixedHsl.z, 0.2, 0.8);

    return hsl2rgb(mixedHsl);
}

// Ripple effect for smooth distortions
vec2 getRippleOffset(vec2 uv) {
    return vec2(0.);
    vec4 lastFrame = getLastFrameColor(uv);
    vec4 currentColor = getInitialFrameColor(uv);
    vec3 diff = abs(lastFrame.rgb - currentColor.rgb);
    float colorDiff = (diff.r + diff.g + diff.b) / 3.0;

    float rippleStrength = colorDiff * (1.0 + knob_33 * 0.5);

    float angle = atan(uv.y - 0.5, uv.x - 0.5);
    float dist = length(uv - 0.5);

    return vec2(
        cos(angle + t) * rippleStrength * sin(dist * 3.0 + t),
        sin(angle + t) * rippleStrength * sin(dist * 3.0 + t)
    ) * 0.15;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    // vec2 center = vec2(0.46, 0.65);
    vec2 center = vec2(0.5);
    // Apply dynamic zoom effect
    float zoomFactor = getZoomFactor(uv);
    uv = (uv - center) / zoomFactor + center;

    // Retrieve colors from current and last frame
    vec4 originalColor = getInitialFrameColor(uv);
    vec4 lastFrame = getLastFrameColor(uv);

    // Detect features
    float cyclopsBody = isCyclopsBody(uv);
    float waves = isWaves(uv);

    // Apply rippling distortion
    vec2 rippleOffset = getRippleOffset(uv);
    vec4 warpedFrame = getLastFrameColor(uv + rippleOffset);
    vec3 newCyclops = rgb2hsl(vec3(originalColor));
    newCyclops.x = knob_47;
    newCyclops = hsl2rgb(newCyclops);
    // Modify Cyclops body color based on knobs
    vec3 cyclopsColor = hslmix(originalColor.rgb, newCyclops, cyclopsBody);
    vec3 waveColor = mix(originalColor.rgb, vec3(knob_37, knob_34, knob_35), waves);

    // Blend everything together
    vec3 finalColor = mix(cyclopsColor, waveColor, 0.5);
    finalColor = mix(finalColor, warpedFrame.rgb, 0.3);

    fragColor = vec4(finalColor, originalColor.a);
}
