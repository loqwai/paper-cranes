
#define EPSILON 0.0000001
//https://visuals.beadfamous.com/edit?knob_30=1.268&knob_42=0.024&knob_44=0&knob_47=7.9&knob_37=3.071&knob_34=0.32
#define PROBE_1 mix(knob_37,knob_47,energyZScore)+(energyMedian/knob_30)
#define PROBE_2 mix(1.8, 5.,spectralRoughnessMedian)+EPSILON /* 'fan out' swirls -> multiple squares */
#define PROBE_3 mix(-1.5,10.,knob_42)+EPSILON /* color */
#define PROBE_4 mix(trebleZScore,knob_34,midsZScore)+EPSILON
#define PROBE_5 mix(0.47,10.97,knob_44)+EPSILON /* complexity + zoom */
#define PROBE_6 mix(0.18,0.47, (bassZScore + 1.)/3.)+EPSILON /*zoom */

// Descriptive function to apply periodic transformation and trap calculations
vec2 applyPeriodicTransformationAndTraps(vec2 position, vec2 multiplier) {
    float dotVal = max(dot(position, position), 0.001);
    position = 0.5 * sin(multiplier * position / dotVal * PROBE_6);
    return position;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 resolution = iResolution.xy; // Screen resolution
    vec2 multiplier = vec2(PROBE_1,PROBE_2); // Multiplier for the periodic function

    // Normalize the fragment coordinates
    vec2 normalizedCoords = (fragCoord + fragCoord - resolution) / resolution.x;
    // normalizedCoords +=PROBE_6;
    // Initialize output color
    fragColor += 1e6 - fragColor;

    // Main loop for fractal generation with orbit traps
    for (int i = 0; i < 5; i++) {
        normalizedCoords = applyPeriodicTransformationAndTraps(normalizedCoords.xy, multiplier);

        // Calculate orbit traps and update the color
        float lengthTrap = length(normalizedCoords); // Distance from origin
        float minAxesTrap = min(abs(normalizedCoords.x), abs(normalizedCoords.y)); // Minimum of the absolute x or y
        float diagonalDotTrap = abs(dot(normalizedCoords, vec2(PROBE_3, PROBE_4))); // Dot product with (1,1) vector

        fragColor = min(fragColor, vec4(lengthTrap, minAxesTrap, diagonalDotTrap, 1.0));
    }
}
