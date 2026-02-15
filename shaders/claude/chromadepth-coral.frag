// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, coral, organic, raymarching
// ChromaDepth Coral Reef - Procedural underwater reef with branching coral,
// anemone tentacles, and rocky base. Designed for ChromaDepth 3D glasses.
// Red = closest coral tips, Green = mid-depth, Blue/Violet = deep crevices
// Black = neutral depth

#define MAX_STEPS 40
#define MAX_DIST 18.0
#define SURF_DIST 0.004
#define NORM_EPS 0.004

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern)
// ============================================================================

// Coral growth/retraction: bass expands coral branches
#define CORAL_GROWTH (0.9 + bassZScore * 0.15)
// #define CORAL_GROWTH 1.0

// Tentacle sway amplitude: mids drive anemone movement
#define TENTACLE_SWAY (midsZScore * 0.25)
// #define TENTACLE_SWAY 0.12

// Caustic animation speed: treble accelerates light ripples
#define CAUSTIC_SPEED (1.0 + trebleZScore * 0.6)
// #define CAUSTIC_SPEED 1.0

// Water clarity / fog density: energy clears the water
#define WATER_CLARITY (0.06 - energyNormalized * 0.025)
// #define WATER_CLARITY 0.05

// Bioluminescent flash on beat
#define BIO_FLASH (beat ? 0.35 : 0.0)
// #define BIO_FLASH 0.0

// Camera drift speed: spectral flux nudges forward motion
#define DRIFT_SPEED (0.15 + spectralFluxZScore * 0.06)
// #define DRIFT_SPEED 0.18

// Color hue shift from pitch class
#define HUE_SHIFT (pitchClassNormalized * 0.04)
// #define HUE_SHIFT 0.0

// Spectral entropy adds turbulence to coral surface
#define SURFACE_TURB (spectralEntropyNormalized * 0.12)
// #define SURFACE_TURB 0.06

// Bass slope for trend-based growth (building = expanding)
#define GROWTH_TREND (bassSlope * 8.0 * bassRSquared)
// #define GROWTH_TREND 0.0

// Energy slope for atmospheric trend
#define ATMOSPHERE_TREND (energySlope * 5.0 * energyRSquared)
// #define ATMOSPHERE_TREND 0.0

// Spectral centroid brightness modulation
#define BRIGHTNESS_MOD (1.0 + spectralCentroidZScore * 0.08)
// #define BRIGHTNESS_MOD 1.0

// Roughness drives coral texture detail
#define ROUGHNESS_DETAIL (spectralRoughnessNormalized * 0.04)
// #define ROUGHNESS_DETAIL 0.02

// Bass brightness pulse
#define BASS_PULSE (0.95 + bassNormalized * 0.1)
// #define BASS_PULSE 1.0

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
// UTILITY
// ============================================================================

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Simple 3D noise for organic shapes
float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = dot(i, vec3(1.0, 57.0, 113.0));
    return mix(
        mix(mix(hash(n), hash(n + 1.0), f.x),
            mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
        mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
            mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y),
        f.z
    );
}

mat2 rot2(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / max(k, 0.001), 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// ============================================================================
// SDF PRIMITIVES
// ============================================================================

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 ab = b - a;
    float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.001), 0.0, 1.0);
    return length(p - a - ab * t) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdPlane(vec3 p, float h) {
    return p.y - h;
}

// ============================================================================
// CORAL STRUCTURES
// ============================================================================

// Branching coral using box-fold IFS with organic distortion
float branchingCoral(vec3 p, float growth) {
    float d = 1e10;
    float scale = 1.8 * growth;

    // Organic offset based on position
    p += vec3(
        sin(p.y * 2.3 + iTime * 0.1) * SURFACE_TURB,
        0.0,
        cos(p.x * 1.7 + iTime * 0.08) * SURFACE_TURB
    );

    vec3 z = p;
    float dr = 1.0;

    // IFS fractal: 6 iterations max for mobile
    for (int i = 0; i < 6; i++) {
        // Box fold: fold space to create branching
        z = clamp(z, -1.0, 1.0) * 2.0 - z;

        // Sphere fold with audio-reactive radius
        float r2 = dot(z, z);
        float minR2 = 0.25 + ROUGHNESS_DETAIL;
        if (r2 < minR2) {
            float t = 1.0 / max(minR2, 0.001);
            z *= t;
            dr *= t;
        } else if (r2 < 1.0) {
            float t = 1.0 / max(r2, 0.001);
            z *= t;
            dr *= t;
        }

        z = z * scale + p;
        dr = dr * abs(scale) + 1.0;

        // Early bail for mobile perf
        if (dot(z, z) > 100.0) break;
    }

    return length(z) / max(abs(dr), 0.001) - 0.002;
}

// Sea anemone tentacles: displaced cylinders swaying with mids
float anemone(vec3 p, vec3 base, float tentacleCount) {
    float d = 1e10;
    float t = iTime;

    for (float i = 0.0; i < 5.0; i++) {
        float angle = (i / max(tentacleCount, 0.001)) * 6.283 + hash(i * 13.7) * 1.5;
        float spread = 0.15 + hash(i * 7.3) * 0.1;
        float height = 0.4 + hash(i * 19.1) * 0.3;

        // Sway with audio
        float swayX = sin(t * 1.5 + i * 2.1 + p.y * 3.0) * (0.06 + TENTACLE_SWAY * 0.1);
        float swayZ = cos(t * 1.2 + i * 1.7 + p.y * 2.5) * (0.04 + TENTACLE_SWAY * 0.08);

        vec3 tipOffset = vec3(
            cos(angle) * spread + swayX,
            height,
            sin(angle) * spread + swayZ
        );

        vec3 basePos = base;
        vec3 tipPos = base + tipOffset;

        // Thicker at base, thinner at tip
        float tentacle = sdCapsule(p, basePos, tipPos, 0.02);

        // Bulbous tip
        float tip = sdSphere(p - tipPos, 0.035);
        tentacle = smin(tentacle, tip, 0.03);

        d = smin(d, tentacle, 0.02);
    }

    return d;
}

// Rocky base terrain using layered noise
float rockyBase(vec3 p) {
    float base = p.y + 1.2;

    // Layered displacement for rocky texture
    float disp = 0.0;
    disp += noise3(p * 1.5) * 0.4;
    disp += noise3(p * 3.0 + 17.0) * 0.2;
    disp += noise3(p * 6.0 + 31.0) * 0.08;

    // Create ridges and crevices
    float ridges = abs(sin(p.x * 2.5 + p.z * 1.8)) * 0.15;

    return base - disp - ridges;
}

// ============================================================================
// FULL SCENE SDF
// ============================================================================

// Material IDs: 0=miss, 1=coral, 2=anemone, 3=rock, 4=sand
struct Hit {
    float d;
    float mat;
};

Hit hMin(Hit a, Hit b) {
    return a.d < b.d ? a : b;
}

Hit sminH(Hit a, Hit b, float k) {
    float h = clamp(0.5 + 0.5 * (b.d - a.d) / max(k, 0.001), 0.0, 1.0);
    float d = mix(b.d, a.d, h) - k * h * (1.0 - h);
    float m = h > 0.5 ? a.mat : b.mat;
    return Hit(d, m);
}

Hit sceneSDF(vec3 p) {
    Hit result = Hit(MAX_DIST, 0.0);

    float growth = clamp(CORAL_GROWTH + GROWTH_TREND * 0.05, 0.7, 1.3);

    // --- BRANCHING CORAL CLUSTERS ---

    // Cluster 1: large central formation
    vec3 c1p = p - vec3(0.0, -0.2, 0.0);
    c1p.xz *= rot2(0.3);
    float coral1 = branchingCoral(c1p * 1.2, growth) / 1.2;
    result = hMin(result, Hit(coral1, 1.0));

    // Cluster 2: left side, different orientation
    vec3 c2p = p - vec3(-1.8, -0.5, 1.2);
    c2p.xz *= rot2(1.8);
    c2p.yz *= rot2(0.2);
    float coral2 = branchingCoral(c2p * 1.5, growth * 0.9) / 1.5;
    result = hMin(result, Hit(coral2, 1.0));

    // Cluster 3: right side, smaller
    vec3 c3p = p - vec3(1.5, -0.4, -0.8);
    c3p.xz *= rot2(3.1);
    float coral3 = branchingCoral(c3p * 1.8, growth * 0.85) / 1.8;
    result = hMin(result, Hit(coral3, 1.0));

    // Cluster 4: background
    vec3 c4p = p - vec3(0.5, -0.3, -2.5);
    c4p.xz *= rot2(0.9);
    float coral4 = branchingCoral(c4p * 1.3, growth * 0.95) / 1.3;
    result = hMin(result, Hit(coral4, 1.0));

    // --- SEA ANEMONES ---

    // Anemone 1: nestled in coral
    float anem1 = anemone(p, vec3(-0.5, -0.6, 0.8), 5.0);
    result = hMin(result, Hit(anem1, 2.0));

    // Anemone 2: on rock ledge
    float anem2 = anemone(p, vec3(0.8, -0.7, 0.3), 5.0);
    result = hMin(result, Hit(anem2, 2.0));

    // Anemone 3: background
    float anem3 = anemone(p, vec3(-1.0, -0.8, -1.5), 5.0);
    result = hMin(result, Hit(anem3, 2.0));

    // --- ROCKY BASE ---
    float rock = rockyBase(p);
    result = sminH(result, Hit(rock, 3.0), 0.15);

    // --- SANDY FLOOR ---
    float sand = p.y + 1.5 + noise3(p * 4.0) * 0.05;
    result = sminH(result, Hit(sand, 4.0), 0.1);

    return result;
}

// ============================================================================
// NORMALS
// ============================================================================

vec3 getNormal(vec3 p) {
    vec2 e = vec2(NORM_EPS, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy).d - sceneSDF(p - e.xyy).d,
        sceneSDF(p + e.yxy).d - sceneSDF(p - e.yxy).d,
        sceneSDF(p + e.yyx).d - sceneSDF(p - e.yyx).d
    ));
}

// ============================================================================
// FAKE CAUSTICS
// ============================================================================

float caustics(vec2 p, float time) {
    float speed = time * CAUSTIC_SPEED;
    float c = 0.0;
    // Two layers of animated sin waves for caustic pattern
    c += sin(p.x * 3.7 + speed * 0.8) * sin(p.y * 4.3 - speed * 0.6) * 0.5;
    c += sin(p.x * 5.1 - speed * 1.1 + p.y * 2.8) * sin(p.y * 6.7 + speed * 0.9) * 0.3;
    c += sin((p.x + p.y) * 2.5 + speed * 0.5) * 0.2;
    return c * c; // square for sharper bright lines
}

// ============================================================================
// CHEAP AO (2-sample for mobile)
// ============================================================================

float cheapAO(vec3 p, vec3 n) {
    float d1 = sceneSDF(p + n * 0.08).d;
    float d2 = sceneSDF(p + n * 0.25).d;
    return clamp(0.5 + (d1 + d2) * 2.5, 0.0, 1.0);
}

// ============================================================================
// RAYMARCHING
// ============================================================================

Hit raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        Hit h = sceneSDF(p);

        if (h.d < SURF_DIST) {
            return Hit(t, h.mat);
        }
        if (t > MAX_DIST) break;

        // Slightly conservative step for complex SDF
        t += h.d * 0.85;
    }

    return Hit(MAX_DIST, 0.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUV = fragCoord / iResolution.xy;

    float t = iTime;

    // --- CAMERA: slow drift forward through the reef ---
    float driftZ = t * DRIFT_SPEED;
    float camSway = sin(t * 0.15) * 0.8;
    float camBob = sin(t * 0.22) * 0.15;

    vec3 ro = vec3(
        camSway + spectralCentroidZScore * 0.03,
        0.3 + camBob,
        3.0 + driftZ
    );

    // Look slightly ahead and down into the reef
    vec3 lookAt = ro + vec3(sin(t * 0.08) * 0.5, -0.3, -2.5);

    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);

    float fov = 1.6;
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // --- RAYMARCH ---
    Hit result = raymarch(ro, rd);
    float dist = result.d;
    float mat = result.mat;

    // --- UNDERWATER BACKGROUND ---
    // Deep blue water that fades darker with depth
    float bgGrad = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
    // Deeper looking down, lighter looking up
    float bgDepth = mix(0.95, 0.65, bgGrad);
    vec3 bgCol = chromadepth(bgDepth);
    // Darken the deep background
    bgCol *= mix(0.15, 0.4, bgGrad);

    // Underwater light rays from above (god rays)
    float rays = 0.0;
    float rayX = screenUV.x * 8.0 + t * 0.3;
    rays += pow(max(0.0, sin(rayX)), 12.0) * 0.15;
    rays += pow(max(0.0, sin(rayX * 0.7 + 1.5)), 8.0) * 0.1;
    rays *= max(0.0, rd.y + 0.3); // only visible looking upward
    bgCol += vec3(0.05, 0.12, 0.15) * rays;

    vec3 col = bgCol;

    if (dist < MAX_DIST) {
        vec3 p = ro + rd * dist;
        vec3 n = getNormal(p);

        // --- LIGHTING ---
        // Key light from above-right (sun through water)
        vec3 lightDir = normalize(vec3(0.3, 0.9, -0.2));
        float diff = max(dot(n, lightDir), 0.0);

        // Fill light from water scatter
        float fill = max(dot(n, vec3(-0.2, 0.3, 0.5)), 0.0) * 0.25;

        // Cheap AO
        float ao = cheapAO(p, n);

        // Caustic light pattern on surfaces
        float causticsVal = caustics(p.xz, t) * max(0.0, n.y) * 0.5;

        // Total light
        float totalLight = (diff + fill) * ao + causticsVal;

        // --- CHROMADEPTH MAPPING ---
        // Map hit distance to 0-1: near = 0 (red), far = 1 (violet)
        float depthT = clamp((dist - 1.0) / (MAX_DIST - 2.0), 0.0, 1.0);

        // Material adjustments to depth perception
        float lightness = 0.35 + totalLight * 0.25;

        if (mat < 1.5) {
            // Coral: tips closer = redder, base deeper = greener
            // Slight forward push for coral
            depthT *= 0.85;
            lightness += 0.05;
            // Add surface detail coloring
            float coralTex = noise3(p * 8.0 + 5.0) * 0.03;
            depthT += coralTex;
        } else if (mat < 2.5) {
            // Anemone: bright, slightly forward (saturated colors)
            depthT *= 0.8;
            lightness += 0.1;
            // Bioluminescent glow
            float glow = sin(t * 3.0 + p.y * 10.0) * 0.5 + 0.5;
            lightness += glow * 0.06;
        } else if (mat < 3.5) {
            // Rock: neutral mid-depth
            depthT *= 0.95;
            lightness -= 0.03;
        } else {
            // Sand: far, blue-ish
            depthT = mix(depthT, 0.8, 0.3);
            lightness -= 0.05;
        }

        depthT = clamp(depthT + HUE_SHIFT, 0.0, 1.0);

        col = chromadepth(depthT);
        col *= clamp(lightness, 0.08, 0.6);

        // --- BIOLUMINESCENT FLASH on beat ---
        if (BIO_FLASH > 0.01) {
            // Flash centered on nearby surfaces, pulsing outward
            float flashDist = clamp(1.0 - dist * 0.1, 0.0, 1.0);
            // Bioluminescent teal-green
            vec3 bioColor = hsl2rgb(vec3(0.48, 0.9, 0.5));
            col += bioColor * BIO_FLASH * flashDist;
        }

        // Brightness modulation
        col *= BRIGHTNESS_MOD;
        col *= BASS_PULSE;

        // --- DEPTH FOG: fade toward deep blue with distance ---
        float fogAmount = 1.0 - exp(-dist * WATER_CLARITY);
        fogAmount = clamp(fogAmount + ATMOSPHERE_TREND * 0.02, 0.0, 0.95);
        // Fog color: deep blue water
        vec3 fogCol = chromadepth(0.9) * 0.2;
        col = mix(col, fogCol, fogAmount);
    }

    // --- FLOATING PARTICLES (underwater dust/plankton) ---
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float px = hash(fi * 7.3) * 2.0 - 1.0;
        float py = hash(fi * 13.1) * 1.5 - 0.75;
        float pz = hash(fi * 23.7) * 3.0;

        px += sin(t * 0.3 + fi * 2.1) * 0.2;
        py += sin(t * 0.4 + fi * 1.7) * 0.1;

        // Project particle to screen space (approximate)
        vec3 particlePos = vec3(px, py, pz);
        vec3 toParticle = particlePos - ro;
        float proj = dot(toParticle, normalize(rd));
        if (proj < 0.5) continue;

        vec2 particleScreen = vec2(
            dot(toParticle, right) / max(proj, 0.001),
            dot(toParticle, up) / max(proj, 0.001)
        );

        float pdist = length(uv - particleScreen);
        float particleBright = smoothstep(0.015, 0.0, pdist);
        particleBright *= 0.3 + 0.2 * sin(t * 2.0 + fi * 5.0);

        // Particles glow faintly in the chromadepth range
        float particleDepth = clamp(pz / 4.0, 0.3, 0.7);
        col += chromadepth(particleDepth) * particleBright * 0.15;
    }

    // --- VIGNETTE ---
    vec2 vc = screenUV - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.7;

    // --- FRAME FEEDBACK (subtle motion blur for underwater feel) ---
    vec4 prev = getLastFrameColor(screenUV);
    col = mix(prev.rgb * 0.96, col, 0.7);

    // --- ENSURE SATURATION for chromadepth ---
    vec3 colHSL = rgb2hsl(col);
    colHSL.y = min(colHSL.y * 1.1, 1.0);
    colHSL.z = clamp(colHSL.z, 0.03, 0.55);
    col = hsl2rgb(colHSL);

    // Subtle dithering
    float dither = (hash(dot(fragCoord, vec2(12.9898, 78.233)) + iTime) - 0.5) / 255.0;
    col += dither;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
