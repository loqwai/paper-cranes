// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, nerve, electric, ambient
// Electric Nerve — Neural/electrical interpretation of the clit fractal
// Lace patterns are nerve fibers with slow impulse waves traveling along them.
// Background is deep black. Colors are electric cyan/white for impulses,
// dark blue for resting nerves. The gem focal is a synapse — bright flash point.
// Slow waves of activation pulse outward from center every 8-10 seconds.
// On extreme z-scores, electrical storm — rapid firing, bright white flashes.
//
// Based on clit/3 (Dom Mandy's complex power fractal)

// ============================================================================
// CREATURE TRAITS — independent URL params
// Usage: ?shader=clit/variations/electric-nerve&lace_density=0.6
// All default to 0.5 (neutral). Range 0.0-1.0.
// ============================================================================

// Wing flap speed — controls nerve tendril drift speed
// #define WING_SPEED wing_speed
#define WING_SPEED 0.3
// #define WING_SPEED knob_71

// Wing span — controls nerve tendril drift amplitude
// #define WING_SPAN wing_span
#define WING_SPAN 0.4
// #define WING_SPAN knob_72

// Glow hue — not used heavily here (synapse is always cyan-white)
// #define GLOW_HUE glow_hue
#define GLOW_HUE 0.55
// #define GLOW_HUE knob_73

// Lace density — nerve fiber thickness (delicate=0, dense=1)
// #define LACE_DENSITY lace_density
#define LACE_DENSITY 0.6
// #define LACE_DENSITY knob_74

// Vignette tightness
// #define VIGNETTE_SIZE vignette_size
#define VIGNETTE_SIZE 0.4
// #define VIGNETTE_SIZE knob_75

// Feedback/trails — crisp nerve lines (low) vs ghosting (high)
// #define TRAIL_AMOUNT trail_amount
#define TRAIL_AMOUNT 0.2
// #define TRAIL_AMOUNT knob_76

// Warmth — cool nerves (0) vs warmer impulse tint (1)
// #define WARMTH warmth
#define WARMTH 0.15
// #define WARMTH knob_77

// Fractal complexity
// #define COMPLEXITY complexity
#define COMPLEXITY 0.5
// #define COMPLEXITY knob_78

// ============================================================================
// NERVE IMPULSE PARAMETERS — slow propagation timing
// ============================================================================

// Impulse wave period: one full outward pulse every ~9 seconds
#define IMPULSE_PERIOD 9.0
// Impulse wave spatial frequency along nerve fibers
#define IMPULSE_SPATIAL_FREQ 5.0
// Impulse wave propagation speed (radians per second, outward from center)
#define IMPULSE_SPEED 0.3
// Impulse sharpness: higher = sharper pulse front
#define IMPULSE_SHARPNESS 0.1

// Slow A/B drift periods
#define A_DRIFT_PERIOD 40.0
#define B_DRIFT_PERIOD 33.0

// Z-score gate threshold — audio only kicks in above this
#define ZSCORE_GATE 0.6
// Electrical storm gate — needs very extreme z-scores
#define STORM_GATE 0.7

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — gated by z-score magnitude
// Mostly dormant. Nerve slowly drifts. Extreme audio = electrical storm.
// ============================================================================

// Gating function: returns 0 when |zScore| < gate, ramps up above it
#define GATE(zs) clamp((abs(zs) - ZSCORE_GATE) / (1.0 - ZSCORE_GATE), 0.0, 1.0)
#define STORM_TRIGGER(zs) clamp((abs(zs) - STORM_GATE) / (1.0 - STORM_GATE), 0.0, 1.0)

// 1. A: slow drift, audio gated z > 0.6
#define A_BASE (1.5 + 0.1 * sin(iTime * 6.2832 / A_DRIFT_PERIOD) + (COMPLEXITY - 0.5) * 0.3)
#define A_AUDIO (GATE(spectralCentroidZScore) * spectralCentroidZScore * 0.12)
#define A (A_BASE + A_AUDIO)
// #define A 1.5

// 2. B: slow drift
#define B_BASE (0.55 + 0.04 * sin(iTime * 6.2832 / B_DRIFT_PERIOD))
#define B_AUDIO (GATE(energyZScore) * energyZScore * 0.08)
#define B (B_BASE + B_AUDIO)
// #define B 0.55

// Drop detection
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very subtle, gated
#define PULSE (1.0 + GATE(bassZScore) * bassZScore * 0.03)
// #define PULSE 1.0

// 8. Low feedback for crisp nerve lines
#define FEEDBACK_MIX (mapValue(TRAIL_AMOUNT, 0.0, 1.0, 0.1, 0.3) + energyNormalized * 0.03)
// #define FEEDBACK_MIX 0.2

// Rim lighting
#define RIM_INTENSITY (0.3 + trebleNormalized * 0.4)
// #define RIM_INTENSITY 0.5

// Rim warmth — stays cool for electric feel
#define RIM_WARMTH (mapValue(WARMTH, 0.0, 1.0, 0.05, 0.3) + spectralRoughnessNormalized * 0.1)
// #define RIM_WARMTH 0.15

// Gem brilliance — synapse flash
#define GEM_BRILLIANCE (0.9 + spectralCrestNormalized * 0.6)
// #define GEM_BRILLIANCE 1.2

// Gem dispersion
#define GEM_DISPERSION (0.2 + spectralSpreadNormalized * 0.3)
// #define GEM_DISPERSION 0.35

// 9. Lace sharpening high (3.5) for wire-like nerves
#define LACE_SHARPNESS 3.5

// 7. TENDRIL_CURL: very slow baseline (period 35s), fast jitter on z > 0.7
#define FLAP_RATE mapValue(WING_SPEED, 0.0, 1.0, 0.03, 0.18)
#define FLAP_AMP mapValue(WING_SPAN, 0.0, 1.0, 0.1, 0.6)
#define NERVE_JITTER (STORM_TRIGGER(spectralFluxZScore) * sin(iTime * 17.0) * 0.15)
#define TENDRIL_CURL (sin(iTime * FLAP_RATE) * FLAP_AMP + sin(iTime * FLAP_RATE * 0.57) * FLAP_AMP * 0.4 + NERVE_JITTER)
// #define TENDRIL_CURL 0.0

// Cross-axis curl with jitter
#define NERVE_JITTER_Y (STORM_TRIGGER(spectralEntropyZScore) * sin(iTime * 23.0) * 0.12)
#define TENDRIL_CROSS (sin(iTime * FLAP_RATE * 0.77) * FLAP_AMP * 0.6 + sin(iTime * FLAP_RATE * 0.43 + 1.0) * FLAP_AMP * 0.3 + NERVE_JITTER_Y)
// #define TENDRIL_CROSS 0.0

// Flow drift — minimal for crisp nerves
#define FLOW_X (spectralCentroidSlope * 0.001)
// #define FLOW_X 0.0
#define FLOW_Y (spectralSpreadSlope * 0.001)
// #define FLOW_Y 0.0

// 10. Drop requires turbulence > 4.0
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

// Electrical storm intensity: how many z-scores are extreme simultaneously
#define STORM_INTENSITY clamp((ZSCORE_TURBULENCE - 3.0) / 3.0, 0.0, 1.0)

// Drop state ramp/decay
#define DROP_RAMP 0.07
#define DROP_DECAY_MIN 0.008
#define DROP_DECAY_MAX 0.04

// ============================================================================
// PSEUDO-RANDOM for electrical flicker
// ============================================================================

float nerveHash(vec2 p) {
    p = fract(p * vec2(443.8975, 397.2973));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Time-driven curl — slow nerve drift
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit trap for focal point (synapse)
    float focal_trap = 0.0;
    float focal_weight = 0.0;
    vec2 focal_center = vec2(0.0, 0.12);

    // Track iteration-space position for impulse wave
    float nerve_length_accum = 0.0;

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

        // Soft accumulated proximity for synapse detection
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;

        // Accumulate nerve path length for impulse wave
        nerve_length_accum += length(V) * iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree = nerve fibers — high sharpness for wire-like appearance
    float lace_lo = mapValue(LACE_DENSITY, 0.0, 1.0, -1.5, -2.5);
    float lace_hi = mapValue(LACE_DENSITY, 0.0, 1.0, -4.5, -5.5);
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    // 9. High sharpening for wire-like nerve fibers
    lace = pow(max(lace, 0.0), LACE_SHARPNESS);

    // Fractal structure (used for internal detail, not color)
    float color_phase = (WARMTH - 0.5) * 0.5;
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // 3. NERVE IMPULSE WAVE — slow outward pulse from center
    // Uses fractal orbit distance (length(C)) as the "nerve distance" metric
    // ========================================================================

    float nerve_dist = length(C);
    // Slow outward wave — one pulse every IMPULSE_PERIOD seconds
    float impulse_phase = nerve_dist * IMPULSE_SPATIAL_FREQ - iTime * IMPULSE_SPEED;
    float impulse = smoothstep(0.0, IMPULSE_SHARPNESS, sin(impulse_phase));
    // Second harmonic at different speed for subtle complexity
    float impulse2_phase = nerve_dist * 3.5 - iTime * 0.17 + 2.0;
    float impulse2 = smoothstep(0.0, 0.15, sin(impulse2_phase)) * 0.3;
    float nerve_impulse = clamp(impulse + impulse2, 0.0, 1.0);

    // Audio-gated impulse boost: extreme z-scores make impulses brighter/faster
    float impulse_boost = GATE(energyZScore) * 0.5 + GATE(spectralFluxZScore) * 0.3;
    nerve_impulse = clamp(nerve_impulse + impulse_boost * 0.4, 0.0, 1.0);

    // ========================================================================
    // FOCAL POINT — synapse detection
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Synapse rim
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Synapse specular
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // 6. Synapse pulse — tied to impulse wave timing at focal center
    float synapse_wave = sin(iTime * 6.2832 / IMPULSE_PERIOD);
    float synapse_pulse = 0.7 + 0.3 * max(synapse_wave, 0.0);

    // Prismatic dispersion — shifted toward cyan
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 2.0 + disp * 0.2),
        pow(f_safe, 1.7),
        pow(f_safe, 1.5 - disp * 0.3)
    );

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
    // DROP STATE — electrical storm requires turbulence > 4.0
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    // 10. Drop requires turbulence > 4.0
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

    // Storm intensity from z-score turbulence (independent of drop for coloring)
    float storm = STORM_INTENSITY;

    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // 4. NERVE COLOR — resting=dark blue, firing=bright cyan
    // ========================================================================

    // Resting nerve fiber color — deep midnight blue
    vec3 nerve_resting = vec3(0.08, 0.12, 0.25);
    // Firing nerve fiber color — electric cyan
    vec3 nerve_firing = vec3(0.3, 0.9, 1.0);
    // Peak impulse color — white-cyan flash
    vec3 nerve_peak = vec3(0.85, 0.95, 1.0);

    // Nerve color: blend from resting to firing based on impulse wave
    vec3 nerve_col = mix(nerve_resting, nerve_firing, nerve_impulse * 0.8);
    // At very high impulse, push toward white-cyan
    nerve_col = mix(nerve_col, nerve_peak, pow(nerve_impulse, 3.0) * 0.4);

    // 11. Electrical flicker — subtle brightness modulation on lace
    float flicker_seed = nerveHash(gl_FragCoord.xy * 0.01 + vec2(iTime * 3.7, iTime * 2.3));
    float flicker = 0.92 + 0.08 * flicker_seed;
    // During storm, flicker is much more intense
    float storm_flicker_seed = nerveHash(gl_FragCoord.xy * 0.02 + vec2(iTime * 19.0, iTime * 13.0));
    float storm_flicker = mix(flicker, 0.5 + 0.5 * storm_flicker_seed, storm);
    nerve_col *= storm_flicker;

    // 5. Background: pure black
    vec3 bg = vec3(0.005);

    // Lace = nerve fibers, colored by impulse state
    vec3 col = mix(bg, nerve_col, lace);

    // Fine filigree — dim blue-white highlights at nerve intersections
    col += vec3(0.15, 0.25, 0.4) * lace_fine * 0.2 * (0.5 + nerve_impulse * 0.5);

    // Rim detection — nerve bundle edges
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    // Rim color: dark blue resting, cyan when impulse passing
    vec3 rim_col = mix(vec3(0.05, 0.08, 0.2), vec3(0.2, 0.6, 0.8), nerve_impulse * 0.6);

    col += rim_col * rim * RIM_INTENSITY * 0.25;

    // ========================================================================
    // 6. SYNAPSE FOCAL — white-cyan flash point, pulse-timed
    // ========================================================================

    float glow_energy = clamp(energyNormalized + energyZScore * 0.3, 0.0, 1.0);

    // Synapse base color — electric blue-cyan
    vec3 synapse_base = vec3(0.2, 0.6, 1.0);
    // Synapse fire — bright white-cyan
    vec3 synapse_fire = vec3(0.7, 0.9, 1.0);
    // Synapse white — pure brilliance
    vec3 synapse_white = vec3(1.0, 0.98, 1.0);

    vec3 gem_interior = gem_prism * synapse_base * synapse_pulse * gem_depth_shade;

    float sparkle_str = mix(0.5, 1.0, glow_energy);
    vec3 gem_specular = synapse_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Synapse rim — cyan to white gradient
    vec3 syn_rim_inner = vec3(0.8, 0.95, 1.0);
    vec3 syn_rim_outer = vec3(0.1, 0.4, 0.8);
    vec3 gem_rim_col = mix(syn_rim_outer, syn_rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.7, 1.3, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    // Synapse glow radiates outward — subtle cyan haze
    col = mix(col, gem_col, focal * 0.85);

    float glow_str = mix(0.06, 0.2, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += synapse_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // 10. DROP/STORM MODE — electrical storm: all lace goes bright, flicker
    // ========================================================================

    float bg_dim = mix(1.0, 0.3, drop);
    float focal_boost = mix(1.0, 2.5, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // During electrical storm: all nerves fire simultaneously
    // Storm brightens all lace toward white-cyan regardless of impulse wave
    vec3 storm_bright = vec3(0.6, 0.85, 1.0);
    col += storm_bright * lace * storm * 0.5;
    // Storm flashes at the synapse
    col += synapse_white * focal * storm * 0.4;

    // Hot rim during storm
    vec3 rim_electric = vec3(0.3, 0.7, 1.0);
    col += rim_electric * rim * drop * 0.2;

    // Synapse blaze during drop
    float blaze = focal * focal_boost * drop * glow_energy;
    col += synapse_fire * blaze * 0.5;
    col += synapse_white * pow(f_safe, 2.5) * drop * glow_energy * 0.4;
    col += gem_prism * vec3(0.3, 0.7, 1.0) * gem_rim * drop * 0.3;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat flash — subtle cyan spike
    if (beat) {
        col += vec3(0.02, 0.08, 0.12) * focal;
        col *= 1.03;
    }

    col *= PULSE;

    // 8. Low feedback (0.2 base) for crisp nerve lines
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Vignette — dark edges for clean framing
    float vign_power = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 1.2, 2.8);
    float vign_scale = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 0.5, 0.85);
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Brightness enforcement — only nerve fibers and synapse get to be bright
    float bright_allowed = max(max(lace, rim * 0.4), max(focal, gem_rim * 0.7));
    col *= mix(0.08, 1.0, bright_allowed);

    // Tone mapping — slightly cooler bias for electric feel
    col = col / (col + vec3(0.65));

    // Gamma — cool blue shift
    col = pow(max(col, vec3(0.0)), vec3(0.95, 0.9, 0.85));

    P = vec4(col, drop_state);
}
