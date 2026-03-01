// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: heart, chromadepth, 3d, fractal, bloom, love
// ChromaDepth Heart Bloom - Hearts spiral outward along Mandelbrot orbits
// Each heart has fractal-noise interiors with chromadepth depth mapping.
// Hearts near center = red (pop forward), outer = blue (recede).
// Oklab frame feedback creates luminous trailing persistence.

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Heart size: energy makes hearts breathe
#define HEART_SCALE (0.18 + energyNormalized * 0.08)
// #define HEART_SCALE 0.22

// Spiral speed: mids drive movement
#define SPIRAL_SPEED (0.15 + midsNormalized * 0.1)
// #define SPIRAL_SPEED 0.2

// Fractal c drift: bass reshapes Mandelbrot paths
#define MANDEL_DRIFT (bassZScore * 0.03)
// #define MANDEL_DRIFT 0.0

// Color rotation: spectral centroid shifts hue offset
#define HUE_DRIFT (spectralCentroidNormalized * 0.12)
// #define HUE_DRIFT 0.0

// Heart rotation: spectral entropy spins individual hearts
#define HEART_SPIN (spectralEntropyNormalized * 3.14159)
// #define HEART_SPIN 0.0

// Interior noise: spectral roughness drives fractal complexity inside hearts
#define NOISE_INTENSITY (0.6 + spectralRoughnessNormalized * 0.4)
// #define NOISE_INTENSITY 0.8

// Beat pulse: hearts flash brighter
#define BEAT_FLASH (beat ? 1.25 : 1.0)
// #define BEAT_FLASH 1.0

// Drop: push everything toward red on energy drops
#define DROP_SHIFT (max(-energyZScore, 0.0) * 0.06)
// #define DROP_SHIFT 0.0

// Spread: treble widens the spiral
#define SPREAD (1.0 + trebleZScore * 0.15)
// #define SPREAD 1.0

// Feedback confidence
#define TREND_CONFIDENCE (energyRSquared * 0.5 + bassRSquared * 0.3 + spectralCentroidRSquared * 0.2)
// #define TREND_CONFIDENCE 0.5

// Flux for glow edges
#define FLUX_GLOW (max(spectralFluxZScore, 0.0))
// #define FLUX_GLOW 0.0

#define PI 3.14159265359
#define HEART_COUNT 12.0
#define LINE_COUNT 3.0
#define MAX_ITER 8

// ============================================================================
// HELPERS
// ============================================================================

float dot2(vec2 v) { return dot(v, v); }

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

float sdHeart(vec2 p) {
    p.x = abs(p.x);
    p.y += 0.6;
    if (p.y + p.x > 1.0)
        return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
    return sqrt(min(dot2(p - vec2(0.0, 1.0)),
                dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

// Simple fractal noise for heart interiors
float fractalNoise(vec2 p, float t) {
    float noise = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
        noise += (sin(p.x * freq + t * 0.3) * cos(p.y * freq * 1.1 + t * 0.2)) * amp;
        freq *= 2.1;
        amp *= 0.5;
    }
    return noise * 0.5 + 0.5;
}

// Mandelbrot path for heart positions
void mandelbrotPath(float t, float lineIdx, out vec2 pos, out float scale, out float rotation) {
    float angle = lineIdx * PI * 2.0 / LINE_COUNT + iTime * 0.08;
    float radius = 0.5 + 0.2 * sin(angle * 2.0 + iTime * 0.15);
    vec2 c = vec2(cos(angle), sin(angle)) * radius;
    c.x += MANDEL_DRIFT;

    vec2 z = vec2(0.0);
    float lastLen = 0.0;

    for (int i = 0; i < MAX_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (float(i) >= t * float(MAX_ITER)) {
            pos = z * 0.4 * SPREAD;
            scale = (length(z) - lastLen) * 1.5 + 0.6;
            rotation = atan(z.y, z.x) * 2.0 + t * PI * 3.0;
            return;
        }
        lastLen = length(z);
    }
    pos = z * 0.4 * SPREAD;
    scale = 0.6;
    rotation = atan(z.y, z.x) * 2.0;
}

// ============================================================================
// CHROMADEPTH: red = near, violet = far
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.75;
    float sat = 0.92 - t * 0.07;
    float lit = 0.5 - t * 0.08;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 screenUV = fragCoord / iResolution.xy;
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;

    vec3 finalCol = vec3(0.0);
    float finalDepth = 1.0; // start at far
    float closestD = 1e10;

    // Render hearts along Mandelbrot spiral paths
    for (float line = 0.0; line < LINE_COUNT; line++) {
        for (float i = 0.0; i < HEART_COUNT; i++) {
            float t = fract(i / HEART_COUNT - iTime * SPIRAL_SPEED + line * 0.33);

            vec2 pos;
            float scale, rotation;
            mandelbrotPath(t, line, pos, scale, rotation);

            // Heart size reacts to audio
            scale *= HEART_SCALE;
            rotation += HEART_SPIN + t * PI;

            // Transform UV into heart space
            vec2 heartUV = (uv - pos) * rot(rotation) / max(scale, 0.01);

            float d = sdHeart(heartUV);

            if (d < 0.0) {
                // Distance from center determines chromadepth:
                // center hearts = red (near), outer hearts = blue (far)
                float distFromCenter = length(pos);
                float depthVal = clamp(distFromCenter * 0.3, 0.0, 1.0);

                // Interior fractal noise adds depth variation within the heart
                float noise = fractalNoise(heartUV * 3.0, iTime + line * 2.0) * NOISE_INTENSITY;
                depthVal = depthVal * 0.7 + noise * 0.3;

                // Drop shift toward red
                depthVal = max(depthVal - DROP_SHIFT, 0.0);
                depthVal = clamp(depthVal + HUE_DRIFT, 0.0, 1.0);

                vec3 col = chromadepth(depthVal);

                // Edge glow: near the heart boundary
                float edgeFade = smoothstep(0.0, -0.08, d);
                col *= edgeFade;

                // Flux-driven edge highlight
                float edgeHighlight = smoothstep(-0.01, 0.0, d) * FLUX_GLOW * 0.3;
                col += edgeHighlight * vec3(1.0, 0.9, 0.8);

                // Beat flash
                col *= BEAT_FLASH;

                // Layer compositing: closer hearts overwrite farther ones
                if (distFromCenter < closestD) {
                    closestD = distFromCenter;
                    finalCol = max(finalCol, col);
                    finalDepth = depthVal;
                } else {
                    finalCol = max(finalCol, col * 0.6);
                }
            }
        }
    }

    // Background: subtle chromadepth glow radiating outward
    float bgDist = length(uv);
    float bgDepth = clamp(bgDist * 0.35, 0.0, 1.0);
    vec3 bgCol = chromadepth(mix(0.5, 0.75, bgDepth)) * 0.08;
    bgCol *= 1.0 - bgDist * 0.3;
    finalCol = max(finalCol, bgCol);

    finalCol = clamp(finalCol, 0.0, 1.0);

    // --- FRAME FEEDBACK with oklab blending ---
    float fbAngle = iTime * 0.006;
    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotatedUV = vec2(centered.x * fbc - centered.y * fbs,
                          centered.x * fbs + centered.y * fbc) + 0.5;

    // Gentle radial expansion in feedback for bloom effect
    vec2 expand = (rotatedUV - 0.5) * 0.997 + 0.5;
    vec2 fbUV = clamp(expand, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    // Oklab blend
    vec3 colOk = rgb2oklab(finalCol);
    vec3 prevOk = rgb2oklab(prev);

    prevOk.x *= 0.95;
    prevOk.yz *= 0.97;

    float newAmount = 0.68;
    newAmount -= TREND_CONFIDENCE * 0.06;
    newAmount = clamp(newAmount, 0.5, 0.85);

    vec3 blended = mix(prevOk, colOk, newAmount);

    // Prevent chroma death
    float blendedChroma = length(blended.yz);
    float freshChroma = length(colOk.yz);
    if (blendedChroma < freshChroma * 0.6) {
        blended.yz = mix(blended.yz, colOk.yz, 0.3);
    }

    finalCol = oklab2rgb(blended);
    finalCol *= 1.0 + float(beat) * 0.08;

    // Vignette
    vec2 vc = screenUV - 0.5;
    finalCol *= 1.0 - dot(vc, vc) * 0.6;

    finalCol = clamp(finalCol, 0.0, 1.0);
    fragColor = vec4(finalCol, 1.0);
}
