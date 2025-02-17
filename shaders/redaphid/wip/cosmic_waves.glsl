// Define audio reactive parameters
#define WAVE_SPEED (0.5 + spectralFluxNormalized * 0.5)
#define WAVE_AMPLITUDE (0.2 + bassNormalized * 0.3)
#define FRACTAL_DETAIL (3.0 + spectralCentroidNormalized * 4.0)
#define COLOR_SHIFT (spectralEntropyNormalized)
#define ENERGY_FACTOR (energyZScore * 0.5 + 0.5)
#define RIPPLE_INTENSITY (spectralCrestNormalized)
#define TIME_FACTOR (iTime * WAVE_SPEED)

// Color palette parameters
#define BASE_HUE (0.7 + spectralRolloffNormalized * 0.3)
#define SATURATION (0.7 + midsNormalized * 0.3)
#define BRIGHTNESS (0.6 + trebleNormalized * 0.4)

vec2 rotate2D(vec2 p, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for(float i = 0.0; i < FRACTAL_DETAIL; i++) {
        value += amplitude * (sin(p.x * frequency) * sin(p.y * frequency));
        p = rotate2D(p, TIME_FACTOR * 0.1);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

float createWavePattern(vec2 uv) {
    vec2 p = uv * 2.0 - 1.0;
    float angle = atan(p.y, p.x);
    float radius = length(p);

    float waves = sin(radius * 10.0 - TIME_FACTOR) * WAVE_AMPLITUDE;
    waves += fbm(uv * 3.0 + TIME_FACTOR * 0.2) * RIPPLE_INTENSITY;

    // Add circular ripples
    waves += sin(radius * 15.0 - TIME_FACTOR * 1.5) * 0.15;

    return waves;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    // Get the wave pattern
    float pattern = createWavePattern(uv);

    // Create dynamic color
    vec3 color = vec3(
        BASE_HUE + pattern * 0.2 + COLOR_SHIFT * 0.1,
        SATURATION,
        BRIGHTNESS + pattern * 0.3
    );

    // Add energy-based glow
    float glow = exp(-length(uv) * (1.0 - ENERGY_FACTOR));
    color.z = mix(color.z, 1.0, glow * 0.3);

    // Convert from HSL to RGB
    vec3 rgbColor = hsl2rgb(color);

    // Blend with previous frame for smooth transitions
    vec2 prevUV = (fragCoord.xy / iResolution.xy);
    vec3 prevColor = getLastFrameColor(prevUV).rgb;
    rgbColor = mix(prevColor, rgbColor, 0.1);

    fragColor = vec4(rgbColor, 1.0);
}
