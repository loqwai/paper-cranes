#define PROBE_1 mix(1., 1.4, knob_34)
#define PROBE_2 mix(0.55, 2., knob_35)    // 'fan out' swirls -> multiple squares
#define PROBE_3 mix(-1.7, 10., knob_36)    // color
#define PROBE_4 mod(float(frame), 310.15)/100.
#define PROBE_5 mix(0.47, 0.97, knob_34)    // complexity + zoom
#define PROBE_6 mix(0.1, 0.3, knob_35)      // zoom speed
#define RESET_PERIOD mix(10.0, 30.0, knob_36) // seconds between zoom resets
#define TRANSITION_LENGTH 0.4  // Portion of cycle dedicated to transition (0.0-1.0)

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

    for (int i = 0; i < 100; i++) {
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

    // Calculate zoom factors - now zooming IN (dividing rather than multiplying)
    float zoomAmount = 5.0; // How much we zoom during one cycle
    float currentZoom = mix(1.0, 1.0/zoomAmount, cycleProgress); // Note the inversion for zooming in

    // Apply zoom to UV - division for zoom in
    vec2 zoomedUV = uv / currentZoom;

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

    // Apply rotation variations to create different patterns
    vec2 patternUV1 = rotate(zoomedUV, angleOffset1);
    vec2 patternUV2 = rotate(uv, angleOffset2); // Non-zoomed for next cycle

    // Iteration count variation for depth perception
    int iterations1 = 100;
    int iterations2 = int(mix(80.0, 100.0, resetBlend)); // Slightly fewer iterations for the next pattern

    // Generate fractal patterns
    vec4 currentFractal = generateFractal(patternUV1, multiplier1, variation1, iterations1);
    vec4 nextFractal = generateFractal(patternUV2, multiplier2, variation2, iterations2);

    // Create distortion in the center for transition hiding
    float centerWeight = smoothstep(0.3, 0.0, originalDist);

    // Enhanced transition when during blend period
    float transitionPhase = smoothstep(transitionStart, 1.0, cycleProgress);

    // Dynamic transition with wave patterns
    float wavePattern = sin(originalDist * 15.0 + iTime * 2.0) * 0.3 +
                        sin(originalDist * 7.0 - iTime * 1.5) * 0.2;

    // Blend fractals with extended transition effects
    float finalBlend = mix(resetBlend, resetBlend + wavePattern, centerWeight * transitionPhase);
    finalBlend = clamp(finalBlend, 0.0, 1.0);

    vec4 fractalColor = mix(currentFractal, nextFractal, finalBlend);

    // Add some color variation based on position and time
    vec3 color = vec3(
        sin(fractalColor.x * 10.0 + iTime),
        cos(fractalColor.y * 8.0 + iTime * 0.7),
        sin(fractalColor.z * 12.0 + iTime * 1.2)
    );

    // Normalize color
    color = color * 0.5 + 0.5;

    // Add extra visual interest during transitions - extended to entire transition period
    if (resetBlend > 0.01) {
        // Add swirling effect during transition
        float swirl = sin(originalDist * 10.0 - iTime * 3.0) * resetBlend * 0.5;
        float spiral = sin(atan(originalUV.y, originalUV.x) * 5.0 + iTime * 2.0 + originalDist * 10.0) * resetBlend * 0.4;

        color += vec3(swirl * 0.8, swirl * 0.6, swirl * 0.9) * resetBlend;
        color += vec3(spiral * 0.4, spiral * 0.5, spiral * 0.7) * resetBlend;

        // Add radial pulse effects
        float pulse1 = sin(originalDist * 20.0 - iTime * 5.0) * resetBlend * 0.3;
        float pulse2 = sin(originalDist * 8.0 - iTime * 3.0) * resetBlend * 0.2;
        color += vec3(pulse1 * 0.5, pulse1 * 0.3, pulse1 * 0.6);
        color += vec3(pulse2 * 0.3, pulse2 * 0.5, pulse2 * 0.4);
    }

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
