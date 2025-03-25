//http://visuals.beadfamous.com/edit?knob_32=-1.471&knob_32.min=-2&knob_32.max=7.6&knob_31=-1.929&knob_31.min=-2&knob_31.max=1&knob_30=0.008&knob_30.min=-2&knob_30.max=1&knob_34=3.244&knob_34.min=-2&knob_34.max=4&knob_35=-2&knob_35.min=-2&knob_35.max=1&knob_36=-1.079&knob_36.min=-2&knob_36.max=1&knob_37=0.976&knob_37.min=-2&knob_37.max=1&knob_33=6.22&knob_33.min=0&knob_33.max=10&knob_40=0.307&knob_40.min=0&knob_40.max=1&variety=0.3&variety.min=-3&variety.max=3&knob_47=0.567&knob_47.min=0&knob_47.max=1&knob_46=0.992&knob_46.min=0&knob_46.max=1&knob_45=0.339&knob_45.min=0&knob_45.max=1&knob_44=0.567&knob_44.min=0&knob_44.max=1&fullscreen=true&history_size=2000&history_size.min=-3&history_size.max=3
#define PI 3.14159265359
#define TAU (2.0*PI)

// Improved zoom parameters
#define ZOOM_SPEED 0.1
#define ZOOM_FACTOR pow(1.03, time * ZOOM_SPEED)
#define FRACTAL_CENTER vec2(-0.745, 0.186) // Classic Mandelbrot interesting area

// Spinning parameters
#define SPIN_SPEED 0.1
#define SPIN_ANGLE (time * SPIN_SPEED)
#define SPIN_RADIUS 0.1

// Audio-reactive parameters
#define DETAIL (5.0 + 15.0 * spectralRoughnessNormalized)
#define COLOR_SPEED (0.05 + 0.1 * midsNormalized)
#define WARP_AMOUNT (0.1 + 0.2 * spectralSpreadNormalized) // Reduced to prevent stretching
#define SWIRL_INTENSITY (0.2 + 0.3 * bassNormalized) // Reduced to prevent stretching
#define FRACTAL_BLEND (0.3 + 0.7 * trebleNormalized)

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

// Complex power
vec2 cpow(vec2 z, float n) {
    float r = length(z);
    if (r < 0.001) return vec2(0.0); // Prevent division by zero
    float a = atan(z.y, z.x);
    return pow(r, n) * vec2(cos(a*n), sin(a*n));
}

// Improved swirl distortion with balanced aspect correction
vec2 swirl(vec2 p, float strength) {
    float r = length(p);
    if (r < 0.001) return p; // Prevent division by zero

    // Limit strength based on radius to prevent extreme stretching
    float limitedStrength = strength * (1.0 - exp(-r * 3.0));

    // Apply balanced aspect correction to make shapes circular
    // Correct both x and y to maintain aspect ratio
    float aspectCorrection = 1.0 + 0.1 * sin(r * 5.0 + time * 0.2);
    p.x *= aspectCorrection;
    p.y /= aspectCorrection; // Balance the correction

    float a = atan(p.y, p.x) + limitedStrength * r;
    vec2 result = r * vec2(cos(a), sin(a));

    // Smooth transition to prevent seams
    return mix(p, result, smoothstep(0.0, 0.2, r));
}

// Improved tie-dye warping effect with balanced aspect correction
vec2 tieDyeWarp(vec2 p, float time) {
    // Scale down warp strength for distant points to prevent stretching
    float r = length(p);
    float scaledWarpStrength = WARP_AMOUNT * (1.0 - exp(-r * 2.0));

    // Create concentric ripples with frequency that decreases with distance
    float rippleFreq = 10.0 / (1.0 + r * 0.5);

    // Make ripples more circular by applying balanced aspect correction
    vec2 aspectCorrected = p;
    float angle = atan(p.y, p.x);
    float aspectFactor = 1.0 + 0.1 * sin(angle * 4.0 + time * 0.3);
    aspectCorrected.x *= aspectFactor;
    aspectCorrected.y /= aspectFactor; // Balance the correction

    float ripple = sin(length(aspectCorrected) * rippleFreq - time) * scaledWarpStrength;

    // Create spiral distortion with limited strength
    vec2 swirled = swirl(p, SWIRL_INTENSITY * 0.3);

    // Combine effects with smooth transition to prevent seams
    float blend = smoothstep(0.0, 1.0, min(1.0, r * 2.0));
    vec2 warped = mix(p + p * ripple * (1.0 - r * 0.2), swirled, blend * 0.4);

    // Ensure smooth transition at the edges
    return mix(p, warped, smoothstep(0.0, 0.2, 1.0 - r));
}

// Enhanced Mandelbrot with improved stability
float tieDyeFractal(vec2 c, float time) {
    vec2 z = vec2(0.0);
    float iter = 0.0;
    const float maxIter = 300.0;

    // Audio-reactive escape radius
    float escapeRadius = 4.0 + 2.0 * bassNormalized;

    // Store minimum distance to orbit for trap coloring
    float minDist = 1000.0;
    vec2 trap = vec2(sin(time * 0.1), cos(time * 0.1)) * 2.0;

    for (float i = 0.0; i < maxIter; i++) {
        // Standard mandelbrot iteration: z = z^2 + c
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;

        // Apply tie-dye warping with reduced effect for stability
        if (i > 10.0) { // Skip more iterations for stability
            // Scale down warping based on iteration to prevent stretching
            float warpScale = 0.03 * (1.0 - i/maxIter);
            z = mix(z, tieDyeWarp(z, time), warpScale);
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

    // Normalize and return
    return mix(iter / maxIter, orbitFactor, 0.3);
}

// Improved Julia set variation
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

    for (float i = 0.0; i < maxIter; i++) {
        // Apply tie-dye warping with reduced effect
        float warpScale = 0.02 * (1.0 - i/maxIter);
        z = mix(z, tieDyeWarp(z, time), warpScale);

        // Julia iteration with limited power to prevent stretching
        float power = 2.0 + spectralCentroidNormalized * 0.3;
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

    // Normalize and return
    return mix(iter / maxIter, orbitFactor, 0.3);
}

// Main image function
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
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

    // Apply zoom with proper centering
    uv = (uv - center) / ZOOM_FACTOR + center;

    // Apply tie-dye warping to coordinates with reduced effect and smooth transition
    vec2 warpedUV = tieDyeWarp(uv, time * 0.1);
    float warpBlend = 0.3 * (1.0 - exp(-length(uv) * 2.0)); // Fade out at edges
    uv = mix(uv, warpedUV, warpBlend);

    // Compute both fractals
    float m1 = tieDyeFractal(uv, time);
    float m2 = juliaFractal(uv, time);

    // Blend between fractals based on audio with smooth transition
    float blendFactor = FRACTAL_BLEND * (1.0 - 0.5 * exp(-length(uv - center) * 3.0));
    float m = mix(m1, m2, blendFactor);

    // Create base color with tie-dye palette
    float colorIndex = m * 3.0 + time * COLOR_SPEED;
    vec3 col = tieDyePalette(colorIndex);

    // Add swirling detail bands with smooth transition
    float bands = sin(m * 50.0 * DETAIL + time) * 0.5 + 0.5;
    float bandBlend = 0.5 * (1.0 - 0.3 * exp(-length(uv - center) * 2.0));
    col = mix(col, secondaryPalette(colorIndex + 0.33), bands * bandBlend);

    // Add tie-dye ripple effect with balanced aspect correction
    float rippleAngle = atan(uv.y - center.y, uv.x - center.x);
    float aspectCorrection = 1.0 + 0.1 * sin(rippleAngle * 6.0 + time * 0.2);
    vec2 correctedUV = uv - center;
    correctedUV.x *= aspectCorrection;
    correctedUV.y /= aspectCorrection; // Balance the correction

    float rippleDist = length(correctedUV);
    float ripples = 0.5 + 0.5 * sin(rippleDist * 15.0 - time);
    float rippleBlend = 0.2 * (1.0 - 0.3 * exp(-rippleDist * 2.0));
    col = mix(col, tieDyePalette(colorIndex + 0.67), ripples * rippleBlend);

    // Add spiral patterns with balanced aspect correction
    float spiralAngle = atan(uv.y - center.y, uv.x - center.x);
    float spiralDist = length(uv - center);
    float spiral = 0.5 + 0.5 * sin(spiralAngle * 8.0 + spiralDist * 15.0 - time);
    float spiralBlend = 0.2 * (1.0 - 0.3 * exp(-spiralDist * 2.0));
    col = mix(col, secondaryPalette(colorIndex + 0.5), spiral * spiralBlend);

    // Add beat response
    if (beat) {
        float beatIntensity = 0.2 * bassNormalized * (1.0 - 0.5 * exp(-length(uv - center) * 3.0));
        col = mix(col, vec3(1.0), beatIntensity);
    }

    // Add subtle vignette
    float vignette = 1.0 - dot(uv - center, uv - center) * 0.1;
    col *= vignette;

    // Boost color intensity based on audio
    col = pow(col, vec3(1.0 / (0.8 + energyNormalized * 0.4)));

    // Ensure colors are in valid range
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
