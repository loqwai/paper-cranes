// Define audio reactive parameters
#define FLOW_SPEED (spectralFluxZScore * 0.15)
#define CRYSTAL_SCALE (2.2 + spectralCentroidZScore * 0.3) // Increased scale for sharper detail
#define ENERGY_FACTOR (mix(0.3, 0.8, energyNormalized))
#define ROUGHNESS (mix(0.3, 0.6, spectralRoughnessNormalized)) // Increased detail range
#define COLOR_SHIFT (spectralCentroidNormalized * 0.2)
#define PATTERN_COMPLEXITY (1.0 + spectralSpreadZScore * 0.1)

// Color palette - deep purples to cyan
#define BASE_HUE (0.7 + COLOR_SHIFT * 0.1)
#define ACCENT_HUE (0.5 + COLOR_SHIFT * 0.15)
#define BASE_SAT 0.75
#define ACCENT_SAT 0.65

// Rotation matrix helper
mat2 rotate2D(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat2(c, -s, s, c);
}

// Sharp edge function
float edge(float x, float k) {
    return smoothstep(0.0, k, x) * (1.0 - smoothstep(1.0-k, 1.0, x));
}

float crystalPattern(vec3 p) {
    p *= CRYSTAL_SCALE;
    float pattern = 0.0;
    float basePattern = 0.15;

    for(int i = 0; i < 4; i++) {
        float scale = 1.0 + float(i) * PATTERN_COMPLEXITY;
        vec3 q = p * scale;

        // Sharper rotation patterns
        float rotSpeed = FLOW_SPEED * (0.2 + float(i) * 0.08);
        q.xy *= rotate2D(time * rotSpeed);
        q.yz *= rotate2D(time * rotSpeed * 0.7);
        q.xz *= rotate2D(time * rotSpeed * 0.5);

        // Create sharp crystalline edges
        float xEdge = abs(sin(q.x * 2.0));
        float yEdge = abs(sin(q.y * 2.0));
        float zEdge = abs(sin(q.z * 2.0));

        // Combine edges with sharp transitions
        float crystal = max(
            max(xEdge * yEdge, yEdge * zEdge),
            xEdge * zEdge
        ) / scale;

        // Enhanced edge definition
        crystal = edge(crystal, 0.1);

        // Add crystalline detail
        crystal *= 1.0 + ROUGHNESS * (
            sin(q.x * 3.0 + q.y * 2.0) *
            cos(q.y * 2.0 + q.z * 3.0)
        );

        // Sharp edge transitions
        crystal = smoothstep(0.35, 0.65, crystal);

        pattern = max(pattern, crystal * (1.0 - float(i) * 0.15));
    }

    // Enhance contrast while maintaining stability
    pattern = mix(basePattern, pow(pattern, 0.8), ENERGY_FACTOR);
    return pattern;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;
    vec4 prevColor = texture(prevFrame, fragCoord.xy / resolution.xy);

    vec3 p = vec3(uv * 2.5, time * 0.1);
    float pattern = crystalPattern(p);

    // Enhanced two-tone color blend
    vec3 baseColor = vec3(
        BASE_HUE,
        BASE_SAT,
        mix(0.2, 0.8, pow(pattern, 1.2)) // Increased contrast
    );

    vec3 accentColor = vec3(
        ACCENT_HUE,
        ACCENT_SAT,
        mix(0.3, 0.9, pow(pattern, 1.1)) // Increased contrast
    );

    // Sharper color transitions
    vec3 color = mix(
        hsl2rgb(baseColor),
        hsl2rgb(accentColor),
        smoothstep(0.4, 0.6, pattern) // Narrower transition band
    );

    // Crystalline highlight effect
    float highlight = pow(pattern, 2.0) * ENERGY_FACTOR;
    color += vec3(0.08) * highlight *
        sin(time * 2.0 + uv.x * 15.0 + uv.y * 12.0);

    // Enhanced beat response
    float blendFactor = 1.;
    if(beat) {
        blendFactor = 0.4;
        color = mix(
            color,
            color * vec3(1.15, 1.1, 1.2),
            ENERGY_FACTOR * 0.6
        );
    }

    // Maintain color vibrancy with controlled range
    color = clamp(color, vec3(0.1), vec3(0.9));

    // Faster response time
    fragColor = vec4(mix(prevColor.rgb, color, blendFactor), 1.0);
}
