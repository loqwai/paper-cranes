https://visuals.beadfamous.zcom/edit?cell_size=1000&cell_size.min=-3&cell_size.max=3
uniform float cell_size;
#define CELL_SIZE cell_size
#define WRAP(value, max) mod(value, max)

bool isAlive(vec4 color) {
    return color.g > 0.75;
}

vec2 mapMusicFeatureToUV(float zScore1, float zScore2) {
    return vec2(mapValue(zScore1, -1., 1., 0., 1.), mapValue(zScore2, -1., 1., 0., 1.));
}

vec4 play(vec2 uv) {
    // Adjust uv to wrap around the screen edges correctly
    uv = WRAP(uv, 1.0); // Ensure UV coordinates wrap around the screen edges
    vec2 lastUv = floor(uv * CELL_SIZE) / CELL_SIZE + 0.5 / CELL_SIZE;
    vec4 last = getLastFrameColor(lastUv);

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

    int aliveCount = 0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            if (i == 0 && j == 0) continue;
            vec2 neighborUv = lastUv + vec2(i, j) / CELL_SIZE;
            neighborUv = WRAP(neighborUv, 1.0); // Wrap the neighbor's UV coordinates
            if (isAlive(getLastFrameColor(neighborUv))) {
                aliveCount++;
            }
        }
    }

    // Game rules with music influence
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
