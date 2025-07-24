// Tech House Grid - 2D Cellular Grid with Pulse
// A clean grid-based pattern with pulsing cells and precise color shifts

// --- Audio Feature Mappings (Grid Rave Edition) ---
// Grid patterns that respond to tech house grooves
#define BASS_INTENSITY knob_1        // 0-1, bass drives grid scale
#define KICK_DETECTION knob_2        // 0-1, kick drum hits
#define MID_PRESENCE knob_3          // 0-1, melodic elements
#define HIGH_SPARKLE knob_4          // 0-1, hi-hat patterns
#define OVERALL_ENERGY knob_5        // 0-1, total energy
#define SPECTRAL_BRIGHTNESS knob_6   // 0-1, frequency brightness
#define TEMPO_SYNC knob_7            // 0-1, BPM sync factor
#define DROP_MOMENT knob_8           // 0/1, drop detection
#define VOCAL_PRESENCE knob_9        // 0-1, vocal detection
#define SUB_BASS knob_10             // 0-1, sub frequencies

// --- Visual Parameter Mappings ---
// Grid responds to the beat
#define GRID_SCALE (1.0 + BASS_INTENSITY * 10.0) // Bass controls grid size
#define TIME_SPEED (0.2 + TEMPO_SYNC * 2.0) // Animation locked to BPM
#define PATTERN_ROTATION (MID_PRESENCE * 0.4) // Melody rotates pattern
#define CELL_ROUNDNESS (0.05 + HIGH_SPARKLE * 0.95) // Hi-hats round the cells
#define PULSE_INTENSITY (KICK_DETECTION * 0.4) // Kick drives cell pulse
#define PULSE_SYNC_FACTOR (1.0 + SPECTRAL_BRIGHTNESS * 7.0) // Phase spread
#define WAVE_DISTORTION (TEMPO_SYNC * 0.15) // Grid waves to the beat
#define SECONDARY_GRID_SCALE (DROP_MOMENT * 8.0) // Drop reveals second grid
#define SECONDARY_GRID_OPACITY (VOCAL_PRESENCE * 0.7) // Vocals show overlay
#define COLOR_SHIFT_SPEED (OVERALL_ENERGY * 0.8) // Energy drives color
#define BLUE_PURPLE_MIX (SUB_BASS) // Sub-bass shifts to purple
#define GOLD_PRESENCE (HIGH_SPARKLE * 0.7) // Gold from cymbals
#define LINE_THICKNESS (0.02 + knob_13 * 0.2) // Grid line width
#define GLOW_INTENSITY (OVERALL_ENERGY * 2.0) // Energy creates glow
#define PATTERN_COMPLEXITY (1.0 + floor(knob_15 * 3.0)) // Pattern layers

// --- Color Constants ---
#define DEEP_BLUE vec3(0.0, 0.1, 0.4)
#define BRIGHT_BLUE vec3(0.0, 0.5, 1.0)
#define PURPLE vec3(0.5, 0.0, 0.8)
#define GOLD vec3(1.0, 0.7, 0.2)
#define DARK_BG vec3(0.02, 0.02, 0.04)

// --- Utility Functions ---
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 2D rotation matrix
mat2 rotate2D(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

// Smooth step with controllable smoothness
float smootherstep(float edge0, float edge1, float x, float smoothness) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return pow(x, smoothness) * pow(1.0 - pow(1.0 - x, smoothness), smoothness);
}

// Distance functions
float box(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + r;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

float circle(vec2 p, float r) {
    return length(p) - r;
}

// Shape mixer - blend between square and circle
float shapeMix(vec2 p, vec2 b, float r, float mix_factor) {
    float d1 = box(p, b, 0.0);
    float d2 = circle(p, r);
    return mix(d1, d2, mix_factor);
}

// Simple wave function
float wave(float x, float amp, float freq, float phase) {
    return amp * sin(freq * x + phase);
}

// Main pattern function
float cellPattern(vec2 uv, float time, float complexity) {
    // Apply wave distortion to grid
    uv.y += wave(uv.x * 3.0, WAVE_DISTORTION, 2.0, time) * sin(time * 0.2);
    uv.x += wave(uv.y * 2.0, WAVE_DISTORTION, 3.0, time * 0.7) * cos(time * 0.3);

    // Rotate the whole pattern
    uv = rotate2D(time * PATTERN_ROTATION) * uv;

    // Scale to grid size
    vec2 grid = uv * GRID_SCALE;

    // Get cell coordinates and local position within cell
    vec2 cell = floor(grid);
    vec2 localPos = fract(grid) * 2.0 - 1.0; // -1 to 1 range within each cell

    // Generate a pseudo-random value for each cell
    float cellRandom = random(cell);

    // Determine pulse for this cell
    float pulse = 0.5 + 0.5 * sin(time * TIME_SPEED + cellRandom * PULSE_SYNC_FACTOR * 6.28);
    pulse = pow(pulse, 0.5); // Make pulse more punchy

    // Calculate size of shape in this cell - affected by pulse
    float size = 0.6 + PULSE_INTENSITY * pulse;

    // Different pattern for different complexity settings
    float d = 1.0;

    if (complexity < 1.5) {
        // Simple grid of cells
        d = shapeMix(localPos, vec2(size), size, CELL_ROUNDNESS);
    }
    else if (complexity < 2.5) {
        // Alternating pattern
        float alt = mod(cell.x + cell.y, 2.0) * 0.2;
        size *= (0.8 + alt);
        d = shapeMix(localPos, vec2(size), size, CELL_ROUNDNESS * (0.8 + alt));
    }
    else {
        // More complex pattern based on cell position
        float diag = sin(cell.x * 0.5 + cell.y * 0.5 + time * 0.2) * 0.25 + 0.75;
        size *= diag;
        d = shapeMix(localPos, vec2(size * 0.9, size * 1.1), size, CELL_ROUNDNESS * diag);
    }

    // Create line effect with smooth edges
    float lineWidth = LINE_THICKNESS * (1.0 + PULSE_INTENSITY * pulse * 0.3);
    float shape = smoothstep(0.0, 0.02, abs(d) - lineWidth * 0.5);

    // Add glow on the edges
    float glow = exp(-abs(d) * 8.0) * GLOW_INTENSITY * (0.5 + 0.5 * pulse);

    return clamp(shape + glow, 0.0, 1.0);
}

// Secondary overlay pattern - simpler, faster variation
float secondaryPattern(vec2 uv, float time) {
    // Different rotation for the overlay
    uv = rotate2D(-time * PATTERN_ROTATION * 0.3) * uv;

    // Diagonal grid pattern
    mat2 diagRot = rotate2D(0.785); // 45 degrees
    vec2 diagUv = diagRot * uv;

    // Secondary grid
    vec2 grid2 = diagUv * SECONDARY_GRID_SCALE;
    vec2 cell2 = floor(grid2);
    vec2 localPos2 = fract(grid2) * 2.0 - 1.0;

    // Thinner lines for the secondary grid
    float d2 = min(abs(localPos2.x), abs(localPos2.y)) - 0.02;
    float pattern2 = smoothstep(0.0, 0.01, d2);

    return pattern2;
}

// Main rendering function
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalized coordinates
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);

    // Time with controllable speed
    float time = iTime * TIME_SPEED;

    // Get main pattern
    float pattern = cellPattern(uv, time, PATTERN_COMPLEXITY);

    // Blend with secondary pattern
    float pattern2 = secondaryPattern(uv, time);
    pattern = mix(pattern, pattern * pattern2, SECONDARY_GRID_OPACITY);

    // Background color
    vec3 col = DARK_BG;

    // Generate color cycle for the pattern
    float colorCycle = sin(time * COLOR_SHIFT_SPEED) * 0.5 + 0.5;

    // Mix between blue and purple for the main tone
    vec3 mainColor = mix(DEEP_BLUE, PURPLE, BLUE_PURPLE_MIX);
    vec3 accentColor = mix(BRIGHT_BLUE, PURPLE, 1.0 - BLUE_PURPLE_MIX);

    // Apply gold highlights based on intensity
    float goldFactor = pow(pattern, 3.0) * GOLD_PRESENCE;

    // Build the final color
    col = mix(col, mainColor, pattern * (1.0 - goldFactor));
    col = mix(col, accentColor, pattern * pattern * (1.0 - goldFactor) * colorCycle);
    col = mix(col, GOLD, goldFactor);

    // Add subtle pulse to overall brightness
    float globalPulse = 0.5 + 0.5 * sin(time * 2.0);
    col *= 1.0 + globalPulse * 0.2 * PULSE_INTENSITY;

    // Output the final color
    fragColor = vec4(col, 1.0);
}

// Standard entry point
void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}
