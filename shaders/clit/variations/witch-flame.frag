// @fullscreen: true
// @mobile: true
// @tags: witch, flame, green, purple, supernatural, ambient, clit-variation
// Witch Flame — Supernatural fire interpretation of the clit fractal series
// Green and purple fire slowly dancing. Lace patterns are flame tongues licking
// upward. Background is deep void black. Gem is a soul-fire core — bright
// green-white. Slow upward drift and gentle flicker. On extreme z-scores,
// the flame roars — expands dramatically with bright white-green burst.
// Based on Dom Mandy's complex power fractal
//
//https://visuals.beadfamous.com/?shader=clit/variations/witch-flame

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — SLOW FLICKERING BASE, FAST ONLY ON EXTREME Z-SCORES
// Default = hypnotic slow flicker like a witch's green/purple flame
// Fast reactions ONLY on very abnormal z-scores (abs > 0.6)
// ============================================================================

// Z-score gate: returns 0 when normal, ramps up only past threshold
#define ZSCORE_GATE(zs, thresh) clamp((abs(zs) - thresh) / (1.0 - thresh), 0.0, 1.0)

// Shape complexity: slow dance with subtle faster flicker as base
// Audio kicks in only when |spectralCentroidZScore| > 0.6
#define A_BASE (1.5 + 0.2 * sin(iTime * 0.035) + 0.05 * sin(iTime * 0.11))
#define A_AUDIO (ZSCORE_GATE(spectralCentroidZScore, 0.6) * spectralCentroidZScore * 0.15)
#define A (A_BASE + A_AUDIO)
// #define A 1.5

// Body offset: slow drift, audio on extremes only
#define B_BASE (0.55 + 0.08 * sin(iTime * 0.028))
#define B_AUDIO (ZSCORE_GATE(energyZScore, 0.6) * energyZScore * 0.1)
#define B (B_BASE + B_AUDIO)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.0

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very subtle, only on extremes
#define PULSE_AUDIO (ZSCORE_GATE(bassZScore, 0.6) * bassZScore * 0.04)
#define PULSE (1.0 + PULSE_AUDIO)
// #define PULSE 1.0

// Feedback — HIGH for flame trail (0.4 base)
#define FEEDBACK_MIX (0.4 + ZSCORE_GATE(energyZScore, 0.6) * 0.08)
// #define FEEDBACK_MIX 0.4

// Rim lighting: slow pulsing supernatural glow, treble adds only on extremes
#define RIM_INTENSITY (0.45 + 0.15 * sin(iTime * 0.06) + ZSCORE_GATE(trebleZScore, 0.6) * trebleZScore * 0.3)
// #define RIM_INTENSITY 0.5

// Gem brilliance: slow ~18 second breathing cycle for soul-fire core
#define SOULFIRE_BREATH (0.75 + 0.25 * sin(iTime * 0.35))
#define GEM_BRILLIANCE (SOULFIRE_BREATH + ZSCORE_GATE(spectralCrestZScore, 0.6) * spectralCrestZScore * 0.3)
// #define GEM_BRILLIANCE 1.0

// Gem dispersion: subtle green-shifted prismatic
#define GEM_DISPERSION (0.25 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadZScore * 0.25)
// #define GEM_DISPERSION 0.3

// Tendril curl: slow flame dance (period ~20s), roar on z > 0.6
#define FLAME_DANCE_RATE 0.314  // ~20s period
#define FLAME_DANCE_AMP 0.4
#define FLAME_JITTER (ZSCORE_GATE(spectralFluxZScore, 0.6) * spectralFluxZScore * 0.5)
#define TENDRIL_CURL (sin(iTime * FLAME_DANCE_RATE) * FLAME_DANCE_AMP + sin(iTime * FLAME_DANCE_RATE * 0.43) * FLAME_DANCE_AMP * 0.5 + FLAME_JITTER)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent slow drift with slight lateral waver
#define CROSS_JITTER (ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadZScore * 0.3)
#define TENDRIL_CROSS (sin(iTime * FLAME_DANCE_RATE * 0.67) * FLAME_DANCE_AMP * 0.6 + sin(iTime * FLAME_DANCE_RATE * 0.31 + 1.5) * FLAME_DANCE_AMP * 0.35 + CROSS_JITTER)
// #define TENDRIL_CROSS 0.0

// Flow drift: CONSTANT UPWARD DRIFT (fire rises) + slight lateral waver
// Plus audio-reactive slope on extremes
#define FLOW_EXTREME_X (ZSCORE_GATE(spectralCentroidZScore, 0.6) * spectralCentroidSlope * 0.003)
#define FLOW_X (sin(iTime * 0.04) * 0.0012 + FLOW_EXTREME_X)
// #define FLOW_X 0.0
#define FLOW_EXTREME_Y (ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadSlope * 0.002)
#define FLOW_Y (-0.0015 + cos(iTime * 0.025) * 0.0004 + FLOW_EXTREME_Y)
// #define FLOW_Y 0.0

// Drop trigger: requires turbulence > 4.0 — flame roar events
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Drop state ramp/decay — slow ramp for flame roar buildup, slow decay for lingering
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.008
#define DROP_DECAY_MAX 0.04

// Flame roar threshold
#define ROAR_THRESHOLD 4.0

// ============================================================================
// WITCH FLAME PALETTE — supernatural green to deep purple
// ============================================================================

// Flame tongue color: green base fading to purple tips
vec3 witchFlameLace(float intensity, float height) {
    // height: 0 = base (green), 1 = tip (purple)
    vec3 green_flame = vec3(0.2, 0.9, 0.3);
    vec3 purple_tip = vec3(0.5, 0.15, 0.7);
    vec3 base_col = mix(green_flame, purple_tip, height);

    // Intensity modulates brightness
    float L = mix(0.15, 0.65, intensity);
    float C = mix(0.05, 0.2, intensity);
    // Hue: green (2.4 rad) to purple (4.7 rad) based on height
    float h = mix(2.4, 4.7, height);
    return clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Flame heat shimmer — slow UV ripple like supernatural fire
    vec2 uv_screen = gl_FragCoord.xy / iResolution.xy;
    float shimmer = sin(uv_screen.y * 6.0 + iTime * 0.08) * 0.0015;
    shimmer += sin(uv_screen.y * 11.0 - iTime * 0.06 + 2.0) * 0.001;
    C.x += shimmer;

    // Time-driven curl — slow flame dance
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — soft accumulated proximity for soul-fire gem
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

        // Soft accumulated proximity for soul-fire core
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
    // LACE = FLAME TONGUES
    // Soft-medium sharpening (2.0) for flame-tongue shapes
    // ========================================================================

    float lace_lo = -2.0;
    float lace_hi = -5.0;
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 2.0);  // Soft-medium for flame-tongue shapes

    // Flame flicker: subtle brightness noise on lace
    float flame_flicker = sin(C.y * 20.0 + iTime * 0.3) * 0.05;
    lace = clamp(lace + flame_flicker * lace, 0.0, 1.0);

    // Fractal structure for angular variation
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — soul-fire core: brilliant green-white
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Soul-fire rim — soft organic halo
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Soul-fire specular
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Internal soul-fire pulse — slow breathing like a trapped spirit
    float gem_pulse = SOULFIRE_BREATH;

    // Prismatic dispersion — green-shifted
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 2.0 + disp * 0.2),   // Red channel pushed back
        pow(f_safe, 1.7 - disp * 0.3),   // Green channel pulled forward
        pow(f_safe, 1.9)                   // Blue neutral
    );

    float gem_depth_shade = mix(0.5, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // DEPTH MAPPING
    // ========================================================================

    float base_depth = mix(0.5, 0.9, 1.0 - luma);
    float detail_depth = mix(0.15, 0.45, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — flame roar: expansion + white-green burst
    // Requires turbulence > 4.0 (only extreme events trigger the roar)
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    float drop_signal = clamp(drop_trigger * smoothstep(ROAR_THRESHOLD - 1.0, ROAR_THRESHOLD, turbulence), 0.0, 1.0);

    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float prev_drop_state = getLastFrameColor(state_uv).a;

    float settled = AUDIO_SETTLED;
    float decay_rate = mix(DROP_DECAY_MIN, DROP_DECAY_MAX, settled);

    float drop_state = prev_drop_state;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, decay_rate);
    drop_state = clamp(drop_state, 0.0, 1.0);

    float drop = animateEaseInOutCubic(drop_state);

    // During build: depth compresses (flame consolidates)
    depth = mix(depth, depth * 0.7, build * 0.3);
    // During roar: background pushes darker, focal goes brilliant
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — supernatural green-purple flame palette
    // ========================================================================

    // Height estimate from fractal position for green-to-purple gradient
    // C.y runs roughly -0.3 to 0.3, normalize to 0-1 as "flame height"
    float flame_height = clamp((C.y + 0.3) / 0.6, 0.0, 1.0);

    // Flame tongue color: green at base, purple at tips
    vec3 flame_col = witchFlameLace(lace, flame_height);

    // Background: void black with faintest green undertone
    vec3 bg_void = vec3(0.005, 0.01, 0.005);

    // Subtle slow background pulse — witch's hearth glow
    float bg_pulse = 0.5 + 0.5 * sin(iTime * 0.04 + uv.y * 1.5);
    bg_void += vec3(0.0, 0.008, 0.003) * bg_pulse;

    // Compose: void background with flame tongue lace
    vec3 col = mix(bg_void, flame_col, lace);

    // Filigree highlights — bright green sparks on finest intersections
    col += vec3(0.15, 0.5, 0.2) * lace_fine * 0.25;

    // Rim detection — flame edges glow with purple-green gradient
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    // Rim color: purple-green gradient (purple outer, green inner)
    vec3 rim_purple = vec3(0.4, 0.1, 0.6);
    vec3 rim_green = vec3(0.15, 0.6, 0.25);
    float rim_gradient = smoothstep(0.0, 1.0, flame_height);
    vec3 rim_col = mix(rim_green, rim_purple, rim_gradient);
    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // SOUL-FIRE FOCAL — brilliant green-white core
    // ========================================================================

    float glow_energy = clamp(0.5 + ZSCORE_GATE(energyZScore, 0.6) * energyZScore * 0.3, 0.0, 1.0);

    // Soul-fire base: brilliant green-white
    vec3 soulfire_base = vec3(0.5, 1.0, 0.6);
    vec3 soulfire_hot = vec3(0.7, 1.0, 0.75);
    vec3 soulfire_white = vec3(0.9, 1.0, 0.92);

    // Soul-fire interior with slow breathing pulse
    vec3 gem_interior = gem_prism * soulfire_base * gem_pulse * gem_depth_shade;

    // Sparkle — bright green-white hot spots
    float sparkle_str = mix(0.4, 0.9, glow_energy);
    vec3 gem_specular = soulfire_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Soul-fire halo — green to purple outer glow
    vec3 halo_inner = vec3(0.6, 1.0, 0.7);
    vec3 halo_outer = vec3(0.35, 0.2, 0.6);
    vec3 gem_rim_col = mix(halo_outer, halo_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.7, 1.2, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.85);

    // Outer soul-fire glow — faint green halo around the core
    float glow_str = mix(0.06, 0.2, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += soulfire_base * outer_glow * glow_str * GEM_BRILLIANCE * 0.6;

    // ========================================================================
    // FLAME ROAR (drop mode) — expand + brighten + white-green core
    // ========================================================================

    // During roar: background dims to pure black, flame expands
    float bg_dim = mix(1.0, 0.15, drop);
    float focal_boost = mix(1.0, 2.5, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Roar: rim seams go bright green-white (supernatural burst)
    vec3 roar_rim = vec3(0.4, 1.0, 0.5);
    col += roar_rim * rim * drop * 0.35;

    // Lace flame tongues go incandescent during roar
    col += vec3(0.3, 0.9, 0.4) * lace * drop * 0.3;

    // Soul-fire blazes on roar — white-green explosion
    float blaze = focal * focal_boost * drop * glow_energy;
    col += soulfire_hot * blaze * 0.5;
    col += soulfire_white * pow(f_safe, 2.5) * drop * glow_energy * 0.5;
    col += gem_prism * vec3(0.3, 1.0, 0.5) * gem_rim * drop * 0.3;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat response — very subtle green flash, only during extreme audio
    if (beat) {
        float beat_strength = ZSCORE_GATE(energyZScore, 0.5) * 0.5;
        col += vec3(0.02, 0.1, 0.04) * focal * beat_strength;
        col *= 1.0 + 0.03 * beat_strength;
    }

    col *= PULSE;

    // Frame feedback — HIGH (0.4) for flame trail persistence
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Vignette — deep black edges for void framing
    float vign = 1.0 - pow(length(uv) * 0.6, 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Brightness gating — only flame tongues, rim, and soul-fire get to shine
    float bright_allowed = max(max(lace, rim * 0.4), max(focal, gem_rim * 0.6));
    col *= mix(0.1, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Final gamma — green push for supernatural flame feel
    col = pow(max(col, vec3(0.0)), vec3(0.95, 0.85, 0.92));

    P = vec4(col, drop_state);
}
