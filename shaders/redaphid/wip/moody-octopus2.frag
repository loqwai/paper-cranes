// Function to check if pixel and surrounding area is solid white
float getWhiteAmount(vec2 uv, vec2 pixelSize) {
    vec3 center = getLastFrameColor(uv).rgb;
    vec3 left = getLastFrameColor(uv - vec2(pixelSize.x, 0.0)).rgb;
    vec3 right = getLastFrameColor(uv + vec2(pixelSize.x, 0.0)).rgb;
    vec3 up = getLastFrameColor(uv + vec2(0.0, pixelSize.y)).rgb;
    vec3 down = getLastFrameColor(uv - vec2(0.0, pixelSize.y)).rgb;

    // Calculate average whiteness for each pixel
    float centerWhite = dot(center, vec3(1.0)) / 3.0;
    float leftWhite = dot(left, vec3(1.0)) / 3.0;
    float rightWhite = dot(right, vec3(1.0)) / 3.0;
    float upWhite = dot(up, vec3(1.0)) / 3.0;
    float downWhite = dot(down, vec3(1.0)) / 3.0;

    // Use smoothstep for gradual transition
    float threshold = 0.5;
    float smoothness = 0.1;

    float centerSmooth = smoothstep(threshold - smoothness, threshold, centerWhite);
    float leftSmooth = smoothstep(threshold - smoothness, threshold, leftWhite);
    float rightSmooth = smoothstep(threshold - smoothness, threshold, rightWhite);
    float upSmooth = smoothstep(threshold - smoothness, threshold, upWhite);
    float downSmooth = smoothstep(threshold - smoothness, threshold, downWhite);

    // Return average of all smoothstepped values
    return (centerSmooth + leftSmooth + rightSmooth + upSmooth + downSmooth) / 5.0;
}

// Function to apply Julia set distortion
vec2 julia(vec2 uv,float t){
  // Wrap UV for texture sampling
  vec2 texUv = fract(uv);
  vec3 prevColor = getLastFrameColor(texUv).rgb;

  // Julia set parameters
  float cRe = sin(t)*.7885 + (spectralSkewNormalized/200.);
  float cIm = cos(t)*.7885 + (spectralRolloffNormalized / 200.);

  // Apply the Julia set formula
  int maxIter = 64;
  float epsilon = 0.0001; // Small epsilon to prevent numerical issues
  for(int i = 0; i < maxIter; i++){
    // Add epsilon to prevent exact zero
    float x = (uv.x+epsilon)*uv.x-(uv.y+epsilon)*uv.y+cRe;
    float y = 2.*(uv.x+epsilon)*(uv.y+epsilon)+cIm;
    uv.x = x;
    uv.y = y;

    // Break if the point escapes to infinity
    if(length(uv)>2.)break;
  }

  return uv;
}

// Color palette system
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b*cos(6.28318*(c*t + d));
}

// Main image function
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    // Continuous space UV for effects
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float t = time/10.;
    t += bassZScore/15.;

    // Calculate pixel size for sampling
    vec2 pixelSize = 1.0 / iResolution.xy;

    // Texture sampling coordinates (need to be wrapped)
    vec2 texUv = fract(fragCoord.xy / iResolution.xy);

    // Get smooth white amount
    float whiteAmount = getWhiteAmount(texUv, pixelSize);

    // Scale UV for interesting fill pattern (texture sampling)
    vec2 scaledUv = fract(uv * (1.0 + spectralCentroidZScore * 0.2));
    scaledUv += vec2(sin(t * 3.0) * spectralSpreadZScore * 0.1,
                    cos(t * 3.0) * spectralKurtosisZScore * 0.1);
    scaledUv = fract(scaledUv);

    // Get color from previous frame with scaled UV
    vec3 fillColor = getLastFrameColor(scaledUv).rgb;

    // Define our artistic color palette
    vec3 a = vec3(0.5, 0.5, 0.5);    // Base brightness
    vec3 b = vec3(0.5, 0.5, 0.5);    // Color variation
    vec3 c = vec3(1.0, 1.0, 1.0);    // Frequency
    vec3 d = vec3(0.0, 0.33, 0.67);  // Phase offset for each channel

    // Create a base time/audio modulation value (no initial radial dependency)
    float baseModulation = t * 0.1 + spectralCentroidZScore * 0.1;

    // Modulate palette parameters with audio features
    vec3 pal_b = b * (0.5 + spectralFluxZScore * 0.2);
    vec3 pal_c = c * (1.0 + spectralSpreadZScore * 0.2);
    vec3 pal_d = d + vec3(spectralRolloffZScore * 0.05);

    // Generate base color from palette - Placeholder, will be overwritten later
    float colorT = sin(time/10000.);
    vec3 baseColor = palette(colorT, a, b, c, d); // Removed old calculation

    // Add some variation based on audio features
    vec3 hsl = rgb2hsl(fillColor);

    // Smoothly blend between fill color and base color
    fillColor = mix(fillColor, baseColor, 0.99);
    hsl = rgb2hsl(fillColor);

    // Add subtle variations
    hsl.x = fract(hsl.x + spectralCentroidZScore * 0.05);
    hsl.y = mix(0.6, 0.8, spectralFluxZScore * 0.2 + 0.5);
    hsl.z = mix(0.4, 0.6, spectralCrestZScore * 0.2 + 0.5) + whiteAmount * 0.2;

    vec3 fillColorFinal = hsl2rgb(fract(hsl));

    // Original shader code continues here
    // Keep UV continuous for effects
    uv += vec2(spectralSpreadMedian, spectralSpreadMedian)/100.;
    uv += vec2(sin(t*2.)*(spectralCentroidZScore)/200.,
               cos(t*2.)*(trebleZScore)/200.);

    uv = julia(uv, t);

    // Sample previous frame color with smooth transitions (texture sampling)
    vec3 prevColor = getLastFrameColor(fract(uv + vec2(bassZScore/200., spectralCentroidZScore/200.))).rgb;

    // --- Emphasize Fractal Coloring ---
    // Use post-Julia uv length and angle for more detailed coloring
    float finalDist = length(uv);
    float finalAngle = atan(uv.y, uv.x);

    // --- Generate Palette Colors Based on Fractal Features ---
    float paletteT = baseModulation + finalDist * 0.3 + finalAngle * 0.1; // New palette input based on fractal
    baseColor = palette(paletteT, a, pal_b, pal_c, pal_d);
    vec3 complementaryColor = palette(paletteT + 0.5, a, pal_b, pal_c, pal_d);

    // Create a complementary color scheme using the palette, now influenced by final fractal state
    vec3 hslOriginal = vec3(0.5);
    // Modulate mix based on fractal angle and pre-Julia uv.x (sin input is now scaled differently)
    hslOriginal = rgb2hsl(mix(baseColor, complementaryColor, sin(uv.x * 2.0 + finalAngle * 5.0 + t / 5.0) * 0.5 + 0.5));

    // Normalize coordinates for ripple effect (less emphasis now)
    vec2 rippleUv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y; // Use original uv for ripple base
    rippleUv *= vec2(bassZScore * 0.5); // Reduce bass influence on ripple size
    if(beat) rippleUv = mix(rippleUv, rippleUv * 1.2, 0.5); // Further soften beat effect

    // Calculate ripple effect with smoother transitions & less intensity
    float distanceToCenter = length(rippleUv);
    // Reduce amplitude and slightly slow down ripple frequency
    float ripple = sin(distanceToCenter*(6.)-t*1.0)*.05 + 0.95; // Much weaker ripple

    // Generate harmonious color based on fractal structure
    // Use finalDist and finalAngle for hue calculation, remove colorT dependency
    float hue = mod(t*0.05 + finalDist*0.6 + finalAngle * 0.2, 1.0);
    vec3 color = hsl2rgb(vec3(hue, 0.7, 0.55)); // Slightly increased saturation/brightness

    // Apply ripple effect weakly
    color *= ripple; // Apply ripple as a subtle multiplier

    // Smoother color mixing with previous frame (keep damping)
    color = mix(prevColor, color, 0.001);

    // Mix between fractal/ripple color and fill color based on white amount
    color = mix(color, fillColorFinal, whiteAmount);

    vec3 prevHsl = rgb2hsl(prevColor);

    // Add subtle color variations based on audio (keep these)
    hslOriginal.x += spectralCentroidZScore * 0.05;
    if(hslOriginal.y < 0.5){
        hslOriginal.x += spectralRolloffNormalized * 0.05;
        hslOriginal.y += (prevHsl.x) * 0.1;
    }
    if(hslOriginal.z > 0.8) {
        hslOriginal.z -= bassNormalized * 0.1;
        hslOriginal.x += spectralKurtosisZScore * 0.05;
    }
    if(hslOriginal.z < 0.1) {
        hslOriginal.z += spectralCrestZScore * 0.05;
    }

    // --- Final color blending: Prioritize fractal color ---
    // Give more weight to hslOriginal (derived from fractal structure)
    color = mix(hsl2rgb(hslOriginal), color, 0.3); // Was 0.7, now favors hslOriginal

    fragColor = vec4(color, 1.);
}
