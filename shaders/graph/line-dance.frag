// The parameters of memory
#define MEMORY_DECAY 0.992
#define TRAIL_THRESHOLD 0.998

// Visual constants
#define VERTICAL_SCALE 0.35
#define VERTICAL_CENTER 0.5

// Line continuity - prevents gaps
#define BASE_WIDTH 20.0           // Even thicker
#define GRADIENT_RANGE 1.5        // How far the gradient extends

// Feature influence
#define CENTROID_RANGE 0.8        // Vertical movement
#define ENTROPY_WAVE 0.08         // Organic displacement

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // Memory flows left
    if (uv.x < TRAIL_THRESHOLD) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x;
        vec4 memory = getLastFrameColor(prevUV);
        fragColor = memory * MEMORY_DECAY;
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }

    // The present emerges
    if (uv.x > TRAIL_THRESHOLD) {
        // Normalize and clamp features
        float centr = clamp((spectralCentroidZScore + 2.5) / 5.0, 0.0, 1.0);
        float sprd = clamp((spectralSpreadZScore + 2.5) / 5.0, 0.0, 1.0);
        float entro = clamp((spectralEntropyZScore + 2.5) / 5.0, 0.0, 1.0);
        float nrg = clamp((energyZScore + 2.5) / 5.0, 0.0, 1.0);
        
        float y = fragCoord.y;
        
        // Centerline position
        float centerY = (VERTICAL_CENTER + (centr - 0.5) * CENTROID_RANGE * VERTICAL_SCALE) * resolution.y;
        
        // Width grows with harmonic spread
        float width = BASE_WIDTH + sprd * 15.0;
        
        // Organic waviness from entropy
        float wave = sin(y * 0.15 + entro * 12.0) * entro * ENTROPY_WAVE * resolution.y;
        
        // Distance from centerline
        float dist = abs(y - centerY - wave);
        
        // Correct smoothstep - outer to inner for proper gradient
        float innerEdge = width * 0.2;
        float outerEdge = width * GRADIENT_RANGE;
        float intensity = smoothstep(outerEdge, innerEdge, dist);
        
        // Vivid color spectrum based on pitch
        vec3 color;
        
        if (centr < 0.25) {
            // Deep bass: indigo to blue
            color = mix(vec3(0.2, 0.0, 0.6), vec3(0.0, 0.3, 1.0), centr * 4.0);
        } else if (centr < 0.5) {
            // Low-mid: blue to cyan
            color = mix(vec3(0.0, 0.3, 1.0), vec3(0.0, 0.9, 0.9), (centr - 0.25) * 4.0);
        } else if (centr < 0.75) {
            // High-mid: cyan to yellow
            color = mix(vec3(0.0, 0.9, 0.9), vec3(1.0, 0.9, 0.0), (centr - 0.5) * 4.0);
        } else {
            // Treble: yellow to hot magenta
            color = mix(vec3(1.0, 0.9, 0.0), vec3(1.0, 0.2, 0.6), (centr - 0.75) * 4.0);
        }
        
        // Energy amplifies brightness dramatically
        float brightness = 0.8 + nrg * 1.2;
        
        // Entropy tints toward purple
        color = mix(color, vec3(0.9, 0.4, 1.0), entro * 0.25);
        
        vec4 sound = vec4(color * intensity * brightness, intensity);
        
        // Max blending keeps pure colors
        fragColor = max(fragColor, sound);
        fragColor = clamp(fragColor, 0.0, 1.0);
    }
}