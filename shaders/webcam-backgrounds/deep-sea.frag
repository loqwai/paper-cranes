// @fullscreen: true
// @mobile: true
// @tags: ambient, background, webcam
// Bioluminescent deep-sea particles drifting upward — dark ocean webcam background

// ============================================================================
// SLOW PARAMETERS (medians, means, regression — changes over seconds)
// ============================================================================

// Particle density (how many visible)
#define DENSITY (0.3 + spectralEntropyMedian * 0.4)

// Rise speed — particles drift upward slowly
#define RISE_SPEED (0.04 + energySlope * 0.02)

// Glow radius per particle
#define GLOW_SIZE (0.03 + bassMedian * 0.02)

// Hue center in Oklch (deep cyan-blue ~3.8-4.6)
#define HUE_CENTER (4.1 + pitchClassMedian * 0.4 + spectralCentroidSlope * 0.15)

// Chroma — brighter glow when trend confident
#define CHROMA (0.08 + energyRSquared * 0.06)

// Base glow lightness
#define LIGHTNESS (0.45 + energyMedian * 0.15)

// Lateral drift amplitude
#define DRIFT_AMP (0.08 + spectralSpreadMedian * 0.06)

// ============================================================================
// FAST PARAMETERS (small accents only)
// ============================================================================

// Particle flash on flux spikes
#define FLASH (max(spectralFluxZScore, 0.0) * 0.08)

// Extra glow pulse on bass hits
#define BASS_GLOW (max(bassZScore, 0.0) * 0.04)

// Fine particulate from roughness
#define FINE_DUST (spectralRoughnessZScore * 0.004)

// ============================================================================
// HASH
// ============================================================================

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

float hash1(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// ============================================================================
// PARTICLE FIELD
// ============================================================================

float particleField(vec2 p, float t) {
    float total = 0.0;

    // Grid of potential particle positions
    for (float gy = -2.0; gy <= 2.0; gy += 1.0) {
        for (float gx = -2.0; gx <= 2.0; gx += 1.0) {
            vec2 cell = floor(p * 3.0) + vec2(gx, gy);
            vec2 rnd = hash2(cell);

            // Only show DENSITY fraction of particles
            if (rnd.x > DENSITY) continue;

            // Particle base position within cell
            vec2 particlePos = (cell + rnd) / 3.0;

            // Rise over time (wrapping)
            particlePos.y += t * RISE_SPEED * (0.5 + rnd.y * 1.0);
            particlePos.y = mod(particlePos.y + 0.6, 1.2) - 0.6;

            // Lateral drift
            particlePos.x += sin(t * 0.3 + rnd.x * 6.28) * DRIFT_AMP;

            // Distance to particle
            float d = length(p - particlePos);

            // Soft glow falloff
            float size = GLOW_SIZE * (0.5 + rnd.y * 1.0);
            float glow = exp(-d * d / (size * size * 2.0));

            // Pulse: each particle blinks at its own rate
            float pulse = 0.6 + 0.4 * sin(t * 0.5 + rnd.x * 12.0 + rnd.y * 8.0);
            glow *= pulse;

            total += glow;
        }
    }

    return clamp(total, 0.0, 1.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float t = time;

    // --- Particle glow field ---
    float glow = particleField(p, t);

    // --- Fast accents ---
    glow += FLASH * glow;
    glow += BASS_GLOW * glow;

    // Fine background dust
    float dust = hash1(floor(p * 80.0 + time * 0.3)) * step(0.97, hash1(floor(p * 80.0)));
    dust *= 0.15;

    // --- Color in Oklch ---
    float hue = HUE_CENTER + glow * 0.3;
    float chroma = CHROMA * (0.3 + glow * 2.0);
    float lightness = mix(0.0, LIGHTNESS, glow) + dust * 0.1;

    lightness += hash1(p * 50.0 + time) * FINE_DUST;

    // Background: very dark ocean blue
    vec3 bg = oklch2rgb(vec3(0.04, 0.025, 4.3));

    // Particle glow color
    vec3 glowCol = oklch2rgb(vec3(
        clamp(lightness, 0.03, 0.60),
        clamp(chroma, 0.02, 0.15),
        hue
    ));

    // Mix
    vec3 col = mix(bg, glowCol, smoothstep(0.0, 0.01, glow));
    col += dust * oklch2rgb(vec3(0.3, 0.05, HUE_CENTER + 0.5));

    // --- Center darkening ---
    float centerDark = 1.0 - 0.25 * exp(-dot(p, p) * 3.5);
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
