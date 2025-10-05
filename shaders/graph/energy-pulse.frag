// Aperiodic Rhythm Field V25 - Museum quality: crisp trails, enhanced micro-particles, demo-ready
// Energy (particle size), Bass (orbit radius), Mids (ring pulse), Treble (sparkles)
// Flux (color shift + turbulence), Centroid (particle hue bias), Roughness (saturation + aberration)
// Spread (ring hue + perpendicular wobble), Entropy (phase noise + mix), Kurtosis (lightness + ring phase)

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Hash function for pseudo-random aperiodic patterns
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

// Use previous frame luminance as entropy seed
float frameLuminance(vec2 uv) {
    vec4 prev = getLastFrameColor(uv);
    return dot(prev.rgb, vec3(0.299, 0.587, 0.114));
}

// Audio-biased noise - treat audio as offset to deterministic noise
float audioBiasedNoise(float seed, float audioOffset) {
    return hash(seed + audioOffset * 100.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy / resolution.xy - 0.5) * 2.0;
    uv.x *= resolution.x / resolution.y;

    // Audio features - mix normalized and z-scores for dynamic range
    float energyVal = clamp(energyNormalized, 0.0, 1.0);
    float bassVal = clamp(bassNormalized, 0.0, 1.0);
    float midsVal = clamp(midsNormalized, 0.0, 1.0);
    float trebleVal = clamp(trebleNormalized, 0.0, 1.0);
    float fluxVal = clamp(spectralFluxNormalized, 0.0, 1.0);
    float centroidVal = clamp(spectralCentroidNormalized, 0.0, 1.0);
    float roughnessVal = clamp(spectralRoughnessNormalized, 0.0, 1.0);
    float spreadVal = clamp(spectralSpreadNormalized, 0.0, 1.0);
    float entropyVal = clamp(spectralEntropyNormalized, 0.0, 1.0);
    float kurtosisVal = clamp(spectralKurtosisNormalized, 0.0, 1.0);

    // Z-scores for intensity peaks
    float energyZ = clamp(energyZScore * 0.5 + 0.5, 0.0, 1.0);
    float fluxZ = clamp(spectralFluxZScore * 0.5 + 0.5, 0.0, 1.0);
    float bassZ = clamp(bassZScore * 0.5 + 0.5, 0.0, 1.0);

    // Multi-layered UV distortion for rich trails
    vec2 distortedUV = fragCoord.xy / resolution.xy;
    vec2 center = vec2(0.5);
    vec2 toCenter = distortedUV - center;
    float distFromCenter = length(toCenter);

    // Bass creates vortex spiral
    float spiralAngle = atan(toCenter.y, toCenter.x);
    float bassAnim = animateEaseInOutSine(bassVal);
    float vortex = bassAnim * 0.035 * distFromCenter;
    distortedUV += vec2(
        cos(spiralAngle + time * (1.0 + fluxVal * 2.0)) * vortex,
        sin(spiralAngle + time * (1.0 + fluxVal * 2.0)) * vortex
    );

    // Energy creates radial push/pull
    float energyPulse = animatePulse(energyVal);
    distortedUV += normalize(toCenter) * energyPulse * 0.02;

    // Flux adds chaotic turbulence
    float turbulence = animateEaseOutElastic(fluxZ);
    distortedUV += vec2(
        sin(distortedUV.y * 20.0 + time * 3.0) * turbulence * 0.015,
        cos(distortedUV.x * 20.0 + time * 2.5) * turbulence * 0.015
    );

    // Get previous frame with distortion for flowing trails
    vec4 prevFrame = getLastFrameColor(distortedUV);

    // Polar coordinates
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    // Energy field visualization
    vec3 col = vec3(0.0);

    // Sample frame luminance at particle birth positions for entropy
    float centerLum = frameLuminance(vec2(0.5));

    // Orbital particles with evolving, aperiodic motion
    float numOrbitals = 12.0;
    for (float i = 0.0; i < numOrbitals; i++) {
        // Use audio-biased noise for particle phase - breaks periodicity
        float phaseNoise = audioBiasedNoise(i, fluxVal + time * 0.1);

        // Elastic bounce on bass peaks with entropy-driven variation
        float bassAnim = animateEaseOutElastic(bassZ);
        float angleSpeed = 0.5 + bassAnim * 2.0 + phaseNoise * entropyVal * 0.5;
        float orbitAngle = (i / numOrbitals) * TWO_PI + time * angleSpeed;

        // Evolving radius - uses frame feedback as seed
        float radiusSeed = i + centerLum * 10.0;
        float radiusNoise = audioBiasedNoise(radiusSeed, spreadVal);
        float radiusPhase = animateEaseInOutSine(fract(time * (0.3 + radiusNoise * 0.2) + i * 0.1));
        float orbitRadius = 0.35 + bassAnim * 0.4 * radiusPhase + radiusNoise * 0.15;

        // Aperiodic perpendicular wobble using audio-biased noise
        float perpAngle = orbitAngle + PI * 0.5;
        float perpSeed = i * 3.0 + time * kurtosisVal * 0.1;
        float perpNoise = audioBiasedNoise(perpSeed, entropyVal);
        float perpOffset = perpNoise * 0.12;

        vec2 particlePos = vec2(
            cos(orbitAngle) * orbitRadius + cos(perpAngle) * perpOffset,
            sin(orbitAngle) * orbitRadius + sin(perpAngle) * perpOffset
        );

        float particleDist = length(uv - particlePos);

        // Exponential size expansion on energy
        float energyAnim = animateEaseOutExpo(energyZ);
        float particleSize = 0.025 + energyAnim * 0.03;

        // Sharper, more defined particle core with hard edge
        float particle = smoothstep(particleSize, particleSize * 0.1, particleDist);
        float particleHard = smoothstep(particleSize * 0.5, 0.0, particleDist); // Hard bright center

        // Enhanced pulsing glow with more definition
        float glowAnim = animatePulse(time * 2.0 + i);
        float glow = smoothstep(particleSize * 5.0, particleSize * 0.5, particleDist) * glowAnim;

        // Evolving color palette using audio-biased noise
        float colorSeed = i * 7.0 + time * roughnessVal * 0.05;
        float colorNoise = audioBiasedNoise(colorSeed, centroidVal);
        float colorShift = animateSmooth(fluxVal);

        // Wider warm palette - deep reds to bright yellows with more variety
        float baseHue = 0.92 + (i / numOrbitals) * 0.35; // 0.92 to 1.27 for more color range
        float hue = baseHue + colorShift * 0.12 + colorNoise * 0.18 + centerLum * 0.1;
        hue = mod(hue, 1.0);

        // High saturation with variation for color depth
        float sat = 0.86 + roughnessVal * 0.14 + audioBiasedNoise(i + 50.0, spreadVal) * 0.1;
        // Brighter particles with dynamic range
        float light = 0.62 + kurtosisVal * 0.18 + energyAnim * 0.08;
        vec3 particleColor = hsl2rgb(vec3(hue, clamp(sat, 0.0, 1.0), light));

        // Dramatic particle brightness with sharp core + soft glow
        float particleIntensity = 0.8 + energyAnim * 0.4;
        col += particleColor * (particle * 3.2 + particleHard * 2.5 + glow * 1.2) * particleIntensity;
    }

    // Enhanced micro-particles for complexity - always visible, boosted by entropy
    float numMicro = 10.0; // More micro-particles
    float microVisibility = 0.4 + entropyVal * 0.6; // Always some, more with entropy
    for (float m = 0.0; m < numMicro; m++) {
        float microAngle = (m / numMicro) * TWO_PI + time * 2.8 + hash(m) * TWO_PI;
        float microRadius = 0.15 + hash(m + 10.0) * 0.18 + entropyVal * 0.12;

        vec2 microPos = vec2(
            cos(microAngle) * microRadius,
            sin(microAngle) * microRadius
        );

        float microDist = length(uv - microPos);
        float microSize = 0.010 + entropyVal * 0.014;
        float microParticle = smoothstep(microSize, microSize * 0.2, microDist);

        // Vivid complementary warm hues with more variety
        float microHue = mod(0.05 + m * 0.15 + entropyVal * 0.3 + hash(m + 30.0) * 0.15, 1.0);
        float microSat = 0.90 + hash(m + 40.0) * 0.10;
        float microLight = 0.60 + hash(m + 50.0) * 0.15;
        vec3 microColor = hsl2rgb(vec3(microHue, microSat, microLight));

        col += microColor * microParticle * (0.65 + entropyVal * 0.35) * microVisibility;
    }

    // Energy rings with aperiodic evolution
    float numRings = 4.0;
    for (float r = 0.0; r < numRings; r++) {
        // Sample frame at ring position for feedback-driven evolution
        float ringAngle = time * 0.5 + r;
        vec2 samplePos = vec2(0.5) + vec2(cos(ringAngle), sin(ringAngle)) * 0.3;
        float ringLum = frameLuminance(samplePos);

        // Bounce effect on mids with audio-biased phase variation
        float midsAnim = animateBounce(midsVal);
        float phaseNoise = audioBiasedNoise(r * 13.0, kurtosisVal + time * 0.05);
        float ringPhase = time * (1.5 + phaseNoise * 0.5) + r * (0.5 + ringLum * 0.3);

        // Aperiodic radius using audio bias + frame feedback
        float radiusNoise = audioBiasedNoise(r * 17.0 + time * 0.1, spreadVal);
        float baseRingRadius = 0.2 + (r / numRings) * 0.5;
        float ringRadius = baseRingRadius + midsAnim * 0.25 * animateEaseInOutSine(fract(ringPhase)) + radiusNoise * 0.08;
        float ringDist = abs(dist - ringRadius);

        // EXPLOSIVE ring pulses with mids - highly visible
        float ringAnim = animateBounce(midsVal);
        float ringPulse = animateEaseOutElastic(midsAnim);
        float ringIntensity = 0.7 + midsAnim * 1.2; // Much stronger intensity
        float ring = smoothstep(0.06, 0.003, ringDist) * ringIntensity;
        float ringGlow = smoothstep(0.15, 0.01, ringDist) * ringPulse * 0.8;

        // Rich ring colors - deeper, more saturated
        float colorNoise = audioBiasedNoise(r * 23.0 + time * 0.08, fluxVal);
        float ringHue = 0.98 + r * 0.08 + spreadVal * 0.15 + colorNoise * 0.12 + ringLum * 0.08;
        ringHue = mod(ringHue, 1.0);
        float ringSat = 0.92 + spreadVal * 0.08;
        vec3 ringColor = hsl2rgb(vec3(ringHue, ringSat, 0.48)); // Lighter for visibility
        col += ringColor * (ring * 0.6 + ringGlow) * (0.4 + midsAnim * 0.6);
    }

    // Vivid treble sparkles - bright and noticeable
    float trebleZ = clamp(trebleZScore * 0.5 + 0.5, 0.0, 1.0);
    if (trebleZ > 0.4) { // Lower threshold for more sparkles
        float numSparkles = 18.0; // More sparkles
        for (float s = 0.0; s < numSparkles; s++) {
            float sparkleAngle = hash(s) * TWO_PI + time * (1.0 + hash(s + 100.0) * 2.5);
            float sparkleRadius = 0.6 + hash(s + 200.0) * 0.3;

            vec2 sparklePos = vec2(
                cos(sparkleAngle) * sparkleRadius,
                sin(sparkleAngle) * sparkleRadius
            );

            float sparkleDist = length(uv - sparklePos);
            float sparkleAnim = animatePulse(time * 6.0 + s * 0.25);
            float sparkle = smoothstep(0.018, 0.0, sparkleDist) * sparkleAnim * (0.5 + trebleZ * 0.8);

            // Brilliant white-yellow sparkles with more punch
            vec3 sparkleColor = vec3(1.0, 0.95, 0.6);
            col += sparkleColor * sparkle * 1.2;
        }
    }

    // Beat explosion - DRAMATIC and visible
    float beatFlash = beat ? 1.0 : 0.0;
    float beatAnim = animateEaseOutElastic(beatFlash);
    float beatBurst = beatAnim * smoothstep(0.8, 0.0, dist);
    // Warm white flash on beat
    vec3 beatColor = vec3(1.0, 0.95, 0.85);
    col += beatColor * beatBurst * 0.6;

    // Center energy core - BARELY visible warm accent only
    float coreAnim = animateEaseInOutSine(energyVal);
    float centerGlow = smoothstep(0.12, 0.0, dist) * coreAnim * 0.08;
    vec3 coreColor = hsl2rgb(vec3(0.08 + fluxVal * 0.05, 0.85, 0.35));
    col += coreColor * centerGlow;

    // Optimized fade for crisp trails with depth
    float fadeAmount = 0.80 + energyZ * 0.10 - entropyVal * 0.04;  // Balanced for clarity

    // Subtle chromatic aberration for shimmer, not blur
    float aberrationAmount = roughnessVal * 0.0035 + fluxZ * 0.002;
    vec2 rOffset = vec2(aberrationAmount, 0.0);
    vec2 bOffset = vec2(-aberrationAmount, 0.0);
    vec2 gOffset = vec2(0.0, aberrationAmount * 0.5);

    float r = getLastFrameColor(distortedUV + rOffset).r;
    float g = getLastFrameColor(distortedUV + gOffset).g;
    float b = getLastFrameColor(distortedUV + bOffset).b;
    vec3 aberratedTrails = vec3(r, g, b) * fadeAmount;

    // Optimized mix - crisp new content with flowing trails
    float mixAmount = 0.22 + entropyVal * 0.10 + energyZ * 0.05;
    vec3 finalColor = mix(aberratedTrails, col, mixAmount);

    // Prevent white-out with smart clamping
    finalColor = clamp(finalColor, 0.0, 1.0);

    // Subtle vignette with warm edge glow for professional depth
    float vignette = 1.0 - pow(distFromCenter, 1.9) * 0.30;
    float edgeGlow = smoothstep(1.0, 0.75, distFromCenter) * 0.12 * energyVal;
    finalColor *= vignette;
    // Warm amber edge glow
    finalColor += vec3(edgeGlow) * hsl2rgb(vec3(0.08 + fluxVal * 0.03, 0.75, 0.32));

    fragColor = vec4(finalColor, 1.0);
}
