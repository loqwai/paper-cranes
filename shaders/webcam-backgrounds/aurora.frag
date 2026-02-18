// @fullscreen: true
// @mobile: true
// @tags: ambient, background, webcam
// Northern lights curtains — green-cyan-purple aurora webcam background

// ============================================================================
// SLOW PARAMETERS (medians, means, regression — changes over seconds)
// ============================================================================

// Curtain wave frequency
#define CURTAIN_FREQ (2.0 + spectralSpreadMedian * 3.0)

// Drift speed — slow lateral movement
#define DRIFT_SPEED (0.06 + energySlope * 0.03)

// Vertical extent of curtains (how far down they reach)
#define CURTAIN_DROP (0.25 + bassMedian * 0.20)

// Hue center in Oklch (green-cyan ~2.4-3.6)
#define HUE_CENTER (2.9 + pitchClassMedian * 0.5 + spectralCentroidSlope * 0.2)

// Chroma — vivid when trend is steady
#define CHROMA (0.08 + energyRSquared * 0.07)

// Base lightness
#define LIGHTNESS (0.35 + energyMedian * 0.15)

// Number of curtain layers
#define NUM_CURTAINS (3.0 + spectralEntropyMedian * 3.0)

// ============================================================================
// FAST PARAMETERS (small accents only)
// ============================================================================

// Brightness pulse on energy spikes
#define PULSE (max(energyZScore, 0.0) * 0.05)

// Shimmer on treble
#define SHIMMER (max(trebleZScore, 0.0) * 0.03)

// Texture grit from roughness
#define GRIT (spectralRoughnessZScore * 0.005)

// ============================================================================
// NOISE
// ============================================================================

vec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x / 289.0) * 289.0; }
vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// ============================================================================
// AURORA CURTAIN
// ============================================================================

float auroraCurtain(vec2 p, float t, float idx, float total) {
    // Each curtain sits at a different vertical height (upper portion of screen)
    float baseY = 0.15 + idx / total * 0.25;

    // Horizontal wave — the "curtain" shape
    float phase = idx * 2.17 + idx * idx * 0.41;
    float freq = CURTAIN_FREQ * (0.7 + idx * 0.3);

    float wave = 0.0;
    wave += sin(p.x * freq + t * DRIFT_SPEED * 4.0 + phase) * 0.4;
    wave += sin(p.x * freq * 1.8 + t * DRIFT_SPEED * 2.7 + phase * 1.6) * 0.3;
    wave += snoise(vec2(p.x * 1.5 + t * DRIFT_SPEED, idx * 5.0)) * 0.3;

    float curtainTop = baseY + wave * 0.08;

    // Aurora hangs down from the curtain top
    float drop = CURTAIN_DROP * (0.6 + idx / total * 0.4);
    float distFromTop = p.y - curtainTop;

    // Bright at the curtain line, fading downward
    float curtainLine = smoothstep(0.015, 0.0, abs(distFromTop)) * 0.8;
    float hangDown = smoothstep(0.0, -drop, distFromTop) * smoothstep(-drop - 0.1, -drop, distFromTop);

    // Vertical streaks within the curtain
    float streaks = sin(p.x * freq * 3.0 + phase * 2.0) * 0.5 + 0.5;
    streaks = pow(streaks, 2.0);

    float intensity = curtainLine + hangDown * (0.3 + streaks * 0.4);

    // Depth: back curtains dimmer
    intensity *= 0.4 + 0.6 * (idx / total);

    return intensity;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float t = time;
    float totalCurtains = NUM_CURTAINS;

    // --- Accumulate aurora curtains ---
    float totalIntensity = 0.0;
    float hueShift = 0.0;

    for (float i = 0.0; i < 6.0; i += 1.0) {
        if (i >= totalCurtains) break;

        float curtain = auroraCurtain(p, t, i, totalCurtains);
        totalIntensity += curtain * 0.35;

        // Each layer shifts hue slightly (green → cyan → purple)
        hueShift += curtain * (i / totalCurtains) * 0.4;
    }

    totalIntensity = clamp(totalIntensity, 0.0, 1.0);

    // --- Color in Oklch: green-cyan-purple ---
    float hue = HUE_CENTER + hueShift * 0.8;
    float chroma = CHROMA * (0.4 + totalIntensity * 1.5);
    float lightness = mix(0.0, LIGHTNESS, totalIntensity);

    // Fast accents
    lightness += PULSE * totalIntensity;
    lightness += snoise(p * 35.0 + time * 1.5) * SHIMMER * totalIntensity;
    lightness += snoise(p * 20.0 + time * 0.7) * GRIT;

    // Background: very dark blue-black (night sky)
    vec3 bg = oklch2rgb(vec3(0.05, 0.02, 4.5));

    // Aurora color
    vec3 auroraCol = oklch2rgb(vec3(
        clamp(lightness, 0.03, 0.55),
        clamp(chroma, 0.02, 0.16),
        hue
    ));

    // Mix with background
    vec3 col = mix(bg, auroraCol, smoothstep(0.0, 0.02, totalIntensity));

    // --- Center darkening (face area) ---
    float centerDark = 1.0 - 0.2 * exp(-dot(p, p) * 4.0);
    col *= centerDark;

    // --- Frame feedback ---
    vec4 prev = getLastFrameColor(uv);
    col = mix(prev.rgb, col, 0.10);

    // --- Vignette ---
    float r = length(p);
    float vign = 1.0 - r * 0.15;
    col *= vign;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
