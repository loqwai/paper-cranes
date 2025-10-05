// Aperiodic Rhythm Field V7 - energy particles orbiting with rhythm layers
// Incorporates energy, bass, mids, treble, flux, centroid, roughness, spread, entropy, kurtosis

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Hash function for pseudo-random aperiodic patterns
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
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

    // Complex UV distortion - bass creates spiral, flux adds turbulence
    vec2 distortedUV = fragCoord.xy / resolution.xy;
    vec2 center = vec2(0.5);
    vec2 toCenter = distortedUV - center;
    float distFromCenter = length(toCenter);

    // Spiral distortion driven by bass and flux
    float spiralAngle = atan(toCenter.y, toCenter.x);
    float spiral = bassVal * 0.025 * distFromCenter;
    distortedUV += vec2(
        cos(spiralAngle + time * fluxVal) * spiral,
        sin(spiralAngle + time * fluxVal) * spiral
    );

    // Turbulent waves from treble and entropy
    distortedUV += vec2(
        sin(distortedUV.y * 15.0 + time * 2.0) * trebleVal * 0.01,
        cos(distortedUV.x * 15.0 + time * 2.5 + entropyVal * 5.0) * entropyVal * 0.012
    );

    // Get previous frame with distortion for flowing trails
    vec4 prevFrame = getLastFrameColor(distortedUV);

    // Polar coordinates
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    // Energy field visualization
    vec3 col = vec3(0.0);

    // Orbital particles with nonlinear bass animation
    float numOrbitals = 12.0;
    for (float i = 0.0; i < numOrbitals; i++) {
        // Elastic bounce on bass peaks
        float bassAnim = animateEaseOutElastic(bassZ);
        float orbitAngle = (i / numOrbitals) * TWO_PI + time * (0.5 + bassAnim * 2.0);

        // Smooth pulsing orbit radius
        float radiusPhase = animateEaseInOutSine(fract(time * 0.3 + i * 0.1));
        float orbitRadius = 0.35 + bassAnim * 0.4 * radiusPhase;

        vec2 particlePos = vec2(
            cos(orbitAngle) * orbitRadius,
            sin(orbitAngle) * orbitRadius
        );

        float particleDist = length(uv - particlePos);

        // Exponential size expansion on energy
        float energyAnim = animateEaseOutExpo(energyZ);
        float particleSize = 0.025 + energyAnim * 0.03;

        // Particle core
        float particle = smoothstep(particleSize, particleSize * 0.3, particleDist);

        // Pulsing glow
        float glowAnim = animatePulse(time * 2.0 + i);
        float glow = smoothstep(particleSize * 5.0, particleSize * 0.5, particleDist) * glowAnim * 0.7;

        // Color shifts with flux using smooth animation
        float colorShift = animateSmooth(fluxVal);
        vec3 particleColor = hsl2rgb(vec3((i / numOrbitals) * 0.7 + colorShift * 0.3, 0.9, 0.6));

        col += particleColor * (particle * 2.5 + glow) * (0.8 + energyAnim * 0.5);
    }

    // Energy rings with bouncing mids animation
    float numRings = 4.0;
    for (float r = 0.0; r < numRings; r++) {
        // Bounce effect on mids
        float midsAnim = animateBounce(midsVal);
        float ringPhase = time * 1.5 + r * 0.5;

        // Rings expand/contract with animated mids
        float ringRadius = 0.2 + (r / numRings) * 0.5 + midsAnim * 0.25 * animateEaseInOutSine(fract(ringPhase));
        float ringDist = abs(dist - ringRadius);

        // Ring visibility pulses
        float ringAnim = animatePulse(time * 2.0 + r * 0.3);
        float ring = smoothstep(0.04, 0.01, ringDist) * ringAnim;

        vec3 ringColor = hsl2rgb(vec3(0.1 + r * 0.15 + spreadVal * 0.2, 0.85, 0.55));
        col += ringColor * ring * (0.6 + midsAnim * 0.6);
    }

    // Beat explosion
    float beatFlash = beat ? 1.0 : 0.0;
    float beatBurst = beatFlash * smoothstep(0.8, 0.0, dist);
    col += vec3(beatBurst) * 1.5;

    // Center glow pulsing with energy
    float centerGlow = smoothstep(0.4, 0.0, dist) * energyVal;
    col += hsl2rgb(vec3(0.1 + fluxVal * 0.3, 0.9, 0.6)) * centerGlow;

    // Dynamic blend - more trails when quiet, sharper when energetic
    float blendAmount = 0.25 + (1.0 - energyVal) * 0.35;

    // Chromatic aberration on trails for shimmer effect
    vec2 rOffset = vec2(roughnessVal * 0.003, 0.0);
    vec2 bOffset = vec2(-roughnessVal * 0.003, 0.0);
    float r = getLastFrameColor(distortedUV + rOffset).r;
    float g = prevFrame.g;
    float b = getLastFrameColor(distortedUV + bOffset).b;
    vec3 aberratedTrails = vec3(r, g, b);

    vec3 finalColor = mix(col, aberratedTrails, blendAmount);

    fragColor = vec4(finalColor, 1.0);
}
