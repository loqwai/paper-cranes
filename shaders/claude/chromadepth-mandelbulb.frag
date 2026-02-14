// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, fractal, mandelbulb, raymarching
// ChromaDepth Mandelbulb - Raymarched 3D Mandelbrot fractal
// Red = nearest, Green = mid, Blue/Violet = farthest
// Designed for ChromaDepth 3D glasses

#define MAX_STEPS 35
#define MAX_DIST 15.0
#define SURF_DIST 0.003
#define NORM_EPS 0.005
#define POWER_ITERS 5

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// Power parameter: bass modulates fractal shape between 6-10
#define POWER (8.0 + bassZScore * 2.0)
// #define POWER 8.0

// Camera orbit speed: spectral centroid drives rotation
#define ORBIT_SPEED (0.08 + spectralCentroidZScore * 0.04)
// #define ORBIT_SPEED 0.08

// Camera distance breathing: energy pushes camera in/out
#define CAM_BREATHE (energyZScore * 0.4)
// #define CAM_BREATHE 0.0

// Beat zoom punch: brief zoom on beat
#define BEAT_ZOOM (beat ? 0.5 : 0.0)
// #define BEAT_ZOOM 0.0

// Rim light intensity: treble adds rim glow
#define RIM_INTENSITY (0.3 + max(trebleZScore, 0.0) * 0.5)
// #define RIM_INTENSITY 0.3

// Hue shift from pitch class
#define HUE_SHIFT (pitchClassNormalized * 0.08)
// #define HUE_SHIFT 0.0

// Bass brightness throb
#define BASS_BRIGHT (0.95 + bassNormalized * 0.1)
// #define BASS_BRIGHT 1.0

// Energy-driven saturation boost
#define SAT_BOOST (energyNormalized * 0.15)
// #define SAT_BOOST 0.0

// Spectral flux camera wobble
#define CAM_WOBBLE (spectralFluxZScore * 0.03)
// #define CAM_WOBBLE 0.0

// Mids modulate vertical camera offset
#define CAM_Y_OFFSET (midsZScore * 0.15)
// #define CAM_Y_OFFSET 0.0

// Spectral entropy adds surface detail via DE scale
#define ENTROPY_DETAIL (spectralEntropyNormalized * 0.1)
// #define ENTROPY_DETAIL 0.0

// Beat hue punch toward red
#define BEAT_HUE (beat ? -0.04 : 0.0)
// #define BEAT_HUE 0.0

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
// MANDELBULB DISTANCE ESTIMATOR
// ============================================================================

float mandelbulbDE(vec3 pos) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    float power = POWER;

    for (int i = 0; i < POWER_ITERS; i++) {
        r = length(z);
        if (r > 2.0) break;

        // Convert to spherical coordinates
        float theta = acos(z.z / max(r, 0.001));
        float phi = atan(z.y, z.x);

        // Power the radius
        dr = pow(r, power - 1.0) * power * dr + 1.0;

        // Scale and rotate the point
        float zr = pow(r, power);
        theta *= power;
        phi *= power;

        // Convert back to cartesian
        z = zr * vec3(
            sin(theta) * cos(phi),
            sin(theta) * sin(phi),
            cos(theta)
        );
        z += pos;
    }

    return 0.5 * log(r) * r / max(dr, 0.001);
}

// ============================================================================
// CHEAP AMBIENT OCCLUSION (2 samples)
// ============================================================================

float cheapAO(vec3 p, vec3 n) {
    float d1 = mandelbulbDE(p + n * 0.02);
    float d2 = mandelbulbDE(p + n * 0.08);
    return clamp(0.5 + (d1 + d2) * 8.0, 0.0, 1.0);
}

// ============================================================================
// NORMAL CALCULATION
// ============================================================================

vec3 getNormal(vec3 p) {
    vec2 e = vec2(NORM_EPS, 0.0);
    return normalize(vec3(
        mandelbulbDE(p + e.xyy) - mandelbulbDE(p - e.xyy),
        mandelbulbDE(p + e.yxy) - mandelbulbDE(p - e.yxy),
        mandelbulbDE(p + e.yyx) - mandelbulbDE(p - e.yyx)
    ));
}

// ============================================================================
// CEL SHADING (3-band)
// ============================================================================

float celShade(float d) {
    if (d > 0.6) return 1.0;
    if (d > 0.3) return 0.6;
    return 0.3;
}

// ============================================================================
// RAYMARCHING
// ============================================================================

float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = mandelbulbDE(p);

        if (d < SURF_DIST) return t;
        if (t > MAX_DIST) break;

        t += d;
    }

    return MAX_DIST;
}

// ============================================================================
// HASH
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

    // Camera orbit around the Mandelbulb
    float angle = iTime * ORBIT_SPEED;
    float camY = 0.3 + sin(iTime * 0.06) * 0.2 + CAM_Y_OFFSET;
    float camDist = 2.8 + sin(iTime * 0.09) * 0.3 - CAM_BREATHE - BEAT_ZOOM;
    camDist = max(camDist, 1.8); // don't clip into the bulb

    vec3 ro = vec3(
        sin(angle) * camDist + CAM_WOBBLE * sin(iTime * 3.1),
        camY,
        cos(angle) * camDist + CAM_WOBBLE * cos(iTime * 2.7)
    );

    // Look at origin (center of Mandelbulb)
    vec3 lookAt = vec3(0.0, 0.0, 0.0);
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);

    // FOV with beat zoom
    float fov = 1.8 - BEAT_ZOOM * 0.3;
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // Raymarch
    float dist = raymarch(ro, rd);

    // Background: deep blue/violet sky for far chromadepth
    float skyGrad = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 skyCol = chromadepth(mix(0.85, 1.0, skyGrad));
    skyCol *= mix(0.15, 0.25, skyGrad); // keep sky dark

    vec3 col = skyCol;

    if (dist < MAX_DIST) {
        vec3 p = ro + rd * dist;
        vec3 n = getNormal(p);

        // Single directional light
        vec3 lightDir = normalize(vec3(0.6, 0.8, 0.4));
        float diff = max(dot(n, lightDir), 0.0);

        // Cel-shade the diffuse
        float cel = celShade(diff);

        // Cheap AO
        float ao = cheapAO(p, n);

        // Rim lighting (treble-driven intensity)
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        float rimLight = rim * RIM_INTENSITY;

        // Map hit distance to chromadepth color
        // Closer hits (small dist) = red, farther = green, farthest = blue
        float depthT = clamp((dist - 1.5) / (MAX_DIST - 1.5), 0.0, 1.0);
        depthT = pow(depthT, 0.7); // compress near range for more red/green detail

        // Apply audio hue shifts
        float hueOffset = HUE_SHIFT + BEAT_HUE;

        // Build the chromadepth color
        float hue = fract(depthT * 0.82 + hueOffset);
        float sat = 0.95 - depthT * 0.1 + SAT_BOOST;
        float lit = cel * (0.35 + (1.0 - depthT) * 0.15); // nearer is brighter

        // Apply AO to lightness
        lit *= ao;

        col = hsl2rgb(vec3(hue, clamp(sat, 0.0, 1.0), clamp(lit, 0.05, 0.55)));

        // Add rim light
        vec3 rimCol = chromadepth(max(depthT - 0.15, 0.0)); // rim shifts toward red (nearer)
        col += rimCol * rimLight * 0.5;

        // Bass brightness
        col *= BASS_BRIGHT;

        // Beat flash
        if (beat) {
            col *= 1.15;
        }

        // Depth fog toward background color
        float fog = exp(-dist * 0.12);
        col = mix(skyCol, col, fog);
    }

    // Vignette
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.6;

    // Frame feedback for subtle motion blur
    vec4 prev = getLastFrameColor(screenUV);
    col = mix(prev.rgb * 0.96, col, 0.7);

    // Ensure saturation stays high for chromadepth
    vec3 colHSL = rgb2hsl(col);
    colHSL.y = min(colHSL.y * 1.1, 1.0);
    colHSL.z = clamp(colHSL.z, 0.03, 0.55);
    col = hsl2rgb(colHSL);

    // Subtle dithering
    float dither = (hash(dot(fragCoord, vec2(12.9898, 78.233)) + iTime) - 0.5) / 255.0;
    col += dither;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
