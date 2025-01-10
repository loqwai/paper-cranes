#define HEART_SIZE 1.
#define PI 3.14159265359
#define HEART_COUNT 25.0  // Number of orbiting hearts
#define MAX_ITER 25      // Max iterations for Mandelbrot path

// Audio reactive probes
#define PROBE_A (spectralCentroidZScore)    // For pattern evolution
#define PROBE_B (energyNormalized)          // For size/intensity
#define PROBE_C (spectralRoughnessZScore)   // For pattern complexity
#define PROBE_D (bassNormalized)            // For pulsing
#define PROBE_E (spectralFluxNormalized)    // For color mixing
#define PROBE_F (midsNormalized)            // For movement speed

// Helper functions
float dot2(in vec2 v) { return dot(v,v); }

float sdHeart(in vec2 p) {
    p.x = abs(p.x);
    p.y += 0.6;

    if(p.y+p.x>1.0)
        return sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
    return sqrt(min(dot2(p-vec2(0.00,1.00)),
                dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
}

// Get position from Mandelbrot iteration
vec2 mandelbrotPath(float t) {
    vec2 c = vec2(0.28 + sin(t * 0.1) * 0.02, 0.01);  // Interesting area of Mandelbrot set
    vec2 z = vec2(0.0);

    // Use fewer iterations for smoother path
    for(int i = 0; i < MAX_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    }

    return z * 0.3;  // Scale down the path
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;

    vec3 finalColor = vec3(0.0);

    // Render orbiting hearts
    for(float i = 0.0; i < HEART_COUNT; i++) {
        // Get position from Mandelbrot iteration
        float t = iTime * 0.5 + i * PI * 2.0 / HEART_COUNT;
        vec2 pos = mandelbrotPath(t + PROBE_A);  // Use audio to modify path

        // Add some audio-reactive movement
        pos += vec2(
            sin(t * 1.5) * PROBE_F * 0.2,
            cos(t * 1.2) * PROBE_F * 0.2
        );

        // Calculate heart UV
        vec2 heartUV = (uv0 - pos) * 2.0;
        float size = 0.2 + PROBE_B * 0.1;  // Size reacts to energy

        // Render heart
        float d = sdHeart(heartUV / size);

        if(d < 0.0) {
            // Simple gradient based on position
            vec3 col = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + length(pos) * 4.0 + iTime + PROBE_E * 2.0);

            // Add glow on beat
            if(beat) col *= 1.2;

            // Add to final color
            finalColor = max(finalColor, col);  // Use max for additive blending
        }
    }

    // Add subtle background glow
    float bgGlow = length(uv0);
    finalColor += vec3(0.1, 0.05, 0.15) * (1.0 - bgGlow) * PROBE_D;

    fragColor = vec4(finalColor, 1.0);
}
