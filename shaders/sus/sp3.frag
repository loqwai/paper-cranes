//http://localhost:6969/edit.html?image=images%5Crezz-full-lips-cropped.png

// --- Control Mode --- //
// Define USE_KNOBS (e.g., #define USE_KNOBS 1) to use knobs for all parameters.
// Comment out or #define USE_KNOBS 0 to use knobs for static parameters and audio features for reactive ones.
// #define USE_KNOBS 1 // Commented out to default to audio-reactive mode

#ifndef USE_KNOBS // --- Audio Feature Mode --- //
  // (USE_KNOBS is undefined or 0)
  // Static parameters use knobs, reactive parameters use audio features.

  // --- Static Parameters (Knob Controlled) ---
  // General Positioning & Sizing [Knobs 3-7]
  #define BACKGROUND_OFFSET_X knob_3
  #define BACKGROUND_OFFSET_Y knob_4
  #define BACKGROUND_STRETCH_X knob_5
  #define BACKGROUND_ZOOM_Y knob_6
  #define ZOOM (mix(0.5, 2.5, knob_7))
  // Eye/Spiral Positioning, Shape & Distortion [Knobs 14-22, 10-11, 71-74]
  #define EYE_DISTANCE (knob_14 * 0.6 + 0.125)
  #define EYE_Y_OFFSET (knob_15 * 0.4 - 0.2)
  #define LEFT_X_ADJUST (knob_16 * 0.2 - 0.1)
  #define RIGHT_X_ADJUST (knob_17 * 0.2 - 0.1)
  #define PROBE_A (knob_18)       // Spiral density - Static Knob
  #define PROBE_B (knob_19)       // Spiral rotation speed - Static Knob
  #define PROBE_C (knob_20)       // Fractal influence on spiral - Static Knob
  #define PROBE_E (mix(-2.8, 1., knob_21)) // Spiral thickness - Static Knob
  #define SPIRAL_DENSITY (knob_22 * 8.0 + 4.0) // Static Knob
  #define SPIRAL_ITERATIONS (knob_10 * 5.0 + 3.0) // Static Knob
  #define SPIRAL_DISTORTION_BOOST (knob_11 * 50.0 + 1.0) // Static Knob
  #define DISTORTION_RADIUS (knob_71 * 2.0 + 0.5) // Static Knob
  #define FRACTAL_COMPLEXITY (16.0) // Replaced knob_72 calc with constant 16.0 for mobile
  #define JULIA_VARIATION (knob_73 * 0.3) // Static Knob
  #define RED_TINT_AMOUNT (knob_74 * 0.8) // Static Knob
  // Other Visual Effects [Knobs 9, 75, 35, 36]
  #define PROBE_D (knob_9)         // Color intensity and variation - Static Knob
  // RECURSIVE_ITERATIONS is now reactive
  #define DISTORTION_DIRECTIONALITY (0.) // Kept constant
  #define TIME_SCALE (knob_75 * 0.2 + 0.01) // Static Knob
  #define FRACTAL_VISIBILITY (knob_35) // Direct blend control - Static Knob
  #define FRACTAL_INTENSITY (knob_36) // Controls fractal brightness and contrast - Static Knob

  // --- Reactive Parameters (Audio Feature Controlled) ---
  #define PROBE_G (spectralCentroidNormalized / 2.0)      // Balance: Background vs Visual Texture
  #define PROBE_H (spectralEntropyNormalized * 0.5)     // BG Warp Intensity - Adjusted scaling
  #define RECURSIVE_SCALE_AMOUNT (spectralCrestNormalized)      // Recursive Scale Base Intensity
  #define RECURSIVE_SCALE_FACTOR (mapValue(energyZScore, -1.0, 2.0, 0.4, 0.8)) // Recursive Scale Factor - Using mapValue
  #define RECURSIVE_ITERATIONS (mapValue(bassNormalized, 0., 1., 1., 4.)) // Replaced knob_8 calc

#else // --- Knob Control Mode --- //
  // (USE_KNOBS is defined and non-zero)
  // All parameters are controlled by knobs.

  // --- General Positioning & Sizing --- [Knobs 3-7]
  #define BACKGROUND_OFFSET_X knob_3
  #define BACKGROUND_OFFSET_Y knob_4
  #define BACKGROUND_STRETCH_X knob_5
  #define BACKGROUND_ZOOM_Y knob_6
  #define ZOOM (mix(0.5, 2.5, knob_7))

  // --- Eye/Spiral Positioning, Shape & Distortion --- [Knobs 14-22, 10-11, 71-74]
  #define EYE_DISTANCE (knob_14 * 0.6 + 0.125)
  #define EYE_Y_OFFSET (knob_15 * 0.4 - 0.2)
  #define LEFT_X_ADJUST (knob_16 * 0.2 - 0.1)
  #define RIGHT_X_ADJUST (knob_17 * 0.2 - 0.1)
  #define PROBE_A (knob_18)       // Spiral density
  #define PROBE_B (knob_19)       // Spiral rotation speed
  #define PROBE_C (knob_20)       // Fractal influence on spiral
  #define PROBE_E (mix(-2.8, 1., knob_21)) // Spiral thickness
  #define SPIRAL_DENSITY (knob_22 * 8.0 + 4.0)
  #define SPIRAL_ITERATIONS (knob_10 * 5.0 + 3.0)
  #define SPIRAL_DISTORTION_BOOST (knob_11 * 50.0 + 1.0)
  #define DISTORTION_RADIUS (knob_71 * 2.0 + 0.5)
  #define FRACTAL_COMPLEXITY (knob_72 * 24.0 + 8.0)
  #define JULIA_VARIATION (knob_73 * 0.3)
  #define RED_TINT_AMOUNT (knob_74 * 0.8)

  // --- Other Visual Effects & Reactivity --- [Knobs 9, 30-33, 75, 35-36]
  #define PROBE_D (knob_9)         // Color intensity and variation
  // RECURSIVE_ITERATIONS is defined below
  #define DISTORTION_DIRECTIONALITY (0.)
  #define TIME_SCALE (knob_75 * 0.2 + 0.01)
  #define FRACTAL_VISIBILITY (knob_35) // Direct blend control: 0=Base Warp, 1=Recursive Fractal
  #define FRACTAL_INTENSITY (knob_36) // Controls fractal brightness and contrast: 0=Normal, 1=Maximum
  // Reactive Parameters Mapped to Knobs:
  #define PROBE_G (knob_30 * 0.5)                         // Balance: Background vs Visual Texture
  #define PROBE_H (knob_31 * 0.01)                        // BG Warp Intensity
  #define RECURSIVE_SCALE_AMOUNT (knob_32)                   // Recursive Scale Base Intensity
  #define RECURSIVE_SCALE_FACTOR ((knob_33 * 2.0 - 1.0) * 0.4 + 0.4) // Recursive Scale Factor (Range: 0.0-0.8)
  #define RECURSIVE_ITERATIONS (knob_8 * 3.0 + 1.0) // Replaced with knob_8 for consistency

  // --- Knob Usage Summary (USE_KNOBS=1) ---
  // Total Used: 29 knobs
  //   [3-7]:   General Positioning & Sizing (5)
  //   [8]:     Recursive Iterations (1)
  //   [9]:     Probe D (Color Intensity) (1)
  //   [10]:    Spiral Iterations (1)
  //   [11]:    Spiral Distortion Boost (1)
  //   [14-22]: Eye/Spiral Positioning/Shape (9)
  //   [30]:    Probe G (Background/Visual Balance) (1)
  //   [31]:    Probe H (BG Warp Intensity) (1)
  //   [32]:    Recursive Scale Amount (1)
  //   [33]:    Recursive Scale Factor (1)
  //   [35]:    Fractal Visibility (1)
  //   [36]:    Fractal Intensity/Brightness (1)
  //   [71-74]: Eye/Spiral Distortion/Fractal (4)
  //   [75]:    Time Scale (1)
  // Available Knobs: 34, 37-41, 60, 76-79 (15 total)
#endif

// --- Function Definitions --- //

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
    // Scale UV based on ZOOM for overall zoom control
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / (iResolution.y * ZOOM);
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

    // Apply secondary sampling with reduced distortion for more subtle effect
    vec2 secondaryWarp = sampleUv + distortOffset * distortionFalloff * 0.3;
    vec3 secondaryInit = getInitialFrameColor(secondaryWarp).rgb;

    // Original undistorted texture
    vec3 originalTexture = getInitialFrameColor(sampleUv).rgb;

    // Implement recursive scaling effect along fractal lines
    // Start with samples from the initial texture
    vec3 recursiveTexture = vec3(0.0);
    float recursiveInfluence = RECURSIVE_SCALE_AMOUNT * smoothstep(0.0, 0.4, fractalIntensity);

    if (recursiveInfluence > 0.01) {
        // Start sampling point
        vec2 scaledUv = sampleUv;
        float totalWeight = 0.0;
        float weight = 1.0;

        // Follow the fractal path emanating from the eye center
        vec2 fractalDirection = normalize(distortedUv - closestEyeCenter) * 0.01;

        // Determine iterations based on settings
        int maxIterations = int(RECURSIVE_ITERATIONS) + int(FRACTAL_VISIBILITY * 2.0);

        // First sample is directly from initial texture with full weight
        recursiveTexture = getInitialFrameColor(scaledUv).rgb;
        totalWeight = 1.0;

        // Then add the recursive samples with decreasing weights
        for (float i = 0.0; i < 6.0; i++) {
            if (i >= float(maxIterations)) break;

            // More aggressive scaling for higher intensity
            float scaleFactor = RECURSIVE_SCALE_FACTOR +
                              fractalIntensity * 0.1 +
                              FRACTAL_INTENSITY * 0.2;

            // Move along fractal direction (further with high intensity)
            scaledUv += fractalDirection * (i + 1.0) * (1.0 + FRACTAL_INTENSITY * 0.5);

            // Scale around the eye center for better positioning control
            vec2 scaleCenter = mix(
                vec2(0.5, 0.5),                         // Standard center
                closestEyeCenter * 0.5 + vec2(0.5, 0.5), // Eye-centered
                FRACTAL_VISIBILITY * 0.7                 // Blend based on visibility
            );

            scaledUv = scaleCenter + (scaledUv - scaleCenter) * scaleFactor;

            // Get scaled texture
            vec3 scaledTexture = getInitialFrameColor(scaledUv).rgb;

            // Decrease weight for each iteration, but less so with higher intensity
            float weightDecay = mix(0.6, 0.85, FRACTAL_INTENSITY);
            weight *= weightDecay;
            recursiveTexture += scaledTexture * weight;
            totalWeight += weight;
        }

        // Normalize
        recursiveTexture /= totalWeight;

        // Apply brightness/contrast enhancement based on FRACTAL_INTENSITY
        float contrastPower = mix(1.0, 2.5, FRACTAL_INTENSITY); // Non-linear contrast
        float brightnessBoost = mix(1.0, 2.0, FRACTAL_INTENSITY); // Brightness multiplier

        // Apply contrast
        recursiveTexture = pow(recursiveTexture, vec3(1.0/contrastPower));

        // Apply brightness
        recursiveTexture *= brightnessBoost;

        // Apply color tint controlled by both visibility and intensity
        float tintStrength = mix(0.2, 0.8, FRACTAL_INTENSITY);
        vec3 tintColor = mix(
            vec3(1.2, 0.8, 0.8),    // Subtle red tint at low intensity
            vec3(1.5, 0.4, 0.4),    // Strong red tint at high intensity
            FRACTAL_INTENSITY
        );
        recursiveTexture = mix(recursiveTexture, recursiveTexture * tintColor, tintStrength);
    }

    // Blend the recursive effect with the distorted texture
    vec3 baseWarpedTexture = mix(
        originalTexture,                                       // Original far from eyes
        mix(warpedInit, secondaryInit, fractalIntensity * 0.3), // Distorted near eyes
        distortionFalloff
    );

    // Direct control using FRACTAL_VISIBILITY knob
    vec3 finalVisualTexture = mix(baseWarpedTexture, recursiveTexture, FRACTAL_VISIBILITY);

    // Enhance red channel in the distorted areas only
    finalVisualTexture.r = mix(finalVisualTexture.r,
                           finalVisualTexture.r * 1.3,
                           distortionFalloff * 0.6);
    finalVisualTexture.gb = mix(finalVisualTexture.gb,
                            finalVisualTexture.gb * mix(0.7, 0.9, PROBE_D),
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
    vec3 spiralColor = mix(vec3(0.0), redColor, smoothstep(0.5 - spiralThickness, 0.5 + spiralThickness, spiralWarpedInit.r));

    // --- Completely Redesigned Final Compositing Stage ---

    // 1. Standard color calculation (background + spirals)
    float mixRatio = mix(-.7, 2., PROBE_G);
    vec3 standardColor = mix(fractalColor, spiralColor, mixRatio);

    // 2. Apply additional brightness/contrast to the recursive texture based on FRACTAL_INTENSITY
    //    (This is in addition to brightness/contrast changes already applied in the recursive texture generation)
    vec3 fractalFinalTexture = recursiveTexture;

    // Apply an extreme version of the contrast boost only in the final stage
    // for maximum effect with high FRACTAL_INTENSITY values
    float finalContrastBoost = mix(1.0, 3.0, FRACTAL_INTENSITY);
    float finalBrightnessBoost = mix(1.0, 2.5, FRACTAL_INTENSITY);

    // Apply a more aggressive color transformation with S-curve for more dramatic effect
    vec3 midtoneValue = vec3(0.4, 0.2, 0.2); // Reddish midtone anchor point
    fractalFinalTexture = mix(
        pow(fractalFinalTexture, vec3(1.0/finalContrastBoost)) * finalBrightnessBoost,
        pow(smoothstep(vec3(0.0), vec3(1.0), fractalFinalTexture), vec3(0.7)) * vec3(1.5, 0.5, 0.5),
        FRACTAL_INTENSITY
    );

    // 3. Create a more extreme curve for FRACTAL_VISIBILITY with FRACTAL_INTENSITY influence
    //    Higher FRACTAL_INTENSITY makes the transition to fractals more dramatic
    float hardnessControl = mix(0.7, 0.4, FRACTAL_INTENSITY); // Controls curve sharpness
    float hardTransition = smoothstep(hardnessControl, 1.0, FRACTAL_VISIBILITY);
    float extremeVisibility = mix(
        FRACTAL_VISIBILITY * 0.7,            // Normal range for lower values
        1.0,                                 // Pure fractals at max
        hardTransition                       // Hard transition near the top
    );

    // 4. Apply a "step function" at high values for absolute purity with high intensity
    float purityThreshold = mix(0.95, 0.85, FRACTAL_INTENSITY); // Lower threshold with higher intensity
    if (FRACTAL_VISIBILITY > purityThreshold) extremeVisibility = 1.0;

    // 5. Direct blend - with added FRACTAL_INTENSITY influence
    //    Higher intensity causes fractal texture to be favored more in the blend
    float finalBlendFactor = extremeVisibility * (1.0 + FRACTAL_INTENSITY * 0.5);
    finalBlendFactor = clamp(finalBlendFactor, 0.0, 1.0); // Ensure it stays in 0-1 range

    vec3 color = mix(standardColor, fractalFinalTexture, finalBlendFactor);

    // 6. Add spirals on top, but completely remove them at high fractal visibility
    if (extremeVisibility < 0.9) {
        // Only show spirals when we're not in "pure fractal" mode
        float spiralStrength = combinedEyeMask * (1.0 - extremeVisibility);
        if (spiralStrength > 0.01) {
            color = mix(color, redColor, spiralStrength);
        }
    }

    fragColor = vec4(color, 1.0);
}
