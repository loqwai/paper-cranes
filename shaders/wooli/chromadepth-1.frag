// @fullscreen: true
// @favorite: true
// @tags: wooli, mammoth, fractal, dubstep, chromadepth, 3d
//
// ChromaDepth version of wooli/1 — icy fractal mammoth with depth-mapped rainbow
// Red = foreground (closest), Green = middle, Blue/Violet = farthest
// Designed for ChromaDepth 3D glasses
//
// PRESETS:
// Default — chromadepth fractal mammoth
// https://visuals.beadfamous.com/?shader=wooli/chromadepth-1&image=images/wooli.png

#define PI 3.14159265
#define PHI 1.61803398
#define SQRT2 1.41421356
#define IMG_ASPECT (900.0 / 725.0)

// ============================================================================
// AUDIO PARAMETERS (#define swap pattern)
// ============================================================================

// Julia set shape — seed picks a unique fractal family; bass morphs it live
#define MOTION smoothstep(0.12, 0.5, energyNormalized)
#define J_REAL (-0.745 + sin(seed * PI * 2.0) * 0.13 + bassNormalized * 0.01 * MOTION + sin(iTime * 0.011 * PHI) * 0.018 * MOTION)
#define J_IMAG (0.186 + cos(seed * PI * 2.0) * 0.11 + spectralCentroidNormalized * 0.006 * MOTION + cos(iTime * 0.008 * SQRT2) * 0.012 * MOTION)

// Zoom — seed3 picks unique zoom level and drift phase
#define ZOOM_LVL (1.4 + seed3 * 0.8 + sin(iTime * 0.004 * PHI + seed3 * PI * 2.0) * 0.2 * MOTION + sin(iTime * 0.003 * SQRT2 + seed3 * 4.0) * 0.1 * MOTION + energyNormalized * 0.15)

// Rotation — seed3 starting angle
#define ROT_ANGLE (seed3 * PI * 2.0 + iTime * 0.008 * MOTION + spectralFluxNormalized * 0.03)

// Drift
#define DRIFT vec2(sin(iTime * 0.005 * PHI + seed3 * PI * 2.0) * 0.2 * MOTION, cos(iTime * 0.004 * SQRT2 + seed3 * 4.7) * 0.15 * MOTION)

// Edge glow
#define GLOW_BASE (0.6 + bassNormalized * 0.8)
#define GLOW_PULSE (1.0 + bassSlope * bassRSquared * 0.6)

// Depth hue modulation — spectral centroid shifts which depth feels "close"
#define DEPTH_HUE_SHIFT (spectralCentroidSlope * spectralCentroidRSquared * 0.08 + iTime * 0.003 * MOTION)
#define DEPTH_SAT_BOOST (1.0 + energySlope * energyRSquared * 0.1)

// Feedback
#define FB_BLEND (0.82 - energyNormalized * 0.15 - spectralFluxNormalized * 0.05)
#define REFRACT_STR ((0.005 + spectralRoughnessNormalized * 0.015) * MOTION)

// Infinity zoom on drops
#define INFINITY_ZOOM smoothstep(0.2, 0.8, energyZScore)

// Build/drop
#define BUILD_DROP (energySlope * energyRSquared * 6.0)
#define IS_DROPPING clamp(-BUILD_DROP, 0.0, 1.0)

// Mammoth scale
#define MAMMOTH_SCALE (1.4 - bassNormalized * 0.3 - clamp(energyZScore, 0.0, 1.0) * 0.15)

// Fractal tendrils
#define TENDRIL_REACH (0.05 + bassNormalized * 0.1)
#define TENDRIL_INTENSITY smoothstep(0.25, 0.7, energyNormalized)

// Background mammoths
#define BG_VIS (smoothstep(0.55, 0.85, spectralEntropyNormalized) * smoothstep(0.5, 0.8, energyNormalized) * 0.2)
#define BG_TILES (3.0 + floor(energyNormalized * 2.0))

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================
// Maps 0-1 depth to rainbow: red(0)→yellow→green→cyan→blue→violet(1)
// seed2 shifts the depth-to-hue mapping so each device gets a unique palette bias

vec3 chromadepthColor(float t, float sat, float lit) {
    t = clamp(t, 0.0, 1.0);
    // Hue: 0=red(near) → 0.75=violet(far)
    // seed2 rotates which part of the spectrum maps to "near"
    float hue = fract(t * 0.75 + seed2 * 0.15 + DEPTH_HUE_SHIFT);
    sat = clamp(sat * DEPTH_SAT_BOOST, 0.0, 1.0);
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MAMMOTH MASK from image texture
// ============================================================================

float getMask(vec2 uv) {
    float screenAspect = iResolution.x / iResolution.y;
    vec2 c = (uv - 0.5) * MAMMOTH_SCALE;
    if (screenAspect > IMG_ASPECT) c.x *= screenAspect / IMG_ASPECT;
    else c.y *= IMG_ASPECT / screenAspect;
    vec2 imgUV = c + 0.5;
    if (imgUV.x < 0.0 || imgUV.x > 1.0 || imgUV.y < 0.0 || imgUV.y > 1.0) return 0.0;
    return 1.0 - getInitialFrameColor(imgUV).r;
}

// ============================================================================
// EDGE GLOW
// ============================================================================

float getEdgeGlow(vec2 uv, float mask, float width) {
    float nearMask = 0.0;
    for (int i = 0; i < 8; i++) {
        float a = float(i) * PI * 0.25;
        nearMask = max(nearMask, getMask(uv + vec2(cos(a), sin(a)) * width));
    }
    return nearMask * (1.0 - mask);
}

// ============================================================================
// FRACTAL TENDRILS
// ============================================================================

float tendrilFractal(vec2 p) {
    vec2 z = p;
    float v = 0.0;
    float t = iTime * 0.15 * MOTION;
    vec2 c = vec2(1.2 + sin(t + seed4 * PI * 2.0) * 0.15, 0.9 + cos(t * PHI + seed4 * 4.0) * 0.1);
    for (int i = 0; i < 6; i++) {
        z = abs(z) / max(dot(z, z), 0.001) - c;
        v += exp(-abs(z.x) * 4.0);
        v += exp(-abs(z.y) * 4.0) * 0.5;
    }
    return v / 9.0;
}

// ============================================================================
// JULIA SET with orbit traps
// ============================================================================

void juliaSet(vec2 p, vec2 jc,
              out float trapO, out float trapX, out float trapY, out float trapC,
              out float sIter) {
    vec2 z = p;
    trapO = 1e10;
    trapX = 1e10;
    trapY = 1e10;
    trapC = 1e10;
    sIter = 0.0;

    for (int i = 0; i < 80; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + jc;
        float r2 = dot(z, z);
        trapO = min(trapO, r2);
        trapX = min(trapX, abs(z.x));
        trapY = min(trapY, abs(z.y));
        trapC = min(trapC, abs(length(z) - 1.0));
        if (r2 > 256.0) {
            sIter = float(i) - log2(log2(r2)) + 4.0;
            return;
        }
        sIter = float(i + 1);
    }
}

// ============================================================================
// CHROMADEPTH FRACTAL COLOR from orbit traps
// ============================================================================
// Interior (didn't escape) → red/warm (near in chromadepth)
// Boundary (escaped slowly) → green/cyan (mid depth)
// Exterior (escaped fast) → blue/violet (far in chromadepth)
// seed shifts which orbit trap dominates the depth mapping

vec3 fractalChromadepth(float tO, float tX, float tY, float tC, float iter, bool escaped) {
    tO = sqrt(tO); tX = sqrt(tX); tY = sqrt(tY);

    float depth;
    float brightness;

    if (!escaped) {
        // INTERIOR — red/warm tones (chromadepth "near")
        // Combine orbit traps for structural detail
        float trapDetail = min(tX, tY);
        float trapBlend = mix(tO, trapDetail, 0.5 + seed * 0.3);
        trapBlend = mix(trapBlend, tC, 0.2 + seed * 0.15);

        // seed shifts which trap features map to which depth
        depth = clamp(trapBlend * (0.35 + seed * 0.1), 0.0, 0.35);
        brightness = 0.45 + tO * 0.15 + trapDetail * 0.15;

        // Shimmer from iteration
        float shimmer = sin(iter * 0.3 + iTime * 0.5 * MOTION) * 0.5 + 0.5;
        brightness += shimmer * 0.05 * MOTION;
    } else {
        // EXTERIOR — cool tones (chromadepth "far")
        float escapeFrac = clamp(iter / 80.0, 0.0, 1.0);
        // Near boundary = green/cyan, fast escape = deep violet
        depth = mix(0.85, 0.4, pow(escapeFrac, 0.5 + seed * 0.3));
        // Fade brightness with distance from set
        brightness = mix(0.1, 0.6, pow(escapeFrac, 0.6));
    }

    float sat = 0.92 - depth * 0.06;
    float lit = clamp(brightness * 0.55, 0.05, 0.55);
    return chromadepthColor(depth, sat, lit);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    // ---- MAMMOTH MASK + EDGE GLOW ----
    float mask = getMask(uv);
    float glowWidth = 0.02 + bassNormalized * 0.04;
    float edgeGlow = getEdgeGlow(uv, mask, glowWidth);
    float tendrilEdge = getEdgeGlow(uv, mask, TENDRIL_REACH);

    float bleed = smoothstep(0.3, 0.8, bassNormalized) * 0.4;
    float visMask = smoothstep(-bleed * 0.3, 0.45, mask);

    // ---- FRACTAL COORDINATES ----
    vec2 p = (uv - 0.5) * 2.0;
    p.x *= aspect;
    p /= ZOOM_LVL;
    float r = ROT_ANGLE;
    p = mat2(cos(r), -sin(r), sin(r), cos(r)) * p;
    p += DRIFT;

    // ---- JULIA SET ----
    vec2 jc = vec2(J_REAL, J_IMAG);
    float tO, tX, tY, tC, sIter;
    juliaSet(p, jc, tO, tX, tY, tC, sIter);
    bool escaped = (sIter < 80.0);
    vec3 fracCol = fractalChromadepth(tO, tX, tY, tC, sIter, escaped);

    // ---- EDGE GLOW COLOR ---- red-shifted for chromadepth "pop"
    // Edge glow in red/orange = pops forward in chromadepth glasses
    float glowHue = fract(0.05 + seed2 * 0.08);
    vec3 glowCol = hsl2rgb(vec3(glowHue, 0.95, 0.5));
    float mt = iTime * MOTION;
    float wave = sin(uv.x * 8.0 + uv.y * 6.0 - mt * 1.5) * 0.5 + 0.5;
    wave *= sin(uv.y * 5.0 - mt * 1.0 * PHI) * 0.5 + 0.5;
    vec3 edgeLight = glowCol * edgeGlow * GLOW_BASE * GLOW_PULSE * mix(0.7, 1.0, wave);

    // ---- FRACTAL TENDRILS ---- cyan/green for mid-depth
    vec2 tp = p * 0.7 + vec2(sin(iTime * 0.05 * MOTION), cos(iTime * 0.04 * MOTION));
    float tFrac = tendrilFractal(tp);
    float tendrilHue = fract(0.33 + seed2 * 0.1);
    vec3 tendrilCol = hsl2rgb(vec3(tendrilHue, 0.9, 0.45)) * tendrilEdge * tFrac * TENDRIL_INTENSITY;
    vec3 tendrilGlow = hsl2rgb(vec3(fract(tendrilHue + 0.1), 0.85, 0.35)) * tendrilEdge * tFrac * TENDRIL_INTENSITY * 0.3;
    tendrilCol += tendrilGlow;

    // ---- BACKGROUND MAMMOTHS ----
    vec3 bgCol = vec3(0.0);
    float bgVis = BG_VIS;
    if (bgVis > 0.01) {
        float ba = seed4 * PI * 2.0 + iTime * 0.025 * MOTION;
        vec2 bgUV = uv - 0.5;
        bgUV = mat2(cos(ba), -sin(ba), sin(ba), cos(ba)) * bgUV;
        bgUV *= 1.0 + sin(iTime * 0.08 * MOTION) * 0.15;
        bgUV += 0.5;
        float count = BG_TILES;
        vec2 cell = floor(bgUV * count);
        vec2 tiled = fract(bgUV * count);
        float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
        float bgM = (1.0 - getInitialFrameColor(tiled).r) * step(0.3, h) * (1.0 - mask);
        // Background mammoths in violet/blue = far depth
        bgCol = hsl2rgb(vec3(fract(0.65 + seed2 * 0.1), 0.7, 0.2)) * bgM * bgVis * smoothstep(0.3, 0.7, h);
    }

    // ---- FRAME FEEDBACK ----
    float lum = dot(fracCol, vec3(0.3, 0.6, 0.1));
    vec2 refr = vec2(dFdx(lum), dFdy(lum)) * REFRACT_STR;
    vec3 prev = getLastFrameColor(uv + refr).rgb;
    // Decay feedback — keep chromadepth hue structure intact
    vec3 prevHSL = rgb2hsl(max(prev, vec3(0.001)));
    prevHSL.z *= 1.0 - 0.005 * MOTION; // gentle brightness decay
    prevHSL.y *= 0.998; // very slight desat
    prev = hsl2rgb(prevHSL);

    // ---- INFINITY ZOOM ON DROPS ----
    float infStr = INFINITY_ZOOM;
    if (infStr > 0.01) {
        float zf = mix(1.0, 2.5, infStr);
        float ia = bassZScore * 0.2;
        vec2 mirrorUV = uv - 0.5;
        mirrorUV = mat2(cos(ia), -sin(ia), sin(ia), cos(ia)) * mirrorUV;
        mirrorUV = mirrorUV * zf + 0.5;
        mirrorUV = fract(mirrorUV);
        vec3 mirrorCol = getLastFrameColor(mirrorUV).rgb;
        prev = mix(prev, mirrorCol, infStr * 0.2);
    }

    // ---- COMPOSITE ----
    vec3 interior = mix(prev, fracCol, 1.0 - FB_BLEND);
    vec3 exterior = mix(prev * 0.15, fracCol * 0.06, 0.4);
    vec3 col = mix(exterior, interior, visMask);
    col += min(edgeLight, vec3(0.4)) + min(tendrilCol, vec3(0.3)) + bgCol;

    // Beat flash — shift toward red for chromadepth "pop forward"
    if (beat) {
        vec3 bHSL = rgb2hsl(max(col, vec3(0.001)));
        bHSL.x = fract(bHSL.x - 0.05); // nudge toward red
        bHSL.z = min(bHSL.z * 1.1, 0.6);
        col = hsl2rgb(bHSL);
    }

    // Drop contrast boost
    col = mix(col, pow(max(col, vec3(0.0)), vec3(1.15)), IS_DROPPING * 0.08);

    // ---- VIGNETTE + FINAL ----
    float vign = 1.0 - pow(length(uv - 0.5) * 0.85, 2.5);
    col *= max(vign, 0.01);

    // Clamp to chromadepth-safe range
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
