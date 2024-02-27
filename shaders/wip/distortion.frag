

// Function to simulate a raindrop effect
vec2 drip(vec2 uv, vec2 center, float time) {
    vec2 toCenter = center - uv; // Vector from current UV to the center of the drip
    float distance = length(toCenter); // Distance to the center
    float wave = sin(distance * 10.0 - time * 5.0); // Sinusoidal wave based on distance and time
    wave *= exp(-distance * 5.0); // Exponential falloff based on distance
    
    return toCenter * wave * 0.02; // Scale the distortion vector
}

// Main function
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy; // Normalize UV coordinates
    
    // Calculate time-based parameters for animation
    float time = iTime;
    
    // Center of the drip effect, animated to move across the screen
    vec2 center = vec2(sin(time) * 0.5 + 0.5, cos(time) * 0.5 + 0.5);
    
    // Apply the drip effect to distort UV coordinates
    vec2 distortedUv = uv + drip(uv, center, time);
    
    // Fetch the color from the previous frame, using distorted UVs
    vec4 color = getLastFrameColor(distortedUv);
    
    fragColor = color;
}


