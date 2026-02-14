// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, fractal, burning-ship
// ChromaDepth Burning Ship Fractal
// The Burning Ship: z = (|Re(z)| + i|Im(z)|)^2 + c
// Creates hull shapes and antenna structures unique to this fractal.
// Auto-zooms along the antenna feature near c = (-1.755, 0.02).
// ChromaDepth: Red = closest (boundary), Blue/Violet = farthest (fast escape), Black = neutral.

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// Real part drift: bass shifts along the antenna
#define C_REAL_SHIFT (bassZScore * 0.008)
// #define C_REAL_SHIFT 0.0

// Imaginary part drift: treble shifts perpendicular
#define C_IMAG_SHIFT (trebleZScore * 0.006)
// #define C_IMAG_SHIFT 0.0

// Zoom depth modulation: energy deepens the zoom
#define ZOOM_ENERGY (energyNormalized * 0.4)
// #define ZOOM_ENERGY 0.2

// Zoom jump: spectral flux triggers zoom jumps
#define ZOOM_JUMP (spectralFluxZScore * 0.15)
// #define ZOOM_JUMP 0.0

// Zoom slope: energy slope adjusts zoom rate
#define ZOOM_TREND (energySlope * 8.0 * energyRSquared)
// #define ZOOM_TREND 0.0

// View rotation: spectral centroid rotates the view slowly
#define VIEW_ROTATION (spectralCentroidZScore * 0.03)
// #define VIEW_ROTATION 0.0

// Brightness modulation from energy
#define BRIGHTNESS_MOD (energyZScore * 0.12)
// #define BRIGHTNESS_MOD 0.0

// Beat flash
#define BEAT_FLASH (beat ? 1.2 : 1.0)
// #define BEAT_FLASH 1.0

// Hue offset from pitch class
#define HUE_DRIFT (pitchClassNormalized * 0.08)
// #define HUE_DRIFT 0.0

// Bass punch for interior glow
#define BASS_GLOW (max(bassZScore, 0.0) * 0.15)
// #define BASS_GLOW 0.0

// Feedback strength from spectral entropy
#define FEEDBACK_AMOUNT (0.3 + spectralEntropyNormalized * 0.15)
// #define FEEDBACK_AMOUNT 0.35

// Mids drift for pan
#define PAN_DRIFT (midsZScore * 0.005)
// #define PAN_DRIFT 0.0

// Drop detection
#define DROP_INTENSITY (max(-energyZScore, 0.0))
// #define DROP_INTENSITY 0.0

// Max iterations (mobile-safe)
#define MAX_ITER 64

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================
// 0.0 = red (closest), 0.5 = green (mid), 1.0 = violet (farthest)

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float sat = 0.95 - t * 0.1;
    float lit = 0.55 - t * 0.12;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // --- AUTO-ZOOM along the antenna feature ---
    // The antenna of the Burning Ship sits near c = (-1.755, 0.02).
    // We auto-zoom deeper over time, oscillating slightly along the antenna.
    float t = iTime * 0.03;

    // Zoom increases exponentially over time (slow auto-zoom in)
    float baseZoom = exp(mod(t * 1.2, 8.0));
    float zoom = baseZoom * (1.0 + ZOOM_ENERGY) + ZOOM_JUMP;
    zoom = clamp(zoom, 1.0, 5000.0);
    zoom += ZOOM_TREND * 0.5;
    zoom = max(zoom, 0.5);

    // Target position drifts along the antenna
    // The main antenna extends from roughly (-1.75, 0.0) toward (-1.78, 0.0)
    float driftPhase = t * 0.7;
    float targetReal = -1.755 + sin(driftPhase) * 0.015 + C_REAL_SHIFT;
    float targetImag = 0.02 + cos(driftPhase * 0.618) * 0.008 + C_IMAG_SHIFT;

    // Apply pan drift
    targetImag += PAN_DRIFT;

    // Apply view rotation
    float angle = iTime * 0.01 + VIEW_ROTATION;
    float ca = cos(angle), sa = sin(angle);
    uv = mat2(ca, -sa, sa, ca) * uv;

    // Scale UV by zoom and center on target
    vec2 c = vec2(targetReal, targetImag) + uv / zoom;

    // --- BURNING SHIP ITERATION ---
    // z_{n+1} = (|Re(z_n)| + i*|Im(z_n)|)^2 + c
    vec2 z = vec2(0.0);
    float smoothIter = 0.0;
    bool escaped = false;

    // Orbit traps for interior structure
    float trapAxisX = 1e10;   // distance to real axis
    float trapAxisY = 1e10;   // distance to imaginary axis
    float trapOrigin = 1e10;  // distance to origin
    float trapCross = 1e10;   // min of axis distances
    float orbitAngle = 0.0;

    for (int i = 0; i < MAX_ITER; i++) {
        // The Burning Ship formula: abs before squaring
        z = vec2(abs(z.x), abs(z.y));
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        float mag2 = dot(z, z);

        // Orbit traps
        trapAxisX = min(trapAxisX, abs(z.y));
        trapAxisY = min(trapAxisY, abs(z.x));
        trapOrigin = min(trapOrigin, sqrt(mag2));
        trapCross = min(trapCross, min(abs(z.x), abs(z.y)));
        orbitAngle += atan(z.y, z.x);

        if (mag2 > 256.0) {
            // Smooth iteration count
            smoothIter = float(i) - log2(log2(mag2)) + 4.0;
            escaped = true;
            break;
        }
        smoothIter = float(i);
    }

    // --- DEPTH MAPPING for ChromaDepth ---
    float depth;
    float brightness = 1.0;

    if (escaped) {
        // Exterior: boundary = red (near), fast escape = violet (far)
        float iterFrac = smoothIter / float(MAX_ITER);
        float logIter = log(1.0 + smoothIter) / log(1.0 + float(MAX_ITER));

        // Near boundary (high iterFrac = many iterations before escape)
        // maps to lower depth (redder = closer)
        // Fast escape (low iterFrac) maps to higher depth (violet = farther)
        depth = mix(0.95, 0.35, pow(logIter, 0.45));

        // Brightness fades for fast escape (far away = darker)
        brightness = mix(0.12, 0.9, pow(logIter, 0.55));
    } else {
        // Interior: orbit traps reveal the ship hull structure
        float tOrigin = clamp(trapOrigin * 1.2, 0.0, 1.0);
        float tAxisX = clamp(trapAxisX * 3.0, 0.0, 1.0);
        float tAxisY = clamp(trapAxisY * 3.0, 0.0, 1.0);
        float tCross = clamp(trapCross * 2.5, 0.0, 1.0);
        float tAngle = fract(orbitAngle * 0.06);
        float tAngle2 = abs(sin(orbitAngle * 0.15));

        // The ship hull and antenna show up as sharp features in the axis traps
        float hullDetail = min(tAxisX, tAxisY);
        float structure = hullDetail * 0.4 + tCross * 0.3 + tOrigin * 0.3;

        // Angular texture for variation
        float texture = tAngle * 0.4 + tAngle2 * 0.3 + tOrigin * 0.3;

        // Combine with contrast
        float contrast = abs(structure - texture) * 0.6;
        float blend = structure * 0.35 + texture * 0.35 + contrast * 0.3;

        // S-curve for better spread
        blend = smoothstep(0.05, 0.95, blend);

        // Interior: red (0.0) through green (0.4) — closest layers
        depth = blend * 0.4;

        // Interior brightness with structural variation
        brightness = 0.45 + hullDetail * 0.2 + (1.0 - tOrigin) * 0.2 + contrast * 0.15;
    }

    // Drop effect: push toward red (near)
    depth = mix(depth, 0.0, DROP_INTENSITY * 0.4);

    // Hue drift from pitch
    depth = fract(depth + HUE_DRIFT);

    // --- COLOR ---
    vec3 col = chromadepth(depth);

    // Brightness modulation
    col *= clamp(brightness + BRIGHTNESS_MOD, 0.15, 1.3);

    // Bass glow on interior
    if (!escaped) {
        col += BASS_GLOW * vec3(0.3, 0.05, 0.0);
    }

    // Beat flash
    col *= BEAT_FLASH;

    // Edge glow from derivatives
    float edge = length(vec2(dFdx(depth), dFdy(depth)));
    float edgeGlow = smoothstep(0.0, 0.05, edge) * 0.2;
    col += edgeGlow * vec3(1.0, 0.9, 0.8);

    // --- FRAME FEEDBACK ---
    // Gentle feedback with slow drift to prevent static loops
    float fbAngle = iTime * 0.008;
    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotatedUV = vec2(
        centered.x * fbc - centered.y * fbs,
        centered.x * fbs + centered.y * fbc
    ) + 0.5;

    // Slight zoom-in on feedback for trailing effect
    vec2 fbUV = mix(vec2(0.5), rotatedUV, 0.998);
    fbUV = clamp(fbUV, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    // Decay previous frame
    prev *= 0.96;

    // Blend: new frame dominates, feedback provides gentle trails
    float fbAmount = clamp(FEEDBACK_AMOUNT, 0.15, 0.5);
    fbAmount -= DROP_INTENSITY * 0.15; // drops = more new frame
    fbAmount = clamp(fbAmount, 0.1, 0.5);

    col = mix(col, prev, fbAmount);

    // --- VIGNETTE ---
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    // Final clamp
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
