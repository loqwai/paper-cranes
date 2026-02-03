// High-precision Julia set shader using CPU-calculated screen origin and pixel span (double-float emulation)
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


#define PI 3.14159265359
#define TAU (2.0 * PI)

#define JULIA_REAL (0.7885 * cos(float(frame) * 0.0001))
#define JULIA_IMAG (0.7885 * sin(float(frame) * 0.00012))

// Double-float addition: a + b (using Dekker's algorithm)
vec2 add_df(vec2 a, vec2 b) {
    float s = a.x + b.x;
    float v = s - a.x;
    float t = (a.x - (s - v)) + (b.x - v) + a.y + b.y;
    return vec2(s, t);
}

// Double-float multiplication
vec2 mul_df(vec2 a, float b) {
    float p = a.x * b;
    float q = a.x * b - p;
    float r = a.y * b;
    return vec2(p, (a.x * b - p - q) + r);
}

vec3 tieDyePalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.3, 0.2, 0.2);
    b *= 1.1;
    return a + b * cos(TAU * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 centeredFrag = fragCoord - iResolution.xy * 0.5;

    vec2 c;

    if (highPrecision > 0.5) {
        // High precision path using double-float arithmetic
        vec2 screenOriginX_df = vec2(cameraScreenOriginX, cameraScreenOriginXLow);
        vec2 screenOriginY_df = vec2(cameraScreenOriginY, cameraScreenOriginYLow);
        vec2 pixelSpan_df = vec2(cameraPixelSpan, cameraPixelSpanLow);

        vec2 cx_df = add_df(screenOriginX_df, mul_df(pixelSpan_df, centeredFrag.x));
        vec2 cy_df = add_df(screenOriginY_df, mul_df(pixelSpan_df, centeredFrag.y));

        c = vec2(cx_df.x + cx_df.y, cy_df.x + cy_df.y);
    } else {
        // Standard precision path
        vec2 fragOffsetHigh = centeredFrag * cameraPixelSpanHigh;
        vec2 fragOffsetLow = centeredFrag * cameraPixelSpanLow;
        c = vec2(cameraScreenOriginX, cameraScreenOriginY) + centeredFrag * cameraPixelSpan;
    }

    vec2 juliaC = vec2(JULIA_REAL, JULIA_IMAG);

    // For Julia set, z starts as the pixel coordinate
    vec2 z = c;
    float iter = 0.0;
    float maxIter = 300.0;

    // Increase iterations when zoomed in for better detail
    if (currentZoomLevel < 0.1) {
        maxIter = mix(300.0, 600.0, smoothstep(0.1, 0.0001, currentZoomLevel));
    }

    for (float j = 0.0; j < maxIter; j++) {
        float zxSq = z.x * z.x;
        float zySq = z.y * z.y;

        z = vec2(zxSq - zySq, 2.0 * z.x * z.y) + juliaC;

        if (dot(z, z) > 4.0) {
            iter = j + 1.0 - log(log(dot(z, z))) / log(2.0);
            break;
        }
    }

    vec3 col;
    if (iter >= maxIter) {
        // Interior coloring
        float pattern = sin(length(z) * 50.0 * (0.5 + centerIterNorm)) * 0.5 + 0.5;
        col = tieDyePalette(pattern) * 0.15;
    } else {
        // Exterior coloring
        float normalizedIter = sqrt(iter / maxIter);
        float colorCycle = iTime * 0.07 + centerIterNorm;
        float colorIndex = fract(normalizedIter * 3.0 + colorCycle);
        col = tieDyePalette(colorIndex);

        // Add bands
        float bands = sin(normalizedIter * 20.0) * 0.5 + 0.5;
        col = mix(col, col * 1.2, bands * 0.3);
        // Add spiral effect based on angle
        float spiralAngle = atan(z.y, z.x);
        float spiral = sin(spiralAngle * 5.0 + length(z) * 10.0 + iTime * 0.1) * 0.5 + 0.5;
        col *= 1.0 + spiral * 0.2;
    }

    // Vignette
    float vignette = length(fragCoord / iResolution.xy - 0.5) * 1.5;
    vignette = smoothstep(0.0, 1.0, vignette);
    col = mix(col, col * 0.6, vignette);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
