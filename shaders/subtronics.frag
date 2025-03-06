void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = vec2(0.5, 0.6); // Keep Cyclops eye as focal point

    // Retrieve the original image and last frame
    vec4 originalColor = getInitialFrameColor(uv);
    vec4 lastFrame = getLastFrameColor(uv);

    // **Detect black lines (naturally occurring in image)**
    float darkness =  dot(originalColor.rgb, vec3(0.74)); // Closer to 1 = black
    float blackLines = smoothstep(0.6, 0.85, darkness); // Isolate darker areas

    // **Knob-controlled parameters**
    float rippleSpeed = knob_30 * 3.0; // Ripple speed
    float rippleFrequency = time*100.; // Wave detail
    float distortionAmount = 0.01 + knob_32 * 0.02; // Distortion strength
    float colorShift = knob_33 * 1.5; // Color shift intensity
    float liquidWarp = knob_34; // Warping effect

    // **Compute UV Distortion for Liquid Effect**
    float distFromCenter = length(uv - center);
    float ripple = sin(distFromCenter * rippleFrequency - iTime * rippleSpeed) * 0.5 + 0.5; // Expanding waves
    vec2 distortion = vec2(
        sin(distFromCenter * rippleFrequency + iTime * rippleSpeed) * distortionAmount,
        cos(distFromCenter * rippleFrequency + iTime * rippleSpeed) * distortionAmount
    );

    // **Sample last frame with distortion to create liquid effect**
    vec4 warpedFrame = getLastFrameColor(uv + distortion * liquidWarp);

    // **Rainbow Animation Over Black Lines**
    float rainbow = fract(iTime * 0.5 + colorShift);
    vec3 auraColor = hsl2rgb(vec3(rainbow, 1.0, 0.8));

    // **Apply the rainbow effect only to detected black lines**
    vec3 animatedLines = mix(originalColor.rgb, auraColor, blackLines);

    // **Blend Rippling Aura with Liquid Effect**
    float ripplingAura = blackLines * ripple;
    vec3 finalColor = mix(animatedLines, warpedFrame.rgb, ripplingAura);

    // **Final Output**
    fragColor = vec4(finalColor, originalColor.a);
}
