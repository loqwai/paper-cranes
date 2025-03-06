#define ZOOM_LEVEL bassZScore
#define DISOLVE_FACTOR spectralRoughness

vec3 last(vec2 uv) {
    vec4 initial = getInitialFrameColor(uv);
    vec4 last = getLastFrameColor(uv);
    return mix(initial, last, DISOLVE_FACTOR).rgb;
}
// Function to check if a pixel is part of the Cyclops' body
float isCyclopsBody(vec2 uv) {
    vec3 hsl = rgb2hsl(last(uv));

    // Static color range for Cyclops detection
    float minLightness = 0.1;
    float maxLightness = 0.8;
    float minHue = 0.1;
    float maxHue = 0.18;

    // If brightness is outside range, ignore
    if (hsl.z < minLightness || hsl.z > maxLightness) return 0.0;

    // If hue is within adjusted threshold, mark as Cyclops body
    if (hsl.x > minHue && hsl.x < maxHue) {
        return 1.0;
    }
    return 0.0;
}

// Function to check surrounding pixels for Cyclops body match
float isCyclopsBodyWithNeighbors(vec2 uv, float roughnessFactor) {
    // Base detection at current pixel
    float bodyDetected = isCyclopsBody(uv);
    if (bodyDetected > 0.0) return 1.0;

    // If spectral roughness is high, check neighboring pixels
    float searchRadius =  knob_40 * 0.01; // Scales based on knob_40
    for (float i = -1.0; i <= 1.0; i += 1.0) {
        for (float j = -1.0; j <= 1.0; j += 1.0) {
            vec2 neighborUV = uv + vec2(i, j) * searchRadius;
            if (isCyclopsBody(neighborUV) > 0.0) {
                return 1.0; // If any neighbor matches, return true
            }
        }
    }
    return 0.0;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 center = vec2(knob_43, knob_44); // Keep Cyclops eye as focal point

    // **Knob-controlled zoom effect**
    float zoomAmount = mapValue(ZOOM_LEVEL, -1., 1., 0.5, 2.);
    zoomAmount = clamp(zoomAmount, 0.01, 2.);
    uv = (uv - center) / zoomAmount + center;

    // **Retrieve the original image and last frame**
    vec4 originalColor = getInitialFrameColor(uv);
    if(beat) originalColor = getLastFrameColor(uv);
    vec4 lastFrame = getLastFrameColor(uv);

    // **Spectral roughness influence on Cyclops detection**
    float cyclopsBody = isCyclopsBodyWithNeighbors(uv, spectralRoughnessZScore);

    // **Modify Cyclops Body Color Based on Spectral Data**
    if (cyclopsBody == 1.0) {
        vec3 cycNew = vec3(pitchClassMedian, spectralCrestNormalized, energyNormalized);
        fragColor = vec4(cycNew, 1.0);
        return;
    }

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
    float rainbow = fract(colorShift);
    vec3 auraColor = hsl2rgb(vec3(rainbow, 1.0, 0.8));

    // **Apply the rainbow effect only to detected black lines**
    vec3 animatedLines = mix(originalColor.rgb, auraColor, cyclopsBody);

    // **Blend Rippling Aura with Liquid Effect**
    float ripplingAura = cyclopsBody * ripple;
    vec3 finalColor = mix(animatedLines, warpedFrame.rgb, ripplingAura);

    // **Final Output**
    fragColor = vec4(finalColor, originalColor.a);
}
