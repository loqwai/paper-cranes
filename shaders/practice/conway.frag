#define CELL_SIZE 10.
vec4 getLastColor(vec2 uv){
    vec2 sampleUv=uv/2.;
    sampleUv+=.5;
    return getLastFrameColor(sampleUv);
}
bool isAlive(vec4 color){
    return color.g > 0.75;
}
vec4 play(vec4 last) {
    vec2 uv = gl_FragCoord.xy;

    // Count alive neighbors (consider edge cases)
    int aliveCount = 0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            if (i == 0 && j == 0) {
                continue; // Exclude the center cell
            }

            vec2 offset = vec2(i, j);
            vec2 neighborUv = uv + offset * CELL_SIZE;
            neighborUv = fract(neighborUv);
            vec4 neighborColor = getLastFrameColor(neighborUv);
            if (isAlive(neighborColor)) {
                aliveCount++;
            }
            aliveCount++;
        }
    }

    // Apply Conway's Game of Life rules
    if (isAlive(last)) {
        if (aliveCount < 2) { // Underpopulation
            return vec4(0.0, 0.0471, 0.949, 1.0);
        } else if (aliveCount > 5) { // Overpopulation
            return vec4(0.7647, 0.0431, 0.8157, 1.0);
        } else { // Stays alive
            return vec4(0.0, 1.0, 0.0, 1.0);
        }
    } else {
        if (aliveCount == 3) { // Reproduction
            return vec4(0.0, 0.8118, 0.2431, 1.0);
        } else { // Stays dead
            return vec4(1.0, 0.0, 0.0, 1.0);
        }
    }
}


vec4 init(vec2 st){
    vec2 ipos = floor(st*CELL_SIZE);
    vec2 fpos = fract(st*CELL_SIZE);
    vec4 color = vec4(0.0);
    if (random(ipos) > 0.9) {
        color = vec4(1.0);
    }
    return color;
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy/resolution.xy;

    if(frame < 2){
        fragColor = init(uv);
        return;
    }
    fragColor = getLastFrameColor(uv);
}
