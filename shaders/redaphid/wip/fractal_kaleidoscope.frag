// Define audio reactive parameters
#define SYMMETRY (4.0 + spectralCentroidNormalized * 8.0)
#define ZOOM (1.0 + spectralFluxZScore * 0.3)
#define ROTATION_SPEED (0.2 + spectralEntropyNormalized * 0.4)
#define FRACTAL_ITERATIONS (3.0 + energyNormalized * 5.0)
#define DISTORTION (0.2 + bassNormalized * 0.8)
#define TIME_WARP (iTime * ROTATION_SPEED)

// Color parameters
#define HUE_BASE (spectralRolloffNormalized * 0.7)
#define HUE_RANGE (0.4 + midsNormalized * 0.3)
#define SAT_BASE (0.6 + trebleNormalized * 0.4)
#define BRIGHTNESS_FACTOR (0.7 + energyZScore * 0.3)

vec2 complexMul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

float fractalPattern(vec2 uv) {
    vec2 z = uv;
    float value = 0.0;

    for(float i = 0.0; i < FRACTAL_ITERATIONS; i++) {
        // Complex number operations for interesting patterns
        z = complexMul(z, z) + vec2(sin(TIME_WARP * 0.5), cos(TIME_WARP * 0.7));
        z += DISTORTION * vec2(sin(z.y), cos(z.x));

        // Accumulate pattern value
        value += 1.0/(length(z) + 0.5);
    }

    return value / FRACTAL_ITERATIONS;
}

vec2 kaleidoscopeCoords(vec2 uv) {
    float angle = atan(uv.y, uv.x);
    float segment = 2.0 * 3.14159 / SYMMETRY;
    angle = mod(angle, segment);
    angle = abs(angle - segment * 0.5);

    float radius = length(uv);
    return vec2(cos(angle), sin(angle)) * radius;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);

    // Apply zoom and rotation
    uv *= ZOOM;
    float rot = TIME_WARP;
    vec2 rotatedUV = vec2(
        uv.x * cos(rot) - uv.y * sin(rot),
        uv.x * sin(rot) + uv.y * cos(rot)
    );

    // Apply kaleidoscope effect
    vec2 kUV = kaleidoscopeCoords(rotatedUV);

    // Generate fractal pattern
    float pattern = fractalPattern(kUV);

    // Create dynamic color
    float hue = HUE_BASE + pattern * HUE_RANGE;
    float sat = SAT_BASE - pattern * 0.3;
    float brightness = pattern * BRIGHTNESS_FACTOR;

    vec3 color = hsl2rgb(vec3(
        fract(hue),
        clamp(sat, 0.0, 1.0),
        clamp(brightness, 0.0, 1.0)
    ));

    // Add subtle glow based on energy
    float glow = 1.0 - length(uv);
    color = mix(color, vec3(1.0), max(0.0, glow * energyNormalized * 0.2));

    // Blend with previous frame
    vec2 prevUV = fragCoord.xy / iResolution.xy;
    vec3 prevColor = getLastFrameColor(prevUV).rgb;
    color = mix(prevColor, color, 0.15);

    fragColor = vec4(color, 1.0);
}
