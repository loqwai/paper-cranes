#define PROBE_1 mix(1., 1.4, knob_34)
#define PROBE_2 mix(0.55, 2., knob_35)    // 'fan out' swirls -> multiple squares
#define PROBE_3 mix(-1.7, 10., knob_36)    // color
#define PROBE_4 mod(float(frame), 310.15)/100.
#define PROBE_5 mix(0.47, 0.97, knob_34)    // complexity + zoom
#define PROBE_6 mix(0.1, 0.3, knob_35)      // zoom speed
#define RESET_PERIOD mix(10.0, 30.0, knob_36) // seconds between zoom resets
#define TRANSITION_LENGTH 0.6  // Portion of cycle dedicated to transition (0.0-1.0)

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

// Generate a fractal pattern
vec4 generateFractal(vec2 uv, vec2 multiplier, float variation, int iterations) {
    vec4 fractalColor = vec4(1e6);

    for (int i = 0; i < 10; i++) {
        if (i >= iterations) break;

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

    // Compute the time within the reset period
    float cycleTime = mod(iTime, RESET_PERIOD);
    float cycleProgress = cycleTime / RESET_PERIOD;

    // Transition begins earlier and lasts longer
    float transitionStart = 1.0 - TRANSITION_LENGTH;
    float resetBlend = smoothstep(transitionStart, 1.0, cycleProgress);

    // Apply a continuous rotation over time
    float rotationSpeed = 0.05 * (1.0 + 0.2 * sin(iTime * 0.2));
    uv = rotate(uv, iTime * rotationSpeed);

    // ZOOM INWARD - Simple and direct approach
    // Start with zoom = 1 and decrease (divide by larger numbers) as cycle progresses
    float zoomScale = 0.2 + 4.8 * cycleProgress; // Maps 0->1 to 0.2->5.0
    vec2 zoomedUV = uv / zoomScale; // Division means INWARD zoom

    // Debug - uncomment to verify zoom direction
    // If the pattern gets smaller as time progresses, we're zooming in correctly
    // return vec4(vec3(length(zoomedUV) < 0.1 ? 1.0 : 0.0), 1.0);

    // Create slightly different variations for visual interest
    float seed1 = floor(iTime / RESET_PERIOD);
    float seed2 = seed1 + 1.0;

    // Generate variation parameters
    float angleOffset1 = sin(seed1 * 3.14) * 0.2;
    float angleOffset2 = sin(seed2 * 3.14) * 0.2;
    float variation1 = 0.95 + sin(seed1 * 0.7) * 0.1;
    float variation2 = 0.95 + sin(seed2 * 0.7) * 0.1;

    // Create multipliers with slight variations
    vec2 multiplier1 = vec2(
        PROBE_1 * (1.0 + sin(seed1) * 0.1),
        PROBE_2 * (1.0 + cos(seed1 * 0.7) * 0.1)
    );

    vec2 multiplier2 = vec2(
        PROBE_1 * (1.0 + sin(seed2) * 0.1),
        PROBE_2 * (1.0 + cos(seed2 * 0.7) * 0.1)
    );

    // Generate current pattern (zoomed in)
    vec2 patternUV1 = rotate(zoomedUV, angleOffset1);

    // For next pattern, use uv/0.2 to start zoomed out
    vec2 patternUV2 = rotate(uv / 0.2, angleOffset2);

    // Iteration count variation for depth perception
    int iterations1 = min(100, int(mix(30.0, 100.0, cycleProgress))); // Fewer iterations early in the cycle
    int iterations2 = 100;

    // Generate fractal patterns
    vec4 currentFractal = generateFractal(patternUV1, multiplier1, variation1, iterations1);
    vec4 nextFractal = generateFractal(patternUV2, multiplier2, variation2, iterations2);

    // Create distortion in the center for transition hiding
    float centerWeight = smoothstep(0.3, 0.0, originalDist);

    // Smooth transition between patterns
    float transitionEase = smoothstep(0.0, 1.0,
        smoothstep(transitionStart, 1.0, cycleProgress));

    // Extra smooth transition at center
    float centerTransition = mix(transitionEase,
        0.5 + 0.5 * sin(cycleProgress * 6.28 + originalDist * 10.0),
        centerWeight);

    // Super smooth transition with multiple overlapping wave patterns
    float wavePattern =
        0.3 * sin(originalDist * 15.0 + iTime * 2.0) +
        0.2 * sin(originalDist * 7.0 - iTime * 1.5) +
        0.15 * sin(originalDist * 3.0 + iTime * 0.7) +
        0.1 * sin(atan(originalUV.y, originalUV.x) * 6.0 + iTime * 1.0);

    float finalBlend = mix(centerTransition,
        centerTransition + wavePattern,
        centerWeight * transitionEase);
    finalBlend = clamp(finalBlend, 0.0, 1.0);

    // Blend fractals
    vec4 fractalColor = mix(currentFractal, nextFractal, finalBlend);

    // Add some color variation based on position and time
    vec3 color = vec3(
        sin(fractalColor.x * 10.0 + iTime),
        cos(fractalColor.y * 8.0 + iTime * 0.7),
        sin(fractalColor.z * 12.0 + iTime * 1.2)
    );

    // Normalize color
    color = color * 0.5 + 0.5;

    // Add smooth transition effects that persist for longer
    if (transitionEase > 0.01) {
        // Various spiral and swirl patterns
        float swirl = sin(originalDist * 10.0 - iTime * 3.0) * transitionEase * 0.5;
        float spiral = sin(atan(originalUV.y, originalUV.x) * 5.0 + iTime * 2.0 + originalDist * 10.0) * transitionEase * 0.4;
        float spiral2 = sin(atan(originalUV.y, originalUV.x) * 8.0 - iTime * 1.5 + originalDist * 5.0) * transitionEase * 0.3;

        // Add transition effects to color with varying amounts
        color += vec3(swirl * 0.5, swirl * 0.4, swirl * 0.6) * transitionEase;
        color += vec3(spiral * 0.4, spiral * 0.5, spiral * 0.6) * transitionEase;
        color += vec3(spiral2 * 0.3, spiral2 * 0.5, spiral2 * 0.4) * transitionEase;

        // Add pulse effects with varying frequencies
        float pulse1 = sin(originalDist * 20.0 - iTime * 5.0) * 0.2;
        float pulse2 = sin(originalDist * 8.0 - iTime * 3.0) * 0.15;
        float pulse3 = sin(originalDist * 4.0 - iTime * 1.0) * 0.1;

        color += vec3(pulse1 * 0.4, pulse1 * 0.3, pulse1 * 0.5) * transitionEase;
        color += vec3(pulse2 * 0.3, pulse2 * 0.4, pulse2 * 0.3) * transitionEase;
        color += vec3(pulse3 * 0.4, pulse3 * 0.3, pulse3 * 0.4) * transitionEase;
    }

    // Add extended effects that persist between cycles
    float continuousCycle = iTime / RESET_PERIOD;
    float continuousEffect = 0.1 * sin(continuousCycle * 6.28 + originalDist * 5.0);
    color += vec3(continuousEffect * 0.1, continuousEffect * 0.05, continuousEffect * 0.15);

    // Add center glow to hide artifacts
    float centerGlow = smoothstep(0.2, 0.0, originalDist);
    vec3 glowColor = mix(
        color,
        vec3(0.8, 0.7, 0.9),
        centerGlow * (0.3 + 0.2 * sin(iTime * 0.5))
    );

    // Apply center glow
    color = mix(color, glowColor, centerGlow * 0.7);

    // Handle initial fade-in
    float initFade = smoothstep(0.0, 2.0, iTime);
    color *= initFade;

    // Saturation adjustment to maintain visual interest
    float saturation = 1.0 + 0.2 * sin(iTime * 0.3);
    vec3 luminance = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
    color = mix(luminance, color, saturation);

    // Output final color
    fragColor = vec4(color, 1.0);
}
