// Updated shader with Rezz-inspired red/black spiral motif
// -------------------------------------------------------

// Function to check if pixel and surrounding area is solid white
float getWhiteAmount(vec2 uv, vec2 pixelSize) {
    vec3 center = getLastFrameColor(uv).rgb;
    vec3 left   = getLastFrameColor(uv - vec2(pixelSize.x, 0.0)).rgb;
    vec3 right  = getLastFrameColor(uv + vec2(pixelSize.x, 0.0)).rgb;
    vec3 up     = getLastFrameColor(uv + vec2(0.0, pixelSize.y)).rgb;
    vec3 down   = getLastFrameColor(uv - vec2(0.0, pixelSize.y)).rgb;

    float centerWhite = dot(center, vec3(1.0)) / 3.0;
    float leftWhite   = dot(left,   vec3(1.0)) / 3.0;
    float rightWhite  = dot(right,  vec3(1.0)) / 3.0;
    float upWhite     = dot(up,     vec3(1.0)) / 3.0;
    float downWhite   = dot(down,   vec3(1.0)) / 3.0;

    float threshold   = 0.95;
    float smoothness  = 0.1;

    float centerSmooth = smoothstep(threshold - smoothness, threshold, centerWhite);
    float leftSmooth   = smoothstep(threshold - smoothness, threshold, leftWhite);
    float rightSmooth  = smoothstep(threshold - smoothness, threshold, rightWhite);
    float upSmooth     = smoothstep(threshold - smoothness, threshold, upWhite);
    float downSmooth   = smoothstep(threshold - smoothness, threshold, downWhite);

    return (centerSmooth + leftSmooth + rightSmooth + upSmooth + downSmooth) / 5.0;
}

// Function to apply Julia set distortion
vec2 julia(vec2 uv, float t){
    float cRe = sin(t) * 0.7885 + (spectralSkewNormalized / 10.0);
    float cIm = cos(t) * 0.7885 + (spectralRolloffNormalized / 10.0);

    int maxIter = 64;
    for(int i=0; i<maxIter; i++){
        float x = uv.x*uv.x - uv.y*uv.y + cRe;
        float y = 2.0*uv.x*uv.y + cIm;
        uv.x = x;
        uv.y = y;
        if(length(uv) > 2.0) break;
    }
    return uv;
}

// Main image function
void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float t = time * 0.1;  // time/10.

    vec2 pixelSize = 1.0 / iResolution.xy;
    float whiteAmount = getWhiteAmount(fragCoord / iResolution.xy, pixelSize);

    // Slight UV scaling and offset based on audio features
    vec2 scaledUv = uv * (1.0 + spectralCentroidZScore * 0.5);
    scaledUv += vec2(sin(t * 3.0) * spectralSpreadZScore * 0.2,
                     cos(t * 3.0) * spectralKurtosisZScore * 0.2);

    // Get a "fill color" from the previous frame, then tweak HSL
    vec3 fillColor = getLastFrameColor(scaledUv).rgb;
    float hueShift = spectralCentroidZScore * 0.1;
    vec3 hsl = rgb2hsl(fillColor);
    hsl.x += hueShift;
    hsl.y *= 0.8 + spectralFluxZScore * 0.2;
    hsl.z *= 0.7 + spectralCrestZScore * 0.3;
    vec3 fillColorFinal = hsl2rgb(hsl);

    // Additional small UV shifts
    uv += vec2(spectralSpreadMedian, spectralSpreadMedian) * 0.01;
    uv += vec2(sin(t*2.0)*(spectralCentroidZScore)*0.01,
               cos(t*2.0)*(trebleZScore)*0.01);

    // Julia set distortion
    uv = julia(uv, t);

    // Previous frame color
    vec3 prevColor = getLastFrameColor(uv).rgb;

    // Ripple effect
    vec2 rippleUv = uv * vec2(bassZScore);
    if(beat) rippleUv *= 2.1;
    float distToCenter = length(rippleUv);
    float ripple = sin(distToCenter * 8.0 - t * 1.5) * 0.3 + 0.5;

    // Psychedelic color
    float hue = mod(t * 15.0 + distToCenter * 60.0 + 15.0, 360.0);
    vec3 color = hsl2rgb(vec3(hue, 0.8, 0.5));
    color *= ripple;
    color = mix(prevColor, color, 0.7);

    // Blend fill color
    color = mix(color, fillColorFinal, whiteAmount);

    // Some HSL manipulations
    vec3 prevHsl = rgb2hsl(prevColor);
    vec3 hslOriginal = vec3(0.5);
    hslOriginal.z *= 0.9 + sin(uv.x);
    hslOriginal.y *= 0.9 + sin(uv.y);
    hslOriginal.x += spectralCentroid;
    if(hslOriginal.y < 0.5){
        hslOriginal.x += spectralRolloffNormalized;
        hslOriginal.y += (prevHsl.x)*0.1;
    }
    if(hslOriginal.z > 0.8) {
        hslOriginal.z -= bassNormalized;
        hslOriginal.x += spectralKurtosisZScore * 0.1;
    }
    if(hslOriginal.z < 0.1) {
        hslOriginal.z += spectralCrestZScore * 0.1;
    }
    color = fract(hsl2rgb(hslOriginal));

    // --- Rezz-inspired spiral overlay (red & black) ---
    vec2 centerUv  = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float angle    = atan(centerUv.y, centerUv.x);
    float radius   = length(centerUv);

    // Apply fractal-based displacement to the spiral
    vec2 fractalUv = julia(centerUv * (1.0 + spectralSpreadZScore * 0.3), t);
    float fractalDisplacement = length(fractalUv) * 0.2;

    // Get previous frame color for modulation
    vec3 prevFrameCol = getLastFrameColor(centerUv).rgb;
    float prevLuma = dot(prevFrameCol, vec3(0.299, 0.587, 0.114));

    // Modulate the spiral with fractal and previous frame
    float swirlSpeed = 2.0 * (1.0 + prevLuma * spectralCentroidZScore * 0.5);
    float swirlDensity = 8.0 + fractalDisplacement * 4.0;
    float swirl = fract((angle + radius * swirlDensity - t * swirlSpeed) * 3.0);

    // Create dynamic red color based on audio features
    vec3 redColor = vec3(1.0 + spectralCrestZScore * 0.2,
                        max(0.0, spectralRoughnessZScore * 0.3),
                        max(0.0, bassZScore * 0.2));

    // Create spiral with soft edges
    float swirlEdge = smoothstep(0.45, 0.55, swirl);
    vec3 swirlCol = mix(vec3(0.0), redColor, swirlEdge);

    // Modulate spiral intensity with fractal pattern
    float spiralMask = smoothstep(0.0, 0.8, 1.0 - length(centerUv));
    float fractalInfluence = length(fractalUv) * 0.5;

    // Mix the spiral with existing color using fractal influence
    float mixAmount = 0.6 * spiralMask * (1.0 + fractalInfluence);
    color = mix(color, swirlCol, mixAmount);

    fragColor = vec4(color, 1.0);
}
