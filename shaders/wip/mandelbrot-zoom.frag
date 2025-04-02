//http://localhost:6969/edit.html?knob_30=0.118&knob_30.min=0&knob_30.max=1&knob_35=0.575&knob_35.min=0&knob_35.max=1&knob_36=0.165&knob_36.min=0&knob_36.max=1&knob_31=0.417&knob_31.min=0&knob_31.max=1&knob_44=0.094&knob_44.min=0&knob_44.max=1&knob_34=0.307&knob_34.min=0&knob_34.max=1&knob_37=0.071&knob_37.min=0&knob_37.max=1&knob_47=0&knob_47.min=0&knob_47.max=1&knob_46=0.961&knob_46.min=0&knob_46.max=1&knob_45=0.268&knob_45.min=0&knob_45.max=1&knob_32=0&knob_32.min=0&knob_32.max=1&knob_33=0.756&knob_33.min=0&knob_33.max=1&knob_40=1&knob_40.min=0&knob_40.max=1
#define PROBE_1 mix(1., float(frame/1000), animateBounce(iTime/100.))
#define PROBE_2 mix(0.55, 2., animateEaseInOutQuad(knob_34))    // 'fan out' swirls -> multiple squares
#define PROBE_3 mix(-1.7, 10., knob_36)    // color
#define PROBE_4 mod(float(frame), 310.15)/100.
#define PROBE_5 mix(0.47, 0.97, animatePulse(iTime/100.))    // complexity + zoom
#define PROBE_6 mix(0.1, 0.3, pow(iTime, 0.9))      // zoom speed
#define RESET_PERIOD sin(iTime/100.)*0.02 // seconds between zoom resets
#define TRANSITION_LENGTH 1.1  // Portion of cycle dedicated to transition (0.0-1.0)
#define AA_RADIUS knob_30         // Radius for center anti-aliasing
#define MAX_ITER 100           // Maximum iterations for fractal generation
#define INNER_CIRCLE_BLEND knob_40 // Controls how much the center circle blends (0.0-1.0)
#define ZOOM_SPEED 0.12         // Base zoom speed
#define EPSILON 0.00001        // Small value to prevent division by zero
#define PATTERN_SCALE 1.5      // Base pattern scale
#define CENTER_DETAIL_BOOST sin(float(frame / 40))*10.

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

// Smooth transition between patterns using easing
float smoothTransition(float progress, float smoothness) {
    return smoothstep(0.0, smoothness, progress) * smoothstep(1.0, 1.0 - smoothness, progress);
}

// Applies a periodic transformation using an inversion factor.
vec2 applyPeriodicTransformationAndTraps(vec2 position, vec2 multiplier, float variation) {
    // Add small offset to prevent zero division issues at origin
    position += vec2(EPSILON * sin(iTime), EPSILON * cos(iTime));

    float d = dot(position, position);
    // Ensure we never divide by values too close to zero
    float inv = 1.0 / max(d, EPSILON);
    position = 0.5 * sin(multiplier * position * inv * PROBE_5 * variation);
    return position;
}

// Simple noise function to add visual interest
float noise(vec2 uv) {
    return random(uv);
}

// Generate a fractal pattern with limited iterations
vec4 generateFractal(vec2 uv, vec2 multiplier, float variation, int iterations) {
    vec4 fractalColor = vec4(1e6);

    // Hard limit of MAX_ITER iterations for performance
    iterations = min(MAX_ITER, iterations);

    for (int i = 0; i < MAX_ITER; i++) {
        if (i >= iterations) break;

        uv = applyPeriodicTransformationAndTraps(uv, multiplier, variation);
        float lengthTrap = length(uv);
        float minAxesTrap = min(abs(uv.x), abs(uv.y));
        float diagonalDotTrap = abs(dot(uv, vec2(PROBE_3, PROBE_4)));
        fractalColor = min(fractalColor, vec4(lengthTrap, minAxesTrap, diagonalDotTrap, 1.0));
    }

    return fractalColor;
}

// Adds detail to the center to prevent solid color
vec3 detailEnhance(vec3 color, vec2 uv, float centerWeight) {
    // Avoid exact zero coordinates to prevent seams
    uv += vec2(EPSILON * sin(iTime * 1.23), EPSILON * cos(iTime * 0.97));

    // Add subtle noise pattern for visual interest
    float noise = fract(sin(dot(uv + 0.01, vec2(12.9898, 78.233))) * 43758.5453);

    // Create subtle patterns that vary with time - avoid exact multiples
    float pattern1 = sin(length(uv) * 29.97 + iTime * 2.53) * 0.5 + 0.5;
    float pattern2 = cos(atan(uv.y + EPSILON, uv.x + EPSILON) * 8.13 + iTime * 1.47) * 0.5 + 0.5;

    // Mix these patterns to prevent solid color
    vec3 detailColor = vec3(
        mix(0.4, 0.6, pattern1),
        mix(0.3, 0.7, pattern2),
        mix(0.5, 0.8, noise)
    );

    // Calculate luminance of original color to preserve it somewhat
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    detailColor = mix(detailColor, vec3(luma), 0.5);

    // Blend with original color based on centerWeight
    return mix(color, detailColor, centerWeight * CENTER_DETAIL_BOOST);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 resolution = iResolution.xy;
    // Center and normalize UV to roughly [-0.5, 0.5]
    vec2 uv = (fragCoord - 0.5 * resolution) / resolution.x;

    // Add tiny offset to prevent exact zero coordinates
    uv += vec2(EPSILON * sin(fragCoord.y * 0.01), EPSILON * cos(fragCoord.x * 0.01));

    // Store original UV for final color blending
    vec2 originalUV = uv;
    float originalDist = length(originalUV);

    // Fast early exit for pixels outside view (optional optimization)
    if (originalDist > 1.5) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // TRUE CONTINUOUS ZOOM - use exponential function with base 2
    // This gives us perfect fractal self-similarity at powers of 2
    float continuousZoom = pow(2.0, iTime * ZOOM_SPEED);

    // Calculate zoom cycle position for smooth transitions
    float zoomLevel = iTime * ZOOM_SPEED;
    float zoomFraction = fract(zoomLevel);

    // Use easeInOutSine for smoother transitions
    float smoothZoomFraction = sin(zoomFraction);

    // Get integer zoom level for pattern selection
    int zoomLevelInt = int(floor(zoomLevel));

    // Add base rotation that's continuous and subtle
    float baseRotation = 0.1 * sin(iTime * 0.05);
    uv = rotate(uv, baseRotation);

    // Apply main zoom - INWARD zoom by dividing
    vec2 zoomedUV = uv / continuousZoom;

    // Apply continuous slow rotation that's independent of zoom level
    // Use a smooth animation function for rotation
    float continuousRotation = iTime * 0.03 * animateEaseInOutQuad(sin(iTime * 0.1) * 0.5 + 0.5);
    zoomedUV = rotate(zoomedUV, continuousRotation);

    // Create pattern parameters that depend on integer zoom level
    // Use animation functions to create smooth transitions
    float seed1 = float(zoomLevelInt);
    float seed2 = float(zoomLevelInt + 1);

    // Use animation functions for pattern variations
    float angleOffset1 = 0.1 * sin(seed1 * 1.618);
    float angleOffset2 = 0.1 * sin(seed2 * 1.618);

    // Smooth pattern variations
    float variation1 = 0.95 + 0.05 * animateEaseInOutQuad(sin(seed1 * 0.7 + 1.047) * 0.5 + 0.5);
    float variation2 = 0.95 + 0.05 * animateEaseInOutQuad(sin(seed2 * 0.7 + 1.047) * 0.5 + 0.5);

    // Scale pattern multipliers to create true self-similarity at powers of 2
    vec2 multiplier1 = PATTERN_SCALE * vec2(
        PROBE_1 * (1.0 + 0.05 * sin(seed1 * 2.618)),
        PROBE_2 * (1.0 + 0.05 * cos(seed1 * 1.047))
    );

    vec2 multiplier2 = PATTERN_SCALE * vec2(
        PROBE_1 * (1.0 + 0.05 * sin(seed2 * 2.618)),
        PROBE_2 * (1.0 + 0.05 * cos(seed2 * 1.047))
    );

    // Get previous frame color for temporal blending
    vec4 prevFrameColor = getLastFrameColor(originalUV);

    // Anti-aliasing weight calculation
    float centerFade = smoothstep(AA_RADIUS * (1.0 + INNER_CIRCLE_BLEND), 0.0, originalDist);
    float aaWeight = centerFade * pow(centerFade, mix(0.5, 2.0, INNER_CIRCLE_BLEND));

    // Prepare pattern UVs - add a small nudge to avoid numerical issues
    vec2 patternUV1 = rotate(zoomedUV + vec2(EPSILON), angleOffset1);
    vec2 patternUV2 = rotate(zoomedUV + vec2(EPSILON), angleOffset2);

    // Use a smoothstep for better blending between zoom levels
    float blendEase = animateEaseInOutCubic(smoothZoomFraction);

    // Iteration count variation - use animation functions for smooth transitions
    int iterations1 = min(MAX_ITER, 5 + int(2.0 * sin(seed1)));
    int iterations2 = min(MAX_ITER, 5 + int(2.0 * sin(seed2)));

    // Generate the two patterns we'll blend between
    int iterCount1 = max(4, int(float(iterations1) * (1.0 - 0.4 * aaWeight)));
    vec4 fractalResult1 = generateFractal(patternUV1, multiplier1, variation1, iterCount1);

    int iterCount2 = max(4, int(float(iterations2) * (1.0 - 0.4 * aaWeight)));
    vec4 fractalResult2 = generateFractal(patternUV2, multiplier2, variation2, iterCount2);

    // Compute colors with smooth time-based variation
    vec3 color1 = vec3(
        sin(fractalResult1.x * 10.0 + iTime * 0.5),
        cos(fractalResult1.y * 8.0 + iTime * 0.3),
        sin(fractalResult1.z * 12.0 + iTime * 0.7)
    );
    color1 = color1 * 0.5 + 0.5;

    vec3 color2 = vec3(
        sin(fractalResult2.x * 10.0 + iTime * 0.5),
        cos(fractalResult2.y * 8.0 + iTime * 0.3),
        sin(fractalResult2.z * 12.0 + iTime * 0.7)
    );
    color2 = color2 * 0.5 + 0.5;

    // Blend between the two zoom levels using animation easing
    vec3 color = mix(color1, color2, blendEase);

    // Apply temporal anti-aliasing in center
    if (aaWeight > 0.05) {
        float temporalBlend = mix(0.1, 0.6, INNER_CIRCLE_BLEND) * aaWeight * aaWeight;
        color = mix(color, prevFrameColor.rgb, temporalBlend);
    }

    // Add noise patterns to prevent solid colors
    float basicNoise = rand(originalUV + vec2(iTime * 0.01, iTime * 0.02));

    // Varying size noise patterns with animated scales
    float smallScale = 15.0 + 10.0 * sin(iTime * 0.1);
    float smallNoise = rand(originalUV * smallScale + vec2(iTime * 0.5, iTime * 0.3));
    float mediumNoise = rand(originalUV * 8.0 + vec2(iTime * 0.2, iTime * 0.1));
    float largeNoise = rand(originalUV * 3.0 + vec2(iTime * 0.1, iTime * 0.05));

    // Zoom-based noise that appears to move with the zoom
    float zoomedNoise = rand(patternUV1 * 5.0 + vec2(0.1, 0.1));

    // Animate noise patterns with circular motion
    vec2 animatedUV = originalUV;
    animatedUV.x += sin(iTime * 0.2 + originalUV.y * 5.0) * 0.02;
    animatedUV.y += cos(iTime * 0.3 + originalUV.x * 4.0) * 0.02;
    float movingNoise = rand(animatedUV * 10.0);

    // Create animated patterns using animation functions
    float pattern1 = sin(originalUV.x * 20.0 + iTime) * sin(originalUV.y * 20.0 + iTime * 1.2) * 0.5 + 0.5;
    float pattern2 = sin(length(originalUV) * 15.0 - iTime * 1.1) * 0.5 + 0.5;
    float pattern3 = sin(atan(originalUV.y + EPSILON, originalUV.x + EPSILON) * 6.0 + iTime * 0.7) * 0.5 + 0.5;

    // Create a pattern-based mask that fades to edges (less pattern near center)
    float patternMask = smoothstep(0.0, 0.8, originalDist);

    // Combine all noise and patterns with varying intensities
    float combinedNoise = mix(
        mix(smallNoise, mediumNoise, 0.5) * 0.6 +
        largeNoise * 0.3 +
        movingNoise * 0.4 +
        zoomedNoise * 0.5,
        mix(pattern1, pattern2, pattern3) * 0.7,
        0.4
    );

    // Apply noise subtly, more in outer areas than center
    float noiseAmount = mix(0.03, 0.15, patternMask);
    color = mix(color, vec3(combinedNoise * 0.8 + 0.2), noiseAmount);

    // Add spiral effects based on angle with animation
    float angle = atan(originalUV.y + EPSILON, originalUV.x + EPSILON);
    float spiral = sin(angle * 5.0 + iTime * 0.5 + originalDist * 10.0) * 0.1;
    color += vec3(spiral * 0.4, spiral * 0.5, spiral * 0.6) * (0.1 + 0.05 * sin(iTime * 0.3));

    // Add center glow with optimized calculation and user control
    if (centerFade > 0.05) {
        float centerGlowAmount = mix(0.1, 0.35, 1.0 - INNER_CIRCLE_BLEND);
        float centerGlow = pow(centerFade, mix(3.0, 1.5, INNER_CIRCLE_BLEND));

        vec3 glowColor = mix(
            color,
            vec3(0.8, 0.7, 0.9),
            centerGlow * centerGlowAmount
        );

        float glowIntensity = mix(0.3, 0.7, 1.0 - INNER_CIRCLE_BLEND) * centerGlow;
        color = mix(color, glowColor, glowIntensity);
    }

    // Handle initial fade-in with smooth animation
    float initFade = sin(smoothstep(0.0, 2.0, iTime));
    color *= initFade;

    // Output final color
    fragColor = vec4(color, 1.0);
}
