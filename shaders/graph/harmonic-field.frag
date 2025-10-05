// Harmonic field - particles in spectral distribution with frame feedback
// Spectral shape features create evolving, aperiodic patterns

#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define PARTICLE_COUNT 24.0

// Hash function for audio-biased noise
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

// Draw a glowing particle
float drawParticle(vec2 uv, vec2 pos, float size) {
    float dist = length(uv - pos);
    float particle = smoothstep(size * 1.2, 0.0, dist);
    float glow = smoothstep(size * 5.0, 0.0, dist) * 0.6;
    float outerGlow = smoothstep(size * 8.0, 0.0, dist) * 0.25;
    return particle + glow + outerGlow;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    vec2 centered = (uv - 0.5) * 2.0;
    vec2 center = vec2(0.5);

    // Get audio features
    float spreadVal = clamp(spectralSpreadNormalized, 0.0, 1.0);
    float centroidVal = clamp(spectralCentroidNormalized, 0.0, 1.0);
    float kurtosisVal = clamp(spectralKurtosisNormalized, 0.0, 1.0);
    float skewVal = clamp(spectralSkewNormalized, 0.0, 1.0);
    float rolloffVal = clamp(spectralRolloffNormalized, 0.0, 1.0);
    float centroidZ = clamp(spectralCentroidZScore, -1.0, 1.0);
    float spreadZ = clamp(spectralSpreadZScore, -1.0, 1.0);

    // Frame feedback entropy
    float centerLum = frameLuminance(vec2(0.5));

    // UV distortion for trails
    vec2 distortedUV = uv;
    vec2 toCenter = uv - center;
    float distFromCenter = length(toCenter);

    // Spread creates subtle vortex spiral - REDUCED to prevent over-clustering
    float spreadAnim = animateEaseInOutSine(spreadVal);
    float spiralAngle = atan(toCenter.y, toCenter.x);
    float vortex = spreadAnim * 0.008 * distFromCenter;
    distortedUV += vec2(
        cos(spiralAngle + time * (0.3 + centroidVal * 0.3)) * vortex,
        sin(spiralAngle + time * (0.3 + centroidVal * 0.3)) * vortex
    );

    // Centroid creates radial push/pull
    float centroidPulse = animatePulse(centroidVal);
    distortedUV += normalize(toCenter) * centroidPulse * 0.012;

    // Kurtosis adds subtle turbulent wobble - VERY reduced
    float edgeFade = smoothstep(0.0, 0.15, distFromCenter) * smoothstep(0.8, 0.6, distFromCenter);
    float turbulence = animateEaseOutElastic(kurtosisVal) * edgeFade;
    distortedUV += vec2(
        sin(distortedUV.y * 15.0 + time * 2.0) * turbulence * 0.004,
        cos(distortedUV.x * 15.0 + time * 1.8) * turbulence * 0.004
    );

    // Chromatic aberration with rolloff modulation - clamp at edges
    float aberrationAmount = (kurtosisVal * 0.004 + rolloffVal * 0.002) * min(distFromCenter, 0.7);
    vec2 rOffset = vec2(aberrationAmount, 0.0);
    vec2 bOffset = vec2(-aberrationAmount, 0.0);
    vec2 gOffset = vec2(0.0, aberrationAmount * 0.5);

    // Clamp UV sampling to prevent edge wrap
    vec2 uvR = clamp(distortedUV + rOffset, vec2(0.001), vec2(0.999));
    vec2 uvG = clamp(distortedUV + gOffset, vec2(0.001), vec2(0.999));
    vec2 uvB = clamp(distortedUV + bOffset, vec2(0.001), vec2(0.999));

    float r = getLastFrameColor(uvR).r;
    float g = getLastFrameColor(uvG).g;
    float b = getLastFrameColor(uvB).b;

    // Aggressive fade to prevent accumulation - MUCH faster fade
    float fadeAmount = 0.70 + spreadZ * 0.05;
    vec3 trails = vec3(r, g, b) * fadeAmount;

    // Draw particles in spectral distribution
    vec3 col = vec3(0.0);

    for (float i = 0.0; i < PARTICLE_COUNT; i++) {
        float t = i / (PARTICLE_COUNT - 1.0);

        // Audio-biased phase for aperiodic motion
        float phaseNoise = audioBiasedNoise(i, centroidZ + time * 0.1);

        // Angle speed with elastic animation
        float centroidAnim = animateEaseOutElastic(centroidZ * 0.5 + 0.5);
        float angleSpeed = 0.3 + centroidAnim * 1.5 + phaseNoise * spreadVal * 0.3;
        float orbitAngle = (i / PARTICLE_COUNT) * TWO_PI + time * angleSpeed;

        // Radius with aperiodic wobble
        float radiusNoise = audioBiasedNoise(i + centerLum * 10.0, spreadVal);
        float radiusPhase = animateEaseInOutSine(fract(time * (0.2 + radiusNoise * 0.15)));

        // SPREAD controls orbit radius - LARGER for better distribution
        float spreadAnim2 = animateEaseOutElastic(spreadVal);
        float baseRadius = 0.15 + spreadAnim2 * 0.25;
        float orbitRadius = baseRadius * (0.8 + radiusPhase * 0.4);

        // KURTOSIS creates vertical clustering (tight vs spread)
        float kurtosisEffect = mix(
            sin(t * PI * 3.0) * 0.15,  // Spread pattern - REDUCED
            0.0,                        // Tight center
            kurtosisVal
        );

        // SKEW tilts the distribution
        float skewEffect = (skewVal - 0.5) * (t - 0.5) * 0.2;

        // CENTROID shifts vertical position - REDUCED to keep on screen
        float centroidShift = (centroidVal - 0.5) * 0.25;

        // Perpendicular wobble for organic motion
        float perpNoise = audioBiasedNoise(i * 3.0 + time * kurtosisVal * 0.1, rolloffVal);
        float perpAngle = orbitAngle + PI * 0.5;
        float perpOffset = perpNoise * 0.1;

        vec2 particlePos = vec2(0.5) + vec2(
            cos(orbitAngle) * orbitRadius + cos(perpAngle) * perpOffset,
            sin(orbitAngle) * orbitRadius + sin(perpAngle) * perpOffset + centroidShift + kurtosisEffect + skewEffect
        );

        // ROLLOFF affects visibility (higher frequency particles fade)
        float visibility = smoothstep(rolloffVal - 0.2, rolloffVal + 0.3, 1.0 - t);

        // Evolving color using noise + frame feedback - rich spectrum
        float colorNoise = audioBiasedNoise(i * 7.0 + time * kurtosisVal * 0.05, centroidVal);
        float timeShift = time * rolloffVal * 0.03;
        float hue = (t * 0.75) + centroidVal * 0.25 + colorNoise * 0.35 + centerLum * 0.2 + timeShift;
        hue = mod(hue, 1.0);

        // Saturation varies with skew
        float sat = 0.88 + skewVal * 0.12;
        vec3 particleColor = hsl2rgb(vec3(hue, sat, 0.62));

        // Draw particle with MUCH higher brightness to overcome trails
        float particle = drawParticle(uv, particlePos, 0.020);
        float energyAnim = animateEaseOutExpo(spreadZ * 0.5 + 0.5);
        col += particleColor * particle * visibility * (6.0 + energyAnim * 2.5);
    }

    // Add VERY subtle center ambient glow (controlled carefully)
    float centerDist = length(uv - vec2(0.5));
    float centerGlow = smoothstep(0.4, 0.0, centerDist) * centroidVal * 0.015;
    vec3 glowColor = hsl2rgb(vec3(centroidVal * 0.6 + time * 0.02, 0.6, 0.35));
    col += glowColor * centerGlow;

    // Mix trails and new content - MORE new content to keep particles visible
    float mixAmount = 0.35 + kurtosisVal * 0.15;
    vec3 finalColor = mix(trails, col, mixAmount);

    // Always clamp to prevent white-out
    finalColor = min(finalColor, vec3(1.0));

    fragColor = vec4(finalColor, 1.0);
}
