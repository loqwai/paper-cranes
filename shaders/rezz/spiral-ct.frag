// @fullscreen: true
// @mobile: true
// @tags: rezz, spiral, hypnotic, trance, dubstep
// @name: rezz trance

// ============================================================================
// REZZ TRANCE — one large central spiral with sophisticated stripe variation:
// per-arm width breathing, internal fur/grain texture, traveling bass pulses,
// hue gradients along arm length, fluff-displaced edges, and counter-rotating
// mini-spirals on the outline.
//
// Audio mapping (pulled across many independent features so different songs
// feel different):
//   bass        → outline breath, traveling pulse, eye widen
//   mids        → spiral tightness, cross-grain ridges
//   treble      → stripe sparkle glints
//   energy      → overall luminance, tendril gain
//   pitchClass  → hue drift along arm length
//   kurtosis    → arm count
//   flux        → spin speed, stripe shimmer
//   entropy     → outline thickness, internal grain frequency
//   roughness   → fur agitation amplitude
//   centroid    → palette warmth tilt
//   slope*r²    → confident-build gain (extends tendrils, brightens tips)
// ============================================================================

// --- Continuous shape (Normalized + smoothstep dead zones) ---
#define ARM_COUNT       (floor(mix(5.0, 9.0, smoothstep(0.10, 0.95, spectralKurtosisNormalized)) + 0.5))
#define SPIRAL_TIGHT    (mix(2.4, 4.4, smoothstep(0.20, 1.00, midsNormalized)))
#define ARM_THICKNESS   (mix(0.22, 0.40, smoothstep(0.20, 1.00, spectralEntropyMedian)))
#define SPIN_SPEED      (mix(0.18, 0.95, smoothstep(0.20, 1.00, spectralFluxNormalized)))

// --- Trends (slope·rSquared, scaled up; raw slope is tiny) ---
#define BUILD_DRIVE     (clamp(energySlope * energyRSquared * 18.0, -1.0, 1.0))
#define HUE_TILT        (BUILD_DRIVE * 0.30 + (spectralCentroidNormalized - 0.5) * 0.20)

// --- Events (decorrelated z-scores, clamped >= 0) ---
#define BASS_BEAT       (clamp(bassZScore - energyZScore, 0.0, 1.5))
#define FLUX_KICK       (clamp(spectralFluxZScore - energyZScore * 0.5, 0.0, 1.5))
#define TREBLE_KICK     (clamp(trebleZScore - energyZScore * 0.5, 0.0, 1.5))
#define GRIT_LEVEL      (smoothstep(0.40, 1.00, spectralRoughnessNormalized))

// --- Texture-modulating features ---
#define GRAIN_FREQ      (12.0 + spectralEntropyMedian * 24.0 + GRIT_LEVEL * 12.0)
#define GRAIN_AMP       (0.18 + GRIT_LEVEL * 0.30 + FLUX_KICK * 0.18)
#define WIDTH_PULSE     (BASS_BEAT * 0.55 + bassNormalized * 0.18)
#define LENGTH_TAPER    (mix(-0.12, 0.18, smoothstep(0.20, 1.00, midsMedian)))
#define LUMA_PUMP       (0.85 + energyMedian * 0.18 + clamp(energyZScore, 0.0, 1.5) * 0.10)
#define SPARKLE_GAIN    (smoothstep(0.30, 1.00, trebleNormalized) + TREBLE_KICK * 0.5)
#define HUE_DRIFT       (pitchClassNormalized * 0.18 + time * 0.012)
#define BUILD_GAIN      (max(0.0, BUILD_DRIVE))

// --- Constants ---
#define SPIRAL_RADIUS   0.92
#define BG_HUE          0.50
#define ARM_HUE         0.55
#define VOID_DARK       0.04
#define TWO_PI          6.28318530718
#define PHI             1.61803398875

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
    mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p = m * p * 2.03;
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

// Soft band: returns 1 on the centerline, 0 in the gap, with smooth edges.
float spiralBand(float phase, float thickness) {
    float band = abs(fract(phase) - 0.5);
    return 1.0 - smoothstep(thickness * 0.35, thickness * 0.55, band);
}

// Arm-aware band: each arm gets its own width via per-arm-index modulation,
// plus a length-taper so width varies as you travel outward along the arm,
// plus a noise-driven fur perturbation on the band edges.
//
// Returns vec2(armMask, distFromArmCenter). distFromArmCenter is 0 on the
// arm centerline, ~0.5 in the gap — used downstream for stripe-internal
// shading (grain, cross-ridges, sparkle).
vec2 armBandRich(float phase, vec2 p, float baseThickness, float t,
                 float widthPulse, float lengthTaper, float furAmp) {
    float r = length(p);

    // ---- Per-arm width: each arm-index gets its own static width offset ----
    // The integer part of the phase identifies which arm we're on (or gap).
    // We pick a stable per-arm hash so each stripe has its own personality.
    float armIdx = floor(phase + 0.5);
    float armChar = hash(vec2(armIdx, 7.31)) - 0.5;
    // Some arms are slightly thicker, some thinner — character of the spiral.
    float armWidthBias = armChar * 0.18;

    // ---- Length taper: thickness varies along arm length (log-radial) ----
    // Positive lengthTaper = thicker at the rim; negative = tapers to point.
    float taperFactor = 1.0 + lengthTaper * (log(max(r, 0.05)) - log(0.4));

    // ---- Width pulse: bass-driven heartbeat travels outward along arm ----
    // Wave packet of period TWO_PI in phase, traveling outward in r.
    // pulseWave is 0..1, peaks where the wave hits.
    float pulseTravel = log(max(r, 0.001)) * 4.0 - t * 3.5;
    float pulseWave = pow(0.5 + 0.5 * sin(pulseTravel), 6.0);
    float widthMod = 1.0 + widthPulse * pulseWave * 0.35;

    // ---- Noise fluff on the edges (the-coat fur trick) ----
    // Sample fbm in (along-arm, across-arm) space so the fluff streaks along
    // the arm direction instead of just being random.
    float alongArm  = log(max(r, 0.001)) * 6.0;
    float acrossArm = (fract(phase) - 0.5) * 12.0;
    float furN = fbm(vec2(alongArm, acrossArm) * 1.6 + t * 0.4);
    float furDisp = (furN - 0.5) * furAmp;

    float thickness = baseThickness * (1.0 + armWidthBias) * taperFactor * widthMod;
    thickness = max(thickness, 0.06);

    float band = abs(fract(phase) - 0.5);
    band += furDisp;  // fluff-displaced band centre
    float mask = 1.0 - smoothstep(thickness * 0.35, thickness * 0.55, band);

    return vec2(mask, band);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 fbUv = fragCoord / iResolution.xy;

    float t = time * 0.20;
    float spinT = time * SPIN_SPEED;

    float r = length(uv);
    float angle = atan(uv.y, uv.x);

    // Bass-driven boundary breathing
    float breath = BASS_BEAT * 0.04;
    float spiralRadius = SPIRAL_RADIUS + breath;

    float arms = ARM_COUNT;
    float baseThick = ARM_THICKNESS + GRIT_LEVEL * 0.03;

    // ---- Layer 1: main spiral with rich per-arm modulation ----
    vec2 warpV = vec2(fbm(uv * 6.0 + t), fbm(uv * 6.0 - t)) - 0.5;
    vec2 sp1 = uv + warpV * (0.020 + GRIT_LEVEL * 0.020);
    float phase1 = spiralPhase(sp1, arms, SPIRAL_TIGHT) - spinT;
    vec2 armRes1 = armBandRich(phase1, uv, baseThick, time,
                                WIDTH_PULSE, LENGTH_TAPER,
                                0.020 + GRIT_LEVEL * 0.030);
    float arm1 = armRes1.x;
    float distFromCenter1 = armRes1.y;        // 0 on arm centerline

    // ---- Layer 2: medium counter-rotating spiral ----
    float arms2  = floor(arms * 2.0 + 1.0);
    float tight2 = SPIRAL_TIGHT * 1.6;
    float phase2 = spiralPhase(uv * 1.05, arms2, tight2) + spinT * 1.6;
    float arm2 = spiralBand(phase2, baseThick * 0.55);

    // ---- Layer 3: fine outline spiral + boundary modulator ----
    float arms3  = floor(arms * 4.0 + 1.0);
    float tight3 = SPIRAL_TIGHT * 2.2;
    float phase3 = spiralPhase(uv * 1.10, arms3, tight3) - spinT * 2.4;
    float arm3 = spiralBand(phase3, baseThick * 0.40);
    float wave3 = sin(phase3 * TWO_PI);

    // ---- Spiral-shaped boundary ----
    float tongueN = smoothstep(0.40, 0.95, fbm(vec2(angle * 2.0, t * 0.35)));
    float swirlAmp  = 0.085 + GRIT_LEVEL * 0.060 + BUILD_GAIN * 0.060 + BASS_BEAT * 0.045;
    float tongueAmp = 0.090 + BASS_BEAT * 0.090 + BUILD_GAIN * 0.080;
    float fluffyRadius = spiralRadius + wave3 * swirlAmp + tongueN * tongueAmp;

    // ---- Layer composition masks ----
    float innerFade = smoothstep(0.03, 0.09, r);
    float mask1 = smoothstep(fluffyRadius, fluffyRadius - 0.18, r);
    float band2 = exp(-pow((r - fluffyRadius) / 0.22, 2.0));
    float band3 = exp(-pow((r - fluffyRadius) / 0.10, 2.0));

    float outlineGain = 0.55 + GRIT_LEVEL * 0.35 + BUILD_GAIN * 0.40 + BASS_BEAT * 0.20;

    float spiralCore = arm1 * mask1 * innerFade;
    float outlineSpiral = arm2 * band2 * 0.65 * outlineGain
                        + arm3 * band3 * 0.85 * outlineGain;
    outlineSpiral = clamp(outlineSpiral, 0.0, 1.0);

    float spiral = clamp(spiralCore + outlineSpiral * 0.6, 0.0, 1.0);

    // Tendril mask — fine spirals reaching past the rim into the void
    float beyondRim = smoothstep(-0.02, 0.04, r - fluffyRadius);
    float tendrilMask = (arm3 * band3 * 1.1 + arm2 * band2 * 0.4) * outlineGain * beyondRim;
    tendrilMask = clamp(tendrilMask, 0.0, 0.95);

    // ========================================================================
    // STRIPE-INTERNAL TEXTURE LAYERS (the "above and beyond" the-coat sauce)
    // ========================================================================

    // ---- Internal fur/grain ----
    // High-frequency fbm sampled in (along-arm, across-arm) coords so the
    // grain streaks ALONG the arm. Speed scrolls with treble for shimmer.
    float grainAlong  = log(max(r, 0.001)) * GRAIN_FREQ;
    float grainAcross = (fract(phase1) - 0.5) * 28.0;
    float grainScroll = time * (0.6 + spectralFluxNormalized * 1.4);
    float grainN = fbm(vec2(grainAlong, grainAcross) * 0.55 + vec2(grainScroll, 0.0));
    grainN = (grainN - 0.5) * 2.0;        // -1..+1

    // ---- Cross-ridges ----
    // Perpendicular ridges across the arm. Frequency rises with mids body.
    // Phase is the across-arm direction so ridges wrap with the spiral.
    float ridgeFreq = 18.0 + midsMedian * 30.0;
    float ridge = sin(grainAlong * 1.2 + t * 1.0) * 0.5 + 0.5;
    ridge = pow(ridge, 4.0) * smoothstep(0.30, 0.95, midsNormalized);

    // ---- Bass pulse running outward along the arm ----
    // Wavefront expanding from centre, brightest where it hits.
    float pulseWave = log(max(r, 0.001)) * 4.0 - time * 3.5;
    float bassPulse = pow(0.5 + 0.5 * sin(pulseWave), 8.0)
                    * BASS_BEAT * 1.2
                    * arm1;     // only on the arm itself

    // ---- Treble sparkle ----
    // Tiny bright dots scattered along arms, twinkling on treble events.
    vec2 sparkleP = vec2(grainAlong * 1.4, grainAcross * 0.9 + time * 2.0);
    float sparkleHash = hash(floor(sparkleP * 3.0));
    float sparkleTime = fract(time * (0.6 + SPARKLE_GAIN * 2.0) + sparkleHash * 17.0);
    float sparklePulse = pow(1.0 - sparkleTime, 8.0) * step(0.985, sparkleHash);
    float sparkle = sparklePulse * arm1 * SPARKLE_GAIN;

    // ---- Per-arm character: alternating thick/thin patterns ----
    float armIdx1 = floor(phase1 + 0.5);
    float armChar1 = hash(vec2(armIdx1, 7.31));        // 0..1, stable per arm
    float armPersonality = armChar1 - 0.5;             // -0.5..+0.5

    // ---- Composite stripe luminance — modulate the arm mask itself ----
    // Combine grain + ridges into a per-pixel multiplier on the arm strength.
    float stripeTexture = 1.0
                        + grainN * GRAIN_AMP            // grain
                        - ridge * 0.35                  // dark cross-ridges
                        + bassPulse * 0.6               // bright pulse
                        + sparkle * 1.2;                // bright dot
    stripeTexture = clamp(stripeTexture, 0.25, 1.85);

    // Apply stripe texture to the arm mask
    float texturedArm = arm1 * stripeTexture;
    float texturedSpiral = clamp(texturedArm * mask1 * innerFade
                                 + outlineSpiral * 0.6,
                                 0.0, 1.0);

    // ---- Background ----
    float voidF = smoothstep(0.30, 0.85, fbm(uv * 1.6 + t * 0.1));
    float vig = 1.0 - 0.6 * dot(uv, uv) * 0.4;

    // ---- Color (Oklch) — palette varies along arm length and per arm ----
    float bgHue = BG_HUE + HUE_TILT * 0.4 + HUE_DRIFT * 0.3;
    float bgL   = mix(VOID_DARK, 0.16, voidF) * vig;
    vec3  bgCol = oklch2rgb(vec3(bgL, 0.16 + voidF * 0.04, bgHue));

    // Hue along arm length: deeper red at root, warmer (orange) at tip on builds.
    float lengthFrac = clamp(r / spiralRadius, 0.0, 1.0);
    float coreHue = ARM_HUE
                  + HUE_TILT
                  + HUE_DRIFT
                  + lengthFrac * (0.04 + BUILD_GAIN * 0.20)   // tip warming
                  + armPersonality * 0.05;                    // per-arm variation
    float coreL = (0.55 + lengthFrac * 0.10 + bassPulse * 0.20 + sparkle * 0.25) * LUMA_PUMP;
    float coreC = 0.22 + GRIT_LEVEL * 0.04 - ridge * 0.05;

    vec3 coreCol = oklch2rgb(vec3(coreL, coreC, coreHue));

    float outlineHue = coreHue + 0.04;
    vec3 outlineCol = oklch2rgb(vec3(0.74 * LUMA_PUMP, 0.22, outlineHue));

    float tHue = coreHue - 0.04;
    vec3 tCol  = oklch2rgb(vec3(0.66 * LUMA_PUMP, 0.22, tHue));

    // Compose
    vec3 col = bgCol;
    col = mix(col, tCol, clamp(tendrilMask, 0.0, 0.95));
    // Inside the spiral: blend by the textured strength so dark grooves show
    col = mix(col, coreCol, clamp(texturedArm * mask1 * innerFade, 0.0, 0.98));
    col = mix(col, outlineCol, clamp(outlineSpiral, 0.0, 0.95));

    // Bass pulse adds a hot additive flash riding the wavefront
    vec3 pulseCol = oklch2rgb(vec3(0.85, 0.20, coreHue + 0.05));
    col += pulseCol * bassPulse * 0.55;

    // Treble sparkles add bright punctuation
    vec3 sparkleCol = oklch2rgb(vec3(0.92, 0.16, coreHue + 0.10));
    col += sparkleCol * sparkle * 0.9;

    // ---- Feedback for hypnotic drag (decayed in Oklch) ----
    vec2 toCenter = (vec2(0.5) - fbUv) * 0.0028;
    vec3 prev = getLastFrameColor(fbUv + toCenter).rgb;
    vec3 prevLch = rgb2oklch(prev);
    prevLch.x = max(prevLch.x * 0.965, 0.0);
    prevLch.y = clamp(prevLch.y, 0.0, 0.26);
    prevLch.z = mix(prevLch.z, bgHue, 0.06);
    vec3 prevDecayed = oklch2rgb(prevLch);
    float feedback = mix(0.55, 0.18, max(spiral, tendrilMask));
    col = mix(col, prevDecayed, feedback);

    // Soft tonemap + clamp so loud passages never blow out
    col = col / (1.0 + col * 0.25);
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
