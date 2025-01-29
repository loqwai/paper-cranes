// Define audio reactive parameters
#define WAVE_SPEED (spectralFluxZScore * 0.2)
#define PATTERN_SCALE (1.0 + spectralCentroidZScore * 0.2)
#define MAX_RIPPLES 12 // More ripples for better coverage
#define PERSISTENCE 0.98
#define PI 3.14159265359

// Structure to store ripple information
struct Ripple {
    vec2 center;
    float birth;    // When the ripple started
    float strength;
    float freq;
};

// Proper UV wrapping function
vec2 wrapUV(vec2 uv) {
    return fract(uv + 0.5) - 0.5;
}

// Create a single ripple
float singleRipple(vec2 p, Ripple r) {
    vec2 delta = p - r.center;
    float d = length(delta);

    // Calculate age of ripple
    float age = time - r.birth;

    // Expanding radius based on age
    float radius = age * 0.3;

    // Ring width gets wider as it expands
    float width = 0.02 + radius * 0.01;

    // Create sharp ring that expands outward
    float ring = smoothstep(radius - width, radius, d) -
                smoothstep(radius, radius + width, d);

    // Fade out based on age and distance
    float fade = exp(-age * 1.0) * // Time-based fade
                exp(-d * 0.5) *    // Distance-based fade
                r.strength;

    return ring * fade;
}

// Get ripple sources
Ripple[MAX_RIPPLES] getRipples(vec2 uv) {
    Ripple[MAX_RIPPLES] ripples;

    for(int i = 0; i < MAX_RIPPLES; i++) {
        // Stagger ripple births
        float birthOffset = mod(time + float(i) * 0.5, 4.0);

        // Random-ish position within view bounds
        float angle = random(uv);
        float dist = random(uv);

        vec2 pos = vec2(
            cos(angle) * dist,
            sin(angle) * dist
        );

        // Strength decreases with age
        float strength = smoothstep(4.0, 0.0, birthOffset) *
                        (1.0 + spectralFluxZScore * 0.5);

        ripples[i] = Ripple(
            pos,
            time - birthOffset,
            strength,
            30.0 + spectralSpreadNormalized * 20.0
        );
    }
    return ripples;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / min(resolution.x, resolution.y);

    // Sample previous frame
    vec2 prevUV = fragCoord.xy / resolution.xy;
    vec4 prevColor = texture(prevFrame, prevUV);

    // Get ripples
    Ripple[MAX_RIPPLES] ripples = getRipples(uv);

    // Combine ripple patterns
    float pattern = 0.0;
    for(int i = 0; i < MAX_RIPPLES; i++) {
        pattern += singleRipple(uv, ripples[i]);
    }

    // Create base color
    vec3 color = vec3(0.0); // Start with black

    // Add colored ripples
    if(pattern > 0.0) {
        vec3 rippleColor = vec3(
            0.5 + spectralCentroidNormalized * 0.2,  // Base hue
            0.8,                                      // High saturation
            clamp(pattern * 2.0, 0.0, 1.0)           // Brightness from pattern
        );
        color = hsl2rgb(rippleColor);
    }

    // Beat response
    float blendFactor = 0.1;
    if(beat) {
        // Create new ripple at beat position
        vec2 beatPos = vec2(
            cos(spectralCentroidZScore * PI) * 0.3,
            sin(spectralFluxZScore * PI) * 0.3
        );
        float beatDist = length(uv - beatPos);
        float beatRipple = exp(-beatDist * 8.0) * // Sharp falloff
                          (0.5 + spectralFluxNormalized); // Intensity from flux
        color += vec3(0.2, 0.3, 0.4) * beatRipple;
    }

    // Blend with previous frame
    vec3 blendedColor = mix(prevColor.rgb * PERSISTENCE, color, blendFactor);

    // Subtle vignette
    float vignette = smoothstep(1.1, 0.3, length(uv));
    blendedColor *= vignette;

    fragColor = vec4(blendedColor, 1.0);
}

// Hash function for pseudo-random numbers
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}
