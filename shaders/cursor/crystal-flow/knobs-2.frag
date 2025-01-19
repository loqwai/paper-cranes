//http://localhost:6969/edit.html?shader=cursor%2Fcrystal-flow%2F2&knob_76=-0.346&knob_76.min=-2&knob_76.max=1&knob_70=0.496&knob_70.min=0&knob_70.max=1&knob_71=-1.575&knob_71.min=-2&knob_71.max=1&knob_72=-2&knob_72.min=-2&knob_72.max=1&knob_73=-0.819&knob_73.min=-2&knob_73.max=1&knob_74=-0.937&knob_74.min=-2&knob_74.max=1&knob_75=-1.787&knob_75.min=-2&knob_75.max=2.5&knob_77=-1.693&knob_77.min=-2&knob_77.max=1
//http://localhost:6969/edit.html?shader=cursor%2Fcrystal-flow%2F2&knob_76=-1.102&knob_76.min=-2&knob_76.max=1&knob_70=0.693&knob_70.min=0&knob_70.max=1&knob_71=-0.016&knob_71.min=-2&knob_71.max=1&knob_72=1&knob_72.min=-2&knob_72.max=1&knob_73=0.339&knob_73.min=-2&knob_73.max=1&knob_74=-0.11&knob_74.min=-2&knob_74.max=1&knob_75=0.078&knob_75.min=0&knob_75.max=0.1&knob_77=-1.693&knob_77.min=-2&knob_77.max=1
//http://localhost:6969/edit.html?shader=cursor%2Fcrystal-flow%2Fknobs&knob_76=-1.031&knob_76.min=-2&knob_76.max=1&knob_70=0.724&knob_70.min=0&knob_70.max=1&knob_71=7.638&knob_71.min=-2&knob_71.max=10&knob_72=1&knob_72.min=-2&knob_72.max=1&knob_73=-1.22&knob_73.min=-2&knob_73.max=1&knob_74=-1.362&knob_74.min=-2&knob_74.max=1&knob_75=0.082&knob_75.min=0&knob_75.max=0.1&knob_77=-2&knob_77.min=-2&knob_77.max=1
//http://localhost:6969/edit.html?shader=cursor%2Fcrystal-flow%2Fknobs&knob_76=-0.488&knob_76.min=-2&knob_76.max=1&knob_70=0&knob_70.min=0&knob_70.max=10&knob_71=5.37&knob_71.min=-2&knob_71.max=10&knob_72=1&knob_72.min=-2&knob_72.max=1&knob_73=0.079&knob_73.min=-2&knob_73.max=1&knob_74=0.685&knob_74.min=0&knob_74.max=1&knob_75=0.051&knob_75.min=0&knob_75.max=0.1&knob_77=-2&knob_77.min=-2&knob_77.max=1
// Modify knob purposes
uniform float knob_70; // Wave speed
uniform float knob_71; // Wave scale
uniform float knob_72; // Wave coherence
uniform float knob_73; // Flow strength
uniform float knob_74; // Evolution rate
uniform float knob_75; // Pattern detail
uniform float knob_76; // Edge sharpness
uniform float knob_77; // Mutation rate

#define MANUAL_MODE
#ifdef MANUAL_MODE
#define WAVE_SPEED (knob_70 * 0.05)                // Slower wave movement, more controlled range
#define WAVE_SCALE (1.0 + knob_71 * 2.0)         // Scale of the wave patterns
#define WAVE_COHERENCE (0.5 + knob_72 * 0.5)     // How much waves stay together
#define FLOW_STRENGTH (knob_73 * 0.15)           // Reduced flow strength for smoother movement
#define EVOLUTION_RATE (0.1 + knob_74 * 0.2)     // How much previous frame affects next
#define PATTERN_DETAIL (0.5 + knob_75 * 0.5)     // Amount of pattern detail
#define EDGE_SHARPNESS (0.1 + knob_76 * 0.4)     // Sharpness of edges
#define MUTATION_RATE (knob_77 * 0.1)            // Slower mutation rate
#define FRACTAL_SCALE (1.0 + WAVE_SCALE * 0.5)   // Scale of fractal elements                // Overall energy level
#endif

// Color control defines
#define COLOR_SPREAD (0.2 + knob_71 * 2.0)                  // How different the colors are
#define SATURATION_FACTOR (0.5 + knob_72)                   // Overall color saturation
#define BRIGHTNESS_FACTOR (0.5 + knob_73)                   // Overall brightness

// Effect control defines
#define RIPPLE_SPEED (knob_74 * 2.0)                        // Speed of color ripples
#define SWIRL_INTENSITY (knob_75)                           // Intensity of swirl effect
#define EDGE_GLOW (knob_76)                                 // Intensity of edge glow
#define COLOR_BLEND (knob_77)                               // How colors mix together
#define FRACTAL_INTENSITY (0.2 + knob_75 * 2.0)  // Controls both swirl and tendril intensity

// Original audio defines (keep these)
#ifndef MANUAL_MODE
#define FLOW_SPEED (spectralFluxZScore)
#define CRYSTAL_SCALE (spectralCentroidZScore)
#define ENERGY (energyNormalized)
#define ROUGHNESS (spectralRoughnessNormalized)
#define BASE_HUE (spectralCentroidMedian + knob_70)         // Now influenced by knob_70
#define HUE_VARIATION (spectralSpreadZScore * knob_71)      // Now influenced by knob_71
#define COLOR_INTENSITY (spectralKurtosisMedian)
#define DISPLACEMENT (spectralFluxNormalized)
#else
#define FLOW_SPEED (knob_70)
#define CRYSTAL_SCALE (knob_71)
#define ENERGY (knob_72)
#define ROUGHNESS (knob_73)
#define BASE_HUE (knob_74)
#define HUE_VARIATION (knob_75)
#define COLOR_INTENSITY (knob_76)
#define DISPLACEMENT (knob_77)

#endif

#define TIME (time)
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
        sin(uv.x * 4.0 + TIME + pattern * 2.0),
        cos(uv.y * 4.0 + TIME * 1.2 + pattern * 2.0)
    );
    return flow * (0.02 + DISPLACEMENT * 0.03);
}

// Update flowNoise for simpler, cleaner waves
vec2 flowNoise(vec2 uv) {
    // Convert to polar coordinates for radial waves
    vec2 centered = uv;
    float dist = length(centered);
    float angle = atan(centered.y, centered.x);

    // Slower time scale
    float t = TIME * WAVE_SPEED * 0.1;

    // Create single, clean radial wave
    float radialWave = sin(dist * WAVE_SCALE - t) *
                      exp(-dist * 3.0); // Stronger distance falloff

    // Thicker, smoother waves
    float thickness = 0.7 + WAVE_COHERENCE * 0.3;
    radialWave = smoothstep(-thickness, thickness, radialWave) * 0.5; // Reduced intensity

    // Convert back to cartesian coordinates with gentler flow
    vec2 wave = vec2(
        cos(angle) * radialWave,
        sin(angle) * radialWave
    ) * 0.2; // Reduced overall movement

    // Very subtle rotation
    float rotSpeed = t * 0.05;
    wave *= mat2(cos(rotSpeed), -sin(rotSpeed),
                 sin(rotSpeed), cos(rotSpeed));

    return wave * FLOW_STRENGTH * 0.2;
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

// Add this helper function for fractal tendrils
float tendrilNoise(vec3 p) {
    float f = sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z);
    p *= 2.0;
    f += (sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z)) * 0.5;
    return f * PATTERN_DETAIL;
}

// Add the new neighborhood sampling function
vec4 sampleNeighborhood(vec2 uv, float radius) {
    vec2 texel = 1.0 / resolution.xy;
    vec3 sum = vec3(0.0);
    float weight = 0.0;

    for(float x = -1.0; x <= 1.0; x += 1.0) {
        for(float y = -1.0; y <= 1.0; y += 1.0) {
            vec2 offset = vec2(x, y) * texel * radius;
            vec2 sampleUV = clamp(uv + offset, 0.0, 1.0); // Prevent edge artifacts
            float w = 1.0 - length(offset) * 2.0;
            sum += texture(prevFrame, sampleUV).rgb * w;
            weight += w;
        }
    }

    vec3 avg = sum / max(weight, 0.001); // Prevent division by zero
    return vec4(avg, dot(avg, vec3(0.299, 0.587, 0.114)));
}

// Update crystalPattern for cleaner color transitions
float crystalPattern(vec3 p) {
    vec2 uv = p.xy * 0.5 + 0.5;
    uv = fract(uv);
    vec4 neighborhood = sampleNeighborhood(uv, 2.0);

    // Create centered flow
    vec2 centered = p.xy;
    vec2 flow = flowNoise(centered);

    // Gentler neighborhood influence
    vec2 neighborFlow = (neighborhood.xy - 0.5) * EVOLUTION_RATE * 0.3;
    flow = mix(flow, neighborFlow, WAVE_COHERENCE * 0.3);

    // Tighter bounds on flow
    flow = clamp(flow, -0.3, 0.3);
    p.xy += flow;

    float pattern = length(p.xy) - 0.5;
    pattern = smoothstep(0.0, 0.8, abs(pattern));

    return pattern;
}

// Add wave color function
vec3 getWaveColor(float pattern, float dist) {
    // Convert pattern to HSL for better control
    vec3 waveHSL = vec3(
        BASE_HUE + pattern * 0.2,           // Slight hue variation
        0.4 + pattern * 0.3,                // Moderate saturation
        0.3 + pattern * 0.3                 // Controlled brightness
    );

    // Ensure colors stay in safe range
    waveHSL.y = clamp(waveHSL.y, 0.2, 0.7);
    waveHSL.z = clamp(waveHSL.z, 0.2, 0.6);

    return hsl2rgb(waveHSL);
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
vec3 getRippleColor(vec2 uv, float pattern, float t) {
    vec2 distortedUv = uv + vec2(
        sin(uv.x * 10.0 + t) * 0.02,
        cos(uv.y * 10.0 + t) * 0.02
    ) * pattern;

    vec3 prevColor = texture(prevFrame, distortedUv).rgb;
    vec3 rippleColor = generateColor(pattern + t * 0.1, 0.5);

    float fadeOut = 1.0 - pattern;
    return mix(prevColor, rippleColor, fadeOut * 0.5);
}

// Add missing lighting defines
#define LIGHT_POS vec3(2.0, -1.0, 2.0)
#define AMBIENT 0.2
#define SPECULAR_POWER 16.0
#define SPECULAR_INTENSITY 0.8

// Fix applyPhongLighting function
vec3 applyPhongLighting(vec3 baseColor, vec3 normal, vec2 uv) {
    vec3 lightDir = normalize(LIGHT_POS);
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));

    float diff = max(dot(normal, lightDir), 0.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), SPECULAR_POWER);

    vec3 ambient = AMBIENT * baseColor;
    vec3 diffuse = diff * baseColor;
    vec3 specular = SPECULAR_INTENSITY * spec * vec3(1.0);

    return ambient + diffuse + specular;
}

// Add this helper function for Phong shading
vec3 estimateNormal(vec2 uv, float pattern) {
    float eps = 0.01;
    float dx = crystalPattern(vec3((uv + vec2(eps, 0.0)) * 2.0, TIME * 0.08)) -
               crystalPattern(vec3((uv - vec2(eps, 0.0)) * 2.0, TIME * 0.08));
    float dy = crystalPattern(vec3((uv + vec2(0.0, eps)) * 2.0, TIME * 0.08)) -
               crystalPattern(vec3((uv - vec2(0.0, eps)) * 2.0, TIME * 0.08));

    return normalize(vec3(-dx, -dy, 0.2));
}

// Add these helper functions at the top
float getColorInterest(vec3 hsl) {
    // Measure how "interesting" a color is based on saturation and luminance
    float saturationWeight = smoothstep(0.2, 0.8, hsl.y);
    float luminanceBalance = 1.0 - abs(hsl.z - 0.5) * 2.0;
    // if y is 0 or 1, return 0
    if (hsl.y < 0.01 || hsl.y > 0.99) {
        return 0.0;
    }
    if (hsl.z < 0.01 || hsl.z > 0.99) {
        return 0.0;
    }
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

// Add mutation function
vec3 applyRandomMutation(vec2 uv, vec3 currentColor) {
    // Only mutate some pixels based on random value and mutation rate
    float shouldMutate = step(random(uv + TIME * 0.1), MUTATION_RATE);
    shouldMutate = frame % 100 == 0 ? 1.0 : 0.0;

    if(shouldMutate > 0.0) {
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

    // Fix aspect ratio uniformly
    vec2 centered_uv = (fragCoord.xy - 0.5 * resolution.xy) / min(resolution.x, resolution.y);

    // Calculate flow and pattern first
    vec2 flow = flowNoise(centered_uv) * 0.2;
    vec3 p = vec3(centered_uv * 2.0 + flow, TIME * 0.08);
    float pattern = crystalPattern(p);

    // Calculate pattern gradients for rim and edge effects
    float eps = 0.02;
    vec2 offset = vec2(eps, 0.0);
    float patternRight = crystalPattern(vec3((centered_uv + offset.xy) * 2.0 + flow, TIME * 0.08));
    float patternUp = crystalPattern(vec3((centered_uv + offset.yx) * 2.0 + flow, TIME * 0.08));

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

    // Apply random mutations
    color = applyRandomMutation(uv, color);

    fragColor = vec4(color, 1.0);
}
