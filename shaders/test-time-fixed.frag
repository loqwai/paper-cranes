void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Always set time to 0 - the simplest case
    setTime(0.0);

    // Simple color pattern - a red background
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);

    // Blue circle in the middle to visualize
    vec2 uv = fragCoord/iResolution.xy;
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);

    if (dist < 0.3) {
        // Inside circle - show blue
        fragColor = vec4(0.0, 0.0, 1.0, 1.0);
    }
}
