// @fullscreen: true
// @mobile: true
// @tags: fractal, hex, lattice, touch, paths, controls, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/wip/lattice-interactive/2&wavelet=true&controller=lattice-nav&controller=lattice-controls&fullscreen=true&knob_1=0.21&name=Lattice%20Controls
//   * knob_1 = PAN SPEED (lattice-nav). knob_2..5 = the four control DIALS (set by lattice-controls):
//     knob_2 PALETTE · knob_3 STRUCTURE · knob_4 MOTION · knob_5 AUDIO REACTIVITY.
// LATTICE-INTERACTIVE (2.frag) — the PAYOFF. Built off 1.frag (lattice 5 + wisps). Four glowing
// TENDRILS now grow from HOME (world 0,0) out to CONTROL NODES at their far ends. Follow a wisp to its
// terminus and you find an aesthetic DIAL: circle your finger around it to turn it, driving a knob
// that OBVIOUSLY changes the world or its audio reactivity. The tendrils are finite, winding,
// wiggling, with light flowing TOWARD the node — they lead you somewhere. Most of the world is open
// lattice; you discover a control by crossing its tendril and following it out.
//   Pair with ?controller=lattice-nav&controller=lattice-controls (pan = drag in open space, turn a
//   dial = circle a finger on a node; lattice-controls feeds node positions + intercepts node touches).
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
// ── lattice-controls: the four control nodes (dials) at the tendrils' far ends ──
uniform float ctrl0X, ctrl0Y, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, ctrl3X, ctrl3Y; // node world positions
uniform float ctrlGrab;      // index of the node being turned (-1 = none) → blooms it
// knob_2 PALETTE · knob_3 STRUCTURE · knob_4 MOTION · knob_5 AUDIO REACTIVITY — auto-injected, not declared.
// waveletBassZScore + wavelet_bassHit auto-declare (raw) — transient pulse punch only.

mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// BEAUTIFUL palette — perceptual Oklch, lush and smooth (no muddy mid-mixes).
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

// Finite winding TENDRIL from HOME (0,0) out to a control node N — a spline-like wisp that WIGGLES,
// with light FLOWING toward the node (its far end IS the control). Braided thin filaments, tapered to
// nothing at both ends so it touches home and the node exactly. Constant-screen-width via fwidth.
float leadTendril(vec2 wpos, vec2 N, float bTime, float ph){
    float L = length(N) + 1e-4;
    vec2 dir = N / L;
    vec2 perp = vec2(-dir.y, dir.x);
    float u = dot(wpos, dir);                              // along: home=0 … node=L
    float v = dot(wpos, perp);                             // perpendicular
    float t = clamp(u / L, 0.0, 1.0);
    float amp = 0.05 * sin(t * PI);                        // wiggle tapered → 0 at home and node
    float center = amp * (sin(u * 11.0 + ph + bTime * 0.7)
                        + 0.5 * sin(u * 26.0 + ph * 1.7 - bTime * 0.5));
    float sdf = v - center;
    float aa = fwidth(sdf) + 1e-4;
    float al = u * 90.0;                                   // along-coord for the flowing pulses
    float glow = 0.0;
    for (int k = 0; k < 3; k++){
        float fk = float(k) - 1.0;                         // braided strands
        float off = (fk * 2.4 + 1.6 * sin(al * 0.4 + bTime * 1.4 + fk * 2.1)) * aa;
        float line = 1.0 - smoothstep(0.0, aa * 1.5, abs(sdf - off));
        float flow = 0.55 + 0.45 * sin(al - bTime * 4.5 + fk * 1.5);   // energy flowing toward the node
        glow += line * (0.30 + 0.70 * flow);
    }
    float within = smoothstep(-0.004, 0.02, u) * smoothstep(L + 0.004, L - 0.05, u);
    return glow * within;
}

// An aesthetic DIAL at world N. `val` (0..1) is shown as a marker swept around the ring + a fill arc;
// it blooms when grabbed. Local (returns 0 away from the node).
vec3 controlNode(vec2 wpos, vec2 N, float val, float grab, float hue, float bTime){
    vec2 d = wpos - N;
    float r = length(d);
    if (r > 0.06) return vec3(0.0);
    float ang = atan(d.y, d.x);
    float RAD = 0.022;
    vec3 c = lush(hue, 1.0);
    float ring   = smoothstep(0.004, 0.0, abs(r - RAD));
    float markAng = val * TAU - PI;                                   // value → angle on the ring
    float ad = abs(atan(sin(ang - markAng), cos(ang - markAng)));     // angular distance to the marker
    float marker = smoothstep(0.40, 0.0, ad) * smoothstep(0.006, 0.0, abs(r - RAD));
    float sweep  = smoothstep(0.018, 0.0, abs(r - RAD)) * step(ang + PI, val * TAU);  // fill arc up to value
    float core   = smoothstep(0.009, 0.0, r) * (0.7 + 0.3 * sin(bTime * 3.0));        // breathing core
    return c * (ring * 0.30 + sweep * 0.40 + marker * 1.7 + core * 0.5) * (1.0 + grab * 1.8);
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

// shared per-frame state (gReact = AUDIO REACTIVITY knob, applied inside fractal)
float gSpin, gPulse, gPop, gKick, gHexR, gBorder, gCross, gFill, gReact;

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
                  * (0.7 + (energySpring * 0.4 + band * 0.7 + waveletBassSpring * quietGate * 0.6) * gReact);
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

    // ── CONTROL KNOBS (auto-injected uniforms) ── 0 = neutral (looks like 1.frag); turn a dial up to
    //    push that effect. MOTION scales time, AUDIO REACTIVITY scales the music response.
    float kMotion = 1.0 + knob_4 * 4.0;     // churn-speed multiplier
    gReact        = 1.0 + knob_5 * 2.5;     // audio-reactivity multiplier (used in fractal + bloom)

    float bTime = iTime / 3.0;
    float mTime = bTime * kMotion;          // motion-scaled time for the churn
    gSpin  = mTime * 0.04 + morphPhase * 0.4 + melodyFlow * 0.5 * quietGate;
    gPop   = clamp(energySpring * 0.5 + spectralCrestSmooth * 0.45, 0.0, 1.0) * quietGate;
    gKick  = clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.5 + clamp(wavelet_bassHit, 0.0, 1.0) * 0.3;
    gPulse = fract(flowPhase * 0.6 + mTime * 0.18);
    float bassPulse = waveletBassSpring * quietGate;
    gHexR   = 0.60 + waveletBand2Spring * 0.12 * quietGate + knob_3 * 0.30;   // STRUCTURE → cell size
    gBorder = 0.10 + waveletBand5Spring * 0.06 * quietGate;
    gCross  = 0.20 - bassPulse * 0.05;
    gFill   = 0.06 + waveletBand5Spring * 0.035 * quietGate;

    vec2 world = vec2(navX, navY);
    gHexR += 0.07 * sin(world.x * 0.8 + world.y * 0.45);    // per-area cell size (not rotation)

    // NO orbital drift (1.frag had one): the geography must hold still under pan so control-node
    // hit-testing in lattice-controls is exact. The kaleido churn (gSpin) still gives life.
    float navz = navZoom < 0.01 ? 1.0 : navZoom;
    uv *= 0.07 / navz;
    uv += world;                                            // finger PAN — screen-consistent
    vec2 wpos = uv;                                         // clean world position (pre-warp) — controls live here
    uv += (0.03 + warpGrow * 0.04 + knob_3 * 0.08) * vec2(sin(uv.x * 3.0 + seed4 * TAU),
                                                          cos(uv.y * 3.0 + seed4 * TAU));   // STRUCTURE → warp

    vec4 fr = fractal(uv);
    float lum = fr.x, field = fr.y, wave = fr.z, alpha = fr.w;

    // ── BEAUTIFUL COLOUR ── one smooth Oklch journey; PALETTE knob rotates the whole hue obviously.
    float s = field
            + regionHue(world)
            + bTime * 0.012
            + melodyFlow * 0.32 * quietGate
            + waveletCentroidSpring * 0.14 * quietGate
            + paletteShift
            + knob_2 * 2.5                                  // PALETTE → big hue rotation
            + seed;
    vec3 col = lush(s, lum);
    col += lush(s + 0.18, 1.0) * wave * 0.7;

    vec3 bg = lush(s + 0.4, 0.45) * 0.92;                   // bright background field (no black voids)
    col = mix(bg, col, clamp(alpha, 0.0, 1.0));

    // ── LEAD TENDRILS + CONTROLS ── four wisps grow from home (0,0) to control nodes; follow one to
    //    its far end and turn the dial there. Subtle wisps (motion, not brightness); bright dials.
    vec2 cN[4];
    cN[0] = vec2(ctrl0X, ctrl0Y); cN[1] = vec2(ctrl1X, ctrl1Y);
    cN[2] = vec2(ctrl2X, ctrl2Y); cN[3] = vec2(ctrl3X, ctrl3Y);
    float kv[4];
    kv[0] = knob_2; kv[1] = knob_3; kv[2] = knob_4; kv[3] = knob_5;
    for (int i = 0; i < 4; i++){
        float fi = float(i);
        float hue = s + 0.5 + fi * 0.18;                   // distinct hue per control
        float tnd = leadTendril(wpos, cN[i], bTime, fi * 1.7 + seed * TAU);
        col += mix(lush(hue, 0.85), vec3(1.0), 0.25) * tnd * 0.22;       // ethereal wisp
        float grab = step(abs(ctrlGrab - fi), 0.5);                      // 1 if this node is being turned
        col += controlNode(wpos, cN[i], kv[i], grab, hue, bTime);
    }

    // ── MUSICAL BLOOM ── a swell/drop lifts the whole image; the kick adds a thump. Scaled by gReact.
    float dropGlow = clamp(energySpring * 0.6 + spectralCrestSmooth * 0.4, 0.0, 1.0) * quietGate;
    col *= 1.0 + (bassPulse * 0.12 + dropGlow * 0.13 + gKick * 0.10) * gReact;

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
