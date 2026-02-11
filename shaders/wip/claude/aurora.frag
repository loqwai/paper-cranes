// @fullscreen: true
// @mobile: true
// @tags: aurora, ambient, flow
// Aurora Borealis - Audio-reactive northern lights

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Aurora intensity: bass drives the glow strength
#define AURORA_INTENSITY (0.6 + bassNormalized * 0.5)
// #define AURORA_INTENSITY 0.8

// Curtain complexity: entropy adds more folds
#define CURTAIN_FOLDS (3.0 + spectralEntropyNormalized * 2.0)
// #define CURTAIN_FOLDS 4.0

// Hue base: pitch class rotates the palette
#define HUE_BASE (pitchClassNormalized * 0.4)
// #define HUE_BASE 0.0

// Shimmer: treble adds fine-grained sparkle
#define SHIMMER (trebleNormalized * 0.3)
// #define SHIMMER 0.1

// Flow speed: spectral flux accelerates the motion
#define FLOW_SPEED (0.3 + spectralFluxNormalized * 0.4)
// #define FLOW_SPEED 0.4

// Vertical reach: spectral centroid pushes aurora higher/lower
#define VERTICAL_REACH (0.4 + spectralCentroidNormalized * 0.3)
// #define VERTICAL_REACH 0.55

// Color spread: spectral spread widens the hue range
#define COLOR_SPREAD (0.15 + spectralSpreadNormalized * 0.15)
// #define COLOR_SPREAD 0.2

// Brightness pulse on beat
#define BEAT_FLASH (beat ? 1.25 : 1.0)
// #define BEAT_FLASH 1.0

// ============================================================================
// NOISE FUNCTIONS
// ============================================================================

float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
        if (i >= octaves) break;
        value += amplitude * noise(p * frequency);
        frequency *= 2.1;
        amplitude *= 0.5;
    }
    return value;
}

// ============================================================================
// AURORA CURTAIN
// ============================================================================

float auroraCurtain(vec2 uv, float t, float offset) {
    float x = uv.x * CURTAIN_FOLDS + offset;

    // Flowing noise-based curtain shape
    float wave1 = sin(x * 1.2 + t * FLOW_SPEED) * 0.5;
    float wave2 = sin(x * 0.7 - t * FLOW_SPEED * 0.6 + 1.5) * 0.3;
    float wave3 = noise(vec2(x * 0.5, t * FLOW_SPEED * 0.3)) * 0.4;

    float curtainY = wave1 + wave2 + wave3;

    // Vertical position and falloff
    float center = 0.3 + curtainY * 0.15;
    float dist = abs(uv.y - center);
    float reach = VERTICAL_REACH;

    // Soft falloff with aurora-like shape (sharper at bottom, diffuse at top)
    float shape = smoothstep(reach, 0.0, dist);
    shape *= smoothstep(-0.1, 0.15, uv.y - center + reach * 0.5);

    // Fine detail / shimmer
    float detail = noise(vec2(x * 4.0, uv.y * 8.0 + t * 0.5));
    shape *= 0.7 + detail * 0.3 + SHIMMER * detail;

    return shape;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv.x *= iResolution.x / iResolution.y;
    float t = iTime;

    // Dark sky gradient (deep blue to black)
    vec3 sky = mix(vec3(0.0, 0.0, 0.02), vec3(0.01, 0.02, 0.06), uv.y);

    // Stars in the background
    float stars = pow(hash(floor(fragCoord.xy * 0.5)), 20.0);
    stars *= smoothstep(0.0, 0.4, uv.y); // no stars near horizon
    sky += stars * 0.4;

    // Build aurora from multiple curtain layers
    vec3 aurora = vec3(0.0);

    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float offset = fi * 2.3 + t * 0.05;

        // Each layer has different vertical position
        vec2 layerUV = uv;
        layerUV.y -= fi * 0.05;

        float curtain = auroraCurtain(layerUV, t, offset);

        // Color: shift hue per layer for variety
        float hue = HUE_BASE + fi * COLOR_SPREAD + 0.33; // base green
        float sat = 0.7 + fi * 0.1;
        float lum = curtain * AURORA_INTENSITY * (0.6 + fi * 0.15);

        vec3 layerColor = hsl2rgb(vec3(fract(hue), sat, clamp(lum, 0.0, 0.85)));
        aurora += layerColor * curtain;
    }

    // Apply beat flash
    aurora *= BEAT_FLASH;

    // Subtle glow at the base of the aurora
    float baseGlow = smoothstep(0.5, 0.15, uv.y) * 0.04 * AURORA_INTENSITY;
    vec3 glowColor = hsl2rgb(vec3(fract(HUE_BASE + 0.33), 0.5, 0.5));
    aurora += glowColor * baseGlow;

    // Combine sky and aurora
    vec3 col = sky + aurora;

    // Ground silhouette (dark hills)
    float hill1 = smoothstep(0.0, 0.02, uv.y - 0.08 - fbm(vec2(uv.x * 2.0, 0.0), 3) * 0.06);
    float hill2 = smoothstep(0.0, 0.015, uv.y - 0.04 - fbm(vec2(uv.x * 3.0 + 5.0, 0.0), 3) * 0.04);
    col *= hill1 * hill2;

    // Reflection on ground (subtle)
    float groundMask = 1.0 - hill1 * hill2;
    if (groundMask > 0.01) {
        vec2 reflUV = vec2(uv.x, 0.16 - uv.y);
        float reflCurtain = auroraCurtain(reflUV, t, t * 0.05) * 0.15;
        vec3 reflColor = hsl2rgb(vec3(fract(HUE_BASE + 0.33), 0.4, reflCurtain * AURORA_INTENSITY * 0.3));
        col += reflColor * groundMask;
    }

    // Frame feedback for smooth trails
    vec4 prev = getLastFrameColor(fragCoord.xy / iResolution.xy);
    col = mix(prev.rgb * 0.95, col, 0.25);

    // Vignette
    vec2 center = (fragCoord.xy / iResolution.xy) - 0.5;
    float vign = 1.0 - dot(center, center) * 0.5;
    col *= vign;

    // Gentle tone mapping
    col = col / (col + vec3(0.6));
    col = pow(col, vec3(0.9));

    fragColor = vec4(col, 1.0);
}
