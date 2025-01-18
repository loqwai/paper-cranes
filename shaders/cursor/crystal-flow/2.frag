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

    // Coraline-inspired color palette
    vec3 darkBlue = vec3(0.65, 0.8, 0.25);    // Deep midnight blue
    vec3 purple = vec3(0.75, 0.7, 0.3);        // Rich purple
    vec3 teal = vec3(0.45, 0.75, 0.3);         // Dark teal
    vec3 warmAccent = vec3(0.08, 0.85, 0.4);   // Warm amber accent

    // Slow base palette evolution
    float paletteShift = time * 0.1 + BASE_HUE * 2.0;

    // Create dynamic color blends based on pattern and audio
    vec3 color1 = mix(darkBlue, purple,
        sin(paletteShift + pattern * 3.0) * 0.5 + 0.5);
    vec3 color2 = mix(teal, warmAccent,
        cos(paletteShift * 0.7 + pattern * 2.0) * 0.5 + 0.5);

    // Layer-based color mixing
    float colorMix = smoothstep(0.3, 0.7, pattern);
    vec3 color = mix(
        hsl2rgb(color1),
        hsl2rgb(color2),
        colorMix
    );

    // Add subtle iridescent highlights
    float highlight = pow(pattern, 2.0) * ENERGY * 0.4;
    vec3 highlightColor = vec3(
        mod(BASE_HUE + 0.5, 1.0),  // Complementary hue
        0.7,                        // Medium saturation
        0.8                         // Bright value
    );
    color += hsl2rgb(highlightColor) * highlight *
        sin(time * 1.5 + uv.x * 12.0 + uv.y * 10.0);

    // Feedback blend
    float feedbackAmt = mix(0.6, 0.8, ENERGY) * (1.0 + FLOW_SPEED * 0.1);
    color = mix(prevColor, color, feedbackAmt);

    // Enhanced beat response with palette accent
    if(beat) {
        vec3 beatColor = hsl2rgb(warmAccent);
        color = mix(
            color,
            beatColor,
            ENERGY * 0.2
        );
    }

    // Tighter color range control
    float minBright = mix(0.1, 0.2, spectralEntropyMedian);
    float maxBright = mix(0.6, 0.7, 1.0 - COLOR_INTENSITY);
    color = clamp(color, vec3(minBright), vec3(maxBright));

    fragColor = vec4(color, 1.0);
}
