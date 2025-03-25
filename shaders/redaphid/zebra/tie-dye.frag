//http://localhost:6969/edit.html?knob_32=0.24&knob_32.min=0&knob_32.max=1&knob_31=0.76&knob_31.min=0&knob_31.max=1&knob_30=0.02&knob_30.min=0&knob_30.max=1&knob_34=0.71&knob_34.min=0&knob_34.max=1&knob_35=0.63&knob_35.min=0&knob_35.max=1&knob_36=0.7&knob_36.min=0&knob_36.max=1&knob_37=0.58&knob_37.min=0&knob_37.max=1&knob_33=0.75&knob_33.min=0&knob_33.max=1&knob_40=0.5&knob_40.min=0&knob_40.max=1&fullscreen=true
#define PI 3.14159265359
#define TAU (2.0*PI)

// Control knobs using implicit uniforms
#define KNOB_ZOOM_SPEED knob_30
#define KNOB_SPIN_SPEED knob_31
#define KNOB_SPIN_RADIUS knob_32
#define KNOB_WARP_AMOUNT knob_33
#define KNOB_SWIRL_INTENSITY knob_34
#define KNOB_FRAME_BLEND knob_35
#define KNOB_COLOR_SPEED knob_36
#define KNOB_BEAT_INTENSITY knob_37
#define KNOB_VIGNETTE_STRENGTH knob_40
#define KNOB_ENERGY_BOOST knob_44

// Improved zoom parameters
#define ZOOM_SPEED (KNOB_ZOOM_SPEED * (1.0 + 0.3 * bassNormalized))
#define ZOOM_FACTOR pow(1.02, time * ZOOM_SPEED) // Always zoom in
#define FRACTAL_CENTER vec2(-0.745, 0.186) // Classic Mandelbrot interesting area

// Spinning parameters
#define SPIN_SPEED (KNOB_SPIN_SPEED * (1.0 + 0.2 * midsNormalized))
#define SPIN_ANGLE (time * SPIN_SPEED)
#define SPIN_RADIUS (KNOB_SPIN_RADIUS * (1.0 + 0.1 * trebleNormalized))

// Audio-reactive parameters
#define DETAIL (5.0 + 10.0 * spectralRoughnessNormalized)
#define COLOR_SPEED (KNOB_COLOR_SPEED * (1.0 + 0.3 * midsNormalized))
#define WARP_AMOUNT (KNOB_WARP_AMOUNT * (1.0 + 0.3 * spectralSpreadNormalized))
#define SWIRL_INTENSITY (KNOB_SWIRL_INTENSITY * (1.0 + 0.3 * bassNormalized))
#define FRACTAL_BLEND (0.3 + 0.5 * trebleNormalized)

// Tie-dye color palette
vec3 tieDyePalette(float t) {
    // Rich, vibrant colors inspired by tie-dye
    vec3 a = vec3(0.6, 0.5, 0.5);
    vec3 b = vec3(0.6, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.5);
    vec3 d = vec3(0.00, 0.10, 0.20);

    // Shift colors based on audio
    d.x = 0.3 + bassNormalized * 0.4;
    d.y = 0.2 + midsNormalized * 0.4;
    d.z = 0.1 + trebleNormalized * 0.4;

    return a + b * cos(TAU * (c * t + d));
}

// Secondary palette for layering
vec3 secondaryPalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.30, 0.20, 0.20);

    return a + b * cos(TAU * (c * t + d));
}

// Rotation function
void rot(inout vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    p = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
}

// Complex power with safety checks
vec2 cpow(vec2 z, float n) {
    float r = length(z);
    if (r < 0.0001) return vec2(0.0); // Prevent division by zero
    float a = atan(z.y, z.x);
    return pow(r, n) * vec2(cos(a*n), sin(a*n));
}

// Improved swirl distortion with balanced aspect correction and safety checks
vec2 swirl(vec2 p, float strength) {
    float r = length(p);
    if (r < 0.0001) return p; // Prevent division by zero

    // Limit strength based on radius to prevent extreme stretching
    float limitedStrength = strength * (1.0 - exp(-r * 3.0));

    // Apply balanced aspect correction to make shapes circular
    float aspectCorrection = 1.0 + 0.05 * sin(r * 5.0 + time * 0.2);
    p.x *= aspectCorrection;
    p.y /= aspectCorrection;

    float a = atan(p.y, p.x) + limitedStrength * r;
    vec2 result = r * vec2(cos(a), sin(a));

    // Smooth transition to prevent seams
    return mix(p, result, smoothstep(0.0, 0.3, r));
}

// Improved tie-dye warping effect with safety checks
vec2 tieDyeWarp(vec2 p, float time) {
    float r = length(p);
    if (r < 0.0001) return p; // Prevent division by zero

    // Reduced warp strength and smoother falloff
    float scaledWarpStrength = WARP_AMOUNT * 0.5 * (1.0 - exp(-r * 1.5));
    float rippleFreq = 8.0 / (1.0 + r * 0.8);

    // Smoother aspect correction
    vec2 aspectCorrected = p;
    float angle = atan(p.y, p.x);
    float aspectFactor = 1.0 + 0.03 * sin(angle * 3.0 + time * 0.2);
    aspectCorrected.x *= aspectFactor;
    aspectCorrected.y /= aspectFactor;

    // Reduced ripple effect
    float ripple = sin(length(aspectCorrected) * rippleFreq - time) * scaledWarpStrength;
    vec2 swirled = swirl(p, SWIRL_INTENSITY * 0.2);

    // Smoother blending
    float blend = smoothstep(0.0, 1.0, min(1.0, r * 1.5));
    vec2 warped = mix(p + p * ripple * (1.0 - r * 0.3), swirled, blend * 0.3);

    // Improved seam prevention
    return mix(p, warped, smoothstep(0.0, 0.4, 1.0 - r));
}

// Enhanced Mandelbrot with improved stability and frame blending
float tieDyeFractal(vec2 c, float time) {
    vec2 z = vec2(0.0);
    float iter = 0.0;
    const float maxIter = 300.0;

    // Audio-reactive escape radius
    float escapeRadius = 4.0 + 2.0 * bassNormalized;

    // Store minimum distance to orbit for trap coloring
    float minDist = 1000.0;
    vec2 trap = vec2(sin(time * 0.1), cos(time * 0.1)) * 2.0;

    // Fix for the central seam - process coordinates differently for middle region
    float centralRegion = smoothstep(0.05, 0.2, abs(c.x)) * smoothstep(0.05, 0.2, abs(c.y));

    // Improved coordinate handling for frame blending - avoid using fract which can cause discontinuities
    vec2 prevUV = (c + vec2(1.0)) * 0.5;
    // Ensure UV is in range [0,1] without using fract (which causes seams)
    prevUV = clamp(prevUV, 0.0, 1.0);
    vec4 prevColor = getLastFrameColor(prevUV);

    // Radial falloff to eliminate seams - avoid sharp transitions in the center
    float dist = length(c);
    // Modified falloff that handles the center differently
    float edgeFalloff = smoothstep(0.0, 0.8, 1.0 - dist) * centralRegion;
    float prevFrameInfluence = 0.3 * edgeFalloff;

    for (float i = 0.0; i < maxIter; i++) {
        // Standard mandelbrot iteration: z = z^2 + c
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;

        // Apply tie-dye warping with reduced effect for stability
        if (i > 10.0) { // Skip more iterations for stability
            // Scale down warping based on iteration to prevent stretching
            float warpScale = 0.02 * (1.0 - i/maxIter);

            // Apply warping smoothly with radius-based falloff to prevent seams
            float warpFalloff = smoothstep(0.0, 0.5, 1.0 - length(z) / 10.0);

            // Additional check to avoid warping near the coordinate origin
            float centralWarpAvoidance = smoothstep(0.0, 0.2, length(z));

            z = mix(z, tieDyeWarp(z, time), warpScale * warpFalloff * centralWarpAvoidance);
        }

        // Track minimum distance to orbit trap
        minDist = min(minDist, length(z - trap));

        // Check for escape
        if (dot(z, z) > escapeRadius) {
            // Smooth iteration count for better coloring
            iter = i - log2(log2(dot(z, z))) + 4.0;
            break;
        }
    }

    // Combine iteration count with orbit trap
    float orbitFactor = 0.5 + 0.5 * sin(minDist * 5.0);

    // Normalize and blend with previous frame - reduce influence near center line
    float baseValue = mix(iter / maxIter, orbitFactor, 0.3);

    // Apply smooth transition across the x=0 line
    float seamFix = smoothstep(-0.1, 0.1, c.x);
    float seamBlend = mix(baseValue, prevColor.r, prevFrameInfluence * seamFix * (1.0 - seamFix) * 4.0);

    // Final result with temporal smoothing
    float result = mix(baseValue, seamBlend, centralRegion);

    // Smooth out sharp transitions
    result = mix(result, baseValue, 0.2 * abs(sin(time * 0.1)));

    return result;
}

// Improved Julia set variation with frame blending
float juliaFractal(vec2 z, float time) {
    // Julia set parameters that change with time and audio
    vec2 c = vec2(
        0.38 + 0.02 * sin(time * 0.1 + bassNormalized),
        0.28 + 0.02 * cos(time * 0.13 + trebleNormalized)
    );

    float iter = 0.0;
    const float maxIter = 200.0;

    // Store minimum distance to orbit for trap coloring
    float minDist = 1000.0;
    vec2 trap = vec2(sin(time * 0.2), cos(time * 0.17)) * 2.0;

    // Fix for the central seam - process coordinates differently for middle region
    float centralRegion = smoothstep(0.05, 0.2, abs(z.x)) * smoothstep(0.05, 0.2, abs(z.y));

    // Improved coordinate handling for frame blending - avoid using fract which can cause discontinuities
    vec2 prevUV = (z + vec2(1.0)) * 0.5;
    // Ensure UV is in range [0,1] without using fract (which causes seams)
    prevUV = clamp(prevUV, 0.0, 1.0);
    vec4 prevColor = getLastFrameColor(prevUV);

    // Radial falloff to eliminate seams - avoid sharp transitions in the center
    float dist = length(z);
    // Modified falloff that handles the center differently
    float edgeFalloff = smoothstep(0.0, 0.8, 1.0 - dist) * centralRegion;
    float prevFrameInfluence = 0.3 * edgeFalloff;

    for (float i = 0.0; i < maxIter; i++) {
        // Apply tie-dye warping with reduced effect
        float warpScale = 0.015 * (1.0 - i/maxIter);

        // Apply warping smoothly with radius-based falloff to prevent seams
        float warpFalloff = smoothstep(0.0, 0.5, 1.0 - length(z) / 8.0);

        // Additional check to avoid warping near the coordinate origin
        float centralWarpAvoidance = smoothstep(0.0, 0.2, length(z));

        z = mix(z, tieDyeWarp(z, time), warpScale * warpFalloff * centralWarpAvoidance);

        // Julia iteration with limited power to prevent stretching
        float power = 2.0 + spectralCentroidNormalized * 0.2; // Reduced audio influence
        z = cpow(z, power) + c;

        // Track minimum distance to orbit trap
        minDist = min(minDist, length(z - trap));

        // Check for escape
        if (dot(z, z) > 4.0) {
            // Smooth iteration count for better coloring
            iter = i - log2(log2(max(dot(z, z), 1.0))) + 4.0;
            break;
        }
    }

    // Combine iteration count with orbit trap
    float orbitFactor = 0.5 + 0.5 * sin(minDist * 5.0);

    // Normalize and blend with previous frame - reduce influence near center line
    float baseValue = mix(iter / maxIter, orbitFactor, 0.3);

    // Apply smooth transition across the x=0 line
    float seamFix = smoothstep(-0.1, 0.1, z.x);
    float seamBlend = mix(baseValue, prevColor.r, prevFrameInfluence * seamFix * (1.0 - seamFix) * 4.0);

    // Final result with temporal smoothing
    float result = mix(baseValue, seamBlend, centralRegion);

    // Smooth out sharp transitions
    result = mix(result, baseValue, 0.2 * abs(sin(time * 0.1)));

    return result;
}

// Function to check if pixel and surrounding area is too bright
float getBrightnessAmount(vec2 uv, vec2 pixelSize) {
    vec3 center = getLastFrameColor(uv).rgb;
    vec3 left = getLastFrameColor(uv - vec2(pixelSize.x, 0.0)).rgb;
    vec3 right = getLastFrameColor(uv + vec2(pixelSize.x, 0.0)).rgb;
    vec3 up = getLastFrameColor(uv + vec2(0.0, pixelSize.y)).rgb;
    vec3 down = getLastFrameColor(uv - vec2(0.0, pixelSize.y)).rgb;

    // Calculate average brightness for each pixel
    float centerBright = dot(center, vec3(1.0)) / 3.0;
    float leftBright = dot(left, vec3(1.0)) / 3.0;
    float rightBright = dot(right, vec3(1.0)) / 3.0;
    float upBright = dot(up, vec3(1.0)) / 3.0;
    float downBright = dot(down, vec3(1.0)) / 3.0;

    // Use smoothstep for gradual transition
    float threshold = 0.95;
    float smoothness = 0.1;

    float centerSmooth = smoothstep(threshold - smoothness, threshold, centerBright);
    float leftSmooth = smoothstep(threshold - smoothness, threshold, leftBright);
    float rightSmooth = smoothstep(threshold - smoothness, threshold, rightBright);
    float upSmooth = smoothstep(threshold - smoothness, threshold, upBright);
    float downSmooth = smoothstep(threshold - smoothness, threshold, downBright);

    return (centerSmooth + leftSmooth + rightSmooth + upSmooth + downSmooth) / 5.0;
}

// Main image function
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Calculate pixel size for sampling
    vec2 pixelSize = 1.0 / iResolution.xy;

    // Normalized pixel coordinates with proper aspect ratio
    vec2 uv = fragCoord/iResolution.xy;
    uv = uv * 2.0 - 1.0;

    // Apply aspect ratio correction
    float aspectRatio = iResolution.x/iResolution.y;
    uv.x *= aspectRatio;

    // Apply rotation based on audio (reduced to prevent stretching)
    float rotAngle = time * 0.02 + bassNormalized * 0.1;
    rot(uv, rotAngle);

    // Calculate zoom center with subtle movement
    vec2 center = FRACTAL_CENTER;
    center.x += sin(time * 0.05) * 0.005 * bassNormalized;
    center.y += cos(time * 0.07) * 0.005 * trebleNormalized;

    // Add spinning motion around the center
    vec2 spinOffset = vec2(
        cos(SPIN_ANGLE) * SPIN_RADIUS,
        sin(SPIN_ANGLE) * SPIN_RADIUS
    );
    center += spinOffset * (0.5 + 0.5 * sin(time * 0.2));

    // Apply zoom with proper centering and safety checks
    float zoomScale = ZOOM_FACTOR;
    // Prevent extreme zooming in
    zoomScale = min(zoomScale, 500.0);

    // Apply zoom with improved centering
    vec2 zoomedUV = (uv - center) / zoomScale + center;

    // Get edge distance for anti-seam measures
    float edgeDist = length(zoomedUV) / length(vec2(aspectRatio, 1.0));
    float edgeFactor = smoothstep(0.8, 1.0, 1.0 - edgeDist);

    // Add special handling for the central seam
    float centralSeamFix = smoothstep(-0.1, 0.1, zoomedUV.x) * (1.0 - smoothstep(-0.1, 0.1, zoomedUV.x));
    centralSeamFix = 1.0 - centralSeamFix * 0.5; // Reduce effects near the center line

    // Reduced warping effect with improved seam handling
    vec2 warpedUV = tieDyeWarp(zoomedUV, time * 0.05);

    // Apply non-linear warping to avoid grid-like seams
    float warpBlend = 0.15 * (1.0 - exp(-length(zoomedUV) * 1.5));
    // Reduce warping near edges and center
    warpBlend *= (1.0 - 0.5 * edgeFactor) * centralSeamFix;

    // Use smoothstep for smoother blend transitions
    uv = mix(zoomedUV, warpedUV, smoothstep(0.0, 1.0, warpBlend));

    // Compute both fractals
    float m1 = tieDyeFractal(uv, time);
    float m2 = juliaFractal(uv, time);

    // Blend between fractals based on audio with smooth transition
    float blendFactor = FRACTAL_BLEND * (1.0 - 0.5 * exp(-length(uv - center) * 3.0));

    // Use sin function for continuous smooth oscillation between fractals
    blendFactor *= 0.5 + 0.5 * sin(time * 0.1);

    // Reduce fractal blending near the central seam
    blendFactor *= centralSeamFix;

    float m = mix(m1, m2, blendFactor);

    // Create base color with tie-dye palette
    float colorIndex = fract(m * 3.0 + time * COLOR_SPEED);
    vec3 col = tieDyePalette(colorIndex);

    // Add swirling detail bands with smooth transition
    float bands = sin(m * 50.0 * DETAIL + time) * 0.5 + 0.5;
    float bandBlend = 0.5 * (1.0 - 0.3 * exp(-length(uv - center) * 2.0));
    // Reduce band intensity near edges to avoid seams
    bandBlend *= (1.0 - 0.7 * edgeFactor);
    col = mix(col, secondaryPalette(fract(colorIndex + 0.33)), bands * bandBlend);

    // Add tie-dye ripple effect with balanced aspect correction
    float rippleAngle = atan(uv.y - center.y, uv.x - center.x);
    float aspectCorrection = 1.0 + 0.03 * sin(rippleAngle * 6.0 + time * 0.2);
    vec2 correctedUV = uv - center;
    correctedUV.x *= aspectCorrection;
    correctedUV.y /= aspectCorrection;

    float rippleDist = length(correctedUV);
    float ripples = 0.5 + 0.5 * sin(rippleDist * 15.0 - time);
    float rippleBlend = 0.15 * (1.0 - 0.3 * exp(-rippleDist * 2.0));
    // Reduce ripple intensity near edges
    rippleBlend *= (1.0 - 0.6 * edgeFactor);
    col = mix(col, tieDyePalette(fract(colorIndex + 0.67)), ripples * rippleBlend);

    // Add spiral patterns with balanced aspect correction
    float spiralAngle = atan(uv.y - center.y, uv.x - center.x);
    float spiralDist = length(uv - center);
    float spiral = 0.5 + 0.5 * sin(spiralAngle * 8.0 + spiralDist * 15.0 - time);
    float spiralBlend = 0.15 * (1.0 - 0.3 * exp(-spiralDist * 2.0));
    // Reduce spiral intensity near edges
    spiralBlend *= (1.0 - 0.6 * edgeFactor);
    col = mix(col, secondaryPalette(fract(colorIndex + 0.5)), spiral * spiralBlend);

    // Add beat response with reduced intensity
    if (beat) {
        float beatIntensity = KNOB_BEAT_INTENSITY * bassNormalized * (1.0 - 0.5 * exp(-length(uv - center) * 3.0));
        beatIntensity *= (1.0 - 0.7 * edgeFactor); // Reduce beat effect near edges
        col = mix(col, vec3(1.0), beatIntensity);
    }

    // Add subtle vignette
    float vignette = 1.0 - dot(uv - center, uv - center) * KNOB_VIGNETTE_STRENGTH;
    col *= vignette;

    // Boost color intensity based on audio with reduced effect
    col = pow(col, vec3(1.0 / (0.8 + energyNormalized * KNOB_ENERGY_BOOST)));

    // Get previous frame color for blending
    vec3 prevColor = getLastFrameColor(fragCoord.xy / iResolution.xy).rgb;

    // Get brightness amount for smooth transitions
    float brightnessAmount = getBrightnessAmount(fragCoord.xy / iResolution.xy, pixelSize);

    // Enhanced frame blending - increase blend factor
    col = mix(col, prevColor, 0.75);

    // Mix with previous frame if too bright
    col = mix(col, prevColor, brightnessAmount);

    // Ensure colors are in valid range and prevent artifacts
    col = fract(col);
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
