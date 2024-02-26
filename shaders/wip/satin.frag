void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float mr = min(iResolution.x, iResolution.y);
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / mr;
    // rotate uv around center by time
    uv *= mat2(cos(time/10.), -sin(time/10.), sin(time/10.), cos(time/10.));
    float d = -time;
    float a = 0.0;
    for (float i = 0.0; i < 8.0+(spectralRoughness*10.); ++i) {
        a += cos(i - d - a * uv.x);
        d += sin(uv.y * i + a);
    }
    d += iTime * 0.5;
    vec3 col = vec3(cos(uv * vec2(d, a)) * spectralCentroidMedian + 0.4, cos(a + d) * 0.5 + 0.5);
    col = cos(col * cos(vec3(d, a, spectralCentroidMedian+1.5)) * 0.5 + 0.5);
    vec3 hsl = rgb2hsl(col);
    hsl.x = fract(hsl.x+spectralCentroid);
    hsl.y = fract(hsl.y + (spectralKurtosisMedian/14.));
    hsl.z = fract(hsl.z - energyMedian);
    // if hsl is too gray, make it black
    if (hsl.y < abs(energyMedian)) {
        vec3 hsl = vec3(0.);
        // get the average color of the pixels around this one last frame.
        for(float i = 0.0; i < spectralSpread*5.+10.; i++) {
            hsl += rgb2hsl(getLastFrameColor(uv + vec2(cos(i+spectralRoughness), sin(i+spectralRoughness))).rgb);
        }
        hsl /= 8.0;
        hsl.z /= 2.0;
    }
    // if it's still too gray, crank up the saturation
    if (hsl.y < 0.3) {
        // rotate the hue slightly
        hsl.x = fract(hsl.x + spectralFluxMedian);
        hsl.y = 0.5;
    }
    col = hsl2rgb(hsl);
    // col = mix(getLastFrameColor(uv).rgb*0.9, col, 0.3);
    fragColor = vec4(col,1.0);
}
