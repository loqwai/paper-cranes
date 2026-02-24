#define SMOOTHING 1.
#define SPEED 0.5
// Drop detection using multiple features
#define DROP_THRESHOLD 0.5
#define IS_DROP false
// Visual parameters that react to drops
#define COLOR_SHIFT (spectralCentroidStandardDeviation * (energyZScore/1000.))
#define PATTERN_SCALE (1.0 + spectralSpreadStandardDeviation * (energyZScore/1000.))
#define FLOW_SPEED (0.2 + energyStandardDeviation * (energyZScore/1000.))
#define INTENSITY (0.5 + energyStandardDeviation * (energyZScore/1000.))
#define PATTERN_DISTORTION 1. + (spectralEntropyStandardDeviation / (1.*1000.))
#define VARIANT 0.5

#define PROBE_C mapValue(0.,1.,1.,5., bassZScore)
#define PROBE_D mapValue(0.,1.,1.,5., spectralEntropyNormalized)
#define PROBE_B mix(0.,0.1,energyZScore)
#define SATURATION_THRESHOLD 0.1

#define PROBE_E 1.
// Enhanced noise function with distortion

float granular(float x, float resolution) {
    return floor(x * resolution) / resolution;
}

vec2 granular(vec2 x, float resolution) {
    return vec2(granular(x.x, resolution), granular(x.y, resolution));
}

vec2 getBlock(vec2 uv, float blockSize) {
    // make sure this wraps around the screen
    vec2 block = floor(uv / blockSize) * blockSize;
    block.x = mod(block.x, iResolution.x);
    block.y = mod(block.y, iResolution.y);
    // Add half blockSize to get center coordinates
    return block + (blockSize * 0.5);
}



float noise(vec2 p) {

    // Add distortion during drops
    p += vec2(sin(p.y * 2.0), cos(p.x * 2.0)) * PATTERN_DISTORTION;


    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (PROBE_C - PROBE_D * f);
    float a = sin(i.x + i.y * VARIANT);
    float b = sin((i.x + PROBE_E) + i.y * VARIANT);
    float c = sin(i.x + (i.y + PROBE_E) * VARIANT);
    float d = sin((i.x + PROBE_E) + (i.y + 1.0) * VARIANT);
    d = mix(d, granular(random(p, spectralCentroidNormalized)+sin(time), 2.),spectralEntropyNormalized);


    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}


void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    // Normalize coordinates
    vec2 uv = fragCoord / iResolution.xy;


    vec2 p = (uv * 2.0 - 1.0) * PATTERN_SCALE;
    p.x *= iResolution.x / iResolution.y;


    // Get previous frame color
    vec3 olc = rgb2hsl(getLastFrameColor(sin(uv*energyStandardDeviation)).rgb);
    vec3 lastColor = rgb2hsl(getLastFrameColor(sin(olc).xy).rgb);

    // Create flowing pattern
    float t = iTime * FLOW_SPEED;
    float n1 = noise(p + vec2(t, -t));
    float n2 = noise(p * 2.0 + vec2(-t, t * 0.5));
    float pattern = (n1 + n2) * 0.5;


    // Create base color in HSL
    vec3 color = vec3(0.0);
    color.x = sin(pattern * 0.5 + COLOR_SHIFT); // Hue
    color.y =  energyStandardDeviation + spectralCrestStandardDeviation + bassStandardDeviation;

    // Enhance brightness during drops
    float dropIntensity = 1.0;
    color.z = (0.5 + pattern * INTENSITY * 0.3) * dropIntensity;

    // Faster color transitions during drops
    float smoothing = SMOOTHING;

    color.y = fract(color.y + (sin(random(color.yz, color.x))/1000.));
    if(bassZScore > 0.2) color.y = clamp(color.y *1.1, 0.,1.);
    color = mix(lastColor, color, smoothing);
    // if(random(vec2(0.), bassMax) > knob_34) {
    //     if(color.z > lastColor.z) discard;
    //     color = mix(lastColor, color, spectralCentroidStandardDeviation);npm run de
    // }
    if(color.y < SATURATION_THRESHOLD) {
        color = mix(color, olc, PROBE_B);
        // color.x = sin(olc.x + abs(spectralCentroidZScore/1000.));
        color.y = sin(color.y + energyMedian);
    }
    color.x = sin(color.x + (pitchClassMedian/10.));
    // Convert back to RGB
    color = hsl2rgb(color);
    //  color.b =sin(color.b/4. + bassMedian/bassMax);
    color *= normalize(color);
    fragColor = vec4(fract(color), 1.0);
}
