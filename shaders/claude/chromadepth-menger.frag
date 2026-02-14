// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, fractal, menger, raymarching
// ChromaDepth Menger Sponge - Fly through a fractal box tunnel
// Red = closest, Green = mid, Blue/Violet = farthest, Black = neutral
// Designed for ChromaDepth 3D glasses

#define MAX_STEPS 40
#define MAX_DIST 20.0
#define SURF_DIST 0.002
#define MENGER_ITER 4

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// Bass expands/contracts the sponge scale
#define SPONGE_SCALE (1.0 + bassZScore * 0.08)
// #define SPONGE_SCALE 1.0

// Spectral entropy modulates the cross-shaped hole size
#define HOLE_SIZE (1.05 + spectralEntropyNormalized * 0.25)
// #define HOLE_SIZE 1.2

// Energy drives camera speed
#define CAM_SPEED (0.3 + energyNormalized * 0.5)
// #define CAM_SPEED 0.5

// Beat flashes brightness
#define BEAT_FLASH (beat ? 1.35 : 1.0)
// #define BEAT_FLASH 1.0

// Treble adds edge glow
#define EDGE_GLOW (trebleZScore * 0.15)
// #define EDGE_GLOW 0.0

// Spectral centroid shifts camera look direction
#define LOOK_DRIFT (spectralCentroidZScore * 0.06)
// #define LOOK_DRIFT 0.0

// Mids influence the camera tilt
#define CAM_TILT (midsZScore * 0.04)
// #define CAM_TILT 0.0

// Spectral flux drives subtle rotation of the sponge
#define SPONGE_ROTATE (spectralFluxZScore * 0.03)
// #define SPONGE_ROTATE 0.0

// Bass slope for trend-aware brightness modulation
#define BASS_TREND (bassSlope * 10.0 * bassRSquared)
// #define BASS_TREND 0.0

// Energy slope for anticipation effects
#define ENERGY_TREND (energySlope * 15.0 * energyRSquared)
// #define ENERGY_TREND 0.0

// Pitch class for subtle hue offset
#define HUE_OFFSET (pitchClassNormalized * 0.05)
// #define HUE_OFFSET 0.0

// Roughness for depth contrast
#define DEPTH_CONTRAST (0.9 + spectralRoughnessNormalized * 0.2)
// #define DEPTH_CONTRAST 1.0

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
// MENGER SPONGE SDF
// ============================================================================

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Cross-shaped hole used to carve the Menger sponge
float sdCross(vec3 p, float s) {
    float holeW = s * HOLE_SIZE;
    float a = sdBox(p, vec3(holeW, 999.0, holeW));
    float b = sdBox(p, vec3(999.0, holeW, holeW));
    float c = sdBox(p, vec3(holeW, holeW, 999.0));
    return min(a, min(b, c));
}

float mengerSDF(vec3 p) {
    // Apply audio-reactive scale
    p /= SPONGE_SCALE;

    // Optional subtle rotation from spectral flux
    float ra = SPONGE_ROTATE;
    float cra = cos(ra), sra = sin(ra);
    p.xz = mat2(cra, -sra, sra, cra) * p.xz;

    // Start with a box
    float d = sdBox(p, vec3(1.0));

    float s = 1.0; // current scale

    for (int i = 0; i < MENGER_ITER; i++) {
        // Scale factor for this iteration
        s *= 3.0;
        // Fold into positive octant and tile
        vec3 q = mod(p * s + 1.5, 3.0) - 1.5;
        // Subtract cross-shaped holes
        float cross = sdCross(q, 1.0) / s;
        d = max(d, -cross);
    }

    return d * SPONGE_SCALE;
}

// ============================================================================
// RAYMARCHING
// ============================================================================

struct HitInfo {
    float dist;
    int steps;
};

HitInfo raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    int steps = 0;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = mengerSDF(p);
        if (d < SURF_DIST) {
            steps = i;
            return HitInfo(t, steps);
        }
        if (t > MAX_DIST) break;
        t += d;
        steps = i;
    }
    return HitInfo(-1.0, steps);
}

// ============================================================================
// NORMAL ESTIMATION
// ============================================================================

vec3 getNormal(vec3 p) {
    float e = 0.003;
    float d = mengerSDF(p);
    return normalize(vec3(
        mengerSDF(p + vec3(e, 0, 0)) - d,
        mengerSDF(p + vec3(0, e, 0)) - d,
        mengerSDF(p + vec3(0, 0, e)) - d
    ));
}

// ============================================================================
// CAMERA PATH - Flies through Menger tunnels
// ============================================================================

vec3 cameraPath(float t) {
    // Sinusoidal path that weaves through the cross-shaped tunnels
    // Stay near the center of the holes (which are along axes)
    float x = sin(t * 0.17) * 0.4;
    float y = cos(t * 0.13) * 0.3;
    float z = t * 0.8; // move forward along z
    return vec3(x, y, z);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Camera position along tunnel path
    float camT = iTime * CAM_SPEED;
    vec3 ro = cameraPath(camT);

    // Look-at point slightly ahead on the path
    vec3 lookAt = cameraPath(camT + 1.5);
    lookAt.x += LOOK_DRIFT;
    lookAt.y += CAM_TILT;

    // Camera basis
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0, 1, 0), forward));
    vec3 up = cross(forward, right);

    // Ray direction with slight FOV
    float fov = 1.2;
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // Raymarch
    HitInfo hit = raymarch(ro, rd);

    vec3 col = vec3(0.0); // black background (neutral in chromadepth)

    if (hit.dist > 0.0) {
        vec3 p = ro + rd * hit.dist;
        vec3 n = getNormal(p);

        // --- DEPTH MAPPING ---
        // Map hit distance to 0-1 for chromadepth
        // Near hits = 0.0 (red), far hits = 1.0 (violet)
        float depthT = clamp(hit.dist / MAX_DIST, 0.0, 1.0);

        // Apply depth contrast from roughness
        depthT = pow(depthT, DEPTH_CONTRAST);

        // Apply hue offset from pitch class
        float hueT = fract(depthT + HUE_OFFSET);

        col = chromadepth(hueT);

        // --- LIGHTING ---
        // Single directional light
        vec3 lightDir = normalize(vec3(0.5, 0.8, -0.3));
        float diff = max(dot(n, lightDir), 0.0);

        // Approximate ambient occlusion from step count
        // More steps = tighter geometry = darker
        float ao = 1.0 - float(hit.steps) / float(MAX_STEPS) * 0.7;
        ao = max(ao, 0.15);

        // Ambient + diffuse
        float lighting = 0.2 + 0.8 * diff;
        lighting *= ao;

        col *= lighting;

        // --- EDGE GLOW from treble ---
        // Detect edges via step count (more steps near edges/corners)
        float edgeFactor = float(hit.steps) / float(MAX_STEPS);
        float glow = smoothstep(0.3, 0.8, edgeFactor) * max(EDGE_GLOW, 0.0);
        col += glow * vec3(1.0, 0.9, 0.8);

        // --- TREND-AWARE BRIGHTNESS ---
        // During confident builds, subtly brighten
        float trendBright = 1.0 + clamp(ENERGY_TREND, -0.1, 0.15);
        trendBright += clamp(BASS_TREND, -0.05, 0.1);
        col *= trendBright;

        // --- DISTANCE FOG toward black (neutral depth) ---
        float fog = exp(-hit.dist * 0.12);
        col *= fog;
    }

    // --- BEAT FLASH ---
    col *= BEAT_FLASH;

    // --- FEEDBACK (subtle trail) ---
    vec2 screenUV = fragCoord / iResolution.xy;
    vec3 prev = getLastFrameColor(screenUV).rgb;
    // Gentle feedback: mostly current frame, slight trail for motion blur
    col = mix(prev * 0.95, col, 0.75);

    // --- VIGNETTE (keeps edges dark for chromadepth) ---
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    // Clamp to prevent white-out
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
