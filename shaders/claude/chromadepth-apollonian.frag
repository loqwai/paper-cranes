// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, fractal, apollonian, spheres, raymarching
// ChromaDepth Apollonian Gasket - Nested sphere inversion fractal
// Red = nearest (large outer spheres), Violet = farthest (tiny inner spheres)
// Designed for ChromaDepth 3D glasses

#define MAX_STEPS 40
#define MAX_DIST 20.0
#define SURF_DIST 0.002
#define NORM_EPS 0.003

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// Inversion radius: bass modulates the fractal's inversion sphere
#define INV_RADIUS (1.0 + bassZScore * 0.08)
// #define INV_RADIUS 1.0

// Fold offset: spectral centroid shifts the fold position
#define FOLD_OFFSET (1.0 + spectralCentroidZScore * 0.06)
// #define FOLD_OFFSET 1.0

// Brightness: energy drives overall lightness
#define BRIGHTNESS (0.55 + energyZScore * 0.12)
// #define BRIGHTNESS 0.55

// Beat pulse: brief flash on beats
#define BEAT_PULSE (beat ? 1.25 : 1.0)
// #define BEAT_PULSE 1.0

// Treble specular: treble boosts specular highlights
#define SPEC_POWER (16.0 + trebleZScore * 8.0)
// #define SPEC_POWER 16.0

// Specular intensity from treble
#define SPEC_INTENSITY (0.3 + trebleNormalized * 0.4)
// #define SPEC_INTENSITY 0.3

// Camera orbit speed modulation
#define CAM_SPEED (0.08 + spectralFluxZScore * 0.02)
// #define CAM_SPEED 0.08

// Color depth shift from spectral entropy
#define DEPTH_SHIFT (spectralEntropyNormalized * 0.1)
// #define DEPTH_SHIFT 0.0

// Pitch class hue nudge
#define HUE_NUDGE (pitchClassNormalized * 0.05)
// #define HUE_NUDGE 0.0

// Bass slope for slow structural drift
#define STRUCT_DRIFT (bassSlope * 0.3)
// #define STRUCT_DRIFT 0.0

// Camera distance modulation from energy
#define CAM_DIST_MOD (energyNormalized * 0.5)
// #define CAM_DIST_MOD 0.0

// Mids modulate ambient light
#define AMBIENT (0.15 + midsZScore * 0.05)
// #define AMBIENT 0.15

// Spectral roughness adds grit to the surface
#define SURFACE_GRIT (spectralRoughnessNormalized * 0.02)
// #define SURFACE_GRIT 0.0

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================
// Maps 0-1 depth to chromadepth rainbow:
// 0.0 = red (closest), 0.5 = green (mid), 1.0 = blue/violet (farthest)

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float sat = 0.95 - t * 0.1;
    float lit = 0.55 - t * 0.12;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// APOLLONIAN GASKET SDF (Sphere Inversion Fractal)
// ============================================================================

// Returns vec2(distance, generation) where generation = iteration depth
vec2 apollonianSDF(vec3 p) {
    float scale = 1.0;
    float invR = INV_RADIUS;
    float foldOff = FOLD_OFFSET;
    float generation = 0.0;

    // Sphere inversion fractal: fold, invert, repeat
    for (int i = 0; i < 6; i++) {
        // Box fold: reflect into positive octant with offset
        p = abs(p);
        // Conditional folds to create gasket structure
        if (p.x - p.y < 0.0) p.xy = p.yx;
        if (p.x - p.z < 0.0) p.xz = p.zx;
        if (p.y - p.z < 0.0) p.yz = p.zy;

        // Offset fold to break symmetry and create nesting
        p = p * 2.0 - vec3(foldOff + STRUCT_DRIFT);
        scale *= 2.0;

        // Sphere inversion: invert through sphere of radius invR
        float r2 = dot(p, p);
        float k = max(invR / r2, 1.0);
        p *= k;
        scale *= k;

        generation += 1.0;
    }

    // Final distance estimate: sphere at the end
    float d = (length(p) - 1.0 + SURFACE_GRIT * sin(p.x * 30.0 + p.y * 30.0)) / max(scale, 0.001);

    return vec2(d, generation);
}

// ============================================================================
// RAYMARCHING
// ============================================================================

// Returns vec4(distance, generation, steps, closest_approach)
vec4 raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    float minDist = MAX_DIST;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        vec2 res = apollonianSDF(p);
        float d = res.x;

        minDist = min(minDist, d);

        if (d < SURF_DIST) {
            return vec4(t, res.y, float(i), minDist);
        }
        if (t > MAX_DIST) break;

        // Step with a safety factor for the inversion SDF
        t += d * 0.8;
    }

    return vec4(MAX_DIST, 0.0, float(MAX_STEPS), minDist);
}

// ============================================================================
// NORMAL CALCULATION
// ============================================================================

vec3 getNormal(vec3 p) {
    vec2 e = vec2(NORM_EPS, 0.0);
    return normalize(vec3(
        apollonianSDF(p + e.xyy).x - apollonianSDF(p - e.xyy).x,
        apollonianSDF(p + e.yxy).x - apollonianSDF(p - e.yxy).x,
        apollonianSDF(p + e.yyx).x - apollonianSDF(p - e.yyx).x
    ));
}

// ============================================================================
// CHEAP AMBIENT OCCLUSION (2 samples for mobile)
// ============================================================================

float cheapAO(vec3 p, vec3 n) {
    float d1 = apollonianSDF(p + n * 0.1).x;
    float d2 = apollonianSDF(p + n * 0.3).x;
    return clamp(0.5 + (d1 + d2) * 2.0, 0.0, 1.0);
}

// ============================================================================
// HASH FUNCTION
// ============================================================================

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Camera: slow orbit around the fractal
    float camAngle = iTime * CAM_SPEED;
    float camPitch = sin(iTime * 0.03) * 0.2 + 0.3;
    float camDist = 4.5 - CAM_DIST_MOD;

    vec3 ro = vec3(
        sin(camAngle) * cos(camPitch) * camDist,
        sin(camPitch) * camDist * 0.6 + 0.5,
        cos(camAngle) * cos(camPitch) * camDist
    );

    vec3 lookAt = vec3(0.0, 0.0, 0.0);

    // Camera matrix
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);

    float fov = 1.6;
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // Raymarch
    vec4 result = raymarch(ro, rd);
    float dist = result.x;
    float generation = result.y;
    float steps = result.z;
    float closest = result.w;

    // Background: deep black/dark violet gradient (neutral in chromadepth)
    vec3 col = vec3(0.0);
    float skyGrad = rd.y * 0.5 + 0.5;
    // Very subtle dark background - mostly black for chromadepth neutrality
    vec3 bgCol = hsl2rgb(vec3(0.75, 0.3, 0.02 + skyGrad * 0.02));
    col = bgCol;

    // Glow from near-misses (AO glow around the fractal)
    if (dist >= MAX_DIST && closest < 0.5) {
        float glowIntensity = exp(-closest * 6.0);
        // Glow uses depth coloring too - far misses = violet glow
        float glowDepth = 0.7 + 0.3 * (1.0 - glowIntensity);
        vec3 glowCol = chromadepth(glowDepth) * glowIntensity * 0.3;
        col += glowCol;
    }

    if (dist < MAX_DIST) {
        vec3 p = ro + rd * dist;
        vec3 n = getNormal(p);

        // Map generation to chromadepth depth:
        // generation 0-1 = large outer spheres = red (near) = t near 0
        // generation 5-6 = tiny inner spheres = violet (far) = t near 1
        float depthT = generation / 6.0;
        depthT = clamp(depthT + DEPTH_SHIFT, 0.0, 1.0);

        // Also blend in ray distance for spatial depth
        float rayDepthT = clamp((dist - 1.5) / 10.0, 0.0, 1.0);
        // Mix: 70% generation-based, 30% ray-distance-based
        float finalDepth = mix(depthT, rayDepthT, 0.3);
        finalDepth = clamp(finalDepth + HUE_NUDGE, 0.0, 1.0);

        // Get chromadepth base color
        vec3 baseCol = chromadepth(finalDepth);

        // Lighting
        vec3 lightDir = normalize(vec3(0.6, 0.8, 0.4));
        vec3 halfVec = normalize(lightDir - rd);

        float diff = max(dot(n, lightDir), 0.0);
        float spec = pow(max(dot(n, halfVec), 0.0), SPEC_POWER);

        // Fill light from opposite side
        vec3 fillDir = normalize(vec3(-0.4, 0.3, -0.6));
        float fill = max(dot(n, fillDir), 0.0) * 0.25;

        // Ambient occlusion
        float ao = cheapAO(p, n);

        // Combine lighting
        float ambient = clamp(AMBIENT, 0.05, 0.4);
        float lighting = ambient + diff * 0.6 + fill;
        lighting *= ao;
        lighting = clamp(lighting, 0.0, 1.0);

        // Apply lighting to base chromadepth color
        // Modulate lightness without destroying hue/saturation
        vec3 litCol = baseCol * lighting;

        // Add specular highlight (white-ish, keeping chromadepth readable)
        vec3 specCol = chromadepth(max(finalDepth - 0.15, 0.0)); // specular tinted toward nearer hue
        litCol += specCol * spec * SPEC_INTENSITY;

        // Fake reflection: blend with a shifted depth color based on normal direction
        float reflectT = clamp(finalDepth + (n.y * 0.15 - n.x * 0.1), 0.0, 1.0);
        vec3 reflCol = chromadepth(reflectT) * 0.15;
        litCol = mix(litCol, reflCol, 0.15);

        // Brightness modulation
        litCol *= clamp(BRIGHTNESS, 0.2, 1.0);

        // Beat pulse
        litCol *= BEAT_PULSE;

        // Rim lighting for edge pop
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        vec3 rimCol = chromadepth(max(finalDepth - 0.2, 0.0));
        litCol += rimCol * rim * 0.2;

        // Depth fog: fade distant surfaces toward black (neutral in chromadepth)
        float fog = exp(-dist * 0.12);
        litCol = mix(bgCol, litCol, fog);

        col = litCol;
    }

    // Vignette (keeps edges dark = neutral in chromadepth)
    vec2 vc = fragCoord / iResolution.xy - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.6;

    // Gentle frame feedback for motion smoothing
    vec4 prev = getLastFrameColor(fragCoord / iResolution.xy);
    col = mix(prev.rgb * 0.97, col, 0.7);

    // Ensure saturation stays high for chromadepth effect
    vec3 colHSL = rgb2hsl(col);
    colHSL.y = min(colHSL.y * 1.1, 1.0);
    colHSL.z = clamp(colHSL.z, 0.0, 0.6);
    col = hsl2rgb(colHSL);

    // Subtle dithering to reduce banding
    float dither = (hash(dot(fragCoord, vec2(12.9898, 78.233)) + iTime) - 0.5) / 255.0;
    col += dither;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
