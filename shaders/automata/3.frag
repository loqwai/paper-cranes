uniform float cell_size;
#define CELL_SIZE cell_size
#define WRAP(value, max) mod(value, max)

bool isAlive(vec4 color) {
    // Adjust alive threshold based on spectralRoughnessZScore
    return color.g > 0.75 + 0.05 * spectralRoughnessZScore;
}
// Dynamic cell color based on spectralCentroid
vec4 dynamicCellColor(float c) {
    float normalizedCentroid = (c - spectralCentroidMin) / (spectralCentroidMax - spectralCentroidMin);
    return vec4(normalizedCentroid, 0.9608, 1.0 - normalizedCentroid, 1.0);
}

vec2 mapMusicFeatureToUV(float zScore1, float zScore2) {
    return vec2(mapValue(zScore1, -3., 3., 0., 1.), mapValue(zScore2, -3., 3., 0., 1.));
}

vec4 play(vec2 uv) {
    vec2 lastUv = floor(uv * CELL_SIZE) / CELL_SIZE + 0.5 / CELL_SIZE;
    vec4 last = getLastFrameColor(lastUv);

    //rotate uv over time
    uv -= 0.5;
    float s = sin(iTime);
    float c = cos(iTime);
    mat2 rotation = mat2(c, -s, s, c);
    uv = rotation * uv + 0.5;
    // Modify game rules based on energy
    int underpopulationThreshold = beat ? 1 : 2;
    int overpopulationThreshold = beat ? 4 : 3;
    int reproduction = beat ? 2 : 3;
    // Alive and dead checks remain unchanged

    vec2 aliveUv1 = mapMusicFeatureToUV(spectralCentroidZScore, energyZScore);
    vec2 aliveUv2 = mapMusicFeatureToUV(spectralKurtosisZScore, spectralRoughnessZScore);
    if (distance(uv, aliveUv1) < 0.01 || distance(uv, aliveUv2) < 0.01) {
        return vec4(0.8157, 0.9608, 0.0, 1.0);
    }

    vec2 deadUv = mapMusicFeatureToUV(spectralSkewZScore, spectralSpreadZScore);
    if (distance(uv, deadUv) < 0.01) {
        return vec4(1.0, 0.0, 1.0, 1.0);
    }

    // Game logic remains the same, but thresholds are now dynamic
    int aliveCount = 0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            if (i == 0 && j == 0) continue;
            vec2 neighborUv = WRAP(lastUv + vec2(i, j) / CELL_SIZE, 1.0);
            if (isAlive(getLastFrameColor(neighborUv))) {
                aliveCount++;
            }
        }
    }

    if (isAlive(last)) {
        if (aliveCount < underpopulationThreshold) return dynamicCellColor(spectralCentroid);
        else if (aliveCount > overpopulationThreshold) return vec4(0.7647, 0.0431, 0.8157, 1.0);
        else return last; // Keep the cell alive with its current color
    } else {
        return (aliveCount == reproduction) ? dynamicCellColor(spectralCentroid) : last * (beat ? 0.9 : 0.75);
    }
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    fragColor = play(uv);
}
