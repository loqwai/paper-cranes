// Texture Weave V1 - Interwoven fabric patterns driven by spectral quality
// roughness = texture density/graininess
// entropy = pattern complexity/chaos
// rolloff = edge sharpness
// crest = contrast/spikiness

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Audio features from different domains
#define ROUGHNESS (spectralRoughnessNormalized)
#define ROUGHNESS_Z (spectralRoughnessZScore)
#define ENTROPY (spectralEntropyNormalized)
#define ENTROPY_Z (spectralEntropyZScore)
#define ROLLOFF (spectralRolloffNormalized)
#define ROLLOFF_Z (spectralRolloffZScore)
#define CREST (spectralCrestNormalized)
#define CREST_Z (spectralCrestZScore)

// Independent features for variety
#define FLUX (spectralFluxNormalized)
#define FLUX_Z (spectralFluxZScore)
#define BASS (bassNormalized)
#define BASS_Z (bassZScore)

// Noise function for audio-biased randomness
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float audioBiasedNoise(float seed, float audioOffset) {
    return hash(seed + audioOffset * 100.0);
}

// Frame luminance for entropy
float frameLuminance(vec2 uv) {
    vec4 prev = getLastFrameColor(uv);
    return dot(prev.rgb, vec3(0.299, 0.587, 0.114));
}

// Weave pattern function
float weavePattern(vec2 uv, float scale, float complexity, float sharpness) {
    vec2 p = uv * scale;

    // Vertical and horizontal threads
    float vertical = sin(p.x * TWO_PI);
    float horizontal = sin(p.y * TWO_PI);

    // Weave intersection based on complexity
    float weave = vertical * horizontal;

    // Apply sharpness (rolloff controls edge crispness)
    weave = pow(abs(weave), 1.0 / max(sharpness, 0.1));

    return weave;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 center = vec2(0.5);
    vec2 toCenter = uv - center;
    float distFromCenter = length(toCenter);

    // Frame feedback with UV distortion
    vec2 distortedUV = uv;

    // Bass creates spiral vortex
    float bassAnim = animateEaseInOutSine(BASS);
    float spiralAngle = atan(toCenter.y, toCenter.x);
    float vortex = bassAnim * 0.025 * distFromCenter;
    distortedUV += vec2(
        cos(spiralAngle + time * (1.0 + FLUX * 2.0)) * vortex,
        sin(spiralAngle + time * (1.0 + FLUX * 2.0)) * vortex
    );

    // Flux adds turbulence
    float turbulence = animateEaseOutElastic(FLUX_Z);
    distortedUV += vec2(
        sin(distortedUV.y * 15.0 + time * 2.0) * turbulence * 0.012,
        cos(distortedUV.x * 15.0 + time * 1.8) * turbulence * 0.012
    );

    // Chromatic aberration based on roughness
    float aberrationAmount = ROUGHNESS * 0.003 + FLUX_Z * 0.002;
    vec2 rOffset = vec2(aberrationAmount, 0.0);
    vec2 bOffset = vec2(-aberrationAmount, 0.0);
    vec2 gOffset = vec2(0.0, aberrationAmount * 0.5);

    float r = getLastFrameColor(distortedUV + rOffset).r;
    float g = getLastFrameColor(distortedUV + gOffset).g;
    float b = getLastFrameColor(distortedUV + bOffset).b;

    // Aggressive fade to prevent white-out
    float fadeAmount = 0.82 + ENTROPY * 0.08;
    vec3 aberratedTrails = vec3(r, g, b) * fadeAmount;

    // Create weave patterns
    vec3 col = vec3(0.0);

    // Layer 1: Roughness controls density
    float roughnessAnim = animateEaseOutCubic(ROUGHNESS);
    float scale1 = 8.0 + roughnessAnim * 12.0;
    float weave1 = weavePattern(uv, scale1, ENTROPY, ROLLOFF * 2.0 + 0.5);

    // Layer 2: Entropy controls complexity
    float entropyAnim = animateEaseInOutSine(ENTROPY);
    float scale2 = 12.0 + entropyAnim * 18.0;
    float weave2 = weavePattern(uv, scale2, ENTROPY, ROLLOFF * 3.0 + 0.5);

    // Layer 3: Crest controls contrast
    float crestAnim = animateEaseOutExpo(CREST);
    float scale3 = 6.0 + crestAnim * 10.0;
    float weave3 = weavePattern(uv, scale3, ENTROPY, ROLLOFF * 1.5 + 0.5);

    // Combine weaves with different colors
    float centerLum = frameLuminance(vec2(0.5));

    // Color 1 - warm tones
    float hue1 = 0.05 + FLUX * 0.15 + centerLum * 0.1;
    vec3 color1 = hsl2rgb(vec3(mod(hue1, 1.0), 0.88, 0.58));

    // Color 2 - shifted hue
    float hue2 = 0.15 + ENTROPY * 0.2 + centerLum * 0.15;
    vec3 color2 = hsl2rgb(vec3(mod(hue2, 1.0), 0.92, 0.62));

    // Color 3 - accent
    float hue3 = 0.55 + ROUGHNESS * 0.25 + centerLum * 0.2;
    vec3 color3 = hsl2rgb(vec3(mod(hue3, 1.0), 0.85, 0.55));

    // Add weaves with brightness control
    float brightness = 0.4 + BASS_Z * 0.2;
    col += color1 * weave1 * brightness * 1.5;
    col += color2 * weave2 * brightness * 1.2;
    col += color3 * weave3 * brightness * 1.0;

    // Mix with trails - 20% new content
    float mixAmount = 0.18 + ENTROPY * 0.07;
    vec3 finalColor = mix(aberratedTrails, col, mixAmount);

    // Always clamp to prevent white-out
    finalColor = min(finalColor, vec3(1.0));

    fragColor = vec4(finalColor, 1.0);
}
