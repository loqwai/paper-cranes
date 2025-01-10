

define HEART_SIZE 1.3
#define PI 3.14159265359

// Psychedelic palette
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b*cos(6.28318*(c*t+d));
}

// Fractal noise for internal pattern
float fractalNoise(vec2 p) {
    float noise = 0.0;
    float amp = 1.0;
    float freq = 1.0;

    for(int i = 0; i < 6; i++) {
        float v = sin(p.x*freq) * cos(p.y*freq + time * 0.2);
        v += cos(p.y*freq) * sin(p.x*freq + spectralCentroid);
        noise += v * amp;
        freq *= 2.0;
        amp *= 0.5;
        p = p * 1.1;
    }
    return noise * 0.5;
}

float dot2(in vec2 v) { return dot(v,v); }

float sdHeart(in vec2 p) {
    p.x = abs(p.x);
    p.y += 0.6;

    if(p.y+p.x>1.0)
        return sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
    return sqrt(min(dot2(p-vec2(0.00,1.00)),
                dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - resolution.xy) / resolution.y;
    vec2 uv0 = uv;

    vec3 finalColor = vec3(0.0);

    for(float i = 0.0; i < 5.0; i++) {
        float heartSize = 0.1 + HEART_SIZE/20.0 + 0.3 + energy;
        float d = sdHeart(uv * 1.0/heartSize) * exp(-length(uv0));

        if(d > 0.0) {
            // Create interesting pattern inside the heart
            vec2 patternUV = uv * 3.0;
            float pattern = fractalNoise(patternUV + time * 0.1);

            // Spiral effect
            float angle = atan(uv.y, uv.x);
            float radius = length(uv);
            float spiral = sin(angle * 3.0 + time + radius * 10.0) * 0.5 + 0.5;

            // Combine patterns
            float combined = mix(pattern, spiral, 0.5 + sin(time * 0.2) * 0.5);

            // Color based on pattern
            vec3 col1 = palette(combined + time * 0.1);
            vec3 col2 = palette(pattern + time * 0.2 + PI * 0.5);
            vec3 col = mix(col1, col2, spectralRoughnessNormalized);

            // Add pulsing glow
            float pulse = sin(time + length(uv) * 5.0) * 0.5 + 0.5;
            col *= 1.0 + pulse * energy;

            finalColor += col * 0.5;
        } else {
            vec3 col = palette(time * 0.1 + i * 0.2);

            // Add gradient based on distance from heart edge
            float edgeDist = abs(d / exp(-length(uv0)));
            if(edgeDist < 0.05) {
                // Glowing edge effect
                col = mix(vec3(1.0), col, edgeDist * 20.0);
                if(beat) col *= 1.5;
            }

            finalColor = col * (0.2 + (1.0 + cos(i * 3.0 * time)/2.0) / (pow(i, 2.0)*0.3+1.0));
            break;
        }
    }

    // Enhanced vignette
    vec2 vigUV = fragCoord.xy / resolution.xy;
    vigUV *= 1.0 - vigUV.yx;
    float vignette = pow(vigUV.x * vigUV.y * 20.0, 0.25);
    finalColor *= vignette;

    // Add subtle color variation based on position
    finalColor = mix(finalColor, palette(length(uv0) * 0.5 + time * 0.1), 0.2);

    // Boost colors on beat
    if(beat) {
        finalColor *= 1.2;
    }

    fragColor = vec4(finalColor, 1.0);
}
