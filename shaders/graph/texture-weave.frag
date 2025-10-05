// Woven Texture - Spectral Quality Features
// Museum quality fabric weaving responding to:
// - spectralRoughness → texture density/grittiness
// - spectralEntropy → pattern chaos
// - spectralRolloff → edge sharpness
// - spectralCrest → contrast

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Spectral Quality features (independent domain) - NO FALLBACKS
#define ROUGHNESS (spectralRoughnessNormalized)
#define ENTROPY (spectralEntropyNormalized)
#define ROLLOFF (spectralRolloffNormalized)
#define CREST (spectralCrestNormalized)

// Z-scores for peaks/drops - NO FALLBACKS
#define ROUGHNESS_Z (spectralRoughnessZScore)
#define ENTROPY_Z (spectralEntropyZScore)
#define ROLLOFF_Z (spectralRolloffZScore)
#define CREST_Z (spectralCrestZScore)

// Secondary features for enrichment
#define FLUX (spectralFluxNormalized)
#define BASS (bassNormalized)

// Hash function for noise
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

// Frame luminance for entropy seed
float frameLuminance(vec2 uv) {
    vec4 prev = getLastFrameColor(uv);
    return dot(prev.rgb, vec3(0.299, 0.587, 0.114));
}

// Audio-biased noise
float audioBiasedNoise(float seed, float audioOffset) {
    return hash(seed + audioOffset * 100.0);
}

// Warp noise for organic distortion
float warpNoise(vec2 p, float time, float audioFactor) {
    return sin(p.x * 5.0 + time + audioFactor) *
           cos(p.y * 5.0 - time * 0.8 + audioFactor) * 0.5 + 0.5;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    vec2 center = vec2(0.5);
    vec2 toCenter = uv - center;
    float distFromCenter = length(toCenter);

    // Get frame feedback for entropy
    float centerLum = frameLuminance(center);

    // Animate features with curves
    float roughnessAnim = animateEaseOutElastic(ROUGHNESS_Z);
    float entropyAnim = animateEaseInOutSine(ENTROPY);
    float rolloffAnim = animateEaseOutExpo(ROLLOFF);
    float crestAnim = animatePulse(CREST);

    // Frame feedback distortion - multi-layered
    vec2 distortedUV = uv;

    // Layer 1: Entropy creates chaotic turbulence
    float turbulence = entropyAnim * 0.02;
    distortedUV += vec2(
        sin(uv.y * 15.0 + time * 2.0 + centerLum * TWO_PI) * turbulence,
        cos(uv.x * 15.0 + time * 1.8 - centerLum * TWO_PI) * turbulence
    );

    // Layer 2: Roughness creates wavy distortion
    float waviness = roughnessAnim * 0.015;
    distortedUV += vec2(
        sin(uv.y * 20.0 - time * 3.0 + ENTROPY * 10.0) * waviness,
        cos(uv.x * 20.0 + time * 2.5 + ROUGHNESS * 10.0) * waviness
    );

    // Layer 3: Rolloff creates radial pull
    float radialPull = rolloffAnim * 0.01;
    distortedUV += normalize(toCenter) * radialPull * distFromCenter;

    // Chromatic aberration based on crest
    float aberrationAmount = CREST * 0.003 + ROUGHNESS_Z * 0.002;
    vec2 rOffset = vec2(aberrationAmount, 0.0);
    vec2 bOffset = vec2(-aberrationAmount, 0.0);
    vec2 gOffset = vec2(0.0, aberrationAmount * 0.5);

    float r = getLastFrameColor(distortedUV + rOffset).r;
    float g = getLastFrameColor(distortedUV + gOffset).g;
    float b = getLastFrameColor(distortedUV + bOffset).b;

    // Aggressive fade to prevent white-out
    float fadeAmount = 0.82 + ENTROPY * 0.08;
    vec3 aberratedTrails = vec3(r, g, b) * fadeAmount;

    // Create woven texture pattern - fix aspect ratio and scale to fill screen
    vec2 weaveUV = (uv - 0.5) * 2.0; // Center at origin
    weaveUV.x *= resolution.x / resolution.y; // Fix aspect ratio

    // Warp threads - horizontal and vertical (increased density for finer weave)
    float threadDensity = 50.0 + ROUGHNESS * 50.0; // 50-100 threads
    float warpFreq = threadDensity;
    float weftFreq = threadDensity * 0.93; // Slightly different for realism

    // Audio-biased noise for thread irregularity
    float warpNoise1 = audioBiasedNoise(floor(weaveUV.y * warpFreq), ENTROPY + time * 0.05);
    float weftNoise1 = audioBiasedNoise(floor(weaveUV.x * weftFreq), ROLLOFF + time * 0.05);

    // Thread positions with organic variation
    float warpPos = fract(weaveUV.y * warpFreq + warpNoise1 * 0.3);
    float weftPos = fract(weaveUV.x * weftFreq + weftNoise1 * 0.3);

    // Thread thickness varies with roughness
    float threadThick = 0.5 + roughnessAnim * 0.2;

    // Weave pattern - over/under
    float weavePattern = step(0.5, fract((floor(weaveUV.x * weftFreq) +
                                          floor(weaveUV.y * warpFreq)) * 0.5));

    // Thread visibility - much more visible
    float warpThread = smoothstep(threadThick, threadThick - 0.2, abs(warpPos - 0.5) * 2.0);
    float weftThread = smoothstep(threadThick, threadThick - 0.2, abs(weftPos - 0.5) * 2.0);

    // Combine threads based on weave pattern - always show something
    float thread = max(0.4, mix(warpThread, weftThread, weavePattern));

    // Thread glow based on crest
    float threadGlow = thread * crestAnim * 0.4;

    // Evolving thread colors using frame feedback
    float warpColorSeed = floor(weaveUV.y * warpFreq) + time * FLUX * 0.1;
    float weftColorSeed = floor(weaveUV.x * weftFreq) + time * FLUX * 0.1;

    float warpColorNoise = audioBiasedNoise(warpColorSeed, ROLLOFF);
    float weftColorNoise = audioBiasedNoise(weftColorSeed, ENTROPY);

    // Warm woven fabric hues - MORE VARIATION for visible audio response
    float warpHue = 0.02 + warpColorNoise * 0.15 + centerLum * 0.1 + ROUGHNESS * 0.2;
    float weftHue = 0.08 + weftColorNoise * 0.15 + centerLum * 0.1 + ENTROPY * 0.2;

    // Saturation varies dramatically with features
    float warpSat = 0.75 + ROUGHNESS * 0.25;
    float weftSat = 0.78 + CREST * 0.22;

    // Lightness varies MORE with rolloff for visible depth changes
    float warpLight = 0.45 + rolloffAnim * 0.25;
    float weftLight = 0.47 + ENTROPY * 0.23;

    vec3 warpColor = hsl2rgb(vec3(mod(warpHue, 1.0), warpSat, warpLight));
    vec3 weftColor = hsl2rgb(vec3(mod(weftHue, 1.0), weftSat, weftLight));

    // Blend thread colors based on weave pattern
    vec3 threadColor = mix(warpColor, weftColor, weavePattern);

    // Add texture highlights - sharp edges based on rolloff
    float edgeSharpness = 1.0 + ROLLOFF * 3.0;
    float highlight = pow(thread, edgeSharpness) * (0.3 + crestAnim * 0.3);

    // Fabric texture layer - MUCH brighter to overcome trails (4-6x)
    vec3 fabricTexture = threadColor * (thread * 5.0 + threadGlow * 2.0 + 0.4) * (1.2 + CREST * 0.8);
    fabricTexture += vec3(1.0) * highlight * 1.2;

    // Add shimmer particles on texture peaks
    float shimmerFreq = 80.0 + ENTROPY * 100.0;
    vec2 shimmerUV = weaveUV * shimmerFreq;
    float shimmerNoise = audioBiasedNoise(
        floor(shimmerUV.x) + floor(shimmerUV.y) * 100.0,
        ROUGHNESS + time * 0.2
    );

    float shimmer = step(0.95, shimmerNoise) * crestAnim;

    // Shimmer color - bright accent
    float shimmerHue = 0.08 + FLUX * 0.2 + centerLum * 0.15;
    vec3 shimmerColor = hsl2rgb(vec3(mod(shimmerHue, 1.0), 0.95, 0.85));

    fabricTexture += shimmerColor * shimmer * 1.5;

    // Mix with trails - MUCH lower for visible feedback (15-25% new)
    float mixAmount = 0.18 + ENTROPY * 0.07;
    vec3 finalColor = mix(aberratedTrails, fabricTexture, mixAmount);

    // Always clamp to prevent white-out
    finalColor = min(finalColor, vec3(1.0));

    fragColor = vec4(finalColor, 1.0);
}
