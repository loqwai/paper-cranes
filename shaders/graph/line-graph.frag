void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // Background - Shift everything to the left
    if (uv.x < 0.99) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x; // Shift to the right to get the previous frame's color
        fragColor = getLastFrameColor(prevUV); // Use the previous frame's color
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0); // Clear the rightmost column for the new data
    }

    // Normalize and scale feature values to screen height
    float centroidHeight = (1.0 - spectralCentroid) * resolution.y;
    float kurtosisHeight = (1.0 - spectralKurtosisNormalized) * resolution.y;
    float crestHeight = (1.0 - spectralCrestNormalized) * resolution.y;
    float energyHeight = (1.0 - energyNormalized) * resolution.y;

    // Plot each feature on the rightmost column with a unique color
    if (uv.x > 0.99) {
        float lineWidth = 10.0; // Adjust line width if necessary
        if (abs(fragCoord.y - centroidHeight) <= lineWidth) {
            fragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red for spectralCentroid
        } else if (abs(fragCoord.y - kurtosisHeight) <= lineWidth) {
            fragColor = vec4(0.0, 1.0, 0.0, 1.0); // Green for spectralKurtosis
        } else if (abs(fragCoord.y - crestHeight) <= lineWidth) {
            fragColor = vec4(0.0, 0.0, 1.0, 1.0); // Blue for spectralCrest
        } else if (abs(fragCoord.y - energyHeight) <= lineWidth) {
            fragColor = vec4(1.0, 1.0, 0.0, 1.0); // Yellow for energy
        }
    }
}

// Assume getLastFrameColor() is defined to fetch the color from the previous frame's texture
