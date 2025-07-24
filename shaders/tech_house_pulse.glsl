// Tech House Pulse Shader
// Features rhythmic pulsing, combined SDFs, and a blue/purple/gold palette.
// Controlled by knob_1 to knob_15.

// --- Audio Feature Mappings (Tech House Vampire Edition) ---
// Designed for 4/4 tech house patterns at 125-130 BPM
#define BASS_INTENSITY knob_1        // 0-1, sub and bass frequencies
#define KICK_DETECTION knob_2        // 0-1, kick drum transients
#define MID_PRESENCE knob_3          // 0-1, synth and vocal range
#define HIGH_SPARKLE knob_4          // 0-1, hi-hats and cymbals
#define OVERALL_ENERGY knob_5        // 0-1, total energy level
#define SPECTRAL_BRIGHTNESS knob_6   // 0-1, brightness of sound
#define TEMPO_SYNC knob_7            // 0-1, BPM sync (125 BPM = 0.893)
#define DROP_MOMENT knob_8           // 0/1, drop detection
#define VOCAL_PRESENCE knob_9        // 0-1, vocal frequencies
#define SUB_BASS knob_10             // 0-1, deep sub frequencies

// --- Visual Parameter Mappings ---
// Tech house specific mappings for hypnotic visuals
#define TIME_SCALE (0.05 + TEMPO_SYNC * 1.0) // Locked to BPM
#define PULSE_SPEED (TEMPO_SYNC * 10.0) // Rhythmic pulse at beat rate
#define PULSE_INTENSITY (KICK_DETECTION * 0.3) // Kick drives the pulse
#define REPEAT_FREQ (mix(1.5, 8.0, MID_PRESENCE)) // Synths control repetition
#define TWIST_FACTOR (BASS_INTENSITY * 4.0) // Bass creates twist
#define SHAPE_MIX (SPECTRAL_BRIGHTNESS) // Brightness morphs shapes
#define SMOOTH_FACTOR (mix(0.05, 0.6, 1.0 - HIGH_SPARKLE)) // Hi-hats sharpen edges
#define NOISE_AMOUNT (VOCAL_PRESENCE * 0.15) // Vocals add texture
#define NOISE_FREQ (mix(1.0, 12.0, knob_9)) // Texture frequency
#define COLOR_PATTERN_FREQ (mix(0.5, 6.0, OVERALL_ENERGY)) // Energy drives color changes
#define BLUE_PURPLE_BIAS (DROP_MOMENT * 0.2) // Drop shifts to purple
#define GOLD_AMOUNT (HIGH_SPARKLE) // Gold accents from cymbals
#define LIGHTNESS_SATURATION (OVERALL_ENERGY) // Energy controls vibrancy
#define RIM_INTENSITY (SUB_BASS * 1.5) // Deep bass creates rim glow
#define GLOBAL_SCALE (mix(0.6, 1.8, 1.0 - KICK_DETECTION * 0.3)) // Kick makes it contract

// --- Constants ---
#define MAX_STEPS 80
#define BG_BRIGHTNESS 0.05
#define BLUE_HUE (0.65 + BLUE_PURPLE_BIAS) // Base HSL Hue for Blue/Purple (~0.65 to ~0.85)
#define GOLD_HUE 0.13                    // Base HSL Hue for Gold (~0.13)

// --- Utility Functions ---
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    // Desaturate colors slightly for a more tech/metallic feel
    // return mix(vec3(0.5), rgb, c.y) * c.z * 2.0; // Alternative formula
     return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Noise (simple hash based) - consider replacing with simplex/perlin if needed
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f); // smoothstep

    vec2 uv = (p.xy + vec2(37.0, 17.0) * p.z) + f.xy;
    vec2 rg = vec2(hash(uv + vec2(0.0, 0.0)), hash(uv + vec2(1.0, 0.0)));
    vec2 rg2 = vec2(hash(uv + vec2(0.0, 1.0)), hash(uv + vec2(1.0, 1.0)));

    return mix(mix(rg.x, rg.y, f.x), mix(rg2.x, rg2.y, f.x), f.y);
}

float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    float freq = NOISE_FREQ;
    for (int i = 0; i < 4; i++) {
        f += amp * noise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return f;
}

// --- SDF (Signed Distance Function) ---
float sdSphere(vec3 p, float s) { return length(p) - s; }
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
vec3 opRep(vec3 p, vec3 c) { return mod(p + 0.5 * c, c) - 0.5 * c; }
vec3 opTwist(vec3 p, float k) {
    float c = cos(k * p.y); float s = sin(k * p.y);
    mat2 m = mat2(c, -s, s, c);
    return vec3(m * p.xz, p.y);
}

// Main scene SDF
float map(vec3 p) {
    float time = iTime * TIME_SCALE;
    float pulse = 0.5 + 0.5 * sin(iTime * PULSE_SPEED); // 0 to 1 pulse wave
    float currentPulse = pulse * PULSE_INTENSITY;

    // Apply global scale and pulse effect on scale
    p /= (GLOBAL_SCALE * (1.0 + currentPulse * 0.5)); // Pulse affects size

    // Apply twist (can also be modulated by pulse)
    p = opTwist(p, TWIST_FACTOR + currentPulse * 2.0); // Pulse affects twist

    // Domain repetition
    vec3 pRep = opRep(p, vec3(REPEAT_FREQ));

    // Base shapes: Mix between sphere and box
    float dSphere = sdSphere(pRep, 0.4);
    float dBox = sdBox(pRep, vec3(0.35));
    float d = mix(dSphere, dBox, SHAPE_MIX); // Knob controls shape

    // Combine with another shape using smin for complexity
    // E.g., subtract a smaller sphere
     float dSubtract = sdSphere(pRep + vec3(0.1, 0.2, -0.1) * sin(time*0.5), 0.2);
     // d = max(d, -dSubtract); // Subtraction
    // Or smooth union with another box
     float dBox2 = sdBox(pRep + vec3(0.2, -0.1, 0.1), vec3(0.2));
     d = smin(d, dBox2, SMOOTH_FACTOR);

    // Add noise deformation, modulated by pulse
    d += fbm(p * NOISE_FREQ + vec3(0.0, time * 0.1, 0.0)) * NOISE_AMOUNT * (1.0 + currentPulse);

    // Re-apply global scale
    return d * GLOBAL_SCALE * (1.0 + currentPulse * 0.5);
}

// --- Normal Calculation ---
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(1.0, -1.0) * 0.5773 * 0.001; // Slightly larger epsilon might be needed for complex shapes
    return normalize(
        e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
        e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx)
    );
}

// --- Main Rendering ---
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    vec3 col = vec3(0.0);

    // Camera setup
    vec3 ro = vec3(0.0, 0.0, 3.5); // Slightly further back
    vec3 rd = normalize(vec3(uv, -1.2)); // Adjust FOV slightly

    // Raymarching
    float t = 0.0; float d = 0.0; vec3 p = ro;
    for (int i = 0; i < MAX_STEPS; i++) {
        p = ro + rd * t;
        d = map(p);
        if (abs(d) < 0.001 || t > 15.0) break;
        t += d * 0.7;
    }

    // Shading
    if (abs(d) < 0.001) {
        vec3 nor = calcNormal(p);
        vec3 lightDir = normalize(vec3(0.8, 0.6, 0.9)); // Slightly different light direction

        // Lighting
        float diffuse = max(dot(nor, lightDir), 0.0);
        float ambient = 0.2;
        float rim = pow(1.0 - max(dot(nor, -rd), 0.0), 3.0) * RIM_INTENSITY; // Sharper rim power

        // Color calculation
        float baseHue = BLUE_HUE;
        float colorNoise = noise(p * COLOR_PATTERN_FREQ + vec3(iTime * 0.1)); // Noise for color variation
        float currentLightness = (0.3 + 0.4 * LIGHTNESS_SATURATION) * (diffuse + ambient);
        float currentSaturation = 0.6 + 0.4 * LIGHTNESS_SATURATION;

        // Base Blue/Purple Color
        vec3 baseHsl = vec3(baseHue + colorNoise * 0.1, currentSaturation, currentLightness); // Add noise to hue slightly
        vec3 baseRgb = hsl2rgb(baseHsl);

        // Gold Highlights - mix based on light angle and noise
        float goldMix = smoothstep(0.5, 0.8, diffuse) * GOLD_AMOUNT * (0.5 + 0.5 * colorNoise);
        vec3 goldHsl = vec3(GOLD_HUE, currentSaturation * 0.8, currentLightness * 1.2); // Gold is often brighter/less saturated
        vec3 goldRgb = hsl2rgb(goldHsl);

        col = mix(baseRgb, goldRgb, goldMix);

        // Add rim lighting (additive, using base color)
        col += baseRgb * rim;

        // Add simple fog
        col = mix(col, vec3(BG_BRIGHTNESS), smoothstep(3.0, 10.0, t));

    } else {
        // Background - Dark blue/purple gradient
        col = vec3(BG_BRIGHTNESS) * mix(vec3(0.3, 0.2, 0.8), vec3(0.1, 0.1, 0.3), uv.y * 0.5 + 0.5);
    }

    // Gamma correction / Tone mapping
    col = pow(col, vec3(0.4545));
    col = clamp(col, 0.0, 1.0); // Clamp final color

    fragColor = vec4(col, 1.0);
}

// Boilerplate main
void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}
