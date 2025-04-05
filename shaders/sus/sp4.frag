//http://localhost:6969/edit.html?image=images%5Crezz-full-lips-cropped.png

// ======================== CONFIGURATION START ========================
// Control Mode: Switch between audio reactive and knob control
#define USE_AUDIO_REACTIVE
// Comment out the line above to use knobs for all parameters

// ======================== KNOB DEFINITIONS ========================

// --- General Image Control [knobs 3-7] ---
#define BACKGROUND_OFFSET_X knob_3  // Background X position
#define BACKGROUND_OFFSET_Y knob_4  // Background Y position
#define BACKGROUND_STRETCH_X knob_5 // Background X stretch
#define BACKGROUND_ZOOM_Y knob_6    // Background Y zoom
#define MAIN_ZOOM knob_7            // Main display zoom

// --- Eye/Spiral Controls [knobs 14-22] ---
#define EYE_DISTANCE knob_14        // Distance between eyes
#define EYE_Y_POSITION knob_15      // Vertical position of eyes
#define LEFT_EYE_X_ADJUST knob_16   // Left eye X fine adjustment
#define RIGHT_EYE_X_ADJUST knob_17  // Right eye X fine adjustment
#define SPIRAL_DENSITY knob_18      // Spiral pattern density
#define SPIRAL_SPEED knob_19        // Spiral rotation speed
#define FRACTAL_WARP knob_20        // Fractal influence on spiral
#define SPIRAL_THICKNESS knob_21    // Thickness of spiral lines
#define SPIRAL_PATTERN knob_22      // Spiral pattern variation

// --- Fractal Controls [knobs 10-11, 35-36, 71-74] ---
#define SPIRAL_ITERATIONS knob_10   // Number of spiral iterations
#define SPIRAL_BOOST knob_11        // Spiral distortion boost
#define FRACTAL_VISIBILITY knob_35  // Control fractal visibility
#define FRACTAL_BRIGHTNESS knob_36  // Fractal brightness and contrast
#define DISTORTION_RADIUS knob_71   // Radius of distortion effect
#define FRACTAL_COMPLEXITY knob_72  // Julia set complexity
#define JULIA_VARIATION knob_73     // Variation in Julia constants
#define COLOR_TINT knob_74          // Red tint amount

// --- Additional Effects [knobs 9, 75] ---
// RECURSIVE_ITERATIONS knob_8 is now reactive
#define COLOR_INTENSITY knob_9      // Color intensity
#define ANIMATION_SPEED knob_75     // Overall animation speed

// --- Audio Reactive Parameters ---
#ifdef USE_AUDIO_REACTIVE
    #define SPIRAL_MIX_RATIO (spectralCentroidNormalized * 0.7 + 0.1)  // Balance: Spiral vs Fractal - Adjusted range
    #define BACKGROUND_WARP (spectralEntropyNormalized * 0.5)  // Background warping intensity - Adjusted scaling
    #define RECURSIVE_SCALE_AMT (spectralCrestNormalized * 0.8 + 0.2) // Recursive scale intensity - Adjusted range
    #define RECURSIVE_SCALE_FACTOR (mapValue(energyZScore, -1.0, 2.0, 0.4, 0.8))  // Scale factor for iterations - Using mapValue
    #define RECURSIVE_ITERATIONS (mapValue(bassNormalized, 0., 1., 1., 4.)) // Reactive recursive iterations - Replaced knob_8
#else
    #define SPIRAL_MIX_RATIO (knob_30 * 0.5)                     // Balance: Spiral vs Fractal
    #define BACKGROUND_WARP (knob_31 * 0.01)                     // Background warping intensity
    #define RECURSIVE_SCALE_AMT (0.7)                            // Always ensure some recursive scale
    #define RECURSIVE_SCALE_FACTOR ((knob_33 * 2.0 - 1.0) * 0.4 + 0.4) // Scale factor for iterations
    #define RECURSIVE_ITERATIONS (knob_8 * 3.0 + 1.0) // Knob-controlled recursive iterations
#endif

// ======================== CONFIGURATION END ========================

// Function to apply Julia set distortion
vec2 julia(vec2 uv, float t) {
    float cRe = sin(t) * 0.7885;
    float cIm = cos(t) * 0.7885;

    int maxIter = 32;
    for(int i=0; i<maxIter; i++) {
        float x = uv.x*uv.x - uv.y*uv.y + cRe;
        float y = 2.0*uv.x*uv.y + cIm;
        uv.x = x;
        uv.y = y;
        if(length(uv) > 2.0) break;
    }
    return uv;
}

// Function to apply Julia set distortion from a specific point
vec2 juliaFromPoint(vec2 uv, vec2 center, float t) {
    vec2 adjustedUv = uv - center;
    float cRe = sin(t) * (0.7885 + JULIA_VARIATION * sin(t * 2.7));
    float cIm = cos(t) * (0.7885 + JULIA_VARIATION * cos(t * 3.1));

    int maxIter = int(FRACTAL_COMPLEXITY);
    for(int i=0; i<32; i++) {
        if(i >= maxIter) break;
        float x = adjustedUv.x*adjustedUv.x - adjustedUv.y*adjustedUv.y + cRe;
        float y = 2.0*adjustedUv.x*adjustedUv.y + cIm;
        adjustedUv.x = x;
        adjustedUv.y = y;
        if(length(adjustedUv) > 2.0) break;
    }
    return adjustedUv + center;
}

// Main image function
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Initialize UV coordinates based on main zoom
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / (iResolution.y * mix(0.5, 2.5, MAIN_ZOOM));

    // Sample coordinates for the initial frame
    vec2 sampleUv = uv;
    vec2 sampleZoom = vec2(BACKGROUND_STRETCH_X, BACKGROUND_ZOOM_Y);
    vec2 sampleOffset = vec2(BACKGROUND_OFFSET_X, BACKGROUND_OFFSET_Y);
    sampleUv += sampleOffset;
    sampleUv *= sampleZoom;
    sampleUv = fract(sampleUv);

    // Animation time
    float t = time * mix(0.01, 0.21, ANIMATION_SPEED);

    // ====== Eye Centers and Fractal Calculation ======
    // Calculate eye centers
    vec2 leftEyeCenter = vec2(-mix(0.125, 0.725, EYE_DISTANCE) - LEFT_EYE_X_ADJUST * 0.2 + 0.1,
                            -mix(-0.2, 0.2, EYE_Y_POSITION));
    vec2 rightEyeCenter = vec2(mix(0.125, 0.725, EYE_DISTANCE) - RIGHT_EYE_X_ADJUST * 0.2 + 0.1,
                             -mix(-0.2, 0.2, EYE_Y_POSITION));

    // Calculate distances to eyes
    float leftEyeDist = length(uv - leftEyeCenter);
    float rightEyeDist = length(uv - rightEyeCenter);
    bool closerToLeftEye = leftEyeDist < rightEyeDist;
    vec2 closestEyeCenter = closerToLeftEye ? leftEyeCenter : rightEyeCenter;
    float eyesDistance = min(leftEyeDist, rightEyeDist);

    // Apply Julia set distortion
    vec2 leftDistortedUv = juliaFromPoint(uv, leftEyeCenter, t + 0.3);
    vec2 rightDistortedUv = juliaFromPoint(uv, rightEyeCenter, t);
    float blendWeight = smoothstep(0.0, 0.5, (rightEyeDist - leftEyeDist) * 2.0 + 0.5);
    vec2 distortedUv = mix(leftDistortedUv, rightDistortedUv, blendWeight);

    // Calculate fractal intensity as distance traveled by distortion
    float leftFractalIntensity = length(leftDistortedUv - uv) * 2.0;
    float rightFractalIntensity = length(rightDistortedUv - uv) * 2.0;
    float fractalIntensity = mix(leftFractalIntensity, rightFractalIntensity, blendWeight);

    // ====== Background Warping & Texture Sampling ======
    // Calculate distortion falloff
    float distortionRadius = mix(0.5, 2.5, DISTORTION_RADIUS);
    float distortionFalloff = smoothstep(distortionRadius, distortionRadius * 0.3, eyesDistance);

    // Calculate distortion direction
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

    // Calculate distortion strength
    float baseDistortionStrength = mix(0.0, 0.3, BACKGROUND_WARP);
    float distortionStrength = baseDistortionStrength * distortionFalloff * (1.0 + fractalIntensity * 0.5);

    // Apply distortion to sample coordinates
    vec2 warpedSampleUv = sampleUv;
    vec2 distortOffset = distortDirection * distortionStrength * (0.5 + fractalIntensity);
    warpedSampleUv += distortOffset * distortionFalloff;

    // Sample the initial image (never used directly in final output)
    vec3 originalTexture = getInitialFrameColor(sampleUv).rgb;
    vec3 warpedTexture = getInitialFrameColor(warpedSampleUv).rgb;

    // ====== Recursive Fractal Texture Generation ======
    // Start with empty vector for recursive texture
    vec3 recursiveTexture = vec3(0.0);

    // Always ensure fractal is generated by removing the influence threshold
    float recursiveInfluence = RECURSIVE_SCALE_AMT;

    // Base sample for recursive texture - start with the original frame
    vec2 baseScaledUv = sampleUv;
    float totalWeight = 0.0;

    // Generate the initial sample with high weight to ensure it's visible
    float initialWeight = mix(2.0, 4.0, FRACTAL_BRIGHTNESS);
    recursiveTexture = getInitialFrameColor(baseScaledUv).rgb * initialWeight;
    totalWeight += initialWeight;

    // Determine iterations based on settings
    int maxIterations = int(RECURSIVE_ITERATIONS) + 2;

    // Fractal direction - toward the eye center with more intensity
    vec2 fractalDirection = normalize(distortedUv - closestEyeCenter) * mix(0.01, 0.05, FRACTAL_BRIGHTNESS);

    // Build recursive texture by sampling initial frame at various positions
    for (float i = 0.0; i < 8.0; i++) {
        if (i >= float(maxIterations)) break;

        // Calculate sample position with more dramatic movement
        float scaleFactor = mix(0.7, 0.85, FRACTAL_BRIGHTNESS);
        baseScaledUv += fractalDirection * (i + 1.0) * mix(1.0, 3.0, FRACTAL_BRIGHTNESS);

        // Scale around eye center for better fractal effect
        vec2 scaleCenter = mix(vec2(0.5), closestEyeCenter * 0.5 + vec2(0.5), 0.7);
        vec2 scaledUv = scaleCenter + (baseScaledUv - scaleCenter) * scaleFactor;

        // Sample the initial frame at this position
        vec3 scaledTexture = getInitialFrameColor(scaledUv).rgb;

        // Calculate weight - make later iterations more prominent to show the fractal structure
        float weight = mix(0.8, 1.5, FRACTAL_BRIGHTNESS) * (1.0 + i * 0.2);

        recursiveTexture += scaledTexture * weight;
        totalWeight += weight;
    }

    // Normalize but preserve overall brightness
    if (totalWeight > 0.001) {
        recursiveTexture /= totalWeight;
        recursiveTexture *= mix(1.0, 3.0, FRACTAL_BRIGHTNESS); // Boost overall brightness
    }

    // Apply contrast enhancement to make the initial texture more visible in fractal
    float contrastPower = mix(0.7, 1.5, FRACTAL_BRIGHTNESS);
    recursiveTexture = pow(recursiveTexture, vec3(contrastPower)); // Fixed contrast application

    // Reduce color tinting to preserve original texture colors better
    float tintAmount = mix(0.0, 0.4, COLOR_TINT);
    recursiveTexture = mix(
        recursiveTexture,
        recursiveTexture * vec3(1.5, 0.7, 0.7), // Less extreme tint
        tintAmount
    );

    // ====== Spiral Generation ======
    // Eye coordinates
    vec2 leftEyeUv = uv + vec2(mix(0.125, 0.725, EYE_DISTANCE) + LEFT_EYE_X_ADJUST * 0.2 - 0.1,
                              mix(-0.2, 0.2, EYE_Y_POSITION));
    vec2 rightEyeUv = uv - vec2(mix(0.125, 0.725, EYE_DISTANCE) - RIGHT_EYE_X_ADJUST * 0.2 - 0.1,
                              -mix(-0.2, 0.2, EYE_Y_POSITION));

    // Calculate angles and radii
    float leftAngle = atan(leftEyeUv.y, leftEyeUv.x);
    float rightAngle = atan(rightEyeUv.y, rightEyeUv.x);
    float leftRadius = length(leftEyeUv);
    float rightRadius = length(rightEyeUv);

    // Calculate fractal influence
    vec2 leftFractalUv = julia(leftEyeUv * (0.8 + FRACTAL_WARP * 0.4), t);
    vec2 rightFractalUv = julia(rightEyeUv * (0.8 + FRACTAL_WARP * 0.4), t);
    float leftFractalInfluence = length(leftFractalUv) * FRACTAL_WARP * 0.5;
    float rightFractalInfluence = length(rightFractalUv) * FRACTAL_WARP * 0.5;

    // Spiral parameters
    float spiralDensity = mix(4.0, 12.0, SPIRAL_DENSITY);
    float spiralSpeed = mix(0.5, 2.0, SPIRAL_SPEED);
    float spiralThickness = mix(0.1, 0.3, SPIRAL_THICKNESS);
    float warpAmount = mix(0.0, 0.3, FRACTAL_WARP);

    // Generate spiral masks
    float leftSpiralMask = 0.0;
    float rightSpiralMask = 0.0;

    for (float i = 0.0; i < 9.0; i++) {
        if (i >= SPIRAL_ITERATIONS) break;

        float iterationFactor = i / SPIRAL_ITERATIONS;
        float density = spiralDensity * (1.0 - iterationFactor * 0.3);

        // Left spiral
        float leftWarpedRadius = leftRadius + leftFractalInfluence * warpAmount * (1.0 - iterationFactor);
        float leftWarpedAngle = leftAngle + leftFractalInfluence * warpAmount * 0.5;
        float leftSpiral = fract((leftWarpedAngle / 3.14159 * 0.5 + leftWarpedRadius * density - t * spiralSpeed
                                * (1.0 - iterationFactor * 0.2)));
        float iterThickness = spiralThickness * (1.0 - iterationFactor * 0.7);
        leftSpiralMask = max(leftSpiralMask, smoothstep(0.5 - iterThickness, 0.5 + iterThickness, leftSpiral)
                          * (1.0 - iterationFactor * 0.5));

        // Right spiral
        float rightWarpedRadius = rightRadius + rightFractalInfluence * warpAmount * (1.0 - iterationFactor);
        float rightWarpedAngle = rightAngle + rightFractalInfluence * warpAmount * 0.5;
        float rightSpiral = fract((rightWarpedAngle / 3.14159 * 0.5 + rightWarpedRadius * density - t * spiralSpeed
                                * (1.0 - iterationFactor * 0.2)));
        rightSpiralMask = max(rightSpiralMask, smoothstep(0.5 - iterThickness, 0.5 + iterThickness, rightSpiral)
                           * (1.0 - iterationFactor * 0.5));
    }

    // Create eye circles
    float eyeRadius = mix(0.3, 0.5, SPIRAL_THICKNESS);
    float leftEyeMask = smoothstep(eyeRadius, eyeRadius - 0.05, leftRadius);
    float rightEyeMask = smoothstep(eyeRadius, eyeRadius - 0.05, rightRadius);

    // Apply spiral masks within eye circles
    float leftFinalMask = leftSpiralMask * leftEyeMask;
    float rightFinalMask = rightSpiralMask * rightEyeMask;
    float combinedSpiralMask = max(leftFinalMask, rightFinalMask);

    // Create red color for spirals
    vec3 redColor = mix(
        vec3(1.0, 0.0, 0.0),  // Pure red
        vec3(1.0, 0.2, 0.2),  // Lighter red
        COLOR_INTENSITY * 0.5
    );

    // ====== Final Composition ======
    // Generate a dark red/maroon background
    vec3 darkRed = vec3(0.2, 0.0, 0.0);  // Darker background to make fractals stand out
    vec3 maroon = vec3(0.3, 0.0, 0.1);
    vec3 blackRed = vec3(0.1, 0.0, 0.0);

    float posFactor = fract(length(distortedUv) * 1.5 + t * 0.5);
    vec3 baseColor = mix(blackRed, maroon, posFactor);
    baseColor = mix(baseColor, darkRed, sin(atan(distortedUv.y, distortedUv.x) * 3.0) * 0.5 + 0.5);
    baseColor *= mix(0.5, 1.0, COLOR_INTENSITY); // Darker base color to enhance contrast

    // Add temporal stability with previous frame
    vec3 prevColor = getLastFrameColor(distortedUv).rgb;
    vec3 baseBackground = mix(prevColor, baseColor, 0.4);

    // Step 1: Create the spiral visual without fractal
    float spiralMixRatio = mix(-0.7, 2.0, SPIRAL_MIX_RATIO);
    vec3 spiralVisual = mix(baseBackground, redColor * combinedSpiralMask, spiralMixRatio);

    // Step 2: Apply fractal visibility with stronger contrast
    // More aggressive curve to ensure fractals are visible even at low knob values
    float fractalBlend = pow(FRACTAL_VISIBILITY, 0.5);  // Less steep curve for better low-value visibility

    // At FRACTAL_VISIBILITY=0, still show some fractal (10%)
    fractalBlend = mix(0.1, 1.0, fractalBlend);

    // Final composition - blend between spiral visuals and fractal texture
    vec3 finalColor = mix(spiralVisual, recursiveTexture, fractalBlend);

    // Apply spirals on top when fractal visibility is low
    if (fractalBlend < 0.8 && combinedSpiralMask > 0.01) {
        finalColor = mix(finalColor, redColor, combinedSpiralMask * (1.0 - fractalBlend * 1.25));
    }

    fragColor = vec4(finalColor, 1.0);
}
