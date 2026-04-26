// @fullscreen: true
// @mobile: true
// @tags: rezz, spiral, hypnotic, trance, dubstep
// @name: rezz trance

// ============================================================================
// REZZ TRANCE — one large central spiral, with fractal tendrils radiating
// from its outline like the-coat's fur fluff.
//
// Audio mapping:
//   - Normalized + smoothstep dead zones for shape modulation
//   - Slope * RSquared for confident trends (palette tilt, arm density)
//   - ZScore (clamped, decorrelated) for events (bass pulse, beat reach)
//   - Oklch palette for clean perceptual gradients
// ============================================================================

// --- Continuous shape (Normalized) ---
// Round arm count to integer to keep the wrap stable; range 5–9.
#define ARM_COUNT       (floor(mix(5.0, 9.0, smoothstep(0.10, 0.95, spectralKurtosisNormalized)) + 0.5))
#define SPIRAL_TIGHT    (mix(2.4, 4.4, smoothstep(0.20, 1.00, midsNormalized)))
#define ARM_THICKNESS   (mix(0.22, 0.40, smoothstep(0.20, 1.00, spectralEntropyMedian)))
#define SPIN_SPEED      (mix(0.18, 0.95, smoothstep(0.20, 1.00, spectralFluxNormalized)))

// --- Trends ---
#define BUILD_DRIVE     (clamp(energySlope * energyRSquared * 18.0, -1.0, 1.0))
#define HUE_TILT        (BUILD_DRIVE * 0.30)

// --- Events (decorrelated z-scores, clamped >= 0) ---
#define BASS_BEAT       (clamp(bassZScore - energyZScore, 0.0, 1.5))
#define FLUX_KICK       (clamp(spectralFluxZScore - energyZScore * 0.5, 0.0, 1.5))
#define GRIT_LEVEL      (smoothstep(0.40, 1.00, spectralRoughnessNormalized))

// --- Constants ---
#define SPIRAL_RADIUS   0.92
#define BG_HUE          0.50
#define ARM_HUE         0.55
#define VOID_DARK       0.04
#define TWO_PI          6.28318530718

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return v;
}

// Continuous log-spiral phase. Stable across angle wrap iff arm count is integer.
float spiralPhase(vec2 p, float arms, float tight) {
    float r = length(p);
    float a = atan(p.y, p.x);
    return arms * a / TWO_PI + tight * log(max(r, 0.001));
}

// Returns signed-distance-like value for the spiral arm pattern.
// Positive (1.0) = on the arm. Negative (0.0) = in the gap.
float spiralBand(float phase, float thickness) {
    float band = abs(fract(phase) - 0.5);
    return 1.0 - smoothstep(thickness * 0.35, thickness * 0.55, band);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 fbUv = fragCoord / iResolution.xy;

    float t = time * 0.20;
    float spinT = time * SPIN_SPEED;

    float r = length(uv);

    // Bass-driven breathing radius
    float breath = BASS_BEAT * 0.04;
    float spiralRadius = SPIRAL_RADIUS + breath;

    float arms = ARM_COUNT;
    float thickness = ARM_THICKNESS + GRIT_LEVEL * 0.03;

    // ---- Three spiral patterns at different scales ----
    // Layer 1 — main spiral (dominant, large arms)
    vec2 warpV = vec2(fbm(uv * 6.0 + t), fbm(uv * 6.0 - t)) - 0.5;
    vec2 sp1 = uv + warpV * (0.020 + GRIT_LEVEL * 0.020);
    float phase1 = spiralPhase(sp1, arms, SPIRAL_TIGHT) - spinT;
    float arm1   = spiralBand(phase1, thickness);

    // Layer 2 — medium spiral (counter-rotating)
    float arms2  = floor(arms * 2.0 + 1.0);
    float tight2 = SPIRAL_TIGHT * 1.6;
    float phase2 = spiralPhase(uv * 1.05, arms2, tight2) + spinT * 1.6;
    float arm2   = spiralBand(phase2, thickness * 0.55);

    // Layer 3 — fine spiral (very tight, used as boundary modulator + tendrils)
    float arms3  = floor(arms * 4.0 + 1.0);
    float tight3 = SPIRAL_TIGHT * 2.2;
    float phase3 = spiralPhase(uv * 1.10, arms3, tight3) - spinT * 2.4;
    float arm3   = spiralBand(phase3, thickness * 0.40);
    // Smooth wave version of layer 3 for boundary displacement
    float wave3  = sin(phase3 * TWO_PI);

    // ---- Spiral-shaped boundary ----
    // The outline literally swirls: layer-3 spiral wave displaces the rim
    // outward and inward in a tight curl pattern, plus large slow tongues
    // from a low-freq angular fbm push some sectors much further out.
    float angle = atan(uv.y, uv.x);
    float tongueN = fbm(vec2(angle * 2.0, t * 0.35));
    tongueN = smoothstep(0.40, 0.95, tongueN);

    float swirlAmp  = 0.085 + GRIT_LEVEL * 0.060 + max(0.0, BUILD_DRIVE) * 0.060 + BASS_BEAT * 0.045;
    float tongueAmp = 0.090 + BASS_BEAT * 0.090 + max(0.0, BUILD_DRIVE) * 0.080;

    float fluffyRadius = spiralRadius + wave3 * swirlAmp + tongueN * tongueAmp;

    // ---- Layer composition ----
    float innerFade = smoothstep(0.03, 0.09, r);
    // Layer 1 — fills interior, carved by the swirly boundary
    float mask1 = smoothstep(fluffyRadius, fluffyRadius - 0.18, r);
    // Layer 2 — wider band straddling the boundary
    float band2 = exp(-pow((r - fluffyRadius) / 0.22, 2.0));
    // Layer 3 — sharper band right ON the boundary, fading just past it
    float band3 = exp(-pow((r - fluffyRadius) / 0.10, 2.0));

    float outlineGain = 0.55 + GRIT_LEVEL * 0.35 + max(0.0, BUILD_DRIVE) * 0.40 + BASS_BEAT * 0.20;

    // Main interior spiral
    float spiralCore = arm1 * mask1 * innerFade;
    // Outline mini-spirals (layer 2 medium + layer 3 fine) — these are the
    // "spirals on the outline" the rim wears
    float outlineSpiral = arm2 * band2 * 0.65 * outlineGain
                        + arm3 * band3 * 0.85 * outlineGain;
    outlineSpiral = clamp(outlineSpiral, 0.0, 1.0);

    float spiral = clamp(spiralCore + outlineSpiral * 0.6, 0.0, 1.0);

    // Tendril mask — fine spirals reaching past the rim into the void
    float beyondRim = smoothstep(-0.02, 0.04, r - fluffyRadius);
    float tendrilMask = (arm3 * band3 * 1.1 + arm2 * band2 * 0.4) * outlineGain * beyondRim;
    tendrilMask = clamp(tendrilMask, 0.0, 0.95);

    // ---- Background ----
    float voidF = smoothstep(0.30, 0.85, fbm(uv * 1.6 + t * 0.1));
    float vig = 1.0 - 0.6 * dot(uv, uv) * 0.4;

    // ---- Color ----
    float bgHue = BG_HUE;
    float bgL   = mix(VOID_DARK, 0.16, voidF) * vig;
    vec3  bgCol = oklch2rgb(vec3(bgL, 0.16 + voidF * 0.04, bgHue));

    vec3 coreCol    = oklch2rgb(vec3(0.62, 0.23, ARM_HUE));
    // Outline mini-spirals are slightly brighter so they read as decorative
    vec3 outlineCol = oklch2rgb(vec3(0.74, 0.22, ARM_HUE + 0.04));
    vec3 tCol       = oklch2rgb(vec3(0.66, 0.22, ARM_HUE - 0.02));

    vec3 col = bgCol;
    col = mix(col, tCol, clamp(tendrilMask, 0.0, 0.95));
    col = mix(col, coreCol, spiralCore);
    col = mix(col, outlineCol, clamp(outlineSpiral, 0.0, 0.95));

    // Feedback for trail
    vec2 toCenter = (vec2(0.5) - fbUv) * 0.0028;
    vec3 prev = getLastFrameColor(fbUv + toCenter).rgb;
    vec3 prevLch = rgb2oklch(prev);
    prevLch.x = max(prevLch.x * 0.965, 0.0);
    prevLch.y = clamp(prevLch.y, 0.0, 0.26);
    prevLch.z = mix(prevLch.z, bgHue, 0.06);
    vec3 prevDecayed = oklch2rgb(prevLch);
    float feedback = mix(0.55, 0.18, max(spiral, tendrilMask));
    col = mix(col, prevDecayed, feedback);

    col = col / (1.0 + col * 0.25);
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
