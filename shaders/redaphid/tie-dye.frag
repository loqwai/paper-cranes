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

    // Much faster zoom with time
    float zoomSpeed = 1.0 + KNOB_ZOOM_SPEED * 0.5;
    float zoomFactor = pow(1.1, time * zoomSpeed);
    zoomFactor = max(zoomFactor, 1.0);

    // Calculate zoom depth for detail enhancement
    float zoomDepth = log(zoomFactor) / log(1.1);
    float detailEnhancement = smoothstep(10.0, 20.0, zoomDepth);
    float deepZoom = smoothstep(20.0, 30.0, zoomDepth);

    // Get previous frame color for detail enhancement
    vec2 prevUV = fragCoord.xy / iResolution.xy;
    vec4 prevColor = getLastFrameColor(prevUV);

    // Add subtle movement to prevent static patterns
    float timeScale = time * 0.3;
    vec2 detailOffset = vec2(
        sin(timeScale) * 0.0001,
        cos(timeScale) * 0.0001
    ) * detailEnhancement;

    // Initialize final color
    vec3 finalColor = vec3(0.0);

    // Create a single Mandelbrot set with curling arms
    vec2 baseUV = uv;

    // Add curling motion to the entire set
    float curlAmount = sin(timeScale * 0.3) * 0.8;
    float curlFrequency = 3.0 + sin(timeScale * 0.5) * 2.0;

    // Calculate distance from center for curling
    float distFromCenter = length(baseUV);

    // Add dramatic curling motion
    float curlOffset = sin(distFromCenter * curlFrequency + curlAmount) * 0.2;
    vec2 curlDir = vec2(-baseUV.y, baseUV.x) / max(distFromCenter, 0.001);
    vec2 curlMotion = curlDir * curlOffset;

    // Add secondary wave motion
    float waveOffset = sin(distFromCenter * 8.0 + timeScale * 0.4) * 0.1;
    vec2 waveMotion = curlDir * waveOffset;

    // Combine all movements
    vec2 offset = curlMotion + waveMotion;

    // Rotate and scale UV coordinates
    vec2 rotatedUV = baseUV - offset;
    vec2 scaledUV = rotatedUV / zoomFactor; // Removed the *2.0 multiplier
    vec2 mandelUV = scaledUV + target + detailOffset;

    // Mandelbrot calculation with increased detail
    vec2 c = mandelUV;
    vec2 z = vec2(0.0);
    float iter = 0.0;
    float maxIter = 200.0 + detailEnhancement * 100.0;

    // Execute the Mandelbrot iteration
    for (float j = 0.0; j < maxIter; j++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) {
            iter = j + 1.0 - log(log(dot(z, z))) / log(2.0);
            break;
        }
    }

    // Check if we're inside the set
    bool inSet = (iter >= maxIter);

    // Coloring for the Mandelbrot
    vec3 col;
    if (inSet) {
        col = vec3(0.0, 0.0, 0.0);
    } else {
        // Color the details of the arms
        float normalizedIter = sqrt(iter / maxIter);

        // Use time to slowly cycle colors
        float colorCycle = time * KNOB_COLOR_SPEED * 0.3;
        float colorIndex = fract(normalizedIter * 3.0 + colorCycle);

        // Get base color from palette
        col = tieDyePalette(colorIndex);

        // Add subtle banding to highlight arm structures
        float bands = sin(normalizedIter * 20.0) * 0.5 + 0.5;
        col = mix(col, col * 1.2, bands * 0.3);

        // Apply color intensity
        col *= 0.8 + KNOB_COLOR_INTENSITY * 0.4;

        // Add spiral detail
        float spiralAngle = atan(z.y, z.x);
        float spiral = sin(spiralAngle * 10.0 + length(z) * 20.0) * 0.5 + 0.5;
        col *= 1.0 + spiral * 0.3;
    }

    // Apply color directly without weight
    finalColor = col;

    // Enhance detail using previous frame
    if (detailEnhancement > 0.0) {
        vec3 prevDetail = prevColor.rgb;
        float detailMix = detailEnhancement * 0.3;
        finalColor = mix(finalColor, prevDetail, detailMix);

        // Add subtle color variation based on previous frame
        float prevHue = atan(prevDetail.y, prevDetail.x) / TAU;
        float currentHue = atan(finalColor.y, finalColor.x) / TAU;
        float hueDiff = abs(prevHue - currentHue);
        finalColor *= 1.0 + hueDiff * detailEnhancement * 0.2;
    }

    // Add vignette for better focus
    float vignette = 1.0 - length(fragCoord.xy / iResolution.xy - 0.5) * KNOB_VIGNETTE_STRENGTH;
    finalColor *= vignette;

    // Frame blending with detail preservation
    float blendAmount = KNOB_FRAME_BLEND * (0.2 + detailEnhancement * 0.1);
    finalColor = mix(finalColor, prevColor.rgb, blendAmount);

    // Output final color
    fragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
