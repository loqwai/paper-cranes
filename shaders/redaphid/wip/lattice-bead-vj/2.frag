// ============================================================================
// HERO BEAD (H11, lab/hero, 2026-09-03) -- fork of lattice-bead/2.frag
// ----------------------------------------------------------------------------
// WAVE 1 FINDING: the mirror-repeat fold draws its cell at a CORNER of the folded
// domain, so ANY function of p is 4-fold mirrored. The lattice can only ever show
// the FOLD's symmetry, never the motif's. Wave 1 concluded the motif is therefore
// unnameable inside the lattice, and that the fix was to rewrite fractal().
//
// H11 DOES NOT REWRITE fractal(). It changes what the fold is FOR.
// The motif is drawn ONCE, WHOLE, UN-FOLDED, in SCREEN space, at hero scale --
// the bead is the SUBJECT. The lattice becomes its MATERIAL and its FIELD:
//   * APERTURE  -- inside the silhouette the SAME lattice is magnified (HERO_LENS),
//                  so the bead is a lens onto the field, not a decal on it. Its
//                  interior inherits the perpetual zoom ratchet, so it is never still.
//   * BEND      -- outside, the field is pushed along the hero SDF gradient, so the
//                  lattice visibly flows AROUND the object.
//   * BEVEL/RIM -- the hero SDF gradient IS a surface normal, lit by the same sweeping
//                  sun as the lattice, so the bead sits IN the scene with relief.
//   * OUTLINE   -- one crisp palette-lit stroke on |hd|=0: the signature that survives
//                  distance, darkness and a 15% downscale.
//   * SETTLE    -- a MONOTONIC one-way ease: on load the bead grows out of the lattice
//                  and locks. This is the NFC-tap moment ("the wall becomes their bead").
//
// CHANNEL HIERARCHY IS INTACT. Hero RADIUS/LENS/BEND are geometry: constants x a
// monotonic settle, never a per-frame audio value. All hero LIGHT (outline, rim,
// bevel, halo) takes audio freely -- that is the shading lane.
//
// REQUIRES ?image=images/beads/mon-<name>.png. With no bead image the hero samples
// the placeholder and is meaningless -- set knob_180=1 to disable it.
// ============================================================================
// LATTICE-VJ (9.frag — FORK of 8.frag on 2026-08-20, late in the live-mic set) — THE LEARNED FORK.
// 8.frag captured the structure run; 9 is the first iteration whose changes were DICTATED BY
// MEASUREMENT of the user's own hands rather than by my taste. Two confirmed gestures, wired:
//   * CHURN  = spectralFlux composite  -> LINE WEIGHT + RIM FLARE   (b10)
//       three faders agreed: K147 r=+0.57 t=5.22, K150 r=+0.57, K149 r=-0.45
//   * WUB    = wubDepth (floor-trimmed) -> TRAVELLING ACCENT + SPECULAR GLINT  (b11)
//       both axes of one pad agreed: K106 r=0.521 t=5.7, K105 r=0.448 t=5.0; K148 -> wubPulse
// Both live in the SHADING lane (geometry stays monotonic/one-way per the standing hierarchy) and
// both ADD light, because the frame was fighting a dark floor when they were wired.
// Also carried from 8: symmetry plateaus, spin-follows-low-end, spatial permutations, the
// zoom x loudness clamp, the complexity ratchet + its two brightness counter-ratchets.
// BAKED PRESET (live at fork, evoPhase 5.54 = 84% complexity):
//   knob_1=0.429 knob_131=0.162 knob_132=0.483 knob_133=0.59 knob_134=0.507 knob_135=0.876
//   knob_136=0.57 knob_137=0.485 knob_138=0.505 knob_139=0.216 knob_140=0.537
//   knob_141=0.263 knob_142=0.548 knob_143=0.538 knob_144=0.41
//   knob_147=0.472 knob_148=0.807 knob_149=0.636 knob_150=0.587
//   navX=1.232 navY=-0.264 navZoom=0.301 paletteShift=1.96 warpGrow=2.0  <- nav/mutation are EARNED
// LATTICE-VJ (8.frag — FORK of 7.frag on 2026-08-20, live mic set) — THE STRUCTURE SNAPSHOT.
// 7.frag was the live scratch for the 08-20 run; this is that run's result, captured intact with
// the session's earned state baked into the preset below. Everything the run added is here:
//   * SYMMETRY PLATEAU (b1)   — each drop eases the master fold angle to a new hashed value.
//   * SPIN FOLLOWS LOW END(b2)— fold rotation rate rides flowPhase (bass-paced, monotonic).
//   * SPATIAL PERMUTATIONS(b4)— fold params are smooth functions of world x/y: panning re-tiles
//                               the lattice continuously. The PATH ribbon + towers are GONE.
//   * ZOOM x LOUDNESS (b5/b6) — sustained energy slows the perpetual dive (LEARNED from a
//                               confirmed fader gesture: K147 vs energyLong r=-0.75).
//   * COMPLEXITY RATCHET (b7) — the recursion-level window dissolves and the sub-lattices
//                               separate as the set clock advances: the lattice gains detail
//                               over the night and never gives it back.
// BAKED PRESET (live values at fork time, evoPhase 4.59 -> ~78% complexity):
//   knob_1=0.627 knob_131=0.162 knob_132=0.483 knob_133=0.59 knob_134=0.507 knob_135=0.876
//   knob_136=0.57 knob_137=0.485 knob_138=0.505 knob_139=0.216 knob_140=0.537
//   navZoom=0.218 paletteShift=1.716 warpGrow=2.0   <- paletteShift/warpGrow are EARNED (drops)
// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: fractal, hex, lattice, touch, color, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/chromadepth-lattice/6&wavelet=true&controller=lattice-nav&fullscreen=true&knob_1=0.21&name=Living%20Lattice%20Still
//   * knob_1 = PAN SPEED (live: preset / URL / MIDI / jam drawer). 0 = precise/slow, 1 = fast
//     roaming; ~0.21 ≈ 1 screen per swipe. Read by the lattice-nav controller (scales drag deltas).
// LATTICE-VJ (6.frag — FORK of 5.frag on 2026-08-19) — THE EXPLORE FORK. 5.frag stays the good
// snapshot; this one exposes the fractal's previously-hardcoded CONSTANTS as two vjpad banks so
// they can be hand-flown with no music running, to find out which of them are worth handing to a
// sound feature later. Nothing here changes 5.frag's look: every explore fader is centred at 0.5,
// and 0.5 reproduces 5.frag's constant exactly.
// LATTICE-VJ (4.frag — FORK of 3.frag at /vibej iter 137, 2026-08-18) — live /vibej scratch from iter 138 on; 3.frag preserved as the tuned musicality-recipe snapshot. Originally a byte-copy of chromadepth-lattice/6.frag, kept as the SCRATCH COPY for
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

// BEAD_MIX: 0 = pure hexagon (identical to 9.frag), 1 = pure bead silhouette.
// Hand knob only — see the channel-hierarchy warning at the delt1 mix site.
// Defaults to 0 so a page opened WITHOUT ?image= still shows the known-good lattice
// instead of a field of garbage sampled from placeholder-image.png.
#define BEAD_MIX (knob_161)

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
// ── vj8-b10 CHURN — THE LEARNED SIGNAL, WIRED (2026-08-20) ────────────────────────────────────
// The user rode three faders at once and all three tracked spectralFlux: K147 ZOOM RATE r=+0.57
// (lag 0, t=5.22, n_eff 58.8), K150 WARP r=+0.57 (lag 2s), K149 FILL r=-0.45 (lag 2s, inverse).
// Three independent faders on one feature is the corroboration standard from 08-19.
// Flux alone is jittery, so CHURN is a COMPOSITE of two views of the same feature: the normalized
// LEVEL (where are we in the range) plus the positive half of the Z-SCORE (is this a burst right
// now). Level gives a readable position, the one-sided z-score gives the punch, and clamping keeps
// it bounded. quietGate so a silent room reads zero.
// RANGE-FITTED to the live signal, not to theory: measured over 4 s of the actual room, the raw
// composite only spanned 0.111..0.319 (mean 0.192). Shipping that against a 0..1 coefficient is how
// b6's learned mapping ended up invisible ("I don't see the shader reacting"). So the composite is
// re-mapped onto the range it actually occupies — floor 0.10, x4 — which turns tonight's swing into
// a near-full 0.04..0.88 excursion. Re-measure and re-fit at venue volume; that is a two-minute job
// and the difference between a mapping you can see and one only the maths knows about.
// ── vj8-b11 WUB — SECOND LEARNED SIGNAL (2026-08-20) ─────────────────────────────────────────
// Next confirmed gesture, and the analyzer answered instead of refusing: BOTH axes of the COLOUR
// pad tracked `wubDepth` (K106 r=0.521 t=5.7 lag 0; K105 r=0.448 t=5.0 — same physical pad, two
// axes, one feature) and K148 tracked `wubPulse`, its sibling. Three of four moved faders pointing
// at the WOBBLE family is corroboration, not coincidence.
// Measured live: wubDepth spans 0.184..1.0 (mean 0.535) — already a full-range signal, so it needs
// only a floor trim, not the 4x expansion CHURN needed. Range-fit each feature to ITS OWN measured
// span; a coefficient copied from another signal is how a mapping ends up invisible or slammed.
#define WUB (clamp((wubDepth - 0.18) * 1.25, 0.0, 1.0) * quietGate)
#define CHURN_RAW (0.70 * spectralFluxNormalized + 0.55 * max(0.0, spectralFluxZScore))
#define CHURN (clamp((CHURN_RAW - 0.10) * 4.0, 0.0, 1.0) * quietGate)
#define FLIGHT 0.0   // shader-side auto-flight stays OFF (vj2 iter 2: "I don't like the scrolling").
                     // iter147: TRAVEL now belongs to controllers/flyby.js — a zoom-out / fly / zoom-in
                     // state machine. A shader can only be PERIODIC, so it would fly you back to the
                     // same places forever; the controller remembers where it has been and always
                     // departs from there. Chain it AFTER lattice-nav: ?controller=lattice-nav&controller=flyby
uniform float energySpring;
uniform float melodyFlow;
uniform float spectralCrestSmooth;
uniform float spectralRoughnessSmooth;   // smoothed grit → iridescent sparkle (texture family)
// vj2-r1 (2026-08-19): roughness entered this shader ONLY as the smoothed LEVEL (border, rim,
// aurora) — which discards exactly the transient shape the user's hand was tracing. Measured over
// two independent faders in one gesture, their motion tracked spectralRoughnessZScore at ~1.2s lag
// (r=0.78 n_eff=11, r=0.74 n_eff=9; every larger r in that gesture failed the effective-N test).
// So the Z-score now punches the RELIEF depth: grit embosses the lattice harder for a moment.
// Shading channel per the hierarchy — never geometry. max() keeps it one-sided; the pre-existing
// min(0.85,...) clamp still protects lumMin.
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
uniform float flybyZoom;
// ── iter150: four MORE audio features, deliberately picked from DIFFERENT domains (CLAUDE.md's
//    independence matrix) so they don't just re-say what bass/mids/treble already say. All are
//    MEDIANS — multi-second rolling centres — because these drive STRUCTURE, and structure follows
//    slow music. A median cannot jitter, so none of these can re-introduce shiver.
uniform float spectralSkewMedian;      // SHAPE domain: harmonic tilt
uniform float spectralEntropyMedian;   // QUALITY domain: chaos vs order
uniform float spectralKurtosisMedian;  // SHAPE domain: peaked vs diffuse
uniform float spectralSpreadMedian;    // SHAPE domain: harmonic width
uniform float pitchClassMedian;        // TONAL domain: what key we are in     // iter148: controllers/flyby.js arc position — 1 = cruising in close, ~0.24 = wide
uniform float paletteShift;  // PERMANENT palette rotation — grows on every big drop
uniform float warpGrow;      // PERMANENT structural warp — grows on every big drop
// waveletBassZScore + wavelet_bassHit auto-declare (raw) — transient pulse punch only.

// ── EXPLORE BANKS (vjpad banks 5 and 6) ─────────────────────────────────────────────────────────
//    Bank LATTICE (knob_131–140) already drives the SHAPE parameters. These two banks go one layer
//    down and expose the fractal's hardcoded CONSTANTS — the numbers that were tuned by hand over
//    150 iterations and have never been reachable live. The point is exploration with the music OFF
//    (`?noaudio=true`): fly a constant by hand, see what it actually does to the structure, and only
//    then decide whether it deserves an audio feature.
//
//    EVERY explore axis is a 0..1 fader CENTRED AT 0.5, and 0.5 == 5.frag's original constant. So a
//    reset bank is a byte-identical look, and the distance from centre is literally "how far from
//    the tuned value am I".
//
//    THE GATE: an absent phone leaves its knobs at 0 (WebGL's default for an unset uniform), which
//    without a gate would read as EVERY FADER SLAMMED DOWN. So each bank multiplies by the step() of
//    its own sum: no phone on the bank => the bank contributes exactly nothing.
#define EXA_ON step(0.001, knob_141+knob_142+knob_143+knob_144+knob_145+knob_146+knob_147+knob_148+knob_149+knob_150)
#define EXB_ON step(0.001, knob_151+knob_152+knob_153+knob_154+knob_155+knob_156+knob_157+knob_158+knob_159+knob_160)
#define EXA(k, amt) ((k - 0.5) * (amt) * EXA_ON)
#define EXB(k, amt) ((k - 0.5) * (amt) * EXB_ON)

// ══ H10 BRIGHTNESS LEVERS (lab/bright) ══════════════════════════════════════════
// Ported from redaphid/lattice-interactive/3.frag. Each lever is on its OWN knob and
// deliberately sits OUTSIDE the EXB_ON gate, because EXB_ON = step(0.001, k151..k160)
// means touching ANY of 156/157/159/160 wakes ALL of them at their unset value of 0 --
// which silently drops CHROMA to ~0 (greyscale) and GAIN to 0.66. That is a measurement
// trap, not a design. These four are independent so each contribution can be decomposed.
// Defaults below reproduce 1.frag EXACTLY when the knobs are passed at their 1.frag value.
// Each lever below is BAKED to its tuned stage value; passing the knob overrides it.
// step(0.001,k) means "knob omitted -> use the baked constant", so the projector URL
// needs NO lever knobs and a knob can still be twisted live to trim.
#define LVK(k, baked, map) mix((baked), (map), step(0.001, (k)))
#define LV_GAMMA  LVK(knob_170, 1.24, knob_170 * 2.0)   // final tone curve.  1.frag: 1.18 | lattice-interactive/3: 0.80 (REJECTED, see below)
#define LV_HALOW  LVK(knob_171, 0.06, knob_171 * 0.24)  // glow halo WIDTH.   1.frag: 0.06 | ref: 0.12 (measured DEAD)
#define LV_HALOA  LVK(knob_172, 0.35, knob_172)         // halo WEIGHT.       1.frag: 0.35 | ref: 0.60 (measured DEAD)
#define LV_LBASE  LVK(knob_173, 0.10, knob_173)         // palette lightness BASE.  1.frag: 0.33 | ref: 0.50  -> LOWERED to 0.10
#define LV_LSLOPE LVK(knob_174, 1.20, knob_174 * 1.6)   // palette lightness SLOPE. 1.frag: 0.40 | ref: 0.36  -> RAISED to 1.20
#define LV_BGBASE LVK(knob_175, 0.30, knob_175 * 0.6)   // background FIELD base.   1.frag: 0.30 (measured DEAD: alpha~1, bg never visible)

mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// BEAUTIFUL palette — perceptual Oklch, lush and smooth (no muddy mid-mixes). s wraps the hue;
// lit lifts lightness; chroma breathes for richness. Bounded away from white/black.
vec3 lush(float s, float lit){
    float h = fract(s) * TAU;
    // BRIGHT baseline so the whole thing emits light (must pop off a phone at night, read from afar)
    float L = clamp(LV_LBASE + EXB(knob_156, 0.40) + LV_LSLOPE * clamp(lit, 0.0, 1.0), 0.05, 0.92);   // LV_LBASE (H10)   // K156 LIGHT BASE: the palette's baseline lightness (the tuned 0.33 was five iterations of 'less washed out').   // vj2 iter 6: 0.40+0.44 → 0.33+0.40 (max L 0.84 → 0.73). Meter on lit passages: dark 2.4 %, lum 0.30, sat 0.85 — pastel. Lower L keeps chroma, restores the floor. (Oklch: hue untouched.)   // MUTED (iter 17, from chromadepth-lattice/3): lower base lightness
    float C = max(0.0, (0.075 + seed2 * 0.05) + EXB(knob_157, 0.14)) + 0.04 * sin(s * TAU * 0.5 + 1.3);   // K157 CHROMA: saturation. 0 = greyscale structure (a genuinely useful way to READ the geometry).   // vj2 iter 11: chroma 0.09+.06/.05 → 0.075+.05/.04. Meter sat 0.93–0.94 since the L/gamma changes (low L + same C = gamut-edge neon). User wants MUTED; sat target ~0.8.   // lower chroma than 6.frag's neon — user: "more muted"
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

// ---------------------------------------------------------------- BEAD CELL
// Signed distance to the bead silhouette, scaled to a cell of radius r, in the
// same lattice units hexDist works in. Feed it a mon SDF PNG:
//   ?image=images/beads/mon-kiku.png
//
// UNITS — the thing that makes this correct, and the trap if you skip it.
// hexDist is a NORM: homogeneous of degree 1, so `hexDist(p) - r` is the hexagon
// of radius r for ANY r. A baked SDF is NOT homogeneous — it is a distance at one
// fixed scale. So you cannot substitute one for the other inside `(... - hexR_i)`;
// the brief's literal §6 snippet does exactly that and is dimensionally wrong.
// Instead sample the field in bead-normalised space (p/r) and multiply back by r,
// which yields a true signed distance to the bead scaled to radius r. The boundary
// is already placed by that scaling, so DO NOT also subtract hexR_i.
//
// The bake normalises distance to the bead's own half-extent (0.5 == boundary,
// ±1 == bake edge), so ONE constant serves all 11 mon. See bake_sdf_png.py.
#define BEAD_RANGE 1.0
// ONE-TILE LOOKUP (from lab/whole, now ON by default). The texture wraps REPEAT, and a
// cell's texcoord used to span ~1.48 periods with 85% of it wrapped, so each cell showed a
// tiled mosaic rather than one motif. Clamping the lookup to the tile and EXTENDING the field
// analytically outside it gives exactly 0.988 periods and 0% wrap at every level. A bare clamp
// plateaus and floods; the `length(tc - tcc) * 2.0` term is the standard SDF-outside-a-box
// extension, in q units. Measured cost to the lattice: NONE -- and it also removed the wrap
// spill that was masquerading as a +30-43% "all motifs brighten" result.
// knob_165 > 0.5 restores the old wrapping lookup for A/B.
#define ONETILE (1.0 - step(0.5, knob_165))
float beadDist(vec2 p, float r){
    vec2 q   = p / max(r, 1e-3);         // bead-normalised space
    vec2 tc  = q * 0.5 + 0.5;            // [-1,1] -> texture coords
    vec2 tcc = clamp(tc, 0.0, 1.0);
    vec2 uv  = mix(tc, tcc, ONETILE);
    // ── ALIASING PROBE (knob_176, lab/bright) ── the mon SDF is uploaded NEAREST with no
    //    mipmaps, and fractal() doubles the sampling rate per level, so at deep levels one
    //    screen pixel spans thousands of texels and takes ONE arbitrary point sample. That
    //    destroys the mid-tone shoulder (litPct) while leaving line cores (brightPct) intact.
    //    knob_176 > 0 turns on a 5-tap box filter sized to the actual screen footprint --
    //    a poor-man's mipmap, purely to TEST whether the missing light is coverage not lighting.
    //    knob_176 = 0 (default, and the shipped preset) is the unmodified single tap.
    float d;
    if (knob_176 > 0.001){
        vec2 e = fwidth(uv) * (0.35 * knob_176 * 4.0);
        float a = getInitialFrameColor(uv).g
                + getInitialFrameColor(uv + vec2( e.x,  e.y)).g
                + getInitialFrameColor(uv + vec2(-e.x,  e.y)).g
                + getInitialFrameColor(uv + vec2( e.x, -e.y)).g
                + getInitialFrameColor(uv + vec2(-e.x, -e.y)).g;
        d = (a * 0.2 - 0.5) * 2.0 * BEAD_RANGE;
    } else {
        d = (getInitialFrameColor(uv).g - 0.5) * 2.0 * BEAD_RANGE;
    }
    d += length(tc - tcc) * 2.0 * ONETILE;   // monotone exterior, q units
    return d * r;                        // back to lattice units
}

// ---------------------------------------------------------------- HERO BEAD
// knob_180 > 0.5 DISABLES the hero (A/B against the plain lattice).
#define HERO_OFF   step(0.5, knob_180)
#define HERO_LIVE  (1.0 - HERO_OFF)
// GEOMETRY LANE -- constants, hand knobs, and a one-way settle only. No audio.
#define HERO_R     (knob_181 > 0.001 ? 0.18 + knob_181 * 0.60 : 0.45)   // screen radius (uv y half-height = 0.5)
#define HERO_SPIN  (knob_188 > 0.001 ? (knob_188 - 0.5) * 2.0 : 0.55)   // interior field rotation
#define HERO_SHIFT (vec2(0.31, -0.19) * (knob_190 > 0.001 ? knob_190 * 2.0 : 1.0))   // interior world offset
#define HERO_LENS  (knob_182 > 0.001 ? knob_182 : 0.70)   // interior magnification of the field
#define HERO_BEND  (knob_183 > 0.001 ? knob_183 * 0.10 : 0.028) // how hard the field bows around it
// SHADING LANE -- audio allowed.
#define HERO_EDGE  (knob_184 > 0.001 ? knob_184 * 0.02 : 0.0060) // outline half-width, screen units
#define HERO_HUE   (knob_185 > 0.001 ? knob_185 : 0.42)   // interior palette rotation vs the field
#define HERO_RIM   (knob_186 > 0.001 ? knob_186 * 2.0 : 1.0)
#define HERO_LIFT  (knob_187 > 0.001 ? knob_187 : 0.88)   // how much the interior is re-lit
#define HERO_INL   (knob_189 > 0.001 ? (knob_189 - 0.5) * 2.0 : -0.22)    // interior luminance offset
// SUBJECT vs GROUND. The lattice at these params is BRIGHT and BUSY; measured at 15% scale it
// out-shouts the motif and the bead stops being nameable. A subject needs a subordinate ground,
// so the field outside the silhouette is dimmed and desaturated. This is the counter-ratchet
// partner of the interior lift -- light is moved into the bead, not added to the frame.
#define HERO_QUIET (knob_191 > 0.001 ? knob_191 : 0.26)   // K191 GROUND QUIET how much of the field survives outside the bead (default 0.26)
#define HERO_DESAT (knob_192 > 0.001 ? knob_192 : 0.40)   // exterior saturation kept
#define HERO_SAT   (knob_194 > 0.001 ? 0.5 + knob_194 * 2.0 : 1.55)   // K194 INTERIOR CHROMA saturation of the lattice seen through the bead (default 1.55)
#define HERO_TOE   (knob_193 > 0.001 ? 1.0 + knob_193 * 1.5 : 2.0)   // K193 GROUND CURVE contrast toe on the field, 1.0..2.5 (1 = off, default 2.0)
#define HERO_KEYHUE (knob_195 > 0.001 ? knob_195 * 0.8 : 0.35)   // K195 KEY HUE how far the outline colour travels with the song's key (turns over the pitch-class range)

// Signed distance to the WHOLE motif, screen units, for a bead of radius r.
// Same one-tile clamped lookup + analytic monotone exterior as beadDist (lab/whole),
// so there is no REPEAT wrap and exactly one motif is ever shown.
float heroDist(vec2 p, float r){
    vec2 q   = p / max(r, 1e-3);
    vec2 tc  = q * 0.5 + 0.5;
    vec2 tcc = clamp(tc, 0.0, 1.0);
    float d  = (getInitialFrameColor(tcc).g - 0.5) * 2.0 * BEAD_RANGE;
    d += length(tc - tcc) * 2.0;              // monotone exterior, q units
    return d * r;                             // back to screen units
}

// depth-coherent reactivity: near layers shimmer w/ treble, far layers throb w/ bass
float bandForDepth(float ld){
    if (ld < 0.34) return trebLive * quietGate;
    if (ld < 0.67) return midsLive * quietGate;
    return bassLive * quietGate;
}

// shared per-frame state
float gSpin, gPulse, gPop, gKick, gHexR, gBorder, gCross, gFill, gScale, gDepthFocus, gCrossBias;
// EXPLORE A geometry constants, resolved once per frame in main() (see EXPLORE BANKS above).
// gThetaStep is shared on purpose: the per-level fold twist inside fractal() and the zoom-wrap
// rotation compensation in main() MUST use the same number or the ~60 s octave seam snaps.
float gThetaStep, gTwistFall, gInterleave, gRingGap, gSwirlArms, gSwirlRadial, gDepthTint, gSwirlMix, gLevelSkew;
float gLevelOpen;   // vj7-b7 COMPLEXITY RATCHET: how much of the level window is dissolved (0 = tuned window, 1 = every recursion level drawn at once). Monotonic in the set clock only.
float gShapePhase;   // iter 138 RATCHET: monotonic phase for the depth-traveling radius wave (never retraces)

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
        // iter143 NO-ANGLE-AUDIO: parity is now FIXED per level. The old form multiplied by
        // (2*sectionMix-1), so every drop drove sgn from -1 through ZERO back to +1 — the per-level
        // spin literally reversed and re-wound. That is a bounce by construction (iris rule: never
        // let audio/events move an ANGLE backward). Evolution on drops lives in the evoA-evoD
        // plateaus + paletteShift instead, which are one-way.
        float sgn = (mod(float(i), 2.0) < 1.0) ? 1.0 : -1.0;
        float theta = float(i) * gThetaStep                     // K141 TWIST STEP: the per-level fold rotation. THE master symmetry control — PI/8 is the tuned hexagonal value, and moving it re-tiles the whole plane.
                    + gSpin * (0.4 + float(i) * gTwistFall) * sgn   // K142 TWIST FALLOFF: how much harder DEEP levels spin than shallow ones. 0 = the whole stack turns as one rigid piece.
                    + (evoWarp - 0.5) * float(i) * 0.10
                    + (seed3 - 0.5) * float(i) * gLevelSkew;   // K145 LEVEL SKEW: per-device per-level twist depth. 0 = every device sees the same lattice; high = each level is wrenched further from its parent.
        p *= rot2(theta);
        scale *= s;
        if (i < FIRST) continue;

        vec2 uv = abs(p);
        // iter150 INTERLEAVED SCALES: alternate recursion levels take opposite radius offsets, so the
        //    lattice reads as TWO interleaved structures rather than one self-similar stack. The split
        //    is driven by harmonic TILT (spectralSkewMedian): a bass-tilted mix opens the coarse levels
        //    and tightens the fine ones, a bright mix does the reverse. Depth is not a motion axis
        //    (iter 138 proved that), but it IS a legible STATIC axis — the levels all overlap on
        //    screen, so making them differ shows up as richer structure everywhere at once.
        float lvlParity = (mod(float(i), 2.0) < 1.0) ? 1.0 : -1.0;
        float hexR_i = gHexR + lvlParity * (spectralSkewMedian - 0.5) * 0.16 * quietGate + lvlParity * gInterleave;   // K143 INTERLEAVE: pushes even and odd levels to OPPOSITE radii, so the stack reads as two interleaved lattices instead of one self-similar one. This is the manual version of iter150's spectralSkew term — fly it with the music off to see what that feature is actually doing.   /* iter 142: depth-wave removed entirely — it pulsed */   /* iter 141: demoted 0.13 -> 0.04 — read as pulsing, not travel; the zoom ratchet is the primary motion now */   // iter 138 RATCHET: radius modulation is a WAVE traveling through recursion depth (phase monotonic) - each level swells as the wave passes, motion always flows one way
        // BEAD MORPH (variant 1). Both terms are signed distances to a cell boundary
        // of radius hexR_i in lattice units, so the mix is dimensionally sound and
        // BEAD_MIX=0 is byte-identical in behaviour to 9.frag.
        // ⚠ BEAD_MIX is GEOMETRY (it moves where cell boundaries ARE), so per the
        // standing channel hierarchy it may be a hand knob or a one-way eased step on
        // a drop — it must NEVER take a per-frame audio value. A bead morphing back and
        // forth with the kick is the exact failure that was fixed four times (iters 138–142).
        float hexTerm  = hexDist(uv) - hexR_i;
        float beadTerm = beadDist(uv, hexR_i);
        float cellD    = mix(hexTerm, beadTerm, BEAD_MIX);
        float delt1 = abs(cellD - gRingGap);   // K144 RING GAP: distance from the hex ring to the drawn line — sets how HOLLOW each cell is, independently of its radius.        // MIDS breathe the hexagons
        float delt2 = min(length(uv) - gCross, min(uv.x, uv.y)) + gCrossBias; // BASS taut cross (+K139 hex↔cross balance)
        float m = min(delt1, delt2);
        float alias = aliasBase * 0.5 * scale;
        // iter149 LINE PROFILE (user: "it seems blurrier than it used to be"): the intensity split was
        //    0.4 crisp / 0.6 SOFT, and the soft term ramps over 0.12 world units. Zoomed in that ramp
        //    covers a lot of screen and every line reads as a smear; zoomed out it is sub-pixel and
        //    looks fine — which is why the flyby's WIDE leg measured SHARPER than the close cruise
        //    (edge energy 0.09 wide vs 0.02 in). Weight moved to the crisp term and the soft ramp
        //    halved: the glow still fattens lines on treble, it just stops dissolving them.
        float f = smoothstep(gBorder + alias, gBorder, m) * (1.0 - LV_HALOA)
                + smoothstep(gBorder + LV_HALOW, gBorder + 0.01, m) * LV_HALOA;   // LV_HALOW/LV_HALOA (H10)   // TREBLE fattens lines

        float ld = float(i - FIRST) / float(LEVELS - 1 - FIRST);
        // LEVEL WINDOW (iter 14, fractal permutation): which recursion DEPTHS draw. gDepthFocus 0 →
        // coarse levels dominate (big bold cells), 1 → fine levels dominate (filigree). Driven by
        // smoothed spectral brightness + the slow shape clock, so dark passages go bold, bright go lacy.
        f *= mix(mix(1.0 - ld * 0.90, 0.10 + ld * 0.90, gDepthFocus), 1.0, gLevelOpen);   // vj7-b7 COMPLEXITY RATCHET: the level WINDOW dissolves as the set clock advances, so deeper and shallower generations join the picture together instead of one band at a time — the structure literally gains detail over the night. Bounded (<=0.45) so the finest levels can never fully take over into speckle.   // iter 27: stronger window (screenshot: zoomed-out finest levels read as noise)
        // CONTINUOUS palette field: recursion depth + a smooth within-cell swirl so colour flows
        // across the structure (this is the BEAUTY — a smooth field, not a discrete depth band).
        float swirl = 0.5 + 0.5 * sin(atan(p.y, p.x) * gSwirlArms + length(p) * gSwirlRadial + float(i) + seed4 * TAU + (pitchClassMedian - 0.5) * 1.2 * quietGate);   // iter150 KEY -> INTERIOR COLOUR FLOW: the rolling key estimate rotates the within-cell colour swirl, so a key change re-paints cell interiors without touching the global hue (which stays ~0 drift per directive).
        float field = ld * (0.55 + evoPlasma * 0.2 + gDepthTint) + swirl * gSwirlMix;   // K153 DEPTH TINT (how much recursion depth colours the field) vs K154 SWIRL MIX (how much the within-cell swirl does). The balance between them is what makes colour read as DEPTH or as FLOW.

        float env = sin(gPulse * PI);
        float wave = smoothstep(0.30 - (spectralKurtosisMedian - 0.48) * 0.28, 0.0, abs(ld - (1.0 - gPulse))) * env;   // iter150 PEAKEDNESS -> ACCENT WIDTH: a focused, peaky spectrum narrows the travelling accent to a tight band; a diffuse one spreads it into a broad glow.
        float band = bandForDepth(ld);
        // ── iter146 RELIEF, NOT GAIN ── (user: "the color still seems flickery on a global scale
        //    with the music - like it brightens and washes out")
        //    The old multiplier ran 1.03 -> 2.78 with the music. It multiplies EVERY pixel, and `lum`
        //    feeds LIGHTNESS in lush(), so loud music raised the whole frame's lightness and washed
        //    the colour out — the global-brightness strobe channel that directive #1 forbids. My own
        //    iter-144 band bump (0.55 -> 0.95) made it worse, and the meter missed it: a slow pump is
        //    not "flicker", it showed up as motionVsEnergy 0.67, which I misread as musicality.
        //    Fix: audio now drives RELIEF — the CONTRAST between lattice line and fill, inside the
        //    smoothstep — which is local and per-depth. The global multiplier keeps only small
        //    CENTRED terms about a constant, so mean frame brightness no longer follows the music.
        float relief = max(0.0, (band - 0.35)) * 0.75 * quietGate;   // iter148: was signed — when `band` sat below centre it SUBTRACTED contrast and softened every edge (user: 'blurrier than 24h ago'). Relief may only ever sharpen; the quiet baseline is now the floor, not the middle.
        float lit = (smoothstep(gFill + alias, gFill, m) * (0.5 + relief) + 0.18)
                  * (1.55 + (glowLive - 0.45) * 0.12 + (bassLive - 0.45) * quietGate * 0.12);   /* iter144: band 0.55->0.95 — treble lights the NEAR levels, mids the middle, bass the FAR ones, so the instruments visibly separate across recursion depth instead of blending into one brightness */   // iter 116: floor 0.95→1.03 — lumMin 0.068 on mellow Of The Trees, just under the 0.08 line   // vj2 iter 9: was 0.7/.4/.7/.6 (range 0.7→2.4): on a quiet intro (energy 0.074) the frame fell to near-BLACK. Floor up, music range compressed (0.95→2.3) — a breakdown dims, it doesn't vanish.
        lit += wave * (0.4 + gPop * 0.7 + gKick * 1.2 + spectralCrestSmooth * 0.35 + WUB * 0.9);   // vj8-b11 LEARNED: the WOBBLE drives the travelling ACCENT. Shading lane, so it may take audio freely, and it ADDS light rather than removing it — deliberate, since the frame was already fighting a dark floor when this was wired.

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

    // ── HERO BEAD, GEOMETRY LANE ────────────────────────────────────────────────
    //    Screen-anchored, un-folded, ONE motif. Everything here is a constant or a
    //    MONOTONIC settle -- no per-frame audio touches the silhouette (channel
    //    hierarchy #1: a bead that morphs with the kick is the failure fixed 4x).
    //    SETTLE is the NFC-tap moment: the bead grows out of the lattice, one way,
    //    and locks. smoothstep of iTime is monotone, so it can never run backward.
    float heroSettle = HERO_LIVE * smoothstep(0.0, 2.2, iTime);
    float heroR   = HERO_R * (0.55 + 0.45 * heroSettle);
    vec2  heroP   = suv;
    float heroD   = heroDist(heroP, heroR);
    // forward-difference gradient of the hero SDF = the object's surface normal.
    float heroEps = 2.0 / iResolution.y;
    vec2  heroG   = vec2(heroDist(heroP + vec2(heroEps, 0.0), heroR) - heroD,
                         heroDist(heroP + vec2(0.0, heroEps), heroR) - heroD);
    heroG = heroG / max(length(heroG), 1e-5);          // points OUT of the bead
    float heroIn  = smoothstep(0.0035, -0.0035, heroD) * heroSettle;   // 1 inside
    // APERTURE: inside the silhouette the SAME field is magnified, so the bead is a
    // LENS onto the lattice rather than a shape pasted over it -- and it inherits the
    // perpetual zoom ratchet, so the interior is always flowing.
    //    HERO_SHIFT is not decoration: scaling uv about the screen centre pulls the interior
    //    toward the fold's SYMMETRY CENTRE, where every recursion level's ring converges and
    //    lumAcc saturates -- the interior went chalky white and stopped reading as lattice.
    //    Offsetting the interior sample lands it in ordinary lattice instead.
    uv = mix(uv, uv * HERO_LENS + HERO_SHIFT, heroIn);
    uv *= rot2(HERO_SPIN * heroIn);   // and turned, so the boundary is a real SEAM, not a soft blend
    // BEND: outside, the field is pushed along the hero normal, so the lattice bows
    // AROUND the object instead of running underneath it.
    uv += heroG * (HERO_BEND * exp(-max(heroD, 0.0) * 7.0) * (1.0 - heroIn) * heroSettle);

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
    gSpin  = 0.0;   // iter143 NO-ANGLE-AUDIO: KICK TWIST DELETED. gKick rises and FALLS, so adding it to theta torqued the fold forward on each hit then UNWOUND it — rocking, scaled by (0.4+i*0.05) so deeper levels rocked hardest = 'sections bouncing'. Iris discipline: audio drives RATE/SHAPE/amplitude, never an angle. The kick keeps its shading role (relief + lit) untouched.                                   // KICK TWIST (0.04 → 0.015, vj2 iter 2: user 'twitchy' on dubstep — constant hits made the fold flick) (iter 26): every kick torques the fold a few degrees per level (structural, not colour)
    float bassPulse = bassLive * quietGate;
    // ── SLOW SHAPE EVOLUTION (user iter 11: "a time component so we slowly see different shapes") ──
    //    Aperiodic sums of sub-0.01Hz sines (plasma-journal rule: <1Hz reads as brooding, not jittery)
    //    on morphPhase (a MONOTONIC accumulator from wavelet band 3 — rate-not-angle, so tempo changes
    //    never jump the shape) + bTime. Drifts the fold angles, cell radius and cross size over ~5–10 min,
    //    so the lattice passes through stars / ribbons / tight hex / open cross without ever repeating.
    // (iter 13, user: "I need a time component" — the iter-11 clocks were 5–10 min, too slow to SEE.
    //  Now ~2 min shape cycles + a continuous fold rotation below, so the lattice visibly reconfigures.)
    // ── iter 142 EVOLVE, DON'T BREATHE (written at shutdown, NOT yet seen live): geometry takes NO
    //    audio and NO oscillators. Each detected DROP (sectionMode) eases the structure to a NEW
    //    random plateau over ~4 s (sectionMix) and STAYS — a one-way transformation. Between drops
    //    the lattice is rock-still except the perpetual zoom + monotonic spin. Audio -> shading only.
    #define SECH(n, k) (fract(sin(((n) + 1.0) * (k)) * 43758.5453) - 0.5)
    float secPrev = max(sectionMode - 1.0, 0.0);
    float evoA = mix(SECH(secPrev, 127.1), SECH(sectionMode, 127.1), sectionMix);
    float evoB = mix(SECH(secPrev, 311.7), SECH(sectionMode, 311.7), sectionMix);
    float evoC = mix(SECH(secPrev, 74.7),  SECH(sectionMode, 74.7),  sectionMix);
    float evoD = mix(SECH(secPrev, 269.5), SECH(sectionMode, 269.5), sectionMix);
    // vj7-b1 SYMMETRY PLATEAU: each DROP eases the master fold angle to a NEW hashed value — the
    // whole plane re-tiles (hex -> star -> ribbon symmetries) as a one-way ~4s move, then HOLDS.
    // This is the "shapes dancing" channel: the dance happens at section boundaries, not per-beat.
    // SECT gates section 0 to exactly the tuned PI/8, so boot looks like 5.frag until the first drop.
    #define SECT(n) (SECH(n, 53.7) * step(0.5, n))
    float evoT = mix(SECT(secPrev), SECT(sectionMode), sectionMix);
    float shapeA = 0.5 * sin(morphPhase * 0.85) + 0.5 * sin(bTime * 0.28 + 1.7);   // iter 114: user 'need to SEE the fractal parameters changing' — cycles ~2min → ~70s
    float shapeB = 0.5 * cos(morphPhase * 0.62 + 0.6) + 0.5 * cos(bTime * 0.19);
    gSpin  += bTime * max(0.0, 0.10 + EXA(knob_146, 0.34)) + flowPhase * 0.05;   // K146 SPIN RATE: the monotonic fold rotation. Clamped at 0 — a fader can stall the spin but NEVER reverse it (standing directive: geometry always goes forward).   // vj7-b2 SPIN FOLLOWS THE LOW END: base rate 0.18 -> 0.10, and flowPhase (bass-paced MONOTONIC accumulator, freezes at silence) carries the rest — the lattice turns faster when the low end works, stalls in breakdowns, never reverses (iter144 zoom precedent). NOT quietGate'd: gating an accumulated ANGLE would snap it when the gate moves.   /* iter 142: shapeA rock removed — spin purely monotonic */   // iter 118: user 'always going FORWARD, no oscillating back' — monotonic rotation now dominates (0.08→0.18), ping-pong shapeA demoted (0.9→0.35)                     // per-level fold angle drift + CONTINUOUS slow fold rotation (~1.3°/s at the deepest level: the structure is always slowly becoming something else) (theta += gSpin*(0.4+i*0.05))
    gHexR   = 0.60 + evoA * 0.20;   /* iter 142: radius = section plateau; no rock, no audio breath */   /* iter 138: user 'shaking back and forth without progression' — standing breath 0.17 -> 0.05; the VISIBLE radius change now comes from the depth-traveling wave below (monotonic = always forward) */   // iter 114: 0.06 → 0.17 — cell radius sweep must be VISIBLE (slow driver, safe)   // vj2 iter 2: 0.12·(1+wub·0.8) → 0.05 — the spring (settles ~0.4s) chases a 2–4 Hz wobble, so cells PULSED at wub rate = TWITCHY. Geometry follows slow music; the wub now lives in shading only.
    gHexR  += 0.0;   /* iter 142: QUIET BREATH sine removed (oscillator on geometry) */   // QUIET BREATH: when the gate closes on soft music the cells keep a slow ~27s breath instead of freezing; loud = unchanged
    gBorder = 0.10 + (trebLive * 0.025 + bassLive * 0.02 + spectralRoughnessSmooth * 0.03) * quietGate   /* vj2 iter 2: treb .06→.025, bass .04→.02 (hi-hats were flicking line thickness) */ + (knob_138 - 0.5) * 0.10 * step(0.001, knob_137 + knob_138);   // K138 LINE THICKNESS (guest bank pad 4 Y, iter 24)   // GRIT fattens the lines too (roughness is not a phone fader → still listens under TAKE OVER)
    gCross  = 0.20 + evoB * 0.12;   /* iter 142: cross = section plateau; bassPulse off geometry */   /* iter 138: standing sweep 0.11 -> 0.04 (same ratchet fix) */   // iter 114: 0.04 → 0.11      // vj2 iter 2: .05 → .02 (de-twitch)
    // ── GUEST BANK 1 (vjpad knob_131–136, iter 22 auto-wire: the user was riding a dead bank) ──
    //    Pad 1: X=131 FOLD RATIO   Y=132 DEPTH FOCUS      Pad 2: X=133 FOLD TWIST  Y=134 CELL RADIUS
    //    Pad 3: X=135 LIGHT ANGLE  Y=136 RELIEF DEPTH.   All centred at 0.5 = neutral; bank4 gates
    //    the whole thing off when the phone isn't there (unset knobs read 0, sum = 0).
    // ── EXPLORE A/B resolved (all centred so 0.5 == 5.frag) ──────────────────────────────────
    gThetaStep   = PI * (0.125 + evoT * 0.16 + EXA(knob_141, 0.20));   // K141 TWIST STEP (PI*0.025 .. PI*0.225)   // vj7-b1 SYMMETRY PLATEAU: + section-hashed offset (±PI*0.08), eased by sectionMix — shared with the zoom-wrap comp via gThetaStep so the octave seam stays closed while the symmetry walks
    gTwistFall   = 0.05 + EXA(knob_142, 0.16);                    // K142 TWIST FALLOFF (-0.03 .. 0.13)
    gInterleave  = EXA(knob_143, 0.30);                           // K143 INTERLEAVE    (-0.15 .. 0.15)
    gRingGap     = max(0.005, 0.10 + EXA(knob_144, 0.18));        // K144 RING GAP      (0.01 .. 0.19)
    gLevelSkew   = 0.8 + EXA(knob_145, 1.6);                      // K145 LEVEL SKEW    (0 .. 1.6)
    gSwirlArms   = 2.0 + EXB(knob_151, 8.0);                      // K151 SWIRL ARMS    (-2 .. 6)
    gSwirlRadial = 3.0 + EXB(knob_152, 10.0);                     // K152 SWIRL RADIAL  (-2 .. 8)
    gDepthTint   = EXB(knob_153, 0.9);                            // K153 DEPTH TINT
    gSwirlMix    = max(0.0, 0.45 + EXB(knob_154, 0.9));           // K154 SWIRL MIX     (0 .. 0.9)

    float bank4 = step(0.001, knob_131 + knob_132 + knob_133 + knob_134 + knob_135 + knob_136);
    gCrossBias = (knob_139 - 0.5) * 0.12 * step(0.001, knob_139 + knob_140);   // K139 HEX↔CROSS (pad 5 X, iter 25): <0.5 more cross, >0.5 more hex
    gCrossBias -= clamp(waveletTiltMedian, -1.0, 1.0) * 0.05 * quietGate;
    gCrossBias += (spectralEntropyMedian - 0.80) * 0.16 * quietGate;   // iter150 CHAOS -> SHAPE: a noisy, unpredictable spectrum pushes cells toward the taut CROSS; an ordered, tonal one lets the HEXAGON win. Median => a section-scale morph, never a per-beat flick.   // vj2 iter 1: SPECTRAL TILT → cell SHAPE. Bass-heavy balance (+tilt) → the taut CROSS dominates; bright/hissy (−tilt) → HEXAGONS. Median = slow, structural (~seconds), never a per-frame flick.
    gSpin  += (knob_133 - 0.5) * 2.0 * bank4;                 // K133 FOLD TWIST
    gHexR  += (knob_134 - 0.5) * 0.15 * bank4;                // K134 CELL RADIUS
    gScale  = 2.0 + evoC * 0.14 + (knob_131 - 0.5) * 0.5 * bank4;   /* iter 142: FOLD RATIO = section plateau. The spectral-width term moved every mirror seam at every level — the 'overlapping kaleidoscope sections breathing' the user called out. */   // vj2 iter 10: SPECTRAL WIDTH → FOLD RATIO. Wide/dense spectrum (spread ~0.85) opens the self-similarity ratio (+0.12), a narrow one tightens it (−0.15). Median → slow structural permutation, never a per-frame flick. // K131 FOLD RATIO
    // ── vj7-b7 COMPLEXITY RATCHET (user's original brief: "maybe there's a way to algorithmically
    //    add complexity?"). evoPhase is the energy-weighted MONOTONIC set clock (silence-frozen),
    //    so complexity only ever accrues, never oscillates and never follows a beat — the legal
    //    geometry channel. Saturating exponential: ~30% in a few minutes, ~85% deep into a set,
    //    never past 1. Two structural payoffs, both bounded:
    float gComplex = 1.0 - exp(-max(0.0, evoPhase) * 0.33);
    gLevelOpen  = gComplex * 0.45;          // more recursion generations drawn at once (see fractal())
    gInterleave += gComplex * 0.05;         // and the two interleaved sub-lattices separate further
    gShapePhase = morphPhase * 0.85 + bTime * 0.30;   // iter 138 RATCHET: strictly increasing -> the radius wave always travels coarse->fine, reads as continuous inward progression, never a rebound
    gDepthFocus = clamp(0.35 + evoD * 0.35 + (knob_132 - 0.5) * bank4
                      + (trebLive - 0.50) * 0.08 * quietGate          /* iter148: 0.16->0.08 and centred at 0.50 (trebLive actually runs ~0.55, so the old 0.35 centre pushed FINE almost permanently = filigree mush) */
                      - (1.0 - clamp(flybyZoom, 0.0, 1.0)) * 0.08,    /* iter149b: was 0.30 and that was MY BAD GUESS. I assumed the wide leg aliased into mush, but the measurement said the opposite - wide was the SHARPEST state (edge energy 0.09 wide vs 0.02 at close cruise), because the soft 0.12 line ramp goes sub-pixel out there. A 0.30 coarse bias stripped the level window down to only the biggest cells, so the wide shot read as a few soft blobs instead of a landscape. Keep a token bias for anti-alias headroom only. */
                      0.0, 1.0);   /* iter 142: level window = section plateau. The centroid SPRING faded whole detail-levels in/out with brightness = sections appearing/vanishing. */   // vj2 iter 12: 0.35/1.0 → 0.30/0.8 — on bright tracks the finest levels filled every cell with speckle (busy wallpaper); bias coarser, brightness pushes fine less hard   // biased COARSE (0.35): bold cells by default, filigree only when bright   // K132 DEPTH FOCUS   // BRIGHTNESS → fine detail, dark → coarse (level window)                            // fractal self-similarity ratio: slow permutation of the WHOLE structure (user iter 12: fractal permutations, not warps)
    gFill   = max(0.0, max(0.0, 0.06 + EXA(knob_149, 0.14)) + trebLive * 0.02 * quietGate + (spectralSpreadMedian - 0.26) * 0.05 * quietGate
            - CHURN * 0.05);   // vj8-b10d OUTER CLAMP — the learned FILL term was applied OUTSIDE the existing max(), so with the user's K149 fader at 0 (base gFill already 0) churn drove gFill NEGATIVE, unlighting cell interiors entirely: lumMin 0.051, two too-dark alerts. A subtractive audio term must never be able to push a threshold past the floor its manual control already sits on.   // vj8-b10 LEARNED, PRIMARY: timbral churn HOLLOWS the cells — the exact sign the hand traced (K149 vs flux, r=-0.45). gFill is a coverage/shading threshold, not a fold param: it changes what a cell LOOKS like without moving where any cell IS, so this is legal audio-on-shading, not audio-on-geometry.   // iter150 HARMONIC WIDTH -> FILL: a wide, dense spectrum fills the cells solid; a narrow one hollows them to outlines.

    // ── iter144 BREATHE IN PLACE ── (user: "oscillation _can_ be ok - just not large moving pieces
    //    that disrupt the sense of space. The fractal structures can breathe and morph")
    //    The SPATIAL FRAME is the thing that must hold still: the fold ratio (gScale) and every ANGLE
    //    term stay frozen, because those move the mirror SEAMS at every level and the error compounds
    //    as scale^i — that is what destroyed the sense of space (iters 138-143). Everything that lives
    //    INSIDE a cell is free to breathe, because it changes what a cell LOOKS like without moving
    //    where any cell IS. All drivers are spring-smoothed and quietGate'd: no raw per-frame value
    //    ever touches structure (that path is the shiver).
    gHexR  += (midsLive - 0.35) * 0.18 * quietGate * (0.6 + wubDepth * 0.7);   // CELLS BREATHE with the mids/wobble — ring radius inside each cell; seams fixed
    gCross += (bassLive - 0.42) * 0.11 * quietGate;                            // BASS pulls the cross taut / lets it slacken
    gBorder += (spectralCrestSmooth - 0.2) * 0.035 * quietGate;
    gBorder += CHURN * 0.035;   // vj8-b10d LEARNED, PRIMARY (moved here from FILL): churn FATTENS the lattice lines. FILL turned out to be a dead channel in this preset — the user's own K149 sits at 0, so a subtractive term there has nothing left to remove and only darkens. Line weight always has headroom, is pure shading, and reads from across a room: on a churny passage the whole lattice thickens and glows, on a clean one it goes fine and precise.                // spiky vs smooth timbre → line weight breathes           // vj2 iter 2: .035 → .02 (de-twitch)

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
    world += vec2(-0.0590, -0.0105);   // iter 137 CENTER TRIM: user 'never looking at the center, like I'm off to the side' — measured nearest strong symmetry center at (390,340)px and shifted it to screen center. Re-measure + retune this constant if the slow rotation walks the axis off again.
    gHexR += 0.07 * sin(world.x * 0.8 + world.y * 0.45);
    // ── vj7-b4 SPATIAL PERMUTATIONS (user: "when navigating the lattice space, it shows
    //    permutations of the lattice the further you go, in a continuous way, as a result of the
    //    x/y coordinate"). The FOLD PARAMETERS themselves are now smooth functions of WORLD
    //    POSITION: pan far enough and the lattice re-tiles through new symmetry configurations,
    //    seamlessly. This does not touch the geometry-evolves directive — the drive is the user's
    //    own navigation, not audio and not time; stand still and the structure stands still.
    //    Incommensurate low frequencies (the regionHue recipe) → quasi-non-repeating over any
    //    roam; seed3 phases it per device. Amplitudes sized so worst-case stacking with the
    //    section plateaus stays in each param's sane range.
    float pp = seed3 * TAU;
    gThetaStep  += PI * (0.040 * sin(world.x * 0.23 + pp) + 0.030 * cos(world.y * 0.17 + pp * 1.7)
                       + 0.020 * sin((world.x + world.y) * 0.117 + pp * 0.6));
    gInterleave += 0.060 * sin(world.x * 0.31 + pp * 2.1) + 0.050 * cos(world.y * 0.129 + pp);
    gTwistFall  += 0.030 * cos(world.x * 0.147 + pp * 1.3) + 0.025 * sin(world.y * 0.271 + pp * 0.4);
    gScale      += 0.090 * sin((world.x - world.y) * 0.093 + pp * 2.7);

    // NO whole-field rotation and NO orbital drift — the geography stays put unless YOU move it.
    float navz = navZoom < 0.01 ? 1.0 : navZoom;
    uv *= 0.07 / navz;                                        // (kick zoom-punch REMOVED iter 26 — a whole-screen scale flick is what read as SHIVER)
    // iter 141 TRUE RATCHET: perpetual SELF-SIMILAR ZOOM. The depth-wave (iter 138) failed — depth
    // isn't a visible axis, each scale just pulsed in place. Here magnification ramps one fold-octave
    // (~60 s) and wraps where the lattice maps onto itself (fold ratio gScale), with a rotation
    // compensation for the per-level twist step, so the seam ~vanishes and the motion is ALWAYS
    // inward toward the centered symmetry point. Zoom is applied before `uv += world`, so the world
    // point at screen center never moves and phone pan stays screen-consistent.
    // iter144: zoom RATE is audio-rated via flowPhase, a MONOTONIC accumulator (rate-not-angle, iris
    // §1) — busy/loud music rushes the lattice inward, a breakdown almost stalls it. Because the
    // phase only ever increases, speeding it up can never make the zoom run backward.
    float zoomP = fract((bTime - min(evoPhase * 25.0, bTime * 0.6)) * max(0.0, 0.016 + EXA(knob_147, 0.030)) + flowPhase * 0.0045 * quietGate);   /* vj8-b9 ONE-WAY CLAMP (measured 22:14): evoRate had risen 0.0070 -> 0.0093/s as the room got louder; the raw evoPhase*25 term was eating 0.233 of bTime's 0.333/s (zoom down to 30% speed) and REVERSES above evoRate 0.0133 — 70% of the way to running the dive backward, which directive #1 of the geometry channel forbids. min(evoPhase*25, bTime*0.6) caps the subtraction at 60% of elapsed time, so net time always advances at >=0.133/s NO MATTER how loud the room gets. The learned mapping is untouched below the cap; only the failure mode is gone. */   /* vj7-b6 SESSION CALIBRATION: 12 -> 25. Measured evoRate 0.007/s on tonight's quiet mic — at 12 the slowdown was a near-constant 25%, i.e. invisible (user: "I don't see the shader reacting"). 25 gives ~53% swing across loud/quiet transitions HERE; it reverses the zoom if evoRate exceeds 0.0133 (1.9x tonight), so AT REAL VOLUME DROP THIS BACK toward 10 or make the controller emit a normalized sustained-energy rate. */   // K147 ZOOM RATE: how fast the perpetual self-similar zoom eats one octave (~60 s at centre). max() keeps it one-way.   // vj7-b5 LEARNED: SUSTAINED LOUDNESS SLOWS THE ZOOM (confirmed gesture 17:41 — K147 tracked energyLong r=-0.75 t=4.96 n_eff=21, ahead of the accumulator-artifact tie at -0.71). Implemented rate-not-angle: evoPhase is the energy-weighted MONOTONIC set clock (silence-frozen), so subtracting it inside the product slows the zoom ~20% at nominal music, ~40-60% when sustained-hot, continuously, and can never run the zoom backward (12*evoRate stays well under bTime's 1/3).
    float thetaStep = gThetaStep;   /* K141 shares this: the wrap compensation must use the SAME per-level step as fractal() or the octave seam snaps instead of vanishing. */   /* iter 141b: gSpin*0.05 term was an accumulated (huge) angle -> frame spun fast + symmetry tilted. Compensate only the FIXED per-level step; the residual seam mismatch hides in the ongoing morph. */
    uv *= rot2(zoomP * thetaStep);
    uv /= pow(clamp(2.0 + EXA(knob_148, 2.0), 1.2, 4.0), zoomP);   /* K148 ZOOM OCTAVE: what magnification counts as one wrap. The seam only disappears when this MATCHES the fold ratio gScale (K131) — mismatching them on purpose is a legitimate look, it just visibly re-snaps each cycle. */   /* iter 142: FIXED base — zoom velocity must not follow gScale */
    uv += world;                                              // finger PAN — screen-consistent now
    // gentle terrain warp for texture; grows PERMANENTLY on big drops (warpGrow). A fixed function
    // of world position, so it varies by area but never reverses the pan direction.
    uv += max(0.0, 0.03 + warpGrow * 0.04 + EXA(knob_150, 0.10)) * vec2(sin(uv.x * 3.0 + seed4 * TAU), cos(uv.y * 3.0 + seed4 * TAU));   // K150 TERRAIN WARP: the fixed positional wobble. 0 = a perfectly rigid lattice; high = the whole plane sags between landmarks.

    vec4 fr = fractal(uv);
    float lum = fr.x, field = fr.y, wave = fr.z, alpha = fr.w;

    // ── BEAUTIFUL COLOUR ── one smooth Oklch journey (iris/1 PITCH→COLOUR family): the MELODY
    //    carries the palette through the song and BRIGHTNESS (centroid) tints it, so the whole
    //    image flows in colour with the music. Smoothed contours only — no jitter. quietGate so
    //    a silent room can't flash the hue. Plus per-area / per-device / permanent-drop offsets.
    float s = field
            + regionHue(world) * max(0.0, 1.0 + EXB(knob_155, 2.0))   // K155 REGION HUE: how strongly WORLD POSITION re-paints the palette. 0 = one colour everywhere; high = every screen you pan to is a different colourway.
            + bTime * 0.002                                   // vj2 iter 5: was 0.012 = a full hue turn every ~4 min (0.24 turns/min — 8× the user's 'muted, slow' tolerance and the biggest single palette mover). Now ~1 turn / 25 min.
            + (melodyFlow * 0.05 + pitchClassMean * 0.10) * quietGate   // vj2 iter 4: MELODY → palette, but SLOW. melodyFlow slews 0.03/frame (a melodic leap re-tints the whole field 0.075 in ~0.3 s = the palette 'flash' the meter caught: hue 0.46→0.61 inside one track). pitchClassMean is the ~8 s rolling KEY estimate — it carries 2/3 of the weight now. (was melodyFlow*0.15; 0.32 before iter 17)
            + waveletCentroidSpring * 0.07 * quietGate        // BRIGHTNESS → hue tint (0.14 → 0.07)
            + (bassNoteFlow - 0.5) * 0.05 * quietGate         // BASSLINE NOTE → hue tilt (was 0.16: whole-field re-tints on note changes read as colour FLASHING — user iter 9) (centred: a mid bass note is neutral; not a phone fader, so it keeps listening under TAKE OVER)
            + (sectionMode - (1.0 - sectionMix)) * 0.03       // each DROP glides the palette 0.03 further (was 0.07) over its ~4s crossfade (mix eases the step; no snap)
            + paletteShift                                    // permanent live mutation
            + seed;                                           // per-device base palette identity
    vec3 col = lush(s, lum);                                  // (brightness handled by the bloom below)
    col += lush(s + 0.12 + 0.05 * sin(evoPhase * 0.7), 0.9) * wave * max(0.0, 0.6 + EXB(knob_158, 1.1));   // K158 ACCENT: strength of the travelling pulse accent.   // pulse accent (hue-shifted, brighter); the SET CLOCK swings the accent 0.08..0.28 off base over minutes

    // BRIGHT, saturated background FIELD — no black voids; the whole screen emits light so it
    // pops off the phone at night and reads from across the room.
    vec3 bg = lush(s + 0.5, 0.05 + 0.055 * step(0.001, 1.0 - clamp(gFill * 30.0, 0.0, 1.0))) * max(0.0, LV_BGBASE + EXB(knob_159, 0.55) + (gComplex * 0.14 + CHURN * 0.12) * (LV_BGBASE / 0.30));   /* vj8-b10e GAP LIGHT: bg lightness lifts 0.05 -> 0.105 only when gFill is at/near ZERO — i.e. exactly when the cells are hollow and the gaps are the majority of the frame (the user's own K149=0 preset, which drove three too-dark alerts at lumMin 0.049-0.058). When FILL is normal the floor stays at the tuned 0.05, so iter-27's 'there must be real dark somewhere' finding is preserved. */   /* vj8-b10c: hollowing the cells (the learned FILL mapping) removes lit AREA, and at full churn that drove lumMin to 0.059 — under the floor, alert inside a minute. Same counter-ratchet as the complexity term: the field floor rises with the very signal that empties the cells. */   // vj8-b8 RATCHET FLOOR COMPENSATION: b7's complexity ratchet draws finer generations as the set runs, and finer means THINNER LINES WITH MORE UNLIT GAP — measured dark fraction 0.37 -> 0.47 and lumMin down to 0.078 (floor is 0.08) over five minutes. The field floor now rises on the SAME monotonic set clock that causes it, so the gaps stay lit as the detail multiplies. Not the global multiplier and not audio-driven (directive #1 intact): this is the colour channel following the slowest clock there is.   // K159 BG FLOOR: how lit the empty field between cells is. Low = the lattice floats in the dark; high = no voids at all.                    // iter 27: DARK floor — the screenshot had no dark anywhere, so nothing could read                    // DARK muted field (3.frag) — the lattice + the sun are what you look at
    col = mix(bg, col, clamp(alpha, 0.0, 1.0));

    // (PATH ribbon + DESTINATION landmark towers REMOVED — vj7-b4, user: "remove the 'path' with
    //  the towers". Navigation reward is now the SPATIAL PERMUTATION field instead: everywhere you
    //  pan IS the destination.)

    // ── MUSICAL BLOOM (iris/1: smooth for global, raw only for the transient) ── a swell/drop
    //    lifts the WHOLE image brightness smoothly (energy + articulation), the kick adds a snappy
    //    thump on top. So it breathes with the build and punches on the hit, never strobes.
    float dropGlow = clamp(glowLive * 0.6 + spectralCrestSmooth * 0.4, 0.0, 1.0) * quietGate;
    // iter148: THE REMAINING PUMP. iter146 fixed the per-level multiplier but this whole-image one
    //    survived: bass + dropGlow + kick drove it 1.0 -> 1.24, and directive #1 is that bass and kick
    //    NEVER touch the global multiplier. Now a constant with one small CENTRED articulation term,
    //    so the frame's overall brightness no longer follows the music at all — the music is visible
    //    in RELIEF and COLOUR instead.
    col *= clamp(1.06 + EXB(knob_160, 0.8), 0.25, 1.9) + (dropGlow - 0.5) * 0.05;   // K160 GAIN: global exposure, clamped so a fader slammed up can't white the frame out.   // iter 110: user 'global brightness flickering' — kick punch moved OFF global mult into local relief only   // vj2 iter 7: kick .10 → .20 (SHADING may punch; geometry may not) // gentle so loud stays saturated, not pastel

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
        col += rimCol * rim * (0.30 + trebLive * 0.45 + spectralRoughnessSmooth * 0.25 + CHURN * 0.80) * quietGate * 0.8;   // vj8-b10 LEARNED, SECONDARY: the same CHURN flares the EDGES. Two jobs: (a) it makes the learned mapping visible from across the room — cells hollow out while their outlines light up, so a churny passage reads as the lattice turning to wireframe; (b) it is the counter-ratchet for the FILL term above, which removes lit area and would otherwise dim the frame on exactly the loudest passages.
        // SHADOW SIDE (iter 16): edges facing AWAY from the light darken → the lattice reads as RELIEF,
        // lit from one side. Depth punches on kicks (gKick, dead-zoned) and leans on the bass spring,
        // so a hit makes the structure emboss harder for a beat. Lighting reactivity, not colour.
        float shade = smoothstep(0.02, 0.25, edge) * pow(0.5 - 0.5 * dot(n, L), 2.0);
        col *= 1.0 - shade * min(0.85, 0.22 + gKick * 0.95 + bassLive * 0.48 + max(0.0, spectralRoughnessZScore) * 0.10 /* vj2-r1 GRIT RELIEF: 0.22 -> 0.10. The iter-134 comment on this very stack records kick+wub crushing lumMin to .063; my 0.22 took it to .059 (too-dark alert 21:26). Same trap, same stack. */)   /* iter 134: clamp relief stack — kick+wub together crushed lumMin to .063 (floor .08) */ * quietGate * mix(1.0, 0.4 + knob_136 * 1.2, bank4);   // K136 RELIEF DEPTH
        // SPECULAR (iter 19): a TIGHT glint on line edges facing the sun exactly — slides along the
        // structure as the sun orbits; treble spring + crest sharpen/brighten it. Palette-lit, not white.
        float spec = smoothstep(0.02, 0.25, edge) * pow(max(dot(n, L), 0.0), 14.0);
        col += lush(s + 0.33, 1.0) * spec * (0.25 + trebLive * 0.6 + spectralCrestSmooth * 0.3 + WUB * 0.55) * quietGate;   // vj8-b11 LEARNED: wub also sharpens the SPECULAR glint, so a wobbly bassline makes the lattice edges glint hard and a clean passage lets them settle. Two channels for one feature = you can see it whether you are looking at the cells or the edges.
        // (sun disc + halo REMOVED iter 21 — user: "that circle needs to go". Lighting stays.)
    }

    // ── HERO BEAD, SHADING LANE ─────────────────────────────────────────────────
    //    Everything below is LIGHT, so it may take all the audio (hierarchy #2). None of
    //    it moves where the silhouette IS -- it only says how the object is lit.
    if (heroSettle > 0.001) {
        float haa  = 1.6 / iResolution.y;
        float hang = flowPhase * 0.8 + bTime * 0.3 + knob_135 * TAU * bank4;   // same sun as the lattice
        vec2  hL   = vec2(cos(hang), sin(hang));
        float ndl  = 0.5 + 0.5 * dot(heroG, hL);                 // 1 = this edge faces the sun

        // 1. INTERIOR -- THE LATTICE CONTINUES INSIDE THE SILHOUETTE. Rebuilt exactly the way
        //    the exterior is (lattice over ground, weighted by COVERAGE), only hue-rotated and on
        //    a lit ground. Mixing toward a flat colour instead -- the first thing I tried -- fills
        //    the cell GAPS as well as the lines and the bead goes to a dead grey wash: the object
        //    stops being made of lattice. Respecting `alpha` is what keeps it alive.
        vec3 inLat = lush(s + HERO_HUE,        clamp(lum * (1.0 + HERO_INL), 0.0, 1.4));
        vec3 inBg  = lush(s + HERO_HUE + 0.52, 0.09 + 0.07 * ndl);
        vec3 inCol = mix(inBg, inLat, clamp(alpha, 0.0, 1.0));
        // hero-lab 2 (2026-09-04): the interior read as a mint WASH (high L, low C). Pull the lit
        // level down (HERO_INL) and push chroma up so the aperture is coloured lattice, not haze.
        float inG = dot(inCol, vec3(0.299, 0.587, 0.114));
        inCol = clamp(mix(vec3(inG), inCol, HERO_SAT), 0.0, 1.0);
        col = mix(col, inCol, heroIn * HERO_LIFT);

        // 2. DOME -- interior relief lit by that sun. LOCAL multiplier inside the silhouette
        //    only (the iter146 "relief, not gain" rule); the frame mean does not follow it.
        float dome = smoothstep(0.0, -0.55 * heroR, heroD);      // 0 at the edge -> 1 deep inside
        col *= 1.0 + heroIn * dome * (0.05 + 0.24 * ndl)
                   * (0.6 + gKick * 0.5 + bassLive * 0.3 * quietGate + waveletBand1Spring * 0.5 * quietGate);   // hero-lab 3: sub-bass band lifts the dome

        // 3. SUBJECT / GROUND -- the field is dimmed and desaturated outside the silhouette so
        //    the bead is what the eye lands on from across a dark room. Measured: without this the
        //    motif is not nameable at the 15%-scale dark-field proxy; with it, it is.
        float outM = (1.0 - heroIn) * heroSettle;
        float grey = dot(col, vec3(0.299, 0.587, 0.114));
        vec3  ext  = mix(vec3(grey), col, HERO_DESAT) * HERO_QUIET;
        // hero-lab 1 (2026-09-04): GROUND CURVE. Dimmed + desaturated, the field still sat at
        // mid-lightness as grey static (moire of the fine fold levels). A contrast curve pivoting
        // at the ground's own mean sinks that static into black and lifts the strong marks.
        float eg   = dot(ext, vec3(0.299, 0.587, 0.114));
        ext *= pow(max(eg, 1e-4) / 0.30, HERO_TOE - 1.0);
        col = mix(col, ext, outM);

        // 4. CONTACT SHADOW -- just outside, so the bead sits IN FRONT of the field.
        float drop = exp(-max(heroD, 0.0) * 26.0) * (1.0 - heroIn) * heroSettle;
        col *= 1.0 - drop * (0.30 + 0.22 * (1.0 - ndl));

        // 5. HALO -- a wide soft complement glow. This is what survives a 15% downscale.
        float halo = exp(-max(heroD, 0.0) * 7.5) * (1.0 - heroIn) * heroSettle;
        col += lush(s + HERO_HUE + 0.5, 0.85) * halo
             * (0.10 + trebLive * 0.16 + CHURN * 0.22) * HERO_RIM;

        // 6. OUTLINE -- THE SIGNATURE. One crisp palette-lit stroke on |hd| = 0. This is the
        //    thing a stranger reads at 20 m in the dark; everything else is why it looks alive.
        float ew   = HERO_EDGE + haa;
        float line = smoothstep(ew, ew * 0.30, abs(heroD)) * heroSettle;
        // hero-lab 3 (2026-09-04): lush(..., 1.0) is the lightness ceiling = a near-WHITE stroke.
        // A saturated palette hue just under white keeps "palette-lit" true and off the no-white
        // rule; wavelet brightness (centroid spring) tints it, the iris CORE_HUE idea, gated.
        // hero-lab 4 (2026-09-04): the outline follows the KEY. pitchClassMedian is a 500-frame
        // median (moves over seconds, never per frame): the slowest colour driver in the file.
        float lineH = fract(s + HERO_HUE + 0.33 + (waveletCentroidSpring - 0.45) * 0.20 * quietGate
                            + (pitchClassMedian - 0.5) * HERO_KEYHUE) * TAU;
        vec3  lineC = clamp(oklch2rgb(vec3(0.80, 0.15, lineH)), 0.0, 1.0);
        col += lineC * line
             * (0.85 + trebLive * 0.55 + CHURN * 0.85 + gKick * 0.45 + WUB * 0.35) * HERO_RIM;

        // 7. RIM -- the sun-facing arc flares brighter, so the silhouette TURNS in the light
        //    instead of being a uniformly bright sticker.
        float rimA = smoothstep(ew * 3.5, 0.0, abs(heroD)) * pow(ndl, 2.2) * heroSettle;
        // hero-lab 3: rim colour under white too (lush(...,1.0) hit the ceiling at high wavelet
        // levels), and the wavelet mid/high-mid bands light the sun-facing arc, capped so a loud
        // passage brightens the rim without ever bleaching it.
        vec3  rimC = clamp(oklch2rgb(vec3(0.76, 0.14, lineH - 1.05)), 0.0, 1.0);
        col += rimC * rimA
             * min(0.30 + spectralCrestSmooth * 0.4 + WUB * 0.5
                   + waveletBand3Spring * 0.45 + waveletBand4Spring * 0.35, 1.15) * HERO_RIM;
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
    col = pow(clamp(col, 0.0, 1.0), vec3(LV_GAMMA));   // LV_GAMMA (H10)             // vj2 iter 3: 0.92 → 1.18 — meter said dark fraction 1.4% / lum 0.30 / sat 0.81: no floor. Gamma > 1 pulls the mids down and leaves the lit lattice edges bright, so structure gets CONTRAST without touching hue. (iter 27: 0.80/1.15 gain was flattening to pink)
    col *= 1.00;

    // gentle trail (low decay so the glow carries between frames)
    vec4 prev = getLastFrameColor(fragCoord / iResolution.xy);
    col = mix(prev.rgb * 0.90, col, 0.82);

    // minimal vignette — barely darken the edges, it has to read from a distance
    col = mix(col, vec3(0.0), dot(sp, sp) * 0.38);           // iter 27: real vignette — gives the eye a centre (the "focus" the user asked for, from composition not an overlay)

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
