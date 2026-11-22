// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: galactic, nebula, vivid, body, seeded, clit-set, journey, knobs
// preset: https://visuals.beadfamous.com/?shader=clit-set/4&controller=clit-set
// CLIT-SET/4 — NEBULA. The clit-set/2 voyage as an emission nebula: the body glows like lit gas,
// the lace burns as two families of filaments in two different colours, and the sky behind is
// layered multi-colour dust with parallax stars. High chroma everywhere (OKLCH), no grey, and the
// hot-magenta band is cut out of the hue wheel
// (and olive, which reads as mud). Same controller, knob map and waypoints as 2.frag.

uniform float cs_on, cs_time, cs_presence, cs_flow;
uniform float cs_kick, cs_bass, cs_mids, cs_treb;
uniform float cs_build, cs_drop, cs_jump, cs_shift, cs_hue;
uniform float cs_cx, cs_cy, cs_lz, cs_rot, cs_curl, cs_navA, cs_navB, cs_breath;
uniform float cs_k9, cs_k10, cs_k11, cs_k12, cs_k13, cs_k14, cs_k15, cs_k16;

#define HAS_CTL (cs_on > 0.5)
#define TAU 6.2831853

// KNOB MAP — identical to clit-set/2 (see clit-set.md). Every dial at 0 looks right.
#define K_HUE     (HAS_CTL ? cs_k9  : knob_9)    // palette turn
#define K_NEBULA  (HAS_CTL ? cs_k10 : knob_10)   // dust and stars
#define K_TRAILS  (HAS_CTL ? cs_k11 : knob_11)
#define K_REACT   (HAS_CTL ? cs_k12 : knob_12)
#define K_SPREAD  (HAS_CTL ? cs_k13 : knob_13)   // filament colour split (0 = analogous, 1 = complementary)
#define K_GLOW    (HAS_CTL ? cs_k14 : knob_14)
#define K_DROP    (HAS_CTL ? cs_k15 : knob_15)
#define K_LACE    (HAS_CTL ? cs_k16 : knob_16)

// NAVIGATION — mirrors clit-set/2. Audio never touches these.
#define HOME_CX 0.77
#define ZOOM_MAX 1.1
#define MANUAL(k) smoothstep(0.0, 0.08, k)
#define BIPOLAR(k) (clamp(((k) - 0.08) / 0.92, 0.0, 1.0) * 2.0 - 1.0)
#define NAV_CX  (HAS_CTL ? cs_cx  : HOME_CX + MANUAL(knob_2) * BIPOLAR(knob_2) * -0.6)
#define NAV_CY  (HAS_CTL ? cs_cy  : MANUAL(knob_1) * BIPOLAR(knob_1) * 0.6)
#define NAV_LZ  (HAS_CTL ? cs_lz  : knob_4 * ZOOM_MAX)
#define NAV_ROT (HAS_CTL ? cs_rot : knob_5 * TAU)
#define NAV_A   (HAS_CTL ? cs_navA : 1.5 + knob_6 * 1.4)
#define NAV_B   (HAS_CTL ? cs_navB : 0.55 - knob_7 * 0.4)
#define NAV_CURL (HAS_CTL ? cs_curl : knob_8 * 0.45)

#define REACT (1.0 + K_REACT * 1.5)

// PER-DEVICE SEEDS — palette phase, lace density, dust hue, star scatter. ?seed= pins it.
#define SEED_PHASE ((seed - 0.5) * 0.4)
#define SEED_LACE  ((seed2 - 0.5) * 0.6)
#define SEED_DUST  (seed3 * 0.3)
#define SEED_STARS (seed4 * 97.0)

// AUDIO TEXTURE (controller envelopes, else raw features). Colour follows slow statistics only.
#define FLOW (HAS_CTL ? cs_flow : iTime * 0.03)
#define DROP_INTENSITY clamp((HAS_CTL ? cs_drop : 0.0) + K_DROP, 0.0, 1.0)
#define BUILD_INTENSITY (HAS_CTL ? cs_build : clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0))
#define KICK (HAS_CTL ? cs_kick : clamp(bassZScore - 0.4, 0.0, 1.0))
#define PULSE (1.0 + (HAS_CTL ? cs_bass : clamp(bassZScore, 0.0, 1.0)) * 0.05 * REACT)
#define LACE_GAIN (0.8 + (HAS_CTL ? cs_mids : midsNormalized) * 0.35 * REACT)
#define RIM_INTENSITY (0.4 + (HAS_CTL ? cs_treb : trebleNormalized) * 0.7 * REACT)
#define TWINKLE ((HAS_CTL ? cs_treb : trebleNormalized) * REACT)
#define LACE_BLOOM (HAS_CTL ? cs_shift : 0.0)
#define LACE_BREATH ((HAS_CTL ? cs_breath : energyNormalized) - 0.5)
#define SPARKLE (0.2 + clamp(spectralCrestNormalized, 0.0, 1.0) * 0.3 * (HAS_CTL ? cs_presence : 1.0))
#define FOCAL_RADIUS (0.5 + K_GLOW * 0.35 + clamp(spectralKurtosisZScore, -1.0, 1.0) * 0.05)
#define HUE_TURN ((HAS_CTL ? cs_hue : 0.0) * 0.5 + (HAS_CTL ? cs_jump : 0.0) * 0.13 + K_HUE + SEED_PHASE)
#define FEEDBACK_MIX clamp(0.2 + K_TRAILS * 0.55, 0.0, 0.8)

// OKLCH palette over a curated hue wheel. Turns 0..1 walk red → orange → gold (40%), hurry through
// yellow-green (6%, it reads olive), then green-teal → cyan → blue → violet (54%), and never reach the
// hot-magenta band (295°–355°): "I never want to see that magenta again".
float wheelDeg(float t) {
    t = fract(t);
    if (t < 0.4) return mod(355.0 + t / 0.4 * 100.0, 360.0);
    if (t < 0.46) return 95.0 + (t - 0.4) / 0.06 * 50.0;
    return 145.0 + (t - 0.46) / 0.54 * 150.0;
}
#define COOL(t) (0.48 + 0.5 * fract(t))                 // teal → cyan → blue → violet only
vec3 pal(float turns, float L, float C) {
    float deg = wheelDeg(turns);
    // Orange and gold go brown when dark: lift lit warm hues, turn dark ones to wine
    float warm = smoothstep(28.0, 55.0, deg) * (1.0 - smoothstep(100.0, 125.0, deg));
    if (L > 0.4) L = max(L, 0.78 * warm);
    else deg = mix(deg, 18.0, warm);
    float h = radians(deg);
    vec3 rgb = oklch2rgb(vec3(L, C, h));
    // Cheap gamut map: pull chroma in until the colour fits (keeps hue and lightness)
    for (int i = 0; i < 3; i++) {
        if (all(greaterThanEqual(rgb, vec3(0.0))) && all(lessThanEqual(rgb, vec3(1.0)))) break;
        C *= 0.8;
        rgb = oklch2rgb(vec3(L, C, h));
    }
    return clamp(rgb, 0.0, 1.0);
}

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
               mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 7.7; a *= 0.5; }
    return s;
}
float stars(vec2 p, float density) {
    vec2 cell = floor(p), f = fract(p) - 0.5;
    float h = hash21(cell + SEED_STARS);
    if (h > density) return 0.0;
    vec2 o = vec2(hash21(cell + 7.1), hash21(cell + 3.7)) - 0.5;
    float d = length(f - o * 0.7);
    float tw = 0.6 + 0.4 * sin(FLOW * 40.0 * (0.5 + h) + h * 60.0);
    float cross = smoothstep(0.012, 0.0, min(abs(f.x - o.x * 0.7), abs(f.y - o.y * 0.7))) * smoothstep(0.25, 0.0, d);
    return (smoothstep(0.06, 0.0, d) + cross * 0.5) * tw * (0.4 + 0.6 * fract(h * 13.0));
}
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void mainImage(out vec4 P, vec2 V) {
    float drop = DROP_INTENSITY;
    float build = BUILD_INTENSITY;
    float kick = KICK;
    float lz = NAV_LZ;
    float zoom = exp(lz);

    vec2 p = (iResolution.xy - V - V) / iResolution.y;
    p = rot2(NAV_ROT) * p;
    vec2 home = vec2(NAV_CX, NAV_CY);
    vec2 dive = home + vec2(0.23, 0.33);
    vec2 C = dive + (home + 0.6 * p.yx - dive) / zoom;
    V = C;

    float v, x = 9., y = 9., z = 9.;
    vec2 Z = vec2(0.0);
    float focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);
    float a_pow = NAV_A, b_off = NAV_B;
    mat2 curl = rot2(NAV_CURL);
    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x), d = dot(V, V) * a_pow;
        float c = dot(V, vec2(a, log(d) / 2.));
        V = exp(-a * V.y) * pow(d, V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * b_off;
        V = curl * V;
        x = min(x, abs(V.x));
        y = min(y, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;
        focal_trap = min(focal_trap, length(V - focal_center));
    }
    float lx = log(max(x, 1e-12)), ly = log(max(y, 1e-12));
    float zf = 1. - smoothstep(1., -6., ly) * smoothstep(1., -6., lx);

    float lace_lo = -2.0 + SEED_LACE + K_LACE * 0.9 + LACE_BLOOM * 0.6 + LACE_BREATH * 0.5 * REACT - lz * 0.6;
    float lace_hi = lace_lo - 3.0;
    float lace_x = smoothstep(lace_lo, lace_hi, lx);
    float lace_y = smoothstep(lace_lo, lace_hi, ly);
    float coh = smoothstep(0.6, 1.6, lz);
    float gate = 1.0 - coh * smoothstep(1.5, 5.0, fwidth(min(lx, ly)));
    float body = pow(max(lace_x, lace_y), 3.0) * gate;                 // the lit mass (2.frag's lace)
    float halo_x = smoothstep(lace_lo + 2.0, lace_hi, lx) * gate;       // soft gas around each family
    float halo_y = smoothstep(lace_lo + 2.0, lace_hi, ly) * gate;
    // Thin filaments, two families. Exclusive, so a filled region never averages two hues to grey.
    float fil_x = pow(lace_x, 6.0) * pow(1.0 - lace_y, 2.0) * gate;
    float fil_y = pow(lace_y, 6.0) * pow(1.0 - lace_x, 2.0) * gate;

    float focal = pow(smoothstep(FOCAL_RADIUS, 0.01, focal_trap), 3.0);
    focal *= 1.0 - smoothstep(0.5, 2.0, lz);
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    // Orbit-angle hue: neighbouring structures differ, the whole body is never one shade
    float ang = atan(Z.y, Z.x) / TAU;
    // plus slow banding by trap depth and a gas texture in the fractal plane: many hues, one body
    // (low spatial frequency on purpose: fine lace with a hue per pixel averages to mud)
    float hb = HUE_TURN + ang * 0.12 + zf * 0.1 + 0.2 * sin(min(lx, ly) * 0.5 + FLOW * 2.0) + 0.45 * fbm(C * 1.6);
    // Where the lace changes faster than a pixel, the two filament hues would average to grey:
    // collapse them onto one hue there
    float busy = max(smoothstep(0.4, 2.5, fwidth(min(lx, ly))),
                     smoothstep(0.15, 0.6, fwidth(body) + 0.5 * fwidth(max(lace_x, lace_y))));
    float split = mix(0.18, 0.45, K_SPREAD) * (1.0 - busy);

    // SKY: layered dust in three hues, parallax stars
    vec2 cam = vec2(NAV_CY, NAV_CX - HOME_CX);
    vec2 sky = rot2(NAV_ROT * 0.5) * uv;
    float neb = 0.7 + 0.3 * K_NEBULA;
    vec2 dp = sky * 1.8 / (1.0 + lz * 0.15) + cam * 1.4 + vec2(FLOW * 0.3, FLOW * -0.12);
    float d1 = fbm(dp), d2 = fbm(dp * 1.7 + 11.0 + FLOW * 0.1);
    // Dark layers stay on the cool half of the wheel (dark warm hues read as brown)
    vec3 dustA = pal(COOL(HUE_TURN + 0.3 + SEED_DUST), 0.42, 0.14);
    vec3 dustB = pal(HUE_TURN + 0.85 + SEED_DUST, 0.46, 0.15);
    vec3 bg = pal(COOL(HUE_TURN + 0.1 * sin(uv.y * 2.0 + FLOW)), 0.28, 0.1);  // deep jewel floor, never black
    bg = mix(bg, dustA, smoothstep(0.32, 0.75, d1) * neb);
    bg = mix(bg, dustB, smoothstep(0.45, 0.8, d2) * neb * 0.8);

    // BODY: glowing gas, lightness from 2.frag's rainbow structure, hue from the orbit
    float rl = sqrt(max(zf + (zf - zf * zf * zf) * cos(ang * TAU + HUE_TURN * TAU), 0.0));
    vec3 gas = pal(hb, 0.62 + 0.18 * clamp(rl, 0.0, 1.0), 0.19);
    vec3 col = bg + pal(COOL(HUE_TURN + 0.2), 0.45, 0.15) * max(halo_x, halo_y) * 0.22;   // cool gas glow
    col = mix(col, gas * mix(0.85, 1.0, LACE_GAIN - 0.8), body);
    // Filaments: x-family and y-family in split hues, brighter than the gas
    col = mix(col, pal(hb + split, 0.72, 0.17) * LACE_GAIN, fil_x * 0.85);
    col = mix(col, pal(hb - split, 0.68, 0.18) * LACE_GAIN, fil_y * 0.85);
    col += pal(hb, 0.9, 0.12) * fil_x * fil_y * SPARKLE;                         // same-hue glints, never grey

    // Dense lace: pixel-scale alternation between gas, filaments and sky averages to grey-lavender on
    // screen. Where it is busy, paint one coherent hue family instead (sky darker, lace brighter).
    vec3 dense = pal(hb, 0.6, 0.19);
    vec3 denseSky = pal(hb, 0.32, 0.12);
    col = mix(col, mix(denseSky, dense, smoothstep(0.0, 0.6, max(body, max(lace_x, lace_y) * 0.7))), busy * 0.9);

    // Rim light on silhouette edges
    float edge = abs(dFdx(zf)) + abs(dFdy(zf));
    float rim = smoothstep(0.1, 0.5, edge * 20.0) * (1.0 - smoothstep(0.8, 2.2, lz)) * smoothstep(0.0, 0.15, abs(C.y));
    col += pal(hb + 0.3 + build * 0.1, 0.7, 0.15) * rim * RIM_INTENSITY * 0.25;

    // Focal: a gold star core (warm, never a white void) that flares on kicks and blazes on drops
    vec3 core = pal(0.08, 0.78, 0.16);
    col = mix(col, core, focal * (0.35 + kick * 0.25 * REACT + drop * 0.3));
    col *= mix(1.0, mix(0.45, 1.0, focal), drop);

    col *= PULSE;

    // Stars in the gaps
    float lit = max(body, max(fil_x, fil_y));
    float s1 = stars(sky * 34.0 / (1.0 + lz * 0.25) + cam * 22.0, 0.10 + 0.25 * K_NEBULA);
    float s2 = stars(sky * 15.0 / (1.0 + lz * 0.45) + cam * 48.0 + 31.0, 0.05 + 0.15 * K_NEBULA);
    col += pal(HUE_TURN + 0.6, 0.9, 0.05) * (s1 * 0.6 + s2) * (0.6 + 0.5 * TWINKLE) * (1.0 - lit) * neb;

    vec3 prev = clamp(getLastFrameColor(gl_FragCoord.xy / iResolution.xy).rgb, 0.0, 1.0);
    col = mix(col, prev * 0.96, FEEDBACK_MIX);

    float vign = 1.0 - pow(length(uv) * 0.5, 2.2);
    col *= clamp(vign, 0.6, 1.0);
    // Soft shoulder: bright stays bright without clipping to white
    col = col / (1.0 + max(col - 0.85, 0.0) * 2.0);
    P = vec4(clamp(col, 0.0, 1.0), 1.0);
}
