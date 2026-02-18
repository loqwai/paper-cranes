// @fullscreen: true
// @mobile: true
// @tags: ambient, trends, regression

// ============================================================================
// TREND-DRIVEN PARAMETERS
// Uses median for stable baselines, slope*rSquared for confident trend
// evolution. The visual breathes with the music's character over time
// rather than jittering on every transient.
// ============================================================================

// --- Shape & Scale (bass domain) ---
#define BASE_SCALE (1.8 + bassMedian * 0.6)
#define SCALE_TREND (bassSlope * bassRSquared * 0.4)

// --- Color hue (spectral centroid - where the "center" of the sound is) ---
#define HUE_BASE (spectralCentroidMedian * 0.8)
#define HUE_DRIFT (spectralCentroidSlope * spectralCentroidRSquared * 0.3)

// --- Complexity (entropy domain - chaos vs order) ---
#define COMPLEXITY_BASE (spectralEntropyMedian)
#define COMPLEXITY_TREND (spectralEntropySlope * spectralEntropyRSquared * 0.5)

// --- Intensity (energy domain) ---
#define INTENSITY_TREND (energySlope * energyRSquared)
#define ENERGY_LEVEL (energyMedian)

// --- Texture grain (roughness domain - dissonance) ---
#define GRAIN (spectralRoughnessMedian * 0.3)

// --- High frequency detail (treble domain) ---
#define DETAIL_TREND (trebleSlope * trebleRSquared * 0.2)

// --- Immediate reactivity (small amount, layered on top) ---
#define FLUX_KICK (spectralFluxZScore * 0.15)
#define BASS_PULSE (bassZScore * 0.08)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);

    // Slow time that drifts with energy trends
    float t = iTime * 0.08 + INTENSITY_TREND * 0.5;

    // --- Layered noise (fbm) for nebula structure ---
    float scale = BASE_SCALE + SCALE_TREND;
    float complexity = 3.0 + COMPLEXITY_BASE * 4.0 + COMPLEXITY_TREND * 2.0;
    int octaves = int(clamp(complexity, 3.0, 7.0));

    vec2 p = uv * scale;

    // Drift the noise space slowly based on trends
    p += vec2(
        sin(t * 1.1) * 0.3 + HUE_DRIFT * 0.5,
        cos(t * 0.9) * 0.3 + DETAIL_TREND * 0.5
    );

    // FBM with trend-driven rotation per octave
    float f = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    mat2 rot = mat2(cos(0.5 + t * 0.1), sin(0.5 + t * 0.1),
                    -sin(0.5 + t * 0.1), cos(0.5 + t * 0.1));

    for (int i = 0; i < 7; i++) {
        if (i >= octaves) break;
        // Grain adds high-frequency jitter to the noise lookup
        vec2 np = p * freq + float(i) * 1.7 + GRAIN * 0.5;
        float n = sin(np.x + sin(np.y + t)) * cos(np.y - cos(np.x - t * 0.7));
        f += n * amp;
        amp *= 0.5 + DETAIL_TREND * 0.1;
        freq *= 2.0 + GRAIN * 0.3;
        p = rot * p;
    }

    f = f * 0.5 + 0.5; // normalize to 0-1

    // --- Color from spectral centroid trend ---
    float hue = HUE_BASE + HUE_DRIFT + f * 0.15 + t * 0.05;
    float sat = 0.5 + ENERGY_LEVEL * 0.4;
    float lum = f * (0.3 + ENERGY_LEVEL * 0.25);

    // Brighten on confident energy rises
    lum += max(0.0, INTENSITY_TREND) * 0.15;

    // Subtle immediate pulse on flux spikes
    lum += max(0.0, FLUX_KICK) * f;

    vec3 col = hsl2rgb(vec3(fract(hue), clamp(sat, 0.0, 1.0), clamp(lum, 0.0, 0.85)));

    // Add subtle warm highlights on bass pulses
    float highlight = smoothstep(0.6, 0.9, f) * max(0.0, BASS_PULSE);
    col += vec3(0.3, 0.15, 0.05) * highlight;

    // --- Frame feedback: slow trails that evolve with trends ---
    vec2 fbUv = fragCoord / iResolution.xy;

    // Feedback UV drifts with trends (not random - directional)
    vec2 fbOffset = vec2(
        SCALE_TREND * 0.003,
        HUE_DRIFT * 0.003
    );
    // Gentle zoom toward center based on energy trend
    vec2 center = vec2(0.5);
    vec2 toCenter = (center - fbUv) * 0.002 * (1.0 + INTENSITY_TREND * 0.5);

    vec4 prev = getLastFrameColor(fbUv + fbOffset + toCenter);
    vec3 prevCol = prev.rgb;

    // Decay rate adapts: stable music = longer trails, chaotic = shorter
    float stability = clamp(1.0 - COMPLEXITY_BASE, 0.0, 1.0);
    float decay = 0.88 + stability * 0.08; // 0.88 to 0.96

    // Fade previous frame slightly to prevent white accumulation
    prevCol *= decay;

    // Mix: favor new content when there's a confident trend change
    float trendStrength = clamp(
        abs(INTENSITY_TREND) + abs(SCALE_TREND) + abs(HUE_DRIFT),
        0.0, 1.0
    );
    float mixAmt = 0.12 + trendStrength * 0.15 + max(0.0, FLUX_KICK) * 0.2;

    col = mix(prevCol, col, clamp(mixAmt, 0.05, 0.4));

    // Subtle vignette
    float vig = 1.0 - 0.4 * dot(uv, uv);
    col *= vig;

    fragColor = vec4(col, 1.0);
}
