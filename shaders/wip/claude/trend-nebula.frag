// @fullscreen: true
// @mobile: true
// @tags: ambient, trends, regression

// ============================================================================
// TREND-DRIVEN PARAMETERS
// Median = stable baseline. Slope * rSquared = confident trend direction.
// The visual evolves with the music's character, not its transients.
// ============================================================================

// --- Shape (bass domain) ---
#define WARP_STRENGTH (0.8 + bassMedian * 1.2 + bassSlope * bassRSquared * 0.6)

// --- Color (spectral centroid - brightness center of the sound) ---
#define HUE_BASE (0.55 + spectralCentroidMedian * 0.7)
#define HUE_DRIFT (spectralCentroidSlope * spectralCentroidRSquared * 0.25)

// --- Detail (entropy - chaos vs order) ---
#define CHAOS (spectralEntropyMedian)
#define CHAOS_TREND (spectralEntropySlope * spectralEntropyRSquared * 0.3)

// --- Energy ---
#define ENERGY_TREND (energySlope * energyRSquared)
#define ENERGY_BASE (energyMedian)

// --- Texture (roughness - dissonance) ---
#define ROUGHNESS (spectralRoughnessMedian * 0.4)

// --- Treble sparkle ---
#define TREBLE_TREND (trebleSlope * trebleRSquared * 0.3)

// --- Immediate reactivity (small) ---
#define FLUX_KICK (spectralFluxZScore * 0.12)
#define BASS_PULSE (bassZScore * 0.1)

// Simple hash-based noise
float noise(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Smooth value noise
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// FBM with variable octaves
float fbm(vec2 p, int octaves) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 7; i++) {
        if (i >= octaves) break;
        v += a * vnoise(p);
        p = rot * p * 2.0 + 0.5;
        a *= 0.5;
    }
    return v;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);

    float t = iTime * 0.1 + ENERGY_TREND * 0.4;
    int oct = int(clamp(4.0 + CHAOS * 3.0 + CHAOS_TREND, 4.0, 7.0));

    // === Domain warping: warp coordinates through noise layers ===
    // This creates organic, flowing structure
    vec2 p = uv * 3.0;

    // First warp layer - slow, broad shapes
    vec2 q = vec2(
        fbm(p + vec2(0.0, 0.0) + t * 0.4, oct),
        fbm(p + vec2(5.2, 1.3) - t * 0.3, oct)
    );

    // Second warp layer - finer detail, influenced by trends
    vec2 r = vec2(
        fbm(p + q * WARP_STRENGTH + vec2(1.7, 9.2) + t * 0.2, oct),
        fbm(p + q * WARP_STRENGTH + vec2(8.3, 2.8) - t * 0.15, oct)
    );

    // Final noise value from warped coordinates
    float f = fbm(p + r * (1.5 + ROUGHNESS), oct);

    // Sharpen contrast
    f = smoothstep(0.15, 0.85, f);

    // === Color ===
    float hue = HUE_BASE + HUE_DRIFT + r.x * 0.12 + t * 0.02;

    // Use the warp displacement for hue variation across space
    float hueSpread = length(r - q) * 0.3;
    hue += hueSpread;

    float sat = 0.55 + ENERGY_BASE * 0.3 + f * 0.15;
    float lum = 0.05 + f * 0.45 + ENERGY_BASE * 0.1;

    // Confident energy rise brightens (capped contribution)
    lum += clamp(ENERGY_TREND, 0.0, 0.5) * 0.15;
    // Flux kicks add sparkle only in bright regions
    lum += max(0.0, FLUX_KICK) * f * f * 0.8;

    vec3 col = hsl2rgb(vec3(fract(hue), clamp(sat, 0.0, 1.0), clamp(lum, 0.0, 0.65)));

    // Warm highlights on bass pulses
    col += vec3(0.25, 0.1, 0.03) * smoothstep(0.5, 0.9, f) * max(0.0, BASS_PULSE);

    // Treble trend adds a cool rim on edges
    float edge = abs(f - 0.5) * 2.0;
    col += vec3(0.05, 0.1, 0.2) * edge * max(0.0, TREBLE_TREND);

    // === Subtle feedback for persistence, not dominance ===
    vec2 fbUv = fragCoord / iResolution.xy;
    vec2 toCenter = (vec2(0.5) - fbUv) * 0.001;
    vec4 prev = getLastFrameColor(fbUv + toCenter);

    // Light blend - feedback adds memory, not blur
    float feedback = 0.2 + CHAOS * 0.15;
    col = mix(col, prev.rgb * 0.95, clamp(feedback, 0.1, 0.35));

    // Vignette
    col *= 1.0 - 0.4 * dot(uv, uv);

    fragColor = vec4(col, 1.0);
}
