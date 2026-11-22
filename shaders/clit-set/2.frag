// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, 3d, body, sexy, seeded, clit-set, journey, knobs, galactic
// preset: https://visuals.beadfamous.com/?shader=clit-set/2&controller=clit-set
// CLIT-SET/2 — THE VOYAGE. A slow, knob-steered journey through Dom Mandy's complex power fractal,
// the place clit/2 lives. All knobs at 0 = home: the clit/2 silhouette, the landmark you return to.
// knob_1 walks a curated loop of beautiful places; the other knobs steer by hand on top of it.
// controllers/clit-set.js eases every move (zoom in log-depth) so the drift feels like floating.
// Audio is texture on the journey (lace light, rim, stars, kicks, drops); it never steers.
// Renders without the controller: cs_* read 0 and the knobs drive the camera directly (no voyage path).

uniform float cs_on, cs_time, cs_presence, cs_flow;
uniform float cs_A, cs_B, cs_kick, cs_bass, cs_mids, cs_treb;
uniform float cs_build, cs_drop, cs_jump, cs_shift, cs_hue;
uniform float cs_cx, cs_cy, cs_lz, cs_rot, cs_curl, cs_navA, cs_navB, cs_breath;
uniform float cs_k9, cs_k10, cs_k11, cs_k12, cs_k13, cs_k14, cs_k15, cs_k16;

#define HAS_CTL (cs_on > 0.5)
#define TAU 6.2831853

// ============================================================================
// KNOB MAP (MIDI Fighter Twister 4x4). Every dial at 0 looks right: after a reload all dials read 0.
//   row 1  k1 X        k2 Y        k3 VOYAGE   k4 ZOOM      ← navigation (eased in the controller)
//   row 2  k5 TURN     k6 POWER    k7 BODY     k8 CURL      ← the shape of the world
//   row 3  k9 HUE      k10 NEBULA  k11 TRAILS  k12 REACT
//   row 4  k13 GLASSES k14 EMBER   k15 SPOT    k16 LACE
// k1/k2/k3 at 0 = AUTOPILOT: the voyage drifts by itself through the waypoint loop and returns home.
// Turning one up blends manual control in over the first 8% of the dial (sun-1-show K15/K16 pattern).
// ============================================================================
#define K_HUE     (HAS_CTL ? cs_k9  : knob_9)
#define K_NEBULA  (HAS_CTL ? cs_k10 : knob_10)
#define K_TRAILS  (HAS_CTL ? cs_k11 : knob_11)
#define K_REACT   (HAS_CTL ? cs_k12 : knob_12)
#define K_DEPTH   (HAS_CTL ? cs_k13 : knob_13)
#define K_GLOW    (HAS_CTL ? cs_k14 : knob_14)
#define K_DROP    (HAS_CTL ? cs_k15 : knob_15)
#define K_LACE    (HAS_CTL ? cs_k16 : knob_16)

// ============================================================================
// NAVIGATION. Audio never touches these (audio in fractal coordinates strobes: clit/4).
// Controller: eased voyage + manual blend. Fallback: the same manual mapping, no voyage.
// Keep the fallbacks in sync with nav() in controllers/clit-set.js.
// ============================================================================
#define HOME_CX 0.77
#define ZOOM_MAX 1.1                                   // log-zoom cap (3x): past ~3x the lace turns to speckle
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

// ============================================================================
// PER-DEVICE SEEDS — palette phase, lace density, rim warmth, star scatter. ?seed= pins it.
// ============================================================================
#define SEED_PHASE ((seed - 0.5) * 2.4)
#define SEED_LACE  ((seed2 - 0.5) * 0.6)
#define SEED_WARM  (seed3 * 0.5)
#define SEED_STARS (seed4 * 97.0)

// ============================================================================
// AUDIO TEXTURE (controller envelope, else raw-feature fallback)
// ============================================================================
#define FLOW (HAS_CTL ? cs_flow : iTime * 0.03)
#define DROP_INTENSITY clamp((HAS_CTL ? cs_drop : clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)) + K_DROP, 0.0, 1.0)
#define BUILD_INTENSITY (HAS_CTL ? cs_build : clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0))
#define KICK (HAS_CTL ? cs_kick : clamp(bassZScore - 0.4, 0.0, 1.0))
#define PULSE (1.0 + (HAS_CTL ? cs_bass : clamp(bassZScore, 0.0, 1.0)) * 0.05 * REACT)
#define LACE_GAIN (0.7 + (HAS_CTL ? cs_mids : midsNormalized) * 0.6 * REACT)
#define RIM_INTENSITY (0.4 + (HAS_CTL ? cs_treb : trebleNormalized) * 0.8 * REACT)
#define TWINKLE ((HAS_CTL ? cs_treb : trebleNormalized) * REACT)
#define RIM_WARMTH clamp(0.25 + SEED_WARM + BUILD_INTENSITY * 0.35, 0.0, 1.0)
#define LACE_BLOOM (HAS_CTL ? cs_shift : 0.0)
// Loud passages thicken the filigree, quiet ones thin it to a hairline (clit-vj iter 2)
#define LACE_BREATH ((HAS_CTL ? cs_breath : energyNormalized) - 0.5)
#define PEARL (0.15 + clamp(spectralCrestNormalized, 0.0, 1.0) * 0.25 * (HAS_CTL ? cs_presence : 1.0))
#define FOCAL_RADIUS (0.5 + K_GLOW * 0.35 + clamp(spectralKurtosisZScore, -1.0, 1.0) * 0.05)
#define HUE_TURN ((HAS_CTL ? cs_hue : 0.0) * 1.2 + (HAS_CTL ? cs_jump : 0.0) * 0.9 + K_HUE * TAU + SEED_PHASE)
#define FEEDBACK_MIX clamp(0.22 + energyNormalized * 0.08 + K_TRAILS * 0.55, 0.0, 0.85)
#define VIGN_OPEN (clamp(spectralSpreadNormalized, 0.0, 1.0) * 0.06)

// ============================================================================
// COLOR
// ============================================================================
vec3 chromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float chromaBoost = 1.0 + 0.2 * sin(t * 3.14159 * 2.0);
    float L = 0.7 - t * 0.45;
    float C = 0.25 * chromaBoost * (1.0 - t * 0.3);
    float h = hue * 6.28318;
    return clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
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

// One parallax layer of stars: cell-jittered points, each with its own twinkle phase
float stars(vec2 p, float density) {
    vec2 cell = floor(p), f = fract(p) - 0.5;
    float h = hash21(cell + SEED_STARS);
    if (h > density) return 0.0;
    vec2 o = vec2(hash21(cell + 7.1), hash21(cell + 3.7)) - 0.5;
    float d = length(f - o * 0.7);
    float tw = 0.6 + 0.4 * sin(FLOW * 40.0 * (0.5 + h) + h * 60.0);
    return smoothstep(0.06, 0.0, d) * tw * (0.4 + 0.6 * fract(h * 13.0));
}

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 P, vec2 V) {
    float drop = DROP_INTENSITY;
    float build = BUILD_INTENSITY;
    float kick = KICK;

    float lz = NAV_LZ;                                     // log zoom: 0 = home, 1.1 = 3x
    float zoom = exp(lz);

    // Screen → fractal plane. Screen x maps to C.y (the mirror axis), screen y to C.x, as clit/2.
    vec2 p = (iResolution.xy - V - V) / iResolution.y;
    p = rot2(NAV_ROT) * p;
    // Zoom dives toward a lace-dense point on the right wing (a zoom into the pale core is empty).
    vec2 home = vec2(NAV_CX, NAV_CY);
    vec2 dive = home + vec2(0.23, 0.33);
    vec2 C = dive + (home + 0.6 * p.yx - dive) / zoom;
    V = C;

    float v, x, y,
          z = y = x = 9.;
    vec2 Z = vec2(0.0);

    float focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);
    float a_pow = NAV_A;
    float b_off = NAV_B;
    mat2 curl = rot2(NAV_CURL);

    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * a_pow;
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
    z = 1. - smoothstep(1., -6., ly) * smoothstep(1., -6., lx);

    // Lace from the orbit traps. Thresholds slide with depth so deep zooms keep a dark floor.
    float lace_lo = -2.0 + SEED_LACE + K_LACE * 0.9 + LACE_BLOOM * 0.6 + LACE_BREATH * 0.5 * REACT - lz * 0.6;
    float lace_hi = lace_lo - 3.0;
    float lace_x = smoothstep(lace_lo, lace_hi, lx);
    float lace_y = smoothstep(lace_lo, lace_hi, ly);
    float lace = pow(max(lace_x, lace_y), 3.0);
    float lace_fine = lace_x * lace_y;
    // Coherence gate, depth only: past ~3x, drop lace that changes faster than a pixel (speckle)
    float coh = smoothstep(0.6, 1.6, lz);
    lace *= 1.0 - coh * smoothstep(1.5, 5.0, fwidth(min(lx, ly)));
    lace_fine *= 1.0 - coh * 0.7;

    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) + HUE_TURN - vec4(0, 2.1, 4.2, 0)), 0.0));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // FOCAL — one hot spot at home, fading out with depth (at depth every orbit grazes the trap)
    float focal = pow(smoothstep(FOCAL_RADIUS, 0.01, focal_trap), 3.0);
    focal *= 1.0 - smoothstep(0.5, 2.0, lz);
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float depth = mix(base_depth, 0.0, pow(focal, 1.5));
    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = clamp(mix(depth, 0.0, drop * focal), 0.0, 1.0);

    // GALAXY BEHIND THE BODY: velvet violet, nebula dust tinted by the orbit colour, parallax stars.
    // Stars sit on a far plane: they drift at a fraction of the camera's move, so travel reads as travel.
    vec2 cam = vec2(NAV_CY, NAV_CX - HOME_CX);
    vec2 sky = rot2(NAV_ROT * 0.5) * uv;
    float neb = 0.35 + 0.65 * K_NEBULA;
    vec2 dustP = sky * 2.2 / (1.0 + lz * 0.15) + cam * 1.6 + vec2(FLOW * 0.4, 0.0);
    float dust = vnoise(dustP) * 0.6 + vnoise(dustP * 2.3 + 4.0) * 0.4;
    dust = smoothstep(0.45, 0.95, dust);
    vec3 dust_col = mix(vec3(0.10, 0.03, 0.22), rainbow.rgb * 0.35 + vec3(0.03, 0.0, 0.06), 0.5);
    float s1 = stars(sky * 38.0 / (1.0 + lz * 0.25) + cam * 22.0, 0.10 + 0.25 * K_NEBULA);
    float s2 = stars(sky * 17.0 / (1.0 + lz * 0.45) + cam * 48.0 + 31.0, 0.05 + 0.15 * K_NEBULA);
    float star = (s1 * 0.6 + s2) * (0.55 + 0.6 * TWINKLE);
    vec3 bg = vec3(0.04, 0.015, 0.08) + dust_col * dust * neb * 0.45;

    // Chroma lift (OKLab): the raw orbit rainbow reads grey; push chroma up and tint the
    // near-grey petals toward the velvet violet instead of grey-brown
    vec3 lab = rgb2oklab(clamp(rainbow.rgb, 0.0, 1.0));
    float chroma = length(lab.yz);
    lab.yz *= 1.55;
    lab.yz += vec2(0.035, -0.075) * (1.0 - smoothstep(0.015, 0.07, chroma));
    vec3 vivid = clamp(oklab2rgb(lab), 0.0, 1.0);
    vec3 lace_col = mix(vivid, chromadepth(mix(0.15, 0.7, 1.0 - luma)), K_DEPTH);
    vec3 col = mix(bg, lace_col * LACE_GAIN, lace);
    col += vec3(0.7, 0.5, 0.65) * lace_fine * PEARL;

    // Rim — body silhouette edges (fades at depth, where every pixel is an edge)
    float rim = smoothstep(0.1, 0.5, edge * 20.0) * (1.0 - smoothstep(0.8, 2.2, lz));
    rim *= smoothstep(0.0, 0.15, abs(C.y));
    vec3 rim_col = mix(vec3(0.3, 0.15, 0.65), vec3(0.8, 0.3, 0.5), RIM_WARMTH);
    col += rim_col * rim * RIM_INTENSITY * 0.3;

    col = mix(col, chromadepth(depth) * 1.2, focal * 0.3);

    float spotlight = mix(mix(1.0, 0.2, drop), 1.0, focal);
    col *= spotlight;

    vec3 hot_red = vec3(1.0, 0.15, 0.05);
    float ember = focal * (0.2 + kick * 0.35 * REACT);
    float blaze = focal * mix(1.0, 2.5, drop) * 0.5 * drop;
    col += hot_red * (ember + blaze);
    col += vec3(1.0, 0.7, 0.4) * pow(focal, 3.0) * drop * 0.6;

    col *= PULSE;

    vec4 prev = getLastFrameColor(gl_FragCoord.xy / iResolution.xy);
    vec3 prevc = clamp(prev.rgb, 0.0, 1.0);
    col = mix(col, prevc * 0.95, FEEDBACK_MIX);

    float vign = 1.0 - pow(length(uv) * (0.65 - VIGN_OPEN), 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Darkness enforcement: lace, rim, focal are bright; the galaxy stays a dim floor behind them
    float lit = max(max(lace, rim * 0.5), focal);
    col *= mix(0.15 + 0.35 * dust * neb, 1.0, lit);
    // Stars after the darkness pass, only in the dark gaps, dimmed in the drop spotlight
    col += vec3(0.85, 0.8, 1.0) * star * (1.0 - lit) * neb * mix(1.0, 0.3, drop) * max(vign, 0.0);

    col = col / (col + vec3(0.7));
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    P = vec4(clamp(col, 0.0, 1.0), 1.0);
}
