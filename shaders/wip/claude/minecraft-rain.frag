// @fullscreen: true
// @mobile: true
// @tags: minecraft, rain, blocks, procedural

#define PI 3.14159265359

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Bass: block size pulse
#define BLOCK_PULSE (1.0 + bassZScore * 0.08)
// #define BLOCK_PULSE 1.0

// Energy: fall speed
#define FALL_SPEED (0.15 + energyNormalized * 0.25)
// #define FALL_SPEED 0.25

// Treble: shimmer on block faces
#define SHIMMER (trebleZScore * 0.12)
// #define SHIMMER 0.0

// Spectral flux: block wobble rotation
#define WOBBLE (spectralFluxZScore * 0.06)
// #define WOBBLE 0.0

// Spectral centroid: hue drift (shifts block palette)
#define HUE_DRIFT (spectralCentroidNormalized * 0.08)
// #define HUE_DRIFT 0.0

// Spectral entropy: scatter chaos (horizontal jitter)
#define SCATTER (spectralEntropyNormalized * 0.15)
// #define SCATTER 0.0

// Beat: flash pop
#define BEAT_POP (beat ? 1.15 : 1.0)
// #define BEAT_POP 1.0

// Mids: density of blocks (how many columns)
#define DENSITY (8.0 + midsNormalized * 6.0)
// #define DENSITY 10.0

// Energy slope: confident builds brighten, drops darken
#define TREND_BRIGHT (0.85 + energySlope * 8.0 * energyRSquared * 0.15)
// #define TREND_BRIGHT 0.85

// Spectral roughness: edge glow intensity
#define EDGE_GLOW (max(spectralRoughnessZScore, 0.0) * 0.25)
// #define EDGE_GLOW 0.0

// Bass slope: parallax speed multiplier (confident bass trends shift layers)
#define PARALLAX_MOD (1.0 + bassSlope * 6.0 * bassRSquared * 0.2)
// #define PARALLAX_MOD 1.0

// Zoom speed: slow drift forward through the rain
#define ZOOM_SPEED 0.03
// Audio-reactive zoom push (flux spikes = lurch forward)
#define ZOOM_PUSH (spectralFluxZScore * 0.02)
// #define ZOOM_PUSH 0.0

// ============================================================================
// HASH FUNCTIONS
// ============================================================================

float hash(float n) { return fract(sin(n * 43758.5453) * 2835.17); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash22(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// ============================================================================
// PROCEDURAL MINECRAFT BLOCK TEXTURES
// ============================================================================

// Pixelate UV to Minecraft-style grid
vec2 pixelate(vec2 uv, float pixels) {
    return floor(uv * pixels) / pixels;
}

// Dirt block: brown body, green grass top strip
vec3 drawDirt(vec2 uv, float seed) {
    vec2 px = pixelate(uv, 8.0);
    float n = hash2(px * 97.3 + seed);

    // Base dirt
    vec3 col = oklch2rgb(vec3(0.45 + n * 0.06, 0.08, 1.1));

    // Grass top (top 2 pixel rows)
    if (uv.y > 0.72) {
        float gn = hash2(px * 53.1 + seed + 7.0);
        col = oklch2rgb(vec3(0.52 + gn * 0.08, 0.12, 2.4));
    }

    return col;
}

// Stone block: grey with darker speckles
vec3 drawStone(vec2 uv, float seed) {
    vec2 px = pixelate(uv, 8.0);
    float n = hash2(px * 83.7 + seed);
    float speckle = step(0.7, n);

    vec3 base = oklch2rgb(vec3(0.55 + n * 0.04, 0.01, 4.5));
    vec3 dark = oklch2rgb(vec3(0.40, 0.01, 4.5));

    return mix(base, dark, speckle * 0.6);
}

// Brick block: red/brown bricks with mortar
vec3 drawBrick(vec2 uv, float seed) {
    vec2 brickUV = uv * vec2(4.0, 4.0);
    float row = floor(brickUV.y);
    brickUV.x += mod(row, 2.0) * 0.5;

    vec2 brickID = floor(brickUV);
    vec2 brickLocal = fract(brickUV);

    // Mortar gaps
    float mortar = smoothstep(0.0, 0.12, brickLocal.x) *
                   smoothstep(0.0, 0.12, brickLocal.y);

    float n = hash2(brickID * 41.3 + seed);
    vec3 brickCol = oklch2rgb(vec3(0.42 + n * 0.06, 0.1, 0.7));
    vec3 mortarCol = oklch2rgb(vec3(0.55, 0.02, 1.2));

    return mix(mortarCol, brickCol, mortar);
}

// Diamond ore: stone with blue sparkle pixels
vec3 drawDiamondOre(vec2 uv, float seed) {
    vec3 base = drawStone(uv, seed);
    vec2 px = pixelate(uv, 8.0);
    float sparkle = hash2(px * 137.9 + seed + 42.0);

    if (sparkle > 0.82) {
        float twinkle = 0.8 + sin(iTime * 3.0 + sparkle * 20.0) * 0.2;
        base = oklch2rgb(vec3(0.7 * twinkle, 0.18, 4.1));
    }
    return base;
}

// TNT block: red sides with white band
vec3 drawTNT(vec2 uv, float seed) {
    vec2 px = pixelate(uv, 8.0);
    float n = hash2(px * 61.3 + seed);

    // Red base
    vec3 col = oklch2rgb(vec3(0.45 + n * 0.04, 0.15, 0.55));

    // White band in the middle
    if (uv.y > 0.35 && uv.y < 0.65) {
        col = oklch2rgb(vec3(0.85, 0.02, 1.2));
        // "TNT" darkened pixels (approximate letter shapes)
        float tx = px.x * 8.0;
        if (tx > 1.5 && tx < 6.5 && uv.y > 0.42 && uv.y < 0.58) {
            if (hash2(px * 200.0 + seed) > 0.4)
                col = oklch2rgb(vec3(0.25, 0.08, 0.55));
        }
    }

    return col;
}

// Dispatch block type
vec3 drawBlock(vec2 uv, float blockType, float seed) {
    if (blockType < 1.0) return drawDirt(uv, seed);
    if (blockType < 2.0) return drawStone(uv, seed);
    if (blockType < 3.0) return drawBrick(uv, seed);
    if (blockType < 4.0) return drawDiamondOre(uv, seed);
    return drawTNT(uv, seed);
}

// ============================================================================
// 3D BLOCK FACE SHADING
// ============================================================================

vec3 shadeBlock(vec2 uv, float blockType, float seed) {
    vec3 face = drawBlock(uv, blockType, seed);

    // Top edge highlight
    float topLight = smoothstep(0.85, 1.0, uv.y) * 0.15;
    // Left edge highlight
    float leftLight = smoothstep(0.15, 0.0, uv.x) * 0.08;
    // Bottom/right shadow
    float shadow = smoothstep(0.15, 0.0, uv.y) * 0.12 +
                   smoothstep(0.85, 1.0, uv.x) * 0.08;

    // Block border (dark outline)
    float border = smoothstep(0.0, 0.04, uv.x) *
                   smoothstep(1.0, 0.96, uv.x) *
                   smoothstep(0.0, 0.04, uv.y) *
                   smoothstep(1.0, 0.96, uv.y);

    vec3 col = face;
    col += topLight + leftLight;
    col -= shadow;
    col *= mix(0.4, 1.0, border);

    // Audio shimmer
    col *= 1.0 + SHIMMER * sin(uv.x * 16.0 + uv.y * 12.0 + iTime * 4.0);

    return col;
}

// ============================================================================
// RAIN LAYER — one depth layer of falling blocks
// ============================================================================

vec3 rainLayer(vec2 uv, float aspect, float layerIdx, float speed, float scale, float brightness) {
    float cols = DENSITY * scale;
    float blockW = 1.0 / cols;
    float blockH = blockW * aspect; // correct for aspect ratio — keeps blocks square

    // Scale UV for this layer
    vec2 luv = uv;
    luv.x += layerIdx * 3.17; // offset each layer horizontally

    float colIdx = floor(luv.x / blockW);
    float colHash = hash(colIdx * 17.3 + layerIdx * 91.7);

    // Horizontal jitter per column
    float jitterX = (colHash - 0.5) * SCATTER * blockW * 2.0;
    luv.x += jitterX;
    colIdx = floor(luv.x / blockW);
    colHash = hash(colIdx * 17.3 + layerIdx * 91.7);

    // Fall offset (different speed per column)
    float colSpeed = speed * (0.6 + colHash * 0.8) * PARALLAX_MOD;
    float fallY = luv.y + iTime * colSpeed;

    // Block grid
    float rowIdx = floor(fallY / blockH);
    float blockHash = hash(colIdx * 31.7 + rowIdx * 57.3 + layerIdx * 113.1);

    // Skip some slots for gaps (not a solid wall)
    if (blockHash < 0.55) return vec3(0.0);

    // Local UV within block
    vec2 blockLocal = vec2(
        fract(luv.x / blockW),
        fract(fallY / blockH)
    );

    // Block type and seed
    float blockType = floor(blockHash * 5.0);
    float seed = hash(colIdx * 73.1 + rowIdx * 149.3 + layerIdx * 200.0);

    // Subtle wobble rotation
    float wobbleAngle = WOBBLE * sin(iTime * 2.0 + seed * 10.0);
    vec2 center = blockLocal - 0.5;
    float ca = cos(wobbleAngle), sa = sin(wobbleAngle);
    blockLocal = vec2(center.x * ca - center.y * sa,
                      center.x * sa + center.y * ca) + 0.5;

    // Pulse scale
    vec2 pulseCenter = blockLocal - 0.5;
    blockLocal = pulseCenter / max(BLOCK_PULSE * scale, 0.01) + 0.5;

    // Bounds check
    if (blockLocal.x < 0.0 || blockLocal.x > 1.0 ||
        blockLocal.y < 0.0 || blockLocal.y > 1.0) return vec3(0.0);

    vec3 col = shadeBlock(blockLocal, blockType, seed);

    // Apply hue drift
    vec3 lch = rgb2oklch(col);
    lch.z += HUE_DRIFT;
    col = oklch2rgb(lch);

    return col * brightness * TREND_BRIGHT;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    // ---- CAMERA ZOOM (fly through the rain) ----
    float zoom = 1.0 + iTime * ZOOM_SPEED + max(ZOOM_PUSH, 0.0);
    // Zoom cycles: use fract-based wrapping so it doesn't zoom to infinity
    // Logarithmic zoom feels more natural — repeats every ~33s at 0.03 speed
    float zoomCycle = exp(mod(iTime * ZOOM_SPEED, 1.0)) * (1.0 + max(ZOOM_PUSH, 0.0));
    vec2 zoomedUV = (uv - 0.5) / zoomCycle + 0.5;

    vec2 centered = (zoomedUV - 0.5) * 2.0;
    centered.x *= aspect;

    vec3 col = vec3(0.0);

    // Dark sky gradient background
    vec3 skyTop = oklch2rgb(vec3(0.12, 0.03, 4.3));
    vec3 skyBot = oklch2rgb(vec3(0.06, 0.02, 4.0));
    col = mix(skyBot, skyTop, zoomedUV.y);

    // Subtle background grid (like looking at a giant wall far away)
    vec2 bgGrid = fract(centered * 3.0);
    float gridLine = smoothstep(0.02, 0.0, abs(bgGrid.x - 0.5)) +
                     smoothstep(0.02, 0.0, abs(bgGrid.y - 0.5));
    col += gridLine * 0.015;

    // ---- THREE DEPTH LAYERS of falling blocks ----
    // Each layer zooms at a different rate (parallax)

    // Far layer: small, slow, dim — zooms slower
    vec2 farUV = (uv - 0.5) / mix(1.0, zoomCycle, 0.3) + 0.5;
    vec3 far = rainLayer(farUV, aspect, 0.0, FALL_SPEED * 0.4, 0.6, 0.35);

    // Mid layer: medium zoom
    vec2 midUV = (uv - 0.5) / mix(1.0, zoomCycle, 0.6) + 0.5;
    vec3 mid = rainLayer(midUV, aspect, 1.0, FALL_SPEED * 0.7, 0.8, 0.6);

    // Near layer: large, fast, bright — zooms fastest
    vec2 nearUV = (uv - 0.5) / zoomCycle + 0.5;
    vec3 near = rainLayer(nearUV, aspect, 2.0, FALL_SPEED, 1.0, 0.9);

    // Composite layers (far behind, near on top)
    if (length(far) > 0.01) col = far;
    if (length(mid) > 0.01) col = mid;
    if (length(near) > 0.01) col = near;

    // Beat flash
    col *= BEAT_POP;

    // Edge glow on blocks (bloom-like)
    col += col * EDGE_GLOW * 0.5;

    // ---- FRAME FEEDBACK ----
    vec2 fbUV = uv;
    fbUV.y -= 0.003; // slight downward drift for rain trail feel
    vec3 prev = getLastFrameColor(clamp(fbUV, 0.0, 1.0)).rgb;

    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);
    prevOk.x *= 0.93; // decay brightness
    prevOk.yz *= 0.95; // decay chroma

    float newAmount = 0.65;
    vec3 blended = mix(prevOk, colOk, newAmount);
    col = oklab2rgb(blended);

    // ---- VIGNETTE ----
    vec2 vc = uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.5;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
