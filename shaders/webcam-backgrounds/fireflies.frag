// @fullscreen: true
// @mobile: true
// @tags: ambient, background, webcam
// Floating firefly particles with warm glow trails — dark forest webcam background

// ============================================================================
// SLOW PARAMETERS (medians, means, regression — changes over seconds)
// ============================================================================

// Number of fireflies visible
#define FLY_COUNT (8.0 + spectralEntropyMedian * 12.0)

// Drift speed
#define DRIFT_SPEED (0.05 + energySlope * 0.03)

// Glow size per firefly
#define GLOW_SIZE (0.04 + bassMedian * 0.02)

// Hue center in Oklch (warm yellow-green ~1.8-2.4)
#define HUE_CENTER (2.0 + pitchClassMedian * 0.4 + spectralCentroidSlope * 0.15)

// Chroma
#define CHROMA (0.10 + energyRSquared * 0.06)

// Base glow lightness
#define LIGHTNESS (0.50 + energyMedian * 0.15)

// Pulse rate — how fast fireflies blink
#define PULSE_RATE (0.3 + spectralSpreadMedian * 0.3)

// ============================================================================
// FAST PARAMETERS (small accents only)
// ============================================================================

// Extra brightness on flux spikes
#define FLASH (max(spectralFluxZScore, 0.0) * 0.06)

// Trail shimmer on treble
#define TRAIL_SHIMMER (max(trebleZScore, 0.0) * 0.03)

// Ambient grit
#define GRIT (spectralRoughnessZScore * 0.004)

// ============================================================================
// HASH
// ============================================================================

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float t = time;
    float flyCount = FLY_COUNT;

    float totalGlow = 0.0;
    float bestHueShift = 0.0;

    for (float i = 0.0; i < 20.0; i += 1.0) {
        if (i >= flyCount) break;

        // Unique random seed per firefly
        vec2 seed = hash2(vec2(i * 17.3, i * 31.7));
        float seed1 = seed.x;
        float seed2 = seed.y;

        // Position: slow looping path using sin/cos at different rates
        vec2 flyPos = vec2(
            sin(t * DRIFT_SPEED * (1.0 + seed1 * 2.0) + seed1 * 6.28) * (0.3 + seed2 * 0.25),
            cos(t * DRIFT_SPEED * (0.8 + seed2 * 1.5) + seed2 * 6.28) * (0.2 + seed1 * 0.2)
        );

        // Offset so they spread around the screen
        flyPos += vec2(
            sin(seed1 * 42.0) * 0.5,
            cos(seed2 * 37.0) * 0.35
        );

        // Distance to this firefly
        float d = length(p - flyPos);

        // Glow falloff
        float size = GLOW_SIZE * (0.6 + seed1 * 0.8);
        float glow = exp(-d * d / (size * size));

        // Blink: each firefly pulses on/off slowly
        float blinkPhase = t * PULSE_RATE + seed1 * 6.28 + seed2 * 3.14;
        float blink = smoothstep(-0.3, 0.3, sin(blinkPhase));
        blink = blink * blink; // Sharper on-off

        glow *= blink;

        // Trail: slight glow behind the movement direction
        vec2 vel = vec2(
            cos(t * DRIFT_SPEED * (1.0 + seed1 * 2.0) + seed1 * 6.28),
            -sin(t * DRIFT_SPEED * (0.8 + seed2 * 1.5) + seed2 * 6.28)
        ) * DRIFT_SPEED;
        vec2 trailPos = flyPos - normalize(vel + 0.001) * size * 2.0;
        float trailDist = length(p - trailPos);
        float trail = exp(-trailDist * trailDist / (size * size * 4.0)) * 0.3;
        trail *= blink;

        totalGlow += glow + trail;

        // Track hue shift from nearest bright firefly
        if (glow > 0.1) {
            bestHueShift = seed1 * 0.4 - 0.2;
        }
    }

    totalGlow = clamp(totalGlow, 0.0, 1.0);

    // --- Color in Oklch: warm yellow-green ---
    float hue = HUE_CENTER + bestHueShift;
    float chroma = CHROMA * (0.3 + totalGlow * 2.0);
    float lightness = mix(0.0, LIGHTNESS, totalGlow);

    // Fast accents
    lightness += FLASH * totalGlow;
    lightness += TRAIL_SHIMMER * totalGlow * 0.5;

    // Background: very dark forest green
    vec3 bg = oklch2rgb(vec3(0.05, 0.02, 2.5));

    // Ambient background mist
    float mist = sin(p.x * 3.0 + p.y * 2.0 + t * 0.02) * 0.5 + 0.5;
    mist *= 0.03;
    bg += oklch2rgb(vec3(mist, 0.01, 2.5));

    // Firefly glow color
    vec3 glowCol = oklch2rgb(vec3(
        clamp(lightness, 0.03, 0.65),
        clamp(chroma, 0.02, 0.18),
        hue
    ));

    // Mix
    vec3 col = mix(bg, glowCol, smoothstep(0.0, 0.01, totalGlow));

    // --- Center darkening ---
    float centerDark = 1.0 - 0.2 * exp(-dot(p, p) * 4.0);
    col *= centerDark;

    // --- Frame feedback ---
    vec4 prev = getLastFrameColor(uv);
    col = mix(prev.rgb, col, 0.12);

    // --- Vignette ---
    float r = length(p);
    float vign = 1.0 - r * 0.2;
    col *= vign;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
