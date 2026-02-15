// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, nebula, volumetric, space
// ChromaDepth Volumetric Nebula — Volume-marched 3D noise field
// Red = foreground gas (closest), Green = mid-depth, Blue/Violet = deep interior
// Background stars at violet depth. Front-to-back compositing with premultiplied alpha.
//
// ChromaDepth glasses: Red = near, Green = mid, Blue/Violet = far, Black = neutral

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// Density threshold: energy makes nebula thicker (louder = denser gas)
#define DENSITY_THRESH (0.35 - energyNormalized * 0.2)
// #define DENSITY_THRESH 0.25

// Turbulence: spectral flux adds churn to the gas
#define TURBULENCE (0.6 + spectralFluxZScore * 0.3)
// #define TURBULENCE 0.6

// Color temperature: spectral centroid shifts warm/cool balance
#define COLOR_TEMP (spectralCentroidZScore * 0.08)
// #define COLOR_TEMP 0.0

// Rotation speed: bass drives the swirl
#define ROT_SPEED (0.08 + bassZScore * 0.04)
// #define ROT_SPEED 0.08

// Beat brightness pulse
#define BEAT_PULSE (beat ? 1.35 : 1.0)
// #define BEAT_PULSE 1.0

// Fine detail from treble
#define FINE_DETAIL (0.3 + trebleZScore * 0.2)
// #define FINE_DETAIL 0.3

// Nebula scale breathing with energy
#define NEBULA_SCALE (2.2 + energyZScore * 0.15)
// #define NEBULA_SCALE 2.2

// Entropy drives structural complexity
#define STRUCTURE_WARP (spectralEntropyNormalized * 0.4)
// #define STRUCTURE_WARP 0.2

// Bass slope for slow drift
#define DRIFT (bassSlope * 80.0 * bassRSquared)
// #define DRIFT 0.0

// Mids add mid-layer glow
#define MID_GLOW (0.5 + midsZScore * 0.15)
// #define MID_GLOW 0.5

// Roughness adds grittiness to density
#define GRIT (spectralRoughnessNormalized * 0.25)
// #define GRIT 0.1

// Pitch class shifts nebula hue accent
#define HUE_ACCENT (pitchClassNormalized * 0.1)
// #define HUE_ACCENT 0.0

// ============================================================================
// CONSTANTS
// ============================================================================

#define MAX_STEPS 30
#define MAX_DIST 8.0
#define STEP_SIZE 0.27
#define NOISE_OCTAVES 4

// ============================================================================
// CHROMADEPTH COLOR MAPPING
// ============================================================================

vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float sat = 0.95 - t * 0.1;
    float lit = 0.55 - t * 0.12;
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// 3D HASH-BASED NOISE (no texture lookups)
// ============================================================================

vec3 hash3(vec3 p) {
    p = vec3(
        dot(p, vec3(127.1, 311.7, 74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise3d(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    float a = dot(hash3(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0));
    float b = dot(hash3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0));
    float c = dot(hash3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0));
    float d = dot(hash3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0));
    float e = dot(hash3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0));
    float g = dot(hash3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0));
    float h = dot(hash3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0));
    float k = dot(hash3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0));

    return mix(
        mix(mix(a, b, u.x), mix(c, d, u.x), u.y),
        mix(mix(e, g, u.x), mix(h, k, u.x), u.y),
        u.z
    );
}

// ============================================================================
// FBM — 3-4 octaves of noise for nebula density
// ============================================================================

float fbm(vec3 p, float detail) {
    float value = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    float total = 0.0;

    for (int i = 0; i < NOISE_OCTAVES; i++) {
        // Last octave is modulated by FINE_DETAIL
        float octaveAmp = (i == NOISE_OCTAVES - 1) ? amp * detail : amp;
        value += octaveAmp * noise3d(p * freq);
        total += octaveAmp;
        freq *= 2.1;
        amp *= 0.5;
    }

    return value / max(total, 0.001);
}

// ============================================================================
// ROTATION MATRIX
// ============================================================================

mat3 rotY(float a) {
    float ca = cos(a), sa = sin(a);
    return mat3(ca, 0.0, sa, 0.0, 1.0, 0.0, -sa, 0.0, ca);
}

mat3 rotX(float a) {
    float ca = cos(a), sa = sin(a);
    return mat3(1.0, 0.0, 0.0, 0.0, ca, -sa, 0.0, sa, ca);
}

// ============================================================================
// NEBULA DENSITY FIELD
// ============================================================================

float nebulaDensity(vec3 p, float turb, float detail) {
    // Slow swirl distortion
    float swirl = iTime * ROT_SPEED;
    p.xz += vec2(sin(p.y * 0.3 + swirl), cos(p.y * 0.3 + swirl)) * 0.4;

    // Structural warp from entropy
    p += sin(p.yzx * 0.7 + iTime * 0.05) * STRUCTURE_WARP;

    // Base density from fbm
    float n = fbm(p * NEBULA_SCALE, detail);

    // Add turbulence layer
    n += turb * noise3d(p * 3.5 + iTime * 0.1) * 0.3;

    // Add grit from roughness
    n += GRIT * noise3d(p * 6.0 - iTime * 0.08) * 0.15;

    // Nebula shape: spherical falloff with noise carving
    float r = length(p);
    float shell = smoothstep(3.5, 1.0, r);  // fade out at edges

    // Inner cavity (slightly hollow center for depth layering)
    float cavity = smoothstep(0.3, 0.8, r);

    float density = n * shell * cavity;

    // Density threshold from energy
    density = smoothstep(DENSITY_THRESH, DENSITY_THRESH + 0.35, density);

    return density;
}

// ============================================================================
// BACKGROUND STARS
// ============================================================================

vec3 stars(vec2 uv) {
    vec3 col = vec3(0.0);

    // Hash-based star field
    vec2 cell = floor(uv * 80.0);
    vec2 cellUV = fract(uv * 80.0) - 0.5;

    // Star probability from hash
    float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);

    if (h > 0.97) {
        // Star position jitter within cell
        vec2 starPos = vec2(
            fract(sin(dot(cell, vec2(269.5, 183.3))) * 43758.5453) - 0.5,
            fract(sin(dot(cell, vec2(113.5, 271.9))) * 43758.5453) - 0.5
        );
        float d = length(cellUV - starPos);

        // Star brightness varies
        float brightness = fract(sin(dot(cell, vec2(74.7, 246.1))) * 43758.5453);
        brightness = 0.4 + brightness * 0.6;

        // Twinkle
        float twinkle = sin(iTime * 1.5 + h * 6.283) * 0.2 + 0.8;
        brightness *= twinkle;

        // Sharp point star
        float star = smoothstep(0.08, 0.0, d) * brightness;

        // Stars are at violet depth (farthest in chromadepth)
        col = chromadepth(0.9 + h * 0.1) * star;
    }

    return col;
}

// ============================================================================
// MAIN — VOLUME MARCH WITH FRONT-TO-BACK COMPOSITING
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    // Camera setup
    float camAngle = iTime * 0.03 + DRIFT * 0.01;
    vec3 ro = vec3(
        sin(camAngle) * 4.5,
        sin(iTime * 0.02) * 0.5,
        cos(camAngle) * 4.5
    );
    vec3 target = vec3(0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);

    float fov = 1.6;
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // Precompute audio-driven parameters (avoid per-step re-evaluation)
    float turb = clamp(TURBULENCE, 0.1, 1.5);
    float detail = clamp(FINE_DETAIL, 0.1, 1.0);
    float beatPulse = BEAT_PULSE;
    float colorTemp = COLOR_TEMP;
    float midGlow = clamp(MID_GLOW, 0.2, 1.0);
    float hueAccent = HUE_ACCENT;

    // ---- FRONT-TO-BACK VOLUME MARCH ----
    vec4 accum = vec4(0.0); // premultiplied RGBA
    float travelDist = 0.0;

    // Start marching from near the nebula (skip empty space)
    float tNear = max(length(ro) - 4.0, 0.5);
    travelDist = tNear;

    for (int i = 0; i < MAX_STEPS; i++) {
        if (accum.a > 0.95) break;
        if (travelDist > MAX_DIST) break;

        vec3 p = ro + rd * travelDist;

        float density = nebulaDensity(p, turb, detail);

        if (density > 0.01) {
            // Depth mapping: how far into the march are we?
            // Normalized march progress: 0 = front, 1 = back
            float depthNorm = clamp((travelDist - tNear) / (MAX_DIST - tNear), 0.0, 1.0);

            // Also use radial distance from nebula center for depth variation
            float radialDepth = clamp(length(p) / 3.5, 0.0, 1.0);

            // Combine march depth and radial depth
            float chromaT = mix(depthNorm, radialDepth, 0.4);

            // Add noise-based variation to depth for more visual interest
            float depthNoise = noise3d(p * 1.5) * 0.1;
            chromaT = clamp(chromaT + depthNoise + colorTemp, 0.0, 1.0);

            // Add hue accent from pitch class
            chromaT = clamp(chromaT + hueAccent, 0.0, 1.0);

            // Chromadepth color at this depth
            vec3 gasColor = chromadepth(chromaT);

            // Mid-depth glow enhancement (green region pops with mids)
            float midBand = smoothstep(0.25, 0.5, chromaT) * smoothstep(0.75, 0.5, chromaT);
            gasColor *= 1.0 + midBand * midGlow * 0.4;

            // Internal illumination: brighter in denser regions
            float illumination = 0.6 + density * 0.5;
            gasColor *= illumination;

            // Beat pulse brightens all gas
            gasColor *= beatPulse;

            // Premultiplied alpha compositing (front-to-back)
            float alpha = density * STEP_SIZE * 2.5;
            alpha = min(alpha, 1.0);

            // Front-to-back: C_out = C_in + (1 - A_in) * C_sample * A_sample
            accum.rgb += (1.0 - accum.a) * gasColor * alpha;
            accum.a += (1.0 - accum.a) * alpha;
        }

        travelDist += STEP_SIZE;
    }

    // ---- BACKGROUND: stars at maximum chromadepth depth ----
    vec3 bg = stars(uv * 0.5 + 0.5);

    // Composite nebula over background
    vec3 col = accum.rgb + (1.0 - accum.a) * bg;

    // ---- FEEDBACK: subtle trail from previous frame ----
    vec3 prev = getLastFrameColor(screenUV).rgb;
    col = mix(prev * 0.92, col, 0.75);

    // Prevent feedback accumulation to white
    col = min(col, vec3(1.0));

    // ---- VIGNETTE (keeps edges dark for chromadepth) ----
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
