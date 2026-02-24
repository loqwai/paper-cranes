// @fullscreen: true
#define TWO_PI 6.28318530718

// Basic 2D pseudo-fractal (FBM) noise
float simpleNoise(vec2 p) {
    // Replace with your preferred noise function.
    // This quick sine-based approach is just for illustration.
    return sin(p.x) * cos(p.y);
}

float fbm(vec2 p) {
    float f = 0.0, amp = 0.5;
    for (int i = 0; i < 5; i++) {
        f += amp * simpleNoise(p);
        p *= 2.01;
        amp *= 0.5;
    }
    return f;
}

// Multi-pass domain warp
vec2 domainWarp(vec2 p, float warp, float offset) {
    // Offset helps differentiate multiple warp passes
    float n1 = fbm(p + offset);
    float n2 = fbm(p + 3.14159 + offset);
    return p + warp * vec2(n1, n2);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalize coordinates
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 uvOffset = vec2(knob_10-0.5,knob_11-0.5)/400. + (vec2(random(uv)-0.5, random(uv.yx)-0.5)/1000.);
    // Calculate aspect-corrected coordinates, centered and scaled by the shorter dimension
    vec2 p = (2.0 * fragCoord.xy - iResolution.xy) / min(iResolution.x, iResolution.y);

    // Grab last frame for a feedback loop
    vec3 lastCol = rgb2hsl(getLastFrameColor(uv+uvOffset).rgb);

    // Time factor
    float t = time * (0.05 + 0.05 * knob_13); // knob_13 -> overall speed

    // Combine scale from knob_15 and knob_16
    float baseScale = 1.0 + knob_15 * 2.0; // knob_15 -> base scale
    float extraScale = 1.0 + knob_16 * 2.0; // knob_16 -> additional scale
    p *= baseScale;

    // Warp pass #1
    p = domainWarp(p, knob_14 * 0.4, t * 0.1);  // knob_14 -> warp strength

    // Warp pass #2, let knob_21 intensify
    p = domainWarp(p, knob_21 * 0.3, -t * 0.07);

    // Add an extra "wave" distortion with knob_26
    float wave = animateEaseInOutSine(t * 0.1 + knob_26 * 0.3);
    p += wave * knob_26 * 0.3 * vec2(sin(p.y * 2.0), cos(p.x * 2.0));

    // Fractal noise final pattern
    float pattern = fbm(p * extraScale + t * 0.2);

    // Make pattern more interesting with knob_25
    pattern *= (1.0 + knob_25 * 2.0);

    // Hue shift: slow drift plus knob_17
    float hueShift = t * (0.1 + knob_17 * 0.2);

    // Use knob_22, knob_23, knob_24, knob_27 as extra color offsets
    float cOffset1 = knob_22 * 0.2;
    float cOffset2 = knob_23 * 0.3;
    float cOffset3 = knob_24 * 0.25;
    float cOffset4 = knob_27 * 0.2;
    float totalOffset = cOffset1 + cOffset2 + cOffset3 + cOffset4;

    // Build final HSL color
    float hue = fract(hueShift + pattern * 0.15 + totalOffset);
    float sat = 0.8 + knob_19 * 0.2; // knob_19 -> saturation
    float lit = 0.4 + pattern * 0.3;

    // Extra color inversion effect if knob_23 is large
    // (Just a fun example – try turning knob_23 up or down)
    if (knob_23 > 0.5) {
        hue = 1.0 - hue;
    }

    // Use knob_22 to shift brightness up/down
    lit += knob_22 * 0.1;
    // Use knob_18 as overall brightness multiplier
    lit *= (1.0 + knob_18 * 1.0);

    // Extra hack: knob_26 can also push saturation for a "pop" effect
    sat += knob_26 * 0.1;

    // Convert HSL -> RGB
    vec3 colorHSL = vec3(hue, clamp(sat, 0.0, 1.0), clamp(lit, 0.0, 1.0));
    vec3 newColor = hsl2rgb(colorHSL);

    // Optionally mix in the initial frame for texture-based effects
    // Let's just do a subtle blend with knob_25 for demonstration
    vec3 initTex = getInitialFrameColor(uv).rgb;
    newColor = mix(newColor, initTex, 0.05 * knob_25);

    // --- Artificial Life Simulation ---
    vec2 pixel = 1.0 / iResolution.xy;
    vec3 currentHSL = rgb2hsl(newColor);

    // Sample 4 diagonal neighbors
    vec3 n1_rgb = getLastFrameColor(uv + vec2(-pixel.x, -pixel.y)).rgb;
    vec3 n2_rgb = getLastFrameColor(uv + vec2( pixel.x, -pixel.y)).rgb;
    vec3 n3_rgb = getLastFrameColor(uv + vec2(-pixel.x,  pixel.y)).rgb;
    vec3 n4_rgb = getLastFrameColor(uv + vec2( pixel.x,  pixel.y)).rgb;

    // Convert neighbors to HSL
    vec3 n1_hsl = rgb2hsl(n1_rgb);
    vec3 n2_hsl = rgb2hsl(n2_rgb);
    vec3 n3_hsl = rgb2hsl(n3_rgb);
    vec3 n4_hsl = rgb2hsl(n4_rgb);

    // Calculate average neighbor properties (handle hue wrap-around)
    vec2 avgHueVec = vec2(0.0);
    avgHueVec += vec2(cos(n1_hsl.x * TWO_PI), sin(n1_hsl.x * TWO_PI));
    avgHueVec += vec2(cos(n2_hsl.x * TWO_PI), sin(n2_hsl.x * TWO_PI));
    avgHueVec += vec2(cos(n3_hsl.x * TWO_PI), sin(n3_hsl.x * TWO_PI));
    avgHueVec += vec2(cos(n4_hsl.x * TWO_PI), sin(n4_hsl.x * TWO_PI));
    float avgHue = atan(avgHueVec.y, avgHueVec.x) / TWO_PI;
    if (avgHue < 0.0) avgHue += 1.0;

    float avgSat = (n1_hsl.y + n2_hsl.y + n3_hsl.y + n4_hsl.y) / 4.0;
    float avgLum = (n1_hsl.z + n2_hsl.z + n3_hsl.z + n4_hsl.z) / 4.0;

    // --- Define Animal-like Behaviors using Knobs 3-11 ---
    #define GROUPING_STRENGTH (knob_1 * 0.55)     // Slightly stronger base grouping
    #define HUE_VARIATION (knob_2 * 0.015)     // Further reduced base random hue shifts
    #define HUNGER_DRIVE (knob_3 * 0.1)       // How strongly creatures seek luminance (energy)
    #define FEEDING_EFFICIENCY (knob_4 * 0.2) // How much saturation increases upon feeding
    #define METABOLISM (knob_5 * 0.02)        // Natural rate of luminance (energy) decay
    #define SATURATION_DECAY (knob_6 * 0.015)    // Natural rate of saturation decay
    #define PHEROMONE_STRENGTH (knob_7 * 0.2)   // Attraction/Repulsion based on avg neighbor hue
    #define BLOB_THRESHOLD (knob_8 * 0.5)    // Luminance threshold below which feeding/strong grouping occurs
    #define ENVIRONMENT_FOOD (knob_9 * 0.1)  // Ambient energy available
    #define HUE_DAMPING (0.75 + knob_12 * 0.20) // Constrained damping factor [0.75, 0.95]
    #define MAX_HUE_CHANGE 0.08 // Limit max hue shift per frame

    // --- Apply Behaviors to currentHSL ---
    vec3 lifeAdjustedHSL = currentHSL;
    vec3 originalHSL = currentHSL; // Store original HSL for damping

    // 1. Metabolism & Decay
    lifeAdjustedHSL.z -= METABOLISM;
    lifeAdjustedHSL.y -= SATURATION_DECAY;

    // 2. Hunger & Feeding
    float hungerFactor = smoothstep(BLOB_THRESHOLD + 0.1, BLOB_THRESHOLD - 0.1, lifeAdjustedHSL.z); // More hunger when below threshold
    float energyGain = hungerFactor * HUNGER_DRIVE * (avgLum + ENVIRONMENT_FOOD - lifeAdjustedHSL.z);
    lifeAdjustedHSL.z += max(0.0, energyGain); // Feed: increase luminance toward avg neighbor + environment
    lifeAdjustedHSL.y += max(0.0, energyGain * FEEDING_EFFICIENCY); // Increase saturation when feeding

    // 3. Grouping / Flocking / Tribal Behavior
    float totalAttraction = 1e-5; // Avoid divide by zero
    vec2 targetHueVec = vec2(0.0);
    float currentHueRad = lifeAdjustedHSL.x * TWO_PI;

    // Calculate attraction to each neighbor based on hue similarity
    vec3 neighbors_hsl[4] = vec3[4](n1_hsl, n2_hsl, n3_hsl, n4_hsl);
    for(int i = 0; i < 4; i++) {
        float neighborHueRad = neighbors_hsl[i].x * TWO_PI;
        float hueDiffRad = neighborHueRad - currentHueRad;
        // Correct wrap-around for distance calculation
        hueDiffRad = atan(sin(hueDiffRad), cos(hueDiffRad));

        // Attraction falls off sharply with difference, controlled by PHEROMONE_STRENGTH
        // Higher PHEROMONE_STRENGTH means stronger preference for *very* similar hues
        float attraction = exp(-pow(abs(hueDiffRad) * (1.0 + PHEROMONE_STRENGTH * 5.0), 2.0));

        // Add neighbor's hue vector weighted by attraction
        targetHueVec += vec2(cos(neighborHueRad), sin(neighborHueRad)) * attraction;
        totalAttraction += attraction;
    }

    // Calculate the target hue based on weighted neighbor average
    float targetHue = atan(targetHueVec.y, targetHueVec.x) / TWO_PI;
    if (targetHue < 0.0) targetHue += 1.0;

    // Calculate difference towards the *tribal* target hue
    float tribalHueDiff = targetHue - lifeAdjustedHSL.x;
    if (abs(tribalHueDiff) > 0.5) tribalHueDiff -= sign(tribalHueDiff); // shortest path

    // Stronger alignment pull when hungry/below threshold
    float currentGrouping = GROUPING_STRENGTH + hungerFactor * 0.3; // Group tighter when hungry
    float hueChange = currentGrouping * tribalHueDiff; // Pull towards tribal hue

    // 4. Hue Variation / Randomness (Reduced when hungry)
    float currentHueVariation = HUE_VARIATION * (1.0 - hungerFactor * 0.7); // Less variation when hungry
    hueChange += (random(uv + time) - 0.5) * currentHueVariation;

    // 5. Clamp and Apply Damped Hue Change
    hueChange = clamp(hueChange, -MAX_HUE_CHANGE, MAX_HUE_CHANGE); // Clamp before damping
    lifeAdjustedHSL.x += hueChange * HUE_DAMPING;
    lifeAdjustedHSL.x = fract(lifeAdjustedHSL.x); // Wrap hue

    // Clamp Saturation and Luminance
    lifeAdjustedHSL.y = clamp(lifeAdjustedHSL.y, 0.0, 1.0);
    lifeAdjustedHSL.z = clamp(lifeAdjustedHSL.z, 0.0, 1.0);

    // Feedback blending with knob_20 (using the life-adjusted color)
    // Lower knob_20 -> stronger feedback from last frame
    float feedbackFactor = clamp(1.0 - knob_20, 0.0, 1.0);
    vec3 finalHSL = mix(lastCol, lifeAdjustedHSL, feedbackFactor); // Use life-adjusted color

    // Another small twist: knob_22 can also shift hue a bit in feedback
    finalHSL.x = fract(finalHSL.x + knob_22 * 0.05);

    // Convert final HSL back to RGB
    vec3 finalRGB = hsl2rgb(finalHSL);
    fragColor = vec4(finalRGB, 1.0);
}
