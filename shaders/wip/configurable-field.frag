// Configurable Field - Ultra-parameterized shader demonstrating #define knob-to-audio pattern
//
// IMPORTANT: After creating a new shader file, restart the dev server (npm run dev)
//
// TEST URLS:
// Default: ?shader=wip/configurable-field&noaudio=true
// Colorful: ?shader=wip/configurable-field&noaudio=true&knob_1=0.3&knob_2=0.7
// Warpy: ?shader=wip/configurable-field&noaudio=true&knob_3=0.8&knob_6=0.6
// Kaleidoscope: ?shader=wip/configurable-field&noaudio=true&knob_6=0.8

// ============================================================================
// MODE TOGGLE - Uncomment KNOB_MODE for manual testing, comment for audio
// ============================================================================
#define KNOB_MODE

#ifdef KNOB_MODE
uniform float knob_1;  // HUE_SHIFT
uniform float knob_2;  // BRIGHTNESS
uniform float knob_3;  // WARP
uniform float knob_4;  // SCALE
uniform float knob_5;  // SPEED
uniform float knob_6;  // SYMMETRY
uniform float knob_7;  // SATURATION
uniform float knob_8;  // TRAILS
#endif

// ============================================================================
// PARAMETER MAPPINGS - Knobs default to 0, so add base values
// ============================================================================
#ifdef KNOB_MODE
    #define P_HUE      (knob_1)
    #define P_BRIGHT   (0.5 + knob_2 * 0.4)
    #define P_WARP     (0.1 + knob_3 * 0.4)
    #define P_SCALE    (2.0 + knob_4 * 3.0)
    #define P_SPEED    (0.3 + knob_5 * 0.7)
    #define P_SYM      (1.0 + knob_6 * 5.0)
    #define P_SAT      (0.8 + knob_7 * 0.15)
    #define P_TRAILS   (knob_8 * 0.7)
#else
    // AUDIO MODE - features from different domains for variety
    #define P_HUE      (pitchClassNormalized)
    #define P_BRIGHT   (0.5 + trebleNormalized * 0.4)
    #define P_WARP     (0.1 + bassNormalized * 0.4)
    #define P_SCALE    (2.0 + spectralSpreadNormalized * 3.0)
    #define P_SPEED    (0.3 + energyNormalized * 0.7)
    #define P_SYM      (1.0 + spectralCrestNormalized * 5.0)
    #define P_SAT      (0.8 + spectralCentroidNormalized * 0.15)
    #define P_TRAILS   (spectralRolloffNormalized * 0.7)
#endif

#define TAU 6.28318530718

mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 kaleido(vec2 p, float n) {
    float angle = atan(p.y, p.x);
    float r = length(p);
    float seg = TAU / n;
    angle = mod(angle + seg * 0.5, seg) - seg * 0.5;
    return vec2(cos(angle), sin(angle)) * r;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 uvNorm = fragCoord / iResolution.xy;

    float t = iTime * P_SPEED;
    vec2 p = uv;

    // Kaleidoscope
    if (P_SYM > 1.5) {
        p = kaleido(p, floor(P_SYM));
    }

    // Warp
    p += vec2(sin(p.y * 3.0 + t), cos(p.x * 3.0 + t * 1.1)) * P_WARP;

    // Scale and rotate
    p *= P_SCALE;
    p = rot(t * 0.2) * p;

    // Pattern: layered waves
    float pattern = 0.0;
    pattern += sin(p.x * 2.0 + t) * 0.5 + 0.5;
    pattern += sin(p.y * 2.0 - t * 0.7) * 0.5 + 0.5;
    pattern += sin(length(p) * 3.0 - t * 1.5) * 0.5 + 0.5;
    pattern += sin(atan(p.y, p.x) * 3.0 + t * 0.5) * 0.5 + 0.5;
    pattern /= 4.0;

    // Color
    float hue = fract(P_HUE + pattern * 0.3 + t * 0.02);
    float sat = P_SAT;
    float lum = P_BRIGHT * (0.3 + pattern * 0.5);

    vec3 col = hsl2rgb(vec3(hue, sat, lum));

    // Beat flash
    if (beat) col *= 1.2;

    // Trails
    if (P_TRAILS > 0.01) {
        vec3 prev = getLastFrameColor(uvNorm).rgb;
        col = mix(col, prev, P_TRAILS);
    }

    // Soft vignette
    float vig = 1.0 - length(uv) * 0.3;
    col *= clamp(vig, 0.3, 1.0);

    fragColor = vec4(col, 1.0);
}
