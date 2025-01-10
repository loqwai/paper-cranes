#define HEART_SIZE 1.3
#define PI 3.14159265359
#define HEART_COUNT 8.0    // Hearts per line
#define LINE_COUNT 4.0     // Number of twisting lines
#define MAX_ITER 8         // Mandelbrot iterations

// Audio reactive probes
#define PROBE_A (spectralCentroidZScore)    // For pattern evolution
#define PROBE_B (energyNormalized)          // For size/intensity
#define PROBE_C (spectralRoughnessZScore)   // For pattern complexity
#define PROBE_D (bassNormalized)            // For pulsing
#define PROBE_E (spectralFluxNormalized)    // For color mixing
#define PROBE_F (midsNormalized)            // For movement speed

// Helper functions
float dot2(in vec2 v) { return dot(v,v); }

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float sdHeart(in vec2 p) {
    p.x = abs(p.x);
    p.y += 0.6;

    if(p.y+p.x>1.0)
        return sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
    return sqrt(min(dot2(p-vec2(0.00,1.00)),
                dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
}

// Get transforms from Mandelbrot iteration
void mandelbrotTransform(float t, float lineIndex, out vec2 pos, out float scale, out float rotation) {
    // Start from different points for each line
    float angle = lineIndex * PI * 2.0 / LINE_COUNT + iTime * 0.1;
    vec2 c = vec2(cos(angle) * 0.4, sin(angle) * 0.4);

    vec2 z = vec2(0.0);
    float lastLength = 0.0;

    // Accumulate transforms through iterations
    for(int i = 0; i < MAX_ITER; i++) {
        // Standard Mandelbrot iteration
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        // Use the intermediate values for transforms
        if(float(i) >= t * float(MAX_ITER)) {
            // Position from current z value
            pos = z * 0.3;
            // Scale based on rate of change
            scale = (length(z) - lastLength) * 2.0 + 0.5;
            // Rotation from angle of z
            rotation = atan(z.y, z.x) * 2.0;
            break;
        }
        lastLength = length(z);
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;

    vec3 finalColor = vec3(0.0);

    // Render multiple lines of hearts
    for(float line = 0.0; line < LINE_COUNT; line++) {
        // Render hearts along each line
        for(float i = 0.0; i < HEART_COUNT; i++) {
            // Get progress along the line (0 to 1)
            float t = fract(i/HEART_COUNT - iTime * 0.2 + line * 0.25);

            // Get transforms from Mandelbrot
            vec2 pos;
            float scale, rotation;
            mandelbrotTransform(t, line, pos, scale, rotation);

            // Apply audio reactivity to transforms
            pos += vec2(cos(t*PI*2.0), sin(t*PI*2.0)) * PROBE_F * 0.2;
            scale *= 0.15 + PROBE_B * 0.1;
            rotation += PROBE_A * PI;

            // Transform UV for this heart
            vec2 heartUV = uv0 - pos;
            heartUV = heartUV * rot(rotation + t * PI * 2.0);
            heartUV = heartUV / scale;

            // Render heart
            float d = sdHeart(heartUV);

            if(d < 0.0) {
                // Color based on line and position
                vec3 col = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + line * 1.5 + t * 4.0 + iTime + PROBE_E * 2.0);

                // Add glow on beat
                if(beat) col *= 1.2;

                // Add to final color
                finalColor = max(finalColor, col);
            }
        }
    }

    // Add subtle background glow
    float bgGlow = length(uv0);
    finalColor += vec3(0.1, 0.05, 0.15) * (1.0 - bgGlow) * PROBE_D;

    fragColor = vec4(finalColor, 1.0);
}
