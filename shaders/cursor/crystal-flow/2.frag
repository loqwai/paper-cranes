// Define audio reactive parameters
#define FLOW_SPEED (spectralFluxZScore * 0.2) // Reduced speed for stability
#define CRYSTAL_SCALE (1.5 + spectralCentroidZScore * 0.3) // More stable scale
#define ENERGY_FACTOR (mix(0.2, 1.0, energyNormalized)) // Prevent zero energy
#define ROUGHNESS (spectralRoughnessNormalized * 0.3) // Gentler roughness
#define COLOR_SHIFT (spectralCentroidNormalized)
#define PATTERN_COMPLEXITY (1.0 + spectralSpreadZScore * 0.05) // More stable complexity

// Rotation matrix helper
mat2 rotate2D(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat2(c, -s, s, c);
}

// Modified crystalline pattern function
float crystalPattern(vec3 p) {
    p *= CRYSTAL_SCALE;
    float pattern = 0.0;

    // Ensure we always have some base pattern
    float basePattern = 0.2;

    for(int i = 0; i < 3; i++) {
        float scale = 1.0 + float(i) * PATTERN_COMPLEXITY;
        vec3 q = p * scale;

        // Smoother rotation
        float rotSpeed = FLOW_SPEED * (0.3 + float(i) * 0.05);
        q.xy *= rotate2D(time * rotSpeed);
        q.yz *= rotate2D(time * rotSpeed * 0.5);

        // Smoother crystal shape using mix instead of max
        float crystal = mix(
            abs(sin(q.x)),
            mix(abs(sin(q.y)), abs(sin(q.z)), 0.5),
            0.5
        ) / scale;

        // Gentler roughness application
        crystal = mix(
            crystal,
            crystal * (1.0 + ROUGHNESS * sin(q.x + q.y + q.z)),
            0.5
        );

        // Softer transitions
        crystal = smoothstep(0.1, 0.9, crystal);

        pattern += crystal * (1.0 - float(i) * 0.15);
    }

    // Ensure pattern never goes completely black
    return mix(basePattern, pattern, ENERGY_FACTOR);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;
    vec4 prevColor = texture(prevFrame, fragCoord.xy / resolution.xy);

    vec3 p = vec3(uv * 2.5, time * 0.08); // Slower movement
    float pattern = crystalPattern(p);

    // Ensure base color always has some value
    vec3 color = vec3(
        fract(COLOR_SHIFT + pattern * 0.2),
        0.8, // Slightly reduced saturation
        mix(0.2, 0.8, pattern) // Prevent full black/white
    );

    color = hsl2rgb(color);

    // Gentler glow
    color += vec3(0.03, 0.05, 0.08) * ENERGY_FACTOR * pattern;

    // Smoother beat response
    float blendFactor = 0.15; // Slower default blend
    if(beat) {
        blendFactor = 0.4; // Less aggressive beat response
        color = mix(color, color * 1.05, ENERGY_FACTOR); // Gentler flash
    }

    // Ensure minimum brightness and prevent oversaturation
    color = clamp(color, vec3(0.1), vec3(0.9));

    // Smoother final blend
    fragColor = vec4(mix(prevColor.rgb, color, blendFactor), 1.0);
}
