// @fullscreen: true
// @mobile: true
// @tags: ambient, background, webcam
// Purple/indigo tentacles radiating outward from center — webcam background

// ============================================================================
// STRUCTURE — constants that define the tentacle shape
// ============================================================================

// Number of tentacle arms
#define NUM_ARMS 8.0

// Continuous rotation speed (radians per second) — ~4 minutes per revolution
#define ROTATION_SPEED 0.025

// Undulation speed for wiggle/drift oscillations
#define UNDULATE_SPEED 0.15

// Grow/shrink breathing speed — each arm breathes at its own rate
#define BREATH_SPEED 0.07

// How much tentacles grow and shrink (fraction of REACH)
#define BREATH_AMOUNT 0.25

// ============================================================================
// SLOW PARAMETERS — swap constants for audio uniforms
// (medians, means, regression — changes over seconds)
// ============================================================================

// How far tentacles extend (0 = center, 1 = edge)
#define REACH (0.65 + bassMedian * 0.25)
// #define REACH 0.7

// Wiggle amplitude — how wavy the arms are
#define WIGGLE (0.3 + spectralSpreadMedian * 0.4)
// #define WIGGLE 0.5

// Hue wanders within purple-indigo (Oklch radians ~4.4–5.6)
#define HUE_CENTER (4.9 + pitchClassMedian * 0.5 + spectralCentroidSlope * 0.2)
// #define HUE_CENTER 5.0

// Chroma — vivid when trend is steady
#define CHROMA (0.10 + energyRSquared * 0.06)
// #define CHROMA 0.13

// Base lightness from energy median
#define LIGHTNESS (0.50 + energyMedian * 0.15)
// #define LIGHTNESS 0.55

// Tentacle thickness
#define THICKNESS (0.06 + spectralCentroidMedian * 0.03)
// #define THICKNESS 0.07

// ============================================================================
// FAST PARAMETERS — swap constants for audio uniforms
// (z-scores — small accents only)
// ============================================================================

// Curl factor — tentacles curl when energy spikes
#define CURL_AMOUNT (max(energyZScore, 0.0) * 0.8)
// #define CURL_AMOUNT 0.0

// Brightness pulse on flux spikes
#define FLUX_PULSE (max(spectralFluxZScore, 0.0) * 0.06)
// #define FLUX_PULSE 0.0

// Edge shimmer from treble
#define EDGE_SHIMMER (max(trebleZScore, 0.0) * 0.04)
// #define EDGE_SHIMMER 0.0

// Roughness grit
#define GRIT (spectralRoughnessZScore * 0.008)
// #define GRIT 0.0

// ============================================================================
// EXTREME Z-SCORE DRAMA — only fires at extreme levels
// (smoothstep gates so nothing happens below ~0.6)
// ============================================================================

#define EXTREME_ENERGY smoothstep(0.6, 1.0, energyZScore)
#define EXTREME_FLUX smoothstep(0.6, 1.0, spectralFluxZScore)
#define EXTREME_BASS smoothstep(0.6, 1.0, bassZScore)
// #define EXTREME_ENERGY 0.0
// #define EXTREME_FLUX 0.0
// #define EXTREME_BASS 0.0

// Extra reach when energy is extreme — tentacles lunge outward
#define REACH_SURGE (EXTREME_ENERGY * 0.3)

// Violent twist at tips when flux is extreme
#define TWIST_SURGE (EXTREME_FLUX * 2.5)

// Rim lighting pumps up dramatically
#define RIM_SURGE (max(EXTREME_ENERGY, EXTREME_FLUX) * 0.6)

// Tentacles thicken when bass is extreme
#define THICKNESS_SURGE (EXTREME_BASS * 0.04)

// Chroma boost — colors become vivid during extremes
#define CHROMA_SURGE (max(EXTREME_ENERGY, EXTREME_BASS) * 0.08)

// ============================================================================
// NOISE
// ============================================================================

vec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x / 289.0) * 289.0; }
vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// ============================================================================
// TENTACLE FIELD (polar, radiating outward)
// ============================================================================

// Returns vec2(intensity, rim) where rim is edge proximity for rim lighting
vec2 tentacleField(vec2 p, float t) {
    float r = length(p);
    float angle = atan(p.y, p.x);
    float numArms = NUM_ARMS;
    float bestIntensity = 0.0;
    float bestRim = 0.0;

    for (float i = 0.0; i < 18.0; i += 1.0) {
        if (i >= numArms) break;

        // Each arm has a base angle, evenly spaced + slow global rotation
        float armAngle = i / numArms * 6.2832 + time * ROTATION_SPEED;

        // Independent undulation per arm — each has its own speed and phase
        float armSpeed = 0.15 + sin(i * 3.71) * 0.08; // 0.07–0.23 per arm
        float armPhase = i * 2.3 + sin(i * 5.13) * 1.5;
        armAngle += sin(time * armSpeed + armPhase) * 0.25;
        armAngle += sin(time * armSpeed * 0.6 + armPhase * 1.7) * 0.12;

        // Wiggle: the arm's angle offset varies with radius
        // This makes tentacles wavy as they extend outward
        float wiggle = sin(r * 12.0 - time * armSpeed * 2.0 + i * 1.7) * WIGGLE * (0.3 + r);

        // Curl on energy zscore — tentacles curve more at the tips
        float curl = CURL_AMOUNT * r * r * sin(r * 8.0 + t * 2.0 + i * 0.9);

        // Extreme twist — violent spiraling at tips during flux spikes
        float twist = TWIST_SURGE * r * r * r * sin(r * 15.0 + time * 4.0 + i * 1.3);

        float targetAngle = armAngle + wiggle * 0.3 + curl * 0.4 + twist * 0.5;

        // Angular distance to this arm (wrapping)
        float angleDist = abs(mod(angle - targetAngle + 3.1416, 6.2832) - 3.1416);

        // Tentacle width tapers as it extends — surges thicker on extreme bass
        float width = (THICKNESS + THICKNESS_SURGE) * (1.0 - r * 0.35);
        width = max(width, 0.015);

        // Soft tentacle shape
        float arm = smoothstep(width, width * 0.3, angleDist);

        // Per-arm breathing — each tentacle slowly grows and shrinks independently
        float breathSpeed = BREATH_SPEED * (0.7 + sin(i * 4.37) * 0.5); // 0.035–0.105 per arm
        float breathPhase = i * 1.9 + sin(i * 6.29) * 2.0;
        float breath = sin(time * breathSpeed + breathPhase) * BREATH_AMOUNT;

        // Fade: start after small radius (face area), extend to REACH + surge + breath
        float totalReach = REACH + REACH_SURGE + breath * REACH;
        float innerFade = smoothstep(0.08, 0.18, r);
        float outerFade = 1.0 - smoothstep(totalReach - 0.05, totalReach + 0.05, r);
        arm *= innerFade * outerFade;

        // Rim lighting: bright at edges of tentacle (where angleDist ~ width)
        float rim = smoothstep(width * 0.1, width * 0.8, angleDist)
                  * smoothstep(width * 1.2, width, angleDist);
        rim *= innerFade * outerFade;

        if (arm > bestIntensity) {
            bestIntensity = arm;
            bestRim = rim;
        }
    }

    return vec2(bestIntensity, bestRim);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float t = time * UNDULATE_SPEED;

    // --- Tentacle field ---
    vec2 field = tentacleField(p, t);
    float intensity = field.x;
    float rim = field.y;

    // Subtle noise texture on tentacles
    float nz = snoise(p * 15.0 + t * 0.3) * 0.5 + 0.5;
    intensity *= 0.85 + nz * 0.15;

    // --- Fast accents ---
    intensity += FLUX_PULSE * intensity;
    float shimmer = snoise(p * 30.0 + time * 1.5) * EDGE_SHIMMER * rim;
    float grit = snoise(p * 45.0 + time * 2.0) * GRIT;

    // --- Color in Oklch: purple/indigo ---
    float angle = atan(p.y, p.x);
    float r = length(p);

    // Vary hue slightly by angle and radius
    float hue = HUE_CENTER + angle * 0.05 + r * 0.2;

    // Core tentacle color — chroma surges during extremes
    float chroma = (CHROMA + CHROMA_SURGE) * (0.4 + intensity * 1.5);
    float lightness = mix(0.0, LIGHTNESS, intensity) + rim * 0.2 + shimmer + grit;

    // Rim lighting: brighter, slightly shifted hue at edges — pumps up during extremes
    float rimHue = hue + 0.3; // Shift toward blue for rim
    float rimLight = rim * (0.35 + RIM_SURGE);

    // Background: very dark indigo
    vec3 bg = oklch2rgb(vec3(0.08, 0.03, 4.8));

    // Tentacle body
    vec3 bodyColor = oklch2rgb(vec3(
        clamp(lightness, 0.05, 0.65),
        clamp(chroma, 0.02, 0.18),
        hue
    ));

    // Rim highlight (brighter, bluer) — clamp raised for surge headroom
    vec3 rimColor = oklch2rgb(vec3(
        clamp(rimLight + 0.15, 0.1, 0.85),
        clamp((CHROMA + CHROMA_SURGE) * 1.5, 0.04, 0.25),
        rimHue
    ));

    // Combine: body + rim
    vec3 tentacle = bodyColor + rimColor * rim;

    // Mix with background
    vec3 col = mix(bg, tentacle, smoothstep(0.0, 0.02, intensity));

    // No frame feedback — keep it sharp

    // Gentle vignette
    float vign = 1.0 - r * 0.15;
    col *= vign;

    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
