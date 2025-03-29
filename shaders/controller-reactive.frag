#define ROTATION controllerRotation
#define PULSE controllerPulse
#define COLOR_SHIFT controllerColorShift
#define BEAT customBeat
#define BASS_IMPACT bassImpact
#define REACTIVITY reactivity
#define PI 3.14159265359
uniform float smoothTime;
uniform float controllerRotation;
uniform float controllerPulse;
uniform float controllerColorShift;
uniform float customBeat;
uniform float bassImpact;
uniform float reactivity;

// Utility functions
vec2 rotate(vec2 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// SDF for circle
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// SDF for regular polygon
float sdRegularPolygon(vec2 p, float r, float sides) {
    float a = atan(p.y, p.x) + PI;
    float b = 2.0 * PI / sides;
    return cos(floor(0.5 + a / b) * b - a) * length(p) - r;
}

// Color palette function
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.3, 0.2, 0.2);
    return a + b * cos(6.28318 * (c * t + d + COLOR_SHIFT));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalized coordinates
    vec2 uv = (fragCoord.xy - 0.5 * resolution.xy) / resolution.y;

    // Apply rotation from controller
    uv = rotate(uv, ROTATION);

    // Dynamic shape based on controller pulse
    float pulse = 0.8 + 0.2 * PULSE;

    // Multiple overlapping shapes
    float d1 = sdCircle(uv, 0.3 * pulse);

    // Create a polygon with sides based on audio reactivity
    int sides = int(5.0 + floor(REACTIVITY * 5.0));
    float d2 = sdRegularPolygon(uv + vec2(sin(smoothTime * 0.5) * 0.2, cos(smoothTime * 0.3) * 0.1),
                              0.2 * pulse, float(sides));

    // Combine shapes
    float d = min(d1, d2);

    // Apply smooth borders
    float shape = smoothstep(0.005, 0.0, d);

    // Add glow effect based on BASS_IMPACT
    float glow = smoothstep(0.1 + 0.2 * BASS_IMPACT, 0.0, d);

    // Create ripples emanating from center
    float ripples = sin(length(uv) * 20.0 - smoothTime * 4.0) * 0.5 + 0.5;
    ripples *= smoothstep(0.4, 0.0, length(uv));

    // Base color from palette function with controller's COLOR_SHIFT
    vec3 color = palette(length(uv) + smoothTime * 0.1);

    // Mix in ripple effect with reactivity
    color = mix(color, palette(length(uv) + smoothTime * 0.2 + 0.5), ripples * REACTIVITY);

    // Add borders with different color
    color = mix(color, palette(length(uv) + COLOR_SHIFT + 0.3), shape);

    // Add glow with bass impact
    color += palette(COLOR_SHIFT + 0.7) * glow * BASS_IMPACT;

    // Flash effect on beat detection
    if (beat) {
        color += vec3(0.2, 0.1, 0.3);
    }

    // Output the final color
    fragColor = vec4(color, 1.0);
}
