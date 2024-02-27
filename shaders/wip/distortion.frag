
uniform float knob_1;
uniform float knob_2;
uniform float knob_3;

#define amplitude energy*1.5
#define CENTER vec2(0.5,0.5)

bool isInDrip(vec2 uv) {
    vec2 center = vec2(0.5, 0.5); // Center of the "drip"
    float radius = 0.1 + amplitude * 0.05; // Dynamic radius based on amplitude

    // Calculate distance from the center
    float dist = length(uv - center);

    // Return true if the distance is less than the dynamic radius
    return dist < radius;
}

// Function to distort UVs based on a "drip" effect
vec2 drip(vec2 uv, vec2 center, float time) {
    vec2 toCenter = center - uv;
    // Ensure wrapping effect by considering the shortest path in a toroidal topology
    toCenter = toCenter - round(toCenter);

    float distance = length(toCenter); // Distance to the center, considering wrapping
    float wave = sin(distance * 10.0 - time * 5.0) * amplitude; // Sinusoidal wave based on distance and time, scaled by amplitude
    wave *= exp(-distance * 15.0); // Exponential falloff based on distance, sharper to make the effect more localized

    return toCenter * wave * 0.05; // Scale the distortion vector by a factor for visual effect
}

// Main function
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy; // Normalize UV coordinates

    // Calculate time-based parameters for animation
    float time = iTime;

    // Center of the drip effect, animated to move across the screen
    vec2 center = CENTER;

    // Apply the drip effect to distort UV coordinates
    vec2 distortedUv = uv + drip(uv, center, time);

    // Fetch the color from the previous frame, using distorted UVs
    vec4 color = getLastFrameColor(distortedUv);
    fragColor = color;
}
