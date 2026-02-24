// @fullscreen: true
//https://visuals.beadfamous.com/edit?knob_12=0.591&knob_12.min=0&knob_12.max=1&knob_10=0.803&knob_10.min=0&knob_10.max=1&knob_15=0.976&knob_15.min=0&knob_15.max=1&knob_14=0&knob_14.min=0&knob_14.max=1&knob_13=0&knob_13.min=0&knob_13.max=1&knob_11=0.071&knob_11.min=0&knob_11.max=1&knob_6=0.079&knob_6.min=0&knob_6.max=1&knob_5=1&knob_5.min=0&knob_5.max=1&knob_4=0.071&knob_4.min=0&knob_4.max=1&knob_3=0&knob_3.min=0&knob_3.max=1&knob_2=0.039&knob_2.min=0&knob_2.max=1&knob_7=0.843&knob_7.min=0&knob_7.max=1&knob_8=0&knob_8.min=0&knob_8.max=1&knob_1=0.268&knob_1.min=0&knob_1.max=1&knob_9=0.772&knob_9.min=0&knob_9.max=1&knob_16_2=0&knob_16_2.min=0&knob_16_2.max=1&knob_16=0.701&knob_16.min=0&knob_16.max=1&knob_11_2=0&knob_11_2.min=0&knob_11_2.max=1&knob_2_2=0&knob_2_2.min=0&knob_2_2.max=1&knob_2_4=0&knob_2_4.min=0&knob_2_4.max=1&knob_24=0.898&knob_24.min=0&knob_24.max=1&knob_17=0.386&knob_17.min=0&knob_17.max=1&knob_18=0.26&knob_18.min=0&knob_18.max=1&knob_19=0&knob_19.min=0&knob_19.max=1&knob_20=0.843&knob_20.min=0&knob_20.max=1&knob_23=0.016&knob_23.min=0&knob_23.max=1&knob_21=0.126&knob_21.min=0&knob_21.max=1&knob_25=0.701&knob_25.min=0&knob_25.max=1&knob_22=0.394&knob_22.min=0&knob_22.max=1&knob_1_4=0&knob_1_4.min=0&knob_1_4.max=1&knob_1_2=0&knob_1_2.min=0&knob_1_2.max=1&knob_1_5=0.89&knob_1_5.min=0&knob_1_5.max=1&knob_2_5=0.669&knob_2_5.min=0&knob_2_5.max=1&knob_3_2=0&knob_3_2.min=0&knob_3_2.max=1&knob_4_2=0&knob_4_2.min=0&knob_4_2.max=1&knob_5_2=0&knob_5_2.min=0&knob_5_2.max=1&knob_15_2=0&knob_15_2.min=0&knob_15_2.max=1&knob_26=0.252&knob_26.min=0&knob_26.max=1&knob_20_2=0&knob_20_2.min=0&knob_20_2.max=1&knob_8_2=0&knob_8_2.min=0&knob_8_2.max=1&knob_9_2=0&knob_9_2.min=0&knob_9_2.max=1
#define TWO_PI 6.28318530718

uniform float knob_2;
uniform float knob_1_5;
uniform float knob_2_5;

//--------------------------------------------------------------
// ⬆️  put these above mainImage()
//--------------------------------------------------------------
mat2  rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }

#define PAN_X mix(-0.5, 0.5, knob_1_5)
#define PAN_Y mix(-0.5, 0.5, knob_2_5)
// A little spiral‑ish helper to keep the flow alive
float spiralNoise(vec2 p){
    float a = 0.0, f = 2.0;
    for(int i=0;i<3;i++){
        a += abs(sin(p.x*f)+cos(p.y*f))/f;
        p   = rot(0.6)*p + time*0.04;   // slow swirl
        f  *= 1.95;
    }
    return a;
}
// Basic 2D pseudo-fractal (FBM) noise
float simpleNoise(vec2 p) {
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
        vec2 q = domainWarp(p, knob_12*0.35*amp, time*0.03*float(i));
        sum   += amp * fbm(q);
        p     *= 2.0;
        amp   *= 0.55;
    }
    // sprinkle a touch of spiral detail
    sum += 0.25 * spiralNoise(p*4.0);
    return sum;
}

// ─── helpers ────────────────────────────────────────────────
float hash(vec2 p){ return spiralNoise(p) * staticRandom(p); }

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
    float m = knob_22;                        // morph
    return mix( mix(a,b,m), c, knob_27 );     // 2‑stage blend
}



void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalize coordinates
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv += vec2(PAN_X, PAN_Y);
    // Calculate aspect-corrected coordinates, centered and scaled by the shorter dimension
    vec2 p = (2.0 * fragCoord.xy - iResolution.xy) / min(iResolution.x, iResolution.y);

    // Grab last frame for a feedback loop

    vec3 prevRGB = getLastFrameColor(uv).rgb;
    vec3 lastCol = rgb2hsl(prevRGB);
    // Time factor
    float t = time * (0.05 + 0.05 * knob_28); // knob_11 -> overall speed

    // Combine scale from knob_13 and knob_14
    float baseScale = 1.0 + knob_13 * 2.0; // knob_13 -> base scale
    float extraScale = 1.0 + knob_14 * 2.0; // knob_14 -> additional scale
    p *= baseScale;

    // Warp pass #1
    p = domainWarp(p, knob_16 * 0.4, t * 0.1);  // knob_12 -> warp strength

    // Warp pass #2, let knob_1 intensify
    p = domainWarp(p, knob_11 * 0.3, -t * 0.07);

    // Add an extra "wave" distortion with knob_7
    float wave = animateEaseInOutSine(t * 0.1 + knob_7 * 0.3);
    p += wave * knob_7 * 0.3 * vec2(sin(p.y * 2.0), cos(p.x * 2.0));

    // Fractal noise final pattern
    //--------------------------------------------------------------
// 🔄  replace the single “pattern = …” line in mainImage()
//--------------------------------------------------------------
    float base = fbm(p * extraScale + t * 0.2);          // old look
    float f = deepFractal(p * extraScale);           // new depth
// ─── inside mainImage(), replace pattern calc ───────────────
    float pattern = varied(p*mix(1.0,4.0,knob_9)+t*0.2, t);
    pattern = mix(pattern, pattern*pattern, knob_10); // contrast warp

    // Hue shift: slow drift plus knob_15
    float hueShift = t * (0.1 + knob_15 * 0.2);

    // Use knob_2, knob_2, knob_5, knob_8 as extra color offsets
    float cOffset1 = knob_2 * 0.2;
    float cOffset2 = knob_2 * 0.3;
    float cOffset3 = knob_5 * 0.25;
    float cOffset4 = knob_8 * 0.2;
    float totalOffset = cOffset1 + cOffset2 + cOffset3 + cOffset4;

    // Build final HSL color
    float hue = fract(hueShift + pattern * sin(uv.y)/cos(uv.x) + totalOffset + lastCol.z);
    float sat = 0.8 + knob_17 * 0.2; // knob_17 -> saturation
    float lit = 0.4 + pattern * 0.3;

    // Extra color inversion effect if knob_2 is large
    // (Just a fun example – try turning knob_2 up or down)
    if (knob_2 > 0.5) {
        hue = 1.0 - hue;
    }

    // Use knob_2 to shift brightness up/down
    lit += knob_2 * 0.1;
    // Use knob_16 as overall brightness multiplier
    lit *= (1.0 + knob_4 * 1.0);

    // Extra hack: knob_7 can also push saturation for a "pop" effect
    sat += knob_7 * 0.1;

    // Convert HSL -> RGB
    vec3 colorHSL = vec3(hue, clamp(sat, 0.0, 1.0), clamp(lit, 0.0, 1.0));
    vec3 newColor = hsl2rgb(colorHSL);

    // Optionally mix in the initial frame for texture-based effects
    // Let's just do a subtle blend with knob_6 for demonstration
    vec3 initTex = getInitialFrameColor(uv).rgb;
    newColor = mix(newColor, initTex, 0.05 * knob_6);

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
    #define GROUPING_STRENGTH (sin(time) * 0.55)     // Slightly stronger base grouping
    #define HUE_VARIATION (sin(time/1000.) * length(uv))
    #define HUNGER_DRIVE (knob_14)       // How strongly creatures seek luminance (energy)
    #define FEEDING_EFFICIENCY (0.01) // How much saturation increases upon feeding
    #define METABOLISM (knob_18)        // Natural rate of luminance (energy) decay
    #define SATURATION_DECAY (animateEaseInOutExpo(time) * 0.15)    // Natural rate of saturation decay
    #define PHEROMONE_STRENGTH (knob_17)   // Attraction/Repulsion based on avg neighbor hue
    #define BLOB_THRESHOLD (knob_23)    // Luminance threshold below which feeding/strong grouping occurs
    #define ENVIRONMENT_FOOD (knob_19)  // Ambient energy available
    #define HUE_DAMPING (0.75 + knob_20) // Constrained damping factor [0.75, 0.95]
    #define MAX_HUE_CHANGE knob_21 // Limit max hue shift per frame

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

    // 4. Hue Variation
    float currentHueVariation = HUE_VARIATION * (1.0 - hungerFactor * 0.7); // Less variation when hungry
    hueChange +=  currentHueVariation;

    // 5. Clamp and Apply Damped Hue Change
    hueChange = clamp(hueChange, -MAX_HUE_CHANGE, MAX_HUE_CHANGE); // Clamp before damping
    lifeAdjustedHSL.x += hueChange * HUE_DAMPING;
    lifeAdjustedHSL.x = fract(lifeAdjustedHSL.x); // Wrap hue

    // Clamp Saturation and Luminance
    lifeAdjustedHSL.y = clamp(lifeAdjustedHSL.y, 0.0, 1.0);
    lifeAdjustedHSL.z = clamp(lifeAdjustedHSL.z, 0.0, 1.0);

    // Feedback blending with knob_18 (using the life-adjusted color)
    // Lower knob_18 -> stronger feedback from last frame
    float feedbackFactor = clamp(length(uv), 0.0, 1.0);
    vec3 finalHSL = fract(mix(lastCol, lifeAdjustedHSL, feedbackFactor)); // Use life-adjusted color

    // Another small twist: knob_2 can also shift hue a bit in feedback
    finalHSL.x = fract(finalHSL.x + knob_8 * 0.15);

    // Convert final HSL back to RGB
    vec3 finalRGB = hsl2rgb(finalHSL);
    finalRGB = mix(prevRGB, finalRGB, knob_24);
    fragColor = vec4(finalRGB, 1.0);
}
