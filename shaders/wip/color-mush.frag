//http://localhost:6969/edit.html?knob_0=0.024&knob_0.min=0&knob_0.max=1&knob_1=0.37&knob_1.min=0&knob_1.max=1&knob_2=0.827&knob_2.min=0&knob_2.max=1&knob_3=1&knob_3.min=0&knob_3.max=1&knob_8=0&knob_8.min=0&knob_8.max=1&knob_4=0.906&knob_4.min=0&knob_4.max=1&knob_5=1&knob_5.min=0&knob_5.max=1&knob_6=0.457&knob_6.min=0&knob_6.max=1&knob_7=0.717&knob_7.min=0&knob_7.max=1&knob_9=0.094&knob_9.min=0&knob_9.max=1&knob_10=0.173&knob_10.min=0&knob_10.max=1&knob_11=0.354&knob_11.min=0&knob_11.max=1&knob_15=0.677&knob_15.min=0&knob_15.max=1&knob_14=1&knob_14.min=0&knob_14.max=1&knob_12=0.394&knob_12.min=0&knob_12.max=1&knob_31=0.693&knob_31.min=0&knob_31.max=1&knob_30=0.496&knob_30.min=0&knob_30.max=1&knob_29=0.567&knob_29.min=0&knob_29.max=1&knob_28=0.535&knob_28.min=0&knob_28.max=1&knob_24=0.63&knob_24.min=0&knob_24.max=1&knob_25=0.157&knob_25.min=0&knob_25.max=1&knob_27=0.449&knob_27.min=0&knob_27.max=1&knob_23=0.268&knob_23.min=0&knob_23.max=1&knob_22=0.354&knob_22.min=0&knob_22.max=1&knob_21=0.795&knob_21.min=0&knob_21.max=1&knob_20=0.535&knob_20.min=0&knob_20.max=1&knob_16=1&knob_16.min=0&knob_16.max=1&knob_17=0.898&knob_17.min=0&knob_17.max=1&knob_18=0.795&knob_18.min=0&knob_18.max=1&knob_19=0.543&knob_19.min=0&knob_19.max=1&knob_47=0.567&knob_47.min=0&knob_47.max=1&knob_43=0.449&knob_43.min=0&knob_43.max=1&knob_42=0.402&knob_42.min=0&knob_42.max=1&knob_39=0.315&knob_39.min=0&knob_39.max=1&knob_38=0.307&knob_38.min=0&knob_38.max=1&knob_32=0.386&knob_32.min=0&knob_32.max=1&knob_33=0.315&knob_33.min=0&knob_33.max=1&knob_36=0.276&knob_36.min=0&knob_36.max=1&knob_44=0.409&knob_44.min=0&knob_44.max=1&knob_13=0.709&knob_13.min=0&knob_13.max=1&knob_26=0.378&knob_26.min=0&knob_26.max=1
// Constants
#define MAX_RIPPLES 12
#define PI 3.14159265359
#define TIME (iTime/1000.)
#define BEAT knob_20 > 0.50

// Audio reactive parameters
#define WAVE_SPEED /*knob_1*/ bassZScore*10.
#define PATTERN_SCALE knob_2
#define RIPPLE_CHAOS knob_3      // How randomly ripples are placed
#define RIPPLE_SPREAD /*knob_4*/ (1. - energy)      // How far from center ripples appear
#define RIPPLE_STRENGTH knob_5     // How strong ripples are
#define COLOR_SHIFT mix(0.,0.1, pitchClassMedian)       // Base color shift
#define BEAT_INTENSITY knob_7

// Ripple characteristics
#define RIPPLE_SPEED knob_8
#define RIPPLE_THICKNESS mapValue(knob_9, 0., 1., 0.01, spectralFluxZScore)
#define RIPPLE_DISTANCE_DECAY (1. - energyZScore)
#define RIPPLE_AGE_DECAY mapValue(animateBounce(spectralCentroidZScore), 0.,1., 0.1, animateEaseInQuad(energyZScore))
#define RIPPLE_BIRTH_STAGGER knob_14
#define RIPPLE_LIFE_DURATION knob_15
#define RIPPLE_BASE_STRENGTH knob_16

// Color and blending
#define COLOR_PERSISTENCE knob_17
#define COLOR_SATURATION knob_18
#define COLOR_BRIGHTNESS_SCALE knob_19
#define DISTORTION_SCALE knob_21

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
    float distortionX = sin(uv.y * PATTERN_SCALE * 4.0 + TIME * WAVE_SPEED) * 0.03;
    float distortionY = cos(uv.x * PATTERN_SCALE * 4.0 + TIME * WAVE_SPEED) * 0.03;
    return vec2(distortionX, distortionY);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
    vec2 texUV = fragCoord.xy / iResolution.xy;

    // Calculate ripple effect
    Ripple[MAX_RIPPLES] ripples = getRipples();
    float totalWave = 0.0;
    for(int i = 0; i < MAX_RIPPLES; i++) {
        totalWave += createRipple(uv, ripples[i]);
    }

    float interference = pow(abs(totalWave), 0.8);

    // Enhanced wave distortion
    vec2 distortion = getWaveDistortion(uv);
    vec2 p = uv + distortion * (2.0 + interference * 3.0); // Increased distortion effect

    // Apply wave distortion to sampling coordinates
    vec2 distortedUV = texUV;
    distortedUV += distortion * (1.0 + interference * 2.0);

    // Create more dynamic flow based on ripples
    vec2 rippleFlow = vec2(0.0);
    for(int i = 0; i < MAX_RIPPLES; i++) {
        vec2 toCenter = uv - ripples[i].center;
        float dist = length(toCenter);
        float age = TIME - ripples[i].birth;
        float strength = exp(-dist * RIPPLE_DISTANCE_DECAY) * exp(-age * RIPPLE_AGE_DECAY);
        rippleFlow += normalize(toCenter) * strength * 0.01;
    }

    // Combine wave distortion with ripple flow
    vec2 finalOffset = distortion + rippleFlow * interference * 0.6;
    vec2 sampleUV = fract(texUV + finalOffset * 0.4);
    vec4 prevColor = getLastFrameColor(sampleUV);

    // Create plasma-like base color
    float v1 = sin(p.x * 3.0 + TIME * WAVE_SPEED);
    float v2 = sin(p.y * 3.0 + TIME * WAVE_SPEED * 0.8);
    float v3 = sin((p.x + p.y) * 2.0 + TIME * WAVE_SPEED * 1.2);
    float v4 = sin(length(p) * 4.0 - TIME * WAVE_SPEED);

    float plasma = (v1 + v2 + v3 + v4) * 0.25;
    plasma = plasma * 0.5 + 0.5;

    // Add stronger ripple influence
    plasma += interference * knob_75;
    plasma = plasma * 0.5 + 0.25;

    // Create base color from plasma
    vec3 baseHSL = fract(vec3(
        fract(plasma + COLOR_SHIFT),
        COLOR_SATURATION,
        0.5 + interference * 0.5  // Increased interference influence
    ));

    // Enhanced beat response
    if(BEAT) {
        vec2 beatPos = vec2(
            cos(RIPPLE_CHAOS * PI) * 0.3,
            sin(WAVE_SPEED * PI) * 0.3
        );
        float beatRipple = createRipple(uv, Ripple(beatPos, TIME, 2.0));
        baseHSL.x = fract(baseHSL.x + beatRipple * 0.2);
        baseHSL.z = fract(baseHSL.z + beatRipple * BEAT_INTENSITY);

        // Add extra wave distortion during beats
        p += beatRipple * distortion * 2.0;
    }

    vec3 baseColor = hsl2rgb(baseHSL);

    // Add depth variation based on wave pattern
    float depth = sin(length(p) * 3.0 - TIME) * 0.5 + 0.5;
    baseColor *= 0.8 + depth * 0.4;

    // Enhanced wave pattern visibility through color modulation
    float wavePattern = sin(totalWave * 5.0) * 0.5 + 0.5;
    baseColor *= 0.8 + wavePattern * 0.4;
    baseColor = fract(baseColor);
    // Blend with previous frame for smooth trails
    float trailStrength = 0.7 + interference * 0.02; // Dynamic trail strength
    vec3 color = hslmix(baseColor, prevColor.rgb, trailStrength);
    color = mix(color, prevColor.rgb, knob_15);
    // Apply vignette
    float vignette = smoothstep(1.1, 0.3, length(uv));
    // color *= vignette;

    // Ensure colors stay in valid range
    fragColor = vec4(fract(color), 1.0);
}
