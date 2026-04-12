// @fullscreen: true
// @tags: graph, chromadepth, stats, debug
// Chromadepth Stats Graph - Audio statistics as scrolling line graph
// Each line = different spectral color = different perceived 3D depth
// Red lines appear CLOSEST, blue lines appear FARTHEST through chromadepth glasses
//
// Groups: Z-scores (red/warm), Slopes (green/mid), R-squared (blue/cool)

#define LINE_WIDTH 2.0
#define GLOW_SIZE 10.0
#define VERTICAL_CENTER 0.5
#define SCALE 0.22
#define SLOPE_SCALE 500.0
#define DROP_THRESHOLD 0.6
#define DROP_MIN_COUNT 3

// ============================================================================
// Z-SCORE FEATURES (anomaly detection - what's unusual RIGHT NOW)
// Warm chromadepth colors: appear CLOSEST through glasses
// ============================================================================
#define ZSCORE_1 energyZScore
#define ZSCORE_2 bassZScore
#define ZSCORE_3 trebleZScore
#define ZSCORE_4 spectralFluxZScore
#define ZSCORE_5 spectralCentroidZScore
#define ZSCORE_6 spectralEntropyZScore

// ============================================================================
// SLOPE FEATURES (trend direction - is it RISING or FALLING?)
// Middle chromadepth colors: appear at MID-DEPTH through glasses
// ============================================================================
#define SLOPE_1 (energySlope * SLOPE_SCALE)
#define SLOPE_2 (bassSlope * SLOPE_SCALE)
#define SLOPE_3 (spectralCentroidSlope * SLOPE_SCALE)
#define SLOPE_4 (spectralFluxSlope * SLOPE_SCALE)

// ============================================================================
// R-SQUARED FEATURES (trend confidence - HOW steady is the trend?)
// Cool chromadepth colors: appear FARTHEST through glasses
// Centered: 0 maps to center, 1 maps to top
// ============================================================================
#define RSQUARED_1 (energyRSquared * 2.0 - 1.0)
#define RSQUARED_2 (bassRSquared * 2.0 - 1.0)

// ============================================================================
// CHROMADEPTH SPECTRAL COLORS
// Pure spectral hues for maximum chromadepth 3D separation
// Ordered: red (closest) → violet (farthest)
// ============================================================================

// Z-scores: warm spectrum (pop forward through glasses)
#define COLOR_Z1 vec3(1.0, 0.0, 0.0)     // Red         - energy
#define COLOR_Z2 vec3(1.0, 0.35, 0.0)    // Red-orange  - bass
#define COLOR_Z3 vec3(1.0, 0.6, 0.0)     // Orange      - treble
#define COLOR_Z4 vec3(1.0, 0.9, 0.0)     // Yellow      - flux
#define COLOR_Z5 vec3(0.7, 1.0, 0.0)     // Chartreuse  - centroid
#define COLOR_Z6 vec3(0.0, 1.0, 0.0)     // Green       - entropy

// Slopes: middle spectrum (mid-depth through glasses)
#define COLOR_S1 vec3(0.0, 1.0, 0.4)     // Spring      - energy slope
#define COLOR_S2 vec3(0.0, 1.0, 0.8)     // Mint        - bass slope
#define COLOR_S3 vec3(0.0, 0.9, 1.0)     // Cyan        - centroid slope
#define COLOR_S4 vec3(0.0, 0.55, 1.0)    // Sky blue    - flux slope

// R-squared: cool spectrum (recede through glasses)
#define COLOR_R1 vec3(0.15, 0.15, 1.0)   // Blue        - energy r2
#define COLOR_R2 vec3(0.45, 0.0, 1.0)    // Violet      - bass r2

// ============================================================================
// LINE DRAWING
// ============================================================================

float drawLine(vec2 fragCoord, float value) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    float normalizedY = clamp(VERTICAL_CENTER + value * SCALE, 0.02, 0.98);
    float d = abs(uv.y - normalizedY) * iResolution.y;

    // Sharp core
    float core = smoothstep(LINE_WIDTH + 1.0, LINE_WIDTH - 1.0, d);
    // Soft glow for chromadepth depth enhancement
    float glow = exp(-d * d / (GLOW_SIZE * GLOW_SIZE)) * 0.25;

    return core + glow;
}

// ============================================================================
// GRID
// ============================================================================

float drawGrid(vec2 uv) {
    float grid = 0.0;

    // Center line (value = 0)
    float centerDist = abs(uv.y - VERTICAL_CENTER) * iResolution.y;
    grid += smoothstep(1.5, 0.0, centerDist) * 0.15;

    // +/- 0.5 z-score marks
    float halfUp = abs(uv.y - (VERTICAL_CENTER + 0.5 * SCALE)) * iResolution.y;
    float halfDn = abs(uv.y - (VERTICAL_CENTER - 0.5 * SCALE)) * iResolution.y;
    grid += smoothstep(1.0, 0.0, halfUp) * 0.06;
    grid += smoothstep(1.0, 0.0, halfDn) * 0.06;

    // +/- 1.0 z-score marks
    float oneUp = abs(uv.y - (VERTICAL_CENTER + 1.0 * SCALE)) * iResolution.y;
    float oneDn = abs(uv.y - (VERTICAL_CENTER - 1.0 * SCALE)) * iResolution.y;
    grid += smoothstep(1.0, 0.0, oneUp) * 0.08;
    grid += smoothstep(1.0, 0.0, oneDn) * 0.08;

    return grid;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;

    // Scrolling: shift everything left by 1 pixel
    if (uv.x < 0.995) {
        vec2 prevUV = uv + vec2(1.0 / iResolution.x, 0.0);
        vec4 prev = getLastFrameColor(prevUV);
        // Slight decay to prevent ghosting from glow accumulation
        fragColor = vec4(prev.rgb * 0.995, 1.0);
        return;
    }

    // === Rightmost column: draw fresh data ===
    // Dark background with grid
    float grid = drawGrid(uv);
    fragColor = vec4(vec3(grid), 1.0);

    vec3 lineColor = vec3(0.0);

    // Z-scores (warm = close in chromadepth)
    lineColor += COLOR_Z1 * drawLine(fragCoord, ZSCORE_1);
    lineColor += COLOR_Z2 * drawLine(fragCoord, ZSCORE_2);
    lineColor += COLOR_Z3 * drawLine(fragCoord, ZSCORE_3);
    lineColor += COLOR_Z4 * drawLine(fragCoord, ZSCORE_4);
    lineColor += COLOR_Z5 * drawLine(fragCoord, ZSCORE_5);
    lineColor += COLOR_Z6 * drawLine(fragCoord, ZSCORE_6);

    // Slopes (mid-depth in chromadepth)
    lineColor += COLOR_S1 * drawLine(fragCoord, SLOPE_1);
    lineColor += COLOR_S2 * drawLine(fragCoord, SLOPE_2);
    lineColor += COLOR_S3 * drawLine(fragCoord, SLOPE_3);
    lineColor += COLOR_S4 * drawLine(fragCoord, SLOPE_4);

    // R-squared (cool = far in chromadepth)
    lineColor += COLOR_R1 * drawLine(fragCoord, RSQUARED_1);
    lineColor += COLOR_R2 * drawLine(fragCoord, RSQUARED_2);

    // === DROP DETECTION ===
    int highCount = 0;
    if (abs(ZSCORE_1) > DROP_THRESHOLD) highCount++;
    if (abs(ZSCORE_2) > DROP_THRESHOLD) highCount++;
    if (abs(ZSCORE_3) > DROP_THRESHOLD) highCount++;
    if (abs(ZSCORE_4) > DROP_THRESHOLD) highCount++;
    if (abs(ZSCORE_5) > DROP_THRESHOLD) highCount++;
    if (abs(ZSCORE_6) > DROP_THRESHOLD) highCount++;

    if (highCount >= DROP_MIN_COUNT) {
        float intensity = float(highCount) / 6.0;
        // Boost line brightness during drops
        lineColor *= 1.0 + intensity * 0.6;
        // Red background flash - pops FORWARD through chromadepth glasses
        fragColor.rgb += vec3(intensity * 0.25, 0.0, 0.0);
    }

    // Beat flash - red tint pushes everything forward in chromadepth
    if (beat) {
        lineColor *= 1.3;
        fragColor.rgb += vec3(0.15, 0.0, 0.0);
    }

    // Composite lines onto background
    fragColor.rgb += lineColor;
    fragColor.rgb = clamp(fragColor.rgb, 0.0, 1.0);
}
