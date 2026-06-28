// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: fractal, hex, lattice, touch, color, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/chromadepth-lattice/6&wavelet=true&controller=lattice-nav&fullscreen=true&knob_1=0.21&name=Living%20Lattice%20Still
//   * knob_1 = PAN SPEED (live: preset / URL / MIDI / jam drawer). 0 = precise/slow, 1 = fast
//     roaming; ~0.21 ≈ 1 screen per swipe. Read by the lattice-nav controller (scales drag deltas).
// LIVING LATTICE (6.frag) — STILL geography: same as 5 but the landscape HOLDS STILL when you're
// not touching it (no idle kaleido churn, no orbital drift), so it reads as a fixed place you
// EXPLORE rather than one that's always scrolling. Life comes from in-place music reactivity
// (colour journey, breathing cells, depth pulse, sparkle) — not from translating the geography.
// 4.frag + a PATH: a sparse winding ribbon of a DIFFERENT colour pattern
// living in world space. You occasionally stumble across one and can FOLLOW it (somewhere to pan
// toward). Slowed base animation (1/3). The hex mirror-fold lattice,
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
uniform float spectralRoughnessSmooth;   // smoothed grit → iridescent sparkle (texture family)
uniform float flowPhase;
uniform float morphPhase;
uniform float quietGate;
uniform float evoFlow;       // minutes-scale random drifter (terrain randomness)
uniform float evoWarp;
uniform float evoPlasma;
// SLOW history-average features (auto-declared) used as extra randomness sources for terrain:
// spectralCentroidMean, spectralRoughnessMean, spectralSpreadMean, spectralEntropyMean, energyMean.
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
float gSpin, gPulse, gPop, gKick, gHexR, gBorder, gCross, gFill;

// Recursive hex mirror-fold lattice. Returns vec4(lum, field, wave, alpha):
//   lum=brightness, field=CONTINUOUS palette coord, wave=pulse accent, alpha=coverage.
vec4 fractal(vec2 p){
    float scale = 1.0, aliasBase = 1.0 / iResolution.y;
    float alpha = 0.0, lumAcc = 0.0, fieldAcc = 0.0, waveAcc = 0.0;

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

    // ── per-frame state ── base (idle) animation runs at 1/3 speed via bTime; the audio phases
    //    (morphPhase / flowPhase / springs) keep full speed, so it's calm idle but still reactive.
    float bTime = iTime / 3.0;
    // STILL: no time-churn on the lattice rotation → the geography holds its orientation (the
    // constant "panning" feel was this term + the orbital drift below). Reactivity is in-place now.
    gSpin  = 0.0;
    gPop   = clamp(energySpring * 0.5 + spectralCrestSmooth * 0.45, 0.0, 1.0) * quietGate;
    gKick  = clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.5 + clamp(wavelet_bassHit, 0.0, 1.0) * 0.3;
    gPulse = fract(flowPhase * 0.6 + bTime * 0.18);
    float bassPulse = waveletBassSpring * quietGate;
    gHexR   = 0.60 + waveletBand2Spring * 0.12 * quietGate;
    gBorder = 0.10 + waveletBand5Spring * 0.06 * quietGate;
    gCross  = 0.20 - bassPulse * 0.05;
    gFill   = 0.06 + waveletBand5Spring * 0.035 * quietGate;

    // ── UNIQUE-PER-AREA structure: world position drifts the cell SIZE only — NOT rotation.
    //    Rotating the lattice by area made the pan axis appear to invert in different places;
    //    colour (regionHue) + cell size carry the per-area uniqueness without that side effect.
    vec2 world = vec2(navX, navY);
    // SLOW audio "randomness" sources — history-average means + the evo drifters change over
    // seconds/minutes, so they add VARIETY without jitter (tons of sources available). ~0 with no
    // mic → the variation falls back to position-only (still breaks the tiling).
    float aA = spectralCentroidMean + evoFlow;
    float aB = spectralRoughnessMean + evoWarp;
    float aC = spectralSpreadMean + evoPlasma;
    float aD = spectralEntropyMean + energyMean;
    // Cell SIZE varies across regions on incommensurate frequencies (breaks "every tile identical")
    // and the audio seeds slowly RESHUFFLE the phases so the map's character drifts over a set.
    gHexR += 0.07 * sin(world.x * 0.80 + world.y * 0.45 + aA * TAU)
           + 0.06 * sin(world.x * 0.37 - world.y * 0.29 + 1.7 + aB * TAU)
           + 0.04 * cos(world.x * 0.21 + world.y * 0.60 + 3.0 + aC * TAU);

    // NO whole-field rotation and NO orbital drift — the geography stays put unless YOU move it.
    float navz = navZoom < 0.01 ? 1.0 : navZoom;
    uv *= 0.07 / navz;
    uv += world;                                              // finger PAN — screen-consistent now
    vec2 wpos = uv;                                           // clean world position for the PATH (pre-warp)
    // ── LARGE-SCALE TERRAIN WARP ── low-frequency, incommensurate, audio-seeded domain warp that
    // breaks the period-1 TILING into flowing varied terrain (zoom out → different scenery, not a
    // grid) which slowly reshuffles with the music. Bounded so it never folds back → pan stays
    // consistent. Turbulence swells on wide/sectiony passages (spread) + permanently on drops.
    float wamp = min(1.0 + warpGrow * 0.5 + aC * 0.4, 1.8);
    uv += wamp * 0.15 * vec2(sin(uv.y * 0.73 + seed4 * TAU + aB * TAU), cos(uv.x * 0.67 + seed3 * TAU + aD * TAU));
    uv += wamp * 0.08 * vec2(sin(uv.y * 1.31 + 2.1 + aA * TAU),         cos(uv.x * 1.17 + 0.7 + aC * TAU));
    uv += wamp * 0.03 * vec2(sin(uv.x * 3.0 + seed4 * TAU),             cos(uv.y * 3.0 + seed4 * TAU));

    vec4 fr = fractal(uv);
    float lum = fr.x, field = fr.y, wave = fr.z, alpha = fr.w;

    // ── BEAUTIFUL COLOUR ── one smooth Oklch journey (iris/1 PITCH→COLOUR family): the MELODY
    //    carries the palette through the song and BRIGHTNESS (centroid) tints it, so the whole
    //    image flows in colour with the music. Smoothed contours only — no jitter. quietGate so
    //    a silent room can't flash the hue. Plus per-area / per-device / permanent-drop offsets.
    float s = field
            + regionHue(world)
            + bTime * 0.012
            + melodyFlow * 0.32 * quietGate                   // MELODY → the palette journey
            + waveletCentroidSpring * 0.14 * quietGate        // BRIGHTNESS → hue tint
            + paletteShift                                    // permanent live mutation
            + seed;                                           // per-device base palette identity
    vec3 col = lush(s, lum);                                  // (brightness handled by the bloom below)
    col += lush(s + 0.18, 1.0) * wave * 0.7;                  // pulse accent (hue-shifted, brighter)

    // BRIGHT, saturated background FIELD — no black voids; the whole screen emits light so it
    // pops off the phone at night and reads from across the room.
    vec3 bg = lush(s + 0.4, 0.45) * 0.92;
    col = mix(bg, col, clamp(alpha, 0.0, 1.0));

    // ── PATH — a sparse winding RIBBON of a different colour pattern, living in WORLD space so
    //    it's a stable landmark: you occasionally stumble across one and can FOLLOW it (pan along
    //    it) when you want somewhere to head. roadY is a slow meander in world.x; you find the
    //    path by panning in y until the ribbon enters frame, then follow it by panning in x.
    // A sparse winding CORRIDOR in world space (you pan to find it). Within it the colour is
    // INVERTED — unmistakable against ANY local palette, and since it inverts whatever lattice is
    // there it FOLLOWS the structure (inversion strongest on the bright lattice lines). Dead simple.
    float roadY = 0.6 * sin(wpos.x * 0.40 + seed * TAU) + 0.32 * sin(wpos.x * 0.15 + 1.0);
    float presence = smoothstep(0.30, 0.60, 0.5 + 0.5 * sin(wpos.x * 0.06 + seed3 * TAU)); // appears in stretches
    float corridor = smoothstep(0.024, 0.0, abs(wpos.y - roadY)) * presence;   // the winding zone
    float onStruct = smoothstep(0.28, 0.62, lum);                             // ONLY the bright lattice lines
    col = mix(col, vec3(1.0) - col, corridor * onStruct);                     // invert the LATTICE LINES exactly
    col += (vec3(1.0) - col) * corridor * 0.05;                               // faint zone hint so you can spot it

    // ── DESTINATION ── the path LEADS TO unique blooming landmarks set along the road at sparse
    //    intervals. Each is different (per-feature hash): a bright radial sunburst with its own ray
    //    count + hue + white-hot core. A far halo lets you SEE the next one coming, so the path has
    //    somewhere to go — follow the road and you arrive at a one-of-a-kind feature.
    float spacing = 1.6;                                                       // world units between landmarks
    float fx = floor(wpos.x / spacing + 0.5) * spacing;                       // nearest landmark's x (on the road)
    float fy = 0.6 * sin(fx * 0.40 + seed * TAU) + 0.32 * sin(fx * 0.15 + 1.0); // its y = roadY(fx) → on the path
    float fh = fract(sin(fx * 91.73 + seed * 53.3) * 43758.5453);             // per-landmark randomness (unique)
    vec2  fdv = wpos - vec2(fx, fy);
    float fd = length(fdv);
    float fang = atan(fdv.y, fdv.x);
    vec3  fcol = lush(seed + fh + fang * 0.04, 1.0);                          // bright, unique hue per landmark
    col += lush(seed + fh, 1.0) * smoothstep(0.40, 0.05, fd) * 0.10;          // FAR HALO — directional cue from afar
    float rays  = 0.5 + 0.5 * sin(fang * (6.0 + floor(fh * 8.0)) + bTime + fh * TAU);
    float bloom = smoothstep(0.07, 0.0, fd) * (0.35 + 0.65 * rays);           // contained radial sunburst
    col = mix(col, fcol, bloom * 0.7);
    col += fcol * 1.3 * smoothstep(0.012, 0.0, fd);                           // bright COLOURED core (unique, not white)

    // ── MUSICAL BLOOM (iris/1: smooth for global, raw only for the transient) ── a swell/drop
    //    lifts the WHOLE image brightness smoothly (energy + articulation), the kick adds a snappy
    //    thump on top. So it breathes with the build and punches on the hit, never strobes.
    float dropGlow = clamp(energySpring * 0.6 + spectralCrestSmooth * 0.4, 0.0, 1.0) * quietGate;
    col *= 1.0 + bassPulse * 0.12 + dropGlow * 0.13 + gKick * 0.10;   // gentle so loud stays saturated, not pastel

    // ── IRIDESCENT SPARKLE (TEXTURE family) ── sparse dot glints that drift in PATCHES (not a grid),
    //    on the structure, gated by treble + articulation + grit. A subtle shimmer, quietGate-calm.
    vec2 scr = fragCoord / iResolution.xy;
    float g1 = 0.5 + 0.5 * sin(scr.x * 190.0 + bTime * 5.0);
    float g2 = 0.5 + 0.5 * sin(scr.y * 163.0 - bTime * 4.0);
    float sparkPatch = 0.5 + 0.5 * sin(scr.x * 6.0 + scr.y * 4.3 - bTime * 2.0); // drifting concentration patches
    float spark = pow(g1 * g2, 16.0) * sparkPatch;
    col += vec3(1.0, 0.97, 0.92) * spark * clamp(alpha, 0.0, 1.0)
         * (waveletBand5Spring * 0.25 + spectralCrestSmooth * 0.22 + spectralRoughnessSmooth * 0.12) * quietGate;

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
