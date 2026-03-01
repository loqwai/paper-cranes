// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: heart, chromadepth, 3d, fractal, kali, love, pulse
// ChromaDepth Kali Heart Pulse - A single pulsing heart filled with Kali fractal
// The heart shape contains an entire recursive fractal universe inside it.
// Outside the heart: dark void with subtle glow. Inside: Kali fold filigree.
// Chromadepth maps fractal depth: fold-core = red (near), sparse = violet (far).
// Bass makes it breathe. Beats make it throb. Oklab feedback for persistence.

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Heart pulse: bass makes the heart breathe
#define HEART_BREATH (1.0 + bassZScore * 0.08)
// #define HEART_BREATH 1.0

// Kali param X: treble shifts fractal structure
#define KALI_X (0.78 + trebleZScore * 0.02)
// #define KALI_X 0.78

// Kali param Y: spectral centroid slope with confidence gating
#define KALI_Y (0.82 + spectralCentroidSlope * 12.0 * spectralCentroidRSquared * 0.04)
// #define KALI_Y 0.82

// Kali param Z: entropy controls the 3rd dimension fold
#define KALI_Z (0.68 + spectralEntropyNormalized * 0.2)
// #define KALI_Z 0.75

// Internal zoom: energy drives how deep we see into the fractal
#define INNER_ZOOM (2.5 + energyNormalized * 1.5)
// #define INNER_ZOOM 3.0

// Inner rotation: pitch class slowly turns the fractal view
#define INNER_ROT (iTime * 0.06 + pitchClassNormalized * 0.4)
// #define INNER_ROT 0.0

// Edge glow: spectral flux brightens the heart edge
#define EDGE_GLOW_STRENGTH (0.3 + max(spectralFluxZScore, 0.0) * 0.4)
// #define EDGE_GLOW_STRENGTH 0.5

// Brightness from energy
#define BRIGHT_MOD (0.8 + energyZScore * 0.15)
// #define BRIGHT_MOD 0.85

// Beat throb: the heart visually expands on beat
#define BEAT_THROB (beat ? 1.06 : 1.0)
// #define BEAT_THROB 1.0

// Beat brightness flash
#define BEAT_FLASH (beat ? 1.2 : 1.0)
// #define BEAT_FLASH 1.0

// Drop detection
#define DROP_INTENSITY (max(-energyZScore, 0.0))
// #define DROP_INTENSITY 0.0

// Hue shift from spectral spread
#define HUE_SHIFT (spectralSpreadNormalized * 0.08)
// #define HUE_SHIFT 0.0

// Roughness for saturation
#define ROUGHNESS_SAT (0.88 + spectralRoughnessNormalized * 0.12)
// #define ROUGHNESS_SAT 0.92

// Feedback confidence
#define TREND_CONFIDENCE (energyRSquared * 0.5 + bassRSquared * 0.3 + spectralCentroidRSquared * 0.2)
// #define TREND_CONFIDENCE 0.5

// Mids for subtle pan
#define PAN_MOD (midsZScore * 0.02)
// #define PAN_MOD 0.0

// ============================================================================
// BACKGROUND HEARTS — decoupled, always-present, smooth intensity
// ============================================================================

// Confident energy trend (slope * rSquared): smooth builds/drops, no jitter
#define ENERGY_TREND_SIGNAL clamp(energySlope * 12.0 * energyRSquared, -1.0, 1.0)
// #define ENERGY_TREND_SIGNAL 0.0

// Bass presence (slow, warm, independent from treble) — always moving
#define BASS_PRESENCE bassNormalized
// #define BASS_PRESENCE 0.5

// Flux confidence (sustained timbral change, not one-off spikes)
#define FLUX_TREND clamp(spectralFluxSlope * 10.0 * spectralFluxRSquared, 0.0, 1.0)
// #define FLUX_TREND 0.0

// Spectral texture (decorrelated from energy: roughness + entropy, not volume)
#define TEXTURE_LEVEL (spectralRoughnessNormalized * 0.5 + spectralEntropyNormalized * 0.5)
// #define TEXTURE_LEVEL 0.5

// Bass character: bass with energy subtracted — shows bass *shape* not loudness
#define BASS_CHARACTER (bassZScore - energyZScore * 0.7)
// #define BASS_CHARACTER 0.0

// Base visibility: hearts are always faintly present (never zero)
#define BG_BASE 0.12

// Smooth intensity: blends decoupled signals for organic swell
// — energy trend (build/drop awareness)
// — bass presence (slow warm pulse)
// — flux trend (sustained timbral motion)
// — texture level (harmonic richness)
#define BG_INTENSITY (BG_BASE \
    + clamp(ENERGY_TREND_SIGNAL, 0.0, 0.35) \
    + BASS_PRESENCE * 0.15 \
    + FLUX_TREND * 0.2 \
    + TEXTURE_LEVEL * 0.1 \
    + max(BASS_CHARACTER, 0.0) * 0.12)
// #define BG_INTENSITY 0.5

// Background hearts grid density
#define BG_HEART_GRID 5.0

// Background heart size: bass-driven (slow, independent)
#define BG_HEART_SIZE (0.07 + BASS_PRESENCE * 0.04)
// #define BG_HEART_SIZE 0.1

// Background heart drift speed: flux-trend driven (only drifts during sustained change)
#define BG_DRIFT (0.04 + FLUX_TREND * 0.06)
// #define BG_DRIFT 0.06

// Per-heart color warmth: roughness shifts gold↔yellow (gritty = warmer)
#define HEART_WARMTH spectralRoughnessNormalized
// #define HEART_WARMTH 0.5

// Per-heart rotation modulation: centroid (pitch center, independent from bass)
#define HEART_ROT_MOD spectralCentroidNormalized
// #define HEART_ROT_MOD 0.5

#define PI 3.14159265359
#define KALI_ITER 10
#define PHI 1.61803398875

// ============================================================================
// HELPERS
// ============================================================================

float dot2(vec2 v) { return dot(v, v); }

mat2 rot2(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Hash for pseudo-random per-cell values
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    return vec2(hash21(p), hash21(p + 17.3));
}

float sdHeart(vec2 p) {
    p.x = abs(p.x);
    p.y += 0.6;
    if (p.y + p.x > 1.0)
        return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
    return sqrt(min(dot2(p - vec2(0.0, 1.0)),
                dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

// ============================================================================
// CHROMADEPTH
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.78;
    float sat = ROUGHNESS_SAT - t * 0.08;
    float lit = 0.52 - t * 0.1;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 screenUV = fragCoord / iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Heart transform: center, scale, breathe
    vec2 heartUV = uv;
    heartUV.y += 0.05; // shift heart slightly up
    float heartScale = 0.55 * HEART_BREATH * BEAT_THROB;
    heartUV /= max(heartScale, 0.01);

    float heartD = sdHeart(heartUV);

    vec3 col = vec3(0.0);

    if (heartD < 0.0) {
        // === INSIDE THE HEART: Kali fractal ===

        // Map heart interior UVs into fractal space
        vec2 fracUV = heartUV * 0.7;

        // Rotation
        float fAngle = INNER_ROT;
        float fca = cos(fAngle), fsa = sin(fAngle);
        fracUV = mat2(fca, -fsa, fsa, fca) * fracUV;

        // Zoom
        fracUV *= INNER_ZOOM;

        // Pan
        fracUV += vec2(PAN_MOD, PAN_MOD * 0.7);

        // Wander through Kali param space
        float wt = iTime * 0.025;
        vec3 kaliParam = vec3(
            KALI_X + 0.12 * sin(wt * 1.0) + 0.06 * cos(wt * PHI * 0.5),
            KALI_Y + 0.1 * sin(wt * 0.7 * PHI),
            KALI_Z + 0.08 * sin(wt * 0.9) + 0.05 * cos(wt * PHI * 0.7)
        );

        // Drop jolts param
        float dropJolt = DROP_INTENSITY * (1.0 - TREND_CONFIDENCE) * 0.1;
        kaliParam.x += sin(iTime * 3.7) * dropJolt;
        kaliParam.y += cos(iTime * 2.3) * dropJolt;
        kaliParam = clamp(kaliParam, vec3(0.35), vec3(1.35));

        // --- KALI ITERATION ---
        vec3 p = vec3(fracUV, 0.5 + spectralEntropyNormalized * 0.2);

        float trapOrigin = 1e10;
        float trapAxis = 1e10;
        float accumGlow = 0.0;
        float accumDepth = 0.0;
        vec3 p1 = p, p2 = p;

        for (int i = 0; i < KALI_ITER; i++) {
            p = abs(p);
            float d = max(dot(p, p), 0.001);
            p = p / d - kaliParam;

            float dist = length(p);
            trapOrigin = min(trapOrigin, dist);
            trapAxis = min(trapAxis, min(abs(p.x), min(abs(p.y), abs(p.z))));

            float weight = 1.0 / (1.0 + float(i) * 0.5);
            accumGlow += exp(-dist * 4.0) * weight;
            accumDepth += dist * weight;

            if (i == 1) p1 = p;
            if (i == 3) p2 = p;
        }

        // --- DEPTH from orbit traps ---
        float tOrigin = clamp(trapOrigin * 0.8, 0.0, 1.0);
        float tEdge = clamp(trapAxis * 2.0, 0.0, 1.0);
        float tGlow = clamp(accumGlow * 0.4, 0.0, 1.0);
        float tOrbit = clamp(accumDepth / float(KALI_ITER) * 0.3, 0.0, 1.0);

        float depth = tOrigin * 0.2 + tEdge * 0.15 + (1.0 - tGlow) * 0.35 + tOrbit * 0.3;
        depth = smoothstep(0.05, 0.95, depth);

        // Drop pushes toward red
        depth = mix(depth, 0.0, DROP_INTENSITY * 0.35);
        depth = fract(depth + HUE_SHIFT);

        col = chromadepth(depth);

        // Brightness from fold glow
        float foldGlow = clamp(accumGlow * 0.6, 0.0, 1.0);
        float edgeBright = exp(-tEdge * 6.0) * 0.35;
        float brightness = 0.4 + foldGlow * 0.35 + edgeBright;
        brightness *= clamp(BRIGHT_MOD, 0.3, 1.2);
        col *= brightness;

        // Fractal edge highlight
        float fEdge = length(vec2(dFdx(depth), dFdy(depth)));
        col += smoothstep(0.0, 0.07, fEdge) * 0.15 * vec3(1.0, 0.95, 0.88);

        // Fade near heart boundary for smooth edge
        float edgeFade = smoothstep(0.0, -0.06, heartD);
        col *= edgeFade;

        col *= BEAT_FLASH;

    } else {
        // === OUTSIDE THE HEART ===

        // Edge glow (red/orange, pops forward in chromadepth)
        float glowDist = smoothstep(0.15, 0.0, heartD);
        col = chromadepth(0.05) * glowDist * EDGE_GLOW_STRENGTH;
        col *= 1.0 + float(beat) * 0.3;

        // Subtle pulsing ember near the edge
        float pulse = sin(iTime * 2.0 + heartD * 10.0) * 0.5 + 0.5;
        col += chromadepth(0.1) * glowDist * pulse * 0.08;

        // === BACKGROUND HEARTS — always drawn, audio only controls brightness ===
        // Hearts NEVER pop in/out. They're always structurally present.
        // Audio smoothly modulates brightness between dim ghost and warm glow.
        float intensity = clamp(BG_INTENSITY, 0.0, 1.0);

        // Brightness range: dim ghost → warm glow (never zero, never blinding)
        float dimBright = 0.06;
        float peakBright = 0.5;
        float heartBright = mix(dimBright, peakBright, intensity);

        // Tile UV into a grid
        float cellSize = 1.0 / max(BG_HEART_GRID, 1.0);
        // Very slow drift — fast drift causes cell-boundary popping
        vec2 driftUV = uv + vec2(0.0, iTime * BG_DRIFT);

        vec2 cellID = floor(driftUV / cellSize);
        vec2 cellUV = fract(driftUV / cellSize) - 0.5;

        vec3 heartCol = vec3(0.0);
        for (float dx = -1.0; dx <= 1.0; dx++) {
            for (float dy = -1.0; dy <= 1.0; dy++) {
                vec2 neighbor = cellID + vec2(dx, dy);

                // Per-heart random properties (stable per cell)
                float rnd = hash21(neighbor);
                vec2 jitter = hash22(neighbor * 7.1) - 0.5;

                // Size: bass-driven (slow) + per-heart variation
                float hSize = mix(0.35, 0.85, rnd) * BG_HEART_SIZE / max(cellSize, 0.001);

                // Rotation: centroid (pitch center) + gentle wobble
                float hRot = (rnd - 0.5) * 1.0
                    + HEART_ROT_MOD * 0.4
                    + sin(iTime * 0.3 + rnd * 6.28) * 0.1;

                // Position (jittered within cell)
                vec2 hPos = cellUV - vec2(dx, dy) - jitter * 0.6;
                hPos = rot2(hRot) * hPos;
                hPos /= max(hSize, 0.01);

                float hd = sdHeart(hPos);

                if (hd < 0.0) {
                    // Color in oklab: gold/yellow via oklch hue
                    // Warm gold ~1.2 rad, cooler yellow ~1.7 rad
                    float hAngle = mix(1.1, 1.7, mix(rnd, 1.0 - HEART_WARMTH, 0.4));

                    // Per-heart brightness: stagger so they're not uniform
                    float perHeartBright = heartBright * mix(0.7, 1.0, rnd);
                    float L = mix(0.15, 0.7, perHeartBright);
                    float C = 0.15 + perHeartBright * 0.08;

                    vec3 hCol = oklab2rgb(vec3(L, C * cos(hAngle), C * sin(hAngle)));
                    hCol = max(hCol, vec3(0.0));

                    // Soft interior fade
                    float fill = smoothstep(0.0, -0.18, hd);
                    hCol *= fill;

                    // Beat: tiny additive warmth
                    hCol *= 1.0 + float(beat) * 0.08;

                    heartCol = max(heartCol, hCol);
                } else if (hd < 0.05) {
                    // Warm glow halo in oklab
                    float glow = smoothstep(0.05, 0.0, hd) * 0.1 * heartBright;
                    vec3 glowLab = vec3(0.5, 0.12 * cos(1.3), 0.12 * sin(1.3));
                    vec3 glowCol = max(oklab2rgb(glowLab), vec3(0.0));
                    heartCol = max(heartCol, glowCol * glow);
                }
            }
        }

        col = max(col, heartCol);
    }

    col = clamp(col, 0.0, 1.0);

    // --- FRAME FEEDBACK with oklab ---
    float fbAngle = iTime * 0.005;
    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotUV = vec2(centered.x * fbc - centered.y * fbs,
                      centered.x * fbs + centered.y * fbc) + 0.5;

    vec2 fbUV = clamp(rotUV, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);

    prevOk.x *= 0.95;
    prevOk.yz *= 0.97;

    float newAmount = 0.7;
    newAmount -= TREND_CONFIDENCE * 0.07;
    newAmount = clamp(newAmount, 0.55, 0.85);

    vec3 blended = mix(prevOk, colOk, newAmount);

    float blendedChroma = length(blended.yz);
    float freshChroma = length(colOk.yz);
    if (blendedChroma < freshChroma * 0.6) {
        blended.yz = mix(blended.yz, colOk.yz, 0.35);
    }

    col = oklab2rgb(blended);

    // Vignette
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.5;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
