// High-performance Julia set shader with double-float emulation
// http://localhost:6969/edit.html?controller=mandelbrot&knob_50=0.22&knob_50.min=-3&knob_50.max=3
uniform float cameraScreenOriginX;
uniform float cameraScreenOriginXLow;
uniform float cameraScreenOriginY;
uniform float cameraScreenOriginYLow;
uniform float cameraPixelSpanHigh;
uniform float cameraPixelSpanLow;
uniform float centerIterNorm;
uniform float cameraPixelSpan;
uniform float currentZoomLevel;
uniform float highPrecision;
uniform float zoomExponent;
uniform float extremeZoom;
uniform float performanceLevel; // 2.0=high, 1.0=medium, 0.0=low

#define PI 3.14159265359
#define TAU (2.0 * PI)

// Julia set parameters for more interesting structures
#define JULIA_REAL -0.8
#define JULIA_IMAG 0.156
#define COLOR_INTENSITY (0.63 + 0.2 * energyNormalized)
#define ARM_FLEXIBILITY 0.0

// Performance settings that adapt to the device
#define IS_HIGH_PERFORMANCE (performanceLevel > 1.5)
#define IS_LOW_PERFORMANCE (performanceLevel < 0.5)
#define BASE_MAX_ITERATIONS (IS_HIGH_PERFORMANCE ? 800.0 : (IS_LOW_PERFORMANCE ? 300.0 : 500.0))
#define DETAIL_MULTIPLIER (IS_HIGH_PERFORMANCE ? 30.0 : (IS_LOW_PERFORMANCE ? 10.0 : 20.0))
#define MAX_TOTAL_ITERATIONS (IS_HIGH_PERFORMANCE ? 2000.0 : (IS_LOW_PERFORMANCE ? 600.0 : 1000.0))
#define DETAIL_BOOST (min(DETAIL_MULTIPLIER * zoomExponent, MAX_TOTAL_ITERATIONS - BASE_MAX_ITERATIONS))
#define COLOR_COMPLEXITY (IS_HIGH_PERFORMANCE ? 1.0 : (IS_LOW_PERFORMANCE ? 0.5 : 0.8))

// Add two double-float numbers with full precision - only used for high-performance mode
vec2 df_add(vec2 a, vec2 b) {
    // Skip complex calculation on low-performance devices
    if (IS_LOW_PERFORMANCE) {
        return vec2(a.x + b.x, a.y + b.y);
    }

    float t1 = a.x + b.x;
    float e = t1 - a.x;
    float t2 = ((b.x - e) + (a.x - (t1 - e))) + a.y + b.y;
    return vec2(t1, t2);
}

// Multiply a double-float by a regular float - simplified for low-performance devices
vec2 df_mul(vec2 a, float b) {
    // Skip complex calculation on low-performance devices
    if (IS_LOW_PERFORMANCE) {
        return vec2(a.x * b, a.y * b);
    }

    float t1 = a.x * b;
    float e = t1 - a.x * b;
    float t2 = ((a.x * b - t1) + e) + a.y * b;
    return vec2(t1, t2);
}

// Subtract two double-float numbers - simplified for low-performance devices
vec2 df_sub(vec2 a, vec2 b) {
    // Skip complex calculation on low-performance devices
    if (IS_LOW_PERFORMANCE) {
        return vec2(a.x - b.x, a.y - b.y);
    }

    float t1 = a.x - b.x;
    float e = t1 - a.x;
    float t2 = (((-b.x) - e) + (a.x - (t1 - e))) + a.y - b.y;
    return vec2(t1, t2);
}

// Extract double-float value as a single high-precision float
float df_extract(vec2 df) {
    return df.x + df.y;
}

// Optimized palette function with configurable complexity
vec3 juliaColorPalette(float t) {
    // More vibrant colors
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);

    // Simple palette for low performance
    if (IS_LOW_PERFORMANCE) {
        vec3 c = vec3(0.8, 0.5, 0.2);
        vec3 d = vec3(0.1, 0.3, 0.7);
        b *= 0.8 + COLOR_INTENSITY * 0.3;
        return a + b * cos(TAU * (c * t + d));
    }

    // Complex palette for high performance
    vec3 c = vec3(0.9, 0.7, 0.3);
    vec3 d = vec3(0.2, 0.4, 0.6);

    // Add some extra complexity for high-performance devices
    if (IS_HIGH_PERFORMANCE) {
        c = mix(c, vec3(0.85, 0.65, 0.35), 0.5 * sin(iTime * 0.1) + 0.5);
        d = mix(d, vec3(0.15, 0.35, 0.65), 0.5 * cos(iTime * 0.07) + 0.5);
    }

    b *= 0.8 + COLOR_INTENSITY * 0.5;
    return a + b * cos(TAU * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 centeredFrag = fragCoord - iResolution.xy * 0.5;
    vec2 c;

    // Calculate coordinates using appropriate precision
    if (highPrecision > 0.5) {
        // High precision path using double-float arithmetic
        vec2 screenOriginX_df = vec2(cameraScreenOriginX, cameraScreenOriginXLow);
        vec2 screenOriginY_df = vec2(cameraScreenOriginY, cameraScreenOriginYLow);
        vec2 pixelSpan_df = vec2(cameraPixelSpan, cameraPixelSpanLow);

        // Calculate high-precision coordinates
        vec2 fragX_df = df_mul(pixelSpan_df, centeredFrag.x);
        vec2 fragY_df = df_mul(pixelSpan_df, centeredFrag.y);

        vec2 cx_df = df_add(screenOriginX_df, fragX_df);
        vec2 cy_df = df_add(screenOriginY_df, fragY_df);

        // Extract for standard calculations
        c = vec2(df_extract(cx_df), df_extract(cy_df));
    } else {
        // Standard precision for better performance
        c = vec2(cameraScreenOriginX, cameraScreenOriginY) + centeredFrag * cameraPixelSpan;
    }

    // Julia set calculation
    vec2 juliaC = vec2(JULIA_REAL, JULIA_IMAG);
    vec2 z = c;
    float iter = 0.0;

    // Adapt iterations based on zoom level and performance
    float maxIter = BASE_MAX_ITERATIONS;
    if (zoomExponent > 0.0) {
        maxIter = min(BASE_MAX_ITERATIONS + DETAIL_BOOST, MAX_TOTAL_ITERATIONS);
    }

    // Escape calculation
    for (float j = 0.0; j < MAX_TOTAL_ITERATIONS; j++) {
        if (j >= maxIter) break;

        // Standard Julia iteration - optimized
        float zxSq = z.x * z.x;
        float zySq = z.y * z.y;

        z = vec2(zxSq - zySq, 2.0 * z.x * z.y) + juliaC;

        // Early escape check
        float magSq = dot(z, z);
        if (magSq > 4.0) {
            iter = j + 1.0 - log(log(magSq)) / log(2.0); // Smooth iteration count
            break;
        }
    }

    // Color calculation based on iteration count and performance level
    vec3 col;

    if (iter >= maxIter) {
        // Interior coloring - simpler for performance
        float pattern = sin(iTime * 0.2) * 0.5 + 0.5;
        col = juliaColorPalette(pattern) * 0.2;
    } else {
        // Exterior coloring with audio reactivity - adjusted for performance
        float normalizedIter = sqrt(iter / maxIter);

        // Music-reactive coloring - complexity based on performance
        float colorSpeed = 0.07 + 0.05 * spectralFluxNormalized * COLOR_COMPLEXITY;
        float colorCycle = iTime * colorSpeed + bassNormalized * COLOR_COMPLEXITY;
        float colorIndex = fract(normalizedIter * 3.0 + colorCycle);

        col = juliaColorPalette(colorIndex);

        // Skip expensive effects on low-performance devices
        if (!IS_LOW_PERFORMANCE) {
            // Add bands with music reactivity
            float bandIntensity = 0.2 + 0.2 * trebleNormalized * COLOR_COMPLEXITY;
            float bands = sin(normalizedIter * 20.0) * 0.5 + 0.5;
            col = mix(col, col * 1.2, bands * bandIntensity);

            // Enhance with music energy
            col *= 0.8 + COLOR_INTENSITY * 0.4;

            // Angle-based color variation
            float spiralAngle = atan(z.y, z.x);
            float spiral = sin(spiralAngle * 5.0 + length(z) * 10.0 + iTime * 0.3) * 0.5 + 0.5;
            col *= 1.0 + spiral * 0.2 * COLOR_COMPLEXITY;
        } else {
            // Simplified coloring for low-performance devices
            col *= 0.9 + COLOR_INTENSITY * 0.2;
        }
    }

    // Pulse on beat - scaled by performance
    if (beat) {
        col *= 1.0 + 0.1 * COLOR_COMPLEXITY;
    }

    // Subtle vignette - less intense on low-performance devices
    float vignetteIntensity = IS_LOW_PERFORMANCE ? 0.15 : 0.3;
    float vignette = length(fragCoord / iResolution.xy - 0.5);
    vignette = smoothstep(0.0, 1.5, vignette) * vignetteIntensity;
    col = mix(col, col * 0.8, vignette);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
