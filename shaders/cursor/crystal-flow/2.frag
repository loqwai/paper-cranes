// Simple uniform aliases with basic math
#define FLOW_SPEED (spectralFluxZScore)
#define CRYSTAL_SCALE (spectralCentroidZScore)
#define ENERGY (energyNormalized)
#define ROUGHNESS (spectralRoughnessNormalized)
#define BASE_HUE (spectralCentroidMedian)
#define HUE_VARIATION (spectralSpreadZScore)
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

float crystalPattern(vec3 p) {
    p *= (2.2 + CRYSTAL_SCALE * 0.3);
    float pattern = 0.0;
    float basePattern = 0.15;

    for(int i = 0; i < 4; i++) {
        float scale = 1.0 + float(i) * (1.0 + HUE_VARIATION * 0.1);
        vec3 q = p * scale;

        float rotSpeed = FLOW_SPEED * 0.15 * (0.2 + float(i) * 0.08);
        q.xy *= rotate2D(time * rotSpeed);
        q.yz *= rotate2D(time * rotSpeed * 0.7);
        q.xz *= rotate2D(time * rotSpeed * 0.5);

        float xEdge = abs(sin(q.x * 2.0 + sin(q.z)));
        float yEdge = abs(sin(q.y * 2.0 + sin(q.x)));
        float zEdge = abs(sin(q.z * 2.0 + sin(q.y)));

        float crystal = max(
            max(xEdge * yEdge, yEdge * zEdge),
            xEdge * zEdge
        ) / scale;

        crystal = edge(crystal, 0.1);

        crystal *= 1.0 + ROUGHNESS * (
            sin(q.x * 3.0 + q.y * 2.0) *
            cos(q.y * 2.0 + q.z * 3.0)
        );

        crystal = smoothstep(0.35, 0.65, crystal);
        pattern = max(pattern, crystal * (1.0 - float(i) * 0.15));
    }

    return mix(basePattern, pow(pattern, 0.8), mix(0.3, 0.8, ENERGY));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    vec2 centered_uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;

    vec3 p = vec3(centered_uv * 2.5, time * 0.1);
    float pattern = crystalPattern(p);

    vec2 flowVec = getFlowVector(uv, pattern);

    vec3 prevSample1 = samplePrevious(uv, flowVec);
    vec3 prevSample2 = samplePrevious(uv, -flowVec * 0.5);
    vec3 prevSample3 = samplePrevious(uv + vec2(0.02), flowVec * 0.7);

    vec3 prevColor = mix(
        prevSample1,
        mix(prevSample2, prevSample3, 0.5),
        0.5
    );

    // Color generation
    float mainHue = mod(BASE_HUE + HUE_VARIATION * 0.2, 1.0);
    float accentHue = mod(mainHue + 0.5 + spectralRoughnessZScore * 0.1, 1.0);

    vec3 baseColor = vec3(
        mainHue,
        mix(0.6, 0.85, spectralSpreadMedian),
        mix(0.2, 0.7, pow(pattern, 1.2))
    );

    vec3 accentColor = vec3(
        accentHue,
        mix(0.5, 0.9, spectralCrestMedian),
        mix(0.3, 0.8, pow(pattern, 1.1))
    );

    float blendFactor = smoothstep(0.3, 0.6, pattern);
    vec3 color = mix(
        hsl2rgb(baseColor),
        hsl2rgb(accentColor),
        blendFactor
    );

    // Highlights
    float highlight = pow(pattern, 2.0) * ENERGY;
    color += vec3(0.06) * highlight *
        sin(time * 2.0 + uv.x * 15.0 + uv.y * 12.0);

    // Feedback blend
    float feedbackAmt = mix(0.4, 0.6, ENERGY) * (1.0 + FLOW_SPEED * 0.2);
    color = mix(prevColor, color, feedbackAmt);

    // Beat response
    if(beat) {
        vec3 beatColor = vec3(
            mod(mainHue + CRYSTAL_SCALE * 0.2, 1.0),
            mix(0.7, 0.9, ENERGY),
            0.8
        );

        color = mix(
            color,
            hsl2rgb(beatColor),
            ENERGY * 0.3
        );
    }

    // Color range control
    float minBright = mix(0.1, 0.2, spectralEntropyMedian);
    float maxBright = mix(0.8, 0.9, 1.0 - COLOR_INTENSITY);
    color = clamp(color, vec3(minBright), vec3(maxBright));

    fragColor = vec4(color, 1.0);
}
