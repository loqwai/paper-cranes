// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, fractal, mandelbrot
// ChromaDepth Mandelbrot Deep Zoom — smooth coloring with orbit traps
// Iteration count maps to chromadepth depth: boundary detail = red (near),
// fast escape = blue/violet (far). Interior uses orbit traps for rich color.
// Audio drives zoom, rotation, c-offset exploration, beat flash.
// Frame feedback with orbit-warped sampling and gentle decay.

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// --- ZOOM: energy drives zoom depth ---
#define ZOOM_POWER (3.0 + energyNormalized * 4.0)
// #define ZOOM_POWER 5.0

// --- ROTATION: pitchClass rotates the view ---
#define VIEW_ROTATION (time * 0.03 + pitchClassNormalized * 1.5)
// #define VIEW_ROTATION 0.0

// --- C-OFFSET for mini-brot exploration via regression slopes ---
#define C_OFFSET_REAL (bassSlope * 15.0 * bassRSquared)
// #define C_OFFSET_REAL 0.0

#define C_OFFSET_IMAG (spectralCentroidSlope * 12.0 * spectralCentroidRSquared)
// #define C_OFFSET_IMAG 0.0

// --- ZOOM TARGET drift: treble/bass steer the target ---
#define TARGET_DRIFT_X (trebleZScore * 0.003)
// #define TARGET_DRIFT_X 0.0

#define TARGET_DRIFT_Y (bassZScore * 0.002)
// #define TARGET_DRIFT_Y 0.0

// --- COLOR modulation ---
#define HUE_SHIFT (spectralEntropyNormalized * 0.08)
// #define HUE_SHIFT 0.0

#define BRIGHTNESS_MOD (0.85 + energyZScore * 0.15)
// #define BRIGHTNESS_MOD 0.85

// --- BEAT flash ---
#define BEAT_FLASH (beat ? 1.25 : 1.0)
// #define BEAT_FLASH 1.0

// --- FLUX JITTER: spectral flux adds fine camera jitter ---
#define FLUX_JITTER (spectralFluxZScore * 0.002)
// #define FLUX_JITTER 0.0

// --- ROUGHNESS: drives interior saturation ---
#define ROUGHNESS_SAT (0.85 + spectralRoughnessNormalized * 0.15)
// #define ROUGHNESS_SAT 0.9

// --- CONFIDENCE for feedback ---
#define TREND_CONFIDENCE (energyRSquared * 0.5 + bassRSquared * 0.3 + spectralCentroidRSquared * 0.2)
// #define TREND_CONFIDENCE 0.5

// --- MIDS for feedback warp ---
#define MIDS_WARP (midsZScore * 0.01)
// #define MIDS_WARP 0.0

// --- ENERGY TREND for zoom pulsing ---
#define ENERGY_TREND (energySlope * 10.0 * energyRSquared)
// #define ENERGY_TREND 0.0

// --- Max iterations (mobile safe) ---
#define MAX_ITER 64

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================
// 0.0 = red (closest), 0.33 = green (mid), 0.75 = blue/violet (farthest)
// Black = neutral depth

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.75; // 0 -> red, 0.25 -> yellow, 0.33 -> green, 0.75 -> violet
    float sat = 0.92 - t * 0.08;
    float lit = 0.52 - t * 0.1;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MANDELBROT DEEP ZOOM
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 screenUV = fragCoord / resolution;
    vec2 uv = (fragCoord - 0.5 * resolution) / resolution.y;

    // --- ZOOM TARGET ---
    // Wander through interesting regions of the Mandelbrot set
    // The Seahorse Valley at c ~ -0.75 + 0.1i has infinite mini-brots
    float wanderT = time * 0.012;
    vec2 target = vec2(
        -0.7435669 + 0.0002 * sin(wanderT * 0.7) + TARGET_DRIFT_X,
         0.1314023 + 0.00015 * cos(wanderT * 0.9) + TARGET_DRIFT_Y
    );

    // Apply c-offset from regression slopes for mini-brot exploration
    float offsetScale = 0.001 / max(pow(2.0, ZOOM_POWER * 0.3), 1.0);
    target.x += C_OFFSET_REAL * offsetScale;
    target.y += C_OFFSET_IMAG * offsetScale;

    // --- ZOOM ---
    float zoom = pow(2.0, ZOOM_POWER + sin(wanderT * 1.3) * 0.5 + ENERGY_TREND * 0.3);
    zoom = max(zoom, 1.0);

    // --- ROTATION ---
    float angle = VIEW_ROTATION;
    float ca = cos(angle), sa = sin(angle);
    uv = mat2(ca, -sa, sa, ca) * uv;

    // --- MAP to complex plane ---
    vec2 c = target + uv / zoom;

    // Add flux jitter
    c += vec2(FLUX_JITTER * sin(time * 7.3), FLUX_JITTER * cos(time * 5.7));

    // --- MANDELBROT ITERATION with smooth coloring + orbit traps ---
    vec2 z = vec2(0.0);
    float smoothIter = 0.0;
    float trapOrigin = 1e10;   // closest approach to origin
    float trapLineX = 1e10;    // closest to x-axis
    float trapLineY = 1e10;    // closest to y-axis
    float trapCircle = 1e10;   // closest to unit circle
    float orbitAngle = 0.0;    // accumulated angle
    float orbitDist = 0.0;     // accumulated distance
    bool escaped = false;

    // Store orbit positions for feedback warping
    vec2 z1 = z, z2 = z;

    for (int i = 0; i < MAX_ITER; i++) {
        // z = z^2 + c
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        float mag2 = dot(z, z);
        float mag = sqrt(mag2);

        // Store early orbit positions
        if (i == 2) z1 = z;
        if (i == 5) z2 = z;

        // Orbit traps
        trapOrigin = min(trapOrigin, mag);
        trapLineX = min(trapLineX, abs(z.y));
        trapLineY = min(trapLineY, abs(z.x));
        trapCircle = min(trapCircle, abs(mag - 1.0));
        orbitAngle += atan(z.y, z.x);
        orbitDist += mag;

        if (mag2 > 256.0) {
            // Smooth iteration count (anti-banding)
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
        // EXTERIOR: smooth iteration -> chromadepth depth
        // Near boundary (many iterations) = mid-spectrum
        // Fast escape (few iterations) = violet/far
        float logIter = log(1.0 + smoothIter) / log(1.0 + float(MAX_ITER));

        // Near boundary -> green/cyan (0.35-0.5), fast escape -> violet (0.75)
        depth = mix(0.75, 0.35, pow(logIter, 0.45));

        // Brightness: near boundary = bright, far = dark
        brightness = mix(0.12, 0.8, pow(logIter, 0.5));
    } else {
        // INTERIOR: orbit traps -> rich chromadepth color variation
        // Multiple independent traps for full-spectrum interior

        float tOrigin = clamp(trapOrigin * 1.2, 0.0, 1.0);
        float tLine = clamp(min(trapLineX, trapLineY) * 2.5, 0.0, 1.0);
        float tCircle = clamp(trapCircle * 1.8, 0.0, 1.0);

        // Angular orbit texture
        float tAngle = fract(orbitAngle * 0.06);
        float tAngle2 = abs(sin(orbitAngle * 0.15));

        // Orbit average distance
        float tOrbit = clamp(orbitDist / float(MAX_ITER) * 0.35, 0.0, 1.0);

        // Final z position adds spatial variation
        float zFinal = atan(z.y, z.x) / 6.283 + 0.5;
        float zDist = clamp(length(z) * 0.4, 0.0, 1.0);

        // Three independent depth signals
        float geoDepth = tLine * 0.5 + tCircle * 0.5;
        float orgDepth = tOrigin * 0.35 + zFinal * 0.35 + zDist * 0.3;
        float texDepth = tAngle * 0.35 + tAngle2 * 0.35 + tOrbit * 0.3;

        // Contrast from signal differences
        float contrast = abs(geoDepth - orgDepth) + abs(texDepth - geoDepth) * 0.5;
        float blend = geoDepth * 0.3 + orgDepth * 0.25 + texDepth * 0.25 + contrast * 0.2;

        // S-curve for better spread
        blend = smoothstep(0.05, 0.95, blend);

        // Interior: red (0.0) through green (0.35) -- closest in chromadepth
        depth = blend * 0.35;

        // Interior brightness with variation
        brightness = 0.45 + tAngle * 0.2 + (1.0 - tOrigin) * 0.2 + contrast * 0.15;
    }

    // --- CHROMADEPTH COLOR ---
    float finalDepth = fract(depth + HUE_SHIFT);
    vec3 col = chromadepth(finalDepth);

    // Apply brightness and saturation
    vec3 hsl = vec3(finalDepth * 0.75, ROUGHNESS_SAT, 0.52 - finalDepth * 0.1);
    col = hsl2rgb(hsl) * brightness;

    // Brightness modulation from energy
    col *= clamp(BRIGHTNESS_MOD, 0.3, 1.3);

    // Beat flash
    col *= BEAT_FLASH;

    // Edge glow on fractal boundaries
    float edge = length(vec2(dFdx(depth), dFdy(depth)));
    float edgeGlow = smoothstep(0.0, 0.05, edge) * 0.2;
    col += edgeGlow * vec3(1.0, 0.9, 0.8);

    col = clamp(col, 0.0, 1.0);

    // --- FRAME FEEDBACK with orbit-warped sampling ---
    // Warp strength: stronger near boundary
    float fbStrength = escaped
        ? 0.035 * pow(iterNorm, 0.35)
        : 0.05 * (1.0 - trapOrigin * 0.4);

    fbStrength += float(beat) * 0.015;

    // Use orbit positions to warp the feedback UV (follow fractal structure)
    vec2 orbitWarp = vec2(
        z1.x * 0.015 + z2.y * 0.008,
        z1.y * 0.015 - z2.x * 0.008
    ) * fbStrength;

    orbitWarp += vec2(MIDS_WARP, MIDS_WARP * 0.7);

    // Slow rotation prevents static feedback loops
    float fbAngle = time * 0.008;
    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotatedUV = vec2(
        centered.x * fbc - centered.y * fbs,
        centered.x * fbs + centered.y * fbc
    ) + 0.5;

    vec2 fbUV = clamp(rotatedUV + orbitWarp, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    // Oklab blending for perceptual uniformity
    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);

    // Decay previous frame
    prevOk.x *= 0.96;
    prevOk.yz *= 0.98;

    // New frame dominance
    float newAmount = 0.72;
    newAmount -= TREND_CONFIDENCE * 0.08; // steady trends = more persistence
    newAmount = clamp(newAmount, 0.55, 0.88);

    vec3 blended = mix(prevOk, colOk, newAmount);

    // Inject fresh chroma to prevent color death
    float blendedChroma = length(blended.yz);
    float freshChroma = length(colOk.yz);
    if (blendedChroma < freshChroma * 0.65) {
        blended.yz = mix(blended.yz, colOk.yz, 0.35);
    }

    col = oklab2rgb(blended);

    // Beat/drop color accent
    col *= 1.0 + float(beat) * 0.12;

    // --- VIGNETTE ---
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
