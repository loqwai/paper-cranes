// High-precision Mandelbrot shader using CPU-calculated screen origin and pixel span (double-float emulation)

uniform float cameraScreenOriginHighX;
uniform float cameraScreenOriginLowX;
uniform float cameraScreenOriginHighY;
uniform float cameraScreenOriginLowY;
uniform float cameraPixelSpanHigh;
uniform float cameraPixelSpanLow;
uniform float zoomDepth;
uniform float detailEnhancement;
uniform float deepZoom;

#define PI 3.14159265359
#define TAU (2.0 * PI)

// Rotation function
vec2 rotatePoint(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
}

vec3 tieDyePalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5) * bassNormalized;
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.3, 0.2, 0.2);
    b *= 0.8 + 0.63 * 0.5; // KNOB_COLOR_INTENSITY = 0.63
    return a + b * cos(TAU * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Emulated double precision coordinate
    vec2 highCoord = vec2(cameraScreenOriginHighX, cameraScreenOriginHighY) + fragCoord * cameraPixelSpanHigh;
    vec2 lowCoord  = vec2(cameraScreenOriginLowX,  cameraScreenOriginLowY)  + fragCoord * cameraPixelSpanLow;
    vec2 c = highCoord + lowCoord;

    // Optional animated offset for visual texture
    float timeScale = iTime * 0.1;
    vec2 detailOffset = vec2(
        sin(timeScale) * 0.0005 * spectralKurtosisNormalized,
        cos(timeScale) * 0.0005 * spectralEntropyNormalized
    ) * deepZoom;
    c += detailOffset;

    // Mandelbrot iteration
    vec2 z = vec2(0.0);
    float iter = 0.0;
    float maxIter = 300.0 + detailEnhancement * 300.0 + deepZoom * 500.0;

    for (float j = 0.0; j < maxIter; j++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) {
            iter = j + 1.0 - log(log(dot(z, z))) / log(2.0)/spectralFlux;
            break;
        }
    }

    // Colorization
    vec3 col;
    if (iter >= maxIter) {
        float innerDetail = length(z) * spectralCentroid;
        float pattern = sin(innerDetail * PI) * 0.5 + 0.5;
        col = tieDyePalette(pattern) * 0.15 * deepZoom;
    } else {
        float normalizedIter = sqrt(iter / maxIter);
        float colorCycle = iTime * 0.07; // KNOB_COLOR_SPEED = 0.7
        float colorIndex = fract(normalizedIter * 3.0 + colorCycle);
        col = tieDyePalette(colorIndex);
        float bands = sin(normalizedIter * spectralCentroid) * 0.5 + 0.5;
        col = mix(col, col * 1.2, bands * 0.3);
        col *= 0.8 + 0.63 * 0.4; // KNOB_COLOR_INTENSITY = 0.63
        float spiralAngle = atan(z.y, z.x) + spectralCentroid;
        float spiral = sin(spiralAngle * 5.0 + length(z) * 10.0) * 0.5 + 0.5;
        col *= 1.0 + spiral * energyNormalized;
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
