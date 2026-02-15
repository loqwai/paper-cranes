// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, fractal, sierpinski, raymarching
// ChromaDepth 3D Sierpinski Tetrahedron - IFS fractal with cel-shading
// Red = nearest, Green = mid, Blue/Violet = farthest, Black = neutral
// Designed for ChromaDepth 3D glasses

#define MAX_STEPS 40
#define MAX_DIST 20.0
#define SURF_DIST 0.002
#define NORMAL_EPS 0.003

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// Fold parameter modulation: bass morphs the fractal structure
#define FOLD_MOD (bassZScore * 0.08)
// #define FOLD_MOD 0.0

// Rotation speed: spectral centroid drives orbit speed
#define ROT_SPEED (0.15 + spectralCentroidZScore * 0.06)
// #define ROT_SPEED 0.15

// Scale breathing: energy makes the fractal breathe in/out
#define SCALE_BREATHE (1.0 + energyZScore * 0.06)
// #define SCALE_BREATHE 1.0

// Beat zoom punch: brief camera push on beat
#define BEAT_PUNCH (beat ? 0.4 : 0.0)
// #define BEAT_PUNCH 0.0

// Treble edge glow: treble highlights fractal edges
#define TREBLE_GLOW (max(trebleZScore, 0.0) * 0.25)
// #define TREBLE_GLOW 0.0

// Bass brightness throb
#define BASS_BRIGHT (0.95 + bassNormalized * 0.1)
// #define BASS_BRIGHT 1.0

// Pitch class hue offset for chromadepth variation
#define HUE_OFFSET (pitchClassNormalized * 0.04)
// #define HUE_OFFSET 0.0

// Spectral entropy adds jitter to fold offset (chaos → more organic)
#define FOLD_JITTER (spectralEntropyNormalized * 0.03)
// #define FOLD_JITTER 0.0

// Energy trend: confident builds push camera closer
#define ENERGY_TREND (energySlope * 10.0 * energyRSquared)
// #define ENERGY_TREND 0.0

// Mids modulate vertical camera drift
#define VERT_DRIFT (midsZScore * 0.08)
// #define VERT_DRIFT 0.0

// Spectral flux drives fractal rotation wobble
#define FLUX_WOBBLE (spectralFluxZScore * 0.04)
// #define FLUX_WOBBLE 0.0

// Roughness modulates cel-shading threshold
#define CEL_SHIFT (spectralRoughnessNormalized * 0.1)
// #define CEL_SHIFT 0.0

// Bass slope for trend-aware fold animation
#define BASS_TREND (bassSlope * 15.0 * bassRSquared)
// #define BASS_TREND 0.0

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================

vec3 chromadepth(float depth) {
    float t = clamp(depth, 0.0, 1.0);
    float hue = t * 0.82; // red through violet
    float sat = 0.95 - t * 0.1;
    float lit = 0.55 - t * 0.12;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// ROTATION MATRICES
// ============================================================================

mat2 rot2(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// ============================================================================
// SIERPINSKI TETRAHEDRON SDF (IFS folding)
// ============================================================================

// Tetrahedron vertices (regular tetrahedron centered at origin)
const vec3 V0 = vec3(1.0, 1.0, 1.0);
const vec3 V1 = vec3(1.0, -1.0, -1.0);
const vec3 V2 = vec3(-1.0, 1.0, -1.0);
const vec3 V3 = vec3(-1.0, -1.0, 1.0);

// Returns: x = distance, y = fold count (for material)
vec2 sierpinskiSDF(vec3 p) {
    // Audio-modulated scale factor
    float scale = 2.0 * SCALE_BREATHE;

    // Fold offset modulated by bass
    float foldOff = FOLD_MOD + FOLD_JITTER;

    // Slow rotation of the fractal itself
    float rotAngle = iTime * 0.08 + FLUX_WOBBLE;
    p.xz *= rot2(rotAngle);
    p.yz *= rot2(rotAngle * 0.7 + BASS_TREND * 0.02);

    float foldCount = 0.0;

    // IFS iteration: fold toward nearest vertex, scale, translate
    for (int i = 0; i < 8; i++) {
        // Fold across the planes between tetrahedron vertices
        // Each fold reflects p toward the nearest vertex

        // Fold 1: reflect across plane between V0 and V1
        if (p.x + p.y < foldOff) p.xy = vec2(p.y, p.x) - foldOff * 0.5;

        // Fold 2: reflect across plane between V0 and V2
        if (p.x + p.z < foldOff) p.xz = vec2(p.z, p.x) - foldOff * 0.5;

        // Fold 3: reflect across plane between V0 and V3
        if (p.y + p.z < foldOff) p.yz = vec2(p.z, p.y) - foldOff * 0.5;

        // Scale and translate (IFS contraction)
        p = p * scale - (scale - 1.0);

        foldCount += 1.0;
    }

    // Distance estimate: tetrahedron at final scale
    // Use a simple tetrahedron distance at the iterated point
    float d = (length(p) - 1.5) * pow(scale, -8.0);

    return vec2(d, foldCount);
}

// ============================================================================
// CHEAP AO (2-sample)
// ============================================================================

float cheapAO(vec3 p, vec3 n) {
    float d1 = sierpinskiSDF(p + n * 0.08).x;
    float d2 = sierpinskiSDF(p + n * 0.25).x;
    return clamp(0.5 + (d1 + d2) * 3.0, 0.0, 1.0);
}

// ============================================================================
// NORMAL CALCULATION
// ============================================================================

vec3 getNormal(vec3 p) {
    vec2 e = vec2(NORMAL_EPS, 0.0);
    return normalize(vec3(
        sierpinskiSDF(p + e.xyy).x - sierpinskiSDF(p - e.xyy).x,
        sierpinskiSDF(p + e.yxy).x - sierpinskiSDF(p - e.yxy).x,
        sierpinskiSDF(p + e.yyx).x - sierpinskiSDF(p - e.yyx).x
    ));
}

// ============================================================================
// CEL SHADING (3-band quantization)
// ============================================================================

float celShade(float d) {
    float shift = CEL_SHIFT;
    if (d > 0.6 + shift) return 1.0;
    if (d > 0.3 + shift * 0.5) return 0.65;
    return 0.35;
}

// ============================================================================
// RAYMARCHING
// ============================================================================

// Returns: x = distance traveled, y = fold count at hit
vec3 raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        vec2 h = sierpinskiSDF(p);

        if (h.x < SURF_DIST) {
            return vec3(t, h.y, 1.0); // hit: distance, foldCount, hitFlag
        }
        if (t > MAX_DIST) break;

        t += h.x * 0.85; // slight understepping for safety
    }

    return vec3(MAX_DIST, 0.0, 0.0); // miss
}

// ============================================================================
// HASH (for dithering)
// ============================================================================

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // ---- CAMERA ----
    // Slow orbit around the fractal
    float camAngle = iTime * ROT_SPEED;
    float camHeight = 1.2 + sin(iTime * 0.09) * 0.5 + VERT_DRIFT;
    float camRadius = 4.5 - ENERGY_TREND * 0.15;

    // Beat punch: briefly push camera closer
    camRadius -= BEAT_PUNCH;
    camRadius = max(camRadius, 2.5); // don't clip into fractal

    vec3 ro = vec3(
        sin(camAngle) * camRadius,
        camHeight,
        cos(camAngle) * camRadius
    );

    vec3 lookAt = vec3(0.0, 0.2, 0.0);
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);

    // FOV with subtle energy breathing
    float fov = 1.6 - energyNormalized * 0.08;
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // ---- RAYMARCH ----
    vec3 result = raymarch(ro, rd);
    float dist = result.x;
    float foldCount = result.y;
    float hit = result.z;

    // ---- BACKGROUND ----
    // Dark gradient sky for chromadepth (farthest = deep violet/black)
    float skyGrad = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 skyCol = chromadepth(0.9 + skyGrad * 0.1); // deep blue-violet
    skyCol *= mix(0.12, 0.04, skyGrad); // very dark

    vec3 col = skyCol;

    if (hit > 0.5) {
        vec3 p = ro + rd * dist;
        vec3 n = getNormal(p);

        // ---- LIGHTING ----
        vec3 lightDir = normalize(vec3(0.6, 0.9, 0.4));
        vec3 fillDir = normalize(vec3(-0.3, 0.2, -0.6));

        float diff = max(dot(n, lightDir), 0.0);
        float fill = max(dot(n, fillDir), 0.0) * 0.25;
        float cel = celShade(diff + fill);

        // Ambient occlusion
        float ao = cheapAO(p, n);

        // Rim lighting for anime/toon pop
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        float rimMask = smoothstep(0.0, 0.4, dot(n, lightDir) + 0.3);
        float rimLight = rim * rimMask * 0.3;

        // Outline edge detection
        float edge = 1.0 - max(dot(n, -rd), 0.0);
        float outline = smoothstep(0.6, 0.75, edge);

        // ---- CHROMADEPTH COLOR from ray distance ----
        // Map distance: near (2.5) = red (0.0), far (MAX_DIST) = violet (1.0)
        float depthT = clamp((dist - 2.0) / (MAX_DIST * 0.6), 0.0, 1.0);

        // Add fold count as subtle depth variation within similar distances
        float foldVariation = foldCount / 8.0 * 0.06;
        depthT = clamp(depthT + foldVariation, 0.0, 1.0);

        // Apply hue offset from audio
        vec3 baseCol = chromadepth(depthT);

        // Apply hue shift from pitchClass
        vec3 hslCol = rgb2hsl(baseCol);
        hslCol.x = fract(hslCol.x + HUE_OFFSET);

        // Apply cel-shaded lightness
        float lightness = hslCol.z * (0.4 + cel * 0.6);
        lightness *= ao;
        hslCol.z = clamp(lightness, 0.04, 0.58);

        col = hsl2rgb(hslCol);

        // Apply rim light
        col += col * rimLight;

        // Apply treble edge glow
        float edgeGlow = smoothstep(0.0, 0.08, length(vec2(dFdx(depthT), dFdy(depthT))));
        col += edgeGlow * TREBLE_GLOW * vec3(1.0, 0.95, 0.85);

        // Apply outline darkening for cel look
        col *= (1.0 - outline * 0.7);

        // Bass brightness throb
        col *= BASS_BRIGHT;

        // Beat flash
        if (beat) {
            col *= 1.15;
        }

        // Depth fog toward background
        float fog = exp(-dist * 0.08);
        col = mix(skyCol, col, fog);
    }

    // ---- VIGNETTE ----
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    // ---- FRAME FEEDBACK (subtle motion trail) ----
    vec4 prev = getLastFrameColor(screenUV);
    col = mix(prev.rgb * 0.96, col, 0.8);

    // ---- ENSURE SATURATION for chromadepth ----
    vec3 finalHSL = rgb2hsl(col);
    finalHSL.y = min(finalHSL.y * 1.1, 1.0);
    finalHSL.z = clamp(finalHSL.z, 0.03, 0.58);
    col = hsl2rgb(finalHSL);

    // ---- DITHER to reduce banding ----
    float dither = (hash(dot(fragCoord, vec2(12.9898, 78.233)) + iTime) - 0.5) / 255.0;
    col += dither;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
