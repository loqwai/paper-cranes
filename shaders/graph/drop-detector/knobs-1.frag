uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;
uniform float knob_6;
uniform float knob_7;
uniform float knob_1; // Solo control: 0 = show all, 1-6 for individual lines

// Decorrelate a z-score from energy influence
float decorrelateFromEnergy(float zScore, float correlation) {
    return zScore - (energyZScore * correlation);
}
#define SOLO_KNOB knob_1
// Core feature definitions - define the relationship between colors and values once
#define BLUE_FEATURE spectralCrestZScore
#define GREEN_FEATURE spectralKurtosisZScore
#define RED_FEATURE energyZScore
#define TEAL_FEATURE spectralFluxZScore
#define YELLOW_FEATURE spectralEntropyZScore
#define GRAYISH_GREEN_FEATURE spectralRolloffZScore

// Color definitions for consistent use
#define RED_COLOR vec4(1.0, 0.0, 0.0, 1.0)
#define GREEN_COLOR vec4(0.0, 1.0, 0.0, 1.0)
#define BLUE_COLOR vec4(0.0, 0.0, 1.0, 1.0)
#define TEAL_COLOR vec4(0.3, 0.4, 1.0, 1.0)
#define YELLOW_COLOR vec4(1.0, 1.0, 0.0, 1.0)
#define GRAYISH_GREEN_COLOR vec4(0.4, 0.5, 0.4, 1.0)

#define LINE_WIDTH 0.5
#define SMOOTH_WIDTH 0.25
#define ULTRA_DROP_COUNT 5
#define PROBE_A 0.3
#define PROBE_B 0.95
#define SMOOTHING_FACTOR 0.151  // Lower = smoother, but more latency
#define VERTICAL_OFFSET 0.5  // Back to 0.5 (middle of screen)
#define SCALE 0.25  // Scale factor for visibility (using 25% of screen height each direction)

// Use knobs for correlation control and visibility
#define RED_KNOB knob_2
#define GREEN_KNOB knob_3
#define BLUE_KNOB knob_4
#define TEAL_KNOB knob_5
#define YELLOW_KNOB knob_6
#define GRAYISH_GREEN_KNOB knob_7

// Core feature definitions - define the relationship between colors and values once
#define BLUE_FEATURE spectralCrestZScore
#define GREEN_FEATURE spectralKurtosisZScore
#define RED_FEATURE energyZScore
#define TEAL_FEATURE spectralFluxZScore
#define YELLOW_FEATURE spectralEntropyZScore
#define GRAYISH_GREEN_FEATURE spectralRolloffZScore

// Use knobs for correlation control
#define BLUE_VALUE smoothValue(decorrelateFromEnergy(BLUE_FEATURE, BLUE_KNOB), uv)
#define GREEN_VALUE smoothValue(decorrelateFromEnergy(GREEN_FEATURE, GREEN_KNOB), uv)
#define RED_VALUE smoothValue(RED_FEATURE, uv)
#define TEAL_VALUE smoothValue(decorrelateFromEnergy(TEAL_FEATURE, TEAL_KNOB), uv)
#define YELLOW_VALUE smoothValue(decorrelateFromEnergy(YELLOW_FEATURE, YELLOW_KNOB), uv)
#define GRAYISH_GREEN_VALUE smoothValue(decorrelateFromEnergy(GRAYISH_GREEN_FEATURE, GRAYISH_GREEN_KNOB), uv)

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

    // Smooth the value

    // Calculate smoothed lines
    float redLine = drawLine(fragCoord, RED_VALUE);
    float greenLine = drawLine(fragCoord, GREEN_VALUE);
    float blueLine = drawLine(fragCoord, BLUE_VALUE);

    float tealLine = drawLine(fragCoord, TEAL_VALUE);
    float yellowLine = drawLine(fragCoord, YELLOW_VALUE);
    float grayishGreen = drawLine(fragCoord, GRAYISH_GREEN_VALUE);

    // Add lines with distinct colors, only if their knob is non-zero
    lineColor += RED_COLOR * redLine * step(0.001, RED_KNOB);
    lineColor += GREEN_COLOR * greenLine * step(0.001, GREEN_KNOB);
    lineColor += BLUE_COLOR * blueLine * step(0.001, BLUE_KNOB);
    lineColor += TEAL_COLOR * tealLine * step(0.001, TEAL_KNOB);
    lineColor += YELLOW_COLOR * yellowLine * step(0.001, YELLOW_KNOB);
    lineColor += GRAYISH_GREEN_COLOR * grayishGreen * step(0.001, GRAYISH_GREEN_KNOB);

    // Drop detection using the original (unsmoothed) values for responsiveness
    int highZScores = 0;
    if(abs(RED_FEATURE) > PROBE_B) highZScores++;
    if(abs(GREEN_FEATURE) > PROBE_B) highZScores++;
    if(abs(YELLOW_FEATURE) > PROBE_B) highZScores++;
    if(abs(TEAL_FEATURE) > PROBE_B) highZScores++;
    if(abs(pitchClassZScore) > PROBE_B) highZScores++;
    if(abs(GRAYISH_GREEN_FEATURE) > PROBE_B) highZScores++;

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
