// @fullscreen: true
// http://localhost:6969/edit.html?fullscreen=true&image=images%2Fsubtronics.jpg
#define ZOOM_LEVEL mapValue(energyZScore, -1., 1., 0.5, 2.5)
#define WAVES_STRENGTH spectralCrestZScore
#define RIPPLE_FREQUENCY mapValue(spectralRoughnessZScore, -1., 1., 0.1, 10.)
#define RIPPLE_STRENGTH mapValue(energyZScore, -1., 1., 0.1, 10.)
#define COLOR_SHIFT spectralCentroid
#define INFINITY_ZOOM (energyZScore > 0. ? mapValue(spectralFluxZScore, -1., 1., 0.2, 0.8): 0.)
#define CENTER vec2(0.46, 0.65)

// **Retrieve last frame safely**
vec3 last(vec2 uv) {
    return getInitialFrameColor(fract(uv)).rgb;
}

// **Detect Cyclops' body**
float isCyclopsBody(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));
    return smoothstep(0.1, 0.2, hsl.z) * (1.0 - smoothstep(0.7, 0.8, hsl.z)) *
           smoothstep(0.1, 0.15, hsl.x) * (1.0 - smoothstep(0.16, 0.20, hsl.x));
}

// **Smooth Wave Detection**
float isWaves(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));
    float distFromCenter = length(uv - CENTER);

    float baseWave = smoothstep(0.55, 0.58, hsl.x) * (1.0 - smoothstep(0.62, 0.65, hsl.x)) *
                     smoothstep(0.3, 0.35, hsl.y) * smoothstep(0.2, 0.28, hsl.z);

    // **Smooth out wave edges to avoid grain**
    float expandedWave = smoothstep(0.0, 1.0, baseWave * fract(distFromCenter * RIPPLE_STRENGTH - iTime));

    return expandedWave;
}

// **Generate Ripple Distortion**
vec2 getRippleDistortion(vec2 uv) {
    vec2 delta = uv - CENTER;
    float distFromCenter = length(delta);

    float rippleWave = sin(distFromCenter * (10.0 + RIPPLE_FREQUENCY * 10.0));

    // **Apply chaos if `spectralRoughnessZScore` is high**
    float roughnessFactor = smoothstep(0.5, 1.0, spectralRoughnessZScore);
    rippleWave *= mix(1.0, fract(sin(uv.x * uv.y * 10000.0) * 43758.5453), roughnessFactor);

    float waveInfluence = smoothstep(0.0, 1.0, isWaves(uv));
    return normalize(delta) * rippleWave * 0.01 * waveInfluence;
}

// **Psychedelic Colors that Follow the Waves**
vec3 psychedelicWaveColors(vec2 uv) {
    float waveFactor = isWaves(uv);
    vec3 hsl = vec3(fract(waveFactor * COLOR_SHIFT + iTime), 1.0, 0.6);
    return hsl2rgb(hsl);
}

// **Enhanced Infinity Mirror Effect (Music-Responsive)**
vec3 cyclopsEffect(vec2 uv) {
    float zoomFactor = mix(1.0, 4.0, INFINITY_ZOOM);

    // **Calculate rotation based on music intensity**
    float rotationAngle = sin(time); // **Base rotation**
    rotationAngle += bassZScore * 0.3; // **Add energy-based rotation**

    // **Apply rotation around center**
    vec2 rotatedUV = uv - CENTER;
    float cosA = cos(rotationAngle);
    float sinA = sin(rotationAngle);
    rotatedUV = vec2(
        rotatedUV.x * cosA - rotatedUV.y * sinA,
        rotatedUV.x * sinA + rotatedUV.y * cosA
    ) + CENTER;

    // **Recursive zoom with smooth UV transitions**
    for (int i = 0; i < int(4.0 * INFINITY_ZOOM); i++) {
        rotatedUV = (rotatedUV - CENTER) * zoomFactor + CENTER;
        rotatedUV = fract(rotatedUV);  // **Ensures seamless looping**
    }

    // **Recursive depth warping & color cycling**
    float depth = sin(iTime * 2.0) * 0.1 * INFINITY_ZOOM;
    rotatedUV += vec2(depth, -depth);

    vec3 color = getLastFrameColor(rotatedUV).rgb;

    // **Music-intensity-based distortion**
    float energyInfluence = smoothstep(0.5, 1.0, energyZScore);
    rotatedUV += sin(rotatedUV * (10.0 * energyInfluence)) * 0.02 * energyInfluence;

    // **Enhanced color shifting based on musical energy**
    vec3 hsl = rgb2hsl(color);
    // **Shift hue based on depth and energy**
    hsl.x = fract(hsl.x + zoomFactor * 0.2 + energyInfluence * 0.3);
    // **Increase saturation in deeper layers**
    hsl.y = mix(1.0, 1.5, INFINITY_ZOOM * energyInfluence);
    // **Preserve more of the original brightness while adding depth**
    float baseBrightness = mix(hsl.z, 0.4, zoomFactor * 0.3);
    float energyBoost = energyInfluence * 0.3;
    hsl.z = mix(baseBrightness, 0.8, energyBoost);

    return hsl2rgb(hsl);
}

// Adjust UV to maintain image aspect ratio (cover mode)
vec2 adjustForAspect(vec2 uv, vec2 resolution) {
    float screenAspect = resolution.x / resolution.y;
    float imageAspect = 1.0; // Assume square image, adjust if needed

    vec2 adjusted = uv - 0.5;
    if (screenAspect > imageAspect) {
        // Screen is wider than image - scale height
        adjusted.y *= screenAspect / imageAspect;
    } else {
        // Screen is taller than image - scale width
        adjusted.x *= imageAspect / screenAspect;
    }
    return adjusted + 0.5;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 rawUv = fragCoord / iResolution.xy;
    vec2 uv = adjustForAspect(rawUv, iResolution.xy);
    vec2 center = CENTER;

    // **Apply seamless zoom**
    float zoomAmount = ZOOM_LEVEL;
    uv = (uv - center) / zoomAmount + center;
    uv = fract(uv);

    // **Get original colors**
    vec3 originalColor = getInitialFrameColor(uv).rgb;
    vec3 lastFrameColor = last(uv);

    if (bassZScore > 0.5) {
        lastFrameColor = mix(lastFrameColor, originalColor, 0.3);
    }

    // **Detect features**
    float cyclopsBody = isCyclopsBody(uv);
    float waves = isWaves(uv);


    // **Apply ripple distortions**
    vec2 rippleOffset = getRippleDistortion(uv);
    vec3 warpedFrame = getLastFrameColor(fract(uv + rippleOffset)).rgb;

    // **Apply psychedelic colors to waves**
    vec3 waveColor = psychedelicWaveColors(uv);

    // **Apply infinity zoom effect to Cyclops**
    vec3 mirrorColor = cyclopsEffect(uv);

    // **Extreme Bass Distortion Mode (If bass is at insane levels)**
    if (-bassZScore > 0.9 ) {
        uv *= sin(iTime * 10.0) * 5.0;  // **Wild zoom oscillation**
        originalColor = fract(-1. * originalColor);
    }


    // **Final blending logic**
    vec3 blendedColor = originalColor;
    blendedColor = mix(blendedColor, waveColor, waves * WAVES_STRENGTH);
    blendedColor = mix(blendedColor, mirrorColor, cyclopsBody * INFINITY_ZOOM);

    fragColor = vec4(blendedColor, 1.0);
}

