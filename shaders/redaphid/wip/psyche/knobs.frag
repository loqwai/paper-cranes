//http://localhost:6969/edit.html?knob_1=1.65&knob_1.min=-3&knob_1.max=3&knob_2=-2.34&knob_2.min=-3&knob_2.max=3&knob_3=0.33&knob_3.min=-3&knob_3.max=3&knob_5=3.56&knob_5.min=-3&knob_5.max=4&knob_4=1.63&knob_4.min=-3&knob_4.max=10&knob_6=1.75&knob_6.min=-3&knob_6.max=3
//http://localhost:6969/edit.html?knob_1=-0.62&knob_1.min=-3&knob_1.max=3&knob_2=-2.34&knob_2.min=-3&knob_2.max=3&knob_3=0.33&knob_3.min=-3&knob_3.max=3&knob_5=3.56&knob_5.min=-3&knob_5.max=4&knob_4=1.63&knob_4.min=-3&knob_4.max=10&knob_6=-0.62&knob_6.min=-1&knob_6.max=1
#define PI 3.14159265359

uniform float knob_1;  // Base rotation speed
uniform float knob_2;  // Color intensity
uniform float knob_3;  // Pattern scale
uniform float knob_4;  // Fractal detail
uniform float knob_5;  // Color blend
uniform float knob_6;  // Pattern evolution speed

#define EPSILON 0.0001

// Optimize probe definitions to use knobs and audio features together
#define PROBE_A ((knob_1 + EPSILON) * spectralFluxZScore)
#define PROBE_B ((knob_2 + EPSILON) * energyNormalized)
#define PROBE_C ((knob_3 + EPSILON) * spectralCentroidNormalized)
#define PROBE_D ((knob_4 + EPSILON) * bassNormalized)
#define PROBE_E ((knob_5 + EPSILON) * midsNormalized)
#define PROBE_F ((knob_6 + EPSILON) * trebleNormalized)

// Optimize control parameters with knob influence
#define ROT_SPEED (PROBE_A * 0.15)
#define COLOR_INTENSITY (PROBE_B * 0.4 + 0.3)
#define PATTERN_SCALE (PROBE_C * 1.5 + 0.5)
#define FRACTAL_DETAIL (mix(3.0, 5.0, PROBE_D))
#define COLOR_BLEND (PROBE_E * 0.3 + 0.2)
#define PATTERN_SPEED (PROBE_F * 0.15)

// Audio reactive values with knob modulation
#define AUDIO_ROT mix(0.05, 0.2, PROBE_A)
#define AUDIO_SCALE mix(0.8, 1.5, PROBE_B)
#define AUDIO_DETAIL mix(2.0, 4.0, PROBE_C)

#define rot(a) mat2(cos(a), -sin(a), sin(a), cos(a))

// Optimized smin with reduced operations
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}

// Optimized fractal noise with fewer iterations
float fractalNoise(vec3 p) {
    float noise = 0.0;
    float amp = 1.0;
    float freq = PATTERN_SCALE;

    // Reduced iterations for better performance
    for(int i = 0; i < 4; i++) {
        float v = sin(p.x*freq) * cos(p.y*freq) * sin(p.z*freq + time * PATTERN_SPEED);
        noise += v * amp;
        freq *= 1.5;
        amp *= 0.6;
        p = p.yzx; // Simplified rotation
    }
    return noise * 0.4;
}

// Optimized distance field
float map(vec3 p) {
    vec3 p1 = p;
    p.xz *= rot(time * ROT_SPEED);
    p.xy *= rot(time * ROT_SPEED * 0.5);

    float d = 1000.0;
    vec3 q = p;

    // Reduced iterations for better performance
    for(int i = 0; i < 3; i++) {
        q = abs(q) - vec3(1.0 + sin(time * ROT_SPEED) * 0.15);
        q.xy = abs(q.xy) - 0.4;
        q.xy *= rot(time * ROT_SPEED + float(i) * PI/2.0);
        q *= AUDIO_SCALE;
        float current = length(q) * pow(1.2, float(-i));
        d = smin(d, current, PROBE_E);
    }

    float detail = fractalNoise(p1 * AUDIO_SCALE);
    return smin(d, detail * 0.4, 0.2) * 0.4;
}

// Optimized color palette
vec3 palette(float t) {
    vec3 a = vec3(0.8, 0.5, 0.4);
    vec3 b = vec3(0.2, 0.4, 0.2) * COLOR_INTENSITY;
    vec3 c = vec3(1.5, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67) + vec3(PROBE_C, PROBE_B, PROBE_F) * 0.15;
    return a + b * cos(PI * 2. * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    vec3 ro = vec3(0.0, 0.0, -2.8 - AUDIO_SCALE * 0.4);
    vec3 rd = normalize(vec3(uv, 1.1));

    float t = 0.0;
    float d;

    // Optimized raymarch with fewer steps
    for(int i = 0; i < 50; i++) {
        d = map(ro + rd * t);
        if(abs(d) < 0.002 || t > 10.0) break;
        t += d * 0.45;
    }

    vec3 col = vec3(0.0);
    if(t < 1.0) {
        float pulse = sin(time * ROT_SPEED + t * 0.25) * 0.25 + 0.5;
        col = palette(t * 0.1 + pulse);

        vec3 pos = ro + rd * t;
        float pattern = fractalNoise(pos * 0.4);
        vec3 patternColor = palette(pattern + time * PATTERN_SPEED);
        col = mix(col, patternColor, COLOR_BLEND);
    }

    // Optimized color adjustment
    col = rgb2hsl(col);
    col.x = fract(col.x + PROBE_C * 0.1);
    col.y = clamp(col.y * (0.7 + PROBE_B * 0.2), 0.3, 0.85);
    col.z = clamp(col.z * (0.6 + PROBE_E * 0.15), 0.2, 0.7);

    if(beat) {
        col.x = fract(col.x + 0.15);
        col.y = min(col.y * 1.1, 0.9);
    }

    col = hsl2rgb(col);

    // Frame blending
    vec4 prevColor = getLastFrameColor(fragCoord.xy/resolution.xy);
    float blendFactor = 0.15 + PROBE_B * 0.1;
    col = mix(prevColor.rgb, col, blendFactor);

    fragColor = vec4(col, 1.0);
}
