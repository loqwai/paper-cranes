// @favorite: true
// ============================================
// PHYSARUM NETWORK - Tweakable Edition
// ============================================

// ============================================
// CONTROL PANEL - tweak these!
// ============================================

// AGENT BEHAVIOR
#define NUM_AGENTS 75              // How many slime agents (5-50)
#define AGENT_SPEED 0.2           // Base movement speed (0.1-0.5)
#define AGENT_SPEED_VARIATION 0.08 // Speed difference between agents (0-0.2)
#define TRAIL_SHARPNESS 600.0      // Higher = crisper dots (200-1200)
#define TRAIL_BRIGHTNESS 0.8       // Agent glow intensity (0.3-1.5)
#define WANDER_RADIUS 0.3          // How far agents roam from center (0.1-0.5)
#define WANDER_DETAIL energy/10.         // Secondary movement amplitude (0-0.3)
#define AGENT_SPREAD bass        // How spread out agents are (0-0.3)

// NETWORK LINES
#define NETWORK_ENABLED 1          // 0 = off, 1 = on
#define NUM_NETWORK_NODES 45       // Nodes to connect (5-25)
#define NETWORK_SKIP 3             // Connect every Nth node (1-5)
#define LINE_THICKNESS bassNormalized/10.      // Base line width (0.001-0.01)
#define LINE_BRIGHTNESS 0.5        // Line intensity (0.2-1.0)
#define MAX_CONNECTION_DIST 0.5    // Max distance for connections (0.2-0.8)
#define MIN_CONNECTION_DIST 0.05   // Min distance for connections (0-0.2)

// TRAIL PERSISTENCE
#define DECAY_RATE 0.75           // How fast trails fade (0.01-0.1, lower = longer trails)
#define GOOP 0.8                   // Temporal smoothing (0.5-0.95, higher = goopier)
#define GOOP_FALLOFF 0.5           // How much new content cuts through goop (0.2-1.0)

// FLOW / WARP
#define WARP_ENABLED 1             // 0 = off, 1 = on
#define WARP_STRENGTH spectralFluxNormalized         // How much trails flow (0-0.05)
#define WARP_SCALE 3.0             // Size of warp pattern (1-10)
#define WARP_SPEED 0.1             // How fast warp evolves (0-0.3)
#define WARP_ASYMMETRY 0.3         // Position-based warp variation (0-1)

// COLOR
#define PALETTE_SPEED 0.02         // How fast colors drift (0-0.1)
#define PALETTE_POSITION_INFLUENCE 0.3  // How much position affects color (0-1)
#define PALETTE_CONTRAST 1.0       // Color intensity (0.5-1.5)
#define BACKGROUND_INTENSITY 0.03  // Subtle bg texture (0-0.1)

// AUDIO REACTIVITY
#define AUDIO_MOVEMENT 0.08        // How much audio moves agents (0-0.2)
#define AUDIO_PALETTE_MIX 1.0      // How much audio affects colors (0-1)
#define AUDIO_LINE_THICKNESS 0.002 // Treble adds to line width (0-0.005)
#define BEAT_BRIGHTNESS 1.08       // Brightness multiplier on beat (1.0-1.3)
#define BEAT_SATURATION 1.1        // Saturation boost on beat (1.0-1.3)
#define BEAT_SPARKLE 0.3           // Extra agent glow on beat (0-0.5)

// VIGNETTE
#define VIGNETTE_STRENGTH 0.3      // Edge darkening (0-0.6)

// ============================================
// AUDIO INPUTS
// ============================================

#define BASS bassNormalized
#define MIDS midsNormalized
#define TREBLE trebleNormalized
#define ENERGY energyNormalized
#define CENTROID spectralCentroidNormalized

// ============================================
// PALETTES (IQ cosine palettes)
// ============================================

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 palette1(float t) {  // Warm sunset
    return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 1.0), vec3(0.00, 0.10, 0.20));
}

vec3 palette2(float t) {  // Cool ocean
    return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 0.5), vec3(0.80, 0.90, 0.30));
}

vec3 palette3(float t) {  // Forest
    return palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 0.7, 0.4), vec3(0.00, 0.15, 0.20));
}

vec3 palette4(float t) {  // Neon
    return palette(t, vec3(0.5), vec3(0.5), vec3(2.0, 1.0, 0.0), vec3(0.50, 0.20, 0.25));
}

vec3 audioPalette(float t) {
    vec3 warm = mix(palette1(t), palette3(t), BASS * AUDIO_PALETTE_MIX);
    vec3 cool = mix(palette2(t), palette4(t), TREBLE * AUDIO_PALETTE_MIX);
    return mix(warm, cool, CENTROID * AUDIO_PALETTE_MIX);
}

// ============================================
// NOISE
// ============================================

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        sum += noise(p) * amp;
        p *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

// ============================================
// AGENT POSITION
// ============================================

vec2 agentPosition(float id, float time) {
    float t = time * (AGENT_SPEED + id * AGENT_SPEED_VARIATION);

    vec2 pos = vec2(
        sin(t * 1.1 + id * 17.0) * WANDER_RADIUS + sin(t * 0.7 + id * 31.0) * WANDER_DETAIL,
        cos(t * 0.9 + id * 23.0) * WANDER_RADIUS + cos(t * 1.3 + id * 13.0) * WANDER_DETAIL
    );

    pos.x += sin(id * 7.0) * AGENT_SPREAD;
    pos.y += cos(id * 11.0) * AGENT_SPREAD;

    pos.x += sin(t * 2.0) * BASS * AUDIO_MOVEMENT;
    pos.y += cos(t * 1.5) * MIDS * AUDIO_MOVEMENT;

    return pos;
}

float agentTrail(vec2 uv, float id, float time) {
    vec2 pos = agentPosition(id, time);
    float dist = length(uv - pos);
    return exp(-dist * dist * TRAIL_SHARPNESS);
}

// ============================================
// NETWORK LINE
// ============================================

float lineDist(vec2 uv, vec2 a, vec2 b) {
    vec2 pa = uv - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// ============================================
// MAIN
// ============================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;
    vec2 centered = (fragCoord - 0.5 * res) / res.x;

    float time = iTime;

    // ========== PREVIOUS FRAME ==========
    vec4 prev = getLastFrameColor(uv);

    // Warp for flow
    vec2 warp = vec2(0.0);
    #if WARP_ENABLED
        warp = vec2(
            fbm(centered * WARP_SCALE + time * WARP_SPEED) - 0.5,
            fbm(centered * WARP_SCALE + vec2(5.0, 3.0) + time * WARP_SPEED * 0.8) - 0.5
        ) * WARP_STRENGTH;

        warp.x *= 1.0 + centered.x * WARP_ASYMMETRY;
        warp.y *= 1.0 - centered.y * WARP_ASYMMETRY * 0.7;
    #endif

    vec2 warpedUV = clamp(uv + warp, 0.001, 0.999);
    vec3 warpedPrev = getLastFrameColor(warpedUV).rgb;
    vec3 decayedTrail = warpedPrev * (1.0 - DECAY_RATE);

    // ========== AGENTS ==========
    float totalIntensity = 0.0;
    float weightedIndex = 0.0;

    for (int i = 0; i < 50; i++) {
        if (i >= NUM_AGENTS) break;
        float id = float(i);
        float intensity = agentTrail(centered, id, time);
        totalIntensity += intensity;
        weightedIndex += id * intensity;
    }

    float colorIndex = 0.0;
    if (totalIntensity > 0.001) {
        colorIndex = weightedIndex / totalIntensity / float(NUM_AGENTS);
    }

    // ========== NETWORK ==========
    float networkIntensity = 0.0;
    float networkColorIndex = 0.0;

    #if NETWORK_ENABLED
    for (int i = 0; i < 25; i++) {
        if (i >= NUM_NETWORK_NODES) break;

        float id1 = float(i);
        float id2 = float((i + NETWORK_SKIP) % NUM_NETWORK_NODES);

        vec2 pos1 = agentPosition(id1, time);
        vec2 pos2 = agentPosition(id2, time);

        float separation = length(pos2 - pos1);
        if (separation < MAX_CONNECTION_DIST && separation > MIN_CONNECTION_DIST) {
            float d = lineDist(centered, pos1, pos2);
            float thickness = LINE_THICKNESS + TREBLE * AUDIO_LINE_THICKNESS;
            float line = smoothstep(thickness, thickness * 0.2, d);
            line *= (1.0 - separation / MAX_CONNECTION_DIST);

            networkIntensity += line;
            networkColorIndex += (id1 + id2) * 0.5 * line;
        }
    }

    if (networkIntensity > 0.001) {
        networkColorIndex = networkColorIndex / networkIntensity / float(NUM_NETWORK_NODES);
    }
    #endif

    // ========== COLOR ==========
    float posOffset = centered.x * PALETTE_POSITION_INFLUENCE + centered.y * PALETTE_POSITION_INFLUENCE * 0.7;
    float timeOffset = time * PALETTE_SPEED;

    float prevWarmth = (prev.r - prev.b) * 0.5 + 0.5;
    float prevLuma = dot(prev.rgb, vec3(0.299, 0.587, 0.114));
    float paletteShift = prevWarmth * 0.1 + prevLuma * 0.05;

    vec3 agentColor = audioPalette(colorIndex + posOffset + timeOffset + paletteShift);
    vec3 networkColor = audioPalette(networkColorIndex + posOffset + timeOffset + 0.5);

    // ========== COMBINE ==========
    vec3 color = decayedTrail;

    // Clamp intensity to prevent washout
    float clampedAgentIntensity = min(totalIntensity, 1.0);
    float clampedNetworkIntensity = min(networkIntensity, 1.0);

    color += agentColor * clampedAgentIntensity * TRAIL_BRIGHTNESS * PALETTE_CONTRAST;

    #if NETWORK_ENABLED
    color += networkColor * clampedNetworkIntensity * LINE_BRIGHTNESS * PALETTE_CONTRAST;
    #endif

    // Background
    float bgNoise = fbm(centered * 5.0 + time * 0.05);
    vec3 bgColor = audioPalette(bgNoise + posOffset + timeOffset) * BACKGROUND_INTENSITY;
    color += bgColor * (1.0 - min(1.0, totalIntensity + networkIntensity));

    // ========== GOOP ==========
    float newBrightness = clampedAgentIntensity + clampedNetworkIntensity * 0.5;
    float goopAmount = GOOP * (1.0 - smoothstep(0.0, GOOP_FALLOFF, newBrightness));
    color = mix(color, prev.rgb, goopAmount);

    // ========== BEAT ==========
    if (beat) {
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(vec3(luma), color, BEAT_SATURATION);
        color *= BEAT_BRIGHTNESS;
        color += agentColor * clampedAgentIntensity * BEAT_SPARKLE;
    }

    // ========== FINAL ==========
    float vign = 1.0 - length(centered) * VIGNETTE_STRENGTH;
    color *= vign;

    color = clamp(color, 0.0, 1.0);
    color *= smoothstep(0.0, 2.0, time);

    fragColor = vec4(color, 1.0);
}
