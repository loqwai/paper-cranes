/*
by Dom Mandy in 2024
*/
uniform float knob_1;
uniform float knob_2;
uniform float knob_3;

// 1.24 to 8.73
#define A  max(mapValue(spectralCentroid, 0., 1., 0.74,11.33),0.01)
// 0.05 to 0.2
#define B mapValue(spectralRoughnessZScore, -1.,1.,0.05,0.2)

// -0.92 to -0.22
#define D mapValue(spectralFlux, 0., 1., -0.92,-.22)
// .23 2.
void mainImage(out vec4 P, vec2 V) {
    vec2 uv = (2.0 * V - iResolution.xy) / min(iResolution.x, iResolution.y);

    float angle = iTime * 0.05;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    uv = rot * uv;

    float r = length(uv);
    float falloff = 1.0 - smoothstep(0.8, 1.0, r);

    // Add damping to prevent sudden changes
    float dampedD = D * (0.5 + 0.5 * cos(angle));

    vec4 last = getLastFrameColor(uv);
    V = uv * (1.0 + dampedD * falloff);

    float v, x, y;
    float z = 9.0;
    vec2 bestV = V;

    for (int k = 0; k < 50; k++) {
        // Smooth out the angle calculation
        float a = atan(V.y, V.x) * (1.0 - float(k) / 50.0);
        float d = max(dot(V, V) * A, 1e-6);

        // Add smoothing to prevent sharp transitions
        float smooth_d = mix(d, last.r, 0.3);
        float c = dot(V, vec2(a, log(smooth_d) / 2.));

        float expTerm = clamp(-a * V.y, -10.0, 10.0);
        float powTerm = clamp(pow(smooth_d, V.x / 2.), -1e3, 1e3);

        V = exp(expTerm) * powTerm * vec2(cos(c), sin(c));

        // Smooth out the squared terms
        float xx = V.x * V.x;
        float yy = V.y * V.y;
        V = vec2(xx - yy, 2.0 * V.x * V.y) * (1.0 - float(k) / 100.0);

        // Smooth feedback
        V -= uv * B * falloff * (0.5 + 0.5 * cos(angle));

        x = (k == 0) ? abs(V.x) : min(x, abs(V.x));
        y = (k == 0) ? abs(V.y) : min(y, abs(V.y));

        float newV = dot(V, V);
        if (k == 0 || newV < z) {
            z = newV;
            bestV = V;
        }
    }

    z = 1. - smoothstep(1., -6., log(max(y, 1e-6))) * smoothstep(1., -6., log(max(x, 1e-6)));

    // Smooth the final color calculation
    vec4 colorPhase = vec4(0, 2.1, 4.2, 0);
    P = sqrt(z + (z - z * z * z) * cos(atan(bestV.y, bestV.x) - colorPhase));

    // Smooth transition with temporal and spatial damping
    float mixFactor = 0.1 * falloff * (0.5 + 0.5 * cos(angle));
    P = mix(last, P, mixFactor);
}
