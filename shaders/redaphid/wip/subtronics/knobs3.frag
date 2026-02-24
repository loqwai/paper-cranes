#define ZOOM_LEVEL mapValue(knob_40, 0., 1., 0.9, 2.5)
#define RIPPLE_SPEED knob_31
#define RIPPLE_FREQUENCY knob_31
#define RIPPLE_STRENGTH knob_47 * 2.5  // Controls wave thickness
#define COLOR_SHIFT knob_45
#define INFINITY_ZOOM knob_44
#define CENTER vec2(0.46, 0.65)

// Retrieve last frame safely
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

    // **Use `smoothstep()` to smooth out grain**
    float expandedWave = smoothstep(0.0, 1.0, baseWave * fract(distFromCenter * RIPPLE_STRENGTH - iTime * RIPPLE_SPEED));

    return expandedWave;
}

// **Generate Smooth Ripple Distortion**
vec2 getRippleDistortion(vec2 uv) {
    vec2 delta = uv - CENTER;
    float distFromCenter = length(delta);

    float rippleWave = sin(distFromCenter * (10.0 + RIPPLE_FREQUENCY * 10.0) * (1.0 + RIPPLE_SPEED * 2.0));

    // **Smoothstep applied to wave influence**
    float waveInfluence = smoothstep(0.0, 1.0, isWaves(uv));

    return normalize(delta) * rippleWave * 0.01 * waveInfluence;
}

// **Psychedelic Colors that Follow the Waves**
vec3 psychedelicWaveColors(vec2 uv) {
    float waveFactor = isWaves(uv);
    vec3 hsl = vec3(fract(waveFactor * COLOR_SHIFT), 1.0, 0.6);
    return hsl2rgb(hsl);
}

// **Fix Cyclops Infinity Zoom (No More Bars)**
vec3 cyclopsEffect(vec2 uv) {
    float zoomFactor = mix(1.0, 3.0, INFINITY_ZOOM);

    // **Instead of breaking UVs, smoothly scale them**
    vec2 zoomedUV = (uv - CENTER) / zoomFactor + CENTER;

    // **Wrap UVs correctly to avoid horizontal/vertical bars**
    zoomedUV = fract(zoomedUV) - 0.5;

    // **Recursive distortion for added depth**
    float depth = 8.;
    zoomedUV += vec2(depth, -depth);

    vec3 color = getLastFrameColor(fract(zoomedUV)).rgb;

    // **Make colors cycle smoothly**
    vec3 hsl = rgb2hsl(color);
    hsl.x = fract(hsl.x + zoomFactor * 0.2);
    hsl.y = 1.0;
    hsl.z = mix(hsl.z, 0.8, zoomFactor * 0.3);

    return hsl2rgb(hsl);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
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

    // **Apply smooth psychedelic colors to waves**
    vec3 waveColor = psychedelicWaveColors(uv);

    // **Apply infinity zoom effect to Cyclops**
    vec3 mirrorColor = cyclopsEffect(uv);

    // **Final blending logic**
    vec3 blendedColor = originalColor;
    blendedColor = mix(blendedColor, waveColor, waves * 0.8);  // Waves are now smooth!
    blendedColor = mix(blendedColor, mirrorColor, cyclopsBody * INFINITY_ZOOM);  // No more bars!

    fragColor = vec4(blendedColor, 1.0);
}
