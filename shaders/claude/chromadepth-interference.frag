// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, interference, waves, moire
// ChromaDepth Wave Interference - Multiple wave sources create moire depth patterns
// Red = constructive interference (closest), Blue = destructive (farthest), Black = neutral

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// Wave frequency: spectral centroid controls ripple density
#define WAVE_FREQ (12.0 + spectralCentroidZScore * 4.0)
// #define WAVE_FREQ 12.0

// Number of active wave sources (2-6): energy scales source count
#define SOURCE_COUNT_F (2.0 + clamp(energyNormalized * 4.0, 0.0, 4.0))
// #define SOURCE_COUNT_F 4.0

// Wave amplitude: bass drives how tall the waves are
#define WAVE_AMP (0.6 + bassZScore * 0.25)
// #define WAVE_AMP 0.6

// Orbit radius: treble controls how far sources wander
#define ORBIT_RADIUS (0.25 + trebleZScore * 0.08)
// #define ORBIT_RADIUS 0.25

// Phase modulation: spectral flux shifts phase relationships
#define PHASE_MOD (spectralFluxZScore * 1.5)
// #define PHASE_MOD 0.0

// Beat burst: adds a central wave pulse on beat
#define BEAT_BURST (beat ? 1.0 : 0.0)
// #define BEAT_BURST 0.0

// Overall brightness: energy controls intensity
#define BRIGHTNESS (0.85 + energyZScore * 0.15)
// #define BRIGHTNESS 0.85

// Feedback blend: how much previous frame bleeds through
#define FEEDBACK_MIX 0.25

// Radial blur offset for feedback
#define BLUR_OFFSET (0.003 + bassNormalized * 0.002)
// #define BLUR_OFFSET 0.003

// Orbit speed modulation: mids affect rotation speed
#define ORBIT_SPEED (0.15 + midsZScore * 0.05)
// #define ORBIT_SPEED 0.15

// Hue shift from pitch class for subtle color variation
#define HUE_SHIFT (pitchClassNormalized * 0.05)
// #define HUE_SHIFT 0.0

// Entropy-driven wave distortion
#define WAVE_DISTORT (spectralEntropyNormalized * 0.3)
// #define WAVE_DISTORT 0.0

// Slope-driven drift: bass slope drifts the pattern
#define DRIFT_X (bassSlope * 0.02)
// #define DRIFT_X 0.0

#define DRIFT_Y (spectralCentroidSlope * 0.015)
// #define DRIFT_Y 0.0

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
// WAVE SOURCE POSITIONS
// ============================================================================

vec2 getSourcePos(int idx, float time) {
    float angle = float(idx) * 1.0471975 + time * ORBIT_SPEED * (1.0 + float(idx) * 0.13);
    float r = ORBIT_RADIUS * (0.8 + 0.2 * sin(time * 0.3 + float(idx) * 2.0));
    return vec2(cos(angle) * r, sin(angle) * r) + vec2(DRIFT_X, DRIFT_Y);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Centered UV with aspect ratio correction
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float time = iTime;
    float freq = WAVE_FREQ;
    float amp = clamp(WAVE_AMP, 0.1, 1.5);
    int srcCount = int(clamp(SOURCE_COUNT_F, 2.0, 6.0));
    float phaseMod = PHASE_MOD;

    // ---- Accumulate interference from all sources ----
    float interference = 0.0;

    for (int i = 0; i < 6; i++) {
        if (i >= srcCount) break;

        vec2 srcPos = getSourcePos(i, time);
        float dist = length(uv - srcPos);

        // Each source has a slightly different frequency for moire
        float f = freq * (1.0 + float(i) * 0.07);

        // Phase offset per source, modulated by audio
        float phase = float(i) * 1.047 + phaseMod * float(i) * 0.4;

        // Optional distortion from entropy
        float distorted = dist + WAVE_DISTORT * sin(dist * 8.0 + time);

        // Sinusoidal wave from this source
        float wave = sin(distorted * f - time * 2.5 + phase);

        interference += wave;
    }

    // ---- Beat burst: temporary central wave ----
    float burstDecay = BEAT_BURST;
    if (burstDecay > 0.0) {
        float burstDist = length(uv);
        float burstWave = sin(burstDist * freq * 1.5 - time * 6.0) * burstDecay;
        interference += burstWave * 1.5;
    }

    // Normalize interference by source count
    float maxPossible = float(srcCount) + burstDecay * 1.5;
    interference /= max(maxPossible, 1.0);

    // Scale by amplitude
    interference *= amp;

    // ---- Map interference to chromadepth depth ----
    // interference ranges roughly -1 to 1
    // Map so constructive (positive) = red/near, destructive (negative) = blue/far
    // 0.0 maps to mid-depth green
    float depth = 0.5 - interference * 0.5;
    depth = clamp(depth, 0.0, 1.0);

    // Apply hue shift
    depth = fract(depth + HUE_SHIFT);

    vec3 col = chromadepth(depth);

    // Intensity modulation: quiet interference fades toward black
    float intensityMask = smoothstep(0.0, 0.15, abs(interference));
    col *= mix(0.3, 1.0, intensityMask);

    // Brightness
    col *= clamp(BRIGHTNESS, 0.3, 1.3);

    // ---- Frame feedback with radial blur ----
    vec2 feedUV = fragCoord.xy / iResolution.xy;
    // Radial blur: sample previous frame slightly toward center
    vec2 center = vec2(0.5);
    vec2 toCenter = normalize(center - feedUV) * BLUR_OFFSET;
    vec4 prev = getLastFrameColor(feedUV + toCenter);

    // Decay previous frame slightly to prevent accumulation
    vec3 prevCol = prev.rgb * 0.96;

    // Blend with feedback
    col = mix(col, max(col, prevCol), FEEDBACK_MIX);

    // Gentle vignette (keeps edges dark for chromadepth)
    vec2 vigUV = fragCoord.xy / iResolution.xy - 0.5;
    float vign = 1.0 - dot(vigUV, vigUV) * 0.5;
    col *= vign;

    // Clamp to prevent white-out
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
