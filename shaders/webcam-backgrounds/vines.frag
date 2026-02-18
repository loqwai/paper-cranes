// @fullscreen: true
// @mobile: true
// @tags: ambient, background, webcam
// Organic vines growing inward from edges — green-teal on dark, webcam background

// ============================================================================
// SLOW PARAMETERS (medians, means, regression — changes over seconds)
// ============================================================================

// How far vines extend toward center (0 = edge only, 1 = reach center)
#define GROWTH_EXTENT (0.4 + bassMedian * 0.35)

// Branch complexity (more noise octaves and detail)
#define COMPLEXITY (3.0 + spectralEntropyMedian * 4.0)

// Gentle sway from spectral centroid trend
#define SWAY_AMOUNT (0.08 + abs(spectralCentroidSlope) * 0.15)

// Hue center in Oklch (green-teal range ~2.5-3.5)
#define HUE_CENTER (2.9 + pitchClassMedian * 0.4 + spectralCentroidSlope * 0.15)

// Chroma — more vivid when trend is confident
#define CHROMA (0.08 + energyRSquared * 0.06)

// Base lightness
#define LIGHTNESS (0.30 + energyMedian * 0.12)

// Growth animation speed
#define GROW_SPEED (0.05 + energySlope * 0.03)

// Branch thickness
#define THICKNESS (0.015 + spectralSpreadMedian * 0.01)

// ============================================================================
// FAST PARAMETERS (small accents only)
// ============================================================================

// Leaf glow on treble spikes
#define LEAF_GLOW (max(trebleZScore, 0.0) * 0.06)

// Brightness pulse on flux
#define FLUX_PULSE (max(spectralFluxZScore, 0.0) * 0.04)

// Roughness texture
#define BARK_GRIT (spectralRoughnessZScore * 0.005)

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

// Fractal Brownian motion for organic shapes
float fbm(vec2 p, float octaves) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (float i = 0.0; i < 8.0; i += 1.0) {
        if (i >= octaves) break;
        val += amp * snoise(p * freq);
        freq *= 2.1;
        amp *= 0.48;
        p += vec2(1.7, 3.1);
    }
    return val;
}

// ============================================================================
// VINE BRANCHES
// ============================================================================

// Compute vine density at a point using polar coordinates
// Vines grow inward from the edges toward center
float vineField(vec2 p, float t) {
    float r = length(p);
    float angle = atan(p.y, p.x);

    // The vine region: starts from edge, extends inward
    // maxR is the outer boundary, minR is how close to center they reach
    float maxR = 0.65;
    float minR = maxR * (1.0 - GROWTH_EXTENT);

    // Outside vine region
    if (r < minR * 0.5 || r > maxR + 0.1) return 0.0;

    // Radial fade: vines are strongest at edges, thin toward center
    float radialFade = smoothstep(minR, minR + 0.15, r) * smoothstep(maxR + 0.1, maxR - 0.05, r);

    // Sway: gentle angular offset that varies with time and radius
    float sway = sin(t * GROW_SPEED * 3.0 + r * 4.0) * SWAY_AMOUNT;
    float swayedAngle = angle + sway;

    // Main branch structure: periodic angular pattern with noise
    float branches = 0.0;
    float branchCount = 5.0 + COMPLEXITY;

    for (float i = 0.0; i < 12.0; i += 1.0) {
        if (i >= branchCount) break;

        // Each branch has a base angle
        float branchAngle = i / branchCount * 6.2832;

        // Angular distance to this branch
        float angleDist = abs(mod(swayedAngle - branchAngle + 3.1416, 6.2832) - 3.1416);

        // Noise-modulated branch path: the branch wiggles as r changes
        float pathNoise = fbm(vec2(r * 6.0 + i * 2.3, i * 7.1 + t * GROW_SPEED), min(COMPLEXITY, 5.0));
        angleDist += pathNoise * 0.15;

        // Sub-branches: thinner offshoots that fork from main branches
        float subBranchNoise = snoise(vec2(swayedAngle * 3.0 + i * 11.0, r * 8.0 + t * 0.1)) * 0.5 + 0.5;
        float subBranch = smoothstep(0.6, 1.0, subBranchNoise) * 0.4;

        // Branch thickness: thicker near edge, thinner toward center
        float width = THICKNESS * (0.5 + (r - minR) / max(maxR - minR, 0.01) * 1.5);
        width = max(width, 0.005);

        // Main branch line
        float branch = smoothstep(width, width * 0.2, angleDist);

        // Sub-branch tendrils
        float tendrilAngle = abs(mod(swayedAngle - branchAngle - 0.3 - pathNoise * 0.2 + 3.1416, 6.2832) - 3.1416);
        float tendril = smoothstep(width * 0.5, width * 0.1, tendrilAngle) * subBranch;

        branches += (branch + tendril * 0.5) * radialFade;
    }

    return clamp(branches, 0.0, 1.0);
}

// Leaf clusters: little bright spots at vine tips and nodes
float leafField(vec2 p, float t) {
    float r = length(p);
    float maxR = 0.65;
    float minR = maxR * (1.0 - GROWTH_EXTENT);

    // Leaves concentrate near the inner tips of vines
    float leafZone = smoothstep(minR - 0.02, minR + 0.12, r) * smoothstep(minR + 0.25, minR + 0.08, r);

    // Also some along the branches
    float branchZone = smoothstep(minR, minR + 0.1, r) * smoothstep(maxR + 0.05, maxR - 0.15, r);

    // Noise-based leaf placement
    float leafNoise = snoise(p * 25.0 + t * 0.2) * 0.5 + 0.5;
    leafNoise = pow(leafNoise, 3.0); // Concentrate into spots

    return leafNoise * (leafZone * 1.5 + branchZone * 0.3);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float t = time;

    // --- Vine field ---
    float vines = vineField(p, t);

    // --- Leaf accents ---
    float leaves = leafField(p, t);
    float leafAccent = leaves * vines; // Leaves only where vines exist

    // --- Color in Oklch: green-teal ---
    float r = length(p);
    float angle = atan(p.y, p.x);

    // Hue varies slightly with position
    float hue = HUE_CENTER + angle * 0.04 + r * 0.15;

    // Vine body: dim green
    float lightness = LIGHTNESS * (0.3 + vines * 0.7);

    // Chroma increases with vine density
    float chroma = CHROMA * (0.4 + vines * 1.2);

    // --- Fast accents ---
    // Leaf glow on treble
    float leafGlow = LEAF_GLOW * leafAccent;
    lightness += leafGlow;

    // Flux pulse brightens vines
    lightness += FLUX_PULSE * vines;

    // Bark texture
    lightness += snoise(p * 35.0 + time * 0.3) * BARK_GRIT * vines;

    // Leaves shift hue toward yellow-green
    hue += leafAccent * 0.3;
    chroma += leafAccent * 0.04;

    // Background: very dark forest
    vec3 bg = oklch2rgb(vec3(0.06, 0.02, 3.2));

    // Vine color
    vec3 vineCol = oklch2rgb(vec3(
        clamp(lightness, 0.04, 0.45),
        clamp(chroma, 0.02, 0.14),
        hue
    ));

    // Leaf highlight: brighter, more saturated, shifted hue
    vec3 leafCol = oklch2rgb(vec3(
        clamp(lightness + leafGlow + 0.1, 0.15, 0.55),
        clamp(CHROMA * 1.5, 0.04, 0.16),
        hue + 0.2
    ));

    // Blend vine body
    vec3 col = mix(bg, vineCol, smoothstep(0.0, 0.02, vines));

    // Add leaf highlights
    col = mix(col, leafCol, leafAccent * 0.5);

    // --- Center should stay very dark (face area) ---
    // Aggressive center darkening beyond vine fade
    float centerDark = 1.0 - 0.35 * exp(-dot(p, p) * 3.0);
    col *= centerDark;

    // --- Frame feedback for smoothness ---
    vec4 prev = getLastFrameColor(uv);
    col = mix(prev.rgb, col, 0.13);

    // --- Vignette: slightly darken extreme edges ---
    float vign = 1.0 - r * 0.12;
    col *= vign;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
