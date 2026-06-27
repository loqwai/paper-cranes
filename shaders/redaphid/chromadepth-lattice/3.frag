// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: fractal, hex, lattice, touch, color, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/chromadepth-lattice/3&wavelet=true&controller=lattice-nav&fullscreen=true&name=Living%20Lattice
// LIVING LATTICE — the hex mirror-fold lattice (3.frag), freed from ChromaDepth for BEAUTIFUL
// continuous colour, built to AMAZE when people play with it live:
//   * BEAUTIFUL COLOUR — a smooth Oklch palette over a coverage-weighted continuous field, so
//     colour glides everywhere (no discrete depth bands → no sudden colour pops).
//   * UNIQUE EVERYWHERE — drag to explore and every area is different: the palette AND the
//     structure are modulated by WORLD POSITION with incommensurate low frequencies, so it
//     never exactly repeats over any reasonable roam (carpet-inspired continuous variety).
//   * LIVE & PERMANENT — an extreme sound (a big drop) PERMANENTLY rotates the palette and grows
//     the structural warp (paletteShift / warpGrow from lattice-nav) — the look transforms over
//     the show and never returns to where it started. People are rewarded for going hard.
//   Pair with ?controller=lattice-nav (pan = drag, pinch = zoom, drops = permanent mutation).
// License: CC BY-NC-SA 3.0 (derivative — adapted ShaderToy hex mirror-fold fractal).

#define PI  3.14159265359
#define TAU 6.28318530718
#define PHI 1.61803398875
#define LEVELS 10
#define FIRST 4

// ── wavelet-ease controller outputs (declared by hand; 0 without the controller / a mic) ──
uniform float waveletBassSpring;
uniform float waveletBand2Spring;
uniform float waveletBand5Spring;
uniform float waveletCentroidSpring;
uniform float energySpring;
uniform float melodyFlow;
uniform float spectralCrestSmooth;
uniform float flowPhase;
uniform float morphPhase;
uniform float quietGate;
uniform float evoWarp;
uniform float evoPlasma;
// ── lattice-nav: navigation + PERMANENT live mutation ──
uniform float navX;          // world pan X (drag, accumulates)
uniform float navY;          // world pan Y
uniform float navZoom;       // pinch-zoom (0 → treated as 1)
uniform float paletteShift;  // PERMANENT palette rotation — grows on every big drop
uniform float warpGrow;      // PERMANENT structural warp — grows on every big drop
// waveletBassZScore + wavelet_bassHit auto-declare (raw) — transient pulse punch only.

mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// BEAUTIFUL palette — perceptual Oklch, lush and smooth (no muddy mid-mixes). s wraps the hue;
// lit lifts lightness; chroma breathes for richness. Bounded away from white/black.
vec3 lush(float s, float lit){
    float h = fract(s) * TAU;
    float L = clamp(0.40 + 0.44 * clamp(lit, 0.0, 1.0), 0.05, 0.92);
    float C = 0.115 + 0.055 * sin(s * TAU * 0.5 + 1.3);
    return oklch2rgb(vec3(L, C, h));
}

// UNIQUE-PER-AREA hue offset: incommensurate low frequencies → smooth + quasi-non-repeating, so
// every region you drag to looks different AND transitions are seamless (no sudden change).
float regionHue(vec2 w){
    return 0.20 * sin(w.x * 0.23) + 0.20 * cos(w.y * 0.19)
         + 0.13 * sin((w.x - w.y) * 0.11) + 0.09 * cos((w.x + w.y) * 0.071);
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
float gSpin, gPulse, gPop, gKick, gHexR, gBorder, gCross, gFill;

// Recursive hex mirror-fold lattice. Returns vec4(lum, field, wave, alpha):
//   lum   = composited brightness, field = front-weighted CONTINUOUS palette coord (→ smooth
//   colour), wave = pulse accent, alpha = coverage.
vec4 fractal(vec2 p){
    float scale = 1.0, aliasBase = 1.0 / iResolution.y;
    float alpha = 0.0, lumAcc = 0.0, fieldAcc = 0.0, waveAcc = 0.0;

    for (int i = 0; i < LEVELS; i++){
        float s = 2.0;
        p = 1.0 - abs(s * fract(p - 0.5) - s * 0.5);          // mirror-repeat fold
        float theta = float(i) * PI * 0.125
                    + gSpin * (0.4 + float(i) * 0.05)
                    + (evoWarp - 0.5) * float(i) * 0.10;
        p *= rot2(theta);
        scale *= s;
        if (i < FIRST) continue;

        vec2 uv = abs(p);
        float delt1 = abs((hexDist(uv) - gHexR) - 0.1);        // MIDS breathe the hexagons
        float delt2 = min(length(uv) - gCross, min(uv.x, uv.y)); // BASS taut cross
        float m = min(delt1, delt2);
        float alias = aliasBase * 0.5 * scale;
        float f = smoothstep(gBorder + alias, gBorder, m) * 0.4
                + smoothstep(gBorder + 0.12, gBorder + 0.01, m) * 0.6;   // TREBLE fattens lines

        float ld = float(i - FIRST) / float(LEVELS - 1 - FIRST);
        // CONTINUOUS palette field: recursion depth + a smooth within-cell swirl so colour flows
        // across the structure (this is the BEAUTY — a smooth field, not a discrete depth band).
        float swirl = 0.5 + 0.5 * sin(atan(p.y, p.x) * 2.0 + length(p) * 3.0 + float(i));
        float field = ld * (0.55 + evoPlasma * 0.2) + swirl * 0.45;

        float env = sin(gPulse * PI);
        float wave = smoothstep(0.30, 0.0, abs(ld - (1.0 - gPulse))) * env;
        float band = bandForDepth(ld);
        float lit = (smoothstep(gFill + alias, gFill, m) * 0.5 + 0.18)
                  * (0.7 + energySpring * 0.4 + band * 0.7 + waveletBassSpring * quietGate * 0.6);
        lit += wave * (0.4 + gPop * 0.7 + gKick * 1.2 + spectralCrestSmooth * 0.35);

        // front-weighted accumulation (near structure leads the colour) → smooth, no band pops
        float w = (1.0 - alpha) * f;
        lumAcc   += w * lit;
        fieldAcc += w * field;
        waveAcc  += w * wave;
        alpha    += w;
    }
    float ia = 1.0 / max(alpha, 1e-3);
    return vec4(lumAcc, fieldAcc * ia, waveAcc * ia, alpha);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 sp = (fragCoord / iResolution.xy) * 2.0 - 1.0;   // for the vignette

    // ── per-frame state ──
    gSpin  = iTime * 0.04 + morphPhase * 0.4 + melodyFlow * 0.5 * quietGate;
    gPop   = clamp(energySpring * 0.5 + spectralCrestSmooth * 0.45, 0.0, 1.0) * quietGate;
    gKick  = clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.5 + clamp(wavelet_bassHit, 0.0, 1.0) * 0.3;
    gPulse = fract(flowPhase * 0.6 + iTime * 0.18);
    float bassPulse = waveletBassSpring * quietGate;
    gHexR   = 0.60 + waveletBand2Spring * 0.12 * quietGate;
    gBorder = 0.10 + waveletBand5Spring * 0.06 * quietGate;
    gCross  = 0.20 - bassPulse * 0.05;
    gFill   = 0.06 + waveletBand5Spring * 0.035 * quietGate;

    // ── UNIQUE-PER-AREA structure: world position drifts rotation + cell size (gentle, smooth) ──
    vec2 world = vec2(navX, navY);
    gHexR += 0.07 * sin(world.x * 0.8 + world.y * 0.45);
    gSpin += 0.25 * sin(world.x * 0.2) + 0.2 * cos(world.y * 0.22);

    uv = rot2(iTime * 0.025 + morphPhase * 0.2 + (evoWarp - 0.5) * 0.4) * uv;
    uv += 0.05 * vec2(sin(iTime * 0.11 + flowPhase * 0.3), cos(iTime * 0.09 + flowPhase * 0.3));
    float navz = navZoom < 0.01 ? 1.0 : navZoom;
    uv *= 0.07 / navz;
    uv += world;                                              // finger PAN
    // continuous terrain warp — varies by region AND grows PERMANENTLY on big drops (warpGrow)
    uv += (0.045 + warpGrow * 0.05) * vec2(sin(world.y * 1.0 + uv.x * 3.0), cos(world.x * 1.2 + uv.y * 3.0));

    vec4 fr = fractal(uv);
    float lum = fr.x, field = fr.y, wave = fr.z, alpha = fr.w;

    // ── BEAUTIFUL COLOUR ── one smooth Oklch journey, unique per area, PERMANENTLY rotated by drops
    float s = field
            + regionHue(world)
            + iTime * 0.012
            + melodyFlow * 0.2 * quietGate
            + paletteShift;                                   // permanent live mutation
    vec3 col = lush(s, lum);
    col += lush(s + 0.12, 0.9) * wave * 0.6;                  // pulse accent (hue-shifted, brighter)

    // composite over a deep, lush background (not pure black) so the void still glows softly
    vec3 bg = lush(s + 0.5, 0.05) * 0.5;
    col = mix(bg, col, clamp(alpha, 0.0, 1.0));

    // bloom on the bass thump (whole frame swells with light, eased)
    col *= 1.0 + bassPulse * 0.25 + gKick * 0.15;

    // gentle trail smooths motion
    vec4 prev = getLastFrameColor(fragCoord / iResolution.xy);
    col = mix(prev.rgb * 0.86, col, 0.8);

    // vignette
    col = mix(col, vec3(0.0), dot(sp, sp) * 0.4);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
