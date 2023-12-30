#version 300 es
precision highp float;
uniform float time;
uniform float spectralCentroidNormalized;
uniform float spectralCentroidZScore;
uniform float spectralCentroid;
uniform float spectralCentroidMean;
uniform float spectralSkewMean;
uniform float spectralCrest;
uniform float energyNormalized;
uniform float spectralFluxNormalized;
uniform float spectralFluxMax;
uniform float spectralSpreadMax;
uniform float spectralSpreadZScore;
uniform float energyMax;
uniform float energyMin;
uniform float energyStandardDeviation;
uniform float energyMean;
uniform float energyZScore;
uniform float energy;
uniform float spectralEntropyMin;
uniform float spectralEntropyMax;
uniform float spectralEntropyMean;
uniform float spectralEntropy;
uniform float spectralRoughnessNormalized;
uniform vec2 resolution;
uniform bool beat;
out vec4 fragColor;

float sin01(float v) {
    return 0.5 + 0.5 * sin(v);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    uv -= vec2(0.5);
    uv.x *= resolution.x / resolution.y;

    float a = atan(uv.y, uv.x);
    float r = length(uv);

    //
    // Draw the white eye, modified with audio features
    //
    float reactBase = energyNormalized; // Replacing SOUND_MULTIPLIER with energyNormalized
    float nr = r + reactBase * 0.06 * sin01(a * 2.0 + time);
    float c = 1.0 - smoothstep(0.04, 0.07, nr);

    //
    // Draw the manypus, modified with audio features
    //
    uv = (fragCoord.xy / resolution.xy) * 2.0 - 1.0;
    float it = spectralEntropyMean*10.;
    float c1 = 0.0;
    for(float i = 0.0; i < it; i += 1.0) {
        float i01 = i / it;
        float rnd = spectralCentroidNormalized + spectralCentroidMean; // Using spectralCentroidNormalized for randomness

        float a = rnd * 3.1415;
        uv = uv * mat2(cos(a), -sin(a), sin(a), cos(a));

        float t = 0.3 * abs(1.0 / sin(uv.x * 3.1415 + sin(uv.y * 30.0 * rnd + time) * 0.13)) - 1.0;
        t *= 1.0 - smoothstep(0.3, 0.53, abs(uv.x));

        float base = 0.1 + reactBase;
        rnd *= 0.2;
        t *= 1.0 - smoothstep(base + rnd, base + 0.3 + rnd, abs(uv.y));

        c1 += t;
    }

    //
    // Calculate the final color
    //
    c1 = clamp(c1, 0.0, 1.0);
    vec3 armColor = vec3(sin(uv.x), sin(uv.y), sin(energyZScore));
    vec3 col = mix(vec3(energyMean,spectralSkewMean,spectralEntropyMean), armColor, c1 - c);
    col += c;
    fragColor = vec4(col, 1.0);
}

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}
