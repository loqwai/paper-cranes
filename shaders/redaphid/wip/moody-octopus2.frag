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
  float cRe = sin(t)*.7885 + (spectralSkewNormalized/100.);
  float cIm = cos(t)*.7885 + (spectralRolloffNormalized / 100.);

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
    vec2 scaledUv = fract(uv * (1.0 + spectralCentroidZScore * 0.5));
    scaledUv += vec2(sin(t * 3.0) * spectralSpreadZScore * 0.2,
                    cos(t * 3.0) * spectralKurtosisZScore * 0.2);
    scaledUv = fract(scaledUv);

    // Get color from previous frame with scaled UV
    vec3 fillColor = getLastFrameColor(scaledUv).rgb;

    // Define our artistic color palette
    vec3 a = vec3(0.5, 0.5, 0.5);    // Base brightness
    vec3 b = vec3(0.5, 0.5, 0.5);    // Color variation
    vec3 c = vec3(1.0, 1.0, 1.0);    // Frequency
    vec3 d = vec3(0.0, 0.33, 0.67);  // Phase offset for each channel

    // Create a smooth color transition based on position and audio
    float colorT = length(uv) * 0.5 + t * 0.1;
    colorT += spectralCentroidZScore * 0.2;  // Audio influence on color selection

    // Modulate palette parameters with audio features
    b *= 0.5 + spectralFluxZScore * 0.5;  // Color intensity
    c *= 1.0 + spectralSpreadZScore * 0.5; // Color variation speed
    d += vec3(spectralRolloffZScore * 0.1); // Color phase shift

    // Generate base color from palette
    vec3 baseColor = palette(colorT, a, b, c, d);

    // Add some variation based on audio features
    vec3 hsl = rgb2hsl(fillColor);

    // Smoothly blend between fill color and base color
    fillColor = mix(fillColor, baseColor, 0.99);
    hsl = rgb2hsl(fillColor);

    // Add subtle variations
    hsl.x = fract(hsl.x + spectralCentroidZScore * 0.1);
    hsl.y = mix(0.6, 0.8, spectralFluxZScore * 0.5 + 0.5);
    hsl.z = mix(0.4, 0.6, spectralCrestZScore * 0.5 + 0.5) + whiteAmount * 0.2;

    vec3 fillColorFinal = hsl2rgb(fract(hsl));

    // Original shader code continues here
    // Keep UV continuous for effects
    uv += vec2(spectralSpreadMedian, spectralSpreadMedian)/100.;
    uv += vec2(sin(t*2.)*(spectralCentroidZScore)/100.,
               cos(t*2.)*(trebleZScore)/100.);

    uv = julia(uv, t);

    // Sample previous frame color with smooth transitions (texture sampling)
    vec3 prevColor = getLastFrameColor(fract(uv + vec2(bassZScore/100., spectralCentroidZScore/100.))).rgb;

    // Create a complementary color scheme using the palette
    vec3 hslOriginal = vec3(0.5);
    float complementaryT = colorT + 0.5;  // Offset for complementary colors
    vec3 complementaryColor = palette(complementaryT, a, b, c, d);
    hslOriginal = rgb2hsl(mix(baseColor, complementaryColor, sin(uv.x + t/100.) * 0.5 + 0.5));

    // Normalize coordinates to -1.0 to 1.0 range for ripple effect
    vec2 rippleUv = uv * vec2(bassZScore);
    if(beat) rippleUv *= 2.1;

    // Calculate ripple effect with smoother transitions
    float distanceToCenter = length(rippleUv);
    float ripple = sin(distanceToCenter*(8.)-t*1.5)*.3+.5;

    // Generate harmonious color with smoother transitions
    float hue = mod(t*0.5 + distanceToCenter*0.2 + colorT, 1.0);
    vec3 color = hsl2rgb(vec3(hue, 0.6, 0.5));

    // Apply ripple effect with reduced intensity
    color *= mix(0.7, 1.0, ripple);

    // Smoother color mixing with previous frame
    color = mix(prevColor, color, 0.0005);

    // Mix between original shader color and fill color based on white amount
    color = mix(color, fillColorFinal, whiteAmount);

    vec3 prevHsl = rgb2hsl(prevColor);

    // Add subtle color variations based on audio
    hslOriginal.x += spectralCentroidZScore * 0.1;
    if(hslOriginal.y < 0.5){
        hslOriginal.x += spectralRolloffNormalized * 0.1;
        hslOriginal.y += (prevHsl.x) * 0.1;
    }

    if(hslOriginal.z > 0.8) {
        hslOriginal.z -= bassNormalized * 0.2;
        hslOriginal.x += spectralKurtosisZScore * 0.1;
    }

    if(hslOriginal.z < 0.1) {
        hslOriginal.z += spectralCrestZScore * 0.1;
    }

    // Final color blending with subtle variations
    color = mix(hsl2rgb(hslOriginal), color, 0.7);
    color = fract(color + (color * bassZScore));

    fragColor = vec4(color, 1.);
}
