// High-precision Mandelbrot shader using CPU-calculated screen origin and pixel span (double-float emulation)
// http://localhost:6969/edit.html?controller=mandelbrot&knob_50=0.22&knob_50.min=-3&knob_50.max=3
uniform float cameraScreenOriginX;

uniform float cameraScreenOriginY;
uniform float cameraScreenOriginLowY;
uniform float cameraPixelSpanHigh;
uniform float cameraPixelSpanLow;
uniform float centerIterNorm;
uniform float cameraPixelSpan;


#define PI 3.14159265359
#define TAU (2.0 * PI)

vec3 tieDyePalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.3, 0.2, 0.2);
    b *= 0.8 + 0.63 * 0.5; // KNOB_COLOR_INTENSITY = 0.63
    return a + b * cos(TAU * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 centeredFrag = fragCoord - iResolution.xy * 0.5;
    vec2 fragOffsetHigh = centeredFrag * cameraPixelSpanHigh;
    vec2 fragOffsetLow  = centeredFrag * cameraPixelSpanLow;
    vec2 c = vec2(cameraScreenOriginX, cameraScreenOriginY) + centeredFrag * cameraPixelSpan;



    vec2 z = vec2(0.0);
    float iter = 0.0;
    float maxIter = 300.0;

    for (float j = 0.0; j < maxIter; j++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) {
            iter = j + 1.0 - log(log(dot(z, z))) / log(2.0);
            break;
        }
    }

    vec3 col;
    if (iter >= maxIter) {
        float pattern = sin(length(z) * 50.0 * (0.5 + centerIterNorm)) * 0.5 + 0.5;
        col = tieDyePalette(pattern) * 0.15;
    } else {
        float normalizedIter = sqrt(iter / maxIter);
        float colorCycle = iTime * 0.07 + centerIterNorm;
        float colorIndex = fract(normalizedIter * 3.0 + colorCycle);
        col = tieDyePalette(colorIndex);
        float bands = sin(normalizedIter * 20.0) * 0.5 + 0.5;
        col = mix(col, col * 1.2, bands * 0.3);
        col *= 0.8 + 0.63 * 0.4;
        float spiralAngle = atan(z.y, z.x);
        float spiral = sin(spiralAngle * 5.0 + length(z) * 10.0) * 0.5 + 0.5;
        col *= 1.0 + spiral * 0.2;
    }
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
