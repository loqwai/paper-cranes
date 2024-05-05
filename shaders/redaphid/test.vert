#version 300 es
precision mediump float;

uniform float energyZScore; // Additional energy factor influencing the terrain

// Inputs
in vec4 position;

void main() {
    // Center the coordinates around (0,0) for easier manipulation
    vec2 centeredPosition = position.xy - vec2(0.5, 0.5);

    // Calculate rotation angle
    float angle = energyZScore;  // Rotate over time

    // Create the rotation matrix for Z-axis rotation
    mat2 rotationMatrix = mat2(cos(angle), -sin(angle),
                               sin(angle), cos(angle));

    // Using multiple layers of noise to simulate terrain
    // Base terrain undulation
    float baseTerrain = sin(centeredPosition.x * 20.0 + energyZScore) * cos(centeredPosition.y * 20.0 + energyZScore) * 10.05;
    // Fine details
    float detailTerrain = sin(centeredPosition.x * 40.0 + energyZScore * 2.0) * cos(centeredPosition.y * 40.0 + energyZScore * 2.0) * 0.025;

    // Combine the terrain layers
    float totalDisplacement = baseTerrain + detailTerrain;

    // Apply the energy factor to modulate the height
    float zDisplacement = totalDisplacement * (1.0 + sin(energyZScore));

    // Adjust z-position to create the bumpy effect
    float zPosition = position.z + zDisplacement;
    zPosition += 0.001 * float(gl_VertexID % 100);
    // Apply rotation to the displaced position
    vec2 rotatedPosition = rotationMatrix * centeredPosition;

    // Apply final position calculation, re-translate positions back to original range [0,1]
    gl_Position = vec4(rotatedPosition + vec2(0.5, 0.5), zPosition, 1.0);
}
