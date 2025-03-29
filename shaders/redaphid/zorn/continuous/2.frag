//http://localhost:6969/edit.html?knob_41=0.11&knob_41.min=0&knob_41.max=1&knob_40=0.502&knob_40.min=0&knob_40.max=1&knob_32=0&knob_32.min=0&knob_32.max=1&knob_43=0.15&knob_43.min=0&knob_43.max=1&knob_30=0.213&knob_30.min=0&knob_30.max=1&knob_35=0.488&knob_35.min=0&knob_35.max=1&knob_36=0.142&knob_36.min=0&knob_36.max=1&knob_33=0.992&knob_33.min=0&knob_33.max=1&knob_31=0&knob_31.min=0&knob_31.max=1&knob_44=0.094&knob_44.min=0&knob_44.max=1&knob_34=0.591&knob_34.min=0&knob_34.max=1&knob_37=0.205&knob_37.min=0&knob_37.max=1&knob_47=0.543&knob_47.min=0&knob_47.max=1&knob_46=0.961&knob_46.min=0&knob_46.max=1&knob_45=0.268&knob_45.min=0&knob_45.max=1
#define PROBE_1 mix(1., 1.4, knob_34)
#define PROBE_2 mix(0.55, 2., knob_35)    // 'fan out' swirls -> multiple squares
#define PROBE_3 mix(-1.7, 10., knob_36)    // color
#define PROBE_4 mod(float(frame), 310.15)/100.
#define PROBE_5 mix(0.47, 0.97, knob_34)    // complexity + zoom
#define PROBE_6 mix(0.1, 0.3, knob_35)      // zoom speed
#define RESET_PERIOD mix(10.0, 30.0, knob_36) // seconds between zoom resets
#define TRANSITION_LENGTH 1.1  // Portion of cycle dedicated to transition (0.0-1.0)
#define AA_RADIUS knob_30         // Radius for center anti-aliasing
#define MAX_ITER 10           // Maximum iterations for fractal generation
#define INNER_CIRCLE_BLEND knob_40 // Controls how much the center circle blends (0.0-1.0)
#define ZOOM_SPEED 10.15       // Base zoom speed (reduced to prevent panning sensation)
#define EPSILON 0.00001        // Small value to prevent division by zero
#define PATTERN_CHANGE_SCALE 0.4 // How much pattern changes between cycles
#define CENTER_DETAIL_BOOST sin(float(frame / 40))*1.

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
    uv += vec2(EPSILON * 0.1 * sin(fragCoord.y * 0.01), EPSILON * 0.1 * cos(fragCoord.x * 0.01));

    // Store original UV for final color blending
    vec2 originalUV = uv;
    float originalDist = length(originalUV);

    // Fast early exit for pixels outside view (optional optimization)
    if (originalDist > 1.5) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Get cycle time info for pattern blending
    float cycleTime = mod(iTime, RESET_PERIOD);
    float cycleProgress = cycleTime / RESET_PERIOD;
    float cycleNumber = floor(iTime / RESET_PERIOD);

    // Fixed time base for pattern rotation to prevent panning
    float fixedTimeBase = mod(iTime, 100.0); // Loop every 100 seconds to avoid floating point issues

    // Base rotation that's stable for each pattern
    float baseRotation = 0.3 * sin(fixedTimeBase * 0.05);

    // Calculate zoom factor based on cycle progress (0->1) rather than global time
    // This makes a zoom cycle that resets with each cycle, creating the zoom illusion
    float zoomFactor = mix(1.0, 4.0, cycleProgress); // Zoom out 4x during each cycle

    // Apply fixed rotation to input coordinates
    vec2 rotatedUV = rotate(uv, baseRotation);

    // Apply zoom - divide by zoom factor
    vec2 zoomedUV = rotatedUV / zoomFactor;

    // Apply slow continuous rotation based on cycle progress
    float progressRotation = cycleProgress * 0.8;
    zoomedUV = rotate(zoomedUV, progressRotation);

    // Create different pattern parameters for each cycle - significant change
    float seed1 = cycleNumber;
    float seed2 = cycleNumber + 1.0;

    // Use significant pattern changes between cycles to create zoom illusion
    // Even though we zoom out, the pattern changes enough that it feels like new zoom level
    float patternScale1 = PATTERN_CHANGE_SCALE * (1.0 + 0.2 * sin(seed1 * 2.71));
    float patternScale2 = PATTERN_CHANGE_SCALE * (1.0 + 0.2 * sin(seed2 * 2.71));

    // Generate variation parameters with significant change between cycles
    float angleOffset1 = sin(seed1 * 3.14) * 0.3;
    float angleOffset2 = sin(seed2 * 3.14) * 0.3;
    float variation1 = 0.9 + sin(seed1 * 0.7) * 0.2;
    float variation2 = 0.9 + sin(seed2 * 0.7) * 0.2;

    // Create very different multipliers between cycles - major pattern change
    vec2 multiplier1 = vec2(
        PROBE_1 * (1.0 + sin(seed1) * 0.2) * patternScale1,
        PROBE_2 * (1.0 + cos(seed1 * 0.7) * 0.2) * patternScale1
    );

    vec2 multiplier2 = vec2(
        PROBE_1 * (1.0 + sin(seed2) * 0.2) * patternScale2,
        PROBE_2 * (1.0 + cos(seed2 * 0.7) * 0.2) * patternScale2
    );

    // Get the previous frame's color for temporal blending
    vec4 prevFrameColor = getLastFrameColor(originalUV + random(uv)/2.);

    // Anti-aliasing weight calculation - with user control for blending intensity
    float centerFade = smoothstep(AA_RADIUS * (1.0 + INNER_CIRCLE_BLEND), 0.0, originalDist);
    float aaWeight = centerFade * pow(centerFade, mix(0.5, 2.0, INNER_CIRCLE_BLEND));

    // Special handling for extreme center
    float extremeCenterFade = smoothstep(0.05, 0.0, originalDist);

    // Proper pattern UVs for each cycle - add rotation for transition
    vec2 patternUV1 = rotate(zoomedUV + vec2(EPSILON, EPSILON), angleOffset1);
    vec2 patternUV2 = rotate(zoomedUV + vec2(EPSILON, EPSILON), angleOffset2);

    // Transition begins earlier and lasts longer
    float transitionStart = 1.0 - TRANSITION_LENGTH;
    float transitionEase = smoothstep(0.0, 1.0,
        smoothstep(transitionStart, 1.0, cycleProgress));

    // Iteration count variation - keeping counts LOW for performance
    int iterations1 = min(MAX_ITER, int(mix(5.0, 10.0, cycleProgress)));
    int iterations2 = min(MAX_ITER, int(mix(7.0, 10.0, transitionEase)));

    // Prepare colors for blending
    vec3 currentCycleColor;
    vec3 nextCycleColor;

    // Generate pattern for current cycle
    int iterCount1 = max(4, int(float(iterations1) * (1.0 - 0.4 * aaWeight)));
    vec4 fractalResult1 = generateFractal(patternUV1, multiplier1, variation1, iterCount1);

    // Compute color for current cycle
    currentCycleColor = vec3(
        sin(fractalResult1.x * 10.0 + iTime),
        cos(fractalResult1.y * 8.0 + iTime * 0.7),
        sin(fractalResult1.z * 12.0 + iTime * 1.2)
    );
    currentCycleColor = currentCycleColor * 0.5 + 0.5;

    // Only generate next cycle color when needed
    if (transitionEase > 0.01) {
        int iterCount2 = max(4, int(float(iterations2) * (1.0 - 0.4 * aaWeight)));
        vec4 fractalResult2 = generateFractal(patternUV2, multiplier2, variation2, iterCount2);

        nextCycleColor = vec3(
            sin(fractalResult2.x * 10.0 + iTime),
            cos(fractalResult2.y * 8.0 + iTime * 0.7),
            sin(fractalResult2.z * 12.0 + iTime * 1.2)
        );
        nextCycleColor = nextCycleColor * 0.5 + 0.5;
    } else {
        nextCycleColor = currentCycleColor;
    }

    // Add a larger wave pattern during transition
    float wavePattern = 0.3 * sin(originalDist * 10.0 + iTime * 2.0);

    // Blend between cycles
    float cycleBlend = mix(transitionEase, transitionEase + wavePattern * 0.5, aaWeight);
    cycleBlend = clamp(cycleBlend, 0.0, 1.0);

    // Main color mix between current and next cycle
    vec3 color = mix(currentCycleColor, nextCycleColor, cycleBlend);

    // Apply temporal anti-aliasing in center
    if (aaWeight > 0.05) {
        float temporalBlend = mix(0.1, 0.6, INNER_CIRCLE_BLEND) * aaWeight * aaWeight;
        color = mix(color, prevFrameColor.rgb, temporalBlend);
    }

    // ALWAYS ADD NOISE PATTERNS to prevent solid colors (even outside center)
    // This is the key fix that ensures we never have large solid areas

    // Base noise that changes with time
    float basicNoise = rand(originalUV + vec2(iTime * 0.01, iTime * 0.02));

    // Different sized noise patterns for visual interest
    float smallScale = 15.0 + 10.0 * sin(iTime * 0.1); // Scale that changes slowly
    float smallNoise = rand(originalUV * smallScale + vec2(iTime * 0.5, iTime * 0.3));
    float mediumNoise = rand(originalUV * 8.0 + vec2(iTime * 0.2, iTime * 0.1));
    float largeNoise = rand(originalUV * 3.0 + vec2(iTime * 0.1, iTime * 0.05));

    // Create animated noise with zoomed coordinates so it doesn't appear static
    // Use pattern UVs for noise to maintain zoom feel
    float zoomedNoise = rand((patternUV1 * 5.0) + vec2(0.1, 0.1));

    // Animate noise patterns with circular motion
    vec2 animatedUV = originalUV;
    animatedUV.x += sin(iTime * 0.2 + originalUV.y * 5.0) * 0.02;
    animatedUV.y += cos(iTime * 0.3 + originalUV.x * 4.0) * 0.02;
    float movingNoise = rand(animatedUV * 10.0);

    // Create animated patterns - use zoom-adjusted frequencies
    // This makes patterns appear at consistent scale despite zooming
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
        zoomedNoise * 0.5, // Add zoom-affected noise
        mix(pattern1, pattern2, pattern3) * 0.7,
        0.4
    );

    // Apply noise subtly, more in outer areas than center
    float noiseAmount = mix(0.03, 0.15, patternMask);
    color = mix(color, vec3(combinedNoise * 0.8 + 0.2), noiseAmount);

    // Add minimal transition effects - only when needed
    if (transitionEase > 0.1) {
        float angle = atan(originalUV.y + EPSILON, originalUV.x + EPSILON);
        float spiral = sin(angle * 5.0 + iTime * 2.0 + originalDist * 10.0) * transitionEase * 0.4;
        color += vec3(spiral * 0.4, spiral * 0.5, spiral * 0.6) * transitionEase;
    }

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

    // Handle initial fade-in
    float initFade = smoothstep(0.0, 2.0, iTime);
    color *= initFade;

    // Output final color
    fragColor = vec4(color, 1.0);
}
