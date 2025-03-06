// http://localhost:6969?image=images%2Fsubtronics.jpg
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    // uv.y = 1.0 - uv.y; // Flip UV if needed

    // Retrieve the original image
    vec4 originalColor = getInitialFrameColor(uv);

    // Detect black lines (high contrast areas where all channels are low)
    float darkness = 1.0 - dot(originalColor.rgb, vec3(0.333)); // Closer to 1 = black
    float blackLines = smoothstep(0.6, 0.8, darkness); // Threshold to isolate lines

    // Audio-reactive uniforms
    float bass = spectralCentroidZScore * 0.7;  // Controls aura pulsation
    float mids = spectralFlux * 0.4;            // Adds distortion
    float highs = spectralRolloffNormalized * 0.5;    // Controls RGB shift/glitch

    // Define the center of the auras (Cyclops' eye region)
    vec2 auraCenter = vec2(0.5, 0.6); // Adjust to match the eye position
    float distFromCenter = length(uv - auraCenter); // Distance from the eye

    // Create outward-rippling waves based on distance
    float waveMotion = sin(distFromCenter * 30.0 - iTime * 4.0 - bass * 10.0);
    float ripplingAura = smoothstep(0.2, 0.8, blackLines * waveMotion); // Modulate aura strength

    // Colorize the auras dynamically with a shifting rainbow effect
    float rainbow = sin(distFromCenter * 10.0 + iTime * 2.0 + bass * 5.0) * 0.5 + 0.5;
    vec3 auraColor = hsl2rgb(vec3(rainbow, 1.0, 1.0));

    // Make the auras pulse outward in sync with bass
    float auraGlow = smoothstep(0.2, 0.6 + bass * 0.3, ripplingAura);
    auraGlow *= 1.0 - smoothstep(0.5, 0.9 + bass * 0.4, ripplingAura);

    // Detect the yellow Cyclops head for eye pulsing
    float yellowAmount = smoothstep(0.3, 0.6, originalColor.r - originalColor.b);
    float eyePulse = 0.5 + 0.5 * sin(iTime * 4.0 + bass * 10.0);
    float eyeGlow = yellowAmount * eyePulse; // Glow only where yellow is detected

    // RGB Glitch shift on transients
    float glitchShift = highs * 0.02;
    vec3 glitchColor = vec3(
        getInitialFrameColor(uv + vec2(glitchShift, 0.0)).r,
        getInitialFrameColor(uv - vec2(0.0, glitchShift)).g,
        getInitialFrameColor(uv + vec2(-glitchShift, glitchShift)).b
    );

    // Blend rippling aura with original image
    vec3 finalColor = mix(glitchColor, auraColor, auraGlow);

    // Overlay pulsing eye glow
    finalColor += vec3(eyeGlow) * vec3(1.0, 1.0, 0.5); // Slightly yellowish glow

    fragColor = vec4(finalColor, originalColor.a);
}
