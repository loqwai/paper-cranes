// Define audio reactive parameters
#define PROBE_A (spectralCentroidZScore) // For overall pattern evolution
#define PROBE_B (energyNormalized) // For intensity/brightness
#define PROBE_C (spectralFluxZScore) // For sudden changes/transitions
#define PROBE_D (bassNormalized) // For base movement
#define PROBE_E (trebleNormalized) // For fine detail modulation
#define PROBE_F (spectralRoughnessZScore) // For texture variation
#define PROBE_G (midsNormalized) // For mid-range pattern control

// Constants
#define PI 3.14159265359
#define MAX_STEPS 150
#define MIN_DIST 0.001
#define MAX_DIST 100.0



// Rotation matrix
mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// Fractal distance function
float fractalDistance(vec3 p, float patternScale) {
    vec3 pos = p;
    float scale = 1.0;
    float dist = 0.0;

    // Apply bass-driven rotation
    p.xz *= rot(time * 0.2 + PROBE_D * PI);
    p.xy *= rot(time * 0.1 - PROBE_D * PI * 0.5);

    for(int i = 0; i < 8; i++) {
        p = abs(p) - vec3(1.0 + PROBE_B * 0.5);
        float r = dot(p, p);

        // Add variation based on spectral features
        float k = 1.0 + PROBE_F * 0.2;
        p = p * k / r;

        // Accumulate distance
        dist += exp(-r * patternScale);

        // Modulate with mids for additional detail
        scale *= 0.5 + PROBE_G * 0.3;
    }

    return dist * 0.5;
}

// Color palette function
vec3 palette(float t) {
    vec3 a = vec3(0.5 + PROBE_B * 0.2);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557) + PROBE_A * 0.2;

    return a + b * cos(6.28318 * (c * t + d));
}

// Ray marching function
float raymarch(vec3 ro, vec3 rd, float patternScale) {
    float t = 0.0;
    float d = 0.0;

    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        d = fractalDistance(p, patternScale);

        if(d < MIN_DIST || t > MAX_DIST) break;
        t += d * 0.5;
    }

    return t;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  float patternScale = 1.0 + PROBE_B * 2.0;
float evolutionSpeed = 0.2 + PROBE_A * 0.3;
float colorIntensity = 0.5 + PROBE_B * 0.5;
float detailLevel = 0.5 + PROBE_E * 1.5;
    vec2 uv = (fragCoord - 0.5 * resolution.xy) / resolution.y;

    // Camera setup with audio-reactive movement
    vec3 ro = vec3(0.0, 0.0, -4.0 + sin(time * 0.5) * PROBE_A);
    vec3 rd = normalize(vec3(uv * (1.0 + PROBE_B * 0.2), 1.0));

    // Apply rotation to ray direction
    rd.xz *= rot(time * 0.2 + PROBE_C * 0.5);
    rd.xy *= rot(time * 0.1 - PROBE_C * 0.3);

    // Ray marching
    float dist = raymarch(ro, rd, patternScale);

    // Calculate color
    vec3 col = vec3(0.0);
    if(dist < MAX_DIST) {
        vec3 p = ro + rd * dist;
        float pattern = fractalDistance(p, patternScale);

        // Create base color from palette
        vec3 baseColor = palette(pattern * 0.1 + time * 0.1);

        // Add depth and atmosphere
        float fog = 1.0 - exp(-dist * 0.1);
        baseColor *= 1.0 - fog * 0.8;

        // Add glow based on energy
        float glow = exp(-pattern * 4.0) * PROBE_B;
        col = baseColor + vec3(0.2, 0.4, 0.8) * glow;
    }

    // Apply beat response
    if(beat) {
        col *= 1.2;
        col = mix(col, vec3(1.0), 0.1);
    }

    // Color correction and final adjustments
    col = pow(col, vec3(0.8 + PROBE_B * 0.4));

    // Frame blending for smooth transitions
    vec4 lastFrame = getLastFrameColor(fragCoord.xy/resolution.xy);
    float blendFactor = 0.8 + PROBE_C * 0.1;

    fragColor = mix(lastFrame, vec4(col, 1.0), 0.1 + PROBE_B * 0.2);
}
