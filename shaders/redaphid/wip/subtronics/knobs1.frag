#define ZOOM_LEVEL knob_5
#define DISOLVE_FACTOR mapValue(spectralRoughnessZScore, -1., 1.,0.,1. )
#define BLEND_STRENGTH knob_5
#define ROUGHNESS_FACTOR knob_6
#define PULSE knob_8
#define RIPPLE_SPEED knob_10
#define RIPPLE_FREQUENCY knob_1
vec3 last(vec2 uv) {
    vec4 initial = getInitialFrameColor(uv);
    vec4 last = getLastFrameColor(uv);
    return mix(initial, last, DISOLVE_FACTOR).rgb;
}

// Function to smoothly check if a pixel is part of the Cyclops' body
float isCyclopsBody(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));

    // Static color range for Cyclops detection
    float minLightness = 0.1;
    float maxLightness = 0.8;
    float minHue = 0.1;
    float maxHue = 0.18;

    // Smooth falloff for lightness
    float lightnessScore = smoothstep(minLightness, minLightness + 0.1, hsl.z) *
                          (1.0 - smoothstep(maxLightness - 0.1, maxLightness, hsl.z));

    // Smooth falloff for hue
    float hueScore = smoothstep(minHue, minHue + 0.02, hsl.x) *
                    (1.0 - smoothstep(maxHue - 0.02, maxHue, hsl.x));

    // Combine scores with smoothstep for final result
    return lightnessScore * hueScore;
}

// Function to detect wave-like blue areas
float isWaves(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));

    // Blue color range (in HSL)
    float minHue = 0.55;  // Start of blue
    float maxHue = 0.65;  // End of blue
    float minSaturation = 0.3;  // Minimum saturation to be considered blue
    float minLightness = 0.2;   // Minimum lightness to be visible
    float maxLightness = 0.8;   // Maximum lightness before washing out

    // Smooth falloff for hue
    float hueScore = smoothstep(minHue, minHue + 0.02, hsl.x) *
                    (1.0 - smoothstep(maxHue - 0.02, maxHue, hsl.x));

    // Smooth falloff for saturation
    float saturationScore = smoothstep(minSaturation, minSaturation + 0.1, hsl.y);

    // Smooth falloff for lightness
    float lightnessScore = smoothstep(minLightness, minLightness + 0.1, hsl.z) *
                          (1.0 - smoothstep(maxLightness - 0.1, maxLightness, hsl.z));

    return hueScore * saturationScore * lightnessScore;
}

// Function to check surrounding pixels with smooth blending
float checkNeighborsCyclops(vec2 uv) {
    float totalWeight = 0.0;
    float searchRadius = 0.01; // Base search radius

    // Center pixel weight
    float centerWeight = isCyclopsBody(uv);
    totalWeight += centerWeight;

    // Check neighboring pixels with distance-based weights
    for (float i = -1.0; i <= 1.0; i += 1.0) {
        for (float j = -1.0; j <= 1.0; j += 1.0) {
            if (i == 0.0 && j == 0.0) continue; // Skip center pixel

            vec2 neighborUV = uv + vec2(i, j) * searchRadius;
            float dist = length(vec2(i, j));
            float weight = 1.0 / (1.0 + dist * 2.0); // Exponential falloff
            totalWeight += isCyclopsBody(neighborUV) * weight;
        }
    }

    return smoothstep(0.0, 1.0, totalWeight);
}

// Function to check surrounding pixels with smooth blending for waves
float checkNeighborsWaves(vec2 uv) {
    float totalWeight = 0.0;
    float searchRadius = 0.01; // Base search radius

    // Center pixel weight
    float centerWeight = isWaves(uv);
    totalWeight += centerWeight;

    // Check neighboring pixels with distance-based weights
    for (float i = -1.0; i <= 1.0; i += 1.0) {
        for (float j = -1.0; j <= 1.0; j += 1.0) {
            if (i == 0.0 && j == 0.0) continue; // Skip center pixel

            vec2 neighborUV = uv + vec2(i, j) * searchRadius;
            float dist = length(vec2(i, j));
            float weight = 1.0 / (1.0 + dist * 2.0); // Exponential falloff
            totalWeight += isWaves(neighborUV) * weight;
        }
    }

    return smoothstep(0.0, 1.0, totalWeight);
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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    vec2 center = vec2(0.46, 0.65);

    float zoomAmount = mapValue(ZOOM_LEVEL, -1., 1., 0.5, 2.);
    uv = (uv - center) / zoomAmount + center;

    vec4 originalColor = getInitialFrameColor(uv);
    if(frame < 3) {
        fragColor = originalColor;
        return;
    }
    if(beat) originalColor = getLastFrameColor(uv);
    vec4 lastFrame = getLastFrameColor(uv);

    float cyclopsBody = checkNeighborsCyclops(uv);
    float waves = checkNeighborsWaves(uv);

    // Enhanced blending effect using knob_5
    float blendFactor = smoothstep(0.0, 1.0, BLEND_STRENGTH);

    // Create a more vibrant base color using audio features
    vec3 blendColor = vec3(
        knob_7 * 1.8,
        knob_8 * 1.3,
        knob_9 * 1.1
    );

    // Apply trippy color transformation
    blendColor = trippyColor(blendColor, blendFactor);

    // Create a pulsing effect based on the blend strength and audio
    float pulse = sin(PULSE) * 0.5 + 0.5;
    blendColor *= 1.0 + pulse * blendFactor * 0.3;

    // Use rich color mixing for Cyclops colors
    vec3 cyclopsColor = richMix(originalColor.rgb, blendColor, cyclopsBody * blendFactor);

    // **Knob-controlled parameters**
    float rippleSpeed = RIPPLE_SPEED * 3.0;
    float rippleFrequency = 10.0 + RIPPLE_FREQUENCY * 20.0;
    float distortionAmount = 0.5 + knob_2;
    float colorShift = 1.0 - knob_3;
    float rippleFade = 1.5 + knob_4 * 2.0;

    vec2 delta = uv - center;
    float distFromCenter = length(delta);
    float ripple = sin(distFromCenter * rippleFrequency - iTime * rippleSpeed) * exp(-distFromCenter * rippleFade);

    vec2 distortion = normalize(delta) * ripple * distortionAmount;
    vec4 warpedFrame = getLastFrameColor(uv + distortion);

    // Create a more vibrant rainbow effect
    vec3 rainbow = rgb2hsl(last(uv));
    rainbow.x = fract(rainbow.x); // Animate hue
    rainbow.y = max(rainbow.y, 0.5); // Ensure good saturation
    rainbow.z = clamp(rainbow.z, 0.3, 0.7); // Keep good lightness range
    vec3 auraColor = hsl2rgb(rainbow);
    auraColor = trippyColor(auraColor, 0.005);

    // Enhanced color mixing with more psychedelic effects
    vec3 animatedLines = richMix(cyclopsColor, auraColor, cyclopsBody * 0.7);

    // Add wave effect
    vec3 waveColor = vec3(0.0, 0.5, 1.0); // Bright blue
    waveColor = trippyColor(waveColor, 0.3);
    animatedLines = richMix(animatedLines, waveColor, waves * 0.5);

    animatedLines = mix(animatedLines, animatedLines * 1.3, pulse * blendFactor * 0.2);

    float ripplingAura = cyclopsBody * ripple;
    vec3 finalColor = richMix(animatedLines, warpedFrame.rgb, ripplingAura);

    // Final color enhancement
    finalColor = pow(finalColor, vec3(0.9)); // Slightly increase contrast
    finalColor = mix(finalColor, finalColor * 1.1, pulse * blendFactor * 0.15); // Subtle color boost on pulse

    fragColor = vec4(finalColor, originalColor.a);
}
