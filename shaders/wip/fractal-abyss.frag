// Fractal Abyss - Deep evolving fractal landscape
// Slow temporal evolution, rich colors, complex layered structure

// Subtle audio mappings - structure not rapid color
#define WARP_DEPTH mapValue(bassNormalized, 0., 1., 0.3, 0.8)
#define SPIRAL_TIGHTNESS mapValue(spectralCentroidNormalized, 0., 1., 1.2, 3.5)
#define LAYER_SHIFT mapValue(spectralRoughnessNormalized, 0., 1., 0.1, 0.4)
#define FOLD_INTENSITY mapValue(midsNormalized, 0., 1., 0.5, 1.5)
#define SCALE_FACTOR mapValue(spectralSpreadNormalized, 0., 1., 1.8, 2.4)

#define TAU 6.28318530718
#define PHI 1.61803398875

mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// Smooth noise for domain warping
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal brownian motion for organic warping
float fbm(vec2 p, float t) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    mat2 rotation = rot(0.5);

    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p * frequency + t * 0.1 * float(i + 1));
        p = rotation * p;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Complex exponential fractal (inspired by sexy/2 but deeper)
vec4 complexFractal(vec2 uv, float t, float audioMod) {
    vec2 c = uv * 0.6;
    c.x += 0.77 + sin(t * 0.03) * 0.1;

    vec2 z = c * (-0.5 - audioMod * 0.2);

    float minX = 9.0, minY = 9.0, minR = 9.0;
    vec2 minZ = z;

    float A = SPIRAL_TIGHTNESS;
    float B = LAYER_SHIFT;

    for (int k = 0; k < 60; k++) {
        float a = atan(z.y, z.x);
        float d = dot(z, z) * A;
        float v = dot(z, vec2(a, log(max(d, 0.0001)) * 0.5));

        z = exp(-a * z.y) * pow(max(d, 0.0001), z.x * 0.5) * vec2(cos(v), sin(v));
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
        z -= c * B;

        // Track orbit characteristics
        minX = min(minX, abs(z.x));
        minY = min(minY, abs(z.y));
        float r = dot(z, z);
        if (r < minR) {
            minR = r;
            minZ = z;
        }
    }

    // Smooth distance field from orbit
    float field = 1.0 - smoothstep(1.0, -6.0, log(minY)) * smoothstep(1.0, -6.0, log(minX));
    float angle = atan(minZ.y, minZ.x);

    return vec4(field, angle, minR, length(minZ));
}

// Mandelbrot-like iteration for secondary layer
vec3 mandelbrotLayer(vec2 uv, float t) {
    vec2 c = uv * 2.5 - vec2(0.5, 0.0);
    c = rot(t * 0.02) * c;

    vec2 z = vec2(0.0);
    float smoothVal = 0.0;
    float trap = 1e10;

    for (int i = 0; i < 80; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        // Line trap for structure
        trap = min(trap, abs(z.y - sin(z.x * 2.0 + t * 0.1) * 0.5));

        if (dot(z, z) > 256.0) {
            smoothVal = float(i) - log2(log2(dot(z, z))) + 4.0;
            break;
        }
    }

    return vec3(smoothVal / 80.0, trap, length(z));
}

// Deep color palette - rich jewel tones that evolve slowly
vec3 palette(float t, float angle, float depth) {
    // Base hue cycles very slowly
    float hue = t * 0.01 + angle / TAU;

    // Rich, saturated jewel tones - brighter base
    vec3 col1 = vec3(0.45, 0.15, 0.65); // Vivid purple
    vec3 col2 = vec3(0.15, 0.35, 0.70); // Rich blue
    vec3 col3 = vec3(0.10, 0.55, 0.45); // Vibrant teal
    vec3 col4 = vec3(0.65, 0.20, 0.35); // Rich magenta

    // Smooth cycling through palette
    float cycle = fract(hue) * 4.0;
    vec3 color;
    if (cycle < 1.0) {
        color = mix(col1, col2, cycle);
    } else if (cycle < 2.0) {
        color = mix(col2, col3, cycle - 1.0);
    } else if (cycle < 3.0) {
        color = mix(col3, col4, cycle - 2.0);
    } else {
        color = mix(col4, col1, cycle - 3.0);
    }

    // Add luminosity variation based on depth
    color += depth * vec3(0.5, 0.4, 0.6);

    return color;
}

// Secondary organic color - vibrant cosine palette
vec3 organicColor(float val, float t) {
    vec3 a = vec3(0.6, 0.6, 0.6);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.15, 0.30);

    // Slow color drift
    d += vec3(sin(t * 0.02) * 0.15, cos(t * 0.017) * 0.15, sin(t * 0.013) * 0.15);

    return a + b * cos(TAU * (c * val + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uvNorm = fragCoord / iResolution.xy;

    // Very slow time evolution
    float t = iTime * 0.5;

    // Domain warping for organic flow
    float warp = fbm(uv * 2.0, t) * WARP_DEPTH;
    vec2 warpedUV = uv + vec2(
        fbm(uv * 3.0 + vec2(0.0, t * 0.05), t) - 0.5,
        fbm(uv * 3.0 + vec2(t * 0.05, 0.0), t) - 0.5
    ) * warp * 0.3;

    // Apply slow rotation
    warpedUV = rot(t * 0.02 + warp * 0.2) * warpedUV;

    // Subtle audio-reactive zoom (very gentle)
    float zoom = 1.0 + (bassZScore * 0.02);
    warpedUV *= zoom;

    // Primary fractal layer
    vec4 fractal1 = complexFractal(warpedUV, t, spectralFluxNormalized * 0.3);

    // Secondary layer at different scale/rotation
    vec2 uv2 = rot(t * 0.01 + PHI) * warpedUV * SCALE_FACTOR;
    vec4 fractal2 = complexFractal(uv2, t * PHI, spectralEntropyNormalized * 0.2);

    // Mandelbrot accent layer
    vec3 mandelData = mandelbrotLayer(warpedUV * 0.5, t);

    // Build color from fractal data
    vec3 color1 = palette(t, fractal1.y, fractal1.x);
    vec3 color2 = palette(t * PHI, fractal2.y + 1.0, fractal2.x);
    vec3 color3 = organicColor(mandelData.x + mandelData.y * 0.5, t);

    // Layer blending based on fractal depth
    float blend1 = smoothstep(0.2, 0.8, fractal1.x);
    float blend2 = smoothstep(0.3, 0.7, fractal2.x);
    float blend3 = smoothstep(0.0, 0.5, mandelData.x);

    vec3 color = color1;
    color = mix(color, color2, blend2 * 0.6);
    color = mix(color, color3, blend3 * 0.3);

    // Add glow from orbit traps - brighter accents
    float glow1 = exp(-fractal1.z * 1.5) * 0.7;
    float glow2 = exp(-fractal2.z * 1.5) * 0.5;
    float trapGlow = exp(-mandelData.y * 8.0) * 0.6;

    color += vec3(0.4, 0.5, 0.8) * glow1;
    color += vec3(0.7, 0.4, 0.5) * glow2;
    color += vec3(0.5, 0.7, 0.4) * trapGlow;

    // Feedback from previous frame - very slow blend for evolution
    vec3 prev = getLastFrameColor(uvNorm).rgb;

    // Slight UV distortion for feedback (creates slow drift)
    vec2 fbUV = uvNorm + vec2(
        sin(uvNorm.y * TAU + t * 0.1) * 0.002,
        cos(uvNorm.x * TAU + t * 0.1) * 0.002
    );
    vec3 prevWarped = getLastFrameColor(fbUV).rgb;

    // Slow color evolution in feedback - maintain brightness
    vec3 prevHSL = rgb2hsl(prevWarped);
    prevHSL.x = fract(prevHSL.x + 0.001); // Slow hue drift
    prevHSL.y = mix(prevHSL.y, 0.7, 0.02); // Pull saturation to vibrant
    prevHSL.z = mix(prevHSL.z, 0.5, 0.01); // Pull lightness to mid (prevents fade to black)
    vec3 evolvedPrev = hsl2rgb(prevHSL);

    // Blend new with evolved previous - more new color for visibility
    color = mix(evolvedPrev, color, 0.15 + spectralFluxNormalized * 0.1);

    // Subtle beat response - gentle brightening, not flash
    if (beat) {
        color *= 1.05;
    }

    // Subtle vignette - just darken edges slightly
    float vignette = 1.0 - dot(uv * 0.3, uv * 0.3);
    vignette = smoothstep(0.0, 1.0, vignette);
    color *= 0.85 + vignette * 0.15;

    // Gentle tone mapping - preserve brightness
    color = color / (1.0 + color * 0.15);

    // Very slight film grain for organic feel
    float grain = hash(fragCoord + fract(iTime) * 100.0) * 0.02;
    color += grain - 0.01;

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
