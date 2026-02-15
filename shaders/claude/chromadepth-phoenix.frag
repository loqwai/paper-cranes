// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, fractal, phoenix
// ChromaDepth Phoenix Fractal
// z_{n+1} = z_n^2 + c + p * z_{n-1}
// The "inertia" parameter p creates asymmetric, flowing patterns like bird wings.
// ChromaDepth: Red = closest, Green = mid, Blue/Violet = farthest, Black = neutral.

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// --- WANDERING JULIA CONSTANT c ---
// Slowly drifts through interesting regions of c-space
#define WANDER_SPEED (1.0 + spectralEntropyNormalized * 0.6)
// #define WANDER_SPEED 1.0

// --- PHOENIX INERTIA p: spectralFlux slope gated by rSquared ---
// Steady spectral flux trends = confident inertia changes
// spectralFluxZScore gives direction, gated by how linear the trend is
#define P_INERTIA (spectralFluxZScore * 0.12 * smoothstep(0.2, 0.7, energyRSquared))
// #define P_INERTIA 0.0

// Base inertia offset (phoenix fractal needs nonzero p for interesting shapes)
#define P_BASE 0.32
// #define P_BASE 0.32

// --- ZOOM: energy drives zoom ---
#define ZOOM_MOD (energyZScore * 0.15)
// #define ZOOM_MOD 0.0

// --- ROTATION: pitchClass rotates view ---
#define ROTATION_AUDIO (pitchClassNormalized * 0.4)
// #define ROTATION_AUDIO 0.0

// --- BEAT: triggers p-space jump ---
#define BEAT_JUMP (beat ? 1.0 : 0.0)
// #define BEAT_JUMP 0.0

// --- DROP DETECTION ---
#define DROP_INTENSITY (max(-energyZScore, 0.0))
// #define DROP_INTENSITY 0.0

// --- INSTANT REACTIVITY ---
#define BASS_PUNCH (bassZScore)
// #define BASS_PUNCH 0.0

#define TREBLE_EDGE (max(trebleZScore, 0.0))
// #define TREBLE_EDGE 0.0

#define ENERGY_LEVEL (energyNormalized)
// #define ENERGY_LEVEL 0.5

#define MIDS_MOD (midsZScore)
// #define MIDS_MOD 0.0

// --- TREND CONFIDENCE ---
#define CONFIDENCE (energyRSquared * 0.4 + bassRSquared * 0.3 + spectralCentroidRSquared * 0.3)
// #define CONFIDENCE 0.5

// --- SPECTRAL COLOR MODULATION ---
#define ROUGHNESS_MOD (spectralRoughnessNormalized)
// #define ROUGHNESS_MOD 0.5

#define CENTROID_DRIFT (spectralCentroidSlope * 12.0 * spectralCentroidRSquared)
// #define CENTROID_DRIFT 0.0

// --- CONSTANTS ---
#define MAX_ITER 64
#define PHI 1.61803398875

// ============================================================================
// CHROMADEPTH: full spectrum red -> violet via smooth HSL
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float sat = 0.95 - t * 0.1;
    float lit = 0.55 - t * 0.12;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    float t = iTime * 0.035 * clamp(WANDER_SPEED, 0.5, 2.0);

    // --- WANDERING PATH through c-space ---
    // The phoenix fractal has interesting structure around c ~ -0.5 + 0.0i
    // with small p values, and around c ~ -1.0 with larger p
    float cReal = -0.56 + 0.18 * sin(t * 0.8) + 0.1 * cos(t * PHI * 0.6);
    float cImag = 0.0 + 0.15 * sin(t * 0.6 * PHI) + 0.08 * cos(t * 1.1);

    // Regression-driven drift of c
    float cDriftReal = bassSlope * 18.0 * bassRSquared;
    float cDriftImag = CENTROID_DRIFT;
    cReal += cDriftReal * 0.05;
    cImag += cDriftImag * 0.04;

    // Drop jolts c into different territory
    float dropJolt = DROP_INTENSITY * (1.0 - CONFIDENCE) * 0.12;
    cReal += sin(iTime * 3.1) * dropJolt;
    cImag += cos(iTime * 2.7) * dropJolt;

    cReal = clamp(cReal, -1.2, 0.3);
    cImag = clamp(cImag, -0.7, 0.7);
    vec2 c = vec2(cReal, cImag);

    // --- PHOENIX INERTIA PARAMETER p ---
    // This is what makes phoenix fractals unique: memory of previous iterate
    float pReal = P_BASE + P_INERTIA;
    float pImag = 0.02 * sin(t * 0.3) + MIDS_MOD * 0.02;

    // Beat triggers a sudden jump in p-space (brief dramatic reshaping)
    float beatPhase = fract(iTime * 0.7);
    pReal += BEAT_JUMP * sin(beatPhase * 6.283) * 0.15;
    pImag += BEAT_JUMP * cos(beatPhase * 6.283) * 0.08;

    pReal = clamp(pReal, -0.6, 0.8);
    pImag = clamp(pImag, -0.4, 0.4);
    vec2 p = vec2(pReal, pImag);

    // --- VIEW TRANSFORM ---
    float zoom = 1.6 + 0.2 * sin(t * 0.4) + ZOOM_MOD;
    zoom = max(zoom, 0.9);
    zoom -= DROP_INTENSITY * 0.12;

    float angle = iTime * 0.02 + ROTATION_AUDIO;
    float ca = cos(angle), sa = sin(angle);
    uv = mat2(ca, -sa, sa, ca) * uv;
    uv *= zoom;

    // --- PHOENIX FRACTAL ITERATION ---
    // z_{n+1} = z_n^2 + c + p * z_{n-1}
    vec2 z = uv;
    vec2 zPrev = vec2(0.0);  // z_{n-1} starts at origin
    float smoothIter = 0.0;
    bool escaped = false;

    // Orbit traps
    float trapMin = 1e10;       // closest to origin
    float trapLineX = 1e10;     // closest to x-axis
    float trapLineY = 1e10;     // closest to y-axis
    float trapCircle = 1e10;    // closest to unit circle
    float trapWing = 1e10;      // wing-shaped trap (phoenix specific)
    float orbitAngle = 0.0;
    float orbitDist = 0.0;

    // Store early orbit positions for feedback warping
    vec2 z1 = z, z2 = z, z3 = z;

    for (int i = 0; i < MAX_ITER; i++) {
        // Phoenix iteration: z_{n+1} = z_n^2 + c + p * z_{n-1}
        vec2 zSquared = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
        vec2 pTerm = vec2(p.x * zPrev.x - p.y * zPrev.y,
                          p.x * zPrev.y + p.y * zPrev.x);
        vec2 zNext = zSquared + c + pTerm;

        zPrev = z;
        z = zNext;

        float mag2 = dot(z, z);
        float mag = sqrt(mag2);

        // Store early orbit positions
        if (i == 1) z1 = z;
        if (i == 3) z2 = z;
        if (i == 5) z3 = z;

        // Orbit traps
        trapMin = min(trapMin, mag);
        trapLineX = min(trapLineX, abs(z.y));
        trapLineY = min(trapLineY, abs(z.x));
        trapCircle = min(trapCircle, abs(mag - 1.0));

        // Wing trap: asymmetric distance to a parabolic curve
        // Phoenix fractals have inherent asymmetry; this trap highlights it
        float wingDist = abs(z.y - 0.3 * z.x * z.x);
        trapWing = min(trapWing, wingDist);

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
        // EXTERIOR: smooth iteration -> depth
        float logIter = log(1.0 + smoothIter) / log(1.0 + float(MAX_ITER));

        // Near boundary (high iter) = cyan/blue, fast escape = violet/dark
        depth = mix(0.5, 1.0, 1.0 - pow(logIter, 0.45));

        brightness = mix(0.15, 0.85, pow(logIter, 0.5));
    } else {
        // INTERIOR: orbit traps for rich chromadepth structure

        float tOrigin = clamp(trapMin * 1.5, 0.0, 1.0);
        float tLine = clamp(min(trapLineX, trapLineY) * 3.0, 0.0, 1.0);
        float tCircle = clamp(trapCircle * 2.0, 0.0, 1.0);
        float tWing = clamp(trapWing * 2.5, 0.0, 1.0);

        // Angular orbit accumulation - varies across interior
        float tAngle = fract(orbitAngle * 0.07);
        float tAngle2 = abs(sin(orbitAngle * 0.18));

        // Orbit average distance
        float tOrbit = clamp(orbitDist / float(MAX_ITER) * 0.4, 0.0, 1.0);

        // Final z position for spatial variation
        float zFinal = atan(z.y, z.x) / 6.283 + 0.5;
        float zDist = clamp(length(z) * 0.5, 0.0, 1.0);

        // Three independent depth signals:

        // Signal A: geometric traps - edges and axes
        float geoDepth = tLine * 0.5 + tWing * 0.5;

        // Signal B: organic traps + attractor - spatial variation
        float orgDepth = tOrigin * 0.3 + tCircle * 0.3 + zFinal * 0.4;

        // Signal C: angular + orbit - fine texture
        float texDepth = tAngle * 0.3 + tAngle2 * 0.25 + tOrbit * 0.2 + zDist * 0.25;

        // Combine with contrast enhancement
        float contrast = abs(geoDepth - orgDepth) + abs(texDepth - orgDepth) * 0.5;
        float blend = geoDepth * 0.25 + orgDepth * 0.25 + texDepth * 0.3 + contrast * 0.2;

        // S-curve for spread
        blend = smoothstep(0.05, 0.95, blend);

        // Interior depth: red (0.0) through cyan (0.55)
        depth = blend * 0.55;

        // Interior brightness with more variation
        brightness = 0.4 + tAngle * 0.2 + (1.0 - tOrigin) * 0.2 + tWing * 0.1 + contrast * 0.1;
    }

    // --- DROP EFFECT on depth ---
    depth = mix(depth, 0.0, DROP_INTENSITY * 0.45);

    // --- CHROMADEPTH COLOR ---
    vec3 col = chromadepth(depth);

    // Brightness modulation
    col *= brightness;
    col *= 1.0 + BASS_PUNCH * 0.08;
    col = clamp(col, 0.0, 1.0);

    // Edge glow from treble on fractal boundaries
    float edge = length(vec2(dFdx(depth), dFdy(depth)));
    float edgeGlow = smoothstep(0.0, 0.05, edge) * TREBLE_EDGE * 0.25;
    col += edgeGlow * vec3(1.0, 0.95, 0.85);

    // --- FEEDBACK: previous frame through orbit-warped UV ---
    // Orbit positions define where the fractal "connects", creating recursive detail

    float fbStrength = escaped
        ? 0.035 * pow(iterNorm, 0.3)
        : 0.05 * (1.0 - trapMin * 0.5);

    fbStrength *= 1.0 + DROP_INTENSITY * 1.8;
    fbStrength += BEAT_JUMP * 0.015;

    // Use orbit positions z1, z2 to warp feedback UV
    vec2 orbitWarp = vec2(
        z1.x * 0.018 + z2.y * 0.008,
        z1.y * 0.018 - z2.x * 0.008
    ) * fbStrength;

    // Slow rotation prevents static feedback loops
    float fbAngle = iTime * 0.008;
    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotatedUV = vec2(centered.x * fbc - centered.y * fbs,
                          centered.x * fbs + centered.y * fbc) + 0.5;

    vec2 fbUV = clamp(rotatedUV + orbitWarp, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    // --- OKLAB BLENDING for perceptually uniform feedback ---
    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);

    // Decay previous frame to prevent accumulation/white-out
    prevOk.x *= 0.97;
    prevOk.yz *= 0.99;

    // New frame dominates - we want sharp fractal detail
    float newAmount = 0.72;
    newAmount += DROP_INTENSITY * 0.12;
    newAmount -= CONFIDENCE * 0.08;
    newAmount = clamp(newAmount, 0.55, 0.9);

    vec3 blended = mix(prevOk, colOk, newAmount);

    // Inject fresh chroma to prevent color death
    float blendedChroma = length(blended.yz);
    float freshChroma = length(colOk.yz);
    if (blendedChroma < freshChroma * 0.7) {
        blended.yz = mix(blended.yz, colOk.yz, 0.3);
    }

    col = oklab2rgb(blended);

    // --- BEAT FLASH ---
    col *= 1.0 + BEAT_JUMP * 0.12;
    col = mix(col, col * vec3(1.3, 0.8, 0.7), DROP_INTENSITY * 0.2);

    // --- VIGNETTE ---
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.75;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
