// Mandelbrot deep zoom shader with centered coordinates and high precision

uniform float offsetX_high;
uniform float offsetX_low;
uniform float offsetY_high;
uniform float offsetY_low;
uniform float pixelSpan_high;
uniform float pixelSpan_low;

uniform float maxIterations;
uniform float currentZoomLevel;
uniform float zoomExponent;
uniform float colorCycle;
uniform float zoomCycle;
uniform float transitionBlend;


#define PI 3.14159265359
#define TAU (2.0 * PI)
#define ESCAPE_RADIUS 4.0
#define MAX_ITER 1000.0

vec2 df_add(vec2 a, vec2 b) {
    float t1 = a.x + b.x;
    float e = t1 - a.x;
    float t2 = ((b.x - e) + (a.x - (t1 - e))) + a.y + b.y;
    return vec2(t1, t2);
}

vec2 df_sub(vec2 a, vec2 b) {
    float t1 = a.x - b.x;
    float e = t1 - a.x;
    float t2 = ((-b.x - e) + (a.x - (t1 - e))) + a.y - b.y;
    return vec2(t1, t2);
}

vec2 df_mul(vec2 a, vec2 b) {
    float t1 = a.x * b.x;
    float e1 = t1 - a.x * b.x;
    float t2 = ((a.x * b.y - e1) + (a.y * b.x)) + a.y * b.y;
    return vec2(t1, t2);
}

vec2 df_from_float(float a) {
    return vec2(a, 0.0);
}

vec3 deepStructurePalette(float t) {
    return vec3(0.5) + vec3(0.5) * cos(TAU * (vec3(0.8, 0.5, 0.4) * t + vec3(0.0, 0.2, 0.4)));
}

vec3 getDetailedColor(float iter, float maxIter, vec2 z) {
    float smoothIter = iter;

    if (iter < maxIter) {
        float logZ = log(dot(z, z)) / 2.0;
        float nu = log(logZ / log(2.0)) / log(2.0);
        smoothIter = iter + 1.0 - nu;
    }

    float t = pow(smoothIter / maxIter, 0.5);
    float phase = atan(z.y, z.x) / TAU;
    phase = fract(phase + 0.5);
    float colorIndex = fract(t * 3.0 + phase * 0.5 + colorCycle);
    vec3 color = deepStructurePalette(colorIndex);
    float zoomFactor = pow(min(1.0, zoomExponent / 20.0), 1.5);
    color = mix(color, hsl2rgb(vec3(colorIndex, 0.8, 0.5)), zoomFactor * 0.3);
    float brightness = mix(1.0, 0.4, pow(t, 0.5));
    return color * brightness;
}

vec4 getPreviousFrame(vec2 uv) {
    vec4 lastColor = getLastFrameColor(uv);
    if (lastColor.a == 0.0) return vec4(0.0);
    return lastColor;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Shift coords to center
    vec2 centeredCoord = fragCoord - iResolution.xy * 0.5;

    // High precision values from uniforms
    vec2 origin_re = vec2(offsetX_high, offsetX_low);
    vec2 origin_im = vec2(offsetY_high, offsetY_low);
    vec2 pixelSpan = vec2(pixelSpan_high, pixelSpan_low);

    // Calculate offset in fractal space
    vec2 pixelOffset_re = df_mul(df_from_float(centeredCoord.x), pixelSpan);
    vec2 pixelOffset_im = df_mul(df_from_float(centeredCoord.y), pixelSpan);

    vec2 c_re = df_add(origin_re, pixelOffset_re);
    vec2 c_im = df_add(origin_im, pixelOffset_im);

    vec2 z_re = vec2(0.0);
    vec2 z_im = vec2(0.0);

    float zoomBoost = min(50.0, log(1.0 + zoomExponent));
    float dynamicMaxIter = min(MAX_ITER, maxIterations + zoomBoost * 2.);

    float iter = 0.0;
    bool escaped = false;

    for (float i = 0.0; i < dynamicMaxIter; i++) {
        vec2 z_re_sq = df_mul(z_re, z_re);
        vec2 z_im_sq = df_mul(z_im, z_im);
        vec2 z_re_im = df_mul(z_re, z_im);
        vec2 z_re_new = df_add(df_sub(z_re_sq, z_im_sq), c_re);
        vec2 z_im_new = df_add(df_mul(df_from_float(2.0), z_re_im), c_im);

        z_re = z_re_new;
        z_im = z_im_new;

        vec2 mag_sq = df_add(z_re_sq, z_im_sq);

        if (isnan(mag_sq.x) || isinf(mag_sq.x)) {
            escaped = true;
            break;
        }

        if (mag_sq.x > ESCAPE_RADIUS) {
            escaped = true;
            break;
        }

        iter += 1.0;
    }

    vec3 color;
    if (!escaped) {
        float depth = sqrt(iter / dynamicMaxIter);
        float pattern = sin(iter * 0.05 + zoomExponent * 0.1 + colorCycle * 3.0);
        color = mix(vec3(0.01, 0.02, 0.15), vec3(0.06, 0.0, 0.15), pattern * 0.5 + 0.5);
        color += deepStructurePalette(depth + colorCycle) * 0.08;
        float zoomDetail = 0.03 + 0.08 * sin(depth * 8.0 + colorCycle * 15.0);
        zoomDetail *= min(1.0, zoomExponent / 10.0);
        color += vec3(zoomDetail);
    } else {
        color = getDetailedColor(iter, dynamicMaxIter, vec2(z_re.x, z_im.x));
    }

    vec4 lastColor = getPreviousFrame(fragCoord / iResolution.xy);
    if (lastColor.a > 0.0) {
        float blendFactor = 0.05 + min(0.7, zoomExponent * 0.003);
        color = mix(color, lastColor.rgb, clamp(blendFactor, 0.0, 0.9));
    }

    float vignette = smoothstep(1.5, 0.0, length(centeredCoord / iResolution.xy) * 1.3);
    color *= mix(0.85, 1.0, vignette);
    color = pow(color, vec3(0.95));

    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
