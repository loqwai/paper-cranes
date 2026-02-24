uniform float knob_6;
uniform float knob_7;
uniform float knob_8;
uniform float knob_9;
uniform float knob_10;
uniform float knob_11;

#define LINE_WIDTH 25.5
#define SMOOTH_WIDTH 2.0
#define ULTRA_DROP_COUNT 4
#define PROBE_A 0.3
#define PROBE_B 0.95
#define SMOOTHING_FACTOR 0.151  // Lower = smoother, but more latency
#define VERTICAL_OFFSET 0.5  // Middle of screen
#define SCALE 3.5  // Keeping the scale that works well

uniform float knob_1;
uniform float knob_3;
uniform float knob_5;
uniform float knob_4;
uniform float knob_2;
#define COLOR_SHIFT mix(0., knob_5/4., knob_3)
// Core feature definitions - define the relationship between colors and values once
#define BLUE_FEATURE bassZScore
#define GREEN_FEATURE spectralKurtosisZScore
#define RED_FEATURE energyZScore
#define TEAL_FEATURE spectralFluxZScore
#define YELLOW_FEATURE spectralEntropyStandardDeviation
#define GRAYISH_GREEN_FEATURE spectralRolloffZScore

// Color definitions for consistent use
#define RED_COLOR vec4(1.0, 0.0, 0.0, 1.0)
#define GREEN_COLOR vec4(0.0, 1.0, 0.0, 1.0)
#define BLUE_COLOR vec4(0.0, 0.0, 1.0, 1.0)
#define TEAL_COLOR vec4(0.3, 0.4, 1.0, 1.0)
#define YELLOW_COLOR vec4(1.0, 1.0, 0.0, 1.0)
#define GRAYISH_GREEN_COLOR vec4(0.4, 0.5, 0.4, 1.0)


// Use knobs for correlation control and visibility
#define RED_KNOB knob_6
#define GREEN_KNOB knob_7
#define BLUE_KNOB knob_8
#define TEAL_KNOB knob_9
#define YELLOW_KNOB knob_10
#define GRAYISH_GREEN_KNOB knob_11


// Smooth value transitions between frames
float smoothValue(float currentValue, vec2 uv) {
    vec2 prevUV = vec2(uv.x + 1.0/resolution.x, uv.y);
    vec4 prevColor = getLastFrameColor(prevUV);

    // Convert UV position back to value space
    float prevValue = (VERTICAL_OFFSET - prevUV.y) / SCALE;

    return mix(prevValue, currentValue, SMOOTHING_FACTOR);
}


// Use knobs for correlation control
#define BLUE_VALUE smoothValue(BLUE_FEATURE, uv)
#define GREEN_VALUE smoothValue(GREEN_FEATURE, uv)
#define RED_VALUE smoothValue(RED_FEATURE, uv)
#define TEAL_VALUE smoothValue(TEAL_FEATURE, uv)
#define YELLOW_VALUE smoothValue(YELLOW_FEATURE, uv)
#define GRAYISH_GREEN_VALUE smoothValue(GRAYISH_GREEN_FEATURE, uv)

float drawLine(vec2 fragCoord, float value, float scale) {
    scale = max(scale, 0.08);
    scale*=LINE_WIDTH;
    vec2 uv = fragCoord.xy / resolution.xy;

    float normalizedY = VERTICAL_OFFSET + value * SCALE;

    float d = abs(uv.y - normalizedY) * resolution.y;
    return smoothstep(scale + SMOOTH_WIDTH, (scale) - SMOOTH_WIDTH, d);
}


void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // Background shift
    if (uv.x < 0.99) {
        vec2 prevUV = uv + vec2(1.0/resolution.x, 0.0);
        vec3 color = rgb2hsl(getLastFrameColor(prevUV).rgb);
        if(knob_1 > 0.5) {
             color.x = fract(color.x + COLOR_SHIFT);
         }
        fragColor = vec4(hsl2rgb(color), 1.);
        return;
    }

    // Clear rightmost column
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);

    // Draw lines
    vec4 lineColor = vec4(0.0);

    // Smooth the value

    // Calculate smoothed lines
    float redLine = drawLine(fragCoord, RED_VALUE, spectralRolloffNormalized);
    float greenLine = drawLine(fragCoord, GREEN_VALUE, spectralCentroidNormalized);
    float blueLine = drawLine(fragCoord, BLUE_VALUE, midsZScore);

    float tealLine = drawLine(fragCoord, TEAL_VALUE, spectralFluxNormalized);
    float yellowLine = drawLine(fragCoord, YELLOW_VALUE, spectralEntropyNormalized*4.);
    float grayishGreen = drawLine(fragCoord, GRAYISH_GREEN_VALUE, spectralFluxNormalized);

    // Add lines with distinct colors, only if their knob is non-zero
    lineColor += RED_COLOR * redLine;
    lineColor += GREEN_COLOR * greenLine;
    lineColor += BLUE_COLOR * blueLine;
    lineColor += TEAL_COLOR * tealLine;
    lineColor += YELLOW_COLOR * yellowLine;
    lineColor += GRAYISH_GREEN_COLOR * grayishGreen;

    // Drop detection using the original (unsmoothed) values for responsiveness
    int highZScores = 0;
    if(abs(RED_FEATURE) > PROBE_B) highZScores++;
    if(abs(GREEN_FEATURE) > PROBE_B) highZScores++;
    if(abs(YELLOW_FEATURE) > PROBE_B) highZScores++;
    if(abs(TEAL_FEATURE) > PROBE_B) highZScores++;
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
