void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float mr = min(iResolution.x, iResolution.y);
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / mr;
    // rotate uv around center by time
    uv *= mat2(cos(iTime), -sin(iTime), sin(iTime), cos(iTime));
    float d = -time;
    float a = 0.0;
    for (float i = 0.0; i < 8.0; ++i) {
        a += cos(i - d - a * uv.x);
        d += sin(uv.y * i + a);
    }
    d += iTime * 0.5;
    vec3 col = vec3(cos(uv * vec2(d, a)) * spectralCentroidMedian + 0.4, cos(a + d) * 0.5 + 0.5);
    col = cos(col * cos(vec3(d, a, spectralCentroidZScore+1.5)) * 0.5 + 0.5);
    vec3 hsl = rgb2hsl(col);
    hsl.x = fract(hsl.x+spectralCentroidMedian);
    hsl.y = fract(hsl.y + (spectralKurtosisMedian/14.));
    hsl.z = fract(hsl.z - energyMedian);
    col = hsl2rgb(hsl);
    col = mix(getLastFrameColor(uv).rgb*0.9, col, 0.9);
    fragColor = vec4(col,1.0);
}
