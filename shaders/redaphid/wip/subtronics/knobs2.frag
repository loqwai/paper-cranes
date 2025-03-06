#define ZOOM_LEVEL mapValue(knob_40, 0., 1., 0.8, 1.5)
#define RIPPLE_SPEED knob_47
#define RIPPLE_FREQUENCY knob_31
#define COLOR_SHIFT knob_45
#define BLEND_STRENGTH knob_46
#define CENTER vec2(0.46, 0.65);
vec3 last(vec2 uv) {
    return getInitialFrameColor(uv).rgb;
}

// Detect Cyclops' body
float isCyclopsBody(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));
    return smoothstep(0.1, 0.2, hsl.z) * (1.0 - smoothstep(0.7, 0.8, hsl.z)) *
           smoothstep(0.1, 0.12, hsl.x) * (1.0 - smoothstep(0.16, 0.18, hsl.x));
}

// Detect wave-like areas
float isWaves(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));
    return smoothstep(0.55, 0.57, hsl.x) * (1.0 - smoothstep(0.63, 0.65, hsl.x)) *
           smoothstep(0.3, 0.4, hsl.y) * smoothstep(0.2, 0.3, hsl.z) *
           (1.0 - smoothstep(0.7, 0.8, hsl.z));
}

// Generate rippling effect
vec2 getRippleDistortion(vec2 uv) {
    vec2 delta = uv - CENTER;
    float distFromCenter = length(delta);
    float ripple = sin(distFromCenter * (10.0 + RIPPLE_FREQUENCY * 10.0) - iTime * (1.0 + RIPPLE_SPEED * 2.0));
    return normalize(delta) * ripple * 0.02;
}

// Generate shifting psychedelic colors
vec3 trippyColor(vec3 color, float intensity) {
    vec3 hsl = rgb2hsl(color);
    hsl.x = fract(hsl.x + sin(iTime * 0.5) * intensity * 0.2);
    hsl.y = min(1.0, hsl.y * (1.0 + intensity * 0.5));
    hsl.z = fract(hsl.z * (1.0 + sin(iTime * 1.5) * intensity * 0.3));
    return hsl2rgb(hsl);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = CENTER;

    // Apply zoom
    float zoomAmount = ZOOM_LEVEL;
    uv = (uv - center) / zoomAmount + center;

    // Get initial colors
    vec3 originalColor = getInitialFrameColor(uv).rgb;
    vec3 lastFrameColor = getLastFrameColor(uv).rgb;

    // Detect features
    float cyclopsBody = isCyclopsBody(uv);
    float waves = isWaves(uv);

    // Apply ripple distortion
    vec2 rippleOffset = getRippleDistortion(uv);
    vec3 warpedFrame = getLastFrameColor(uv + rippleOffset).rgb;

    // Create trippy color effect
    vec3 psychedelic = trippyColor(lastFrameColor, COLOR_SHIFT);

    // Blend colors
    vec3 blendedColor = originalColor;

    blendedColor = mix(blendedColor, warpedFrame, waves*3.);
    blendedColor = mix(blendedColor, vec3(0.0, 0.6, 1.0), cyclopsBody * 0.5);

    fragColor = vec4(blendedColor, 1.0);
}
