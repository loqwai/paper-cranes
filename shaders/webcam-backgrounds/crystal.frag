// @fullscreen: true
// @mobile: true
// @tags: ambient, background, webcam
// Geometric Voronoi crystal facets — cool blue-violet webcam background

// ============================================================================
// SLOW PARAMETERS (medians, means, regression — changes over seconds)
// ============================================================================

// Voronoi cell density (more cells = smaller crystals)
#define CELL_SCALE (3.0 + spectralSpreadMedian * 4.0)

// Edge brightness from energy
#define EDGE_BRIGHTNESS (0.15 + energyMedian * 0.20)

// Hue center in Oklch (blue-violet range ~4.6-5.4)
#define HUE_CENTER (4.9 + pitchClassMedian * 0.4 + spectralCentroidSlope * 0.15)

// Chroma — vivid when trend is confident
#define CHROMA (0.07 + energyRSquared * 0.06)

// Base lightness
#define LIGHTNESS (0.20 + energyMedian * 0.12)

// Cell drift speed
#define DRIFT_SPEED (0.06 + bassSlope * 0.03)

// Facet color variation from pitch
#define COLOR_SPREAD (0.3 + pitchClassMedian * 0.5)

// ============================================================================
// FAST PARAMETERS (small accents only)
// ============================================================================

// Edge flash on spectral flux spikes
#define EDGE_FLASH (max(spectralFluxZScore, 0.0) * 0.08)

// Surface sparkle from treble
#define SPARKLE (max(trebleZScore, 0.0) * 0.05)

// Roughness grit on facets
#define GRIT (spectralRoughnessZScore * 0.006)

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
// HASH for Voronoi cell points
// ============================================================================

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

// ============================================================================
// VORONOI — returns vec3(dist1, dist2, cellId)
// dist1: distance to nearest cell center
// dist2: distance to second-nearest cell center
// cellId: unique value per cell for coloring
// ============================================================================

vec3 voronoi(vec2 p, float t) {
    vec2 cell = floor(p);
    vec2 frac = fract(p);

    float d1 = 10.0; // nearest
    float d2 = 10.0; // second nearest
    float cellId = 0.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash2(cell + neighbor);

            // Slow organic drift
            point = 0.5 + 0.4 * sin(t * DRIFT_SPEED * 6.2832 + 6.2832 * point);

            vec2 diff = neighbor + point - frac;
            float d = dot(diff, diff);

            if (d < d1) {
                d2 = d1;
                d1 = d;
                cellId = dot(cell + neighbor, vec2(7.0, 113.0));
            } else if (d < d2) {
                d2 = d;
            }
        }
    }

    return vec3(sqrt(d1), sqrt(d2), cellId);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float t = time;

    // --- Voronoi field ---
    vec2 scaledP = p * CELL_SCALE;
    vec3 vor = voronoi(scaledP, t);
    float d1 = vor.x;
    float d2 = vor.y;
    float cellId = vor.z;

    // Edge detection: thin bright lines between cells
    float edge = d2 - d1;
    float edgeLine = smoothstep(0.06, 0.01, edge);

    // Facet interior: gentle gradient from center to edge
    float facetGrad = smoothstep(0.0, 0.5, d1);

    // Cell-specific random value for color variation
    float cellRand = fract(sin(cellId * 127.31) * 43758.5453);
    float cellRand2 = fract(sin(cellId * 89.17) * 23421.6312);

    // --- Second Voronoi at finer scale for internal facet detail ---
    vec3 vor2 = voronoi(scaledP * 2.3 + 5.7, t * 0.7);
    float subEdge = smoothstep(0.08, 0.02, vor2.y - vor2.x);

    // --- Color in Oklch: blue-violet ---
    // Per-cell hue variation
    float hue = HUE_CENTER + (cellRand - 0.5) * COLOR_SPREAD;

    // Facet lightness: dim interior, bright edges
    float lightness = LIGHTNESS * (0.3 + facetGrad * 0.5);
    lightness += edgeLine * EDGE_BRIGHTNESS;
    lightness += subEdge * 0.04; // Subtle sub-facet structure

    // Chroma varies per cell
    float chroma = CHROMA * (0.6 + cellRand2 * 0.8);

    // --- Fast accents ---
    // Edge flash on flux spikes
    lightness += edgeLine * EDGE_FLASH;

    // Sparkle: concentrated bright dots within facets
    float sparkleNoise = snoise(p * 50.0 + time * 2.0) * 0.5 + 0.5;
    sparkleNoise = pow(sparkleNoise, 6.0);
    lightness += sparkleNoise * SPARKLE * (1.0 - edgeLine);

    // Grit texture
    lightness += snoise(p * 30.0 + time * 0.5) * GRIT;

    // Background: very dark blue-violet
    vec3 bg = oklch2rgb(vec3(0.06, 0.03, 5.0));

    // Facet body color
    vec3 facetCol = oklch2rgb(vec3(
        clamp(lightness, 0.04, 0.45),
        clamp(chroma, 0.02, 0.14),
        hue
    ));

    // Edge highlight: brighter, shifted toward cyan
    vec3 edgeCol = oklch2rgb(vec3(
        clamp(EDGE_BRIGHTNESS + EDGE_FLASH + 0.1, 0.15, 0.55),
        clamp(CHROMA * 1.3, 0.03, 0.15),
        HUE_CENTER - 0.25
    ));

    // Blend facet and edge
    vec3 col = mix(facetCol, edgeCol, edgeLine * 0.7);

    // Blend with background (darkest areas stay dark)
    float totalIntensity = clamp(facetGrad * 0.6 + edgeLine * 0.4, 0.0, 1.0);
    col = mix(bg, col, 0.6 + totalIntensity * 0.4);

    // --- Center darkening (face area) ---
    float centerDark = 1.0 - 0.3 * exp(-dot(p, p) * 3.5);
    col *= centerDark;

    // --- Frame feedback for smoothness ---
    vec4 prev = getLastFrameColor(uv);
    col = mix(prev.rgb, col, 0.10);

    // --- Vignette ---
    float r = length(p);
    float vign = 1.0 - r * 0.2;
    col *= vign;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
