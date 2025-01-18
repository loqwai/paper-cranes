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

// Pattern inside hearts
float heartPattern(vec2 p, float t) {
    // Create concentric circles that pulse with bass
    float circles = length(p * (1.0 + PROBE_D)) * 8.0;
    circles = sin(circles - iTime * 2.0) * 0.5 + 0.5;

    // Add some movement
    float waves = sin(p.x * 6.0 + iTime) * cos(p.y * 6.0 + iTime) * 0.5 + 0.5;

    // Mix patterns based on bass
    return mix(circles, waves, PROBE_D * 0.5);
}

float sdHeart(in vec2 p) {
    p.x = abs(p.x);
    p.y += 0.6;

    if(p.y+p.x>1.0)
        return sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
    return sqrt(min(dot2(p-vec2(0.00,1.00)),
                dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
}

// Get transforms from Mandelbrot iteration with expanded range
void mandelbrotTransform(float t, float lineIndex, out vec2 pos, out float scale, out float rotation) {
    // Create a wider spiral pattern for the starting points
    float angle = lineIndex * PI * 2.0 / LINE_COUNT + iTime * 0.1;
    float radius = 0.8 + sin(angle * 2.0 + iTime * 0.2) * 0.3;
    vec2 c = vec2(cos(angle), sin(angle)) * radius;

    vec2 z = vec2(0.0);
    float lastLength = 0.0;

    // Accumulate transforms through iterations
    for(int i = 0; i < MAX_ITER; i++) {
        // Modified Mandelbrot iteration for more interesting paths
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        z += vec2(cos(t * PI * 2.0), sin(t * PI * 2.0)) * 0.2;  // Add circular motion

        if(float(i) >= t * float(MAX_ITER)) {
            // Spread positions out more
            pos = z * 0.6;  // Doubled the spread
            // More dramatic scaling
            scale = (length(z) - lastLength) * 1.5 + 0.8;
            // Add extra rotation
            rotation = atan(z.y, z.x) * 2.0 + t * PI * 4.0;
            break;
        }
        lastLength = length(z);
    }

    // Add a spiral offset to spread hearts out more
    float spiralR = t * 2.0;
    float spiralAngle = t * PI * 8.0;
    pos += vec2(cos(spiralAngle), sin(spiralAngle)) * spiralR;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;

    vec3 finalColor = vec3(0.0);

    // Render multiple lines of hearts
    for(float line = 0.0; line < LINE_COUNT; line++) {
        for(float i = 0.0; i < HEART_COUNT; i++) {
            float t = fract(i/HEART_COUNT - iTime * 0.15 + line * 0.25);

            vec2 pos;
            float scale, rotation;
            mandelbrotTransform(t, line, pos, scale, rotation);

            // More dramatic audio reactivity
            pos *= 1.0 + PROBE_F * 0.4;  // Increased position spread
            scale *= 0.25 + PROBE_B * 0.15;  // Adjusted base scale
            rotation += PROBE_A * PI * 2.0;  // More rotation

            // Transform UV for this heart
            vec2 heartUV = uv0 - pos;
            heartUV = heartUV * rot(rotation);
            heartUV = heartUV / scale;

            float d = sdHeart(heartUV);

            if(d < 0.0) {
                // Base heart color
                vec3 col = 0.6 + 0.4 * cos(vec3(0.0, 2.0, 4.0) + line * 1.5 + t * 8.0 + iTime);

                // Add internal pattern
                float pattern = heartPattern(heartUV, t);
                col *= 0.4 + pattern * 0.8;  // Pattern modulates brightness

                if(beat) col *= 1.3;  // Stronger beat effect

                // Smoother blending
                float blend = smoothstep(0.0, -0.1, d);
                finalColor = max(finalColor, col * blend);
            }
        }
    }

    fragColor = vec4(finalColor, 1.0);
}
