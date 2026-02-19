// @fullscreen: true
// @favorite: true
// @tags: fractal, julia, seeded, psychedelic

// Seeded variant of moody-octopus — each device gets a unique visual identity
// via seed, seed2, seed3, seed4 uniforms (stable random 0-1 per device)
// All color work done in oklch for perceptually uniform hue rotation and mixing

float getWhiteAmount(vec2 uv, vec2 pixelSize) {
    vec3 center = getLastFrameColor(uv).rgb;
    vec3 left = getLastFrameColor(uv - vec2(pixelSize.x, 0.0)).rgb;
    vec3 right = getLastFrameColor(uv + vec2(pixelSize.x, 0.0)).rgb;
    vec3 up = getLastFrameColor(uv + vec2(0.0, pixelSize.y)).rgb;
    vec3 down = getLastFrameColor(uv - vec2(0.0, pixelSize.y)).rgb;

    float centerWhite = dot(center, vec3(1.0)) / 3.0;
    float leftWhite = dot(left, vec3(1.0)) / 3.0;
    float rightWhite = dot(right, vec3(1.0)) / 3.0;
    float upWhite = dot(up, vec3(1.0)) / 3.0;
    float downWhite = dot(down, vec3(1.0)) / 3.0;

    float threshold = 0.95;
    float smoothness = 0.1;

    return (smoothstep(threshold - smoothness, threshold, centerWhite)
          + smoothstep(threshold - smoothness, threshold, leftWhite)
          + smoothstep(threshold - smoothness, threshold, rightWhite)
          + smoothstep(threshold - smoothness, threshold, upWhite)
          + smoothstep(threshold - smoothness, threshold, downWhite)) / 5.0;
}

// Julia set distortion — seed controls orbit angle, seed2 controls radius & character
vec2 julia(vec2 uv, float t) {
    // seed: full rotation of Julia constant angle — different fractal families
    float baseAngle = seed * 6.2831853;
    // seed2: radius from 0.5 to 0.85 — dramatically changes fractal topology
    // 0.5 = sparse/dusty, 0.65 = dendrites, 0.75 = spirals, 0.85 = connected
    float radius = 0.5 + seed2 * 0.35;
    float cRe = sin(t + baseAngle) * radius + (spectralSkewNormalized / 10.0);
    float cIm = cos(t + baseAngle) * radius + (spectralRolloffNormalized / 10.0);

    for (int i = 0; i < 64; i++) {
        float x = uv.x * uv.x - uv.y * uv.y + cRe;
        float y = 2.0 * uv.x * uv.y + cIm;
        uv = vec2(x, y);
        if (dot(uv, uv) > 4.0) break;
    }

    return uv;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float t = time / 10.0;

    vec2 pixelSize = 1.0 / iResolution.xy;
    float whiteAmount = getWhiteAmount(fragCoord.xy / iResolution.xy, pixelSize);

    // seed2 controls zoom level — 0.7x to 1.5x, changes how much fractal detail you see
    float zoomBase = 0.7 + seed2 * 0.8;
    vec2 scaledUv = uv * (zoomBase + spectralCentroidZScore * 0.5);
    scaledUv += vec2(sin(t * 3.0) * spectralSpreadZScore * 0.2,
                    cos(t * 3.0) * spectralKurtosisZScore * 0.2);

    vec3 fillColor = getLastFrameColor(scaledUv).rgb;

    // Modify fill color in oklch
    vec3 fillLch = rgb2oklch(fillColor);
    fillLch.z += seed4 * 6.2831853 + spectralCentroidZScore * 0.3;
    fillLch.y = clamp(fillLch.y * (0.8 + spectralFluxZScore * 0.4), 0.0, 0.15);
    fillLch.x = clamp(fillLch.x * (0.7 + spectralCrestZScore * 0.3), 0.05, 0.95);
    vec3 fillColorFinal = clamp(oklch2rgb(fillLch), 0.0, 1.0);

    // Seed-shifted UV drift before Julia
    float driftAngle = seed * 3.14159;
    uv += vec2(spectralSpreadMedian, spectralSpreadMedian) / 100.0;
    uv += vec2(sin(t * 2.0 + driftAngle) * (spectralCentroidZScore) / 100.0,
               cos(t * 2.0 + driftAngle) * (trebleZScore) / 100.0);

    // seed2 also pre-scales UV — changes fractal zoom level
    uv *= zoomBase;

    // Apply Julia set — fractal structure
    uv = julia(uv, t);

    // Sample previous frame for feedback
    vec3 prevColor = getLastFrameColor(uv).rgb;

    // === SEED-BASED COLOR PALETTE ===
    // Build 3 palette colors in oklch from seeds, then index into them with fractal position
    // seed3 = base hue, seed4 = hue spread & lightness character

    float hue1 = seed3 * 6.2831853;                          // primary hue
    float hueSpread = 0.8 + seed4 * 2.5;                     // how far apart the palette colors are
    float hue2 = hue1 + hueSpread;                            // secondary hue
    float hue3 = hue1 + hueSpread * 0.5;                     // tertiary (between)

    // seed4 shifts lightness character — floor is bright enough for mobile screens
    float lBase = 0.55 + seed4 * 0.2;                        // 0.55-0.75 base lightness
    float cBase = 0.1 + seed3 * 0.08;                        // 0.10-0.18 base chroma

    vec3 pal1 = vec3(lBase,        cBase,        hue1);
    vec3 pal2 = vec3(lBase + 0.15, cBase + 0.04, hue2);
    vec3 pal3 = vec3(lBase - 0.1,  cBase + 0.02, hue3);

    // Use fractal-distorted UV to index into palette
    float sinX = sin(uv.x);
    float sinY = sin(uv.y);
    float palIdx = fract(sinX * 0.5 + 0.5);  // 0-1 palette position

    // Smoothly blend between 3 palette colors based on fractal position
    vec3 lch;
    if (palIdx < 0.5) {
        lch = mix(pal1, pal2, palIdx * 2.0);
    } else {
        lch = mix(pal2, pal3, (palIdx - 0.5) * 2.0);
    }

    // sinY modulates lightness for depth
    lch.x += sinY * 0.15;

    // Audio-reactive palette modulation
    lch.z += spectralCentroidZScore * 0.3;
    lch.y += spectralFluxZScore * 0.03;
    lch.x += spectralCrestZScore * 0.08 - bassNormalized * 0.1;

    lch.x = clamp(lch.x, 0.25, 0.92);
    lch.y = clamp(lch.y, 0.02, 0.18);

    vec3 color = clamp(oklch2rgb(lch), 0.0, 1.0);

    // Ripple overlay — seed3 controls frequency
    float rippleFreq = 6.0 + seed3 * 4.0;
    vec2 rippleUv = uv * vec2(max(bassZScore, 0.3));
    if (beat) rippleUv *= 2.1;
    float distanceToCenter = length(rippleUv);
    float ripple = sin(distanceToCenter * rippleFreq - t * 1.5) * 0.15 + 0.85;
    color *= ripple;

    // Blend with previous frame in oklab for smooth feedback
    color = oklabmix(prevColor, color, 0.7);

    // Mix with fill color in white areas
    color = oklabmix(color, fillColorFinal, whiteAmount);

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
