#define PROBE_1 mix(1., 1.4, knob_34)
#define PROBE_2 mix(0.55, 2., knob_35)    // 'fan out' swirls -> multiple squares
#define PROBE_3 mix(-1.7, 10., knob_36)    // color
#define PROBE_4 mod(float(frame), 310.15)/100.
#define PROBE_5 mix(0.47, 0.97, knob_34)    // complexity + zoom
#define PROBE_6 mix(0.1, 0.3, knob_35)      // zoom speed
#define PATTERN_CYCLE mix(5.0, 20.0, knob_36) // pattern cycle time in seconds

// A simple pseudo-random function (if needed)
float rand(vec2 co) {
    return random(co);
}

// Standard rotation function
vec2 rotate(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
}

// Applies a periodic transformation using an inversion factor.
vec2 applyPeriodicTransformationAndTraps(vec2 position, vec2 multiplier, float variation) {
    float d = dot(position, position);
    float inv = 1.0 / (d + 0.0001);
    position = 0.5 * sin(multiplier * position * inv * PROBE_5 * variation);
    return position;
}

// Generate a fractal pattern with time offset
vec4 generatePattern(vec2 uv, float patternSeed) {
    vec4 fractalColor = vec4(1e6);

    // Create multiplier based on the pattern seed
    float angleOffset = sin(patternSeed * 0.3) * 0.1;
    vec2 multiplier = vec2(
        PROBE_1 * (1.0 + sin(patternSeed) * 0.05),
        PROBE_2 * (1.0 + cos(patternSeed * 0.7) * 0.05)
    );

    // Small rotation variation
    uv = rotate(uv, angleOffset);

    // Variation parameter
    float variation = 0.95 + sin(patternSeed * 0.5) * 0.1;

    for (int i = 0; i < 10; i++) {
        uv = applyPeriodicTransformationAndTraps(uv, multiplier, variation);
        float lengthTrap = length(uv);
        float minAxesTrap = min(abs(uv.x), abs(uv.y));
        float diagonalDotTrap = abs(dot(uv, vec2(PROBE_3, PROBE_4)));
        fractalColor = min(fractalColor, vec4(lengthTrap, minAxesTrap, diagonalDotTrap, 1.0));
    }

    return fractalColor;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 resolution = iResolution.xy;
    // Center and normalize UV to roughly [-0.5, 0.5]
    vec2 uv = (fragCoord - 0.5 * resolution) / resolution.x;

    // Store original UV for final color blending
    vec2 originalUV = uv;
    float originalDist = length(originalUV);

    // Apply a continuous rotation over time
    uv = rotate(uv, iTime * 0.05);

    // True continuous zoom-in effect (continuously gets smaller)
    float zoomFactor = exp(-PROBE_6 * iTime);
    uv *= zoomFactor;

    // This creates the infinite zoom illusion - when we zoom in far enough,
    // we start to see the same pattern again due to the fractal nature
    // Use modulo to create seamless pattern repetition while zooming
    float scaledTime = iTime * PROBE_6;
    float patternRepeat = 2.0; // After zooming in 2x, we see similar patterns

    // The key for continuous zooming: use log scale to create recursive pattern visibility
    float logZoom = -log(zoomFactor);
    float patternSeed = mod(logZoom, patternRepeat);
    float patternCycle = floor(logZoom / patternRepeat);

    // Calculate blend factor between patterns
    float blendFactor = fract(logZoom / patternRepeat);

    // Compute two adjacent patterns to blend between
    vec4 currentPattern = generatePattern(uv, patternCycle);
    vec4 nextPattern = generatePattern(uv, patternCycle + 1.0);

    // Center mask for pattern blending (hide artifacts in center)
    float centerMask = smoothstep(0.0, 0.2, originalDist);
    float enhancedBlend = mix(blendFactor + 0.2 * sin(iTime), blendFactor, centerMask);
    enhancedBlend = clamp(enhancedBlend, 0.0, 1.0);

    // Blend patterns
    vec4 fractalColor = mix(currentPattern, nextPattern, enhancedBlend);

    // Add some color variation based on position and time
    vec3 color = vec3(
        sin(fractalColor.x * 10.0 + iTime),
        cos(fractalColor.y * 8.0 + iTime * 0.7),
        sin(fractalColor.z * 12.0 + iTime * 1.2)
    );

    // Normalize color
    color = color * 0.5 + 0.5;

    // Add center glow to hide artifacts
    float centerGlow = smoothstep(0.15, 0.0, originalDist);
    vec3 glowColor = mix(
        color,
        vec3(0.8, 0.7, 0.9),
        centerGlow * (0.2 + 0.15 * sin(iTime * 0.5))
    );

    // Apply center glow
    color = mix(color, glowColor, centerGlow * 0.7);

    // Apply a subtle pulse effect based on the zoom level
    float pulse = 0.1 * sin(logZoom * 3.1415 * 2.0);
    color = mix(color, color * (1.0 + pulse), centerMask);

    // Create expanding circle effect with softer edges (for initial transition only)
    float initTime = min(iTime, 10.0); // Only for first 10 seconds
    float circleSize = min(1.5, 0.1 + initTime * 0.05);
    float circleMask = smoothstep(circleSize, circleSize - 0.15, originalDist);

    // Blend the circle edge with background
    vec3 backgroundColor = vec3(0.1, 0.05, 0.2);
    vec3 edgeColor = mix(backgroundColor, color, smoothstep(circleSize, circleSize - 0.25, originalDist));

    // Final color with circle mask
    vec3 finalColor = mix(vec3(0.0), edgeColor, circleMask);

    // Output final color
    fragColor = vec4(finalColor, 1.0);
}
