// @fullscreen: true
// @mobile: true
// @tags: ambient, background, webcam
// Wispy layered smoke tendrils — dark warm-gray webcam background

// ============================================================================
// SLOW PARAMETERS (medians, means, regression — changes over seconds)
// ============================================================================

// Smoke scroll speed
#define SMOKE_SPEED (0.05 + energySlope * 0.03)

// Smoke density/opacity
#define SMOKE_DENSITY (0.4 + bassMedian * 0.3)

// FBM octave count influence
#define COMPLEXITY (3.0 + spectralEntropyMedian * 3.0)

// Hue center in Oklch (warm gray-amber ~1.0-1.6)
#define HUE_CENTER (1.2 + pitchClassMedian * 0.3 + spectralCentroidSlope * 0.1)

// Chroma — mostly desaturated, slightly warm
#define CHROMA (0.02 + energyRSquared * 0.03)

// Base lightness
#define LIGHTNESS (0.30 + energyMedian * 0.12)

// Curl factor for smoke distortion
#define CURL (0.5 + spectralSpreadMedian * 0.5)

// ============================================================================
// FAST PARAMETERS (small accents only)
// ============================================================================

// Brightness pulse on flux
#define FLUX_GLOW (max(spectralFluxZScore, 0.0) * 0.04)

// Ember spark from treble
#define EMBER (max(trebleZScore, 0.0) * 0.03)

// Surface grit
#define GRIT (spectralRoughnessZScore * 0.005)

// ============================================================================
// NOISE
// ============================================================================

vec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x / 289.0) * 289.0; }
vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// ============================================================================
// FBM (fractal Brownian motion)
// ============================================================================

float fbm(vec2 p, float t, int octaves) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    vec2 offset = vec2(t * SMOKE_SPEED, t * SMOKE_SPEED * 0.7);

    for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;

        // Curl: rotate each octave slightly for swirling smoke
        float angle = float(i) * CURL * 0.3;
        float c = cos(angle), s = sin(angle);
        vec2 rp = vec2(p.x * c - p.y * s, p.x * s + p.y * c);

        val += snoise(rp * freq + offset) * amp;
        freq *= 2.1;
        amp *= 0.48;
        offset *= 1.3;
    }
    return val;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float t = time;
    int octaves = int(COMPLEXITY);

    // --- Smoke layers ---
    // Layer 1: large slow wisps
    float smoke1 = fbm(p * 1.5, t, octaves);

    // Layer 2: medium detail, offset
    float smoke2 = fbm(p * 2.5 + 3.7, t * 1.2, octaves);

    // Layer 3: fine detail wisps
    float smoke3 = fbm(p * 4.0 + 7.3, t * 0.8, octaves);

    // Combine layers with different weights
    float smoke = smoke1 * 0.5 + smoke2 * 0.3 + smoke3 * 0.2;

    // Map noise [-1,1] to [0,1] with density control
    smoke = smoothstep(-SMOKE_DENSITY, SMOKE_DENSITY, smoke);

    // --- Wisp edges: brighter where smoke thins ---
    float edge = abs(smoke1 - 0.1);
    float wispEdge = smoothstep(0.15, 0.0, edge) * 0.4;

    // --- Color in Oklch: warm gray ---
    float hue = HUE_CENTER + smoke * 0.2;
    float chroma = CHROMA * (0.5 + smoke * 1.0);
    float lightness = mix(0.0, LIGHTNESS, smoke) + wispEdge * 0.15;

    // Fast accents
    lightness += FLUX_GLOW * smoke;
    lightness += GRIT * snoise(p * 25.0 + time * 0.5);

    // Ember spots: tiny warm bright dots on treble spikes
    float emberNoise = snoise(p * 40.0 + time * 2.0) * 0.5 + 0.5;
    emberNoise = pow(emberNoise, 8.0);
    float ember = emberNoise * EMBER;

    // Background: very dark charcoal
    vec3 bg = oklch2rgb(vec3(0.06, 0.01, 1.0));

    // Smoke body
    vec3 smokeCol = oklch2rgb(vec3(
        clamp(lightness, 0.04, 0.42),
        clamp(chroma, 0.01, 0.08),
        hue
    ));

    // Ember color: warmer, brighter
    vec3 emberCol = oklch2rgb(vec3(
        clamp(0.4 + ember * 3.0, 0.3, 0.65),
        clamp(0.08, 0.04, 0.12),
        0.8 // warm orange-red in Oklch
    ));

    // Blend
    vec3 col = mix(bg, smokeCol, smoothstep(0.0, 0.02, smoke));
    col += emberCol * ember;

    // --- Center darkening ---
    float centerDark = 1.0 - 0.2 * exp(-dot(p, p) * 4.0);
    col *= centerDark;

    // --- Frame feedback ---
    vec4 prev = getLastFrameColor(uv);
    col = mix(prev.rgb, col, 0.08);

    // --- Vignette ---
    float r = length(p);
    float vign = 1.0 - r * 0.18;
    col *= vign;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
