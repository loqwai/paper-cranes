// @fullscreen: true
// @mobile: true
// @tags: fractal, hex, lattice, touch, paths, network, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/wip/lattice-interactive/1&wavelet=true&controller=lattice-nav&fullscreen=true&knob_1=0.21&name=Lattice%20Paths
//   * knob_1 = PAN SPEED (live: preset / URL / MIDI / jam drawer). Read by the lattice-nav controller.
// LATTICE-INTERACTIVE (1.frag) — built off chromadepth-lattice/5 (the MOVING version: idle kaleido
// churn + gentle orbital drift kept). First step toward giving an explorer an OPTIONAL goal: render a
// NETWORK OF PATHS — an organic branching web of glowing ribbons living in WORLD space, so it's a
// stable thing you stumble upon and can pan along. Voronoi seams are the paths; junctions where cells
// meet are natural waypoints. The network fades in and out across large regions (open lattice between
// networks), so you DISCOVER it in stretches rather than seeing a uniform grid everywhere. Later
// iterations can layer a controller to pick a destination on the network and lead you there.
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
    float L = clamp(0.50 + 0.36 * clamp(lit, 0.0, 1.0), 0.12, 0.88);
    float C = (0.125 + seed2 * 0.05) + 0.05 * sin(s * TAU * 0.5 + 1.3);  // high chroma = NEON, seed2 = device sat
    return oklch2rgb(vec3(L, C, h));
}

// UNIQUE-PER-AREA hue offset: incommensurate low frequencies → smooth + quasi-non-repeating.
float regionHue(vec2 w){
    float ph = seed3 * TAU;
    return 0.20 * sin(w.x * 0.23 + ph) + 0.20 * cos(w.y * 0.19 + ph * 1.3)
         + 0.13 * sin((w.x - w.y) * 0.11 + ph) + 0.09 * cos((w.x + w.y) * 0.071);
}

// A smooth, animated field whose LEVEL SETS are long, freely-CURVING, direction-changing paths — a
// spline-like river, not a function graph. Low frequencies → big sweeping curves; a domain warp makes
// them genuinely turn; it drifts slowly in time so the curve gently undulates (the wiggle).
float pathField(vec2 w, float bTime){
    vec2 q = w + 0.55 * vec2(sin(w.y * 1.6 + seed3 * TAU + bTime * 0.12),
                             cos(w.x * 1.4 + seed4 * TAU - bTime * 0.12));     // warp → it changes direction
    return sin(q.x * 2.3 + seed * TAU)
         + sin(q.y * 2.0 - seed2 * TAU)
         + 0.7 * sin((q.x - q.y) * 1.3 + bTime * 0.1);
}

// Ethereal flowing TENDRIL (à la No Rest for the Wicked waypoint wisps): braided contour lines of
// pathField — a long winding spline that WIGGLES (the field drifts) with light FLOWING along it.
// Subtle and ALIVE — drawn by motion, not brightness. RARE: gated to large world stretches so you
// STUMBLE upon a length of one, mostly open lattice between.
float tendril(vec2 w, float bTime){
    float present = smoothstep(0.50, 0.86,
        0.5 + 0.5 * sin(w.x * 0.55 + seed3 * TAU) * cos(w.y * 0.5 + seed2 * TAU));
    if (present <= 0.0) return 0.0;
    float F  = pathField(w, bTime);
    float aa = fwidth(F) + 1e-4;                                               // → ~constant screen-width line
    float al = (w.x + w.y) * 7.0 + 3.0 * sin((w.x - w.y) * 1.3);               // along-path proxy (flow pulses)
    float glow = 0.0;
    for (int k = 0; k < 3; k++){
        float fk = float(k) - 1.0;                                            // -1, 0, +1 → braided strands
        float off = (fk * 2.4 + 1.6 * sin(al * 0.5 + bTime * 1.4 + fk * 2.1)) * aa; // braid + fine wiggle
        float line = 1.0 - smoothstep(0.0, aa * 1.5, abs(F - off));
        float flow = 0.55 + 0.45 * sin(al - bTime * 4.5 + fk * 1.5);          // energy flowing along it
        glow += line * (0.30 + 0.70 * flow);
    }
    return glow * present;
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

// Recursive hex mirror-fold lattice. Returns vec4(lum, field, wave, alpha).
vec4 fractal(vec2 p){
    float scale = 1.0, aliasBase = 1.0 / iResolution.y;
    float alpha = 0.0, lumAcc = 0.0, fieldAcc = 0.0, waveAcc = 0.0;

    for (int i = 0; i < LEVELS; i++){
        float s = 2.0;
        p = 1.0 - abs(s * fract(p - 0.5) - s * 0.5);          // mirror-repeat fold
        float theta = float(i) * PI * 0.125
                    + gSpin * (0.4 + float(i) * 0.05)
                    + (evoWarp - 0.5) * float(i) * 0.10
                    + (seed3 - 0.5) * float(i) * 0.8;
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
        float swirl = 0.5 + 0.5 * sin(atan(p.y, p.x) * 2.0 + length(p) * 3.0 + float(i) + seed4 * TAU);
        float field = ld * (0.55 + evoPlasma * 0.2) + swirl * 0.45;

        float env = sin(gPulse * PI);
        float wave = smoothstep(0.30, 0.0, abs(ld - (1.0 - gPulse))) * env;
        float band = bandForDepth(ld);
        float lit = (smoothstep(gFill + alias, gFill, m) * 0.5 + 0.18)
                  * (0.7 + energySpring * 0.4 + band * 0.7 + waveletBassSpring * quietGate * 0.6);
        lit += wave * (0.4 + gPop * 0.7 + gKick * 1.2 + spectralCrestSmooth * 0.35);

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

    // ── per-frame state ── base (idle) animation at 1/3 speed; audio phases keep full speed.
    float bTime = iTime / 3.0;
    gSpin  = bTime * 0.04 + morphPhase * 0.4 + melodyFlow * 0.5 * quietGate;   // MOVING (kept from 5)
    gPop   = clamp(energySpring * 0.5 + spectralCrestSmooth * 0.45, 0.0, 1.0) * quietGate;
    gKick  = clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.5 + clamp(wavelet_bassHit, 0.0, 1.0) * 0.3;
    gPulse = fract(flowPhase * 0.6 + bTime * 0.18);
    float bassPulse = waveletBassSpring * quietGate;
    gHexR   = 0.60 + waveletBand2Spring * 0.12 * quietGate;
    gBorder = 0.10 + waveletBand5Spring * 0.06 * quietGate;
    gCross  = 0.20 - bassPulse * 0.05;
    gFill   = 0.06 + waveletBand5Spring * 0.035 * quietGate;

    vec2 world = vec2(navX, navY);
    gHexR += 0.07 * sin(world.x * 0.8 + world.y * 0.45);    // per-area cell size (not rotation)

    // gentle orbital drift kept from 5 (this is the "things were moving" the user liked)
    uv += 0.02 * vec2(sin(bTime * 0.11 + flowPhase * 0.3), cos(bTime * 0.09 + flowPhase * 0.3));
    float navz = navZoom < 0.01 ? 1.0 : navZoom;
    uv *= 0.07 / navz;
    uv += world;                                            // finger PAN — screen-consistent
    vec2 wpos = uv;                                         // clean world position (pre-warp)
    uv += (0.03 + warpGrow * 0.04) * vec2(sin(uv.x * 3.0 + seed4 * TAU), cos(uv.y * 3.0 + seed4 * TAU));

    vec4 fr = fractal(uv);
    float lum = fr.x, field = fr.y, wave = fr.z, alpha = fr.w;

    // ── BEAUTIFUL COLOUR ── one smooth Oklch journey carried by the melody, tinted by brightness.
    float s = field
            + regionHue(world)
            + bTime * 0.012
            + melodyFlow * 0.32 * quietGate
            + waveletCentroidSpring * 0.14 * quietGate
            + paletteShift
            + seed;
    vec3 col = lush(s, lum);
    col += lush(s + 0.18, 1.0) * wave * 0.7;

    vec3 bg = lush(s + 0.4, 0.45) * 0.92;                   // bright background field (no black voids)
    col = mix(bg, col, clamp(alpha, 0.0, 1.0));

    // ── A TENDRIL OR TWO ── a wisp you stumble upon: a long, freely-curving, WIGGLING glow-strand in
    //    world space (à la No Rest for the Wicked waypoint tendrils) — a spline-like river of light,
    //    not a straight road. Subtle and alive — caught by MOTION, not brightness. RARE: mostly open
    //    lattice, occasionally a length of tendril sweeps through.
    float tend = tendril(wpos, bTime);
    vec3 tendCol = mix(lush(s + 0.5, 0.85), vec3(1.0), 0.25);   // ethereal, faintly whitened glow
    col += tendCol * tend * 0.22;                               // additive shimmer — subtle, not a road

    // ── MUSICAL BLOOM ── a swell/drop lifts the whole image smoothly; the kick adds a snappy thump.
    float dropGlow = clamp(energySpring * 0.6 + spectralCrestSmooth * 0.4, 0.0, 1.0) * quietGate;
    col *= 1.0 + bassPulse * 0.12 + dropGlow * 0.13 + gKick * 0.10;

    // ── IRIDESCENT SPARKLE ── sparse dot glints drifting in patches, gated by treble + grit.
    vec2 scr = fragCoord / iResolution.xy;
    float g1 = 0.5 + 0.5 * sin(scr.x * 190.0 + bTime * 5.0);
    float g2 = 0.5 + 0.5 * sin(scr.y * 163.0 - bTime * 4.0);
    float sparkPatch = 0.5 + 0.5 * sin(scr.x * 6.0 + scr.y * 4.3 - bTime * 2.0);
    float spark = pow(g1 * g2, 16.0) * sparkPatch;
    col += vec3(1.0, 0.97, 0.92) * spark * clamp(alpha, 0.0, 1.0)
         * (waveletBand5Spring * 0.25 + spectralCrestSmooth * 0.22 + spectralRoughnessSmooth * 0.12) * quietGate;

    // GLOW LIFT — gamma up + gain so mid-tones emit; high chroma keeps it NEON.
    col = pow(clamp(col, 0.0, 1.0), vec3(0.80));
    col *= 1.15;

    vec4 prev = getLastFrameColor(fragCoord / iResolution.xy);
    col = mix(prev.rgb * 0.90, col, 0.82);

    col = mix(col, vec3(0.0), dot(sp, sp) * 0.12);          // minimal vignette

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
