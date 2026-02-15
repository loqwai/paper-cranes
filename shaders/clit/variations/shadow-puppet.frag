// @fullscreen: true
// @mobile: true
// @tags: shadow, puppet, wayang, silhouette, ambient, clit-variation
// Shadow Puppet — Indonesian wayang-style shadow play
// Dark fractal silhouettes against warm backlit amber screen.
// Gem = bright light source behind the screen. Lace = intricate shadow filigree.
// Default: SLOW shadow dance. Fast reactions ONLY on very abnormal z-scores (abs > 0.6).
// Mysterious shadow dance in silence. Based on Dom Mandy's complex power fractal.
//
//https://visuals.beadfamous.com/?shader=clit/variations/shadow-puppet

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — gated by z-score threshold
// Audio only kicks in on VERY abnormal z-scores (abs > 0.6)
// ============================================================================

// Z-score gate: returns 0 when normal, ramps up only past threshold
#define ZSCORE_GATE(zs, thresh) clamp((abs(zs) - thresh) / (1.0 - thresh), 0.0, 1.0)

// Shape complexity: very slow puppet movement, ~40s full cycle
// Audio perturbs only on extreme z-scores — jerky puppet hand movements
#define A_BASE (1.5 + 0.15 * sin(iTime * 0.025))
#define A_JERK (ZSCORE_GATE(spectralCentroidZScore, 0.6) * spectralCentroidZScore * 0.2)
#define A (A_BASE + A_JERK)
// #define A 1.5

// Body offset: slow sine drift, extreme energy causes puppet to lurch
#define B_BASE (0.55 + 0.06 * sin(iTime * 0.03))
#define B_JERK (ZSCORE_GATE(energyZScore, 0.6) * energyZScore * 0.1)
#define B (B_BASE + B_JERK)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.0

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very subtle, gated at 0.6
#define PULSE (1.0 + ZSCORE_GATE(bassZScore, 0.6) * bassZScore * 0.03)
// #define PULSE 1.0

// Low feedback for crisp shadow edges
#define FEEDBACK_MIX (0.15 + ZSCORE_GATE(energyZScore, 0.6) * 0.05)
// #define FEEDBACK_MIX 0.15

// Rim lighting: warm glow around shadow edges — subtle, gated
#define RIM_INTENSITY (0.4 + ZSCORE_GATE(trebleZScore, 0.6) * 0.3)
// #define RIM_INTENSITY 0.4

// Gem brilliance: the light source behind the screen — slow breathing
#define LAMP_BREATH (0.85 + 0.15 * sin(iTime * 0.35))
#define GEM_BRILLIANCE (LAMP_BREATH + ZSCORE_GATE(spectralCrestZScore, 0.6) * spectralCrestZScore * 0.3)
// #define GEM_BRILLIANCE 0.9

// Gem dispersion: subtle warm color separation
#define GEM_DISPERSION (0.2 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * 0.2)
// #define GEM_DISPERSION 0.2

// Tendril curl: slow puppet dance (~30s period)
// Jerky sharp movements only on z > 0.6
#define PUPPET_RATE 0.21  // ~30s period
#define PUPPET_AMP 0.3
#define PUPPET_JERK (ZSCORE_GATE(spectralFluxZScore, 0.6) * spectralFluxZScore * 0.6 + ZSCORE_GATE(spectralCentroidZScore, 0.6) * spectralCentroidSlope * 0.5)
#define TENDRIL_CURL (sin(iTime * PUPPET_RATE) * PUPPET_AMP + sin(iTime * PUPPET_RATE * 0.37) * PUPPET_AMP * 0.5 + PUPPET_JERK)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent slow puppet arm sway
#define CROSS_JERK (ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadZScore * 0.4 + ZSCORE_GATE(bassZScore, 0.6) * bassZScore * 0.3)
#define TENDRIL_CROSS (sin(iTime * PUPPET_RATE * 0.61) * PUPPET_AMP * 0.7 + sin(iTime * PUPPET_RATE * 0.29 + 2.0) * PUPPET_AMP * 0.35 + CROSS_JERK)
// #define TENDRIL_CROSS 0.0

// Flow drift: very slow parallax drift — suggests depth of the screen
#define FLOW_X (sin(iTime * 0.015) * 0.0008 + ZSCORE_GATE(spectralCentroidZScore, 0.6) * spectralCentroidSlope * 0.002)
// #define FLOW_X 0.0
#define FLOW_Y (cos(iTime * 0.02) * 0.0006 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadSlope * 0.001)
// #define FLOW_Y 0.0

// Drop trigger: requires very high turbulence (4.5+) for light flare
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Drop state ramp/decay
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.01
#define DROP_DECAY_MAX 0.05

// Light flare threshold — only extreme turbulence triggers the flare
#define FLARE_THRESHOLD 4.5

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Slow puppet sway — very subtle screen-space parallax
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulate soft proximity for light source glow
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

        // Soft accumulated proximity for light source
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // ========================================================================
    // LACE = SHADOW FILIGREE — very sharp (power 4.0) for precise puppet edges
    // ========================================================================

    float lace_lo = -2.0;
    float lace_hi = -5.0;
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 4.0);  // Very sharp — crisp shadow puppet cutouts

    // Fractal structure for depth variation
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — light source behind the screen
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Light source rim — warm halo where lamp meets screen
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float lamp_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    lamp_rim = max(lamp_rim, 0.0) * 2.0;

    // Specular — fractal structure creates natural lamp texture
    float lamp_detail = smoothstep(0.3, 0.8, z) * focal;
    float lamp_sparkle = pow(lamp_detail, 3.0);

    // Lamp pulse — slow breathing of the oil lamp behind the screen
    float lamp_pulse = LAMP_BREATH;

    // Warm color separation for lamp
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 lamp_prism = vec3(
        pow(f_safe, 1.8 - disp * 0.2),
        pow(f_safe, 2.0),
        pow(f_safe, 2.2 + disp * 0.2)
    );

    float lamp_depth_shade = mix(0.5, 1.0, smoothstep(0.0, 0.7, lamp_rim + lamp_sparkle * 0.3));

    // ========================================================================
    // DROP STATE — light flare: background brightens dramatically
    // Requires turbulence > 4.5 (very extreme only)
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    float drop_signal = clamp(drop_trigger * smoothstep(FLARE_THRESHOLD - 1.0, FLARE_THRESHOLD, turbulence), 0.0, 1.0);

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
    // COLOR — INVERTED: lace = DARK shadow, background = warm amber LIGHT
    // This is the core shadow puppet inversion
    // ========================================================================

    // Warm backlit screen — dim amber glow (the screen itself)
    vec3 screen_amber = vec3(0.8, 0.6, 0.3) * 0.3;

    // Subtle screen texture grain — like handmade screen material
    float grain = staticRandom(gl_FragCoord.xy * 0.5) * 0.08 - 0.04;
    screen_amber += vec3(grain * 0.6, grain * 0.4, grain * 0.2);
    screen_amber = max(screen_amber, vec3(0.0));

    // Shadow color — deep near-black with warm undertone
    vec3 shadow_black = vec3(0.02, 0.015, 0.01);

    // SUBTRACTIVE: lace = shadow (dark), background = lit screen (warm)
    // Where lace is strong, shadow is dark. Where lace is absent, screen glows.
    vec3 col = mix(screen_amber, shadow_black, lace);

    // Fine filigree as delicate shadow detail — darkening, not brightening
    col -= vec3(0.03, 0.02, 0.01) * lace_fine;
    col = max(col, vec3(0.0));

    // ========================================================================
    // RIM = warm glow around shadow edges (light diffraction at puppet edges)
    // ========================================================================

    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    // Warm amber-gold rim glow — light diffracting around puppet edges
    vec3 rim_col = vec3(0.7, 0.45, 0.15);
    col += rim_col * rim * RIM_INTENSITY * 0.25;

    // ========================================================================
    // LAMP FOCAL — brilliant warm white light source behind the screen
    // vec3(1.0, 0.9, 0.7) — warm oil lamp white
    // ========================================================================

    float glow_energy = clamp(0.5 + ZSCORE_GATE(energyZScore, 0.6) * energyZScore * 0.3, 0.0, 1.0);

    // Lamp base color: warm white — like an oil lamp or candle
    vec3 lamp_base = vec3(1.0, 0.9, 0.7);
    vec3 lamp_hot = vec3(1.0, 0.95, 0.85);
    vec3 lamp_white = vec3(1.0, 0.97, 0.9);

    // Lamp interior with warm prismatic separation
    vec3 lamp_interior = lamp_prism * lamp_base * lamp_pulse * lamp_depth_shade;

    // Specular highlights on the lamp
    float sparkle_str = mix(0.4, 0.8, glow_energy);
    vec3 lamp_specular = lamp_white * lamp_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Lamp rim glow — amber to gold halo
    vec3 halo_inner = vec3(1.0, 0.85, 0.5);
    vec3 halo_outer = vec3(0.6, 0.35, 0.1);
    vec3 lamp_halo_col = mix(halo_outer, halo_inner, smoothstep(0.0, 1.0, lamp_rim));
    vec3 lamp_halo_light = lamp_halo_col * lamp_rim * GEM_BRILLIANCE;

    float lamp_energy_boost = mix(0.8, 1.2, glow_energy);
    vec3 lamp_col = lamp_interior * GEM_BRILLIANCE * lamp_energy_boost
                  + lamp_specular
                  + lamp_halo_light;

    // Blend lamp into scene — light source shines through/behind shadows
    col = mix(col, lamp_col, focal * 0.85);

    // Outer lamp glow — warm amber halo that illuminates nearby screen
    float glow_str = mix(0.06, 0.18, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += lamp_base * outer_glow * glow_str * GEM_BRILLIANCE * 0.5;

    // ========================================================================
    // LIGHT FLARE (drop mode) — screen brightens dramatically,
    // shadows become razor sharp with bright halos
    // ========================================================================

    // On drop/flare: the screen itself brightens — the lamp flares up
    float screen_flare = mix(1.0, 2.5, drop);
    // Only brighten the screen areas (non-shadow), keep shadows dark
    float is_screen = 1.0 - lace;  // Inverted: non-lace = screen
    col *= mix(1.0, screen_flare, is_screen);

    // Shadow edges get bright halos during flare (light overloading around edges)
    vec3 halo_hot = vec3(1.0, 0.8, 0.4);
    col += halo_hot * rim * drop * 0.35;

    // Lamp blazes white-hot during flare
    float blaze = focal * mix(1.0, 2.2, drop) * drop * glow_energy;
    col += lamp_hot * blaze * 0.5;
    col += lamp_white * pow(f_safe, 2.5) * drop * glow_energy * 0.4;

    // Warm amber wash during flare — entire screen gets warmer
    col += vec3(0.15, 0.08, 0.02) * drop * is_screen * 0.5;

    // During build: shadows deepen (puppet moves closer to screen)
    col *= mix(1.0, 0.85, build * lace);

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat response — very subtle lamp flicker, only on extreme audio
    if (beat) {
        float beat_str = ZSCORE_GATE(energyZScore, 0.5) * 0.5;
        col += vec3(0.06, 0.04, 0.01) * focal * beat_str;
        col *= 1.0 + 0.02 * beat_str;
    }

    col *= PULSE;

    // Frame feedback — LOW (0.15) for crisp shadow edges
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.95, FEEDBACK_MIX);

    // Vignette — warm darkening at edges, like a lit screen seen from the audience
    float vign = 1.0 - pow(length(uv) * 0.55, 1.5);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 1.5), drop);
    col *= max(vign, 0.03);

    // Brightness gating — screen areas can glow, shadows stay suppressed
    // But inverted from normal: allow screen (non-lace) areas to be bright
    float bright_allowed = max(max(is_screen * 0.7, rim * 0.4), max(focal, lamp_rim * 0.6));
    col *= mix(0.08, 1.0, bright_allowed);

    // Tone mapping — warm rolloff for amber palette
    col = col / (col + vec3(0.6, 0.65, 0.75));

    // Gamma — warm amber push: darken blues, keep reds/greens warm
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 1.0));

    P = vec4(col, drop_state);
}
