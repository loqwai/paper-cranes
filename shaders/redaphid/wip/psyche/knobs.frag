#define PI 3.14159265359

uniform float knob_1;  // Base rotation speed
uniform float knob_2;  // Color intensity
uniform float knob_3;  // Pattern scale
uniform float knob_4;  // Fractal detail
uniform float knob_5;  // Color blend
uniform float knob_6;  // Pattern evolution speed

#define EPSILON 0.0001
#define PROBE_A (knob_1 + EPSILON)
#define PROBE_B (knob_2 + EPSILON)
#define PROBE_C (knob_3 + EPSILON)
#define PROBE_D (knob_4 + EPSILON)
#define PROBE_E (knob_5 + EPSILON)
#define PROBE_F (knob_6 + EPSILON)

// Default audio-reactive values if knobs aren't adjusted
#define ROT_SPEED (PROBE_A * 0.2)
#define COLOR_INTENSITY (PROBE_B * 0.5)
#define PATTERN_SCALE (PROBE_C * 2.0)
#define FRACTAL_DETAIL (PROBE_D * 5.0)
#define COLOR_BLEND (PROBE_E * 0.4)
#define PATTERN_SPEED (PROBE_F * 0.2)

// Audio defaults
#define AUDIO_ROT mix(0.1, 0.3, spectralCentroidZScore)
#define AUDIO_SCALE mix(1.0, 2.0, energyNormalized)
#define AUDIO_DETAIL mix(3.0, 6.0, spectralRoughnessNormalized)

#define rot(a) mat2(cos(a), -sin(a), sin(a), cos(a))

// Smooth min function for organic blending
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}

// Enhanced fractal noise with more interesting patterns
float fractalNoise(vec3 p) {
    float noise = 0.0;
    float amp = 1.0;
    float freq = PATTERN_SCALE;

    for(int i = 0; i < int(FRACTAL_DETAIL); i++) {
        float v = sin(p.x*freq) * cos(p.y*freq) * sin(p.z*freq + time * PATTERN_SPEED);
        v += cos(p.z*freq) * sin(p.x*freq + AUDIO_ROT);
        noise += v * amp;
        freq *= 1.8 + spectralRoughnessNormalized * 0.2;
        amp *= 0.7;
        vec2 xy = rot(PI/3.0 + time * ROT_SPEED) * p.xy;
        p = vec3(xy.x, xy.y, p.z);
        p = p.yzx;
    }
    return noise * 0.5;
}

// Main distance field function
float map(vec3 p) {
    vec3 p1 = p;

    vec2 xz = rot(time * ROT_SPEED + AUDIO_ROT) * p.xz;
    p.xz = xz;
    vec2 xy = rot(time * ROT_SPEED * 0.75 + energyZScore * 0.2) * p.xy;
    p.xy = xy;

    float d = 1000.0;
    vec3 q = p;

    for(int i = 0; i < int(FRACTAL_DETAIL); i++) {
        q = abs(q) - vec3(1.0 + sin(time * ROT_SPEED) * 0.2);
        q.xy = abs(q.xy) - 0.5;

        vec2 qxy = rot(time * ROT_SPEED + float(i) * PI/2.0) * q.xy;
        q.xy = qxy;
        vec2 qyz = rot(time * ROT_SPEED * 0.5 + AUDIO_ROT) * q.yz;
        q.yz = qyz;

        q *= AUDIO_SCALE;

        float current = length(q) * pow(1.3, float(-i));
        d = smin(d, current, 0.3 + spectralCentroidNormalized * 0.2);
    }

    float detail = fractalNoise(p1 * AUDIO_SCALE);
    d = smin(d, detail * 0.5, 0.2);

    return d * 0.4;
}

// Color palette function
vec3 palette(float t) {
    vec3 a = vec3(0.8, 0.5, 0.4);
    vec3 b = vec3(0.2, 0.4, 0.2) * COLOR_INTENSITY;
    vec3 c = vec3(2.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67) +
             vec3(spectralCentroidNormalized, energyNormalized, spectralRoughnessNormalized) * 0.2;

    return a + b * cos(PI * 2. * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    vec3 ro = vec3(0.0, 0.0, -3.0 - AUDIO_SCALE * 0.5);
    vec3 rd = normalize(vec3(uv, 1.2));

    float t = 0.0;
    float d = 0.0;
    vec3 p;

    for(int i = 0; i < 70; i++) {
        p = ro + rd * t;
        d = map(p);
        if(abs(d) < 0.001 || t > 12.0) break;
        t += d * 0.35;
    }

    vec3 col = vec3(0.0);
    if(t < 12.0) {
        float pulse = sin(time * ROT_SPEED + t * 0.3) * 0.3 + 0.5;
        col = palette(t * 0.1 + pulse);

        vec3 col2 = palette(d * 1.5 + time * ROT_SPEED);
        col = mix(col, col2, COLOR_BLEND);

        vec3 pos = ro + rd * t;
        float pattern = fractalNoise(pos * 0.5);
        vec3 patternColor = palette(pattern + time * PATTERN_SPEED + PI * 0.5);
        col = mix(col, patternColor, COLOR_BLEND);

        col += palette(t * 0.05 + PI) * 0.1 / (abs(d) + 0.2);
    }

    col = rgb2hsl(col);
    col.x = fract(col.x + spectralCentroid * 0.15);
    col.y = clamp(col.y * (0.8 + spectralRoughnessNormalized * 0.2), 0.3, 0.9);
    col.z = clamp(col.z * (0.7 + energyNormalized * 0.15), 0.2, 0.7);

    if(beat) {
        col.x = fract(col.x + 0.2);
        col.y = clamp(col.y * 1.1, 0.0, 0.9);
    }

    col = hsl2rgb(col);

    vec4 prevColor = getLastFrameColor(fragCoord.xy/resolution.xy);
    float blendFactor = 0.2 + energyNormalized * 0.15;
    col = mix(prevColor.rgb, col, blendFactor);

    fragColor = vec4(col, 1.0);
}
