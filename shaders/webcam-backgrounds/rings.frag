// @fullscreen: true
// @mobile: true
// @tags: ambient, background, webcam
// Concentric rippling rings expanding from center — teal-blue webcam background

// ============================================================================
// SLOW PARAMETERS (medians, means, regression — changes over seconds)
// ============================================================================

// Ring expansion speed
#define RING_SPEED (0.08 + energySlope * 0.04)

// Ring spacing
#define RING_SPACING (0.12 + spectralSpreadMedian * 0.10)

// Ring thickness
#define RING_WIDTH (0.02 + bassMedian * 0.015)

// Number of simultaneous rings
#define NUM_RINGS (4.0 + spectralEntropyMedian * 4.0)

// Hue center in Oklch (teal-blue ~3.5-4.3)
#define HUE_CENTER (3.8 + pitchClassMedian * 0.4 + spectralCentroidSlope * 0.15)

// Chroma
#define CHROMA (0.08 + energyRSquared * 0.06)

// Base lightness
#define LIGHTNESS (0.35 + energyMedian * 0.12)

// Ring distortion amount
#define DISTORT (0.3 + spectralKurtosisMedian * 0.3)

// ============================================================================
// FAST PARAMETERS (small accents only)
// ============================================================================

// Ring flash on flux spike
#define RING_FLASH (max(spectralFluxZScore, 0.0) * 0.06)

// Surface shimmer
#define SHIMMER (max(trebleZScore, 0.0) * 0.03)

// Grit texture
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
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float t = time;

    // Distort coordinates with noise for organic rings
    float angle = atan(p.y, p.x);
    float r = length(p);

    // Angular distortion — makes rings wobbly
    float angDistort = snoise(vec2(angle * 2.0, t * 0.1)) * DISTORT * 0.03;
    float distortedR = r + angDistort;

    // --- Ring field ---
    float totalRing = 0.0;
    float numRings = NUM_RINGS;

    for (float i = 0.0; i < 8.0; i += 1.0) {
        if (i >= numRings) break;

        // Each ring expands outward over time
        float ringRadius = mod(t * RING_SPEED + i * RING_SPACING, RING_SPACING * numRings);

        // Distance from this ring
        float ringDist = abs(distortedR - ringRadius);

        // Width tapers as ring expands
        float width = RING_WIDTH * (1.0 - ringRadius * 0.5);
        width = max(width, 0.005);

        // Soft ring shape
        float ring = smoothstep(width, width * 0.2, ringDist);

        // Fade as ring expands
        float fadeFactor = 1.0 - smoothstep(0.0, RING_SPACING * numRings * 0.9, ringRadius);
        ring *= fadeFactor;

        totalRing += ring * 0.5;
    }

    totalRing = clamp(totalRing, 0.0, 1.0);

    // --- Glow between rings: soft radial gradient ---
    float radialGlow = exp(-r * r * 3.0) * 0.15;

    // --- Color in Oklch: teal-blue ---
    float hue = HUE_CENTER + r * 0.3 + angle * 0.02;
    float chroma = CHROMA * (0.4 + totalRing * 1.5);
    float lightness = mix(0.0, LIGHTNESS, totalRing) + radialGlow;

    // Fast accents
    lightness += RING_FLASH * totalRing;
    lightness += snoise(p * 30.0 + time * 1.5) * SHIMMER * totalRing;
    lightness += snoise(p * 20.0 + time * 0.5) * GRIT;

    // Background: very dark teal
    vec3 bg = oklch2rgb(vec3(0.05, 0.025, 4.0));

    // Ring color
    vec3 ringCol = oklch2rgb(vec3(
        clamp(lightness, 0.03, 0.50),
        clamp(chroma, 0.02, 0.14),
        hue
    ));

    // Mix with background
    vec3 col = mix(bg, ringCol, smoothstep(0.0, 0.01, totalRing + radialGlow));

    // --- Center glow (subtle) ---
    vec3 centerGlowCol = oklch2rgb(vec3(0.15, 0.04, HUE_CENTER));
    col += centerGlowCol * radialGlow;

    // --- Frame feedback ---
    vec4 prev = getLastFrameColor(uv);
    col = mix(prev.rgb, col, 0.10);

    // --- Vignette ---
    float vign = 1.0 - r * 0.18;
    col *= vign;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
