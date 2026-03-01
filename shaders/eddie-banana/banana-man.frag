// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: banana, chromadepth, 3d, eddie, love, image
// @image: images/banana-boy-1.png
// Image-based dancing banana man with scattered Mandelbrot-path bananas
// ChromaDepth: red=nearest, yellow=near, green=mid, blue=far, violet=farthest
// http://localhost:6969/?shader=eddie-banana/banana-man&image=images/banana-boy-1.png
// https://visuals.beadfamous.com/?shader=eddie-banana/banana-man&image=images/banana-boy-1.png

#define PI 3.14159265359

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// Bass: silhouette breathes (zoom)
#define BANANA_PULSE (1.0 + bassZScore * 0.06)
// #define BANANA_PULSE 1.0

// Energy: overall brightness
#define ENERGY_BRIGHT (0.85 + energyZScore * 0.15)
// #define ENERGY_BRIGHT 0.85

// Treble: shimmer inside silhouette
#define TREBLE_SHIMMER (trebleZScore)
// #define TREBLE_SHIMMER 0.0

// Spectral flux: edge glow intensity
#define EDGE_GLOW (max(spectralFluxZScore, 0.0))
// #define EDGE_GLOW 0.0

// Spectral centroid: hue drift in chromadepth range
#define HUE_DRIFT (spectralCentroidNormalized * 0.04)
// #define HUE_DRIFT 0.0

// Pitch class: rotation of background banana patterns (slope-gated for smoothness)
#define PATTERN_ROT (pitchClassNormalized * 0.15 + spectralCentroidSlope * 8.0 * spectralCentroidRSquared * 0.1)
// #define PATTERN_ROT 0.0

// Beat: flash and scale pop
#define BEAT_FLASH (beat ? 1.15 : 1.0)
// #define BEAT_FLASH 1.0

// Spectral entropy: chaos in background banana scatter (damped by trend confidence)
#define SCATTER_CHAOS (spectralEntropyNormalized * 0.4 + 0.3)
// #define SCATTER_CHAOS 0.5

// Spectral roughness: saturation boost
#define SAT_BOOST (0.88 + spectralRoughnessNormalized * 0.12)
// #define SAT_BOOST 0.92

// Mids: background banana movement speed (slope-gated for steady drift)
#define MOVE_SPEED (0.12 + midsSlope * 6.0 * midsRSquared * 0.04)
// #define MOVE_SPEED 0.12

// Energy: background banana scale (slope-gated so scale only shifts on confident trends)
#define BG_SCALE_MOD (0.03 + energySlope * 10.0 * energyRSquared * 0.03)
// #define BG_SCALE_MOD 0.03

// Bass: subtle rotation of the silhouette
#define SILHOUETTE_ROT (bassZScore * 0.03 + sin(iTime * 0.4) * 0.015)
// #define SILHOUETTE_ROT 0.0

// Spectral roughness: ripple distortion inside silhouette
#define RIPPLE_STRENGTH (spectralRoughnessZScore * 0.003)
// #define RIPPLE_STRENGTH 0.0

// ---- ITERATION LIMITS (mobile-safe) ----
#define BANANA_COUNT 12.0
#define LINE_COUNT 3.0
#define MAX_ITER 8

// ============================================================================
// HELPERS
// ============================================================================

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Contain a square image on any screen aspect
vec2 containUV(vec2 screenUV) {
    float aspect = iResolution.x / iResolution.y; // safe
    vec2 uv = screenUV;
    if (aspect > 1.0) {
        uv.x = (uv.x - 0.5) * aspect + 0.5;
    } else {
        uv.y = (uv.y - 0.5) / max(aspect, 0.001) + 0.5; // safe
    }
    return uv;
}

// Sample image (solid yellow on black)
vec3 sampleImage(vec2 uv) {
    return getInitialFrameColor(clamp(uv, 0.0, 1.0)).rgb;
}

// Detect banana man silhouette (yellow on black = high luma)
float detectSilhouette(vec2 uv) {
    vec3 img = sampleImage(uv);
    float luma = dot(img, vec3(0.299, 0.587, 0.114));
    return smoothstep(0.15, 0.35, luma);
}

// Edge detection on silhouette
float detectEdge(vec2 uv, vec2 px) {
    float c = detectSilhouette(uv);
    float l = detectSilhouette(uv - vec2(px.x, 0.0));
    float r = detectSilhouette(uv + vec2(px.x, 0.0));
    float u = detectSilhouette(uv - vec2(0.0, px.y));
    float d = detectSilhouette(uv + vec2(0.0, px.y));
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

    // Smooth interpolation between iterations instead of snapping
    float iterF = t * float(MAX_ITER);
    int iterLow = int(floor(iterF));
    float iterFrac = fract(iterF);

    vec2 posA = vec2(0.0), posB = vec2(0.0);
    float scaleA = 1.0, scaleB = 1.0;
    float rotA = 0.0, rotB = 0.0;
    float prevLen = 0.0;

    for (int i = 0; i < MAX_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        z += vec2(cos(t * PI * 2.0), sin(t * PI * 2.0)) * 0.12;

        float curLen = length(z);
        if (i == iterLow) {
            posA = z * 0.3;
            scaleA = (curLen - prevLen) * 1.2 + 0.5;
            rotA = atan(z.y, z.x) * 2.0 + t * PI * 3.0;
        }
        if (i == iterLow + 1 || i == MAX_ITER - 1) {
            posB = z * 0.3;
            scaleB = (curLen - prevLen) * 1.2 + 0.5;
            rotB = atan(z.y, z.x) * 2.0 + t * PI * 3.0;
        }
        prevLen = curLen;
    }

    // Smoothstep blend between iteration frames
    float blend = smoothstep(0.0, 1.0, iterFrac);
    pos = mix(posA, posB, blend);
    scale = mix(scaleA, scaleB, blend);
    rotation = mix(rotA, rotB, blend);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // ---- IMAGE UV: contain square image, bass zoom, rotation, ripple ----
    vec2 imgUV = containUV(screenUV);
    vec2 imgCenter = vec2(0.5);

    // Bass-reactive zoom
    imgUV = (imgUV - imgCenter) / max(BANANA_PULSE, 0.5) + imgCenter; // safe

    // Subtle rotation around image center
    imgUV = (rot(SILHOUETTE_ROT) * (imgUV - imgCenter)) + imgCenter;

    // Audio-reactive ripple distortion
    vec2 toCtr = imgUV - imgCenter;
    float dist = length(toCtr);
    float ripple = sin(dist * 25.0 - iTime * 3.0) * RIPPLE_STRENGTH;
    imgUV += normalize(toCtr + 0.001) * ripple;

    // Pixel sizes for edge detection (sharp + wide glow)
    vec2 pxEdge = 2.0 / max(iResolution.xy, vec2(1.0));
    vec2 pxGlow = 6.0 / max(iResolution.xy, vec2(1.0));

    // Dark navy background
    vec3 col = vec3(0.02, 0.02, 0.08);

    // ---- SCATTERED BACKGROUND BANANAS along Mandelbrot paths ----
    for (float line = 0.0; line < LINE_COUNT; line++) {
        for (float i = 0.0; i < BANANA_COUNT; i++) {
            float t = fract(i / BANANA_COUNT - iTime * MOVE_SPEED + line * 0.25);

            vec2 pos;
            float scale, rotation;
            mandelbrotTransform(t, line, pos, scale, rotation);

            // Smooth sinusoidal drift, amplitude gently modulated by mids trend
            float driftAmp = 0.1 + midsSlope * 4.0 * midsRSquared * 0.05;
            pos += vec2(cos(t * PI * 2.0 + iTime * 0.2), sin(t * PI * 2.0 + iTime * 0.15)) * driftAmp;
            scale *= 0.1 + BG_SCALE_MOD;
            rotation += PATTERN_ROT * PI + SCATTER_CHAOS * sin(t * 8.0 + iTime * 0.1) * 0.5;

            vec2 bUV = uv - pos;
            bUV = rot(rotation + t * PI * 2.0) * bUV;
            bUV /= max(scale, 0.01);

            // Map local coords to image UV (0-1 range)
            vec2 sampleUV = bUV + 0.5;
            if (sampleUV.x > 0.0 && sampleUV.x < 1.0 && sampleUV.y > 0.0 && sampleUV.y < 1.0) {
                float bMask = detectSilhouette(sampleUV);
                if (bMask > 0.05) {
                    float distFromCenter = length(pos) / 2.5;
                    float depth = mix(0.12, 0.6, clamp(distFromCenter, 0.0, 1.0));
                    depth += HUE_DRIFT + line * 0.04;
                    vec3 bCol = chromadepth(depth);

                    bCol *= 1.0 + TREBLE_SHIMMER * 0.12 * sin(t * 20.0 + iTime * 4.0);

                    col = max(col, bCol * bMask * 0.7);
                }
            }
        }
    }

    // ---- BANANA MAN FROM IMAGE ----
    float silhouette = detectSilhouette(imgUV);
    float edge = detectEdge(imgUV, pxEdge);
    float glow = detectEdge(imgUV, pxGlow);

    if (silhouette > 0.05) {
        // ChromaDepth depth: head (top) = red nearest, feet (bottom) = yellow near
        float yNorm = clamp(imgUV.y, 0.0, 1.0);
        float depth = mix(0.13, 0.0, yNorm) + HUE_DRIFT;

        // Center of mass pops slightly more forward
        float radial = length(imgUV - imgCenter);
        depth = max(depth - radial * 0.03, 0.0);

        vec3 manCol = chromadepth(depth);
        manCol *= ENERGY_BRIGHT;

        // Treble shimmer inside the silhouette
        float shimmer = sin(imgUV.x * 40.0 + iTime * 2.5) * sin(imgUV.y * 35.0 - iTime * 1.8);
        manCol *= 1.0 + shimmer * max(TREBLE_SHIMMER, 0.0) * 0.08;

        col = mix(col, manCol, silhouette);
    }

    // Sharp edge glow (red-orange, pops forward in chromadepth)
    float edgeGlow = edge * (0.3 + EDGE_GLOW * 0.5);
    col += chromadepth(0.03) * edgeGlow;

    // Wide ambient glow around the silhouette
    float ambientGlow = glow * 0.2;
    col += chromadepth(0.06) * ambientGlow;

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
