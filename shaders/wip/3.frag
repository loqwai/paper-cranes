uniform float knob_1;

#define A (energy+1.)
#define B (energyNormalized+1.)
#define M energyZScore/10.
#define C spectralEntropy*1.5
#define D energyNormalized
#define CELL_SIZE 100.
#define WRAP(value, max) mod(value, max)
#define last getLastFrameColor
vec4 init(vec2 uv) {
    float r = random(uv);
    if(r < 0.001) {
        return vec4(1.);
    }
    return vec4(0.);
}
vec4 render(vec2 uv) {
    if(frame == 0) {
        return init(uv);
    }
    vec2 lastUv = floor(uv * CELL_SIZE) / CELL_SIZE + 0.5 / CELL_SIZE;
    vec3 current = last(uv).rgb;
    if(energyZScore * random(uv) > 0.04) {
        return vec4(1.);
    }
      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            if (i == 0 && j == 0) continue;
            vec2 neighborUv = lastUv + vec2(i, j)/100.;
            neighborUv = WRAP(neighborUv, 1.0); // Wrap the neighbor's UV coordinates
            if(last(neighborUv).r > min((0.55 + iTime), 0.999)) {
                return vec4(1.)/2.;
            }
        }
    }

    return vec4(current*0.99, 1.);
}
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    // fix aspect ratio
    uv.x *= iResolution.x / iResolution.y;
    fragColor = render(uv);
}
