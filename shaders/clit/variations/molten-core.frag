// @fullscreen: true
// @mobile: true
// @tags: molten, lava, fractal, body, sexy
// Molten Core — Lava palette variation of clit/3
// Cool violet/blue chromadepth replaced with molten lava: white-hot core,
// orange magma, deep red, black obsidian. Lace = cooling cracks in obsidian.
// Gem = magma chamber. Slow languorous gyrations; fast reactions only on
// extreme z-scores (abs > 0.6+). Alive and moving even in silence.
// Based on Dom Mandy's complex power fractal
//
//https://visuals.beadfamous.com/?shader=clit/variations/molten-core&name=Molten%20Core

// ============================================================================
// CREATURE TRAITS — independent URL params that make each instance unique
// Usage: ?shader=clit/variations/molten-core&wing_speed=0.3&trail_amount=0.7
// All default to 0.5 (neutral). Range 0.0-1.0.
// ============================================================================

// Wing flap speed — lazy moth (0) vs hummingbird (1)
// #define WING_SPEED wing_speed
#define WING_SPEED 0.3
// #define WING_SPEED knob_71

// Wing span — tight subtle flutter (0) vs dramatic sweeping flap (1)
// #define WING_SPAN wing_span
#define WING_SPAN 0.4
// #define WING_SPAN knob_72

// Gem hue — ignored for molten variation (hardcoded magma)
// #define GLOW_HUE glow_hue
#define GLOW_HUE 0.08
// #define GLOW_HUE knob_73

// Lace density — delicate fairy threads (0) vs bold moth wings (1)
// #define LACE_DENSITY lace_density
#define LACE_DENSITY 0.5
// #define LACE_DENSITY knob_74

// Vignette tightness — wide open view (0) vs intimate close spotlight (1)
// #define VIGNETTE_SIZE vignette_size
#define VIGNETTE_SIZE 0.5
// #define VIGNETTE_SIZE knob_75

// Feedback/trails — crisp and sharp (0) vs ethereal ghosting (1)
// #define TRAIL_AMOUNT trail_amount
#define TRAIL_AMOUNT 0.7
// #define TRAIL_AMOUNT knob_76

// Warmth — always high for molten, but trait still modulates sub-tone
// #define WARMTH warmth
#define WARMTH 0.85
// #define WARMTH knob_77

// Fractal complexity — simple smooth forms (0) vs intricate dense detail (1)
// #define COMPLEXITY complexity
#define COMPLEXITY 0.5
// #define COMPLEXITY knob_78

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — SLOW BASE, FAST ONLY ON EXTREME Z-SCORES
// ============================================================================

// Shape complexity: slow oscillation as base, audio ONLY on extreme z-scores
// Base period ~25 seconds. Audio kicks in only when |spectralCentroidZScore| > 0.6
#define CENTROID_EXTREME step(0.6, abs(spectralCentroidZScore)) * spectralCentroidZScore
#define A (1.4 + 0.2 * sin(iTime * 0.04) + (COMPLEXITY - 0.5) * 0.3 + CENTROID_EXTREME * 0.15)
// #define A 1.5

// Body offset: slow drift as base, audio on extremes only
#define ENERGY_EXTREME step(0.6, abs(energyZScore)) * energyZScore
#define B (0.55 + 0.08 * sin(iTime * 0.025 + 1.0) + ENERGY_EXTREME * 0.1)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very subtle, only on extremes
#define BASS_EXTREME step(0.6, abs(bassZScore)) * bassZScore
#define PULSE (1.0 + BASS_EXTREME * 0.04)
// #define PULSE 1.0

// Feedback — HIGH for molten trailing (0.4+ base)
#define FEEDBACK_MIX (mapValue(TRAIL_AMOUNT, 0.0, 1.0, 0.35, 0.6) + energyNormalized * 0.05)
// #define FEEDBACK_MIX 0.45

// Rim lighting: slow pulsing ember glow, treble adds only on extremes
#define TREBLE_EXTREME step(0.6, abs(trebleZScore)) * trebleZScore
#define RIM_INTENSITY (0.5 + 0.15 * sin(iTime * 0.07) + TREBLE_EXTREME * 0.3)
// #define RIM_INTENSITY 0.6

// Rim color warmth: always warm for molten
#define RIM_WARMTH (0.7 + spectralRoughnessNormalized * 0.15)
// #define RIM_WARMTH 0.8

// Gem brilliance: slow ~15 second breathing cycle for magma chamber
#define MAGMA_BREATH (0.7 + 0.3 * sin(iTime * 0.42))
#define GEM_BRILLIANCE (MAGMA_BREATH + step(0.6, abs(spectralCrestZScore)) * spectralCrestZScore * 0.3)
// #define GEM_BRILLIANCE 1.0

// Gem dispersion: subtle, molten doesn't prismate much
#define GEM_DISPERSION (0.2 + spectralSpreadNormalized * 0.2)
// #define GEM_DISPERSION 0.3

// Tendril curl: VERY SLOW base period (30+ seconds), fast jitter only on extreme z-scores
#define FLAP_RATE mapValue(WING_SPEED, 0.0, 1.0, 0.02, 0.12)
#define FLAP_AMP mapValue(WING_SPAN, 0.0, 1.0, 0.15, 0.7)
#define CURL_JITTER (step(0.6, abs(spectralCentroidZScore)) * spectralCentroidSlope * 0.4)
#define TENDRIL_CURL (sin(iTime * FLAP_RATE) * FLAP_AMP + sin(iTime * FLAP_RATE * 0.37) * FLAP_AMP * 0.5 + CURL_JITTER)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent slow axis
#define CROSS_JITTER (step(0.6, abs(spectralSpreadZScore)) * spectralSpreadSlope * 0.3)
#define TENDRIL_CROSS (sin(iTime * FLAP_RATE * 0.61) * FLAP_AMP * 0.7 + sin(iTime * FLAP_RATE * 0.29 + 2.0) * FLAP_AMP * 0.4 + CROSS_JITTER)
// #define TENDRIL_CROSS 0.0

// Flow drift: very slow convective drift, slopes add only on extremes
#define FLOW_EXTREME_X (step(0.6, abs(spectralCentroidZScore)) * spectralCentroidSlope * 0.003)
#define FLOW_X (sin(iTime * 0.03) * 0.0008 + FLOW_EXTREME_X)
// #define FLOW_X 0.0
#define FLOW_EXTREME_Y (step(0.6, abs(spectralSpreadZScore)) * spectralSpreadSlope * 0.002)
#define FLOW_Y (cos(iTime * 0.023 + 1.5) * 0.0006 + FLOW_EXTREME_Y)
// #define FLOW_Y 0.0

// Drop trigger: VERY HIGH threshold — turbulence > 4.0 for crust-cracking events
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

// Drop state ramp/decay — slower ramp for molten feel
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.008
#define DROP_DECAY_MAX 0.04

// Heat shimmer intensity
#define SHIMMER_STRENGTH 0.002
#define SHIMMER_SPEED 0.1

// ============================================================================
// MOLTEN PALETTE — white-hot core to black obsidian
// ============================================================================

// Molten depth: t=0 white-hot, t=0.3 orange, t=0.6 deep red, t=1.0 obsidian
vec3 moltenPalette(float t) {
    t = clamp(t, 0.0, 1.0);

    // White-hot core
    vec3 white_hot = vec3(1.0, 0.95, 0.8);
    // Bright orange magma
    vec3 orange = vec3(1.0, 0.45, 0.05);
    // Deep red lava
    vec3 deep_red = vec3(0.6, 0.08, 0.02);
    // Black obsidian with faint red undertone
    vec3 obsidian = vec3(0.04, 0.008, 0.012);

    // Use oklab for perceptually smooth interpolation
    vec3 col;
    if (t < 0.3) {
        float s = t / 0.3;
        // White-hot to orange
        float L = mix(0.95, 0.72, s);
        float C = mix(0.06, 0.22, s);
        float h = mix(1.2, 0.9, s);
        col = clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    } else if (t < 0.6) {
        float s = (t - 0.3) / 0.3;
        // Orange to deep red
        float L = mix(0.72, 0.35, s);
        float C = mix(0.22, 0.18, s);
        float h = mix(0.9, 0.55, s);
        col = clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    } else {
        float s = (t - 0.6) / 0.4;
        // Deep red to obsidian
        float L = mix(0.35, 0.06, s);
        float C = mix(0.18, 0.02, s);
        float h = mix(0.55, 0.4, s);
        col = clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    }
    return col;
}

// Ember lace color — orange-gold for cooling crack lines
vec3 emberLace(float intensity) {
    float L = mix(0.3, 0.75, intensity);
    float C = mix(0.08, 0.2, intensity);
    float h = mix(0.6, 0.85, intensity);
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

    // Heat shimmer — slow UV distortion like heat haze
    vec2 uv_screen = gl_FragCoord.xy / iResolution.xy;
    float shimmer = sin(uv_screen.y * 8.0 + iTime * SHIMMER_SPEED) * SHIMMER_STRENGTH;
    shimmer += sin(uv_screen.y * 13.0 - iTime * SHIMMER_SPEED * 0.7 + 3.0) * SHIMMER_STRENGTH * 0.5;
    C.y += shimmer;

    // Time-driven curl — very slow languorous gyrations
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit trap for focal point (magma chamber)
    float focal_trap = 9.0;
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

        // Track orbit proximity to focal point
        float fd = length(V - focal_center);
        focal_trap = min(focal_trap, fd);
    }

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree lines — cooling cracks in obsidian crust
    float lace_lo = mapValue(LACE_DENSITY, 0.0, 1.0, -1.5, -2.5);
    float lace_hi = mapValue(LACE_DENSITY, 0.0, 1.0, -4.5, -5.5);
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    float lace_sharp = mapValue(LACE_DENSITY, 0.0, 1.0, 2.0, 4.0);
    lace = pow(max(lace, 0.0), lace_sharp);

    // Fractal structure — used for depth + internal variation
    float color_phase = 0.8;
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT detection — magma chamber glow
    // ========================================================================

    float focal_glow = smoothstep(0.5, 0.01, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 2.0);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Magma rim — bright ring at the chamber's edge
    float focal_inner = smoothstep(0.35, 0.02, focal_trap);
    float gem_rim = focal - pow(max(focal_inner, 0.0), 1.5);
    gem_rim = max(gem_rim, 0.0);
    gem_rim = pow(gem_rim, 0.6) * 2.5;

    // Magma specular — fractal structure creates natural highlight
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Internal magma pulse — slow ~15 second breathing cycle
    float gem_pulse = MAGMA_BREATH;

    // Magma dispersion — subtle heat color shift
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 1.8 - disp * 0.2),
        pow(f_safe, 2.0),
        pow(f_safe, 2.2 + disp * 0.2)
    );

    // Magma depth shading
    float gem_depth_shade = mix(0.4, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // MOLTEN DEPTH MAPPING
    // ========================================================================

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — crust cracking open, revealing white-hot interior
    // Requires turbulence > 4.0 (very extreme only)
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    // Higher threshold: 4.0 instead of 2.0 — only extreme events crack the crust
    float drop_signal = clamp(drop_trigger * smoothstep(3.0, 5.0, turbulence), 0.0, 1.0);

    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float prev_drop_state = getLastFrameColor(state_uv).a;

    float settled = AUDIO_SETTLED;
    float decay_rate = mix(DROP_DECAY_MIN, DROP_DECAY_MAX, settled);

    float drop_state = prev_drop_state;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, decay_rate);
    drop_state = clamp(drop_state, 0.0, 1.0);

    float drop = animateEaseInOutCubic(drop_state);

    // During build: depth compresses (everything shifts hotter)
    depth = mix(depth, depth * 0.7, build * 0.3);
    // During drop: background pushes colder, focal goes white-hot
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — Molten palette instead of chromadepth rainbow
    // ========================================================================

    // Molten color from depth
    vec3 molten_col = moltenPalette(depth);

    // Lace = cooling cracks — ember orange with dark obsidian gaps
    vec3 crack_color = emberLace(lace);
    // On drops, cracks go white-hot (crust breaking open)
    vec3 crack_hot = mix(crack_color, vec3(1.0, 0.92, 0.7), drop * 0.8);

    // Background: deep black-red instead of purple
    vec3 bg_obsidian = vec3(0.03, 0.005, 0.008);
    // Subtle slow color shift in background — convective undertone
    float bg_pulse = 0.5 + 0.5 * sin(iTime * 0.05 + uv.y * 2.0);
    bg_obsidian += vec3(0.02, 0.003, 0.0) * bg_pulse;

    // Compose: background, with lace cracks showing ember/hot lines
    vec3 col = mix(bg_obsidian, crack_hot, lace);

    // Filigree highlights — dim ember glow on finest intersections
    col += vec3(0.4, 0.15, 0.02) * lace_fine * 0.3;

    // Rim detection — edges glow like cooling magma seams
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    // Rim color: deep red to orange ember
    vec3 rim_col = mix(vec3(0.4, 0.05, 0.02), vec3(0.8, 0.25, 0.03), RIM_WARMTH);
    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // MAGMA CHAMBER FOCAL — deep orange/red/amber glow
    // ========================================================================

    float glow_energy = clamp(0.5 + ENERGY_EXTREME * 0.3, 0.0, 1.0);

    // Magma base color — deep orange/amber, not gem hues
    vec3 gem_base = vec3(0.9, 0.35, 0.04);
    vec3 gem_fire = vec3(1.0, 0.55, 0.08);
    vec3 gem_white = vec3(1.0, 0.9, 0.6);

    // Magma interior with slow breathing pulse
    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    // Sparkle — hot spots in the magma
    float sparkle_str = mix(0.3, 0.8, glow_energy);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Magma rim — orange to yellow-white
    vec3 rim_inner = vec3(1.0, 0.7, 0.2);
    vec3 rim_outer = vec3(0.7, 0.15, 0.02);
    vec3 gem_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.7, 1.2, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.85);

    // Outer magma glow — subtle ambient heat around focal
    float glow_str = mix(0.06, 0.2, glow_energy);
    float outer_glow = smoothstep(0.8, 0.0, focal_trap) * (1.0 - focal);
    col += gem_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // DROP MODE — crust cracks open, white-hot interior exposed
    // ========================================================================

    float bg_dim = mix(1.0, 0.3, drop);
    float focal_boost = mix(1.0, 2.0, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // On drops: rim seams go white-hot (crust cracking)
    vec3 rim_hot = vec3(1.0, 0.8, 0.3);
    col += rim_hot * rim * drop * 0.35;

    // Lace cracks go incandescent during drops
    col += vec3(1.0, 0.7, 0.2) * lace * drop * 0.3;

    // Magma chamber blazes on drops
    float blaze = focal * focal_boost * drop * glow_energy;
    col += gem_fire * blaze * 0.5;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.5;
    col += gem_prism * vec3(1.0, 0.6, 0.15) * gem_rim * drop * 0.3;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat flash — subtle ember pulse
    if (beat) {
        col += vec3(0.12, 0.04, 0.01) * focal;
        col *= 1.03;
    }

    col *= PULSE;

    // Frame feedback — HIGH for molten trailing
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Vignette — deep black edges, hot center
    float vign_power = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 1.2, 2.8);
    float vign_scale = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 0.5, 0.85);
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Brightness gating: only lace, rim, and focal get to be bright
    float bright_allowed = max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7));
    col *= mix(0.12, 1.0, bright_allowed);

    // Tone mapping — slightly warmer than base clit/3
    col = col / (col + vec3(0.65));

    // Gamma — warm bias for molten feel
    col = pow(max(col, vec3(0.0)), vec3(0.85, 0.9, 1.0));

    P = vec4(col, drop_state);
}
