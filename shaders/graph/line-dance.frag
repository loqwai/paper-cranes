// Multi-ribbon spectral dance with dynamic glow and shimmer
// Each ribbon represents a different dimension of sound

#define LINE_THICKNESS 0.020  // Thick, bold lines
#define AMPLITUDE 0.32
#define CENTER 0.5

// Draw a ribbon with dynamic glow based on intensity
vec4 drawRibbon(vec2 uv, float value, float intensity, vec3 baseColor) {
    float val = clamp(value, -1.0, 1.0);
    float ribbonY = CENTER + val * AMPLITUDE;
    float dist = abs(uv.y - ribbonY);

    // Dynamic thickness pulses with intensity
    float dynamicThickness = LINE_THICKNESS * (0.7 + intensity * 0.6);

    // Sharp core line
    float line = smoothstep(dynamicThickness * 1.2, dynamicThickness * 0.2, dist);

    // Expanding glow when intense
    float glowRadius = dynamicThickness * (2.5 + intensity * 6.0);
    float glow = smoothstep(glowRadius, dynamicThickness * 0.5, dist) * (0.3 + intensity * 0.7);

    // Shimmer effect - subtle pulse
    float shimmer = 1.0 + sin(time * 3.0 + value * 10.0) * intensity * 0.15;

    // Vibrant colors when intense, desaturated when quiet
    float saturation = 0.4 + intensity * 0.6;
    vec3 color = mix(vec3(dot(baseColor, vec3(0.333))), baseColor, saturation);

    vec3 finalColor = color * (line * 3.5 + glow * shimmer * 1.5) * (1.0 + intensity * 0.5);
    return vec4(finalColor, line + glow * 0.5);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // Scrolling with very slow fade
    if (uv.x < 0.99) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x;

        // Much slower fade to keep trails visible across screen
        vec4 prev = getLastFrameColor(prevUV);
        fragColor = prev * 0.995;
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }

    // Draw new data on rightmost column
    if (uv.x > 0.99) {
        vec3 col = vec3(0.0);

        // Use zScore for intensity (shows peaks and activity)
        float spreadIntensity = clamp(spectralSpreadZScore * 0.5 + 0.5, 0.0, 1.0);
        float fluxIntensity = clamp(spectralFluxZScore * 0.5 + 0.5, 0.0, 1.0);
        float midsIntensity = clamp(midsZScore * 0.5 + 0.5, 0.0, 1.0);
        float bassIntensity = clamp(bassZScore * 0.5 + 0.5, 0.0, 1.0);
        float centroidIntensity = clamp(spectralCentroidZScore * 0.5 + 0.5, 0.0, 1.0);
        float energyIntensity = clamp(energyZScore * 0.5 + 0.5, 0.0, 1.0);

        // Layer ribbons - back to front
        col += drawRibbon(uv, spectralSpreadNormalized * 2.0 - 1.0, spreadIntensity,
                         vec3(0.0, 1.0, 0.9)).rgb;

        col += drawRibbon(uv, spectralFluxNormalized * 2.0 - 1.0, fluxIntensity,
                         vec3(1.0, 0.0, 0.9)).rgb;

        col += drawRibbon(uv, midsNormalized * 2.0 - 1.0, midsIntensity,
                         vec3(1.0, 0.5, 0.0)).rgb;

        col += drawRibbon(uv, bassNormalized * 2.0 - 1.0, bassIntensity,
                         vec3(0.2, 0.5, 1.0)).rgb;

        col += drawRibbon(uv, spectralCentroidNormalized * 2.0 - 1.0, centroidIntensity,
                         vec3(1.0, 1.0, 0.0)).rgb;

        col += drawRibbon(uv, energyNormalized * 2.0 - 1.0, energyIntensity,
                         vec3(1.0, 0.1, 0.1)).rgb;

        fragColor.rgb += col;
    }
}
