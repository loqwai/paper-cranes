// @favorite: true
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
    vec2 Z = iResolution.xy,
         C = .6 * (Z - V - V).yx / Z.y;
    C.x += .77;
    V = C*D;

    float v, x, y,
          z = y = x = 9.;

    for (int k; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * A;
        float c = dot(V, vec2(a, log(d) / 2.));
        V = exp(-a * V.y) * pow(d, V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * B;

        x = min(x, abs(V.x));
        y = min(y, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;
    }

    z = 1. -  smoothstep(1., -6., log(y)) * smoothstep(1., -6., log(x));
    P = sqrt(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)));
}
