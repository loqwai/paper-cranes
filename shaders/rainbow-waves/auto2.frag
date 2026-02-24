// @fullscreen: true
//https://visuals.beadfamous.com/edit?knob_1.min=-1&knob_1.max=1&knob_2=0.22&knob_2.min=-1&knob_2.max=1&knob_5=0.2&knob_5.min=0&knob_5.max=1&knob_6=10.3&knob_6.min=0&knob_6.max=10.3&knob_7=1.05&knob_7.min=0&knob_7.max=3&knob_8=0.46&knob_8.min=0.1&knob_8.max=2.5&knob_10=0.55&knob_10.min=0&knob_10.max=1&knob_9=0.98&knob_9.min=0&knob_9.max=2.8&knob_11=1.743&knob_11.min=0.1&knob_11.max=3.2&knob_12=4.06&knob_12.min=0.1&knob_12.max=10&knob_13=0.55&knob_13.min=0&knob_13.max=1&knob_1=0.1
// Constants
#define MAX_RIPPLES 12
#define PI 3.14159265359
#define TIME (iTime/1000.)
#define BEAT knob_4 > 0.50

// Audio reactive parameters
#define WAVE_SPEED knob_5
#define PATTERN_SCALE mix(0.1,100., sin(animateEaseInExpo(time/1000.)))
#define RIPPLE_CHAOS knob_7      // How randomly ripples are placed
#define RIPPLE_SPREAD knob_7      // How far from center ripples appear
#define RIPPLE_STRENGTH knob_12      // How strong ripples are
#define COLOR_SHIFT animatePulse(time/10000.)       // Base color shift
#define BEAT_INTENSITY mix(0.,100., animateEaseInExpo(cos(time*3.14*2.)))

// Ripple characteristics
#define RIPPLE_SPEED knob_6
#define RIPPLE_THICKNESS mapValue(knob_8, 0., 1., 0.01, fract(time/1000.))
#define RIPPLE_DISTANCE_DECAY mix(0.98, 1.1, animateEaseInOutCubic(sin(time)))
#define RIPPLE_AGE_DECAY mapValue(knob_13, -1.,1., knob_1, knob_2)
#define RIPPLE_BIRTH_STAGGER knob_3
#define RIPPLE_LIFE_DURATION knob_8
#define RIPPLE_BASE_STRENGTH mix(0.12,0.14,animateSmooth(cos(time/10.)))

// Color and blending
#define COLOR_PERSISTENCE knob_5
#define COLOR_SATURATION knob_10
#define COLOR_BRIGHTNESS_SCALE knob_10

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
    plasma += interference * knob_9;
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
    color = mix(color, prevColor.rgb, knob_2);
    // Apply vignette
    float vignette = smoothstep(1.1, 0.3, length(uv));
    // color *= vignette;

    // Ensure colors stay in valid range
    fragColor = vec4(fract(color), 1.0);
}
