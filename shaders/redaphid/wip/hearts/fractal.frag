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

// Modified heart SDF to support border effect
float sdHeart(in vec2 p, bool border) {
    p.x = abs(p.x);
    p.y += 0.6;

    float base;
    if(p.y+p.x>1.0)
        base = sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
    else
        base = sqrt(min(dot2(p-vec2(0.00,1.00)),
                   dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);

    if (border) {
        // Create border effect by returning a thin band around the heart
        float borderWidth = 0.02 + PROBE_D * 0.03; // Bass-reactive border width
        return abs(base) - borderWidth;
    }
    return base;
}

// Get transforms from Mandelbrot iteration
void mandelbrotTransform(float t, float lineIndex, out vec2 pos, out float scale, out float rotation) {
    float angle = lineIndex * PI * 2.0 / LINE_COUNT + iTime * 0.1;
    vec2 c = vec2(cos(angle) * 0.4, sin(angle) * 0.4);
    vec2 z = vec2(0.0);
    float lastLength = 0.0;

    for(int i = 0; i < MAX_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        if(float(i) >= t * float(MAX_ITER)) {
            pos = z * 0.3;
            scale = (length(z) - lastLength) * 2.0 + 0.5;
            rotation = atan(z.y, z.x) * 2.0;
            break;
        }
        lastLength = length(z);
    }
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
    bool showBorder = PROBE_D > 0.6; // Only show border when bass is high enough

    // Render multiple lines of hearts
    for(float line = 0.0; line < LINE_COUNT; line++) {
        for(float i = 0.0; i < HEART_COUNT; i++) {
            float t = fract(i/HEART_COUNT - iTime * 0.2 + line * 0.25);

            vec2 pos;
            float scale, rotation;
            mandelbrotTransform(t, line, pos, scale, rotation);

            pos += vec2(cos(t*PI*2.0), sin(t*PI*2.0)) * PROBE_F * 0.2;
            scale *= 0.15 + PROBE_B * 0.1;
            rotation += PROBE_A * PI;

            vec2 heartUV = uv0 - pos;
            heartUV = heartUV * rot(rotation + t * PI * 2.0);
            heartUV = heartUV / scale;

            // Render heart fill
            float d = sdHeart(heartUV, false);
            if(d < 0.0) {
                vec3 col = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + line * 1.5 + t * 4.0 + iTime + PROBE_E * 2.0);
                if(beat) col *= 1.2;
                finalColor = max(finalColor, col);
            }

            // Render bass-reactive border
            if(showBorder) {
                float borderD = sdHeart(heartUV, true);
                // Add vibration effect to border based on bass
                float vibration = sin(iTime * 30.0 * PROBE_D) * 0.002 * PROBE_D;
                borderD += vibration;

                if(abs(borderD) < 0.01) {
                    vec3 borderCol = getBorderColor();
                    // Add pulsing glow to border
                    float glow = exp(-abs(borderD) * 50.0) * (0.8 + 0.2 * sin(iTime * 20.0 * PROBE_D));
                    finalColor = max(finalColor, borderCol * glow);
                }
            }
        }
    }

    // Add subtle background glow
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
