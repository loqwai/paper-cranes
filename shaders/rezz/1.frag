//http://localhost:6969/edit.html?knob_22=0.51&knob_22.min=0&knob_22.max=1&knob_23=0.52&knob_23.min=0&knob_23.max=1&knob_24=1&knob_24.min=0&knob_24.max=1&knob_25=0.88&knob_25.min=0&knob_25.max=1&knob_26=0.405&knob_26.min=-0.7&knob_26.max=1&knob_27=0.44&knob_27.min=0&knob_27.max=1&knob_28=0.52&knob_28.min=0&knob_28.max=1&knob_29=0.03&knob_29.min=0&knob_29.max=1&knob_30=0.94&knob_30.min=0&knob_30.max=1&knob_17=0.457&knob_17.min=0&knob_17.max=1&knob_12=0.835&knob_12.min=0&knob_12.max=1&image=images%5Crezz-full-lips-cropped.png&knob_20=0.299&knob_20.min=0&knob_20.max=1&knob_19=0.969&knob_19.min=0&knob_19.max=1&knob_18=0.961&knob_18.min=0&knob_18.max=1&knob_16=0.772&knob_16.min=0&knob_16.max=1&knob_9=0.244&knob_9.min=0&knob_9.max=1&knob_13=0.323&knob_13.min=0&knob_13.max=1&knob_14=0.205&knob_14.min=0&knob_14.max=1&knob_1=0.102&knob_1.min=0&knob_1.max=1&knob_8=1&knob_8.min=0&knob_8.max=1&knob_15=0.157&knob_15.min=0&knob_15.max=1&knob_2=1&knob_2.min=0&knob_2.max=1&knob_3=1&knob_3.min=0&knob_3.max=1&knob_4=0.472&knob_4.min=0&knob_4.max=1&knob_5=1&knob_5.min=0&knob_5.max=1&knob_6=0.449&knob_6.min=0&knob_6.max=1&knob_7=0.819&knob_7.min=0&knob_7.max=1&knob_21=0.181&knob_21.min=0&knob_21.max=1
//http://localhost:6969/edit.html?image=images%5Crezz-full-lips-cropped.png
#define BACKGROUND_OFFSET_X 0.51 // Replaced knob_22
#define BACKGROUND_OFFSET_Y 0.52 // Replaced knob_23

#define BACKGROUND_STRETCH_X 1.
#define BACKGROUND_ZOOM_Y 1.
#define ZOOM (mix(0.8, 1.5, energyNormalized))     // Controls overall scale/zoom - Replaced complex expression with energy
// Probe definitions for parametric control
#define PROBE_A (spectralFluxNormalized)     // Controls overall spiral density - Replaced knob_19
#define PROBE_B (spectralCentroidNormalized * 0.3 + 0.05)     // Controls spiral rotation speed - Replaced knob_20
#define PROBE_C (spectralRoughnessNormalized * 0.5)     // Controls fractal influence on spiral - Replaced knob_17
#define PROBE_D (energyNormalized)     // Controls color intensity and variation - Replaced knob_16
#define PROBE_E (mapValue(bassNormalized, 0.0, 1.0, -0.7, 1.0)) // Controls spiral thickness - Replaced knob_27/mix

#define PROBE_G (spectralCentroidNormalized/2.)     // Controls the balance between spiral and fractal
#define PROBE_H (spectralEntropyNormalized * 0.5)     // Controls background warping intensity - Replaced /100.

// Recursive scaling parameters
#define RECURSIVE_SCALE_AMOUNT (spectralCrestNormalized)   // Controls intensity of recursive scaling (0-1)
#define RECURSIVE_ITERATIONS (2.0) // Number of recursive samples (1-4) - Replaced knob_13 calc with constant 2.0 for mobile
#define RECURSIVE_SCALE_FACTOR (mapValue(energyZScore, -1.0, 2.0, 0.4, 0.8)) // Scale factor for each iteration (0.4-0.8) - Replaced simple energyZScore calc

// Spiral position controls
#define EYE_DISTANCE (spectralCrest * 0.6 + 0.25)   // Controls horizontal distance between spirals (0.25-0.85) - Replaced knob_29 calc
#define EYE_Y_OFFSET (spectralFluxNormalized * 0.2 - 0.1)    // Controls vertical position of both spirals (-0.1-0.1) - Replaced knob_30 calc
#define LEFT_X_ADJUST (spectralCrestNormalized * 0.1)        // Fine adjustment of left spiral X position - Replaced knob_1 calc
#define RIGHT_X_ADJUST (midsNormalized * 0.1)       // Fine adjustment of right spiral X position - Replaced knob_9 calc
#define SPIRAL_DENSITY (mapValue(bassNormalized, 0.0, 1.0, 4.0, 12.0)) // Controls spiral density/tightness (4.0-12.0) - Replaced knob_10 calc
#define SPIRAL_ITERATIONS (mapValue(spectralSkewNormalized, 0.0, 1.0, 3.0, 8.0)) // Controls number of spiral iterations (3.0-8.0) - Replaced knob_11 calc

// Additional distortion controls
#define DISTORTION_RADIUS (2.5)  // Controls radius of distortion effect (0.5-2.5) - Replaced knob_2 calc with constant
#define SPIRAL_DISTORTION_BOOST (mapValue(energyZScore, -1.0, 2.0, 1.0, 10.0))  // Extra distortion in spiral areas (1.0-10.0) - Replaced knob_3 calc
#define FRACTAL_COMPLEXITY (16.0)  // Controls Julia set complexity (8-32 iterations) - Replaced knob_4 calc with constant 16.0 for mobile
#define DISTORTION_DIRECTIONALITY (0.)  // Controls how directional the distortion is (0=radial, 1=along fractal)
#define TIME_SCALE (0.25)  // Controls overall animation speed (0.05-0.25) - Replaced knob_5 calc with constant
#define RED_TINT_AMOUNT 0.  // Controls amount of red tinting in distortion (0.2-0.8)
#define JULIA_VARIATION (0.2457)  // Controls variation in Julia set constants (0.0-0.3) - Replaced knob_7 calc with constant

// Function to apply Julia set distortion
vec2 julia(vec2 uv, float t){
    float cRe = sin(t) * 0.7885;
    float cIm = cos(t) * 0.7885;

    // Scale iterations for mobile performance
    int maxIter = 16;
    for(int i=0; i<maxIter; i++){
        float x = uv.x*uv.x - uv.y*uv.y + cRe;
        float y = 2.0*uv.x*uv.y + cIm;
        uv.x = x;
        uv.y = y;
        if(length(uv) > 2.0) break;
    }
    return uv;
}

// Function to apply Julia set distortion emanating from a specific point
vec2 juliaFromPoint(vec2 uv, vec2 center, float t){
    // Adjust coordinates relative to the center point
    vec2 adjustedUv = uv - center;

    // Add variation to Julia parameters based on JULIA_VARIATION
    float cRe = sin(t) * (0.7885 + JULIA_VARIATION * sin(t * 2.7));
    float cIm = cos(t) * (0.7885 + JULIA_VARIATION * cos(t * 3.1));

    // Scale iterations based on FRACTAL_COMPLEXITY
    int maxIter = int(FRACTAL_COMPLEXITY);
    for(int i=0; i<maxIter; i++){
        float x = adjustedUv.x*adjustedUv.x - adjustedUv.y*adjustedUv.y + cRe;
        float y = 2.0*adjustedUv.x*adjustedUv.y + cIm;
        adjustedUv.x = x;
        adjustedUv.y = y;
        if(length(adjustedUv) > 2.0) break;
    }

    // Return distorted coordinates in original space
    return adjustedUv + center;
}

// Main image function
void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // Scale UV based on ZOOM for overall zoom control
    float zoom = mix(0.8, 1.5, ZOOM);
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / (iResolution.y * zoom);
    vec2 sampleUv = uv;
    vec2 sampleZoom = vec2(BACKGROUND_STRETCH_X, BACKGROUND_ZOOM_Y);
    vec2 sampleOffset = vec2(BACKGROUND_OFFSET_X, BACKGROUND_OFFSET_Y);
    sampleUv += sampleOffset;
    sampleUv *= sampleZoom;
    sampleUv = fract(sampleUv);
    vec3 init = getInitialFrameColor(sampleUv).rgb;
    float t = time * TIME_SCALE; // Use TIME_SCALE for animation speed

    vec2 pixelSize = 1.0 / iResolution.xy;

    // Define eye centers in UV space
    vec2 leftEyeCenter = vec2(-EYE_DISTANCE - LEFT_X_ADJUST, -EYE_Y_OFFSET);
    vec2 rightEyeCenter = vec2(EYE_DISTANCE - RIGHT_X_ADJUST, -EYE_Y_OFFSET);

    // Calculate distances to eye centers
    float leftEyeDist = length(uv - leftEyeCenter);
    float rightEyeDist = length(uv - rightEyeCenter);

    // Determine which eye is closer
    bool closerToLeftEye = leftEyeDist < rightEyeDist;
    vec2 closestEyeCenter = closerToLeftEye ? leftEyeCenter : rightEyeCenter;

    // Apply eye-specific Julia set distortion
    vec2 leftDistortedUv = juliaFromPoint(uv, leftEyeCenter, t + 0.3); // Slight phase difference
    vec2 rightDistortedUv = juliaFromPoint(uv, rightEyeCenter, t);

    // Weighted blend between the two fractal patterns based on relative distance
    float blendWeight = smoothstep(0.0, 0.5, (rightEyeDist - leftEyeDist) * 2.0 + 0.5);
    vec2 distortedUv = mix(leftDistortedUv, rightDistortedUv, blendWeight);

    // Calculate fractal intensity as distance from original to fractalized position
    float leftFractalIntensity = length(leftDistortedUv - uv) * 2.0;
    float rightFractalIntensity = length(rightDistortedUv - uv) * 2.0;
    float fractalIntensity = mix(leftFractalIntensity, rightFractalIntensity, blendWeight);

    // Combined distance field (minimum distance to either eye)
    float eyesDistance = min(leftEyeDist, rightEyeDist);

    // Create a smooth falloff for the distortion effect
    float distortionRadius = DISTORTION_RADIUS; // Use DISTORTION_RADIUS probe
    float distortionFalloff = smoothstep(distortionRadius, distortionRadius * 0.3, eyesDistance);

    // Scale distortion strength based on proximity to eyes, fractal intensity, and PROBE_H
    float baseDistortionStrength = mix(0.0, 0.3, PROBE_H); // Fine-grained control over warping
    float distortionStrength = baseDistortionStrength * distortionFalloff * (1.0 + fractalIntensity * 0.5);

    // Original sample coordinates
    vec2 warpedSampleUv = sampleUv;

    // Generate distortion vectors pointing away from eye centers
    vec2 distortDirection;
    if (closerToLeftEye) {
        distortDirection = normalize(uv - leftEyeCenter);
    } else {
        distortDirection = normalize(uv - rightEyeCenter);
    }

    // Apply fractal modulation to direction
    distortDirection += vec2(
        sin(fractalIntensity * 5.0 + t * 2.0) * 0.3,
        cos(fractalIntensity * 4.0 - t * 1.5) * 0.3
    );
    distortDirection = normalize(distortDirection);

    // Final distortion offset
    vec2 distortOffset = distortDirection * distortionStrength * (0.5 + fractalIntensity);

    // Apply distortion only around the eyes
    warpedSampleUv += distortOffset * distortionFalloff;

    // Sample the initial image with distortion
    vec3 warpedInit = getInitialFrameColor(warpedSampleUv).rgb;

    // Original undistorted texture
    vec3 originalTexture = getInitialFrameColor(sampleUv).rgb;

    // Blend multiple samples based on proximity to eyes
    vec3 distortedTexture = mix(
        originalTexture,                                       // Original far from eyes
        warpedInit, // Use only primary sample near eyes
        distortionFalloff
    );

    // Implement recursive scaling effect along fractal lines
    vec3 recursiveTexture = originalTexture;
    float recursiveInfluence = RECURSIVE_SCALE_AMOUNT * smoothstep(0.0, 0.4, fractalIntensity);

    if (recursiveInfluence > 0.01) {
        // Start point for scaling - use the distorted coordinates as a base
        vec2 scaledUv = sampleUv;
        float totalWeight = 1.0;
        float weight = 1.0;

        // Follow the fractal path emanating from the eye center
        vec2 fractalDirection = normalize(distortedUv - closestEyeCenter) * 0.01;

        // Apply recursive sampling
        for (float i = 0.0; i < 4.0; i++) {
            if (i >= RECURSIVE_ITERATIONS) break;

            // Scale down for each iteration
            float scaleFactor = RECURSIVE_SCALE_FACTOR + fractalIntensity * 0.1;

            // Move along fractal direction
            scaledUv += fractalDirection * (i + 1.0);

            // Scale around the center of the face
            vec2 faceCenter = vec2(0.5, 0.5); // Assuming the face is centered in texture
            scaledUv = faceCenter + (scaledUv - faceCenter) * scaleFactor;

            // Get scaled texture
            vec3 scaledTexture = getInitialFrameColor(scaledUv).rgb;

            // Decrease weight for each iteration
            weight *= 0.7;
            recursiveTexture += scaledTexture * weight;
            totalWeight += weight;
        }

        // Normalize
        recursiveTexture /= totalWeight;

        // Apply light red tint to recursive samples
        recursiveTexture = mix(recursiveTexture, recursiveTexture * vec3(1.2, 0.8, 0.8), 0.3);
    }

    // Blend the recursive effect with the distorted texture
    distortedTexture = mix(distortedTexture, recursiveTexture, recursiveInfluence);

    // Enhance red channel in the distorted areas only
    distortedTexture.r = mix(distortedTexture.r,
                          distortedTexture.r * 1.3,
                          distortionFalloff * 0.6);
    distortedTexture.gb = mix(distortedTexture.gb,
                           distortedTexture.gb * mix(0.7, 0.9, PROBE_D),
                           distortionFalloff);

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
    baseColor = mix(baseColor, distortedTexture, knob_20 * 0.7);

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

    // Combined eye mask for enhanced distortion in spiral areas
    float combinedEyeMask = max(leftEyeMask, rightEyeMask);

    // Enhance distortion within spiral areas
    float insideSpiralDistortionBoost = SPIRAL_DISTORTION_BOOST; // Use SPIRAL_DISTORTION_BOOST probe
    float spiralDistortionFalloff = smoothstep(leftEyeRadius * 1.2, leftEyeRadius * 0.8, eyesDistance);

    // Apply enhanced distortion specifically for the spiral areas
    vec2 spiralWarpedSampleUv = sampleUv;
    vec2 spiralDistortOffset = distortDirection * distortionStrength * insideSpiralDistortionBoost * (0.5 + fractalIntensity);
    spiralWarpedSampleUv += spiralDistortOffset * spiralDistortionFalloff;

    // Sample with enhanced distortion
    vec3 spiralWarpedInit = getInitialFrameColor(spiralWarpedSampleUv).rgb;

    // Apply enhanced recursive effect within spiral areas
    vec3 spiralRecursiveTexture = spiralWarpedInit;
    if (recursiveInfluence > 0.01 && spiralDistortionFalloff > 0.1) {
        // Start point for enhanced recursive scaling
        vec2 enhancedScaledUv = spiralWarpedSampleUv;
        float totalWeight = 1.0;
        float weight = 1.0;

        // Use stronger directional influence in spiral areas
        vec2 enhancedFractalDirection = normalize(distortedUv - closestEyeCenter) * 0.03;

        // Apply recursive sampling with higher intensity in spiral areas
        for (float i = 0.0; i < 4.0; i++) {
            if (i >= RECURSIVE_ITERATIONS) break;

            // More aggressive scaling inside spiral areas
            float enhancedScaleFactor = RECURSIVE_SCALE_FACTOR * 0.8 + fractalIntensity * 0.3;

            // Move along fractal direction with enhanced step
            enhancedScaledUv += enhancedFractalDirection * (i + 1.0) * 1.5;

            // Scale around the eye center rather than face center
            enhancedScaledUv = closestEyeCenter + (enhancedScaledUv - closestEyeCenter) * enhancedScaleFactor;

            // Get scaled texture
            vec3 enhancedScaledTexture = getInitialFrameColor(enhancedScaledUv).rgb;

            // Decrease weight for each iteration but slower than normal
            weight *= 0.8;
            spiralRecursiveTexture += enhancedScaledTexture * weight;
            totalWeight += weight;
        }

        // Normalize
        spiralRecursiveTexture /= totalWeight;

        // Apply stronger red tint to recursive samples in spiral areas with RED_TINT_AMOUNT control
        spiralRecursiveTexture = mix(spiralRecursiveTexture,
                                   spiralRecursiveTexture * vec3(1.0 + RED_TINT_AMOUNT * 0.8,
                                                             1.0 - RED_TINT_AMOUNT * 0.6,
                                                             1.0 - RED_TINT_AMOUNT * 0.6),
                                   RED_TINT_AMOUNT);
    }

    // Blend standard distorted texture with enhanced spiral area distortion
    distortedTexture = mix(distortedTexture, spiralRecursiveTexture, spiralDistortionFalloff * recursiveInfluence * 2.0);

    // Apply spiral pattern only within the eye circles
    float leftFinalMask = leftSpiralMask * leftEyeMask;
    float rightFinalMask = rightSpiralMask * rightEyeMask;

    // Combine both eye spirals
    float combinedSpiralMask = max(leftFinalMask, rightFinalMask);
    vec3 spiralColor = mix(vec3(0.0), redColor, combinedSpiralMask);

    // Mix spiral with fractal background based on PROBE_G
    float mixRatio = mix(-.7, 2., PROBE_G);
    vec3 color = mix(fractalColor, spiralColor, mixRatio);


    // Final blend with the distorted texture - reduced blend in spiral areas to preserve spiral visual
    float textureBlend = knob_20 * (1.0 - combinedSpiralMask * 0.8);
    color = mix(color, distortedTexture, textureBlend);

    // Debug visualization (comment out for final version)
    // color = mix(color, vec3(1.0, 0.0, 0.0), distortionFalloff * 0.3); // Show distortion radius

    fragColor = vec4(color, 1.0);
}
