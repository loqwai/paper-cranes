uniform float knob_1;
uniform float knob_2;
#define KNOB_1 15. / 100. + spectralRoughnessNormalized/3.


void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 S = iResolution.xy;
    vec2 t = (fragCoord + fragCoord - S) / S.y / 0.9;
    vec2 uv = fragCoord.xy/iResolution.xy;
    float a = sin(iTime + spectralCrestMedian)/100.;
    float r = spectralRolloffMedian*atan(iTime*spectralSpreadZScore*uv.x);

    fragColor = vec4(0.0);

    for (int i = 0; i < 250 + int(spectralRoughnessZScore * 50.); i++, r+=spectralSkewMedian-(1./float(i))) {
        vec2 displacement = vec2(sin(a + r) * cos(r / KNOB_1 + a * 0.5), sin(r / KNOB_1 + a * 0.5) * cos(a + r + spectralCrestZScore/100.));
        float len = length(t + displacement);
        float value = pow(0.003 / abs(len * cos(r * a/100.) - sin(r * a) * spectralKurtosisZScore/10.), 1.04);
        vec4 color = vec4(1.0 + cos(r + r * a * 0.5 + length(t) * spectralCentroidZScore * 16. + vec4(0.0, 1.0, spectralCentroidZScore * 16., 0.0)));
        vec4 originalColor = color;

        vec4 prevColor = getLastFrameColor(uv);
        vec3 hsl = rgb2hsl(originalColor.rgb);

        color.rgb = hslmix(color.rgb, prevColor.rgb, 1.- hsl.z -(spectralRoughnessNormalized/200.));
        color *=value/5.;

        fragColor += value * color;
    }
    fragColor.a = 1.;

}
