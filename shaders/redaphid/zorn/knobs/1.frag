uniform float knob_1;
uniform float knob_2;
uniform float knob_3;
uniform float knob_4;
uniform float knob_5;
#define PROBE_1 mix(1.,1.4,knob_2)
#define PROBE_2 mix(0.55,2.,knob_3) /* 'fan out' swirls -> multiple squares */
#define PROBE_3 mix(-1.7,10.,knob_4) /* color */
#define PROBE_4 mix(1.,11.,knob_5)
#define PROBE_5 mix(0.47,0.97,knob_2) /* complexity + zoom */
#define PROBE_6 mix(0.2,0.1,knob_1) /*zoom */

// Descriptive function to apply periodic transformation and trap calculations
vec2 applyPeriodicTransformationAndTraps(vec2 position, vec2 multiplier) {
    // Normalize the position and apply a periodic function (sine wave) with length inversion
    position = 0.5* sin(multiplier * position / dot(position, position)*PROBE_5);
    return position;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 resolution = iResolution.xy; // Screen resolution
    vec2 multiplier = vec2(PROBE_1,PROBE_2); // Multiplier for the periodic function

    // Normalize the fragment coordinates
    vec2 normalizedCoords = (fragCoord + fragCoord - resolution) / resolution.x;
    normalizedCoords *=PROBE_6;
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
