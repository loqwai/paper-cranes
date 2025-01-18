// Define audio reactive parameters
#define FLOW_SPEED (spectralFluxZScore * 0.5 + 0.5) // Controls overall motion speed
#define CRYSTAL_SCALE (1.0 + spectralCentroidZScore * 0.3) // Affects pattern size
#define ENERGY_FACTOR (energyNormalized * 2.0) // Overall intensity
#define ROUGHNESS (spectralRoughnessNormalized) // Texture detail
#define COLOR_SHIFT (spectralCentroidNormalized) // Color variation
#define PATTERN_COMPLEXITY (1.0 + spectralSpreadZScore * 0.2) // Detail level

// Rotation matrix helper
mat2 rotate2D(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat2(c, -s, s, c);
}

// Crystalline pattern function
float crystalPattern(vec3 p) {
    p *= CRYSTAL_SCALE;
    float pattern = 0.0;

    // Create layered crystalline structure
    for(int i = 0; i < 3; i++) {
        float scale = 1.0 + float(i) * PATTERN_COMPLEXITY;
        vec3 q = p * scale;
        q.xy *= rotate2D(time * FLOW_SPEED * (1.0 + float(i) * 0.2));
        q.yz *= rotate2D(time * FLOW_SPEED * 0.7);

        // Basic crystalline shape
        float crystal = abs(sin(q.x) + sin(q.y) + sin(q.z)) / scale;

        // Add roughness based on audio
        crystal *= 1.0 + ROUGHNESS * sin(q.x * 5.0 + q.y * 3.0 + q.z * 2.0);

        pattern += crystal;
    }

    return pattern * ENERGY_FACTOR;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalized pixel coordinates
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;

    // Get previous frame for smooth transitions
    vec4 prevColor = texture(prevFrame, fragCoord.xy / resolution.xy);

    // Create base position
    vec3 p = vec3(uv * 2.0, time * 0.2);

    // Get crystal pattern value
    float pattern = crystalPattern(p);

    // Create base color using HSL
    vec3 color = vec3(
        fract(COLOR_SHIFT + pattern * 0.2), // Hue
        0.8, // Saturation
        pattern * 0.5 + 0.2 // Lightness
    );

    // Convert to RGB
    color = hsl2rgb(color);

    // Add energy-based glow
    color += vec3(0.1, 0.2, 0.3) * ENERGY_FACTOR * pattern;

    // Blend with previous frame for smooth transitions
    float blendFactor = 0.1;
    if(beat) {
        // Quick flash on beats
        blendFactor = 0.5;
        color *= 1.2;
    }

    // Ensure we don't get stuck in dark states
    color = max(color, vec3(0.05));

    // Final color blend
    fragColor = vec4(mix(prevColor.rgb, color, blendFactor), 1.0);
}
