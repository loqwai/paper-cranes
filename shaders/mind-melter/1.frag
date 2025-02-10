//https://visuals.beadfamous.com/edit?knob_35=0.119&knob_35.min=0.1&knob_35.max=0.2&knob_36=0.276&knob_36.min=0&knob_36.max=1&knob_37=-0.236&knob_37.min=-10&knob_37.max=10&knob_45=0.882&knob_45.min=0&knob_45.max=1&knob_34=0.165&knob_34.min=0&knob_34.max=1&knob_30=1&knob_30.min=0&knob_30.max=1&knob_33=0.583&knob_33.min=0&knob_33.max=1&knob_47=0.504&knob_47.min=0&knob_47.max=1&knob_46=0.205&knob_46.min=0&knob_46.max=1&knob_44=1.701&knob_44.min=0&knob_44.max=3&knob_32=0.055&knob_32.min=0&knob_32.max=1&knob_27=0&knob_27.min=0&knob_27.max=1&knob_43=0.543&knob_43.min=0&knob_43.max=1&knob_42=0.638&knob_42.min=0&knob_42.max=1&knob_31=0.189&knob_31.min=0&knob_31.max=1&knob_41=0.354&knob_41.min=0&knob_41.max=1
//https://visuals.beadfamous.com/edit?knob_35=0.2&knob_35.min=0.1&knob_35.max=0.2&knob_36=0.803&knob_36.min=0&knob_36.max=1&knob_37=-9.843&knob_37.min=-10&knob_37.max=10&knob_45=1&knob_45.min=0&knob_45.max=1&knob_34=0.638&knob_34.min=0&knob_34.max=1&knob_30=0.055&knob_30.min=0&knob_30.max=1&knob_33=0.63&knob_33.min=0&knob_33.max=1&knob_47=0.953&knob_47.min=0&knob_47.max=1&knob_46=0&knob_46.min=0&knob_46.max=1&knob_44=2.126&knob_44.min=0&knob_44.max=3&knob_32=0.409&knob_32.min=0&knob_32.max=1&knob_27=0&knob_27.min=0&knob_27.max=1&knob_43=0.535&knob_43.min=0&knob_43.max=1&knob_42=0.339&knob_42.min=0&knob_42.max=1&knob_31=0.417&knob_31.min=0&knob_31.max=1&knob_41=0.819&knob_41.min=0&knob_41.max=1&fullscreen=true&knob_40=0.748&knob_40.min=0&knob_40.max=1&knob_62=0&knob_62.min=0&knob_62.max=1
//https://visuals.beadfamous.com/edit?knob_35=0.19&knob_35.min=0.1&knob_35.max=0.2&knob_36=0.378&knob_36.min=0&knob_36.max=1&knob_37=4.646&knob_37.min=-10&knob_37.max=10&knob_45=1&knob_45.min=0&knob_45.max=1&knob_34=1&knob_34.min=0&knob_34.max=1&knob_30=3.036&knob_30.min=0.1&knob_30.max=3.4&knob_33=0.661&knob_33.min=0&knob_33.max=1&knob_47=0.984&knob_47.min=0&knob_47.max=1&knob_46=0.906&knob_46.min=0&knob_46.max=1&knob_44=2.362&knob_44.min=0&knob_44.max=3&knob_32=0.228&knob_32.min=0&knob_32.max=1&knob_27=0&knob_27.min=0&knob_27.max=1&knob_43=0.882&knob_43.min=0&knob_43.max=1&knob_42=0.654&knob_42.min=0&knob_42.max=1&knob_31=0.047&knob_31.min=0&knob_31.max=1&knob_41=0.528&knob_41.min=0&knob_41.max=1&fullscreen=true&knob_40=0&knob_40.min=0&knob_40.max=1&knob_62=0&knob_62.min=0&knob_62.max=1&knob_52=0&knob_52.min=0&knob_52.max=1
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
#define PATTERN_DISTORTION 1. + (spectralEntropyStandardDeviation / (knob_30*1000.))
#define VARIANT 0.5
uniform float knob_35;
uniform float knob_37;
uniform float knob_47;
uniform float knob_46;
uniform float knob_36;
uniform float knob_45;
#define PROBE_A knob_36
uniform float knob_34;
uniform float knob_44;
uniform float knob_32;
uniform float knob_42;
uniform float knob_31;

uniform float knob_30;
uniform float knob_40;
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
    float a = sin(i.x + i.y * VARIANT);
    float b = sin((i.x + 1.0) + i.y * VARIANT);
    float c = sin(i.x + (i.y + 1.0) * VARIANT);
    float d = sin((i.x + 1.0) + (i.y + 1.0) * VARIANT);
    d = mix(d, granular(random(p, knob_37)+sin(time), 2.),spectralEntropyNormalized);


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
    float t = iTime * FLOW_SPEED * knob_44;
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
    float smoothing = knob_45;

    color.y = fract(color.y * PROBE_A + (sin(random(color.yz, color.x))/1000.));
    if(bassZScore > 0.2) color.y = clamp(color.y *1.1, 0.,1.);
    color = mix(lastColor, color, smoothing);
    // if(random(vec2(0.), bassMax) > knob_34) {
    //     if(color.z > lastColor.z) discard;
    //     color = mix(lastColor, color, spectralCentroidStandardDeviation);npm run de
    // }
    if(color.y < knob_32) {
        color = mix(color, olc, PROBE_B);
        // color.x = fract(olc.x + abs(spectralCentroidZScore/100.));
        color.y = sin(color.y + knob_42);
    }
    // Convert back to RGB
    color = hsl2rgb(color);
    color.b =fract(color.b/2. + bassMedian/bassMax);
    color *= normalize(color);
    fragColor = vec4(color, 1.0);
}
