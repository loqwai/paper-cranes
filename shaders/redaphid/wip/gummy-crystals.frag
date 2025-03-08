#define PI 3.14159265359

// http://localhost:6969/edit.html?knob_36=3&knob_36.min=-2&knob_36.max=3&knob_30=10&knob_30.min=0&knob_30.max=10&knob_31=-20&knob_31.min=-20&knob_31.max=10&knob_32=0.976&knob_32.min=-2&knob_32.max=1&knob_33=0.551&knob_33.min=-2&knob_33.max=1&knob_34=0.102&knob_34.min=0&knob_34.max=1&knob_35=5.197&knob_35.min=0&knob_35.max=10&knob_3=-2&knob_3.min=-2&knob_3.max=1&knob_37=9.843&knob_37.min=0&knob_37.max=10&knob_45=0&knob_45.min=0&knob_45.max=1&knob_40=0.205&knob_40.min=0&knob_40.max=1&knob_46=0&knob_46.min=0&knob_46.max=1&knob_41=0.228&knob_41.min=0&knob_41.max=1

// Evolution controls
#define EVOLUTION_RATE (0.1 + knob_5 * 0.4)        // How much previous frame affects next
#define FRACTAL_SCALE (1.0 + knob_31 * 2.0)         // Overall scale of fractal elements
#define PATTERN_COMPLEXITY (1.0 + knob_32)           // Number of layers/detail
#define FLOW_STRENGTH (knob_33 * 0.3)               // How much the pattern flows
#define MORPH_SPEED (knob_34 * 0.2)                 // Speed of shape changes
#define TENDRIL_DETAIL (0.2 + knob_35 * 0.8)        // Amount of tendril detail
#define EDGE_SHARPNESS (0.1 + knob_36)        // Sharpness of pattern edges
#define COLOR_EVOLUTION (knob_37 * 0.3)             // How colors evolve over time
#define MUTATION_RATE (knob_37 * 0.2)             // How likely pixels are to mutate


// Color control defines
#define BASE_COLOR_1 vec3(knob_30, knob_36, knob_37)        // Primary color control
#define COLOR_SPREAD (0.2 + knob_31 * 2.0)                  // How different the colors are
#define SATURATION_FACTOR (0.5 + knob_32)                   // Overall color saturation
#define BRIGHTNESS_FACTOR (0.5 + knob_33)                   // Overall brightness

// Effect control defines
#define RIPPLE_SPEED (knob_34 * 2.0)                        // Speed of color ripples
#define SWIRL_INTENSITY (knob_35)                           // Intensity of swirl effect
#define EDGE_GLOW (knob_36)                                 // Intensity of edge glow
#define COLOR_BLEND (knob_37)                               // How colors mix together
#define FRACTAL_INTENSITY (10.2 + knob_35 * 2.0)  // Controls both swirl and tendril intensity


#define FLOW_SPEED (knob_30)
#define CRYSTAL_SCALE (knob_31)
#define ENERGY (knob_32)
#define ROUGHNESS (knob_33)
#define BASE_HUE (knob_34)
#define HUE_VARIATION (knob_35)
#define COLOR_INTENSITY (knob_36)
#define DISPLACEMENT (knob_37)

// Rotation matrix helper
mat2 rotate2D(float angle) {
    float c = cos(angle), s = sin(angle);
    return mat2(c, -s, s, c);
}

// Sharp edge function
float edge(float x, float k) {
    return smoothstep(0.0, k, x) * (1.0 - smoothstep(1.0-k, 1.0, x));
}

// Sample previous frame with displacement
vec3 samplePrevious(vec2 uv, vec2 offset) {
    vec2 sampleUV = uv;
    return texture(prevFrame, sampleUV).rgb;
}

// Get flow direction based on pattern
vec2 getFlowVector(vec2 uv, float pattern) {
    vec2 flow = vec2(
        sin(uv.x * 4.0 + time + pattern * 2.0),
        cos(uv.y * 4.0 + time * 1.2 + pattern * 2.0)
    );
    return uv;
}

// Add new flow noise function
vec2 flowNoise(vec2 uv) {
    vec2 flow = vec2(
        sin(uv.x * 4.0 + iTime),
        cos(uv.y * 4.0 + iTime * 1.2)
    );
    return flow * FLOW_INTENSITY;
}

// Algorithmic palette generation
vec3 generateColor(float t, float offset) {
    vec3 a = vec3(0.6, 0.4, 0.5);
    vec3 b = vec3(0.8, 0.6, 0.7);
    vec3 c = vec3(0.8, 1.0, 1.2);
    vec3 d = vec3(offset, offset + 0.4, offset + 0.8);
    return a + b * cos(6.28318 * (c * t + d));
}

// Add this helper function for fractal tendrils
float tendrilNoise(vec3 p) {
    float f = sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z);
    p *= 2.0;
    f += (sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z)) * 0.5;
    return f * TENDRIL_DETAIL;
}

// Add the new neighborhood sampling function
vec4 sampleNeighborhood(vec2 uv, float radius) {
    vec2 texel = 1.0 / resolution.xy;
    vec3 sum = vec3(0.0);
    float weight = 0.0;

    // Use circular sampling pattern
    const int SAMPLES = 6;
    for(int i = 0; i < SAMPLES; i++) {
        float angle = float(i) * 2.0 * PI / float(SAMPLES);
        vec2 offset = vec2(cos(angle), sin(angle)) * texel * radius;

        // Radial weight falloff
        float w = 1.0 - length(offset) / (radius * length(texel));
        w = smoothstep(0.0, 1.0, w) * (spectralRoughnessNormalized + 0.4);

        sum += getLastFrameColor(uv + offset).rgb * w;
        weight += w;
    }

    vec3 avg = sum / max(weight, 0.001);
    return vec4(avg, dot(avg, vec3(0.299, 0.587, 0.114)));
}

// Update crystalPattern with the new neighborhood-aware version
float crystalPattern(vec3 p) {
    mat2 baseRotation = rotate2D(iTime * CRYSTAL_ROTATION_SPEED);
    vec2 rotated = baseRotation * p.xy;

    float r = length(rotated) * CRYSTAL_SCALE;
    float theta = atan(rotated.y, rotated.x);

    float pattern = 0.0;
    float totalWeight = 0.0;

    for(int i = 0; i < 3; i++) {
        float scale = 1.0 + float(i) * 0.5;
        float layerTime = iTime * TIME_SCALE * (1.0 + float(i) * 0.2);

        float numFacets = FACET_COUNT + float(i) * 2.0;
        float facetAngle = floor(theta * numFacets / PI) * PI / numFacets;
        float edgeAngle = abs(fract(theta * numFacets / PI) - 0.5) * 2.0;

        float radialDist = r * scale * PATTERN_FREQUENCY;
        float radialPattern = abs(fract(radialDist) - 0.5) * 2.0;

        float crystalFace = mix(
            smoothstep(0.2, 0.8, edgeAngle),
            smoothstep(0.2, 0.8, radialPattern),
            0.5
        );

        vec2 flow = vec2(
            sin(r * 4.0 + layerTime),
            cos(theta * 4.0 + layerTime)
        ) * FLOW_INTENSITY;

        vec2 noiseUV = (rotated + flow) * NOISE_SCALE;
        float noise = tendrilNoise(vec3(noiseUV * 1.5, p.z + layerTime)) * 0.2;

        float crystal = crystalFace + noise;
        float edgeGlow = (1.0 - edgeAngle) * EDGE_GLOW_INTENSITY;
        crystal = mix(crystal, 1.0, edgeGlow);

        float layerWeight = exp(-float(i) * 0.3);
        pattern = max(pattern, crystal * layerWeight);
        totalWeight += layerWeight;
    }

    pattern /= max(totalWeight, 0.001);
    return clamp(pattern, 0.0, 1.0);
}

// Add ripple functions
float getGrayPercent(vec3 color) {
    return (color.r + color.g + color.b) / 3.0;
}

// Add SDF functions
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Enhanced ripple and swirl generation
vec3 getRippleColor(vec2 uv, float pattern, float time) {
    // Create layered swirls
    vec2 swirl1 = vec2(
        sin(uv.y * 3.0 + time + pattern * 1.),
        cos(uv.x * 3.0 + time * 0.7 + pattern * 1.)
    );

    vec2 swirl2 = vec2(
        sin(uv.x * 2.0 - time * 0.5),
        cos(uv.y * 2.0 - time * 0.3)
    );

    // Create depth field using SDFs
    float depth1 = sdCircle(uv * 2.0 + swirl1 * 0.0003, 0.005);
    float depth2 = sdBox(uv * 2.0 + swirl2 * 0.002, vec2(0.004));
    float depth = mix(depth1, depth2, pattern);

    // Create wave distortion based on depth
    float waveX = sin(depth  + time * ENERGY * 0.5) * 0.1;
    float waveY = cos(depth + time * ENERGY * 0.4) * 0.1;

    if(beat) {
        waveX *= 8.0;
        waveY *= 8.0;
    }

    // Create color swirls
    vec2 distortedUv = uv + vec2(waveX, waveY) * (0.01);
    vec3 prevColor = texture(prevFrame, uv).rgb;

    // Reduce number of color layers
    vec3 color1 = generateColor(BASE_HUE + depth * 0.1, pattern);
    vec3 color2 = generateColor(BASE_HUE + 0.5 + depth * 0.2, pattern + 0.2);

    // Simpler color mixing
    vec3 swirledColor = mix(
        color1,
        color2,
        sin(depth) * 0.5 + 0.5
    );

    // Add energy-based intensity
    swirledColor *= 1.0 * sin(depth * 1.0 + time * 2.0) * 0.5;



    // Create dissipating effect
    float fadeOut = exp(-abs(depth) * 1.0);
    return hslmix(prevColor, swirledColor, fadeOut * 0.9);
}

// Add after existing defines
#define LIGHT_POS vec3(2.0, -1.0, 2.0)  // Light position
#define AMBIENT 0.18                      // Ambient light level
#define SPECULAR_POWER 64.0              // Higher power for sharper highlights
#define SPECULAR_INTENSITY (0.2 + knob_39 * 1.3) // 0.2 to 1.5 intensity

// Add this helper function for Phong shading
vec3 applyPhongLighting(vec3 baseColor, vec3 normal, vec2 uv) {
    vec3 lightDir = normalize(LIGHT_POS);
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));

    float diff = pow(max(dot(normal, lightDir), 0.0), 1.5) * 0.7;

    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfwayDir), 0.0), SPECULAR_POWER);
    spec *= SPECULAR_INTENSITY;

    float rim = 1.0 - max(dot(normal, viewDir), 0.0);
    rim = pow(rim, RIM_LIGHT_POWER) * 0.5;

    vec3 ambient = AMBIENT * baseColor;
    vec3 diffuse = diff * baseColor;
    vec3 specular = spec * vec3(1.0);
    vec3 rimLight = rim * vec3(1.0, 0.9, 0.8);

    return ambient + diffuse + specular + rimLight;
}

// Improve normal estimation for sharper lighting
vec3 estimateNormal(vec2 uv, float pattern) {
    float eps = 0.02 * NORMAL_STRENGTH;
    vec3 p = vec3(uv * 2.0, 1.3);

    vec2 grad = vec2(0.0);
    const int SAMPLES = 8;
    float totalWeight = 0.0;

    for(int i = 0; i < SAMPLES; i++) {
        float angle = float(i) * 2.0 * PI / float(SAMPLES) + iTime * 0.1;
        float r = eps * (1.0 + sin(angle * 2.0) * 0.2);

        vec2 offset = r * vec2(cos(angle), sin(angle));
        float s = crystalPattern(p + vec3(offset, 0.0));
        float c = crystalPattern(p);

        float weight = 1.0 + 0.2 * sin(angle * 3.0 + iTime);
        grad += normalize(offset) * (s - c) / r * weight;
        totalWeight += weight;
    }

    grad /= totalWeight;
    grad += vec2(0.001, 0.001) * sin(uv.x * 10.0 + uv.y * 10.0 + iTime);
    float z = 1.0 + 0.1 * sin(uv.x * 5.0 + uv.y * 5.0 + iTime);

    return normalize(vec3(-grad, z));
}

// Add these helper functions at the top
float getColorInterest(vec3 hsl) {
    // Measure how "interesting" a color is based on saturation and luminance
    float saturationWeight = smoothstep(0.2, 0.8, hsl.y);
    float luminanceBalance = 1.0 - abs(hsl.z - 0.5) * 2.0;
    return saturationWeight * luminanceBalance;
}

vec3 makeColorMoreInteresting(vec3 hsl, float energy) {
    // Adjust boring colors to be more vibrant
    float interest = getColorInterest(hsl);
    if (interest < 0.02) {
        // Boost saturation for dull colors
        hsl.y = mix(hsl.y, 0.7, 0.1);
        // Move luminance towards sweet spot
        hsl.z = mix(hsl.z, 0.6,  0.5);
    }
    return fract(hsl);
}

vec3 preventColorFlashing(vec3 newColor, vec3 prevColor) {
    return newColor;

    // return fract(hsl2rgb(limitedHSL));
}

// Add mutation function
vec3 applyRandomMutation(vec2 uv, vec3 currentColor) {
    // Only mutate some pixels based on random value and mutation rate
    float shouldMutate = step(random(uv + time * 0.1), MUTATION_RATE);

    if(shouldMutate > 0.2) {
        // Sample neighborhood for interesting colors
        vec4 neighborhood = sampleNeighborhood(uv, 2.0);

        // Create a new color by mixing neighborhood colors
        vec3 mutatedColor = mix(
            currentColor,
            neighborhood.rgb,
            random(uv + time) * 0.5
        );

        return mutatedColor;
    }

    return currentColor;
}

// Crystal Structure Controls
#define FACET_COUNT (4.0 + knob_30 * 8.0)  // 4 to 12 facets
#define CRYSTAL_SCALE (0.5 + knob_31 * 2.5) // 0.5 to 3.0 scale
#define EDGE_GLOW_INTENSITY (knob_32 * 2.0) // 0 to 2.0 glow
#define CRYSTAL_ROTATION_SPEED (knob_33 * 2.0) // 0 to 2.0 speed

// Pattern and Motion
#define PATTERN_FREQUENCY (1.0 + knob_34 * 7.0) // 1 to 8 frequency
#define NOISE_SCALE (0.1 + knob_35 * 1.9) // 0.1 to 2.0 scale
#define TIME_SCALE (0.1 + knob_36 * 3.9) // 0.1 to 4.0 speed
#define FLOW_INTENSITY (knob_37 * 2.0) // 0 to 2.0 flow

// Lighting Controls
#define RIM_LIGHT_POWER (1.0 + knob_38 * 7.0) // 1 to 8 power
#define SPECULAR_INTENSITY (0.2 + knob_39 * 1.3) // 0.2 to 1.5 intensity
#define NORMAL_STRENGTH (0.5 + knob_40 * 3.5) // 0.5 to 4.0 strength

// Lighting constants
#define LIGHT_POS vec3(2.0, -1.0, 2.0)
#define AMBIENT 0.18
#define SPECULAR_POWER 64.0

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 centered_uv = (2.0 * fragCoord.xy - iResolution.xy) / min(iResolution.x, iResolution.y);

    vec2 flow = flowNoise(centered_uv);
    vec3 p = vec3(centered_uv + flow, iTime * 0.08);
    float pattern = crystalPattern(p);

    vec3 normal = estimateNormal(centered_uv, pattern);

    vec3 bgColorHSL = vec3(0.6, 0.5, 0.3);
    vec3 fgColorHSL = vec3(0.7, 0.6, 0.7);

    vec3 bgColor = applyPhongLighting(bgColorHSL, normal, centered_uv);
    vec3 fgColor = applyPhongLighting(fgColorHSL, normal, centered_uv);

    vec3 color = mix(bgColor, fgColor, smoothstep(0.4, 0.8, pattern));
    fragColor = vec4(color, 1.0);
}
