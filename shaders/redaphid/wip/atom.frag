void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 S = iResolution.xy;
    vec2 t = (fragCoord + fragCoord - S) / S.y / 0.9;
    float a = sin(iTime * 0.35)/10.;
    float r = 0.5;

    fragColor = vec4(0.0);

    for (int i = 0; i < 300; i++, r+=0.8) {
        vec2 displacement = vec2(sin(a + r) * cos(r / 4.0 + a * 0.5), sin(r / 4.0 + a * 0.5) * cos(a + r + iTime));
        float len = length(t + displacement);
        float value = pow(0.0006 / abs(len * cos(r * 0.005 + a) - sin(r * a * 1.0) * 0.015), 1.04);
        vec4 color = vec4(1.0 + cos(r + r * a * 0.5 + length(t) * 6.0 + vec4(0.0, 1.0, 2.0, 0.0)));
        fragColor += value * color;
    }

}
