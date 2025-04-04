// Updated shader with Rezz-inspired red/black spiral motif
// -------------------------------------------------------

// --- Control Mode --- //
// Define USE_KNOBS (e.g., #define USE_KNOBS 1) to use knobs for all parameters.
// Comment out or #define USE_KNOBS 0 to use knobs for static parameters and audio features for reactive ones.
// #define USE_KNOBS 1 // Commented out to default to audio-reactive mode

#ifndef USE_KNOBS // --- Audio Feature Mode --- //
  // Static parameters use knobs, reactive parameters use audio features

  // --- General Positioning & Sizing --- [Knobs 3-7]
  #define BACKGROUND_OFFSET_X knob_3
  #define BACKGROUND_OFFSET_Y knob_4
  #define BACKGROUND_ZOOM_X knob_5
  #define BACKGROUND_ZOOM_Y knob_6
  #define ZOOM (mix(0.5, 2.5, knob_7)) // Overall zoom base controlled by knob

  // --- Eye/Spiral Positioning --- [Knobs 14-19]
  #define EYE_DISTANCE (knob_14 * 0.6 + 0.25) // Static adjustment
  #define EYE_Y_OFFSET (knob_15 * 0.2 - 0.1) // Static adjustment
  #define LEFT_X_ADJUST (knob_16 * 0.1)     // Static adjustment
  #define RIGHT_X_ADJUST (knob_17 * 0.1)    // Static adjustment
  #define SPIRAL_DENSITY (knob_18 * 8.0 + 4.0) // Static adjustment
  #define SPIRAL_ITERATIONS (knob_19 * 5.0 + 3.0) // Static adjustment

  // --- Spiral & Fractal Controls --- [Knobs 20-22, 8-11]
  #define SPIRAL_DISTORTION_BOOST (knob_8 * 5.0 + 1.0) // Static adjustment
  #define DISTORTION_RADIUS (knob_9 * 2.0 + 0.5) // Static adjustment
  #define FRACTAL_COMPLEXITY (16.0) // Replaced knob_10 calc with constant 16.0 for mobile
  #define JULIA_VARIATION (knob_11 * 0.3) // Static adjustment
  #define PROBE_C (knob_20)       // Fractal influence on spiral (0 = rigid, 1 = very warped) - Static Knob
  #define PROBE_E (mix(-0.7, 1.0, knob_21)) // Controls spiral thickness - Static Knob
  #define RED_TINT_AMOUNT (knob_22 * 0.6 + 0.2) // Static Knob

  // --- Reactive Parameters --- (Audio Feature Controlled)
  #define PROBE_A (spectralCentroidNormalized)  // Controls overall spiral density
  #define PROBE_B (spectralFluxNormalized)      // Controls spiral rotation speed
  #define PROBE_D (energyNormalized)            // Controls color intensity and variation
  #define PROBE_F (spectralRolloffNormalized)   // Controls overall scale/zoom (Reactive component)
  #define PROBE_G (spectralRoughnessNormalized) // Controls balance between spiral and fractal
  #define PROBE_H (spectralEntropyNormalized)   // Controls background warping intensity
  #define RECURSIVE_SCALE_AMOUNT (spectralCrestNormalized)
  #define RECURSIVE_SCALE_FACTOR (spectralSpreadNormalized * 0.4 + 0.4)
  #define RECURSIVE_ITERATIONS (2.0) // Replaced bassNormalized calc with constant 2.0 for mobile
  #define TIME_SCALE (midsNormalized * 0.2 + 0.05)
  #define DISTORTION_DIRECTIONALITY (trebleNormalized)

#else // --- Knob Control Mode --- //
  // All parameters controlled by knobs

  // --- General Positioning & Sizing --- [Knobs 3-7]
  #define BACKGROUND_OFFSET_X knob_3
  #define BACKGROUND_OFFSET_Y knob_4
  #define BACKGROUND_ZOOM_X knob_5
  #define BACKGROUND_ZOOM_Y knob_6
  #define ZOOM (mix(0.5, 2.5, knob_7))

  // --- Eye/Spiral Positioning --- [Knobs 14-19]
  #define EYE_DISTANCE (knob_14 * 0.6 + 0.25)
  #define EYE_Y_OFFSET (knob_15 * 0.2 - 0.1)
  #define LEFT_X_ADJUST (knob_16 * 0.1)
  #define RIGHT_X_ADJUST (knob_17 * 0.1)
  #define SPIRAL_DENSITY (knob_18 * 8.0 + 4.0)
  #define SPIRAL_ITERATIONS (knob_19 * 5.0 + 3.0)

  // --- Spiral & Fractal Controls --- [Knobs 20-22, 8-11]
  #define SPIRAL_DISTORTION_BOOST (knob_8 * 5.0 + 1.0)
  #define DISTORTION_RADIUS (knob_9 * 2.0 + 0.5)
  #define FRACTAL_COMPLEXITY (knob_10 * 24.0 + 8.0)
  #define JULIA_VARIATION (knob_11 * 0.3)
  #define PROBE_C (knob_20)       // Fractal influence on spiral (0 = rigid, 1 = very warped)
  #define PROBE_E (mix(-0.7, 1.0, knob_21)) // Controls spiral thickness
  #define RED_TINT_AMOUNT (knob_22 * 0.6 + 0.2)

  // --- Animation & Effect Controls --- [Knobs 30-37, 71-79]
  #define PROBE_A (knob_71)       // Controls overall spiral density (0 = sparse, 1 = dense)
  #define PROBE_B (knob_72)       // Controls spiral rotation speed
  #define PROBE_D (knob_73)       // Controls color intensity and variation
  #define PROBE_F (knob_74)       // Controls overall scale/zoom
  #define PROBE_G (knob_75)       // Controls balance between spiral and fractal
  #define PROBE_H (knob_76)       // Controls background warping intensity
  #define RECURSIVE_SCALE_AMOUNT (knob_77)
  #define RECURSIVE_SCALE_FACTOR (knob_78 * 0.4 + 0.4)
  #define RECURSIVE_ITERATIONS (knob_79 * 3.0 + 1.0)
  #define TIME_SCALE (knob_30 * 0.2 + 0.05)
  #define DISTORTION_DIRECTIONALITY (knob_31)

  // --- Additional Effects --- [Knobs 32-37, 40-41, 43-47, 60]
  // NOTE: These are available for future expansion
  // #define ADDITIONAL_EFFECT_1 (knob_32)
  // #define ADDITIONAL_EFFECT_2 (knob_33)

  // --- Knob Usage Summary (USE_KNOBS=1) ---
  // Total Used: 30 knobs
  //   [3-11]:   General Positioning & Distortion Controls (9)
  //   [14-22]:  Eye/Spiral Positioning & Shape Controls (9)
  //   [30-31]:  Time Scale & Distortion Direction (2)
  //   [71-79]:  Animation & Effect Controls (9)
  // Available Knobs: 32-37, 40-41, 43-47, 60 (15 total)
#endif

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

// Function to apply Julia set distortion emanating from a specific point
vec2 juliaFromPoint(vec2 uv, vec2 center, float t){
    // Adjust coordinates relative to the center point
    vec2 adjustedUv = uv - center;

    // Add variation to Julia parameters based on JULIA_VARIATION
    float cRe = sin(t) * (0.7885 + JULIA_VARIATION * sin(t * 2.7));
    float cIm = cos(t) * (0.7885 + JULIA_VARIATION * cos(t * 3.1));

    // Scale iterations based on FRACTAL_COMPLEXITY
    int maxIter = int(FRACTAL_COMPLEXITY);
    for(int i=0; i<32; i++){
        if(i >= maxIter) break;
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
    float t = time * TIME_SCALE; // Use TIME_SCALE for animation speed

    vec2 pixelSize = 1.0 / iResolution.xy;
    float whiteAmount = getWhiteAmount(fragCoord / iResolution.xy, pixelSize);

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

    // Apply secondary sampling with reduced distortion for more subtle effect
    vec2 secondaryWarp = sampleUv + distortOffset * distortionFalloff * 0.3;
    vec3 secondaryInit = getInitialFrameColor(secondaryWarp).rgb;

    // Original undistorted texture
    vec3 originalTexture = getInitialFrameColor(sampleUv).rgb;

    // Blend multiple samples based on proximity to eyes
    vec3 distortedTexture = mix(
        originalTexture,                                       // Original far from eyes
        mix(warpedInit, secondaryInit, fractalIntensity * 0.3), // Distorted near eyes
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
    baseColor = mix(baseColor, distortedTexture, 0.7);

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
    float mixRatio = mix(0.6, 0.9, PROBE_G);
    vec3 color = mix(fractalColor, spiralColor, mixRatio);

    // Apply previous frame white amount
    color = mix(color, vec3(1.0), whiteAmount * 0.5);

    // Final blend with the distorted texture - reduced blend in spiral areas to preserve spiral visual
    float textureBlend = 0.7 * (1.0 - combinedSpiralMask * 0.8);
    color = mix(color, distortedTexture, textureBlend);

    fragColor = vec4(color, 1.0);
}
