// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, voronoi, crystal
// ChromaDepth Voronoi Crystal Cavern
// Multi-layer Voronoi cells create crystal depth: large cells = red/near, small = blue/far
// Glowing cell edges with sparkle, audio-reactive heights and animation
// ChromaDepth: Red = closest, Green = mid, Blue/Violet = farthest, Black = neutral

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================

// Cell height pulsing from bass
#define BASS_PULSE (bassZScore * 0.3)
// #define BASS_PULSE 0.0

// Edge brightness from energy
#define EDGE_BRIGHTNESS (1.0 + energyZScore * 0.4)
// #define EDGE_BRIGHTNESS 1.0

// Cell animation speed from spectral centroid
#define ANIM_SPEED (1.0 + spectralCentroidZScore * 0.3)
// #define ANIM_SPEED 1.0

// Sparkle on edges from treble
#define TREBLE_SPARKLE (max(trebleZScore, 0.0) * 0.6)
// #define TREBLE_SPARKLE 0.0

// Beat ripple trigger
#define BEAT_RIPPLE (beat ? 1.0 : 0.0)
// #define BEAT_RIPPLE 0.0

// Pitch class modulates cell seed drift
#define PITCH_DRIFT (pitchClassNormalized * 0.4)
// #define PITCH_DRIFT 0.0

// Energy level for overall brightness
#define ENERGY_LEVEL (energyNormalized)
// #define ENERGY_LEVEL 0.5

// Spectral flux for edge shimmer
#define FLUX_SHIMMER (spectralFluxZScore * 0.2)
// #define FLUX_SHIMMER 0.0

// Mids for mid-layer modulation
#define MIDS_MOD (midsZScore * 0.15)
// #define MIDS_MOD 0.0

// Spectral entropy for cell distortion
#define ENTROPY_WARP (spectralEntropyNormalized * 0.12)
// #define ENTROPY_WARP 0.0

// Roughness for edge thickness
#define ROUGHNESS_EDGE (spectralRoughnessNormalized)
// #define ROUGHNESS_EDGE 0.5

// Bass slope for trend-aware morphing
#define BASS_TREND (bassSlope * 10.0 * bassRSquared)
// #define BASS_TREND 0.0

// Energy slope for build detection
#define ENERGY_TREND (energySlope * 15.0 * energyRSquared)
// #define ENERGY_TREND 0.0

// Feedback strength
#define FB_AMOUNT 0.15

// ============================================================================
// CHROMADEPTH: full spectrum red -> violet via smooth HSL
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float sat = 0.95 - t * 0.1;
    float lit = 0.55 - t * 0.12;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// HASH FUNCTIONS for Voronoi
// ============================================================================

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

float hash1(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// ============================================================================
// VORONOI with cell ID and edge distance
// Returns: x = min dist to cell center, y = edge dist, z = cell height hash
// cellID is output via the last parameter
// ============================================================================

vec4 voronoi(vec2 p, float timeScale, float seedOffset, out vec2 cellID) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);

    float minDist = 8.0;
    float secondDist = 8.0;
    vec2 bestCell = vec2(0.0);
    float bestHeight = 0.0;

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 neighbor = vec2(float(i), float(j));
            vec2 cell = ip + neighbor;

            // Animated cell center with pitch drift
            vec2 h = hash2(cell + seedOffset);
            vec2 animOffset = vec2(
                sin(iTime * timeScale * (h.x * 0.5 + 0.5) + h.y * 6.28),
                cos(iTime * timeScale * (h.y * 0.5 + 0.5) + h.x * 6.28)
            ) * 0.3;

            vec2 cellPoint = neighbor + h + animOffset - fp;
            float d = dot(cellPoint, cellPoint);

            if (d < minDist) {
                secondDist = minDist;
                minDist = d;
                bestCell = cell;
                bestHeight = hash1(cell + seedOffset * 3.7);
            } else if (d < secondDist) {
                secondDist = d;
            }
        }
    }

    cellID = bestCell;
    float dist = sqrt(minDist);
    float edge = sqrt(secondDist) - dist;
    return vec4(dist, edge, bestHeight, 0.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    float t = iTime * 0.08 * ANIM_SPEED;

    // Slow global rotation
    float angle = t * 0.3;
    float ca = cos(angle), sa = sin(angle);
    uv = mat2(ca, -sa, sa, ca) * uv;

    // Slight entropy-based warping
    uv += vec2(sin(uv.y * 4.0 + t) * ENTROPY_WARP,
               cos(uv.x * 4.0 + t * 1.3) * ENTROPY_WARP);

    // ========================================================================
    // THREE VORONOI LAYERS at different scales = depth
    // ========================================================================

    // Layer 1: LARGE cells = foreground (red, depth ~0.0-0.25)
    vec2 cellID1;
    float scale1 = 2.5;
    vec4 v1 = voronoi(uv * scale1, ANIM_SPEED * 0.3, PITCH_DRIFT, cellID1);
    float height1 = v1.z + BASS_PULSE * 0.5;
    float edge1 = v1.y;

    // Layer 2: MEDIUM cells = middle (green, depth ~0.3-0.55)
    vec2 cellID2;
    float scale2 = 5.0;
    vec4 v2 = voronoi(uv * scale2 + vec2(t * 0.2, t * 0.15), ANIM_SPEED * 0.5, PITCH_DRIFT + 1.0, cellID2);
    float height2 = v2.z + MIDS_MOD;
    float edge2 = v2.y;

    // Layer 3: TINY cells = background (blue/violet, depth ~0.6-1.0)
    vec2 cellID3;
    float scale3 = 10.0;
    vec4 v3 = voronoi(uv * scale3 + vec2(-t * 0.1, t * 0.25), ANIM_SPEED * 0.7, PITCH_DRIFT + 2.0, cellID3);
    float height3 = v3.z;
    float edge3 = v3.y;

    // ========================================================================
    // DEPTH MAPPING: combine layers
    // ========================================================================

    // Each layer contributes to depth based on its scale
    // Large cells dominate near (red), small cells dominate far (blue)
    float depth1 = height1 * 0.25;                          // 0.0 - 0.25 range
    float depth2 = 0.3 + height2 * 0.25 + MIDS_MOD * 0.1;  // 0.3 - 0.55 range
    float depth3 = 0.6 + height3 * 0.4;                     // 0.6 - 1.0 range

    // Blend layers: closer layers occlude farther ones based on cell height
    // Higher cells in foreground = more red, lower = reveals green/blue behind
    float layer1Strength = smoothstep(0.3, 0.7, height1 + BASS_PULSE * 0.3);
    float layer2Strength = smoothstep(0.25, 0.65, height2) * (1.0 - layer1Strength * 0.6);
    float layer3Strength = (1.0 - layer1Strength * 0.5) * (1.0 - layer2Strength * 0.4);

    // Weighted depth
    float totalWeight = layer1Strength + layer2Strength + layer3Strength + 0.001;
    float depth = (depth1 * layer1Strength + depth2 * layer2Strength + depth3 * layer3Strength) / totalWeight;

    // Bass trend pushes everything closer (more red) on rising bass
    depth -= clamp(BASS_TREND, -0.15, 0.15);
    // Energy build shifts toward foreground
    depth -= clamp(ENERGY_TREND, -0.1, 0.1) * 0.5;

    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // BEAT RIPPLE: radial wave on beat
    // ========================================================================

    float ripple = 0.0;
    if (BEAT_RIPPLE > 0.5) {
        float beatPhase = fract(iTime * 2.0);
        float rippleRing = abs(length(uv) - beatPhase * 1.5);
        ripple = smoothstep(0.15, 0.0, rippleRing) * (1.0 - beatPhase);
        // Ripple pushes depth toward red briefly
        depth = mix(depth, 0.0, ripple * 0.3);
    }

    // ========================================================================
    // CHROMADEPTH COLOR
    // ========================================================================

    vec3 col = chromadepth(depth);

    // ========================================================================
    // EDGE GLOW: bright edges on cell boundaries
    // ========================================================================

    // Edge thickness varies with roughness
    float edgeThreshold = 0.08 + ROUGHNESS_EDGE * 0.06;

    // Combine edges from all layers with different weights
    float edgeGlow1 = smoothstep(edgeThreshold, 0.0, edge1) * layer1Strength;
    float edgeGlow2 = smoothstep(edgeThreshold * 0.7, 0.0, edge2) * layer2Strength;
    float edgeGlow3 = smoothstep(edgeThreshold * 0.5, 0.0, edge3) * layer3Strength * 0.6;

    float totalEdge = edgeGlow1 + edgeGlow2 + edgeGlow3;
    totalEdge = clamp(totalEdge, 0.0, 1.0);

    // Edge color: bright white-yellow glow, intensity from energy
    vec3 edgeColor = vec3(1.0, 0.95, 0.8) * EDGE_BRIGHTNESS;
    col = mix(col, edgeColor, totalEdge * 0.7);

    // ========================================================================
    // SPARKLE: treble-driven sparkle on edges
    // ========================================================================

    float sparkleHash = hash1(cellID1 * 17.3 + floor(iTime * 8.0));
    float sparkle = step(0.85, sparkleHash) * TREBLE_SPARKLE * totalEdge;
    col += sparkle * vec3(1.0, 1.0, 0.9);

    // Additional sparkle from flux on layer 2 edges
    float sparkleHash2 = hash1(cellID2 * 23.1 + floor(iTime * 12.0));
    float sparkle2 = step(0.88, sparkleHash2) * max(FLUX_SHIMMER, 0.0) * edgeGlow2;
    col += sparkle2 * vec3(0.9, 1.0, 1.0);

    // ========================================================================
    // CELL INTERIOR SHADING: crystal facet look
    // ========================================================================

    // Within each cell, use distance to center for a faceted gradient
    float facet1 = smoothstep(0.0, 0.5, v1.x) * layer1Strength;
    float facet2 = smoothstep(0.0, 0.4, v2.x) * layer2Strength;
    float facet3 = smoothstep(0.0, 0.3, v3.x) * layer3Strength;

    float facetDarken = 1.0 - (facet1 + facet2 + facet3) * 0.15;
    col *= max(facetDarken, 0.5);

    // ========================================================================
    // BRIGHTNESS MODULATION
    // ========================================================================

    col *= 0.85 + ENERGY_LEVEL * 0.3;
    col *= 1.0 + ripple * 0.4;

    // ========================================================================
    // FRAME FEEDBACK: gentle trails
    // ========================================================================

    // Slight UV offset for feedback motion
    vec2 fbOffset = vec2(
        sin(iTime * 0.3) * 0.003,
        cos(iTime * 0.4) * 0.003
    );
    vec2 fbUV = clamp(screenUV + fbOffset, 0.0, 1.0);
    vec3 prev = getLastFrameColor(fbUV).rgb;

    // Decay previous frame
    prev *= 0.96;

    // Blend: current frame dominates
    float fbMix = FB_AMOUNT;
    fbMix += BEAT_RIPPLE * 0.05;
    fbMix = clamp(fbMix, 0.05, 0.3);
    col = mix(prev, col, 1.0 - fbMix);

    // Prevent feedback accumulation: if prev is brighter than current, reduce it
    float prevLum = dot(prev, vec3(0.299, 0.587, 0.114));
    float curLum = dot(col, vec3(0.299, 0.587, 0.114));
    if (prevLum > curLum * 1.5 + 0.1) {
        col = mix(col, col * 0.95, 0.3);
    }

    // ========================================================================
    // VIGNETTE
    // ========================================================================

    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
