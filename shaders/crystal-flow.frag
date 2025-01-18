// Define audio reactive parameters
#define FLOW_SPEED (spectralFluxZScore * 0.3) // Reduced speed multiplier
#define CRYSTAL_SCALE (2.0 + spectralCentroidZScore * 0.5) // Increased base scale
#define ENERGY_FACTOR (energyNormalized) // Reduced intensity
#define ROUGHNESS (spectralRoughnessNormalized * 0.5) // Reduced roughness
#define COLOR_SHIFT (spectralCentroidNormalized)
#define PATTERN_COMPLEXITY (1.0 + spectralSpreadZScore * 0.1) // Reduced complexity variation

// Rotation matrix helper
mat2 rotate2D(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat2(c, -s, s, c);
}

// Crystalline pattern function
float crystalPattern(vec3 p) {
    p *= CRYSTAL_SCALE;
    float pattern = 0.0;

    // Create sharper crystalline structure
    for(int i = 0; i < 3; i++) {
        float scale = 1.0 + float(i) * PATTERN_COMPLEXITY;
        vec3 q = p * scale;
        q.xy *= rotate2D(time * FLOW_SPEED * (0.5 + float(i) * 0.1));
        q.yz *= rotate2D(time * FLOW_SPEED * 0.3);

        // Sharper crystalline shape using max() for edges
        float crystal = max(
            max(abs(sin(q.x)), abs(sin(q.y))),
            abs(sin(q.z))
        ) / scale;

        // Add controlled roughness
        crystal *= 1.0 + ROUGHNESS * sin(q.x * 3.0 + q.y * 2.0 + q.z * 1.0);

        // Create sharper transitions
        crystal = smoothstep(0.2, 0.8, crystal);

        pattern = max(pattern, crystal * (1.0 - float(i) * 0.2));
    }

    return pattern * ENERGY_FACTOR;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;
    vec4 prevColor = texture(prevFrame, fragCoord.xy / resolution.xy);

    vec3 p = vec3(uv * 3.0, time * 0.1); // Increased UV scale, slower time
    float pattern = crystalPattern(p);

    // More contrast in the base color
    vec3 color = vec3(
        fract(COLOR_SHIFT + pattern * 0.3), // More color variation
        0.9, // Higher saturation
        smoothstep(0.1, 0.9, pattern * 0.6) // More contrast in brightness
    );

    color = hsl2rgb(color);

    // Reduced glow intensity
    color += vec3(0.05, 0.1, 0.15) * ENERGY_FACTOR * pattern;

    // Faster response to beats
    float blendFactor = 0.2;
    if(beat) {
        blendFactor = 0.6;
        color *= 1.1; // Reduced flash intensity
    }

    // Ensure we don't get too dark or too bright
    color = clamp(color, vec3(0.05), vec3(0.95));

    // Final color blend
    fragColor = vec4(mix(prevColor.rgb, color, blendFactor), 1.0);
}
