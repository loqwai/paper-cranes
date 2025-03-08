//https://visuals.beadfamous.com/edit?image=images%2Fsubtronics.jpg&history_size=1000&history_size.min=-3&history_size.max=3
#define ZOOM_LEVEL frame < 50 ? 1. : mapValue(energyNormalized, 0.0, 1., 0.6, 3.5)
#define WAVES_STRENGTH (spectralCrestNormalized + bassNormalized)/2.
#define RIPPLE_FREQUENCY mapValue(spectralCrestNormalized+bassNormalized, 0., 1., 0.1, 10.)
#define RIPPLE_STRENGTH mapValue(spectralFluxNormalized+bassNormalized, 0., 1., 0.1, 2.)
#define COLOR_SHIFT pitchClass + (bassNormalized /4.)
#define INFINITY_ZOOM (bassNormalized+energyNormalized > .1 ? mapValue(spectralFluxNormalized+bassNormalized, 0., 1.5, 0.4, 1.): 0.)
#define CENTER vec2(0.45, 0.68)
#define SCREEN_SHAKE_INTENSITY (bassNormalized+energyNormalized > 1.2 ? smoothstep(0.3, 1.0, spectralRoughness) * 0.01 : 0.0)

// **Retrieve last frame safely**
vec3 last(vec2 uv) {
    vec3 first = getInitialFrameColor(fract(uv)).rgb;
    if (frame < 300) return first;
    if(energyNormalized < 0.3 || bassZScore < 0.2) return first;
    vec3 last = getLastFrameColor(fract(uv)).rgb;
    vec3 cur =  mix(first, last, spectralRoughnessNormalized+bassNormalized/4.);
    if(bassNormalized > 0.95) {
        cur = rgb2hsl(cur);
        cur.x =  mix(cur.x,pitchClassMedian,bassNormalized);
        cur.y += max(clamp(cur.y+0.5, 0.,1.), energyNormalized);
        first = rgb2hsl(first);
        cur.z = 1. - first.z;
        cur = hsl2rgb(fract(cur));
    }
    return cur;
}

float isCyclopsBody(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));

    // Target white/whitish areas (high lightness, low saturation)
    // This will specifically detect the white/gray areas of the eye
    float isWhitish = smoothstep(0., 0.85, hsl.z) * (1.0 - smoothstep(0.0, 0.8, hsl.y));

    // Ensure we're only targeting the eye area by using distance from center
    float distFromCenter = length(uv - CENTER);
    float eyeRadius = 0.08; // Approximate eye radius
    float eyeMask = 1.0 - smoothstep(eyeRadius - 0.05, eyeRadius + 0.05, distFromCenter);

    // Return detection for whitish areas within the eye radius
    return isWhitish * eyeMask;
}

// **Smooth Wave Detection**
float isWaves(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));
    float distFromCenter = length(uv - CENTER);

    // Exclude light colors (like grays and whites in the eye)
    // Only detect waves in colors that aren't too light
    float lightnessThreshold = 0.7; // Exclude colors lighter than this
    float lightnessFilter = 1.0 - smoothstep(lightnessThreshold - 0.1, lightnessThreshold, hsl.z);

    // Original wave detection logic with lightness filter
    float baseWave = smoothstep(0.55, 0.58, hsl.x) * (1.0 - smoothstep(0.62, 0.65, hsl.x)) *
                     smoothstep(0.3, 0.35, hsl.y) * smoothstep(0.2, 0.28, hsl.z) *
                     lightnessFilter; // Apply lightness filter

    // Exclude the eye area - eye is approximately 15% of screen size as mentioned
    float eyeRadius = 0.15; // Approximate eye radius
    float eyeMask = smoothstep(0.0, eyeRadius, distFromCenter);

    // Smooth out wave edges to avoid grain
    float expandedWave = smoothstep(0.0, 1.0, baseWave * fract(distFromCenter * RIPPLE_STRENGTH - iTime));

    // Apply the eye mask to the wave detection
    return expandedWave * eyeMask;
}

// **Generate Ripple Distortion**
vec2 getRippleDistortion(vec2 uv) {
    vec2 delta = uv - CENTER;
    float distFromCenter = length(delta);

    float rippleWave = sin(distFromCenter * (10.0 + RIPPLE_FREQUENCY * 10.0));

    // **Apply chaos if `spectralRoughness` is high**
    float roughnessFactor = smoothstep(0.5, 1.0, spectralRoughness);
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
    rotationAngle += bass * 0.3; // **Add energy-based rotation**

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

    vec3 color = getInitialFrameColor(rotatedUV).rgb;

    // **Music-intensity-based distortion**
    float energyInfluence = smoothstep(0.5, 1.0, energy);
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

// **Apply screen shake effect based on spectralRoughness**
vec2 applyScreenShake(vec2 uv) {
    if (SCREEN_SHAKE_INTENSITY > 0.0) {
        // Create a chaotic but smooth shake pattern
        float noiseX = fract(sin(iTime * 13.5) * 43758.5453);
        float noiseY = fract(sin(iTime * 17.7) * 22578.1459);

        // Map noise to -1 to 1 range
        vec2 shakeOffset = vec2(noiseX, noiseY) * 2.0 - 1.0;

        // Apply shake with intensity based on spectralRoughness
        return uv + shakeOffset * SCREEN_SHAKE_INTENSITY;
    }
    return uv;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // **Apply screen shake effect**
    uv = applyScreenShake(uv);

    vec2 center = CENTER;

    // **Apply seamless zoom**
    float zoomAmount = ZOOM_LEVEL;
    uv = (uv - center) / zoomAmount + center;
    uv = fract(uv);

    // **Get original colors**
    vec3 originalColor = last(uv).rgb;
    vec3 lastFrameColor = last(uv);

    if (bass > 0.5) {
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
    if (-bass > 0.9 ) {
        uv *= sin(iTime * 10.0) * 5.0;  // **Wild zoom oscillation**
        originalColor = fract(-1. * originalColor);
    }


    // **Final blending logic**
    vec3 blendedColor = originalColor;
    blendedColor = mix(blendedColor, waveColor, waves * WAVES_STRENGTH);
    if(energyNormalized > 0.2) blendedColor = mix(blendedColor, mirrorColor, cyclopsBody * INFINITY_ZOOM);

    // **Intensify colors during screen shake for extra impact**
    if (SCREEN_SHAKE_INTENSITY > 0.0) {
        float intensityFactor = 1.0 + SCREEN_SHAKE_INTENSITY * 2.0;
        vec3 hsl = rgb2hsl(blendedColor);
        hsl.y = min(1.0, hsl.y * intensityFactor); // Boost saturation
        blendedColor = hsl2rgb(hsl);
    }

    fragColor = vec4(blendedColor, 1.0);
}

