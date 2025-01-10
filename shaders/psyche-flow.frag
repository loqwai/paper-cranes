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
    // More varied psychedelic color palette
    vec3 a = vec3(0.8, 0.5, 0.4);
    vec3 b = vec3(0.2, 0.4, 0.2);
    vec3 c = vec3(2.0, 1.0, 1.0); // Different frequencies for RGB
    vec3 d = vec3(0.0, 0.33, 0.67) +
             vec3(spectralCentroidNormalized, energyNormalized, spectralRoughnessNormalized) * 0.2;

    return a + b * cos(PI * 2. * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    vec3 ro = vec3(0.0, 0.0, -3.0 - energyNormalized * 0.5); // Reduced energy influence
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
        // More varied color patterns
        float pulse = sin(time * 0.5 + t * 0.3) * 0.3 + 0.5; // Reduced pulse intensity
        col = palette(t * 0.1 + pulse);

        // Blend multiple color layers
        vec3 col2 = palette(d * 1.5 + time * 0.1);
        col = mix(col, col2, 0.4);

        // Add patterns with different color phase
        vec3 pos = ro + rd * t;
        float pattern = fractalNoise(pos * 0.5);
        vec3 patternColor = palette(pattern + time * 0.2 + PI * 0.5); // Phase shift for variety
        col = mix(col, patternColor, 0.3);

        // Controlled glow
        col += palette(t * 0.05 + PI) * 0.1 / (abs(d) + 0.2); // Reduced glow intensity
    }

    // More controlled color enhancement
    col = rgb2hsl(col);

    // Maintain color variety while preventing oversaturation
    col.x = fract(col.x + spectralCentroid * 0.15);
    col.y = clamp(col.y * (0.8 + spectralRoughnessNormalized * 0.2), 0.3, 0.9); // More controlled saturation
    col.z = clamp(col.z * (0.7 + energyNormalized * 0.15), 0.2, 0.7); // Prevent white-out

    if(beat) {
        col.x = fract(col.x + 0.2); // Color shift on beat
        col.y = clamp(col.y * 1.1, 0.0, 0.9); // Less aggressive saturation boost
    }

    col = hsl2rgb(col);

    // Gentler frame blending
    vec4 prevColor = getLastFrameColor(fragCoord.xy/resolution.xy);
    float blendFactor = 0.2 + energyNormalized * 0.15; // Reduced blend variation
    col = mix(prevColor.rgb, col, blendFactor);

    fragColor = vec4(col, 1.0);
}
