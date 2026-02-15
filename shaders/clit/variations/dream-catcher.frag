// @fullscreen: true
// @mobile: true
// @tags: dream, ethereal, pastel, ambient, soft
// Dream Catcher — Slowly turning dream catcher web with opalescent dreamstone
// Soft pastels: lavender, baby blue, soft pink, mint. Very high feedback for dream smearing.
// Default = SLOW dreamlike drifting, soft and hazy. Fast reactions ONLY on extreme z-scores (abs > 0.6).
// On nightmare intrusion: sharp dark spikes and contrast. Floating dream state in silence.
// Based on Dom Mandy's complex power fractal (clit series variation)

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — DREAMY DEFAULTS
// Designed for floating silence. Only reacts on very abnormal z-scores (abs > 0.6)
// ============================================================================

// Nightmare gate: only activates on very abnormal z-scores
#define NIGHTMARE_GATE clamp((abs(energyZScore) - 0.6) * 2.5, 0.0, 1.0)
// #define NIGHTMARE_GATE 0.0

// Shape complexity: dreamy slow drift, ~50s full cycle
#define A (1.5 + 0.1 * sin(iTime * 0.02) + NIGHTMARE_GATE * spectralCentroidZScore * 0.12)
// #define A 1.5

// Body offset: very slow dreamy drift, ~40s cycle, phase-offset from A
#define B (0.55 + 0.04 * sin(iTime * 0.025) + NIGHTMARE_GATE * energyZScore * 0.06)
// #define B 0.55

// Drop detection: confident energy drop = nightmare trigger
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.0

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse: barely perceptible, only on nightmare intrusion
#define PULSE (1.0 + NIGHTMARE_GATE * bassZScore * 0.03)
// #define PULSE 1.0

// Very high feedback (0.55 base) for dream smearing
#define FEEDBACK_MIX (0.55 + energyNormalized * 0.04 * NIGHTMARE_GATE)
// #define FEEDBACK_MIX 0.55

// Rim lighting: very soft, pastel glow
#define RIM_INTENSITY (0.2 + trebleNormalized * 0.15 * NIGHTMARE_GATE)
// #define RIM_INTENSITY 0.2

// Dreamstone brilliance: soft opalescent glow, gentle pulse
#define GEM_BRILLIANCE (0.7 + 0.12 * sin(iTime * 0.35) + spectralCrestNormalized * 0.15 * NIGHTMARE_GATE)
// #define GEM_BRILLIANCE 0.7

// Tendril curl: dreamy slow sway, 40s period
// Three layered sine waves for organic dream motion
// Nightmare jolt on z > 0.7
#define NIGHTMARE_CURL_GATE clamp((abs(spectralCentroidZScore) - 0.7) * 3.0, 0.0, 1.0)
#define SLOW_DREAM_1 (sin(iTime * 0.025) * 0.35)
#define SLOW_DREAM_2 (sin(iTime * 0.0157) * 0.25)
#define SLOW_DREAM_3 (cos(iTime * 0.011) * 0.18)
#define NIGHTMARE_JOLT (spectralCentroidZScore * 1.2 + spectralFluxZScore * 0.8)
#define TENDRIL_CURL (SLOW_DREAM_1 + SLOW_DREAM_2 + SLOW_DREAM_3 + NIGHTMARE_CURL_GATE * NIGHTMARE_JOLT)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent slow dream drift
#define NIGHTMARE_CROSS_GATE clamp((abs(spectralSpreadZScore) - 0.7) * 3.0, 0.0, 1.0)
#define SLOW_CROSS_D1 (cos(iTime * 0.021) * 0.3)
#define SLOW_CROSS_D2 (sin(iTime * 0.013 + 1.5) * 0.22)
#define SLOW_CROSS_D3 (cos(iTime * 0.0087 + 2.5) * 0.15)
#define NIGHTMARE_CROSS_JOLT (spectralSpreadZScore * 0.9 + bassZScore * 0.6)
#define TENDRIL_CROSS (SLOW_CROSS_D1 + SLOW_CROSS_D2 + SLOW_CROSS_D3 + NIGHTMARE_CROSS_GATE * NIGHTMARE_CROSS_JOLT)
// #define TENDRIL_CROSS 0.0

// Flow drift: constant slow circular dream drift, nightmare adds chaos
#define FLOW_X (sin(iTime * 0.018) * 0.0015 + NIGHTMARE_GATE * spectralCentroidSlope * 0.003)
// #define FLOW_X 0.0
#define FLOW_Y (cos(iTime * 0.022) * 0.0012 + NIGHTMARE_GATE * spectralSpreadSlope * 0.002)
// #define FLOW_Y 0.0

// Drop trigger: requires high turbulence (4.0+) for nightmare intrusion
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Drop state ramp/decay — slower ramp, moderate decay for nightmare fade
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.008
#define DROP_DECAY_MAX 0.04

// ============================================================================
// PASTEL DREAM PALETTE — soft cycling pastels via hsl2rgb
// ============================================================================

vec3 dreamPastel(float t, float time) {
    t = clamp(t, 0.0, 1.0);
    // Slowly cycling pastel hue: lavender -> baby blue -> mint -> soft pink -> lavender
    float hue_cycle = fract(time * 0.008);  // ~125s full cycle
    float hue = fract(hue_cycle + t * 0.3);

    // Pastel = high lightness, low-mid saturation
    float sat = 0.35 + 0.15 * sin(t * 3.14159);  // 0.2 to 0.5
    float lit = 0.65 + 0.15 * t;                   // 0.65 to 0.80

    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Slow dream catcher web rotation — very gentle turning
    float rot = iTime * 0.006;
    C = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * C;

    // Dreamy tendril drift
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — soft accumulated proximity for dreamstone glow
    float focal_trap = 0.0;
    float focal_weight = 0.0;
    vec2 focal_center = vec2(0.0, 0.12);

    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * A;
        float c = dot(V, vec2(a, log(max(d, 1e-10)) / 2.));
        V = exp(-a * V.y) * pow(max(d, 1e-10), V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * B;

        x = min(x, abs(V.x));
        y = min(y, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;

        // Soft accumulated proximity for dreamstone focal glow
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree — very soft (sharpening 1.2) for woven dream thread look
    float lace_lo = -1.8;
    float lace_hi = -4.8;
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 1.2);  // Very soft — woven thread, not sharp wire

    // Fractal structure for pastel color mapping
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — dreamstone: soft opalescent glow
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Dreamstone rim — very soft organic edge
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float dream_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    dream_rim = max(dream_rim, 0.0) * 1.5;

    // Dreamstone specular — soft, not sharp
    float dream_detail = smoothstep(0.3, 0.8, z) * focal;
    float dream_sparkle = pow(dream_detail, 2.0);

    // Internal opalescent pulse — very slow breathing
    float dream_pulse = 0.9 + 0.1 * sin(iTime * 0.25);

    // Opalescent dreamstone base color: soft shifting pastels
    float opal_hue = fract(iTime * 0.005);  // ~200s full cycle
    vec3 dreamstone_base = vec3(0.9, 0.85, 0.95);  // base opalescent white-lavender
    // Pastel shimmer across the dreamstone surface
    vec3 opal_shimmer = hsl2rgb(vec3(fract(opal_hue + focal * 0.3), 0.3, 0.85));
    dreamstone_base = mix(dreamstone_base, opal_shimmer, 0.3);

    float f_safe = max(focal, 0.0);

    // Soft opalescent color separation
    vec3 dream_iris = vec3(
        pow(f_safe, 1.9),
        pow(f_safe, 2.0),
        pow(f_safe, 1.85)
    );

    // ========================================================================
    // DROP STATE — nightmare intrusion: sharp dark spikes, contrast spikes
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    // Higher threshold: requires turbulence > 4.0 for nightmare
    float drop_signal = clamp(drop_trigger * smoothstep(3.0, 4.5, turbulence), 0.0, 1.0);

    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float prev_drop_state = getLastFrameColor(state_uv).a;

    float settled = AUDIO_SETTLED;
    float decay_rate = mix(DROP_DECAY_MIN, DROP_DECAY_MAX, settled);

    float drop_state = prev_drop_state;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, decay_rate);
    drop_state = clamp(drop_state, 0.0, 1.0);

    float drop = animateEaseInOutCubic(drop_state);

    // ========================================================================
    // COLOR — soft pastels with slowly cycling hues
    // ========================================================================

    // Map fractal luminance to dream pastel palette
    vec3 dream_col = dreamPastel(luma, iTime);

    // Tint lace threads with the pastel palette
    vec3 thread_tint = dreamPastel(luma * 0.7 + 0.15, iTime + 30.0);
    vec3 lace_col = mix(dream_col, thread_tint, 0.4);

    // Soft midnight lavender background
    vec3 bg = vec3(0.04, 0.03, 0.06);

    // Mix background and dream lace
    vec3 col = mix(bg, lace_col, lace);

    // Filigree highlights — soft pastel shimmer on fine intersections
    vec3 fil_pastel = dreamPastel(0.8, iTime + 60.0);
    col += fil_pastel * lace_fine * 0.12;

    // Rim detection — soft pastel edges
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    // Dream rim color: slowly cycling soft pastel
    vec3 rim_col = hsl2rgb(vec3(fract(iTime * 0.006 + 0.7), 0.3, 0.55));
    col += rim_col * rim * RIM_INTENSITY * 0.2;

    // ========================================================================
    // DREAMSTONE FOCAL — soft opalescent luminous glow
    // ========================================================================

    vec3 dream_interior = dream_iris * dreamstone_base * dream_pulse;

    // Soft specular
    vec3 dream_spec = vec3(0.95, 0.9, 0.98) * dream_sparkle * 0.4 * GEM_BRILLIANCE;

    // Dreamstone rim glow — soft lavender-white
    vec3 dream_rim_col = vec3(0.88, 0.82, 0.92) * dream_rim * GEM_BRILLIANCE * 0.6;

    vec3 dreamstone_col = dream_interior * GEM_BRILLIANCE
                        + dream_spec
                        + dream_rim_col;

    // Blend dreamstone into scene
    col = mix(col, dreamstone_col, focal * 0.7);

    // Outer glow — soft pastel halo around dreamstone
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    vec3 halo_col = hsl2rgb(vec3(fract(iTime * 0.004 + 0.5), 0.25, 0.7));
    col += halo_col * outer_glow * 0.06 * GEM_BRILLIANCE;

    // ========================================================================
    // NIGHTMARE MODE — dark spikes, contrast spike, sharp lace edges
    // ========================================================================

    // On nightmare: colors shift dark, contrast spikes
    float contrast_boost = mix(1.0, 2.8, drop);
    vec3 col_mid = vec3(0.15, 0.12, 0.18);  // dark lavender midpoint
    col = col_mid + (col - col_mid) * mix(1.0, contrast_boost, drop);

    // Lace sharpens during nightmare — woven threads become sharp wire
    float nightmare_lace_boost = mix(0.0, 0.15, drop);
    float sharp_lace = pow(max(lace, 0.0), mix(1.2, 3.5, drop));
    col += vec3(0.08, 0.04, 0.1) * (sharp_lace - lace) * nightmare_lace_boost * 3.0;

    // Background dims dramatically during nightmare
    float bg_dim = mix(1.0, 0.25, drop * (1.0 - focal));
    col *= bg_dim;

    // Dreamstone pulses bright during nightmare
    float blaze = focal * drop * 1.2;
    col += dreamstone_base * blaze * 0.3;
    col += vec3(0.95, 0.85, 1.0) * pow(f_safe, 2.5) * drop * 0.25;

    // Rim burns with dark purple during nightmare
    col += vec3(0.3, 0.1, 0.4) * rim * drop * 0.2;

    // ========================================================================
    // SOFT BLOOM — bright areas get a soft glow
    // ========================================================================

    float bloom_luma = dot(col, vec3(0.299, 0.587, 0.114));
    float bloom_mask = smoothstep(0.4, 0.8, bloom_luma);
    col += col * 0.1 * bloom_mask;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Very subtle beat response, only when nightmare is active
    if (beat) {
        col += vec3(0.06, 0.04, 0.07) * focal * NIGHTMARE_GATE;
        col *= 1.0 + 0.015 * NIGHTMARE_GATE;
    }

    col *= PULSE;

    // Very high feedback — dreamy smearing overlapping trails
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.97, FEEDBACK_MIX);  // 0.97 decay = very slow fade

    // Vignette — soft and deep for intimate dream feel
    float vign = 1.0 - pow(length(uv) * 0.5, 1.4);  // Soft and deep
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.03);

    // Soft brightness gating — less aggressive, dreamlike
    float bright_allowed = max(max(lace, rim * 0.3), max(focal, dream_rim * 0.5));
    col *= mix(0.2, 1.0, bright_allowed);

    // Tone mapping — soft rolloff for pastel palette preservation
    col = col / (col + vec3(0.65));

    // Gamma — push toward soft lavender in shadows
    col = pow(max(col, vec3(0.0)), vec3(0.92, 0.94, 0.9));

    P = vec4(col, drop_state);
}
