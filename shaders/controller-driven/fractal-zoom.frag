uniform float cameraCenterX;
uniform float cameraCenterY;
uniform float cameraScale;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Convert screen pixel to world-space coordinate
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;
    vec2 c = vec2(cameraCenterX, cameraCenterY) + uv * cameraScale;

   // Visualize world-space X and Y (offset + scaled)
vec3 debugColor = vec3(
    fract(c.x * 10.0), // red = world X
    fract(c.y * 10.0), // green = world Y
    0.5                // blue = constant
);
fragColor = vec4(debugColor, 1.0);
return;
}

