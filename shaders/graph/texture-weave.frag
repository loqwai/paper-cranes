// Texture Weave - Flowing fabric ribbons responding to spectral quality
// Roughness → thread density, Entropy → chaos, Rolloff → sharpness, Crest → contrast

#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define RIBBON_COUNT 10.0

// Spectral Quality features - NO FALLBACKS
#define ROUGHNESS (spectralRoughnessNormalized)
#define ENTROPY (spectralEntropyNormalized)
#define ROLLOFF (spectralRolloffNormalized)
#define CREST (spectralCrestNormalized)
#define ROUGHNESS_Z (spectralRoughnessZScore)
#define ENTROPY_Z (spectralEntropyZScore)
#define ROLLOFF_Z (spectralRolloffZScore)
#define CREST_Z (spectralCrestZScore)

// Hash function
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

// Audio-biased noise
float audioBiasedNoise(float seed, float audioOffset) {
    return hash(seed + audioOffset * 100.0);
}

// Frame luminance for entropy
float frameLuminance(vec2 uv) {
    vec4 prev = getLastFrameColor(uv);
    return dot(prev.rgb, vec3(0.299, 0.587, 0.114));
}

// Draw flowing ribbon
float drawRibbon(vec2 uv, float yPos, float thickness, float audioMod) {
    float wave = sin(uv.x * PI * 4.0 + time * audioMod) * 0.08;
    float dist = abs(uv.y - (yPos + wave));
    return smoothstep(thickness + 0.01, thickness - 0.01, dist);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    vec2 center = vec2(0.5);
    vec2 toCenter = uv - center;
    float distFromCenter = length(toCenter);

    // Get frame feedback for entropy
    float centerLum = frameLuminance(center);

    // Animate features
    float roughnessAnim = animateEaseOutElastic(clamp(ROUGHNESS_Z, -1.0, 1.0) * 0.5 + 0.5);
    float entropyAnim = animateEaseInOutSine(clamp(ENTROPY, 0.0, 1.0));
    float rolloffAnim = animateEaseOutExpo(clamp(ROLLOFF, 0.0, 1.0));
    float crestAnim = animatePulse(clamp(CREST, 0.0, 1.0));

    // Frame feedback distortion
    vec2 distortedUV = uv;

    // Entropy creates chaotic turbulence
    float turbulence = entropyAnim * 0.025;
    distortedUV += vec2(
        sin(uv.y * 18.0 + time * 2.5 + centerLum * TWO_PI) * turbulence,
        cos(uv.x * 18.0 + time * 2.2 - centerLum * TWO_PI) * turbulence
    );

    // Roughness creates wavy distortion
    float waviness = roughnessAnim * 0.02;
    distortedUV += vec2(
        sin(uv.y * 25.0 - time * 3.5 + ENTROPY * 12.0) * waviness,
        cos(uv.x * 25.0 + time * 3.0 + ROUGHNESS * 12.0) * waviness
    );

    // Chromatic aberration based on crest
    float aberrationAmount = clamp(CREST * 0.004 + ROUGHNESS_Z * 0.003, 0.0, 0.01);
    vec2 rOffset = vec2(aberrationAmount, 0.0);
    vec2 bOffset = vec2(-aberrationAmount, 0.0);
    vec2 gOffset = vec2(0.0, aberrationAmount * 0.5);

    float r = getLastFrameColor(distortedUV + rOffset).r;
    float g = getLastFrameColor(distortedUV + gOffset).g;
    float b = getLastFrameColor(distortedUV + bOffset).b;

    // FASTER fade to prevent accumulation
    float fadeAmount = 0.65 + clamp(ENTROPY_Z * 0.02, 0.0, 0.02);
    vec3 aberratedTrails = vec3(r, g, b) * fadeAmount;

    // Create flowing ribbons
    vec3 col = vec3(0.0);

    for (float i = 0.0; i < RIBBON_COUNT; i++) {
        float t = i / (RIBBON_COUNT - 1.0);

        // Audio-biased position
        float posNoise = audioBiasedNoise(i, ENTROPY + time * 0.05);
        float yPos = t * 0.8 + 0.1 + posNoise * 0.15;

        // Thickness varies with roughness
        float thickness = 0.035 + clamp(ROUGHNESS, 0.0, 1.0) * 0.025;

        // Speed varies with rolloff
        float speed = 1.5 + clamp(ROLLOFF, 0.0, 1.0) * 2.0;

        // Draw ribbon
        float ribbon = drawRibbon(uv, yPos, thickness, speed);

        // Glow based on crest
        float glow = smoothstep(thickness * 4.0, 0.0, abs(uv.y - yPos)) * crestAnim * 0.6;

        // Evolving colors with frame feedback
        float colorNoise = audioBiasedNoise(i * 7.0 + time * ROUGHNESS * 0.04, ROLLOFF);
        float hue = (t * 0.6) + clamp(ENTROPY, 0.0, 1.0) * 0.3 + colorNoise * 0.25 + centerLum * 0.15;
        hue = mod(hue, 1.0);

        // Saturation varies with roughness
        float sat = 0.80 + clamp(ROUGHNESS, 0.0, 1.0) * 0.20;

        // Lightness varies with rolloff
        float light = 0.50 + rolloffAnim * 0.25;

        vec3 ribbonColor = hsl2rgb(vec3(hue, sat, light));

        // Controlled ribbon brightness
        col += ribbonColor * (ribbon * 1.5 + glow * 0.4);
    }

    // Add subtle texture grain based on roughness
    float grainNoise = audioBiasedNoise(uv.x * 100.0 + uv.y * 100.0, time * 0.1);
    float grain = grainNoise * clamp(ROUGHNESS, 0.0, 1.0) * 0.03;
    col += vec3(grain);

    // Mix trails and new content (20-30% new)
    float mixAmount = 0.25 + clamp(ENTROPY, 0.0, 1.0) * 0.05;
    vec3 finalColor = mix(aberratedTrails, col, mixAmount);

    // Always clamp
    finalColor = min(finalColor, vec3(1.0));

    fragColor = vec4(finalColor, 1.0);
}
