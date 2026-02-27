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

// Julia set shape — bass morphs the fractal
#define J_REAL (-0.745 + bassZScore * 0.05 + sin(iTime * 0.011 * PHI) * 0.04)
#define J_IMAG (0.186 + spectralCentroidZScore * 0.03 + cos(iTime * 0.008 * SQRT2) * 0.03)
// #define J_REAL -0.745
// #define J_IMAG 0.186

// Zoom — slowly oscillates + energy pushes in
#define ZOOM_LVL (1.5 + sin(iTime * 0.004 * PHI) * 0.5 + sin(iTime * 0.003 * SQRT2) * 0.3 + energyNormalized * 0.4)
// #define ZOOM_LVL 2.0

// Rotation
#define ROT_ANGLE (iTime * 0.012 + spectralFluxZScore * 0.06)
// #define ROT_ANGLE 0.0

// Drift through fractal space
#define DRIFT vec2(sin(iTime * 0.007 * PHI) * 0.25, cos(iTime * 0.006 * SQRT2) * 0.2)

// Edge glow
#define GLOW_BASE (0.6 + bassNormalized * 0.8)
#define GLOW_PULSE (1.0 + bassZScore * 0.4)
// #define GLOW_BASE 0.8
// #define GLOW_PULSE 1.0

// Color
#define HUE_SHIFT (pitchClassNormalized * 0.12 + iTime * 0.005)
#define SAT_BOOST (1.0 + energyZScore * 0.2)
// #define HUE_SHIFT 0.0
// #define SAT_BOOST 1.0

// Feedback — lower = more new fractal, higher = more trails
#define FB_BLEND (0.72 - spectralFluxNormalized * 0.12)
#define REFRACT_STR (0.015 + spectralRoughnessNormalized * 0.015)

// Infinity zoom on drops
#define INFINITY_ZOOM smoothstep(0.0, 0.6, energyZScore)
// #define INFINITY_ZOOM 0.0

// Build/drop
#define BUILD_DROP (energySlope * energyRSquared * 6.0)
#define IS_DROPPING clamp(-BUILD_DROP, 0.0, 1.0)

// ============================================================================
// MAMMOTH MASK from image texture
// ============================================================================

float getMask(vec2 uv) {
    float screenAspect = iResolution.x / iResolution.y;
    vec2 c = uv - 0.5;
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

    vec3 deep   = vec3(0.03, 0.08, 0.18);
    vec3 blue   = vec3(0.08, 0.35, 0.65);
    vec3 cyan   = vec3(0.0,  0.85, 1.0);
    vec3 ice    = vec3(0.88, 0.96, 1.0);
    vec3 purple = vec3(0.4, 0.1, 0.75);

    vec3 col = deep;
    col = mix(col, blue,   smoothstep(0.0, 0.5, tX));
    col = mix(col, cyan,   smoothstep(0.0, 0.35, tY));
    col = mix(col, ice,    smoothstep(0.0, 0.18, tC));
    col = mix(col, purple, smoothstep(0.0, 0.2, tO) * 0.3);

    // Shimmer from iteration count
    float shimmer = sin(iter * 0.3 + iTime * 0.5) * 0.5 + 0.5;
    col = mix(col, cyan, shimmer * 0.12);

    // Hue shift + saturation boost
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

    // ---- EDGE GLOW COLOR ----
    vec3 glowCol = vec3(0.0, 0.88, 1.0);
    float wave = sin(uv.x * 25.0 + uv.y * 18.0 - iTime * 2.5) * 0.5 + 0.5;
    wave *= sin(uv.y * 12.0 - iTime * 1.8 * PHI) * 0.5 + 0.5;
    vec3 edgeLight = glowCol * edgeGlow * GLOW_BASE * GLOW_PULSE * mix(0.6, 1.3, wave);

    // ---- FRAME FEEDBACK ----
    float lum = dot(fracCol, vec3(0.3, 0.6, 0.1));
    vec2 refr = vec2(dFdx(lum), dFdy(lum)) * REFRACT_STR;
    vec3 prev = getLastFrameColor(uv + refr).rgb;
    // Age feedback toward icy blue
    vec3 ph = rgb2hsl(max(prev, vec3(0.001)));
    ph.x = mix(ph.x, 0.56, 0.01);
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
    // Subtle fractal bleed in background + dim feedback trails
    vec3 exterior = mix(prev * 0.15, fracCol * 0.06, 0.4);
    vec3 col = mix(exterior, interior, visMask);
    col += edgeLight;

    // Beat flash
    if (beat) col *= 1.15;
    // Drop contrast boost
    col = mix(col, pow(max(col, vec3(0.0)), vec3(1.35)), IS_DROPPING * 0.25);

    // ---- VIGNETTE + FINAL ----
    float vign = 1.0 - pow(length(uv - 0.5) * 0.85, 2.5);
    col *= max(vign, 0.01);

    vec3 fh = rgb2hsl(max(col, vec3(0.001)));
    fh.y = clamp(fh.y, 0.15, 0.95);
    fh.z = clamp(fh.z, 0.0, 0.88);
    col = hsl2rgb(fh);

    fragColor = vec4(col, 1.0);
}
