// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: fractal, hex, lattice, touch, color, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/chromadepth-lattice/5&wavelet=true&controller=lattice-nav&fullscreen=true&knob_1=0.21&name=Living%20Lattice%20Trails
//   * knob_1 = PAN SPEED (live: preset / URL / MIDI / jam drawer). 0 = precise/slow, 1 = fast
//     roaming; ~0.21 ≈ 1 screen per swipe. Read by the lattice-nav controller (scales drag deltas).
// LIVING LATTICE (5.frag) — 4.frag + GLOWING TRAILS: bright energy dashes flow ALONG the lattice
// lines like light running through a circuit, sped up by the music. The hex mirror-fold lattice,
// freed from ChromaDepth for BEAUTIFUL continuous colour, tuned to glow off a phone at night and
// to pan the same way everywhere. Built to AMAZE when people play with it live:
//   * BRIGHT — high-lightness neon palette over a lit colour field (no black voids) + glow lift +
//     bass bloom + minimal vignette: pops off the screen at night, reads from across a room.
//   * CONSISTENT PAN — per-area variety is colour + cell size, NOT rotation, and there is no
//     whole-field spin, so dragging always moves the same way on screen (no inverted axes).
//   * BEAUTIFUL COLOUR — a smooth Oklch palette over a coverage-weighted continuous field, so
//     colour glides everywhere (no discrete depth bands → no sudden colour pops).
//   * UNIQUE EVERYWHERE — drag to explore and every area is different: the palette AND the
//     structure are modulated by WORLD POSITION with incommensurate low frequencies, so it
//     never exactly repeats over any reasonable roam (carpet-inspired continuous variety).
//   * LIVE & PERMANENT — an extreme sound (a big drop) PERMANENTLY rotates the palette and grows
//     the structural warp (paletteShift / warpGrow from lattice-nav) — the look transforms over
//     the show and never returns to where it started. People are rewarded for going hard.
//   * UNIQUE PER DEVICE — seed..seed4 (random per device, persisted in localStorage) seed the
//     palette (seed=base hue, seed2=saturation) AND the structure (seed3=lattice twist + region
//     map, seed4=swirl + warp), so every phone/screen sees its own one-of-a-kind lattice.
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
    // BRIGHT baseline so the whole thing emits light (must pop off a phone at night, read from afar)
    float L = clamp(0.50 + 0.36 * clamp(lit, 0.0, 1.0), 0.12, 0.88);
    float C = (0.125 + seed2 * 0.05) + 0.05 * sin(s * TAU * 0.5 + 1.3);  // high chroma = NEON, seed2 = device sat
    return oklch2rgb(vec3(L, C, h));
}

// UNIQUE-PER-AREA hue offset: incommensurate low frequencies → smooth + quasi-non-repeating, so
// every region you drag to looks different AND transitions are seamless (no sudden change).
float regionHue(vec2 w){
    float ph = seed3 * TAU;   // seed3 → per-device "map": the same world coords look different per device
    return 0.20 * sin(w.x * 0.23 + ph) + 0.20 * cos(w.y * 0.19 + ph * 1.3)
         + 0.13 * sin((w.x - w.y) * 0.11 + ph) + 0.09 * cos((w.x + w.y) * 0.071);
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
float gSpin, gPulse, gPop, gKick, gHexR, gBorder, gCross, gFill, gFlow;

// Recursive hex mirror-fold lattice. Returns vec4(lum, field, wave, alpha) + out trail:
//   lum=brightness, field=CONTINUOUS palette coord, wave=pulse accent, alpha=coverage,
//   trail = glowing energy flowing ALONG the lattice lines (the "paths").
vec4 fractal(vec2 p, out float trail){
    float scale = 1.0, aliasBase = 1.0 / iResolution.y;
    float alpha = 0.0, lumAcc = 0.0, fieldAcc = 0.0, waveAcc = 0.0;
    trail = 0.0;

    for (int i = 0; i < LEVELS; i++){
        float s = 2.0;
        p = 1.0 - abs(s * fract(p - 0.5) - s * 0.5);          // mirror-repeat fold
        float theta = float(i) * PI * 0.125
                    + gSpin * (0.4 + float(i) * 0.05)
                    + (evoWarp - 0.5) * float(i) * 0.10
                    + (seed3 - 0.5) * float(i) * 0.8;       // seed3 → per-device per-level twist (structure)
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
        float swirl = 0.5 + 0.5 * sin(atan(p.y, p.x) * 2.0 + length(p) * 3.0 + float(i) + seed4 * TAU);
        float field = ld * (0.55 + evoPlasma * 0.2) + swirl * 0.45;

        float env = sin(gPulse * PI);
        float wave = smoothstep(0.30, 0.0, abs(ld - (1.0 - gPulse))) * env;
        float band = bandForDepth(ld);
        float lit = (smoothstep(gFill + alias, gFill, m) * 0.5 + 0.18)
                  * (0.7 + energySpring * 0.4 + band * 0.7 + waveletBassSpring * quietGate * 0.6);
        lit += wave * (0.4 + gPop * 0.7 + gKick * 1.2 + spectralCrestSmooth * 0.35);

        // GLOWING TRAIL — bright dashes that FLOW along the lattice lines like current in a circuit.
        // flowC runs ALONG the structure (hexDist + radius + level); gFlow sweeps it over time.
        // pow() makes sharp, separated dashes; they only show where the structure is (f) and the
        // bright LINE proximity (not the fill), so it reads as light running down the grid edges.
        float flowC = hexDist(uv) * 3.0 + length(uv) * 1.6 + float(i) * 0.6;
        float dash  = pow(0.5 + 0.5 * sin(flowC * 5.0 - gFlow), 14.0);
        float line  = smoothstep(gBorder + 0.05, gBorder, m);   // only on the bright border lines

        // front-weighted accumulation (near structure leads the colour) → smooth, no band pops
        float w = (1.0 - alpha) * f;
        lumAcc   += w * lit;
        fieldAcc += w * field;
        waveAcc  += w * wave;
        trail    += w * dash * line;
        alpha    += w;
    }
    float ia = 1.0 / max(alpha, 1e-3);
    return vec4(lumAcc, fieldAcc * ia, waveAcc * ia, alpha);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 sp = (fragCoord / iResolution.xy) * 2.0 - 1.0;   // for the vignette

    // ── per-frame state ── base (idle) animation runs at 1/3 speed via bTime; the audio phases
    //    (morphPhase / flowPhase / springs) keep full speed, so it's calm idle but still reactive.
    float bTime = iTime / 3.0;
    gSpin  = bTime * 0.04 + morphPhase * 0.4 + melodyFlow * 0.5 * quietGate;
    gPop   = clamp(energySpring * 0.5 + spectralCrestSmooth * 0.45, 0.0, 1.0) * quietGate;
    gKick  = clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.5 + clamp(wavelet_bassHit, 0.0, 1.0) * 0.3;
    gPulse = fract(flowPhase * 0.6 + bTime * 0.18);
    gFlow  = bTime * 2.2 + flowPhase * 4.0;   // monotonic trail-flow clock — runs FASTER with the music
    float bassPulse = waveletBassSpring * quietGate;
    gHexR   = 0.60 + waveletBand2Spring * 0.12 * quietGate;
    gBorder = 0.10 + waveletBand5Spring * 0.06 * quietGate;
    gCross  = 0.20 - bassPulse * 0.05;
    gFill   = 0.06 + waveletBand5Spring * 0.035 * quietGate;

    // ── UNIQUE-PER-AREA structure: world position drifts the cell SIZE only — NOT rotation.
    //    Rotating the lattice by area made the pan axis appear to invert in different places;
    //    colour (regionHue) + cell size carry the per-area uniqueness without that side effect.
    vec2 world = vec2(navX, navY);
    gHexR += 0.07 * sin(world.x * 0.8 + world.y * 0.45);

    // NO whole-field rotation — it slowly drifted the pan axis. Idle life comes from the per-level
    // kaleido churn (gSpin's iTime term) instead, so DRAGGING ALWAYS MOVES THE SAME WAY on screen.
    uv += 0.02 * vec2(sin(bTime * 0.11 + flowPhase * 0.3), cos(bTime * 0.09 + flowPhase * 0.3));
    float navz = navZoom < 0.01 ? 1.0 : navZoom;
    uv *= 0.07 / navz;
    uv += world;                                              // finger PAN — screen-consistent now
    // gentle terrain warp for texture; grows PERMANENTLY on big drops (warpGrow). A fixed function
    // of world position, so it varies by area but never reverses the pan direction.
    uv += (0.03 + warpGrow * 0.04) * vec2(sin(uv.x * 3.0 + seed4 * TAU), cos(uv.y * 3.0 + seed4 * TAU));

    float trail;
    vec4 fr = fractal(uv, trail);
    float lum = fr.x, field = fr.y, wave = fr.z, alpha = fr.w;

    // ── BEAUTIFUL COLOUR ── one smooth Oklch journey, unique per area, PERMANENTLY rotated by drops
    float s = field
            + regionHue(world)
            + bTime * 0.012
            + melodyFlow * 0.2 * quietGate
            + paletteShift                                    // permanent live mutation
            + seed;                                           // seed → per-device base palette identity
    vec3 col = lush(s, lum);
    col += lush(s + 0.12, 1.0) * wave * 0.7;                  // pulse accent (brighter)

    // BRIGHT, saturated background FIELD — no black voids; the whole screen emits light so it
    // pops off the phone at night and reads from across the room.
    vec3 bg = lush(s + 0.4, 0.45) * 0.92;
    col = mix(bg, col, clamp(alpha, 0.0, 1.0));

    // ── GLOWING TRAILS — bright energy running ALONG the lattice lines (a hue-shifted accent so
    //    the streaks read as light flowing through the structure). Crest/treble make them sparkle.
    col += lush(s + 0.33, 1.0) * clamp(trail, 0.0, 1.6) * (1.1 + spectralCrestSmooth * 0.8 + waveletBand5Spring * quietGate);

    // bass bloom (whole frame swells with light on the thump)
    col *= 1.0 + bassPulse * 0.25 + gKick * 0.15;

    // GLOW LIFT — gamma up + gain so mid-tones emit; high chroma keeps it NEON, not washed out.
    col = pow(clamp(col, 0.0, 1.0), vec3(0.80));
    col *= 1.15;

    // gentle trail (low decay so the glow carries between frames)
    vec4 prev = getLastFrameColor(fragCoord / iResolution.xy);
    col = mix(prev.rgb * 0.90, col, 0.82);

    // minimal vignette — barely darken the edges, it has to read from a distance
    col = mix(col, vec3(0.0), dot(sp, sp) * 0.12);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
