//http://localhost:6969/edit.html?shader=redaphid%2Fwip%2Fhearts%2Ffractal&fullscreen=true&knob_70=-1.512&knob_70.min=-2&knob_70.max=-1&knob_71=-0.718&knob_71.min=-2&knob_71.max=0.2&knob_72=2.42&knob_72.min=1&knob_72.max=5.4&knob_73=1.3&knob_73.min=-2&knob_73.max=1.3&knob_74=-0.228&knob_74.min=-2&knob_74.max=1&knob_75=-0.417&knob_75.min=-2&knob_75.max=1&knob_76=0.921&knob_76.min=-2&knob_76.max=1
#define HEART_SIZE 0.15      // Base size for all hearts
#define PI 3.14159265359
#define LINE_COUNT 3.0      // Number of lines
#define MAX_ITER 8          // Mandelbrot iterations
// #define SPACING_SCALE 1.7   // Controls space between hearts

uniform float knob_70;
uniform float knob_71;
uniform float knob_72;
uniform float knob_73;
uniform float knob_74;
// Audio reactive probes
#define PROBE_A (spectralCentroidZScore)    // For pattern evolution
#define PROBE_B (energyNormalized)          // For size/intensity
#define PROBE_C (spectralRoughnessZScore)   // For pattern complexity
#define PROBE_D (max(bassZScore, spectralCentroidZScore))            // For pulsing
#define PROBE_E (spectralFluxNormalized)    // For color mixing
#define PROBE_F (midsNormalized)            // For movement speed
#define PROBE_G ((knob_70 + 2.1)/2.)

#define SPACING_SCALE (knob_71 + 1.1)
#define HEART_COUNT (knob_72 + 1.1)
#define X_OFFSET (1.3)
#define COLOR_OFFSET (knob_74)
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

// Modify mandelbrotTransform to create orbital patterns
void mandelbrotTransform(float t, float lineIndex, out vec2 pos, out float scale, out float rotation) {
    // Create different orbital rings based on line index
    float ringRadius = SPACING_SCALE * (0.3 + lineIndex * 0.3);

    // Calculate orbital angle based on time and heart index
    float orbitSpeed = 0.2 * (1.0 - lineIndex * 0.2); // Outer rings move slower
    float orbitAngle = t * PI * 2.0 + iTime * orbitSpeed + lineIndex * (PI * 2.0 / HEART_COUNT);

    // Add some variation to the radius
    float radiusVar = ringRadius + sin(t * PI * 4.0) * 0.1;

    // Calculate position on the orbit
    pos = vec2(
        cos(orbitAngle) * radiusVar,
        sin(orbitAngle) * radiusVar
    );

    // Make hearts face the direction they're moving
    rotation = orbitAngle + PI * 0.5;

    // Keep heart size consistent
    scale = (0.3 + 0.1 * sin(t * PI * 4.0)) / HEART_SIZE;
}

// Bass-reactive border effect
vec3 getBorderColor() {
    // Pulse the border color based on bass
    float intensity = 0.8 + 0.2 * sin(iTime * 10.0 * PROBE_D);
    return vec3(1.0, 0.2, 0.2) * intensity;
}

// Add this function before mainImage
float getScreenOffset(float knobValue, float aspectRatio) {
    // Center point is different based on aspect ratio
    // For square: 1.3 centers it
    // For widescreen: -0.129 centers it
    float squareCenter = 1.3;
    float wideCenter = -0.129;

    // Calculate the target center based on aspect ratio
    float targetCenter = mix(squareCenter, wideCenter, aspectRatio - 1.0);

    // Apply the knob offset relative to the center point
    return (knobValue - targetCenter) / aspectRatio + targetCenter;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;

    vec3 finalColor = vec3(0.0);
    bool showBorder = PROBE_D > 0.4;

    float aspectRatio = iResolution.x / iResolution.y;
    float screenOffset = getScreenOffset(X_OFFSET, aspectRatio);

    for(float line = 0.0; line < LINE_COUNT; line++) {
        for(float i = 0.0; i < HEART_COUNT; i++) {
            float t = fract(i/HEART_COUNT - iTime * 0.2 + line * 0.25);

            vec2 pos;
            float scale, rotation;
            mandelbrotTransform(t, line, pos, scale, rotation);

            // Scale movement with HEART_SIZE
            pos += vec2(cos(t*PI*2.0), sin(t*PI*2.0)) * PROBE_F * 0.3 * HEART_SIZE;

            // Add offset without aspect ratio distortion
            pos.x += screenOffset;

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
    float bgGlow = length(uv0 - vec2(screenOffset, 0.0));
    finalColor += vec3(0.1, 0.05, 0.15) * (1.0 - bgGlow) * PROBE_D;

    // Add bass-reactive vignette
    if(showBorder) {
        float vignette = length(uv0 - vec2(screenOffset, 0.0));
        float vignetteIntensity = 0.2 * PROBE_D * (0.8 + 0.2 * sin(iTime * 15.0));
        finalColor += getBorderColor() * vignetteIntensity * (1.0 - smoothstep(0.5, 1.5, vignette));
    }
    finalColor = rgb2hsl(finalColor);
    finalColor.z = fract(finalColor.z + COLOR_OFFSET);
    finalColor = hsl2rgb(finalColor);

    fragColor = vec4(finalColor, 1.0);
}
