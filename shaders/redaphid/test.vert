#version 300 es
precision mediump float;

uniform float energyZScore; // Additional energy factor influencing the terrain

// Inputs
in vec4 position;

void main() {
    // Normalize to [-1, 1] range by multiplying by 2 and subtracting 1
    vec2 normalizedPosition = position.xy * 2.0 - vec2(1.0, 1.0);

    // Calculate rotation angle based on energyZScore
    float angle = energyZScore;  // Rotate over time based on the energy level

    // Create the rotation matrix for Z-axis rotation
    mat2 rotationMatrix = mat2(cos(angle), -sin(angle),
                               sin(angle), cos(angle));

    // Apply rotation to the normalized position
    vec2 rotatedPosition = rotationMatrix * normalizedPosition;

    // Adjust for the undulation and terrain effects
    float baseTerrain = sin(rotatedPosition.x * 20.0 + energyZScore) * cos(rotatedPosition.y * 20.0 + energyZScore) * 0.05;
    float detailTerrain = sin(rotatedPosition.x * 40.0 + energyZScore * 2.0) * cos(rotatedPosition.y * 40.0 + energyZScore * 2.0) * 0.025;
    float totalDisplacement = baseTerrain + detailTerrain;
    float zDisplacement = totalDisplacement * (1.0 + sin(energyZScore));

    // Adjust Z-position to create the bumpy effect
    float zPosition = position.z + zDisplacement;

    // Set the final position, adjust back to [0, 1] range after rotation
    gl_Position = vec4((rotatedPosition + vec2(1.0, 1.0)) * 0.5, zPosition, 1.0);
}
