// Audio reactive parameters
#define ZOOM (2.0 + spectralCentroidZScore * 0.5)
#define ROTATION_SPEED (spectralFluxZScore * 0.1)
#define ITERATION_DETAIL (15.0 + energyNormalized * 20.0)
#define COLOR_SHIFT (spectralCentroidNormalized)
#define WARP_INTENSITY (spectralRoughnessNormalized * 0.3)
#define GLOW_INTENSITY (energyNormalized * 2.0)

// Complex number operations
vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 cdiv(vec2 a, vec2 b) {
    float denom = dot(b, b);
    return vec2(dot(a, b), a.y * b.x - a.x * b.y) / denom;
}

// Fractal iteration function
vec2 iterate(vec2 z, vec2 c) {
    // Standard mandelbrot iteration with audio-reactive warping
    vec2 z2 = cmul(z, z);
    z2 += c;

    // Add audio-reactive warping
    float warp = sin(z2.x * WARP_INTENSITY) * cos(z2.y * WARP_INTENSITY);
    z2 += vec2(warp) * WARP_INTENSITY;

    return z2;
}

// Color generation based on iteration count and audio features
vec3 getColor(float iter, float maxIter) {
    // Base color progression
    float t = iter / maxIter;

    // Create a dynamic color palette
    vec3 color = vec3(
        0.5 + 0.5 * sin(t * 6.28318 + COLOR_SHIFT * 6.28318),
        0.5 + 0.5 * sin(t * 6.28318 + COLOR_SHIFT * 4.28318),
        0.5 + 0.5 * sin(t * 6.28318 + COLOR_SHIFT * 2.28318)
    );

    // Add energy-based glow
    float glow = pow(1.0 - t, 3.0) * GLOW_INTENSITY;
    color += vec3(1.0, 0.8, 0.6) * glow;

    // Convert to HSL for better control
    vec3 hsl = rgb2hsl(color);

    // Modify based on audio features
    hsl.x = fract(hsl.x + COLOR_SHIFT); // Hue shift
    hsl.y = mix(0.5, 1.0, spectralCentroidNormalized); // Saturation
    hsl.z *= energyNormalized * 1.5; // Brightness

    return hsl2rgb(hsl);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Center and scale coordinates
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / min(resolution.x, resolution.y);

    // Apply zoom and rotation
    float angle = time * ROTATION_SPEED;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    uv = rot * uv;
    uv *= ZOOM;

    // Initial position in complex plane
    vec2 c = uv;
    vec2 z = vec2(0.0);

    // Fractal iteration
    float iter = 0.0;
    for(float i = 0.0; i < ITERATION_DETAIL; i++) {
        z = iterate(z, c);

        if(length(z) > 2.0) {
            break;
        }
        iter++;
    }

    // Get base color
    vec3 color = getColor(iter, ITERATION_DETAIL);

    // Add beat response
    if(beat) {
        color *= 1.2;
        color += vec3(0.2, 0.1, 0.0);
    }

    // Blend with previous frame for smooth transitions
    vec4 prevColor = getLastFrameColor(fragCoord.xy / resolution.xy);
    color = mix(prevColor.rgb, color, 0.1);

    fragColor = vec4(color, 1.0);
}
