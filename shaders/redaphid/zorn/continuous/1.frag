#define PROBE_1 mix(1., 1.4, knob_34)
#define PROBE_2 mix(0.55, 2., knob_35)    // 'fan out' swirls -> multiple squares
#define PROBE_3 mix(-1.7, 10., knob_36)    // color
#define PROBE_4 mod(float(frame), 310.15)/100.
#define PROBE_5 mix(0.47, 0.97, knob_34)    // complexity + zoom
#define PROBE_6 mix(0.1, 0.5, knob_35)      // zoom speed

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
vec2 applyPeriodicTransformationAndTraps(vec2 position, vec2 multiplier) {
    float d = dot(position, position);
    float inv = 1.0 / (d + 0.0001);
    position = 0.5 * sin(multiplier * position * inv * PROBE_5);
    return position;
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

    // Calculate zoom based on time - decreasing value creates zoom-in effect
    float zoomFactor = max(0.1, 2.0 / (1.0 + PROBE_6 * iTime));

    // Apply zoom (smaller value = more zoom)
    uv *= zoomFactor;

    // Compute fractal detail by iterative transformation
    fragColor = vec4(1e6);
    vec2 multiplier = vec2(PROBE_1, PROBE_2);
    for (int i = 0; i < 100; i++) {
        uv = applyPeriodicTransformationAndTraps(uv, multiplier);
        float lengthTrap = length(uv);
        float minAxesTrap = min(abs(uv.x), abs(uv.y));
        float diagonalDotTrap = abs(dot(uv, vec2(PROBE_3, PROBE_4)));
        fragColor = min(fragColor, vec4(lengthTrap, minAxesTrap, diagonalDotTrap, 1.0));
    }

    // Add some color variation based on position and time
    vec3 color = vec3(
        sin(fragColor.x * 10.0 + iTime),
        cos(fragColor.y * 8.0 + iTime * 0.7),
        sin(fragColor.z * 12.0 + iTime * 1.2)
    );

    // Normalize color
    color = color * 0.5 + 0.5;

    // Create expanding circle effect
    float circleSize = min(1.5, 0.1 + iTime * 0.05);
    float circleMask = smoothstep(circleSize, circleSize - 0.1, originalDist);

    // Blend the circle edge
    float edgeBlend = smoothstep(circleSize, circleSize - 0.3, originalDist);
    vec3 edgeColor = mix(vec3(0.1, 0.05, 0.2), color, edgeBlend);

    // Final color with circle mask
    vec3 finalColor = mix(vec3(0.0), edgeColor, circleMask);

    // Output final color
    fragColor = vec4(finalColor, 1.0);
}
