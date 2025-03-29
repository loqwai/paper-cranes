#define ROTATION controllerRotation
#define PULSE controllerPulse
#define COLOR_SHIFT controllerColorShift
#define BASS_IMPACT bassImpact
#define REACTIVITY reactivity
#define CUSTOM_BEAT customBeat

// Utility functions
vec2 rotate(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

float circle(vec2 p, float radius) {
    return length(p) - radius;
}

// Color palette function
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.3, 0.2, 0.2);
    return a + b * cos(6.28318 * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalized pixel coordinates
    vec2 uv = (fragCoord.xy - 0.5 * resolution.xy) / resolution.y;

    // Rotate based on controller value
    uv = rotate(uv, ROTATION);

    // Create pulsing effect using controller value
    float pulse = PULSE * 0.2 + 0.8;

    // Create multiple circles with different sizes and offsets
    float d1 = circle(uv, 0.3 * pulse);
    float d2 = circle(uv + vec2(sin(smoothTime * 0.7) * 0.2, cos(smoothTime * 0.5) * 0.1), 0.15 * pulse);
    float d3 = circle(uv + vec2(sin(smoothTime * 1.1) * 0.1, cos(smoothTime * 0.9) * 0.2), 0.1 * pulse);

    // Combine the shapes with smooth min
    float k = 0.2 + BASS_IMPACT * 0.3;
    float d = smoothstep(0.01, 0.0, min(d1, min(d2, d3)));

    // Add some rings based on the distance
    float rings = sin(length(uv) * 20.0 - smoothTime * 2.0) * 0.5 + 0.5;
    rings *= smoothstep(0.3, 0.0, abs(length(uv) - 0.3 * pulse));
    rings *= REACTIVITY;

    // Color the shapes
    vec3 color = palette(length(uv) + COLOR_SHIFT);

    // Add the rings
    color += rings * palette(COLOR_SHIFT + 0.3);

    // Add a flash effect on beats
    if (CUSTOM_BEAT) {
        color += vec3(0.2, 0.1, 0.3);
    }

    // Apply some subtle noise for texture
    float noise = fract(sin(dot(uv, vec2(12.9898, 78.233)) * 43758.5453));
    color += noise * 0.03;

    // Vignette effect
    float vignette = 1.0 - length(uv * 0.7);
    color *= vignette;

    // Output the color
    fragColor = vec4(color, 1.0);
}
