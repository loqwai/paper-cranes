void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Set time based on iTime to test non-zero values
    // For example, set time to a pulsing value between 0 and 5
    float timeValue = mod(iTime, 5.0);
    setTime(timeValue);

    // Simple gradient background
    vec2 uv = fragCoord/iResolution.xy;
    fragColor = vec4(uv.x, uv.y, timeValue/5.0, 1.0);

    // Show current time in the center
    if (distance(uv, vec2(0.5)) < 0.1) {
        fragColor = mix(fragColor, vec4(1.0, 1.0, 1.0, 1.0), 0.3);
    }
}
