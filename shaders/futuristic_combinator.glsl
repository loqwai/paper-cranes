// Futuristic Combinator Shader
// Uses raymarching with domain repetition, twist, and noise.
// Controlled by knob_1 to knob_15.

// --- Audio Feature Mappings (Vampire Rave Edition) ---
// These parameters simulate audio-reactive behavior
#define BASS_INTENSITY knob_1        // 0-1, low frequency power (20-250Hz)
#define KICK_DETECTION knob_2        // 0-1, transient spike detection
#define MID_PRESENCE knob_3          // 0-1, melodic content (250Hz-4kHz)
#define HIGH_SPARKLE knob_4          // 0-1, cymbal/hi-hat energy (4kHz+)
#define OVERALL_ENERGY knob_5        // 0-1, total spectral energy
#define SPECTRAL_BRIGHTNESS knob_6   // 0-1, spectral centroid normalized
#define TEMPO_SYNC knob_7            // 0-1, BPM/140 for sync to beat
#define DROP_MOMENT knob_8           // 0/1, binary drop detector
#define VOCAL_PRESENCE knob_9        // 0-1, mid-range vocal detection
#define SUB_BASS knob_10             // 0-1, below 60Hz rumble

// --- Visual Parameter Mappings ---
// Map audio features to visual effects
#define TIME_SCALE (0.1 + TEMPO_SYNC * 2.0) // Animation speed synced to BPM
#define SHAPE_ITERATIONS (1.0 + floor(OVERALL_ENERGY * 8.0)) // Complexity based on energy
#define REPEAT_FREQ (mix(1.0, 10.0, MID_PRESENCE)) // Domain repetition follows melody
#define TWIST_FACTOR (BASS_INTENSITY * 5.0) // Bass controls twisting
#define GLOBAL_SCALE (mix(0.5, 2.0, KICK_DETECTION * 0.5 + 0.5)) // Kick makes it pulse
#define MAX_STEPS int(mix(32.0, 128.0, knob_6)) // Quality setting
#define SMOOTH_FACTOR (mix(0.01, 0.5, 1.0 - HIGH_SPARKLE)) // Highs make it sharper
#define COLOR_HUE_BASE (DROP_MOMENT * 0.1 + SPECTRAL_BRIGHTNESS * 0.8) // Color follows brightness
#define COLOR_HUE_RANGE (VOCAL_PRESENCE * 0.5) // Vocals add color variation
#define COLOR_SATURATION (mix(0.5, 1.0, OVERALL_ENERGY)) // Energy increases saturation
#define COLOR_LIGHTNESS (mix(0.3, 0.7, SPECTRAL_BRIGHTNESS)) // Brightness follows spectrum
#define RIM_INTENSITY (HIGH_SPARKLE * 2.0) // Rim lighting from highs
#define BG_BRIGHTNESS (SUB_BASS * 0.2) // Background pulses with sub-bass
#define NOISE_AMOUNT (knob_14 * 0.2) // Surface texture
#define NOISE_FREQ (mix(1.0, 8.0, knob_15)) // Noise frequency


// --- Utility Functions ---

// Basic HSL to RGB conversion
vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

// Smooth minimum function
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Rotation matrix
mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Noise function (replace with a better one if available)
float noise(vec3 p) {
     // Simple pseudo-random noise (replace with Simplex/Perlin if possible)
    return fract(sin(dot(p, vec3(12.9898, 78.233, 151.7182))) * 43758.5453);
}

// Fractional Brownian Motion
float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    vec3 pp = p * NOISE_FREQ;
    for (int i = 0; i < 4; i++) {
        f += amp * noise(pp);
        pp *= 2.0;
        amp *= 0.5;
    }
    return f;
}


// --- SDF (Signed Distance Function) ---

// Basic sphere SDF
float sdSphere(vec3 p, float s) {
    return length(p) - s;
}

// Box SDF
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Domain repetition
vec3 opRep(vec3 p, vec3 c) {
    return mod(p + 0.5 * c, c) - 0.5 * c;
}

// Twist operation
vec3 opTwist(vec3 p, float k) {
    float c = cos(k * p.y);
    float s = sin(k * p.y);
    mat2 m = mat2(c, -s, s, c);
    vec3 q = vec3(m * p.xz, p.y);
    return q;
}

// Main scene SDF
float map(vec3 p) {
    float time = iTime * TIME_SCALE;

    // Apply global scale
    p /= GLOBAL_SCALE;

    // Apply twist
    p = opTwist(p, TWIST_FACTOR);

    // Apply domain repetition
    vec3 pRep = opRep(p, vec3(REPEAT_FREQ));

    // Base shape (e.g., a smoothed combination of sphere and box)
    // float d = sdSphere(pRep, 0.5);
     float d = sdBox(pRep, vec3(0.4));
    // float d = smin(sdSphere(pRep, 0.5), sdBox(pRep, vec3(0.4)), SMOOTH_FACTOR); // Example smooth combination

    // Add noise deformation
    d += fbm(p * NOISE_FREQ + time * 0.1) * NOISE_AMOUNT;

    // Iterative refinement/fractal-like detail (optional)
    // float scale = 1.0;
    // for(int i=0; i < int(SHAPE_ITERATIONS); i++){
         // pRep = opRep(pRep * 1.5 + 0.1*sin(time*0.5 + float(i)), vec3(REPEAT_FREQ*0.8)); // Modify pRep iteratively
         // d = smin(d, sdSphere(pRep, 0.2 / scale), SMOOTH_FACTOR / scale);
         // scale *= 1.5;
    // }

    // Re-apply global scale to distance
    return d * GLOBAL_SCALE;
}

// --- Normal Calculation ---
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(1.0, -1.0) * 0.5773 * 0.0005; // Epsilon value for finite differencing
    return normalize(
        e.xyy * map(p + e.xyy) +
        e.yyx * map(p + e.yyx) +
        e.yxy * map(p + e.yxy) +
        e.xxx * map(p + e.xxx)
    );
}

// --- Main Rendering ---
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    vec3 col = vec3(0.0);

    // Camera setup
    vec3 ro = vec3(0.0, 0.0, 3.0); // Ray origin (camera position)
    vec3 rd = normalize(vec3(uv, -1.0)); // Ray direction

    // Raymarching
    float t = 0.0; // Distance traveled along the ray
    float d = 0.0; // Signed distance to the surface
    vec3 p = ro; // Current point along the ray

    for (int i = 0; i < MAX_STEPS; i++) {
        p = ro + rd * t;
        d = map(p);
        if (d < 0.001 || t > 10.0) break; // Hit or miss
        t += d * 0.7; // Advance ray (use a factor slightly less than 1 for safety)
    }

    // Shading
    if (d < 0.001) { // If we hit the surface
        vec3 nor = calcNormal(p);
        vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0)); // Simple directional light

        // Basic lighting
        float diffuse = max(dot(nor, lightDir), 0.0);
        float ambient = 0.3;

        // Rim lighting
        float rim = pow(1.0 - max(dot(nor, -rd), 0.0), 2.0) * RIM_INTENSITY;

        // Color calculation using HSL
        float hue = COLOR_HUE_BASE + sin(p.y * 2.0 + iTime * TIME_SCALE * 0.5) * COLOR_HUE_RANGE; // Vary hue based on position/time
        vec3 hslCol = vec3(hue, COLOR_SATURATION, COLOR_LIGHTNESS * (diffuse + ambient) + rim);
        col = hsl2rgb(hslCol);

        // Add some fog based on distance
        col = mix(col, vec3(BG_BRIGHTNESS), smoothstep(3.0, 8.0, t));

    } else {
        // Background gradient
        col = vec3(uv.y * 0.5 + 0.5) * BG_BRIGHTNESS * vec3(0.8, 0.9, 1.0); // Cool gradient
    }

    // Gamma correction (approx)
    col = pow(col, vec3(0.4545));

    fragColor = vec4(col, 1.0);
}
