// @fullscreen: true
// @mobile: false
// @tags: sun, lamp, ambient, claude
// preset: https://visuals.beadfamous.com/?shader=sun/lamp/1&controller=sun-lamp&noaudio=true
// SUN LAMP: sun/17's giant (the late-show close orbit) as office light for a projector. No story, no
// audio: every show uniform is folded to its resting value and every clock is a fixed multiple of one
// travel clock from controllers/sun-lamp.js. 0 on every dial is the full-brightness look.

#define TAU 6.28318530718
#define PI  3.14159265359

uniform float lp_u, lp_seam;

// ============================================================================
// KNOBS — 0 everywhere is the designed look
// @knob: 1 DIM
// @knob: 2 HUE SPIN
// @knob: 3 FAN
// @knob: 4 SUN SIZE
// @knob: 5 COLOR TEMP
// @knob: 6 REACH
// @knob: 7 SPEED
// @knob: 8 SKY SWAP
// @knob: 9 FILL
// @knob: 10 PAINT
// @knob: 11 WARMTH
// @knob: 12 SPARKLE
// @knob: 13 GLOW
// @knob: 14 DARK
// @knob: 15 SUN X
// @knob: 16 SUN Y
// @knob: 17 WASH
// ============================================================================
#define DIM        (knob_1)                    // K1 DIM master dimmer, applied last: 1 is ~3% light
#define HUE_ROT    (knob_2 * TAU)              // K2 HUE SPIN turns the whole finished palette
#define FAN_AMT    (1.4 + 0.6 * knob_3)        // K3 FAN arm brightness
#define FAN_S      (1.02 + 0.4 * knob_3)       // K3 FAN arm reach
#define GIANT_R    (1.1 + 1.1 * knob_4)        // K4 SUN SIZE radius in half-heights
#define TEMP       (knob_5)                    // K5 COLOR TEMP neutral to ~1900K candle
#define REACH      (1.78 + 1.0 * knob_6)       // K6 REACH prominence height
#define SPACE_MIX  (knob_8)                    // K8 SKY SWAP day tiles to deep space
#define FILL       (knob_9)                    // K9 FILL lifts the background in its own hues
#define PAINT_AMT  (knob_10)                   // K10 PAINT brush dabs
#define WARMTH     (knob_11 * 0.9)             // K11 WARMTH pulls the giant toward gold
#define SPARKLE    (2.5 + 1.5 * knob_12)       // K12 SPARKLE glints, filaments, spicules
#define GLOW       (0.4 + 3.0 * knob_13)       // K13 GLOW corona and chromosphere
#define DARK_FLOOR (knob_14)                   // K14 DARK sinks the darks
#define SUN_X      (0.87 * (1.0 - 2.0 * knob_15))    // K15 SUN X home, centre at 0.5, mirrored at 1
#define SUN_Y      (-1.28 * (1.0 - 2.0 * knob_16))   // K16 SUN Y home, centre at 0.5, mirrored at 1
#define WASH       (knob_17)                   // K17 WASH toward near-white light
#define GIANT_C    vec2(SUN_X, SUN_Y)
#define FAN_DIR    vec2(-0.5622, 0.8271)
#define SKY_C      GIANT_C
#define RB         0.30

// clocks: fixed multiples of lp_u at the show's average-music rates
#define T_SKY   (lp_u)
#define T_S     (lp_u)
#define BUD_PH  (lp_u * 0.86)
#define GAL_PH  (lp_u * 0.05)
#define FLUX_PH (lp_u * 0.14)
#define FLOW_D  (lp_u * 1.16)
#define PAL     (lp_u * 0.00093)
#define SKY_ROT (BUD_PH * 0.014)

// the show's audio, held at its resting values under average music
#define SUN_BREATH  0.4
#define RAY_SWAY    0.3
#define RAY_HATS    0.25
#define ROLL        0.5
#define AIR         0.3
#define BODY        0.3
#define TONAL       0.5
#define DYN         0.3
#define TURB        1.474
#define LATTICE_LIT 0.95
#define SKY_GLOW    0.92
#define HUE_BASE    0.25
#define LUMA        vec3(0.2126, 0.7152, 0.0722)

float gPhase;
float gPal;

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

const vec3 MIAMI[15] = vec3[15](
    vec3(0.80, 0.075, 78.0),
    vec3(0.70, 0.160, 30.0),
    vec3(0.78, 0.125, 192.0),
    vec3(0.60, 0.190, 35.0),
    vec3(0.74, 0.165, 58.0),
    vec3(0.48, 0.105, 222.0),
    vec3(0.30, 0.110, 28.0),
    vec3(0.88, 0.130, 90.0),
    vec3(0.81, 0.160, 76.0),
    vec3(0.74, 0.170, 62.0),
    vec3(0.65, 0.180, 46.0),
    vec3(0.55, 0.185, 30.0),
    vec3(0.60, 0.120, 245.0),
    vec3(0.38, 0.120, 262.0),
    vec3(0.92, 0.100, 96.0)
);

vec3 gamutLch(vec3 lch) {
    vec3 c = oklch2rgb(lch);
    float g = lch.x * lch.x * lch.x;
    float t = 1.0;
    for (int i = 0; i < 3; i++) {
        float ci = c[i], di = ci - g;
        if (ci > 1.0) t = min(t, (1.0 - g) / di);
        if (ci < 0.0) t = min(t, g / (g - ci));
    }
    return clamp(vec3(g) + (c - vec3(g)) * max(t, 0.0), 0.0, 1.0);
}

vec3 gasHue(float v, float L) {
    float hh = 250.0 + 35.0 * (0.5 + 0.5 * sin(v * 5.2 + gPal * TAU * 0.5)) + 8.0 * sin(gPal * TAU);
    vec3 warm = gamutLch(vec3(min(L * 1.05, 0.80), 0.12, radians(hh)));
    vec3 cool = gamutLch(vec3(min(L * 1.10, 0.84), 0.14, radians(215.0 + 25.0 * sin(v * 3.1 + gPal * TAU))));
    float w = smoothstep(0.50, 0.72, 0.5 + 0.5 * sin(v * 2.3 + 1.7 + gPal * TAU));
    return pow(mix(warm, cool, w), vec3(1.0 / 2.2));
}

vec3 miamiLin(int i, float lit) {
    vec3 e = MIAMI[i];
    float L = min(e.x * lit, 0.86);
    float C = e.y * (0.55 + 0.45 * smoothstep(0.05, 0.35, L)) * (1.0 - smoothstep(0.82, 0.92, L));
    float rot = radians(i >= 12 && i <= 13 ? 15.0 : 20.0) * sin(gPal * TAU);
    return gamutLch(vec3(L, C, radians(e.z) + rot));
}
vec3 mc(float idx, float lit) {
    idx = clamp(idx, 0.0, 14.0);
    int i0 = int(floor(idx)); int i1 = min(i0 + 1, 14);
    return pow(mix(miamiLin(i0, lit), miamiLin(i1, lit), fract(idx)), vec3(1.0 / 2.2));
}
vec3 skyLin(int i, float lit) {
    vec3 e = MIAMI[i];
    float L = min(e.x * lit, 0.86);
    float C = e.y * (0.55 + 0.45 * smoothstep(0.05, 0.35, L)) * (1.0 - smoothstep(0.82, 0.92, L));
    float rot = radians(15.0) * sin(gPal * TAU * 0.25);
    return gamutLch(vec3(L, C, radians(e.z) + rot));
}
vec3 mcSky(float idx, float lit) {
    idx = clamp(idx, 12.0, 14.0);
    int i0 = int(floor(idx)); int i1 = min(i0 + 1, 14);
    return pow(mix(skyLin(i0, lit), skyLin(i1, lit), fract(idx)), vec3(1.0 / 2.2));
}
vec3 skyBand(float k, float lit) {
    vec3 blue = mcSky(12.0 + 0.45 * mod(k, 3.0), lit);
    return mix(blue, mcSky(14.0, lit * 0.85), step(0.86, hash12(vec2(k, 3.1))));
}

vec3 sunLch(float L, float C, float hDeg) {
    return pow(gamutLch(vec3(min(L, 0.88), C, radians(hDeg))), vec3(1.0 / 2.2));
}

// ============================================================================
// LATTICE (hex mirror-fold) + SKY (Van Gogh tile rings round the giant)
// ============================================================================
float hexDist(vec2 p) {
    float dx = abs(p.x), dy = abs(p.y);
    return max(dx + dy * (1.0 / tan(PI / 3.0)), max(dx, dy * (1.0 / sin(PI / 3.0))));
}

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

vec3 sky(vec2 uv, float t, float sm) {
    vec2 sw = uv * 0.6 + vec2(2.29835, 0.0);
    vec2 u = rotate2D(uv - SKY_C, noise(uv + 276.009) * .3 + SKY_ROT) + vec2(noise(sw), noise(sw + 5.3)) * 0.7;
    float yd = 60.;
    vec2 id = vec2((length(u) + .01) * yd, 0.);
    float xd = max(floor(id.x) * .09, .09);
    float h = (hash12(floor(id.xx)) * .5 + .25) * ((t + 10.) * .25 + FLOW_D * 0.15);
    vec2 tt = rotate2D(u, h);
    id.y = atan(tt.y, tt.x) * xd;
    vec2 lc = fract(id);
    id -= lc;
    vec2 cc = vec2(cos((id.y + .5) / xd), sin((id.y + .5) / xd)) * (id.x + .5) / yd;
    cc = rotate2D(cc, -h) + SKY_C;
    float clN = noise(cc * vec2(.5, 1) - vec2(t * .2 + FLOW_D * 0.3, 0));
    float clT = 0.012 - 0.006 * BODY;
    float cl = smoothstep(clT - 0.0015, clT + 0.0015, clN);
    lc += noise(lc * vec2(1, 4) + id) * vec2(.7, .2);
    float kT = mix(0.25, 1.0, cl);
    float hT = hash12(id + 7.3);

    float L = length(uv - SKY_C);
    float ph = gPhase + 0.35 / (L + 0.35);
    vec3 base = mcSky(12.0 + 0.8 * (0.5 + 0.5 * sin(sin(L - .1) + ph)), 0.55);
    float bandK = floor(max(clN - clT, 0.0) / 0.022);
    float calmR = 0.40 * mix(1.0, 0.55, smoothstep(0.3, 1.5, L));
    vec3 tile = mix(mcSky(12.0 + 0.9 * hash12(id), 0.85), skyBand(bandK, 0.9 + 0.1 * hT), cl * (1.0 - calmR));
    tile *= 1.0 - 0.5 * calmR * (1.0 - smoothstep(0.3, 1.2, L));
    tile *= 1.0 + 0.35 * SUN_BREATH * kT;
    tile *= 1.0 + 0.45 * clamp(RAY_HATS * 1.5, 0.0, 1.0) * (0.5 + 0.5 * sin(length(cc - SKY_C) * 16.0 - FLUX_PH * 6.0 - GAL_PH * 2.0));
    vec3 f = mix(base * 0.45 * (0.85 - 0.3 * DYN), tile,
                 st(abs(lc.x - .5), 0.40, sm * yd) * st(abs(lc.y - .5), 0.45, sm * xd));
    f *= SKY_GLOW;

    vec2 d = uv - SKY_C;
    float ang = atan(d.y, d.x);
    vec2 q = vec2(ang / TAU * 6.0, log(max(L, 1e-3)) * 0.95 - t * 0.045);
    q.x += q.y * 0.5;
    vec3 lat = lattice(q, t);
    float vis = smoothstep(1.7, 0.30, L) * 0.8;
    vec3 latCol = mc(14.0, 0.55 + 0.3 * lat.y) * lat.x * LATTICE_LIT * (1.0 + RAY_HATS * 0.8 + 0.3 * AIR) * 1.6 * SPARKLE;
    f = mix(f, f * 0.55 + latCol, clamp(lat.z, 0.0, 1.0) * vis);

    f *= 1.0 + (0.3 + 1.2 * SUN_BREATH) * 0.8 / (1.0 + L * 6.0);
    f *= mix(1.0, 0.75 + 0.5 * smoothstep(0.2, 1.6, L), ROLL);
    return f * mix(0.80, 0.42, smoothstep(0.35, 1.5, L));
}

// NIGHT: navy floor and nebula gas in spiral arms round the giant (K8 SKY SWAP)
vec3 deepSpace(vec2 uv) {
    uv = SKY_C + rot2(-FLOW_D * 0.035) * (uv - SKY_C);
    vec3 c = pow(gamutLch(vec3(0.21, 0.09, radians(268.0))), vec3(1.0 / 2.2));
    vec2 dS = uv - SKY_C;
    float rS = max(length(dS), 1e-3), aS = atan(dS.y, dS.x), lr = log(rS);
    float arm = 0.5 + 0.5 * cos(2.0 * aS - 3.2 * lr + GAL_PH + FLOW_D * 0.5);
    float armM = pow(arm, mix(3.5 - 0.8 * BODY, 1.2, clamp(SUN_BREATH * 1.3, 0.0, 1.0)));
    vec2 q = uv * 1.1 + vec2(1.0, 0.35) * (GAL_PH * 0.12 + FLOW_D * 0.04);
    float dens = smoothstep(0.36, 0.74, s_noise(q * 0.7) * 0.6 + s_noise(q * 1.6 + 4.1) * 0.4);
    vec2 w = q + vec2(noise(q * 1.3), noise(q * 1.3 + 7.7)) * TURB;
    float v = 0.5 + 0.5 * sin(w.x * 2.2 + sin(w.y * 2.7));
    float fil = exp(-pow(sin(w.x * 3.3 + w.y * 1.4), 2.0) / 0.03);
    vec3 gasCool = pow(gamutLch(vec3(0.68, 0.13, radians(250.0 + 15.0 * sin(gPal * TAU)))), vec3(1.0 / 2.2));
    vec3 gas = mix(gasHue(v + 0.3 * fil, 0.62), gasCool, smoothstep(0.25, 0.85, fil) * 0.8);
    float gasLit = (0.4 + 1.6 * armM) * (0.6 + 1.8 * SUN_BREATH);
    float veil = dens * (0.4 + 0.6 * fil) * (1.0 - 0.3 * DYN);
    c += gas * veil * gasLit * 1.1;
    float cM = max(max(c.r, c.g), max(c.b, 1e-4));
    float cK = cM < 0.7 ? cM : 0.7 + 0.2 * (1.0 - exp(-(cM - 0.7) / 0.2));
    return c * (cK / cM);
}

// ============================================================================
// JULIA FAN — the cyan eruption off the giant's limb
// ============================================================================
vec4 juliaArms(vec2 d) {
    float r = max(length(d), 1e-4);
    float a0 = atan(d.y, d.x);
    float a = a0 + BUD_PH * 0.03 + FLUX_PH * 0.04 + FLOW_D * 0.03 + 0.25 * sin(a0 + BUD_PH * 0.004) + 0.12 * sin(2.0 * a0 + 1.7);
    float cPh = GAL_PH * 0.05 + FLUX_PH * 0.11 + FLOW_D * 0.25;
    vec2 c = 0.7885 * vec2(sin(4.97), cos(4.97)) + 0.018 * vec2(cos(cPh), sin(cPh));
    float S = FAN_S * (1.0 + 0.22 * sin(a0 + 2.1) + 0.12 * sin(3.0 * a0 + 0.4));
    if (r > S * 2.6 || r < RB * 0.6) return vec4(0.0);
    float rr0 = pow(r / S, 0.7);
    a += 0.52 * log(max(r / S, 0.05));
    vec2 z = rr0 * vec2(cos(3.0 * a), sin(3.0 * a));
    vec2 dz = vec2(1.0, 0.0);
    float n = 0.0, tPt = 1e3, tLn = 1e3, tCi = 1e3;
    vec2 P = 0.32 * vec2(cos(BUD_PH * 0.05 + FLOW_D * 0.1), sin(BUD_PH * 0.05 + FLOW_D * 0.1));
    for (int i = 0; i < 32; i++) {
        dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x);
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        tPt = min(tPt, length(z - P));
        tLn = min(tLn, abs(z.y - 0.15 * z.x));
        tCi = min(tCi, abs(length(z) - 0.62));
        if (dot(z, z) > 256.0) break;
        n += 1.0;
    }
    float zz = max(dot(z, z), 1.0001);
    float sn = n + 1.0 - log2(max(log2(zz) * 0.5, 1e-4));
    float k = clamp(sn / 16.0, 0.0, 1.0);
    float de = 0.5 * sqrt(zz) * log(zz) * 0.5 / max(length(dz), 1e-6);
    float px = 2.0 / iResolution.y / S;
    float edge = 1.0 - smoothstep(0.0, px * 2.5, de);
    float glow = exp(-de / (px * 18.0));
    float out0 = smoothstep(RB * 0.6, RB * 1.05, r) * smoothstep(S * 2.6, S * 1.6, r);
    float aw = 1.5 * fwidth(sn) + 1e-3;
    float interior = smoothstep(31.5 - aw, 31.5 + aw, sn);
    float body = exp(-de * 22.0) * (1.0 - interior) * out0 * 0.85;
    float curls = exp(-tCi * 22.0) * body;
    float beads = exp(-tPt * 30.0) * body;
    float fils = exp(-tLn * 60.0) * (0.4 * glow + edge) * out0 * exp(-de * 10.0) * (1.0 - interior);
    float tip = smoothstep(S * 0.7, S * 2.0, r);
    vec3 teal = gamutLch(vec3(0.56 + 0.22 * k, 0.15, radians(mix(250.0, 200.0, k) + 15.0 * sin(gPal * TAU))));
    vec3 gold = gamutLch(vec3(0.74, 0.16, radians(80.0)));
    vec3 bodyC = pow(mix(teal, gold, tip), vec3(1.0 / 2.2));
    float breath = clamp(SUN_BREATH * 1.5, 0.0, 1.0);
    vec3 col = bodyC * body * (0.6 + 0.9 * SUN_BREATH)
             + sunLch(0.70, 0.16, 58.0) * curls * (0.4 + 1.4 * RAY_SWAY)
             + pow(gamutLch(vec3(0.72, 0.14, radians(225.0))), vec3(1.0 / 2.2)) * fils * (0.35 + 1.6 * RAY_HATS) * SPARKLE
             + sunLch(0.76, 0.15, 84.0) * beads * (0.3 + 1.5 * RAY_HATS);
    float inFill = interior * out0 * (0.55 + 0.45 * exp(-tCi * 6.0)) * (1.0 - 0.5 * tip);
    col += pow(gamutLch(vec3(0.54, 0.13, radians(200.0))), vec3(1.0 / 2.2)) * inFill * 0.55;
    col *= (1.0 + 0.9 * (0.35 + 0.65 * breath)) * (1.0 + 0.6 * breath);
    float aRoot = max(max(body, fils), 0.5 * inFill);
    float rootT = smoothstep(RB, S * 0.9, r);
    float rootW = 1.0 - smoothstep(RB * 1.1, S * 1.1, r);
    vec3 hotC = pow(gamutLch(vec3(mix(0.86, 0.80, rootT), 0.14, radians(mix(80.0, 205.0, rootT)))), vec3(1.0 / 2.2));
    col = max(col, hotC * aRoot * rootW * (0.8 + 0.35 * breath));
    col *= 1.0 + 0.3 * breath;
    return vec4(col * 1.1 * FAN_AMT, aRoot);
}

// ============================================================================
// GIANT — the vast curved limb of the star we orbit; texture lives on the 3D sphere
// ============================================================================
float hash31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float n3(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), f.x), mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x), mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
vec3 spinAxis(vec3 v, vec3 A, float a) { return v * cos(a) + cross(A, v) * sin(a) + A * dot(A, v) * (1.0 - cos(a)); }

vec3 giantSurface(vec2 p, float z, float rot, float boil) {
    vec3 A = normalize(vec3(-0.28, 0.93, 0.24));
    vec3 N = spinAxis(vec3(p, z), A, rot);
    vec3 X = N * 2.2;
    float bz = boil * 0.06;
    float wx = n3(X * 1.7 + vec3(0.0, bz, 0.0)) - 0.5;
    vec2 w = vec2(wx, -wx);
    X += normalize(cross(N, A) + 1e-4) * wx * 0.8 + N * wx * 0.2;
    float dfine = smoothstep(0.03, 0.3, z);
    float sgN = n3(X * 3.1 + bz * 2.0);
    float net = smoothstep(0.82, 0.97, 1.0 - abs(2.0 * sgN - 1.0));
    float g1 = n3(mat3(0.80, 0.36, -0.48, -0.60, 0.48, -0.64, 0.0, 0.80, 0.60) * X * 17.0 + vec3(0.0, 0.0, boil * 0.35) + w.xyx * 2.0);
    float g2 = dfine > 0.02 ? n3(mat3(0.36, -0.48, 0.80, 0.80, 0.60, 0.0, -0.48, 0.64, 0.60) * X * 41.0 - vec3(boil * 0.5, 0.0, 0.0)) : g1;
    float Gm = mix(g1 * 0.62 + g2 * 0.38, g1, 1.0 - dfine);
    float core = smoothstep(0.42, 0.66, Gm);
    float laneA = 1.0 - smoothstep(0.26, 0.42, Gm);
    vec3 e1 = normalize(cross(A, vec3(0.0, 0.0, 1.0))), e2 = cross(A, e1);
    float umb = 0.0, pen = 0.0, moat = 0.0, plage = 0.0, rib = 0.0, pfil = 0.0;
    for (int k = 0; k < 4; k++) {
        float gk = floor(float(k) * 0.5);
        float lk = gk * 2.1 + 0.4 + 0.11 * mod(float(k), 2.0), bk = (hash12(vec2(gk, 3.3)) - 0.5) * 0.7 + 0.04 * mod(float(k), 2.0);
        vec3 Ck = (e1 * cos(lk) + e2 * sin(lk)) * cos(bk) + A * sin(bk);
        float rP = (mod(float(k), 2.0) < 0.5 ? 0.075 : 0.045) * (0.8 + 0.4 * hash12(vec2(gk, 9.1)));
        float d = length(N - Ck) * (1.0 + 0.3 * (g1 - 0.5));
        if (d > rP * 3.5) continue;
        vec3 v = N - Ck * dot(N, Ck);
        vec3 t1 = normalize(cross(Ck, A)), t2 = cross(Ck, t1);
        float ang = atan(dot(v, t2), dot(v, t1));
        umb = max(umb, 1.0 - smoothstep(rP * 0.32, rP * 0.5, d));
        pen = max(pen, 1.0 - smoothstep(rP * 0.8, rP * 1.15, d));
        moat = max(moat, 1.0 - smoothstep(rP * 1.15, rP * 2.2, d));
        plage = max(plage, 1.0 - smoothstep(rP * 1.4, rP * 3.4, d));
        if (d < rP * 1.2) pfil = max(pfil, (1.0 - smoothstep(rP * 0.8, rP * 1.15, d)) * s_noise(vec2(ang * 11.0, d * 70.0)));
        float ac = dot(v, t2), al = dot(v, t1);
        rib += exp(-pow((abs(ac) - rP * 1.35) / 0.008, 2.0)) * smoothstep(rP * 1.7, rP * 0.3, abs(al)) * pow(s_noise(vec2(al * 90.0, float(k))), 2.0);
    }
    float fac = net * smoothstep(0.42, 0.06, z) * smoothstep(0.0, 0.03, z);
    float L = 0.58 + 0.12 * core - 0.14 * laneA * (1.0 - 0.6 * moat) + 0.06 * net;
    L += 0.06 * SUN_BREATH * core;
    L += 0.10 * plage * net;
    float Imu = 1.0 - 0.6 * (1.0 - z) - 0.2 * (1.0 - z * z);
    L += 0.06 * z;
    L *= 0.25 + 0.75 * Imu;
    L += 0.11 * fac;
    L *= 0.78 + 0.62 * clamp(SUN_BREATH * 1.6, 0.0, 1.0);
    L = mix(L, L * (0.56 + 0.16 * pfil), pen);
    L = mix(L, 0.27, umb);
    L = min(L, 0.85);
    float C = max(mix(0.20, 0.12, z) * (1.0 - 0.25 * umb) + 0.02 * core, 0.12);
    float hue = mix(40.0, 76.0, pow(z, 0.7)) + 6.0 * (core - 0.5) + 8.0 * (plage * net + fac) - 10.0 * pen;
    return sunLch(L, C, hue) + sunLch(0.82, 0.10, 82.0) * min(rib, 1.0) * 0.04;
}

vec3 giantStar(vec3 f, vec2 uv0) {
    vec2 p = (uv0 - GIANT_C) / GIANT_R;
    float rho = length(p);
    if (rho > 2.4) return f;
    vec2 q = vec2(dot(p, FAN_DIR), dot(p, vec2(-FAN_DIR.y, FAN_DIR.x)));
    float phi = atan(q.y, q.x);
    float hgt = (rho - 1.0) * GIANT_R;
    float boil = BUD_PH;
    float rot = T_S * 0.0035 + boil * 0.009;
    vec3 add = vec3(0.0);
    if (rho > 0.97) {
        float h = max(hgt, 0.0);
        float helm = 0.35 + 0.65 * pow(s_noise(vec2(phi * 2.3 + rot * 3.0, 1.7)), 2.0);
        float fine = pow(s_noise(vec2(phi * 38.0 + rot * 40.0, h * 1.2 - FLUX_PH * 0.08)), 3.0);
        float cor = helm * exp(-h * 1.7) * (0.55 + 0.45 * fine) * (0.35 + 1.3 * SUN_BREATH) * GLOW;
        cor = cor / (1.0 + cor);
        cor *= 1.0 - 0.5 * smoothstep(1.4, 1.8, rho);
        add += sunLch(0.66, 0.10, 72.0) * cor * 0.8;
        float chrom = exp(-h / 0.022) * step(-0.01, hgt) * 1.5;
        float spic = pow(s_noise(vec2(phi * GIANT_R * 120.0, h * 9.0 - boil * 0.6)), 5.0) * exp(-h / 0.045);
        add += sunLch(0.62, 0.17, 58.0) * chrom * 0.9 * (0.6 + 0.4 * GLOW)
             + sunLch(0.78, 0.13, 66.0) * spic * (0.6 + 4.8 * RAY_HATS) * 1.4 * (0.6 + 0.4 * SPARKLE);
        add += sunLch(0.84, 0.12, 86.0) * exp(-abs(hgt) / 0.0035) * 0.7;
        for (int i = 0; i < 4; i++) {
            float lc = BUD_PH * 0.012 + float(i) * 0.25;
            float cyc = fract(lc), id = floor(lc) + float(i) * 7.0;
            float c0 = (hash12(vec2(id, 3.1)) - 0.5) * 1.6;
            float span = (0.05 + 0.07 * hash12(vec2(id, 8.7))) * GIANT_R;
            float H = (0.06 + 0.16 * hash12(vec2(id, 1.3))) * REACH * smoothstep(0.0, 0.45, cyc) + 1e-3;
            float life = smoothstep(0.0, 0.12, cyc) * smoothstep(1.0, 0.7, cyc);
            float sa = (phi - c0) * GIANT_R;
            float e = length(vec2(sa / span, h / H)) - 1.0;
            float ns = noise(vec2(sa * 40.0, h * 30.0 - boil));
            float k = min(span, H);
            float body2 = exp(-pow(e * k / (0.05 * (0.8 + 0.4 * ns)), 2.0));
            float crown = clamp(h / H, 0.0, 1.0);
            float along = atan(h / H, sa / span);
            float flow = 0.6 + 0.4 * s_noise(vec2(along * 2.5 - BUD_PH * 0.55 - FLUX_PH * 2.0, float(i) * 3.7 + id));
            vec3 arch = mix(sunLch(0.56, 0.17, 46.0), sunLch(0.78, 0.14, 76.0), crown) * body2 * flow
                      * (0.6 + 0.4 * s_noise(vec2(sa * 50.0, h * 40.0 + boil * 0.3))) * 1.05;
            add += arch * life * step(-0.02, hgt) * (0.5 + 4.0 * RAY_SWAY);
        }
    }
    vec3 body = vec3(0.0);
    float cov = 0.0;
    if (rho < 1.0) {
        float z = sqrt(max(1.0 - rho * rho, 0.0));
        body = giantSurface(p, z, rot, boil);
        cov = smoothstep(1.0, 0.985, rho);
    }
    return mix(f + add, body, cov);
}

void mainImage(out vec4 O, in vec2 g) {
    vec2 r = iResolution.xy;
    vec2 uv0 = (g + g - r) / r.y;
    float t = T_SKY;
    float sm = 3. / r.y;
    gPhase = HUE_BASE + t * 0.006 + seed;
    gPal = PAL;

    float rhoG = length(uv0 - GIANT_C) / GIANT_R;
    bool hid = rhoG < 0.975;
    vec2 limbP = GIANT_C + FAN_DIR * GIANT_R * 1.02;
    vec3 bg = vec3(0.0);
    vec4 urc = vec4(0.0);
    if (!hid) {
        if (SPACE_MIX < 0.999) bg = sky(uv0, t, sm);
        if (SPACE_MIX > 0.001) bg = mix(bg, deepSpace(uv0), SPACE_MIX);
        bg = bg * (1.0 + 2.5 * FILL) + FILL * 0.06 * mcSky(12.0, 0.7);
        urc = juliaArms(uv0 - limbP);
    }
    float rayM = max(max(urc.r, urc.g), max(urc.b, 1e-4));
    float rayK = rayM < 0.55 ? rayM : 0.55 + 0.25 * (1.0 - exp(-(rayM - 0.55) / 0.25));
    vec3 rays = urc.rgb * (rayK / rayM);
    float rayL = dot(rays, LUMA);
    rays *= rayL > 0.9 ? (0.9 + 0.25 * (rayL - 0.9)) / rayL : 1.0;

    vec3 f = bg * 0.8;
    f -= fbm(uv0 * 100.0) * 0.05;
    f = max(f, vec3(0.0));
    f = giantStar(f, uv0);

    float aF = clamp(urc.a, 0.0, 1.0);
    f = f * (1.0 - aF) + rays;
    vec2 dR = uv0 - limbP;
    float gC = smoothstep(-0.1, 0.5, dot(dR, FAN_DIR) / RB);
    vec3 emC = pow(gamutLch(vec3(mix(0.78, 0.84, gC), 0.13, radians(mix(78.0, 200.0, gC)))), vec3(1.0 / 2.2));
    float breath = clamp(SUN_BREATH * 1.6, 0.0, 1.0);
    float aE = exp(-dot(dR, dR) / (RB * RB * 0.25)) * (0.55 + 0.3 * breath) * (0.5 + 0.5 * smoothstep(0.96, 1.02, rhoG));
    aE = max(aE, exp(-dot(dR, dR) / (max(RB * RB, 0.06) * 0.9)) * (0.6 + 0.25 * breath) * smoothstep(0.96, 1.04, rhoG));
    f = mix(f, emC, aE);
    f = max(f, vec3(0.0));

    // the show's finished-frame knee: OKLab L soft limit, hue-preserving, never white
    vec3 lchB = rgb2oklch(pow(f, vec3(2.2)));
    lchB.x *= mix(1.0, pow(smoothstep(0.03, 0.62, lchB.x), 1.4), DARK_FLOOR);
    lchB.z += HUE_ROT;
    float dWarm = atan(sin(1.31 - lchB.z), cos(1.31 - lchB.z));
    lchB.z += dWarm * WARMTH * (1.0 - smoothstep(1.3, 1.65, rhoG)) * smoothstep(2.0, 0.8, abs(dWarm));
    float cob = smoothstep(0.6, 0.25, abs(atan(sin(lchB.z - 4.55), cos(lchB.z - 4.55)))) * smoothstep(0.98, 1.02, rhoG);
    lchB.x *= 1.0 - 0.15 * cob; lchB.y *= 1.0 + 0.4 * cob;
    if (PAINT_AMT > 0.002) {
        vec2 pd = uv0 - GIANT_C;
        float rhoP = max(length(pd) / GIANT_R, 1e-4);
        float sr = rhoP < 1.0 ? asin(rhoP * 0.96) / 0.96 : asin(0.96) / 0.96 + rhoP - 1.0;
        vec2 pq = rot2(GAL_PH * 0.002) * pd * (sr / rhoP) / GIANT_R * 16.0;
        pq += vec2(noise(uv0 * 3.1), noise(uv0 * 3.1 + 4.7)) * 1.6;
        vec2 pc = floor(pq), pc2 = floor(pq + 0.5);
        float hA = hash12(pc), hB = hash12(pc + 17.3), hC = hash12(pc2 + 5.1);
        float fl = GAL_PH * 0.004 + FLOW_D * 0.01;
        vec2 pf = rot2(9.0 * noise((pc + 0.5) * 0.09 + fl) + (hA - 0.5) * 0.6) * (fract(pq) - 0.5);
        vec2 pf2 = rot2(9.0 * noise(pc2 * 0.09 + fl) + (hC - 0.5) * 0.6) * (fract(pq + 0.5) - 0.5);
        float dab = smoothstep(0.48, 0.12 + 0.18 * hA, length(pf * vec2(1.0, 1.8)));
        float dab2 = smoothstep(0.48, 0.12 + 0.18 * hC, length(pf2 * vec2(1.0, 1.8)));
        float dm = max(dab, dab2);
        vec2 bq = dab >= dab2 ? pf + hA * 37.0 : pf2 + hC * 37.0;
        float bristle = s_noise(vec2(bq.x * 3.0, bq.y * 24.0));
        float jl = mix(hA - 0.5, hC - 0.5, dab2 / max(dab + dab2, 1e-3));
        lchB.x *= (1.0 + PAINT_AMT * (0.40 * jl + 0.25 * (bristle - 0.5) * dm - 0.11)) * (1.0 - PAINT_AMT * 0.18 * (1.0 - dm));
        lchB.y *= 1.0 + PAINT_AMT * 0.35 * hB * dm;
        lchB.z += PAINT_AMT * 0.5 * (hB - 0.5) * dm;
    }
    float wE = (1.0 - smoothstep(1.5, 1.8, rhoG)) * smoothstep(0.8, 0.45, abs(atan(sin(lchB.z - 0.70), cos(lchB.z - 0.70))));
    lchB.z += atan(sin(1.31 - lchB.z), cos(1.31 - lchB.z)) * smoothstep(0.62, 0.80, lchB.x) * wE;
    lchB.y = mix(lchB.y, max(lchB.y, 0.15), wE);
    lchB.y *= 1.0 - 0.8 * smoothstep(0.45, 0.15, abs(atan(sin(lchB.z - 5.72), cos(lchB.z - 5.72))));
    float LB = lchB.x < 0.6 ? lchB.x : 0.6 + 0.22 * (1.0 - exp(-(lchB.x - 0.6) / 0.22));
    f = pow(gamutLch(vec3(max(LB, 0.0), max(lchB.y, 0.0) * (1.15 + 0.12 * TONAL), lchB.z)), vec3(1.0 / 2.2));
    f *= min(1.0, 0.93 / max(max(f.r, f.g), max(f.b, 1e-4)));

    // lamp stage, in linear light: WASH, then COLOR TEMP, then DIM
    vec3 lin = pow(f, vec3(2.2));
    float Y = dot(lin, LUMA);
    lin = mix(lin, pow(Y, 1.0 - 0.45 * WASH) * vec3(1.0, 0.985, 0.95) / dot(vec3(1.0, 0.985, 0.95), LUMA), WASH);
    vec3 warm = lin * pow(vec3(1.0, 0.36, 0.07), vec3(TEMP));
    lin = warm * min(dot(lin, LUMA) / max(dot(warm, LUMA), 1e-5), 3.0);
    lin *= min(1.0, 1.0 / max(max(lin.r, lin.g), max(lin.b, 1e-4)));
    lin *= pow(0.03, DIM);
    f = pow(lin, vec3(1.0 / 2.2));

    if (lp_seam > 0.001) f = mix(f, getLastFrameColor(g / r).rgb, lp_seam);
    f += (hash12(g + fract(lp_u) * 61.0) - 0.5) / 255.0;
    O = vec4(clamp(f, 0.0, 1.0), 1.0);
}
