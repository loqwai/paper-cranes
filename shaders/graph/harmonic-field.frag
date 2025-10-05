// Harmonic field - scrolling particles showing frequency distribution over time
// Each column shows spectral shape at that moment

#define PI 3.14159265359
#define PARTICLE_COUNT 8.0  // Particles per column (frequency bands)
#define PARTICLE_SIZE 0.018

// Draw a glowing particle
float drawParticle(vec2 uv, vec2 pos, float size) {
    float dist = length(uv - pos);
    float particle = smoothstep(size * 1.5, 0.0, dist);
    float glow = smoothstep(size * 5.0, 0.0, dist) * 0.7;
    return particle + glow;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // Background - scroll left
    if (uv.x < 0.99) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x;
        fragColor = getLastFrameColor(prevUV) * 0.985; // Very slow fade
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }

    // Draw new particles on rightmost column
    if (uv.x > 0.99) {
        // Get current audio features
        float spreadVal = clamp(spectralSpreadNormalized, 0.0, 1.0);
        float centroidVal = clamp(spectralCentroidNormalized, 0.0, 1.0);
        float kurtosisVal = clamp(spectralKurtosisNormalized, 0.0, 1.0);
        float rolloffVal = clamp(spectralRolloffNormalized, 0.0, 1.0);
        float skewVal = clamp(spectralSkewNormalized * 2.0 - 1.0, -1.0, 1.0);

        vec3 col = vec3(0.0);

        // Draw particles representing frequency bands
        for (float i = 0.0; i < PARTICLE_COUNT; i++) {
            float t = i / (PARTICLE_COUNT - 1.0);

            // Vertical position = frequency (low to high)
            float freqPos = (t - 0.5) * 1.8;

            // CENTROID: Shifts entire distribution vertically
            float centroidShift = (centroidVal - 0.5) * 1.2;

            // KURTOSIS: Affects vertical clustering
            // Low kurtosis = spread out, High kurtosis = tight
            float kurtosisEffect = mix(
                sin(t * PI * 2.0) * 0.3,  // Spread pattern
                0.0,                       // Tight center
                kurtosisVal
            );

            // SKEW: Tilts the distribution
            float skewEffect = skewVal * (t - 0.5) * 0.4;

            float yPos = freqPos + centroidShift + kurtosisEffect + skewEffect;

            // SPREAD: Affects horizontal displacement
            float xOffset = (spreadVal - 0.5) * sin(t * PI) * 0.15;

            // ROLLOFF: Higher frequencies fade based on rolloff
            float visibility = smoothstep(rolloffVal + 0.2, rolloffVal - 0.3, t);

            vec2 particlePos = vec2(xOffset, yPos);

            // Color based on frequency
            vec3 particleColor = hsl2rgb(vec3(t * 0.6 + 0.1, 0.9, 0.6));

            // Draw particle
            float particle = drawParticle(uv - vec2(0.99, 0.5), particlePos, PARTICLE_SIZE);
            col += particleColor * particle * visibility * 8.0;
        }

        fragColor.rgb += col;
    }
}
