// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, sexy, ambient, breathing
// Breathing Tides — slow languorous gyration variant of the clit fractal
// The entire fractal breathes in and out like ocean tides on very slow sine waves.
// Fast/intense reactions only on extreme z-scores (abs > 0.6+).
// Alive and slowly undulating even in total silence.
//
// Based on clit/3 (Dom Mandy's complex power fractal)

// ============================================================================
// CREATURE TRAITS — independent URL params that make each instance unique
// Usage: ?shader=clit/variations/breathing-tides&wing_speed=0.3&warmth=0.6
// All default to 0.5 (neutral). Range 0.0-1.0.
// ============================================================================

// Wing flap speed — lazy moth (0) vs hummingbird (1)
// #define WING_SPEED wing_speed
#define WING_SPEED 0.3
// #define WING_SPEED knob_71

// Wing span — tight subtle flutter (0) vs dramatic sweeping flap (1)
// #define WING_SPAN wing_span
#define WING_SPAN 0.5
// #define WING_SPAN knob_72

// Gem hue — ruby(0) → amber(0.2) → emerald(0.4) → sapphire(0.6) → amethyst(0.8) → ruby(1)
// #define GLOW_HUE glow_hue
#define GLOW_HUE 0.0
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

// Color temperature — cool violet-blue tones (0) vs warm pink-amber (1)
// #define WARMTH warmth
#define WARMTH 0.5
// #define WARMTH knob_77

// Fractal complexity — simple smooth forms (0) vs intricate dense detail (1)
// #define COMPLEXITY complexity
#define COMPLEXITY 0.5
// #define COMPLEXITY knob_78

// ============================================================================
// BREATHING TIDES — slow oscillation parameters
// ============================================================================

// Breathing periods (seconds per full cycle)
#define BREATH_PERIOD_A 34.0
#define BREATH_PERIOD_B 26.0
#define FOCAL_PERIOD_X 40.0
#define FOCAL_PERIOD_Y 28.0
#define LACE_PULSE_PERIOD 24.0
#define HUE_DRIFT_PERIOD 60.0

// Breathing ranges for A and B
#define A_CENTER 1.5
#define A_RANGE 0.2
#define B_CENTER 0.55
#define B_RANGE 0.1

// Z-score gate threshold — audio only kicks in above this
#define ZSCORE_GATE 0.6

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — gated by z-score magnitude
// Only extreme audio events break through the slow breathing
// ============================================================================

// Gating function: returns 0 when |zScore| < ZSCORE_GATE, ramps up above it
#define GATE(zs) clamp((abs(zs) - ZSCORE_GATE) / (1.0 - ZSCORE_GATE), 0.0, 1.0)

// Shape complexity: slow breathing oscillation + gated audio reactivity
#define A_BREATH (A_CENTER + A_RANGE * sin(iTime * 6.2832 / BREATH_PERIOD_A) + (COMPLEXITY - 0.5) * 0.3)
#define A_AUDIO (GATE(spectralCentroidZScore) * spectralCentroidZScore * 0.15)
#define A (A_BREATH + A_AUDIO)
// #define A 1.5

// Body offset: slow breathing + gated energy response
#define B_BREATH (B_CENTER + B_RANGE * sin(iTime * 6.2832 / BREATH_PERIOD_B + 1.2))
#define B_AUDIO (GATE(energyZScore) * energyZScore * 0.1)
#define B (B_BREATH + B_AUDIO)
// #define B 0.55

// Focal center drifts in a figure-8 (Lissajous pattern)
#define FOCAL_X (sin(iTime * 6.2832 / FOCAL_PERIOD_X) * 0.05)
#define FOCAL_Y (0.12 + cos(iTime * 6.2832 / FOCAL_PERIOD_Y) * 0.04)

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — gentler, only on gated z-scores
#define PULSE (1.0 + GATE(bassZScore) * bassZScore * 0.04)
// #define PULSE 1.0

// Feedback — higher base for dreamy trails, gentle energy modulation
#define FEEDBACK_MIX (mapValue(TRAIL_AMOUNT, 0.0, 1.0, 0.2, 0.6) + energyNormalized * 0.05)
// #define FEEDBACK_MIX 0.4

// Rim lighting: treble drives the body edge glow
#define RIM_INTENSITY (0.4 + trebleNormalized * 0.6)
// #define RIM_INTENSITY 0.7

// Rim color warmth: warmth trait + slow hue drift over time
#define WARMTH_DRIFTED (WARMTH + 0.15 * sin(iTime * 6.2832 / HUE_DRIFT_PERIOD))
#define RIM_WARMTH (mapValue(WARMTH_DRIFTED, 0.0, 1.0, 0.1, 0.7) + spectralRoughnessNormalized * 0.15)
// #define RIM_WARMTH 0.5

// Gem brilliance: how intensely the focal gem glows
#define GEM_BRILLIANCE (0.8 + spectralCrestNormalized * 0.5)
// #define GEM_BRILLIANCE 1.0

// Gem dispersion: prismatic color separation driven by spectral spread
#define GEM_DISPERSION (0.3 + spectralSpreadNormalized * 0.4)
// #define GEM_DISPERSION 0.5

// Lace opacity gently pulses with breathing
#define LACE_BREATH (0.7 + 0.3 * sin(iTime * 6.2832 / LACE_PULSE_PERIOD))

// Tendril curl: slower default flap for breathing feel
#define FLAP_RATE mapValue(WING_SPEED, 0.0, 1.0, 0.04, 0.3)
#define FLAP_AMP mapValue(WING_SPAN, 0.0, 1.0, 0.15, 0.9)
#define TENDRIL_CURL (sin(iTime * FLAP_RATE) * FLAP_AMP + sin(iTime * FLAP_RATE * 0.57) * FLAP_AMP * 0.6 + GATE(spectralCentroidZScore) * spectralCentroidSlope * 0.3)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent flap axis for asymmetry
#define TENDRIL_CROSS (sin(iTime * FLAP_RATE * 0.77) * FLAP_AMP * 0.8 + sin(iTime * FLAP_RATE * 0.43 + 1.0) * FLAP_AMP * 0.5 + GATE(spectralSpreadZScore) * spectralSpreadSlope * 0.2)
// #define TENDRIL_CROSS 0.0

// Flow drift: slopes drive feedback UV offset — gentler
#define FLOW_X (spectralCentroidSlope * 0.002)
// #define FLOW_X 0.0
#define FLOW_Y (spectralSpreadSlope * 0.0015)
// #define FLOW_Y 0.0

// Drop trigger: HIGHER turbulence threshold (4.0 instead of 2.0) for more extreme events only
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

// Calm heuristic: how "normal" is the audio right now?
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

// Drop state ramp/decay speeds — slower decay for lingering drop feel
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.008
#define DROP_DECAY_MAX 0.04

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
    vec3 lab = vec3(L, C * cos(h), C * sin(h));
    return clamp(oklab2rgb(lab), 0.0, 1.0);
}

vec3 warmChromadepth(float depth, float warmth) {
    vec3 cd = chromadepth(depth);
    vec3 warm_tint = mix(
        vec3(0.95, 0.3, 0.15),
        vec3(0.04, 0.01, 0.06),
        depth
    );
    return mix(cd, warm_tint, warmth);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Time-driven curl flaps the wings — X and Y at different phases for asymmetry
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit trap for focal point — drifting figure-8
    float focal_trap = 9.0;
    vec2 focal_center = vec2(FOCAL_X, FOCAL_Y);

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

    // Lace/filigree lines from orbit traps — lace_density controls thread thickness
    float lace_lo = mapValue(LACE_DENSITY, 0.0, 1.0, -1.5, -2.5);
    float lace_hi = mapValue(LACE_DENSITY, 0.0, 1.0, -4.5, -5.5);
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    float lace_sharp = mapValue(LACE_DENSITY, 0.0, 1.0, 2.0, 4.0);
    lace = pow(max(lace, 0.0), lace_sharp);

    // Apply breathing lace opacity pulse
    lace *= LACE_BREATH;
    lace_fine *= LACE_BREATH;

    // Fractal structure for depth mapping — warmth drifts slowly over time
    float color_phase = (WARMTH_DRIFTED - 0.5) * 1.5;
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT detection — gem-like brilliance
    // ========================================================================

    float focal_glow = smoothstep(0.5, 0.01, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 2.0);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Gem rim — bright ring at the focal region's edge
    float focal_inner = smoothstep(0.35, 0.02, focal_trap);
    float gem_rim = focal - pow(max(focal_inner, 0.0), 1.5);
    gem_rim = max(gem_rim, 0.0);
    gem_rim = pow(gem_rim, 0.6) * 2.5;

    // Gem specular — fractal structure creates natural highlight variation
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Internal brilliance — slow breathing pulse (even slower than original)
    float gem_pulse = 0.8 + 0.2 * sin(iTime * 0.4);

    // Prismatic dispersion
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 1.8 - disp * 0.3),
        pow(f_safe, 2.0),
        pow(f_safe, 1.8 + disp * 0.3)
    );

    // Gem depth shading
    float gem_depth_shade = mix(0.4, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // CHROMADEPTH MAPPING
    // ========================================================================

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — sustained mode change, requires MORE extreme z-scores
    // Turbulence threshold raised to 4.0 (from 2.0) for rarer triggers
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    float drop_signal = clamp(drop_trigger * smoothstep(4.0, 6.0, turbulence), 0.0, 1.0);

    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float prev_drop_state = getLastFrameColor(state_uv).a;

    float settled = AUDIO_SETTLED;
    float decay_rate = mix(DROP_DECAY_MIN, DROP_DECAY_MAX, settled);

    float drop_state = prev_drop_state;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, decay_rate);
    drop_state = clamp(drop_state, 0.0, 1.0);

    float drop = animateEaseInOutCubic(drop_state);

    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — lace keeps its original rainbow, always
    // ========================================================================

    vec3 sexy_col = rainbow.rgb;

    // Background: warmth drifts slowly over time for shifting mood
    float bg_warmth = clamp(WARMTH_DRIFTED, 0.0, 1.0);
    vec3 bg_cool = vec3(0.02, 0.015, 0.08);
    vec3 bg_warm = vec3(0.06, 0.02, 0.04);
    vec3 bg_purple = mix(bg_cool, bg_warm, bg_warmth);

    vec3 col = mix(bg_purple, sexy_col, lace);

    // Filigree highlights — warmth shifts from pearly cool to golden
    vec3 fil_cool = vec3(0.6, 0.5, 0.75);
    vec3 fil_warm = vec3(0.8, 0.6, 0.45);
    col += mix(fil_cool, fil_warm, bg_warmth) * lace_fine * 0.25;

    // Rim detection
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    vec3 rim_cool = vec3(0.3, 0.15, 0.65);
    vec3 rim_warm = vec3(0.8, 0.3, 0.5);
    vec3 rim_col = mix(rim_cool, rim_warm, RIM_WARMTH);

    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // GEM FOCAL — brilliance driven by energy
    // ========================================================================

    float glow_energy = clamp(energyNormalized + energyZScore * 0.3, 0.0, 1.0);

    // Gem base color — glow_hue rotates through gem types
    float gem_h = GLOW_HUE * 6.2832;
    vec3 gem_base = vec3(
        0.6 + 0.4 * cos(gem_h),
        0.15 + 0.35 * cos(gem_h + 2.094),
        0.15 + 0.35 * cos(gem_h + 4.189)
    );
    gem_base = max(gem_base, vec3(0.05));
    vec3 gem_fire = vec3(
        0.7 + 0.3 * cos(gem_h),
        0.3 + 0.2 * cos(gem_h + 2.094),
        0.2 + 0.2 * cos(gem_h + 4.189)
    );
    vec3 gem_white = vec3(1.0, 0.85, 0.95);

    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    float sparkle_str = mix(0.4, 0.9, glow_energy);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    vec3 rim_inner = vec3(1.0, 0.25, 0.45);
    vec3 rim_outer = vec3(0.5, 0.2, 0.9);
    vec3 gem_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.7, 1.3, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.85);

    float glow_str = mix(0.08, 0.25, glow_energy);
    float outer_glow = smoothstep(0.8, 0.0, focal_trap) * (1.0 - focal);
    col += gem_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // DROP MODE — sustained spotlight, not color replacement
    // ========================================================================

    float bg_dim = mix(1.0, 0.2, drop);
    float focal_boost = mix(1.0, 2.5, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    vec3 rim_hot = vec3(1.0, 0.5, 0.2);
    col += rim_hot * rim * drop * 0.2;

    float blaze = focal * focal_boost * drop * glow_energy;
    col += gem_fire * blaze * 0.5;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.4;
    col += gem_prism * vec3(0.4, 0.8, 1.0) * gem_rim * drop * 0.3;

    // ========================================================================
    // FINISHING
    // ========================================================================

    if (beat) {
        col += vec3(0.15, 0.04, 0.02) * focal;
        col *= 1.05;
    }

    col *= PULSE;

    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.95, FEEDBACK_MIX);

    // Vignette — vignette_size controls how tight the frame is
    float vign_power = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 1.2, 2.8);
    float vign_scale = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 0.5, 0.85);
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    float bright_allowed = max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7));
    col *= mix(0.15, 1.0, bright_allowed);

    col = col / (col + vec3(0.7));

    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    P = vec4(col, drop_state);
}
