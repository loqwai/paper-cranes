// @fullscreen: true
// @mobile: false
// @tags: sun, lamp, ambient, claude
// preset: https://visuals.beadfamous.com/?shader=sun/lamp/3&controller=sun-lamp&noaudio=true
// preset: https://visuals.beadfamous.com/?shader=sun/lamp/3&controller=sun-lamp&noaudio=true&knob_18=0.8&knob_4=0.35&knob_11=0.25
// SUN LAMP 3: sun/17's giant as office light for a projector, alive like the show without music. A
// synthetic, never-repeating "music" on the controller's lp_m clock (K16 ANIMATE sets its rate) breathes the corona, fan,
// prominences, granulation and sparkle, swells every minute or two and fires rare soft events. The
// dialled-in sun (size, place, colour, light) never moves. 0 on every dial is the full-brightness look.

#define TAU 6.28318530718
#define PI  3.14159265359

uniform float lp_u, lp_e, lp_m, lp_seam, lp_seamE;

// ============================================================================
// KNOBS — 0 everywhere is the designed look
// @knob: 1 DIM
// @knob: 2 HUE SPIN
// @knob: 3 FAN
// @knob: 4 SUN SIZE
// @knob: 5 COLOR TEMP
// @knob: 6 ERUPT
// @knob: 7 SPEED
// @knob: 8 SKY SWAP
// @knob: 9 FILL
// @knob: 10 PAINT
// @knob: 11 SUN COLOR
// @knob: 12 SPIRAL
// @knob: 13 GLOW
// @knob: 14 DARK
// @knob: 15 SUN X
// @knob: 16 ANIMATE
// @knob: 17 WASH
// @knob: 18 DAY CYCLE
// @knob: 19 SUN Y
// ============================================================================
#define DIM        (knob_1)                    // K1 DIM master dimmer, applied last
#define HUE_ROT    (knob_2 * TAU)              // K2 HUE SPIN turns the whole finished palette
#define FAN_AMT    (1.4 + 1.2 * knob_3)        // K3 FAN arm brightness
#define FAN_S      (1.02 + 1.3 * knob_3)       // K3 FAN arm reach
#define SIZE_R     (1.1 * pow(4.5, knob_4))    // K4 SUN SIZE radius 1.1 .. 5 half-heights, past the wall
#define TEMP       (knob_5)                    // K5 COLOR TEMP neutral to ~1900K candle
#define ERUPT      (knob_6)                    // K6 ERUPT boil, giant arcs, flare blasts
#define SPACE_MIX  (knob_8)                    // K8 SKY SWAP day tiles to deep space
#define FILL       (knob_9)                    // K9 FILL lifts the background in its own hues
#define PAINT_AMT  (knob_10)                   // K10 PAINT brush dabs
#define SUN_COLOR  (knob_11)                   // K11 SUN COLOR gold, orange, ember, crimson
#define SPIRAL     (knob_12)                   // K12 SPIRAL swirl, then kaleidoscope past 0.6
#define GLOW       (0.4 + 4.0 * knob_13)       // K13 GLOW corona and chromosphere
#define DARK_FLOOR (knob_14)                   // K14 DARK sinks the darks
#define SUN_X      (0.87 * (1.0 - 2.0 * knob_15))    // K15 SUN X home, centre at 0.5, mirrored at 1
#define SUN_Y      (-1.28 * (1.0 - 2.0 * knob_19))   // K19 SUN Y home, centre at 0.5, mirrored at 1
#define WASH       (knob_17)                   // K17 WASH toward near-white light
#define DAY        (knob_18)                   // K18 DAY CYCLE sunrise, noon, sunset, night
#define LIFE       smoothstep(0.0, 0.15, knob_16)   // K16 ANIMATE off at 0 (lamp 2 stillness), show pace at 1
#define GIANT_C    gSunC
#define GIANT_R    gSunR
#define FAN_DIR    vec2(-0.5622, 0.8271)
#define SKY_C      GIANT_C
#define RB         0.30
#define HY         (-0.42)
#define KSEG       (TAU / 6.0)

// clocks: lp_u at the show's average-music rates, plus the bounded integral of the synthetic music
#define T_SKY   (lp_u)
#define T_S     (lp_u)
#define BUD_PH  gBud
#define GAL_PH  (lp_u * 0.05)
#define FLUX_PH gFlux
#define FLOW_D  gFlow
#define PAL     (lp_u * 0.00093)
#define SKY_ROT (BUD_PH * 0.014)
#define BOIL    gBoil
#define MUSIC_W 8192.0

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
vec2 gSunC;
float gSunR;
float gTex;
float gDay, gLit, gGold, gNight;
vec3 gHorC;
float gLife, gBreath, gSway, gHats, gSwell;
float gEvP, gEvF, gEvR, gEvC, gEvX, gEvA;
float gBud, gBoil, gFlow, gFlux, gChurn;

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

float wv(float n, float p) { return sin(TAU * (fract(lp_m * (n / MUSIC_W)) + p)); }
float wvI(float n, float p) { return -cos(TAU * (fract(lp_m * (n / MUSIC_W)) + p)) * MUSIC_W / (TAU * n); }

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
    vec3 latCol = mc(14.0, 0.55 + 0.3 * lat.y) * lat.x * (LATTICE_LIT + 0.5 * gSwell * gLife) * (1.0 + gHats * 0.8 + 0.3 * AIR) * 1.6 * 2.5;
    f = mix(f, f * 0.55 + latCol, clamp(lat.z, 0.0, 1.0) * vis);

    f *= 1.0 + (0.3 + 1.2 * gBreath) * 0.8 / (1.0 + L * 6.0);
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
    float armM = pow(arm, mix(3.5 - 0.8 * BODY, 1.2, clamp(gBreath * 1.3, 0.0, 1.0)));
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
    float cPh = GAL_PH * 0.05 + FLUX_PH * 0.11 + FLOW_D * 0.25 + gChurn;
    vec2 c = 0.7885 * vec2(sin(4.97), cos(4.97)) + 0.018 * vec2(cos(cPh), sin(cPh));
    float S = FAN_S * (1.0 + 0.22 * sin(a0 + 2.1) + 0.12 * sin(3.0 * a0 + 0.4)) * (1.0 + 0.1 * gEvF);
    if (r > S * 2.6 || r < RB * 0.6) return vec4(0.0);
    float rr0 = pow(r / S, 0.7);
    a += (0.52 + 1.8 * min(SPIRAL / 0.6, 1.0)) * log(max(r / S, 0.05));
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
    float breath = clamp(gBreath * 1.5, 0.0, 1.0);
    vec3 col = bodyC * body * (0.6 + 0.9 * gBreath)
             + sunLch(0.70, 0.16, 58.0) * curls * (0.4 + 1.4 * gSway)
             + pow(gamutLch(vec3(0.72, 0.14, radians(225.0))), vec3(1.0 / 2.2)) * fils * (0.35 + 1.6 * gHats) * 2.5
             + sunLch(0.76, 0.15, 84.0) * beads * (0.3 + 1.5 * gHats);
    float inFill = interior * out0 * (0.55 + 0.45 * exp(-tCi * 6.0)) * (1.0 - 0.5 * tip);
    col += pow(gamutLch(vec3(0.54, 0.13, radians(200.0))), vec3(1.0 / 2.2)) * inFill * 0.55;
    col *= (1.0 + 0.9 * (0.35 + 0.65 * breath)) * (1.0 + 0.6 * breath);
    float aRoot = max(max(body, fils), 0.5 * inFill);
    float rootT = smoothstep(RB, S * 0.9, r);
    float rootW = 1.0 - smoothstep(RB * 1.1, S * 1.1, r);
    vec3 hotC = pow(gamutLch(vec3(mix(0.86, 0.80, rootT), 0.14, radians(mix(80.0, 205.0, rootT)))), vec3(1.0 / 2.2));
    col = max(col, hotC * aRoot * rootW * (0.8 + 0.35 * breath));
    col *= 1.0 + 0.3 * breath;
    return vec4(col * 1.1 * FAN_AMT * (1.0 + 0.25 * gEvF), aRoot);
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
    vec3 X = N * 2.2 * gTex;
    float E = ERUPT;
    float bz = boil * 0.06;
    float wx = n3(X * 1.7 + vec3(0.0, bz, 0.0)) - 0.5;
    vec2 w = vec2(wx, -wx);
    X += normalize(cross(N, A) + 1e-4) * wx * (0.8 + 1.4 * E) + N * wx * 0.2;
    float dfine = smoothstep(0.03, 0.3, z);
    float sgN = n3(X * 3.1 + bz * 2.0);
    float net = smoothstep(0.82, 0.97, 1.0 - abs(2.0 * sgN - 1.0));
    float g1 = n3(mat3(0.80, 0.36, -0.48, -0.60, 0.48, -0.64, 0.0, 0.80, 0.60) * X * 17.0 + vec3(0.0, 0.0, boil * 0.35) + w.xyx * 2.0);
    float g2 = dfine > 0.02 ? n3(mat3(0.36, -0.48, 0.80, 0.80, 0.60, 0.0, -0.48, 0.64, 0.60) * X * 41.0 - vec3(boil * 0.5, 0.0, 0.0)) : g1;
    float Gm = mix(g1 * 0.62 + g2 * 0.38, g1, 1.0 - dfine);
    float core = smoothstep(0.42, 0.66, Gm);
    float laneA = 1.0 - smoothstep(0.26, 0.42, Gm);
    vec3 e1 = normalize(cross(A, vec3(0.0, 0.0, 1.0))), e2 = cross(A, e1);
    float umb = 0.0, pen = 0.0, moat = 0.0, plage = 0.0, rib = 0.0, pfil = 0.0, ribW = 0.0;
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
        ribW += exp(-pow((abs(ac) - rP * 1.35) / 0.03, 2.0)) * smoothstep(rP * 2.2, rP * 0.2, abs(al));
    }
    float fac = net * smoothstep(0.42, 0.06, z) * smoothstep(0.0, 0.03, z);
    float L = 0.58 + (0.12 + 0.10 * E) * core - (0.14 + 0.12 * E) * laneA * (1.0 - 0.6 * moat) + 0.06 * net;
    L += 0.06 * SUN_BREATH * core + 0.16 * E * smoothstep(0.62, 0.85, Gm);
    L += (0.10 + 0.20 * E) * plage * net;
    L = 0.58 + (L - 0.58) * (1.0 + 0.6 * (gBreath - SUN_BREATH));
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
    return sunLch(L, C, hue) + sunLch(0.82, 0.10, 82.0) * min(rib, 1.0) * (0.04 + 0.8 * E)
         + sunLch(0.84, 0.12, 80.0) * (min(rib, 1.0) * 2.5 + min(ribW, 1.0) * 0.9) * gEvR;
}

vec3 giantStar(vec3 f, vec2 uv0) {
    vec2 p = (uv0 - GIANT_C) / GIANT_R;
    float rho = length(p);
    float hgt = (rho - 1.0) * GIANT_R;
    if (hgt > 2.2) return f;
    vec2 q = vec2(dot(p, FAN_DIR), dot(p, vec2(-FAN_DIR.y, FAN_DIR.x)));
    float phi = atan(q.y, q.x);
    float boil = BOIL;
    float rot = T_S * 0.0035 + BUD_PH * 0.009;
    float E = ERUPT;
    vec3 add = vec3(0.0);
    float occ = 0.0;
    if (rho > 0.97) {
        float h = max(hgt, 0.0);
        float helm = 0.35 + 0.65 * pow(s_noise(vec2(phi * 2.3 + rot * 3.0, 1.7)), 2.0);
        float fine = pow(s_noise(vec2(phi * 38.0 + rot * 40.0, h * 1.2 - FLUX_PH * 0.08)), 3.0);
        float cor = helm * exp(-h * 1.7 / (1.0 + 1.5 * knob_13)) * (0.55 + 0.45 * fine) * (0.35 + 1.3 * gBreath) * GLOW * (1.0 + 0.5 * E);
        cor = cor / (1.0 + cor);
        cor *= (1.0 - 0.5 * smoothstep(1.4, 1.8, rho)) * smoothstep(2.2, 1.3, h);
        add += sunLch(0.70, 0.13, 70.0) * cor * 0.8 * (1.0 + 2.5 * knob_13);
        occ = clamp(cor * 1.6, 0.0, 1.0) * 0.9 * knob_13;
        float chrom = exp(-h / 0.022) * step(-0.01, hgt) * 1.5;
        float spic = pow(s_noise(vec2(phi * GIANT_R * 120.0, h * 9.0 - boil * 0.6)), 5.0) * exp(-h / (0.045 * (1.0 + E)));
        add += sunLch(0.62, 0.17, 58.0) * chrom * 0.9 * (0.6 + 0.4 * GLOW) * (1.0 + 0.8 * gEvR)
             + sunLch(0.78, 0.13, 66.0) * spic * (0.6 + 4.8 * gHats) * 1.4 * 1.6 * (1.0 + 2.0 * E) * (1.0 + 1.5 * gEvR);
        add += sunLch(0.84, 0.12, 86.0) * exp(-abs(hgt) / 0.0035) * 0.7;
        for (int i = 0; i < 6; i++) {
            float wI = i < 4 ? 1.0 : smoothstep(0.15, 0.5, E);
            if (wI < 0.001) continue;
            float lc = boil * 0.012 + float(i) * 0.27;
            float cyc = fract(lc), id = floor(lc) + float(i) * 7.0;
            float c0 = (hash12(vec2(id, 3.1)) - 0.5) * 2.8;
            float span = (0.05 + 0.07 * hash12(vec2(id, 8.7))) * GIANT_R * (1.0 + 2.5 * E);
            float H = (0.06 + 0.16 * hash12(vec2(id, 1.3))) * 1.78 * (1.0 + 3.5 * E) * (1.0 + 1.3 * gEvP) * smoothstep(0.0, 0.45, cyc) + 1e-3;
            float life = smoothstep(0.0, 0.12, cyc) * smoothstep(1.0, 0.7, cyc);
            float sa = (phi - c0) * GIANT_R;
            float ns = noise(vec2(sa * 40.0, h * 30.0 - boil));
            vec2 en = vec2(sa / span, h / H);
            float dE = (dot(en, en) - 1.0) / max(2.0 * length(vec2(en.x / span, en.y / H)), 1e-4);
            float body2 = exp(-pow(dE / (0.05 * (0.8 + 0.4 * ns) * (1.0 + 0.5 * E)), 2.0));
            float crown = clamp(h / H, 0.0, 1.0);
            float along = atan(h / H, sa / span);
            float flow = 0.6 + 0.4 * s_noise(vec2(along * 2.5 - BUD_PH * 0.55 - FLUX_PH * 2.0, float(i) * 3.7 + id));
            vec3 arch = mix(sunLch(0.56, 0.17, 46.0), sunLch(0.78, 0.14, 76.0), crown) * body2 * flow
                      * (0.6 + 0.4 * s_noise(vec2(sa * 50.0, h * 40.0 + boil * 0.3))) * 1.05;
            add += arch * life * step(-0.02, hgt) * (0.5 + 4.0 * gSway) * (1.0 + 0.4 * E) * (1.0 + 0.5 * gEvP) * wI;
        }
        if (gEvC > 0.001) {
            vec2 dir = rot2(-gEvA) * FAN_DIR;
            float Rb = (0.15 + 0.9 * gEvX) * min(GIANT_R, 2.0);
            float dP = length(uv0 - (GIANT_C + dir * GIANT_R));
            float plume = smoothstep(Rb, Rb * 0.55, dP) * smoothstep(0.0, 0.05, hgt) * fbm(uv0 * 3.0 - dir * gEvX * 2.0);
            add += sunLch(0.70, 0.16, 56.0) * plume * 0.4 * gEvC * (1.0 - smoothstep(1.15, 1.3, rho));
        }
        float bA = smoothstep(0.55, 0.9, E);
        if (bA > 0.001) {
            for (int j = 0; j < 2; j++) {
                float bl = boil * 0.06 + float(j) * 0.5;
                float fc = fract(bl), bid = floor(bl) + float(j) * 13.0;
                float sa = (phi - (hash12(vec2(bid, 4.2)) - 0.5) * 2.6) * GIANT_R;
                float wd = 0.05 + 0.14 * h;
                float x = sa / wd;
                float front = (0.15 + 2.0 * sqrt(fc)) * (0.75 + 0.5 * s_noise(vec2(x * 1.5, bid)));
                float streak = pow(s_noise(vec2(x * 6.0, h * 2.5 - boil * 0.5)), 2.0) * (0.5 + 0.5 * s_noise(vec2(x * 16.0, h * 6.0 - boil)));
                float jet = exp(-x * x) * smoothstep(front, front * 0.6, h) * step(-0.01, hgt) * (0.6 + 1.2 * streak);
                float env = smoothstep(0.0, 0.06, fc) * (1.0 - fc);
                float flash = exp(-pow(sa / 0.12, 2.0)) * exp(-h / 0.06) * exp(-fc * 6.0);
                vec3 jetC = mix(sunLch(0.74, 0.16, 58.0), sunLch(0.92, 0.08, 88.0), exp(-x * x * 2.0) * (1.0 - 0.5 * h / max(front, 0.1)));
                float jA = clamp(jet * env * bA, 0.0, 1.0);
                occ = max(occ, jA * 0.8);
                add += (jetC * jet * env * 2.0 + sunLch(0.92, 0.06, 90.0) * flash * 1.6) * bA;
            }
        }
    }
    vec3 body = vec3(0.0);
    float cov = 0.0;
    if (rho < 1.0) {
        float z = sqrt(max(1.0 - rho * rho, 0.0));
        body = giantSurface(p, z, rot, boil);
        cov = smoothstep(1.0, 0.985, rho);
    }
    float lit = 1.0 - gNight * gDay;
    return mix(f * (1.0 - occ * lit) + add * lit, body, cov);
}

// ============================================================================
// DAY CYCLE — horizon, atmosphere and sea
// ============================================================================
vec3 lchc(float L, float C, float h) { return pow(gamutLch(vec3(L, C, radians(h))), vec3(1.0 / 2.2)); }

vec3 atmosphere(vec2 uv) {
    float h = max(uv.y - HY, 0.0);
    float t = pow(clamp(h / 1.45, 0.0, 1.0), 0.55);
    vec3 zen = mix(lchc(0.16, 0.06, 268.0), lchc(0.56, 0.13, 250.0), gLit);
    zen = mix(zen, lchc(0.34, 0.12, 285.0), gGold * 0.7);
    vec3 mid = mix(mix(gHorC, zen, 0.5), lchc(0.52, 0.15, 12.0), gGold);
    vec3 c = t < 0.5 ? mix(gHorC, mid, smoothstep(0.0, 0.5, t)) : mix(mid, zen, smoothstep(0.5, 1.0, t));
    float dd = max(length(uv - GIANT_C) - GIANT_R, 0.0);
    c += lchc(0.80, 0.13, 64.0) * exp(-dd * 2.2) * (0.25 + 0.8 * gGold) * (1.0 - gNight);
    c += lchc(0.68, 0.17, 38.0) * exp(-h / 0.12) * exp(-abs(uv.x - GIANT_C.x) * 0.7) * gGold * 0.7;
    if (gNight > 0.01) {
        vec2 sg = uv * 34.0;
        vec2 cid = floor(sg);
        float hs = hash12(cid);
        vec2 sp = fract(sg) - 0.5 - (hash22(cid + 3.1) - 0.5) * 0.3;
        float star = step(0.9, hs) * exp(-dot(sp, sp) / 0.010) * smoothstep(0.34, 0.18, length(sp)) * (0.7 + 0.3 * sin(lp_u * 1.3 + hs * 40.0));
        c += mix(vec3(0.75, 0.8, 1.0), vec3(1.0, 0.85, 0.7), hash12(cid + 9.0)) * star * 1.4 * gNight * smoothstep(0.0, 0.15, h);
    }
    return c;
}

vec3 sea(vec2 uv) {
    float dp = HY - uv.y;
    vec3 c = mix(gHorC, lchc(0.42, 0.10, 238.0), 0.6 * gLit * (1.0 - gGold)) * mix(0.6, 0.15, smoothstep(0.0, 0.55, dp));
    float w = (0.1 + 0.6 * dp) * min(GIANT_R, 2.0) * 0.5 + 0.05;
    float col = exp(-pow((uv.x - GIANT_C.x) / w, 2.0));
    float rip = pow(s_noise(vec2(uv.x * 9.0 / (0.3 + dp), 2.2 / (dp + 0.04) + lp_u * 0.5)), 3.0);
    float lit = (1.0 - gNight) * (0.5 * gLit + 1.2 * gGold) * smoothstep(-0.3, 0.05, GIANT_C.y + GIANT_R - HY);
    c += lchc(0.82, 0.14, 62.0) * col * (0.25 + 2.2 * rip) * lit;
    c += gHorC * pow(s_noise(vec2(uv.x * 14.0 / (0.3 + dp), 3.0 / (dp + 0.04) - lp_u * 0.3)), 6.0) * 0.4;
    return c;
}

// ============================================================================
// SPIRAL — a log-spiral twist round the sun, then a six-way smooth kaleidoscope
// ============================================================================
vec2 swirl(vec2 uv) {
    float w = min(SPIRAL / 0.6, 1.0) - 0.85 * smoothstep(0.6, 0.72, SPIRAL) + 0.5 * smoothstep(0.72, 1.0, SPIRAL);
    if (w < 0.001) return uv;
    vec2 d = uv - GIANT_C;
    return GIANT_C + rot2(w * 2.2 * log(max(length(d) / GIANT_R, 1.0))) * d;
}

vec2 kaleido(vec2 uv, float w) {
    vec2 d = uv - GIANT_C;
    if (dot(d, d) < 1e-8) return uv;
    float a0 = atan(FAN_DIR.y, FAN_DIR.x) + lp_u * 0.01;
    float a = atan(d.y, d.x) - a0;
    a = atan(sin(a), cos(a));
    float af = KSEG / PI * asin(0.985 * sin(PI * a / KSEG));
    float aT = a0 + mix(a, af, w);
    return GIANT_C + length(d) * vec2(cos(aT), sin(aT));
}

vec4 sceneAt(vec2 uv0, float t, float sm) {
    float rhoG = length(uv0 - GIANT_C) / GIANT_R;
    bool hid = rhoG < 0.975;
    vec2 limbP = GIANT_C + FAN_DIR * GIANT_R * 1.02;
    vec2 uvS = swirl(uv0);
    float fanMul = clamp(1.0 - gDay * (0.75 + 0.25 * gNight), 0.0, 1.0);
    vec3 bg = vec3(0.0);
    vec4 urc = vec4(0.0);
    if (!hid) {
        if (gDay < 0.999) {
            if (SPACE_MIX < 0.999) bg = sky(uvS, t, sm);
            if (SPACE_MIX > 0.001) bg = mix(bg, deepSpace(uvS), SPACE_MIX);
        }
        if (gDay > 0.001) bg = mix(bg, atmosphere(uv0) * 1.25, gDay);
        bg = bg * (1.0 + 2.5 * FILL) + FILL * 0.06 * mcSky(12.0, 0.7);
        urc = juliaArms(uvS - limbP) * fanMul;
    }
    float rayM = max(max(urc.r, urc.g), max(urc.b, 1e-4));
    float rayK = rayM < 0.55 ? rayM : 0.55 + 0.25 * (1.0 - exp(-(rayM - 0.55) / 0.25));
    vec3 rays = urc.rgb * (rayK / rayM);
    float rayL = dot(rays, LUMA);
    rays *= rayL > 0.9 ? (0.9 + 0.25 * (rayL - 0.9)) / rayL : 1.0;

    vec3 f = bg * 0.8;
    if (!hid) f -= fbm(uv0 * 100.0) * 0.05 * (1.0 - 0.7 * gDay);
    f = max(f, vec3(0.0));
    f = giantStar(f, uv0);

    f = f * (1.0 - clamp(urc.a, 0.0, 1.0)) + rays;
    vec2 dR = uv0 - limbP;
    float gC = smoothstep(-0.1, 0.5, dot(dR, FAN_DIR) / RB);
    vec3 emC = pow(gamutLch(vec3(mix(0.78, 0.84, gC), 0.13, radians(mix(78.0, 200.0, gC)))), vec3(1.0 / 2.2));
    float breath = clamp(gBreath * 1.6, 0.0, 1.0);
    float aE = exp(-dot(dR, dR) / (RB * RB * 0.25)) * (0.55 + 0.3 * breath) * (0.5 + 0.5 * smoothstep(0.96, 1.02, rhoG));
    aE = max(aE, exp(-dot(dR, dR) / (max(RB * RB, 0.06) * 0.9)) * (0.6 + 0.25 * breath) * smoothstep(0.96, 1.04, rhoG));
    f = mix(f, emC, aE * fanMul);
    if (gDay > 0.001 && uv0.y < HY + 0.004) f = mix(f, sea(uv0), smoothstep(0.0, 0.25, gDay) * smoothstep(HY + 0.004, HY - 0.004, uv0.y));
    return vec4(max(f, vec3(0.0)), rhoG);
}

void mainImage(out vec4 O, in vec2 g) {
    vec2 r = iResolution.xy;
    vec2 uv0 = (g + g - r) / r.y;
    float t = T_SKY;
    float sm = 3. / r.y;
    gPhase = HUE_BASE + t * 0.006 + seed;
    gLife = LIFE;
    float gb = 0.22 * wv(103.0, 0.13) + 0.15 * wv(167.0, 0.71) + 0.10 * wv(271.0, 0.37) + 0.06 * wv(409.0, 0.90);
    float gbI = 0.22 * wvI(103.0, 0.13) + 0.15 * wvI(167.0, 0.71) + 0.10 * wvI(271.0, 0.37) + 0.06 * wvI(409.0, 0.90);
    float sx = fract(lp_m / 32.0), sid = floor(lp_m / 32.0);
    gSwell = smoothstep(0.15, 0.6, hash12(vec2(sid, 5.7))) * smoothstep(0.0, 0.7, sx) * (1.0 - smoothstep(0.7, 1.0, sx));
    gBreath = mix(SUN_BREATH, clamp(0.4 + gb + 0.35 * gSwell, 0.0, 1.0), gLife);
    gSway = mix(RAY_SWAY, clamp(0.3 + 0.12 * wv(601.0, 0.21) + 0.08 * wv(997.0, 0.55) + 0.05 * wv(1543.0, 0.08) + 0.25 * gSwell, 0.0, 1.0), gLife);
    gHats = mix(RAY_HATS, clamp(0.25 + 0.10 * wv(1801.0, 0.4) + 0.07 * wv(2903.0, 0.83) + 0.05 * wv(4111.0, 0.27) + 0.2 * gSwell, 0.0, 1.0), gLife);
    float ex = fract(lp_m / 128.0), eid = floor(lp_m / 128.0);
    float on = step(0.35, hash12(vec2(eid, 1.9)));
    float ec = 0.2 + 0.6 * hash12(vec2(eid, 7.3));
    float ev = on * smoothstep(ec - 0.1, ec, ex) * (1.0 - smoothstep(ec, ec + 0.15, ex)) * gLife;
    float kind = floor(hash12(vec2(eid, 4.4)) * 4.0);
    gEvP = ev * step(abs(kind - 0.0), 0.5);
    gEvF = ev * step(abs(kind - 1.0), 0.5);
    gEvR = ev * step(abs(kind - 2.0), 0.5);
    gEvC = ev * step(abs(kind - 3.0), 0.5);
    gEvX = clamp((ex - ec + 0.1) / 0.25, 0.0, 1.0);
    gEvA = (hash12(vec2(eid, 2.6)) - 0.5) * 1.4;
    gBud = lp_u * 0.86 + gLife * 0.2 * gbI;
    gBoil = lp_e * 0.86 + gLife * 0.2 * gbI;
    gFlow = lp_u * 1.16 + gLife * 0.3 * gbI;
    gFlux = lp_u * 0.14 + gLife * 0.015 * (0.6 * wvI(331.0, 0.17) + 0.4 * wvI(557.0, 0.62));
    gChurn = (eid + mix(ex, smoothstep(ec - 0.1, ec + 0.15, ex), on * gLife)) * (TAU * 3.0 / 64.0);
    gPal = PAL + gLife * 0.04 * wv(53.0, 0.3);

    float e = sin(PI * (DAY - 0.12) / 0.72);
    gDay = smoothstep(0.0, 0.12, DAY);
    gLit = smoothstep(-0.1, 0.45, e);
    gGold = exp(-pow((e - 0.06) / 0.3, 2.0)) * gDay;
    gNight = smoothstep(-0.05, -0.4, e);
    gHorC = mix(mix(lchc(0.24, 0.06, 258.0), lchc(0.86, 0.05, 228.0), gLit), lchc(0.74, 0.17, 50.0), gGold);
    gSunR = SIZE_R;
    gTex = pow(gSunR / 1.1, 0.6);
    vec2 path = vec2(mix(1.25, -1.25, clamp((DAY - 0.12) / 0.72, 0.0, 1.0)), HY + e * (1.15 + 0.5 * gSunR) - gSunR * (0.4 + 0.9 * smoothstep(0.0, -0.4, e)));
    gSunC = mix(vec2(SUN_X, SUN_Y), path, gDay);

    float kw = smoothstep(0.6, 0.72, SPIRAL);
    vec4 sc = sceneAt(kw > 0.001 ? kaleido(uv0, kw) : uv0, t, sm);
    vec3 f = sc.rgb;
    float rhoG = sc.a;

    // the show's finished-frame knee: OKLab L soft limit, hue-preserving, never white
    vec3 lchB = rgb2oklch(pow(f, vec3(2.2)));
    lchB.x *= mix(1.0, pow(smoothstep(0.03, 0.62, lchB.x), 1.4), DARK_FLOOR);
    float sunC = max(SUN_COLOR, gGold * 0.55);
    float dG = atan(sin(1.31 - lchB.z), cos(1.31 - lchB.z));
    float win = smoothstep(1.5, 0.8, abs(dG)) * smoothstep(0.0, 0.04, lchB.y);
    float tgt = radians(mix(62.0, 24.0, sunC * sunC));
    lchB.z += atan(sin(tgt - lchB.z), cos(tgt - lchB.z)) * win * smoothstep(0.0, 0.2, sunC) * 0.9;
    lchB.y *= 1.0 + 0.9 * sunC * win;
    float Lc = mix(1.0, mix(0.78, 0.62, sunC * sunC), smoothstep(0.0, 0.15, sunC));
    lchB.x = mix(lchB.x, min(lchB.x, Lc + 0.25 * max(lchB.x - Lc, 0.0)), win);
    lchB.z += HUE_ROT;
    float cob = smoothstep(0.6, 0.25, abs(atan(sin(lchB.z - 4.55), cos(lchB.z - 4.55)))) * smoothstep(0.98, 1.02, rhoG) * (1.0 - gDay);
    lchB.x *= 1.0 - 0.15 * cob; lchB.y *= 1.0 + 0.4 * cob;
    if (PAINT_AMT > 0.002) {
        vec2 pd = uv0 - GIANT_C;
        float rhoP = max(length(pd) / GIANT_R, 1e-4);
        float sr = rhoP < 1.0 ? asin(rhoP * 0.96) / 0.96 : asin(0.96) / 0.96 + rhoP - 1.0;
        vec2 pq = rot2(GAL_PH * 0.002) * pd * (sr / rhoP) / GIANT_R * 16.0 * gTex;
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
    float wE = (1.0 - smoothstep(1.5, 1.8, rhoG)) * smoothstep(0.8, 0.45, abs(atan(sin(lchB.z - 0.70), cos(lchB.z - 0.70)))) * (1.0 - smoothstep(0.0, 0.25, sunC));
    lchB.z += atan(sin(1.31 - lchB.z), cos(1.31 - lchB.z)) * smoothstep(0.62, 0.80, lchB.x) * wE;
    lchB.y = mix(lchB.y, max(lchB.y, 0.15), wE);
    lchB.y *= 1.0 - 0.8 * (1.0 - 0.85 * gGold) * smoothstep(0.45, 0.15, abs(atan(sin(lchB.z - 5.72), cos(lchB.z - 5.72))));
    float LB = lchB.x < 0.6 ? lchB.x : 0.6 + 0.22 * (1.0 - exp(-(lchB.x - 0.6) / 0.22));
    f = pow(gamutLch(vec3(max(LB, 0.0), max(lchB.y, 0.0) * (1.15 + 0.12 * TONAL), lchB.z)), vec3(1.0 / 2.2));
    f *= min(1.0, 0.93 / max(max(f.r, f.g), max(f.b, 1e-4)));

    // lamp stage, in linear light: WASH, then COLOR TEMP, then DIM
    vec3 lin = pow(f, vec3(2.2));
    float Y = dot(lin, LUMA);
    lin = mix(lin, pow(Y, 1.0 - 0.6 * WASH) * vec3(1.0, 0.985, 0.95) / dot(vec3(1.0, 0.985, 0.95), LUMA), WASH);
    lin = mix(lin, vec3(dot(lin, LUMA)), 0.7 * sqrt(TEMP));
    vec3 warm = lin * pow(vec3(1.0, 0.36, 0.07), vec3(TEMP));
    lin = warm * min(dot(lin, LUMA) / max(dot(warm, LUMA), 1e-5), 3.0);
    float lM = max(max(lin.r, lin.g), lin.b);
    float lY = dot(lin, LUMA);
    lin = mix(lin, vec3(lY), clamp((lM - 1.0) / max(lM - lY, 1e-5), 0.0, 1.0));
    lin *= pow(0.03, DIM);
    f = pow(lin, vec3(1.0 / 2.2));

    float seam = max(lp_seam, lp_seamE);
    if (seam > 0.001) f = mix(f, getLastFrameColor(g / r).rgb, seam);
    f += (hash12(g + fract(lp_u) * 61.0) - 0.5) / 255.0;
    O = vec4(clamp(f, 0.0, 1.0), 1.0);
}
