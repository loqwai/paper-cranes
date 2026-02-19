// @fullscreen: true
// @mobile: true
// @tags: graph, analytics, oscilloscope, story
// @favorite: true
// Signal Anatomy — 10-feature scrolling dashboard
// Features chosen from statistical analysis of live audio:
//
//   spectralFlux:     strongest beat correlate (2.37x spike on beats)
//   spectralKurtosis: most dynamic feature (CoV=1.118), independent
//   spectralCrest:    dramatic outlier moments (3.3% frames >1.5σ)
//   spectralEntropy:  anti-correlated with crest — chaos vs purity
//   spectralCentroid: classic brightness, correlates with treble
//   pitchClass:       completely independent from everything else
//   bass:             wide range (0.02-0.99), anti-correlated with energy
//   energy:           overall loudness, moves opposite to bass
//   bassRSquared:     trend confidence — hits 0.92 on clear builds
//   beat:             ~27 frame spacing, 295/8047 frames
//
// Layout: 10 rows with paired anti-correlates adjacent for comparison

// ============================================================================
// FEATURE DEFINITIONS
// Each row: Z=zScore, N=normalized, S=slope, R=rSquared, W=width driver, G=glow
// ============================================================================

// Row 0: Spectral flux — beat spike detector
// Width: energy (transients are louder), Glow: bass median (grounding)
#define F0_Z spectralFluxZScore
#define F0_N spectralFluxNormalized
#define F0_S spectralFluxSlope
#define F0_R spectralFluxRSquared
#define F0_W energyNormalized
#define F0_G bassMedian

// Row 1: Spectral kurtosis — most dynamic, peakedness of spectrum
// Width: entropy (peaked vs flat), Glow: flux median (activity level)
#define F1_Z spectralKurtosisZScore
#define F1_N spectralKurtosisNormalized
#define F1_S spectralKurtosisSlope
#define F1_R spectralKurtosisRSquared
#define F1_W spectralEntropyNormalized
#define F1_G spectralFluxMedian

// Row 2: Spectral crest — peak-to-average, outlier detector
// Width: kurtosis (both measure peakiness), Glow: centroid median
#define F2_Z spectralCrestZScore
#define F2_N spectralCrestNormalized
#define F2_S spectralCrestSlope
#define F2_R spectralCrestRSquared
#define F2_W spectralKurtosisNormalized
#define F2_G spectralCentroidMedian

// Row 3: Spectral entropy — anti-correlated with crest (adjacent for comparison)
// Width: crest (their anti-correlation visible as inverse width), Glow: spread median
#define F3_Z spectralEntropyZScore
#define F3_N spectralEntropyNormalized
#define F3_S spectralEntropySlope
#define F3_R spectralEntropyRSquared
#define F3_W spectralCrestNormalized
#define F3_G spectralSpreadMedian

// Row 4: Spectral centroid — brightness
// Width: treble (correlated), Glow: rolloff median (related but distinct)
#define F4_Z spectralCentroidZScore
#define F4_N spectralCentroidNormalized
#define F4_S spectralCentroidSlope
#define F4_R spectralCentroidRSquared
#define F4_W trebleNormalized
#define F4_G spectralRolloffMedian

// Row 5: Pitch class — completely independent, discrete steps
// Width: roughness (independent), Glow: mids median
#define F5_Z pitchClassZScore
#define F5_N pitchClassNormalized
#define F5_S pitchClassSlope
#define F5_R pitchClassRSquared
#define F5_W spectralRoughnessNormalized
#define F5_G midsMedian

// Row 6: Bass — low-end weight, wide range
// Width: spectral spread (low bass = narrow), Glow: energy median
#define F6_Z bassZScore
#define F6_N bassNormalized
#define F6_S bassSlope
#define F6_R bassRSquared
#define F6_W spectralSpreadNormalized
#define F6_G energyMedian

// Row 7: Energy — anti-correlated with bass (adjacent for comparison)
// Width: bass (their anti-correlation visible), Glow: treble median
#define F7_Z energyZScore
#define F7_N energyNormalized
#define F7_S energySlope
#define F7_R energyRSquared
#define F7_W bassNormalized
#define F7_G trebleMedian

// Row 8: Bass R² — trend confidence (not a waveform — a confidence meter)
// Width: bass slope magnitude, Glow: bass normalized
#define F8_Z (bassRSquared * 2.0 - 1.0)
#define F8_N bassRSquared
#define F8_S bassSlope
#define F8_R bassRSquared
#define F8_W clamp(abs(bassSlope) * 10.0, 0.0, 1.0)
#define F8_G bassNormalized

// Row 9: Beat — binary pulse shown as flash + decay
// Width: flux (beat correlate), Glow: energy normalized
#define F9_Z (beat ? 1.0 : -0.3)
#define F9_N (beat ? 1.0 : 0.0)
#define F9_S spectralFluxSlope
#define F9_R spectralFluxRSquared
#define F9_W spectralFluxNormalized
#define F9_G energyNormalized

// --- Globals ---
#define BEAT_PULSE (beat ? 1.0 : 0.0)

// --- Layout ---
#define NUM_ROWS 10.0
#define MARGIN 0.02
#define GAP 0.004
#define USABLE_H (1.0 - 2.0 * MARGIN - GAP * (NUM_ROWS - 1.0))
#define ROW_H (USABLE_H / NUM_ROWS)
#define ROW_Y(i) (MARGIN + ROW_H * 0.5 + (i) * (ROW_H + GAP))

// ============================================================================
// NOISE
// ============================================================================

float hash21(vec2 p) {
    p = fract(p * vec2(253.37, 471.53));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

// ============================================================================
// CHROMADEPTH — oklch perceptually uniform hue sweep
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 4.5 + 0.4;
    float L = 0.72 - t * 0.12;
    float C = 0.18 - t * 0.02;
    return clamp(oklch2rgb(vec3(L, C, hue)), 0.0, 1.0);
}

// ============================================================================
// ROW RENDERER
// ============================================================================

vec4 drawRow(vec2 fc, vec2 res, float zScore, float norm, float slope,
             float rSq, float widthMod, float glowMod,
             float rowCenter, float idx) {
    float pixY = fc.y / res.y;
    float halfH = ROW_H * 0.5;

    if (pixY > rowCenter + halfH + 0.012 || pixY < rowCenter - halfH - 0.012)
        return vec4(0.0);

    float localY = (pixY - rowCenter) / ROW_H;
    vec3 col = vec3(0.0);
    float a = 0.0;

    float stip = hash21(fc + idx * 137.0);

    // Row color from chromadepth
    float depth = idx / NUM_ROWS;
    float sShift = clamp(-slope * 8.0, -0.12, 0.12) * rSq;
    float depthFinal = clamp(depth + sShift, 0.0, 1.0);
    vec3 rc = chromadepth(depthFinal);

    // Edge fade
    float edgeDist = (0.5 - abs(localY)) * ROW_H * res.y;
    float edgeFade = smoothstep(0.0, 3.0, edgeDist);
    edgeFade = smoothstep(stip * 0.3, 1.0, edgeFade);

    // Center reference (stippled)
    float cPx = abs(localY) * ROW_H * res.y;
    float cLine = smoothstep(0.7, 0.0, cPx) * 0.02;
    cLine *= step(0.65, stip);
    col += rc * 0.4 * cLine;
    a = max(a, cLine);

    // Normalized fill (stippled)
    float normY = -0.5 + norm * 0.85;
    if (localY < normY) {
        float fillDensity = 0.12 + 0.2 * smoothstep(normY - 0.3, normY, localY);
        float fillStip = step(1.0 - fillDensity, stip);
        float fa = fillStip * 0.07;
        col += rc * fa;
        a = max(a, fa);
    }

    // Slope trend fill
    float sv = clamp(slope * 18.0, -0.38, 0.38);
    if ((sv > 0.0 && localY > 0.0 && localY < sv) ||
        (sv < 0.0 && localY < 0.0 && localY > sv)) {
        float slopeDensity = rSq * 0.5;
        float slopeStip = step(1.0 - slopeDensity, stip);
        float sa = slopeStip * 0.18;
        vec3 sc = (sv > 0.0)
            ? chromadepth(max(depthFinal - 0.12, 0.0))
            : chromadepth(min(depthFinal + 0.12, 1.0));
        col += sc * sa;
        a = max(a, sa);
    }

    // Confident trend accent
    float trendSignal = rSq * min(abs(slope) * 20.0, 1.0);
    if (trendSignal > 0.25) {
        float accentY = clamp(sv, -0.42, 0.42);
        float accentPx = abs(localY - accentY) * ROW_H * res.y;
        float accent = smoothstep(4.0, 0.0, accentPx) * (trendSignal - 0.25) * 0.5;
        accent *= 0.5 + stip * 0.8;
        vec3 accentColor = (sv > 0.0) ? vec3(1.0, 0.75, 0.35) : vec3(0.35, 0.7, 1.0);
        col += accentColor * accent;
        a = max(a, accent);
    }

    // Z-score line
    float zVal = clamp(zScore * 0.7, -0.45, 0.45);
    float zPx = abs(localY - zVal) * ROW_H * res.y;
    float lw = 0.6 + widthMod * 4.0 + abs(zScore) * 0.4;
    float edgeNoise = (stip - 0.5) * 1.2;
    float line = smoothstep(lw + 1.0 + edgeNoise, max(lw - 0.5, 0.0), zPx);

    // Stippled glow
    float glowRadius = lw * (3.0 + glowMod * 8.0);
    float glowIntensity = 0.03 + glowMod * 0.2;
    float rawGlow = smoothstep(glowRadius, lw * 0.5, zPx);
    float glowParticle = step(1.0 - rawGlow * rawGlow, stip);
    float glow = glowParticle * rawGlow * glowIntensity;

    float hueJitter = (stip - 0.5) * 0.06;
    vec3 glowColor = chromadepth(clamp(depthFinal + hueJitter, 0.0, 1.0));
    glowColor = mix(glowColor, vec3(1.0), glowMod * 0.3);

    vec3 lc = rc * (1.0 + abs(zScore) * 0.25);
    lc *= 1.0 + clamp(trendSignal, 0.0, 0.2);

    col += lc * line + glowColor * glow;
    a = max(a, line + glow);

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

    float px = floor(fragCoord.x);
    float last = floor(res.x) - 1.0;

    // --- SCROLLING (left-shift previous frame) ---
    if (px < last) {
        vec2 prevUV = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        vec4 prev = getLastFrameColor(prevUV);

        prev.rgb *= 0.9985;

        // Hue aging in oklch
        vec3 prevLCH = rgb2oklch(max(prev.rgb, 0.001));
        prevLCH.z += 0.003;
        prevLCH.y *= 0.9997;
        prev.rgb = clamp(oklch2rgb(prevLCH), 0.0, 1.0);

        // Beat flash on trails
        prev.rgb *= 1.0 + BEAT_PULSE * 0.004;

        fragColor = prev;
        return;
    }

    // --- DRAW NEW COLUMN ---

    float bgGrad = uv.y * 0.012 + 0.003;
    fragColor = vec4(vec3(0.0, 0.002, bgGrad), 1.0);

    vec4 r;

    // Row 0: Spectral flux — beat spike detector (red, top)
    r = drawRow(fragCoord, res, F0_Z, F0_N, F0_S, F0_R, F0_W, F0_G, ROW_Y(0.0), 0.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // Row 1: Spectral kurtosis — most dynamic
    r = drawRow(fragCoord, res, F1_Z, F1_N, F1_S, F1_R, F1_W, F1_G, ROW_Y(1.0), 1.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // Row 2: Spectral crest — outlier detector
    r = drawRow(fragCoord, res, F2_Z, F2_N, F2_S, F2_R, F2_W, F2_G, ROW_Y(2.0), 2.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // Row 3: Spectral entropy — chaos (anti-correlated with crest above)
    r = drawRow(fragCoord, res, F3_Z, F3_N, F3_S, F3_R, F3_W, F3_G, ROW_Y(3.0), 3.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // Row 4: Spectral centroid — brightness
    r = drawRow(fragCoord, res, F4_Z, F4_N, F4_S, F4_R, F4_W, F4_G, ROW_Y(4.0), 4.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // Row 5: Pitch class — completely independent
    r = drawRow(fragCoord, res, F5_Z, F5_N, F5_S, F5_R, F5_W, F5_G, ROW_Y(5.0), 5.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // Row 6: Bass — low-end weight
    r = drawRow(fragCoord, res, F6_Z, F6_N, F6_S, F6_R, F6_W, F6_G, ROW_Y(6.0), 6.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // Row 7: Energy — anti-correlated with bass above
    r = drawRow(fragCoord, res, F7_Z, F7_N, F7_S, F7_R, F7_W, F7_G, ROW_Y(7.0), 7.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // Row 8: Bass R² — trend confidence meter
    r = drawRow(fragCoord, res, F8_Z, F8_N, F8_S, F8_R, F8_W, F8_G, ROW_Y(8.0), 8.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // Row 9: Beat — binary pulse
    r = drawRow(fragCoord, res, F9_Z, F9_N, F9_S, F9_R, F9_W, F9_G, ROW_Y(9.0), 9.0);
    fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a);

    // --- GLOBAL STORY DETECTION ---

    // Count simultaneous spikes across features
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

    // Beat flash — flux row gets extra bright, whole column gets subtle pulse
    fragColor.rgb *= 1.0 + BEAT_PULSE * 0.12;

    // Anti-correlation highlight: when bass and energy diverge strongly,
    // tint the background to show the tension
    float divergence = abs(bassZScore - energyZScore);
    if (divergence > 1.0) {
        float tint = (divergence - 1.0) * 0.015;
        fragColor.rgb += vec3(tint * 0.5, 0.0, tint);
    }

    fragColor.rgb = clamp(fragColor.rgb, 0.0, 1.0);
    fragColor.a = 1.0;
}
