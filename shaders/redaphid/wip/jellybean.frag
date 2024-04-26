#define iGlobalTime iTime

float sdJellybean(vec3 p, float s, float morph) {
    p.x += sin(p.y * 5.0 + iGlobalTime * 2.0) * morph;
    p.z += cos(p.y * 5.0 + iGlobalTime * 2.0) * morph * 0.5; // Adding depth modulation
    return length(p) - s;
}

vec3 getNormal(vec3 p, float s, float morph) {
    const float h = 0.0001; // precision value
    return normalize(vec3(
        sdJellybean(p + vec3(h, 0.0, 0.0), s, morph) - sdJellybean(p - vec3(h, 0.0, 0.0), s, morph),
        sdJellybean(p + vec3(0.0, h, 0.0), s, morph) - sdJellybean(p - vec3(0.0, h, 0.0), s, morph),
        sdJellybean(p + vec3(0.0, 0.0, h), s, morph) - sdJellybean(p - vec3(0.0, 0.0, h), s, morph)
    ));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord/iResolution.xy)*2.0-1.0;
    uv.x *= iResolution.x / iResolution.y;

    // Separate the center jellybean from the fractal grid
    vec3 centerPos = vec3(uv, 0.0);
    vec3 gridPos = vec3(mod(uv*6.0, 2.0) - 1.0, 0.0);

    // Central Jellybean
    float centerMorphFactor = sin(iGlobalTime) *0.2+energyZScore; // Larger morph for emphasis
    float centerD = sdJellybean(centerPos, 0.3, centerMorphFactor); // Make it bigger to stand out

    // Background Jellybeans
    float gridMorphFactor = sin(iGlobalTime) * 0.2+spectralRoughnessZScore;
    float gridD = sdJellybean(gridPos, 0.1, gridMorphFactor); // Smaller, part of the grid

    vec3 col;
    if (centerD < 0.0) {
        vec3 normal = getNormal(centerPos, 0.3, centerMorphFactor);
        float diffuse = dot(normal, normalize(vec3(0.0, 0.0, 1.0)));
        col = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 0.5), diffuse);
    } else if (gridD < 0.0) {
        vec3 normal = getNormal(gridPos, 0.1, gridMorphFactor);
        float diffuse = dot(normal, normalize(vec3(0.0, 0.0, 1.0)));
        col = mix(vec3(0.2, 0.0, 0.5), vec3(0.5, 0.0, 0.8), diffuse); // Different color for the grid
    } else {
        col = vec3(0.1, 0.0, 0.2); // Background color
    }

    fragColor = vec4(col,1.0);
}
