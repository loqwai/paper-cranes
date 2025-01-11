uniform float knob_13;
uniform float knob_14;
uniform float knob_15;
uniform float knob_16;
uniform float knob_17;
#define EPSILON 0.0000001
#define PROBE_1 mix(1.,1.4,spectralRoughnessNormalized)+EPSILON
#define PROBE_2 mix(0.60,2.,spectralFluxNormalized)+EPSILON
#define PROBE_3 mix(-1.5,10.,pitchClassMedian)+EPSILON
#define PROBE_4 mix(1.,11.,trebleNormalized)+EPSILON
#define PROBE_5 mix(0.47,0.97,spectralKurtosisNormalized)+EPSILON
#define PROBE_6 mix(0.4,0.2,energyNormalized)+EPSILON
#define CELL_SIZE 32.0

vec2 mapMusicFeatureToUV(float zScore1, float zScore2) {
    return vec2(
        clamp(mix(-1.0, 1.0, zScore1), -1.0, 1.0),
        clamp(mix(-1.0, 1.0, zScore2), -1.0, 1.0)
    );
}

vec4 generateFractalSquare(vec2 uv) {
    // Create grid-based pattern similar to automata shaders
    vec2 cell = floor(uv * CELL_SIZE);
    vec2 cellUv = fract(uv * CELL_SIZE);

    // Create multiple feature points based on audio
    vec2 point1 = mapMusicFeatureToUV(spectralCentroidZScore, energyZScore);
    vec2 point2 = mapMusicFeatureToUV(spectralKurtosisZScore, spectralRoughnessZScore);
    vec2 point3 = mapMusicFeatureToUV(spectralSpreadZScore, spectralSkewZScore);

    // Calculate distances to feature points
    float d1 = length(cellUv - point1);
    float d2 = length(cellUv - point2);
    float d3 = length(cellUv - point3);

    // Create pattern based on distances
    float pattern = min(min(d1, d2), d3);

    // Color based on pattern and audio features
    vec4 color = vec4(
        mix(0.2, 0.8, smoothstep(0.0, 1.0, d1)),
        mix(0.1, 0.6, smoothstep(0.0, 1.0, d2)),
        mix(0.3, 0.9, smoothstep(0.0, 1.0, d3)),
        1.0
    );

    // Add variation based on cell position
    color.rgb *= 0.8 + 0.2 * sin(cell.x * 0.1) * cos(cell.y * 0.1);

    return color;
}

vec2 applyPeriodicTransformationAndTraps(vec2 position, vec2 multiplier) {
    position = clamp(position, -10.0, 10.0);
    position = 0.5 * sin(multiplier * position / (dot(position, position) + 0.1) * PROBE_5);
    return position;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 resolution = iResolution.xy;
    vec2 multiplier = vec2(PROBE_1, PROBE_2);

    // Normalize coordinates
    vec2 uv = fragCoord.xy / resolution.xy;
    uv = uv * 2.0 - 1.0; // Center UV
    uv *= PROBE_6; // Apply zoom

    // Generate base pattern
    vec4 basePattern = generateFractalSquare(uv);
    fragColor = basePattern;

    // Apply transformations
    vec2 transformedUv = uv;
    for (int i = 0; i < 20; i++) {
        transformedUv = applyPeriodicTransformationAndTraps(transformedUv, multiplier);
        vec4 transformedPattern = generateFractalSquare(transformedUv);
        fragColor = mix(fragColor, transformedPattern, 0.2);
    }

    // Beat reaction
    if (beat) {
        fragColor = mix(fragColor, fragColor * 1.2, 0.3);
    }

    fragColor = clamp(fragColor, 0.0, 1.0);
}
