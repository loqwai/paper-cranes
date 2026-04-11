// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: heart, chromadepth, 3d, fractal, kali, love, pulse, blue
// ChromaDepth Kali Heart — Cobalt Glow
// Deep cobalt blue background with a radial glow gradient — brighter
// blue-violet radiates outward from behind the heart like a halo,
// fading to deep dark cobalt at the edges. The heart sits in a pool
// of its own warm light against the cold blue void. All oklab.

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

#define HEART_BREATH (1.0 + bassZScore * 0.08)
#define KALI_X (0.78 + trebleZScore * 0.02)
#define KALI_Y (0.82 + spectralCentroidSlope * 12.0 * spectralCentroidRSquared * 0.04)
#define KALI_Z (0.68 + spectralEntropyNormalized * 0.2)
#define INNER_ZOOM (2.5 + energyNormalized * 1.5)
#define INNER_ROT (iTime * 0.06 + pitchClassNormalized * 0.4)
#define EDGE_GLOW_STRENGTH (0.3 + max(spectralFluxZScore, 0.0) * 0.4)
#define BRIGHT_MOD (0.8 + energyZScore * 0.15)
#define BEAT_THROB (beat ? 1.06 : 1.0)
#define BEAT_FLASH (beat ? 1.2 : 1.0)
#define DROP_INTENSITY (max(-energyZScore, 0.0))
#define HUE_SHIFT (spectralSpreadNormalized * 0.08)
#define ROUGHNESS_SAT (0.88 + spectralRoughnessNormalized * 0.12)
#define TREND_CONFIDENCE (energyRSquared * 0.5 + bassRSquared * 0.3 + spectralCentroidRSquared * 0.2)
#define PAN_MOD (midsZScore * 0.02)

// ============================================================================
// BACKGROUND HEARTS
// ============================================================================
#define ENERGY_TREND_SIGNAL clamp(energySlope * 12.0 * energyRSquared, -1.0, 1.0)
#define BASS_PRESENCE bassNormalized
#define FLUX_TREND clamp(spectralFluxSlope * 10.0 * spectralFluxRSquared, 0.0, 1.0)
#define TEXTURE_LEVEL (spectralRoughnessNormalized * 0.5 + spectralEntropyNormalized * 0.5)
#define BASS_CHARACTER (bassZScore - energyZScore * 0.7)
#define BG_BASE 0.12
#define BG_INTENSITY (BG_BASE \
    + clamp(ENERGY_TREND_SIGNAL, 0.0, 0.35) \
    + BASS_PRESENCE * 0.15 \
    + FLUX_TREND * 0.2 \
    + TEXTURE_LEVEL * 0.1 \
    + max(BASS_CHARACTER, 0.0) * 0.12)
#define BG_HEART_GRID 5.0
#define BG_HEART_SIZE (0.07 + BASS_PRESENCE * 0.04)
#define BG_DRIFT (0.04 + FLUX_TREND * 0.06)
#define HEART_WARMTH spectralRoughnessNormalized
#define HEART_ROT_MOD spectralCentroidNormalized

// Halo glow: energy drives the blue halo brightness behind the heart
#define HALO_BRIGHTNESS (0.3 + energyNormalized * 0.25)
// #define HALO_BRIGHTNESS 0.4

// Halo size: mids widen the glow pool
#define HALO_SIZE (0.6 + midsNormalized * 0.3)
// #define HALO_SIZE 0.75

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
// CHROMADEPTH (oklab)
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = 0.4 + t * 4.5;
    float L = 0.72 - t * 0.15;
    float C = 0.2 - t * 0.04;
    return max(oklab2rgb(vec3(L, C * cos(hue), C * sin(hue))), vec3(0.0));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 screenUV = fragCoord / iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Heart transform
    vec2 heartUV = uv;
    heartUV.y += 0.05;
    float heartScale = 0.55 * HEART_BREATH * BEAT_THROB;
    heartUV /= max(heartScale, 0.01);
    float heartD = sdHeart(heartUV);

    // Deep cobalt background with radial halo glow behind the heart
    float distFromCenter = length(uv - vec2(0.0, 0.05)); // centered on heart

    // Edge cobalt: deep dark blue
    vec3 bgEdge = vec3(0.1, -0.02, -0.08); // deep cobalt in oklab

    // Halo: brighter blue-violet radiating from heart center
    float haloFalloff = smoothstep(HALO_SIZE, 0.0, distFromCenter);
    float haloStrength = haloFalloff * haloFalloff * HALO_BRIGHTNESS;
    vec3 bgHalo = vec3(0.25, 0.0, -0.1); // brighter blue-violet

    vec3 bgOk = mix(bgEdge, bgHalo, haloStrength);
    // Beat gently brightens the halo
    bgOk.x += float(beat) * 0.02 * haloFalloff;

    vec3 col = max(oklab2rgb(bgOk), vec3(0.0));

    if (heartD < 0.0) {
        // === INSIDE THE HEART: Kali fractal ===
        vec2 fracUV = heartUV * 0.7;
        float fAngle = INNER_ROT;
        float fca = cos(fAngle), fsa = sin(fAngle);
        fracUV = mat2(fca, -fsa, fsa, fca) * fracUV;
        fracUV *= INNER_ZOOM;
        fracUV += vec2(PAN_MOD, PAN_MOD * 0.7);

        float wt = iTime * 0.025;
        vec3 kaliParam = vec3(
            KALI_X + 0.12 * sin(wt * 1.0) + 0.06 * cos(wt * PHI * 0.5),
            KALI_Y + 0.1 * sin(wt * 0.7 * PHI),
            KALI_Z + 0.08 * sin(wt * 0.9) + 0.05 * cos(wt * PHI * 0.7)
        );

        float dropJolt = DROP_INTENSITY * (1.0 - TREND_CONFIDENCE) * 0.1;
        kaliParam.x += sin(iTime * 3.7) * dropJolt;
        kaliParam.y += cos(iTime * 2.3) * dropJolt;
        kaliParam = clamp(kaliParam, vec3(0.35), vec3(1.35));

        vec3 p = vec3(fracUV, 0.5 + spectralEntropyNormalized * 0.2);
        float trapOrigin = 1e10;
        float trapAxis = 1e10;
        float accumGlow = 0.0;
        float accumDepth = 0.0;

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
        }

        float tOrigin = clamp(trapOrigin * 0.8, 0.0, 1.0);
        float tEdge = clamp(trapAxis * 2.0, 0.0, 1.0);
        float tGlow = clamp(accumGlow * 0.4, 0.0, 1.0);
        float tOrbit = clamp(accumDepth / float(KALI_ITER) * 0.3, 0.0, 1.0);

        float depth = tOrigin * 0.2 + tEdge * 0.15 + (1.0 - tGlow) * 0.35 + tOrbit * 0.3;
        depth = smoothstep(0.05, 0.95, depth);
        depth = mix(depth, 0.0, DROP_INTENSITY * 0.35);
        depth = fract(depth + HUE_SHIFT);

        col = chromadepth(depth);
        float foldGlow = clamp(accumGlow * 0.6, 0.0, 1.0);
        float edgeBright = exp(-tEdge * 6.0) * 0.35;
        float brightness = 0.4 + foldGlow * 0.35 + edgeBright;
        brightness *= clamp(BRIGHT_MOD, 0.3, 1.2);
        col *= brightness;

        float fEdge = length(vec2(dFdx(depth), dFdy(depth)));
        col += smoothstep(0.0, 0.07, fEdge) * 0.15 * vec3(1.0, 0.95, 0.88);

        float edgeFade = smoothstep(0.0, -0.06, heartD);
        col *= edgeFade;
        col *= BEAT_FLASH;

    } else {
        // === OUTSIDE: cobalt + halo + edge glow + background hearts ===

        // Edge glow (warm, pops forward against cold blue)
        float glowDist = smoothstep(0.15, 0.0, heartD);
        col += chromadepth(0.05) * glowDist * EDGE_GLOW_STRENGTH;
        col *= 1.0 + float(beat) * 0.15;

        float pulse = sin(iTime * 2.0 + heartD * 10.0) * 0.5 + 0.5;
        col += chromadepth(0.1) * glowDist * pulse * 0.06;

        // Background hearts
        float intensity = clamp(BG_INTENSITY, 0.0, 1.0);
        float heartBright = mix(0.06, 0.5, intensity);

        float cellSize = 1.0 / max(BG_HEART_GRID, 1.0);
        vec2 driftUV = uv + vec2(0.0, iTime * BG_DRIFT);
        vec2 cellID = floor(driftUV / cellSize);
        vec2 cellUV = fract(driftUV / cellSize) - 0.5;

        vec3 heartCol = vec3(0.0);
        for (float dx = -1.0; dx <= 1.0; dx++) {
            for (float dy = -1.0; dy <= 1.0; dy++) {
                vec2 neighbor = cellID + vec2(dx, dy);
                float rnd = hash21(neighbor);
                vec2 jitter = hash22(neighbor * 7.1) - 0.5;
                float hSize = mix(0.35, 0.85, rnd) * BG_HEART_SIZE / max(cellSize, 0.001);
                float hRot = (rnd - 0.5) * 1.0 + HEART_ROT_MOD * 0.4 + sin(iTime * 0.3 + rnd * 6.28) * 0.1;

                vec2 hPos = cellUV - vec2(dx, dy) - jitter * 0.6;
                hPos = rot2(hRot) * hPos;
                hPos /= max(hSize, 0.01);
                float hd = sdHeart(hPos);

                if (hd < 0.0) {
                    float hAngle = mix(1.1, 1.7, mix(rnd, 1.0 - HEART_WARMTH, 0.4));
                    float perHeartBright = heartBright * mix(0.7, 1.0, rnd);
                    float L = mix(0.15, 0.7, perHeartBright);
                    float C = 0.15 + perHeartBright * 0.08;
                    vec3 hCol = max(oklab2rgb(vec3(L, C * cos(hAngle), C * sin(hAngle))), vec3(0.0));
                    float fill = smoothstep(0.0, -0.18, hd);
                    hCol *= fill * (1.0 + float(beat) * 0.08);
                    heartCol = max(heartCol, hCol);
                } else if (hd < 0.05) {
                    float glow = smoothstep(0.05, 0.0, hd) * 0.1 * heartBright;
                    vec3 glowCol = max(oklab2rgb(vec3(0.5, 0.12 * cos(1.3), 0.12 * sin(1.3))), vec3(0.0));
                    heartCol = max(heartCol, glowCol * glow);
                }
            }
        }
        col = max(col, heartCol);
    }

    col = clamp(col, 0.0, 1.0);

    // Frame feedback with oklab
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
    float newAmount = 0.7 - TREND_CONFIDENCE * 0.07;
    newAmount = clamp(newAmount, 0.55, 0.85);
    vec3 blended = mix(prevOk, colOk, newAmount);
    float blendedChroma = length(blended.yz);
    float freshChroma = length(colOk.yz);
    if (blendedChroma < freshChroma * 0.6)
        blended.yz = mix(blended.yz, colOk.yz, 0.35);

    col = oklab2rgb(blended);

    // Vignette — deepens to near-black cobalt at edges
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.65;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
