
#define EPSILON 0.0000001
// https://visuals.beadfamous.com/edit?knob_30=0.181&knob_30.min=0&knob_30.max=4.6&knob_40=0&knob_40.min=0&knob_40.max=4.6&knob_41=1&knob_41.min=0&knob_41.max=1&knob_31=0.465&knob_31.min=0&knob_31.max=5.9&knob_42=0.087&knob_42.min=0&knob_42.max=1&knob_43=1&knob_43.min=0&knob_43.max=1&knob_44=0.283&knob_44.min=0&knob_44.max=1&knob_45=0.654&knob_45.min=0&knob_45.max=1&knob_47=4.781&knob_47.min=0&knob_47.max=6.6&knob_46=0.567&knob_46.min=0&knob_46.max=1&knob_32=0.417&knob_32.min=0&knob_32.max=1&knob_33=0.654&knob_33.min=0&knob_33.max=1&knob_37=4.063&knob_37.min=0&knob_37.max=6&knob_34=0.583&knob_34.min=0&knob_34.max=1
#define PROBE_1 mix(knob_37,knob_47,energyNormalized)+EPSILON
#define PROBE_2 mix(0.60,2.,knob_41)+EPSILON /* 'fan out' swirls -> multiple squares */
#define PROBE_3 mix(-1.5,10.,knob_42)+EPSILON /* color */
#define PROBE_4 mix(1.,11.,knob_43)+EPSILON
#define PROBE_5 mix(0.47,0.97,knob_44)+EPSILON /* complexity + zoom */
#define PROBE_6 mix(0.18,0.47,bassNormalized)+EPSILON /*zoom */

// Descriptive function to apply periodic transformation and trap calculations
vec2 applyPeriodicTransformationAndTraps(vec2 position, vec2 multiplier) {
    // Normalize the position and apply a periodic function (sine wave) with length inversion
    position = 0.5* sin(multiplier * position / dot(position, position)*PROBE_6) + EPSILON;
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
    for (int i = 0; i < 20; i++) {
        normalizedCoords = applyPeriodicTransformationAndTraps(normalizedCoords.xy, multiplier);

        // Calculate orbit traps and update the color
        float lengthTrap = length(normalizedCoords); // Distance from origin
        float minAxesTrap = min(abs(normalizedCoords.x), abs(normalizedCoords.y)); // Minimum of the absolute x or y
        float diagonalDotTrap = abs(dot(normalizedCoords, vec2(PROBE_3, PROBE_4))); // Dot product with (1,1) vector

        fragColor = min(fragColor, vec4(lengthTrap, minAxesTrap, diagonalDotTrap, 1.0));
    }
}
