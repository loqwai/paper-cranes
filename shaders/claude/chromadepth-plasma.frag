// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, plasma, fractal
// ChromaDepth Plasma Fractal — Multi-octave sine plasma with fractal depth layering
// Low-frequency waves = red/close, high-frequency detail = blue/far
// Each octave driven by a different audio domain for rich independent reactivity
// Designed for ChromaDepth 3D glasses: Red = closest, Green = mid, Blue/Violet = farthest

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// --- OCTAVE 1: Bass — large red waves (closest) ---
#define BASS_DRIVE (bassZScore * 0.4)
// #define BASS_DRIVE 0.0

#define BASS_AMPLITUDE (0.8 + bassNormalized * 0.4)
// #define BASS_AMPLITUDE 1.0

// --- OCTAVE 2: Mids — green medium waves (mid depth) ---
#define MIDS_DRIVE (midsZScore * 0.3)
// #define MIDS_DRIVE 0.0

#define MIDS_AMPLITUDE (0.5 + energyNormalized * 0.3)
// #define MIDS_AMPLITUDE 0.6

// --- OCTAVE 3: Treble — cyan fine detail (far) ---
#define TREBLE_DRIVE (trebleZScore * 0.25)
// #define TREBLE_DRIVE 0.0

#define TREBLE_AMPLITUDE (0.3 + trebleNormalized * 0.3)
// #define TREBLE_AMPLITUDE 0.4

// --- OCTAVE 4: Entropy — violet ultra-fine (farthest) ---
#define ENTROPY_DRIVE (spectralCentroidZScore * 0.2)
// #define ENTROPY_DRIVE 0.0

#define ENTROPY_AMPLITUDE (0.2 + spectralEntropyNormalized * 0.25)
// #define ENTROPY_AMPLITUDE 0.3

// --- DOMAIN WARP: spectral flux warps UV space ---
#define WARP_STRENGTH (0.15 + spectralFluxZScore * 0.08)
// #define WARP_STRENGTH 0.15

// --- OVERALL CONTRAST: energy drives contrast enhancement ---
#define CONTRAST_BOOST (1.0 + energyZScore * 0.15)
// #define CONTRAST_BOOST 1.0

// --- FEEDBACK: frame persistence ---
#define FEEDBACK_MIX (0.3 + energyNormalized * 0.1)
// #define FEEDBACK_MIX 0.35

// --- BEAT PULSE: brightness surge on beat ---
#define BEAT_SURGE (beat ? 1.25 : 1.0)
// #define BEAT_SURGE 1.0

// --- TREND-BASED DRIFT: regression slopes drive slow evolution ---
#define DRIFT_X (bassSlope * 15.0 * bassRSquared)
// #define DRIFT_X 0.0

#define DRIFT_Y (energySlope * 12.0 * energyRSquared)
// #define DRIFT_Y 0.0

// --- PITCH-BASED HUE SHIFT ---
#define HUE_NUDGE (pitchClassNormalized * 0.06)
// #define HUE_NUDGE 0.0

// --- ROUGHNESS drives domain warp turbulence ---
#define ROUGHNESS_TURB (spectralRoughnessNormalized * 0.12)
// #define ROUGHNESS_TURB 0.06

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
// PLASMA OCTAVES — each octave is a different spatial frequency
// ============================================================================

// Octave 1: large slow-moving sine waves (bass domain)
float octave1(vec2 p, float time) {
    float t = time * 0.15 + BASS_DRIVE;
    float v = sin(p.x * 1.2 + t * 1.1);
    v += sin(p.y * 1.0 - t * 0.9);
    v += sin((p.x + p.y) * 0.7 + t * 0.7);
    v += sin(length(p + vec2(sin(t * 0.3), cos(t * 0.4))) * 1.5);
    return v * 0.25 * BASS_AMPLITUDE;
}

// Octave 2: medium frequency (mids domain)
float octave2(vec2 p, float time) {
    float t = time * 0.25 + MIDS_DRIVE;
    float v = sin(p.x * 3.1 - t * 1.3);
    v += sin(p.y * 2.8 + t * 1.1);
    v += sin((p.x - p.y) * 2.5 + t * 0.8);
    v += sin(length(p * 1.5 - vec2(cos(t * 0.5), sin(t * 0.6))) * 2.2);
    return v * 0.25 * MIDS_AMPLITUDE;
}

// Octave 3: fine detail (treble domain)
float octave3(vec2 p, float time) {
    float t = time * 0.35 + TREBLE_DRIVE;
    float v = sin(p.x * 6.3 + t * 1.7);
    v += sin(p.y * 5.7 - t * 1.5);
    v += sin((p.x + p.y * 1.3) * 5.0 - t * 1.2);
    v += sin(length(p * 3.0 + vec2(sin(t * 0.7), cos(t * 0.8))) * 4.5);
    return v * 0.25 * TREBLE_AMPLITUDE;
}

// Octave 4: ultra-fine detail (entropy domain)
float octave4(vec2 p, float time) {
    float t = time * 0.45 + ENTROPY_DRIVE;
    float v = sin(p.x * 12.0 - t * 2.1);
    v += sin(p.y * 11.0 + t * 1.9);
    v += sin((p.x * 1.1 - p.y) * 10.0 + t * 1.6);
    v += sin(length(p * 5.5 - vec2(cos(t * 0.9), sin(t * 1.1))) * 8.0);
    return v * 0.25 * ENTROPY_AMPLITUDE;
}

// ============================================================================
// DOMAIN WARP — distorts UV coordinates for organic flow
// ============================================================================

vec2 domainWarp(vec2 p, float time) {
    float t = time * 0.1;
    float strength = WARP_STRENGTH + ROUGHNESS_TURB;

    // Two-pass warp for richer distortion
    float wx = sin(p.y * 2.3 + t * 1.1) + sin(p.x * 1.7 - t * 0.8) * 0.7;
    float wy = sin(p.x * 2.1 - t * 0.9) + sin(p.y * 1.9 + t * 1.2) * 0.7;

    vec2 warped = p + vec2(wx, wy) * strength;

    // Second pass with different frequencies
    float wx2 = sin(warped.y * 3.5 + t * 1.5) * 0.4;
    float wy2 = sin(warped.x * 3.2 - t * 1.3) * 0.4;

    return warped + vec2(wx2, wy2) * strength * 0.5;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Centered UV with aspect ratio correction
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    float time = iTime;

    // Apply trend-based drift for slow evolution
    vec2 drift = vec2(DRIFT_X, DRIFT_Y) * 0.02;
    uv += drift;

    // Domain warp the coordinates for organic plasma flow
    vec2 wp = domainWarp(uv, time);

    // --- COMPUTE ALL FOUR OCTAVES ---
    float o1 = octave1(wp, time);           // large features (bass)
    float o2 = octave2(wp, time);           // medium features (mids)
    float o3 = octave3(wp, time);           // fine features (treble)
    float o4 = octave4(wp, time);           // ultra-fine (entropy)

    // --- DETERMINE DOMINANT OCTAVE FOR DEPTH ---
    // The octave with the strongest absolute contribution at each pixel
    // determines the chromadepth color (depth layer).
    //
    // Depth mapping:
    //   Octave 1 dominant → depth ~0.0  (red, closest)
    //   Octave 2 dominant → depth ~0.33 (green, mid)
    //   Octave 3 dominant → depth ~0.60 (cyan, far)
    //   Octave 4 dominant → depth ~0.85 (violet, farthest)

    float a1 = abs(o1);
    float a2 = abs(o2);
    float a3 = abs(o3);
    float a4 = abs(o4);

    // Soft maximum: weighted blend based on relative strength
    // This gives smooth depth transitions instead of hard octave boundaries
    float total = a1 + a2 + a3 + a4 + 0.001;  // avoid division by zero
    float w1 = a1 / total;
    float w2 = a2 / total;
    float w3 = a3 / total;
    float w4 = a4 / total;

    // Square the weights for sharper octave dominance (more distinct depth layers)
    w1 *= w1;
    w2 *= w2;
    w3 *= w3;
    w4 *= w4;
    float wSum = w1 + w2 + w3 + w4 + 0.001;
    w1 /= wSum;
    w2 /= wSum;
    w3 /= wSum;
    w4 /= wSum;

    float depth = w1 * 0.0 + w2 * 0.33 + w3 * 0.60 + w4 * 0.85;

    // --- PLASMA INTENSITY ---
    // Combined value from all octaves gives brightness variation
    float plasma = o1 + o2 + o3 + o4;

    // Contrast enhancement driven by energy
    float contrast = CONTRAST_BOOST;
    plasma *= contrast;

    // Map plasma value to brightness (keep it positive, avoid white-out)
    float brightness = 0.4 + 0.35 * sin(plasma * 3.14159);
    brightness = clamp(brightness, 0.15, 0.85);

    // Use plasma phase to subtly shift depth for extra variety
    float depthShift = sin(plasma * 2.0) * 0.08;
    depth = clamp(depth + depthShift + HUE_NUDGE, 0.0, 1.0);

    // --- CHROMADEPTH COLOR ---
    vec3 col = chromadepth(depth);
    col *= brightness;

    // --- BEAT SURGE ---
    col *= BEAT_SURGE;

    // --- FRAME FEEDBACK for plasma persistence ---
    // Sample previous frame with slight UV offset for flowing trails
    float fbAngle = time * 0.02;
    float fbc = cos(fbAngle);
    float fbs = sin(fbAngle);
    vec2 centered = screenUV - 0.5;
    vec2 fbUV = vec2(
        centered.x * fbc - centered.y * fbs,
        centered.x * fbs + centered.y * fbc
    ) * 0.998 + 0.5;  // slight zoom-in to prevent edge artifacts

    // Add plasma-based warp to feedback for organic trails
    fbUV += vec2(sin(plasma * 1.5), cos(plasma * 1.3)) * 0.003;
    fbUV = clamp(fbUV, 0.0, 1.0);

    vec3 prev = getLastFrameColor(fbUV).rgb;

    // Decay previous frame to prevent accumulation
    prev *= 0.96;

    // Blend current and previous
    float fbMix = clamp(FEEDBACK_MIX, 0.1, 0.5);
    col = mix(col, prev, fbMix);

    // --- VIGNETTE (keeps edges dark for clean chromadepth) ---
    vec2 vc = screenUV - 0.5;
    float vignette = 1.0 - dot(vc, vc) * 0.7;
    col *= vignette;

    // Final clamp to prevent any white-out
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
