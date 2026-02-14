// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, lyapunov, fractal, chaos
// ChromaDepth Lyapunov Fractal - Edge of Chaos Visualization
// Stable regions (lambda << 0) = red/near (order pops forward)
// Chaotic regions (lambda >> 0) = blue/far (chaos recedes)
// Boundary (lambda ~ 0) = green (edge of chaos in the middle)
// Designed for ChromaDepth 3D glasses: Red=closest, Blue=farthest, Black=neutral

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// --- STRING PATTERN COMPLEXITY ---
// spectralEntropy controls how complex the alternation pattern is
// Low entropy = simple "AB", high entropy = "AABBA" or longer
#define PATTERN_COMPLEXITY (spectralEntropyNormalized)
// #define PATTERN_COMPLEXITY 0.5

// --- ZOOM: energy drives zoom into the fractal ---
#define ZOOM_AMOUNT (1.0 + energyNormalized * 0.8)
// #define ZOOM_AMOUNT 1.5

// --- PAN: bass/treble drift the view in parameter space ---
#define PAN_X (bassZScore * 0.08)
// #define PAN_X 0.0

#define PAN_Y (trebleZScore * 0.06)
// #define PAN_Y 0.0

// --- INITIAL X0: spectral centroid shifts the logistic map starting point ---
#define X0_SHIFT (spectralCentroidZScore * 0.03)
// #define X0_SHIFT 0.0

// --- BEAT: brief jolt of the parameter space ---
#define BEAT_SHIFT (beat ? 0.15 : 0.0)
// #define BEAT_SHIFT 0.0

// --- COLOR INTENSITY ---
#define COLOR_BRIGHTNESS (0.9 + energyZScore * 0.15)
// #define COLOR_BRIGHTNESS 0.9

// --- FEEDBACK STRENGTH ---
#define FEEDBACK_MIX (0.25 + midsZScore * 0.05)
// #define FEEDBACK_MIX 0.25

// --- BASS PUNCH on near/red regions ---
#define BASS_PUNCH (bassZScore * 0.06)
// #define BASS_PUNCH 0.0

// --- TREBLE EDGE glow ---
#define TREBLE_GLOW (max(trebleZScore, 0.0) * 0.2)
// #define TREBLE_GLOW 0.0

// --- TREND DETECTION ---
#define ENERGY_TREND (energySlope * 15.0 * energyRSquared)
// #define ENERGY_TREND 0.0

#define BASS_TREND (bassSlope * 12.0 * bassRSquared)
// #define BASS_TREND 0.0

// --- ROUGHNESS adds visual texture ---
#define ROUGHNESS_MOD (spectralRoughnessNormalized * 0.08)
// #define ROUGHNESS_MOD 0.0

// --- FLUX drives parameter space jitter ---
#define FLUX_JITTER (spectralFluxZScore * 0.04)
// #define FLUX_JITTER 0.0

// --- PITCH shifts hue subtly ---
#define PITCH_HUE_SHIFT (pitchClassNormalized * 0.06)
// #define PITCH_HUE_SHIFT 0.0

// --- Constants ---
#define MAX_LYAPUNOV_ITER 28
#define SETTLE_ITER 4

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float sat = 0.95 - t * 0.1;
    float lit = 0.55 - t * 0.12;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// ALTERNATION STRING PATTERN
// ============================================================================
// Returns 0.0 (use parameter a) or 1.0 (use parameter b) for step i
// Pattern complexity transitions from "AB" to "AABB" to "AABBA" etc.

float getPatternValue(int step, float complexity) {
    // Simple patterns encoded as sequences
    // complexity 0.0 = "AB" (period 2)
    // complexity 0.5 = "AABB" (period 4)
    // complexity 1.0 = "AABBA" (period 5)

    // Period-2: AB
    float p2 = mod(float(step), 2.0) < 1.0 ? 0.0 : 1.0;

    // Period-4: AABB
    float m4 = mod(float(step), 4.0);
    float p4 = m4 < 2.0 ? 0.0 : 1.0;

    // Period-5: AABBA
    float m5 = mod(float(step), 5.0);
    float p5 = (m5 < 2.0 || m5 >= 4.0) ? 0.0 : 1.0;

    // Blend between patterns based on complexity
    if (complexity < 0.5) {
        return mix(p2, p4, complexity * 2.0);
    } else {
        return mix(p4, p5, (complexity - 0.5) * 2.0);
    }
}

// ============================================================================
// LYAPUNOV EXPONENT CALCULATION
// ============================================================================

float lyapunovExponent(float a, float b, float x0, float complexity) {
    float x = x0;
    float lyap = 0.0;

    // Settle the orbit first (skip transient)
    for (int i = 0; i < SETTLE_ITER; i++) {
        float pat = getPatternValue(i, complexity);
        float r = mix(a, b, pat);
        x = r * x * (1.0 - x);
        x = clamp(x, 0.001, 0.999);
    }

    // Now compute the Lyapunov exponent
    for (int i = 0; i < MAX_LYAPUNOV_ITER; i++) {
        float pat = getPatternValue(i + SETTLE_ITER, complexity);
        float r = mix(a, b, pat);
        x = r * x * (1.0 - x);
        x = clamp(x, 0.001, 0.999);

        // Derivative of logistic map: r * (1 - 2x)
        float deriv = abs(r * (1.0 - 2.0 * x));
        lyap += log(max(deriv, 1e-10));
    }

    return lyap / float(MAX_LYAPUNOV_ITER);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 screenUV = fragCoord / iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // --- PARAMETER SPACE WINDOW ---
    // Classic Lyapunov fractal lives in (a,b) roughly [2, 4] x [2, 4]
    // Center on the interesting region around (3.0, 3.5)
    vec2 center = vec2(3.0, 3.4);

    // Slow autonomous drift through parameter space
    float t = iTime * 0.03;
    center += vec2(
        0.15 * sin(t * 1.1) + 0.08 * cos(t * 0.7),
        0.12 * cos(t * 0.9) + 0.06 * sin(t * 1.3)
    );

    // Audio-driven pan
    center += vec2(PAN_X, PAN_Y);

    // Beat shift: brief jolt
    center += vec2(
        BEAT_SHIFT * sin(iTime * 7.3),
        BEAT_SHIFT * cos(iTime * 5.1)
    );

    // Trend-based drift (steady builds move the view)
    center += vec2(ENERGY_TREND * 0.02, BASS_TREND * 0.02);

    // Flux jitter
    center += vec2(
        FLUX_JITTER * sin(iTime * 11.0),
        FLUX_JITTER * cos(iTime * 9.0)
    );

    // Zoom
    float zoom = ZOOM_AMOUNT;
    float span = 1.8 / zoom;

    // Map UV to (a, b) parameter space
    float a = center.x + uv.x * span;
    float b = center.y + uv.y * span;

    // Clamp to valid logistic map range (r must be in [0, 4])
    a = clamp(a, 0.5, 4.0);
    b = clamp(b, 0.5, 4.0);

    // Initial condition for the logistic map
    float x0 = 0.5 + X0_SHIFT;
    x0 = clamp(x0, 0.05, 0.95);

    // Pattern complexity from audio
    float complexity = clamp(PATTERN_COMPLEXITY, 0.0, 1.0);

    // Add roughness-based texture to complexity
    complexity = clamp(complexity + ROUGHNESS_MOD * sin(a * 5.0 + b * 3.0), 0.0, 1.0);

    // --- COMPUTE LYAPUNOV EXPONENT ---
    float lambda = lyapunovExponent(a, b, x0, complexity);

    // --- MAP TO CHROMADEPTH ---
    // lambda < 0: stable/ordered -> red (near, t ~ 0)
    // lambda ~ 0: edge of chaos -> green (mid, t ~ 0.5)
    // lambda > 0: chaotic -> blue/violet (far, t ~ 1.0)

    // Normalize lambda to 0-1 range
    // Typical range: about -2 to +2, but can vary
    // Use a sigmoid-like mapping for smooth distribution
    float depth = 1.0 / (1.0 + exp(-lambda * 2.5));

    // Enhance contrast around the edge of chaos (lambda ~ 0)
    // This makes the green boundary more visible
    float edgeFactor = exp(-lambda * lambda * 3.0);

    // Brightness: brightest at the boundary, darker in deep stable/chaotic regions
    float brightness = 0.3 + 0.7 * (0.4 + 0.6 * edgeFactor);

    // Deep stable regions (very negative lambda) get strong red
    float stableIntensity = clamp(-lambda * 0.5, 0.0, 1.0);
    // Deep chaotic regions get subtle structure from the exponent
    float chaoticDetail = clamp(lambda * 0.3, 0.0, 1.0);

    // Add pitch-based hue shift
    depth = fract(depth + PITCH_HUE_SHIFT);

    // Get the chromadepth color
    vec3 col = chromadepth(depth);

    // Modulate brightness
    col *= brightness;
    col *= clamp(COLOR_BRIGHTNESS, 0.3, 1.5);

    // Bass punch: push stable/red regions brighter (they pop forward more)
    col += chromadepth(0.0) * stableIntensity * max(BASS_PUNCH, 0.0) * 0.3;

    // Treble glow on chaotic edges
    float edgeGlow = edgeFactor * TREBLE_GLOW;
    col += vec3(0.8, 1.0, 0.8) * edgeGlow * 0.4;

    // Beat flash: brief brightness boost biased toward red
    if (beat) {
        col *= 1.15;
        col.r *= 1.1;
    }

    // Clamp before feedback
    col = clamp(col, 0.0, 1.0);

    // --- FRAME FEEDBACK with gentle blur ---
    // Sample previous frame with slight offset for blur effect
    float fbAmount = clamp(FEEDBACK_MIX, 0.1, 0.45);

    // Gentle blur: sample from nearby pixels
    vec2 pixelSize = 1.0 / iResolution.xy;
    float blurRadius = 1.5;

    vec3 prev = vec3(0.0);
    // 5-tap blur pattern (center + 4 cardinal directions)
    prev += getLastFrameColor(screenUV).rgb * 0.4;
    prev += getLastFrameColor(screenUV + vec2(pixelSize.x * blurRadius, 0.0)).rgb * 0.15;
    prev += getLastFrameColor(screenUV - vec2(pixelSize.x * blurRadius, 0.0)).rgb * 0.15;
    prev += getLastFrameColor(screenUV + vec2(0.0, pixelSize.y * blurRadius)).rgb * 0.15;
    prev += getLastFrameColor(screenUV - vec2(0.0, pixelSize.y * blurRadius)).rgb * 0.15;

    // Decay previous frame to prevent accumulation
    prev *= 0.96;

    // Blend in oklab for perceptual uniformity
    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);

    // Decay chroma of previous frame slightly
    prevOk.yz *= 0.98;

    vec3 blended = mix(prevOk, colOk, 1.0 - fbAmount);

    // Ensure fresh color dominates when chroma is dying
    float blendedChroma = length(blended.yz);
    float freshChroma = length(colOk.yz);
    if (blendedChroma < freshChroma * 0.6) {
        blended.yz = mix(blended.yz, colOk.yz, 0.4);
    }

    col = oklab2rgb(blended);

    // --- VIGNETTE ---
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    // Black out regions outside the interesting parameter space
    // (where a or b are near the edges of validity)
    float edgeFade = smoothstep(0.5, 1.5, a) * smoothstep(4.0, 3.8, a)
                   * smoothstep(0.5, 1.5, b) * smoothstep(4.0, 3.8, b);
    col *= edgeFade;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
