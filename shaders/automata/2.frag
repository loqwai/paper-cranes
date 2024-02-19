uniform float cell_size;
#define CELL_SIZE cell_size
#define WRAP(value, max) mod(value, max) // Ensure values wrap around using modulo

bool isAlive(vec4 color) {
    return color.g > 0.75;
}

vec2 mapMusicFeatureToUV(float zScore1, float zScore2) {
    return vec2(mapValue(zScore1, -3., 3., 0., 1.), mapValue(zScore2, -3., 3., 0., 1.));
}

vec4 play(vec2 uv) {
    vec2 gridUv = uv * resolution.xy / CELL_SIZE;
    vec2 wrappedGridUv = WRAP(gridUv, resolution.xy / CELL_SIZE); // Wrap grid coordinates
    vec2 lastUv = floor(wrappedGridUv) / (resolution.xy / CELL_SIZE) + 0.5 / (resolution.xy / CELL_SIZE);
    vec4 last = getLastFrameColor(lastUv);

    // Check if the cell should be made alive based on music features.
    vec2 aliveUv1 = mapMusicFeatureToUV(spectralCentroidZScore, energyZScore);
    vec2 aliveUv2 = mapMusicFeatureToUV(spectralKurtosisZScore, spectralRoughnessZScore);
    if (distance(uv, aliveUv1) < 0.01 || distance(uv, aliveUv2) < 0.01) {
        return vec4(0.8157, 0.9608, 0.0, 1.0); // Alive based on music features.
    }

    vec2 deadUv = mapMusicFeatureToUV(spectralSkewZScore, spectralSpreadZScore);
    if (distance(uv, deadUv) < 0.01) {
        return vec4(1.0, 0.0, 1.0, 1.0); // Dead based on music features.
    }

    int aliveCount = 0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            if (i == 0 && j == 0) continue;
            vec2 neighborGridUv = wrappedGridUv + vec2(i, j);
            vec2 wrappedNeighborUv = WRAP(neighborGridUv, resolution.xy / CELL_SIZE);
            vec2 neighborUv = floor(wrappedNeighborUv) / (resolution.xy / CELL_SIZE) + 0.5 / (resolution.xy / CELL_SIZE);
            if (isAlive(getLastFrameColor(neighborUv))) {
                aliveCount++;
            }
        }
    }

    // Simplify game rules with music influence.
    if (isAlive(last)) {
        if (aliveCount < (beat ? 1 : 2)) return vec4(0.0, 0.0471, 0.949, 1.0);
        else if (aliveCount > (beat ? 5 : 3)) return vec4(0.7647, 0.0431, 0.8157, 1.0);
        else return vec4(0.0, 1.0, 0.0, 1.0);
    } else {
        return (aliveCount == 3) ? vec4(0.0, 0.8118, 0.2431, 1.0) : last * (beat ? 0.9 : 0.75);
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    fragColor = play(uv);
}
