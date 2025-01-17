#define HEART_SIZE 0.15      // Base size for all hearts
#define PI 3.14159265359
#define HEART_COUNT 1.0    // Number of hearts per line
#define LINE_COUNT 3.0      // Number of lines
#define MAX_ITER 8          // Mandelbrot iterations
// #define SPACING_SCALE 1.7   // Controls space between hearts

uniform float knob_70;
uniform float knob_71;
// Audio reactive probes
#define PROBE_A (spectralCentroidZScore)    // For pattern evolution
#define PROBE_B (energyNormalized)          // For size/intensity
#define PROBE_C (spectralRoughnessZScore)   // For pattern complexity
#define PROBE_D (bassNormalized)            // For pulsing
#define PROBE_E (spectralFluxNormalized)    // For color mixing
#define PROBE_F (midsNormalized)            // For movement speed
#define PROBE_G ((knob_70 + 2.1)/2.)

#define SPACING_SCALE (knob_71 + 1.1)      // For border intensity
// Helper functions
float dot2(in vec2 v) { return dot(v,v); }

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// Modified heart SDF to use HEART_SIZE
float sdHeart(in vec2 p, bool border, float size) {
    // Apply base heart size scaling
    size *= HEART_SIZE;

    p.x = abs(p.x);
    p.y += 0.6 * size;

    float base;
    if(p.y + p.x > size)
        base = sqrt(dot2(p - vec2(0.25 * size, 0.75 * size))) - sqrt(2.0) / 4.0 * size;
    else
        base = sqrt(min(dot2(p - vec2(0.00, size)),
                   dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);

    if (border) {
        float borderWidth = (0.02 + PROBE_D * 0.03) * size;
        return abs(base) - borderWidth;
    }
    return base;
}

// Modify mandelbrotTransform to separate size and spacing
void mandelbrotTransform(float t, float lineIndex, out vec2 pos, out float scale, out float rotation) {
    float angle = lineIndex * PI * 2.0 / LINE_COUNT + iTime * 0.1;

    // Increase the base radius to spread hearts further apart
    float baseSpacing = SPACING_SCALE * 0.8; // Use spacing scale for distance between hearts
    float radius = baseSpacing + 0.2 * sin(t * PI * 2.0);

    // Position calculation now uses baseSpacing for distribution
    pos = vec2(
        cos(angle) * radius + cos(t * PI * 2.0) * baseSpacing * 0.3,
        sin(angle) * radius + sin(t * PI * 2.0) * baseSpacing * 0.3
    );

    // Keep heart size independent of spacing
    scale = (0.3 + 0.1 * sin(t * PI * 4.0 + lineIndex)) / HEART_SIZE;

    rotation = angle + t * PI * 2.0 + iTime * 0.2;
}

// Bass-reactive border effect
vec3 getBorderColor() {
    // Pulse the border color based on bass
    float intensity = 0.8 + 0.2 * sin(iTime * 10.0 * PROBE_D);
    return vec3(1.0, 0.2, 0.2) * intensity;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;

    vec3 finalColor = vec3(0.0);
    bool showBorder = PROBE_D > 0.6;

    for(float line = 0.0; line < LINE_COUNT; line++) {
        for(float i = 0.0; i < HEART_COUNT; i++) {
            float t = fract(i/HEART_COUNT - iTime * 0.2 + line * 0.25);

            vec2 pos;
            float scale, rotation;
            mandelbrotTransform(t, line, pos, scale, rotation);

            // Scale movement with HEART_SIZE
            pos += vec2(cos(t*PI*2.0), sin(t*PI*2.0)) * PROBE_F * 0.3 * HEART_SIZE;

            // Adjust base scale with HEART_SIZE
            scale *= (2.0 + PROBE_B * 0.3);
            rotation += PROBE_A * PI;

            vec2 heartUV = uv0 - pos;
            heartUV = heartUV * rot(rotation);
            heartUV = heartUV / scale;

            // Render heart fill
            float d = sdHeart(heartUV, false, PROBE_G);
            if(d < 0.0) {
                vec3 col = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + line * 1.5 + t * 4.0 + iTime + PROBE_E * 2.0);
                if(beat) col *= 1.2;
                finalColor = max(finalColor, col);
            }

            // Render bass-reactive border
            if(showBorder) {
                float borderD = sdHeart(heartUV, true, PROBE_G);
                float vibration = sin(iTime * 30.0 * PROBE_D) * 0.002 * PROBE_D;
                borderD += vibration;

                if(abs(borderD) < 0.01) {
                    vec3 borderCol = getBorderColor();
                    float glow = exp(-abs(borderD) * 50.0) * (0.8 + 0.2 * sin(iTime * 20.0 * PROBE_D));
                    finalColor = max(finalColor, borderCol * glow);
                }
            }
        }
    }

    // Scale background effects with HEART_SIZE
    float bgGlow = length(uv0);
    finalColor += vec3(0.1, 0.05, 0.15) * (1.0 - bgGlow) * PROBE_D;

    // Add bass-reactive vignette
    if(showBorder) {
        float vignette = length(uv0);
        float vignetteIntensity = 0.2 * PROBE_D * (0.8 + 0.2 * sin(iTime * 15.0));
        finalColor += getBorderColor() * vignetteIntensity * (1.0 - smoothstep(0.5, 1.5, vignette));
    }

    fragColor = vec4(finalColor, 1.0);
}
