
#define EPSILON 0.0000001

#define PROBE_1 mix(1.,1.2,spectralCentroidNormalized)+EPSILON
#define PROBE_2 mix(0.60,1.,spectralFluxNormalized)+EPSILON /* 'fan out' swirls -> multiple squares */
#define PROBE_3 mix(-1.5,1.,energyZScore)+EPSILON /* color */
#define PROBE_4 mix(1.,1.2,trebleNormalized)+EPSILON
#define PROBE_5 mix(0.47,0.67,spectralKurtosisNormalized)+EPSILON /* complexity + zoom */
#define PROBE_6 mix(0.4,0.2,energyNormalized)+EPSILON /*zoom */

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
        vec3 hslColor = rgb2hsl(fragColor.rgb);
        // hslColor.r += 0.5;
        fragColor.rgb = hsl2rgb(hslColor);
    }
}
