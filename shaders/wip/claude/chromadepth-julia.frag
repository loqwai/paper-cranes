// @fullscreen: true
// @mobile: true
// @tags: fractal, julia, chromadepth, 3d
// ChromaDepth Julia Set - Designed for ChromaDepth 3D glasses
// Red = foreground (closest), Blue = background (farthest), Black = neutral

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Julia constant (c) real part: bass shifts the fractal shape
#define C_REAL (-0.7 + bassZScore * 0.05)
// #define C_REAL -0.7

// Julia constant (c) imaginary part: treble shifts the fractal shape
#define C_IMAG (0.27015 + trebleZScore * 0.03)
// #define C_IMAG 0.27015

// Zoom level: spectral flux drives zoom
#define ZOOM_LEVEL (1.5 + spectralCentroidNormalized * 0.5)
// #define ZOOM_LEVEL 1.5

// Rotation: pitch class slowly rotates the view
#define ROTATION (iTime * 0.05 + pitchClassNormalized * 0.3)
// #define ROTATION 0.0

// Color intensity: energy drives overall brightness
#define COLOR_INTENSITY (0.8 + energyZScore * 0.2)
// #define COLOR_INTENSITY 0.8

// Iteration color offset: spectral entropy shifts which hues appear
#define HUE_OFFSET (spectralEntropyNormalized * 0.15)
// #define HUE_OFFSET 0.0

// Pan: mids and spectral spread drift the view
#define PAN_X (spectralRoughnessZScore * 0.05)
// #define PAN_X 0.0

#define PAN_Y (midsZScore * 0.03)
// #define PAN_Y 0.0

// Beat pulse: brief brightness flash
#define BEAT_PULSE (beat ? 1.2 : 1.0)
// #define BEAT_PULSE 1.0

// Max iterations
#define MAX_ITER 128

// ============================================================================
// EXTERIOR DEPTH MAPPING
// ============================================================================

// Exterior hue range: near boundary → far away (0=red, 0.75=violet)
#define EXTERIOR_HUE_NEAR 0.45
// #define EXTERIOR_HUE_NEAR 0.45

#define EXTERIOR_HUE_FAR 0.85
// #define EXTERIOR_HUE_FAR 0.85

// Fade-to-black curve (higher = faster falloff)
#define FADE_POWER 0.6
// #define FADE_POWER 0.6

// ============================================================================
// INTERIOR ORBIT TRAP TUNING
// ============================================================================

// Origin trap sensitivity
#define TRAP_ORIGIN_SCALE 0.8
// #define TRAP_ORIGIN_SCALE 0.8

// Line trap (x/y axis) sensitivity
#define TRAP_LINE_SCALE 2.0
// #define TRAP_LINE_SCALE 2.0

// Angle banding frequency
#define ANGLE_BAND_FREQ 0.05
// #define ANGLE_BAND_FREQ 0.05

// Blend: origin trap vs line trap detail (0=all origin, 1=all line)
#define TRAP_BLEND 0.5
// #define TRAP_BLEND 0.5

// Blend: combined trap vs angle banding (0=all trap, 1=all angle)
#define ANGLE_BLEND 0.2
// #define ANGLE_BLEND 0.2

// Interior hue range (0=red, 0.35=yellow-green)
#define INTERIOR_HUE_RANGE 0.35
// #define INTERIOR_HUE_RANGE 0.35

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================
// Maps a 0-1 value to the chromadepth rainbow:
// 0.0 = red (closest in chromadepth)
// 0.5 = green (middle depth)
// 1.0 = blue/violet (farthest in chromadepth)
// This creates a natural depth gradient when viewed through chromadepth glasses.

vec3 chromadepthColor(float t) {
    // INVERTED: boundary detail (t=0) = red (closest), fast escape (t=1) = blue (farthest)
    // t=0 → red, t=0.5 → green, t=1.0 → violet
    float hue = t * 0.75;
    float sat = 0.9;
    float lum = 0.5;
    return hsl2rgb(vec3(hue, sat, lum));
}

// ============================================================================
// JULIA SET
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Centered UV with aspect ratio correction
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Apply rotation
    float angle = ROTATION;
    float ca = cos(angle);
    float sa = sin(angle);
    uv = mat2(ca, -sa, sa, ca) * uv;

    // Apply zoom and pan
    uv = uv * ZOOM_LEVEL + vec2(PAN_X, PAN_Y);

    // Julia set iteration with multiple orbit traps for rich interior detail
    vec2 z = uv;
    vec2 c = vec2(C_REAL, C_IMAG);

    float iter = 0.0;
    float smooth_iter = 0.0;
    float minDist = 1e10;       // closest approach to origin
    float minDistX = 1e10;      // closest approach to x-axis (line trap)
    float minDistY = 1e10;      // closest approach to y-axis (line trap)
    float orbitAngle = 0.0;     // accumulated angle for texture
    float lastMag = 0.0;
    bool escaped = false;

    for (int i = 0; i < MAX_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        float mag2 = dot(z, z);
        float mag = sqrt(mag2);
        minDist = min(minDist, mag);
        minDistX = min(minDistX, abs(z.y));  // distance to x-axis
        minDistY = min(minDistY, abs(z.x));  // distance to y-axis
        orbitAngle += atan(z.y, z.x);

        if (mag2 > 256.0) {
            smooth_iter = iter - log2(log2(mag2)) + 4.0;
            escaped = true;
            break;
        }
        lastMag = mag;
        iter += 1.0;
        smooth_iter = iter;
    }

    // t=0 → red (closest), t=1 → violet (farthest)
    float t;

    float fadeToBlack = 1.0; // 1.0 = full color, 0.0 = black

    if (escaped) {
        float escapeFraction = smooth_iter / float(MAX_ITER);
        t = mix(EXTERIOR_HUE_FAR, EXTERIOR_HUE_NEAR, escapeFraction);
        fadeToBlack = pow(escapeFraction, FADE_POWER);
    } else {
        float trapOrigin = clamp(minDist * TRAP_ORIGIN_SCALE, 0.0, 1.0);
        float trapX = clamp(minDistX * TRAP_LINE_SCALE, 0.0, 1.0);
        float trapY = clamp(minDistY * TRAP_LINE_SCALE, 0.0, 1.0);
        float angleTex = fract(orbitAngle * ANGLE_BAND_FREQ);

        float detail = min(trapX, trapY);
        float blend = mix(trapOrigin, detail, TRAP_BLEND);
        blend = mix(blend, angleTex, ANGLE_BLEND);

        t = blend * INTERIOR_HUE_RANGE;
    }

    t = fract(t + HUE_OFFSET);

    vec3 col = chromadepthColor(t);

    // Fade exterior to black based on distance from set
    col *= fadeToBlack;

    float intensity = clamp(COLOR_INTENSITY, 0.3, 1.5);
    col *= intensity;

    // Beat pulse
    col *= BEAT_PULSE;

    // Gentle vignette (keeps edges dark for chromadepth)
    vec2 center = fragCoord.xy / iResolution.xy - 0.5;
    float vign = 1.0 - dot(center, center) * 0.6;
    col *= vign;

    // Clamp to prevent white-out
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
