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

    // EXTREME fade to prevent white-out accumulation
    float fadeAmount = 0.92;  // Slower fade for smooth trails
    vec3 trails = vec3(r, g, b) * fadeAmount;

    // CRITICAL: Hard clamp trails - this is the MAXIMUM brightness trails can ever be
    trails = min(trails, vec3(0.15));

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

    // Minimal core - just a hint (very dim to prevent white center)
    col += coreColor * coreGlow * 0.02 * (0.1 + energy * 0.05);

    // === LIMBS/TENDRILS (8 major limbs for more organic feel) ===
    for (float i = 0.0; i < 8.0; i++) {
        float limbIndex = i / 8.0;

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

        // Limb thickness varies along length - thicker at base, tapering
        float thicknessFactor = 1.0 - (projLength / limbLength) * 0.7;  // Taper toward tip
        float thickness = 0.022 * thicknessFactor * (1.0 + featureSharp * 0.4);

        // Edge definition from rolloff
        float edgeSoftness = 1.0 - edgeSharpness * 0.5;
        float limbCore = smoothstep(thickness * (1.0 + edgeSoftness), thickness * edgeSoftness, limbDist);
        float limbGlow = smoothstep(thickness * 3.0, thickness, limbDist) * 0.6;

        // Limb color shifts per limb - evolving warm palette
        float limbColorNoise = audioBiasedNoise(i * 7.0 + time * 0.03, localLum);
        float limbHue = 0.08 + limbIndex * 0.18 + limbColorNoise * 0.20 + spectralFluxNormalized * 0.15 + colorShift * 0.1;
        limbHue = mod(limbHue, 1.0);
        float limbSat = 0.80 + skinRoughness * 0.15;
        float limbLight = 0.50 + midPulse * 0.08;
        vec3 limbColor = hsl2rgb(vec3(limbHue, limbSat, limbLight));

        // Limbs MUCH brighter than trails to stay visible
        col += limbColor * (limbCore * 3.5 + limbGlow * 1.2) * (0.8 + energy * 0.4);
    }

    // === SECONDARY TENDRILS (Smaller limbs between main ones) ===
    for (float i = 0.0; i < 8.0; i++) {
        float secIndex = i / 8.0;
        float secNoise = audioBiasedNoise(i + 100.0, nerveChaos);

        // Offset by half angle to sit between main limbs
        float secAngle = (secIndex + 0.5 / 8.0) * TWO_PI + time * (0.5 + secNoise * 0.3);
        float secLength = limbReach * (0.4 + nerveChaos * 0.3);

        vec2 secDir = vec2(cos(secAngle), sin(secAngle));
        vec2 secEnd = secDir * secLength;

        float secProj = dot(tiltedPos, secDir);
        secProj = clamp(secProj, 0.0, secLength);
        vec2 secClosest = secDir * secProj;
        float secDist = length(tiltedPos - secClosest);

        float secThick = 0.008 * (1.0 - secProj / secLength);
        float secCore = smoothstep(secThick * 1.5, secThick * 0.5, secDist);

        // Cyan/blue secondary color for contrast
        vec3 secColor = hsl2rgb(vec3(0.5 + secIndex * 0.1, 0.75, 0.55));
        col += secColor * secCore * nerveChaos * 1.5;
    }

    // === SURFACE NERVES (Treble shimmer) ===
    // Small nerve-like particles on surface
    for (float i = 0.0; i < 20.0; i++) {
        float nervePhase = audioBiasedNoise(i * 1.5, shimmer + time * 0.1);
        float nerveAngle = nervePhase * TWO_PI + time * metabolismSpeed * 2.0;
        float nerveRadius = 0.1 + nerveChaos * 0.25 + sin(time * 3.0 + i) * 0.08;

        vec2 nervePos = vec2(cos(nerveAngle), sin(nerveAngle)) * nerveRadius;
        float nerveDist = length(tiltedPos - nervePos);

        float nerveSize = 0.005 + shimmer * 0.007;
        float nerveGlow = smoothstep(nerveSize * 3.0, 0.0, nerveDist);

        // Subtle nerve sparkles with treble reactivity
        col += vec3(0.95, 0.90, 0.70) * nerveGlow * shimmer * 0.6;
    }

    // === PULSING RINGS (Mids frequency) ===
    // Mid-body rhythmic pulses - multiple rings for depth
    for (float r = 0.0; r < 3.0; r++) {
        float ringPhase = fract(time * (0.35 + mids * 0.5) - r * 0.33);
        float ringRadius = coreSize * 0.5 + ringPhase * (limbReach * 1.2);
        float ringDist = abs(coreDist - ringRadius);
        float ringWidth = 0.008 + midPulse * 0.015;
        float ring = smoothstep(ringWidth * 2.5, ringWidth * 0.2, ringDist) * (1.0 - ringPhase);

        float ringHue = mod(0.15 + r * 0.1 + mids * 0.15, 1.0);
        vec3 ringColor = hsl2rgb(vec3(ringHue, 0.75, 0.60));
        col += ringColor * ring * midPulse * 1.2;
    }

    // === BREATHING AURA (Energy field) ===
    // Outer glow that breathes with the music
    float auraRadius = coreSize * 1.5 + limbReach * 0.8;
    float auraDist = coreDist - auraRadius;
    float auraFalloff = 6.0 - energy * 3.0;
    float aura = exp(-abs(auraDist) * auraFalloff) * breathPhase * (0.5 + energy * 0.5);

    // Complementary aura color
    float auraHue = mod(0.55 + colorShift * 0.3, 1.0);
    vec3 auraColor = hsl2rgb(vec3(auraHue, 0.65, 0.45));
    col += auraColor * aura * energy * 0.25;

    // === FINAL COMPOSITION ===

    // Mix with trails - favor new content heavily
    float mixAmount = 0.55 + nerveChaos * 0.15;
    vec3 final = mix(trails, col, mixAmount);

    // Clamp to prevent white-out
    final = min(final, vec3(1.0));

    fragColor = vec4(final, 1.0);
}
