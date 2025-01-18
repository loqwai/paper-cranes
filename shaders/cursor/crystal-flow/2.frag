// Define audio reactive parameters
#define FLOW_SPEED (spectralFluxZScore * 0.15) // Smoother flow
#define CRYSTAL_SCALE (1.8 + spectralCentroidZScore * 0.2) // Larger base pattern
#define ENERGY_FACTOR (mix(0.3, 0.8, energyNormalized)) // Controlled energy range
#define ROUGHNESS (mix(0.2, 0.4, spectralRoughnessNormalized)) // Controlled detail
#define COLOR_SHIFT (spectralCentroidNormalized * 0.2) // Subtler color changes
#define PATTERN_COMPLEXITY (1.0 + spectralSpreadZScore * 0.08)

// Color palette - deep purples to cyan
#define BASE_HUE (0.7 + COLOR_SHIFT * 0.1) // Purple base
#define ACCENT_HUE (0.5 + COLOR_SHIFT * 0.15) // Cyan accent
#define BASE_SAT 0.7
#define ACCENT_SAT 0.6

// Rotation matrix helper
mat2 rotate2D(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat2(c, -s, s, c);
}

float crystalPattern(vec3 p) {
    p *= CRYSTAL_SCALE;
    float pattern = 0.0;
    float basePattern = 0.15;

    for(int i = 0; i < 4; i++) { // Increased iterations for more detail
        float scale = 1.0 + float(i) * PATTERN_COMPLEXITY;
        vec3 q = p * scale;

        // More dynamic rotation
        float rotSpeed = FLOW_SPEED * (0.2 + float(i) * 0.08);
        q.xy *= rotate2D(time * rotSpeed);
        q.yz *= rotate2D(time * rotSpeed * 0.7);
        q.xz *= rotate2D(time * rotSpeed * 0.5);

        // Sharper crystal formation
        float crystal = mix(
            abs(sin(q.x * 1.5)) * abs(cos(q.y * 1.5)),
            abs(sin(q.z * 1.5)),
            0.5
        ) / scale;

        // Add controlled detail
        crystal = mix(
            crystal,
            crystal * (1.0 + ROUGHNESS * sin(q.x * 2.0 + q.y * 2.0 + q.z)),
            0.4
        );

        // Sharper edges with controlled smoothing
        crystal = smoothstep(0.2, 0.8, crystal);

        pattern += crystal * (1.0 - float(i) * 0.2);
    }

    // Maintain stability while allowing contrast
    return mix(basePattern, pattern, ENERGY_FACTOR);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;
    vec4 prevColor = texture(prevFrame, fragCoord.xy / resolution.xy);

    vec3 p = vec3(uv * 2.2, time * 0.1);
    float pattern = crystalPattern(p);

    // Create two-tone color blend
    vec3 baseColor = vec3(
        BASE_HUE,
        BASE_SAT,
        mix(0.2, 0.7, pattern)
    );

    vec3 accentColor = vec3(
        ACCENT_HUE,
        ACCENT_SAT,
        mix(0.3, 0.8, pattern)
    );

    // Blend between base and accent colors
    vec3 color = mix(
        hsl2rgb(baseColor),
        hsl2rgb(accentColor),
        smoothstep(0.3, 0.7, pattern)
    );

    // Subtle shimmer effect
    color += vec3(0.05) * ENERGY_FACTOR *
        smoothstep(0.4, 0.9, pattern) *
        sin(time * 2.0 + uv.x * 10.0 + uv.y * 8.0);

    // Beat response with color enhancement
    float blendFactor = 0.12;
    if(beat) {
        blendFactor = 0.3;
        // Enhance colors on beat without oversaturation
        color = mix(
            color,
            color * vec3(1.1, 1.05, 1.15),
            ENERGY_FACTOR * 0.5
        );
    }

    // Control brightness range while maintaining color vibrancy
    color = clamp(color, vec3(0.1), vec3(0.85));

    // Temporal smoothing
    fragColor = vec4(mix(prevColor.rgb, color, blendFactor), 1.0);
}
