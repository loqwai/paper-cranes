#define BACKGROUND_OFFSET_X knob_71
#define BACKGROUND_OFFSET_Y knob_72
#define BACKGROUND_STRETCH_X knob_73
#define BACKGROUND_ZOOM_Y knob_74
#define ZOOM (mix(1.,2.4,knob_75))     // Controls overall scale/zoom
#define PROBE_B (knob_22)     // Controls spiral rotation speed
#define PROBE_C (knob_19)     // Controls fractal influence on spiral (0 = rigid, 1 = very warped)
#define PROBE_D (knob_18)     // Controls color intensity and variation
#define PROBE_E (knob_76)     // Controls spiral thickness
#define PROBE_G (knob_77)     // Controls the balance between spiral and fractal
#define PROBE_H (knob_80)     // Controls background warping intensity
#define GLASSES_SPIN_SPEED (knob_91 * 3.0 + 0.5)  // Controls the speed of spinning inside glasses (0.5-3.5)

// Recursive scaling parameters
#define RECURSIVE_SCALE_AMOUNT (knob_14)   // Controls intensity of recursive scaling (0-1)
#define RECURSIVE_ITERATIONS (knob_15 * 3.0 + 1.0) // Number of recursive samples (1-4)
#define RECURSIVE_SCALE_FACTOR (sin(time) * 0.4 + 0.4) // Scale factor for each iteration (0.4-0.8)

// Spiral position controls
#define EYE_DISTANCE (knob_78 * 0.6 + 0.25)   // Controls horizontal distance between spirals (0.25-0.85)
#define EYE_Y_OFFSET (knob_79 * 0.2 - 0.1)    // Controls vertical position of both spirals (-0.1-0.1)
#define LEFT_X_ADJUST (knob_3 * 0.1)        // Fine adjustment of left spiral X position
#define RIGHT_X_ADJUST (knob_11 * 0.1)       // Fine adjustment of right spiral X position
#define SPIRAL_DENSITY (knob_12 * 8.0 + 4.0) // Controls spiral density/tightness (4.0-12.0)
#define SPIRAL_ITERATIONS (knob_13 * 5.0 + 3.0) // Controls number of spiral iterations (3.0-8.0)

// Additional distortion controls
#define DISTORTION_RADIUS (knob_84 * 2.0 + 0.5)  // Controls radius of distortion effect (0.5-2.5)
#define SPIRAL_DISTORTION_BOOST (knob_85 * 5.0 + 1.0)  // Extra distortion in spiral areas (1.0-6.0)
#define FRACTAL_COMPLEXITY (knob_86 * 24.0 + 8.0)  // Controls Julia set complexity (8-32 iterations)
#define TIME_SCALE (knob_88 * 0.2 + 0.05)  // Controls overall animation speed (0.05-0.25)
#define RED_TINT_AMOUNT (knob_21 * 0.6)  // Controls amount of red tinting in distortion (0.2-0.8)
#define JULIA_VARIATION (knob_90 * 0.3)  // Controls variation in Julia set constants (0.0-0.3)

// Function to rotate a point around an origin
vec2 rotatePoint(vec2 point, vec2 origin, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    point -= origin;
    vec2 rotated = vec2(
        point.x * c - point.y * s,
        point.x * s + point.y * c
    );
    return rotated + origin;
}


// Function to apply Julia set distortion
vec2 julia(vec2 uv, float t){
    float cRe = sin(t) * 0.7885;
    float cIm = cos(t) * 0.7885;
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
    vec2 adjustedUv = uv - center;
    float cRe = sin(t) * (0.7885 + JULIA_VARIATION * sin(t * 2.7));
    float cIm = cos(t) * (0.7885 + JULIA_VARIATION * cos(t * 3.1));
    int maxIter = int(FRACTAL_COMPLEXITY);
    for(int i=0; i<32; i++){
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
    float t = time * TIME_SCALE;

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
    vec2 leftDistortedUv = juliaFromPoint(uv, leftEyeCenter, t + 0.3);
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
    float distortionRadius = DISTORTION_RADIUS;
    float distortionFalloff = smoothstep(distortionRadius, distortionRadius * 0.3, eyesDistance);

    // Scale distortion strength based on proximity to eyes, fractal intensity, and PROBE_H
    float baseDistortionStrength = mix(0.0, 0.3, PROBE_H);
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
        originalTexture,
        mix(warpedInit, secondaryInit, fractalIntensity * 0.3),
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
            vec2 faceCenter = vec2(0.5, 0.5);
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

    // Get previous frame color with spin effect inside the glasses
    vec2 prevFrameUv = fragCoord / iResolution.xy;

    // Calculate eye circles for spin effect
    float leftEyeRadius = mix(0.3, 0.5, PROBE_E);
    float rightEyeRadius = leftEyeRadius;

    // Create circular masks for the eyes in screen space
    vec2 screenLeftEyeCenter = (leftEyeCenter * iResolution.y * zoom + iResolution.xy) * 0.5 / iResolution.xy;
    vec2 screenRightEyeCenter = (rightEyeCenter * iResolution.y * zoom + iResolution.xy) * 0.5 / iResolution.xy;

    // Normalized screen aspect ratio for proper circular regions
    float aspectRatio = iResolution.x / iResolution.y;
    vec2 adjustedLeftEyePos = vec2(screenLeftEyeCenter.x * aspectRatio, screenLeftEyeCenter.y);
    vec2 adjustedRightEyePos = vec2(screenRightEyeCenter.x * aspectRatio, screenRightEyeCenter.y);
    vec2 adjustedUv = vec2(prevFrameUv.x * aspectRatio, prevFrameUv.y);

    float adjustedLeftDist = length(adjustedUv - adjustedLeftEyePos) / aspectRatio;
    float adjustedRightDist = length(adjustedUv - adjustedRightEyePos) / aspectRatio;

    // Calculate eye radius in screen space
    float screenEyeRadius = leftEyeRadius * zoom / iResolution.y * iResolution.y * 0.5;

    // Apply spin effect based on distance to eye centers
    float leftEyeMaskForSpin = smoothstep(screenEyeRadius * 1.2, screenEyeRadius * 0.8, adjustedLeftDist);
    float rightEyeMaskForSpin = smoothstep(screenEyeRadius * 1.2, screenEyeRadius * 0.8, adjustedRightDist);

    // Combined mask for spin effect
    float spinMask = max(leftEyeMaskForSpin, rightEyeMaskForSpin);

    // Calculate spin angle based on time and proximity to eye center
    float spinSpeed = GLASSES_SPIN_SPEED;
    float leftSpinAngle = t * spinSpeed * leftEyeMaskForSpin;
    float rightSpinAngle = t * spinSpeed * rightEyeMaskForSpin;

    // Apply rotation based on which eye is closer
    vec2 rotatedPrevFrameUv;
    if (adjustedLeftDist < adjustedRightDist) {
        rotatedPrevFrameUv = rotatePoint(prevFrameUv, screenLeftEyeCenter, leftSpinAngle);
    } else {
        rotatedPrevFrameUv = rotatePoint(prevFrameUv, screenRightEyeCenter, rightSpinAngle);
    }

    // Blend between regular and rotated coordinates based on spin mask
    vec2 finalPrevFrameUv = mix(prevFrameUv, rotatedPrevFrameUv, spinMask);

    // Sample the previous frame with the spinning effect
    vec3 prevColor = getLastFrameColor(finalPrevFrameUv).rgb;

    // Create base fractal color with dark red/maroon theme
    vec3 darkRed = vec3(0.5, 0.0, 0.0);
    vec3 maroon = vec3(0.4, 0.0, 0.1);
    vec3 blackRed = vec3(0.2, 0.0, 0.0);

    // Position-based color variation with texture influence
    float posFactor = fract(length(distortedUv) * 1.5 + t * 0.5);
    vec3 baseColor = mix(blackRed, maroon, posFactor);
    baseColor = mix(baseColor, darkRed, sin(atan(distortedUv.y, distortedUv.x) * 3.0) * 0.5 + 0.5);

    // Blend fractal color with distorted texture
    baseColor = mix(baseColor, distortedTexture, knob_22 * 0.7);

    // Apply color intensity from PROBE_D
    float colorIntensity = mix(0.7, 1.2, PROBE_D);
    baseColor *= colorIntensity;

    // Mix with previous frame for temporal stability
    vec3 fractalColor = mix(prevColor, baseColor, 0.4);

    // Create two spirals for Rezz goggles with position controls
    vec2 leftEyeUv = uv + vec2(EYE_DISTANCE + LEFT_X_ADJUST, EYE_Y_OFFSET);
    float leftAngle = atan(leftEyeUv.y, leftEyeUv.x);
    float leftRadius = length(leftEyeUv);

    vec2 rightEyeUv = uv - vec2(EYE_DISTANCE - RIGHT_X_ADJUST, -EYE_Y_OFFSET);
    float rightAngle = atan(rightEyeUv.y, rightEyeUv.x);
    float rightRadius = length(rightEyeUv);

    // Calculate fractal influence on both spirals
    vec2 leftFractalUv = julia(leftEyeUv * (0.8 + PROBE_C * 0.4), t);
    vec2 rightFractalUv = julia(rightEyeUv * (0.8 + PROBE_C * 0.4), t);
    float leftFractalInfluence = length(leftFractalUv) * PROBE_C * 0.5;
    float rightFractalInfluence = length(rightFractalUv) * PROBE_C * 0.5;

    // Create spirals with parametric controls
    float spiralDensity = SPIRAL_DENSITY;
    float spiralSpeed = mix(0.5, 2.0, PROBE_B);
    float spiralThickness = mix(0.1, 0.3, PROBE_E);

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
        vec3(1.0, 0.0, 0.0),
        vec3(1.0, 0.2, 0.2),
        PROBE_D * 0.5
    );

    // Create circular masks for the eyes
    float leftEyeMask = smoothstep(leftEyeRadius, leftEyeRadius - 0.05, leftRadius);
    float rightEyeMask = smoothstep(rightEyeRadius, rightEyeRadius - 0.05, rightRadius);

    // Combined eye mask for enhanced distortion in spiral areas
    float combinedEyeMask = max(leftEyeMask, rightEyeMask);

    // Enhance distortion within spiral areas
    float insideSpiralDistortionBoost = SPIRAL_DISTORTION_BOOST;
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
        vec2 enhancedScaledUv = spiralWarpedSampleUv;
        float totalWeight = 1.0;
        float weight = 1.0;

        vec2 enhancedFractalDirection = normalize(distortedUv - closestEyeCenter) * 0.03;

        for (float i = 0.0; i < 4.0; i++) {
            if (i >= RECURSIVE_ITERATIONS) break;

            float enhancedScaleFactor = RECURSIVE_SCALE_FACTOR * 0.8 + fractalIntensity * 0.3;
            enhancedScaledUv += enhancedFractalDirection * (i + 1.0) * 1.5;
            enhancedScaledUv = closestEyeCenter + (enhancedScaledUv - closestEyeCenter) * enhancedScaleFactor;

            vec3 enhancedScaledTexture = getInitialFrameColor(enhancedScaledUv).rgb;

            weight *= 0.8;
            spiralRecursiveTexture += enhancedScaledTexture * weight;
            totalWeight += weight;
        }

        spiralRecursiveTexture /= totalWeight;

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

    // Final blend with the distorted texture - reduced blend in spiral areas to preserve spiral visual
    float textureBlend = knob_22 * (1.0 - combinedSpiralMask * 0.8);
    color = mix(color, distortedTexture, textureBlend);

    fragColor = vec4(color, 1.0);
}
