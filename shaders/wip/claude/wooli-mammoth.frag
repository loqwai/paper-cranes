// @fullscreen: true
// @favorite: true
// @tags: wooli, mammoth, fractal, dubstep, ice
// Usage: ?shader=wip/claude/wooli-mammoth&image=images/wooli.png

#define PI 3.14159265
#define PHI 1.61803398
#define SQRT2 1.41421356
#define IMG_ASPECT (900.0 / 725.0)

// ============================================================================
// AUDIO PARAMETERS (#define swap pattern)
// ============================================================================

// Julia set shape — seed picks a unique fractal family; bass morphs it live
// sin/cos of seed traces a circle around the Douady rabbit region
#define J_REAL (-0.745 + sin(seed * PI * 2.0) * 0.06 + bassZScore * 0.05 + sin(iTime * 0.011 * PHI) * 0.04)
#define J_IMAG (0.186 + cos(seed * PI * 2.0) * 0.05 + spectralCentroidZScore * 0.03 + cos(iTime * 0.008 * SQRT2) * 0.03)
// #define J_REAL -0.745
// #define J_IMAG 0.186

// Zoom — seed3 offsets the oscillation phase so each device zooms out of sync
#define ZOOM_LVL (1.5 + sin(iTime * 0.004 * PHI + seed3 * PI * 2.0) * 0.5 + sin(iTime * 0.003 * SQRT2 + seed3 * 4.0) * 0.3 + energyNormalized * 0.4)
// #define ZOOM_LVL 2.0

// Rotation — seed3 gives each device a different starting angle
#define ROT_ANGLE (seed3 * PI * 2.0 + iTime * 0.012 + spectralFluxZScore * 0.06)
// #define ROT_ANGLE 0.0

// Drift — seed3 offsets the Lissajous path so each device explores different regions
#define DRIFT vec2(sin(iTime * 0.007 * PHI + seed3 * PI * 2.0) * 0.25, cos(iTime * 0.006 * SQRT2 + seed3 * 4.7) * 0.2)

// Edge glow
#define GLOW_BASE (0.6 + bassNormalized * 0.8)
#define GLOW_PULSE (1.0 + bassZScore * 0.2)
// #define GLOW_BASE 0.8
// #define GLOW_PULSE 1.0

// Color — seed2 drives the palette directly now; audio + time still modulate live
#define HUE_SHIFT (pitchClassNormalized * 0.12 + iTime * 0.005)
#define SAT_BOOST (1.0 + energyZScore * 0.2)
// #define HUE_SHIFT 0.0
// #define SAT_BOOST 1.0

// Feedback — higher = more trails = smoother. Flux only nudges it slightly.
#define FB_BLEND (0.78 - spectralFluxNormalized * 0.08)
#define REFRACT_STR (0.015 + spectralRoughnessNormalized * 0.015)

// Infinity zoom on drops — smoothstep with higher threshold so it only triggers on big drops
#define INFINITY_ZOOM smoothstep(0.2, 0.8, energyZScore)
// #define INFINITY_ZOOM 0.0

// Build/drop
#define BUILD_DROP (energySlope * energyRSquared * 6.0)
#define IS_DROPPING clamp(-BUILD_DROP, 0.0, 1.0)

// Mammoth scale — base 1.25 keeps it off edges; grows on bass/energy transients
#define MAMMOTH_SCALE (1.25 - bassNormalized * 0.06 - clamp(energyZScore, 0.0, 1.0) * 0.05)
// #define MAMMOTH_SCALE 1.25

// Fractal tendrils from mammoth edges during intense music
#define TENDRIL_REACH (0.05 + bassNormalized * 0.1)
#define TENDRIL_INTENSITY smoothstep(0.25, 0.7, energyNormalized)
// #define TENDRIL_REACH 0.08
// #define TENDRIL_INTENSITY 0.5

// Background mammoth replication — only appears when music is really going off
#define BG_VIS (smoothstep(0.55, 0.85, spectralEntropyNormalized) * smoothstep(0.5, 0.8, energyNormalized) * 0.2)
#define BG_TILES (3.0 + floor(energyNormalized * 2.0))
// #define BG_VIS 0.15
// #define BG_TILES 4.0

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
// EDGE GLOW — sample neighbors for wider glow region
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
// FRACTAL TENDRILS — Kleinian fold iteration creates branching filaments
// ============================================================================

float tendrilFractal(vec2 p) {
    vec2 z = p;
    float v = 0.0;
    float t = iTime * 0.15;
    // seed4 shifts the fold constant — different tendril branching per device
    vec2 c = vec2(1.2 + sin(t + seed4 * PI * 2.0) * 0.15, 0.9 + cos(t * PHI + seed4 * 4.0) * 0.1);
    for (int i = 0; i < 6; i++) {
        z = abs(z) / max(dot(z, z), 0.001) - c;
        v += exp(-abs(z.x) * 4.0);
        v += exp(-abs(z.y) * 4.0) * 0.5;
    }
    return v / 9.0;
}

// ============================================================================
// JULIA SET with orbit traps (single pass)
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
// ICY COLOR PALETTE from orbit traps
// ============================================================================

vec3 icyColor(float tO, float tX, float tY, float tC, float iter) {
    tO = sqrt(tO); tX = sqrt(tX); tY = sqrt(tY);

    // seed2 picks a base hue in the cool range: cyan(0.5)→blue(0.67)→purple(0.83)
    // seed adds variety to the accent color
    float baseHue = 0.5 + seed2 * 0.33;
    vec3 deep   = hsl2rgb(vec3(fract(baseHue + 0.05), 0.6,  0.10));
    vec3 mid    = hsl2rgb(vec3(fract(baseHue),         0.75, 0.35));
    vec3 bright = hsl2rgb(vec3(fract(baseHue - 0.05),  0.95, 0.50));
    vec3 ice    = hsl2rgb(vec3(fract(baseHue),         0.25, 0.93));
    vec3 accent = hsl2rgb(vec3(fract(baseHue + 0.15 + seed * 0.15), 0.85, 0.40));

    vec3 col = deep;
    col = mix(col, mid,    smoothstep(0.0, 0.5, tX));
    col = mix(col, bright, smoothstep(0.0, 0.35, tY));
    col = mix(col, ice,    smoothstep(0.0, 0.18, tC));
    col = mix(col, accent, smoothstep(0.0, 0.2, tO) * 0.3);

    // Shimmer from iteration count
    float shimmer = sin(iter * 0.3 + iTime * 0.5) * 0.5 + 0.5;
    col = mix(col, bright, shimmer * 0.12);

    // Live hue modulation + saturation boost
    vec3 hsl = rgb2hsl(max(col, vec3(0.001)));
    hsl.x = fract(hsl.x + HUE_SHIFT);
    hsl.y = min(hsl.y * SAT_BOOST, 1.0);
    return hsl2rgb(hsl);
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

    // Bleed: on bass, fractal leaks outside via expanded mask
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
    vec3 fracCol = icyColor(tO, tX, tY, tC, sIter);

    // ---- EDGE GLOW COLOR ---- matches seeded palette
    float baseHue = 0.5 + seed2 * 0.33;
    vec3 glowCol = hsl2rgb(vec3(fract(baseHue - 0.03), 0.95, 0.6));
    float wave = sin(uv.x * 25.0 + uv.y * 18.0 - iTime * 2.5) * 0.5 + 0.5;
    wave *= sin(uv.y * 12.0 - iTime * 1.8 * PHI) * 0.5 + 0.5;
    vec3 edgeLight = glowCol * edgeGlow * GLOW_BASE * GLOW_PULSE * mix(0.6, 1.3, wave);

    // ---- FRACTAL TENDRILS ----
    vec2 tp = p * 0.7 + vec2(sin(iTime * 0.05), cos(iTime * 0.04));
    float tFrac = tendrilFractal(tp);
    vec3 tendrilCol = vec3(0.0, 0.92, 1.0) * tendrilEdge * tFrac * TENDRIL_INTENSITY;
    tendrilCol += vec3(0.3, 0.05, 0.65) * tendrilEdge * tFrac * TENDRIL_INTENSITY * 0.3;

    // ---- BACKGROUND MAMMOTHS ----
    vec3 bgCol = vec3(0.0);
    float bgVis = BG_VIS;
    if (bgVis > 0.01) {
        float ba = seed4 * PI * 2.0 + iTime * 0.025;
        vec2 bgUV = uv - 0.5;
        bgUV = mat2(cos(ba), -sin(ba), sin(ba), cos(ba)) * bgUV;
        bgUV *= 1.0 + sin(iTime * 0.08) * 0.15;
        bgUV += 0.5;
        float count = BG_TILES;
        vec2 cell = floor(bgUV * count);
        vec2 tiled = fract(bgUV * count);
        float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
        float bgM = (1.0 - getInitialFrameColor(tiled).r) * step(0.3, h) * (1.0 - mask);
        bgCol = vec3(0.04, 0.22, 0.38) * bgM * bgVis * smoothstep(0.3, 0.7, h);
    }

    // ---- FRAME FEEDBACK ----
    float lum = dot(fracCol, vec3(0.3, 0.6, 0.1));
    vec2 refr = vec2(dFdx(lum), dFdy(lum)) * REFRACT_STR;
    vec3 prev = getLastFrameColor(uv + refr).rgb;
    // Age feedback toward seeded palette hue
    vec3 ph = rgb2hsl(max(prev, vec3(0.001)));
    ph.x = mix(ph.x, fract(0.5 + seed2 * 0.33), 0.01);
    ph.z *= 0.985;
    prev = hsl2rgb(ph);

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
        prev = mix(prev, mirrorCol, infStr * 0.35);
    }

    // ---- COMPOSITE ----
    vec3 interior = mix(prev, fracCol, 1.0 - FB_BLEND);
    vec3 exterior = mix(prev * 0.15, fracCol * 0.06, 0.4);
    vec3 col = mix(exterior, interior, visMask);
    col += edgeLight + tendrilCol + bgCol;

    // Beat flash (subtle)
    if (beat) col *= 1.05;
    // Drop contrast boost
    col = mix(col, pow(max(col, vec3(0.0)), vec3(1.2)), IS_DROPPING * 0.15);

    // ---- VIGNETTE + FINAL ----
    float vign = 1.0 - pow(length(uv - 0.5) * 0.85, 2.5);
    col *= max(vign, 0.01);

    vec3 fh = rgb2hsl(max(col, vec3(0.001)));
    fh.y = clamp(fh.y, 0.15, 0.95);
    fh.z = clamp(fh.z, 0.0, 0.88);
    col = hsl2rgb(fh);

    fragColor = vec4(col, 1.0);
}
