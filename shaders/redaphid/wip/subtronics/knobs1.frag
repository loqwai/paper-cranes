#define ZOOM_LEVEL knob_40
#define DISOLVE_FACTOR knob_33
#define BLEND_STRENGTH knob_40
#define ROUGHNESS_FACTOR knob_41
#define PULSE knob_45
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

// Function to check surrounding pixels for Cyclops body match with smooth blending
float isCyclopsBodyWithNeighbors(vec2 uv) {
    float roughnessFactor = ROUGHNESS_FACTOR;
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

// Create a trippy color transformation that maintains richness
vec3 trippyColor(vec3 color, float time, float intensity) {
    vec3 hsl = rgb2hsl(color);

    // Add psychedelic hue shifting while maintaining saturation
    hsl.x = fract(hsl.x + sin(time * 0.5) * intensity * 0.1);

    // Enhance saturation while preventing washing out
    hsl.y = min(1.0, hsl.y * (1.0 + intensity * 0.3));

    // Add subtle pulsing to lightness while keeping colors rich
    float lightnessPulse = sin(time * 2.0) * intensity * 0.15;
    hsl.z = clamp(hsl.z * (1.0 + lightnessPulse), 0.2, 0.8);

    return hsl2rgb(hsl);
}

// Enhanced color mixing that preserves vibrancy
vec3 richMix(vec3 color1, vec3 color2, float factor) {
    vec3 hsl1 = rgb2hsl(color1);
    vec3 hsl2 = rgb2hsl(color2);

    // Mix in HSL space to preserve color richness
    float mixedHue = mix(hsl1.x, hsl2.x, factor);
    vec3 mixedHsl = vec3(mixedHue, hsl1.y, hsl1.z);
    // Ensure minimum saturation and appropriate lightness
    // mixedHsl.y = max(mixedHsl.y, 0.3);
    mixedHsl.z = clamp(mixedHsl.z, 0.2, 0.8);

    return hsl2rgb(mixedHsl);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = vec2(0.46, 0.65);

    float zoomAmount = mapValue(ZOOM_LEVEL, -1., 1., 0.5, 2.);

    uv = (uv - center) / zoomAmount + center;

    vec4 originalColor = getInitialFrameColor(uv);
    if(beat) originalColor = getLastFrameColor(uv);
    vec4 lastFrame = getLastFrameColor(uv);

    float cyclopsBody = isCyclopsBodyWithNeighbors(uv);

    // Enhanced blending effect using knob_40
    float blendFactor = smoothstep(0.0, 1.0, BLEND_STRENGTH);

    // Create a more vibrant base color using audio features
    vec3 blendColor = vec3(
        pitchClassMedian * 1.8,
        spectralCrestNormalized * 1.3,
        energyNormalized * 1.1
    );

    // Apply trippy color transformation
    blendColor = trippyColor(blendColor, iTime, blendFactor);

    // Create a pulsing effect based on the blend strength and audio
    float pulse = sin(PULSE) * 0.5 + 0.5;
    blendColor *= 1.0 + pulse * blendFactor * 0.3;

    // Use rich color mixing for Cyclops colors
    vec3 cyclopsColor = richMix(originalColor.rgb, blendColor, cyclopsBody * blendFactor);

    // **Knob-controlled parameters**
    float rippleSpeed = 0.5 + knob_30 * 3.0;
    float rippleFrequency = 10.0 + knob_31 * 20.0;
    float distortionAmount = 0.005 + knob_32 * 0.01;
    float colorShift = 1.0 - knob_33;
    float rippleFade = 1.5 + knob_34 * 2.0;

    vec2 delta = uv - center;
    float distFromCenter = length(delta);
    float ripple = sin(distFromCenter * rippleFrequency - iTime * rippleSpeed) * exp(-distFromCenter * rippleFade);

    vec2 distortion = normalize(delta) * ripple * distortionAmount;
    vec4 warpedFrame = getLastFrameColor(uv + distortion);

    // Create a more vibrant rainbow effect
    vec3 rainbow = last(uv);
    vec3 auraColor = hsl2rgb(rainbow); // Reduced lightness for richer colors
    auraColor = trippyColor(auraColor, iTime, 0.5);

    // Enhanced color mixing with more psychedelic effects
    vec3 animatedLines = richMix(cyclopsColor, auraColor, cyclopsBody * 0.7);
    animatedLines = mix(animatedLines, animatedLines * 1.3, pulse * blendFactor * 0.2);

    float ripplingAura = cyclopsBody * ripple;
    vec3 finalColor = richMix(animatedLines, warpedFrame.rgb, ripplingAura);

    // Final color enhancement
    finalColor = pow(finalColor, vec3(0.9)); // Slightly increase contrast
    finalColor = mix(finalColor, finalColor * 1.1, pulse * blendFactor * 0.15); // Subtle color boost on pulse

    fragColor = vec4(finalColor, originalColor.a);
}
