// @fullscreen: true
#define TWO_PI 6.28318530718
//--------------------------------------------------------------
// ⬆️  put these above mainImage()
//--------------------------------------------------------------
mat2  rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
//https://visuals.beadfamous.com/edit?knob_72=0.97&knob_72.min=0&knob_72.max=1&knob_73=0.25&knob_73.min=0&knob_73.max=1&knob_75=0&knob_75.min=0&knob_75.max=1&knob_76=0.92&knob_76.min=0&knob_76.max=1&knob_71=0&knob_71.min=0&knob_71.max=1&knob_74=0.87&knob_74.min=0&knob_74.max=1&knob_77=1&knob_77.min=0&knob_77.max=1&knob_79=0.76&knob_79.min=0&knob_79.max=1&knob_78=1&knob_78.min=0&knob_78.max=1
// A little spiral‑ish helper to keep the flow alive
float spiralNoise(vec2 p){
    float a = 0.0, f = 2.0;
    for(int i=0;i<10;i++){
        a += abs(sin(p.x*f)+cos(p.y*f))/f;
        p   = rot(0.6)*p + time*0.04;   // slow swirl
        f  *= 1.95;
    }
    return a;
}
// Basic 2D pseudo-fractal (FBM) noise
float simpleNoise(vec2 p) {
    // Replace with your preferred noise function.
    // This quick sine-based approach is just for illustration.
    float offsetMagnitude = 1./1000.;
    vec2 offset = vec2((random(p)/offsetMagnitude) - offsetMagnitude/2.) ;
    return spiralNoise(p);
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
    float n1 = fbm(p - offset);
    float n2 = fbm(p + 3.14159 - offset);
    return p + warp * vec2(n1, n2);
}




// Multi‑layer, nested‑warp FBM  → feels “fractal‑deep”
float deepFractal(vec2 p){
    float amp = 0.5, sum = 0.0;
    for(int i=0;i<4;i++){
        vec2 q = domainWarp(p, knob_11*0.35*amp, time*0.03*float(i));
        sum   += amp * fbm(q);
        p     *= 2.0;
        amp   *= 0.55;
    }
    // sprinkle a touch of spiral detail
    sum += 0.25 * spiralNoise(p*4.0);
    return sum;
}

// ─── helpers ────────────────────────────────────────────────
float hash(vec2 p){ return staticRandom(p); }

// cheap Voronoi-ish cell distance
float cell(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float d=1.0;
    for(int y=-1;y<=1;y++)
    for(int x=-1;x<=1;x++){
        vec2 g=vec2(x,y);
        vec2 o=vec2(hash(i+g), hash(i-g));
        d=min(d,length(f-g-o));
    }
    return d;
}

// rotational kaleidoscope
vec2 kaleido(vec2 p,float seg){
    float a=atan(p.y,p.x)+TWO_PI/seg*0.5;
    float r=length(p);
    a=mod(a,TWO_PI/seg)-TWO_PI/seg*0.5;
    return vec2(cos(a),sin(a))*r;
}

// master pattern: smoothly blends 3 generators
float varied(vec2 p,float t){
    float k = mix(3.0,12.0,animateEaseInOutSine(t/10000.));          // symmetry slices
    vec2 q  = kaleido(p,k);
    float a = deepFractal(q*1.2);
    float b = cell(q*4.0+vec2(t*0.1,0.0));
    float c = sin(q.x*8.0+t)+cos(q.y*8.0-t);
    float m = knob_21;                        // morph
    return mix( mix(a,b,m), c, knob_71 );     // 2‑stage blend
}



void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalize coordinates
    vec2 uv = fragCoord.xy / iResolution.xy;
    // Calculate aspect-corrected coordinates, centered and scaled by the shorter dimension
    vec2 p = (2.0 * fragCoord.xy - iResolution.xy) / min(iResolution.x, iResolution.y);

    // Grab last frame for a feedback loop

    vec3 prevRGB = getLastFrameColor(uv).rgb;
    vec3 lastCol = rgb2hsl(prevRGB);
    lastCol.z = clamp(lastCol.z + (knob_79-0.5), 0., 1.);
    lastCol.y = lastCol.y > 0.8 ? lastCol.y : lastCol.y + (lastCol.z - 0.5);
    // Time factor
    float t = time * (0.05 + 0.05 * knob_72); // knob_10 -> overall speed

    // Combine scale from knob_12 and knob_13
    float baseScale = 1.0 + knob_12 * 2.0; // knob_12 -> base scale
    float extraScale = 1.0 + knob_13 * 2.0; // knob_13 -> additional scale
    p *= baseScale;

    // Warp pass #1
    p = domainWarp(p, knob_73 * length(prevRGB), t * 0.1);  // knob_11 -> warp strength

    // Warp pass #2, let knob_0 intensify
    p = domainWarp(p, knob_10 * 0.3, -t * 0.07);

    // Add an extra "wave" distortion with knob_6
    float wave = animateEaseInOutSine(t * 0.1 + knob_6 * 0.3);
    p += wave * knob_6 * 0.3 * vec2(sin(p.y * 2.0), cos(p.x * 2.0));

    // Fractal noise final pattern
    //--------------------------------------------------------------
// 🔄  replace the single “pattern = …” line in mainImage()
//--------------------------------------------------------------
    float base = fbm(p * extraScale + t * 0.2);          // old look
    float f = deepFractal(p * extraScale);           // new depth
// ─── inside mainImage(), replace pattern calc ───────────────
    float pattern = varied(p*mix(1.0,4.0,knob_16)+t*0.2, t);
    pattern = mix(pattern, pattern*pattern, knob_60); // contrast warp

    // Hue shift: slow drift plus knob_14
    float hueShift = t * (0.1 + knob_14 * 0.2);

    // Use knob_1, knob_1, knob_4, knob_7 as extra color offsets
    float cOffset1 = knob_1 * 0.2;
    float cOffset2 = knob_1 * 0.3;
    float cOffset3 = knob_4 * 0.25;
    float cOffset4 = knob_7 * 0.2;
    float totalOffset = cOffset1 + cOffset2 + cOffset3 + cOffset4;

    // Build final HSL color
    float hue = fract(hueShift + pattern * sin(uv.y)/cos(uv.x) + totalOffset + lastCol.z);
    float sat = 0.8 + knob_16 * 0.2; // knob_16 -> saturation
    float lit = 0.4 + pattern * 0.3;

    // Extra color inversion effect if knob_1 is large
    // (Just a fun example – try turning knob_1 up or down)
    if (knob_1 > 0.5) {
        hue = 1.0 - hue;
    }

    // Use knob_1 to shift brightness up/down
    lit += knob_1 * 0.1;
    // Use knob_15 as overall brightness multiplier
    lit *= (1.0 + knob_15 * 1.0);

    // Extra hack: knob_6 can also push saturation for a "pop" effect
    sat += knob_6 * 0.1;

    // Convert HSL -> RGB
    vec3 colorHSL = vec3(hue, clamp(sat, 0.0, 1.0), clamp(lit, 0.0, 1.0));
    vec3 newColor = hsl2rgb(colorHSL);

    // Optionally mix in the initial frame for texture-based effects
    // Let's just do a subtle blend with knob_5 for demonstration
    vec3 initTex = getInitialFrameColor(uv).rgb;
    newColor = mix(newColor, initTex, 0.05 * knob_5);

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
    avgHue = animateBounce(avgHue);

    float avgSat = (n1_hsl.y + n2_hsl.y + n3_hsl.y + n4_hsl.y) / 4.0;
    float avgLum = (n1_hsl.z + n2_hsl.z + n3_hsl.z + n4_hsl.z) / 4.0;

    // --- Define Animal-like Behaviors using Knobs 3-11 ---
    #define GROUPING_STRENGTH (sin(time) * 0.55)     // Slightly stronger base grouping
    #define HUE_VARIATION (sin(time/1000.) * length(uv))     // Further reduced base random hue shifts
    #define HUNGER_DRIVE (0.01)       // How strongly creatures seek luminance (energy)
    #define FEEDING_EFFICIENCY (knob_76) // How much saturation increases upon feeding
    #define METABOLISM (animateBounce(time/100. + length(centerUv(uv))) * 0.2 *length(vec2(lastCol.x, uv.x)))        // Natural rate of luminance (energy) decay
    #define SATURATION_DECAY (animateEaseInOutExpo(time) * 0.15)    // Natural rate of saturation decay
    #define PHEROMONE_STRENGTH (knob_75)   // Attraction/Repulsion based on avg neighbor hue
    #define BLOB_THRESHOLD (knob_76 * 0.5)    // Luminance threshold below which feeding/strong grouping occurs
    #define ENVIRONMENT_FOOD (knob_71 * 0.1)  // Ambient energy available
    #define HUE_DAMPING (0.75 + knob_77 * 0.20) // Constrained damping factor [0.75, 0.95]
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

    // Feedback blending with knob_17 (using the life-adjusted color)
    // Lower knob_17 -> stronger feedback from last frame
    float feedbackFactor = clamp(length(uv), 0.0, 1.0);
    vec3 finalHSL = fract(mix(lastCol, lifeAdjustedHSL, feedbackFactor)); // Use life-adjusted color

    // Another small twist: knob_1 can also shift hue a bit in feedback
    finalHSL.x = fract(finalHSL.x + knob_71 * 0.05);
    while(finalHSL.z > 0.5) {
        finalHSL.x = mix(finalHSL.x, 0., finalHSL.z);
        finalHSL.z = finalHSL.z - 0.09;
        finalHSL.y = mix(finalHSL.y, 0.8, 0.5);
    }
    // Convert final HSL back to RGB
    vec3 finalRGB = hsl2rgb(finalHSL);
    finalRGB = mix(prevRGB, finalRGB, mix(0.02, 0.03, animateBounce(time)));
    fragColor = vec4(finalRGB, 1.0);
}

