// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: heart, chromadepth, 3d, fractal, julia, love
// ChromaDepth Julia Set with Heart-Shaped Orbit Trap
// The fractal reveals hidden hearts everywhere in the boundary structure.
// Red = near (hearts pop forward), Blue/Violet = far (background recedes)
// Oklab blending for perceptually smooth frame feedback.

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Julia c real: bass gently reshapes the fractal
#define C_REAL (-0.76 + bassZScore * 0.04)
// #define C_REAL -0.76

// Julia c imaginary: treble shifts fractal form
#define C_IMAG (0.22 + trebleZScore * 0.025)
// #define C_IMAG 0.22

// Zoom: energy drives zoom depth
#define ZOOM (1.6 + spectralCentroidNormalized * 0.4)
// #define ZOOM 1.6

// Rotation: pitch class slowly spins the view
#define ROTATION (iTime * 0.04 + pitchClassNormalized * 0.3)
// #define ROTATION 0.0

// Heart trap rotation: spectral entropy rotates the heart trap
#define TRAP_ROT (iTime * 0.08 + spectralEntropyNormalized * 0.5)
// #define TRAP_ROT 0.0

// Heart trap scale: mids control how large the heart trap is
#define TRAP_SCALE (0.8 + midsNormalized * 0.3)
// #define TRAP_SCALE 1.0

// Pan drift
#define PAN_X (spectralRoughnessZScore * 0.04)
// #define PAN_X 0.0

#define PAN_Y (midsZScore * 0.03)
// #define PAN_Y 0.0

// Brightness modulation
#define BRIGHT_MOD (0.85 + energyZScore * 0.15)
// #define BRIGHT_MOD 0.85

// Hue offset: spectral entropy shifts the chromadepth palette
#define HUE_OFFSET (spectralEntropyNormalized * 0.1)
// #define HUE_OFFSET 0.0

// Beat pulse
#define BEAT_PULSE (beat ? 1.2 : 1.0)
// #define BEAT_PULSE 1.0

// Drop detection: hue shift toward red on drops
#define DROP_SHIFT (max(-energyZScore, 0.0) * 0.08)
// #define DROP_SHIFT 0.0

// Feedback confidence
#define TREND_CONFIDENCE (energyRSquared * 0.5 + bassRSquared * 0.3 + spectralCentroidRSquared * 0.2)
// #define TREND_CONFIDENCE 0.5

// Max iterations (mobile safe)
#define MAX_ITER 64

// ============================================================================
// HELPERS
// ============================================================================

float dot2(vec2 v) { return dot(v, v); }

// Signed distance to a heart shape
float sdHeart(vec2 p) {
    p.x = abs(p.x);
    p.y += 0.6;
    if (p.y + p.x > 1.0)
        return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
    return sqrt(min(dot2(p - vec2(0.0, 1.0)),
                dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

// ============================================================================
// CHROMADEPTH COLORING (HSL-based depth, oklab blending)
// ============================================================================
// 0.0 = red (nearest), 0.33 = green (mid), 0.75 = violet (farthest)

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.75;
    float sat = 0.93 - t * 0.08;
    float lit = 0.52 - t * 0.1;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 screenUV = fragCoord / iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Rotation
    float angle = ROTATION;
    float ca = cos(angle), sa = sin(angle);
    uv = mat2(ca, -sa, sa, ca) * uv;

    // Zoom and pan
    uv = uv * ZOOM + vec2(PAN_X, PAN_Y);

    // Julia iteration with heart-shaped orbit trap
    vec2 z = uv;
    vec2 c = vec2(C_REAL, C_IMAG);

    float iter = 0.0;
    float smoothIter = 0.0;
    bool escaped = false;

    // Heart orbit trap: minimum distance the orbit comes to a heart shape
    float heartTrapMin = 1e10;
    float originTrapMin = 1e10;
    float lineTrapMin = 1e10;
    float orbitAngle = 0.0;

    // Heart trap transform
    float trapA = TRAP_ROT;
    float trapCos = cos(trapA), trapSin = sin(trapA);

    for (int i = 0; i < MAX_ITER; i++) {
        // z = z^2 + c
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        float mag2 = dot(z, z);
        float mag = sqrt(mag2);

        // Heart orbit trap: rotate z into heart space
        vec2 hz = mat2(trapCos, -trapSin, trapSin, trapCos) * z;
        hz /= TRAP_SCALE;
        float heartD = abs(sdHeart(hz));
        heartTrapMin = min(heartTrapMin, heartD);

        // Standard orbit traps
        originTrapMin = min(originTrapMin, mag);
        lineTrapMin = min(lineTrapMin, min(abs(z.x), abs(z.y)));
        orbitAngle += atan(z.y, z.x);

        if (mag2 > 256.0) {
            smoothIter = float(i) - log2(log2(mag2)) + 4.0;
            escaped = true;
            break;
        }
        smoothIter = float(i);
        iter += 1.0;
    }

    // --- DEPTH MAPPING ---
    float depth;
    float brightness = 1.0;

    if (escaped) {
        // Exterior: near boundary = green/cyan, far = violet
        float iterFrac = smoothIter / float(MAX_ITER);
        float logIter = log(1.0 + smoothIter) / log(1.0 + float(MAX_ITER));

        // Heart trap bleeds into exterior near boundary
        float heartInfluence = exp(-heartTrapMin * 3.0) * logIter;

        // Base exterior depth
        depth = mix(0.75, 0.4, pow(logIter, 0.45));

        // If heart trap was close, pull toward red
        depth = mix(depth, 0.05, heartInfluence * 0.6);

        brightness = mix(0.15, 0.75, pow(logIter, 0.5));
        brightness += heartInfluence * 0.3;
    } else {
        // Interior: heart trap drives depth
        float tHeart = clamp(heartTrapMin * 1.5, 0.0, 1.0);
        float tOrigin = clamp(originTrapMin * 0.8, 0.0, 1.0);
        float tLine = clamp(lineTrapMin * 2.0, 0.0, 1.0);
        float tAngle = fract(orbitAngle * 0.05);

        // Heart trap close = red (nearest), far = yellow-green
        float heartDepth = tHeart;
        float geoDepth = tOrigin * 0.4 + tLine * 0.3 + tAngle * 0.3;

        // Heart trap dominates for thematic effect
        depth = heartDepth * 0.55 + geoDepth * 0.45;
        depth = smoothstep(0.02, 0.92, depth);

        // Map interior to red-green range
        depth *= 0.35;

        brightness = 0.5 + (1.0 - tHeart) * 0.3 + tAngle * 0.15;
    }

    // Drop shifts toward red
    depth = max(depth - DROP_SHIFT, 0.0);

    // --- CHROMADEPTH COLOR ---
    float finalDepth = fract(depth + HUE_OFFSET);
    vec3 col = chromadepth(finalDepth);

    // Apply brightness
    col *= clamp(brightness * BRIGHT_MOD, 0.1, 1.2);

    // Beat pulse
    col *= BEAT_PULSE;

    // Edge glow on fractal boundaries
    float edge = length(vec2(dFdx(depth), dFdy(depth)));
    float edgeGlow = smoothstep(0.0, 0.06, edge) * 0.2;
    col += edgeGlow * vec3(1.0, 0.92, 0.85);

    col = clamp(col, 0.0, 1.0);

    // --- FRAME FEEDBACK with oklab blending ---
    float fbAngle = iTime * 0.007;
    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotatedUV = vec2(centered.x * fbc - centered.y * fbs,
                          centered.x * fbs + centered.y * fbc) + 0.5;

    float fbStrength = escaped
        ? 0.03 * pow(smoothIter / float(MAX_ITER), 0.35)
        : 0.04 * (1.0 - heartTrapMin * 0.3);
    fbStrength += float(beat) * 0.012;

    vec2 fbWarp = vec2(
        sin(orbitAngle * 0.03) * 0.008,
        cos(orbitAngle * 0.04) * 0.006
    ) * fbStrength * 8.0;

    vec2 fbUV = clamp(rotatedUV + fbWarp, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    // Oklab blend
    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);

    prevOk.x *= 0.96;
    prevOk.yz *= 0.98;

    float newAmount = 0.72;
    newAmount -= TREND_CONFIDENCE * 0.08;
    newAmount = clamp(newAmount, 0.55, 0.85);

    vec3 blended = mix(prevOk, colOk, newAmount);

    // Prevent chroma death
    float blendedChroma = length(blended.yz);
    float freshChroma = length(colOk.yz);
    if (blendedChroma < freshChroma * 0.6) {
        blended.yz = mix(blended.yz, colOk.yz, 0.35);
    }

    col = oklab2rgb(blended);
    col *= 1.0 + float(beat) * 0.1;

    // Vignette
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.65;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
