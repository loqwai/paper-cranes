// @fullscreen: true
//https://visuals.beadfamous.com/edit?knob_7=0.119&knob_7.min=0.1&knob_7.max=0.2&knob_8=0.276&knob_8.min=0&knob_8.max=1&knob_9=-0.236&knob_9.min=-10&knob_9.max=10&knob_15=0.882&knob_15.min=0&knob_15.max=1&knob_6=0.165&knob_6.min=0&knob_6.max=1&knob_2=1&knob_2.min=0&knob_2.max=1&knob_5=0.583&knob_5.min=0&knob_5.max=1&knob_17=0.504&knob_17.min=0&knob_17.max=1&knob_16=0.205&knob_16.min=0&knob_16.max=1&knob_14=1.701&knob_14.min=0&knob_14.max=3&knob_4=0.055&knob_4.min=0&knob_4.max=1&knob_1=0&knob_1.min=0&knob_1.max=1&knob_13=0.543&knob_13.min=0&knob_13.max=1&knob_12=0.638&knob_12.min=0&knob_12.max=1&knob_3=0.189&knob_3.min=0&knob_3.max=1&knob_11=0.354&knob_11.min=0&knob_11.max=1
//https://visuals.beadfamous.com/edit?knob_7=0.2&knob_7.min=0.1&knob_7.max=0.2&knob_8=0.803&knob_8.min=0&knob_8.max=1&knob_9=-9.843&knob_9.min=-10&knob_9.max=10&knob_15=1&knob_15.min=0&knob_15.max=1&knob_6=0.638&knob_6.min=0&knob_6.max=1&knob_2=0.055&knob_2.min=0&knob_2.max=1&knob_5=0.63&knob_5.min=0&knob_5.max=1&knob_17=0.953&knob_17.min=0&knob_17.max=1&knob_16=0&knob_16.min=0&knob_16.max=1&knob_14=2.126&knob_14.min=0&knob_14.max=3&knob_4=0.409&knob_4.min=0&knob_4.max=1&knob_1=0&knob_1.min=0&knob_1.max=1&knob_13=0.535&knob_13.min=0&knob_13.max=1&knob_12=0.339&knob_12.min=0&knob_12.max=1&knob_3=0.417&knob_3.min=0&knob_3.max=1&knob_11=0.819&knob_11.min=0&knob_11.max=1&fullscreen=true&knob_10=0.748&knob_10.min=0&knob_10.max=1&knob_18=0&knob_18.min=0&knob_18.max=1
#define SMOOTHING 0.8
#define SPEED 0.5
// Drop detection using multiple features
#define DROP_THRESHOLD 0.5
#define IS_DROP false
// Visual parameters that react to drops
#define COLOR_SHIFT (spectralCentroidStandardDeviation * (1./1000.))
#define PATTERN_SCALE (1.0 + spectralSpreadStandardDeviation * (1./1000.))
#define FLOW_SPEED (0.2 + energyStandardDeviation * (1./1000.))
#define INTENSITY (0.5 + energyStandardDeviation * (1./1000.))
#define PATTERN_DISTORTION 1. + (spectralEntropyStandardDeviation / (knob_2*1000.))

uniform float knob_7;
uniform float knob_9;
uniform float knob_17;
uniform float knob_16;
uniform float knob_8;
uniform float knob_15;
#define PROBE_A knob_8
uniform float knob_6;
uniform float knob_14;
uniform float knob_4;
uniform float knob_12;
uniform float knob_3;

uniform float knob_2;
uniform float knob_10;
#define PROBE_C mapValue(0.,1.,1.,5., bassZScore)
#define PROBE_D mapValue(0.,1.,1.,5., spectralEntropyNormalized)
#define PROBE_B mix(0.,0.1,energyZScore)
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
    float a = sin(i.x + i.y * knob_7);
    float b = sin((i.x + 1.0) + i.y * knob_7);
    float c = sin(i.x + (i.y + 1.0) * knob_7);
    float d = sin((i.x + 1.0) + (i.y + 1.0) * knob_7);
    d = mix(d, granular(random(p, knob_9)+sin(time), 2.),knob_17);


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
    float t = iTime * FLOW_SPEED * knob_14;
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
    float smoothing = knob_15;

    color.y = fract(color.y * PROBE_A + (sin(random(color.yz, color.x))/1000.));
    if(bassZScore > 0.2) color.y = clamp(color.y *1.1, 0.,1.);
    color = mix(lastColor, color, smoothing);
    // if(random(vec2(0.), bassMax) > knob_6) {
    //     if(color.z > lastColor.z) discard;
    //     color = mix(lastColor, color, spectralCentroidStandardDeviation);
    // }
    if(color.y < knob_4) {
        color = mix(color, olc, PROBE_B);
        // color.x = fract(olc.x + abs(spectralCentroidZScore/100.));
        color.y = sin(color.y + knob_12);
    }
    // Convert back to RGB
    fragColor = vec4(hsl2rgb(color), 1.0);
}
