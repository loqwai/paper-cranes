//http://localhost:6969/edit.html?knob_30=7.583&knob_30.min=0&knob_30.max=10.7&knob_31=1.257&knob_31.min=0&knob_31.max=8.4&knob_32=0.198&knob_32.min=0&knob_32.max=0.6&knob_33=3.928&knob_33.min=0&knob_33.max=4.3&knob_34=0.228&knob_34.min=0&knob_34.max=1&knob_35=0.559&knob_35.min=0&knob_35.max=1&knob_36=11.024&knob_36.min=0&knob_36.max=11.2&knob_37=0&knob_37.min=0&knob_37.max=1&knob_45=1&knob_45.min=0&knob_45.max=1&knob_11=0.63&knob_11.min=0&knob_11.max=1&knob_43=0.291&knob_43.min=0&knob_43.max=1&knob_22=0.866&knob_22.min=0&knob_22.max=10&knob_3=3.583&knob_3.min=0&knob_3.max=11.1&knob_4=2.796&knob_4.min=0&knob_4.max=5.3&knob_44=1&knob_44.min=0&knob_44.max=1&knob_42=0.591&knob_42.min=0&knob_42.max=1&knob_26=0&knob_26.min=0&knob_26.max=1&knob_27=0&knob_27.min=0&knob_27.max=1&knob_46=0.795&knob_46.min=0&knob_46.max=1&knob_47=0.469&knob_47.min=0&knob_47.max=11.9
//http://localhost:6969/edit.html?knob_30=0.59&knob_30.min=0&knob_30.max=10.7&knob_31=0&knob_31.min=0&knob_31.max=19.2&knob_32=0.397&knob_32.min=0&knob_32.max=0.6&knob_33=3.487&knob_33.min=0&knob_33.max=4.3&knob_34=0.717&knob_34.min=0&knob_34.max=1&knob_35=0.583&knob_35.min=0&knob_35.max=1&knob_36=1.676&knob_36.min=0&knob_36.max=11.2&knob_37=1&knob_37.min=0&knob_37.max=1&knob_45=1&knob_45.min=0&knob_45.max=1&knob_11=0.496&knob_11.min=0&knob_11.max=1&knob_43=0.417&knob_43.min=0&knob_43.max=1&knob_22=34.3&knob_22.min=0&knob_22.max=34.3&knob_3=5.943&knob_3.min=0&knob_3.max=11.1&knob_4=1.878&knob_4.min=0&knob_4.max=5.3&knob_44=1&knob_44.min=0&knob_44.max=1&knob_42=0.583&knob_42.min=0&knob_42.max=1&knob_26=0&knob_26.min=0&knob_26.max=1&knob_27=0&knob_27.min=0&knob_27.max=1&knob_46=0.866&knob_46.min=0&knob_46.max=1&knob_47=5.528&knob_47.min=0&knob_47.max=11.9&knob_23=0&knob_23.min=0&knob_23.max=1
// http://localhost:6969/edit.html?knob_30=0&knob_30.min=0&knob_30.max=10.7&knob_31=0&knob_31.min=0&knob_31.max=2&knob_32=0&knob_32.min=0&knob_32.max=0.6&knob_33=1.287&knob_33.min=0&knob_33.max=4.3&knob_34=0.78&knob_34.min=0&knob_34.max=1&knob_35=0.85&knob_35.min=0&knob_35.max=1&knob_36=1.058&knob_36.min=0&knob_36.max=11.2&knob_37=1&knob_37.min=0&knob_37.max=1&knob_45=1&knob_45.min=0&knob_45.max=1&knob_11=0.409&knob_11.min=0&knob_11.max=1&knob_43=0.417&knob_43.min=0&knob_43.max=1&knob_22=5.131&knob_22.min=0&knob_22.max=34.3&knob_3=5.594&knob_3.min=0&knob_3.max=11.1&knob_4=2.295&knob_4.min=0&knob_4.max=5.3&knob_44=1&knob_44.min=0&knob_44.max=1&knob_42=0.575&knob_42.min=0&knob_42.max=1&knob_26=0&knob_26.min=0&knob_26.max=1&knob_27=0&knob_27.min=0&knob_27.max=1&knob_46=0.622&knob_46.min=0&knob_46.max=1&knob_47=4.31&knob_47.min=0&knob_47.max=11.9&knob_23=0&knob_23.min=0&knob_23.max=1
// Knob controls
uniform float knob_30;
uniform float knob_31;
uniform float knob_32;
uniform float knob_33;
uniform float knob_34;
uniform float knob_35;
uniform float knob_36;
uniform float knob_37;
uniform float knob_22;
uniform float knob_23;

uniform float knob_40;
uniform float knob_41;
uniform float knob_42;
uniform float knob_43;
uniform float knob_44;
uniform float knob_45;
uniform float knob_46;
uniform float knob_47;
// Constants
#define MAX_RIPPLES 12
#define PI 3.14159265359
#define TIME (iTime/10.)
#define BEAT knob_23 > 50.

// Audio reactive parameters
#define WAVE_SPEED knob_40
#define PATTERN_SCALE knob_41
#define RIPPLE_CHAOS knob_42      // How randomly ripples are placed
#define RIPPLE_SPREAD knob_43      // How far from center ripples appear
#define RIPPLE_STRENGTH knob_44      // How strong ripples are
#define COLOR_SHIFT knob_45       // Base color shift
#define BEAT_INTENSITY knob_46

// Ripple characteristics
#define RIPPLE_SPEED knob_36
#define RIPPLE_THICKNESS knob_30
#define RIPPLE_DISTANCE_DECAY knob_33
#define RIPPLE_AGE_DECAY knob_31
#define RIPPLE_BIRTH_STAGGER knob_32
#define RIPPLE_LIFE_DURATION knob_47
#define RIPPLE_BASE_STRENGTH knob_22

// Color and blending
#define COLOR_PERSISTENCE knob_35
#define COLOR_SATURATION knob_37
#define COLOR_BRIGHTNESS_SCALE knob_34

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
        fract(offsetHSL.x + interference * 0.2 + COLOR_SHIFT),
        COLOR_SATURATION,
        brightness * COLOR_BRIGHTNESS_SCALE
    );

    if(BEAT) {
        vec2 beatPos = vec2(
            cos(RIPPLE_CHAOS * PI) * 0.3,
            sin(WAVE_SPEED * PI) * 0.3
        );
        float beatRipple = createRipple(uv, Ripple(beatPos, TIME, 2.0));
        newColorHSL.x = fract(newColorHSL.x + beatRipple * 0.2);
        newColorHSL.z = min(1.0, newColorHSL.z + beatRipple * BEAT_INTENSITY);
    }

    float blendFactor = 0.15;
    vec3 blendedHSL;

    if(brightness > 0.1) {
        blendedHSL = vec3(
            fract(mix(prevHSL.x, newColorHSL.x, blendFactor)),
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
