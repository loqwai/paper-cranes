// http://localhost:6969/edit.html?knob_36=3&knob_36.min=-2&knob_36.max=3&knob_30=5.827&knob_30.min=0&knob_30.max=10&knob_31=-7.244&knob_31.min=-20&knob_31.max=10&knob_32=-0.276&knob_32.min=-2&knob_32.max=1&knob_33=0.079&knob_33.min=-2&knob_33.max=1&knob_34=1&knob_34.min=0&knob_34.max=1&knob_35=8.031&knob_35.min=0&knob_35.max=10&knob_3=-2&knob_3.min=-2&knob_3.max=1&knob_37=9.134&knob_37.min=0&knob_37.max=10&knob_45=0&knob_45.min=0&knob_45.max=1&knob_40=0.346&knob_40.min=0&knob_40.max=1&knob_46=0&knob_46.min=0&knob_46.max=1

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
    return uv;
}

// Algorithmic palette generation
vec3 generateColor(float t, float offset) {
    // More saturated midpoint
    vec3 a = vec3(0.6, 0.4, 0.5);
    // Larger amplitude for more color variation
    vec3 b = vec3(0.8, 0.6, 0.7);
    // Different frequencies for each channel
    vec3 c = vec3(0.8, 1.0, 1.2);
    // Spread out phases more
    vec3 d = vec3(offset, offset + 0.4, offset + 0.8);
    return a + b * cos(pitchClassMedian + (c * t + d));
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

    // Reduce sample count for better performance
    for(float x = -1.0; x <= 3.0; x += 1.0) {
        for(float y = -1.0; y <= 3.0; y += 1.0) {
            vec2 offset = vec2(x, y) * texel * radius;
            float w = spectralRoughnessNormalized+ 0.4;
            sum += getLastFrameColor(uv + offset).rgb * w;
            weight += w;
        }
    }

    vec3 avg = sum / weight;
    return vec4(avg, dot(avg, vec3(0.299, 0.587, 0.114))); // Optimized intensity calculation
}

// Update crystalPattern with the new neighborhood-aware version
float crystalPattern(vec3 p) {
    vec2 uv = p.xy * 0.5 + 0.5;
    vec4 neighborhood = sampleNeighborhood(uv, 4.0); // Reduced radius

    // Apply evolution rate to flow
    vec2 flow = flowNoise(p.xy * 0.15) * FLOW_STRENGTH;
    flow += (neighborhood.xy - 0.15) * EVOLUTION_RATE;
    p.xy += flow;

    p *= FRACTAL_SCALE;
    float pattern = 0.0;

    // Reduce iterations based on PATTERN_COMPLEXITY
    int iterations = int(20.0 + PATTERN_COMPLEXITY);
    iterations = min(iterations, 3); // Cap maximum iterations

    for(int i = 0; i < iterations; i++) {
        vec3 q = p * (1.0 + float(i) * 0.5);

        // Simplified time variation
        float layerTime = time * MORPH_SPEED * (1.0 + float(i) * 0.2);

        // Optimized rotation
        q.xy *= rotate2D(layerTime);

        // Create base shape
        float shape = length(q.xy) - (0.5 + sin(q.z + layerTime) * 0.2);
        shape = abs(shape) + tendrilNoise(q);

        // Apply edge sharpness
        float crystal = smoothstep(EDGE_SHARPNESS, 0.5 + EDGE_SHARPNESS, shape);

        // Blend with previous frame
        crystal = mix(crystal, neighborhood.w, EVOLUTION_RATE);

        pattern = mix(pattern, crystal, 0.5);
    }

    return pattern;
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
#define SPECULAR_POWER 10.           // Shininess
#define SPECULAR_INTENSITY 0.9          // Specular highlight intensity

// Add this helper function for Phong shading
vec3 applyPhongLighting(vec3 baseColor, vec3 normal, vec2 uv) {
    vec3 lightDir = normalize(LIGHT_POS);
    vec3 viewDir = normalize(vec3(1.0, 0.0, 1.0));

    // Calculate diffuse lighting
    float diff = max(dot(normal, lightDir), 0.0)*0.1;

    // Calculate specular lighting
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), SPECULAR_POWER);

    // Combine lighting components
    vec3 ambient = AMBIENT * baseColor;
    vec3 diffuse = diff * baseColor;
    vec3 specular = SPECULAR_INTENSITY * spec * vec3(1.0);

    return ambient + diffuse + specular;
}

// Add this function to estimate normal from pattern gradient
vec3 estimateNormal(vec2 uv, float pattern) {
    float eps = 0.01;
    float dx = crystalPattern(vec3((uv + vec2(eps, 0.0)) * 2.0,  1.3)) -
               crystalPattern(vec3((uv - vec2(eps, 0.0)) * 2.0,  1.3));
    float dy = crystalPattern(vec3((uv + vec2(0.0, eps)) * 2.0,  1.3)) -
               crystalPattern(vec3((uv - vec2(0.0, eps)) * 2.0,  1.3));

    return normalize(vec3(-dx, -dy, 0.2));
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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    vec2 centered_uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;

    // Calculate flow and pattern first
    vec2 flow = flowNoise(centered_uv) * 0.2;
    vec3 p = vec3(centered_uv * 2.0 + flow, time * 0.08);
    float pattern = crystalPattern(p);

    // Calculate pattern gradients for rim and edge effects
    float eps = 0.2;
    vec2 offset = vec2(eps, 0.0);
    float patternRight = crystalPattern(vec3((centered_uv + offset.xy) * 2.0 + flow, time * 0.08));
    float patternUp = crystalPattern(vec3((centered_uv + offset.yx) * 2.0 + flow, time * 0.08));

    // Calculate gradient and rim effects
    vec2 grad = vec2(
        patternRight - pattern,
        patternUp - pattern
    ) / eps;

    float rim = smoothstep(0.2, 0.8, length(grad));
    rim = pow(rim, 2.5) * (1.0 + ENERGY * 2.0);

    // Calculate pattern transitions
    float foregroundPattern = smoothstep(0.4, 0.8, pattern);
    float backgroundPattern = smoothstep(0.0, 0.3, pattern);

    // Calculate ripple intensity
    float rippleIntensity = 0.3;

    // Calculate flow vectors and previous frame samples
    vec2 flowVec = getFlowVector(uv, pattern);
    vec2 flowOffset = uv;
    vec3 prevSample1 = samplePrevious(uv, flowVec * 0.8 );
    vec3 prevSample2 = samplePrevious(uv, -flowVec * 0.4 );
    vec3 prevSample3 = samplePrevious(uv * 2.0, flowVec * 0.5);

    vec3 prevColor = mix(
        prevSample1,
        mix(prevSample2, prevSample3, 0.5),
        0.5
    );

    // Calculate normals for lighting
    vec3 normal = estimateNormal(centered_uv, pattern);
    vec3 rimNormal = normalize(vec3(grad * 2.0, 0.005));

    // Generate and process base colors
    vec3 bgColorHSL = rgb2hsl(generateColor(BASE_HUE, 0.2));
    vec3 fgColorHSL = rgb2hsl(generateColor(BASE_HUE + HUE_VARIATION, 0.7));

    bgColorHSL.z = mix(0.2, 0.4, ENERGY);
    fgColorHSL.z = mix(0.6, 0.8, ENERGY);

    vec3 bgColor = applyPhongLighting(hsl2rgb(bgColorHSL), normal, centered_uv);
    vec3 fgColor = applyPhongLighting(hsl2rgb(fgColorHSL), normal, centered_uv);

    // Mix colors and apply effects
    vec3 color = mix(bgColor, fgColor, foregroundPattern);

    vec3 rippleEffect = getRippleColor(uv, pattern, time)/1000.;

    color = mix(color, rippleEffect, rippleIntensity/100.);

    vec3 rimColor = generateColor(BASE_HUE + 0.3, 0.2);
    rimColor = applyPhongLighting(rimColor, rimNormal, centered_uv);
    color += rimColor * rim * .2;


    // Add trails and final adjustments
    vec2 trailUV = uv - flowVec * 0.001;
    vec3 trailColor = texture(prevFrame, trailUV).rgb;
    color = mix(color, trailColor, 0.6);

    vec3 finalColorHSL = rgb2hsl(color);
    // finalColorHSL = makeColorMoreInteresting(finalColorHSL, ENERGY);
    finalColorHSL.y = fract(finalColorHSL.y);
    finalColorHSL.z = sin(finalColorHSL.z);
    color = hsl2rgb(finalColorHSL);



    // Apply random mutations
    color = fract(applyRandomMutation(uv, color));
    color = preventColorFlashing(color, prevColor);

    fragColor = vec4(color, 1.0);
}
