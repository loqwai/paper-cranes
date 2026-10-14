// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: terrain, voronoi, biome, infinite, touch, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/wip/terra/1&wavelet=true&controller=lattice-nav&fullscreen=true&knob_1=0.21&name=Terra
// TERRA (1.frag) — an INFINITE, NON-REPEATING world built like Minecraft: from hash-based value
// noise, NOT a periodic fold. Worley/Voronoi cells (each a unique hash-jittered point) make the
// GEOMETRY itself non-repeating; a low-frequency FBM "biome" field gives regions distinct character
// (palette + cell size), so roaming always reveals new terrain. Drag to roam, pinch to zoom
// (lattice-nav). Per-device seeds → every screen's world is its own. Music breathes it (iris
// discipline: smooth springs, quietGate; cells hold still — life is in light, not geometry motion).
// NOTE: like Minecraft's "Far Lands", 32-bit float precision limits how far you can pan before the
// noise degrades — fine for normal roaming, not literally infinite.
// License: CC0

#define TAU 6.28318530718
#define PI  3.14159265359

uniform float waveletBassSpring;
uniform float waveletBand2Spring;
uniform float waveletBand5Spring;
uniform float waveletCentroidSpring;
uniform float energySpring;
uniform float melodyFlow;
uniform float spectralCrestSmooth;
uniform float quietGate;
// lattice-nav: navigation + permanent mutation (structure-agnostic — terra reuses it)
uniform float navX;
uniform float navY;
uniform float navZoom;
uniform float paletteShift;

// Robust multiply-based hashes (Dave Hoskins). The classic fract(sin(dot…)*N) aliases badly at
// moderate integer coords (sin of an astronomically-large argument) → streaky precision artifacts;
// these stay well-distributed across the roaming range.
float h21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
vec2 h22(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// smooth value noise + FBM — the NON-PERIODIC primitive (Minecraft uses this, not sines)
float vnoise(vec2 p){
    vec2 ip = floor(p), fp = fract(p);
    fp = fp * fp * (3.0 - 2.0 * fp);
    float a = h21(ip), b = h21(ip + vec2(1, 0)), c = h21(ip + vec2(0, 1)), d = h21(ip + vec2(1, 1));
    return mix(mix(a, b, fp.x), mix(c, d, fp.x), fp.y);
}
float fbm(vec2 p){
    float v = 0.0, a = 0.55;
    for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.0 + 17.0; a *= 0.5; }
    return v;
}

vec3 lush(float s, float lit, float chroma){
    return oklch2rgb(vec3(clamp(lit, 0.04, 0.92), chroma, fract(s) * TAU));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 res = iResolution.xy;
    vec2 uvN = (fragCoord - 0.5 * res) / res.y;
    vec2 scr = fragCoord / res;

    float navz = navZoom < 0.01 ? 1.0 : navZoom;
    vec2 seedOff = vec2(seed, seed2) * 8.0;                        // per-device world offset (kept modest for precision)
    vec2 world = uvN * (0.07 / navz) + vec2(navX, navY) + seedOff; // navigable world coordinate

    // ── BIOME (low-freq FBM) → regional character: palette zone + cell density. NON-PERIODIC. ──
    float biome  = fbm(world * 1.3);
    float biome2 = fbm(world * 0.7 + 31.0);
    float density = 60.0 * mix(0.6, 1.7, biome2);                  // cell size varies by region

    // ── WORLEY / VORONOI cells — hash-jittered point per grid cell → non-repeating geometry ──
    vec2 p = world * density;
    vec2 ip = floor(p), fp = fract(p);
    float f1 = 9.0, f2 = 9.0; vec2 cid = ip;
    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++){
        vec2 g = vec2(float(i), float(j));
        vec2 o = h22(ip + g);                                      // static jitter → a stable map
        vec2 r = g + o - fp;
        float d = dot(r, r);
        if (d < f1){ f2 = f1; f1 = d; cid = ip + g; }
        else if (d < f2){ f2 = d; }
    }
    f1 = sqrt(f1); f2 = sqrt(f2);
    float edge = f2 - f1;                                          // small near cell borders
    float ch  = h21(cid);                                          // per-cell hash (seeded via world)
    float ch2 = h21(cid + 7.3);

    // ── COLOUR (oklch) — each cell its own hue from its hash + the biome zone + melody + device ──
    float hue = ch * 0.14 + biome * 1.15 + melodyFlow * 0.15 * quietGate + paletteShift + seed;
    float lit = (0.40 + 0.35 * ch2)
              * (0.85 + energySpring * 0.30 * quietGate)
              + waveletBassSpring * 0.12 * quietGate;              // bass swells brightness
    float chroma = 0.12 + biome2 * 0.05;
    vec3 col = lush(hue, lit, chroma);
    col *= 0.78 + 0.30 * smoothstep(0.0, 0.6, f1);                 // gentle interior shading (depth toward the point)

    // ── GLOWING BORDERS ── contrasting seams; treble fattens them ──
    float bw = 0.045 + waveletBand5Spring * 0.03 * quietGate;
    float border = smoothstep(bw, 0.0, edge);
    col = mix(col, lush(hue + 0.5, 0.88, chroma), border * 0.7);

    // ── SPARKLE at cell points (treble / articulation) ──
    float core = smoothstep(0.10, 0.0, f1);
    col += vec3(1.0, 0.95, 0.85) * core * (waveletBand5Spring * 0.4 + spectralCrestSmooth * 0.4) * quietGate;

    // gentle bass bloom + soft feedback (dreamy, no geometry motion)
    col *= 1.0 + waveletBassSpring * 0.20 * quietGate;
    vec3 prev = getLastFrameColor(scr).rgb;
    col = mix(prev * 0.92, col, 0.6);

    col = mix(col, vec3(0.0), dot(uvN, uvN) * 0.15);              // soft vignette
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
