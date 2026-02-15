// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, fractal, kali
// ChromaDepth Kali Set — Intricate filigree fractal with orbit trap depth
// The Kali fold: p = abs(p) / dot(p,p) - param creates infinitely recursive structures.
// Orbit trap distances drive chromadepth: close traps = red (near), far traps = blue (far).
// Parameters wander through beautiful configurations, audio steers the path.
// ChromaDepth: Red = closest, Green = mid, Blue/Violet = farthest, Black = neutral

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// --- KALI PARAMETER MODULATION via LINEAR REGRESSION ---

// Param X: bass slope with rSquared gating — steady bass builds reshape the fold
#define KALI_MOD_X (bassSlope * 18.0 * bassRSquared)
// #define KALI_MOD_X 0.0

// Param Y: spectral centroid slope gated by confidence — brightness trends shift structure
#define KALI_MOD_Y (spectralCentroidSlope * 15.0 * spectralCentroidRSquared)
// #define KALI_MOD_Y 0.0

// Param Z: treble zScore — instant high-frequency reactivity for fine detail shifts
#define KALI_MOD_Z (trebleZScore * 0.03)
// #define KALI_MOD_Z 0.0

// --- ZOOM via ENERGY ---
#define ZOOM_MOD (energyZScore * 0.12)
// #define ZOOM_MOD 0.0

// --- ROTATION via PITCH CLASS ---
#define ROTATION_MOD (pitchClassNormalized * 0.4)
// #define ROTATION_MOD 0.0

// --- BASS PUNCH for brightness ---
#define BASS_PUNCH (bassZScore)
// #define BASS_PUNCH 0.0

// --- SPECTRAL FLUX for edge glow ---
#define FLUX_EDGE (max(spectralFluxZScore, 0.0))
// #define FLUX_EDGE 0.0

// --- DROP DETECTION ---
#define DROP_INTENSITY (max(-energyZScore, 0.0))
// #define DROP_INTENSITY 0.0

// --- ENTROPY for chaos modulation ---
#define ENTROPY_LEVEL (spectralEntropyNormalized)
// #define ENTROPY_LEVEL 0.5

// --- ROUGHNESS for saturation ---
#define ROUGHNESS_SAT (spectralRoughnessNormalized)
// #define ROUGHNESS_SAT 0.5

// --- MIDS for pan ---
#define PAN_MOD (midsZScore * 0.03)
// #define PAN_MOD 0.0

// --- BEAT ---
#define BEAT_HIT (beat ? 1.0 : 0.0)
// #define BEAT_HIT 0.0

// --- ENERGY TREND CONFIDENCE ---
#define CONFIDENCE (energyRSquared * 0.5 + bassRSquared * 0.3 + spectralCentroidRSquared * 0.2)
// #define CONFIDENCE 0.5

// --- MOBILE LIMITS ---
#define MAX_ITER 12
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
// KALI FOLD: p = abs(p) / dot(p,p) - param
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    float t = iTime * 0.03;

    // --- WANDERING KALI PARAMETERS ---
    // The kali_param vector slowly explores parameter space.
    // Sweet spots for the Kali fractal are roughly in 0.4-1.2 range.
    // We orbit through known beautiful configurations.
    vec3 kaliParam;
    kaliParam.x = 0.75 + 0.2 * sin(t * 1.0) + 0.1 * cos(t * PHI * 0.6);
    kaliParam.y = 0.85 + 0.15 * sin(t * 0.7 * PHI) + 0.1 * cos(t * 1.1);
    kaliParam.z = 0.65 + 0.18 * sin(t * 0.9) + 0.08 * cos(t * PHI * 0.8);

    // Audio modulation of kali params (regression gated)
    kaliParam.x += KALI_MOD_X * 0.04;
    kaliParam.y += KALI_MOD_Y * 0.05;
    kaliParam.z += KALI_MOD_Z;

    // Drop jolts param into different region
    float dropJolt = DROP_INTENSITY * (1.0 - CONFIDENCE) * 0.12;
    kaliParam.x += sin(iTime * 3.7) * dropJolt;
    kaliParam.y += cos(iTime * 2.3) * dropJolt;

    // Clamp to stay in interesting range
    kaliParam = clamp(kaliParam, vec3(0.3), vec3(1.4));

    // --- VIEW TRANSFORM ---
    float zoom = 2.0 + 0.3 * sin(t * 0.4) + ZOOM_MOD;
    zoom = max(zoom, 1.0);
    zoom -= DROP_INTENSITY * 0.15;

    float angle = iTime * 0.02 + ROTATION_MOD;
    float ca = cos(angle), sa = sin(angle);
    uv = mat2(ca, -sa, sa, ca) * uv;
    uv *= zoom;

    // Pan
    uv += vec2(PAN_MOD, PAN_MOD * 0.7);

    // --- KALI SET ITERATION ---
    vec3 p = vec3(uv, 0.5 + ENTROPY_LEVEL * 0.3);

    // Orbit trap accumulators
    float trapOrigin = 1e10;     // min distance to origin
    float trapAxisX = 1e10;      // min distance to YZ plane
    float trapAxisY = 1e10;      // min distance to XZ plane
    float trapAxisZ = 1e10;      // min distance to XY plane
    float accumGlow = 0.0;       // exponential accumulation for glow
    float accumDepth = 0.0;      // weighted depth accumulation
    float orbitEnergy = 0.0;     // total orbit energy

    // Store early orbit positions for feedback warping
    vec3 p1 = p, p2 = p;

    for (int i = 0; i < MAX_ITER; i++) {
        // The Kali fold: absolute value + inversion + offset
        p = abs(p);
        float d = dot(p, p);
        d = max(d, 0.001); // prevent divide by zero
        p = p / d - kaliParam;

        // Orbit trap distances
        float dist = length(p);
        trapOrigin = min(trapOrigin, dist);
        trapAxisX = min(trapAxisX, abs(p.x));
        trapAxisY = min(trapAxisY, abs(p.y));
        trapAxisZ = min(trapAxisZ, abs(p.z));

        // Exponential glow accumulation: bright near the fold
        float weight = 1.0 / (1.0 + float(i) * 0.5);
        accumGlow += exp(-dist * 4.0) * weight;
        accumDepth += dist * weight;
        orbitEnergy += dot(p, p);

        // Store early positions
        if (i == 1) p1 = p;
        if (i == 3) p2 = p;
    }

    orbitEnergy /= float(MAX_ITER);

    // --- DEPTH MAPPING from orbit traps ---
    // Close traps = near = red (low depth), far traps = far = blue (high depth)

    // Normalize trap distances
    float tOrigin = clamp(trapOrigin * 0.8, 0.0, 1.0);
    float tEdge = clamp(min(trapAxisX, min(trapAxisY, trapAxisZ)) * 2.0, 0.0, 1.0);
    float tGlow = clamp(accumGlow * 0.4, 0.0, 1.0);
    float tOrbitAvg = clamp(accumDepth / float(MAX_ITER) * 0.3, 0.0, 1.0);

    // Combine traps into depth
    // Origin trap: tight orbits = red/near
    // Edge trap: near-axis features = structural detail
    // Glow: exponential accumulation provides smooth gradient
    float depth = tOrigin * 0.2 + tEdge * 0.15 + (1.0 - tGlow) * 0.35 + tOrbitAvg * 0.3;

    // S-curve for perceptual spread
    depth = smoothstep(0.05, 0.95, depth);

    // Drop pushes depth toward red (near)
    depth = mix(depth, 0.0, DROP_INTENSITY * 0.4);

    // --- CHROMADEPTH COLOR ---
    vec3 col = chromadepth(depth);

    // --- BRIGHTNESS from orbit structure ---
    // Glow around fold lines
    float foldGlow = accumGlow * 0.6;
    foldGlow = clamp(foldGlow, 0.0, 1.0);

    // Edge highlighting from trap proximity
    float edgeBright = exp(-tEdge * 6.0) * 0.4;

    float brightness = 0.45 + foldGlow * 0.35 + edgeBright;
    brightness *= 1.0 + BASS_PUNCH * 0.08;
    brightness = clamp(brightness, 0.1, 1.0);
    col *= brightness;

    // Edge glow from spectral flux on fractal boundaries
    float edgeD = length(vec2(dFdx(depth), dFdy(depth)));
    float edgeHighlight = smoothstep(0.0, 0.08, edgeD) * FLUX_EDGE * 0.25;
    col += edgeHighlight * vec3(1.0, 0.95, 0.85);

    col = clamp(col, 0.0, 1.0);

    // --- FRAME FEEDBACK with subtle decay ---
    // Warp feedback UV using orbit positions for fractal-structured persistence
    float fbStrength = 0.04 * (1.0 + DROP_INTENSITY * 2.0);
    fbStrength += BEAT_HIT * 0.015;

    vec2 orbitWarp = vec2(
        p1.x * 0.015 + p2.y * 0.008,
        p1.y * 0.015 - p2.x * 0.008
    ) * fbStrength;

    // Slow rotation to prevent static feedback loops
    float fbAngle = iTime * 0.008;
    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotatedUV = vec2(centered.x * fbc - centered.y * fbs,
                          centered.x * fbs + centered.y * fbc) + 0.5;

    vec2 fbUV = clamp(rotatedUV + orbitWarp, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    // Oklab blending for perceptually uniform feedback
    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);

    // Decay previous frame
    prevOk.x *= 0.96;   // luminance decay
    prevOk.yz *= 0.98;  // slight chroma decay

    // New frame dominates — sharp fractal detail is primary
    float newAmount = 0.72;
    newAmount += DROP_INTENSITY * 0.12;
    newAmount -= CONFIDENCE * 0.08;
    newAmount = clamp(newAmount, 0.55, 0.88);

    vec3 blended = mix(prevOk, colOk, newAmount);

    // Inject fresh chroma to prevent color death
    float blendedChroma = length(blended.yz);
    float freshChroma = length(colOk.yz);
    if (blendedChroma < freshChroma * 0.6) {
        blended.yz = mix(blended.yz, colOk.yz, 0.35);
    }

    col = oklab2rgb(blended);

    // --- BEAT/DROP FLASH ---
    col *= 1.0 + BEAT_HIT * 0.12;
    col = mix(col, col * vec3(1.3, 0.8, 0.7), DROP_INTENSITY * 0.2);

    // --- VIGNETTE ---
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
