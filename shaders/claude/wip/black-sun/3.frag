// @fullscreen: true
// @mobile: false
// @tags: urchin, blackhole, sun, lattice, psychedelic, vangogh, claude
// preset: https://visuals.beadfamous.com/?shader=claude/wip/black-sun/3
// BLACK SUN (1.frag) — wip/urchin is the backbone: its spherized field of tube-spines radiates
// from a black hole (wip/black-hole) whose accretion is a psychedelic sun. Behind it, the Van Gogh
// tile sky from wip/sunflowers with the hex mirror-fold lattice from redaphid/lattice-interactive/3
// spiralling into the hole forever; a sunflower field along the bottom. Everything is lensed.
//   GEOMETRY: iTime only (lens, urchin clock, perpetual log-polar lattice zoom, disk spin, drift).
//   LIGHT:    all the audio (corona glow, flares, rim punch, lattice sparkle, sky glow).
//   COLOR:    slow medians/means only.
// Shader-only — no controller needed.

#define TAU 6.28318530718
#define PI  3.14159265359
#define PAL(t, a, b, c, d) ( a + b*cos( TAU*(c*t+d) ) )
#define sp(t) PAL(t,vec3(.26,.76,.77),vec3(1,.3,1),vec3(.8,.4,.7),vec3(0,.12,.54))
#define hue(v) ( .6 + .76 * cos(6.3*(v) + vec3(0,23,21)) )

#define smoothing 0.006
#define lineSize  0.01

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================
#define GATE (smoothstep(0.01, 0.06, energyMean))
// #define GATE 0.0

// LIGHT: corona brightness swells with the low end
#define CORONA_GLOW (0.70 + 0.45 * bassNormalized * GATE)
// #define CORONA_GLOW 0.85

// LIGHT: flare reach — spiky spectra throw the corona further out
#define FLARE (clamp(spectralCrestZScore, 0.0, 1.0) * GATE)
// #define FLARE 0.0

// LIGHT: photon-ring punch on kicks
#define KICK (clamp(bassZScore, 0.0, 1.0) * GATE)
// #define KICK 0.0

// LIGHT: sky tiles breathe with the mids
#define SKY_GLOW (0.90 + 0.22 * midsNormalized * GATE)
// #define SKY_GLOW 1.0

// LIGHT: lattice line sparkle with the highs
#define SPARK (trebleNormalized * GATE)
// #define SPARK 0.0

// LIGHT: lattice brightness follows timbral motion
#define LATTICE_LIT (0.55 + 0.45 * clamp(spectralFluxZScore * 0.5 + 0.5, 0.0, 1.0) * GATE)
// #define LATTICE_LIT 0.7

// LIGHT: urchin spines glow with the mids
#define URCHIN_LIT (0.85 + 0.45 * midsNormalized * GATE)
// #define URCHIN_LIT 1.0

// LIGHT: spine tips flare with the highs
#define TIPS (0.6 + 0.9 * trebleNormalized * GATE)
// #define TIPS 0.8

// COLOR: only the slowest music — key median + brightness mean
#define HUE_BASE (pitchClassMedian * 0.35 + spectralCentroidMean * 0.15)
// #define HUE_BASE 0.0

// ── knobs (0 = the designed look) ──
#define HOLE_R      (0.12 + knob_1 * 0.10)   // K1 HOLE SIZE
#define HUE_SPIN    (knob_2)                  // K2 HUE SPIN
#define LATTICE_AMT (0.55 + knob_3 * 0.45)   // K3 LATTICE

#define SUN vec2(0.0, 0.10)
#define EYE_SECS 180.0   // black-hole sun → iris eye, one way

float gPhase;   // slow colour phase (HUE_BASE + set clock + knob)

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec2 rotate2D(vec2 st, float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)) * st; }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float st(float a, float b, float s) { return smoothstep(a - s, a + s, b); }

float noise(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3. - 2. * f);
    return mix(mix(dot(hash22(i + vec2(0, 0)), f - vec2(0, 0)),
                   dot(hash22(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
               mix(dot(hash22(i + vec2(0, 1)), f - vec2(0, 1)),
                   dot(hash22(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}

float s_noise(vec2 p) { return noise(p) * 0.5 + 0.5; }

float fbm(vec2 p) {
    float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 4; ++i) { v += a * s_noise(p); p = rot * p * 2.0 + shift; a *= 0.5; }
    return v;
}

vec3 psy(float h, float l) { return hsl2rgb(vec3(fract(h), 1.0, l)); }

// ============================================================================
// LATTICE (hex mirror-fold, from redaphid/lattice-interactive/3)
// ============================================================================
float hexDist(vec2 p) {
    float dx = abs(p.x), dy = abs(p.y);
    return max(dx + dy * (1.0 / tan(PI / 3.0)), max(dx, dy * (1.0 / sin(PI / 3.0))));
}

// returns (lit, field, alpha)
vec3 lattice(vec2 p, float t) {
    float scale = 1.0, aliasBase = 1.0 / iResolution.y;
    float alpha = 0.0, lumAcc = 0.0, fieldAcc = 0.0;
    for (int i = 0; i < 9; i++) {
        p = 1.0 - abs(2.0 * fract(p - 0.5) - 1.0);
        float theta = float(i) * PI * 0.125 + t * 0.006 * (0.4 + float(i) * 0.05) + (seed3 - 0.5) * float(i) * 0.6;
        p *= rot2(theta);
        scale *= 2.0;
        if (i < 4) continue;
        vec2 uv = abs(p);
        float m = min(abs((hexDist(uv) - 0.60) - 0.1), min(length(uv) - 0.20, min(uv.x, uv.y)));
        float alias = aliasBase * 0.5 * scale;
        float f = smoothstep(0.10 + alias, 0.10, m) * 0.4 + smoothstep(0.22, 0.11, m) * 0.6;
        float ld = float(i - 4) / 4.0;
        float swirl = 0.5 + 0.5 * sin(atan(p.y, p.x) * 2.0 + length(p) * 3.0 + float(i) + seed4 * TAU);
        float lit = smoothstep(0.06 + alias, 0.06, m) * 0.5 + 0.2;
        float w = (1.0 - alpha) * f;
        lumAcc += w * lit;
        fieldAcc += w * (ld * 0.55 + swirl * 0.45);
        alpha += w;
    }
    return vec3(lumAcc, fieldAcc / max(alpha, 1e-3), alpha);
}

// ============================================================================
// SKY — Van Gogh tile rings around the black sun, lattice spiralling in
// ============================================================================
vec3 sky(vec2 uv, float t, float sm) {
    vec2 u = rotate2D(uv - SUN, noise(uv + t * .25) * .3);
    float yd = 60.;
    vec2 id = vec2((length(u) + .01) * yd, 0.);
    float xd = max(floor(id.x) * .09, .09);
    float h = (hash12(floor(id.xx)) * .5 + .25) * (t + 10.) * .25;
    vec2 tt = rotate2D(u, h);
    id.y = atan(tt.y, tt.x) * xd;
    vec2 lc = fract(id);
    id -= lc;
    vec2 cc = vec2(cos((id.y + .5) / xd), sin((id.y + .5) / xd)) * (id.x + .5) / yd;
    cc = rotate2D(cc, -h) + SUN;
    float cl = noise(cc * vec2(.5, 1) - vec2(t * .2, 0)) * step(-.25, cc.y);
    cl = smoothstep(.052, .055, cl);
    lc += noise(lc * vec2(1, 4) + id) * vec2(.7, .2);

    float L = length(uv - SUN);
    float ph = gPhase + 0.35 / (L + 0.35);                  // hue bends harder near the sun
    vec3 base = sp(sin(L - .1) + ph);
    vec3 tile = mix(sp(sin(L - .1) + ph + (hash12(id) - .5) * .15), vec3(.92, .86, .74), cl);
    vec3 f = mix(base * .35, tile, st(abs(lc.x - .5), .4, sm * yd) * st(abs(lc.y - .5), .48, sm * xd));
    f *= SKY_GLOW;

    // LATTICE: log-polar → it zooms into the hole forever (self-similar, monotonic), spiral arms
    vec2 d = uv - SUN;
    float ang = atan(d.y, d.x);
    vec2 q = vec2(ang / TAU * 6.0, log(max(L, 1e-3)) * 0.95 - t * 0.045);
    q.x += q.y * 0.5;
    vec3 lat = lattice(q, t);
    float vis = smoothstep(1.7, 0.30, L) * LATTICE_AMT;
    vec3 latCol = psy(lat.y * 0.8 + gPhase + 0.3, 0.5) * lat.x * LATTICE_LIT * (1.0 + SPARK * 0.8) * 1.6;
    f = mix(f, f * 0.55 + latCol, clamp(lat.z, 0.0, 1.0) * vis);

    // sunlight scattered into the sky — hue-cycling bloom around the hole
    f += psy(L * 1.5 - t * 0.04 + gPhase, 0.5) * 0.30 * CORONA_GLOW / (1.0 + L * 5.0);
    return f;
}

// ============================================================================
// BLACK SUN — horizon + photon ring + turbulent psychedelic corona + tilted disk
// ============================================================================
vec3 blackSun(vec3 col, vec2 d, float t, float m) {   // m = EYE morph 0..1 (one-way)
    float RH = HOLE_R;
    float r = max(length(d), 1e-4);
    float a = atan(d.y, d.x);

    // turbulent log-polar corona (integer angular multiples → seamless)
    vec2 q = vec2(a * 3.0, log(r / RH) * 2.6 - t * 0.35);
    for (float i = 1.0; i < 6.0; i++) q += sin(q.yx * i + vec2(t * 0.5, -t * 0.3) + i * 1.7) / i * 0.55;
    float rays = 0.5 + 0.5 * cos(q.x * 2.0 + q.y * 0.6);
    float reach = RH * (0.55 + 0.9 * rays + FLARE * 0.9);
    float env = exp(-max(r - RH, 0.0) / reach);
    vec3 corona = psy(q.y * 0.22 + 0.25 * sin(q.x) + gPhase - t * 0.03, 0.5) * env * (0.55 + 0.75 * rays) * CORONA_GLOW;

    // photon ring
    float pr = exp(-pow((r - RH * 1.06) / (RH * 0.05), 2.0));
    vec3 ring = psy(a / TAU * 2.0 + t * 0.08 + gPhase + 0.5, 0.55) * pr * (0.9 + KICK * 0.8);

    float outside = smoothstep(RH * 0.98, RH * 1.03, r);
    col = mix(vec3(0.02, 0.0, 0.035), col, outside);        // event horizon
    col += (corona * (1.0 - 0.55 * m) + ring) * outside;

    // EYE-MORPH: the horizon becomes a pupil, the corona condenses into an iris (iris series
    // anatomy: radial stroma fibres, collarette, crypts, contraction furrows, dark limbal ring).
    // Geometry is iTime-only; audio only lights it. Cheap 2D — no march.
    float RI = RH * 3.3;
    float ir = clamp((r - RH) / (RI - RH), 0.0, 1.0);       // 0 pupil edge → 1 limbus
    vec2 cs = vec2(cos(a), sin(a));                          // circle coords → no atan seam
    float wob = noise(cs * 3.0 + vec2(0.0, t * 0.02));
    float fib = pow(0.5 + 0.5 * cos(a * 72.0 + wob * 6.0 + ir * 2.5), 2.0);
    float fib2 = 0.5 + 0.5 * cos(a * 29.0 - wob * 4.0 - ir * 4.0);
    float stroma = mix(fib, fib2, 0.35);
    float coll = smoothstep(0.07, 0.0, abs(ir - (0.30 + 0.03 * cos(a * 9.0))));
    float crypts = pow(0.5 + 0.5 * cos(a * 12.0 + 1.3), 8.0) * smoothstep(0.11, 0.0, abs(ir - 0.48));
    float furrows = smoothstep(0.60, 0.72, ir) * (0.5 + 0.5 * cos(ir * 90.0));
    float limbal = smoothstep(0.78, 1.0, ir);
    float irisL = (0.16 + 0.34 * stroma * (0.8 + 0.5 * TIPS)) * CORONA_GLOW;
    irisL += 0.16 * coll * (0.8 + KICK) - 0.12 * crypts - 0.06 * furrows;
    irisL *= 1.0 - 0.8 * limbal;
    vec3 iris = psy(gPhase + 0.10 + ir * 0.30 + stroma * 0.06 + coll * 0.08, clamp(irisL, 0.04, 0.6));
    float irisMask = smoothstep(RH * 1.0, RH * 1.08, r) * (1.0 - smoothstep(RI * 0.97, RI * 1.03, r));
    col = mix(col, iris + ring * 0.6, irisMask * m);
    // pupil: faint deep glow that breathes with the kick, so it never reads as a hole in the wall
    col += psy(gPhase + 0.6, 0.12) * (1.0 - outside) * m * (0.25 + 0.5 * KICK) * smoothstep(0.0, RH, r);

    // tilted accretion disk; front half crosses the horizon
    vec2 dd = rot2(0.20) * d;
    vec2 de = vec2(dd.x, dd.y * 4.2);
    float er = length(de);
    float ea = atan(de.y, de.x);
    float band = smoothstep(RH * 1.2, RH * 1.6, er) * smoothstep(RH * 3.8, RH * 2.0, er);
    float streak = 0.5 + 0.5 * sin(ea * 3.0 - t * 1.4 + log(er) * 14.0);
    float doppler = 0.55 + 0.45 * cos(ea + 0.4);
    float front = step(dd.y, 0.0);
    float show = max(front, outside);
    vec3 disk = psy(er * 3.0 - t * 0.12 + gPhase + 0.15, 0.5) * band * (0.35 + 0.65 * streak) * doppler * CORONA_GLOW * 1.1 * (1.0 - m);
    col += disk * show;
    return col;
}

// ============================================================================
// URCHIN — URCHIN-2D: analytic stand-in for wip/urchin's raymarched tube-spines (the march cost
// the whole frame and throttled on a hot laptop). Five rings of tapered, swept spines in log-polar
// space radiating from the black sun: cyan inner → magenta/orange/yellow outer. Faked tube shading
// (bright core line, dark rim) and a hot tip. Geometry runs on iTime only.
// ============================================================================
vec4 spineRing(float a, float lr, float i, float t) {
    float N = 18.0 + i * 9.0;                                  // spines per ring (integer → seamless)
    float base = -1.75 + i * 0.36;                             // ring footprint in log-radius
    float len  = 0.75 + i * 0.10;
    float spin = t * (0.010 + 0.004 * i) * (mod(i, 2.0) < 0.5 ? 1.0 : -1.0) + seed3 * i;
    float x = (a / TAU + spin) * N;
    vec3 acc = vec3(0.0); float cov = 0.0;
    for (float k = -1.0; k <= 1.0; k++) {                     // own cell + neighbours (spines are swept)
        float id = floor(x) + k;
        float h = hash12(vec2(id - N * floor(id / N), i * 7.31));
        float s = (lr - base - h * 0.25) / (len * (0.7 + 0.5 * h));   // 0 root → 1 tip
        if (s < 0.0 || s > 1.0) continue;
        float sweep = (0.55 + 0.4 * h) * s * s * (mod(i, 2.0) < 0.5 ? 1.0 : -1.0);
        float dx = x - (id + 0.5 + sweep);
        float w = 0.30 * (1.0 - s * 0.85);                   // taper
        float e = exp(-pow(dx / w, 2.0));
        float tube = 0.55 + 0.45 * exp(-pow(dx / (w * 0.35), 2.0));     // bright core line
        float hueI = 0.52 + i * 0.13 + h * 0.06 - s * 0.05;            // cyan inner → warm outer
        vec3 c = psy(hueI + gPhase * 0.6, 0.30 + 0.25 * tube) * e * (0.55 + 0.45 * s) * URCHIN_LIT;
        c += psy(hueI + 0.08 + gPhase * 0.6, 0.6) * smoothstep(0.85, 1.0, s) * e * 0.55 * TIPS;   // hot tip
        acc = max(acc, c);
        cov = max(cov, e * smoothstep(0.0, 0.08, s));
    }
    return vec4(acc, cov);
}

// returns (colour, cover); q = position relative to the sun
vec4 urchin(vec2 q) {
    float r = max(length(q), 1e-4);
    float a = atan(q.y, q.x);
    float lr = log(r);
    float t = iTime;
    vec4 o = vec4(0.0);
    for (float i = 0.0; i < 5.0; i++) {
        vec4 s = spineRing(a, lr, i, t);
        o.rgb = mix(o.rgb, s.rgb, s.a);                       // outer rings lie over inner ones
        o.a = max(o.a, s.a);
    }
    return o;
}

void mainImage(out vec4 O, in vec2 g) {
    vec2 r = iResolution.xy;
    float ar = r.x / r.y;
    vec2 uv0 = (g + g - r) / r.y;
    float t = iTime;
    float sm = 3. / r.y;
    gPhase = HUE_BASE + t * 0.006 + HUE_SPIN + seed;

    // ── gravitational lens: everything bends around the hole (flips inside the Einstein ring)
    vec2 d0 = uv0 - SUN;
    float rr = max(length(d0), 1e-4);
    float RE = HOLE_R * 1.6;
    vec2 uv = SUN + d0 * (1.0 - RE * RE / (rr * rr));

    // backdrop: Van Gogh tile sky + lattice spiralling into the hole, kept dim behind the urchin
    vec3 bg = sky(uv, t, sm);

    // the urchin, lensed, radiating from the black sun
    vec4 urc = urchin(uv - SUN);
    vec3 f = mix(bg * 0.45, urc.rgb + bg * 0.12, clamp(urc.a, 0.0, 1.0));

    // PERF-NOFLOWERS: sunflower field removed (user: too slow) — urchin + sky fill the frame

    f -= fbm(uv0 * 100.0) * 0.05;                           // canvas grain (unlensed — it's the canvas)
    f = max(f, vec3(0.0));

    // ── the black sun at the urchin's heart, drawn in screen space over the lensed world
    // EYE morph: one-way accumulator stashed 16-bit in pixel (0,0) of the feedback buffer
    // (iTime wraps every 1000 s, so it cannot carry a monotonic morph). 0 on load → 1 after EYE_SECS.
    vec3 stash = getLastFrameColor(vec2(0.5) / r).rgb;
    float signed_ = step(abs(stash.b * 255.0 - 77.0), 0.5);   // blue=77 marks our own stash; anything else (hot-swap, reset) reads as 0
    float eyeM = clamp(signed_ * (floor(stash.r * 255.0 + 0.5) + stash.g) / 255.0 + 1.0 / (EYE_SECS * 60.0), 0.0, 1.0);
    float m = smoothstep(0.0, 1.0, eyeM);
    f = blackSun(f, d0, t, m);

    // accretion trail: previous frame swirled inward around the hole
    vec2 sUV = g / r;
    vec2 sunS = vec2(SUN.x / ar * 0.5 + 0.5, SUN.y * 0.5 + 0.5);
    vec2 dv = (sUV - sunS) * vec2(ar, 1.0);
    dv = rot2(0.015) * dv * 0.993;
    vec3 prev = getLastFrameColor(sunS + dv / vec2(ar, 1.0)).rgb;
    float near = smoothstep(HOLE_R * 5.0, HOLE_R * 1.3, rr) * smoothstep(HOLE_R, HOLE_R * 1.1, rr);
    f = mix(f, max(f, prev * 0.92), 0.6 * near);

    f = clamp(f, 0.0, 0.96);
    O = vec4(f, 1.0);
    if (g.x < 1.0 && g.y < 1.0) O = vec4(floor(eyeM * 255.0) / 255.0, fract(eyeM * 255.0), 77.0 / 255.0, 1.0);
}
