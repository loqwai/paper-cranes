// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, 3d, body, seeded, clit-set, journey, knobs, glasses
// preset: https://visuals.beadfamous.com/?shader=clit-set/3&controller=clit-set
// CLIT-SET/3 — CHROMADEPTH. The clit-set/2 voyage re-lit for ChromaDepth glasses: every pixel's
// hue IS its depth (HSL, red = near, violet = far), saturation ≥ 0.9, no white anywhere.
// Lace filigree and the focal ember sit nearest (red → gold), the body floats mid (green → cyan),
// the galaxy recedes (blue → violet). Same controller, same knob map, same waypoints as 2.frag.
// k9 (HUE) sets the depth temperature: a quarter turn lifts more forward (hot), three quarters
// pushes more back (cool); 0, 0.5 and 1 are neutral.

uniform float cs_on, cs_time, cs_presence, cs_flow;
uniform float cs_kick, cs_bass, cs_mids, cs_treb;
uniform float cs_build, cs_drop, cs_jump, cs_shift, cs_hue;
uniform float cs_cx, cs_cy, cs_lz, cs_rot, cs_curl, cs_navA, cs_navB, cs_breath;
uniform float cs_k9, cs_k10, cs_k11, cs_k12, cs_k13, cs_k14, cs_k15, cs_k16;

#define HAS_CTL (cs_on > 0.5)
#define TAU 6.2831853

// KNOB MAP — identical to clit-set/2 (see clit-set.md). Every dial at 0 looks right.
#define K_HUE     (HAS_CTL ? cs_k9  : knob_9)    // depth temperature (stays spectral)
#define K_NEBULA  (HAS_CTL ? cs_k10 : knob_10)   // far dust and stars
#define K_TRAILS  (HAS_CTL ? cs_k11 : knob_11)
#define K_REACT   (HAS_CTL ? cs_k12 : knob_12)
#define K_DEPTH   (HAS_CTL ? cs_k13 : knob_13)   // depth contrast: compress the mid band
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

// OWN MOTION on the `time` uniform (pinned by ?time=, so it is testable), independent of the
// controller's nav. Geometry only evolves, it never oscillates (docs/vj-preferences.md):
//   OWN_ROT  one-way spin about the centre, one turn per 200 s
//   OWN_LZ   one-way zoom creep in log depth, +0.22 (1.25x) per 100 s, then it wraps back under a
//            1.5 s feedback dissolve (CREEP_COVER), so the reset never cuts
// Both periods divide the 1000 s time wrap, so the wrap is seamless too. Audio never touches these.
#define OWN_ROT     (time * TAU / 200.0)
#define CREEP_U     fract(time / 100.0)
#define OWN_LZ      (0.22 * CREEP_U)
#define CREEP_COVER max(smoothstep(0.985, 1.0, CREEP_U), 1.0 - smoothstep(0.0, 0.015, CREEP_U))

#define REACT (1.0 + K_REACT * 1.5)

// PER-DEVICE SEEDS — depth offset, lace density, rim hue, star scatter. ?seed= pins it.
#define SEED_SHIFT ((seed - 0.5) * 0.12)
#define SEED_LACE  ((seed2 - 0.5) * 0.6)
#define SEED_RIM   (seed3 * 0.06)
#define SEED_STARS (seed4 * 97.0)

// AUDIO: the music sets only the slow colour (cs_hue, a 20 s circular mean of the key). Motion runs on
// the `time` uniform: the controller's forward clock surges on every kick, and a spin or drift on it
// read as zoom jitter on the show's probe. Audio never moves light that changes the structure: kick,
// bass, treble, timbre and loudness used to pulse the lace threshold, rim, ember and focal radius, and
// the show's probe (2026-11-22) read that as shiver (zoom in and out). Those are held steady below.
#define FLOW (time * 0.03)                              // own steady clock: the controller's flow surges per kick
#define DROP_INTENSITY K_DROP
#define BUILD_INTENSITY (HAS_CTL ? cs_build : clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0))
#define KICK 0.0
#define PULSE 1.0
#define LACE_GAIN 0.95
#define RIM_INTENSITY 0.6
#define TWINKLE 0.3
#define LACE_BLOOM 0.0
#define LACE_BREATH 0.0
#define FOCAL_RADIUS (0.5 + K_GLOW * 0.35)
#define BODY_RIPPLE ((HAS_CTL ? cs_hue : 0.0) * TAU)
#define FEEDBACK_MIX clamp(0.2 + K_TRAILS * 0.55, 0.0, 0.8)

// ChromaDepth: hue = depth (0 red near … 0.75 violet far). Saturation high, lightness capped, no white.
vec3 cd(float t, float L) {
    return hsl2rgb(vec3(clamp(t, 0.0, 1.0) * 0.75, 0.95, clamp(L, 0.0, 0.55)));
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
float stars(vec2 p, float density) {
    vec2 cell = floor(p), f = fract(p) - 0.5;
    float h = hash21(cell + SEED_STARS);
    if (h > density) return 0.0;
    vec2 o = vec2(hash21(cell + 7.1), hash21(cell + 3.7)) - 0.5;
    float tw = 0.8;                                    // steady: a 5-16 s twinkle read as shiver on the probe
    return smoothstep(0.07, 0.0, length(f - o * 0.7)) * tw;
}
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void mainImage(out vec4 P, vec2 V) {
    float drop = DROP_INTENSITY;
    float build = BUILD_INTENSITY;
    float kick = KICK;
    float lz = min(NAV_LZ + OWN_LZ, ZOOM_MAX);
    float zoom = exp(lz);

    vec2 p = (iResolution.xy - V - V) / iResolution.y;
    p = rot2(NAV_ROT + OWN_ROT) * p;
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
    float body = smoothstep(1., -6., ly) * smoothstep(1., -6., lx);     // 1 inside the pale body

    float lace_lo = -2.0 + SEED_LACE + K_LACE * 0.9 + LACE_BLOOM * 0.6 + LACE_BREATH * 0.5 * REACT - lz * 0.6;
    float lace_hi = lace_lo - 3.0;
    float lace_x = smoothstep(lace_lo, lace_hi, lx);
    float lace_y = smoothstep(lace_lo, lace_hi, ly);
    float lace = pow(max(lace_x, lace_y), 2.5);
    float coh = smoothstep(0.6, 1.6, lz);
    lace *= 1.0 - coh * smoothstep(1.5, 5.0, fwidth(min(lx, ly)));
    float tight = smoothstep(lace_lo, lace_hi - 3.0, min(lx, ly));      // 1 on the finest threads

    float focal = pow(smoothstep(FOCAL_RADIUS, 0.01, focal_trap), 3.0);
    focal *= 1.0 - smoothstep(0.5, 2.0, lz);
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    // DEPTH per layer (0 near … 1 far). K_DEPTH squeezes the mid band for a stronger 3D pop.
    float ang = atan(Z.y, Z.x);
    float t_body = 0.46 + 0.1 * sin(ang + BODY_RIPPLE) * (1.0 - K_DEPTH * 0.6) - body * 0.08;
    float t_lace = 0.02 + 0.24 * (0.5 + 0.5 * cos(ang + BODY_RIPPLE)) * (1.0 - tight * 0.5) - kick * 0.05 * REACT;
    float t_far  = 0.96 + 0.04 * sin(FLOW * 3.0 + uv.y * 2.0);

    // Lightness per layer: lace bright, body glassy, galaxy dim floor (never a black void)
    vec2 cam = vec2(NAV_CY, NAV_CX - HOME_CX);
    vec2 sky = rot2(NAV_ROT * 0.5) * uv;
    float neb = 0.4 + 0.6 * K_NEBULA;
    vec2 dustP = sky * 2.2 / (1.0 + lz * 0.15) + cam * 1.6 + vec2(FLOW * 0.4, 0.0);
    float dust = smoothstep(0.35, 0.95, vnoise(dustP) * 0.6 + vnoise(dustP * 2.3 + 4.0) * 0.4);
    float L_far = 0.07 + 0.16 * dust * neb;
    float bodyMask = smoothstep(0.02, 0.6, body) * 0.85 + 0.15 * (1.0 - smoothstep(-1.0, 0.5, min(lx, ly)));
    float L_body = mix(0.16, 0.36, bodyMask) * (0.85 + 0.15 * sin(ang * 2.0 + FLOW * 6.0));
    float L_lace = 0.5 * LACE_GAIN;

    // Compose by depth: far → body → lace → focal. Depth values blend, so hue order stays spectral.
    float t = t_far, L = L_far;
    t = mix(t, t_body, bodyMask);
    L = mix(L, L_body, bodyMask);
    t = mix(t, t_lace, lace);
    L = mix(L, L_lace, lace);

    // Rim: silhouette edges glow red-orange (forward)
    float edge = abs(dFdx(body)) + abs(dFdy(body));
    float rim = smoothstep(0.05, 0.4, edge * 20.0) * (1.0 - smoothstep(0.8, 2.2, lz)) * smoothstep(0.0, 0.15, abs(C.y));
    rim *= RIM_INTENSITY;
    t = mix(t, 0.08 + SEED_RIM, clamp(rim * 0.7, 0.0, 1.0));
    L = mix(L, 0.5, clamp(rim * 0.5, 0.0, 1.0));

    // Focal ember: nearest of all. Drop: body recedes, focal blazes forward.
    t = mix(t, 0.0, focal);
    L = mix(L, 0.5 + 0.05 * kick, focal * 0.8);
    t = mix(t, min(t + 0.25, 1.0), drop * (1.0 - focal) * (1.0 - lace));
    L *= mix(1.0, 0.8, drop * (1.0 - focal));
    t -= build * 0.06;                                                       // builds lean forward

    // Seed shift + the HUE knob's depth temperature: 0 neutral, 0.25 hot (more lifts forward),
    // 0.5 neutral, 0.75 cool (more recedes), 1 neutral again. Hue order stays spectral.
    t = pow(clamp(t + SEED_SHIFT, 0.0, 1.0), exp2(sin(K_HUE * TAU) * 1.1));

    vec3 col = cd(t, L * mix(1.0, PULSE, lace));                          // bass pulse on the lace only

    // Far stars: violet points in the dark gaps
    float s1 = stars(sky * 38.0 / (1.0 + lz * 0.25) + cam * 22.0, 0.12 + 0.25 * K_NEBULA);
    float s2 = stars(sky * 17.0 / (1.0 + lz * 0.45) + cam * 48.0 + 31.0, 0.06 + 0.15 * K_NEBULA);
    float star = (s1 * 0.6 + s2) * (0.6 + 0.5 * TWINKLE) * (1.0 - bodyMask) * (1.0 - lace) * neb;
    col = mix(col, cd(0.97, 0.5), clamp(star, 0.0, 1.0));

    vec3 prev = clamp(getLastFrameColor(gl_FragCoord.xy / iResolution.xy).rgb, 0.0, 1.0);
    col = mix(col, prev * 0.985, max(FEEDBACK_MIX, 0.96 * CREEP_COVER));   // zoom-creep wrap dissolves

    float vign = 1.0 - pow(length(uv) * 0.6, 2.0);
    col *= clamp(vign, 0.35, 1.0);
    P = vec4(clamp(col, 0.0, 1.0), 1.0);
}
