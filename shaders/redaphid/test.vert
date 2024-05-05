#version 300 es
precision mediump float;

uniform float iTime; // Uniform for time-based animation

// Inputs
in vec4 position;

void main() {
    // Center the coordinates to make (0,0) the center of the canvas
    vec2 centeredPosition = position.xy - vec2(0.5, 0.5);

    // Compute rotation angle based on time and an inverse relationship to the distance from the center
    // The closer to the center, the larger the effect
    float distance = length(centeredPosition);
    float angle = iTime + (1.0 / (distance + 0.1)); // Adding 0.1 to avoid division by zero

    // Rotation matrix around Z-axis
    mat2 rotation = mat2(cos(angle), -sin(angle),
                         sin(angle), cos(angle));

    // Apply rotation to the xy components of position
    vec2 rotatedPosition = rotation * centeredPosition;

    // Translate position back to original range and set it
    gl_Position = vec4(rotatedPosition + vec2(0.5, 0.5), position.z, 1.0);
}
