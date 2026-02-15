// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, spirograph, geometric
// ChromaDepth Spirograph - Nested epitrochoid/hypotrochoid curves as distance fields
// Each layer at a different chromadepth depth: inner = red (near), outer = violet (far)
// Frame feedback creates trailing spirograph patterns
// ChromaDepth: Red = closest, Green = mid, Blue/Violet = farthest, Black = neutral

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// Number of petals / frequency parameter: spectral centroid shifts complexity
#define PETAL_MOD (spectralCentroidZScore * 0.4)
// #define PETAL_MOD 0.0

// Inner/outer radius ratio: bass shifts the shape
#define RADIUS_RATIO_MOD (bassZScore * 0.08)
// #define RADIUS_RATIO_MOD 0.0

// Pen distance modulation: treble shifts pen reach
#define PEN_MOD (trebleZScore * 0.06)
// #define PEN_MOD 0.0

// Rotation speed: energy drives overall rotation
#define ROTATION_SPEED (0.12 + energyNormalized * 0.15)
// #define ROTATION_SPEED 0.12

// Beat burst: triggers new curves via feedback persistence
#define BEAT_BURST (beat ? 1.0 : 0.0)
// #define BEAT_BURST 0.0

// Glow intensity: spectral flux drives glow brightness
#define GLOW_MOD (1.0 + spectralFluxZScore * 0.3)
// #define GLOW_MOD 1.0

// Overall scale: bass normalized breathes the pattern
#define SCALE_BREATH (1.0 + bassNormalized * 0.1 - 0.05)
// #define SCALE_BREATH 1.0

// Color shift: pitch class rotates the depth palette
#define DEPTH_SHIFT (pitchClassNormalized * 0.08)
// #define DEPTH_SHIFT 0.0

// Feedback decay: spectral entropy controls trail length
#define TRAIL_PERSISTENCE (0.88 + spectralEntropyNormalized * 0.06)
// #define TRAIL_PERSISTENCE 0.91

// Pattern evolution rate: mids nudge evolution
#define EVOLUTION_MOD (midsZScore * 0.02)
// #define EVOLUTION_MOD 0.0

// Line thickness: spectral roughness
#define THICKNESS_MOD (1.0 + spectralRoughnessNormalized * 0.5)
// #define THICKNESS_MOD 1.0

// Bass punch brightness
#define BASS_BRIGHTNESS (1.0 + bassZScore * 0.1)
// #define BASS_BRIGHTNESS 1.0

// Energy slope for trend detection
#define ENERGY_TREND (energySlope * 10.0 * energyRSquared)
// #define ENERGY_TREND 0.0

// ============================================================================
// CONSTANTS
// ============================================================================

#define NUM_LAYERS 5
#define SAMPLES_PER_CURVE 128
#define PI 3.14159265359
#define TAU 6.28318530718

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
// SPIROGRAPH PARAMETRIC CURVES
// ============================================================================

// Epitrochoid: point on a circle of radius r rolling around
// the outside of a circle of radius R, pen distance d from center
// x(t) = (R+r)*cos(t) - d*cos((R+r)/r * t)
// y(t) = (R+r)*sin(t) - d*sin((R+r)/r * t)

vec2 spirographPoint(float t, float R, float r, float d, float phase) {
    float rr = R + r;
    float ratio = rr / max(r, 0.001);
    return vec2(
        rr * cos(t + phase) - d * cos(ratio * t + phase),
        rr * sin(t + phase) - d * sin(ratio * t + phase)
    );
}

// Approximate signed distance to a parametric spirograph curve
// by sampling points along the curve and finding the minimum distance
float spirographDist(vec2 p, float R, float r, float d, float phase) {
    float minDist = 1e10;

    for (int i = 0; i < SAMPLES_PER_CURVE; i++) {
        float t = float(i) / float(SAMPLES_PER_CURVE) * TAU;
        vec2 sp = spirographPoint(t, R, r, d, phase);
        float dist = length(p - sp);
        minDist = min(minDist, dist);
    }

    return minDist;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // Scale the coordinate system so curves fit nicely
    float scale = 2.8 * SCALE_BREATH;
    uv *= scale;

    // Slow time evolution
    float time = iTime * ROTATION_SPEED;
    float evolve = iTime * 0.03 + EVOLUTION_MOD;

    // Accumulate color from all layers
    vec3 col = vec3(0.0);

    for (int layer = 0; layer < NUM_LAYERS; layer++) {
        float layerF = float(layer);
        float layerNorm = layerF / float(NUM_LAYERS - 1); // 0 to 1

        // Each layer has different spirograph parameters
        // Innermost (layer 0) = simplest, outermost = most complex

        // Base petal count increases with layer
        float basePetals = 3.0 + layerF * 1.5;
        float petals = basePetals + PETAL_MOD;
        petals = max(petals, 2.0);

        // Outer radius R (larger for outer layers)
        float R = 0.3 + layerF * 0.12;

        // Inner radius r derived from petal count
        // The number of petals in a spirograph is related to R/r
        float r = R / max(petals, 0.001);
        r += RADIUS_RATIO_MOD * (0.5 + layerNorm * 0.5);
        r = max(r, 0.01);

        // Pen distance d (varies per layer)
        float d = r * (0.6 + layerNorm * 0.4 + sin(evolve + layerF) * 0.15);
        d += PEN_MOD * (1.0 + layerNorm);
        d = max(d, 0.01);

        // Phase offset per layer so they don't overlap at start
        float phase = time * (1.0 + layerF * 0.15) + layerF * PI * 0.4;

        // Add trend-based acceleration to inner layers
        phase += ENERGY_TREND * 0.3 * (1.0 - layerNorm);

        // Compute distance to this spirograph curve
        float dist = spirographDist(uv, R, r, d, phase);

        // Glow falloff from the curve
        float thickness = (0.012 + layerNorm * 0.006) * THICKNESS_MOD;
        float glow = thickness / (dist + thickness);
        glow = pow(glow, 1.8); // sharpen the falloff
        glow *= GLOW_MOD;

        // Chromadepth color: inner layers = red (low t), outer = violet (high t)
        float depthT = layerNorm;
        depthT += DEPTH_SHIFT;
        depthT = clamp(depthT, 0.0, 1.0);

        vec3 layerColor = chromadepth(depthT);

        // Add this layer's contribution
        col += layerColor * glow;
    }

    // Apply brightness modulation
    col *= clamp(BASS_BRIGHTNESS, 0.5, 1.5);

    // Beat burst: flash brightness
    col *= 1.0 + BEAT_BURST * 0.4;

    // Clamp before feedback to prevent accumulation issues
    col = clamp(col, 0.0, 1.0);

    // --- FRAME FEEDBACK ---
    // Sample previous frame with slight rotation for trailing spirograph effect
    float fbAngle = iTime * 0.003;
    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotatedUV = vec2(
        centered.x * fbc - centered.y * fbs,
        centered.x * fbs + centered.y * fbc
    ) + 0.5;

    // Slight zoom-in on feedback to create trailing spiral
    vec2 fbUV = (rotatedUV - 0.5) * 0.998 + 0.5;
    fbUV = clamp(fbUV, 0.0, 1.0);

    vec3 prev = getLastFrameColor(fbUV).rgb;

    // Decay previous frame
    float persistence = clamp(TRAIL_PERSISTENCE, 0.75, 0.96);
    prev *= persistence;

    // On beat, reduce persistence for sharper new patterns
    if (beat) {
        prev *= 0.7;
    }

    // Blend: new curves paint on top of faded trails
    // Use additive for glow, then clamp
    vec3 result = max(col, prev);

    // Gentle vignette (keeps edges dark for chromadepth)
    float vign = 1.0 - dot(centered, centered) * 0.8;
    result *= max(vign, 0.0);

    // Final clamp
    result = clamp(result, 0.0, 1.0);

    fragColor = vec4(result, 1.0);
}
