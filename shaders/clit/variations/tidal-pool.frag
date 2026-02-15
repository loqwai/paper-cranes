// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, water, ambient, tidal
// Tidal Pool — looking down into a shallow tidal pool over the clit fractal
// Slow concentric ripples distort the image through refractive water surface.
// Colors: sandy golds, turquoise, coral pink. Gem is polished stone under water.
// Peaceful in silence. Stone-drop splash only on extreme z-scores (abs > 0.6).
//
// Based on clit/3 (Dom Mandy's complex power fractal)

// ============================================================================
// CREATURE TRAITS — independent URL params that make each instance unique
// Usage: ?shader=clit/variations/tidal-pool&lace_density=0.4&trail_amount=0.6
// All default to 0.5 (neutral). Range 0.0-1.0.
// ============================================================================

// Ripple speed — still pond (0) vs choppy shore (1)
// #define RIPPLE_SPEED ripple_speed
#define RIPPLE_SPEED 0.3
// #define RIPPLE_SPEED knob_71

// Ripple depth — subtle shimmer (0) vs heavy refraction (1)
// #define RIPPLE_DEPTH ripple_depth
#define RIPPLE_DEPTH 0.5
// #define RIPPLE_DEPTH knob_72

// Gem hue — amber(0) -> turquoise(0.3) -> coral(0.6) -> amber(1)
// #define GLOW_HUE glow_hue
#define GLOW_HUE 0.15
// #define GLOW_HUE knob_73

// Lace density — delicate sea-foam threads (0) vs bold coral branches (1)
// #define LACE_DENSITY lace_density
#define LACE_DENSITY 0.5
// #define LACE_DENSITY knob_74

// Vignette tightness — wide pool view (0) vs peering into small pool (1)
// #define VIGNETTE_SIZE vignette_size
#define VIGNETTE_SIZE 0.4
// #define VIGNETTE_SIZE knob_75

// Feedback/trails — crisp refraction (0) vs dreamy water trails (1)
// #define TRAIL_AMOUNT trail_amount
#define TRAIL_AMOUNT 0.7
// #define TRAIL_AMOUNT knob_76

// Water warmth — cool deep ocean (0) vs warm tropical shallows (1)
// #define WARMTH warmth
#define WARMTH 0.6
// #define WARMTH knob_77

// Fractal complexity — simple smooth forms (0) vs intricate detail (1)
// #define COMPLEXITY complexity
#define COMPLEXITY 0.5
// #define COMPLEXITY knob_78

// ============================================================================
// TIDAL POOL — slow oscillation parameters
// ============================================================================

// Tide periods (seconds per full cycle) — very slow, meditative
#define TIDE_PERIOD_A 34.0
#define TIDE_PERIOD_B 26.0
#define RIPPLE_PERIOD 20.0
#define CAUSTIC_PERIOD 15.0
#define HUE_DRIFT_PERIOD 80.0

// Tide ranges for A and B — gentle breathing
#define A_CENTER 1.5
#define A_RANGE 0.1
#define B_CENTER 0.55
#define B_RANGE 0.05

// Z-score gate threshold — audio only kicks in above this
#define ZSCORE_GATE 0.6

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — gated by z-score magnitude
// Only extreme audio events break through the slow tidal rhythm
// ============================================================================

// Gating function: returns 0 when |zScore| < ZSCORE_GATE, ramps up above it
#define GATE(zs) clamp((abs(zs) - ZSCORE_GATE) / (1.0 - ZSCORE_GATE), 0.0, 1.0)

// Shape complexity: gentle tide + gated audio reactivity
#define A_TIDE (A_CENTER + A_RANGE * sin(iTime * 6.2832 / TIDE_PERIOD_A) + (COMPLEXITY - 0.5) * 0.3)
#define A_AUDIO (GATE(spectralCentroidZScore) * spectralCentroidZScore * 0.12)
#define A (A_TIDE + A_AUDIO)
// #define A 1.5

// Body offset: gentle tide + gated energy response
#define B_TIDE (B_CENTER + B_RANGE * sin(iTime * 6.2832 / TIDE_PERIOD_B + 1.2))
#define B_AUDIO (GATE(energyZScore) * energyZScore * 0.08)
#define B (B_TIDE + B_AUDIO)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very gentle, only on gated z-scores
#define PULSE (1.0 + GATE(bassZScore) * bassZScore * 0.03)
// #define PULSE 1.0

// Feedback — higher for dreamy water trails
#define FEEDBACK_MIX (mapValue(TRAIL_AMOUNT, 0.0, 1.0, 0.25, 0.45) + energyNormalized * 0.04)
// #define FEEDBACK_MIX 0.35

// Rim lighting: treble drives the coral edge glow — subdued
#define RIM_INTENSITY (0.3 + trebleNormalized * 0.4)
// #define RIM_INTENSITY 0.5

// Rim warmth: warm coral tones drifting slowly
#define WARMTH_DRIFTED (WARMTH + 0.1 * sin(iTime * 6.2832 / HUE_DRIFT_PERIOD))
#define RIM_WARMTH (mapValue(WARMTH_DRIFTED, 0.0, 1.0, 0.3, 0.8) + spectralRoughnessNormalized * 0.1)
// #define RIM_WARMTH 0.6

// Gem brilliance: polished stone under water — subdued sparkle
#define GEM_BRILLIANCE (0.7 + spectralCrestNormalized * 0.4)
// #define GEM_BRILLIANCE 0.9

// Gem dispersion: water diffuses light — moderate prismatic spread
#define GEM_DISPERSION (0.2 + spectralSpreadNormalized * 0.3)
// #define GEM_DISPERSION 0.35

// Tendril curl: slow water current — very slow default, splash on extreme z
#define CURRENT_RATE mapValue(RIPPLE_SPEED, 0.0, 1.0, 0.02, 0.12)
#define CURRENT_AMP 0.4
#define TENDRIL_CURL (sin(iTime * CURRENT_RATE) * CURRENT_AMP + sin(iTime * CURRENT_RATE * 0.43) * CURRENT_AMP * 0.5 + GATE(spectralCentroidZScore) * spectralCentroidSlope * 0.25)
// #define TENDRIL_CURL 0.0

// Cross-axis current: perpendicular water drift
#define TENDRIL_CROSS (sin(iTime * CURRENT_RATE * 0.67 + 2.0) * CURRENT_AMP * 0.6 + sin(iTime * CURRENT_RATE * 0.31 + 0.7) * CURRENT_AMP * 0.35 + GATE(spectralSpreadZScore) * spectralSpreadSlope * 0.15)
// #define TENDRIL_CROSS 0.0

// Flow drift: gentle current pushes feedback UV
#define FLOW_X (spectralCentroidSlope * 0.0015)
// #define FLOW_X 0.0
#define FLOW_Y (spectralSpreadSlope * 0.001)
// #define FLOW_Y 0.0

// Drop trigger: requires turbulence > 4.0 for rare splash events
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

// Drop state ramp/decay — slower decay for lingering splash ripple
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.006
#define DROP_DECAY_MAX 0.035

// ============================================================================
// WATER RIPPLE PARAMETERS
// ============================================================================

#define RIPPLE_FREQ_1 8.0
#define RIPPLE_FREQ_2 6.0
#define RIPPLE_SPEED_1 0.15
#define RIPPLE_SPEED_2 0.12
#define RIPPLE_AMP_BASE (mapValue(RIPPLE_DEPTH, 0.0, 1.0, 0.004, 0.012))

// ============================================================================
// CHROMADEPTH COLOR — warm near (sand/gold), cool far (deep teal)
// ============================================================================

vec3 tidalChromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    // Near (t=0): sandy gold / coral
    // Mid (t=0.5): turquoise
    // Far (t=1): deep ocean teal
    vec3 near_col = vec3(0.85, 0.65, 0.35);   // sandy gold
    vec3 mid_col = vec3(0.15, 0.55, 0.55);    // turquoise
    vec3 far_col = vec3(0.03, 0.12, 0.18);    // deep teal

    vec3 col;
    if (t < 0.5) {
        col = mix(near_col, mid_col, t * 2.0);
    } else {
        col = mix(mid_col, far_col, (t - 0.5) * 2.0);
    }

    // Slight chroma boost in the mid-range
    float chromaBoost = 1.0 + 0.15 * sin(t * 3.14159);
    col *= chromaBoost;

    return clamp(col, 0.0, 1.0);
}

// ============================================================================
// CAUSTIC SHIMMER — subtle underwater light patterns
// ============================================================================

float causticPattern(vec2 p, float t) {
    // Two overlapping wave patterns create caustic interference
    float c1 = sin(p.x * 12.0 + t * 0.3) * sin(p.y * 10.0 - t * 0.25);
    float c2 = sin((p.x + p.y) * 8.0 + t * 0.2) * sin((p.x - p.y) * 9.0 - t * 0.15);
    float c3 = sin(p.x * 15.0 - t * 0.18) * cos(p.y * 13.0 + t * 0.22);

    float caustic = (c1 + c2 + c3) / 3.0;
    caustic = caustic * 0.5 + 0.5; // normalize to 0-1
    caustic = pow(caustic, 3.0);    // sharpen the bright spots
    return caustic;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Normalized UV for screen-space effects
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    // ========================================================================
    // WATER RIPPLE DISTORTION on UV
    // Concentric ripples from center + traveling waves
    // ========================================================================

    float ripple_speed_mod = mapValue(RIPPLE_SPEED, 0.0, 1.0, 0.5, 1.5);

    // Slow concentric ripples from center
    float dist_from_center = length(C - vec2(0.77, 0.0));
    float ripple1 = sin(dist_from_center * RIPPLE_FREQ_1 - iTime * RIPPLE_SPEED_1 * ripple_speed_mod);
    float ripple2 = cos(dist_from_center * RIPPLE_FREQ_2 - iTime * RIPPLE_SPEED_2 * ripple_speed_mod);

    // Secondary wave pattern — slow diagonal drift
    float wave_drift = sin(C.x * 4.0 + C.y * 3.0 - iTime * 0.08 * ripple_speed_mod) * 0.5;

    float ripple_amp = RIPPLE_AMP_BASE;

    // Water surface distortion applied to fractal coordinates
    C += vec2(
        ripple1 * ripple_amp + wave_drift * ripple_amp * 0.5,
        ripple2 * ripple_amp * 0.8 + wave_drift * ripple_amp * 0.4
    );

    // Time-driven current shifts the fractal gently
    V = C + vec2(TENDRIL_CURL * 0.015, TENDRIL_CROSS * 0.012);

    float v, x, y,
          z = y = x = 9.;

    // Orbit trap for focal point — drifting slowly like something seen through water
    float focal_trap = 9.0;
    float focal_x = sin(iTime * 6.2832 / 50.0) * 0.03;
    float focal_y = 0.12 + cos(iTime * 6.2832 / 36.0) * 0.025;
    vec2 focal_center = vec2(focal_x, focal_y);

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

    // Lace/filigree — sandy golden threads like coral branches or seaweed
    float lace_lo = mapValue(LACE_DENSITY, 0.0, 1.0, -1.5, -2.5);
    float lace_hi = mapValue(LACE_DENSITY, 0.0, 1.0, -4.5, -5.5);
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    float lace_sharp = mapValue(LACE_DENSITY, 0.0, 1.0, 2.0, 4.0);
    lace = pow(max(lace, 0.0), lace_sharp);

    // Lace gently pulses with tide
    float lace_pulse = 0.75 + 0.25 * sin(iTime * 6.2832 / RIPPLE_PERIOD);
    lace *= lace_pulse;
    lace_fine *= lace_pulse;

    // Fractal rainbow shifted toward ocean-warm palette
    float color_phase = (WARMTH_DRIFTED - 0.5) * 1.2 + 0.8; // bias toward warm golds
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — polished stone under water
    // ========================================================================

    float focal_glow = smoothstep(0.5, 0.01, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 2.0);

    float focal = focal_glow;

    // Stone rim — softer than gem, like a water-smoothed pebble edge
    float focal_inner = smoothstep(0.35, 0.02, focal_trap);
    float gem_rim = focal - pow(max(focal_inner, 0.0), 1.5);
    gem_rim = max(gem_rim, 0.0);
    gem_rim = pow(gem_rim, 0.7) * 2.0;

    // Stone surface detail
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Slow shimmer — light playing on stone through water
    float gem_pulse = 0.8 + 0.2 * sin(iTime * 0.3) + 0.1 * sin(iTime * 0.7 + 1.5);

    // Water-diffused prismatic dispersion
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 1.8 - disp * 0.25),
        pow(f_safe, 2.0),
        pow(f_safe, 1.8 + disp * 0.25)
    );

    float gem_depth_shade = mix(0.5, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // CHROMADEPTH MAPPING — warm near, cool far
    // ========================================================================

    float base_depth = mix(0.55, 0.9, 1.0 - luma);
    float detail_depth = mix(0.15, 0.45, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — stone dropped in pool, requires turbulence > 4.0
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

    depth = mix(depth, depth * 0.75, build * 0.25);
    depth = mix(depth, depth * 1.25, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // SPLASH RING — expanding concentric ring from center on drop
    // ========================================================================

    // Splash ring expands outward as drop_state increases
    float splash_radius = drop * 0.6;
    float splash_ring = smoothstep(0.025, 0.0, abs(length(uv) - splash_radius)) * drop;
    // Secondary ring trailing behind
    float splash_ring2 = smoothstep(0.02, 0.0, abs(length(uv) - splash_radius * 0.6)) * drop * 0.5;
    float splash_total = splash_ring + splash_ring2;

    // ========================================================================
    // COLOR — ocean-warm tidal pool palette
    // ========================================================================

    // Tint the fractal rainbow toward sandy gold / turquoise
    vec3 ocean_tint = rainbow.rgb;
    // Shift rainbow toward warm ocean tones
    ocean_tint.r = ocean_tint.r * 0.9 + 0.1;  // boost warmth
    ocean_tint.g = ocean_tint.g * 0.85 + 0.08; // slight green-gold
    ocean_tint.b = ocean_tint.b * 0.7;          // reduce cool blue

    // Background: deep water teal
    vec3 bg_deep = vec3(0.02, 0.06, 0.08);
    vec3 bg_shallow = vec3(0.04, 0.08, 0.06);
    float bg_warmth = clamp(WARMTH_DRIFTED, 0.0, 1.0);
    vec3 bg_water = mix(bg_deep, bg_shallow, bg_warmth);

    // Sandy gold lace color
    vec3 lace_col = mix(
        ocean_tint,
        vec3(0.75, 0.6, 0.35), // sandy gold overlay
        0.3
    );
    vec3 col = mix(bg_water, lace_col, lace);

    // Filigree highlights — sandy gold to turquoise depending on warmth
    vec3 fil_sand = vec3(0.8, 0.65, 0.4);
    vec3 fil_teal = vec3(0.3, 0.6, 0.55);
    col += mix(fil_teal, fil_sand, bg_warmth) * lace_fine * 0.2;

    // Rim detection — coral pink edges
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    vec3 rim_coral = vec3(0.7, 0.35, 0.3);
    vec3 rim_teal = vec3(0.2, 0.5, 0.5);
    vec3 rim_col = mix(rim_teal, rim_coral, RIM_WARMTH);

    col += rim_col * rim * RIM_INTENSITY * 0.25;

    // ========================================================================
    // GEM FOCAL — polished stone under water catching light
    // ========================================================================

    float glow_energy = clamp(energyNormalized + energyZScore * 0.2, 0.0, 1.0);

    // Stone base color: warm amber — polished by the ocean
    vec3 stone_base = vec3(0.8, 0.6, 0.3);
    // Water shimmer tint — shifts slightly with warmth
    vec3 stone_shimmer = mix(
        vec3(0.5, 0.7, 0.6),  // cool aqua shimmer
        vec3(0.85, 0.7, 0.4), // warm amber shimmer
        bg_warmth
    );

    vec3 gem_base = mix(stone_base, stone_shimmer, 0.3);
    vec3 gem_fire = vec3(0.9, 0.7, 0.35);  // warm amber fire
    vec3 gem_white = vec3(0.95, 0.9, 0.85); // warm white, not cool

    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    float sparkle_str = mix(0.3, 0.7, glow_energy);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Stone rim — warm amber to turquoise gradient
    vec3 rim_inner = vec3(0.85, 0.65, 0.35);
    vec3 rim_outer = vec3(0.2, 0.5, 0.5);
    vec3 gem_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.75, 1.2, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.8);

    // Outer glow — warm diffusion through water
    float glow_str = mix(0.06, 0.18, glow_energy);
    float outer_glow = smoothstep(0.8, 0.0, focal_trap) * (1.0 - focal);
    col += gem_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // CAUSTIC SHIMMER — subtle underwater light caustics overlay
    // ========================================================================

    float caustic = causticPattern(uv * 2.0, iTime);
    // Caustics are stronger on lighter areas (shallow water) and on lace
    float caustic_mask = max(lace * 0.5, luma * 0.3) + focal * 0.2;
    vec3 caustic_col = vec3(0.7, 0.85, 0.75) * caustic * caustic_mask * 0.08;
    col += caustic_col;

    // ========================================================================
    // DROP MODE — stone splash: rings expand, water disturbed
    // ========================================================================

    // Darken background slightly during drop, brighten focal
    float bg_dim = mix(1.0, 0.4, drop);
    float focal_boost = mix(1.0, 1.8, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Splash rings — bright turquoise-white expanding rings
    vec3 splash_col = vec3(0.6, 0.85, 0.8); // bright aqua
    col += splash_col * splash_total * 0.6;

    // Intensified caustics during splash
    col += vec3(0.5, 0.7, 0.6) * caustic * drop * 0.15;

    // Stone blazes brighter through disturbed water
    float blaze = focal * focal_boost * drop * glow_energy;
    col += gem_fire * blaze * 0.35;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.3;

    // Coral rim glows during splash
    col += vec3(0.7, 0.4, 0.3) * rim * drop * 0.15;

    // ========================================================================
    // FINISHING
    // ========================================================================

    if (beat) {
        col += vec3(0.08, 0.1, 0.06) * focal;
        col *= 1.03;
    }

    col *= PULSE;

    // Feedback — water ripple trails
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    // Add subtle circular flow to feedback for water swirl
    float swirl_angle = iTime * 0.02;
    vec2 swirl = vec2(cos(swirl_angle), sin(swirl_angle)) * 0.0008;
    vec4 prev = getLastFrameColor(fbUv + flow_drift + swirl);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Vignette — dark water at edges
    float vign_power = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 1.3, 2.5);
    float vign_scale = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 0.5, 0.8);
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 1.5), drop);
    col *= max(vign, 0.02);

    // Prevent too-bright non-detail areas
    float bright_allowed = max(max(lace, rim * 0.4), max(focal, gem_rim * 0.6));
    bright_allowed = max(bright_allowed, splash_total * 0.8); // allow splash brightness
    col *= mix(0.18, 1.0, bright_allowed);

    // Tone mapping — slightly warmer than standard
    col = col / (col + vec3(0.65));

    // Gamma — warm bias: boost red/green slightly, cool blue
    col = pow(max(col, vec3(0.0)), vec3(0.86, 0.88, 0.94));

    P = vec4(col, drop_state);
}
