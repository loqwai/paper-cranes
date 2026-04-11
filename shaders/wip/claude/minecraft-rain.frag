// @fullscreen: true
// @mobile: true
// @tags: minecraft, rain, blocks, procedural

#define PI 3.14159265359

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Bass: block size pulse on beat
#define BLOCK_PULSE (1.0 + bassZScore * 0.06)
// #define BLOCK_PULSE 1.0

// Energy: base fall speed
#define FALL_SPEED (0.08 + energyNormalized * 0.15)
// #define FALL_SPEED 0.12

// Treble: shimmer on block faces
#define SHIMMER (trebleZScore * 0.1)
// #define SHIMMER 0.0

// Spectral flux: block wobble rotation
#define WOBBLE (spectralFluxZScore * 0.04)
// #define WOBBLE 0.0

// Spectral centroid: hue drift
#define HUE_DRIFT (spectralCentroidNormalized * 0.06)
// #define HUE_DRIFT 0.0

// Beat: flash pop
#define BEAT_POP (beat ? 1.12 : 1.0)
// #define BEAT_POP 1.0

// Mids: how many columns of blocks
#define COLUMNS (10.0 + midsNormalized * 5.0)
// #define COLUMNS 12.0

// How many blocks fall per column (mobile-safe)
#define BLOCKS_PER_COL 3

// Energy slope: confident builds brighten
#define TREND_BRIGHT (1.0 + energySlope * 8.0 * energyRSquared * 0.1)
// #define TREND_BRIGHT 1.0

// Spectral roughness: edge glow
#define EDGE_GLOW (max(spectralRoughnessZScore, 0.0) * 0.2)
// #define EDGE_GLOW 0.0

// Spectral kurtosis: lightning flash
#define LIGHTNING_BOOST (max(spectralKurtosisZScore, 0.0) * 0.15)
// #define LIGHTNING_BOOST 0.0

// Spectral entropy: horizontal scatter
#define SCATTER (spectralEntropyNormalized * 0.12)
// #define SCATTER 0.0

// ============================================================================
// HASH FUNCTIONS
// ============================================================================

float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// ============================================================================
// PROCEDURAL MINECRAFT BLOCK TEXTURES
// ============================================================================

vec2 pixelate(vec2 uv, float pixels) {
    return floor(uv * pixels) / pixels;
}

// Dirt block
vec3 drawDirt(vec2 uv, float seed) {
    vec2 px = pixelate(uv, 8.0);
    float n = hash2(px * 97.3 + seed);
    vec3 col = oklch2rgb(vec3(0.55 + n * 0.06, 0.1, 1.1));
    if (uv.y > 0.75) {
        float gn = hash2(px * 53.1 + seed + 7.0);
        col = oklch2rgb(vec3(0.58 + gn * 0.08, 0.15, 2.4));
    }
    return col;
}

// Stone block
vec3 drawStone(vec2 uv, float seed) {
    vec2 px = pixelate(uv, 8.0);
    float n = hash2(px * 83.7 + seed);
    float speckle = step(0.7, n);
    vec3 base = oklch2rgb(vec3(0.62 + n * 0.04, 0.02, 4.5));
    vec3 dark = oklch2rgb(vec3(0.48, 0.02, 4.5));
    return mix(base, dark, speckle * 0.5);
}

// Brick block
vec3 drawBrick(vec2 uv, float seed) {
    vec2 brickUV = uv * vec2(4.0, 4.0);
    float row = floor(brickUV.y);
    brickUV.x += mod(row, 2.0) * 0.5;
    vec2 brickID = floor(brickUV);
    vec2 brickLocal = fract(brickUV);
    float mortar = smoothstep(0.0, 0.12, brickLocal.x) *
                   smoothstep(0.0, 0.12, brickLocal.y);
    float n = hash2(brickID * 41.3 + seed);
    vec3 brickCol = oklch2rgb(vec3(0.50 + n * 0.06, 0.12, 0.7));
    vec3 mortarCol = oklch2rgb(vec3(0.62, 0.03, 1.2));
    return mix(mortarCol, brickCol, mortar);
}

// Diamond ore
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

// TNT block
vec3 drawTNT(vec2 uv, float seed) {
    vec2 px = pixelate(uv, 8.0);
    float n = hash2(px * 61.3 + seed);
    vec3 col = oklch2rgb(vec3(0.52 + n * 0.04, 0.17, 0.55));
    if (uv.y > 0.35 && uv.y < 0.65) {
        col = oklch2rgb(vec3(0.88, 0.02, 1.2));
        float tx = px.x * 8.0;
        if (tx > 1.5 && tx < 6.5 && uv.y > 0.42 && uv.y < 0.58) {
            if (hash2(px * 200.0 + seed) > 0.4)
                col = oklch2rgb(vec3(0.25, 0.08, 0.55));
        }
    }
    return col;
}

vec3 drawBlock(vec2 uv, float blockType, float seed) {
    if (blockType < 1.0) return drawDirt(uv, seed);
    if (blockType < 2.0) return drawStone(uv, seed);
    if (blockType < 3.0) return drawBrick(uv, seed);
    if (blockType < 4.0) return drawDiamondOre(uv, seed);
    return drawTNT(uv, seed);
}

// ============================================================================
// 3D ISOMETRIC BLOCK SHADING
// ============================================================================

// Draw a block as a Minecraft-style 3D cube: front face, top face, right side
vec3 shadeBlock3D(vec2 uv, float blockType, float seed) {
    // Isometric proportions
    float topH = 0.18;  // top face height (fraction of block)
    float sideW = 0.15; // right side width (fraction of block)

    vec3 frontTex = drawBlock(uv, blockType, seed);

    // Determine which face this pixel belongs to
    bool isTop = uv.y > (1.0 - topH);
    bool isSide = uv.x > (1.0 - sideW);

    vec3 col = frontTex;

    if (isTop && !isSide) {
        // Top face: brighter, sample texture shifted for variety
        vec2 topUV = vec2(uv.x, (uv.y - (1.0 - topH)) / topH);
        vec3 topTex = drawBlock(topUV, blockType, seed + 1.0);
        col = topTex * 1.2;
    } else if (isSide && !isTop) {
        // Right side: darker
        vec2 sideUV = vec2((uv.x - (1.0 - sideW)) / sideW, uv.y / (1.0 - topH));
        vec3 sideTex = drawBlock(sideUV, blockType, seed + 2.0);
        col = sideTex * 0.6;
    } else if (isTop && isSide) {
        // Corner: darkest edge
        col = frontTex * 0.5;
    }

    // Edge lines between faces (dark outlines for that Minecraft grid look)
    float edgeTop = smoothstep(0.0, 0.03, abs(uv.y - (1.0 - topH)));
    float edgeSide = smoothstep(0.0, 0.03, abs(uv.x - (1.0 - sideW)));
    float edgeOuter = smoothstep(0.0, 0.03, uv.x) *
                      smoothstep(0.0, 0.03, uv.y) *
                      smoothstep(0.0, 0.03, 1.0 - uv.x) *
                      smoothstep(0.0, 0.03, 1.0 - uv.y);

    // Darken face-division edges only where they matter
    if (isTop || uv.y > (1.0 - topH - 0.03))
        col *= mix(0.3, 1.0, edgeTop);
    if (isSide || uv.x > (1.0 - sideW - 0.03))
        col *= mix(0.3, 1.0, edgeSide);
    // Outer black border
    col *= mix(0.15, 1.0, edgeOuter);

    // Audio shimmer
    col *= 1.0 + SHIMMER * sin(uv.x * 16.0 + uv.y * 12.0 + iTime * 4.0);

    return col;
}

// ============================================================================
// MINECRAFT SKY
// ============================================================================

float blockNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    vec2 u = step(0.5, f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float cloudNoise(vec2 p) {
    float v = 0.0;
    v += blockNoise(p) * 0.5;
    v += blockNoise(p * 2.0) * 0.3;
    v += blockNoise(p * 4.0) * 0.2;
    return v;
}

vec3 minecraftSky(vec2 uv) {
    vec3 skyHigh = oklch2rgb(vec3(0.62, 0.1, 4.2));
    vec3 skyLow  = oklch2rgb(vec3(0.72, 0.07, 4.0));
    vec3 sky = mix(skyLow, skyHigh, smoothstep(0.3, 0.9, uv.y));

    // Storm darkening with energy
    float stormDarken = energyNormalized * 0.4;
    vec3 stormSky = oklch2rgb(vec3(0.35, 0.03, 4.3));
    sky = mix(sky, stormSky, stormDarken);

    // Pixelated clouds
    vec2 cloudUV = vec2(uv.x * 2.0 + iTime * 0.015, uv.y * 1.2);
    float cloud = cloudNoise(cloudUV * 3.0);
    float cloudThresh = mix(0.55, 0.4, stormDarken);
    float cloudMask = smoothstep(cloudThresh, cloudThresh + 0.08, cloud);
    cloudMask *= smoothstep(0.35, 0.6, uv.y);
    vec3 cloudCol = mix(vec3(0.95), oklch2rgb(vec3(0.6, 0.01, 4.3)), stormDarken);
    sky = mix(sky, cloudCol, cloudMask * 0.7);

    // Blocky terrain silhouette at bottom
    float aspect = iResolution.x / iResolution.y;
    float terrainX = uv.x * aspect * 4.0;
    float terrainH = 0.0;
    terrainH += floor(hash2(vec2(floor(terrainX), 0.0)) * 4.0) / 20.0;
    terrainH += floor(hash2(vec2(floor(terrainX * 2.0), 100.0)) * 3.0) / 30.0;
    terrainH = terrainH * 0.5 + 0.06;

    if (uv.y < terrainH) {
        float depth = (terrainH - uv.y);
        vec2 blockCoord = vec2(terrainX, uv.y * 20.0);
        vec2 px = floor(blockCoord);
        float n = hash2(px * 47.3);

        if (depth < 0.015) {
            sky = oklch2rgb(vec3(0.50 + n * 0.06, 0.14, 2.4));
        } else {
            sky = oklch2rgb(vec3(0.40 + n * 0.05, 0.07, 1.1));
        }
        vec2 blockFract = fract(blockCoord);
        float terrainGrid = smoothstep(0.0, 0.06, blockFract.x) *
                            smoothstep(0.0, 0.06, blockFract.y);
        sky *= mix(0.6, 1.0, terrainGrid);
    }

    return sky;
}

// ============================================================================
// LIGHTNING FLASH
// ============================================================================

float lightning(float t) {
    float flashSeed = floor(t * 2.0);
    float chance = hash2(vec2(flashSeed, 777.7));
    if (chance > 0.97 - LIGHTNING_BOOST) {
        float flashT = fract(t * 2.0);
        return smoothstep(0.0, 0.02, flashT) * smoothstep(0.08, 0.02, flashT);
    }
    return 0.0;
}

// ============================================================================
// RAIN LAYER — independently falling blocks
// ============================================================================

// For each column, multiple blocks fall independently with unique speeds/phases.
// Returns the color of the block at this pixel, or vec3(0) for sky.
vec3 rainLayer(vec2 uv, float aspect, float layerIdx, float speedMult, float scale, float brightness) {
    float cols = COLUMNS * scale;
    float blockW = 1.0 / cols;
    float blockH = blockW * aspect; // square blocks in screen space

    // Determine column
    float colIdx = floor(uv.x / blockW);
    float colLocalX = fract(uv.x / blockW);

    // Per-column horizontal scatter
    float colScatter = (hash2(vec2(colIdx, layerIdx * 7.1)) - 0.5) * SCATTER;

    // Check each independently falling block in this column
    for (int i = 0; i < BLOCKS_PER_COL; i++) {
        float fi = float(i);
        vec2 blockID = vec2(colIdx + layerIdx * 100.0, fi);

        // Per-block unique properties
        float blockSpeed = FALL_SPEED * speedMult * (0.5 + hash2(blockID) * 1.0);
        float phase = hash2(blockID + 50.0); // start offset (0-1)
        float typeHash = hash2(blockID + 100.0);
        float blockType = floor(typeHash * 5.0);
        float seed = hash2(blockID + 200.0);
        float xJitter = (hash2(blockID + 300.0) - 0.5) * 0.3; // horizontal wiggle within column

        // Block Y position: falls from top (1) to bottom (0), wraps via fract
        float rawY = phase + iTime * blockSpeed;
        float blockCenterY = 1.0 - fract(rawY); // invert so it falls downward

        // Block X center (within column, with jitter)
        float blockCenterX = (colIdx + 0.5 + xJitter + colScatter) * blockW;

        // Block bounds in screen UV
        float bLeft = blockCenterX - blockW * 0.35 * BLOCK_PULSE;
        float bRight = blockCenterX + blockW * 0.35 * BLOCK_PULSE;
        float bBot = blockCenterY - blockH * 0.35 * BLOCK_PULSE;
        float bTop = blockCenterY + blockH * 0.35 * BLOCK_PULSE;

        // Hit test
        if (uv.x < bLeft || uv.x > bRight || uv.y < bBot || uv.y > bTop) continue;

        // Local UV within block (0-1)
        vec2 localUV = vec2(
            (uv.x - bLeft) / max(bRight - bLeft, 0.001),
            (uv.y - bBot) / max(bTop - bBot, 0.001)
        );

        // Wobble rotation
        float wobbleAngle = WOBBLE * sin(iTime * 2.0 + seed * 10.0);
        vec2 wc = localUV - 0.5;
        float ca = cos(wobbleAngle), sa = sin(wobbleAngle);
        localUV = vec2(wc.x * ca - wc.y * sa, wc.x * sa + wc.y * ca) + 0.5;

        if (localUV.x < 0.0 || localUV.x > 1.0 || localUV.y < 0.0 || localUV.y > 1.0) continue;

        // Draw 3D block
        vec3 col = shadeBlock3D(localUV, blockType, seed);

        // Hue drift
        vec3 lch = rgb2oklch(col);
        lch.z += HUE_DRIFT;
        col = oklch2rgb(lch);

        // Depth fog for far layers
        float fogAmount = (1.0 - brightness) * 0.15;
        vec3 fogColor = oklch2rgb(vec3(0.45, 0.04, 4.3));
        col = mix(col, fogColor, fogAmount);

        return col * (0.65 + brightness * 0.35) * TREND_BRIGHT;
    }

    return vec3(0.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    // ---- MINECRAFT SKY BACKGROUND ----
    vec3 col = minecraftSky(uv);

    // ---- THREE DEPTH LAYERS of independently falling blocks ----

    // Far layer: many small slow dim blocks
    vec3 far = rainLayer(uv, aspect, 0.0, 0.3, 1.3, 0.4);

    // Mid layer: medium
    vec3 mid = rainLayer(uv, aspect, 1.0, 0.65, 1.0, 0.65);

    // Near layer: few big fast bright blocks
    vec3 near = rainLayer(uv, aspect, 2.0, 1.0, 0.6, 0.95);

    // Composite (far behind, near on top)
    if (length(far) > 0.01) col = far;
    if (length(mid) > 0.01) col = mid;
    if (length(near) > 0.01) col = near;

    // Beat flash
    col *= BEAT_POP;

    // Edge glow
    col += col * EDGE_GLOW * 0.4;

    // Lightning
    float flash = lightning(iTime);
    col += flash * 0.5;

    // ---- FRAME FEEDBACK ----
    vec2 fbUV = uv;
    fbUV.y -= 0.002; // subtle downward trail
    vec3 prev = getLastFrameColor(clamp(fbUV, 0.0, 1.0)).rgb;

    vec3 colOk = rgb2oklab(col);
    vec3 prevOk = rgb2oklab(prev);
    prevOk.x *= 0.94;
    prevOk.yz *= 0.96;

    vec3 blended = mix(prevOk, colOk, 0.7);
    col = oklab2rgb(blended);

    // ---- VIGNETTE ----
    vec2 vc = uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.3;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
