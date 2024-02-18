#define CELL_SIZE 500.
#define MUSIC_THRESHOLD (beat ? 0.002: 0.001)
// Simplify the isAlive function to a single line for brevity.
bool isAlive(vec4 color) {
    return color.g > 0.35;
}

// Simplify the mapping of music features to UV coordinates.
vec2 mapMusicFeatureToUV(float zScore1, float zScore2) {
    return vec2(mapValue(zScore1, -2.5, 2.5, 0., 1.), mapValue(zScore2, -2.5, 2.5, 0., 1.));
}

// Simplify the play function by abstracting repetitive logic.
vec4 play(vec2 uv) {
    // rotate uv over time
    vec2 rotatedUV = uv;
    rotatedUV -= 0.5;
    rotatedUV *= mat2(cos(time/100.), -sin(time/100.), sin(time/100.), cos(time/100.));
    rotatedUV += 0.5;

    uv = rotatedUV;
    vec2 lastUv = floor(uv * CELL_SIZE) / CELL_SIZE + 0.5 / CELL_SIZE;
    vec4 last = getLastFrameColor(lastUv);

    // Check if the cell should be made alive based on music features.
    vec2 aliveUv1 = mapMusicFeatureToUV(spectralCentroidZScore, energyZScore);
    vec2 aliveUv2 = mapMusicFeatureToUV(spectralKurtosisZScore, spectralRoughnessZScore);
    vec2 aliveUv3 = mapMusicFeatureToUV(spectralSkewZScore, spectralSpreadZScore);
    if (distance(rotatedUV, aliveUv1) < MUSIC_THRESHOLD || distance(rotatedUV.yx, aliveUv2) < MUSIC_THRESHOLD || distance(rotatedUV, aliveUv3) < MUSIC_THRESHOLD){
        return vec4(0.8157, 0.9608, 0.0, 1.0); // Alive based on music features.
    }
    // Simplified neighbor count and game rules application.
    int aliveCount = 0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            if (i == 0 && j == 0) continue;
            vec2 neighborUv = lastUv + vec2(i, j) / CELL_SIZE;
            if (isAlive(getLastFrameColor(neighborUv))) {
                aliveCount++;
            }
        }
    }

    // Simplify game rules with music influence.
    if (isAlive(last)) {
        if(beat) return  vec4(0.5, 1.0, 0.5, 1.0);
        if (aliveCount < 2) return vec4(0.0, 0.0471, 0.949, 1.0);
        else if (aliveCount > 3) return  vec4(0.7647, 0.0431, 0.8157, 1.0);
        else return vec4(0.0, 1.0, 0.0, 1.0);
    } else {
        if(beat && aliveCount > 1) return vec4(0.0, 0.8118, 0.8431, 1.0);
        return (aliveCount == 3) ? vec4(0.0, 0.8118, 0.2431, 1.0) : last * (beat ? 0.75 : 0.5);
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    fragColor = play(uv);
}
