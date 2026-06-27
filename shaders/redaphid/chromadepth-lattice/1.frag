// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, fractal, glyph, infinite-zoom, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/chromadepth-lattice/1&wavelet=true&controller=wavelet-ease&fullscreen=true&name=ChromaDepth%20Lattice%20Zoom
// CHROMADEPTH LATTICE (zoom) — ChromaDepth infinite-zoom fractal. A seamless recursive descent toward a
// central "eye": you fall forever through self-similar 3x3 glyph cells, the violet eye is the
// far vanishing point, red cells rush past at the periphery (near). Built on Frank Force's
// "Eye of God Zoom" (the seamless e^(-log3·t) recursion), recoloured with the ChromaDepth
// diamond's depth-pop, and conditioned with the iris/1 signal discipline.
//
// ── FRACTAL EVOLUTION (the focus of this shader — FIVE layered timescales, none in sync) ──
//   1. PER-FRAME   spring-smoothed audio micro-reacts (brightness/warp/sparkle).         ~ms
//   2. DESCENT     flowPhase (monotonic, energy-accelerated) drives the zoom; each level   ~s
//                  reveals a fresh hashed cell pattern → genuine new structure as you fall.
//   3. IDLE LFOs   warp/curvature/saccade wander on incommensurate phi/sqrt2 rates.       ~10s
//   4. EVO         evoFlow/evoWarp/evoPlasma slowly morph the fractal's CHARACTER          ~min
//                  (warp turbulence, vortex curl, depth distribution); re-rolls ~1.3min.
//   5. SECTION     a breakdown→drop advances sectionMode → a fresh fractal "alphabet".  ~track
//
//   ChromaDepth discipline: evolution NEVER rotates hue (that would break red=near). It only
//   touches structure, warp, descent speed, depth blend, brightness — the hue↔depth lock holds.
//
//   Requires ?wavelet=true&controller=wavelet-ease. Self-morphs with NO mic (iTime/LFO base);
//   springs add on top when audio is present.
// License: CC BY-NC-SA 3.0 — derivative of Frank Force's "Eye of God Zoom" (2017).

#define GLYPH    3.0
#define RECURSE  4
#define PI   3.14159265359
#define PHI  1.6180339887
#define SQ2  1.4142135624
const float E = 2.718281828459;

// ── wavelet-ease controller outputs (declared by hand; 0 without the controller / a mic) ──
uniform float waveletBassSpring;     // deep bass → warp swell + DEEP-level throb
uniform float waveletBand2Spring;    // low-mid → MID-level body
uniform float waveletBand5Spring;    // treble/air → NEAR-level shimmer + fire
uniform float waveletCentroidSpring; // brightness → warp frequency
uniform float energySpring;          // loudness → glow
uniform float melodyFlow;            // melody contour → vortex curl
uniform float spectralCrestSmooth;   // articulation → sparkle + pop (smoothed)
uniform float flowPhase;             // monotonic descent clock (energy-accelerated)
uniform float morphPhase;            // monotonic warp/saccade clock
uniform float quietGate;             // 0 in silence → 1 loud (gates ALL audio offsets)
uniform float evoFlow;               // minutes-scale: depth-distribution morph
uniform float evoWarp;               // minutes-scale: warp turbulence morph
uniform float evoPlasma;             // minutes-scale: vortex curl morph
uniform float sectionMode;           // section index → fractal alphabet
// waveletBassZScore + wavelet_bassHit auto-declare (raw) — used only for the transient kick.

// per-frame morph state (set once in main, read by initUV / eyeFractal)
float gWarpAmp, gWarpFreq, gBandNear, gBandMid, gBandDeep;

float randF(int i){ return fract(sin(float(i)) * 43758.5453); }
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }

// ChromaDepth palette (HSL — raw spectral order is what the glasses need). t:0=red(near)→0.72=violet(far).
vec3 chromadepth(float t, float lit){
    t = clamp(t, 0.0, 1.0);
    return hsl2rgb(vec3(t * 0.72, 0.95, clamp(lit, 0.02, 0.6)));
}

// Frank Force's recursion fade — new detail fades in as you descend (no level popping).
float recursionFade(int r, float tp){
    if (r > RECURSE) return tp;
    return max(float(r) - tp, 0.0) / float(RECURSE);
}

// DEPTH-COHERENT REACTIVITY: near levels shimmer with treble, deep levels throb with bass —
// the iris "feature family → region" mapping, applied to RECURSION DEPTH.
float bandForLevel(int r){
    if (r <= 1) return gBandNear;   // treble / crest (surface)
    if (r <= 3) return gBandMid;    // mids (body)
    return gBandDeep;               // bass (deep)
}

// Organic eye warp — layered sines; amplitude/frequency evolve (layers 1,3,4).
vec2 initUV(vec2 uv){
    uv.x += 0.03 * sin(7.0 * uv.y + 0.17 * iTime);
    uv.y += 0.03 * sin(7.0 * uv.x + 0.13 * iTime);
    uv.x += gWarpAmp * sin(gWarpFreq * uv.y + 0.31 * iTime + morphPhase);
    uv.y += gWarpAmp * sin(gWarpFreq * uv.x + 0.27 * iTime + morphPhase);
    return uv;
}

// Seamless recursive glyph walk. Returns cell brightness, a detailed 0..1 depth, and the
// glowing recursive cell-border field (the infinite nested grid that reads as "eye of god").
void eyeFractal(vec2 pos, int iterations, float tp, int seedBase, out float lum, out float depth, out float edge){
    ivec2 gpLast = ivec2(1);
    ivec2 gp = ivec2(1);
    lum = 0.0; depth = 0.0; edge = 0.0; float wsum = 0.0;
    for (int r = 0; r <= RECURSE + 1; r++){
        int hsh = iterations + r + gpLast.y * 3 + gp.x * 7 + gp.y + seedBase;
        float cell = randF(hsh);
        float cell2 = randF(hsh + 31);
        float fade = recursionFade(r, tp);

        // GLOWING CELL BORDERS — distance to this level's cell edges, fading in with depth.
        // Stacked across levels this is an infinite nested grid rushing at you (the hypnotic bit).
        vec2 f = fract(pos);
        float b = min(min(f.x, f.y), min(1.0 - f.x, 1.0 - f.y));
        edge += smoothstep(0.08, 0.0, b) * fade * (0.4 + cell);

        // crisp per-cell brightness with a bright "dot" core (a glyph), depth-band reactive
        float dot = smoothstep(0.34, 0.0, length(f - 0.5)) * cell2;
        float cl = (mix(0.03, 1.0, pow(cell, 2.0)) + dot * 0.8) * (0.5 + bandForLevel(r) * 0.9);
        lum += cl * fade;

        // cells sit at DISTINCT depths → a detailed faceted depthscape, not a smooth gradient
        depth += (float(r) + tp + (cell - 0.5) * 1.4) * fade;
        wsum += fade;

        pos *= GLYPH;
        gpLast = gp;
        gp = ivec2(pos);
        pos -= floor(pos);
    }
    float iw = 1.0 / max(wsum, 0.001);
    lum   = clamp(lum * iw * 1.7, 0.0, 1.8);
    edge  = clamp(edge * iw, 0.0, 1.2);
    depth = clamp(depth * iw / float(RECURSE + 1), 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // square-aspect, centred UV
    vec2 uv = fragCoord / iResolution.y;
    uv -= vec2(0.5 * iResolution.x / iResolution.y, 0.5);

    // ── set this frame's evolving character (layers 1/3/4) ──
    gWarpAmp  = 0.20 * (0.6 + evoWarp * 0.8) + waveletBassSpring * 0.12 * quietGate;
    gWarpFreq = 2.0 + (evoPlasma - 0.5) * 1.5 + waveletCentroidSpring * 1.0 * quietGate;
    gBandNear = waveletBand5Spring * quietGate;
    gBandMid  = waveletBand2Spring * quietGate;
    gBandDeep = waveletBassSpring * quietGate;

    uv = initUV(uv);
    // slow spiral so it isn't a static concentric blob — the whole field turns, faster on melody
    uv = rot(uv, iTime * 0.05 + 0.4 * sin(iTime * 0.021 * PHI) + morphPhase * 0.3 + melodyFlow * 0.4 * quietGate);

    // ── DESCENT (layer 2): monotonic, energy-accelerated; per-pixel radial time-warp = the vortex ──
    float curv = -7.0 + (evoPlasma - 0.5) * 6.0 + 2.0 * sin(iTime * 0.03 * PHI) + melodyFlow * 1.5 * quietGate;
    float descent = iTime * 1.05 + flowPhase * 2.4;                // brisk hypnotic fall; flowPhase adds audio accel
    float radialWarp = curv * pow(length(uv) + 1e-4, 0.2);

    // SMOOTH beat pop + transient kick (a brief OUTWARD lunge in zoom space — the chromadepth pop)
    float pop  = clamp(energySpring * 0.5 + spectralCrestSmooth * 0.45, 0.0, 1.0) * quietGate;
    float kick = clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.5 + clamp(wavelet_bassHit, 0.0, 1.0) * 0.3;

    float zp = descent + radialWarp - kick * 0.25;
    int iterations = int(floor(zp));
    float tp = zp - float(iterations);
    float zoom = pow(E, -log(GLYPH) * tp) * 0.2;                   // seamless: one level per unit of zp

    // accumulate the focus offset toward the centre cell (keeps the zoom self-similar)
    vec2 offset = vec2(0.0);
    float gsfi = 1.0 / GLYPH;
    for (int i = 0; i < 13; i++) offset += vec2(gsfi) * pow(gsfi, float(i));

    // micro-saccade — the eye drifts even while fixated (incommensurate, tiny, gated)
    vec2 sac = 0.004 * vec2(sin(flowPhase * 0.83 + morphPhase * 0.21),
                            sin(flowPhase * 0.71 + morphPhase * 0.37));
    vec2 uvFractal = uv * zoom + offset + sac;

    int seedBase = int(sectionMode) * 101;                         // layer 5: section → fractal alphabet
    float lum, cellDepth, edge;
    eyeFractal(uvFractal, iterations, tp, seedBase, lum, cellDepth, edge);

    // ── CHROMADEPTH (hue stays LOCKED to depth — evolution never touches it) ──
    // Radial gives the macro tunnel (rim=red/near → eye=violet/far); cellDepth carries strong
    // per-cell variation so the frame is a DETAILED faceted depthscape, not a smooth gradient.
    // Evolution modulates the cell weight (detail), never the hue, so red=near always holds.
    float rr = length(uv);
    // ramp only the inner radius: the whole OUTER field is red/near (a wall of cells rushing at
    // you = the pop), grading through green→blue to a violet core. Detail comes from the grid/
    // cells/borders below, NOT from depth — so hue stays radial-locked and red=near always holds.
    float tRadial = 1.0 - smoothstep(0.0, 0.55, rr);
    float t = clamp(tRadial * 0.95 + (cellDepth - 0.5) * (0.14 + evoFlow * 0.12) - pop * 0.12, 0.0, 1.0);

    float lit = mix(0.05, 0.78, pow(lum, 1.0)) * (0.85 + energySpring * 0.2);
    vec3 col = chromadepth(t, lit);

    // GLOWING RECURSIVE BORDERS — tinted at their own (slightly nearer) depth so the near grid
    // lines pop red toward you. This is the structure that makes it read as an infinite fractal.
    col += chromadepth(clamp(t - 0.14, 0.0, 1.0), 0.6) * edge * (0.7 + energySpring * 0.6);

    // glowing violet PUPIL at the far centre — the eye you fall into
    float pupil = smoothstep(0.05, 0.0, rr);
    col += chromadepth(0.92, 0.55) * pupil;

    // the beat reddens + brightens the NEAR band (pops it forward), not the whole frame
    col += chromadepth(0.04, 0.5) * pop * (1.0 - t) * 0.45;

    // fire — warm-white sparkle on bright near cells, treble/crest gated (leans red so it pops)
    col += vec3(1.0, 0.82, 0.6) * smoothstep(0.78, 1.0, lum)
         * (0.25 + gBandNear * 0.6 + spectralCrestSmooth * 0.4) * (1.0 - t) * 0.5;

    // gentle motion trail smooths the descent without smearing the cells
    vec4 prev = getLastFrameColor(fragCoord / iResolution.xy);
    col = mix(prev.rgb * 0.88, col, 0.82);

    // ChromaDepth integrity: high saturation, bounded lightness, never white
    vec3 hsl = rgb2hsl(col);
    hsl.y = min(hsl.y * 1.12, 1.0);
    hsl.z = clamp(hsl.z, 0.0, 0.6);
    col = hsl2rgb(hsl);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
