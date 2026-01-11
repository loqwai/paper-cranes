// Fractal Abyss - Deep evolving fractal landscape
// Slow temporal evolution, rich colors, complex layered structure
// Designed for LED sync via screen scraping - dark jewel tones with high saturation

// ============================================================================
// KNOB MODE: Use query params to test different states before connecting audio
// Example: ?shader=wip/fractal-abyss&knob_1=0.5&knob_2=0.8&knob_3=0.3
// ============================================================================

// Uncomment to enable knob testing mode (comment out for audio mode)
// #define KNOB_MODE

#ifdef KNOB_MODE
    // Knob declarations for testing
    uniform float knob_1; // WARP_DEPTH: 0=subtle, 1=heavy warping
    uniform float knob_2; // SPIRAL_TIGHTNESS: 0=loose, 1=tight spirals
    uniform float knob_3; // LAYER_SHIFT: 0=aligned, 1=offset layers
    uniform float knob_4; // FOLD_INTENSITY: 0=simple, 1=complex folds
    uniform float knob_5; // SCALE_FACTOR: 0=zoomed in, 1=zoomed out
    uniform float knob_6; // ZOOM_REACT: bass zoom reactivity
    uniform float knob_7; // FLUX_BLEND: how much new color vs feedback

    // Parameter ranges tuned for aesthetic results
    #define WARP_DEPTH mapValue(knob_1, 0., 1., 0.3, 0.8)
    #define SPIRAL_TIGHTNESS mapValue(knob_2, 0., 1., 1.2, 3.5)
    #define LAYER_SHIFT mapValue(knob_3, 0., 1., 0.1, 0.4)
    #define FOLD_INTENSITY mapValue(knob_4, 0., 1., 0.5, 1.5)
    #define SCALE_FACTOR mapValue(knob_5, 0., 1., 1.8, 2.4)
    #define ZOOM_REACT (knob_6 * 0.04)
    #define FLUX_BLEND (0.15 + knob_7 * 0.15)
#else
    // AUDIO MODE: Map audio features to visual parameters
    // Choose features from DIFFERENT domains for variety (see CLAUDE.md)
    #define WARP_DEPTH mapValue(bassNormalized, 0., 1., 0.3, 0.8)
    #define SPIRAL_TIGHTNESS mapValue(spectralCentroidNormalized, 0., 1., 1.2, 3.5)
    #define LAYER_SHIFT mapValue(spectralRoughnessNormalized, 0., 1., 0.1, 0.4)
    #define FOLD_INTENSITY mapValue(midsNormalized, 0., 1., 0.5, 1.5)
    #define SCALE_FACTOR mapValue(spectralSpreadNormalized, 0., 1., 1.8, 2.4)
    #define ZOOM_REACT (bassZScore * 0.02)
    #define FLUX_BLEND (0.15 + spectralFluxNormalized * 0.1)
#endif

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

// Deep color palette - CLEAN triadic: sapphire/emerald/amber (NO purple/pink/fuchsia)
vec3 palette(float t, float angle, float depth) {
    // Base hue cycles very slowly
    float hue = t * 0.01 + angle / TAU;

    // SAFE triadic palette - these colors CANNOT mix into fuchsia
    vec3 col1 = vec3(0.02, 0.08, 0.35); // Deep sapphire blue
    vec3 col2 = vec3(0.02, 0.30, 0.22); // Deep emerald green
    vec3 col3 = vec3(0.38, 0.25, 0.02); // Deep amber/gold
    vec3 col4 = vec3(0.02, 0.18, 0.32); // Deep ocean teal (NOT violet)

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

    // Depth adds subtle brightness, not wash-out
    color += depth * vec3(0.10, 0.12, 0.08);

    return color;
}

// Secondary organic color - DARK cosine palette for LED sync (no fuchsia)
vec3 organicColor(float val, float t) {
    // Shifted to blue-green-gold range, avoiding red channel dominance
    vec3 a = vec3(0.12, 0.18, 0.20); // Dark teal-ish base
    vec3 b = vec3(0.12, 0.18, 0.15); // Small amplitude, more G/B
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.25, 0.15, 0.35); // Phase offsets keep us in safe hue range

    // Slow color drift
    d += vec3(sin(t * 0.02) * 0.1, cos(t * 0.017) * 0.12, sin(t * 0.013) * 0.1);

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
    float zoom = 1.0 + ZOOM_REACT;
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

    // Add glow from orbit traps - DARK saturated accents (no fuchsia)
    float glow1 = exp(-fractal1.z * 2.0) * 0.4;
    float glow2 = exp(-fractal2.z * 2.0) * 0.3;
    float trapGlow = exp(-mandelData.y * 10.0) * 0.35;

    // Glow colors: blues, teals, ambers - NO pink/magenta
    color += vec3(0.08, 0.12, 0.32) * glow1;  // Deep blue accent
    color += vec3(0.28, 0.18, 0.02) * glow2;  // Amber/gold accent
    color += vec3(0.04, 0.22, 0.18) * trapGlow; // Teal accent

    // Feedback from previous frame - very slow blend for evolution
    vec3 prev = getLastFrameColor(uvNorm).rgb;

    // Slight UV distortion for feedback (creates slow drift)
    vec2 fbUV = uvNorm + vec2(
        sin(uvNorm.y * TAU + t * 0.1) * 0.002,
        cos(uvNorm.x * TAU + t * 0.1) * 0.002
    );
    vec3 prevWarped = getLastFrameColor(fbUV).rgb;

    // Slow color evolution in feedback - maintain DARK richness for LED sync
    vec3 prevHSL = rgb2hsl(prevWarped);
    prevHSL.x = fract(prevHSL.x + 0.001); // Slow hue drift
    prevHSL.y = mix(prevHSL.y, 0.85, 0.03); // Pull saturation HIGH for LEDs
    prevHSL.z = mix(prevHSL.z, 0.25, 0.02); // Pull lightness LOW - jewel tones are DARK
    vec3 evolvedPrev = hsl2rgb(prevHSL);

    // Blend new with evolved previous - more new color for visibility
    color = mix(evolvedPrev, color, FLUX_BLEND);

    // Subtle beat response - gentle brightening, not flash
    if (beat) {
        color *= 1.05;
    }

    // Stronger vignette for LED contrast - dark edges help screen scraping
    float vignette = 1.0 - dot(uv * 0.4, uv * 0.4);
    vignette = smoothstep(-0.2, 0.8, vignette);
    color *= vignette;

    // More aggressive tone mapping - compress highlights, preserve darks
    color = color / (1.0 + color * 0.4);

    // Boost saturation in final output for LED vibrancy
    vec3 finalHSL = rgb2hsl(color);
    finalHSL.y = min(finalHSL.y * 1.3, 1.0); // Boost saturation
    finalHSL.z = min(finalHSL.z, 0.55); // Cap lightness to prevent wash-out
    color = hsl2rgb(finalHSL);

    // Very slight film grain for organic feel
    float grain = hash(fragCoord + fract(iTime) * 100.0) * 0.015;
    color += grain - 0.0075;

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
