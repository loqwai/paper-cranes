// MAKE SURE TO NAME PUT YOUR SHADER IN "shaders/<YOUR_GITHUB_USERNAME>"
// and make sure the filename ends in .frag
// for example, if your username is "hypnodroid", and you want to publish "my-shader.frag", the filename should be "hypnodroid/my-shader.frag"
// Artificial Life Octopus Shader
// Enhanced evolving octopus with music-reactive reaction-diffusion patterns

// Palette function from example shader
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

// Simple hash for randomness
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Audio-driven evolution factor
float getEvolutionFactor() {
    return (bassZScore + spectralFluxZScore + trebleZScore) / 3.0;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y; // Aspect-corrected UV
    vec2 texUv = fragCoord.xy / iResolution.xy; // Texture UV [0,1]
    float t = time / 10.0 + bassZScore / 15.0;

    // Get previous frame color
    vec3 prevColor = getLastFrameColor(texUv).rgb;

    // Octopus body: Pulsing central ellipse with subtle rotation
    vec2 bodyPos = vec2(0.0);
    float bodySize = 0.15 + bassNormalized * 0.15; // Increased bass influence
    float bodyAngle = spectralKurtosisZScore * 0.2; // Subtle rotation
    vec2 rotatedUv = vec2(
        cos(bodyAngle) * uv.x - sin(bodyAngle) * uv.y,
        sin(bodyAngle) * uv.x + cos(bodyAngle) * uv.y
    );
    float bodyDist = length(rotatedUv / vec2(1.0, 1.5)); // Elliptical
    float body = smoothstep(bodySize, bodySize * 0.8, bodyDist);
    vec3 bodyColor = vec3(0.2 + spectralCentroidZScore * 0.15, 0.1, 0.4 + trebleZScore * 0.25);
    vec3 color = bodyColor * body;

    // Tentacles: 8 wavy arms with enhanced audio-driven motion
    float tentacleWave = sin(t * 2.5 + spectralSpreadZScore * 5.0) * (0.05 + spectralFluxZScore * 0.03);
    for (int i = 0; i < 8; i++) {
        float angle = float(i) * 6.28318 / 8.0 + spectralKurtosisZScore * 0.15 + t * 0.1;
        vec2 dir = vec2(cos(angle), sin(angle));
        float proj = dot(uv, dir);
        if (proj > 0.0 && proj < 1.0) { // Limit tentacle length
            vec2 perp = vec2(-dir.y, dir.x);
            float distPerp = abs(dot(uv, perp));
            float wave = sin(proj * 12.0 + t * 4.0 + spectralFluxZScore * 6.0) * tentacleWave;
            float tentWidth = 0.03 * (1.0 - smoothstep(0.0, 0.8, proj)); // Taper more sharply
            float tent = smoothstep(tentWidth + wave, tentWidth * 0.5 + wave, distPerp);
            vec3 tentColor = palette(proj + t * 0.2 + trebleZScore, 
                                    vec3(0.5), 
                                    vec3(0.5, 0.3, 0.4), 
                                    vec3(1.0, 0.8, 1.2), 
                                    vec3(0.0, 0.33, 0.67));
            color = mix(color, tentColor, tent);
        }
    }

    // Artificial Life: Enhanced reaction-diffusion with music-driven evolution
    vec2 pixelSize = 1.0 / iResolution.xy;
    vec3 sum = vec3(0.0);
    float kernel[9] = float[](0.05, 0.2, 0.05, 0.2, 0.3, 0.2, 0.05, 0.2, 0.05); // Convolution kernel
    int k = 0;
    for (int dx = -1; dx <= 1; dx++) {
        for (int dy = -1; dy <= 1; dy++) {
            vec2 offset = vec2(float(dx), float(dy)) * pixelSize;
            sum += getLastFrameColor(texUv + offset).rgb * kernel[k++];
        }
    }
    vec3 avg = sum;

    // Reaction-diffusion parameters with stronger audio modulation
    float diffusionA = 0.15 + spectralSpreadZScore * 0.08; // More spread-driven
    float diffusionB = 0.07 + spectralRolloffZScore * 0.04;
    float feed = 0.05 + bassZScore * 0.015 + (beat ? 0.01 : 0.0); // Beat boosts growth
    float kill = 0.06 + trebleZScore * 0.008;

    float A = prevColor.r;
    float B = prevColor.g;
    // Add spatial variation for more organic patterns
    float spatialMod = hash(texUv * 10.0) * 0.02;
    float dA = diffusionA * (avg.r - A) + (feed + spatialMod) * (1.0 - A) - A * B * B;
    float dB = diffusionB * (avg.g - B) + A * B * B - (kill + feed + spatialMod) * B;

    float evoFactor = getEvolutionFactor();
    float newA = clamp(A + dA * (1.0 + evoFactor * 2.0), 0.0, 1.0); // Amplify evolution
    float newB = clamp(B + dB * (1.0 + evoFactor * 2.0), 0.0, 1.0);

    // Evolving life patterns with dynamic palette
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.4, 0.6) * (1.0 + spectralFluxZScore * 0.3);
    vec3 c = vec3(1.0, 0.9, 1.1) * (1.0 + spectralCrestZScore * 0.2);
    vec3 d = vec3(0.0, 0.33, 0.67) + vec3(spectralRolloffZScore * 0.1);
    float patternT = newB - newA + t * 0.1 + spectralCentroidZScore * 0.2;
    vec3 lifeColor = palette(patternT, a, b, c, d);
    lifeColor *= (1.0 + spectralCrestZScore * 0.7);

    // Mix with octopus, preserving body
    float lifeMask = smoothstep(0.2, 0.4, bodyDist); // Softer transition near body
    color = mix(color, lifeColor, lifeMask * (0.6 + spectralFluxZScore * 0.4));

    // Feedback blending with beat emphasis
    float blend = 0.15 + (beat ? 0.25 : 0.0) + spectralFluxZScore * 0.1;
    color = mix(prevColor, color, blend);

    // Fade edges with audio-driven intensity
    float edgeFade = smoothstep(1.8, 1.2, length(uv)) * (1.0 + bassZScore * 0.3);
    color *= edgeFade;

    fragColor = vec4(color, 1.0);
}
