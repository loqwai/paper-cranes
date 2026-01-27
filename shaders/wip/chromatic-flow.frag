// @fullscreen: true
// Chromatic Flow - Audio-reactive Mandelbox fractal

#define MAX_STEPS 50
#define MAX_DIST 20.0
#define SURF_DIST 0.002

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================
// Scale modifier: entropy increases density (negative = denser)
#define SCALE_MOD (-spectralEntropyZScore * 0.08)
// #define SCALE_MOD 0.0

// Hue shift: pitch class maps to color
#define HUE_SHIFT (pitchClassNormalized * 0.3)
// #define HUE_SHIFT 0.0

// Saturation: energy boosts vibrancy
#define SATURATION (0.75 + energyNormalized * 0.2)
// #define SATURATION 0.75

// Brightness: bass creates pulses
#define BRIGHTNESS (1.0 + bassZScore * 0.12)
// #define BRIGHTNESS 1.0

// Zoom: spectral flux drives forward/back movement along view direction
#define ZOOM (spectralFluxZScore * 0.15)
// #define ZOOM 0.0

// FOV: energy affects field of view (lower = zoom in)
#define FOV_MOD (1.0 - energyZScore * 0.1)
// #define FOV_MOD 1.0

// Look offsets: treble and spread
#define LOOK_X (trebleZScore * 0.02)
// #define LOOK_X 0.0

#define LOOK_Y (spectralSpreadZScore * 0.01)
// #define LOOK_Y 0.0

// Fractal parameters
const float SCALE = -2.0;
const float MIN_RAD2 = 0.5;
const float FIXED_RAD2 = 1.0;
const vec3 FOLD_OFFSET = vec3(1.0, 1.0, 1.0);

// ============================================================================
// MANDELBOX DISTANCE ESTIMATOR
// ============================================================================

vec2 fractalDE(vec3 pos, float scaleMod) {
    float scale = SCALE + scaleMod;

    vec4 p = vec4(pos, 1.0);
    vec4 p0 = p;

    float trap = 1e10;

    for (int i = 0; i < 8; i++) {
        // Box fold
        p.xyz = clamp(p.xyz, -FOLD_OFFSET, FOLD_OFFSET) * 2.0 - p.xyz;

        // Sphere fold
        float r2 = dot(p.xyz, p.xyz);
        trap = min(trap, r2);

        if (r2 < MIN_RAD2) {
            p *= FIXED_RAD2 / MIN_RAD2;
        } else if (r2 < FIXED_RAD2) {
            p *= FIXED_RAD2 / r2;
        }

        // Scale and translate
        p = p * vec4(vec3(scale), abs(scale)) + p0;
    }

    return vec2((length(p.xyz) - abs(scale - 1.0)) / p.w, trap);
}

vec2 fractalDE(vec3 pos) {
    return fractalDE(pos, 0.0);
}

// ============================================================================
// NORMAL CALCULATION
// ============================================================================

vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.003, 0.0);
    return normalize(vec3(
        fractalDE(p + e.xyy).x - fractalDE(p - e.xyy).x,
        fractalDE(p + e.yxy).x - fractalDE(p - e.yxy).x,
        fractalDE(p + e.yyx).x - fractalDE(p - e.yyx).x
    ));
}

// Cheap AO approximation (2 samples instead of 5)
float cheapAO(vec3 p, vec3 n) {
    float d1 = fractalDE(p + n * 0.1).x;
    float d2 = fractalDE(p + n * 0.3).x;
    return clamp(0.5 + (d1 + d2) * 2.0, 0.0, 1.0);
}

// ============================================================================
// RAYMARCHING
// ============================================================================

vec3 raymarch(vec3 ro, vec3 rd, float scaleMod) {
    float t = 0.0;
    float trap = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        vec2 result = fractalDE(p, scaleMod);
        float d = result.x;
        trap = result.y;

        if (d < SURF_DIST || t > MAX_DIST) break;
        t += d * 0.7;
    }

    return vec3(t, trap, t < MAX_DIST ? 1.0 : 0.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Time-based animation with audio modifiers
    float scaleMod = sin(iTime * 0.1) * 0.05 + SCALE_MOD;
    float hueShift = iTime * 0.02 + HUE_SHIFT;
    float sat = clamp(SATURATION, 0.4, 0.95);
    float bright = clamp(BRIGHTNESS, 0.7, 1.4);

    // Camera setup
    vec3 baseRo = vec3(2.2, 1.4, -2.3);
    vec3 baseLookAt = vec3(-0.1, 0.2, 0.4);

    // Gentle time-based sway
    vec3 lookOffset = vec3(
        sin(iTime * 0.2) * 0.02 + LOOK_X,
        cos(iTime * 0.17) * 0.015 + LOOK_Y,
        0.0
    );
    vec3 lookAt = baseLookAt + lookOffset;

    // Calculate forward direction first for zoom
    vec3 toTarget = normalize(lookAt - baseRo);

    // Zoom: move along view direction (time-based drift + audio)
    float zoomAmount = sin(iTime * 0.1) * 0.1 + ZOOM;
    vec3 ro = baseRo + toTarget * zoomAmount;

    // Camera matrix
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0, 1, 0), forward));
    vec3 up = cross(forward, right);

    // Ray direction with FOV modulation
    float fov = 1.8 * clamp(FOV_MOD, 0.8, 1.2);
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // Raymarch
    vec3 result = raymarch(ro, rd, scaleMod);
    float dist = result.x;
    float trap = result.y;
    float hit = result.z;

    // Background gradient
    vec3 col = mix(vec3(0.02, 0.02, 0.05), vec3(0.1, 0.05, 0.15), uv.y + 0.5);

    if (hit > 0.5) {
        vec3 p = ro + rd * dist;
        vec3 n = getNormal(p);

        // Lighting
        vec3 lightDir1 = normalize(vec3(0.6, 0.8, -0.3));
        vec3 lightDir2 = normalize(vec3(-0.7, 0.2, 0.6));
        vec3 lightCol1 = vec3(1.0, 0.95, 0.85);
        vec3 lightCol2 = vec3(0.3, 0.5, 1.0);

        float diff1 = max(dot(n, lightDir1), 0.0);
        float diff2 = max(dot(n, lightDir2), 0.0);

        vec3 h1 = normalize(lightDir1 - rd);
        float spec1 = pow(max(dot(n, h1), 0.0), 16.0);

        float ao = cheapAO(p, n);

        // Color from structure + audio-reactive hue
        float hue1 = atan(p.y, p.x) * 0.15;
        float hue2 = sqrt(trap) * 0.6;
        float hue3 = length(p) * 0.1;
        float hue = hue1 + hue2 - hue3 + hueShift;

        float lightness = (0.45 + diff1 * 0.2 + spec1 * 0.1) * bright;
        vec3 baseCol = hsl2rgb(vec3(fract(hue), sat, clamp(lightness, 0.1, 0.9)));

        float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);

        // Combine (simplified lighting)
        vec3 diffuse = baseCol * (diff1 * lightCol1 + diff2 * lightCol2 * 0.4);
        vec3 specular = spec1 * lightCol1 * 0.3;
        vec3 ambient = baseCol * 0.2;

        col = (ambient + diffuse + specular + fresnel * 0.2) * ao;

        // Depth fog
        float fog = exp(-dist * 0.08);
        col = mix(vec3(0.05, 0.03, 0.1), col, fog);
    }

    // Beat flash
    if (beat) {
        col *= 1.1;
    }

    // Vignette
    float vign = 1.0 - length(uv) * 0.3;
    col *= vign;

    // Contrast boost
    col = smoothstep(vec3(0.0), vec3(1.0), col * 1.2);

    // Tone mapping
    col = col / (col + vec3(0.8));

    // Gamma
    col = pow(col, vec3(0.8));

    fragColor = vec4(col, 1.0);
}
