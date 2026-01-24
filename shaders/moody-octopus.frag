// @favorite: true
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
    float threshold = 0.95;
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
  vec3 prevColor=getLastFrameColor(uv).rgb;
  // Julia set parameters
  float cRe=sin(t)*.7885 + (spectralSkewNormalized/10.);
  float cIm=cos(t)*.7885 + (spectralRolloffNormalized / 10.);

  // Apply the Julia set formula
  int maxIter=64;
  for(int i=0;i<maxIter;i++){
    float x=uv.x*uv.x-uv.y*uv.y+cRe;
    float y=2.*uv.x*uv.y+cIm;
    uv.x=x;
    uv.y=y;

    // Break if the point escapes to infinity
    if(length(uv)>2.)break;
  }

  return uv;
}

// Main image function
void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float t = time/10.;

    // Calculate pixel size for sampling
    vec2 pixelSize = 1.0 / iResolution.xy;

    // Get smooth white amount
    float whiteAmount = getWhiteAmount(fragCoord.xy / iResolution.xy, pixelSize);

    // Scale UV for interesting fill pattern
    vec2 scaledUv = uv * (1.0 + spectralCentroidZScore * 0.5);
    scaledUv += vec2(sin(t * 3.0) * spectralSpreadZScore * 0.2,
                    cos(t * 3.0) * spectralKurtosisZScore * 0.2);

    // Get color from previous frame with scaled UV
    vec3 fillColor = getLastFrameColor(scaledUv).rgb;

    // Add some variation based on audio features
    float hueShift = spectralCentroidZScore * 0.1;
    vec3 hsl = rgb2hsl(fillColor);
    hsl.x += hueShift;
    hsl.y *= 0.8 + spectralFluxZScore * 0.2;
    hsl.z *= 0.7 + spectralCrestZScore * 0.3;

    vec3 fillColorFinal = hsl2rgb(hsl);

    // Original shader code continues here
    uv += vec2(spectralSpreadMedian, spectralSpreadMedian)/100.;
    uv += vec2(sin(t*2.)*(spectralCentroidZScore)/100.,
               cos(t*2.)*(trebleZScore)/100.);

    uv = julia(uv, t);

    // Sample previous frame color
    vec3 prevColor = getLastFrameColor(uv).rgb;

    // Select this pixel based on frame and spectral data
    float band = smoothstep(0.0, 0.1, uv.x*100.-mod(t*100.,100.));
    vec3 hslOriginal = vec3(0.5);
    hslOriginal.z *= 0.9 + sin(uv.x);
    hslOriginal.y *= 0.9 + sin(uv.y);

    // Normalize coordinates to -1.0 to 1.0 range for ripple effect
    vec2 rippleUv = uv * vec2(bassZScore);
    if(beat) rippleUv *= 2.1;

    // Calculate ripple effect with smoother transitions
    float distanceToCenter = length(rippleUv);
    float ripple = sin(distanceToCenter*(8.)-t*1.5)*.3+.5;

    // Generate psychedelic color with smoother transitions
    float hue = mod(t*15.+distanceToCenter*60.+(15.),360.);
    vec3 color = hsl2rgb(vec3(hue,0.8,0.5));

    // Apply ripple effect with reduced intensity
    color *= ripple;

    // Smoother color mixing
    color = mix(prevColor, color, 0.7);

    // Mix between original shader color and fill color based on white amount
    color = mix(color, fillColorFinal, whiteAmount);

    uv = fragCoord.xy/resolution.xy;
    vec3 prevHsl = rgb2hsl(prevColor);

    hslOriginal.x += spectralCentroid;
    if(hslOriginal.y < 0.5){
        hslOriginal.x += spectralRolloffNormalized;
        hslOriginal.y += (prevHsl.x)/10.;
    }

    if(hslOriginal.z > 0.8) {
        hslOriginal.z -= bassNormalized;
        hslOriginal.x += spectralKurtosisZScore/10.;
    }

    if(hslOriginal.z < 0.1) {
        hslOriginal.z += spectralCrestZScore/10.;
    }

    color = fract(hsl2rgb(hslOriginal));
    uv = fragCoord.xy/resolution.xy;

    fragColor = vec4(color, 1.);
}
