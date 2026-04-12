// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, kaleidoscope, fractal
// ChromaDepth Fractal Kaleidoscope
// UV folding creates symmetric patterns, Julia iteration adds fractal detail.
// Fold depth -> chromadepth: center folds = red (closest), outer folds = blue (farthest).
// Feedback samples from rotated+scaled previous frame for recursive kaleidoscope effect.

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// Symmetry fold count: spectral centroid drives complexity (4-12 folds)
#define FOLD_COUNT (4.0 + spectralCentroidZScore * 2.0 + spectralCentroidNormalized * 4.0)
// #define FOLD_COUNT 6.0

// Zoom: energy drives zoom level
#define ZOOM (1.8 + energyZScore * 0.3)
// #define ZOOM 1.8

// Rotation: pitch class rotates the kaleidoscope
#define ROTATION_SPEED (iTime * 0.08 + pitchClassNormalized * 1.5)
// #define ROTATION_SPEED (iTime * 0.08)

// Julia c parameter: bass and treble slopes morph the fractal
#define C_REAL (-0.74 + bassSlope * 15.0 * bassRSquared)
// #define C_REAL -0.74

#define C_IMAG (0.18 + spectralCentroidSlope * 12.0 * spectralCentroidRSquared)
// #define C_IMAG 0.18

// Treble adds detail sharpness
#define TREBLE_DETAIL (trebleZScore * 0.15)
// #define TREBLE_DETAIL 0.0

// Energy level for brightness
#define ENERGY_BRIGHT (0.85 + energyNormalized * 0.3)
// #define ENERGY_BRIGHT 1.0

// Beat pulse
#define BEAT_FLASH (beat ? 1.15 : 1.0)
// #define BEAT_FLASH 1.0

// Feedback strength: spectral entropy controls recursive depth
#define FEEDBACK_MIX (0.25 + spectralEntropyNormalized * 0.15)
// #define FEEDBACK_MIX 0.3

// Feedback rotation driven by mids
#define FB_ROTATE (midsZScore * 0.04)
// #define FB_ROTATE 0.0

// Feedback zoom driven by spectral flux
#define FB_ZOOM (1.0 - spectralFluxZScore * 0.03)
// #define FB_ZOOM 1.0

// Drop detection: negative energy z-score = drop
#define DROP_AMOUNT (max(-energyZScore, 0.0))
// #define DROP_AMOUNT 0.0

// Bass punch for color saturation
#define BASS_SAT (bassNormalized * 0.15)
// #define BASS_SAT 0.0

// Roughness adds grit to fold edges
#define ROUGHNESS_EDGE (spectralRoughnessNormalized * 0.3)
// #define ROUGHNESS_EDGE 0.0

// ============================================================================
// CONSTANTS
// ============================================================================
#define MAX_ITER 48
#define PI 3.14159265359
#define TAU 6.28318530718

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float sat = 0.95 - t * 0.1;
    float lit = 0.55 - t * 0.12;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// KALEIDOSCOPE UV FOLDING
// ============================================================================

// Returns: folded UV and fold count (number of reflections applied)
// The fold count is our depth metric for chromadepth.

vec2 kaleidoFold(vec2 p, float sides, out float foldDepth) {
    // Convert to polar
    float angle = atan(p.y, p.x);
    float radius = length(p);

    // Sector angle
    float sector = TAU / max(sides, 3.0);

    // Count which sector we're in (this = depth layers)
    float sectorIndex = floor(angle / sector + 0.5);
    foldDepth = abs(sectorIndex);

    // Fold into fundamental domain
    angle = mod(angle, sector);
    // Mirror fold
    if (angle > sector * 0.5) {
        angle = sector - angle;
        foldDepth += 0.5;
    }

    // Back to cartesian
    return vec2(cos(angle), sin(angle)) * radius;
}

// Additional fold: triangle fold for extra structure
vec2 triFold(vec2 p, out float extraDepth) {
    extraDepth = 0.0;

    // Fold across x-axis
    if (p.y < 0.0) {
        p.y = -p.y;
        extraDepth += 1.0;
    }

    // Fold across 60-degree line
    float line60 = p.x * 0.5 - p.y * 0.866;
    if (line60 < 0.0) {
        // Reflect across the line y = x*tan(60)
        float d = p.x * 0.5 - p.y * 0.866;
        p -= 2.0 * d * vec2(0.5, -0.866);
        extraDepth += 1.0;
    }

    return p;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // --- GLOBAL ROTATION ---
    float angle = ROTATION_SPEED;
    float ca = cos(angle), sa = sin(angle);
    uv = mat2(ca, -sa, sa, ca) * uv;

    // --- ZOOM ---
    float zoom = clamp(ZOOM, 0.8, 4.0);
    uv *= zoom;

    // --- KALEIDOSCOPE FOLDING ---
    float sides = clamp(FOLD_COUNT, 3.0, 12.0);
    float foldDepth = 0.0;
    vec2 foldedUV = kaleidoFold(uv, sides, foldDepth);

    // Additional triangle fold for more structure
    float extraDepth = 0.0;
    foldedUV = triFold(foldedUV, extraDepth);
    foldDepth += extraDepth * 0.5;

    // Normalize fold depth: more folds from center = deeper
    // Higher fold count means more possible sectors, so normalize
    float maxFolds = sides * 0.5 + 2.0;
    float depthNorm = clamp(foldDepth / maxFolds, 0.0, 1.0);

    // Radius also contributes to depth (further from center = deeper)
    float radiusDepth = clamp(length(uv) / (zoom * 1.2), 0.0, 1.0);

    // --- JULIA ITERATION on folded UV ---
    vec2 z = foldedUV;
    vec2 c = vec2(
        clamp(C_REAL, -1.3, 0.5),
        clamp(C_IMAG, -0.9, 0.9)
    );

    float smoothIter = 0.0;
    float trapMin = 1e10;
    float trapCross = 1e10;
    float orbitAngle = 0.0;
    bool escaped = false;

    for (int i = 0; i < MAX_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        float mag2 = dot(z, z);
        float mag = sqrt(mag2);

        trapMin = min(trapMin, mag);
        trapCross = min(trapCross, min(abs(z.x), abs(z.y)));
        orbitAngle += atan(z.y, z.x);

        if (mag2 > 256.0) {
            smoothIter = float(i) - log2(log2(mag2)) + 4.0;
            escaped = true;
            break;
        }
        smoothIter = float(i);
    }

    float iterNorm = smoothIter / float(MAX_ITER);

    // --- DEPTH CALCULATION ---
    // Combine fold depth, radius depth, and fractal iteration depth
    float fractalDepth;

    if (escaped) {
        // Exterior: near boundary = mid-depth, fast escape = far
        float logIter = log(1.0 + smoothIter) / log(1.0 + float(MAX_ITER));
        fractalDepth = mix(0.6, 1.0, 1.0 - pow(logIter, 0.5));
    } else {
        // Interior: orbit traps determine local depth
        float tOrigin = clamp(trapMin * 1.2, 0.0, 1.0);
        float tCross = clamp(trapCross * 2.5, 0.0, 1.0);
        float tAngle = fract(orbitAngle * 0.06);

        fractalDepth = tOrigin * 0.3 + tCross * 0.3 + tAngle * 0.4;
        fractalDepth = smoothstep(0.05, 0.95, fractalDepth);
        fractalDepth *= 0.55; // Interior stays in red-green range
    }

    // Final depth: fold structure + fractal detail + radial distance
    // Center of symmetry = low depth = red (closest)
    // More folds from center = higher depth = bluer
    float depth = depthNorm * 0.35 + fractalDepth * 0.45 + radiusDepth * 0.2;

    // Treble adds edge sharpness to depth gradients
    float depthEdge = length(vec2(dFdx(depth), dFdy(depth)));
    depth += depthEdge * TREBLE_DETAIL;

    // Drops push everything toward red (foreground)
    depth = mix(depth, 0.0, DROP_AMOUNT * 0.4);

    depth = clamp(depth, 0.0, 1.0);

    // --- COLOR ---
    vec3 col = chromadepth(depth);

    // Brightness from energy
    col *= clamp(ENERGY_BRIGHT, 0.3, 1.4);

    // Roughness adds grit at fold edges
    float foldEdge = abs(fract(foldDepth) - 0.5) * 2.0;
    float edgeBright = smoothstep(0.7, 1.0, foldEdge) * ROUGHNESS_EDGE;
    col += edgeBright * vec3(1.0, 0.9, 0.8);

    // Saturation boost from bass
    vec3 colHSL = vec3(0.0); // use inline conversion
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 1.0 + BASS_SAT);

    // Beat flash
    col *= BEAT_FLASH;

    // Exterior brightness fade
    if (escaped) {
        float fadeFactor = pow(iterNorm, 0.5);
        col *= mix(0.2, 0.9, fadeFactor);
    }

    col = clamp(col, 0.0, 1.0);

    // --- FRAME FEEDBACK ---
    // Sample previous frame from rotated + scaled position for recursive kaleidoscope
    float fbAngle = iTime * 0.015 + FB_ROTATE;
    float fbScale = clamp(FB_ZOOM, 0.93, 1.07);

    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotatedFB = vec2(
        centered.x * fbc - centered.y * fbs,
        centered.x * fbs + centered.y * fbc
    );
    rotatedFB *= fbScale;
    rotatedFB += 0.5;

    // Add a small warp from the fold structure so feedback follows the pattern
    vec2 foldWarp = vec2(
        sin(foldDepth * 2.0 + iTime * 0.3) * 0.008,
        cos(foldDepth * 2.0 - iTime * 0.2) * 0.008
    );
    rotatedFB += foldWarp;

    rotatedFB = clamp(rotatedFB, 0.0, 1.0);
    vec3 prev = getLastFrameColor(rotatedFB).rgb;

    // Oklab blending for perceptually uniform mix
    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);

    // Decay previous frame to prevent accumulation
    prevOk.x *= 0.96;
    prevOk.yz *= 0.98;

    float fbMix = clamp(FEEDBACK_MIX, 0.1, 0.5);
    // On drops, reduce feedback to let new frame dominate
    fbMix *= (1.0 - DROP_AMOUNT * 0.6);

    // New frame weight
    float newWeight = 1.0 - fbMix;
    vec3 blended = mix(prevOk, colOk, newWeight);

    // Preserve chroma: if blended is losing saturation, pull from fresh frame
    float blendedChroma = length(blended.yz);
    float freshChroma = length(colOk.yz);
    if (blendedChroma < freshChroma * 0.6) {
        blended.yz = mix(blended.yz, colOk.yz, 0.35);
    }

    col = oklab2rgb(blended);

    // --- VIGNETTE ---
    // Darken edges: important for chromadepth (black = neutral)
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.9;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
