// @fullscreen: true
// @mobile: true
// @tags: chromadepth, graph, regression, fractal, julia, oscilloscope
// ChromaDepth Regression Oscilloscope — Scrolling fractal-textured waveforms
// Each line plots a regression slope over time, textured with a Julia set.
// Line thickness = rSquared (confidence). Color = chromadepth from slope sign.
// The Julia set c-constant IS the (slope, rSquared) pair, so the fractal
// texture itself represents the regression data.

// ============================================================================
// FEATURE DEFINITIONS
// ============================================================================

#define F1_SLOPE   (energySlope)
#define F1_RSQUARED (energyRSquared)
#define F1_ZSCORE  (energyZScore)
#define F1_NORM    (energyNormalized)

#define F2_SLOPE   (bassSlope)
#define F2_RSQUARED (bassRSquared)
#define F2_ZSCORE  (bassZScore)
#define F2_NORM    (bassNormalized)

#define F3_SLOPE   (trebleSlope)
#define F3_RSQUARED (trebleRSquared)
#define F3_ZSCORE  (trebleZScore)
#define F3_NORM    (trebleNormalized)

#define F4_SLOPE   (spectralCentroidSlope)
#define F4_RSQUARED (spectralCentroidRSquared)
#define F4_ZSCORE  (spectralCentroidZScore)
#define F4_NORM    (spectralCentroidNormalized)

#define F5_SLOPE   (spectralFluxSlope)
#define F5_RSQUARED (spectralFluxRSquared)
#define F5_ZSCORE  (spectralFluxZScore)
#define F5_NORM    (spectralFluxNormalized)

#define F6_SLOPE   (spectralEntropySlope)
#define F6_RSQUARED (spectralEntropyRSquared)
#define F6_ZSCORE  (spectralEntropyZScore)
#define F6_NORM    (spectralEntropyNormalized)

// --- Global accents ---
#define BEAT_HIT (beat ? 1.0 : 0.0)
// #define BEAT_HIT 0.0

#define DROP_INTENSITY (max(-energyZScore, 0.0))
// #define DROP_INTENSITY 0.0

// --- Constants ---
#define NUM_LINES 6.0
#define VERTICAL_SCALE 0.18
#define BASE_WIDTH 6.0
#define GLOW_RADIUS 12.0
#define SMOOTH_W 1.0
#define JULIA_ITER 12
#define PHI 1.61803398875

// ============================================================================
// CHROMADEPTH
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float sat = 0.95 - t * 0.08;
    float lit = 0.55 - t * 0.1;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MINI JULIA SET — used as line texture
// Returns 0.0 (inside set) to 1.0 (escaped quickly)
// ============================================================================

float juliaTexture(vec2 pos, vec2 c) {
    vec2 z = pos;
    float minDist = 100.0;
    for (int i = 0; i < JULIA_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        // Track orbit trap — distance to origin
        minDist = min(minDist, length(z));
        if (dot(z, z) > 4.0) {
            // Smooth escape count
            float smooth_i = float(i) - log2(log2(dot(z, z))) + 4.0;
            return smooth_i / float(JULIA_ITER);
        }
    }
    // Interior: use orbit trap for texture
    return -minDist * 0.5;
}

// ============================================================================
// DRAW A FRACTAL-TEXTURED LINE
// Returns vec4(color, alpha)
// ============================================================================

vec4 drawFractalLine(vec2 fragCoord, vec2 res, float slope, float rSq, float zScore,
                     float norm, float lineCenter, float time, float lineIdx) {
    vec2 uv = fragCoord / res;

    // Value position: zScore is the PRIMARY vertical driver (oscilloscope-style)
    // Slope adds a slower trend offset. Baseline wiggle ensures never flat.
    float baseWiggle = sin(time * (1.3 + lineIdx * 0.4) + lineIdx * PHI) * 0.06
                     + sin(time * (2.7 + lineIdx * 0.7)) * 0.03;
    float val = clamp(zScore * 0.8, -0.9, 0.9)
              + clamp(slope * 10.0, -0.4, 0.4)
              + (norm - 0.5) * 0.4
              + baseWiggle;
    float targetY = lineCenter + val * VERTICAL_SCALE;

    // Distance from pixel to line center (in pixels)
    float distPx = abs(fragCoord.y - targetY * res.y);

    // Line width: rSquared controls thickness, norm adds some variation
    float width = BASE_WIDTH * (0.5 + rSq * 1.0 + abs(zScore) * 0.8);

    // Core line
    float core = smoothstep(width + SMOOTH_W, max(width - SMOOTH_W, 0.0), distPx);

    // Glow around the line
    float glowR = GLOW_RADIUS * (0.3 + abs(zScore) * 0.5);
    float glow = smoothstep(glowR, width * 0.5, distPx) * 0.08;

    float alpha = core + glow;
    if (alpha < 0.01) return vec4(0.0);

    // --- JULIA SET TEXTURE within the line ---
    // The fractal pattern lives along the line's length (time-based x)
    // and perpendicular to it (pixel distance from center)
    // Since we draw 1 column/frame, the x-coordinate advances with time
    vec2 fractalUV = vec2(
        time * 0.3 + lineIdx * PHI,
        (fragCoord.y - targetY * res.y) * 0.25
    );

    // Z-score warps the fractal space — big audio moments distort the texture
    fractalUV += vec2(zScore * 0.5, norm * 0.4);

    // The Julia c-constant IS derived from the regression data!
    // Wandering baseline ensures interesting fractals even with zero audio
    float baseAngle = time * 0.07 + lineIdx * PHI;
    vec2 juliaC = vec2(
        -0.7 + 0.15 * sin(baseAngle) + clamp(slope * 12.0, -0.5, 0.5),
        0.27 + 0.1 * cos(baseAngle * PHI) + clamp((rSq - 0.5) * 0.8, -0.4, 0.4)
    );

    float fractal = juliaTexture(fractalUV, juliaC);

    // --- CHROMADEPTH COLOR ---
    // Each line gets a base hue from its index (spread across the spectrum)
    // Audio data shifts the hue dynamically around that base
    float baseDepth = lineIdx / 6.0;  // 0.0 to 0.83 — spread across spectrum

    // zScore shifts color: positive = warmer (toward red), negative = cooler (toward blue)
    float zShift = -zScore * 0.15;

    // Slope provides slower trend-based shift
    float slopeShift = clamp(-slope * 8.0, -0.15, 0.15);

    // Normalized value shifts within the hue range
    float normShift = (norm - 0.5) * 0.1;

    float depthVal = fract(baseDepth + zShift + slopeShift * rSq + normShift);

    // Fractal also modulates depth for textured color
    float fractalDepthShift = fractal * 0.08;
    depthVal = clamp(depthVal + fractalDepthShift, 0.0, 1.0);

    vec3 baseColor = chromadepth(depthVal);

    // Fractal modulates brightness — creates the textured look
    // Use abs(fractal) since negative = orbit trap interior
    float fractalBright;
    if (fractal >= 0.0) {
        // Exterior: smooth gradient from slightly dark to bright
        fractalBright = 0.5 + fractal * 0.7;
    } else {
        // Interior: orbit trap creates subtle dark/bright texture
        fractalBright = 0.4 + abs(fractal) * 1.5;
    }

    // Apply fractal brightness and hue shift to color
    vec3 lineHSL = rgb2hsl(baseColor);
    // Fractal shifts hue slightly — creates colored texture bands
    lineHSL.x = fract(lineHSL.x + fractal * 0.05);
    lineHSL.y = clamp(lineHSL.y * (0.6 + rSq * 0.5), 0.4, 1.0);
    lineHSL.z *= fractalBright;
    lineHSL.z = clamp(lineHSL.z + core * 0.08, 0.06, 0.7);
    vec3 color = hsl2rgb(lineHSL);

    // Z-score intensity boost — brighter during anomalies
    color *= 1.0 + abs(zScore) * 0.2;

    // Alpha: fade with low confidence
    alpha *= 0.5 + rSq * 0.5;

    return vec4(color, clamp(alpha, 0.0, 1.0));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    // --- SCROLLING BACKGROUND ---
    // Only draw new data on the rightmost pixel column
    // Use floor to snap to exact pixel boundary — prevents fractional artifacts
    float pixelX = floor(fragCoord.x);
    float lastPixel = floor(res.x) - 1.0;

    if (pixelX < lastPixel) {
        vec2 prevUV = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        vec4 prev = getLastFrameColor(prevUV);

        // Fade trails — subtle decay preserves color across screen
        prev.rgb *= 0.998;

        // Beat: subtle brightness pulse on trails
        prev.rgb *= 1.0 + BEAT_HIT * 0.015;

        fragColor = prev;
        return;
    }

    // --- DRAW NEW COLUMN on rightmost edge ---
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);

    float time = iTime;

    // Lines positioned from top to bottom with equal spacing
    // Reversed order: line 6 at top, line 1 at bottom (entropy→energy)
    // Offset from edges: 0.12 to 0.88 range for breathing room

    // Lines spread evenly from 0.13 to 0.87 (spacing ~0.148)
    // Top to bottom: entropy, flux, centroid, treble, bass, energy

    // Line 6: Spectral Entropy (top)
    vec4 l6 = drawFractalLine(fragCoord, res, F6_SLOPE, F6_RSQUARED, F6_ZSCORE,
                              F6_NORM, 0.87, time, 5.0);
    fragColor.rgb = mix(fragColor.rgb, l6.rgb, l6.a);

    // Line 5: Spectral Flux
    vec4 l5 = drawFractalLine(fragCoord, res, F5_SLOPE, F5_RSQUARED, F5_ZSCORE,
                              F5_NORM, 0.72, time, 4.0);
    fragColor.rgb = mix(fragColor.rgb, l5.rgb, l5.a);

    // Line 4: Spectral Centroid
    vec4 l4 = drawFractalLine(fragCoord, res, F4_SLOPE, F4_RSQUARED, F4_ZSCORE,
                              F4_NORM, 0.58, time, 3.0);
    fragColor.rgb = mix(fragColor.rgb, l4.rgb, l4.a);

    // Line 3: Treble
    vec4 l3 = drawFractalLine(fragCoord, res, F3_SLOPE, F3_RSQUARED, F3_ZSCORE,
                              F3_NORM, 0.43, time, 2.0);
    fragColor.rgb = mix(fragColor.rgb, l3.rgb, l3.a);

    // Line 2: Bass
    vec4 l2 = drawFractalLine(fragCoord, res, F2_SLOPE, F2_RSQUARED, F2_ZSCORE,
                              F2_NORM, 0.28, time, 1.0);
    fragColor.rgb = mix(fragColor.rgb, l2.rgb, l2.a);

    // Line 1: Energy (bottom)
    vec4 l1 = drawFractalLine(fragCoord, res, F1_SLOPE, F1_RSQUARED, F1_ZSCORE,
                              F1_NORM, 0.13, time, 0.0);
    fragColor.rgb = mix(fragColor.rgb, l1.rgb, l1.a);

    // --- DROP DETECTION ---
    int spiking = 0;
    if (abs(F1_ZSCORE) > 0.8) spiking++;
    if (abs(F2_ZSCORE) > 0.8) spiking++;
    if (abs(F3_ZSCORE) > 0.8) spiking++;
    if (abs(F4_ZSCORE) > 0.8) spiking++;
    if (abs(F5_ZSCORE) > 0.8) spiking++;
    if (abs(F6_ZSCORE) > 0.8) spiking++;

    // Multi-feature spike: brighten everything
    if (spiking >= 3) {
        float intensity = float(spiking) / 6.0;
        fragColor.rgb = mix(fragColor.rgb, vec3(1.0, 0.9, 0.8), intensity * 0.25);
    }

    // Drop tint — warm shift
    fragColor.rgb = mix(fragColor.rgb, fragColor.rgb * vec3(1.1, 0.92, 0.88),
                        DROP_INTENSITY * 0.05);

    fragColor.rgb = clamp(fragColor.rgb, 0.0, 1.0);
    fragColor.a = 1.0;
}
