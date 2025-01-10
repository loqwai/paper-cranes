#define PI 3.14159265359
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
    float freq = 1.0;

    for(int i = 0; i < 6; i++) {
        float v = sin(p.x*freq) * cos(p.y*freq) * sin(p.z*freq + time * 0.2);
        v += cos(p.z*freq) * sin(p.x*freq + spectralCentroidZScore);
        noise += v * amp;
        freq *= 1.8 + spectralRoughnessNormalized * 0.2;
        amp *= 0.7;
        vec2 xy = rot(PI/3.0 + time * 0.1) * p.xy;
        p = vec3(xy.x, xy.y, p.z);
        p = p.yzx;
    }
    return noise * 0.5;
}

// Main distance field function
float map(vec3 p) {
    vec3 p1 = p;

    // Create more complex rotations
    vec2 xz = rot(time * 0.2 + spectralCentroidZScore * 0.3) * p.xz;
    p.xz = xz;
    vec2 xy = rot(time * 0.15 + energyZScore * 0.2) * p.xy;
    p.xy = xy;

    float d = 1000.0;
    vec3 q = p;

    // More interesting fractal transformation
    for(int i = 0; i < 5; i++) {
        // Fold space in interesting ways
        q = abs(q) - vec3(1.0 + sin(time * 0.2) * 0.2);
        q.xy = abs(q.xy) - 0.5;

        vec2 qxy = rot(time * 0.3 + float(i) * PI/2.0) * q.xy;
        q.xy = qxy;
        vec2 qyz = rot(time * 0.2 + spectralRoughnessZScore * 0.3) * q.yz;
        q.yz = qyz;

        // Scale based on audio
        q *= 1.3 + energyNormalized * 0.2;

        float current = length(q) * pow(1.3, float(-i));
        d = smin(d, current, 0.3 + spectralCentroidNormalized * 0.2);
    }

    // Add organic detail
    float detail = fractalNoise(p1 * (2.0 + spectralCentroidNormalized));
    d = smin(d, detail * 0.5, 0.2);

    return d * 0.4;
}

// Color palette function
vec3 palette(float t) {
    // More psychedelic color palette
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0 + spectralRoughnessNormalized * 0.5);
    vec3 d = vec3(0.263, 0.416, 0.557) +
             vec3(spectralCentroidNormalized, energyNormalized, spectralRoughnessNormalized) * 0.4;

    return a + b * cos(6.28318 * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    vec3 ro = vec3(0.0, 0.0, -3.0 - energyNormalized);
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
        // Create more complex color patterns
        float pulse = sin(time + t * 0.5 + spectralCentroidZScore) * 0.5 + 0.5;
        col = palette(t * 0.1 + pulse);

        // Add depth without losing color
        col = mix(col, palette(d * 2.0), 0.5);

        // Add interesting patterns based on position
        vec3 pos = ro + rd * t;
        float pattern = fractalNoise(pos * 0.5);
        col = mix(col, palette(pattern + time * 0.1), 0.3);

        // Add subtle glow
        col += palette(t * 0.05) * 0.15 / (abs(d) + 0.1);
    }

    // Color enhancement
    col = rgb2hsl(col);
    col.x = fract(col.x + spectralCentroid * 0.2);
    col.y = clamp(col.y * (1.0 + spectralRoughnessNormalized * 0.3), 0.4, 0.95);
    col.z = clamp(col.z * (1.0 + energyNormalized * 0.2), 0.2, 0.8);

    if(beat) {
        col.x = fract(col.x + 0.1);
        col.y = clamp(col.y * 1.2, 0.0, 1.0);
    }

    col = hsl2rgb(col);

    // Smoother frame blending
    vec4 prevColor = getLastFrameColor(fragCoord.xy/resolution.xy);
    col = mix(prevColor.rgb, col, 0.3 + energyNormalized * 0.2);

    fragColor = vec4(col, 1.0);
}
