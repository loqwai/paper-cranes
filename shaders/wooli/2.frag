// @fullscreen: true
// @favorite: true
// @tags: wooli, mammoth, fractal, tapestry, oscilloscope
// @image: images/wooli.png
//
// PRESETS:
// Default — mammoth with scrolling tapestry line
// https://visuals.beadfamous.com/?shader=wooli/2&image=images/wooli.png

#define PI 3.14159265
#define PHI 1.61803398
#define SQRT2 1.41421356
#define IMG_ASPECT (900.0 / 725.0)

// ============================================================================
// AUDIO PARAMETERS
// ============================================================================

#define MOTION smoothstep(0.12, 0.5, energyNormalized)

// Julia set — seed picks fractal family
#define J_REAL (-0.745 + sin(seed * PI * 2.0) * 0.13 + bassNormalized * 0.01 * MOTION + sin(iTime * 0.011 * PHI) * 0.018 * MOTION)
#define J_IMAG (0.186 + cos(seed * PI * 2.0) * 0.11 + spectralCentroidNormalized * 0.006 * MOTION + cos(iTime * 0.008 * SQRT2) * 0.012 * MOTION)

#define ZOOM_LVL (1.4 + seed3 * 0.8 + sin(iTime * 0.004 * PHI + seed3 * PI * 2.0) * 0.2 * MOTION + energyNormalized * 0.15)
#define ROT_ANGLE (seed3 * PI * 2.0 + iTime * 0.008 * MOTION + spectralFluxNormalized * 0.03)
#define DRIFT vec2(sin(iTime * 0.005 * PHI + seed3 * PI * 2.0) * 0.2 * MOTION, cos(iTime * 0.004 * SQRT2 + seed3 * 4.7) * 0.15 * MOTION)

// Edge glow
#define GLOW_BASE (0.6 + bassNormalized * 0.8)
#define GLOW_PULSE (1.0 + bassSlope * bassRSquared * 0.6)

// Color — linear regression for smooth evolution
#define HUE_SHIFT (spectralCentroidSlope * spectralCentroidRSquared * 0.4 + iTime * 0.005 * MOTION)
#define SAT_BOOST (1.0 + energySlope * energyRSquared * 0.3)

// Feedback
#define FB_BLEND (0.82 - energyNormalized * 0.15 - spectralFluxNormalized * 0.05)
#define REFRACT_STR ((0.005 + spectralRoughnessNormalized * 0.015) * MOTION)

// Mammoth scale — punches outward on bass
#define MAMMOTH_SCALE (1.4 - bassNormalized * 0.3 - clamp(energyZScore, 0.0, 1.0) * 0.15)

// ============================================================================
// LINE PARAMETERS — spectralCentroid drives Y, roughness drives width
// ============================================================================

// Y position: spectralCentroid tracks pitch center — smooth, musical movement
#define LINE_Y (0.5 + spectralCentroidZScore * 0.25)
// Width: roughness (dissonance) thickens the line
#define LINE_WIDTH (1.0 + spectralRoughnessNormalized * 5.0 + abs(spectralCentroidZScore) * 1.5)
// Glow radius: energy median (sustained loudness = wider glow)
#define LINE_GLOW_R (3.0 + energyMedian * 12.0)
// Color shift: use slope*rSquared for gradual hue drift
#define LINE_HUE_DRIFT (spectralCentroidSlope * spectralCentroidRSquared * 0.3)

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

// Static mask (no bass scaling) for stable scroll boundary
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
// ICY COLOR PALETTE (oklch)
// ============================================================================

vec3 icyColor(float tO, float tX, float tY, float tC, float iter) {
    tO = sqrt(tO); tX = sqrt(tX); tY = sqrt(tY);
    float baseHue = 3.4 + seed2 * 2.1;
    vec3 deep   = oklch2rgb(vec3(0.15 + seed * 0.05, 0.06 + seed * 0.03, baseHue + 0.2));
    vec3 mid    = oklch2rgb(vec3(0.45 + seed * 0.08, 0.12 + seed * 0.04, baseHue));
    vec3 bright = oklch2rgb(vec3(0.60 + seed * 0.06, 0.18 + seed * 0.03, baseHue - 0.2));
    vec3 ice    = oklch2rgb(vec3(0.78 + seed * 0.05, 0.06 + seed * 0.03, baseHue + seed * 0.2));
    vec3 accent = oklch2rgb(vec3(0.50 + seed * 0.08, 0.20 + seed * 0.04, baseHue + 0.8 + seed * 1.0));

    vec3 col = deep;
    col = oklabmix(col, mid,    smoothstep(0.0, 0.5, tX));
    col = oklabmix(col, bright, smoothstep(0.0, 0.35, tY));
    col = oklabmix(col, ice,    smoothstep(0.0, 0.18, tC));
    col = oklabmix(col, accent, smoothstep(0.0, 0.2, tO) * 0.3);

    vec3 lch = rgb2oklch(max(col, vec3(0.001)));
    lch.z += HUE_SHIFT * PI * 2.0;
    lch.y = min(lch.y * SAT_BOOST, 0.32);
    return oklch2rgb(lch);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;
    float aspect = res.x / res.y;

    // ---- MAMMOTH MASK + EDGE GLOW ----
    float mask = getMask(uv);
    float staticMask = getStaticMask(uv);
    float glowWidth = 0.02 + bassNormalized * 0.04;
    float edgeGlow = getEdgeGlow(uv, mask, glowWidth);

    // ---- SCROLLING LINE (exterior only) ----
    float px = floor(fragCoord.x);
    float last = floor(res.x) - 1.0;
    vec3 lineLayer = vec3(0.0);

    // Seed-matched line color
    float baseHue = 3.4 + seed2 * 2.1;

    if (staticMask < 0.3) {
        // Outside mammoth: scrolling tapestry line
        if (px < last) {
            // Scroll: read from 1px to the right in previous frame
            vec2 scrollUV = vec2((fragCoord.x + 1.0) / res.x, uv.y);
            float srcMask = getStaticMask(scrollUV);
            if (srcMask < 0.3) {
                lineLayer = getLastFrameColor(scrollUV).rgb;
                // Trail decay (gentle — must survive ~1000 scroll steps)
                lineLayer *= 0.9988;
                // Hue aging in oklch
                vec3 trailLCH = rgb2oklch(max(lineLayer, 0.001));
                trailLCH.z += 0.004;
                trailLCH.y *= 0.999;
                lineLayer = oklch2rgb(trailLCH);
            }
        } else {
            // Rightmost column: draw new line data
            float lineY = LINE_Y;
            float dist = abs(uv.y - lineY) * res.y; // distance in pixels
            float lw = LINE_WIDTH;

            // Stipple for organic texture
            float stip = hash21(fragCoord + float(iFrame) * 0.1);

            // Core line
            float edgeNoise = (stip - 0.5) * 0.8;
            float line = smoothstep(lw + 1.0 + edgeNoise, max(lw - 0.5, 0.0), dist);

            // Glow
            float glowR = LINE_GLOW_R;
            float rawGlow = smoothstep(glowR * lw, lw * 0.5, dist);
            float glowParticle = step(1.0 - rawGlow * rawGlow, stip);
            float glow = glowParticle * rawGlow * (0.04 + energyMedian * 0.18);

            // Line color: chromadepth-style from the seeded palette
            float hueOffset = LINE_HUE_DRIFT;
            vec3 lineCol = oklch2rgb(vec3(0.68, 0.18, baseHue + hueOffset));
            vec3 glowCol = oklch2rgb(vec3(0.58, 0.14, baseHue + hueOffset + 0.15));

            lineLayer = lineCol * line + glowCol * glow;

            // Beat brightens new data
            if (beat) lineLayer *= 1.15;
        }
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
    vec3 fracCol = icyColor(tO, tX, tY, tC, sIter);

    // ---- FRACTAL FEEDBACK (interior only) ----
    float lum = dot(fracCol, vec3(0.3, 0.6, 0.1));
    vec2 refr = vec2(dFdx(lum), dFdy(lum)) * REFRACT_STR;
    vec3 prev = getLastFrameColor(uv + refr).rgb;
    vec3 plch = rgb2oklch(max(prev, vec3(0.001)));
    float targetHue = baseHue;
    plch.z = mix(plch.z, targetHue, 0.003 + MOTION * 0.007);
    plch.x *= 1.0 - 0.005 * MOTION;
    prev = oklch2rgb(plch);

    vec3 interior = mix(prev, fracCol, 1.0 - FB_BLEND);

    // ---- EDGE GLOW COLOR ----
    vec3 edgeCol = oklch2rgb(vec3(0.70, 0.18, baseHue - 0.1));
    float mt = iTime * MOTION;
    float wave = sin(uv.x * 8.0 + uv.y * 6.0 - mt * 1.5) * 0.5 + 0.5;
    vec3 edgeLight = edgeCol * edgeGlow * GLOW_BASE * GLOW_PULSE * mix(0.7, 1.0, wave);

    // ---- VIGNETTE (interior only — exterior scrolls, so vignette would compound) ----
    float vign = 1.0 - pow(length(uv - 0.5) * 0.85, 2.5);
    interior *= max(vign, 0.01);

    // ---- COMPOSITE ----
    float visMask = smoothstep(0.1, 0.5, mask);
    vec3 col = mix(lineLayer, interior, visMask);
    // Edge glow only at the boundary transition — NOT on scrollable exterior
    col += min(edgeLight, vec3(0.4)) * smoothstep(0.0, 0.3, mask);

    // Oklch clamp (idempotent — safe for scrolling)
    vec3 flch = rgb2oklch(max(col, vec3(0.001)));
    flch.y = clamp(flch.y, 0.02, 0.28);
    flch.x = clamp(flch.x, 0.0, 0.72);
    col = oklch2rgb(flch);

    fragColor = vec4(col, 1.0);
}
