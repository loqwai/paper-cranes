// @fullscreen: true
// @mobile: true
// @tags: chromadepth, graph, regression, oscilloscope, analytics, story
// @favorite: true
// ChromaDepth Music Story — 8-feature scrolling analytics dashboard
// Each feature chosen for maximally distinct temporal behavior.
// Z-score waveforms show the "now", slope fills show the "trend",
// width driven by a complementary feature, glow by medians.
// Stippled glows and hue-aging trails blend engineering with art.
//
// Temporal signatures:
//   bass:        slow heavy swells (kicks, sub-bass)
//   rolloff:     high-freq cutoff (bright vs muffled, WHERE energy lives)
//   flux:        sharp transient bursts (any timbral change)
//   entropy:     smooth slow wandering (noise vs tone)
//   roughness:   gritty mid-speed (dissonance, distortion)
//   crest:       peaky inverse-of-entropy (pure tones spike it)
//   pitchClass:  discrete note steps (quantized jumps)
//   mids:        mid-range body/warmth (vocals, instruments)

// ============================================================================
// FEATURE DEFINITIONS (8 independent features, each visually distinct)
// Z=zScore, S=slope, R=rSquared, N=normalized, W=width, G=glow, H=hue shift
// ============================================================================

// --- Energy-correlated: subtract energyZScore to show CHARACTER not volume ---

// Slow heavy swells — width: roughness, glow: energy median
#define F0_Z (bassZScore - energyZScore)
#define F0_S bassSlope
#define F0_R bassRSquared
#define F0_N bassNormalized
#define F0_W spectralRoughnessNormalized
#define F0_G energyMedian
#define F0_H spectralCentroidNormalized  // pitch center tints bass hue

// High-freq cutoff point — width: crest, glow: centroid median
#define F1_Z spectralRolloffZScore
#define F1_S spectralRolloffSlope
#define F1_R spectralRolloffRSquared
#define F1_N spectralRolloffNormalized
#define F1_W spectralCrestNormalized
#define F1_G spectralCentroidMedian
#define F1_H pitchClassNormalized        // which note tints rolloff hue

// Sharp transient bursts — width: energy, glow: mids median
#define F2_Z (spectralFluxZScore - energyZScore * 0.5)
#define F2_S spectralFluxSlope
#define F2_R spectralFluxRSquared
#define F2_N spectralFluxNormalized
#define F2_W energyNormalized
#define F2_G midsMedian
#define F2_H spectralKurtosisNormalized  // peakedness tints flux hue

// Gritty mid-speed — width: treble, glow: bass median
#define F4_Z (spectralRoughnessZScore - energyZScore * 0.3)
#define F4_S spectralRoughnessSlope
#define F4_R spectralRoughnessRSquared
#define F4_N spectralRoughnessNormalized
#define F4_W trebleNormalized
#define F4_G bassMedian
#define F4_H spectralFluxNormalized      // change rate tints roughness hue

// --- Energy-independent: measure shape/quality, not magnitude ---

// Smooth slow wandering — width: bass, glow: spread median
#define F3_Z spectralEntropyZScore
#define F3_S spectralEntropySlope
#define F3_R spectralEntropyRSquared
#define F3_N spectralEntropyNormalized
#define F3_W bassNormalized
#define F3_G spectralSpreadMedian
#define F3_H trebleNormalized            // brightness tints entropy hue

// Peaky inverse-of-entropy — width: entropy, glow: kurtosis median
#define F5_Z spectralCrestZScore
#define F5_S spectralCrestSlope
#define F5_R spectralCrestRSquared
#define F5_N spectralCrestNormalized
#define F5_W spectralEntropyNormalized
#define F5_G spectralKurtosisMedian
#define F5_H spectralSkewNormalized      // harmonic tilt tints crest hue

// Discrete note steps — width: kurtosis, glow: rolloff median
#define F6_Z pitchClassZScore
#define F6_S pitchClassSlope
#define F6_R pitchClassRSquared
#define F6_N pitchClassNormalized
#define F6_W spectralKurtosisNormalized
#define F6_G spectralRolloffMedian
#define F6_H midsNormalized              // mid-range warmth tints pitch hue

// Mid-range body/warmth — width: centroid, glow: treble median
#define F7_Z (midsZScore - energyZScore * 0.5)
#define F7_S midsSlope
#define F7_R midsRSquared
#define F7_N midsNormalized
#define F7_W spectralCentroidNormalized
#define F7_G trebleMedian
#define F7_H spectralSpreadNormalized    // harmonic width tints mids hue

// --- Globals ---
#define BEAT_PULSE (beat ? 1.0 : 0.0)
// #define BEAT_PULSE 0.0

// --- Layout ---
#define NUM_ROWS 8.0
#define MARGIN 0.03
#define GAP 0.005
#define USABLE_H (1.0 - 2.0 * MARGIN - GAP * (NUM_ROWS - 1.0))
#define ROW_H (USABLE_H / NUM_ROWS)
#define ROW_Y(i) (MARGIN + ROW_H * 0.5 + (i) * (ROW_H + GAP))

// ============================================================================
// NOISE / STIPPLE
// ============================================================================

float hash21(vec2 p) {
    p = fract(p * vec2(253.37, 471.53));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

// Smooth value noise for organic texture
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// ============================================================================
// CHROMADEPTH
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    // Oklch: perceptually uniform hue wheel — no teal clumping
    // Hue sweeps red(0) → orange → yellow → green → blue → violet(~4.5 rad)
    float hue = t * 4.5 + 0.4;  // 0.4 rad (red) → 4.9 rad (violet)
    float L = 0.72 - t * 0.12;  // slightly darker toward violet
    float C = 0.18 - t * 0.02;  // slightly less chroma toward violet
    return oklch2rgb(vec3(L, C, hue));
}

// ============================================================================
// ROW RENDERER
// ============================================================================

vec4 drawRow(vec2 fc, vec2 res, float zScore, float slope, float rSq,
             float norm, float widthMod, float glowMod, float hueMod,
             float rowCenter, float idx) {
    float pixY = fc.y / res.y;
    float halfH = ROW_H * 0.5;

    // Expanded bounds for glow bleed between rows
    if (pixY > rowCenter + halfH + 0.015 || pixY < rowCenter - halfH - 0.015)
        return vec4(0.0);

    float localY = (pixY - rowCenter) / ROW_H; // -0.5 to 0.5
    vec3 col = vec3(0.0);
    float a = 0.0;

    // Stipple seed unique per row and pixel
    float stip = hash21(fc + idx * 137.0);

    // --- Row color (chromadepth, shifted by slope + audio-driven hue) ---
    float depth = idx / NUM_ROWS;
    float sShift = clamp(-slope * 8.0, -0.12, 0.12) * rSq;
    // Each row's hue nudged by a unique audio feature (±0.08 range)
    float hShift = (hueMod - 0.5) * 0.16;
    float depthFinal = clamp(depth + sShift + hShift, 0.0, 1.0);
    vec3 rc = chromadepth(depthFinal);

    // --- Soft row boundary (gradient fade instead of hard line) ---
    float edgeDist = (0.5 - abs(localY)) * ROW_H * res.y;
    float edgeFade = smoothstep(0.0, 3.0, edgeDist);
    // Stippled edge: some pixels fade earlier for organic feel
    edgeFade = smoothstep(stip * 0.3, 1.0, edgeFade);

    // --- Center reference (stippled dotted line) ---
    float cPx = abs(localY) * ROW_H * res.y;
    float cLine = smoothstep(0.7, 0.0, cPx) * 0.025;
    // Stipple the center line into dots
    cLine *= step(0.65, stip);
    col += rc * 0.4 * cLine;
    a = max(a, cLine);

    // --- Normalized fill (stippled background showing overall level) ---
    float normY = -0.5 + norm * 0.85;
    if (localY < normY) {
        // Stippled fill: denser near the fill edge, sparser deeper
        float fillDensity = 0.15 + 0.25 * smoothstep(normY - 0.3, normY, localY);
        float fillStip = step(1.0 - fillDensity, stip);
        float fa = fillStip * 0.08;
        col += rc * fa;
        a = max(a, fa);
    }

    // --- Slope trend fill (stippled, from center toward slope direction) ---
    float sv = clamp(slope * 18.0, -0.38, 0.38);
    if ((sv > 0.0 && localY > 0.0 && localY < sv) ||
        (sv < 0.0 && localY < 0.0 && localY > sv)) {
        // Density increases with rSquared (confident = denser stipple)
        float slopeDensity = rSq * 0.5;
        float slopeStip = step(1.0 - slopeDensity, stip);
        float sa = slopeStip * 0.2;
        vec3 sc = (sv > 0.0)
            ? chromadepth(max(depthFinal - 0.12, 0.0))
            : chromadepth(min(depthFinal + 0.12, 1.0));
        col += sc * sa;
        a = max(a, sa);
    }

    // --- Confident trend accent (warm/cool particles at trend edge) ---
    float trendSignal = rSq * min(abs(slope) * 20.0, 1.0);
    if (trendSignal > 0.25) {
        float accentY = clamp(sv, -0.42, 0.42);
        float accentPx = abs(localY - accentY) * ROW_H * res.y;
        float accent = smoothstep(4.0, 0.0, accentPx) * (trendSignal - 0.25) * 0.5;
        // Stipple the accent for sparkle effect
        accent *= 0.5 + stip * 0.8;
        vec3 accentColor = (sv > 0.0) ? vec3(1.0, 0.75, 0.35) : vec3(0.35, 0.7, 1.0);
        col += accentColor * accent;
        a = max(a, accent);
    }

    // --- Z-SCORE LINE (main waveform with organic edge) ---
    float zVal = clamp(zScore * 0.7, -0.45, 0.45);
    float zPx = abs(localY - zVal) * ROW_H * res.y;

    // Width driven by complementary feature
    float lw = 0.6 + widthMod * 4.5 + abs(zScore) * 0.4;

    // Organic edge: noise wiggles the line boundary
    float edgeNoise = (stip - 0.5) * 1.2;
    float line = smoothstep(lw + 1.0 + edgeNoise, max(lw - 0.5, 0.0), zPx);

    // Stippled glow: median drives radius/intensity, noise breaks it into particles
    float glowRadius = lw * (3.0 + glowMod * 10.0);
    float glowIntensity = 0.03 + glowMod * 0.22;
    float rawGlow = smoothstep(glowRadius, lw * 0.5, zPx);
    // Stipple the glow: probability of a "particle" existing falls off with distance
    float glowParticle = step(1.0 - rawGlow * rawGlow, stip);
    float glow = glowParticle * rawGlow * glowIntensity;

    // Glow color: shifts toward white when sustained, with slight hue variation per particle
    float hueJitter = (stip - 0.5) * 0.06;
    vec3 glowColor = chromadepth(clamp(depthFinal + hueJitter, 0.0, 1.0));
    glowColor = mix(glowColor, vec3(1.0), glowMod * 0.3);

    // Core line color
    vec3 lc = rc * (1.0 + abs(zScore) * 0.25);
    lc *= 1.0 + clamp(trendSignal, 0.0, 0.2);

    col += lc * line + glowColor * glow;
    a = max(a, line + glow);

    // Apply edge fade
    col *= edgeFade;
    a *= edgeFade;

    return vec4(col, clamp(a, 0.0, 1.0));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    // --- SCROLLING ---
    float px = floor(fragCoord.x);
    float last = floor(res.x) - 1.0;

    if (px < last) {
        vec2 prevUV = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        vec4 prev = getLastFrameColor(prevUV);

        // Trail decay
        prev.rgb *= 0.9985;

        // Hue aging in oklch: perceptually uniform drift toward cool
        vec3 prevLCH = rgb2oklch(max(prev.rgb, 0.001));
        prevLCH.z += 0.003;    // tiny hue drift per frame (perceptually even)
        prevLCH.y *= 0.9997;   // very slowly desaturate
        prev.rgb = oklch2rgb(prevLCH);

        prev.rgb *= 1.0 + BEAT_PULSE * 0.004;

        fragColor = prev;
        return;
    }

    // --- DRAW NEW COLUMN (rightmost pixel) ---

    // Subtle background: deep navy gradient instead of pure black
    float bgGrad = uv.y * 0.012 + 0.003;
    fragColor = vec4(vec3(0.0, 0.002, bgGrad), 1.0);

    vec4 r;

    r = drawRow(fragCoord, res, F0_Z, F0_S, F0_R, F0_N, F0_W, F0_G, F0_H, ROW_Y(0.0), 0.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    r = drawRow(fragCoord, res, F1_Z, F1_S, F1_R, F1_N, F1_W, F1_G, F1_H, ROW_Y(1.0), 1.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    r = drawRow(fragCoord, res, F2_Z, F2_S, F2_R, F2_N, F2_W, F2_G, F2_H, ROW_Y(2.0), 2.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    r = drawRow(fragCoord, res, F3_Z, F3_S, F3_R, F3_N, F3_W, F3_G, F3_H, ROW_Y(3.0), 3.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    r = drawRow(fragCoord, res, F4_Z, F4_S, F4_R, F4_N, F4_W, F4_G, F4_H, ROW_Y(4.0), 4.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    r = drawRow(fragCoord, res, F5_Z, F5_S, F5_R, F5_N, F5_W, F5_G, F5_H, ROW_Y(5.0), 5.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    r = drawRow(fragCoord, res, F6_Z, F6_S, F6_R, F6_N, F6_W, F6_G, F6_H, ROW_Y(6.0), 6.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    r = drawRow(fragCoord, res, F7_Z, F7_S, F7_R, F7_N, F7_W, F7_G, F7_H, ROW_Y(7.0), 7.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // --- GLOBAL STORY DETECTION ---

    int spikes = 0;
    if (abs(F0_Z) > 0.6) spikes++;
    if (abs(F1_Z) > 0.6) spikes++;
    if (abs(F2_Z) > 0.6) spikes++;
    if (abs(F3_Z) > 0.6) spikes++;
    if (abs(F4_Z) > 0.6) spikes++;
    if (abs(F5_Z) > 0.6) spikes++;
    if (abs(F6_Z) > 0.6) spikes++;
    if (abs(F7_Z) > 0.6) spikes++;

    if (spikes >= 3) {
        fragColor.rgb += vec3(0.04) * float(spikes) / 8.0;
    }

    // Average confident trend direction
    float trend = (F0_S*F0_R + F1_S*F1_R + F2_S*F2_R + F3_S*F3_R
                 + F4_S*F4_R + F5_S*F5_R + F6_S*F6_R + F7_S*F7_R) * 0.125;
    float t = clamp(trend * 40.0, -1.0, 1.0);
    fragColor.rgb += (t > 0.0) ? vec3(0.01, 0.003, 0.0) * t
                                : vec3(0.0, 0.003, 0.01) * abs(t);

    fragColor.rgb *= 1.0 + BEAT_PULSE * 0.1;

    fragColor.rgb = clamp(fragColor.rgb, 0.0, 1.0);
    fragColor.a = 1.0;
}
