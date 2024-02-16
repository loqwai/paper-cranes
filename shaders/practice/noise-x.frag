#define distortEnable false
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
        } else if (aliveCount > 3) { // Overpopulation
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


vec2 truchetPattern(in vec2 _st, in float _index){
    _index = fract(((_index-0.5)*2.0));
    if (_index > 0.75) {
        _st = vec2(1.0) - _st;
    } else if (_index > 0.5) {
        _st = vec2(1.0-_st.x,_st.y);
    } else if (_index > 0.25) {
        _st = 1.0-vec2(1.0-_st.x,_st.y);
    }
    return _st;
}


void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 st = gl_FragCoord.xy/resolution.xy;

    st *= 10.; // Scale the coordinate system by 10
    vec2 ipos = floor(st);  // get the integer coords
    vec2 fpos = fract(st);  // get the fractional coords

    // Assign a random value based on the integer coord
    vec2 tile = truchetPattern(fpos, random( ipos ));

    float color = 0.0;
     color = smoothstep(tile.x-0.3,tile.x,tile.y)-
            smoothstep(tile.x,tile.x+0.3,tile.y);
    // Uncomment to see the subdivided grid
    // color = vec3(fpos,0.0);
    vec4 l = getLastColor(st);
    vec4 c = vec4(vec3(color),1.0);
    c = mix(l,c,0.01);
    fragColor = c;
}
