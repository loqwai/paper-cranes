// @fullscreen: true
// @favorite: true
// @tags: wooli, mammoth, fractal, tapestry, oscilloscope, chromadepth, 3d
// @image: images/wooli.png
//
// ChromaDepth version of wooli/2 — mammoth with scrolling tapestry line
// Red = foreground (closest), Green = middle, Blue/Violet = farthest
// Designed for ChromaDepth 3D glasses
//
// PRESETS:
// Default — chromadepth mammoth with scrolling line
// https://visuals.beadfamous.com/?shader=wooli/chromadepth-2&image=images/wooli.png

#define PI 3.14159265
#define PHI 1.61803398
#define SQRT2 1.41421356
#define IMG_ASPECT (900.0 / 725.0)

// ============================================================================
// AUDIO PARAMETERS
// ============================================================================

#define MOTION smoothstep(0.12, 0.5, energyNormalized)

// Julia set — seed picks fractal family
#define J_REAL (-0.745 + sin(seed * PI * 2.0) * 0.13 + sin(iTime * 0.04 * PHI) * 0.015 + bassZScore * 0.015)
#define J_IMAG (0.186 + cos(seed * PI * 2.0) * 0.11 + cos(iTime * 0.03 * SQRT2) * 0.01 + spectralCentroidZScore * 0.01)

// Zoom / rotation / drift
#define ZOOM_LVL (0.7 + seed3 * 0.3 + sin(iTime * 0.015 * PHI + seed3 * PI * 2.0) * 0.15 + energyNormalized * 0.15)
#define ROT_ANGLE (seed3 * PI * 2.0 + iTime * 0.012 + spectralFluxNormalized * 0.08)
#define DRIFT vec2(sin(iTime * 0.02 * PHI + seed3 * PI * 2.0) * 0.1 + trebleZScore * 0.04, cos(iTime * 0.015 * SQRT2 + seed3 * 4.7) * 0.08 + midsZScore * 0.03)

// Edge glow
#define GLOW_BASE (0.6 + bassNormalized * 0.8)
#define GLOW_PULSE (1.0 + bassSlope * bassRSquared * 0.6)

// Depth color modulation
#define DEPTH_HUE_SHIFT (spectralCentroidSlope * spectralCentroidRSquared * 0.08 + iTime * 0.003 * MOTION)
#define DEPTH_SAT_BOOST (1.0 + energySlope * energyRSquared * 0.1)

// Feedback
#define FB_BLEND (0.82 - energyNormalized * 0.15 - spectralFluxNormalized * 0.05)
#define REFRACT_STR ((0.005 + spectralRoughnessNormalized * 0.015) * MOTION)

// Mammoth scale
#define MAMMOTH_SCALE (1.4 - bassNormalized * 0.3 - clamp(energyZScore, 0.0, 1.0) * 0.15)

// ============================================================================
// LINE PARAMETERS — spectralCentroid drives Y, roughness drives width
// ============================================================================

#define LINE_Y (0.5 + spectralCentroidZScore * 0.25)
#define LINE_WIDTH (1.0 + spectralRoughnessNormalized * 5.0 + abs(spectralCentroidZScore) * 1.5)
#define LINE_GLOW_R (3.0 + energyMedian * 12.0)
#define LINE_HUE_DRIFT (spectralCentroidSlope * spectralCentroidRSquared * 0.3)

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================

vec3 chromadepthColor(float t, float sat, float lit) {
    t = clamp(t, 0.0, 1.0);
    float hue = fract(t * 0.75 + seed2 * 0.15 + DEPTH_HUE_SHIFT);
    sat = clamp(sat * DEPTH_SAT_BOOST, 0.0, 1.0);
    return hsl2rgb(vec3(hue, sat, lit));
}

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

vec3 fractalChromadepth(float tO, float tX, float tY, float tC, float iter, bool escaped) {
    tO = sqrt(tO); tX = sqrt(tX); tY = sqrt(tY);

    float depth;
    float brightness;

    if (!escaped) {
        // INTERIOR — red/warm (chromadepth "near")
        float trapDetail = min(tX, tY);
        float trapBlend = mix(tO, trapDetail, 0.5 + seed * 0.3);
        trapBlend = mix(trapBlend, tC, 0.2 + seed * 0.15);

        depth = clamp(trapBlend * (0.35 + seed * 0.1), 0.0, 0.35);
        brightness = 0.45 + tO * 0.15 + trapDetail * 0.15;
    } else {
        // EXTERIOR — cool tones (chromadepth "far")
        float escapeFrac = clamp(iter / 80.0, 0.0, 1.0);
        depth = mix(0.85, 0.4, pow(escapeFrac, 0.5 + seed * 0.3));
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

    if (staticMask < 0.3) {
        if (px < last) {
            // Scroll: read from 1px to the right in previous frame
            vec2 scrollUV = vec2((fragCoord.x + 1.0) / res.x, uv.y);
            float srcMask = getStaticMask(scrollUV);
            if (srcMask < 0.3) {
                lineLayer = getLastFrameColor(scrollUV).rgb;
                // Trail decay
                lineLayer *= 0.9988;
                // Hue aging — shift toward blue/far in chromadepth
                vec3 trailHSL = rgb2hsl(max(lineLayer, 0.001));
                trailHSL.x = fract(trailHSL.x + 0.002); // age toward blue
                trailHSL.y *= 0.999;
                lineLayer = hsl2rgb(trailHSL);
            }
        } else {
            // Rightmost column: draw new line data
            float lineY = LINE_Y;
            float dist = abs(uv.y - lineY) * res.y;
            float lw = LINE_WIDTH;

            // Stipple
            float stip = hash21(fragCoord + float(iFrame) * 0.1);

            // Core line
            float edgeNoise = (stip - 0.5) * 0.8;
            float line = smoothstep(lw + 1.0 + edgeNoise, max(lw - 0.5, 0.0), dist);

            // Glow
            float glowR = LINE_GLOW_R;
            float rawGlow = smoothstep(glowR * lw, lw * 0.5, dist);
            float glowParticle = step(1.0 - rawGlow * rawGlow, stip);
            float glow = glowParticle * rawGlow * (0.04 + energyMedian * 0.18);

            // Line color: chromadepth red/orange = pops forward
            // seed2 shifts the starting hue within the warm range
            float lineHue = fract(0.05 + seed2 * 0.08 + LINE_HUE_DRIFT * 0.1);
            float glowHue = fract(lineHue + 0.08);
            vec3 lineCol = hsl2rgb(vec3(lineHue, 0.95, 0.52));
            vec3 glowCol = hsl2rgb(vec3(glowHue, 0.85, 0.42));

            lineLayer = lineCol * line + glowCol * glow;

            // Beat brightens
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
    bool escaped = (sIter < 80.0);
    vec3 fracCol = fractalChromadepth(tO, tX, tY, tC, sIter, escaped);

    // ---- FRACTAL FEEDBACK (interior only) ----
    float lum = dot(fracCol, vec3(0.3, 0.6, 0.1));
    vec2 refr = vec2(dFdx(lum), dFdy(lum)) * REFRACT_STR;
    vec3 prev = getLastFrameColor(uv + refr).rgb;
    // Decay in HSL — preserve chromadepth hue structure
    vec3 prevHSL = rgb2hsl(max(prev, vec3(0.001)));
    prevHSL.z *= 1.0 - 0.005 * MOTION;
    prevHSL.y *= 0.998;
    prev = hsl2rgb(prevHSL);

    vec3 interior = mix(prev, fracCol, 1.0 - FB_BLEND);

    // ---- EDGE GLOW COLOR ---- red/orange for chromadepth pop
    float edgeHue = fract(0.05 + seed2 * 0.08);
    vec3 edgeCol = hsl2rgb(vec3(edgeHue, 0.95, 0.5));
    float mt = iTime * MOTION;
    float wave = sin(uv.x * 8.0 + uv.y * 6.0 - mt * 1.5) * 0.5 + 0.5;
    vec3 edgeLight = edgeCol * edgeGlow * GLOW_BASE * GLOW_PULSE * mix(0.7, 1.0, wave);

    // ---- VIGNETTE (interior only) ----
    float vign = 1.0 - pow(length(uv - 0.5) * 0.85, 2.5);
    interior *= max(vign, 0.01);

    // ---- COMPOSITE ----
    float visMask = smoothstep(0.1, 0.5, mask);
    vec3 col = mix(lineLayer, interior, visMask);
    col += min(edgeLight, vec3(0.4)) * smoothstep(0.0, 0.3, mask);

    // Beat — shift toward red for chromadepth pop
    if (beat) {
        vec3 bHSL = rgb2hsl(max(col, vec3(0.001)));
        bHSL.x = fract(bHSL.x - 0.05);
        bHSL.z = min(bHSL.z * 1.08, 0.6);
        col = hsl2rgb(bHSL);
    }

    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
