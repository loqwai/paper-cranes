// http://localhost:6969/edit.html?knob_14=0.417&knob_14.min=-1&knob_14.max=1&knob_15=0.433&knob_15.min=-1&knob_15.max=1&knob_16=0.2&knob_16.min=0&knob_16.max=0.2&knob_17=0.591&knob_17.min=0&knob_17.max=1&knob_18=1&knob_18.min=0&knob_18.max=1&knob_19=0.457&knob_19.min=0&knob_19.max=1&knob_21=0.52&knob_21.min=0&knob_21.max=1&knob_8=0.63&knob_8.min=0&knob_8.max=1&knob_11=0.22&knob_11.min=0&knob_11.max=1&knob_6=0.937&knob_6.min=0&knob_6.max=1&knob_22=34.3&knob_22.min=0.1&knob_22.max=34.3&knob_3=6.817&knob_3.min=0&knob_3.max=11.1&knob_7=0.969&knob_7.min=0.01&knob_7.max=1&knob_5=0.906&knob_5.min=0&knob_5.max=1&knob_9=0.567&knob_9.min=0&knob_9.max=1&knob_10=0.844&knob_10.min=0.1&knob_10.max=1&time=-0.38&time.min=-3&time.max=3&iTime=-0.59&iTime.min=-3&iTime.max=3&knob_20=0&knob_20.min=0&knob_20.max=1&knob_46=0&knob_46.min=0&knob_46.max=1&knob_4=0.795&knob_4.min=0&knob_4.max=3
// Constants
#define MAX_RIPPLES 12
#define PI 3.14159265359
#define TIME (iTime/10.)
#define BEAT knob_23 > 50.

// Audio reactive parameters
#define WAVE_SPEED knob_3
#define PATTERN_SCALE knob_4
#define RIPPLE_CHAOS energyZScore      // How randomly ripples are placed
#define RIPPLE_SPREAD knob_6      // How far from center ripples appear
#define RIPPLE_STRENGTH knob_7      // How strong ripples are
#define COLOR_SHIFT knob_8       // Base color shift
#define BEAT_INTENSITY knob_9

// Ripple characteristics
#define RIPPLE_SPEED knob_20
#define RIPPLE_THICKNESS mapValue(knob_10, 0., 1., 0., sin(time/100.))
#define RIPPLE_DISTANCE_DECAY (1. - knob_3)
#define RIPPLE_AGE_DECAY mapValue(bassZScore, -1.,1., knob_14, time)
#define RIPPLE_BIRTH_STAGGER knob_16
#define RIPPLE_LIFE_DURATION knob_10
#define RIPPLE_BASE_STRENGTH knob_22

// Color and blending
#define COLOR_PERSISTENCE knob_19
#define COLOR_SATURATION 1.
#define COLOR_BRIGHTNESS_SCALE knob_18


// Knob controls
uniform float knob_14;
uniform float knob_15;
uniform float knob_16;
uniform float knob_17;
uniform float knob_18;
uniform float knob_19;
uniform float knob_20;
uniform float knob_21;
uniform float knob_22;
uniform float knob_23;

uniform float knob_3;
uniform float knob_4;
uniform float knob_5;
uniform float knob_6;
uniform float knob_7;
uniform float knob_8;
uniform float knob_9;
uniform float knob_10;
uniform float knob_11;
// Ripple structure
struct Ripple {
    vec2 center;
    float birth;
    float strength;
};

// Better random function
float random(float seed) {
    return random(vec2(0.));
}

// 2D random
vec2 random2(float seed) {
    return vec2(
        random(seed),
        random(seed + 1234.5678)
    );
}

float createRipple(vec2 p, Ripple r) {
    float d = length(p - r.center);
    float age = TIME - r.birth;

    float radius = age * RIPPLE_SPEED;
    float thickness = RIPPLE_THICKNESS * 0.04;
    float wave = exp(-thickness * pow(d - radius, 2.0));

    float distanceDecay = exp(-d * RIPPLE_DISTANCE_DECAY);
    float ageDecay = exp(-age * RIPPLE_AGE_DECAY);

    return wave * distanceDecay * ageDecay * r.strength * RIPPLE_STRENGTH;
}

Ripple[MAX_RIPPLES] getRipples() {
    Ripple[MAX_RIPPLES] ripples;

    for(int i = 0; i < MAX_RIPPLES; i++) {
        float birthOffset = mod(TIME + float(i) * RIPPLE_BIRTH_STAGGER, RIPPLE_LIFE_DURATION);

        float angle = float(i) * PI * 2.0 / float(MAX_RIPPLES) + RIPPLE_CHAOS * PI;
        vec2 pos = vec2(cos(angle), sin(angle)) * RIPPLE_SPREAD;

        ripples[i] = Ripple(pos, TIME - birthOffset, RIPPLE_BASE_STRENGTH);
    }
    return ripples;
}

vec2 getWaveDistortion(vec2 uv) {
    float distortionX = sin(uv.y * PATTERN_SCALE * 4.0 + TIME * WAVE_SPEED) * 0.003;
    float distortionY = cos(uv.x * PATTERN_SCALE * 4.0 + TIME * WAVE_SPEED) * 0.003;
    return vec2(distortionX, distortionY);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
    vec2 texUV = fragCoord.xy / iResolution.xy;

    vec4 prevColor = getLastFrameColor(texUV);
    vec3 prevHSL = rgb2hsl(prevColor.rgb);

    Ripple[MAX_RIPPLES] ripples = getRipples();

    float totalWave = 0.0;
    for(int i = 0; i < MAX_RIPPLES; i++) {
        totalWave += createRipple(uv, ripples[i]);
    }

    float interference = pow(abs(totalWave), 0.8);
    float brightness = smoothstep(0.1, 0.3, interference);

    vec2 flowOffset = normalize(uv) * interference * 0.001;
    vec4 offsetColor = getLastFrameColor(texUV + flowOffset);
    vec3 offsetHSL = rgb2hsl(offsetColor.rgb);

    vec3 newColorHSL = vec3(
        sin(offsetHSL.x + interference * 0.2 + COLOR_SHIFT),
        COLOR_SATURATION,
        brightness * COLOR_BRIGHTNESS_SCALE
    );

    if(BEAT) {
        vec2 beatPos = vec2(
            cos(RIPPLE_CHAOS * PI) * 0.3,
            sin(WAVE_SPEED * PI) * 0.3
        );
        float beatRipple = createRipple(uv, Ripple(beatPos, TIME, 2.0));
        newColorHSL.x = sin(newColorHSL.x + beatRipple * 0.2);
        newColorHSL.z = min(1.0, newColorHSL.z + beatRipple * BEAT_INTENSITY);
    }

    float blendFactor = 0.15;
    vec3 blendedHSL;

    if(brightness > 0.1) {
        blendedHSL = vec3(
            sin(mix(prevHSL.x, newColorHSL.x, blendFactor)),
            COLOR_SATURATION,
            mix(prevHSL.z * COLOR_PERSISTENCE, newColorHSL.z, blendFactor)
        );
    } else {
        blendedHSL = vec3(
            prevHSL.x,
            max(0.0, prevHSL.y - 0.1),
            prevHSL.z * COLOR_PERSISTENCE * 0.95
        );
    }

    vec3 finalColor = hsl2rgb(blendedHSL);

    float vignette = smoothstep(1.1, 0.3, length(uv));
    finalColor *= vignette;
    finalColor *= smoothstep(0.05, 0.1, brightness);

    fragColor = vec4(finalColor, 1.0);
}
