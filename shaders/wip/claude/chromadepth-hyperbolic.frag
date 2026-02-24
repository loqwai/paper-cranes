// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, hyperbolic, tiling, poincare
// ChromaDepth Hyperbolic Tiling — Poincaré Disk Model
// Renders a {7,3} hyperbolic tiling where tiles near the center are large (red/close)
// and tiles near the boundary are tiny (blue/far), naturally mapping to chromadepth depth.
// Möbius transformations rotate and translate in hyperbolic space.
// Red = closest, Green = mid-depth, Blue/Violet = farthest, Black = neutral

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// Bass rotates the disk via Möbius transform
#define DISK_ROTATION (bassZScore * 0.15)
// #define DISK_ROTATION 0.0

// Energy scales overall tile brightness
#define TILE_BRIGHTNESS (0.7 + energyNormalized * 0.5)
// #define TILE_BRIGHTNESS 1.0

// Spectral entropy distorts near boundary
#define BOUNDARY_DISTORT (spectralEntropyNormalized * 0.08)
// #define BOUNDARY_DISTORT 0.0

// Pitch class shifts base hue
#define HUE_SHIFT (pitchClassNormalized * 0.12)
// #define HUE_SHIFT 0.0

// Beat triggers ripple from center outward
#define BEAT_RIPPLE (beat ? 1.0 : 0.0)
// #define BEAT_RIPPLE 0.0

// Spectral centroid shifts the Möbius translation point
#define MOBIUS_DRIFT (spectralCentroidZScore * 0.06)
// #define MOBIUS_DRIFT 0.0

// Treble brightens edge glow
#define EDGE_GLOW_STRENGTH (0.4 + trebleZScore * 0.2)
// #define EDGE_GLOW_STRENGTH 0.4

// Mids shift the tiling offset
#define TILING_SHIFT (midsZScore * 0.03)
// #define TILING_SHIFT 0.0

// Spectral flux adds shimmer to edges
#define EDGE_SHIMMER (spectralFluxZScore * 0.15)
// #define EDGE_SHIMMER 0.0

// Bass slope controls slow rotation drift
#define SLOW_ROTATE (bassSlope * 80.0 * bassRSquared)
// #define SLOW_ROTATE 0.0

// Roughness adds grain to tile fills
#define TILE_GRAIN (spectralRoughnessNormalized * 0.15)
// #define TILE_GRAIN 0.0

// Energy trend confidence gates feedback
#define TREND_CONFIDENCE (energyRSquared)
// #define TREND_CONFIDENCE 0.5

// Bass normalized for gentle pulsing
#define BASS_PULSE (bassNormalized * 0.08)
// #define BASS_PULSE 0.0

// Treble normalized for edge detail
#define TREBLE_DETAIL (trebleNormalized)
// #define TREBLE_DETAIL 0.5

// ============================================================================
// CONSTANTS
// ============================================================================

#define PI 3.14159265359
#define TAU 6.28318530718
#define P 7        // p-gon tiling: heptagonal
#define Q 3        // q polygons meet at each vertex
#define FP float(P)
#define FQ float(Q)

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
// COMPLEX ARITHMETIC HELPERS
// ============================================================================

// Complex multiplication: (a+bi)(c+di)
vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// Complex conjugate
vec2 cconj(vec2 z) {
    return vec2(z.x, -z.y);
}

// Complex division: a / b
vec2 cdiv(vec2 a, vec2 b) {
    float d = dot(b, b);
    return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / max(d, 1e-10);
}

// ============================================================================
// MÖBIUS TRANSFORMATION
// ============================================================================
// Möbius transform: f(z) = (z - a) / (1 - conj(a)*z)
// This is a hyperbolic isometry on the Poincaré disk (|a| < 1)

vec2 mobius(vec2 z, vec2 a) {
    vec2 num = z - a;
    vec2 den = vec2(1.0, 0.0) - cmul(cconj(a), z);
    return cdiv(num, den);
}

// Rotation in the complex plane
vec2 crot(vec2 z, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(z.x * c - z.y * s, z.x * s + z.y * c);
}

// ============================================================================
// HYPERBOLIC DISTANCE
// ============================================================================
// Hyperbolic distance from origin in Poincaré disk: d = 2 * atanh(|z|)

float hypDist(vec2 z) {
    float r = length(z);
    r = min(r, 0.999);
    return 2.0 * atanh(r);
}

// ============================================================================
// {7,3} TILING VIA REFLECTIONS
// ============================================================================
// Strategy: reflect the point across the edges of a fundamental domain
// until we land inside it. Count reflections for tile coloring.
//
// The fundamental domain of {p,q} has angles PI/p, PI/q, PI/2 at the
// three vertices of a hyperbolic triangle.

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // --- UV setup ---
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Scale to fit disk nicely in viewport
    uv *= 2.2;

    float r = length(uv);

    // Outside the disk = black (neutral in chromadepth)
    if (r >= 1.0) {
        // Faint boundary ring
        float ring = smoothstep(1.02, 1.0, r) * smoothstep(0.98, 1.0, r);
        vec3 rimColor = chromadepth(0.95) * ring * 0.3;
        fragColor = vec4(rimColor, 1.0);
        return;
    }

    // --- Apply audio-reactive Möbius transform ---
    // This rotates/translates the entire hyperbolic plane

    // Rotation via complex multiplication
    float rotAngle = iTime * 0.03 + DISK_ROTATION + SLOW_ROTATE * 0.01;
    vec2 z = crot(uv, rotAngle);

    // Translation via Möbius transform (shifts the "center" of the view)
    float driftAngle = iTime * 0.07 + TILING_SHIFT;
    vec2 mobiusCenter = vec2(
        cos(driftAngle) * (0.1 + MOBIUS_DRIFT * 0.5),
        sin(driftAngle * 0.7) * (0.08 + TILING_SHIFT)
    );
    // Keep Möbius center strictly inside disk
    float mcLen = length(mobiusCenter);
    if (mcLen > 0.45) mobiusCenter *= 0.45 / max(mcLen, 0.001);

    z = mobius(z, mobiusCenter);

    // Boundary distortion: warp points near boundary
    float zr = length(z);
    if (zr > 0.7) {
        float distortAmount = (zr - 0.7) / 0.3 * BOUNDARY_DISTORT;
        float da = sin(atan(z.y, z.x) * 5.0 + iTime * 0.5) * distortAmount;
        z = crot(z, da);
    }

    // --- Fundamental domain via reflections ---
    // For {p,q}: reflect across hyperbolic lines that bound the fundamental triangle
    //
    // Edge 1: the line through the origin at angle PI/p (geodesic = diameter)
    // Edge 2: the perpendicular bisector (geodesic arc)
    // Edge 3: the line through the origin along the real axis

    // Precompute angles
    float angleP = PI / FP;  // PI/7
    float angleQ = PI / FQ;  // PI/3

    // The hyperbolic distance from center to the midpoint of a p-gon edge
    // For {p,q}: cosh(d) = cos(PI/q) / sin(PI/p)
    float coshD = cos(angleQ) / max(sin(angleP), 0.001);
    // Convert to Poincaré disk radius: r = tanh(d/2)
    // From cosh(d): sinh(d) = sqrt(cosh^2 - 1), tanh(d/2) = sinh(d)/(1+cosh(d))
    float sinhD = sqrt(max(coshD * coshD - 1.0, 0.0));
    float edgeR = sinhD / (1.0 + coshD);

    // The reflection geodesic (circle orthogonal to unit disk)
    // passes through edgeR at angle 0, and is orthogonal to the unit circle.
    // Center of the geodesic circle: at distance 1/edgeR from origin along angle 0
    // Radius of the geodesic circle: sqrt(1/edgeR^2 - 1)
    float geoCenter = 1.0 / max(edgeR, 0.001);
    float geoRadius = sqrt(max(geoCenter * geoCenter - 1.0, 0.0));

    int reflCount = 0;
    const int MAX_REFLECT = 32;

    for (int i = 0; i < MAX_REFLECT; i++) {
        bool reflected = false;

        // Reflection 1: across the real axis (y < 0 -> reflect)
        if (z.y < 0.0) {
            z.y = -z.y;
            reflCount++;
            reflected = true;
        }

        // Reflection 2: across the line at angle PI/p from origin
        // This is a Euclidean reflection across the line y = x*tan(PI/p)
        float lineAngle = angleP;
        // Rotate z by -lineAngle, reflect if y < 0, rotate back
        vec2 zRot = crot(z, -lineAngle);
        if (zRot.y < 0.0) {
            zRot.y = -zRot.y;
            z = crot(zRot, lineAngle);
            reflCount++;
            reflected = true;
        }

        // Reflection 3: across the geodesic (circle inversion)
        // The geodesic is the circle centered at (geoCenter, 0) with radius geoRadius
        vec2 circleCenter = vec2(geoCenter, 0.0);
        vec2 diff = z - circleCenter;
        float dist2 = dot(diff, diff);
        if (dist2 < geoRadius * geoRadius) {
            // Invert through the circle
            z = circleCenter + diff * (geoRadius * geoRadius) / max(dist2, 1e-10);
            reflCount++;
            reflected = true;
        }

        if (!reflected) break;
    }

    // --- Tile identification and coloring ---

    // Distance from the point to the fundamental domain edges = edge proximity
    // Edge to real axis
    float edgeDist1 = abs(z.y);
    // Edge to line at angle PI/p
    float cosA = cos(angleP);
    float sinA = sin(angleP);
    float edgeDist2 = abs(-z.x * sinA + z.y * cosA);
    // Edge to geodesic circle
    vec2 circleCenter = vec2(geoCenter, 0.0);
    float edgeDist3 = abs(length(z - circleCenter) - geoRadius);

    float minEdgeDist = min(min(edgeDist1, edgeDist2), edgeDist3);

    // --- Depth mapping: distance from center = depth ---
    float diskR = length(uv); // use original UV for depth, not transformed
    float depth = diskR;      // 0 at center (red/close), 1 at boundary (blue/far)

    // Apply hue shift from pitch class
    float depthShifted = fract(depth + HUE_SHIFT);

    // --- Chromadepth coloring ---
    vec3 tileColor = chromadepth(depthShifted);

    // Tile parity coloring: even/odd reflections get slightly different treatment
    float parity = mod(float(reflCount), 2.0);

    // Vary brightness by parity and tile grain
    float tileBright = mix(0.85, 1.0, parity);
    tileBright *= TILE_BRIGHTNESS;

    // Add subtle variation based on reflection count for tile identity
    float tileId = float(reflCount) / float(MAX_REFLECT);
    float tileHueShift = tileId * 0.04 * (1.0 + TILE_GRAIN);
    tileColor = chromadepth(fract(depthShifted + tileHueShift));

    // --- Edge glow (tile boundary detection) ---
    float edgeWidth = 0.008 + 0.004 * (1.0 - diskR); // thicker edges near center
    float edgeGlow = smoothstep(edgeWidth * 1.5, edgeWidth * 0.3, minEdgeDist);

    // Edge shimmer from spectral flux
    float shimmer = 1.0 + sin(float(reflCount) * 2.7 + iTime * 3.0) * EDGE_SHIMMER * 0.5;
    edgeGlow *= shimmer;

    // Edge color: bright warm white near center, cool at edges
    vec3 edgeColor = chromadepth(depthShifted * 0.8) * (1.3 + TREBLE_DETAIL * 0.3);
    edgeColor = mix(edgeColor, vec3(1.0, 0.95, 0.9), 0.3);

    float edgeIntensity = clamp(EDGE_GLOW_STRENGTH + EDGE_SHIMMER * 0.2, 0.0, 1.0);

    // --- Beat ripple ---
    float ripplePhase = fract(iTime * 0.8);  // continuous phase
    float ripple = sin((diskR - ripplePhase) * 25.0) * exp(-diskR * 3.0);
    ripple *= BEAT_RIPPLE * 0.15;

    // --- Compose final color ---
    vec3 col = tileColor * tileBright;

    // Add edge glow
    col = mix(col, edgeColor, edgeGlow * edgeIntensity);

    // Add ripple brightness
    col *= 1.0 + ripple;

    // Add bass pulse (gentle overall brightness pulse)
    col *= 1.0 + BASS_PULSE * sin(iTime * 2.0);

    // Tile grain: subtle noise-like variation
    float grain = fract(sin(dot(z, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * TILE_GRAIN * 0.1;

    // --- Feedback: subtle trail from previous frame ---
    vec2 screenUV = fragCoord / iResolution.xy;
    vec3 prev = getLastFrameColor(screenUV).rgb;
    float fbAmount = 0.15 + TREND_CONFIDENCE * 0.1;
    fbAmount = clamp(fbAmount, 0.1, 0.35);
    col = mix(prev * 0.95, col, 1.0 - fbAmount);

    // --- Vignette (dark edges for chromadepth) ---
    vec2 vc = fragCoord.xy / iResolution.xy - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    // Clamp to prevent white-out
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
