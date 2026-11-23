// @fullscreen: true
// @mobile: true
// @favorite: true
// @tags: chromadepth, 3d, body, sexy, seeded, clit-set
// preset: https://visuals.beadfamous.com/?shader=clit-set/1&controller=clit-set
// CLIT-SET/1 — clit/2's chromadepth anatomy, modernized with the sun-set lessons:
// controller envelopes (controllers/clit-set.js), per-device seeds, eased knobs, no dead zones.
// Red = closest (focal pops out), blue/violet = farthest. Based on Dom Mandy's complex power fractal.
// Renders without the controller: every cs_* reads 0 and the #defines fall back to raw features.

uniform float cs_on, cs_time, cs_presence, cs_flow;
uniform float cs_kick, cs_bass, cs_mids, cs_treb;
uniform float cs_build, cs_drop, cs_jump, cs_shift, cs_hue;
uniform float cs_pearl, cs_focus, cs_spread;
uniform float cs_k1, cs_k2, cs_k3, cs_k4, cs_k5, cs_k6, cs_k7, cs_k8;

#define HAS_CTL (cs_on > 0.5)

// ============================================================================
// KNOBS — all 0 = the default look (no MIDI attached still looks right). Eased by the controller.
// ============================================================================
#define K_ZOOM   (HAS_CTL ? cs_k1 : knob_1)   // 0 full body … 1 close on the focal
#define K_REACT  (HAS_CTL ? cs_k2 : knob_2)   // reaction size ×1 … ×2.5
#define K_TRAILS (HAS_CTL ? cs_k3 : knob_3)   // feedback trails
#define K_HUE    (HAS_CTL ? cs_k4 : knob_4)   // lace palette rotation (one full turn)
#define K_LACE   (HAS_CTL ? cs_k5 : knob_5)   // lace density
#define K_DEPTH  (HAS_CTL ? cs_k6 : knob_6)   // recolor lace in strict chromadepth (for the glasses)
#define K_DROP   (HAS_CTL ? cs_k7 : knob_7)   // hold the drop spotlight by hand
#define K_GLOW   (HAS_CTL ? cs_k8 : knob_8)   // focal ember size

#define REACT (1.0 + K_REACT * 1.5)

// ============================================================================
// PER-DEVICE SEEDS — every phone gets its own palette phase, lace density and drift direction.
// ?seed= in the URL pins it.
// ============================================================================
#define SEED_PHASE ((seed - 0.5) * 2.4)              // lace rainbow phase, ±70°
#define SEED_LACE  ((seed2 - 0.5) * 0.6)             // lace threshold shift
#define SEED_WARM  (seed3 * 0.5)                     // rim violet → pink bias
#define SEED_SPIN  (seed4 < 0.5 ? -1.0 : 1.0)        // idle drift direction

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (controller envelope, else raw-feature fallback)
// ============================================================================

// Forward clock: never stops, so quiet passages still breathe
#define FLOW (HAS_CTL ? cs_flow : iTime * 0.03)
// #define FLOW 0.0

// Fractal power and body offset are pinned (clit/2's home shape) with a slow idle drift on the forward
// clock. Audio never touches the fractal coordinates: on clit/4 that strobed and blacked out the frame.
// Music only changes how fast FLOW runs, never where the shape is.
#define A (1.5 + 0.045 * sin(6.2831853 * FLOW * SEED_SPIN))
// #define A 1.5
#define B (0.55 + 0.02 * sin(6.2831853 * FLOW * 0.618 + 1.3))
// #define B 0.55

// Drop: confirmed drop envelope (controller) or the confident-fall fallback, plus the hand knob
#define DROP_INTENSITY clamp((HAS_CTL ? cs_drop : clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)) + K_DROP, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

#define BUILD_INTENSITY (HAS_CTL ? cs_build : clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0))
// #define BUILD_INTENSITY 0.0

// Kick: instant punch, cubic ease-out (never the `beat` uniform)
#define KICK (HAS_CTL ? cs_kick : clamp(bassZScore - 0.4, 0.0, 1.0))
// #define KICK 0.0

// Bass sustain breathes the whole body
#define PULSE (1.0 + (HAS_CTL ? cs_bass : clamp(bassZScore, 0.0, 1.0)) * 0.06 * REACT)
// #define PULSE 1.0

// Mids light the lace
#define LACE_GAIN (0.7 + (HAS_CTL ? cs_mids : midsNormalized) * 0.6 * REACT)
// #define LACE_GAIN 1.0

// Treble drives the rim
#define RIM_INTENSITY (0.4 + (HAS_CTL ? cs_treb : trebleNormalized) * 0.8 * REACT)
// #define RIM_INTENSITY 0.7

// Rim warmth: per-device bias, warmed further by a build
#define RIM_WARMTH clamp(0.25 + SEED_WARM + BUILD_INTENSITY * 0.35, 0.0, 1.0)
// #define RIM_WARMTH 0.5

// Timbral shift blooms the lace (thicker lines for a moment)
#define LACE_BLOOM (HAS_CTL ? cs_shift : 0.0)
// #define LACE_BLOOM 0.0

// Crest sparkles the pearly lace intersections
#define PEARL (0.15 + (HAS_CTL ? cs_pearl : clamp(spectralCrestNormalized, 0.0, 1.0)) * 0.25)
// #define PEARL 0.25

// Kurtosis tightens / widens the focal hot spot
#define FOCAL_RADIUS (0.5 + K_GLOW * 0.35 + (HAS_CTL ? cs_focus : clamp(spectralKurtosisZScore, -1.0, 1.0)) * 0.05)
// #define FOCAL_RADIUS 0.5

// Slow colour: the key (20 s) plus a step on every drop (never fast features)
#define HUE_TURN ((HAS_CTL ? cs_hue : 0.0) * 1.2 + (HAS_CTL ? cs_jump : 0.0) * 0.9 + K_HUE * 6.2831853 + SEED_PHASE)

// Feedback trails
#define LACE_AA_HOLD 0.9   // where the lace is unresolved, the share of last frame's output kept (see unres)
#define FEEDBACK_MIX clamp(0.22 + energyNormalized * 0.08 + K_TRAILS * 0.55, 0.0, 0.85)

// Spread opens the vignette a touch
#define VIGN_OPEN ((HAS_CTL ? cs_spread : clamp(spectralSpreadNormalized, 0.0, 1.0)) * 0.06)

// ============================================================================
// CHROMADEPTH COLOR — red closest, blue farthest
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

// ============================================================================
// MAIN
// ============================================================================

vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }

void mainImage(out vec4 P, vec2 V) {
    float drop = DROP_INTENSITY;
    float build = BUILD_INTENSITY;
    float kick = KICK;

    // Zoom: the knob only (audio stays out of the coordinates; kicks flare the ember instead)
    float zoom = mix(1.0, 0.55, K_ZOOM);

    vec2 Z = iResolution.xy,
         C = 0.6 * zoom * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    V = C;

    float v, x, y,
          z = y = x = 9.;

    float focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);
    float a_pow = A;
    float b_off = B;

    // LACE AA: D = dV/dC rides along the orbit (the map is holomorphic), so
    // each trap knows how fast it changes across one pixel. See unres below.
    vec2 D = vec2(1.0, 0.0);
    float dx = 0.0, dy = 0.0;                      // |D|^2 where each trap was last lowered
    float pixC = max(length(dFdx(C)), length(dFdy(C)));
    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * a_pow;
        float c = dot(V, vec2(a, log(d) / 2.));
        vec2 Lg = vec2(log(d) / 2. + 1.0, a);           // d/dV of V log V, with the power's constant folded in
        V = exp(-a * V.y) * pow(d, V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        D = 2.0 * cmul(V, cmul(Lg, D));
        V -= C * b_off;
        D -= vec2(b_off, 0.0);

        D *= dot(D, D) > 1e20 ? 1e-10 : 1.0;            // chaos grows D without bound; past this it is unresolved anyway
        if (abs(V.x) < x) { x = abs(V.x); dx = dot(D, D); }
        if (abs(V.y) < y) { y = abs(V.y); dy = dot(D, D); }
        z > (v = dot(V, V)) ? z = v, Z = V : Z;

        focal_trap = min(focal_trap, length(V - focal_center));
    }

    z = 1. - smoothstep(1., -6., log(y)) * smoothstep(1., -6., log(x));

    // Lace / filigree from the orbit traps. Knob, seed and timbral shift move the threshold.
    float lace_lo = -2.0 + SEED_LACE + K_LACE * 0.9 + LACE_BLOOM * 0.6;
    // LACE AA. In the dense lace the orbit is chaotic: one pixel step in C moves the traps across the whole lace band,
    // so one sample per pixel is noise, and any motion (spin, pan, zoom, shape morph) reshuffles it every frame. That is
    // the sparkle: scripts/sparkle-score.mjs measured 1/4 resolution sparkling just as much, a 16x supersample cutting
    // it by 55%, and float precision of the clocks and every audio term ruled out. unres = this pixel's footprint in
    // log-trap units, from the tracked derivative (floored a unit under the band, so thread cores, where log(trap)
    // runs to -inf, do not count). There the output averages frames: LACE AA at the end.
    float tfloor = exp(-5.0 - 1.0);
    float fpx = max(sqrt(dx) * pixC / max(x, tfloor), sqrt(dy) * pixC / max(y, tfloor));
    float unres = smoothstep(0.3, 2.0, fpx < 1e30 ? fpx : 1e30);
    float lace_x = smoothstep(lace_lo, -5.0, log(x));
    float lace_y = smoothstep(lace_lo, -5.0, log(y));
    float lace = pow(max(lace_x, lace_y), 3.0);
    float lace_fine = lace_x * lace_y;

    // sexy/1 rainbow, phase rotated by seed, knob, slow key and drops
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) + HUE_TURN - vec4(0, 2.1, 4.2, 0)), 0.0));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // FOCAL
    float focal = pow(smoothstep(FOCAL_RADIUS, 0.01, focal_trap), 3.0);
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    // CHROMADEPTH depth: 0 = closest (red), 1 = farthest (violet)
    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float depth = mix(base_depth, 0.0, pow(focal, 1.5));
    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = clamp(mix(depth, 0.0, drop * focal), 0.0, 1.0);

    // Lace is the only lit content; everything else is deep velvet violet
    vec3 bg_purple = vec3(0.04, 0.015, 0.08);
    vec3 lace_col = mix(rainbow.rgb, chromadepth(mix(0.15, 0.7, 1.0 - luma)), K_DEPTH);
    vec3 col = mix(bg_purple, lace_col * LACE_GAIN, lace);

    col += vec3(0.7, 0.5, 0.65) * lace_fine * PEARL;

    // Rim — body silhouette edges
    float rim = smoothstep(0.1, 0.5, edge * 20.0);
    rim *= smoothstep(0.0, 0.15, abs(C.y));
    vec3 rim_col = mix(vec3(0.3, 0.15, 0.65), vec3(0.8, 0.3, 0.5), RIM_WARMTH);
    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // Focal → chromadepth red
    col = mix(col, chromadepth(depth) * 1.2, focal * 0.3);

    // DROP SPOTLIGHT: dim the body, blaze the focal
    float spotlight = mix(mix(1.0, 0.2, drop), 1.0, focal);
    col *= spotlight;

    vec3 hot_red = vec3(1.0, 0.15, 0.05);
    float ember = focal * (0.2 + kick * 0.35 * REACT);   // always glowing, kicks flare it
    float blaze = focal * mix(1.0, 2.5, drop) * 0.5 * drop;
    col += hot_red * (ember + blaze);
    col += vec3(1.0, 0.7, 0.4) * pow(focal, 3.0) * drop * 0.6;

    col *= PULSE;

    // Feedback — sanitized so a bad frame never sticks
    vec4 prev = getLastFrameColor(gl_FragCoord.xy / iResolution.xy);
    vec3 prevc = clamp(prev.rgb, 0.0, 1.0);
    col = mix(col, prevc * 0.95, FEEDBACK_MIX);

    // Vignette, tighter on drops
    float vign = 1.0 - pow(length(uv) * (0.65 - VIGN_OPEN), 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Darkness enforcement: only lace, rim, focal get to be bright
    col *= mix(0.15, 1.0, max(max(lace, rim * 0.5), focal));

    col = col / (col + vec3(0.7));
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    // LACE AA, the other half: where the lace is unresolved (unres), this frame's output averages with the last one's,
    // an EMA over ~1/(1-LACE_AA_HOLD) frames: the motion that reshuffled the noise now supersamples it. On the final
    // colour, so the vignette and tone map are not compounded. Averaging random orbit hues loses chroma (red + teal
    // reads grey), so the averaged hue gets back the chroma one sample has: a vivid wash, not a grey one.
    if (unres > 0.0) {
        const vec3 REC709 = vec3(0.2126, 0.7152, 0.0722);
        float c_now = length(col - dot(col, REC709));
        col = mix(col, prevc, LACE_AA_HOLD * unres);
        float l_avg = dot(col, REC709);
        vec3 ch = col - l_avg;                          // chroma about the luminance axis: scaling it keeps L
        col = max(l_avg + ch * mix(1.0, clamp(c_now / max(length(ch), 1e-4), 1.0, 1.6), unres), vec3(0.0));
    }

    P = vec4(clamp(col, 0.0, 1.0), 1.0);
}
