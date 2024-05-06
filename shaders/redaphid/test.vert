#version 300 es
precision mediump float;

uniform float spectralCentroid; // Uniform for animation, representing time
in vec4 position; // Vertex position assumed to be in normalized device coordinates directly
uniform float energyZScore;
void main() {
    // If position.xy is already in clip space [-1, 1], no need to normalize
    vec2 normalizedPosition = position.xy;

    // Hardcoded impact point at the center of the screen in normalized coordinates
    vec2 impactPoint = vec2(0.0, 0.0);

    // Calculate distance from the impact point
    float distance = length(normalizedPosition - impactPoint);

    // Calculate the ripple effect based on distance and time
    float waveLength = 10.95; // Adjust this to change the spacing of the ripples
    float waveHeight = 1.35 - energyZScore; // Adjust this for the amplitude of the ripples
    float speed = 20.0; // Speed of wave propagation

    // Ripple effect using a sinusoidal function that decays with distance from the impact point
    float ripple = waveHeight * sin((spectralCentroid * 10. * speed - distance) / waveLength) / (distance + 1.0);

    // Apply the ripple effect to the z-coordinate of the position
    vec3 newPosition = vec3(position.xy, position.z + ripple);

    // No transformation matrix used, assuming positions are already in clip space
    gl_Position = vec4(newPosition, 1.0);
}
