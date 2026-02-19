// @fullscreen: true
// @mobile: true
// @tags: ambient, background, webcam
// Swirling space nebula gas clouds — deep magenta-orange webcam background

// ============================================================================
// SLOW PARAMETERS (medians, means, regression — changes over seconds)
// ============================================================================

// Swirl speed
#define SWIRL_SPEED (0.04 + energySlope * 0.02)

// Cloud density
#define CLOUD_DENSITY (0.35 + bassMedian * 0.25)

// Hue center in Oklch (magenta ~5.8-6.4 wrapping to red-orange ~0.5-1.0)
#define HUE_CENTER (6.0 + pitchClassMedian * 0.5 + spectralCentroidSlope * 0.2)

// Chroma — space nebula is vivid
#define CHROMA (0.09 + energyRSquared * 0.07)

// Base lightness
#define LIGHTNESS (0.28 + energyMedian * 0.14)

// Swirl tightness
#define SWIRL_TIGHT (2.0 + spectralSpreadMedian * 2.0)

// Layer count
#define NUM_LAYERS (3.0 + spectralEntropyMedian * 2.0)

// ============================================================================
// FAST PARAMETERS (small accents only)
// ============================================================================

// Star twinkle on treble spikes
#define STAR_TWINKLE (max(trebleZScore, 0.0) * 0.06)

// Cloud pulse on flux
#define CLOUD_PULSE (max(spectralFluxZScore, 0.0) * 0.04)

// Texture grit
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
// SWIRLED FBM
// ============================================================================

float swirlFbm(vec2 p, float t, int octaves) {
    // Apply spiral distortion
    float r = length(p);
    float angle = atan(p.y, p.x);
    angle += r * SWIRL_TIGHT * 0.5 + t * SWIRL_SPEED * 2.0;
    p = vec2(cos(angle), sin(angle)) * r;

    float val = 0.0;
    float amp = 0.5;
    float freq = 1.5;

    for (int i = 0; i < 5; i++) {
        if (i >= octaves) break;
        val += snoise(p * freq + t * SWIRL_SPEED * float(i + 1) * 0.3) * amp;
        freq *= 2.0;
        amp *= 0.5;
        // Slight rotation per octave
        float c = cos(0.4), s = sin(0.4);
        p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
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
    int layers = int(NUM_LAYERS);

    // --- Nebula cloud layers ---
    float cloud = 0.0;
    float hueVar = 0.0;

    for (int i = 0; i < 5; i++) {
        if (i >= layers) break;

        float scale = 1.0 + float(i) * 0.7;
        float offset = float(i) * 3.14;
        float layer = swirlFbm(p * scale + offset, t + float(i) * 0.5, 4);

        // Map to 0-1
        layer = smoothstep(-CLOUD_DENSITY, CLOUD_DENSITY, layer);

        cloud += layer * (0.5 - float(i) * 0.1);
        hueVar += layer * float(i) * 0.15;
    }

    cloud = clamp(cloud, 0.0, 1.0);

    // --- Stars (small bright dots in dark areas) ---
    float starField = 0.0;
    vec2 starGrid = floor(p * 60.0);
    float starRand = fract(sin(dot(starGrid, vec2(127.1, 311.7))) * 43758.5453);
    if (starRand > 0.97 && cloud < 0.2) {
        float twinkle = sin(t * 2.0 + starRand * 6.28) * 0.5 + 0.5;
        starField = twinkle * (1.0 - cloud * 5.0) * 0.3;
        starField += STAR_TWINKLE * twinkle;
    }

    // --- Color in Oklch: magenta-orange ---
    float hue = HUE_CENTER + hueVar * 0.4;
    float chroma = CHROMA * (0.3 + cloud * 1.8);
    float lightness = mix(0.0, LIGHTNESS, cloud);

    // Fast accents
    lightness += CLOUD_PULSE * cloud;
    lightness += snoise(p * 20.0 + time * 0.5) * GRIT;

    // Background: very dark space
    vec3 bg = oklch2rgb(vec3(0.03, 0.015, 5.5));

    // Nebula cloud color
    vec3 nebulaCol = oklch2rgb(vec3(
        clamp(lightness, 0.03, 0.45),
        clamp(chroma, 0.02, 0.16),
        hue
    ));

    // Mix
    vec3 col = mix(bg, nebulaCol, smoothstep(0.0, 0.02, cloud));

    // Add stars
    col += vec3(starField * 0.8, starField * 0.85, starField);

    // --- Center darkening ---
    float r = length(p);
    float centerDark = 1.0 - 0.25 * exp(-dot(p, p) * 3.5);
    col *= centerDark;

    // --- Frame feedback ---
    vec4 prev = getLastFrameColor(uv);
    col = mix(prev.rgb, col, 0.08);

    // --- Vignette ---
    float vign = 1.0 - r * 0.18;
    col *= vign;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
