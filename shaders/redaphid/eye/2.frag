// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, fractal, hex, lattice, eye, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/eye/2&wavelet=true&controller=wavelet-ease&fullscreen=true&name=Eye%20Hex
// EYE OF GOD II — ChromaDepth hex-lattice tunnel. A recursive mirror-fold hexagonal lattice
// where each RECURSION LEVEL is a depth layer: the near layers read red (pop forward), the far
// layers recede to violet, and a wave of light travels through the levels TOWARD you (the pulse
// the original lattice already had — now it's a depth motion you fall into).
//
// Base: a ShaderToy hexagonal mirror-fold fractal (Fabrice-style rot, IQ hsv, hex distance).
// Recoloured with the diamond's depth-pop and conditioned with the iris/1 signal discipline.
//
// ── FRACTAL EVOLUTION (FIVE layered timescales, never in sync — the focus of this series) ──
//   1. PER-FRAME  spring-smoothed audio (brightness / border glow / pulse amplitude).      ~ms
//   2. PULSE      a light wave travels through the depth levels (flowPhase, energy-accel).   ~s
//   3. IDLE LFOs  per-level rotation churn + pan + zoom-breath on incommensurate rates.    ~10s
//   4. EVO        evoFlow/evoWarp/evoPlasma morph pan direction, rotation curl, depth spread. ~min
//   5. SECTION    a breakdown→drop re-seeds the lattice rotation (sectionMode).           ~track
//
//   ChromaDepth discipline: hue is LOCKED to recursion-level depth (near=red, far=violet).
//   Evolution touches rotation / pan / brightness / pulse — never the hue. red=near always holds.
//   Requires ?wavelet=true&controller=wavelet-ease. Self-morphs with NO mic; springs add live.
// License: CC BY-NC-SA 3.0 (derivative — adapted ShaderToy hex mirror-fold fractal).

#define PI  3.14159265359
#define PHI 1.61803398875
#define LEVELS 10
#define FIRST 4
const float E = 2.718281828459;

// ── wavelet-ease controller outputs (declared by hand; 0 without the controller / a mic) ──
uniform float waveletBassSpring;     // deep bass → FAR-level throb + pulse punch
uniform float waveletBand2Spring;    // low-mid → MID-level body
uniform float waveletBand5Spring;    // treble/air → NEAR-level shimmer
uniform float waveletCentroidSpring; // brightness → border glow
uniform float energySpring;          // loudness → overall glow
uniform float melodyFlow;            // melody contour → lattice rotation
uniform float spectralCrestSmooth;   // articulation → pulse sparkle (smoothed)
uniform float flowPhase;             // monotonic pulse/descent clock (energy-accelerated)
uniform float morphPhase;            // monotonic rotation clock
uniform float quietGate;             // 0 silence → 1 loud (gates ALL audio offsets)
uniform float evoFlow;               // minutes-scale: pan direction
uniform float evoWarp;               // minutes-scale: rotation curl
uniform float evoPlasma;             // minutes-scale: depth spread
uniform float sectionMode;           // section index → lattice re-seed
// waveletBassZScore + wavelet_bassHit auto-declare (raw) — transient pulse punch only.

mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// ChromaDepth palette (HSL — raw spectral order). t:0=red(near)→0.72=violet(far).
vec3 chromadepth(float t, float lit){
    t = clamp(t, 0.0, 1.0);
    return hsl2rgb(vec3(t * 0.72, 0.95, clamp(lit, 0.02, 0.62)));
}

float hexDist(vec2 p){
    #define MULT1 (1.0 / tan(PI / 3.0))
    #define MULT2 (1.0 / sin(PI / 3.0))
    float dx = abs(p.x), dy = abs(p.y);
    return max(dx + dy * MULT1, max(dx, dy * MULT2));
}

// depth-coherent reactivity: near layers shimmer w/ treble, far layers throb w/ bass
float bandForDepth(float ld){
    if (ld < 0.34) return waveletBand5Spring * quietGate;
    if (ld < 0.67) return waveletBand2Spring * quietGate;
    return waveletBassSpring * quietGate;
}

// shared per-frame state
float gSpin, gPulse, gPop;

// Recursive hex mirror-fold lattice → front-to-back composited ChromaDepth layers.
vec4 fractal(vec2 p){
    float scale = 1.0;
    float aliasBase = 1.0 / iResolution.y;
    float alpha = 0.0;
    vec3 color = vec3(0.0);

    for (int i = 0; i < LEVELS; i++){
        float s = 2.0;
        // mirror-repeat fold (TEXTURE_ADDRESS_MIRROR), then rotate, then scale
        p = 1.0 - abs(s * fract(p - 0.5) - s * 0.5);
        // per-level rotation: original static i*PI/8 + an evolving churn (layer 3/4) + melody
        float theta = float(i) * PI * 0.125
                    + gSpin * (0.4 + float(i) * 0.05)
                    + (evoWarp - 0.5) * float(i) * 0.10;
        p *= rot2(theta);
        scale *= s;

        if (i < FIRST) continue;

        // borders: hex ring + interior cross (the lattice texture)
        vec2 uv = abs(p);
        float delt1 = abs((hexDist(uv) - 0.6) - 0.1);
        float delt2 = min(length(uv) - 0.2, min(uv.x, uv.y));
        float m = min(delt1, delt2);
        float alias = aliasBase * 0.5 * scale;
        float f = smoothstep(0.10 + alias, 0.10, m) * 0.4 + smoothstep(0.22, 0.11, m) * 0.6;

        // ── DEPTH = recursion level. Near layers (i=FIRST) = red, far (i=LEVELS-1) = violet. ──
        float ld = float(i - FIRST) / float(LEVELS - 1 - FIRST);
        // depth spread evolves (compress/expand the tunnel) but never reorders → red=near holds
        float t = clamp(ld * (0.78 + evoPlasma * 0.20) - gPop * 0.12, 0.0, 1.0);

        // ── PULSE: a light wave travelling through the levels TOWARD you (far→near). ──
        float wave = smoothstep(0.22, 0.0, abs(ld - (1.0 - gPulse)));
        float band = bandForDepth(ld);
        float lit = (smoothstep(0.06 + alias, 0.06, m) * 0.5 + 0.18)
                  * (0.7 + energySpring * 0.4 + band * 0.7);
        lit += wave * (0.5 + gPop * 0.8 + spectralCrestSmooth * 0.5);   // the travelling wave brightens

        vec3 c = chromadepth(t, lit);
        c += chromadepth(clamp(t - 0.12, 0.0, 1.0), 0.5) * wave * 0.6;  // wave front pops a touch redder

        // front-to-back compositing (near layers occlude far)
        color = (1.0 - alpha) * c + color;
        alpha = (1.0 - alpha) * f + alpha;
    }
    return vec4(color, alpha);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // CENTRED on screen for ALL aspects (height-based) → the eye sits dead-centre on mobile too.
    // (The old `*2-1` + big constant pan landed the lattice's convergence off-centre, and where
    //  it landed depended on aspect ratio — so on a tall phone it drifted into a corner.)
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 p = (fragCoord / iResolution.xy) * 2.0 - 1.0;   // screen -1..1, for the vignette only

    // ── per-frame evolving state ──
    gSpin  = iTime * 0.04 + morphPhase * 0.4 + melodyFlow * 0.5 * quietGate;
    gPop   = clamp(energySpring * 0.5 + spectralCrestSmooth * 0.45, 0.0, 1.0) * quietGate;
    float kick = clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.5 + clamp(wavelet_bassHit, 0.0, 1.0) * 0.3;
    // PULSE clock — monotonic, energy-accelerated; the kick punches an extra forward shove.
    gPulse = fract(flowPhase * 0.6 + iTime * 0.18 + kick * 0.15);

    // BOUNDED life that keeps the eye CENTRED: a slow whole-field rotation + a tiny orbital drift
    // (never carries the focal point away), and a self-similar zoom-breath that reads as a fall.
    uv = rot2(iTime * 0.025 + morphPhase * 0.2 + (evoWarp - 0.5) * 0.4) * uv;
    uv += 0.05 * vec2(sin(iTime * 0.11 + flowPhase * 0.3), cos(iTime * 0.09 + flowPhase * 0.3));
    // small uv near 0 means we're zoomed deep into the CENTRAL recursion → the eye is at centre.
    uv *= 0.07 * (1.0 + 0.16 * sin(iTime * 0.03 * PHI) + waveletBassSpring * 0.06 * quietGate);

    vec4 frac = fractal(uv);

    // composite over a DARK (not grey) background so ChromaDepth depth stays unambiguous;
    // the empty void reads as deep violet/black (far), letting the red layers pop forward.
    vec3 bg = chromadepth(0.95, 0.02);
    vec3 col = mix(bg, frac.rgb, frac.a);

    // ChromaDepth integrity: high saturation, bounded lightness, never white
    vec3 hsl = rgb2hsl(col);
    hsl.y = min(hsl.y * 1.12, 1.0);
    hsl.z = clamp(hsl.z, 0.0, 0.62);
    col = hsl2rgb(hsl);

    // vignette (darken, don't grey) so the lattice floats forward
    col = mix(col, vec3(0.0), dot(p, p) * 0.45);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
