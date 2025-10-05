// Holistic Organism - Every feature gives it life
// A living being where music is its breath, blood, and nervous system

#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Hash function for aperiodic noise
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

// Audio-biased noise - treat audio as offset to deterministic noise
float audioBiasedNoise(float seed, float audioOffset) {
    return hash(seed + audioOffset * 100.0);
}

// Get frame luminance for entropy
float frameLuminance(vec2 uv) {
    vec4 prev = getLastFrameColor(uv);
    return dot(prev.rgb, vec3(0.299, 0.587, 0.114));
}

// BODY STRUCTURE
// Bass → Core body scale (breathing)
// Mids → Mid-body pulsing
// Treble → Surface shimmer/nerves

// MOVEMENT & POSITION
// Energy → Overall scale/breathing rate
// SpectralCentroid → Vertical position (pitch = height)
// SpectralSpread → Limb extension/reach

// TEXTURE & CHARACTER
// SpectralRoughness → Surface texture/skin quality
// SpectralEntropy → Chaos/nervous system activity
// SpectralFlux → Movement speed/metabolism

// ASYMMETRY & EDGES
// SpectralKurtosis → Body symmetry
// SpectralSkew → Tilt/lean direction
// SpectralRolloff → Edge definition
// SpectralCrest → Sharpness of features
// PitchClass → Color shifting

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = vec2(0.5);
    vec2 pos = (fragCoord - iResolution.xy * 0.5) / min(iResolution.x, iResolution.y);

    // Sample frame feedback for entropy
    float centerLum = frameLuminance(center);
    float localLum = frameLuminance(uv);

    // === AUDIO FEATURE MAPPING ===

    // Breathing/Core (Bass + Energy)
    float breathRate = bass * 2.0 + energy * 1.5;
    float breathPhase = animatePulse(fract(time * (0.3 + bassZScore * 0.2)));
    float coreSize = 0.15 + animateEaseOutElastic(bassZScore) * 0.15 + breathPhase * 0.08;

    // Vertical position (Centroid = pitch = height)
    float verticalOffset = (spectralCentroidNormalized - 0.5) * 0.6;

    // Limb extension (Spread)
    float limbReach = 0.25 + animateEaseInOutSine(spectralSpreadNormalized) * 0.35;

    // Movement speed (Flux)
    float metabolismSpeed = 0.5 + spectralFluxNormalized * 2.0;

    // Surface texture (Roughness)
    float skinRoughness = spectralRoughnessNormalized;

    // Nervous system chaos (Entropy)
    float nerveChaos = spectralEntropyNormalized;

    // Body asymmetry (Kurtosis)
    float asymmetry = (spectralKurtosisNormalized - 0.5) * 2.0;

    // Tilt/Lean (Skew)
    float bodyTilt = (spectralSkewNormalized - 0.5) * PI * 0.3;

    // Edge definition (Rolloff)
    float edgeSharpness = spectralRolloffNormalized;

    // Feature sharpness (Crest)
    float featureSharp = spectralCrestNormalized;

    // Color shift (PitchClass)
    float colorShift = pitchClassNormalized;

    // Mid-body pulsing (Mids)
    float midPulse = animateEaseInOutQuad(midsNormalized);

    // Surface shimmer (Treble)
    float shimmer = trebleNormalized;

    // === FRAME FEEDBACK WITH DISTORTION ===

    vec2 distortedUV = uv;
    vec2 toCenter = uv - center;
    float distFromCenter = length(toCenter);

    // Breathing distortion - organism pulses
    float breathDistort = animatePulse(energy) * 0.03;
    distortedUV += normalize(toCenter) * breathDistort * (1.0 - distFromCenter);

    // Nervous system turbulence
    float nerveTime = time * metabolismSpeed;
    float nerveTurbulence = nerveChaos * 0.02;
    distortedUV += vec2(
        sin(uv.y * 15.0 + nerveTime) * nerveTurbulence,
        cos(uv.x * 15.0 + nerveTime * 0.8) * nerveTurbulence
    );

    // Chromatic aberration based on roughness
    float aberration = skinRoughness * 0.003 + spectralFluxZScore * 0.002;
    vec2 rOffset = vec2(aberration, 0.0);
    vec2 bOffset = vec2(-aberration, 0.0);

    float r = getLastFrameColor(distortedUV + rOffset).r;
    float g = getLastFrameColor(distortedUV).g;
    float b = getLastFrameColor(distortedUV + bOffset).b;

    // ULTRA aggressive fade to prevent white-out accumulation
    float fadeAmount = 0.60 + energyZScore * 0.02;
    vec3 trails = vec3(r, g, b) * fadeAmount;

    // Hard clamp trails to prevent accumulation
    trails = min(trails, vec3(0.45));

    // === ORGANISM STRUCTURE ===

    vec3 col = vec3(0.0);

    // Adjust position for vertical movement and tilt
    vec2 orgPos = pos;
    orgPos.y -= verticalOffset;

    // Apply body tilt rotation
    float cosT = cos(bodyTilt);
    float sinT = sin(bodyTilt);
    vec2 tiltedPos = vec2(
        orgPos.x * cosT - orgPos.y * sinT,
        orgPos.x * sinT + orgPos.y * cosT
    );

    // === CORE BODY (Central mass) ===
    float coreDist = length(tiltedPos);

    // Asymmetric core using noise
    float coreNoise = audioBiasedNoise(atan(tiltedPos.y, tiltedPos.x) * 5.0, centerLum);
    float asymmetricCore = coreSize * (1.0 + asymmetry * 0.3 * coreNoise);

    float coreGlow = smoothstep(asymmetricCore * 1.5, asymmetricCore * 0.5, coreDist);
    float coreSolid = smoothstep(asymmetricCore * 1.1, asymmetricCore * 0.9, coreDist);

    // Core color - deep reds/oranges
    float coreHue = 0.95 + colorShift * 0.10; // 0.95-1.05 = deep red to orange
    coreHue = mod(coreHue, 1.0);
    vec3 coreColor = hsl2rgb(vec3(coreHue, 0.88, 0.35));

    // Minimal core - just a hint (reduced brightness)
    col += coreColor * coreGlow * 0.04 * (0.15 + energy * 0.08);

    // === LIMBS/TENDRILS (6 major limbs) ===
    for (float i = 0.0; i < 6.0; i++) {
        float limbIndex = i / 6.0;

        // Audio-biased phase for aperiodic motion
        float phaseNoise = audioBiasedNoise(i, spectralFluxNormalized + time * 0.05);

        // Limb angle with organic wobble
        float baseAngle = limbIndex * TWO_PI;
        float wobbleSpeed = metabolismSpeed * (0.8 + phaseNoise * 0.4);
        float limbAngle = baseAngle + time * wobbleSpeed + nerveChaos * sin(time * 2.0 + i) * 0.5;

        // Limb reach varies with spread
        float reachNoise = audioBiasedNoise(i * 3.0, spectralSpreadNormalized);
        float limbLength = limbReach * (0.8 + reachNoise * 0.4) * (1.0 + midPulse * 0.3);

        // Limb position
        vec2 limbDir = vec2(cos(limbAngle), sin(limbAngle));
        vec2 limbEnd = limbDir * limbLength;

        // Distance to limb line
        vec2 toEnd = limbEnd - tiltedPos;
        float projLength = dot(tiltedPos, limbDir);
        projLength = clamp(projLength, 0.0, limbLength);
        vec2 closest = limbDir * projLength;
        float limbDist = length(tiltedPos - closest);

        // Limb thickness varies along length - thicker for visibility
        float thickness = 0.025 * (1.5 - projLength / limbLength) * (1.0 + featureSharp * 0.5);

        // Edge definition from rolloff
        float edgeSoftness = 1.0 - edgeSharpness * 0.5;
        float limbCore = smoothstep(thickness * (1.0 + edgeSoftness), thickness * edgeSoftness, limbDist);
        float limbGlow = smoothstep(thickness * 3.0, thickness, limbDist) * 0.6;

        // Limb color shifts per limb - warm reds/oranges/pinks
        float limbColorNoise = audioBiasedNoise(i * 7.0 + time * 0.03, localLum);
        float limbHue = coreHue + 0.03 + limbIndex * 0.12 + limbColorNoise * 0.15 + spectralFluxNormalized * 0.12;
        limbHue = mod(limbHue, 1.0);
        vec3 limbColor = hsl2rgb(vec3(limbHue, 0.82 + skinRoughness * 0.12, 0.52));

        col += limbColor * (limbCore * 1.8 + limbGlow * 0.6) * (0.5 + energy * 0.3);
    }

    // === SURFACE NERVES (Treble shimmer) ===
    // Small nerve-like particles on surface
    for (float i = 0.0; i < 20.0; i++) {
        float nervePhase = audioBiasedNoise(i * 1.5, shimmer + time * 0.1);
        float nerveAngle = nervePhase * TWO_PI + time * metabolismSpeed * 2.0;
        float nerveRadius = 0.1 + nerveChaos * 0.3 + sin(time * 3.0 + i) * 0.1;

        vec2 nervePos = vec2(cos(nerveAngle), sin(nerveAngle)) * nerveRadius;
        float nerveDist = length(tiltedPos - nervePos);

        float nerveSize = 0.004 + shimmer * 0.006;
        float nerveGlow = smoothstep(nerveSize * 4.0, nerveSize * 0.5, nerveDist);

        // Subtle nerve sparkles (reduced)
        col += vec3(0.9, 0.8, 0.6) * nerveGlow * shimmer * 0.15;
    }

    // === PULSING RINGS (Mids frequency) ===
    // Mid-body rhythmic pulses
    float ringPhase = fract(time * (0.4 + mids * 0.6));
    float ringRadius = coreSize + ringPhase * limbReach;
    float ringDist = abs(coreDist - ringRadius);
    float ringWidth = 0.01 + midPulse * 0.02;
    float ring = smoothstep(ringWidth * 2.0, ringWidth * 0.3, ringDist) * (1.0 - ringPhase);

    vec3 ringColor = hsl2rgb(vec3(mod(coreHue + 0.1, 1.0), 0.8, 0.65));
    col += ringColor * ring * midPulse * 0.6;

    // === BREATHING AURA (Energy field) ===
    // Outer glow that breathes
    float auraRadius = coreSize + limbReach;
    float auraDist = coreDist - auraRadius;
    float aura = exp(-auraDist * (8.0 - energy * 5.0)) * breathPhase;

    vec3 auraColor = hsl2rgb(vec3(mod(coreHue + 0.5, 1.0), 0.7, 0.5));
    col += auraColor * aura * energy * 0.12;

    // === FINAL COMPOSITION ===

    // Mix with trails - more trails visible
    float mixAmount = 0.22 + nerveChaos * 0.08;
    vec3 final = mix(trails, col, mixAmount);

    // Clamp to prevent white-out
    final = min(final, vec3(1.0));

    fragColor = vec4(final, 1.0);
}
