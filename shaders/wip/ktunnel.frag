//http://localhost:6969/edit.html?knob_30=0.118&knob_30.min=0&knob_30.max=1&knob_35=0.575&knob_35.min=0&knob_35.max=1&knob_36=0.165&knob_36.min=0&knob_36.max=1&knob_31=0.417&knob_31.min=0&knob_31.max=1&knob_44=0.094&knob_44.min=0&knob_44.max=1&knob_34=0.307&knob_34.min=0&knob_34.max=1&knob_37=0.071&knob_37.min=0&knob_37.max=1&knob_47=0&knob_47.min=0&knob_47.max=1&knob_46=0.961&knob_46.min=0&knob_46.max=1&knob_45=0.268&knob_45.min=0&knob_45.max=1&knob_32=0&knob_32.min=0&knob_32.max=1&knob_33=0.756&knob_33.min=0&knob_33.max=1&knob_40=1&knob_40.min=0&knob_40.max=1&knob_41=0.5&knob_41.min=0&knob_41.max=1&knob_70=0.5&knob_70.min=0&knob_70.max=1&knob_44=0.5&knob_44.min=0&knob_44.max=1&knob_71=0.5&knob_71.min=0&knob_71.max=1&knob_72=0.5&knob_72.min=0&knob_72.max=1&knob_73=0.5&knob_73.min=0&knob_73.max=1&knob_74=0.5&knob_74.min=0&knob_74.max=1
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
#define PROBE_5 (0.5 + 0.5 * knob_79) // Example: another cyclical value between 0 and 1

#define AA_RADIUS knob_30
#define MAX_ITER 400
#define INNER_CIRCLE_BLEND knob_40
#define ZOOM_SPEED knob_41    // Controls how many zoom cycles happen per loop (use integer values for perfect loops)
#define ROTATION_SPEED knob_70 // Controls how many rotations happen per loop (use integer values for perfect loops)
#define FORWARD_SPEED knob_71 * 2.0 // Speed pattern flows through the tunnel
#define TWIST_FACTOR knob_72 * 5.0   // How much the tunnel spirals based on distance
#define TUNNEL_SCALE knob_73 * 2.0 + 0.5 // Controls the perceived scale/depth of the tunnel
#define DISTANCE_OFFSET mix(-2.0, 2.0, knob_74) // Shifts the view forward/backward in the tunnel
#define CENTER_SMOOTHING knob_44 // Controls how much to smooth the fractal result near the center
#define EPSILON 0.00001
#define PATTERN_SCALE 1.5
#define CENTER_DETAIL_BOOST sin(FRAME_ANGLE)*10. // Keep this for now, might adjust later
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
    // Add small offset based on frame angle to prevent static artifacts at origin
    position += vec2(EPSILON * sin(FRAME_ANGLE * 1.73), EPSILON * cos(FRAME_ANGLE * 2.31));

    float d = dot(position, position);
    // Ensure we never divide by values too close to zero, add a small constant bias
    float inv = 1.0 / (d + EPSILON * 0.1); // Added small bias to d
    position = 0.5 * sin(multiplier * position * inv * PROBE_5 * variation);
    return position;
}

// Simple noise function to add visual interest
float noise(vec2 uv) {
    return random(uv);
}

// Generate a fractal pattern with limited iterations
vec4 generateFractal(vec2 uv, vec2 multiplier, float variation, int iterations) {
    vec4 fractalColor = vec4(1e6); // Initialize with large values for min function

    // Hard limit of MAX_ITER iterations for performance
    iterations = min(MAX_ITER, iterations);

    for (int i = 0; i < MAX_ITER; i++) {
        if (i >= iterations) break;

        uv = applyPeriodicTransformationAndTraps(uv, multiplier, variation);
        float lengthTrap = length(uv);
        float minAxesTrap = min(abs(uv.x), abs(uv.y));
        float diagonalDotTrap = abs(dot(uv, vec2(PROBE_3, PROBE_4)));

        // Use mix for smoother trap accumulation if needed, but min is often fine
        fractalColor = min(fractalColor, vec4(lengthTrap, minAxesTrap, diagonalDotTrap, 1.0));
    }

    // Prevent excessively small values which can cause issues
    fractalColor = max(fractalColor, vec4(EPSILON));

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

    // --- Tunnel Coordinate Transformation ---
    float r = length(uv) + EPSILON; // Add epsilon to avoid log(0)

    // 1. Base log distance and screen angle
    float log_dist = log(r) + DISTANCE_OFFSET; // Base log distance includes offset
    float screen_angle = atan(uv.y, uv.x); // Angle from screen center

    // 2. Calculate angle components: Rotation + Twist
    float rotation_angle = FRAME_ANGLE * ROTATION_SPEED * 0.2;
    float twist_angle = log_dist * TWIST_FACTOR;
    float final_angle = screen_angle + rotation_angle + twist_angle;

    // 3. Map back to Cartesian-like space using the final angle and base log distance
    // The scale is determined by log_dist, which doesn't have FRAME_ANGLE*SPEED added directly
    vec2 fractalInputUV = vec2(cos(final_angle), sin(final_angle)) * exp(log_dist * TUNNEL_SCALE);
    // --- End Tunnel Coordinate Transformation ---

    // Pattern generation based on cyclical FRAME_ANGLE
    // Make pattern evolution more complex/flowing
    // Use FRAME_ANGLE * FORWARD_SPEED here to influence pattern evolution, simulating flow
    vec2 multiplier = PATTERN_SCALE * vec2(
        1.5 + 0.5 * sin(FRAME_ANGLE * 0.7 + cos(FRAME_ANGLE * 0.3) + FRAME_ANGLE * FORWARD_SPEED * 0.05), // Added flow component
        1.5 + 0.5 * cos(FRAME_ANGLE * 0.5 + sin(FRAME_ANGLE * 0.4) - FRAME_ANGLE * FORWARD_SPEED * 0.03)  // Added flow component (different direction/speed)
    );

    // More complex variation over time
    float variation = 0.9 + 0.1 * sin(FRAME_ANGLE * 1.618 + cos(FRAME_ANGLE * 0.9 + FRAME_ANGLE * FORWARD_SPEED * 0.02) * PI); // Added flow component

    // Generate fractal using the final combined coords (static view + flow)
    vec4 fractalResult = generateFractal(fractalInputUV, multiplier, variation, MAX_ITER);

    // --- Anti-Aliasing using Derivatives ---
    vec4 dx = dFdx(fractalResult);
    vec4 dy = dFdy(fractalResult);
    // Use length squared for efficiency if sqrt is bottleneck, but length is fine
    float gradientLength = length(vec2(length(dx), length(dy)));
    // Adjust smoothstep range for desired effect
    float smoothFactor = smoothstep(0.0, 0.1, gradientLength); // Start smoothing earlier
    // --- End Anti-Aliasing ---

    // --- Center Smoothing & Detail ---
    // Calculate weight for center operations (smoothing, detail, temporal AA)
    // Use the original radial distance (r) for fading effects if needed, or relate it to tunnel_dist
    // Let's use r for now, but scale the radius based on tunnel parameters potentially
    float fadeRadius = AA_RADIUS * (1.0 + INNER_CIRCLE_BLEND) * (1.0 + TUNNEL_SCALE * 0.5); // Adjust fade based on scale
    float centerFade = smoothstep(fadeRadius, 0.0, r);
    float aaWeight = centerFade * pow(centerFade, mix(0.5, 2.0, INNER_CIRCLE_BLEND)); // Keep existing weight profile

    // Smooth the raw fractal result near the center before coloring
    // Mix fractalResult towards its average or a neutral value based on aaWeight
    vec4 smoothedFractalResult = mix(fractalResult, vec4(0.5), aaWeight * CENTER_SMOOTHING);

    // Optional: Add high-frequency detail back *after* smoothing, if needed
    // This might re-introduce some aliasing, use carefully
    // if (aaWeight > 0.05) {
    //     vec2 centerDetailUV = fractalInputUV + vec2(0.01 * sin(FRAME_ANGLE * 15.0), 0.01 * cos(FRAME_ANGLE * 11.0));
    //     vec4 centerFractalDetail = generateFractal(centerDetailUV, multiplier, variation, MAX_ITER / 2); // Fewer iterations for detail
    //     // Mix based on detail strength parameter if added
    //     smoothedFractalResult = mix(smoothedFractalResult, centerFractalDetail, aaWeight * 0.2); // Small amount of detail
    // }
    // --- End Center Smoothing & Detail ---

    // Color calculation based on cyclical FRAME_ANGLE, using the smoothed result
    vec3 color = vec3(
        sin(smoothedFractalResult.x * 10.0 + FRAME_ANGLE * 0.5), // Reduced color cycle speed
        cos(smoothedFractalResult.y * 8.0 + FRAME_ANGLE * 0.7), // Reduced color cycle speed
        sin(smoothedFractalResult.z * 12.0 + FRAME_ANGLE * 0.3)  // Reduced color cycle speed
    );
    color = color * 0.5 + 0.5; // Remap to [0, 1]

    // Apply derivative-based smoothing globally
    color = mix(color, vec3(0.5), smoothFactor * 0.5);

    // Apply temporal anti-aliasing using the previous frame's color in the center
    if (aaWeight > 0.01) { // Lower threshold slightly if needed
        vec4 prevFrameColor = getLastFrameColor(fragCoord / iResolution.xy); // Use original fragCoord for lookup
        // Adjust temporal blend strength and profile
        float temporalBlend = mix(0.1, 0.8, INNER_CIRCLE_BLEND) * aaWeight * aaWeight; // Potentially stronger blend

        // Modulate temporal blend by something interesting, e.g., fractal result component
        temporalBlend *= smoothstep(0.0, 0.5, smoothedFractalResult.y); // Example modulation

        color = mix(color, prevFrameColor.rgb, temporalBlend * 0.5);
    }

    // Final color output
    fragColor = vec4(color, 1.0);
}
