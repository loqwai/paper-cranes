#define SMOOTHING 0.8
#define SPEED 0.5
// Drop detection using multiple features
#define DROP_THRESHOLD 1.2
#define IS_DROP (abs(energyZScore) > DROP_THRESHOLD || abs(spectralFluxZScore) > DROP_THRESHOLD || abs(spectralCentroidZScore) > DROP_THRESHOLD)
// Visual parameters that react to drops
#define COLOR_SHIFT (spectralCentroidZScore * 0.1 * (IS_DROP ? 2.0 : 1.0))
#define PATTERN_SCALE (1.0 + spectralSpreadStandardDeviation * (IS_DROP ? 2.0 : 1.0))
#define FLOW_SPEED (0.2 + energyStandardDeviation * (IS_DROP ? 1.0 : 0.3))
#define INTENSITY (0.5 + energyZScore * (IS_DROP ? 0.4 : 0.2))
#define PATTERN_DISTORTION (IS_DROP ? sin(iTime * 4.0) * 0.3 : 0.0)

// Enhanced noise function with distortion
float noise(vec2 p) {
    // Add distortion during drops
    p += vec2(sin(p.y * 2.0), cos(p.x * 2.0)) * PATTERN_DISTORTION;

    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = sin(i.x + i.y * 19.19);
    float b = sin((i.x + 1.0) + i.y * 19.19);
    float c = sin(i.x + (i.y + 1.0) * 19.19);
    float d = sin((i.x + 1.0) + (i.y + 1.0) * 19.19);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalize coordinates
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = (uv * 2.0 - 1.0) * PATTERN_SCALE;
    p.x *= iResolution.x / iResolution.y;

    // Add circular wave effect during drops
    if(IS_DROP) {
        float dist = length(p);
        p += normalize(p) * sin(dist * 10.0 - iTime * 8.0) * 0.1;
    }

    // Get previous frame color
    vec3 lastColor = rgb2hsl(getLastFrameColor(uv).rgb);

    // Create flowing pattern
    float t = iTime * FLOW_SPEED;
    float n1 = noise(p + vec2(t, -t));
    float n2 = noise(p * 2.0 + vec2(-t, t * 0.5));
    float pattern = (n1 + n2) * 0.5;

    // Add extra pattern layers during drops
    if(IS_DROP) {
        float n3 = noise(p * 4.0 + vec2(t * 2.0, t));
        pattern = mix(pattern, n3, 0.3);
    }

    // Create base color in HSL
    vec3 color = vec3(0.0);
    color.x = fract(pattern * 0.5 + COLOR_SHIFT); // Hue
    color.y = 0.7 + spectralSpreadStandardDeviation * 0.3; // Saturation

    // Enhance brightness during drops
    float dropIntensity = IS_DROP ? (1.0 + sin(iTime * 8.0) * 0.2) : 1.0;
    color.z = (0.5 + pattern * INTENSITY * 0.3) * dropIntensity;

    // Faster color transitions during drops
    float smoothing = IS_DROP ? 0.6 : SMOOTHING;
    color = mix(lastColor, color, smoothing);

    // Convert back to RGB
    fragColor = vec4(hsl2rgb(color), 1.0);
}
