#define LINE_WIDTH 0.5
#define SMOOTH_WIDTH 0.25
#define ULTRA_DROP_COUNT 5
#define PROBE_A 0.3
#define PROBE_B 0.95
#define SMOOTHING_FACTOR 0.151  // Lower = smoother, but more latency
#define VERTICAL_OFFSET 0.5  // Back to 0.5 (middle of screen)
#define SCALE 0.25  // Scale factor for visibility (using 25% of screen height each direction)

#define RED_VALUE spectralCrestZScore
#define GREEN_VALUE spectralKurtosisZScore
#define BLUE_VALUE energyNormalized
#define TEAL_VALUE spectralFluxZScore
#define YELLOW_VALUE spectralEntropyZScore
#define GRAYISH_GREEN_VALUE spectralRolloffZScore

float drawLine(vec2 fragCoord, float value) {
    // Convert to UV space first (0 to 1)
    vec2 uv = fragCoord.xy / resolution.xy;

    // Calculate line position in UV space
    float normalizedY = VERTICAL_OFFSET - value * SCALE;

    // Calculate distance in pixels for smooth line
    float d = abs(uv.y - normalizedY) * resolution.y;
    return smoothstep(LINE_WIDTH + SMOOTH_WIDTH, LINE_WIDTH - SMOOTH_WIDTH, d);
}

// Smooth value transitions between frames
float smoothValue(float currentValue, vec2 uv) {
    vec2 prevUV = vec2(uv.x + 1.0/resolution.x, uv.y);
    vec4 prevColor = getLastFrameColor(prevUV);

    // Convert UV position back to value space
    float prevValue = (VERTICAL_OFFSET - prevUV.y) / SCALE;

    return mix(prevValue, currentValue, SMOOTHING_FACTOR);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // Background shift
    if (uv.x < 0.99) {
        vec2 prevUV = uv + vec2(1.0/resolution.x, 0.0);
        fragColor = getLastFrameColor(prevUV);
        return;
    }

    // Clear rightmost column
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);

    // Draw lines
    vec4 lineColor = vec4(0.0);

    // Smooth the values
    float redSmooth = smoothValue(RED_VALUE, uv);
    float greenSmooth = smoothValue(GREEN_VALUE, uv);
    float blueSmooth = smoothValue(BLUE_VALUE, uv);
    float tealSmooth = smoothValue(TEAL_VALUE, uv);
    float yellowSmooth = smoothValue(YELLOW_VALUE, uv);
    float grayishGreenSmooth = smoothValue(GRAYISH_GREEN_VALUE, uv);

    // Calculate smoothed lines
    float redLine = drawLine(fragCoord, redSmooth);
    float greenLine = drawLine(fragCoord, greenSmooth);
    float blueLine = drawLine(fragCoord, blueSmooth);

    float tealLine = drawLine(fragCoord, tealSmooth);
    float yellowLine = drawLine(fragCoord, yellowSmooth);
    float grayishGreen = drawLine(fragCoord, grayishGreenSmooth);

    // Add lines with distinct colors
    lineColor += vec4(1.0, 0.0, 0.0, 1.0) * redLine;
    lineColor += vec4(0.0, 1.0, 0.0, 1.0) * greenLine;
    lineColor += vec4(0.0, 0.0, 1.0, 1.0) * blueLine;
    lineColor += vec4(0.3, 0.4, 1.0, 1.0) * tealLine;
    lineColor += vec4(1.0, 1.0, 0.0, 1.0) * yellowLine;
    lineColor += vec4(0.4, 0.5, 0.4, 1.0) * grayishGreen;

    // Drop detection using the original (unsmoothed) values for responsiveness
    int highZScores = 0;
    if(abs(spectralCrestZScore) > PROBE_B) highZScores++;
    if(abs(spectralKurtosisZScore) > PROBE_B) highZScores++;
    if(abs(spectralEntropyZScore) > PROBE_B) highZScores++;
    if(abs(spectralFluxZScore) > PROBE_B) highZScores++;
    if(abs(pitchClassZScore) > PROBE_B) highZScores++;
    if(abs(spectralRolloffZScore) > PROBE_B) highZScores++;

    // Normal rendering
    if(highZScores < 2) {
        fragColor = mix(fragColor, lineColor, lineColor.a);
        return;
    }

    // Drop effect - make lines brighter
    vec3 hsl = rgb2hsl(lineColor.rgb);
    float intensity = float(highZScores) / float(ULTRA_DROP_COUNT);
    hsl.z = min(1.0, hsl.z + intensity * 0.5);

    // Ultra drop effect
    if(highZScores >= ULTRA_DROP_COUNT) {
        hsl = vec3(0.95, 0.8, 0.8);  // Bright, slightly saturated color
    }

    fragColor = vec4(hsl2rgb(hsl), 1.0);
}
