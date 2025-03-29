#define EPSILON 0.001
// Use a linear time offset for continuous evolution
#define PROBE_1 (iTime * 0.1)
#define PROBE_2 mapValue(bassZScore, -1., 1., 4., 11.5)
#define PROBE_3 0.4
#define PROBE_4 1.
#define PROBE_6 -(2./10.)

// Simple rotate function
vec2 rotate(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
}

// Add a fraction of the previous frame's color (offset) to the phase, so the transformation evolves continuously.
vec2 applyPeriodicTransformationAndTraps(vec2 position, vec2 multiplier, vec2 uv) {
    float dotVal = max(dot(position, position), 0.001);
    vec2 tmp = multiplier * position / dotVal * PROBE_6;
    // Get the previous frame's color at uv and convert it to an offset in [-0.5, 0.5]
    vec2 lastOffset = getLastFrameColor(uv).rg - 0.5 + iTime;
    // Add both a linear time offset and a small fraction of lastOffset for continuity
    position = 0.5 * (sin(tmp + iTime + lastOffset/2.) - 0.2);
    return position;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Center the UV coordinates (assuming centerUv() maps fragCoord to [0,1])
    vec2 uv = centerUv(fragCoord) - 0.5;
    
    // Start with a high value so we can use min() in the loop
    fragColor += 1e6 - fragColor;
    vec2 multiplier = vec2(PROBE_1, PROBE_2);
    
    for (int i = 0; i < 5; i++) {
        uv = applyPeriodicTransformationAndTraps(uv, multiplier, uv);
        
        float lengthTrap = length(uv);
        float minAxesTrap = min(abs(uv.x), abs(uv.y));
        float diagonalDotTrap = abs(dot(uv, vec2(0., PROBE_4)));
        
        fragColor = min(fragColor, vec4(lengthTrap, minAxesTrap, diagonalDotTrap, 1.0));
        vec3 hslColor = rgb2hsl(fragColor.rgb);
        hslColor.x = fract(hslColor.x + sin(iTime / 10000.0));
        hslColor.z = clamp(hslColor.z, 0., 0.5);
        fragColor.rgb = hsl2rgb(hslColor);
    }
}
