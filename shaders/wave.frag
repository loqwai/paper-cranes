#pragma glslify: import(./includes/full.frag)
#pragma glslify: import(./includes/shadertoy-compat)
/* "Wired" by @kishimisu (2024)

   I wonder what it's powering...
*/

#define r(a)    mat2(cos(a + vec4(0,33,11,0)));
#define R(p, T) p.yx *= r(round((atan(p.y, p.x) + T) * 1.91) / 1.91 - T)

void mainImage(out vec4 O, vec2 F) {
    float i, t, d, k = iTime/8.;

    for (O *= i; i < 35.; i++) {
        vec3 R = vec3(iResolution, 1.),
             p = t * normalize(vec3(F+F-R.xy, R.y));

        p.z  -= spectralRoughnessZScore + 3.;
        p.xz *= r(k+spectralEntropyZScore*2.)
        p.zy *= r(k+k)
        d = length(p) - sin(k+k)*spectralRolloffNormalized -spectralKurtosisNormalized;

        p.y  += sin(p.x*3. * cos(k+k) + k*4.) * sin(k)*.3;
        R(p, 0.)
        R(p.xz, k)
        p.x = mod(p.x + k*8., 2.) - 1.;

        t += d = min(d, length(p.yz) - (energyZScore/2.))*spectralCentroid;
        O += .01 * (1. + cos(t*.5 - k-k + vec4(0,1,2,0)))
                 / (1. + length(p)*4. - .02) + (.03 + sin(k)*.01) / (1. + d*24.);
    }
    vec3 hslBg = vec3(spectralCentroid,1.,0.8);

    O *= vec4(hsl2rgb(hslBg), 1.);
}
#pragma glslify:import(./includes/shadertoy-compat-main)
