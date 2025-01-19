uniform float knob_70; // Base hue shift
uniform float knob_71; // Color spread
uniform float knob_72; // Saturation
uniform float knob_73; // Brightness
uniform float knob_74; // Ripple speed
uniform float knob_75; // Swirl intensity
uniform float knob_76; // Edge glow intensity
uniform float knob_77; // Color blend factor

// Color control defines
#define BASE_COLOR_1 vec3(knob_70, knob_71, knob_72)        // Primary color control
#define COLOR_SPREAD (0.2 + knob_71 * 2.0)                  // How different the colors are
#define SATURATION_FACTOR (0.5 + knob_72)                   // Overall color saturation
#define BRIGHTNESS_FACTOR (0.5 + knob_73)                   // Overall brightness

// Effect control defines
#define RIPPLE_SPEED (knob_74 * 2.0)                        // Speed of color ripples
#define SWIRL_INTENSITY (knob_75)                           // Intensity of swirl effect
#define EDGE_GLOW (knob_76)                                 // Intensity of edge glow
#define COLOR_BLEND (knob_77)                               // How colors mix together

// Original audio defines (keep these)
#define FLOW_SPEED (spectralFluxZScore)
#define CRYSTAL_SCALE (spectralCentroidZScore)
#define ENERGY (energyNormalized)
#define ROUGHNESS (spectralRoughnessNormalized)
#define BASE_HUE (spectralCentroidMedian + knob_70)         // Now influenced by knob_70
#define HUE_VARIATION (spectralSpreadZScore * knob_71)      // Now influenced by knob_71
#define COLOR_INTENSITY (spectralKurtosisMedian)
#define DISPLACEMENT (spectralFluxNormalized)

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
    vec2 sampleUV = uv + offset;
    return texture(prevFrame, sampleUV).rgb;
}

// Get flow direction based on pattern
vec2 getFlowVector(vec2 uv, float pattern) {
    vec2 flow = vec2(
        sin(uv.x * 4.0 + time + pattern * 2.0),
        cos(uv.y * 4.0 + time * 1.2 + pattern * 2.0)
    );
    return flow * (0.02 + DISPLACEMENT * 0.03);
}

// Add new flow noise function
vec2 flowNoise(vec2 uv) {
    float t = time * 0.2;
    return vec2(
        sin(uv.x * 2.0 + t) * cos(uv.y * 1.5 + t * 0.8),
        cos(uv.x * 1.5 - t * 1.2) * sin(uv.y * 2.0 + t * 0.6)
    );
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
    return a + b * cos(6.28318 * (c * t + d));
}

float crystalPattern(vec3 p) {
    // Add flowing displacement to input position
    vec2 flow = flowNoise(p.xy * 0.5) * (0.5 + ENERGY * 0.5);
    p.xy += flow * 0.3;

    p *= (1.8 + CRYSTAL_SCALE * 0.2);
    float pattern = 0.0;
    float basePattern = 0.2;

    for(int i = 0; i < 4; i++) {
        float scale = 1.0 + float(i) * (1.0 + HUE_VARIATION * 0.05);
        vec3 q = p * scale;

        // Add independent rotation for each layer
        float layerTime = time * (0.1 + float(i) * 0.05);
        vec2 layerFlow = flowNoise(q.xy * 0.3 + float(i)) * 0.5;
        q.xy += layerFlow * (0.2 + float(i) * 0.1);

        float rotSpeed = FLOW_SPEED * 0.1 * (0.2 + float(i) * 0.05);
        q.xy *= rotate2D(layerTime * rotSpeed);
        q.yz *= rotate2D(layerTime * rotSpeed * 0.7);
        q.xz *= rotate2D(layerTime * rotSpeed * 0.5);

        // Add flowing distortion to the pattern
        float flowOffset = sin(layerTime * 0.5 + length(q.xy) * 2.0) * 0.2;

        float xEdge = abs(sin(q.x * 1.5 + sin(q.z + flowOffset)));
        float yEdge = abs(sin(q.y * 1.5 + sin(q.x + flowOffset)));
        float zEdge = abs(sin(q.z * 1.5 + sin(q.y + flowOffset)));

        float crystal = max(
            max(xEdge * yEdge, yEdge * zEdge),
            xEdge * zEdge
        ) / scale;

        crystal = edge(crystal, 0.15);

        // Add flowing detail
        vec2 detailFlow = flowNoise(q.xy * 0.8 + float(i)) * 0.3;
        crystal *= 1.0 + ROUGHNESS * 0.5 * (
            sin(q.x * 2.0 + q.y * 2.0 + detailFlow.x) *
            cos(q.y * 2.0 + q.z * 2.0 + detailFlow.y)
        );

        crystal = smoothstep(0.3, 0.7, crystal);

        // Animate the pattern blending
        float layerMix = sin(layerTime * 0.3 + float(i)) * 0.5 + 0.5;
        pattern = mix(
            max(pattern, crystal),
            pattern + crystal,
            layerMix
        ) * (1.0 - float(i) * 0.2);
    }

    return mix(basePattern, pow(pattern, 0.9), mix(0.4, 0.7, ENERGY));
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
        sin(uv.y * 3.0 + time + pattern * 6.0),
        cos(uv.x * 3.0 + time * 0.7 + pattern * 6.0)
    );

    vec2 swirl2 = vec2(
        sin(uv.x * 2.0 - time * 0.5),
        cos(uv.y * 2.0 - time * 0.3)
    );

    // Create depth field using SDFs
    float depth1 = sdCircle(uv * 2.0 + swirl1 * 0.3, 0.5);
    float depth2 = sdBox(uv * 2.0 + swirl2 * 0.2, vec2(0.4));
    float depth = mix(depth1, depth2, pattern);

    // Create wave distortion based on depth
    float waveX = sin(depth * 8.0 + time * ENERGY * 0.5) * 0.1;
    float waveY = cos(depth * 8.0 + time * ENERGY * 0.4) * 0.1;

    if(beat) {
        waveX *= 8.0;
        waveY *= 8.0;
    }

    // Create color swirls
    vec2 distortedUv = uv + vec2(waveX, waveY) * (1.0 + ENERGY);
    vec3 prevColor = texture(prevFrame, distortedUv).rgb;

    // Generate multiple color layers
    vec3 color1 = generateColor(BASE_HUE + depth * 0.3, pattern);
    vec3 color2 = generateColor(BASE_HUE + 0.33 + depth * 0.2, pattern + 0.2);
    vec3 color3 = generateColor(BASE_HUE + 0.66 + depth * 0.1, pattern + 0.4);

    // Mix colors based on depth and swirls
    vec3 swirledColor = mix(
        mix(color1, color2, sin(depth * 4.0 + time) * 0.5 + 0.5),
        color3,
        cos(length(swirl1) * 3.0 + time) * 0.5 + 0.5
    );

    // Add energy-based intensity
    swirledColor *= 1.0 + ENERGY * sin(depth * 10.0 + time * 2.0) * 0.5;

    // Create ripple mask based on depth
    float rippleMask = smoothstep(-0.5, 0.5, sin(depth * 8.0 + time));

    // Enhance colors during beats
    if(beat) {
        vec3 beatColor = generateColor(BASE_HUE + 0.5, time * 0.1) * 2.0;
        swirledColor = mix(swirledColor, beatColor, rippleMask * ENERGY);
        swirledColor *= 1.3;
    }

    // Create dissipating effect
    float fadeOut = exp(-abs(depth) * 2.0);
    return mix(prevColor, swirledColor, fadeOut * 0.9);
}

// Add after existing defines
#define LIGHT_POS vec3(2.0, -1.0, 2.0)  // Light position
#define AMBIENT 0.2                      // Ambient light level
#define SPECULAR_POWER 16.0             // Shininess
#define SPECULAR_INTENSITY 0.8          // Specular highlight intensity

// Add this helper function for Phong shading
vec3 applyPhongLighting(vec3 baseColor, vec3 normal, vec2 uv) {
    vec3 lightDir = normalize(LIGHT_POS);
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));

    // Calculate diffuse lighting
    float diff = max(dot(normal, lightDir), 0.0);

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
    float dx = crystalPattern(vec3((uv + vec2(eps, 0.0)) * 2.0, time * 0.08)) -
               crystalPattern(vec3((uv - vec2(eps, 0.0)) * 2.0, time * 0.08));
    float dy = crystalPattern(vec3((uv + vec2(0.0, eps)) * 2.0, time * 0.08)) -
               crystalPattern(vec3((uv - vec2(0.0, eps)) * 2.0, time * 0.08));

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
    if (interest < 0.3) {
        // Boost saturation for dull colors
        hsl.y = mix(hsl.y, 0.7, energy);
        // Move luminance towards sweet spot
        hsl.z = mix(hsl.z, 0.6, energy * 0.5);
    }
    return hsl;
}

vec3 preventColorFlashing(vec3 newColor, vec3 prevColor) {
    // Convert to HSL for better control
    vec3 newHSL = rgb2hsl(newColor);
    vec3 prevHSL = rgb2hsl(prevColor);

    // Limit how much colors can change per frame
    float maxHueChange = 0.1;
    float maxSatChange = 0.1;
    float maxLumChange = 0.1;

    vec3 limitedHSL = vec3(
        prevHSL.x + clamp(newHSL.x - prevHSL.x, -maxHueChange, maxHueChange),
        prevHSL.y + clamp(newHSL.y - prevHSL.y, -maxSatChange, maxSatChange),
        prevHSL.z + clamp(newHSL.z - prevHSL.z, -maxLumChange, maxLumChange)
    );

    return hsl2rgb(limitedHSL);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    vec2 centered_uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;

    // Calculate flow and pattern first
    vec2 flow = flowNoise(centered_uv) * 0.2;
    vec3 p = vec3(centered_uv * 2.0 + flow, time * 0.08);
    float pattern = crystalPattern(p);

    // Calculate pattern gradients for rim and edge effects
    float eps = 0.02;
    vec2 offset = vec2(eps, 0.0);
    float patternRight = crystalPattern(vec3((centered_uv + offset.xy) * 2.0 + flow, time * 0.08));
    float patternUp = crystalPattern(vec3((centered_uv + offset.yx) * 2.0 + flow, time * 0.08));

    // Calculate gradient and rim effects
    vec2 grad = vec2(
        patternRight - pattern,
        patternUp - pattern
    ) / eps;

    float rim = smoothstep(0.2, 0.8, length(grad));
    rim = pow(rim, 1.5) * (1.0 + ENERGY * 2.0);

    // Calculate pattern transitions
    float foregroundPattern = smoothstep(0.4, 0.8, pattern);
    float backgroundPattern = smoothstep(0.0, 0.3, pattern);

    // Calculate ripple intensity
    float rippleIntensity = smoothstep(0.1, 0.9, pattern) *
        (1.0 - pattern) *
        (1.0 + ENERGY * 3.0);

    // Calculate flow vectors and previous frame samples
    vec2 flowVec = getFlowVector(uv, pattern);
    vec2 flowOffset = flowNoise(uv * 2.0) * 0.1;
    vec3 prevSample1 = samplePrevious(uv, flowVec * 0.8 + flowOffset);
    vec3 prevSample2 = samplePrevious(uv, -flowVec * 0.4 - flowOffset);
    vec3 prevSample3 = samplePrevious(uv + flowOffset * 2.0, flowVec * 0.5);

    vec3 prevColor = mix(
        prevSample1,
        mix(prevSample2, prevSample3, 0.5),
        0.5
    );

    // Calculate normals for lighting
    vec3 normal = estimateNormal(centered_uv, pattern);
    vec3 rimNormal = normalize(vec3(grad * 2.0, 0.5));

    // Generate and process base colors
    vec3 bgColorHSL = rgb2hsl(generateColor(BASE_HUE, 0.2));
    vec3 fgColorHSL = rgb2hsl(generateColor(BASE_HUE + HUE_VARIATION, 0.7));

    bgColorHSL = makeColorMoreInteresting(bgColorHSL, ENERGY * 0.8);
    fgColorHSL = makeColorMoreInteresting(fgColorHSL, ENERGY);

    bgColorHSL.z = mix(0.2, 0.4, ENERGY);
    fgColorHSL.z = mix(0.6, 0.8, ENERGY);

    vec3 bgColor = applyPhongLighting(hsl2rgb(bgColorHSL), normal, centered_uv);
    vec3 fgColor = applyPhongLighting(hsl2rgb(fgColorHSL), normal, centered_uv);

    // Mix colors and apply effects
    vec3 color = mix(bgColor, fgColor, foregroundPattern);

    vec3 rippleEffect = getRippleColor(uv, pattern, time);
    rippleEffect = applyPhongLighting(rippleEffect, normal, centered_uv);
    color = mix(color, rippleEffect, rippleIntensity);

    vec3 rimColor = generateColor(BASE_HUE + 0.3, 0.2) * vec3(1.4, 1.3, 1.2);
    rimColor = applyPhongLighting(rimColor, rimNormal, centered_uv);
    color += rimColor * rim * 1.2;

    // Apply beat effects
    if(beat) {
        vec3 beatColor = mix(
            generateColor(BASE_HUE + 0.25, 0.5),
            rippleEffect * 1.3,
            0.7
        );
        beatColor = applyPhongLighting(beatColor, normal, centered_uv);
        vec3 beatColorHSL = rgb2hsl(beatColor);
        beatColorHSL = makeColorMoreInteresting(beatColorHSL, ENERGY);
        beatColor = hsl2rgb(beatColorHSL);

        color = mix(
            color,
            beatColor,
            (ENERGY * 0.3 * foregroundPattern + rim * 0.4)
        );
    }

    // Add trails and final adjustments
    vec2 trailUV = uv - flowVec * 0.1;
    vec3 trailColor = texture(prevFrame, trailUV).rgb;
    color = mix(color, trailColor, 0.3);

    vec3 finalColorHSL = rgb2hsl(color);
    finalColorHSL = makeColorMoreInteresting(finalColorHSL, ENERGY);
    finalColorHSL.y = clamp(finalColorHSL.y, 0.2, 0.8);
    finalColorHSL.z = clamp(finalColorHSL.z, 0.2, 0.8);
    color = hsl2rgb(finalColorHSL);

    color = preventColorFlashing(color, prevColor);

    fragColor = vec4(color, 1.0);
}
