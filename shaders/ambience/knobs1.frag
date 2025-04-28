// https://visuals.beadfamous.com/edit?knob_1=0.26&knob_1.min=0&knob_1.max=1&knob_0=0.504&knob_0.min=0&knob_0.max=1&knob_2=0.52&knob_2.min=0&knob_2.max=1&knob_3=0.669&knob_3.min=0&knob_3.max=1&knob_4=1&knob_4.min=0&knob_4.max=1&knob_5=0.433&knob_5.min=0&knob_5.max=1&knob_6=0.402&knob_6.min=0&knob_6.max=1&knob_7=1&knob_7.min=0&knob_7.max=1&knob_8=0&knob_8.min=0&knob_8.max=1&knob_9=0.984&knob_9.min=0&knob_9.max=1&knob_10=0.252&knob_10.min=0&knob_10.max=1&knob_11=0&knob_11.min=0&knob_11.max=1&knob_15=0.669&knob_15.min=0&knob_15.max=1&knob_14=0.992&knob_14.min=0&knob_14.max=1&knob_13=0.433&knob_13.min=0&knob_13.max=1&knob_12=0.315&knob_12.min=0&knob_12.max=1
// --- Constants & Helpers ---
#define TWO_PI 6.28318530718

mat2 rot(float a){
    return mat2(cos(a), -sin(a),
                sin(a),  cos(a));
}

float spiralNoise(vec2 p){
    float a = 0.0, f = 2.0;
    for(int i = 0; i < 10; i++){
        a += abs(sin(p.x * f) + cos(p.y * f)) / f;
        p = rot(0.6) * p + time * 0.04;
        f *= 1.95;
    }
    return a;
}

float simpleNoise(vec2 p) {
    float offsetMagnitude = 1.0 / 1000.0;
    vec2 offset = vec2((random(p) / offsetMagnitude) - offsetMagnitude * 0.5);
    return spiralNoise(p);
}

float fbm(vec2 p) {
    float f = 0.0, amp = 0.5;
    for(int i = 0; i < 5; i++){
        f += amp * simpleNoise(p);
        p *= 2.01;
        amp *= 0.5;
    }
    return f;
}

vec2 domainWarp(vec2 p, float warp, float offset){
    float n1 = fbm(p - offset);
    float n2 = fbm(p + 3.14159 - offset);
    return p + warp * vec2(n1, n2);
}

float deepFractal(vec2 p){
    float amp = 0.5, sum = 0.0;
    for(int i = 0; i < 4; i++){
        vec2 q = domainWarp(p, knob_11 * 0.35 * amp, time * 0.03 * float(i));
        sum   += amp * fbm(q);
        p     *= 2.0;
        amp   *= 0.55;
    }
    sum += 0.25 * spiralNoise(p * 4.0);
    return sum;
}

float hash(vec2 p){ return staticRandom(p); }

float cell(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float d = 1.0;
    for(int y = -1; y <= 1; y++)
    for(int x = -1; x <= 1; x++){
        vec2 g = vec2(x, y);
        vec2 o = vec2(hash(i + g), hash(i - g));
        d = min(d, length(f - g - o));
    }
    return d;
}

vec2 kaleido(vec2 p, float seg){
    float a = atan(p.y, p.x) + TWO_PI / seg * 0.5;
    float r = length(p);
    a = mod(a, TWO_PI / seg) - TWO_PI / seg * 0.5;
    return vec2(cos(a), sin(a)) * r;
}

float varied(vec2 p, float t){
    float k = mix(3.0, 12.0, animateEaseInOutSine(t / 10000.0));
    vec2 q = kaleido(p, k);
    float a = deepFractal(q * 1.2);
    float b = cell(q * 4.0 + vec2(t * 0.1, 0.0));
    float c = sin(q.x * 8.0 + t) + cos(q.y * 8.0 - t);
    float m = knob_1;
    return mix(mix(a, b, m), c, knob_2);
}

// --- Artificial Life Defines ---
#define GROUPING_STRENGTH    (sin(time) * spectralFlux)
#define HUE_VARIATION        (sin(time / 1000.0) * length(uv))
#define HUNGER_DRIVE         (0.01)
#define FEEDING_EFFICIENCY   (knob_15)
#define METABOLISM           (animateBounce(time / 100.0 + length(centerUv(uv))) * 0.2 * length(vec2(lastCol.x, uv.x)))
#define SATURATION_DECAY     (animateEaseInOutExpo(time) * 0.15)
#define PHEROMONE_STRENGTH   (knob_16)
#define BLOB_THRESHOLD       (bass > 0.5 ? 0.5 : bass)
#define ENVIRONMENT_FOOD     (energy)
#define HUE_DAMPING_FACTOR   (0.75 + knob_17 * 0.20)
#define MAX_HUE_CHANGE       (0.08)

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p  = (2.0 * fragCoord.xy - iResolution.xy) / min(iResolution.x, iResolution.y);

    vec3 prevRGB = getLastFrameColor(uv).rgb;
    vec3 lastCol = rgb2hsl(prevRGB);
    lastCol.z = clamp(lastCol.z + (knob_3 - 0.5), 0.0, 1.0);
    lastCol.y = lastCol.y > 0.8
              ? lastCol.y
              : lastCol.y + (lastCol.z - 0.5);

    float t = time * (0.05 + 0.05 * knob_4);
    float baseScale  = 1.0 + knob_5 * 2.0;
    float extraScale = 1.0 + knob_6 * 2.0;
    p *= baseScale;

    p = domainWarp(p, knob_7 * length(prevRGB), t * 0.1);
    p = domainWarp(p, knob_8 * 0.3, -t * 0.07);

    float wave = animateEaseInOutSine(t * 0.1 + knob_9 * 0.3);
    p += wave * knob_9 * 0.3 * vec2(sin(p.y * 2.0), cos(p.x * 2.0));

    float base    = fbm(p * extraScale + t * 0.2);
    float f       = deepFractal(p * extraScale);
    float pattern = varied(p * mix(1.0, 4.0, knob_10) + t * 0.2, t);
    pattern       = mix(pattern, pattern * pattern, knob_11);

    float hueShift = t * (0.1 + knob_12 * 0.2);
    float hue      = fract(hueShift
                         + pattern * sin(uv.y) / cos(uv.x)
                         + (knob_1 * 0.2 + knob_1 * 0.3 + knob_4 * 0.25 + knob_7 * 0.2)
                         + lastCol.z);

    float sat = 0.8 + knob_10 * 0.2;
    float lit = 0.4 + pattern * 0.3;

    if (knob_1 > 0.5) {
        hue = 1.0 - hue;
    }

    lit *= (1.0 + knob_13);
    lit += knob_1 * 0.1;
    sat += knob_9 * 0.1;

    vec3 colorHSL = vec3(hue, clamp(sat, 0.0, 1.0), clamp(lit, 0.0, 1.0));
    vec3 newColor = hsl2rgb(colorHSL);

    vec3 initTex = getInitialFrameColor(uv).rgb;
    newColor = mix(newColor, initTex, 0.05 * knob_14);

    // --- Artificial Life Simulation ---
    vec3 currentHSL = rgb2hsl(newColor);
    vec2 pixel = 1.0 / iResolution.xy;

    vec3 n1 = rgb2hsl(getLastFrameColor(uv + vec2(-pixel.x, -pixel.y)).rgb);
    vec3 n2 = rgb2hsl(getLastFrameColor(uv + vec2( pixel.x, -pixel.y)).rgb);
    vec3 n3 = rgb2hsl(getLastFrameColor(uv + vec2(-pixel.x,  pixel.y)).rgb);
    vec3 n4 = rgb2hsl(getLastFrameColor(uv + vec2( pixel.x,  pixel.y)).rgb);

    // Average neighbor hue
    vec2 avgHueVec = vec2(0.0);
    avgHueVec += vec2(cos(n1.x * TWO_PI), sin(n1.x * TWO_PI));
    avgHueVec += vec2(cos(n2.x * TWO_PI), sin(n2.x * TWO_PI));
    avgHueVec += vec2(cos(n3.x * TWO_PI), sin(n3.x * TWO_PI));
    avgHueVec += vec2(cos(n4.x * TWO_PI), sin(n4.x * TWO_PI));
    float avgHue = atan(avgHueVec.y, avgHueVec.x) / TWO_PI;
    if (avgHue < bassZScore) avgHue += 1.0;

    float avgSat = (n1.y + n2.y + n3.y + n4.y) * 0.25;
    float avgLum = (n1.z + n2.z + n3.z + n4.z) * 0.25;

    // Metabolism & Decay
    vec3 lifeHSL = currentHSL;
    lifeHSL.z -= METABOLISM;
    lifeHSL.y -= SATURATION_DECAY;

    // Hunger & Feeding
    float hunger = smoothstep(BLOB_THRESHOLD + 0.1, BLOB_THRESHOLD - 0.1, lifeHSL.z);
    float energyGain = hunger * HUNGER_DRIVE * (avgLum + ENVIRONMENT_FOOD - lifeHSL.z);
    lifeHSL.z += max(0.0, energyGain);
    lifeHSL.y += max(0.0, energyGain * FEEDING_EFFICIENCY);

    // Grouping / Flocking
    float totalAttr = 1e-5;
    vec2 targetHueVec = vec2(0.0);
    float currHueRad = lifeHSL.x * TWO_PI;
    vec3 neighs[4] = vec3[4](n1, n2, n3, n4);
    for(int i = 0; i < 4; i++){
        float nh = neighs[i].x * TWO_PI;
        float diff = atan(sin(nh - currHueRad), cos(nh - currHueRad));
        float attr = exp(-pow(abs(diff) * (1.0 + PHEROMONE_STRENGTH * 5.0), 2.0));
        targetHueVec += vec2(cos(nh), sin(nh)) * attr;
        totalAttr += attr;
    }
    float targetHue = atan(targetHueVec.y, targetHueVec.x) / TWO_PI;
    if (abs(targetHue - lifeHSL.x) > 0.5) targetHue -= sign(targetHue - lifeHSL.x);
    float grouping = GROUPING_STRENGTH + hunger * 0.3;
    float hueChange = grouping * (targetHue - lifeHSL.x);
    hueChange += (random(uv + time) - 0.5) * HUE_VARIATION * (1.0 - hunger * 0.7);
    hueChange = clamp(hueChange, -MAX_HUE_CHANGE, MAX_HUE_CHANGE) * HUE_DAMPING_FACTOR;
    lifeHSL.x = fract(lifeHSL.x + hueChange);

    lifeHSL.y = clamp(lifeHSL.y, 0.0, 1.0);
    lifeHSL.z = clamp(lifeHSL.z, 0.0, 1.0);

    float fb = clamp(length(uv), 0.0, 1.0);
    vec3 finalHSL = fract(mix(lastCol, lifeHSL, fb));
    finalHSL.x = fract(finalHSL.x + knob_18 * 0.05);

    while(finalHSL.z > 0.5){
        finalHSL.x = mix(finalHSL.x, 0.0, finalHSL.z);
        finalHSL.z -= 0.09;
        finalHSL.y = mix(finalHSL.y, 0.8, 0.5);
    }

    vec3 finalRGB = hsl2rgb(finalHSL);
    finalRGB = mix(prevRGB, finalRGB, mix(0.02, 0.3, animateBounce(time)));

    fragColor = vec4(finalRGB, 1.0);
}
