#version 300 es
precision mediump float;

uniform float iTime; // Time variable for animation
uniform vec2 polygonCenter; // Center of the polygon

// Inputs
in vec4 position; // Assume this is the position in local object space

void main() {
    // Translate vertex positions to rotate around the polygon center
    vec2 centeredPosition = position.xy - polygonCenter;

    // Calculate rotation angle based directly on iTime to rotate continuously
    float angle = iTime;

    // Create the rotation matrix for Z-axis rotation around the polygon's center
    mat2 rotationMatrix = mat2(cos(angle), -sin(angle),
                               sin(angle), cos(angle));

    // Apply rotation to the centered position
    vec2 rotatedPosition = rotationMatrix * centeredPosition;

    // Translate positions back after rotation
    vec2 finalPosition = rotatedPosition + polygonCenter;

    // Set the final position; here we assume position is directly in clip space for simplicity
    // You might need to apply a model-view-projection transformation depending on your setup
    gl_Position = vec4(finalPosition, position.z, 1.0);
}
