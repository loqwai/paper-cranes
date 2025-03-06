// http://localhost:6969/edit.html?fullscreen=true&image=images%2Fsubtronics.jpg&knob_30=2.126&knob_30.min=0&knob_30.max=2.5&knob_31=0.661&knob_31.min=0&knob_31.max=1&knob_33=0.52&knob_33.min=0&knob_33.max=1&knob_34=0.614&knob_34.min=0&knob_34.max=1&knob_32=0.78&knob_32.min=0&knob_32.max=1&knob_36=0.433&knob_36.min=0&knob_36.max=1&knob_35=0.236&knob_35.min=0&knob_35.max=1&knob_43=0.449&knob_43.min=0&knob_43.max=1&knob_40=1&knob_40.min=0&knob_40.max=1&knob_41=0.622&knob_41.min=0&knob_41.max=1&knob_44=0.677&knob_44.min=0&knob_44.max=1
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = vec2(knob_43, knob_44); // Keep Cyclops eye as focal point

    // **Knob-controlled zoom effect**
    // float zoomAmount = 1.0 + bassZScore/2.;
    float zoomAmount = mapValue(knob_40, 0.,1.,0.5,2.);
    zoomAmount = clamp(zoomAmount, 0.01, 2.);
    uv = (uv - center) / zoomAmount + center;

    // **Retrieve the original image and last frame**
    vec4 originalColor = getInitialFrameColor(uv);
    vec4 lastFrame = getLastFrameColor(uv);

    // **Detect black lines (naturally occurring in image)**
    float darkness = dot(originalColor.rgb, vec3(0.74)); // Closer to 1 = black
    float blackLines = smoothstep(0.6, 0.85, darkness); // Isolate darker areas

    // **Knob-controlled parameters**
    float rippleSpeed = 0.5 + knob_30 * 3.0; // Speed of outward propagation
    float rippleFrequency = 10.0 + knob_31 * 20.0; // Density of ripples
    float distortionAmount = 0.005 + knob_32 * 0.01; // Ripple displacement strength
    float colorShift = knob_33 * 1.5; // How much color shift over time
    float rippleFade = 1.5 + knob_34 * 2.0; // How fast ripples fade out

    // **Compute radial UV Distortion for Expanding Ripples**
    vec2 delta = uv - center;
    float distFromCenter = length(delta); // Pure radial distance
    float ripple = sin(distFromCenter * rippleFrequency - iTime * rippleSpeed) * exp(-distFromCenter * rippleFade);

    // **Distort UVs outward from center using last frame color**
    vec2 distortion = normalize(delta) * ripple * distortionAmount;
    vec4 warpedFrame = getLastFrameColor(uv + distortion);

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
