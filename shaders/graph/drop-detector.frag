uniform float knob_70;
#define LINE_WIDTH 20.0
#define SMOOTH_WIDTH 14.0
#define ULTRA_DROP_COUNT 4
#define PROBE_A 0.3
float smoothLine(vec2 fragCoord, float value ) {
    float d = abs(fragCoord.y - ((value+0.5) * resolution.y));
    return smoothstep(LINE_WIDTH + SMOOTH_WIDTH, LINE_WIDTH - SMOOTH_WIDTH, d);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    // Background - Shift everything to the left
    if (uv.x < 0.99) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x;

        // Apply a slight horizontal blur for smoother transitions
        vec4 color1 = getLastFrameColor(prevUV);
        vec4 color2 = getLastFrameColor(prevUV + vec2(1.0/resolution.x, 0.0));
        fragColor = mix(color1, color2, 0.99);
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }

    // Plot each feature with anti-aliased lines
    if (uv.x > 0.99) {
        vec4 lineColor = vec4(0.0);

        // Get both current and previous frame values for interpolation
        vec2 prevUV = vec2(uv.x - 1.0/resolution.x, uv.y);
        vec4 prevColor = getLastFrameColor(prevUV);

        // Blend current and previous values for smoother transitions
        float spectralCrestSmooth = mix(prevColor.r, spectralCrestZScore, PROBE_A);
        float spectralKurtosisSmooth = mix(prevColor.g, spectralKurtosisZScore, PROBE_A);
        float pitchClassSmooth = mix(prevColor.b, pitchClass, PROBE_A);
        float spectralEntropySmooth = mix(prevColor.y, spectralEntropyZScore, PROBE_A);

        lineColor += vec4(1.0, 0.0, 0.0, 1.0) * smoothLine(fragCoord, spectralCrestSmooth);
        lineColor += vec4(0.0, 1.0, 0.0, 1.0) * smoothLine(fragCoord, spectralKurtosisSmooth);
        lineColor += vec4(0.0, 0.0, 1.0, 1.0) * smoothLine(fragCoord, pitchClassSmooth);
        lineColor += vec4(1.0, 1.0, 0.0, 1.0) * smoothLine(fragCoord, spectralEntropySmooth);

        int highZScores = 0;
        if(abs(spectralCrestZScore) > 0.95) highZScores++;
        if(abs(spectralKurtosisZScore) > 0.95) highZScores++;
        if(abs(spectralEntropyZScore) > 0.95) highZScores++;
        if(abs(spectralCentroidZScore) > 0.95) highZScores++;
        if(abs(pitchClassZScore) > 0.95) highZScores++;

        if(highZScores < 2) {
            fragColor = mix(fragColor, lineColor, lineColor.a);
            return;
        }

        vec3 hsl = rgb2hsl(lineColor.rgb);
        hsl.x = fract(hsl.x + 0.5);
        for(int i = 0; i < highZScores; i++){
            hsl.z += 0.2;
        }
         lineColor.rgb = hsl2rgb(fract(hsl));

        if( highZScores == ULTRA_DROP_COUNT) {
           lineColor.r = 0.5;
           lineColor.b = 0.5;
           lineColor.g = 0.1;
        }
         fragColor =vec4(lineColor.rgb, 1.);
    }
}
