// @fullscreen: true
// @favorite: true
// @tags: wooli, mammoth, fractal, tapestry, oscilloscope
//
// Oklab palette version of wooli/2 — mammoth with scrolling tapestry line
// seed/seed2/seed3/seed4 generate unique color palettes per device
//
// PRESETS:
// Default — mammoth with scrolling line
// https://visuals.beadfamous.com/?shader=wooli/3&image=images/wooli.png

#define PI 3.14159265
#define PHI 1.61803398
#define SQRT2 1.41421356
#define IMG_ASPECT (900.0 / 725.0)

// ============================================================================
// AUDIO PARAMETERS
// ============================================================================

#define MOTION animateEaseInCubic(smoothstep(0.05, 0.2, energyNormalized))

// Julia set — medians of independent features for continuous, smooth evolution
// Centroid (brightness) and entropy (complexity) shift gradually with musical character
#define J_REAL (-0.745 + sin(iTime * 0.04 * PHI) * 0.03)+((energyZScore)/50.)
// #define J_REAL 0.1
#define J_IMAG (0.186 + cos(iTime * 0.03 * SQRT2) * 0.025)

// Framing — seeds make each device unique via viewpoint, not fractal math
#define ZOOM_LVL (0.82 + seed3 * 0.1 + sin(iTime * 0.15 * PHI + seed3 * PI * 2.0) * 0.1 + energyMedian * 0.1)
#define ROT_ANGLE (seed * PI * 2.0 + iTime * (0.012 + seed4 * 0.008) + spectralFluxMedian * 0.08)
#define DRIFT vec2(sin(iTime * 0.02 * PHI + seed3 * PI * 2.0) * 0.08 + bassMedian * 0.03, cos(iTime * 0.015 * SQRT2 + seed3 * 4.7) * 0.06 + seed2 * 0.1 + midsMedian * 0.02)

// Edge glow — wide and bright for clear mammoth outline
#define GLOW_WIDTH (0.4 + bassZScore * 0.5)
#define GLOW_BASE (0.7 + bassNormalized * 0.5)
#define GLOW_PULSE (1.0 + bassSlope * bassRSquared * 1.2)

// Palette saturation
#define SAT_BOOST (1.0 + energyZScore * 0.1)

// Feedback — seed4 shifts base blend
#define FB_BLEND (0.01)
#define REFRACT_STR (0.08 * MOTION)

// Mammoth scale
#define MAMMOTH_SCALE (1.4 - bassNormalized * 0.2 - clamp(bassZScore, 0.0, 1.0) * 0.2 - clamp(energyZScore, 0.0, 1.0) * 0.15)

// Line glow intensity
#define LINE_GLOW_INT (0.04 + energyMedian * 0.18)

// ============================================================================
// LINE PARAMETERS — spectralCentroid drives Y, roughness drives width
// ============================================================================

#define LINE_Y (0.5 + spectralCentroidZScore * 0.25)
#define LINE_WIDTH (1.0 + spectralRoughnessNormalized * 5.0 + abs(spectralCentroidZScore) * 1.5)
#define LINE_GLOW_R (3.0 + energyMedian * 12.0)
#define LINE_HUE_DRIFT (spectralCentroidSlope * spectralCentroidRSquared * 0.3)

// ============================================================================
// SEED-DRIVEN OKLAB PALETTE
// ============================================================================
//
// Five anchors in Oklch, blended via orbit traps (same structure as wooli/2).
//   seed2 → base hue (full circle)
//   seed  → lightness character
//   seed3 → chroma intensity
//   seed4 → accent hue offset

float baseHue;

// ============================================================================
// MAMMOTH MASK
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

// Static mask for stable scroll boundary
float getStaticMask(vec2 uv) {
    float screenAspect = iResolution.x / iResolution.y;
    vec2 c = (uv - 0.5) * 1.4;
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
// HASH
// ============================================================================

float hash21(vec2 p) {
    p = fract(p * vec2(253.37, 471.53));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

// ============================================================================
// JULIA SET with orbit traps
// ============================================================================

void juliaSet(vec2 p, vec2 jc,
              out float trapO, out float trapX, out float trapY, out float trapC,
              out float sIter) {
    vec2 z = p;
    trapO = 1e10; trapX = 1e10; trapY = 1e10; trapC = 1e10;
    sIter = seed;
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
// FRACTAL COLOR — orbit traps blend palette anchors (like wooli/2)
// ============================================================================

vec3 fractalOklab(float tO, float tX, float tY, float tC, float iter) {
    tO = sqrt(tO); tX = sqrt(tX); tY = sqrt(tY);

    // Palette anchors — each trap blends in a different color
    vec3 deep   = oklch2rgb(vec3(0.18 + seed * 0.06, 0.06 + seed3 * 0.04, baseHue + 0.15));
    vec3 mid    = oklch2rgb(vec3(0.46 + seed * 0.08, 0.13 + seed3 * 0.05, baseHue));
    vec3 bright = oklch2rgb(vec3(0.62 + seed * 0.07, 0.18 + seed3 * 0.04, baseHue - 0.2));
    vec3 ice    = oklch2rgb(vec3(0.78 + seed * 0.05, 0.07 + seed3 * 0.04, baseHue + seed4 * 0.4));
    vec3 accent = oklch2rgb(vec3(0.52 + seed * 0.08, 0.20 + seed3 * 0.06, baseHue + 0.7 + seed4 * 1.2));

    // Each trap independently blends in its palette color
    vec3 col = deep;
    col = oklabmix(col, mid,    smoothstep(0.0, 0.5, tX));
    col = oklabmix(col, bright, smoothstep(0.0, 0.35, tY));
    col = oklabmix(col, ice,    smoothstep(0.0, 0.18, tC));
    col = oklabmix(col, accent, smoothstep(0.0, 0.2, tO) * 0.3);

    // Audio saturation boost
    vec3 lch = rgb2oklch(max(col, vec3(0.001)));
    lch.y = min(lch.y * SAT_BOOST, 0.30);
    return oklch2rgb(lch);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;
    float aspect = res.x / res.y;

    baseHue = seed2 * PI * 2.0;
    bool hasHistory = iFrame > 2;

    // ---- MAMMOTH MASK + EDGE GLOW ----
    float mask = getMask(uv);
    float staticMask = getStaticMask(uv);
    float glowWidth = GLOW_WIDTH;
    float edgeGlow = getEdgeGlow(uv, mask, glowWidth);

    // ---- SCROLLING LINE — bidirectional from edges toward mammoth ----
    float px = floor(fragCoord.x);
    float last = floor(res.x) - 1.0;
    float centerX = res.x * 0.5;
    vec3 lineLayer = vec3(0.0);
    bool leftSide = fragCoord.x < centerX;
    bool isNewDataCol = (leftSide && px <= 0.0) || (!leftSide && px >= last);

    if (!isNewDataCol && hasHistory) {
        float srcX = leftSide ? (fragCoord.x - 1.0) : (fragCoord.x + 1.0);
        vec2 scrollUV = vec2(srcX / res.x, uv.y);
        float srcMask = getStaticMask(scrollUV);
        if (srcMask < 0.3) {
            lineLayer = getLastFrameColor(scrollUV).rgb;
            lineLayer *= 0.994;
            vec3 trailLCH = rgb2oklch(max(lineLayer, 0.001));
            trailLCH.z += 0.004;
            trailLCH.y *= 0.999;
            lineLayer = oklch2rgb(trailLCH);
        }
    }

    if (isNewDataCol) {
        float lineY = LINE_Y;
        float dist = abs(uv.y - lineY) * res.y;
        float lw = LINE_WIDTH;

        float stip = hash21(fragCoord + float(iFrame) * 0.1);

        float edgeNoise = (stip - 0.5) * 0.8;
        float line = smoothstep(lw + 1.0 + edgeNoise, max(lw - 0.5, 0.0), dist);

        float glowR = LINE_GLOW_R;
        float rawGlow = smoothstep(glowR * lw, lw * 0.5, dist);
        float glowParticle = step(1.0 - rawGlow * rawGlow, stip);
        float glow = glowParticle * rawGlow * LINE_GLOW_INT;

        float hueOffset = LINE_HUE_DRIFT;
        vec3 lineCol = oklch2rgb(vec3(0.65, 0.16, baseHue + hueOffset));
        vec3 glowCol = oklch2rgb(vec3(0.50, 0.12, baseHue + hueOffset + 0.15));

        lineLayer = lineCol * line + glowCol * glow;

        if (beat) lineLayer *= 1.15;
    }

    // ---- FRACTAL (interior) ----
    vec2 p = (uv - 0.5) * 2.0;
    p.x *= aspect;
    p /= ZOOM_LVL;
    float r = ROT_ANGLE;
    p = mat2(cos(r), -sin(r), sin(r), cos(r)) * p;
    p += DRIFT;

    vec2 jc = vec2(J_REAL, J_IMAG);
    float tO, tX, tY, tC, sIter;
    juliaSet(p, jc, tO, tX, tY, tC, sIter);
    vec3 fracCol = fractalOklab(tO, tX, tY, tC, sIter);

    // ---- FRACTAL FEEDBACK (interior only) ----
    float lum = dot(fracCol, vec3(0.3, 0.6, 0.1));
    vec2 refr = vec2(dFdx(lum), dFdy(lum)) * REFRACT_STR;
    vec3 prev = hasHistory ? getLastFrameColor(uv + refr).rgb : fracCol;
    vec3 plch = rgb2oklch(max(prev, vec3(0.001)));
    plch.z = mix(plch.z, baseHue, 0.003 + MOTION * 0.007);
    plch.x *= 1.0 - 0.005 * MOTION;
    plch.x = min(plch.x, 0.70);
    prev = oklch2rgb(plch);

    vec3 interior = mix(prev, fracCol, 1.0 - FB_BLEND);

    // ---- EDGE GLOW COLOR — bright from palette for clear outline ----
    vec3 edgeCol = oklch2rgb(vec3(0.72, 0.14, baseHue + seed4 * 0.3));
    float mt = iTime * MOTION;
    float wave = sin(uv.x * (7.0 + seed4 * 3.0) + uv.y * (5.0 + seed4 * 3.0) - mt * 1.5) * 0.5 + 0.5;
    vec3 edgeLight = edgeCol * edgeGlow * GLOW_BASE * GLOW_PULSE * mix(0.7, 1.0, wave);

    // ---- VIGNETTE (interior only) ----
    float vign = 1.0 - pow(length(uv - 0.5) * 0.85, 2.5);
    interior *= max(vign, 0.01);

    // ---- COMPOSITE ----
    float visMask = smoothstep(0.1, 0.5, mask);
    vec3 col = mix(lineLayer, interior, visMask);
    col += min(edgeLight, vec3(0.6)) * smoothstep(0.0, 0.3, mask);

    // Beat — lightness pulse
    if (beat) {
        vec3 bLCH = rgb2oklch(max(col, vec3(0.001)));
        bLCH.x = min(bLCH.x * 1.05, 0.78);
        col = oklch2rgb(bLCH);
    }

    // Final oklch clamp — gamut safety without crushing the palette
    vec3 flch = rgb2oklch(max(col, vec3(0.001)));
    flch.y = clamp(flch.y, 0.02, 0.26);
    flch.x = clamp(flch.x, 0.0, 0.78);
    col = oklch2rgb(flch);

    fragColor = vec4(col, 1.0);
}
