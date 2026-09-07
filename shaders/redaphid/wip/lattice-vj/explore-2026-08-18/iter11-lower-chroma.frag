// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: fractal, hex, lattice, touch, color, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/chromadepth-lattice/6&wavelet=true&controller=lattice-nav&fullscreen=true&knob_1=0.21&name=Living%20Lattice%20Still
//   * knob_1 = PAN SPEED (live: preset / URL / MIDI / jam drawer). 0 = precise/slow, 1 = fast
//     roaming; ~0.21 ≈ 1 screen per swipe. Read by the lattice-nav controller (scales drag deltas).
// LATTICE-VJ (2.frag — FORK of 1.frag at /vibej iter 27, 2026-08-18 live show) — a byte-copy of chromadepth-lattice/6.frag, kept as the SCRATCH COPY for
// /vibej to mutate during a live set. /vibej rewrites its target .frag on disk every minute; point
// it here so the committed 6.frag (a @favorite) survives the night untouched. Everything below is
// 6.frag's original header.
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
uniform float waveletBand1Spring;        // iter 26: springs the vjpad LIVE bank does NOT pin
uniform float waveletBand3Spring;
uniform float waveletBand4Spring;
// LIVE MIXES (iter 26) — with TAKE OVER engaged the phone pins waveletBass/Band2/Band5/energy springs,
// which froze most of this shader's reactivity ("not interesting"). Every music driver is now half the
// fader-able spring, half a NEIGHBOURING spring the pad does not own: the fader biases, the music moves.
#define bassLive (0.5 * waveletBassSpring  + 0.5 * waveletBand1Spring)
#define midsLive (0.5 * waveletBand2Spring + 0.5 * waveletBand3Spring)
#define trebLive (0.5 * waveletBand5Spring + 0.5 * waveletBand4Spring)
#define glowLive (0.5 * energySpring       + 0.5 * waveletBand3Spring)
#define FLIGHT 0.0   // auto-flight amplitude (vj2 iter 2: OFF at user request; 1.0 = the iter-22 wander)
uniform float energySpring;
uniform float melodyFlow;
uniform float spectralCrestSmooth;
uniform float spectralRoughnessSmooth;   // smoothed grit → iridescent sparkle (texture family)
uniform float flowPhase;
uniform float morphPhase;
uniform float quietGate;
uniform float evoWarp;
uniform float evoPlasma;
uniform float wubDepth;            // wobble AMPLITUDE (wavelet-ease) — deepens cell breathing on wubby tracks
uniform float bassNoteFlow;        // BASSLINE PITCH contour 0..1 (wavelet-ease) — the bass MELODY tilts the palette
uniform float sectionMode;         // wavelet-ease: increments on each detected DROP (breakdown → surge)
uniform float sectionMix;          // wavelet-ease: 0 → 1 crossfade (~4s) after each sectionMode change
uniform float evoPhase;            // wavelet-ease: monotonic set clock (~1 unit / few min, energy-weighted, silence-frozen)
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
    float L = clamp(0.33 + 0.40 * clamp(lit, 0.0, 1.0), 0.05, 0.92);   // vj2 iter 6: 0.40+0.44 → 0.33+0.40 (max L 0.84 → 0.73). Meter on lit passages: dark 2.4 %, lum 0.30, sat 0.85 — pastel. Lower L keeps chroma, restores the floor. (Oklch: hue untouched.)   // MUTED (iter 17, from chromadepth-lattice/3): lower base lightness
    float C = (0.075 + seed2 * 0.05) + 0.04 * sin(s * TAU * 0.5 + 1.3);   // vj2 iter 11: chroma 0.09+.06/.05 → 0.075+.05/.04. Meter sat 0.93–0.94 since the L/gamma changes (low L + same C = gamut-edge neon). User wants MUTED; sat target ~0.8.   // lower chroma than 6.frag's neon — user: "more muted"
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
    if (ld < 0.34) return trebLive * quietGate;
    if (ld < 0.67) return midsLive * quietGate;
    return bassLive * quietGate;
}

// shared per-frame state
float gSpin, gPulse, gPop, gKick, gHexR, gBorder, gCross, gFill, gScale, gDepthFocus, gCrossBias;

// Recursive hex mirror-fold lattice. Returns vec4(lum, field, wave, alpha):
//   lum=brightness, field=CONTINUOUS palette coord, wave=pulse accent, alpha=coverage.
vec4 fractal(vec2 p){
    float scale = 1.0, aliasBase = 1.0 / iResolution.y;
    float alpha = 0.0, lumAcc = 0.0, fieldAcc = 0.0, waveAcc = 0.0;

    for (int i = 0; i < LEVELS; i++){
        float s = gScale;                                     // FOLD RATIO drifts (2.0 ± 0.3, iter 12) — a fractal PERMUTATION; continuous across mirror cells for any s
        p = 1.0 - abs(s * fract(p - 0.5) - s * 0.5);          // mirror-repeat fold
        // COUNTER-ROTATION PARITY (iter 20, fractal permutation on DROPS): alternate levels spin in
        // opposite directions, and every sectionMode step swaps the parity — eased through sectionMix,
        // so on a drop the per-level spin passes through zero and re-winds the other way (visible
        // "reset + re-spin" of the whole lattice, no snap, no warp).
        float sgnNew = (mod(float(i) + sectionMode, 2.0) < 1.0) ? 1.0 : -1.0;
        float sgn    = sgnNew * (2.0 * sectionMix - 1.0);
        float theta = float(i) * PI * 0.125
                    + gSpin * (0.4 + float(i) * 0.05) * sgn
                    + (evoWarp - 0.5) * float(i) * 0.10
                    + (seed3 - 0.5) * float(i) * 0.8;       // seed3 → per-device per-level twist (structure)
        p *= rot2(theta);
        scale *= s;
        if (i < FIRST) continue;

        vec2 uv = abs(p);
        float delt1 = abs((hexDist(uv) - gHexR) - 0.1);        // MIDS breathe the hexagons
        float delt2 = min(length(uv) - gCross, min(uv.x, uv.y)) + gCrossBias; // BASS taut cross (+K139 hex↔cross balance)
        float m = min(delt1, delt2);
        float alias = aliasBase * 0.5 * scale;
        float f = smoothstep(gBorder + alias, gBorder, m) * 0.4
                + smoothstep(gBorder + 0.12, gBorder + 0.01, m) * 0.6;   // TREBLE fattens lines

        float ld = float(i - FIRST) / float(LEVELS - 1 - FIRST);
        // LEVEL WINDOW (iter 14, fractal permutation): which recursion DEPTHS draw. gDepthFocus 0 →
        // coarse levels dominate (big bold cells), 1 → fine levels dominate (filigree). Driven by
        // smoothed spectral brightness + the slow shape clock, so dark passages go bold, bright go lacy.
        f *= mix(1.0 - ld * 0.90, 0.10 + ld * 0.90, gDepthFocus);   // iter 27: stronger window (screenshot: zoomed-out finest levels read as noise)
        // CONTINUOUS palette field: recursion depth + a smooth within-cell swirl so colour flows
        // across the structure (this is the BEAUTY — a smooth field, not a discrete depth band).
        float swirl = 0.5 + 0.5 * sin(atan(p.y, p.x) * 2.0 + length(p) * 3.0 + float(i) + seed4 * TAU);
        float field = ld * (0.55 + evoPlasma * 0.2) + swirl * 0.45;

        float env = sin(gPulse * PI);
        float wave = smoothstep(0.30, 0.0, abs(ld - (1.0 - gPulse))) * env;
        float band = bandForDepth(ld);
        float lit = (smoothstep(gFill + alias, gFill, m) * 0.5 + 0.18)
                  * (0.95 + glowLive * 0.35 + band * 0.55 + bassLive * quietGate * 0.45);   // vj2 iter 9: was 0.7/.4/.7/.6 (range 0.7→2.4): on a quiet intro (energy 0.074) the frame fell to near-BLACK. Floor up, music range compressed (0.95→2.3) — a breakdown dims, it doesn't vanish.
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
    vec2 suv = uv;                                            // screen-centred uv, kept for the SUN (iter 17)
    vec2 sp = (fragCoord / iResolution.xy) * 2.0 - 1.0;   // for the vignette

    // ── per-frame state ── base (idle) animation runs at 1/3 speed via bTime; the audio phases
    //    (morphPhase / flowPhase / springs) keep full speed, so it's calm idle but still reactive.
    float bTime = iTime / 3.0;
    // STILL: no time-churn on the lattice rotation → the geography holds its orientation (the
    // constant "panning" feel was this term + the orbital drift below). Reactivity is in-place now.
    gSpin  = 0.0;   // (set below from the kick — a transient TWIST, unwinds as the kick decays)
    gPop   = clamp(glowLive * 0.5 + spectralCrestSmooth * 0.45, 0.0, 1.0) * quietGate;
    // KICK — dead-zoned so per-frame z-score jitter cannot SHIVER the geometry (user iter 11): only
    // a real onset (z > ~0.6, or a wavelet punch/hit) passes. wavelet_punch = fast wavelet onset × FFT level.
    // iter 26: the raw z-score term is GONE (it was the last per-frame jitter on geometry); only the
    // wavelet onset detectors drive the kick now — bassHit (sharp trigger) + punch (onset × level).
    gKick  = smoothstep(0.25, 0.9, max(clamp(wavelet_bassHit, 0.0, 1.0), clamp(wavelet_bassHitSmooth * 1.3, 0.0, 1.0)) * 0.6
                                 + clamp(wavelet_punch,   0.0, 1.0) * 0.6);   // vj2 iter 7: attack = raw hit, TAIL = smoothed hit (~0.2 s EMA) → each kick is a short envelope, not a 1-frame spike (meter: onset gain was 1.07 = kicks invisible)
    gPulse = fract(flowPhase * 0.6 + bTime * 0.18);
    gSpin  = gKick * 0.015;                                   // KICK TWIST (0.04 → 0.015, vj2 iter 2: user 'twitchy' on dubstep — constant hits made the fold flick) (iter 26): every kick torques the fold a few degrees per level (structural, not colour)
    float bassPulse = bassLive * quietGate;
    // ── SLOW SHAPE EVOLUTION (user iter 11: "a time component so we slowly see different shapes") ──
    //    Aperiodic sums of sub-0.01Hz sines (plasma-journal rule: <1Hz reads as brooding, not jittery)
    //    on morphPhase (a MONOTONIC accumulator from wavelet band 3 — rate-not-angle, so tempo changes
    //    never jump the shape) + bTime. Drifts the fold angles, cell radius and cross size over ~5–10 min,
    //    so the lattice passes through stars / ribbons / tight hex / open cross without ever repeating.
    // (iter 13, user: "I need a time component" — the iter-11 clocks were 5–10 min, too slow to SEE.
    //  Now ~2 min shape cycles + a continuous fold rotation below, so the lattice visibly reconfigures.)
    float shapeA = 0.5 * sin(morphPhase * 0.50) + 0.5 * sin(bTime * 0.16 + 1.7);
    float shapeB = 0.5 * cos(morphPhase * 0.37 + 0.6) + 0.5 * cos(bTime * 0.11);
    gSpin  += shapeA * 0.9 + bTime * 0.08;                     // per-level fold angle drift + CONTINUOUS slow fold rotation (~1.3°/s at the deepest level: the structure is always slowly becoming something else) (theta += gSpin*(0.4+i*0.05))
    gHexR   = 0.60 + shapeB * 0.06 + midsLive * 0.05 * quietGate;   // vj2 iter 2: 0.12·(1+wub·0.8) → 0.05 — the spring (settles ~0.4s) chases a 2–4 Hz wobble, so cells PULSED at wub rate = TWITCHY. Geometry follows slow music; the wub now lives in shading only.
    gHexR  += 0.025 * sin(bTime * 0.7) * (1.0 - quietGate);   // QUIET BREATH: when the gate closes on soft music the cells keep a slow ~27s breath instead of freezing; loud = unchanged
    gBorder = 0.10 + (trebLive * 0.025 + bassLive * 0.02 + spectralRoughnessSmooth * 0.03) * quietGate   /* vj2 iter 2: treb .06→.025, bass .04→.02 (hi-hats were flicking line thickness) */ + (knob_138 - 0.5) * 0.10 * step(0.001, knob_137 + knob_138);   // K138 LINE THICKNESS (guest bank pad 4 Y, iter 24)   // GRIT fattens the lines too (roughness is not a phone fader → still listens under TAKE OVER)
    gCross  = 0.20 + shapeA * 0.04 - bassPulse * 0.02;      // vj2 iter 2: .05 → .02 (de-twitch)
    // ── GUEST BANK 1 (vjpad knob_131–136, iter 22 auto-wire: the user was riding a dead bank) ──
    //    Pad 1: X=131 FOLD RATIO   Y=132 DEPTH FOCUS      Pad 2: X=133 FOLD TWIST  Y=134 CELL RADIUS
    //    Pad 3: X=135 LIGHT ANGLE  Y=136 RELIEF DEPTH.   All centred at 0.5 = neutral; bank4 gates
    //    the whole thing off when the phone isn't there (unset knobs read 0, sum = 0).
    float bank4 = step(0.001, knob_131 + knob_132 + knob_133 + knob_134 + knob_135 + knob_136);
    gCrossBias = (knob_139 - 0.5) * 0.12 * step(0.001, knob_139 + knob_140);   // K139 HEX↔CROSS (pad 5 X, iter 25): <0.5 more cross, >0.5 more hex
    gCrossBias -= clamp(waveletTiltMedian, -1.0, 1.0) * 0.05 * quietGate;   // vj2 iter 1: SPECTRAL TILT → cell SHAPE. Bass-heavy balance (+tilt) → the taut CROSS dominates; bright/hissy (−tilt) → HEXAGONS. Median = slow, structural (~seconds), never a per-frame flick.
    gSpin  += (knob_133 - 0.5) * 2.0 * bank4;                 // K133 FOLD TWIST
    gHexR  += (knob_134 - 0.5) * 0.15 * bank4;                // K134 CELL RADIUS
    gScale  = 2.0 + 0.30 * shapeB + (knob_131 - 0.5) * 0.5 * bank4
            + (clamp(waveletSpreadMedian, 0.0, 1.0) - 0.6) * 0.5 * quietGate;   // vj2 iter 10: SPECTRAL WIDTH → FOLD RATIO. Wide/dense spectrum (spread ~0.85) opens the self-similarity ratio (+0.12), a narrow one tightens it (−0.15). Median → slow structural permutation, never a per-frame flick. // K131 FOLD RATIO
    gDepthFocus = clamp(0.35 + (waveletCentroidSpring - 0.5) * 1.0 + shapeA * 0.25 + (knob_132 - 0.5) * bank4, 0.0, 1.0);   // biased COARSE (0.35): bold cells by default, filigree only when bright   // K132 DEPTH FOCUS   // BRIGHTNESS → fine detail, dark → coarse (level window)                            // fractal self-similarity ratio: slow permutation of the WHOLE structure (user iter 12: fractal permutations, not warps)
    gFill   = 0.06 + trebLive * 0.02 * quietGate;           // vj2 iter 2: .035 → .02 (de-twitch)

    // ── UNIQUE-PER-AREA structure: world position drifts the cell SIZE only — NOT rotation.
    //    Rotating the lattice by area made the pan axis appear to invert in different places;
    //    colour (regionHue) + cell size carry the per-area uniqueness without that side effect.
    // AUTO-FLIGHT (iter 22, user: "auto fly us around") — the geography is no longer still: a slow
    //    aperiodic wander (sum of incommensurate sines, ~1/7 screen per second at zoom 1) carries us
    //    through the world on top of the phone's pan. Constant rates → no rate-change jumps.
    vec2 fly = vec2(0.60 * sin(bTime * 0.070) + 0.40 * sin(bTime * 0.031 + 1.3),
                    0.50 * cos(bTime * 0.053) + 0.30 * sin(bTime * 0.023 + 0.7));
    fly *= mix(1.0, knob_140 * 2.0, step(0.001, knob_139 + knob_140));   // K140 FLIGHT RANGE (pad 5 Y): 0 = hold still, 0.5 = default, 1 = double
    fly *= FLIGHT;                                            // vj2 iter 2: user 'I don't like the scrolling right now' → auto-flight OFF (FLIGHT 0.0). Phone pan still works. Re-enable by setting FLIGHT 1.0.
    vec2 world = vec2(navX, navY) + fly;
    gHexR += 0.07 * sin(world.x * 0.8 + world.y * 0.45);

    // NO whole-field rotation and NO orbital drift — the geography stays put unless YOU move it.
    float navz = navZoom < 0.01 ? 1.0 : navZoom;
    uv *= 0.07 / navz;                                        // (kick zoom-punch REMOVED iter 26 — a whole-screen scale flick is what read as SHIVER)
    uv += world;                                              // finger PAN — screen-consistent now
    vec2 wpos = uv;                                           // clean world position for the PATH (pre-warp)
    // gentle terrain warp for texture; grows PERMANENTLY on big drops (warpGrow). A fixed function
    // of world position, so it varies by area but never reverses the pan direction.
    uv += (0.03 + warpGrow * 0.04) * vec2(sin(uv.x * 3.0 + seed4 * TAU), cos(uv.y * 3.0 + seed4 * TAU));

    vec4 fr = fractal(uv);
    float lum = fr.x, field = fr.y, wave = fr.z, alpha = fr.w;

    // ── BEAUTIFUL COLOUR ── one smooth Oklch journey (iris/1 PITCH→COLOUR family): the MELODY
    //    carries the palette through the song and BRIGHTNESS (centroid) tints it, so the whole
    //    image flows in colour with the music. Smoothed contours only — no jitter. quietGate so
    //    a silent room can't flash the hue. Plus per-area / per-device / permanent-drop offsets.
    float s = field
            + regionHue(world)
            + bTime * 0.002                                   // vj2 iter 5: was 0.012 = a full hue turn every ~4 min (0.24 turns/min — 8× the user's 'muted, slow' tolerance and the biggest single palette mover). Now ~1 turn / 25 min.
            + (melodyFlow * 0.05 + pitchClassMean * 0.10) * quietGate   // vj2 iter 4: MELODY → palette, but SLOW. melodyFlow slews 0.03/frame (a melodic leap re-tints the whole field 0.075 in ~0.3 s = the palette 'flash' the meter caught: hue 0.46→0.61 inside one track). pitchClassMean is the ~8 s rolling KEY estimate — it carries 2/3 of the weight now. (was melodyFlow*0.15; 0.32 before iter 17)
            + waveletCentroidSpring * 0.07 * quietGate        // BRIGHTNESS → hue tint (0.14 → 0.07)
            + (bassNoteFlow - 0.5) * 0.05 * quietGate         // BASSLINE NOTE → hue tilt (was 0.16: whole-field re-tints on note changes read as colour FLASHING — user iter 9) (centred: a mid bass note is neutral; not a phone fader, so it keeps listening under TAKE OVER)
            + (sectionMode - (1.0 - sectionMix)) * 0.03       // each DROP glides the palette 0.03 further (was 0.07) over its ~4s crossfade (mix eases the step; no snap)
            + paletteShift                                    // permanent live mutation
            + seed;                                           // per-device base palette identity
    vec3 col = lush(s, lum);                                  // (brightness handled by the bloom below)
    col += lush(s + 0.12 + 0.05 * sin(evoPhase * 0.7), 0.9) * wave * 0.6;   // pulse accent (hue-shifted, brighter); the SET CLOCK swings the accent 0.08..0.28 off base over minutes

    // BRIGHT, saturated background FIELD — no black voids; the whole screen emits light so it
    // pops off the phone at night and reads from across the room.
    vec3 bg = lush(s + 0.5, 0.05) * 0.30;                    // iter 27: DARK floor — the screenshot had no dark anywhere, so nothing could read                    // DARK muted field (3.frag) — the lattice + the sun are what you look at
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
    float dropGlow = clamp(glowLive * 0.6 + spectralCrestSmooth * 0.4, 0.0, 1.0) * quietGate;
    col *= 1.0 + bassPulse * 0.12 + dropGlow * 0.13 + gKick * 0.20;   // vj2 iter 7: kick .10 → .20 (SHADING may punch; geometry may not) // gentle so loud stays saturated, not pastel

    // ── RIM LIGHT (iter 15, replaces the sparkle grid the user vetoed) ── a directional light that
    //    SWEEPS around the lattice: the gradient of the structure gives an edge normal; edges facing
    //    the light catch a coloured rim (palette +1/3, never white). Light angle = flowPhase (the
    //    controller's bass-paced monotonic phase → the light circles faster when the low end works)
    //    + slow time. Intensity from treble spring + grit. Structural lighting, not colour flashing.
    {
        vec2  gr   = vec2(dFdx(lum), dFdy(lum));
        float edge = length(gr);
        vec2  n    = gr / max(edge, 1e-4);
        float ang  = flowPhase * 0.8 + bTime * 0.3 + knob_135 * TAU * bank4;   // K135 LIGHT ANGLE (manual offset on the sweep)
        // THE SUN (iter 17, user: "something to focus on") — the light source is VISIBLE: a small
        // orb orbiting the centre (~35 s per lap, faster with bass via flowPhase). Rim + shadow now
        // point AT it per pixel, so the lighting is legible: it comes from the thing you're watching.
        // iter 21, user: "I need that circle orbiting to stop" — the sun is now STATIONARY at the
        // centre (still the focal point); the light DIRECTION keeps sweeping on its own so the rim /
        // shadow / specular stay alive without anything circling the screen.
        vec2  sunP = vec2(0.0);
        vec2  L    = vec2(cos(ang), sin(ang));
        float rim  = smoothstep(0.02, 0.25, edge) * pow(0.5 + 0.5 * dot(n, L), 2.0);
        vec3  rimCol = lush(s + 0.33, 1.0);
        col += rimCol * rim * (0.30 + trebLive * 0.45 + spectralRoughnessSmooth * 0.25) * quietGate * 0.8;
        // SHADOW SIDE (iter 16): edges facing AWAY from the light darken → the lattice reads as RELIEF,
        // lit from one side. Depth punches on kicks (gKick, dead-zoned) and leans on the bass spring,
        // so a hit makes the structure emboss harder for a beat. Lighting reactivity, not colour.
        float shade = smoothstep(0.02, 0.25, edge) * pow(0.5 - 0.5 * dot(n, L), 2.0);
        col *= 1.0 - shade * (0.22 + gKick * 0.65 + bassLive * 0.18)   /* vj2 iter 7: kick relief .40 → .65 */ * quietGate * mix(1.0, 0.4 + knob_136 * 1.2, bank4);   // K136 RELIEF DEPTH
        // SPECULAR (iter 19): a TIGHT glint on line edges facing the sun exactly — slides along the
        // structure as the sun orbits; treble spring + crest sharpen/brighten it. Palette-lit, not white.
        float spec = smoothstep(0.02, 0.25, edge) * pow(max(dot(n, L), 0.0), 14.0);
        col += lush(s + 0.33, 1.0) * spec * (0.25 + trebLive * 0.6 + spectralCrestSmooth * 0.3) * quietGate;
        // (sun disc + halo REMOVED iter 21 — user: "that circle needs to go". Lighting stays.)
    }

    // ── AURORA (DRAMATIC, /vibej iter 8) ── slow translucent colour CURTAINS sweeping the whole
    //    screen over the lattice, like northern lights behind glass. Sparse bright ribbons that
    //    fold and drift; hue is the palette's complement so they read as a separate layer. Louder
    //    with spectral BRIGHTNESS + GRIT (both smoothed, neither a phone fader). quietGate-calm.
    {
        vec2 a = fragCoord / iResolution.xy;
        float band = sin(a.x * 4.0 + sin(a.y * 3.0 + bTime * 0.9) * 1.5 + bTime * 0.5 + evoPhase)
                   * sin(a.x * 7.3 - a.y * 2.0 - bTime * 0.7);
        float curtain = smoothstep(0.35, 1.0, band);                       // sparse bright ribbons
        float auroraAmt = (0.35 + waveletCentroidSpring * 0.6 + spectralRoughnessSmooth * 0.3) * quietGate;
        vec3 acol = lush(s + 0.5 + a.y * 0.15, 0.9);                       // complement, drifting up the screen
        col += acol * curtain * 0.10 * auroraAmt * mix(1.0, knob_137 * 2.0, step(0.001, knob_137 + knob_138));   // K137 AURORA AMOUNT (pad 4 X: 0 = off, 0.5 = default, 1 = double)                          // 0.22 → 0.10 (iter 17: palette calm)                          // 0.30 → 0.22 (iter 9: less colour churn)
    }

    // GLOW LIFT — gamma up + gain so mid-tones emit; high chroma keeps it NEON, not washed out.
    col = pow(clamp(col, 0.0, 1.0), vec3(1.18));             // vj2 iter 3: 0.92 → 1.18 — meter said dark fraction 1.4% / lum 0.30 / sat 0.81: no floor. Gamma > 1 pulls the mids down and leaves the lit lattice edges bright, so structure gets CONTRAST without touching hue. (iter 27: 0.80/1.15 gain was flattening to pink)
    col *= 1.00;

    // gentle trail (low decay so the glow carries between frames)
    vec4 prev = getLastFrameColor(fragCoord / iResolution.xy);
    col = mix(prev.rgb * 0.90, col, 0.82);

    // minimal vignette — barely darken the edges, it has to read from a distance
    col = mix(col, vec3(0.0), dot(sp, sp) * 0.38);           // iter 27: real vignette — gives the eye a centre (the "focus" the user asked for, from composition not an overlay)

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
