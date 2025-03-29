// High-precision checkerboard zoom using CPU-calculated split-precision coordinates

// Controller uniforms from zoomer.js with high precision components
uniform float cameraCenterHighX;
uniform float cameraCenterLowX;
uniform float cameraCenterHighY;
uniform float cameraCenterLowY;
uniform float offsetHighX;
uniform float offsetLowX;
uniform float offsetHighY;
uniform float offsetLowY;
uniform float zoomLevel;

#define MAX_ITERATIONS 12  // Number of checkerboard levels to render

// Pure colors for maximum contrast
vec3 blackColor = vec3(0.0, 0.0, 0.0);
vec3 whiteColor = vec3(1.0, 1.0, 1.0);

// Simple checkerboard pattern - basic building block
float basicChecker(vec2 p) {
    // The standard checkerboard pattern
    vec2 grid = floor(p);
    return mod(grid.x + grid.y, 2.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Reconstruct exact world position from high-precision components
    float worldX = cameraCenterHighX + cameraCenterLowX + offsetHighX + offsetLowX;
    float worldY = cameraCenterHighY + cameraCenterLowY + offsetHighY + offsetLowY;

    // Get canonical screen coordinates with proper aspect ratio
    vec2 uv = (fragCoord.xy / iResolution.xy) * 2.0 - 1.0;
    float aspectRatio = iResolution.x / iResolution.y;
    uv.x *= aspectRatio;

    // Get zoom factor - clamp to prevent division by zero
    float zoom = max(zoomLevel, 0.000001);

    // Convert screen coordinates to world coordinates
    vec2 worldPos = vec2(
        worldX + uv.x * zoom,
        worldY + uv.y * zoom
    );

    // Calculate the level of detail needed based on zoom
    float zoomPower = log2(1.0 / zoom);

    // Use a basic scheme that works reliably
    // Scale the world coordinates based on zoom level
    float scale = pow(2.0, floor(zoomPower));
    vec2 scaledPos = worldPos * scale;

    // The current level checker
    float checker = basicChecker(scaledPos);

    // Blend with the next level for smooth transitions
    float blendFactor = fract(zoomPower);
    if (blendFactor > 0.0) {
        // Calculate next level checker
        vec2 nextPos = scaledPos * 2.0;
        float nextChecker = basicChecker(nextPos);

        // If current cell is black, invert the pattern of sub-cells
        if (checker < 0.5) {
            nextChecker = 1.0 - nextChecker;
        }

        // Blend between levels for smooth transitions
        checker = mix(checker, nextChecker, blendFactor);
    }

    // Final color
    vec3 color = mix(blackColor, whiteColor, checker);

    // Debug info at the bottom of the screen
    if (fragCoord.y < 40.0) {
        float debugWidth = iResolution.x / 4.0;

        if (fragCoord.x < debugWidth) {
            // Zoom level
            color = vec3(zoom * 100.0, 0.0, 0.0);
        } else if (fragCoord.x < debugWidth * 2.0) {
            // Zoom power (log2)
            color = vec3(0.0, clamp(zoomPower / 20.0, 0.0, 1.0), 0.0);
        } else if (fragCoord.x < debugWidth * 3.0) {
            // World X (show fractional part to track movement)
            color = vec3(0.0, 0.0, fract(abs(worldX)));
        } else {
            // World Y (show fractional part to track movement)
            color = vec3(fract(abs(worldY)), 0.0, 0.0);
        }
    }

    fragColor = vec4(color, 1.0);
}
