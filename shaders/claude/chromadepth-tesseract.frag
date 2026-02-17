// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, tesseract, 4d, geometric, raymarching
// ChromaDepth 4D Tesseract Projection - Raymarched hypercube
// The 3D projection of a rotating 4D hypercube rendered as edges and vertices
// Inner cube = blue/far, outer cube = red/near through ChromaDepth glasses
// Red = closest, Green = mid, Blue/Violet = farthest, Black = neutral

#define MAX_STEPS 40
#define MAX_DIST 20.0
#define SURF_DIST 0.002
#define PI 3.14159265

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// 4D rotation: XW plane driven by bass
#define ROT_XW (iTime * 0.3 + bassZScore * 0.4)
// #define ROT_XW (iTime * 0.3)

// 4D rotation: YW plane driven by treble
#define ROT_YW (iTime * 0.2 + trebleZScore * 0.3)
// #define ROT_YW (iTime * 0.2)

// 4D rotation: ZW plane driven by spectral centroid
#define ROT_ZW (iTime * 0.15 + spectralCentroidZScore * 0.25)
// #define ROT_ZW (iTime * 0.15)

// Projection distance from 4D to 3D (energy scales it)
#define PROJ_DIST (3.0 + energyNormalized * 0.8)
// #define PROJ_DIST 3.0

// Beat spin acceleration: accumulated extra rotation on beat
#define BEAT_SPIN (beat ? 0.5 : 0.0)
// #define BEAT_SPIN 0.0

// Edge thickness modulated by mids
#define EDGE_RADIUS (0.018 + midsZScore * 0.008)
// #define EDGE_RADIUS 0.018

// Vertex sphere radius
#define VERT_RADIUS (0.04 + bassNormalized * 0.015)
// #define VERT_RADIUS 0.04

// Camera orbit
#define CAM_ORBIT (iTime * 0.08 + spectralFluxZScore * 0.1)
// #define CAM_ORBIT (iTime * 0.08)

// Overall brightness from energy
#define BRIGHTNESS (0.85 + energyZScore * 0.15)
// #define BRIGHTNESS 0.85

// Hue shift from pitch class
#define HUE_SHIFT (pitchClassNormalized * 0.05)
// #define HUE_SHIFT 0.0

// Edge glow on beat
#define BEAT_GLOW (beat ? 0.3 : 0.0)
// #define BEAT_GLOW 0.0

// Entropy wobble on vertices
#define ENTROPY_WOBBLE (spectralEntropyNormalized * 0.02)
// #define ENTROPY_WOBBLE 0.0

// Camera zoom from spectral roughness
#define CAM_ZOOM_MOD (spectralRoughnessNormalized * 0.3)
// #define CAM_ZOOM_MOD 0.0

// Trend-based slow rotation boost
#define TREND_BOOST (energySlope * 10.0 * energyRSquared)
// #define TREND_BOOST 0.0

// Bass trend for projection distance modulation
#define BASS_TREND (bassSlope * 8.0 * bassRSquared)
// #define BASS_TREND 0.0

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
// 4D ROTATION MATRICES (applied per-plane)
// ============================================================================

// Rotate in the XW plane
vec4 rotXW(vec4 v, float a) {
    float c = cos(a), s = sin(a);
    return vec4(c * v.x + s * v.w, v.y, v.z, -s * v.x + c * v.w);
}

// Rotate in the YW plane
vec4 rotYW(vec4 v, float a) {
    float c = cos(a), s = sin(a);
    return vec4(v.x, c * v.y + s * v.w, v.z, -s * v.y + c * v.w);
}

// Rotate in the ZW plane
vec4 rotZW(vec4 v, float a) {
    float c = cos(a), s = sin(a);
    return vec4(v.x, v.y, c * v.z + s * v.w, -s * v.z + c * v.w);
}

// ============================================================================
// TESSERACT GEOMETRY
// ============================================================================

// Accumulated beat spin (approximated via time-smoothed effect)
float beatAccum() {
    return BEAT_SPIN * sin(iTime * 5.0);
}

// Project a 4D point to 3D via perspective projection from W axis
vec3 project4Dto3D(vec4 v, float d) {
    float w = d / (d - v.w);
    w = clamp(w, 0.3, 4.0); // prevent extreme projection
    return v.xyz * w;
}

// The 16 vertices of a unit tesseract, rotated in 4D and projected to 3D
// Stored in a fixed array via indexing
vec4 tesseractVertex(int idx) {
    // Each vertex is a combination of +/-1 in each of 4 dimensions
    float x = ((idx & 1) == 0) ? -1.0 : 1.0;
    float y = ((idx & 2) == 0) ? -1.0 : 1.0;
    float z = ((idx & 4) == 0) ? -1.0 : 1.0;
    float w = ((idx & 8) == 0) ? -1.0 : 1.0;
    return vec4(x, y, z, w);
}

// Get rotated + projected vertex position
vec3 getVertex(int idx, float axw, float ayw, float azw, float projD) {
    vec4 v = tesseractVertex(idx);

    // Apply 4D rotations
    v = rotXW(v, axw);
    v = rotYW(v, ayw);
    v = rotZW(v, azw);

    // Add slight wobble from entropy
    v.xyz += ENTROPY_WOBBLE * sin(v.xyz * 3.0 + iTime);

    // Project to 3D
    return project4Dto3D(v, projD);
}

// ============================================================================
// SDF PRIMITIVES
// ============================================================================

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 ab = b - a;
    float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    return length(p - a - ab * t) - r;
}

// ============================================================================
// SCENE SDF - Tesseract edges and vertices
// ============================================================================

// We compute all 32 edges and 16 vertices of the tesseract.
// Two vertices share an edge if they differ in exactly 1 coordinate.

// Store projected vertices in globals to avoid recomputing
vec3 verts[16];
float vertW[16]; // original W coordinate (before projection) for depth coloring

void computeVertices(float axw, float ayw, float azw, float projD) {
    for (int i = 0; i < 16; i++) {
        vec4 v4 = tesseractVertex(i);
        v4 = rotXW(v4, axw);
        v4 = rotYW(v4, ayw);
        v4 = rotZW(v4, azw);
        v4.xyz += ENTROPY_WOBBLE * sin(v4.xyz * 3.0 + iTime);
        vertW[i] = v4.w;
        verts[i] = project4Dto3D(v4, projD);
    }
}

// Return distance to nearest edge and depth info
// depth encodes which part of the tesseract (inner/outer)
struct HitInfo {
    float dist;
    float depth; // 0 = near/red, 1 = far/blue
};

HitInfo tesseractSDF(vec3 p) {
    float minDist = MAX_DIST;
    float hitDepth = 0.5;

    float edgeR = max(EDGE_RADIUS, 0.008);
    float vertR = max(VERT_RADIUS, 0.02);

    // Vertices (16 spheres)
    for (int i = 0; i < 16; i++) {
        float d = sdSphere(p - verts[i], vertR);
        if (d < minDist) {
            minDist = d;
            // Depth based on the original W coordinate: w=-1 is "inner" (far/blue), w=+1 is "outer" (near/red)
            hitDepth = 1.0 - (vertW[i] * 0.5 + 0.5); // map [-1,1] to [1,0] so positive w = red
        }
    }

    // Edges: two vertices share an edge if they differ in exactly 1 bit
    // That gives us 32 edges (16 * 4 / 2)
    for (int i = 0; i < 16; i++) {
        for (int bit = 0; bit < 4; bit++) {
            int j = i ^ (1 << bit);
            if (j > i) { // avoid double counting
                float d = sdCapsule(p, verts[i], verts[j], edgeR);
                if (d < minDist) {
                    minDist = d;
                    // Average depth of the two endpoint vertices
                    float wi = vertW[i];
                    float wj = vertW[j];
                    float avgW = (wi + wj) * 0.5;
                    hitDepth = 1.0 - (avgW * 0.5 + 0.5);
                }
            }
        }
    }

    return HitInfo(minDist, hitDepth);
}

// Wrapper for raymarching (returns just distance)
float sceneDist(vec3 p) {
    return tesseractSDF(p).dist;
}

// ============================================================================
// NORMAL CALCULATION
// ============================================================================

vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.003, 0.0);
    return normalize(vec3(
        sceneDist(p + e.xyy) - sceneDist(p - e.xyy),
        sceneDist(p + e.yxy) - sceneDist(p - e.yxy),
        sceneDist(p + e.yyx) - sceneDist(p - e.yyx)
    ));
}

// ============================================================================
// CEL SHADING
// ============================================================================

float celShade(float d) {
    if (d > 0.65) return 1.0;
    if (d > 0.35) return 0.7;
    if (d > 0.15) return 0.45;
    return 0.25;
}

// ============================================================================
// RAYMARCHING
// ============================================================================

HitInfo raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        HitInfo h = tesseractSDF(p);

        if (h.dist < SURF_DIST) {
            return HitInfo(t, h.depth);
        }
        if (t > MAX_DIST) break;
        t += h.dist * 0.85; // slight relaxation for stability
    }

    return HitInfo(MAX_DIST, 0.5);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // Compute 4D rotation angles
    float beatExtra = beatAccum();
    float axw = ROT_XW + beatExtra + TREND_BOOST * 0.1;
    float ayw = ROT_YW + beatExtra * 0.7;
    float azw = ROT_ZW + beatExtra * 0.5;
    float projD = PROJ_DIST + BASS_TREND * 0.1;
    projD = clamp(projD, 2.0, 5.0);

    // Precompute all 16 projected vertices
    computeVertices(axw, ayw, azw, projD);

    // Camera setup - orbit around the tesseract
    float camAngle = CAM_ORBIT;
    float camR = 5.5 - CAM_ZOOM_MOD;
    camR = max(camR, 3.5);
    float camY = 2.0 + sin(iTime * 0.05) * 0.5;
    vec3 ro = vec3(sin(camAngle) * camR, camY, cos(camAngle) * camR);
    vec3 lookAt = vec3(0.0, 0.0, 0.0);

    // Camera matrix
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    float fov = 1.5;
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // Raymarch
    HitInfo result = raymarch(ro, rd);
    float dist = result.dist;
    float depth = result.depth;

    // Background - dark gradient for chromadepth neutrality
    vec3 col = vec3(0.0);
    float skyGrad = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
    // Very dark background: deep violet fading to black
    vec3 bgCol = hsl2rgb(vec3(0.75, 0.4, mix(0.02, 0.06, skyGrad)));

    // Subtle grid floor for spatial reference
    if (rd.y < -0.01) {
        float floorT = -(ro.y + 2.5) / rd.y;
        if (floorT > 0.0 && floorT < MAX_DIST) {
            vec3 floorP = ro + rd * floorT;
            float gx = abs(fract(floorP.x * 0.5) - 0.5);
            float gz = abs(fract(floorP.z * 0.5 + iTime * 0.05) - 0.5);
            float lineX = smoothstep(0.02, 0.0, gx);
            float lineZ = smoothstep(0.02, 0.0, gz);
            float grid = max(lineX, lineZ);
            float gridFade = exp(-floorT * 0.15);
            // Grid lines in deep blue/violet (far depth)
            vec3 gridCol = chromadepth(0.85) * 0.3;
            bgCol = mix(bgCol, gridCol, grid * gridFade * 0.5);
        }
    }

    col = bgCol;

    if (dist < MAX_DIST) {
        vec3 p = ro + rd * dist;
        vec3 n = getNormal(p);

        // Lighting
        vec3 lightDir = normalize(vec3(0.6, 0.8, 0.4));
        vec3 fillDir = normalize(vec3(-0.3, 0.4, -0.6));
        float diff = max(dot(n, lightDir), 0.0);
        float fill = max(dot(n, fillDir), 0.0) * 0.25;
        float cel = celShade(diff + fill);

        // Rim light for edge pop
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        float rimLight = rim * 0.25;

        // Outline
        float edge = 1.0 - max(dot(n, -rd), 0.0);
        float outline = smoothstep(0.6, 0.75, edge);

        // Map depth to chromadepth color
        // depth: 0 = near (red), 1 = far (blue)
        // Also mix in actual ray distance for additional depth cue
        float distDepth = clamp((dist - 2.0) / 8.0, 0.0, 1.0);
        float combinedDepth = mix(depth, distDepth, 0.3);
        combinedDepth = clamp(combinedDepth + HUE_SHIFT, 0.0, 1.0);

        // Lightness from cel shading
        float lightness = cel;

        // Chromadepth color
        float hue = combinedDepth * 0.82;
        float sat = 0.95 - combinedDepth * 0.1;
        float lit = (0.55 - combinedDepth * 0.12) * lightness;
        lit = clamp(lit, 0.06, 0.55);
        col = hsl2rgb(vec3(hue, sat, lit));

        // Rim light adds brightness at edges
        col += col * rimLight;

        // Beat glow: flash edges brighter on beat
        col += BEAT_GLOW * rim * chromadepth(combinedDepth) * 0.5;

        // Outline darkening for cel look
        col *= (1.0 - outline * 0.7);

        // Apply overall brightness
        col *= clamp(BRIGHTNESS, 0.4, 1.3);

        // Distance fog toward background
        float fog = exp(-dist * 0.08);
        col = mix(bgCol, col, fog);
    }

    // Vignette
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.6;

    // Frame feedback for subtle motion trail
    vec4 prev = getLastFrameColor(screenUV);
    col = mix(prev.rgb * 0.93, col, 0.7);

    // Ensure saturation stays high for chromadepth
    vec3 colHSL = rgb2hsl(col);
    colHSL.y = min(colHSL.y * 1.1, 1.0);
    colHSL.z = clamp(colHSL.z, 0.02, 0.55);
    col = hsl2rgb(colHSL);

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
