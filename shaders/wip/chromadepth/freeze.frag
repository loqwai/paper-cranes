// @fullscreen: true
// Chromadepth Mandelbox - Audio-reactive fractal for chromadepth 3D glasses
//
// STATUS: Exploring smoothness vs audio-reactivity
// - Switched from z-scores to hybrid approach (normalized * sign(zScore))
//   for smoother modulation while preserving directionality
// - Added CLOSENESS param to control chromadepth depth perception
//   Higher = warmer/closer feel, Lower = more depth layering
// - Camera positioned at symmetric corner (2.5, 2.5, -2.5) looking at origin
//   for clear central focal point
// - All params exposed as URL uniforms for exploration (?param=value)
//
// NEXT: Wire CLOSENESS to audio (bass → closeness UP = punch forward)
//
// PRESETS:
// Default symmetric view - good starting point
// https://visuals.beadfamous.com/?shader=wip/chromadepth/2&noaudio=true&time_val=0&closeness=1.0&cam_x=2.5&cam_y=2.5&cam_z=-2.5&look_at_x=0&look_at_y=0&look_at_z=0&hue_near=0.0&hue_far=0.7&trap_scale=1.5&scale_mod=0&brightness=1.0&zoom=0&fov_mod=1.0&look_x=0&look_y=0&feedback=0.15&hue_shift=0
// Deep layered depth - more chromadepth separation
// https://visuals.beadfamous.com/?shader=wip/chromadepth/2&noaudio=true&time_val=0&closeness=0.4&cam_x=2.5&cam_y=2.5&cam_z=-2.5&look_at_x=0&look_at_y=0&look_at_z=0&hue_near=0.0&hue_far=0.75&trap_scale=2.0&scale_mod=-0.05&brightness=1.1&zoom=0.1&fov_mod=0.95&look_x=0&look_y=0&feedback=0.1&hue_shift=0
// Close warm feel - everything pops forward
// https://visuals.beadfamous.com/?shader=wip/chromadepth/2&noaudio=true&time_val=0&closeness=2.5&cam_x=2.0&cam_y=2.0&cam_z=-2.0&look_at_x=0&look_at_y=0&look_at_z=0&hue_near=0.0&hue_far=0.5&trap_scale=1.0&scale_mod=0.05&brightness=1.2&zoom=0.2&fov_mod=1.1&look_x=0&look_y=0&feedback=0.2&hue_shift=0.05

#define MAX_STEPS 50
#define MAX_DIST 20.0
#define SURF_DIST 0.0015
#define FRAC_ITERS 8

// ============================================================================
// CHROMADEPTH COLOR PARAMETERS - TWEAK THESE!
// ============================================================================

// Hue range - controls chromadepth "closeness" perception
#define HUE_NEAR (hue_near)   // URL: ?hue_near=0.0 (red=close)
// #define HUE_NEAR 0.0
#define HUE_FAR (hue_far)     // URL: ?hue_far=0.7 (blue=far)
// #define HUE_FAR 0.7

// DEPTH SOURCE - which metric to use for chromadepth
// 0 = ray distance, 1 = world Z position, 2 = orbit trap, 3 = distance from origin
#define DEPTH_SOURCE 2

// Depth range for sources 0,1,3 (tune based on what you see)
#define DEPTH_MIN 0.0
#define DEPTH_MAX 3.0

// Orbit trap scaling (for source 2)
#define TRAP_SCALE (trap_scale)  // URL: ?trap_scale=1.5 (higher = more spread)
// #define TRAP_SCALE 1.5

// Depth curve: <1 = more warm/close, >1 = more cool/far
// Inverted from CLOSENESS so higher closeness = warmer/closer feel
#define DEPTH_CURVE (1.0 / max(CLOSENESS, 0.1))
// #define DEPTH_CURVE 0.5

// Mix multiple sources for richer variation
#define MIX_TRAP 0.5          // How much orbit trap affects hue (0-1)
#define MIX_NORMAL 0.2        // How much surface normal affects hue (0-1)

// Saturation
#define SAT_BASE 0.95         // Base saturation (0.9-1.0 for chromadepth)
// #define SAT_BASE 0.8

// Lightness range
#define LIGHT_MIN 0.25        // Darkest (shadowed areas)
#define LIGHT_MAX 0.55        // Brightest (lit areas)
#define LIGHT_BASE 0.35       // Base lightness before lighting
#define LIGHT_DIFFUSE 0.25    // How much lighting adds

// Edge glow
#define EDGE_HUE_OFFSET 0.15  // Hue shift for edges (0 = same, 0.5 = complement)
#define EDGE_LIGHT_BOOST 0.1  // How much brighter edges are
#define EDGE_AMOUNT 0.4       // Overall edge intensity
// #define EDGE_AMOUNT 0.0    // No edges

// Beat "pop" effect - shifts hue toward red (closer = more effect)
#define BEAT_HUE_SHIFT -0.15  // Negative = toward red, positive = toward blue
#define BEAT_LIGHT_BOOST 1.15 // Brightness multiplier on beat
#define BEAT_SAT_BOOST 1.2    // Saturation multiplier on beat

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants/URL params for audio uniforms)
// URL params auto-become uniforms: ?scale_mod=0.1 → uniform float scale_mod
// Comment/uncomment to swap between explore mode and audio-reactive mode
// ============================================================================

// Time: freeze animation for exploration
#define TIME time // URL: ?time_val=5.0
// #define TIME (TIME)

// Hue shift
#define HUE_SHIFT (hue_shift)  // URL: ?hue_shift=0.1
// #define HUE_SHIFT (pitchClassNormalized * 0.3)

// Scale modifier: affects fractal density
#define SCALE_MOD (scale_mod)  // URL: ?scale_mod=-0.1
// #define SCALE_MOD (-spectralEntropyNormalized * 0.12 * sign(spectralEntropyZScore))

// Brightness multiplier
#define BRIGHTNESS (brightness)  // URL: ?brightness=1.0
// #define BRIGHTNESS (1.0 + bassNormalized * 0.2)

// Zoom: camera push/pull along view direction
#define ZOOM (zoom)  // URL: ?zoom=0.1
// #define ZOOM (spectralFluxNormalized * 0.22 * sign(spectralFluxZScore))

// FOV modifier
#define FOV_MOD (fov_mod)  // URL: ?fov_mod=1.0
// #define FOV_MOD (1.0 - energyNormalized * 0.15)

// Camera sway
#define LOOK_X (look_x)  // URL: ?look_x=0.02
// #define LOOK_X (trebleNormalized * 0.03 * sign(trebleZScore))
#define LOOK_Y (look_y)  // URL: ?look_y=0.01
// #define LOOK_Y (spectralSpreadNormalized * 0.02 * sign(spectralSpreadZScore))

// Frame feedback strength
#define FEEDBACK_STRENGTH (feedback)  // URL: ?feedback=0.15
// #define FEEDBACK_STRENGTH 0.15

// Camera position - symmetric corner view with central focal point
#define CAM_X (cam_x)  // URL: ?cam_x=2.5
// #define CAM_X 2.5
#define CAM_Y (cam_y)  // URL: ?cam_y=2.5
// #define CAM_Y 2.5
#define CAM_Z (cam_z)  // URL: ?cam_z=-2.5
// #define CAM_Z -2.5

// Look-at target - origin for symmetric view
#define LOOK_AT_X (look_at_x)  // URL: ?look_at_x=0
// #define LOOK_AT_X 0.0
#define LOOK_AT_Y (look_at_y)  // URL: ?look_at_y=0
// #define LOOK_AT_Y 0.0
#define LOOK_AT_Z (look_at_z)  // URL: ?look_at_z=0
// #define LOOK_AT_Z 0.0

// CLOSENESS CONTROL - main chromadepth depth modulation
// Higher = warmer/closer feel (uniform depth), Lower = more depth separation
#define CLOSENESS (closeness)  // URL: ?closeness=1.0 (2.0=close, 0.5=layered)
// #define CLOSENESS 1.0
#define time_val sin(time)
// ============================================================================
// FRACTAL PARAMETERS
// ============================================================================

const float SCALE = -2.0;
const float MIN_RAD2 = 0.5;
const float FIXED_RAD2 = 1.0;
const vec3 FOLD_OFFSET = vec3(1.0, 1.0, 1.0);

// ============================================================================
// MANDELBOX DISTANCE ESTIMATOR
// ============================================================================

struct TrapData {
    float dist;
    float trapMin;
    float trapPlane;
    float trapSphere;
    vec3 trapColor;
};

TrapData fractalDE(vec3 pos, float scaleMod) {
    float scale = SCALE + scaleMod;
    vec4 p = vec4(pos, 1.0);
    vec4 p0 = p;

    float trapMin = 1e10;
    float trapPlane = 1e10;
    float trapSphere = 1e10;
    vec3 trapColor = vec3(0.0);

    for (int i = 0; i < FRAC_ITERS; i++) {
        p.xyz = clamp(p.xyz, -FOLD_OFFSET, FOLD_OFFSET) * 2.0 - p.xyz;
        float r2 = dot(p.xyz, p.xyz);

        trapMin = min(trapMin, r2);
        trapPlane = min(trapPlane, abs(p.y));
        trapSphere = min(trapSphere, length(p.xyz - vec3(1.0, 1.0, 1.0)));
        trapColor += vec3(abs(p.x), abs(p.y), abs(p.z)) * 0.1 / (1.0 + r2);

        if (r2 < MIN_RAD2) {
            p *= FIXED_RAD2 / MIN_RAD2;
        } else if (r2 < FIXED_RAD2) {
            p *= FIXED_RAD2 / r2;
        }
        p = p * vec4(vec3(scale), abs(scale)) + p0;
    }

    return TrapData(
        (length(p.xyz) - abs(scale - 1.0)) / p.w,
        trapMin, trapPlane, trapSphere, trapColor
    );
}

TrapData fractalDE(vec3 pos) {
    return fractalDE(pos, 0.0);
}

// ============================================================================
// HELPERS
// ============================================================================

vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.002, 0.0);
    return normalize(vec3(
        fractalDE(p + e.xyy).dist - fractalDE(p - e.xyy).dist,
        fractalDE(p + e.yxy).dist - fractalDE(p - e.yxy).dist,
        fractalDE(p + e.yyx).dist - fractalDE(p - e.yyx).dist
    ));
}

float getEdgeFactor(vec3 n, vec3 rd) {
    float edge = 1.0 - abs(dot(n, -rd));
    return pow(edge, 3.0);
}

// ============================================================================
// RAYMARCHING
// ============================================================================

struct RayResult {
    float dist;
    TrapData trap;
    float hit;
};

RayResult raymarch(vec3 ro, vec3 rd, float scaleMod) {
    float t = 0.0;
    TrapData trap;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        trap = fractalDE(p, scaleMod);
        if (trap.dist < SURF_DIST || t > MAX_DIST) break;
        t += trap.dist * 0.8;
    }

    return RayResult(t, trap, t < MAX_DIST ? 1.0 : 0.0);
}

// ============================================================================
// RENDER
// ============================================================================

vec3 renderRay(vec3 ro, vec3 rd, float scaleMod, float hueShift) {
    RayResult result = raymarch(ro, rd, scaleMod);

    // Black background
    if (result.hit < 0.5) return vec3(0.0);

    vec3 p = ro + rd * result.dist;
    vec3 n = getNormal(p);
    TrapData trap = result.trap;

    // Lighting (affects lightness only, not hue)
    vec3 lightDir = normalize(vec3(0.5, 0.8, -0.4));
    float diff = max(dot(n, lightDir), 0.0);

    // === CHROMADEPTH HUE ===
    // Get depth value based on selected source
    float depthVal = 0.0;
    #if DEPTH_SOURCE == 0
        // Ray distance
        depthVal = (result.dist - DEPTH_MIN) / max(DEPTH_MAX - DEPTH_MIN, 0.01);
    #elif DEPTH_SOURCE == 1
        // World Z position (into screen)
        depthVal = (p.z - DEPTH_MIN) / max(DEPTH_MAX - DEPTH_MIN, 0.01);
    #elif DEPTH_SOURCE == 2
        // Orbit trap - this varies with fractal structure!
        depthVal = sqrt(trap.trapMin) * TRAP_SCALE;
    #else
        // Distance from world origin
        depthVal = (length(p) - DEPTH_MIN) / max(DEPTH_MAX - DEPTH_MIN, 0.01);
    #endif
    depthVal = clamp(depthVal, 0.0, 1.0);

    // Apply curve
    float depthCurved = pow(depthVal, DEPTH_CURVE);

    // Base hue from depth
    float hue = mix(HUE_NEAR, HUE_FAR, depthCurved);

    // Mix in orbit trap for structural detail
    float trapHue = sqrt(trap.trapMin) * 0.5;
    hue = mix(hue, trapHue, MIX_TRAP);

    // Mix in normal direction for surface variation
    float normalHue = (n.x + n.y * 0.5 + n.z * 0.25) * 0.3 + 0.5;
    hue = mix(hue, normalHue, MIX_NORMAL);

    hue = fract(hue + hueShift);

    // === LIGHTNESS ===
    float lightness = LIGHT_BASE + diff * LIGHT_DIFFUSE;
    lightness = clamp(lightness, LIGHT_MIN, LIGHT_MAX);

    // Base color
    vec3 col = hsl2rgb(vec3(fract(hue), SAT_BASE, lightness));

    // === EDGE GLOW ===
    float edge = getEdgeFactor(n, rd);
    if (EDGE_AMOUNT > 0.0) {
        float edgeHue = fract(hue + EDGE_HUE_OFFSET);
        float edgeLight = min(lightness + EDGE_LIGHT_BOOST, LIGHT_MAX);
        vec3 edgeCol = hsl2rgb(vec3(edgeHue, 1.0, edgeLight));
        col = mix(col, edgeCol, edge * EDGE_AMOUNT);
    }

    return col;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float scaleMod = sin(TIME * 0.1) * 0.05 + SCALE_MOD;
    float hueShift = TIME * 0.025 + HUE_SHIFT;

    // Camera
    vec3 baseRo = vec3(CAM_X, CAM_Y, CAM_Z);
    vec3 baseLookAt = vec3(LOOK_AT_X, LOOK_AT_Y, LOOK_AT_Z);
    vec3 lookOffset = vec3(
        sin(TIME * 0.2) * 0.025 + LOOK_X,
        cos(TIME * 0.17) * 0.018 + LOOK_Y,
        0.0
    );
    vec3 lookAt = baseLookAt + lookOffset;
    vec3 toTarget = normalize(lookAt - baseRo);
    float zoomAmount = sin(TIME * 0.1) * 0.12 + ZOOM;
    vec3 ro = baseRo + toTarget * zoomAmount;

    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0, 1, 0), forward));
    vec3 up = cross(forward, right);
    float fov = 1.8 * clamp(FOV_MOD, 0.8, 1.2);
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // Render
    vec3 col = renderRay(ro, rd, scaleMod, hueShift);

    // Feedback (optional - can disable for pure chromadepth)
    vec2 feedbackUV = fragCoord / iResolution.xy;
    vec2 center = vec2(0.5);
    vec2 fbOffset = (feedbackUV - center) * 0.997 + center;
    fbOffset += vec2(sin(TIME * 0.15), cos(TIME * 0.15)) * 0.003;
    vec4 prev = getLastFrameColor(fbOffset);

    vec3 colHSL = rgb2hsl(col);
    vec3 prevHSL = rgb2hsl(prev.rgb);
    prevHSL.z *= 0.9; // Decay

    float blendAmt = FEEDBACK_STRENGTH;
    vec3 blendedHSL = vec3(
        mix(colHSL.x, prevHSL.x, blendAmt),
        mix(colHSL.y, prevHSL.y, blendAmt * 0.5),
        mix(colHSL.z, prevHSL.z, blendAmt)
    );
    col = hsl2rgb(blendedHSL);

    // Beat - shift toward red for chromadepth "pop out" effect
    if (beat) {
        vec3 beatHSL = rgb2hsl(col);
        // Shift hue toward red (0) - the closer to red already, the less shift needed
        // This makes everything "pop forward" in chromadepth
        beatHSL.x = fract(beatHSL.x + BEAT_HUE_SHIFT);
        beatHSL.y = min(beatHSL.y * BEAT_SAT_BOOST, 1.0);
        beatHSL.z = min(beatHSL.z * BEAT_LIGHT_BOOST, 0.6);
        col = hsl2rgb(beatHSL);
    }

    // Bass brightness
    vec3 bassHSL = rgb2hsl(col);
    bassHSL.z = clamp(bassHSL.z * BRIGHTNESS, 0.05, 0.6);
    col = hsl2rgb(bassHSL);

    // Vignette
    col *= 1.0 - length(uv) * 0.3;

    // Dither
    col += (fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.015;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
