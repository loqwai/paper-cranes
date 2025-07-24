// Tech House Spectrum
// Layered frequency domain visualization with multiple color zones
// Blues, purples and gold with audio reactivity

// --- Audio Feature Mappings (Spectrum Analysis Edition) ---
// Visualizes the frequency spectrum as tech house patterns
#define BASS_INTENSITY knob_1        // 0-1, low frequency band
#define KICK_DETECTION knob_2        // 0-1, kick drum transients
#define MID_PRESENCE knob_3          // 0-1, mid frequency band
#define HIGH_SPARKLE knob_4          // 0-1, high frequency band
#define OVERALL_ENERGY knob_5        // 0-1, total spectral energy
#define SPECTRAL_BRIGHTNESS knob_6   // 0-1, spectral centroid
#define TEMPO_SYNC knob_7            // 0-1, tempo synchronization
#define DROP_MOMENT knob_8           // 0/1, drop detection
#define VOCAL_PRESENCE knob_9        // 0-1, vocal frequency detection
#define SUB_BASS knob_10             // 0-1, sub-bass frequencies

// --- Visual Parameter Mappings ---
// Spectrum visualization driven by audio
#define BASE_SPEED (0.2 + TEMPO_SYNC * 2.0) // Speed locked to BPM
#define COLOR_INTENSITY (0.5 + OVERALL_ENERGY * 1.5) // Energy brightens colors
#define AUDIO_REACTIVITY (MID_PRESENCE * 1.2) // Mids drive reactivity
#define FRACTAL_DETAIL (1.0 + floor(HIGH_SPARKLE * 3.0)) // Highs add detail
#define PATTERN_SCALE (1.0 + BASS_INTENSITY * 8.0) // Bass scales pattern
#define PATTERN_DISTORTION (KICK_DETECTION * 0.8) // Kick distorts waves
#define BLUE_THRESHOLD (0.2 + TEMPO_SYNC * 0.4) // Blue zone synced to beat
#define PURPLE_THRESHOLD (0.6 + DROP_MOMENT * 0.3) // Purple during drops
#define GOLD_THRESHOLD (0.85 + VOCAL_PRESENCE * 0.1) // Gold for vocals
#define SECONDARY_PATTERN (SUB_BASS * 0.8) // Sub-bass overlay
#define ROTATION_SPEED (SPECTRAL_BRIGHTNESS * 0.6 - 0.3) // Brightness rotates
#define EDGE_INTENSITY (HIGH_SPARKLE * 2.0) // Highs highlight edges
#define SYMMETRY (1.0 + floor(knob_13 * 7.0)) // Radial symmetry control
#define ZOOM_PULSE (KICK_DETECTION * 0.3) // Kick creates zoom pulse
#define COLOR_SHIFT (OVERALL_ENERGY * 0.5) // Energy shifts colors

// --- Color Palette ---
#define DEEP_BLUE vec3(0.0, 0.1, 0.5)
#define MID_BLUE vec3(0.1, 0.3, 0.8)
#define BRIGHT_BLUE vec3(0.0, 0.6, 1.0)
#define DEEP_PURPLE vec3(0.3, 0.0, 0.5)
#define MID_PURPLE vec3(0.5, 0.0, 0.8)
#define BRIGHT_PURPLE vec3(0.7, 0.3, 1.0)
#define GOLD vec3(1.0, 0.7, 0.2)
#define BRIGHT_GOLD vec3(1.0, 0.9, 0.3)
#define DARK_BG vec3(0.01, 0.02, 0.05)

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// Fractional Brownian Motion
float fbm(vec2 uv, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for(int i = 0; i < octaves; i++) {
        // Use simple value noise
        vec2 p = uv * frequency;
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f); // Smooth interpolation

        // Get corner values
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));

        // Bilinear interpolation
        float result = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);

        value += amplitude * result;
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return value;
}

mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

// Main pattern function
float techPattern(vec2 uv, float time) {
    // Apply zoom pulse based on beat/energy
    float pulse = 0.5 + 0.5 * sin(time * 0.5);
    float zoomFactor = 1.0 + ZOOM_PULSE * pulse * (0.5 + 0.5 * spectralFluxNormalized);
    uv *= zoomFactor;

    // Apply rotation with audio-reactive speed modification
    float rotSpeed = ROTATION_SPEED + spectralCentroidNormalized * 0.2 * AUDIO_REACTIVITY;
    uv = rotate2D(time * rotSpeed) * uv;

    // Apply symmetry - create multiple copies around circle
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    float symmetryAngle = 3.14159 * 2.0 / SYMMETRY;
    angle = mod(angle, symmetryAngle);
    if (mod(floor(angle / symmetryAngle), 2.0) == 1.0) {
        angle = symmetryAngle - angle;
    }
    uv = vec2(cos(angle), sin(angle)) * radius;

    // Apply distortion based on audio features
    float distortAmount = PATTERN_DISTORTION * (1.0 + spectralFluxNormalized * AUDIO_REACTIVITY);
    uv.x += sin(uv.y * 4.0 + time) * distortAmount * 0.3;
    uv.y += sin(uv.x * 3.0 + time * 0.7) * distortAmount * 0.2;

    // Main pattern - frequency domain style visualization
    vec2 patternUV = uv * PATTERN_SCALE;

    // Create base pattern using FBM with detail controlled by knob
    int octaves = int(FRACTAL_DETAIL);
    float pattern = fbm(patternUV, octaves);

    // Add concentric rings with audio modulation
    float rings = sin(length(uv) * (5.0 + spectralCentroidNormalized * 5.0 * AUDIO_REACTIVITY) - time);
    pattern = mix(pattern, 0.5 + 0.5 * rings, 0.4);

    // Add radial lines component
    float radialLines = 0.5 + 0.5 * sin(atan(uv.y, uv.x) * (10.0 + floor(trebleNormalized * 10.0 * AUDIO_REACTIVITY)) + time * 0.5);
    pattern = mix(pattern, radialLines, 0.3);

    // Add secondary crosshatch pattern
    float secondaryPattern = 0.0;
    if (SECONDARY_PATTERN > 0.1) {
        vec2 rotUV = rotate2D(time * -0.2) * uv;
        float grid1 = 0.5 + 0.5 * sin(rotUV.x * 20.0);
        float grid2 = 0.5 + 0.5 * sin(rotUV.y * 20.0);
        secondaryPattern = mix(grid1, grid2, 0.5) * SECONDARY_PATTERN;

        // Blend with main pattern
        pattern = mix(pattern, pattern * secondaryPattern, SECONDARY_PATTERN);
    }

    // Add pulsing based on beat detection
    if (beat) {
        pattern *= 1.1; // Slight boost on beat
    }

    // Add edge effect - derivative-based edge detection
    float edge = 0.0;
    if (EDGE_INTENSITY > 0.1) {
        float eps = 0.01;
        float patternX1 = fbm(patternUV + vec2(eps, 0.0), octaves);
        float patternY1 = fbm(patternUV + vec2(0.0, eps), octaves);

        // Compute gradient magnitude
        edge = length(vec2(patternX1 - pattern, patternY1 - pattern)) / eps;
        edge = smoothstep(0.1, 0.5, edge) * EDGE_INTENSITY;
    }

    return clamp(pattern + edge, 0.0, 1.0);
}

// Color mapping function
vec3 mapColor(float value, float time) {
    // Base thresholds with slight animation
    float blueThresh = BLUE_THRESHOLD + sin(time * 0.3) * 0.05;
    float purpleThresh = PURPLE_THRESHOLD + sin(time * 0.4) * 0.05;
    float goldThresh = GOLD_THRESHOLD + sin(time * 0.5) * 0.05;

    // Dynamic color shift based on audio features
    float dynShift = COLOR_SHIFT * spectralEntropyNormalized;

    vec3 color;

    // Multi-zone color mapping - different colors for different value ranges
    if (value < blueThresh) {
        // Deep blue to bright blue gradient in lower range
        float t = value / blueThresh;
        color = mix(DARK_BG, mix(DEEP_BLUE, MID_BLUE, t), t * 2.0);
    }
    else if (value < purpleThresh) {
        // Blue to purple transition in mid range
        float t = (value - blueThresh) / (purpleThresh - blueThresh);
        color = mix(MID_BLUE, mix(DEEP_PURPLE, MID_PURPLE, t), t);
    }
    else if (value < goldThresh) {
        // Purple to bright purple in upper-mid range
        float t = (value - purpleThresh) / (goldThresh - purpleThresh);
        color = mix(MID_PURPLE, BRIGHT_PURPLE, t);
    }
    else {
        // Gold highlights in highest range
        float t = (value - goldThresh) / (1.0 - goldThresh);
        color = mix(BRIGHT_PURPLE, mix(GOLD, BRIGHT_GOLD, t), t);
    }

    // Add color variations based on position (similar to spectrum display)
    color += dynShift * vec3(sin(value * 6.28), sin(value * 6.28 + 2.09), sin(value * 6.28 + 4.18));

    // Apply overall intensity
    color *= COLOR_INTENSITY;

    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalized coordinates
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);

    // Time variable with base speed
    float time = iTime * BASE_SPEED;

    // Generate main pattern
    float pattern = techPattern(uv, time);

    // Map to color
    vec3 color = mapColor(pattern, time);

    // Add subtle vignette
    float vignette = 1.0 - smoothstep(0.5, 1.5, length(uv));
    color *= mix(0.8, 1.0, vignette);

    // Add audio-reactive brightness pulse
    float energyPulse = 1.0 + energyNormalized * AUDIO_REACTIVITY * 0.5;
    color *= energyPulse;

    // Gamma correction
    color = pow(color, vec3(0.4545));

    // Final output
    fragColor = vec4(color, 1.0);
}

// Standard entry point
void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}
