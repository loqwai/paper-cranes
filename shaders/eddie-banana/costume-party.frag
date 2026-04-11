// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: banana, chromadepth, 3d, eddie, love, image
// Image-based banana man with scattered Mandelbrot-path bananas
// Load with: ?shader=eddie-banana/costume-party&image=images/eddie-banana.png
// ChromaDepth: red=nearest, yellow=near, green=mid, blue=far, violet=farthest

#define PI 3.14159265359

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// Bass: silhouette pulses/breathes
#define BANANA_PULSE (1.0 + bassZScore * 0.08)
// #define BANANA_PULSE 1.0

// Energy: overall brightness
#define ENERGY_BRIGHT (0.85 + energyZScore * 0.15)
// #define ENERGY_BRIGHT 0.85

// Treble: small banana shimmer
#define TREBLE_SHIMMER (trebleZScore)
// #define TREBLE_SHIMMER 0.0

// Spectral flux: edge glow intensity on silhouette
#define EDGE_GLOW (max(spectralFluxZScore, 0.0))
// #define EDGE_GLOW 0.0

// Spectral centroid: hue drift within chromadepth range
#define HUE_DRIFT (spectralCentroidNormalized * 0.04)
// #define HUE_DRIFT 0.0

// Pitch class: rotation of background patterns
#define PATTERN_ROT (pitchClassNormalized * 0.3)
// #define PATTERN_ROT 0.0

// Beat: flash and throb effect
#define BEAT_FLASH (beat ? 1.15 : 1.0)
// #define BEAT_FLASH 1.0

// Spectral entropy: chaos in background scatter
#define SCATTER_CHAOS (spectralEntropyNormalized)
// #define SCATTER_CHAOS 0.5

// Spectral roughness: saturation boost
#define SAT_BOOST (0.88 + spectralRoughnessNormalized * 0.12)
// #define SAT_BOOST 0.92

// Mids: movement speed of background bananas
#define MOVE_SPEED (0.12 + midsNormalized * 0.08)
// #define MOVE_SPEED 0.15

// Energy normalized: background banana scale
#define BG_SCALE_MOD (energyNormalized * 0.06)
// #define BG_SCALE_MOD 0.03

// ---- ITERATION LIMITS (mobile-safe) ----
#define BANANA_COUNT 12.0
#define LINE_COUNT 3.0
#define MAX_ITER 8

// ---- SILHOUETTE DETECTION THRESHOLDS ----
// Tune these for the actual image of Eddie
#define BANANA_HUE_LOW 0.10
#define BANANA_HUE_HIGH 0.22
#define BANANA_SAT_MIN 0.3
#define BANANA_LIT_MIN 0.3

// ============================================================================
// HELPERS
// ============================================================================

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Banana shape SDF for background scattering
float sdBanana(vec2 p) {
    p = rot(-0.3) * p;
    float r = 0.6;
    float thickness = 0.15;
    p.y += r * 0.6;
    float d = abs(length(p) - r) - thickness;
    d = max(d, -p.y - 0.1);
    d = max(d, p.y - r * 1.1);
    return d;
}

// Adjust UV for image aspect ratio (cover mode, assuming ~2:3 portrait)
vec2 adjustForAspect(vec2 uv) {
    float screenAspect = iResolution.x / iResolution.y;
    float imageAspect = 0.667; // ~2:3 portrait, adjust if needed
    vec2 adjusted = uv - 0.5;
    if (screenAspect > imageAspect) {
        adjusted.y *= screenAspect / imageAspect; // safe
    } else {
        adjusted.x *= imageAspect / screenAspect; // safe
    }
    return adjusted + 0.5;
}

// Detect banana-yellow regions of the costume
float detectBanana(vec2 uv) {
    vec3 imgColor = getInitialFrameColor(uv).rgb;
    vec3 hsl = rgb2hsl(imgColor);
    float isBanana = smoothstep(BANANA_HUE_LOW, BANANA_HUE_LOW + 0.03, hsl.x)
                   * (1.0 - smoothstep(BANANA_HUE_HIGH - 0.03, BANANA_HUE_HIGH, hsl.x))
                   * smoothstep(BANANA_SAT_MIN, BANANA_SAT_MIN + 0.15, hsl.y)
                   * smoothstep(BANANA_LIT_MIN, BANANA_LIT_MIN + 0.15, hsl.z);
    return isBanana;
}

// Detect overall subject (any non-background pixel)
float detectSubject(vec2 uv) {
    vec3 imgColor = getInitialFrameColor(uv).rgb;
    vec3 hsl = rgb2hsl(imgColor);
    return smoothstep(0.05, 0.2, hsl.z) * smoothstep(0.03, 0.12, hsl.y);
}

// Edge detection via silhouette gradient
float detectEdge(vec2 uv, vec2 px) {
    float c = detectSubject(uv);
    float l = detectSubject(uv - vec2(px.x, 0.0));
    float r = detectSubject(uv + vec2(px.x, 0.0));
    float u = detectSubject(uv - vec2(0.0, px.y));
    float d = detectSubject(uv + vec2(0.0, px.y));
    return clamp(abs(c - l) + abs(c - r) + abs(c - u) + abs(c - d), 0.0, 1.0);
}

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.75;
    float sat = SAT_BOOST;
    float lit = 0.5 - t * 0.1;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MANDELBROT PATH FOR SCATTERED BACKGROUND BANANAS
// ============================================================================

void mandelbrotTransform(float t, float lineIndex, out vec2 pos, out float scale, out float rotation) {
    float angle = lineIndex * PI * 2.0 / LINE_COUNT + iTime * 0.08;
    float radius = 0.5 + sin(angle * 2.0 + iTime * 0.12) * 0.2;
    vec2 c = vec2(cos(angle), sin(angle)) * radius;

    vec2 z = vec2(0.0);
    float lastLen = 0.0;

    for (int i = 0; i < MAX_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        z += vec2(cos(t * PI * 2.0), sin(t * PI * 2.0)) * 0.12;

        if (float(i) >= t * float(MAX_ITER)) {
            pos = z * 0.3;
            scale = (length(z) - lastLen) * 1.2 + 0.5;
            rotation = atan(z.y, z.x) * 2.0 + t * PI * 3.0;
            break;
        }
        lastLen = length(z);
    }
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // Image UV with aspect ratio correction and bass pulse zoom
    vec2 imgUV = adjustForAspect(screenUV);
    vec2 imgCenter = vec2(0.5);
    imgUV = (imgUV - imgCenter) / max(BANANA_PULSE, 0.5) + imgCenter;

    // Pixel size for edge detection
    vec2 px = 1.0 / max(iResolution.xy, vec2(1.0));

    // Dark navy background
    vec3 col = vec3(0.02, 0.02, 0.08);

    // ---- SCATTERED BACKGROUND BANANAS along Mandelbrot paths ----
    for (float line = 0.0; line < LINE_COUNT; line++) {
        for (float i = 0.0; i < BANANA_COUNT; i++) {
            float t = fract(i / BANANA_COUNT - iTime * MOVE_SPEED + line * 0.25);

            vec2 pos;
            float scale, rotation;
            mandelbrotTransform(t, line, pos, scale, rotation);

            pos += vec2(cos(t * PI * 2.0), sin(t * PI * 2.0)) * midsNormalized * 0.15;
            scale *= 0.1 + BG_SCALE_MOD;
            rotation += PATTERN_ROT * PI + SCATTER_CHAOS * sin(t * 8.0) * 0.5;

            vec2 bUV = uv - pos;
            bUV = rot(rotation + t * PI * 2.0) * bUV;
            bUV /= max(scale, 0.01);

            float d = sdBanana(bUV);

            if (d < 0.0) {
                float distFromCenter = length(pos) / 2.5;
                float depth = mix(0.12, 0.6, clamp(distFromCenter, 0.0, 1.0));
                depth += HUE_DRIFT + line * 0.04;
                vec3 bCol = chromadepth(depth);

                bCol *= 1.0 + TREBLE_SHIMMER * 0.12 * sin(t * 20.0 + iTime * 4.0);

                float blend = smoothstep(0.0, -0.04, d);
                col = max(col, bCol * blend * 0.7);
            }
        }
    }

    // ---- IMAGE-BASED SILHOUETTE ----
    float banana = detectBanana(imgUV);
    float subject = detectSubject(imgUV);
    float edge = detectEdge(imgUV, px);

    if (subject > 0.1) {
        // Banana costume: orange-yellow chromadepth (near)
        float bodyDepth = 0.06 + banana * 0.08;
        // Person parts (non-banana): red-orange (nearest)
        float limbDepth = subject * 0.04;
        // Blend: banana regions are yellower, non-banana are redder
        float depth = mix(limbDepth, bodyDepth, banana) + HUE_DRIFT;

        vec3 subCol = chromadepth(depth);
        subCol *= ENERGY_BRIGHT;

        col = mix(col, subCol, subject);
    }

    // Edge glow on silhouette
    float edgeGlow = edge * (0.3 + EDGE_GLOW * 0.5);
    col += chromadepth(0.03) * edgeGlow;

    // Beat flash
    col *= BEAT_FLASH;

    // ---- FRAME FEEDBACK (oklab blending) ----
    float fbAngle = iTime * 0.005;
    vec2 centered = screenUV - 0.5;
    float fbc = cos(fbAngle), fbs = sin(fbAngle);
    vec2 rotUV = vec2(centered.x * fbc - centered.y * fbs,
                      centered.x * fbs + centered.y * fbc) + 0.5;
    vec2 fbUV = clamp(rotUV, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);
    prevOk.x *= 0.96;
    prevOk.yz *= 0.98;

    float newAmount = 0.7;
    vec3 blended = mix(prevOk, colOk, newAmount);

    // Prevent chroma death
    if (length(blended.yz) < length(colOk.yz) * 0.6) {
        blended.yz = mix(blended.yz, colOk.yz, 0.35);
    }
    col = oklab2rgb(blended);

    // ---- VIGNETTE ----
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.6;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
