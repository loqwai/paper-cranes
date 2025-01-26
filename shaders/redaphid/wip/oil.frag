#define STABILITY (1.0 - spectralCentroidStandardDeviation * 2.0)
#define GROWTH_RATE (spectralSpreadStandardDeviation * 2.0)
#define EDGE_DETAIL (spectralRoughnessStandardDeviation * 3.0)
#define COLOR_VARIANCE (spectralEntropyStandardDeviation)
#define BASE_ROTATION (iTime * 0.1)

// Crystal growth parameters controlled by audio variance
#define CRYSTAL_LAYERS 5
#define FOLD_INTENSITY (1.0 + energyStandardDeviation * 2.0)
#define PULSE_RATE (1.0 + bassStandardDeviation * 3.0)

mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}
vec3 sabs(vec3 x, float k) {

    vec3 a = sqrt(x*x + k);

    return a;

}

// Crystalline distance field
float crystal(vec3 p) {
    float d = 1000.0;
    vec3 c = p;

    // Rotate based on audio stability
    p.xz *= rot(BASE_ROTATION + STABILITY * 0.5);
    p.xy *= rot(BASE_ROTATION * 0.7);
    p += vec3(sin(iTime * 0.1) * 0.1);
    // Fractal crystalline structure
    float scale = 1.0;
    float k = 0.01 + STABILITY * 0.02; // S
    for(int i = 0; i < CRYSTAL_LAYERS; i++) {
        p = sabs(p,k) - vec3(1.0 + sin(iTime * PULSE_RATE) * 0.2);

        // Fold space based on audio energy variance
        p.xy *= rot(p.z * FOLD_INTENSITY);
        p.xz *= rot(p.y * FOLD_INTENSITY);

        // Scale down for each iteration
        p *= 0.8 + GROWTH_RATE * 0.2;
        scale *= 0.8 + GROWTH_RATE * 0.2;

        // Accumulate distance
        float cd = length(p) * scale;
        d = min(d, cd);
    }

    // Add surface detail based on roughness variance
    float detail = sin(c.x*10.0 + c.y*8.0 + c.z*6.0) * EDGE_DETAIL * 0.1;
    return d * 0.3 + detail;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Setup camera
    vec3 ro = vec3(0.0, 0.0, 4.0);
    vec3 rd = normalize(vec3(uv, -1.5));

    // Rotate camera based on stability
    ro.xz *= rot(BASE_ROTATION);
    rd.xz *= rot(BASE_ROTATION);

    // Raymarching
    float t = 0.0;
    vec3 col = vec3(0.0);
    float d = 0.0;

    // Enhanced depth for more dynamic range
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        d = crystal(p);

        if(d < 0.001 || t > 20.0) break;
        t += d;
    }

    if(t < 20.0) {
        // Calculate normal
        vec2 e = vec2(0.001, 0.0);
        vec3 n = normalize(vec3(
            crystal(ro + rd * t + e.xyy) - crystal(ro + rd * t - e.xyy),
            crystal(ro + rd * t + e.yxy) - crystal(ro + rd * t - e.yxy),
            crystal(ro + rd * t + e.yyx) - crystal(ro + rd * t - e.yyx)
        ));

        // Dynamic lighting based on audio variance
        vec3 light = normalize(vec3(sin(BASE_ROTATION), 1.0, cos(BASE_ROTATION)));
        float diff = max(0.0, dot(n, light));
        float spec = pow(max(0.0, dot(reflect(-light, n), -rd)), 32.0);

        // Color based on normal and audio features
        vec3 baseColor = vec3(0.5 + n * 0.5);
        baseColor = rgb2hsl(baseColor);

        // Shift hue based on variance
        baseColor.x = fract(baseColor.x + COLOR_VARIANCE);
        // Increase saturation with stability
        baseColor.y = clamp(baseColor.y + STABILITY * 0.5, 0.0, 1.0);
        // Adjust lightness with energy
        baseColor.z *= 0.7 + energyNormalized * 0.3;

        baseColor = hsl2rgb(baseColor);

        // Combine lighting
        col = baseColor * diff + spec * STABILITY;
    }

    // Get previous frame for temporal blending
    vec4 lastFrame = getLastFrameColor(fragCoord/iResolution.xy);

    // Blend based on stability - more stable audio = smoother transitions
    float blendFactor = 0.8 - STABILITY * 0.3;
    col = mix(lastFrame.rgb, col, blendFactor);

    // Output final color
    fragColor = vec4(col, 1.0);
}
