// @fullscreen: true
// @mobile: true
// @tags: fractal, hex, lattice, touch, paths, controls, eventhorizon, redaphid
//https://visuals.beadfamous.com/?shader=redaphid/lattice-interactive/3&wavelet=true&controller=lattice-nav&controller=lattice-controls&fullscreen=true&knob_1=0.21&name=Lattice%20Horizons
//   * knob_1 = PAN SPEED (lattice-nav). knob_2..5 = the four control DIALS (lattice-controls): each
//     turns an EVENT-HORIZON distortion of the backbuffer around its node. 0 = off, 1 = full vortex.
// LATTICE-INTERACTIVE (3.frag). Built off 2.frag. Two big changes:
//   1. Tendrils no longer radiate from home — each is a LONG winding wisp standing on its own out in
//      the world (tail → control node), DISCOVERED by exploring (most of the world is open lattice).
//   2. Each control is an EVENT HORIZON: turning its dial warps the PREVIOUS FRAME around the node
//      into a trippy gravitational vortex. Four distinct flavours: 0 swirl · 1 gravitational suck ·
//      2 chromatic kaleido · 3 audio-pulsing. The dial ring stays visible at 0 so you can find + grab it.
//   Pair with ?controller=lattice-nav&controller=lattice-controls (pan = drag in open space; turn a
//   dial = circle a finger on a node, clockwise = up).
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
uniform float spectralRoughnessSmooth;
uniform float flowPhase;
uniform float morphPhase;
uniform float quietGate;
uniform float evoWarp;
uniform float evoPlasma;
// ── lattice-nav: navigation + PERMANENT live mutation ──
uniform float navX;
uniform float navY;
uniform float navZoom;
uniform float paletteShift;
uniform float warpGrow;
// ── lattice-controls: the four control nodes (event-horizon dials) ──
uniform float ctrl0X, ctrl0Y, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, ctrl3X, ctrl3Y; // node world positions
uniform float ctrlGrab;      // index of the node being turned (-1 = none) → blooms it
// knob_2..5 = the dials (auto-injected uniforms — not declared).
// waveletBassZScore + wavelet_bassHit auto-declare (raw).

mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec3 lush(float s, float lit){
    float h = fract(s) * TAU;
    float L = clamp(0.50 + 0.36 * clamp(lit, 0.0, 1.0), 0.12, 0.88);
    float C = (0.125 + seed2 * 0.05) + 0.05 * sin(s * TAU * 0.5 + 1.3);
    return oklch2rgb(vec3(L, C, h));
}

float regionHue(vec2 w){
    float ph = seed3 * TAU;
    return 0.20 * sin(w.x * 0.23 + ph) + 0.20 * cos(w.y * 0.19 + ph * 1.3)
         + 0.13 * sin((w.x - w.y) * 0.11 + ph) + 0.09 * cos((w.x + w.y) * 0.071);
}

float hash11(vec2 p){ return fract(sin(dot(p, vec2(12.99, 78.23))) * 43758.5453); }

// Finite winding TENDRIL from A to B — a long spline-like wisp that WIGGLES with light FLOWING toward
// B (the control). Braided thin filaments, tapered to nothing at both ends. Constant-width via fwidth.
float leadTendril(vec2 wpos, vec2 A, vec2 B, float bTime, float ph){
    vec2 AB = B - A;
    float L = length(AB) + 1e-4;
    vec2 dir = AB / L;
    vec2 perp = vec2(-dir.y, dir.x);
    float u = dot(wpos - A, dir);                         // along: A=0 … B=L
    float v = dot(wpos - A, perp);
    float t = clamp(u / L, 0.0, 1.0);
    float amp = 0.06 * sin(t * PI);                       // wiggle tapered → 0 at both ends
    float center = amp * (sin(u * 9.0 + ph + bTime * 0.7)
                        + 0.5 * sin(u * 21.0 + ph * 1.7 - bTime * 0.5));
    float sdf = v - center;
    float aa = fwidth(sdf) + 1e-4;
    float al = u * 80.0;
    float glow = 0.0;
    for (int k = 0; k < 3; k++){
        float fk = float(k) - 1.0;
        float off = (fk * 2.4 + 1.6 * sin(al * 0.4 + bTime * 1.4 + fk * 2.1)) * aa;
        float line = 1.0 - smoothstep(0.0, aa * 1.5, abs(sdf - off));
        float flow = 0.55 + 0.45 * sin(al - bTime * 4.5 + fk * 1.5);   // flows toward B
        glow += line * (0.30 + 0.70 * flow);
    }
    float within = smoothstep(-0.004, 0.02, u) * smoothstep(L + 0.004, L - 0.05, u);
    return glow * within;
}

// SPHERICAL LENS — warp the fractal's INPUT coords so the actual lattice BULGES and twists under a
// sphere. `amount` (the knob) drives it: magnify hard toward the centre (fish-eye balloon) + a twist,
// strongest at the centre, seamless at the rim. This distorts the real shader, not the backbuffer.
vec2 lensBulge(vec2 uv, vec2 center, float R, float amount){
    vec2 t = uv - center;
    float r = length(t);
    if (r >= R || amount <= 0.001) return uv;
    float pct = r / R;
    float fall = 1.0 - pct * pct;                          // 1 at centre → 0 at rim
    float tw = amount * fall * 2.2;                        // twist, strongest at centre
    t = mat2(cos(tw), -sin(tw), sin(tw), cos(tw)) * t;
    float k = 1.0 - amount * fall * 0.85;                  // magnify: read from nearer the centre → balloon
    return center + t * k;
}

// DISTORTION DIAL — a small but DRAMATIC artifact: inside its sphere the backbuffer is sucked into a
// the underlying lattice already BULGES under the sphere (lensBulge on the fractal input). Here we
// just colour it boldly (vivid hue-spin / invert / hard duotone / false-colour, by flavour) and draw a
// bright rim + value marker so the artifact stands out. Recolour is on the FRESH frame → no flicker.
vec3 dialDistort(vec3 col, vec2 scrUV, vec2 NS, float rad, float val, float grab,
                 float aspect, int flavour, vec3 hueC, float t){
    vec2 d = (scrUV - NS) * vec2(aspect, 1.0);
    float r = length(d);
    float edge = rad * 1.5;                                      // the sphere's rim
    if (r > edge) return col;
    float ang = atan(d.y, d.x);
    float inside = smoothstep(edge, rad * 0.1, r);             // 1 deep inside → 0 at the rim

    // ── BOLD recolour of the (already-bulged) lattice inside the sphere ──
    vec3 bold = col;
    vec3 hsl = rgb2hsl(col);
    if (flavour == 0) { hsl.x = fract(hsl.x + 0.5 * val); hsl.y = clamp(hsl.y + 0.45, 0.0, 1.0); bold = hsl2rgb(hsl); } // VIVID hue spin
    if (flavour == 1) bold = mix(col, vec3(1.0) - col, 0.5 + 0.5 * val);                                               // INVERT
    if (flavour == 2) { float q = 3.0; bold = mix(col, floor(col * q + 0.5) / q, 0.5 + 0.5 * val); }                   // hard POSTERISE
    if (flavour == 3) { float lum = dot(col, vec3(0.333)); bold = mix(col, hueC * (0.3 + 1.4 * lum), 0.5 + 0.5 * val); } // FALSE-COLOUR
    col = mix(col, bold, inside);

    // bright sphere rim + value marker so the artifact stands out
    float rim    = smoothstep(rad * 0.14, 0.0, abs(r - edge));
    float markAng = val * TAU - PI;
    float adm = abs(atan(sin(ang - markAng), cos(ang - markAng)));
    float marker = smoothstep(0.45, 0.0, adm) * smoothstep(rad * 0.28, 0.0, abs(r - edge));
    col += hueC * (rim * 0.40 + marker * 1.1) * (1.0 + grab);
    return col;
}

float hexDist(vec2 p){
    #define MULT1 (1.0 / tan(PI / 3.0))
    #define MULT2 (1.0 / sin(PI / 3.0))
    float dx = abs(p.x), dy = abs(p.y);
    return max(dx + dy * MULT1, max(dx, dy * MULT2));
}

float bandForDepth(float ld){
    if (ld < 0.34) return waveletBand5Spring * quietGate;
    if (ld < 0.67) return waveletBand2Spring * quietGate;
    return waveletBassSpring * quietGate;
}

float gSpin, gPulse, gPop, gKick, gHexR, gBorder, gCross, gFill, gReact, gTwist;

vec4 fractal(vec2 p){
    float scale = 1.0, aliasBase = 1.0 / iResolution.y;
    float alpha = 0.0, lumAcc = 0.0, fieldAcc = 0.0, waveAcc = 0.0;

    for (int i = 0; i < LEVELS; i++){
        float s = 2.0;
        p = 1.0 - abs(s * fract(p - 0.5) - s * 0.5);
        float theta = float(i) * PI * 0.125
                    + gSpin * (0.4 + float(i) * 0.05)
                    + (evoWarp - 0.5) * float(i) * 0.10
                    + (seed3 - 0.5) * float(i) * 0.8
                    + gTwist * float(i) * 0.30;            // STRUCTURE dial (knob_4) → per-level twist
        p *= rot2(theta);
        scale *= s;
        if (i < FIRST) continue;

        vec2 uv = abs(p);
        float delt1 = abs((hexDist(uv) - gHexR) - 0.1);
        float delt2 = min(length(uv) - gCross, min(uv.x, uv.y));
        float m = min(delt1, delt2);
        float alias = aliasBase * 0.5 * scale;
        float f = smoothstep(gBorder + alias, gBorder, m) * 0.4
                + smoothstep(gBorder + 0.12, gBorder + 0.01, m) * 0.6;

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
    vec2 sp = (fragCoord / iResolution.xy) * 2.0 - 1.0;
    float aspect = iResolution.x / iResolution.y;

    float bTime = iTime / 3.0;
    gSpin  = bTime * 0.04 + morphPhase * 0.4 + melodyFlow * 0.5 * quietGate;   // MOVING (kept)
    gPop   = clamp(energySpring * 0.5 + spectralCrestSmooth * 0.45, 0.0, 1.0) * quietGate;
    gKick  = clamp(max(waveletBassZScore, 0.0), 0.0, 1.0) * 0.5 + clamp(wavelet_bassHit, 0.0, 1.0) * 0.3;
    gPulse = fract(flowPhase * 0.6 + bTime * 0.18);
    float bassPulse = waveletBassSpring * quietGate;
    gHexR   = 0.60 + waveletBand2Spring * 0.12 * quietGate + knob_3 * 0.30;   // STRUCTURE dial (knob_3) → cell size
    gBorder = 0.10 + waveletBand5Spring * 0.06 * quietGate;
    gCross  = 0.20 - bassPulse * 0.05;
    gFill   = 0.06 + waveletBand5Spring * 0.035 * quietGate;
    gReact  = 1.0 + knob_5 * 2.5;          // MUSIC-REACTIVITY dial (knob_5) → how hard it responds
    gTwist  = knob_4 * 1.5;                 // STRUCTURE dial (knob_4) → kaleido twist

    vec2 world = vec2(navX, navY);
    gHexR += 0.07 * sin(world.x * 0.8 + world.y * 0.45);

    // NO orbital drift → the world holds still under pan, so the controller's hit-testing is exact.
    float navz = navZoom < 0.01 ? 1.0 : navZoom;
    uv *= 0.07 / navz;
    uv += world;
    vec2 wpos = uv;                                         // clean world position — controls live here

    // the four control nodes + their knobs (defined here so the lattice can BULGE under them)
    vec2 cN[4];
    cN[0] = vec2(ctrl0X, ctrl0Y); cN[1] = vec2(ctrl1X, ctrl1Y);
    cN[2] = vec2(ctrl2X, ctrl2Y); cN[3] = vec2(ctrl3X, ctrl3Y);
    float kv[4];
    kv[0] = knob_2; kv[1] = knob_3; kv[2] = knob_4; kv[3] = knob_5;

    // ── BULGE THE UNDERLYING LATTICE under each sphere (lens on the fractal INPUT, scaled by the knob) ──
    for (int i = 0; i < 4; i++) uv = lensBulge(uv, cN[i], (0.006 + kv[i] * 0.004) * 1.5, kv[i]);

    uv += (0.03 + warpGrow * 0.04 + knob_3 * 0.08) * vec2(sin(uv.x * 3.0 + seed4 * TAU), cos(uv.y * 3.0 + seed4 * TAU));  // STRUCTURE dial → warp

    vec4 fr = fractal(uv);
    float lum = fr.x, field = fr.y, wave = fr.z, alpha = fr.w;

    float s = field
            + regionHue(world)
            + bTime * 0.012
            + melodyFlow * 0.32 * quietGate
            + waveletCentroidSpring * 0.14 * quietGate
            + paletteShift
            + knob_2 * 2.5                                  // COLOUR-SCHEME dial (knob_2) → global hue rotation
            + seed;
    vec3 col = lush(s, lum);
    col += lush(s + 0.18, 1.0) * wave * 0.7;

    vec3 bg = lush(s + 0.4, 0.45) * 0.92;
    col = mix(bg, col, clamp(alpha, 0.0, 1.0));

    // ── LEAD TENDRILS + DIALS ── four long wisps stand out in the world (tail → node, NOT from home);
    //    follow one to the dial at its node end. Subtle wisps; always-visible dial rings.
    for (int i = 0; i < 4; i++){
        float fi = float(i);
        float hue = s + 0.5 + fi * 0.18;
        float ah = hash11(cN[i] + fi) * TAU;                            // per-node tendril heading
        vec2 tail = cN[i] + 1.3 * vec2(cos(ah), sin(ah));               // LONG tendril, out in the world
        float tnd = leadTendril(wpos, tail, cN[i], bTime, fi * 1.7 + seed * TAU);
        col += mix(lush(hue, 0.85), vec3(1.0), 0.25) * tnd * 0.22;      // ethereal wisp leading to it
    }

    // ── MUSICAL BLOOM + SPARKLE (as before) ──
    float dropGlow = clamp(energySpring * 0.6 + spectralCrestSmooth * 0.4, 0.0, 1.0) * quietGate;
    col *= 1.0 + (bassPulse * 0.12 + dropGlow * 0.13 + gKick * 0.10) * gReact;   // MUSIC-REACTIVITY dial
    vec2 scr = fragCoord / iResolution.xy;
    float g1 = 0.5 + 0.5 * sin(scr.x * 190.0 + bTime * 5.0);
    float g2 = 0.5 + 0.5 * sin(scr.y * 163.0 - bTime * 4.0);
    float sparkPatch = 0.5 + 0.5 * sin(scr.x * 6.0 + scr.y * 4.3 - bTime * 2.0);
    float spark = pow(g1 * g2, 16.0) * sparkPatch;
    col += vec3(1.0, 0.97, 0.92) * spark * clamp(alpha, 0.0, 1.0)
         * (waveletBand5Spring * 0.25 + spectralCrestSmooth * 0.22 + spectralRoughnessSmooth * 0.12) * quietGate;

    col = pow(clamp(col, 0.0, 1.0), vec3(0.80));
    col *= 1.15;

    // ── DISTORTION DIALS ── each control is a small backbuffer-distortion lens (ripple / plasma /
    //    wave / throb), world-anchored so it's small from afar and grows as you approach. Sampled here,
    //    before the trail mix, so the ripples feed back and live.
    for (int i = 0; i < 4; i++){
        vec2 uvp = (cN[i] - world) * (navz / 0.07);
        vec2 NS = vec2(uvp.x * iResolution.y / iResolution.x + 0.5, uvp.y + 0.5);   // node → screen uv
        float rad = (0.006 + kv[i] * 0.004) * navz / 0.07;                          // small, world-anchored
        float grab = step(abs(ctrlGrab - float(i)), 0.5);
        vec3 hueC = lush(s + 0.5 + float(i) * 0.18, 1.0);
        col = dialDistort(col, scr, NS, rad, kv[i], grab, aspect, i, hueC, iTime);
    }

    // gentle trail (feeds the ripples between frames)
    vec4 prev = getLastFrameColor(fragCoord / iResolution.xy);
    col = mix(prev.rgb * 0.90, col, 0.82);

    col = mix(col, vec3(0.0), dot(sp, sp) * 0.12);          // minimal vignette

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
