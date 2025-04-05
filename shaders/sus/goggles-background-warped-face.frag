// Updated shader with Rezz-inspired red/black spiral motif
// -------------------------------------------------------
// http://localhost:6969/edit.html?knob_71=0.27&knob_71.min=0&knob_71.max=1&knob_72=0.36&knob_72.min=0&knob_72.max=1&knob_73=0.68&knob_73.min=0&knob_73.max=1&knob_74=1&knob_74.min=0&knob_74.max=1&knob_75=0.13&knob_75.min=0&knob_75.max=1&knob_76=0.79&knob_76.min=0&knob_76.max=1&knob_77=0.09&knob_77.min=0&knob_77.max=1&knob_78=0.05&knob_78.min=0&knob_78.max=1&knob_79=0.04&knob_79.min=0&knob_79.max=1&knob_19=0.543&knob_19.min=0&knob_19.max=1&knob_14=0.496&knob_14.min=0&knob_14.max=1&image=images%5Crezz-full-lips-cropped.png&knob_22=0.409&knob_22.min=0&knob_22.max=1&knob_21=0.898&knob_21.min=0&knob_21.max=1&knob_20=0.976&knob_20.min=0&knob_20.max=1&knob_18=0.622&knob_18.min=0&knob_18.max=1
// http://localhost:6969/edit.html?knob_71=0.53&knob_71.min=0&knob_71.max=1&knob_72=0.15&knob_72.min=0&knob_72.max=1&knob_73=0.74&knob_73.min=0&knob_73.max=1&knob_74=0.25&knob_74.min=0&knob_74.max=1&knob_75=-0.598&knob_75.min=-0.7&knob_75.max=1&knob_76=0.28&knob_76.min=0&knob_76.max=1&knob_77=0.81&knob_77.min=0&knob_77.max=1&knob_78=0&knob_78.min=0&knob_78.max=1&knob_79=0.02&knob_79.min=0&knob_79.max=1&knob_19=0.543&knob_19.min=0&knob_19.max=1&knob_14=0.496&knob_14.min=0&knob_14.max=1&image=images%5Crezz-full-lips-cropped.png&knob_22=0.37&knob_22.min=0&knob_22.max=1&knob_21=0.921&knob_21.min=0&knob_21.max=1&knob_20=0.898&knob_20.min=0&knob_20.max=1&knob_18=0.622&knob_18.min=0&knob_18.max=1&knob_11=0&knob_11.min=0&knob_11.max=1
#define BACKGROUND_OFFSET_X (spectralSkewNormalized)
#define BACKGROUND_OFFSET_Y (spectralKurtosisNormalized)

#define BACKGROUND_ZOOM_X (spectralSpreadNormalized * 0.8 + 0.2)
#define BACKGROUND_ZOOM_Y (spectralEntropyNormalized * 0.8 + 0.2)
// Probe definitions for parametric control
#define PROBE_A (spectralFluxNormalized)
#define PROBE_B (spectralCentroidNormalized * 0.2 + 0.05)
#define PROBE_C (spectralRoughnessNormalized * 0.8)
#define PROBE_D (energyNormalized * 0.5 + 0.5)
#define PROBE_E (mapValue(trebleNormalized, 0.0, 1.0, -0.7, 1.0))
#define PROBE_F (mapValue(energyZScore, -1.0, 2.0, 0.8, 1.5))
#define PROBE_G (mapValue(spectralFluxNormalized, 0., 1., 0.1, 0.9))

// Spiral position controls
#define EYE_DISTANCE (spectralCrest * 0.6 + 0.25)
#define EYE_Y_OFFSET (spectralFluxNormalized * 0.2 - 0.1)
#define LEFT_X_ADJUST (spectralCrestNormalized * 0.1)
#define RIGHT_X_ADJUST (midsNormalized * 0.1)
#define SPIRAL_DENSITY (mapValue(bassNormalized, 0.0, 1.0, 4.0, 12.0))
#define SPIRAL_ITERATIONS (mapValue(spectralSkewNormalized, 0.0, 1.0, 3.0, 8.0))

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
    float cRe = sin(t) * 0.7885;
    float cIm = cos(t) * 0.7885;

    // Scale iterations for mobile performance
    int maxIter = 32;
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
    // Scale UV based on PROBE_F for overall zoom control
    float zoom = mix(0.8, 1.5, PROBE_F);
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / (iResolution.y * zoom);
    vec2 sampleUv = uv;
    vec2 sampleZoom = vec2(BACKGROUND_ZOOM_X, BACKGROUND_ZOOM_Y);
    vec2 sampleOffset = vec2(BACKGROUND_OFFSET_X, BACKGROUND_OFFSET_Y);
    sampleUv += sampleOffset;
    sampleUv *= sampleZoom;
    sampleUv = fract(sampleUv);
    vec3 init = getInitialFrameColor(sampleUv).rgb;
    float t = time * 0.1;

    vec2 pixelSize = 1.0 / iResolution.xy;
    float whiteAmount = getWhiteAmount(fragCoord / iResolution.xy, pixelSize);

    // Apply Julia set distortion to create fractal background
    vec2 distortedUv = julia(uv * (0.8 + PROBE_C * 0.4), t);

    // Create texture distortion based on fractal
    float distortionStrength = mix(0.05, 0.2, PROBE_C); // Control warp intensity with fractal influence
    vec2 warpedSampleUv = sampleUv;

    // Generate distortion vectors from fractal pattern
    float fractalNoise = length(distortedUv) * 2.0;
    vec2 distortOffset = vec2(
        sin(fractalNoise * 5.0 + t * 2.0) * distortionStrength,
        cos(fractalNoise * 4.0 - t * 1.5) * distortionStrength
    );

    // Apply distortion with variation based on bass
    warpedSampleUv += distortOffset;

    // Sample the initial image with distortion
    vec3 warpedInit = getInitialFrameColor(warpedSampleUv).rgb;

    // Apply additional sampling for distorted areas
    vec2 secondaryWarp = warpedSampleUv + distortOffset * 0.5;
    vec3 secondaryInit = getInitialFrameColor(secondaryWarp).rgb;

    // Blend multiple samples for interesting effect
    vec3 distortedTexture = mix(warpedInit, secondaryInit, fractalNoise * 0.3);

    // Enhance red channel in texture to match theme
    distortedTexture.r = mix(distortedTexture.r, distortedTexture.r * 1.3, 0.6);
    distortedTexture.gb *= mix(0.7, 0.9, PROBE_D);

    // Get previous frame color for background effects
    vec3 prevColor = getLastFrameColor(distortedUv).rgb;

    // Create base fractal color with dark red/maroon theme
    vec3 darkRed = vec3(0.5, 0.0, 0.0);
    vec3 maroon = vec3(0.4, 0.0, 0.1);
    vec3 blackRed = vec3(0.2, 0.0, 0.0);

    // Position-based color variation with texture influence
    float posFactor = fract(length(distortedUv) * 1.5 + t * 0.5);
    vec3 baseColor = mix(blackRed, maroon, posFactor);
    baseColor = mix(baseColor, darkRed, sin(atan(distortedUv.y, distortedUv.x) * 3.0) * 0.5 + 0.5);

    // Blend fractal color with distorted texture
    baseColor = mix(baseColor, distortedTexture, spectralFluxNormalized * 0.7);

    // Apply color intensity from PROBE_D
    float colorIntensity = mix(0.7, 1.2, PROBE_D);
    baseColor *= colorIntensity;

    // Mix with previous frame for temporal stability
    vec3 fractalColor = mix(prevColor, baseColor, 0.4);

    // Create two spirals for Rezz goggles with position controls

    // Left eye coordinates with position adjustments
    vec2 leftEyeUv = uv + vec2(EYE_DISTANCE + LEFT_X_ADJUST, EYE_Y_OFFSET);
    float leftAngle = atan(leftEyeUv.y, leftEyeUv.x);
    float leftRadius = length(leftEyeUv);

    // Right eye coordinates with position adjustments
    vec2 rightEyeUv = uv - vec2(EYE_DISTANCE - RIGHT_X_ADJUST, -EYE_Y_OFFSET);
    float rightAngle = atan(rightEyeUv.y, rightEyeUv.x);
    float rightRadius = length(rightEyeUv);

    // Calculate fractal influence on both spirals
    vec2 leftFractalUv = julia(leftEyeUv * (0.8 + PROBE_C * 0.4), t);
    vec2 rightFractalUv = julia(rightEyeUv * (0.8 + PROBE_C * 0.4), t);
    float leftFractalInfluence = length(leftFractalUv) * PROBE_C * 0.5;
    float rightFractalInfluence = length(rightFractalUv) * PROBE_C * 0.5;

    // Create spirals with parametric controls
    float spiralDensity = SPIRAL_DENSITY; // Tighter, more hypnotic spirals
    float spiralSpeed = mix(0.5, 2.0, PROBE_B);
    float spiralThickness = mix(0.1, 0.3, PROBE_E); // Slightly thinner for more hypnotic look

    // Apply fractal warping to spirals
    float warpAmount = mix(0.0, 0.3, PROBE_C);

    // Left eye spiral with multiple iterations for more hypnotic effect
    float leftSpiralMask = 0.0;
    for(float i = 0.0; i < 9.0; i++) {
        if(i >= SPIRAL_ITERATIONS) break;
        float iterationFactor = i / SPIRAL_ITERATIONS;
        float density = spiralDensity * (1.0 - iterationFactor * 0.3);
        float leftWarpedRadius = leftRadius + leftFractalInfluence * warpAmount * (1.0 - iterationFactor);
        float leftWarpedAngle = leftAngle + leftFractalInfluence * warpAmount * 0.5;
        float leftSpiral = fract((leftWarpedAngle / 3.14159 * 0.5 + leftWarpedRadius * density - t * spiralSpeed * (1.0 - iterationFactor * 0.2)));
        float iterThickness = spiralThickness * (1.0 - iterationFactor * 0.7);
        leftSpiralMask = max(leftSpiralMask, smoothstep(0.5 - iterThickness, 0.5 + iterThickness, leftSpiral) * (1.0 - iterationFactor * 0.5));
    }

    // Right eye spiral with multiple iterations
    float rightSpiralMask = 0.0;
    for(float i = 0.0; i < 9.0; i++) {
        if(i >= SPIRAL_ITERATIONS) break;
        float iterationFactor = i / SPIRAL_ITERATIONS;
        float density = spiralDensity * (1.0 - iterationFactor * 0.3);
        float rightWarpedRadius = rightRadius + rightFractalInfluence * warpAmount * (1.0 - iterationFactor);
        float rightWarpedAngle = rightAngle + rightFractalInfluence * warpAmount * 0.5;
        float rightSpiral = fract((rightWarpedAngle / 3.14159 * 0.5 + rightWarpedRadius * density - t * spiralSpeed * (1.0 - iterationFactor * 0.2)));
        float iterThickness = spiralThickness * (1.0 - iterationFactor * 0.7);
        rightSpiralMask = max(rightSpiralMask, smoothstep(0.5 - iterThickness, 0.5 + iterThickness, rightSpiral) * (1.0 - iterationFactor * 0.5));
    }

    // Create Rezz-style red color with variation
    vec3 redColor = mix(
        vec3(1.0, 0.0, 0.0), // Pure red
        vec3(1.0, 0.2, 0.2), // Lighter red
        PROBE_D * 0.5
    );

    // Combine both spirals with black background
    float leftEyeRadius = mix(0.3, 0.5, PROBE_E); // Eye size affected by thickness
    float rightEyeRadius = leftEyeRadius; // Same size for both eyes

    // Create circular masks for the eyes
    float leftEyeMask = smoothstep(leftEyeRadius, leftEyeRadius - 0.05, leftRadius);
    float rightEyeMask = smoothstep(rightEyeRadius, rightEyeRadius - 0.05, rightRadius);

    // Apply spiral pattern only within the eye circles
    float leftFinalMask = leftSpiralMask * leftEyeMask;
    float rightFinalMask = rightSpiralMask * rightEyeMask;

    // Combine both eye spirals
    float combinedSpiralMask = max(leftFinalMask, rightFinalMask);
    vec3 spiralColor = mix(vec3(0.0), redColor, combinedSpiralMask);

    // Mix spiral with fractal background based on PROBE_G
    float mixRatio = mix(0.6, 0.9, PROBE_G);
    vec3 color = mix(fractalColor, spiralColor, mixRatio);

    // Apply previous frame white amount
    color = mix(color, vec3(1.0), whiteAmount * 0.5);

    // Final blend with the distorted texture
    float textureBlend = spectralFluxNormalized * (1.0 - combinedSpiralMask * 0.8);
    color = mix(color, distortedTexture, textureBlend);

    fragColor = vec4(color, 1.0);
}
