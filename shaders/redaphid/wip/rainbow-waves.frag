// Audio reactive parameters
#define WAVE_SPEED (spectralFluxZScore * 0.2)
#define PATTERN_SCALE (1.0 + spectralCentroidZScore * 0.2)
#define RIPPLE_CHAOS (spectralCentroidZScore * 0.25)          // How randomly ripples are placed
#define RIPPLE_SPREAD (0.6 + spectralSpreadZScore * 0.2)      // How far from center ripples appear
#define RIPPLE_STRENGTH (1.0 + spectralFluxZScore * 0.5)      // How strong ripples are
#define COLOR_SHIFT (spectralCentroidNormalized * 0.1)        // Base color shift
#define BEAT_INTENSITY (spectralFluxNormalized)               // Beat response strength

// Knob controls
uniform float knob_14;
uniform float knob_15;
uniform float knob_16;

// Constants
#define MAX_RIPPLES 8
#define PERSISTENCE 0.97
#define PI 3.14159265359
#define TIME (iTime/10.)

// Ripple characteristics
#define RIPPLE_COUNT 1
#define RIPPLE_SPEED 0.5
#define RIPPLE_THICKNESS knob_14
#define RIPPLE_DISTANCE_DECAY 0.5
#define RIPPLE_AGE_DECAY knob_15
#define RIPPLE_BIRTH_STAGGER knob_16
#define RIPPLE_LIFE_DURATION 5.0
#define RIPPLE_BASE_STRENGTH 1.0

// Color and blending
#define COLOR_PERSISTENCE 0.97
#define COLOR_SATURATION 0.9
#define COLOR_BRIGHTNESS_SCALE 0.8

// Ripple structure
struct Ripple {
    vec2 center;
    float birth;
    float strength;
};

// Better random function
float random(float seed) {
    return fract(sin(seed * 12.9898 + 78.233) * 43758.5453);
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
    float thickness = RIPPLE_THICKNESS * 0.004;
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

    if(beat) {
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
