//http://localhost:6969/edit.html?knob_30=0.118&knob_30.min=0&knob_30.max=1&knob_35=0.575&knob_35.min=0&knob_35.max=1&knob_36=0.165&knob_36.min=0&knob_36.max=1&knob_31=0.417&knob_31.min=0&knob_31.max=1&knob_44=0.094&knob_44.min=0&knob_44.max=1&knob_34=0.307&knob_34.min=0&knob_34.max=1&knob_37=0.071&knob_37.min=0&knob_37.max=1&knob_47=0&knob_47.min=0&knob_47.max=1&knob_46=0.961&knob_46.min=0&knob_46.max=1&knob_45=0.268&knob_45.min=0&knob_45.max=1&knob_32=0&knob_32.min=0&knob_32.max=1&knob_33=0.756&knob_33.min=0&knob_33.max=1&knob_40=1&knob_40.min=0&knob_40.max=1
#define LOOP_FRAMES 1000  // Number of frames in one complete loop
#define CURRENT_FRAME (iFrame % LOOP_FRAMES)  // Current frame in the loop
#define PI 3.14159265359
#define FRAME_ANGLE (float(CURRENT_FRAME) * 2.0 * PI / float(LOOP_FRAMES))

// Remove iTime based probes
// #define PROBE_1 fract(iTime * 0.1)
// #define PROBE_4 fract(iTime * 0.3)
// #define PROBE_5 fract(iTime * 0.2)
// #define PROBE_6 fract(iTime * 0.05)

#define PROBE_2 mix(0.55, 2., animateEaseInOutQuad(knob_34))
#define PROBE_3 mix(-1.7, 10., knob_36)

// Add frame-based probes for 4 and 5
#define PROBE_4 (0.5 + 0.5 * sin(FRAME_ANGLE * 3.0)) // Example: cyclical value between 0 and 1
#define PROBE_5 (0.5 + 0.5 * cos(FRAME_ANGLE * 2.0)) // Example: another cyclical value between 0 and 1

#define AA_RADIUS knob_30
#define MAX_ITER 100
#define INNER_CIRCLE_BLEND knob_40
#define ZOOM_SPEED 1.0        // Controls how many zoom cycles happen per loop
#define ROTATION_SPEED 1.0    // Controls how many rotations happen per loop
#define EPSILON 0.00001
#define PATTERN_SCALE 1.5
#define CENTER_DETAIL_BOOST sin(FRAME_ANGLE)*10.
// Removed PATTERN_EVOLUTION_SPEED as it's now tied to FRAME_ANGLE

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
    position += vec2(EPSILON * sin(iTime * 6.28318530718 / 1000.0), EPSILON * cos(iTime * 6.28318530718 / 1000.0));

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
    uv += vec2(EPSILON * sin(iTime * 6.28318530718 / 1000.0 * 1.23), EPSILON * cos(iTime * 6.28318530718 / 1000.0 * 0.97));

    // Add subtle noise pattern for visual interest
    float noise = fract(sin(dot(uv + 0.01, vec2(12.9898, 78.233))) * 43758.5453);

    // Create subtle patterns that vary with time - avoid exact multiples
    float pattern1 = sin(length(uv) * 29.97 + iTime * 6.28318530718 / 1000.0 * 2.53) * 0.5 + 0.5;
    float pattern2 = cos(atan(uv.y + EPSILON, uv.x + EPSILON) * 8.13 + iTime * 6.28318530718 / 1000.0 * 1.47) * 0.5 + 0.5;

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
    vec2 uv = (fragCoord - 0.5 * resolution) / resolution.x;

    // Use frame angle for offset
    uv += vec2(EPSILON * sin(FRAME_ANGLE), EPSILON * cos(FRAME_ANGLE));
    vec2 originalUV = uv;
    float originalDist = length(originalUV);

    if (originalDist > 1.5) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Frame-based looping zoom - completes ZOOM_SPEED cycles per loop
    float zoomProgress = fract(float(CURRENT_FRAME) / float(LOOP_FRAMES) * ZOOM_SPEED);
    float continuousZoom = pow(2.0, zoomProgress * 2.0 * PI);

    // Frame-based looping rotation - completes ROTATION_SPEED cycles per loop
    float baseRotation = FRAME_ANGLE * ROTATION_SPEED;
    uv = rotate(uv, baseRotation);
    vec2 zoomedUV = uv / continuousZoom;

    // Pattern generation based on cyclical FRAME_ANGLE
    vec2 multiplier = PATTERN_SCALE * vec2(
        1.0 + 0.5 * sin(FRAME_ANGLE),
        1.0 + 0.5 * cos(FRAME_ANGLE)
    );
    float variation = 0.95 + 0.05 * sin(FRAME_ANGLE * 1.618);

    // Generate fractal using zoomed coords and frame-based pattern params
    vec4 fractalResult = generateFractal(zoomedUV, multiplier, variation, MAX_ITER);

    // --- Anti-Aliasing using Derivatives ---
    vec4 dx = dFdx(fractalResult);
    vec4 dy = dFdy(fractalResult);
    float gradientLength = length(vec2(length(dx), length(dy)));
    float smoothFactor = smoothstep(0.01, 0.1, gradientLength);
    // --- End Anti-Aliasing ---

    // Color calculation based on cyclical FRAME_ANGLE
    vec3 color = vec3(
        sin(fractalResult.x * 10.0 + FRAME_ANGLE * 2.0),
        cos(fractalResult.y * 8.0 + FRAME_ANGLE * 3.0),
        sin(fractalResult.z * 12.0 + FRAME_ANGLE * 1.0)
    );
    color = color * 0.5 + 0.5;

    // Apply derivative-based smoothing
    color = mix(color, vec3(0.5), smoothFactor * 0.5);

    // Calculate anti-aliasing weight
    float centerFade = smoothstep(AA_RADIUS * (1.0 + INNER_CIRCLE_BLEND), 0.0, originalDist);
    float aaWeight = centerFade * pow(centerFade, mix(0.5, 2.0, INNER_CIRCLE_BLEND));

    // Add fractal detail and temporal anti-aliasing in center
    if (aaWeight > 0.05) {
        // Use FRAME_ANGLE for offset
        vec2 centerDetailUV = zoomedUV + vec2(0.01 * sin(FRAME_ANGLE * 15.0), 0.01 * cos(FRAME_ANGLE * 11.0));
        vec4 centerFractalResult = generateFractal(centerDetailUV, multiplier, variation, MAX_ITER);

        // Calculate center color based on cyclical FRAME_ANGLE
        vec3 centerDetailColor = vec3(
            sin(centerFractalResult.x * 10.0 + FRAME_ANGLE * 2.0),
            cos(centerFractalResult.y * 8.0 + FRAME_ANGLE * 3.0),
            sin(centerFractalResult.z * 12.0 + FRAME_ANGLE * 1.0)
        );
        centerDetailColor = centerDetailColor * 0.5 + 0.5;

        // Blend the main color with the center detail color
        color = mix(color, centerDetailColor, aaWeight * 0.7);

        // Apply temporal anti-aliasing using the previous frame's color
        vec4 prevFrameColor = getLastFrameColor(originalUV);
        float temporalBlend = mix(0.1, 0.6, INNER_CIRCLE_BLEND) * aaWeight * aaWeight;
        color = mix(color, prevFrameColor.rgb, temporalBlend * 0.5);
    }

    fragColor = vec4(color, 1.0);
}
