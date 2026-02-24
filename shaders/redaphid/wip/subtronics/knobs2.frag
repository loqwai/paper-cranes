#define ZOOM_LEVEL mapValue(knob_40, 0., 1., 0.9, 2.5)
#define RIPPLE_SPEED knob_31
#define RIPPLE_FREQUENCY knob_31
#define RIPPLE_STRENGTH knob_47 * 30.0  // Expands the thickness of detected waves
#define COLOR_SHIFT knob_45
#define INFINITY_ZOOM knob_44
#define CENTER vec2(0.47, 0.68)

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

// **Detect wave-like areas & respect actual wave formations**
float isWaves(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));
    float distFromCenter = length(uv - CENTER);  // Keep distance reference

    float baseWave = smoothstep(0.55, 0.57, hsl.x) * (1.0 - smoothstep(0.63, 0.65, hsl.x)) *
                     smoothstep(0.3, 0.4, hsl.y) * smoothstep(0.2, 0.3, hsl.z);

    // **Expand the thickness of detected waves with RIPPLE_STRENGTH**
    float expandedWave = baseWave * smoothstep(0.0, 1.0, sin(distFromCenter * RIPPLE_STRENGTH - iTime * RIPPLE_SPEED));

    return expandedWave;
}

// **Generate ripple distortion based on wave thickness**
vec2 getRippleDistortion(vec2 uv) {
    vec2 delta = uv - CENTER;
    float distFromCenter = length(delta);

    float rippleWave = sin(distFromCenter * (10.0 + RIPPLE_FREQUENCY * 10.0) - iTime * (1.0 + RIPPLE_SPEED * 2.0));

    // **Respect waves when applying distortion**
    float waveInfluence = isWaves(uv);

    return normalize(delta) * rippleWave * 0.015 * waveInfluence;
}

// **Psychedelic Colors that Follow the Waves**
vec3 psychedelicWaveColors(vec2 uv) {
    float waveFactor = isWaves(uv);
    vec3 hsl = vec3(fract(waveFactor + iTime * COLOR_SHIFT), 1.0, 0.6);
    return hsl2rgb(hsl);
}

// **Cyclops Infinity Zoom**
vec3 cyclopsEffect(vec2 uv) {
    float zoomFactor = mix(1.0, 3.0, INFINITY_ZOOM);

    // Scale UVs around center point
    vec2 scaledUV = (uv - CENTER) * zoomFactor + CENTER;

    // Sample with clean UVs
    vec3 color = getLastFrameColor(fract(scaledUV)).rgb;

    // Add subtle color shift
    vec3 hsl = rgb2hsl(color);
    hsl.x = fract(hsl.x + zoomFactor * 0.1);
    hsl.y = 1.0;
    hsl.z = mix(hsl.z, 0.8, zoomFactor * 0.2);

    return hsl2rgb(hsl);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = CENTER;

    // **Apply seamless zoom**
    float zoomAmount = ZOOM_LEVEL;
    uv = (uv - center) / zoomAmount + center;
    uv = fract(uv); // Ensure smooth tiling

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

    // **Apply psychedelic wave colors following actual waves**
    vec3 waveColor = psychedelicWaveColors(uv);

    // **Apply infinity zoom effect to Cyclops**
    vec3 mirrorColor = cyclopsEffect(uv);

    // **Final blending logic**
    vec3 blendedColor = originalColor;
    blendedColor = mix(blendedColor, waveColor, waves * 0.8);  // Waves affect colors dynamically
    blendedColor = mix(blendedColor, mirrorColor, cyclopsBody * INFINITY_ZOOM);  // Infinity zoom folding

    fragColor = vec4(blendedColor, 1.0);
}
