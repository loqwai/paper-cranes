#define ROTATION controllerRotation
#define PULSE controllerPulse
#define COLOR_SHIFT controllerColorShift
#define BEAT customBeat
#define BASS_IMPACT bassImpact
#define MID_IMPACT midImpact
#define REACTIVITY reactivity

// Number of symmetry folds
#define SYMMETRY max(3.0, 6.0 + floor(REACTIVITY * 8.0))
#define LAYERS max(3.0, 5.0 + floor(BASS_IMPACT * 5.0))

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}

vec2 rotate(vec2 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Kaleidoscopic coordinates for mandala effect
vec2 kaleidoscope(vec2 uv, float n) {
    float angle = atan(uv.y, uv.x);
    angle = mod(angle, 2.0 * PI / n) - PI / n;
    return length(uv) * vec2(cos(angle), sin(angle));
}

// Ring SDF
float ring(vec2 p, float r1, float r2) {
    float d = length(p);
    return max(r1 - d, d - r2);
}

// Star SDF
float star(vec2 p, float r, float sides, float pointiness) {
    float angle = atan(p.y, p.x);
    float starShape = cos(angle * sides) * pointiness + 1.0 - pointiness;
    return length(p) - r * starShape;
}

// HSL to RGB conversion
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalized coordinates centered at screen center
    vec2 uv = (fragCoord.xy - 0.5 * resolution.xy) / resolution.y;

    // Base rotation from controller
    uv = rotate(uv, ROTATION * 0.5);

    // Store original uv for background
    vec2 originalUv = uv;

    // Apply kaleidoscope effect
    vec2 kUv = kaleidoscope(uv, SYMMETRY);

    // Scale for zooming effect
    float scale = 1.0 + 0.3 * PULSE;
    kUv *= scale;

    // Final color
    vec3 color = vec3(0.0);

    // Create layered mandala rings with dynamic properties
    for (float i = 0.0; i < LAYERS; i++) {
        float idx = i / LAYERS;
        float radius = 0.1 + idx * 0.6;

        // Make the size pulse with the controller's pulse value
        radius *= mix(0.9, 1.1, PULSE);

        // Add slight variation to each ring
        float variation = sin(smoothTime * (1.0 + idx) + idx * 9.4) * 0.05;
        radius += variation;

        // Ring thickness varies with mid-impact
        float thickness = 0.01 + 0.03 * mix(0.5, 1.5, MID_IMPACT) * (1.0 - idx * 0.5);

        // Create base ring
        float d = abs(length(kUv) - radius) - thickness;

        // Add star pattern to some rings
        if (mod(i, 2.0) < 0.5) {
            // Number of points changes with reactivity
            float points = floor(5.0 + REACTIVITY * 5.0);
            float pointiness = 0.2 + 0.3 * PULSE;
            float starD = star(kUv, radius, points, pointiness) - thickness * 1.5;
            d = min(d, starD);
        }

        // Create smooth shape
        float shape = smoothstep(0.003, -0.003, d);

        // Base hue rotates with COLOR_SHIFT
        float hue = fract(idx * 0.3 + COLOR_SHIFT);

        // Saturation and lightness respond to audio
        float sat = 0.6 + 0.4 * REACTIVITY;
        float lit = 0.5 + 0.3 * sin(idx * PI + smoothTime * (0.5 + BASS_IMPACT));

        // HSL color for ring
        vec3 ringColor = hsl2rgb(vec3(hue, sat, lit));

        // Flash on beats
        if (BEAT) {
            ringColor += vec3(0.2, 0.1, 0.3) * (1.0 - idx * 0.5);
        }

        // Add ring to final color
        color = mix(color, ringColor, shape);
    }

    // Add subtle background glow
    float bgGlow = smoothstep(1.0, 0.0, length(originalUv));
    vec3 bgColor = hsl2rgb(vec3(COLOR_SHIFT + 0.5, 0.5, 0.1 + 0.1 * BASS_IMPACT));
    color = mix(bgColor * bgGlow, color, color.r + color.g + color.b > 0.0 ? 1.0 : 0.0);

    // Output the final color
    fragColor = vec4(color, 1.0);
}
