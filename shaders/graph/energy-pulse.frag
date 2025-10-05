// Aperiodic Rhythm Field V7 - energy particles orbiting with rhythm layers
// Incorporates energy, bass, mids, treble, flux, centroid, roughness, spread, entropy, kurtosis

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

        // Brighter, more visible particle core
        float particle = smoothstep(particleSize, particleSize * 0.2, particleDist);

        // Enhanced pulsing glow
        float glowAnim = animatePulse(time * 2.0 + i);
        float glow = smoothstep(particleSize * 6.0, particleSize * 0.3, particleDist) * glowAnim;

        // Evolving color palette using audio-biased noise
        float colorSeed = i * 7.0 + time * roughnessVal * 0.05;
        float colorNoise = audioBiasedNoise(colorSeed, centroidVal);
        float colorShift = animateSmooth(fluxVal);

        // Hue evolves based on noise + audio + frame feedback
        float hue = (i / numOrbitals) * 0.9 + colorShift * 0.3 + colorNoise * 0.4 + centerLum * 0.2 + 0.5;
        hue = mod(hue, 1.0);

        // Saturation varies with roughness
        float sat = 0.85 + roughnessVal * 0.15 + audioBiasedNoise(i + 50.0, spreadVal) * 0.1;
        vec3 particleColor = hsl2rgb(vec3(hue, sat, 0.62));

        // Controlled particle brightness - dramatic but not blinding
        col += particleColor * (particle * 2.0 + glow * 0.8) * (0.6 + energyAnim * 0.4);
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

        // Stronger ring visibility with dramatic pulse
        float ringAnim = animatePulse(time * 1.5 + r * 0.4);
        float ring = smoothstep(0.05, 0.008, ringDist) * ringAnim;
        float ringGlow = smoothstep(0.1, 0.02, ringDist) * ringAnim * 0.4;

        // Evolving ring colors using frame feedback + audio bias
        float colorNoise = audioBiasedNoise(r * 23.0 + time * 0.08, fluxVal);
        float ringHue = 0.05 + r * 0.15 + spreadVal * 0.1 + colorNoise * 0.3 + ringLum * 0.15;
        ringHue = mod(ringHue, 1.0);
        vec3 ringColor = hsl2rgb(vec3(ringHue, 0.88, 0.52));
        col += ringColor * (ring * 0.8 + ringGlow) * (0.5 + midsAnim * 0.5);
    }

    // Treble sparkles - delicate, not overwhelming
    float trebleZ = clamp(trebleZScore * 0.5 + 0.5, 0.0, 1.0);
    if (trebleZ > 0.5) {
        float numSparkles = 15.0;
        for (float s = 0.0; s < numSparkles; s++) {
            float sparkleAngle = hash(s) * TWO_PI + time * (1.0 + hash(s + 100.0) * 2.0);
            float sparkleRadius = 0.65 + hash(s + 200.0) * 0.25;

            vec2 sparklePos = vec2(
                cos(sparkleAngle) * sparkleRadius,
                sin(sparkleAngle) * sparkleRadius
            );

            float sparkleDist = length(uv - sparklePos);
            float sparkleAnim = animatePulse(time * 5.0 + s * 0.3);
            float sparkle = smoothstep(0.015, 0.0, sparkleDist) * sparkleAnim * trebleZ;

            vec3 sparkleColor = vec3(1.0, 0.9, 0.7);
            col += sparkleColor * sparkle * 0.8;
        }
    }

    // Beat explosion - sharp but contained
    float beatFlash = beat ? 1.0 : 0.0;
    float beatAnim = animateEaseOutElastic(beatFlash);
    float beatBurst = beatAnim * smoothstep(0.7, 0.0, dist);
    col += vec3(beatBurst) * 0.6;

    // Center energy core - very subtle accent only
    float coreAnim = animateEaseInOutSine(energyVal);
    float centerGlow = smoothstep(0.15, 0.0, dist) * coreAnim * 0.3;
    vec3 coreColor = hsl2rgb(vec3(0.05 + fluxVal * 0.4, 0.7, 0.4));
    col += coreColor * centerGlow;

    // Aggressive fade to prevent accumulation and white-out
    float fadeAmount = 0.80 + energyZ * 0.10;  // Much faster fade

    // Enhanced chromatic aberration
    float aberrationAmount = roughnessVal * 0.004 + fluxZ * 0.002;
    vec2 rOffset = vec2(aberrationAmount, 0.0);
    vec2 bOffset = vec2(-aberrationAmount, 0.0);
    vec2 gOffset = vec2(0.0, aberrationAmount * 0.5);

    float r = getLastFrameColor(distortedUV + rOffset).r;
    float g = getLastFrameColor(distortedUV + gOffset).g;
    float b = getLastFrameColor(distortedUV + bOffset).b;
    vec3 aberratedTrails = vec3(r, g, b) * fadeAmount;

    // Heavy trails with sparse new content - prevents brightness buildup
    float mixAmount = 0.15 + entropyVal * 0.10;
    vec3 finalColor = mix(aberratedTrails, col, mixAmount);

    // Prevent white-out with smart clamping
    finalColor = min(finalColor, vec3(1.0));

    // Subtle vignette
    float vignette = 1.0 - distFromCenter * 0.25;
    finalColor *= vignette;

    fragColor = vec4(finalColor, 1.0);
}
