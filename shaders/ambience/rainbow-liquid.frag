// Basic 2D pseudo-fractal (FBM) noise
float simpleNoise(vec2 p) {
    // Replace with your preferred noise function.
    // This quick sine-based approach is just for illustration.
    return sin(p.x) * cos(p.y);
}

float fbm(vec2 p) {
    float f = 0.0, amp = 0.5;
    for (int i = 0; i < 5; i++) {
        f += amp * simpleNoise(p);
        p *= 2.01;
        amp *= 0.5;
    }
    return f;
}

// Multi-pass domain warp
vec2 domainWarp(vec2 p, float warp, float offset) {
    // Offset helps differentiate multiple warp passes
    float n1 = fbm(p + offset);
    float n2 = fbm(p + 3.14159 + offset);
    return p + warp * vec2(n1, n2);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalize coordinates
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p  = (uv - 0.5) * 2.0;
    p.x *= iResolution.x / iResolution.y;

    // Grab last frame for a feedback loop
    vec3 lastCol = rgb2hsl(getLastFrameColor(uv).rgb);

    // Time factor
    float t = time * (0.05 + 0.05 * knob_30); // knob_30 -> overall speed

    // Combine scale from knob_32 and knob_33
    float baseScale = 1.0 + knob_32 * 2.0; // knob_32 -> base scale
    float extraScale = 1.0 + knob_33 * 2.0; // knob_33 -> additional scale
    p *= baseScale;

    // Warp pass #1
    p = domainWarp(p, knob_31 * 0.4, t * 0.1);  // knob_31 -> warp strength

    // Warp pass #2, let knob_40 intensify
    p = domainWarp(p, knob_40 * 0.3, -t * 0.07);

    // Add an extra "wave" distortion with knob_46
    float wave = animateEaseInOutSine(t * 0.1 + knob_46 * 0.3);
    p += wave * knob_46 * 0.3 * vec2(sin(p.y * 2.0), cos(p.x * 2.0));

    // Fractal noise final pattern
    float pattern = fbm(p * extraScale + t * 0.2);

    // Make pattern more interesting with knob_45
    pattern *= (1.0 + knob_45 * 2.0);

    // Hue shift: slow drift plus knob_34
    float hueShift = t * (0.1 + knob_34 * 0.2);

    // Use knob_41, knob_43, knob_44, knob_47 as extra color offsets
    float cOffset1 = knob_41 * 0.2;
    float cOffset2 = knob_43 * 0.3;
    float cOffset3 = knob_44 * 0.25;
    float cOffset4 = knob_47 * 0.2;
    float totalOffset = cOffset1 + cOffset2 + cOffset3 + cOffset4;

    // Build final HSL color
    float hue = fract(hueShift + pattern * 0.15 + totalOffset);
    float sat = 0.8 + knob_36 * 0.2; // knob_36 -> saturation
    float lit = 0.4 + pattern * 0.3;

    // Extra color inversion effect if knob_43 is large
    // (Just a fun example – try turning knob_43 up or down)
    if (knob_43 > 0.5) {
        hue = 1.0 - hue;
    }

    // Use knob_41 to shift brightness up/down
    lit += knob_41 * 0.1;
    // Use knob_35 as overall brightness multiplier
    lit *= (1.0 + knob_35 * 1.0);

    // Extra hack: knob_46 can also push saturation for a "pop" effect
    sat += knob_46 * 0.1;

    // Convert HSL -> RGB
    vec3 colorHSL = vec3(hue, clamp(sat, 0.0, 1.0), clamp(lit, 0.0, 1.0));
    vec3 newColor = hsl2rgb(colorHSL);

    // Optionally mix in the initial frame for texture-based effects
    // Let's just do a subtle blend with knob_45 for demonstration
    vec3 initTex = getInitialFrameColor(uv).rgb;
    newColor = mix(newColor, initTex, 0.05 * knob_45);

    // Feedback blending with knob_37
    // Lower knob_37 -> stronger feedback from last frame
    float feedbackFactor = clamp(1.0 - knob_37, 0.0, 1.0);
    vec3 finalHSL = mix(lastCol, rgb2hsl(newColor), feedbackFactor);

    // Another small twist: knob_41 can also shift hue a bit in feedback
    finalHSL.x = fract(finalHSL.x + knob_41 * 0.05);

    // Convert final HSL back to RGB
    vec3 finalRGB = hsl2rgb(finalHSL);
    fragColor = vec4(finalRGB, 1.0);
}
