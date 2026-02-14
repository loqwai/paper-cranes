// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, julia, fractal, evolution, regression
// ChromaDepth Evolution — Julia set driven by linear regression trends
// Regression slopes morph the Julia constant c, so builds/drops reshape the fractal.
// rSquared gates the effect: steady trends = confident morphing, chaos = exploration.
// Feedback: previous frame sampled through Julia-warped coordinates for recursive detail.
//
// ChromaDepth: Red = closest, Green = mid, Blue/Violet = farthest, Black = neutral

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// --- JULIA CONSTANTS via LINEAR REGRESSION ---
#define C_REAL_TREND (energySlope * 20.0 * energyRSquared)
// #define C_REAL_TREND 0.0

#define C_IMAG_TREND (bassSlope * 25.0 * bassRSquared)
// #define C_IMAG_TREND 0.0

#define C_BRIGHT_DRIFT (spectralCentroidSlope * 15.0 * spectralCentroidRSquared)
// #define C_BRIGHT_DRIFT 0.0

#define WANDER_SPEED (1.0 + spectralEntropySlope * 8.0)
// #define WANDER_SPEED 1.0

// --- DROP DETECTION ---
#define DROP_INTENSITY (max(-energyZScore, 0.0))
// #define DROP_INTENSITY 0.0

#define FLUX_HIT (spectralFluxZScore)
// #define FLUX_HIT 0.0

// --- INSTANT REACTIVITY ---
#define BASS_PUNCH (bassZScore)
// #define BASS_PUNCH 0.0

#define TREBLE_EDGE (max(trebleZScore, 0.0))
// #define TREBLE_EDGE 0.0

#define PITCH_HUE (pitchClassNormalized)
// #define PITCH_HUE 0.0

#define ROUGHNESS_SAT (spectralRoughnessNormalized)
// #define ROUGHNESS_SAT 0.5

#define ENERGY_LEVEL (energyNormalized)
// #define ENERGY_LEVEL 0.5

#define BEAT_HIT (beat ? 1.0 : 0.0)
// #define BEAT_HIT 0.0

// --- TREND CONFIDENCE ---
#define CONFIDENCE (energyRSquared * 0.5 + bassRSquared * 0.3 + spectralCentroidRSquared * 0.2)
// #define CONFIDENCE 0.5

// --- CONSTANTS ---
#define MAX_ITER 100
#define PHI 1.61803398875

// ============================================================================
// CHROMADEPTH: full spectrum red -> violet via smooth piecewise HSL
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    // Piecewise for better perceptual spread:
    // 0.0 = pure red, 0.25 = yellow, 0.45 = green, 0.6 = cyan, 0.75 = blue, 1.0 = violet
    float hue = t * 0.82;  // 0 -> 0.82 covers red through violet
    float sat = 0.95 - t * 0.1;  // slightly desaturate far depths
    float lit = 0.55 - t * 0.12;  // darken far depths slightly
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    float t = iTime * 0.04 * clamp(WANDER_SPEED, 0.5, 2.0);

    // --- WANDERING PATH through Julia c-space ---
    // Favors the "dendrite" region near c ≈ -0.7+0.3i where Julia sets have
    // rich branching structure, avoiding the large filled circle near c ≈ 0
    float cBaseReal = -0.72 + 0.12 * sin(t * 1.0) + 0.08 * cos(t * PHI * 0.7);
    float cBaseImag = 0.27 + 0.18 * sin(t * 0.7 * PHI) + 0.06 * cos(t * 1.3);

    // Regression pushes c away from base path
    float cReal = cBaseReal + C_REAL_TREND * 0.06 + C_BRIGHT_DRIFT * 0.03;
    float cImag = cBaseImag + C_IMAG_TREND * 0.08;

    // On drops, jolt c into a dramatically different spot
    float dropJolt = DROP_INTENSITY * (1.0 - CONFIDENCE) * 0.15;
    cReal += sin(iTime * 3.7) * dropJolt;
    cImag += cos(iTime * 2.3) * dropJolt;

    cReal = clamp(cReal, -1.3, 0.5);
    cImag = clamp(cImag, -0.9, 0.9);
    vec2 c = vec2(cReal, cImag);

    // --- VIEW TRANSFORM ---
    float zoom = 1.5 + 0.25 * sin(t * 0.5) + FLUX_HIT * 0.06;
    zoom = max(zoom, 0.8);
    zoom -= DROP_INTENSITY * 0.15;

    float angle = iTime * 0.025 + PITCH_HUE * 0.3;
    float ca = cos(angle), sa = sin(angle);
    uv = mat2(ca, -sa, sa, ca) * uv;
    uv *= zoom;

    // --- JULIA SET ITERATION ---
    vec2 z = uv;
    float smoothIter = 0.0;
    float trapMin = 1e10;
    float trapLineX = 1e10;
    float trapLineY = 1e10;
    float trapCircle = 1e10;
    float trapCross = 1e10;
    float orbitAngle = 0.0;
    float orbitDist = 0.0;
    bool escaped = false;

    // Store first few orbit positions for feedback warping
    vec2 z1 = z, z2 = z, z3 = z;

    for (int i = 0; i < MAX_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        float mag2 = dot(z, z);
        float mag = sqrt(mag2);

        // Store early orbit positions (these define local fractal structure)
        if (i == 1) z1 = z;
        if (i == 3) z2 = z;
        if (i == 5) z3 = z;

        // Rich orbit traps
        trapMin = min(trapMin, mag);
        trapLineX = min(trapLineX, abs(z.y));
        trapLineY = min(trapLineY, abs(z.x));
        trapCircle = min(trapCircle, abs(mag - 1.0));
        trapCross = min(trapCross, min(abs(z.x), abs(z.y)));
        orbitAngle += atan(z.y, z.x);
        orbitDist += mag;

        if (mag2 > 256.0) {
            smoothIter = float(i) - log2(log2(mag2)) + 4.0;
            escaped = true;
            break;
        }
        smoothIter = float(i);
    }

    float iterNorm = smoothIter / float(MAX_ITER);

    // --- DEPTH MAPPING ---
    float depth;
    float brightness = 1.0;

    if (escaped) {
        // EXTERIOR: smooth iteration count -> depth
        // Near boundary (high iter) = cyan, fast escape = violet/dark
        float logIter = log(1.0 + smoothIter) / log(1.0 + float(MAX_ITER));

        // Spread exterior across cyan (0.5) → violet (1.0)
        // pow(0.4) compresses near-boundary to linger in cyan/blue range
        depth = mix(0.5, 1.0, 1.0 - pow(logIter, 0.4));

        // Brightness: near boundary bright, far fades to dark
        brightness = mix(0.15, 0.85, pow(logIter, 0.5));
    } else {
        // INTERIOR: Use multiple independent depth signals for full spectrum
        // Key insight: different traps have DIFFERENT spatial distributions,
        // so combining them with contrast creates rich color variation

        // Normalize traps to 0-1 with good spread
        float tOrigin = clamp(trapMin * 1.5, 0.0, 1.0);
        float tLine = clamp(min(trapLineX, trapLineY) * 3.0, 0.0, 1.0);
        float tCircle = clamp(trapCircle * 2.0, 0.0, 1.0);
        float tCross = clamp(trapCross * 0.8, 0.0, 1.0);

        // Angular orbit accumulation — this varies even in large flat interiors
        // because it depends on WHERE the orbit starts, not just where it ends
        float tAngle = fract(orbitAngle * 0.08);
        float tAngle2 = abs(sin(orbitAngle * 0.2));  // second harmonic for more texture

        // Orbit average distance — broad structural info
        float tOrbit = clamp(orbitDist / float(MAX_ITER) * 0.4, 0.0, 1.0);

        // Position-dependent depth: use the final z position (orbit attractor)
        // This creates spatial variation even when traps are uniform
        float zFinal = atan(z.y, z.x) / 6.283 + 0.5; // 0-1 based on attractor angle
        float zDist = clamp(length(z) * 0.5, 0.0, 1.0);

        // Create THREE independent depth signals
        // Signal A: geometric traps — reveals edges and axes
        float geoDepth = tLine * 0.6 + tCross * 0.4;

        // Signal B: organic traps + attractor position — varies spatially
        float orgDepth = tOrigin * 0.3 + tCircle * 0.3 + zFinal * 0.4;

        // Signal C: angular + orbit — fine texture everywhere
        float texDepth = tAngle * 0.3 + tAngle2 * 0.3 + tOrbit * 0.2 + zDist * 0.2;

        // Combine with contrast enhancement
        float contrast = abs(geoDepth - orgDepth) + abs(texDepth - orgDepth) * 0.5;
        float blend = geoDepth * 0.25 + orgDepth * 0.25 + texDepth * 0.3 + contrast * 0.2;

        // S-curve for spread
        blend = smoothstep(0.08, 0.92, blend);

        // Interior depth: red (0.0) through cyan (0.55)
        depth = blend * 0.55;

        // Interior brightness: more variation
        brightness = 0.4 + tAngle * 0.25 + (1.0 - tOrigin) * 0.2 + contrast * 0.15;
    }

    // --- DROP EFFECT on depth ---
    depth = mix(depth, 0.0, DROP_INTENSITY * 0.5);

    // --- CHROMADEPTH COLOR ---
    vec3 col = chromadepth(depth);

    // Brightness modulation
    col *= brightness;
    col *= 1.0 + BASS_PUNCH * 0.08;
    col = clamp(col, 0.0, 1.0);

    // Edge glow from treble on fractal boundaries
    float edge = length(vec2(dFdx(depth), dFdy(depth)));
    float edgeGlow = smoothstep(0.0, 0.06, edge) * TREBLE_EDGE * 0.3;
    col += edgeGlow * vec3(1.0, 0.95, 0.85);

    // --- FEEDBACK: Sample previous frame through Julia-warped coordinates ---
    // Instead of blending old/new (blur), we use the orbit to warp WHERE
    // we sample the previous frame, creating recursive fractal detail.

    // Convert early orbit positions to screen-space UV for sampling
    // z1, z2, z3 are where the Julia iteration sent this pixel's coordinate
    // Use them to sample the previous frame from "where the fractal connects"

    // Warp amount: stronger near the boundary where the fractal is most detailed
    float fbStrength = escaped
        ? 0.04 * pow(iterNorm, 0.3)   // exterior: moderate warp
        : 0.06 * (1.0 - trapMin * 0.5); // interior: stronger where trapped tightly

    fbStrength *= 1.0 + DROP_INTENSITY * 2.0;  // drops explode the feedback
    fbStrength += BEAT_HIT * 0.02;

    // Use orbit position z1 to warp the feedback UV
    // This makes the feedback follow the fractal's own structure
    vec2 orbitWarp = vec2(
        z1.x * 0.02 + z2.y * 0.01,
        z1.y * 0.02 - z2.x * 0.01
    ) * fbStrength;

    // Add slow rotation to prevent static feedback loops
    float fbAngle = iTime * 0.01;
    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotatedUV = vec2(centered.x * fbc - centered.y * fbs,
                          centered.x * fbs + centered.y * fbc) + 0.5;

    vec2 fbUV = clamp(rotatedUV + orbitWarp, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    // --- OKLAB BLENDING ---
    // Convert to oklab for perceptually uniform mixing
    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);

    // Decay previous frame to prevent accumulation/white-out
    prevOk.x *= 0.97;
    // Slightly decay chroma too
    prevOk.yz *= 0.99;

    // New frame dominates (0.6-0.85) — we want SHARP fractal detail
    // Feedback is an accent, not the main image
    float newAmount = 0.7;
    newAmount += DROP_INTENSITY * 0.15;  // drops: even more new frame
    newAmount -= CONFIDENCE * 0.1;       // steady trends: slightly more persistence
    newAmount = clamp(newAmount, 0.55, 0.9);

    vec3 blended = mix(prevOk, colOk, newAmount);

    // Inject fresh chroma from current frame to prevent color death
    float blendedChroma = length(blended.yz);
    float freshChroma = length(colOk.yz);
    if (blendedChroma < freshChroma * 0.7) {
        blended.yz = mix(blended.yz, colOk.yz, 0.3);
    }

    col = oklab2rgb(blended);

    // --- BEAT/DROP FLASH ---
    col *= 1.0 + BEAT_HIT * 0.15;
    col = mix(col, col * vec3(1.4, 0.75, 0.65), DROP_INTENSITY * 0.25);

    // --- VIGNETTE ---
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.8;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
