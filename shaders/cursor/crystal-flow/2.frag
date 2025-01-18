// Simple uniform aliases with basic math
#define FLOW_SPEED (spectralFluxZScore)
#define CRYSTAL_SCALE (spectralCentroidZScore)
#define ENERGY (energyNormalized)
#define ROUGHNESS (spectralRoughnessNormalized)
#define BASE_HUE (spectralCentroidMedian)
#define HUE_VARIATION (spectralSpreadZScore * 0.1)
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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    vec2 centered_uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;

    // Add flowing displacement to the UV coordinates
    vec2 flow = flowNoise(centered_uv) * 0.2;
    vec3 p = vec3(centered_uv * 2.0 + flow, time * 0.08);
    float pattern = crystalPattern(p);

    vec2 flowVec = getFlowVector(uv, pattern);

    // Sample previous frame with flowing offsets
    vec2 flowOffset = flowNoise(uv * 2.0) * 0.1;
    vec3 prevSample1 = samplePrevious(uv, flowVec * 0.8 + flowOffset);
    vec3 prevSample2 = samplePrevious(uv, -flowVec * 0.4 - flowOffset);
    vec3 prevSample3 = samplePrevious(uv + flowOffset * 2.0, flowVec * 0.5);

    vec3 prevColor = mix(
        prevSample1,
        mix(prevSample2, prevSample3, 0.5),
        0.5
    );

    // Generate distinct palettes for background and foreground
    vec3 bgBase = generateColor(BASE_HUE, 0.2);
    vec3 fgBase = generateColor(BASE_HUE, 0.7); // Offset phase for contrast

    // Create background with subtle variation
    vec3 bgColor = mix(
        generateColor(BASE_HUE, 0.1),
        generateColor(BASE_HUE + 0.2, 0.3),
        sin(time * 0.1 - pattern * 2.0) * 0.3 + 0.3
    );

    // Create more vibrant foreground
    vec3 fgColor = mix(
        generateColor(BASE_HUE + HUE_VARIATION, 0.6),
        generateColor(BASE_HUE + HUE_VARIATION * 2.0, 0.8),
        sin(time * 0.2 + pattern * 3.0) * 0.5 + 0.5
    );

    // Ensure foreground pattern stands out
    float foregroundPattern = smoothstep(0.4, 0.8, pattern);
    float backgroundPattern = smoothstep(0.0, 0.3, pattern);

    // Calculate rim lighting based on pattern gradient
    float rim = 0.0;
    float eps = 0.02;
    vec2 offset = vec2(eps, 0.0);

    // Sample pattern at nearby points to detect edges
    float patternRight = crystalPattern(vec3((centered_uv + offset.xy) * 2.0 + flow, time * 0.08));
    float patternUp = crystalPattern(vec3((centered_uv + offset.yx) * 2.0 + flow, time * 0.08));

    // Calculate gradient for edge detection
    vec2 grad = vec2(
        patternRight - pattern,
        patternUp - pattern
    ) / eps;

    // Create rim effect based on gradient magnitude
    rim = smoothstep(0.2, 0.8, length(grad));
    rim = pow(rim, 1.5) * (1.0 + ENERGY * 2.0);

    // Generate rim lighting color
    vec3 rimColor = generateColor(BASE_HUE + 0.3, 0.2) * vec3(1.4, 1.3, 1.2);

    // Combine layers with rim lighting
    vec3 color = mix(
        bgColor * vec3(0.4, 0.5, 0.7),    // More saturated background
        fgColor * vec3(1.2, 1.1, 1.0),    // Brighter, warmer foreground
        foregroundPattern
    );

    // Add plasma glow at edges
    color += rimColor * rim * 1.2;

    // Add inner glow
    float innerGlow = (1.0 - rim) * foregroundPattern * ENERGY;
    color += rimColor * 0.3 * innerGlow;

    // Add highlights only to foreground elements
    float highlight = pow(foregroundPattern, 2.0) * ENERGY * 0.3;
    vec3 highlightColor = generateColor(BASE_HUE + 0.5, 0.9);

    // Enhance highlights with rim lighting
    color += highlightColor * highlight *
        sin(time * 1.5 + uv.x * 12.0 + uv.y * 10.0) *
        (foregroundPattern + rim * 0.5);

    // Add subtle refraction in the rim areas
    vec2 refractionOffset = grad * rim * 0.02;
    vec3 refractedColor = samplePrevious(uv + refractionOffset, flowVec * 0.5);
    color = mix(color, refractedColor, rim * 0.3);

    // Feedback blend with reduced intensity
    float feedbackAmt = mix(0.5, 0.7, ENERGY) * (1.0 + FLOW_SPEED * 0.1);
    color = mix(prevColor, color, feedbackAmt);

    // Enhanced beat response with rim emphasis
    if(beat) {
        vec3 beatColor = generateColor(BASE_HUE + 0.25, 0.5);
        color = mix(
            color,
            beatColor,
            (ENERGY * 0.2 * foregroundPattern + rim * 0.3)
        );
    }

    // Adjust brightness ranges to account for rim lighting
    float bgMin = 0.1;
    float bgMax = 0.3 + rim * 0.2;
    float fgMin = 0.35;
    float fgMax = 0.7 + rim * 0.3;

    // Apply brightness ranges based on pattern
    vec3 finalColor = mix(
        clamp(color, vec3(bgMin), vec3(bgMax)),
        clamp(color, vec3(fgMin), vec3(fgMax)),
        foregroundPattern
    );

    fragColor = vec4(finalColor, 1.0);
}
