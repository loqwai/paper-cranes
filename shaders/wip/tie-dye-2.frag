// @fullscreen: true
//http://localhost:6969/edit.html?knob_32=0.24&knob_32.min=0&knob_32.max=1&knob_31=0.76&knob_31.min=0&knob_31.max=1&knob_30=0.02&knob_30.min=0&knob_30.max=1&knob_34=0.71&knob_34.min=0&knob_34.max=1&knob_35=0.63&knob_35.min=0&knob_35.max=1&knob_36=0.7&knob_36.min=0&knob_36.max=1&knob_37=0.58&knob_37.min=0&knob_37.max=1&knob_33=0.75&knob_33.min=0&knob_33.max=1&knob_40=0.5&knob_40.min=0&knob_40.max=1&fullscreen=true
#define PI 3.14159265359
#define TAU (2.0*PI)

// Core control knobs
#define KNOB_ZOOM_SPEED knob_30       // Controls zoom speed
#define KNOB_SPIN_SPEED knob_31       // Controls rotation speed
#define KNOB_SPIN_RADIUS knob_32      // Controls offset from center
#define KNOB_WARP_AMOUNT knob_33      // Controls distortion amount
#define KNOB_SWIRL_INTENSITY knob_34  // Controls swirl effect strength
#define KNOB_FRAME_BLEND knob_35      // Controls motion trail amount
#define KNOB_COLOR_SPEED knob_36      // Controls color cycling speed
#define KNOB_COLOR_INTENSITY knob_37  // Controls color vibrancy
#define KNOB_VIGNETTE_STRENGTH knob_40 // Controls edge darkening

// Fractal arm controls
#define KNOB_FRACTAL_X knob_41        // Controls fractal center X position (-1 to 1)
#define KNOB_FRACTAL_Y knob_42        // Controls fractal center Y position (-1 to 1)
#define KNOB_ARM_DETAIL knob_43       // Controls detail in fractal arms
#define KNOB_ARM_FILAMENT knob_44     // Controls filament strength in arms
#define KNOB_ARM_WIDTH knob_45        // Controls width of fractal arms
#define KNOB_BULB_BRIGHTNESS knob_46  // Controls brightness of mini bulbs
#define KNOB_ENGINE_CORE knob_47      // Controls center energy core brightness
#define KNOB_FRACTAL_BLEND knob_48    // Controls blend between Mandelbrot and Julia

// Detail control knobs
#define KNOB_DETAIL_BANDS knob_50     // Controls swirling detail bands
#define KNOB_RIPPLE_STRENGTH knob_51  // Controls ripple effect intensity
#define KNOB_SPIRAL_STRENGTH knob_52  // Controls spiral pattern strength
#define KNOB_ORBIT_TRAP knob_53       // Controls orbit trap influence
#define KNOB_MINI_MANDEL knob_54      // Controls number of mini mandelbrots
#define KNOB_MINI_SIZE knob_55        // Controls size of mini mandelbrots
#define KNOB_MINI_DETAIL knob_56      // Controls detail of mini mandelbrots

// Add more detailed center control
#define KNOB_CENTER_DETAIL knob_57       // Controls detail level in center of fractals

// Parameter calculations
#define ZOOM_SPEED (KNOB_ZOOM_SPEED * 0.15)  // Moderate zoom speed
#define FRACTAL_CENTER vec2(KNOB_FRACTAL_X * 2.0 - 1.0, KNOB_FRACTAL_Y - 0.5) // Convert from knob to useful range

// Define a classic fractal location known for beautiful arms
#define TARGET_FRACTAL_CENTER vec2(-0.743643887037158704752191506114774, 0.131825904205311970493132056385139)

// Tie-dye color palette
vec3 tieDyePalette(float t) {
    // Rich, vibrant colors inspired by tie-dye
    vec3 a = vec3(0.6, 0.5, 0.5);
    vec3 b = vec3(0.6, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.5);
    vec3 d = vec3(0.3, 0.2, 0.1); // Base color shift values

    // Apply color intensity control
    b *= 0.8 + KNOB_COLOR_INTENSITY * 0.5;

    return a + b * cos(TAU * (c * t + d));
}

// Secondary palette for layering
vec3 secondaryPalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.3, 0.2, 0.2);

    // Apply color intensity control
    b *= 0.8 + KNOB_COLOR_INTENSITY * 0.5;

    return a + b * cos(TAU * (c * t + d));
}

// Rotation function
vec2 rotatePoint(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
}

// Complex power with safety checks
vec2 cpow(vec2 z, float n) {
    float r = length(z);
    if (r < 0.0001) return vec2(0.0); // Prevent division by zero
    float a = atan(z.y, z.x);
    return pow(r, n) * vec2(cos(a*n), sin(a*n));
}

// Simple swirl distortion
vec2 swirl(vec2 p, float strength) {
    float r = length(p);
    if (r < 0.0001) return p; // Prevent division by zero

    // Limit strength based on radius
    float limitedStrength = strength * (1.0 - exp(-r * 3.0));

    float a = atan(p.y, p.x) + limitedStrength * r;
    return r * vec2(cos(a), sin(a));
}

// Simplified tie-dye warping effect
vec2 tieDyeWarp(vec2 p, float time) {
    float r = length(p);
    if (r < 0.0001) return p; // Prevent division by zero

    // Very gentle ripple effect
    float ripple = sin(r * 5.0 - time) * 0.05 * KNOB_WARP_AMOUNT;

    // Basic swirl with reduced intensity
    float swirlAmount = KNOB_SWIRL_INTENSITY * 0.1;
    vec2 swirled = swirl(p, swirlAmount);

    // Blend based on distance from center
    float blend = smoothstep(0.0, 0.8, r);
    return mix(p + p * ripple * (1.0 - r * 0.3), swirled, blend * 0.1);
}

// Add orbit trap function
float orbitTrap(vec2 z, vec2 trap) {
    return length(z - trap);
}

// Main image function - organic octopus-like Mandelbrot pattern with dramatic curling
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Basic setup with proper aspect ratio handling
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
    float aspectRatio = iResolution.x / iResolution.y;

    // Apply aspect ratio correction to maintain circular shape
    if (aspectRatio > 1.0) {
        uv.x /= aspectRatio;
    } else {
        uv.y *= aspectRatio;
    }

    // Target a classic interesting point on the Mandelbrot set
    vec2 target = vec2(-0.743643887037, 0.131825904205);

    // Create scale effect using sine wave
    float baseZoomSpeed = 1.0 + KNOB_ZOOM_SPEED * 2.0;
    float zoomPulse = sin(time * 0.2) * 0.5 + 0.5;
    float zoomPhase = sin(time * 0.1);
    float zoomDepth = time * baseZoomSpeed;

    // Calculate scale that grows and shrinks from center
    float scale = 1.0 + sin(zoomDepth * 0.2) * 0.5; // Scale between 0.5 and 1.5
    vec2 cameraOffset = vec2(
        sin(zoomPhase) * 0.1,
        cos(zoomPhase) * 0.1
    );

    // Calculate zoom depth for detail enhancement
    float detailEnhancement = smoothstep(10.0, 20.0, zoomDepth);
    float deepZoom = smoothstep(20.0, 30.0, zoomDepth);

    // Get previous frame color for detail preservation
    vec2 prevUV = fragCoord.xy / iResolution.xy;
    vec4 prevColor = getLastFrameColor(prevUV);

    // Calculate movement speed that slows down with zoom
    float movementScale = time * 0.1 * (1.0 - deepZoom * 0.8);
    float easeOutFactor = 1.0 - smoothstep(0.0, 0.5, deepZoom);

    // Add very subtle movement to prevent static patterns
    vec2 detailOffset = vec2(
        sin(movementScale) * 0.00005,
        cos(movementScale) * 0.00005
    ) * detailEnhancement * easeOutFactor;

    // Initialize final color
    vec3 finalColor = vec3(0.0);

    // Create a single Mandelbrot set with minimal movement
    vec2 baseUV = uv;

    // Add very subtle curling motion that eases out with zoom
    float curlAmount = sin(movementScale * 0.1) * 0.2 * easeOutFactor;
    float curlFrequency = 2.0 + sin(movementScale * 0.2) * 1.0;

    // Calculate distance from center for curling
    float distFromCenter = length(baseUV);

    // Add minimal curling motion with safe division
    float curlOffset = sin(distFromCenter * curlFrequency + curlAmount) * 0.05 * easeOutFactor;
    vec2 curlDir = vec2(-baseUV.y, baseUV.x) / max(distFromCenter, 0.0001);
    vec2 curlMotion = curlDir * curlOffset;

    // Add very subtle wave motion that eases out with zoom
    float waveOffset = sin(distFromCenter * 4.0 + movementScale * 0.2) * 0.02 * easeOutFactor;
    vec2 waveMotion = curlDir * waveOffset;

    // Combine all movements
    vec2 offset = curlMotion + waveMotion;

    // Scale UV coordinates to create growth effect
    vec2 scaledUV = (baseUV - offset) * scale;
    vec2 mandelUV = scaledUV + target + cameraOffset + detailOffset;

    // Calculate recursive detail layers
    vec3 recursiveColor = vec3(0.0);
    float recursiveWeight = 0.0;
    const int RECURSIVE_LAYERS = 3;

    for (int i = 0; i < RECURSIVE_LAYERS; i++) {
        // Calculate scale for this layer
        float layerScale = scale * pow(2.0, float(i));

        // Calculate position for this layer
        vec2 layerUV = (baseUV - offset) * layerScale;
        layerUV = fract(layerUV) - 0.5;
        layerUV = layerUV / layerScale;

        // Add subtle movement to each layer
        float layerTime = movementScale + float(i) * 0.2;
        vec2 layerOffset = vec2(
            sin(layerTime) * 0.00005,
            cos(layerTime) * 0.00005
        );

        // Calculate Mandelbrot for this layer
        vec2 layerMandelUV = layerUV + target + cameraOffset + layerOffset;
        vec2 c = layerMandelUV;
        vec2 z = vec2(0.0);
        float iter = 0.0;
        float maxIter = 300.0 + detailEnhancement * 200.0;

        // Execute the Mandelbrot iteration
        for (float j = 0.0; j < maxIter; j++) {
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            if (dot(z, z) > 4.0) {
                iter = j + 1.0 - log(log(dot(z, z))) / log(2.0);
                break;
            }
        }

        // Color this layer
        vec3 layerColor;
        if (iter >= maxIter) {
            layerColor = vec3(0.0);
        } else {
            float normalizedIter = sqrt(iter / maxIter);
            float colorCycle = time * KNOB_COLOR_SPEED * 0.2 + float(i) * 0.2;
            float colorIndex = fract(normalizedIter * 3.0 + colorCycle);
            layerColor = tieDyePalette(colorIndex);

            // Reduced detail bands effect
            float bands = sin(normalizedIter * 15.0) * 0.5 + 0.5;
            layerColor = mix(layerColor, layerColor * 1.1, bands * 0.2);
            layerColor *= 0.8 + KNOB_COLOR_INTENSITY * 0.4;

            float spiralAngle = atan(z.y, z.x);
            float spiral = sin(spiralAngle * 15.0 + length(z) * 30.0) * 0.5 + 0.5;
            layerColor *= 1.0 + spiral * 0.3;
        }

        // Calculate weight for this layer
        float layerWeight = animateEaseInOutSine(1.0 - float(i) / float(RECURSIVE_LAYERS));
        layerWeight *= smoothstep(0.0, 0.5, distFromCenter);

        // Add this layer to the recursive color
        recursiveColor += layerColor * layerWeight;
        recursiveWeight += layerWeight;
    }

    // Normalize recursive color
    if (recursiveWeight > 0.0) {
        recursiveColor /= recursiveWeight;
    }

    // Calculate main Mandelbrot color
    vec2 c = mandelUV;
    vec2 z = vec2(0.0);
    float iter = 0.0;
    float maxIter = 300.0 + detailEnhancement * 200.0;

    // Execute the Mandelbrot iteration
    for (float j = 0.0; j < maxIter; j++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) {
            iter = j + 1.0 - log(log(dot(z, z))) / log(2.0);
            break;
        }
    }

    // Color the main Mandelbrot with enhanced detail
    vec3 mainColor;
    if (iter >= maxIter) {
        mainColor = vec3(0.0);
    } else {
        float normalizedIter = sqrt(iter / maxIter);
        float colorCycle = time * KNOB_COLOR_SPEED * 0.2;
        float colorIndex = fract(normalizedIter * 3.0 + colorCycle);
        mainColor = tieDyePalette(colorIndex);

        // Reduced detail bands effect
        float bands = sin(normalizedIter * 15.0) * 0.5 + 0.5;
        mainColor = mix(mainColor, mainColor * 1.1, bands * 0.2);
        mainColor *= 0.8 + KNOB_COLOR_INTENSITY * 0.4;

        float spiralAngle = atan(z.y, z.x);
        float spiral = sin(spiralAngle * 15.0 + length(z) * 30.0) * 0.5 + 0.5;
        mainColor *= 1.0 + spiral * 0.3;
    }

    // Blend main and recursive colors
    float blendFactor = animateEaseInOutSine(deepZoom);
    finalColor = mix(mainColor, recursiveColor, blendFactor);

    // Create detail preservation effect from previous frame
    vec3 prevDetail = prevColor.rgb;
    float detailStrength = animateEaseInOutSine(deepZoom);

    // Calculate detail level for emerging fragments
    float detailLevel = 1.0 - smoothstep(0.0, 0.5, distFromCenter);
    detailLevel *= animateEaseInOutSine(1.0 - deepZoom);

    // Create emerging fragments with enhanced detail
    vec3 fragmentColor = finalColor;
    float fragmentStrength = detailLevel * (1.0 - detailStrength);

    // Blend previous detail with new fragments
    finalColor = mix(prevDetail, fragmentColor, fragmentStrength);

    // Add subtle color variation based on previous frame
    float prevHue = atan(prevDetail.y, prevDetail.x) / TAU;
    float currentHue = atan(fragmentColor.y, fragmentColor.x) / TAU;
    float hueDiff = abs(prevHue - currentHue);
    finalColor *= 1.0 + hueDiff * detailEnhancement * 0.2;

    // Enhanced frame blending for smooth transitions
    float blendAmount = KNOB_FRAME_BLEND * (0.2 + detailEnhancement * 0.1);
    finalColor = mix(finalColor, prevColor.rgb, blendAmount);

    // Output final color
    fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
