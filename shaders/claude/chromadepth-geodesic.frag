// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, geodesic, sphere, geometric, raymarching
// ChromaDepth Geodesic Sphere - Nested icosahedral shells with fractal subdivision
// Outermost shell = red/near, inner shells = green -> blue/violet (far)
// Camera orbits outside looking through gaps between shells
// Designed for ChromaDepth 3D glasses: Red=near, Green=mid, Blue/Violet=far

#define MAX_STEPS 40
#define MAX_DIST 20.0
#define SURF_DIST 0.003
#define NORM_EPS 0.003
#define PI 3.14159265
#define TAU 6.28318530

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// Shell separation: bass breathing - shells expand/contract
#define SHELL_BREATHE (bassZScore * 0.12)
// #define SHELL_BREATHE 0.0

// Face subdivision detail: spectral centroid shifts edge thickness
#define FACE_DETAIL (spectralCentroidZScore * 0.3)
// #define FACE_DETAIL 0.0

// Rotation speed: pitch class controls orbit rate
#define ROTATION_AUDIO (pitchClassNormalized * 0.4)
// #define ROTATION_AUDIO 0.0

// Face brightness pulse: energy drives individual face glow
#define FACE_BRIGHTNESS (0.85 + energyZScore * 0.15)
// #define FACE_BRIGHTNESS 0.85

// Beat expansion: beat triggers shell expansion pulse
#define BEAT_EXPAND (beat ? 0.15 : 0.0)
// #define BEAT_EXPAND 0.0

// Treble edge glow: treble adds glow between faces
#define EDGE_GLOW_AMOUNT (0.2 + trebleZScore * 0.3)
// #define EDGE_GLOW_AMOUNT 0.2

// Camera zoom from energy
#define CAM_ZOOM (energyNormalized * 0.5)
// #define CAM_ZOOM 0.0

// Bass slope for trend-aware breathing
#define BASS_TREND (bassSlope * 15.0 * bassRSquared)
// #define BASS_TREND 0.0

// Spectral centroid trend for smooth detail changes
#define DETAIL_TREND (spectralCentroidSlope * 10.0 * spectralCentroidRSquared)
// #define DETAIL_TREND 0.0

// Entropy for chaos modulation
#define CHAOS_AMOUNT (spectralEntropyNormalized)
// #define CHAOS_AMOUNT 0.5

// Mids for camera vertical bob
#define CAM_BOB (midsZScore * 0.08)
// #define CAM_BOB 0.0

// Roughness for surface texture
#define SURFACE_ROUGHNESS (spectralRoughnessNormalized)
// #define SURFACE_ROUGHNESS 0.5

// Spectral flux for jitter
#define FLUX_JITTER (spectralFluxZScore * 0.02)
// #define FLUX_JITTER 0.0

// Energy trend for build detection
#define ENERGY_TREND (energySlope * 12.0 * energyRSquared)
// #define ENERGY_TREND 0.0

// Bass normalized for smooth modulation
#define BASS_SMOOTH (bassNormalized)
// #define BASS_SMOOTH 0.5

// Treble normalized
#define TREBLE_SMOOTH (trebleNormalized)
// #define TREBLE_SMOOTH 0.5

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
// UTILITY
// ============================================================================

mat2 rot2(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

// ============================================================================
// ICOSAHEDRON SDF
// ============================================================================

// Icosahedron SDF using the intersection of half-spaces
// The 12 vertices of a regular icosahedron define 20 triangular faces
// We use the face normals for an exact SDF

float sdIcosahedron(vec3 p, float r) {
    // Golden ratio
    float phi = (1.0 + sqrt(5.0)) * 0.5;
    float invLen = 1.0 / sqrt(1.0 + phi * phi);

    // Icosahedron face normals (normalized)
    // There are 20 faces but due to symmetry we only need unique face normal directions
    vec3 n1 = vec3(0.0, 1.0, phi) * invLen;
    vec3 n2 = vec3(0.0, 1.0, -phi) * invLen;
    vec3 n3 = vec3(1.0, phi, 0.0) * invLen;
    vec3 n4 = vec3(-1.0, phi, 0.0) * invLen;
    vec3 n5 = vec3(phi, 0.0, 1.0) * invLen;
    vec3 n6 = vec3(-phi, 0.0, 1.0) * invLen;

    vec3 ap = abs(p);

    // Distance as max of dot products with face normals (exploiting symmetry with abs)
    float d = dot(ap, n1);
    d = max(d, dot(ap, n2));
    d = max(d, dot(ap, n3));
    d = max(d, dot(ap, n4));
    d = max(d, dot(ap, n5));
    d = max(d, dot(ap, n6));

    return d - r;
}

// ============================================================================
// GEODESIC FACE PATTERN
// ============================================================================

// Creates the triangular face subdivision pattern on a sphere surface
// Returns edge distance (0 at edge, positive inside face)
float geodesicFaces(vec3 p, float freq) {
    // Project point onto unit sphere (guard against zero-length)
    vec3 n = normalize(p + vec3(0.0001));

    // Use icosahedral symmetry to fold into fundamental domain
    // We approximate this with a triangular tiling on the sphere
    // using spherical coordinates mapped to a hex/tri grid

    // Convert to spherical coords
    float theta = acos(clamp(n.y, -1.0, 1.0));
    float phi_angle = atan(n.z, n.x);

    // Triangular grid on the sphere surface
    float u = theta * freq;
    float v = phi_angle * freq * 0.5;

    // Triangular tiling
    float gu = fract(u);
    float gv = fract(v);

    // Distance to nearest triangle edge (3 edges per triangle)
    float triEdge;
    if (gu + gv < 1.0) {
        triEdge = min(min(gu, gv), 1.0 - gu - gv);
    } else {
        float gu2 = 1.0 - gu;
        float gv2 = 1.0 - gv;
        triEdge = min(min(gu2, gv2), 1.0 - gu2 - gv2);
    }

    return triEdge;
}

// ============================================================================
// NESTED GEODESIC SHELLS SDF
// ============================================================================

// Returns: vec2(distance, shellIndex)
// shellIndex: 0 = outermost (red/near), higher = inner (blue/far)

vec2 geodesicShells(vec3 p, float time) {
    // Audio-reactive shell parameters
    float breathe = SHELL_BREATHE + BASS_TREND * 0.02;
    float beatPulse = BEAT_EXPAND;

    // Number of nested shells
    float d = MAX_DIST;
    float shellId = 0.0;

    // Detail frequency increases for inner shells (more subdivision)
    float detailBase = 3.0 + FACE_DETAIL + DETAIL_TREND * 0.1;

    for (int i = 0; i < 4; i++) {
        float fi = float(i);

        // Shell radii: outermost (0) to innermost (3)
        float baseRadius = 2.2 - fi * 0.5;

        // Shell radius with breathing and beat
        float radius = baseRadius + breathe * (1.0 - fi * 0.2) + beatPulse * (1.0 - fi * 0.25);

        // Per-shell rotation (inner shells rotate differently)
        vec3 rp = p;
        float rotSpeed = 0.15 + ROTATION_AUDIO;
        float shellAngle = time * rotSpeed * (1.0 + fi * 0.3) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
        rp.xz *= rot2(shellAngle);
        rp.xy *= rot2(shellAngle * 0.3 + fi * 0.5);

        // Icosahedron shell
        float icoD = sdIcosahedron(rp, radius);

        // Shell thickness
        float thickness = 0.04 + 0.02 * BASS_SMOOTH;

        // Hollow shell: intersect outer and inner icosahedra
        float shellD = max(icoD, -(sdIcosahedron(rp, radius - thickness)));

        // Geodesic face pattern: carve gaps along triangle edges
        float faceFreq = detailBase + fi * 1.5;
        float edgeDist = geodesicFaces(rp, faceFreq);

        // Edge width: controls gap size between triangular faces
        float edgeWidth = 0.08 + CHAOS_AMOUNT * 0.04 - TREBLE_SMOOTH * 0.02;
        edgeWidth = max(edgeWidth, 0.03);

        // Carve out edges (create gaps between faces)
        float faceMask = smoothstep(0.0, edgeWidth, edgeDist);

        // Combine: shell geometry with face cutouts
        // Where faceMask is 0 (near edges), push distance away (carve gap)
        float gapCarve = mix(0.05, 0.0, faceMask);
        float finalD = shellD + gapCarve;

        // Individual face pulsing from energy
        if (edgeDist > edgeWidth) {
            vec3 rpn = normalize(rp + vec3(0.0001));
            float faceId = floor(faceFreq * acos(clamp(rpn.y, -1.0, 1.0)))
                         + floor(faceFreq * 0.5 * atan(rpn.z, rpn.x));
            float facePulse = sin(faceId * 3.7 + time * 2.0) * 0.5 + 0.5;
            facePulse *= max(0.0, energyZScore) * 0.01;
            finalD -= facePulse;
        }

        if (finalD < d) {
            d = finalD;
            shellId = fi;
        }
    }

    return vec2(d, shellId);
}

// ============================================================================
// SCENE SDF
// ============================================================================

vec2 sceneSDF(vec3 p) {
    return geodesicShells(p, iTime);
}

// ============================================================================
// NORMAL CALCULATION
// ============================================================================

vec3 getNormal(vec3 p) {
    vec2 e = vec2(NORM_EPS, 0.0);
    float d = sceneSDF(p).x;
    return normalize(vec3(
        sceneSDF(p + e.xyy).x - d,
        sceneSDF(p + e.yxy).x - d,
        sceneSDF(p + e.yyx).x - d
    ));
}

// ============================================================================
// CEL SHADING
// ============================================================================

float celShade(float d) {
    if (d > 0.65) return 1.0;
    if (d > 0.35) return 0.65;
    if (d > 0.1) return 0.4;
    return 0.2;
}

// ============================================================================
// RAYMARCHING
// ============================================================================

vec2 raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        vec2 h = sceneSDF(p);

        if (h.x < SURF_DIST) {
            return vec2(t, h.y);
        }
        if (t > MAX_DIST) break;

        // Step with slight over-relaxation for speed, but safe minimum
        t += max(h.x * 0.8, SURF_DIST * 0.5);
    }

    return vec2(MAX_DIST, -1.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // --- Camera: orbit outside the sphere looking in ---
    float camAngle = iTime * 0.12 + ROTATION_AUDIO * 0.5;
    float camHeight = sin(iTime * 0.07) * 0.8 + CAM_BOB;
    float camRadius = 5.0 - CAM_ZOOM + sin(iTime * 0.09) * 0.3;

    vec3 ro = vec3(
        sin(camAngle) * camRadius,
        1.5 + camHeight,
        cos(camAngle) * camRadius
    );

    // Look at center with slight offset for interest
    vec3 lookAt = vec3(
        sin(iTime * 0.03) * 0.2 + FLUX_JITTER,
        sin(iTime * 0.05) * 0.15,
        cos(iTime * 0.04) * 0.2
    );

    // Camera matrix
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);

    float fov = 1.6 + ENERGY_TREND * 0.05;
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // --- Raymarch ---
    vec2 result = raymarch(ro, rd);
    float dist = result.x;
    float shellId = result.y;

    // --- Background: dark with subtle depth stars ---
    vec3 col = vec3(0.0);

    // Faint starfield for background depth
    float starSeed = hash(floor(rd.x * 80.0) * 100.0 + floor(rd.y * 80.0));
    if (starSeed > 0.97) {
        float twinkle = 0.3 + 0.7 * pow(max(0.0, sin(iTime * 2.0 + starSeed * 50.0)), 8.0);
        col = chromadepth(0.9) * twinkle * 0.3; // far stars = blue/violet
    }

    if (dist < MAX_DIST) {
        vec3 p = ro + rd * dist;
        vec3 n = getNormal(p);

        // --- Lighting ---
        vec3 lightDir = normalize(vec3(0.6, 0.8, 0.4));
        vec3 lightDir2 = normalize(vec3(-0.5, 0.3, -0.6));

        float diff = max(dot(n, lightDir), 0.0);
        float fill = max(dot(n, lightDir2), 0.0) * 0.25;
        float cel = celShade(diff + fill);

        // Rim lighting
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        float rimMask = smoothstep(-0.2, 0.5, dot(n, lightDir));

        // --- ChromaDepth: shell index maps to depth color ---
        // shellId 0 = outermost = red (near), shellId 3 = innermost = blue/violet (far)
        float depthT = shellId / 3.0;

        // Also blend in actual ray distance for subtle depth variation within each shell
        float distT = clamp((dist - 2.5) / 8.0, 0.0, 1.0);
        depthT = mix(depthT, distT, 0.2);

        vec3 baseCol = chromadepth(depthT);

        // Apply cel shading to lightness
        float lightness = 0.3 + cel * 0.5;
        lightness *= clamp(FACE_BRIGHTNESS, 0.5, 1.3);

        col = baseCol * lightness;

        // Rim light: use shell color but brighter
        float rimAmount = rim * rimMask * 0.4;
        col += chromadepth(max(depthT - 0.1, 0.0)) * rimAmount;

        // --- Edge glow between faces (treble-reactive) ---
        // Detect face edges via normal discontinuity
        float edgeDetect = length(vec2(
            length(dFdx(n)),
            length(dFdy(n))
        ));
        float edgeGlow = smoothstep(0.3, 1.5, edgeDetect) * clamp(EDGE_GLOW_AMOUNT, 0.0, 0.8);

        // Edge glow color: slightly warmer (toward red/near) than the shell
        vec3 glowCol = chromadepth(max(depthT - 0.15, 0.0));
        col += glowCol * edgeGlow * 0.6;

        // --- Surface texture from roughness ---
        float texNoise = hash3(floor(p * (8.0 + SURFACE_ROUGHNESS * 4.0)));
        col *= 0.92 + texNoise * 0.08 * SURFACE_ROUGHNESS;

        // --- Beat flash ---
        if (beat) {
            col *= 1.15;
        }

        // --- Depth fog toward background ---
        float fog = exp(-dist * 0.08);
        col = mix(vec3(0.0), col, fog);

    }

    // --- Vignette ---
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    // --- Frame feedback: subtle trail ---
    vec4 prev = getLastFrameColor(screenUV);
    col = mix(prev.rgb * 0.93, col, 0.7);

    // --- Ensure good ChromaDepth saturation ---
    vec3 colHSL = rgb2hsl(col);
    colHSL.y = min(colHSL.y * 1.2, 1.0);
    colHSL.z = clamp(colHSL.z, 0.02, 0.58);
    col = hsl2rgb(colHSL);

    // Subtle dithering
    float dither = (hash(dot(fragCoord, vec2(12.9898, 78.233)) + iTime) - 0.5) / 255.0;
    col += dither;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
