
// #pragma glslify: import(./includes/shadertoy-compat)
// Fork of "Flowing Wires [471 chars]" by kishimisu. https://shadertoy.com/view/DsBczR
// 2024-02-06 07:15:17

/* Flowing Wires by @kishimisu (2023) - https://www.shadertoy.com/view/DsBczR

   This is actually a 3D truchet pattern (with 1 tile and no variation)

   This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en)
*/
uniform float knob_1;
#define r(a) mat2(cos(a + vec4(0,33,11,0)))

//knob_1 should be from 0-.23

#define s(p) ( q = p,                                    \
    d = length(vec2(length(q.xy += .5)-.5, q.z)) - mapValue(energyZScore, -1., 4.5, 0., .23),  \
    q.yx *= r(round((atan(q.y,q.x)-T) * (1.-spectralRoughnessNormalized)) / (1.-spectralRoughnessNormalized) + T), \
    q.x -= .5,                                           \
    O += (sin(t+T)*.1+.1)*(1.+cos(t+T*.5+vec4(0,spectralCentroidMedian*20.,2,0))) \
         / (.5 + pow(length(q)*(200.-((energyZScore+1.5)*50.)), 1.3))            , d ) // return d

void mainImage(out vec4 O, vec2 F) {
    vec3  p, q,    R = iResolution;
    float i, t, d, T = time;

    for (O *= i, F += F - R.xy; i++ < 28.;          // raymarch for 28 iterations

        p = t * normalize(vec3(F*r(t*.1), R.y)),    // ray position
        p.zx *= r(T/4.), p.zy *= r(T/3.), p.x += T, // camera movement

        t += min(min(s( p = fract(p) - .5 ),        // distance to torus + color (x3)
                     s( vec3(-p.y, p.zx)  )),
                     s( -p.zxy            ))
    );
}
// #pragma glslify:import(./includes/shadertoy-compat-main)
