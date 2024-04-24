void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // Background - Shift everything to the left
    if (uv.x < 0.99) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x; // Shift slightly to the right to fetch the previous frame's color
        fragColor = getLastFrameColor(prevUV); // Use the previous frame's color
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0); // Clear the rightmost column for new data
    }

    // Slightly thicker lines for better continuity
    float lineWidth = 10.0; // Increase this for thicker lines

    // Plot each feature on the rightmost column with a unique color
    if (uv.x > 0.99) {
        if (abs(fragCoord.y - (spectralEntropy * resolution.y)) < lineWidth) {
            fragColor = vec4(1.0, 0.0, 0.0, 1.0);
        } else if (abs(fragCoord.y - (spectralCentroid * resolution.y)) < lineWidth) {
            fragColor = vec4(0.0, 1.0, 0.0, 1.0);
        } else if (abs(fragCoord.y - (pitchClass * resolution.y)) < lineWidth) {
            fragColor = vec4(0.0, 0.0, 1.0, 1.0);
        } else if (abs(fragCoord.y - (energy* resolution.y)) < lineWidth) {
            fragColor = vec4(1.0, 1.0, 0.0, 1.0);
        }
    }
}
