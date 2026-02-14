// @fullscreen: true
// @mobile: true
// @tags: anime, girls, kawaii, sakura, chromadepth, 3d, raymarching
// Anime Girls ChromaDepth 3D - Raymarched anime scene with real depth
// Red = nearest, Green = mid, Blue/Violet = farthest
// Designed for ChromaDepth 3D glasses

#define MAX_STEPS 50
#define MAX_DIST 25.0
#define SURF_DIST 0.002

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Bass sway on hair/skirts
#define HAIR_SWAY (bassZScore * 0.15)
// #define HAIR_SWAY 0.08

// Energy camera zoom
#define CAM_ZOOM (energyZScore * 0.3)
// #define CAM_ZOOM 0.0

// Beat hue shift toward red
#define BEAT_HUE_SHIFT (beat ? -0.06 : 0.0)
// #define BEAT_HUE_SHIFT 0.0

// Bounce from energy
#define BOUNCE (max(0.0, energyZScore * 0.12))
// #define BOUNCE 0.05

// Petal speed from spectral flux
#define PETAL_SPEED (0.3 + spectralFluxNormalized * 0.7)
// #define PETAL_SPEED 0.5

// Treble sparkle on eyes
#define EYE_SPARKLE (0.5 + trebleNormalized * 0.5)
// #define EYE_SPARKLE 0.7

// Pitch class hue modulation
#define HUE_AUDIO (pitchClassNormalized * 0.06)
// #define HUE_AUDIO 0.0

// Spectral spread skirt flutter
#define SKIRT_FLUTTER (spectralSpreadZScore * 0.08)
// #define SKIRT_FLUTTER 0.0

// Bass brightness throb
#define BASS_BRIGHT (0.9 + bassNormalized * 0.15)
// #define BASS_BRIGHT 1.0

// ============================================================================
// CHROMADEPTH COLOR SYSTEM
// ============================================================================

vec3 chromaDepthColor(float dist, float lightness) {
    // Map ray distance to hue: near=red(0), mid=green(0.33), far=blue/violet(0.75)
    float t = clamp((dist - 3.0) / 12.0, 0.0, 1.0);
    float hue = t * 0.75;
    hue = fract(hue + HUE_AUDIO + BEAT_HUE_SHIFT);
    return hsl2rgb(vec3(hue, 0.92, clamp(lightness, 0.08, 0.6)));
}

// ============================================================================
// SDF PRIMITIVES
// ============================================================================

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 ab = b - a;
    float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    return length(p - a - ab * t) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdRoundBox(vec3 p, vec3 b, float r) {
    return sdBox(p, b) - r;
}

float sdEllipsoid(vec3 p, vec3 r) {
    float k0 = length(p / r);
    float k1 = length(p / (r * r));
    return k0 * (k0 - 1.0) / max(k1, 0.001);
}

float sdCone(vec3 p, float h, float r1, float r2) {
    vec2 q = vec2(length(p.xz), p.y);
    vec2 k1 = vec2(r2, h);
    vec2 k2 = vec2(r2 - r1, 2.0 * h);
    vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0) ? r1 : r2), abs(q.y) - h);
    vec2 cb = q - k1 + k2 * clamp(dot(k1 - q, k2) / dot(k2, k2), 0.0, 1.0);
    float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
    return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}

float sdPlane(vec3 p, float h) {
    return p.y - h;
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

mat2 rot2(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

// ============================================================================
// ANIME GIRL SDF
// ============================================================================

// Material IDs: 0=miss, 1=body/skin, 2=hair, 3=outfit, 4=eye, 5=eyeHighlight
struct Hit {
    float d;
    float mat;
};

Hit hMin(Hit a, Hit b) {
    if (a.d < b.d) return a;
    return b;
}

Hit sminH(Hit a, Hit b, float k) {
    float h = clamp(0.5 + 0.5 * (b.d - a.d) / k, 0.0, 1.0);
    float d = mix(b.d, a.d, h) - k * h * (1.0 - h);
    float m = h > 0.5 ? a.mat : b.mat;
    return Hit(d, m);
}

Hit animeGirl(vec3 p, float bounce, float sway, float time_offset, float girlId) {
    float t = iTime + time_offset;
    p.y -= bounce;

    Hit result = Hit(MAX_DIST, 0.0);

    // Head - sphere (proportional to body)
    vec3 headP = p - vec3(0.0, 2.4, 0.0);
    float head = sdSphere(headP, 0.25);
    result = hMin(result, Hit(head, 1.0));

    // Body / torso - ellipsoid for soft curvy shape
    vec3 bodyP = p - vec3(0.0, 1.8, 0.0);
    float body = sdEllipsoid(bodyP, vec3(0.22, 0.34, 0.16));
    result = sminH(result, Hit(body, 10.0 + girlId), 0.12);

    // Chest - under the shirt, same material as torso
    float jiggle = sin(t * 7.0 + bounce * 20.0) * 0.004;
    float jiggleDelay = sin(t * 7.0 + bounce * 20.0 - 0.3) * 0.003;
    float boobL = sdSphere(p - vec3(-0.1, 1.95 + jiggle, 0.14), 0.09);
    float boobR = sdSphere(p - vec3(0.1, 1.95 + jiggleDelay, 0.14), 0.09);
    float chest = smin(boobL, boobR, 0.06);
    result = sminH(result, Hit(chest, 10.0 + girlId), 0.1);

    // Neck - blends smoothly into head and torso
    float neck = sdCapsule(p, vec3(0.0, 2.0, 0.0), vec3(0.0, 2.2, 0.0), 0.08);
    result = sminH(result, Hit(neck, 1.0), 0.12);

    // Skirt - cone with stripes, narrower than torso at waist
    vec3 skirtP = p - vec3(0.0, 1.25, 0.0);
    skirtP.x += SKIRT_FLUTTER * sin(t * 3.5 + skirtP.y * 8.0);
    float skirt = sdCone(skirtP, 0.3, 0.3, 0.18);
    float stripe = step(0.0, sin(p.y * 35.0));
    float skirtMat = mix(3.0, 9.0, stripe);
    result = sminH(result, Hit(skirt, skirtMat), 0.1);

    // Legs - capsules, soft blend into skirt
    float legL = sdCapsule(p, vec3(-0.12, 0.0, 0.0), vec3(-0.1, 0.95, 0.0), 0.065);
    float legR = sdCapsule(p, vec3(0.12, 0.0, 0.0), vec3(0.1, 0.95, 0.0), 0.065);
    result = sminH(result, Hit(min(legL, legR), 1.0), 0.06);

    // Shoes - rounded with slight heel and toe
    float shoeL = sdEllipsoid(p - vec3(-0.12, 0.03, 0.04), vec3(0.07, 0.04, 0.12));
    float shoeR = sdEllipsoid(p - vec3(0.12, 0.03, 0.04), vec3(0.07, 0.04, 0.12));
    // Small heel bump
    float heelL = sdSphere(p - vec3(-0.12, 0.02, -0.06), 0.04);
    float heelR = sdSphere(p - vec3(0.12, 0.02, -0.06), 0.04);
    float shoes = min(smin(shoeL, heelL, 0.03), smin(shoeR, heelR, 0.03));
    result = sminH(result, Hit(shoes, 3.0), 0.04);

    // Arms - capsules, smooth blend at shoulders
    float armL = sdCapsule(p, vec3(-0.24, 2.0, 0.0), vec3(-0.28, 1.4, 0.05), 0.05);
    float armR = sdCapsule(p, vec3(0.24, 2.0, 0.0), vec3(0.28, 1.4, 0.05), 0.05);
    result = sminH(result, Hit(min(armL, armR), 1.0), 0.08);

    // Hair back - cap shape wrapping around smaller head
    vec3 hairBackP = p - vec3(0.0, 2.44, -0.1);
    hairBackP.x += sway * max(0.0, 2.4 - p.y) * 0.3;
    float hairBack = sdEllipsoid(hairBackP, vec3(0.30, 0.30, 0.24));
    result = sminH(result, Hit(hairBack, 2.0), 0.1);

    // Hair side strands - short, frame the face, above arms
    vec3 strandLP = p - vec3(-0.22, 2.34, 0.06);
    strandLP.x -= sway * max(0.0, 2.4 - p.y) * 0.5;
    float strandL = sdEllipsoid(strandLP, vec3(0.06, 0.18, 0.08));

    vec3 strandRP = p - vec3(0.22, 2.34, 0.06);
    strandRP.x += sway * max(0.0, 2.4 - p.y) * 0.5;
    float strandR = sdEllipsoid(strandRP, vec3(0.06, 0.18, 0.08));
    float strands = smin(strandL, strandR, 0.04);
    result = sminH(result, Hit(strands, 2.0), 0.05);

    // Bangs - hugging the forehead
    vec3 bangP = p - vec3(0.0, 2.5, 0.12);
    float bangs = sdEllipsoid(bangP, vec3(0.24, 0.06, 0.18));
    result = sminH(result, Hit(bangs, 2.0), 0.08);

    // Eyes - inset spheres (poke into head)
    vec3 eyeLP = p - vec3(-0.09, 2.42, 0.22);
    vec3 eyeRP = p - vec3(0.09, 2.42, 0.22);
    float eyeL = sdEllipsoid(eyeLP, vec3(0.055, 0.07, 0.03));
    float eyeR = sdEllipsoid(eyeRP, vec3(0.055, 0.07, 0.03));
    result = hMin(result, Hit(min(eyeL, eyeR), 4.0));

    // Eye highlights - tiny spheres popping forward
    vec3 hlLP = p - vec3(-0.07, 2.44, 0.26);
    vec3 hlRP = p - vec3(0.07, 2.44, 0.26);
    float hlL = sdSphere(hlLP, 0.015 * EYE_SPARKLE);
    float hlR = sdSphere(hlRP, 0.015 * EYE_SPARKLE);
    result = hMin(result, Hit(min(hlL, hlR), 5.0));

    // Mouth - small curved ellipsoid
    vec3 mouthP = p - vec3(0.0, 2.32, 0.23);
    float mouth = sdEllipsoid(mouthP, vec3(0.03, 0.012, 0.015));
    result = hMin(result, Hit(mouth, 4.0));

    return result;
}

// ============================================================================
// CHERRY BLOSSOM TREE SDF
// ============================================================================

Hit cherryTree(vec3 p, vec3 pos) {
    p -= pos;
    Hit result = Hit(MAX_DIST, 0.0);

    // Trunk
    float trunk = sdCapsule(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 2.5, 0.0), 0.12);
    result = hMin(result, Hit(trunk, 3.0));

    // Main branches
    float b1 = sdCapsule(p, vec3(0.0, 2.0, 0.0), vec3(-0.8, 3.0, 0.3), 0.06);
    float b2 = sdCapsule(p, vec3(0.0, 2.2, 0.0), vec3(0.7, 3.2, -0.2), 0.06);
    float b3 = sdCapsule(p, vec3(0.0, 1.8, 0.0), vec3(0.3, 2.8, 0.5), 0.05);
    result = sminH(result, Hit(min(b1, min(b2, b3)), 3.0), 0.1);

    // Blossom clusters - spheres
    float bl1 = sdSphere(p - vec3(-0.8, 3.1, 0.3), 0.45);
    float bl2 = sdSphere(p - vec3(0.7, 3.3, -0.2), 0.4);
    float bl3 = sdSphere(p - vec3(0.3, 2.9, 0.5), 0.35);
    float bl4 = sdSphere(p - vec3(-0.3, 3.3, 0.0), 0.38);
    float bl5 = sdSphere(p - vec3(0.0, 3.5, 0.1), 0.42);
    float blossoms = min(bl1, min(bl2, min(bl3, min(bl4, bl5))));
    // Material 6 = blossom (pink-ish, mid depth)
    result = hMin(result, Hit(blossoms, 6.0));

    return result;
}

// ============================================================================
// SAKURA PETALS (floating small spheres)
// ============================================================================

float sakuraPetals(vec3 p) {
    float d = MAX_DIST;
    float t = iTime * PETAL_SPEED;

    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float px = hash(fi * 13.7) * 12.0 - 6.0;
        float pz = hash(fi * 27.3) * 10.0 - 5.0;
        float py = mod(hash(fi * 41.1) * 6.0 - t * (0.3 + hash(fi * 53.9) * 0.4), 6.0);

        // Gentle sway
        px += sin(t * 0.7 + fi * 2.1) * 0.4;
        pz += cos(t * 0.5 + fi * 1.7) * 0.3;

        vec3 petalPos = vec3(px, py, pz);
        // Elongated ellipsoid for petal shape
        vec3 pp = p - petalPos;
        float angle = t * 1.5 + fi * 3.0;
        pp.xz *= rot2(angle);
        float petal = sdEllipsoid(pp, vec3(0.06, 0.02, 0.04));
        d = min(d, petal);
    }
    return d;
}

// ============================================================================
// FULL SCENE SDF
// ============================================================================

Hit sceneSDF(vec3 p) {
    Hit result = Hit(MAX_DIST, 0.0);

    float t = iTime;
    float sway = HAIR_SWAY * sin(t * 2.5);

    // Bounce offsets per character
    float b1 = BOUNCE * max(0.0, sin(t * 3.8));
    float b2 = BOUNCE * max(0.0, sin(t * 3.8 + 2.0));
    float b3 = BOUNCE * max(0.0, sin(t * 3.8 + 4.0));

    // Girl 1 - left, mid distance (green/cyan) - cat shirt
    vec3 g1p = p - vec3(-2.5, 0.0, 3.0);
    Hit girl1 = animeGirl(g1p, b1, sway, 0.0, 0.0);
    result = hMin(result, girl1);

    // Girl 2 - center, closest to camera (red/orange) - claude logo shirt
    vec3 g2p = p - vec3(0.0, 0.0, 8.0);
    Hit girl2 = animeGirl(g2p, b2, sway * 1.2, 1.0, 1.0);
    result = hMin(result, girl2);

    // Girl 3 - right, mid-far (blue/cyan) - heart shirt
    vec3 g3p = p - vec3(2.5, 0.0, 1.0);
    Hit girl3 = animeGirl(g3p, b3, sway * 0.8, 2.0, 2.0);
    result = hMin(result, girl3);

    // Cherry tree - left back
    Hit tree1 = cherryTree(p, vec3(-4.0, 0.0, -2.0));
    result = hMin(result, tree1);

    // Cherry tree - right back
    Hit tree2 = cherryTree(p, vec3(4.5, 0.0, -3.0));
    result = hMin(result, tree2);

    // Ground plane
    float ground = sdPlane(p, 0.0);
    result = hMin(result, Hit(ground, 7.0));

    // Sakura petals
    float petals = sakuraPetals(p);
    result = hMin(result, Hit(petals, 8.0));

    return result;
}

// ============================================================================
// NORMAL CALCULATION
// ============================================================================

vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.003, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy).d - sceneSDF(p - e.xyy).d,
        sceneSDF(p + e.yxy).d - sceneSDF(p - e.yxy).d,
        sceneSDF(p + e.yyx).d - sceneSDF(p - e.yyx).d
    ));
}

// ============================================================================
// CEL SHADING
// ============================================================================

float celShade(float d) {
    // 3-band quantization
    if (d > 0.6) return 1.0;
    if (d > 0.3) return 0.65;
    return 0.35;
}

// ============================================================================
// RAYMARCHING
// ============================================================================

Hit raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    Hit closest = Hit(MAX_DIST, 0.0);

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        Hit h = sceneSDF(p);

        if (h.d < SURF_DIST) {
            return Hit(t, h.mat);
        }
        if (t > MAX_DIST) break;
        t += h.d * 0.8;
    }

    return Hit(MAX_DIST, 0.0);
}

// ============================================================================
// SHIRT DESIGNS - outlined animals projected onto torso
// ============================================================================

// Returns outline distance (abs of SDF = outline)
float outlineSDF(float d, float thickness) {
    return abs(d) - thickness;
}

// Bunny outline
float bunnyDesign(vec2 uv) {
    uv *= 14.0; // scale up for easier modeling
    // Head
    float head = length(uv) - 0.8;
    // Ears
    vec2 earL = uv - vec2(-0.3, 1.0);
    float earLd = sdEllipsoid(vec3(earL, 0.0), vec3(0.2, 0.55, 1.0));
    vec2 earR = uv - vec2(0.3, 1.0);
    float earRd = sdEllipsoid(vec3(earR, 0.0), vec3(0.2, 0.55, 1.0));
    float shape = min(head, min(earLd, earRd));
    // Eyes
    float eyeL = length(uv - vec2(-0.3, 0.15)) - 0.12;
    float eyeR = length(uv - vec2(0.3, 0.15)) - 0.12;
    // Nose
    float nose = length(uv - vec2(0.0, -0.15)) - 0.1;
    float features = min(min(eyeL, eyeR), nose);
    // Combine as outline
    return min(outlineSDF(shape, 0.08), outlineSDF(features, 0.06)) / 14.0;
}

// Cat outline
float catDesignOutline(vec2 uv) {
    uv *= 14.0;
    // Head
    float head = length(uv) - 0.75;
    // Pointy ears
    vec2 earL = uv - vec2(-0.55, 0.7);
    float earLd = max(abs(earL.x) - 0.22, earL.y - 0.35);
    earLd = max(earLd, -earL.y - 0.05);
    vec2 earR = uv - vec2(0.55, 0.7);
    float earRd = max(abs(earR.x) - 0.22, earR.y - 0.35);
    earRd = max(earRd, -earR.y - 0.05);
    float shape = min(head, min(earLd, earRd));
    // Eyes
    float eyeL = length(uv - vec2(-0.28, 0.1)) - 0.13;
    float eyeR = length(uv - vec2(0.28, 0.1)) - 0.13;
    // Nose + mouth
    float nose = length(uv - vec2(0.0, -0.12)) - 0.07;
    // Whiskers (horizontal lines)
    float wL = max(abs(uv.y + 0.1) - 0.03, -(uv.x + 0.7)) ;
    wL = max(wL, uv.x + 0.15);
    float wR = max(abs(uv.y + 0.1) - 0.03, uv.x - 0.7);
    wR = max(wR, -(uv.x - 0.15));
    float features = min(min(eyeL, eyeR), nose);
    float whiskers = min(wL, wR);
    return min(min(outlineSDF(shape, 0.08), outlineSDF(features, 0.06)),
               outlineSDF(whiskers, 0.03)) / 14.0;
}

// Bear outline
float bearDesign(vec2 uv) {
    uv *= 14.0;
    // Head
    float head = length(uv) - 0.7;
    // Round ears
    float earL = length(uv - vec2(-0.55, 0.55)) - 0.28;
    float earR = length(uv - vec2(0.55, 0.55)) - 0.28;
    float shape = min(head, min(earL, earR));
    // Eyes
    float eyeL = length(uv - vec2(-0.25, 0.12)) - 0.1;
    float eyeR = length(uv - vec2(0.25, 0.12)) - 0.1;
    // Snout
    float snout = length(uv - vec2(0.0, -0.2)) - 0.22;
    // Nose
    float nose = length(uv - vec2(0.0, -0.1)) - 0.08;
    float features = min(min(eyeL, eyeR), min(snout, nose));
    return min(outlineSDF(shape, 0.08), outlineSDF(features, 0.06)) / 14.0;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Cinematic camera - slow sweeping orbit with audio-driven zoom/pan
    float camAngle = iTime * 0.05;
    float camBob = sin(iTime * 0.12) * 0.4;
    float camRadius = 7.5 + sin(iTime * 0.07) * 1.5; // breathe in/out
    vec3 ro = vec3(sin(camAngle) * camRadius, 3.0 + camBob, cos(camAngle) * camRadius + 4.5);

    // Look target pans between characters on bass hits
    float panX = sin(iTime * 0.03) * 1.5;
    float panY = 1.8 + sin(iTime * 0.09) * 0.3;
    vec3 lookAt = vec3(panX, panY, 2.0);

    // Audio zoom - bass pushes in, pull back on quiet
    vec3 toTarget = normalize(lookAt - ro);
    float zoomPush = CAM_ZOOM + sin(iTime * 0.11) * 0.5;
    ro += toTarget * zoomPush;

    // Camera matrix
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);

    // FOV breathe with energy
    float fov = 1.6 + sin(iTime * 0.08) * 0.15;
    vec3 rd = normalize(uv.x * right + uv.y * up + fov * forward);

    // Raymarch
    Hit result = raymarch(ro, rd);
    float dist = result.d;
    float mat = result.mat;

    // Cyberpunk sky
    vec3 col = vec3(0.0);
    vec2 screenUV = fragCoord / iResolution.xy;
    float skyGrad = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);

    // Dark violet-to-deep-blue sky
    vec3 skyCol = chromaDepthColor(MAX_DIST * 0.8, mix(0.2, 0.08, skyGrad));

    // Vaporwave sun - big circle sinking at horizon
    vec2 sunCenter = vec2(0.5, 0.48);
    float sunRadius = 0.18;
    float sunDist = length((screenUV - sunCenter) * vec2(1.0, 1.3)); // squash slightly
    float sunMask = smoothstep(sunRadius, sunRadius - 0.005, sunDist);
    if (sunMask > 0.01) {
        // Gradient from magenta bottom to warm yellow-orange top
        float sunY = (screenUV.y - sunCenter.y + sunRadius) / (sunRadius * 2.0);
        float sunHue = fract(mix(0.92, 0.08, clamp(sunY, 0.0, 1.0)) + BEAT_HUE_SHIFT);
        float sunLight = mix(0.4, 0.55, sunY);
        vec3 sunCol = hsl2rgb(vec3(sunHue, 0.95, sunLight));
        // Horizontal scanlines cut through the sun
        float scanline = step(0.0, sin(screenUV.y * 120.0));
        float scanFade = smoothstep(0.3, 0.55, sunCenter.y - screenUV.y + sunRadius * 0.3);
        sunCol *= 1.0 - scanline * scanFade * 0.6;
        skyCol = mix(skyCol, sunCol, sunMask);
    }
    // Sun glow halo
    float glowDist = length((screenUV - sunCenter) * vec2(1.0, 1.3));
    float glow = exp(-max(glowDist - sunRadius, 0.0) * 8.0);
    vec3 glowCol = hsl2rgb(vec3(fract(0.05 + BEAT_HUE_SHIFT), 0.9, 0.45));
    skyCol = mix(skyCol, glowCol, glow * 0.4);

    // Vaporwave parallax grid on the ground plane (below horizon)
    if (screenUV.y < 0.4) {
        float gridY = screenUV.y;
        float perspective = 1.0 / max(0.42 - gridY, 0.01);
        float gridX = (screenUV.x - 0.5) * perspective;
        float gridZ = perspective * 0.5 + iTime * 0.8;
        // Grid lines
        float lineX = smoothstep(0.06, 0.0, abs(fract(gridX * 0.3) - 0.5));
        float lineZ = smoothstep(0.06, 0.0, abs(fract(gridZ * 0.15) - 0.5));
        float grid = max(lineX, lineZ);
        float fade = smoothstep(0.0, 0.35, 0.4 - gridY);
        float gridHue = fract(0.83 + HUE_AUDIO + BEAT_HUE_SHIFT);
        vec3 gridCol = hsl2rgb(vec3(gridHue, 0.9, 0.35));
        skyCol = mix(skyCol, gridCol, grid * fade * 0.6);
    }

    // Neon horizon glow
    float horizonGlow = exp(-abs(screenUV.y - 0.38) * 12.0);
    vec3 neonGlow = hsl2rgb(vec3(fract(0.85 + HUE_AUDIO + BEAT_HUE_SHIFT), 0.95, 0.4));
    skyCol = mix(skyCol, neonGlow, horizonGlow * 0.6);

    // Building silhouettes - two parallax layers
    // Back layer: tall buildings, slow scroll
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float scrollSpeed = 0.015;
        float bx = fract(hash(fi * 3.17) + iTime * scrollSpeed) * 1.4 - 0.2;
        float bw = 0.02 + hash(fi * 5.31) * 0.035;
        float bh = 0.5 + hash(fi * 7.93) * 0.25;
        float inBuilding = step(abs(screenUV.x - bx), bw) * step(screenUV.y, bh);
        if (inBuilding > 0.5) {
            skyCol *= 0.12;
            float wx = fract((screenUV.x - bx + bw) / (bw * 0.5) * 3.0);
            float wy = fract(screenUV.y * 25.0);
            float window = step(0.3, wx) * step(wx, 0.7) * step(0.2, wy) * step(wy, 0.7);
            float lit = step(0.55, hash(fi * 13.0 + floor(screenUV.y * 25.0) * 7.0));
            float windowHue = fract(hash(fi * 17.0 + floor(screenUV.y * 25.0)) * 0.75 + HUE_AUDIO);
            vec3 windowCol = hsl2rgb(vec3(windowHue, 0.9, 0.4));
            float flicker = 0.8 + 0.2 * sin(iTime * 3.0 + fi * 11.0);
            skyCol += windowCol * window * lit * flicker * 0.5;
        }
    }
    // Front layer: shorter buildings, faster scroll
    for (int i = 0; i < 10; i++) {
        float fi = float(i) + 20.0;
        float scrollSpeed = 0.03;
        float bx = fract(hash(fi * 3.17) + iTime * scrollSpeed) * 1.4 - 0.2;
        float bw = 0.015 + hash(fi * 5.31) * 0.025;
        float bh = 0.35 + hash(fi * 7.93) * 0.2;
        float inBuilding = step(abs(screenUV.x - bx), bw) * step(screenUV.y, bh);
        if (inBuilding > 0.5) {
            skyCol *= 0.1;
            float wx = fract((screenUV.x - bx + bw) / (bw * 0.5) * 3.0);
            float wy = fract(screenUV.y * 30.0);
            float window = step(0.25, wx) * step(wx, 0.75) * step(0.2, wy) * step(wy, 0.7);
            float lit = step(0.5, hash(fi * 13.0 + floor(screenUV.y * 30.0) * 7.0));
            float windowHue = fract(hash(fi * 17.0 + floor(screenUV.y * 30.0)) * 0.75 + HUE_AUDIO);
            vec3 windowCol = hsl2rgb(vec3(windowHue, 0.95, 0.45));
            float flicker = 0.8 + 0.2 * sin(iTime * 4.0 + fi * 9.0);
            skyCol += windowCol * window * lit * flicker * 0.7;
        }
    }
    col = skyCol;

    // Sparkles / neon stars at various depths
    for (int i = 0; i < 30; i++) {
        float fi = float(i);
        float sx = hash(fi * 7.13);
        float sy = 0.55 + hash(fi * 11.37) * 0.42;
        float sparkleDepth = hash(fi * 19.71);
        float twinkle = 0.4 + 0.6 * pow(max(0.0, sin(iTime * (2.0 + fi * 0.3) + fi * 5.0)), 4.0);
        float sparkleSize = 0.004 + hash(fi * 31.9) * 0.005;
        float sd = length(screenUV - vec2(sx, sy));
        float sparkle = smoothstep(sparkleSize, 0.0, sd);
        // Cross/star shape
        vec2 sp = screenUV - vec2(sx, sy);
        float cross_s = max(
            smoothstep(sparkleSize * 5.0, 0.0, abs(sp.x)) * smoothstep(sparkleSize * 0.6, 0.0, abs(sp.y)),
            smoothstep(sparkleSize * 5.0, 0.0, abs(sp.y)) * smoothstep(sparkleSize * 0.6, 0.0, abs(sp.x))
        );
        float totalSparkle = max(sparkle, cross_s * 0.6) * twinkle;
        float sparkHue = fract(sparkleDepth * 0.75 + HUE_AUDIO + BEAT_HUE_SHIFT);
        vec3 sparkCol = hsl2rgb(vec3(sparkHue, 0.95, 0.55));
        col += sparkCol * totalSparkle * 0.9;
    }

    if (dist < MAX_DIST) {
        vec3 p = ro + rd * dist;
        vec3 n = getNormal(p);

        // Lighting - key + fill
        vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
        vec3 fillDir = normalize(vec3(-0.4, 0.3, -0.5));
        float diff = max(dot(n, lightDir), 0.0);
        float fill = max(dot(n, fillDir), 0.0) * 0.3;
        float cel = celShade(diff + fill);

        // Rim lighting for anime pop
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        float rimMask = smoothstep(0.0, 0.4, dot(n, lightDir) + 0.3);
        float rimLight = rim * rimMask * 0.35;

        // Outline detection via normal·viewDir
        float edge = 1.0 - max(dot(n, -rd), 0.0);
        float outline = smoothstep(0.55, 0.7, edge);

        // Base lightness from cel shading
        float lightness = 0.15 + cel * 0.35;

        // Material-specific adjustments
        if (mat < 1.5) {
            // Skin - slightly brighter
            lightness += 0.08;
        } else if (mat < 2.5) {
            // Hair - slightly darker
            lightness -= 0.03;
        } else if (mat < 3.5) {
            // Outfit/tree trunk/skirt - standard
            lightness += 0.0;
        } else if (mat < 4.5) {
            // Eyes - dark iris
            lightness = 0.12;
        } else if (mat < 5.5) {
            // Eye highlight - bright pop
            lightness = 0.55;
        } else if (mat < 6.5) {
            // Cherry blossoms - bright pink
            lightness = 0.3 + cel * 0.25;
        } else if (mat < 7.5) {
            // Ground - vaporwave grid with neon glow
            float gx = abs(fract(p.x * 0.5) - 0.5);
            float gz = abs(fract(p.z * 0.5 + iTime * 0.1) - 0.5);
            float lineX = smoothstep(0.02, 0.0, gx);
            float lineZ = smoothstep(0.02, 0.0, gz);
            float gridLine = max(lineX, lineZ);
            // Soft glow around grid lines
            float glowX = smoothstep(0.08, 0.0, gx) * 0.3;
            float glowZ = smoothstep(0.08, 0.0, gz) * 0.3;
            float gridGlow = max(glowX, glowZ);
            // Fade grid intensity with distance
            float gridFade = exp(-length(p.xz) * 0.04);
            lightness = 0.06 + (gridLine * 0.4 + gridGlow * 0.2) * gridFade;
        } else if (mat < 8.5) {
            // Petals - bright, close
            lightness = 0.45;
        } else if (mat < 9.5) {
            // Skirt stripe (lighter band)
            lightness = 0.2 + cel * 0.38;
        } else {
            // Shirts with outlined animal designs (mat 10, 11, 12)
            // Recompute bounce to keep design locked to torso
            float bt = iTime;
            float girlBounce = 0.0;
            vec3 girlPos = vec3(-2.5, 0.0, 3.0);
            if (mat < 10.5) {
                girlBounce = BOUNCE * max(0.0, sin(bt * 3.8));
            } else if (mat < 11.5) {
                girlPos = vec3(0.0, 0.0, 8.0);
                girlBounce = BOUNCE * max(0.0, sin(bt * 3.8 + 2.0));
            } else {
                girlPos = vec3(2.5, 0.0, 1.0);
                girlBounce = BOUNCE * max(0.0, sin(bt * 3.8 + 4.0));
            }
            vec3 localP = p - girlPos;
            vec2 shirtUV = vec2(localP.x, localP.y - 1.82 - girlBounce);

            float design = 1.0;
            if (mat < 10.5) {
                design = bunnyDesign(shirtUV);
            } else if (mat < 11.5) {
                design = catDesignOutline(shirtUV);
            } else {
                design = bearDesign(shirtUV);
            }

            float designMask = 1.0 - smoothstep(0.0, 0.003, design);
            float darkMask = 0.0; // outlines only, no separate dark features

            // Base shirt
            lightness = 0.15 + cel * 0.3;
            // Design brighter
            lightness = mix(lightness, 0.5, designMask * 0.7);
            // Dark features (eyes/nose) on cat
            lightness = mix(lightness, 0.08, darkMask * 0.8);
        }

        // ChromaDepth color from actual distance
        col = chromaDepthColor(dist, lightness);

        // Apply rim light (brighten edges catching key light)
        col += col * rimLight;

        // Apply outline (darken edges for cel look)
        col *= (1.0 - outline * 0.75);

        // Bass brightness throb
        col *= BASS_BRIGHT;

        // Beat flash
        if (beat) {
            col *= 1.12;
        }

        // Depth fog toward background - stronger for far objects
        float fog = exp(-dist * 0.07);
        vec3 fogCol = mix(skyCol, neonGlow * 0.3, 0.2); // tinted with neon for atmosphere
        col = mix(fogCol, col, fog);
    }

    // Vignette
    vec2 vc = fragCoord / iResolution.xy - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.5;

    // Gentle frame feedback (subtle motion blur, not ghosty)
    vec4 prev = getLastFrameColor(fragCoord / iResolution.xy);
    col = mix(prev.rgb * 0.95, col, 0.75);

    // Ensure saturation stays high for chromadepth
    vec3 colHSL = rgb2hsl(col);
    colHSL.y = min(colHSL.y * 1.15, 1.0);
    colHSL.z = clamp(colHSL.z, 0.04, 0.58);
    col = hsl2rgb(colHSL);

    // Subtle dithering to reduce color banding
    float dither = (hash(dot(fragCoord, vec2(12.9898, 78.233)) + iTime) - 0.5) / 255.0;
    col += dither;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
