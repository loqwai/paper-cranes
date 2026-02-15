// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, sexy, quantum, ambient, ethereal
// Quantum Flux — probability cloud visualization variant of the clit fractal
// Multiple slightly offset fractal copies phase in and out like quantum superposition.
// The gem is a measurement collapse point — sharp and defined while space is fuzzy.
// On extreme z-scores, wave function "collapses" — everything snaps sharp.
//
// Based on clit/3 (Dom Mandy's complex power fractal)

// ============================================================================
// CREATURE TRAITS — independent URL params that make each instance unique
// Usage: ?shader=clit/variations/quantum-flux&trail_amount=0.8&complexity=0.4
// All default to 0.5 (neutral). Range 0.0-1.0.
// ============================================================================

// Wing flap speed — lazy moth (0) vs hummingbird (1)
// #define WING_SPEED wing_speed
#define WING_SPEED 0.15
// #define WING_SPEED knob_71

// Wing span — tight subtle flutter (0) vs dramatic sweeping flap (1)
// #define WING_SPAN wing_span
#define WING_SPAN 0.3
// #define WING_SPAN knob_72

// Gem hue — not used directly; full spectrum cycles via time
// #define GLOW_HUE glow_hue
#define GLOW_HUE 0.0
// #define GLOW_HUE knob_73

// Lace density — delicate fairy threads (0) vs bold moth wings (1)
// #define LACE_DENSITY lace_density
#define LACE_DENSITY 0.4
// #define LACE_DENSITY knob_74

// Vignette tightness — wide open view (0) vs intimate close spotlight (1)
// #define VIGNETTE_SIZE vignette_size
#define VIGNETTE_SIZE 0.4
// #define VIGNETTE_SIZE knob_75

// Feedback/trails — crisp and sharp (0) vs ethereal ghosting (1)
// #define TRAIL_AMOUNT trail_amount
#define TRAIL_AMOUNT 0.8
// #define TRAIL_AMOUNT knob_76

// Color temperature — cool violet-blue tones (0) vs warm pink-amber (1)
// #define WARMTH warmth
#define WARMTH 0.2
// #define WARMTH knob_77

// Fractal complexity — simple smooth forms (0) vs intricate dense detail (1)
// #define COMPLEXITY complexity
#define COMPLEXITY 0.5
// #define COMPLEXITY knob_78

// ============================================================================
// QUANTUM FLUX — ultra-slow oscillation parameters
// ============================================================================

// Quantum oscillation periods (seconds per full cycle)
#define QUANTUM_PERIOD_A 349.0
#define QUANTUM_PERIOD_B 273.0
#define FOCAL_PERIOD_X 40.0
#define FOCAL_PERIOD_Y 28.0
#define HUE_CYCLE_PERIOD 1257.0
#define SUPERPOSITION_PERIOD_X 419.0
#define SUPERPOSITION_PERIOD_Y 314.0

// Quantum oscillation ranges for A and B
#define A_CENTER 1.5
#define A_RANGE 0.15
#define B_CENTER 0.55
#define B_RANGE 0.06

// Quantum UV offset magnitude — how far superposition copies drift
#define QUANTUM_OFFSET_MAG 0.008

// Z-score gate threshold — audio only kicks in above this
#define ZSCORE_GATE 0.6

// Collapse threshold — z-score sum triggers wave function collapse
#define COLLAPSE_ZSCORE_THRESHOLD 0.7

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — gated by z-score magnitude
// Only extreme audio events break through the slow quantum drift
// ============================================================================

// Gating function: returns 0 when |zScore| < ZSCORE_GATE, ramps up above it
#define GATE(zs) clamp((abs(zs) - ZSCORE_GATE) / (1.0 - ZSCORE_GATE), 0.0, 1.0)

// Shape complexity: ultra-slow quantum oscillation + gated audio
#define A_QUANTUM (A_CENTER + A_RANGE * sin(iTime * 6.2832 / QUANTUM_PERIOD_A) + (COMPLEXITY - 0.5) * 0.3)
#define A_AUDIO (GATE(spectralCentroidZScore) * spectralCentroidZScore * 0.12)
#define A (A_QUANTUM + A_AUDIO)
// #define A 1.5

// Body offset: ultra-slow quantum drift + gated energy
#define B_QUANTUM (B_CENTER + B_RANGE * sin(iTime * 6.2832 / QUANTUM_PERIOD_B + 3.0))
#define B_AUDIO (GATE(energyZScore) * energyZScore * 0.08)
#define B (B_QUANTUM + B_AUDIO)
// #define B 0.55

// Focal center drifts in a figure-8 (Lissajous pattern)
#define FOCAL_X (sin(iTime * 6.2832 / FOCAL_PERIOD_X) * 0.05)
#define FOCAL_Y (0.12 + cos(iTime * 6.2832 / FOCAL_PERIOD_Y) * 0.04)

// Drop detection: confident energy drop
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very gentle, only on gated z-scores
#define PULSE (1.0 + GATE(bassZScore) * bassZScore * 0.03)
// #define PULSE 1.0

// Feedback — very high base (0.5) for probability trail smearing
#define FEEDBACK_BASE (mapValue(TRAIL_AMOUNT, 0.0, 1.0, 0.35, 0.6))
#define FEEDBACK_MIX (FEEDBACK_BASE + energyNormalized * 0.03)
// #define FEEDBACK_MIX 0.5

// Rim lighting: treble drives the body edge glow — softer
#define RIM_INTENSITY (0.3 + trebleNormalized * 0.4)
// #define RIM_INTENSITY 0.5

// Rim color: slowly cycling hue
#define RIM_HUE_CYCLE (iTime * 6.2832 / HUE_CYCLE_PERIOD)
#define RIM_WARMTH (0.3 + 0.2 * sin(RIM_HUE_CYCLE) + spectralRoughnessNormalized * 0.1)
// #define RIM_WARMTH 0.3

// Gem brilliance: measurement point — sharp and bright
#define GEM_BRILLIANCE (1.0 + spectralCrestNormalized * 0.4)
// #define GEM_BRILLIANCE 1.2

// Gem dispersion: prismatic color separation
#define GEM_DISPERSION (0.4 + spectralSpreadNormalized * 0.3)
// #define GEM_DISPERSION 0.5

// Tendril curl: ultra-slow phase drift (period ~50s), sharp on collapse
#define FLAP_RATE mapValue(WING_SPEED, 0.0, 1.0, 0.02, 0.15)
#define FLAP_AMP mapValue(WING_SPAN, 0.0, 1.0, 0.1, 0.6)
#define TENDRIL_CURL (sin(iTime * FLAP_RATE) * FLAP_AMP + sin(iTime * FLAP_RATE * 0.57) * FLAP_AMP * 0.4 + GATE(spectralCentroidZScore) * spectralCentroidSlope * 0.2)
// #define TENDRIL_CURL 0.0

// Cross-axis curl
#define TENDRIL_CROSS (sin(iTime * FLAP_RATE * 0.77) * FLAP_AMP * 0.5 + sin(iTime * FLAP_RATE * 0.43 + 1.0) * FLAP_AMP * 0.3 + GATE(spectralSpreadZScore) * spectralSpreadSlope * 0.15)
// #define TENDRIL_CROSS 0.0

// Flow drift: very gentle slope-driven feedback UV offset
#define FLOW_X (spectralCentroidSlope * 0.001)
// #define FLOW_X 0.0
#define FLOW_Y (spectralSpreadSlope * 0.001)
// #define FLOW_Y 0.0

// Collapse trigger: sum of absolute z-scores
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

// Drop state ramp/decay — slower decay for lingering collapse
#define DROP_RAMP 0.08
#define DROP_DECAY_MIN 0.005
#define DROP_DECAY_MAX 0.03

// Chromatic aberration magnitude for lace
#define CHROMA_ABERRATION 0.003

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

// ============================================================================
// QUANTUM FRACTAL — compute fractal at a given UV with given A/B
// Returns: vec4(z, x, y, focal_trap)
// Also writes final Z to out param for rainbow calculation
// ============================================================================

vec4 quantumFractal(vec2 C_in, float Ap, float Bp, vec2 focal_ctr, out vec2 Z_out) {
    vec2 V = C_in;
    float v, x, y,
          z = y = x = 9.0;
    vec2 Z = vec2(0.0);
    float focal_trap = 9.0;

    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * Ap;
        float c = dot(V, vec2(a, log(max(d, 1e-10)) / 2.0));
        V = exp(-a * V.y) * pow(max(d, 1e-10), V.x / 2.0) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C_in * Bp;

        x = min(x, abs(V.x));
        y = min(y, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;

        float fd = length(V - focal_ctr);
        focal_trap = min(focal_trap, fd);
    }

    z = 1.0 - smoothstep(1.0, -6.0, log(max(y, 1e-10))) * smoothstep(1.0, -6.0, log(max(x, 1e-10)));

    Z_out = Z;
    return vec4(z, x, y, focal_trap);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Res = iResolution.xy,
         C = 0.6 * (Res - V - V).yx / Res.y;
    C.x += 0.77;
    C.y += 0.0;

    // Time-driven curl — ultra-slow quantum drift
    vec2 curl_offset = vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    // Quantum superposition offset — slowly drifting phase offset
    vec2 q_offset = vec2(
        sin(iTime * 6.2832 / SUPERPOSITION_PERIOD_X) * QUANTUM_OFFSET_MAG,
        cos(iTime * 6.2832 / SUPERPOSITION_PERIOD_Y) * QUANTUM_OFFSET_MAG
    );

    // Focal center drifts in a figure-8
    vec2 focal_center = vec2(FOCAL_X, FOCAL_Y);

    // Collapse detection — are we in a wave function collapse?
    float max_zscore = max(max(abs(bassZScore), abs(trebleZScore)),
                          max(abs(spectralCentroidZScore), abs(spectralFluxZScore)));
    float collapse_raw = smoothstep(COLLAPSE_ZSCORE_THRESHOLD, 1.0, max_zscore);

    // ========================================================================
    // RENDER PRIMARY FRACTAL
    // ========================================================================

    vec2 C_primary = C + curl_offset;
    vec2 Z_primary;
    vec4 frac_primary = quantumFractal(C_primary, A, B, focal_center, Z_primary);
    float z1 = frac_primary.x;
    float x1 = frac_primary.y;
    float y1 = frac_primary.z;
    float focal_trap1 = frac_primary.w;

    // ========================================================================
    // RENDER QUANTUM OFFSET COPY (superposition ghost)
    // ========================================================================

    vec2 C_ghost = C + curl_offset + q_offset;
    vec2 Z_ghost;
    vec4 frac_ghost = quantumFractal(C_ghost, A, B, focal_center, Z_ghost);
    float z2 = frac_ghost.x;
    float x2 = frac_ghost.y;
    float y2 = frac_ghost.z;
    float focal_trap2 = frac_ghost.w;

    // Blend factor: mostly primary, ghost is a soft overlay
    // During collapse, ghost merges fully into primary (superposition collapses)
    float ghost_blend = mix(0.3, 0.0, collapse_raw);

    // Blended fractal values
    float z = mix(z1, z2, ghost_blend);
    float x_trap = mix(x1, x2, ghost_blend);
    float y_trap = mix(y1, y2, ghost_blend);
    float focal_trap = mix(focal_trap1, focal_trap2, ghost_blend);
    vec2 Z_final = mix(Z_primary, Z_ghost, ghost_blend);

    // ========================================================================
    // LACE / FILIGREE — soft, semi-transparent (sharpening 1.5)
    // ========================================================================

    float lace_lo = mapValue(LACE_DENSITY, 0.0, 1.0, -1.5, -2.5);
    float lace_hi = mapValue(LACE_DENSITY, 0.0, 1.0, -4.5, -5.5);
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x_trap, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y_trap, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;

    // Soft sharpening at 1.5 — during collapse, spikes to 4.0
    float lace_sharp_base = 1.5;
    float lace_sharp_collapse = 4.0;
    float lace_sharp = mix(lace_sharp_base, lace_sharp_collapse, collapse_raw);
    lace = pow(max(lace, 0.0), lace_sharp);

    // Full spectrum slowly cycling hue — iTime * 0.005 radians
    float hue_rotation = iTime * 6.2832 / HUE_CYCLE_PERIOD;
    float color_phase = hue_rotation;
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z_final.y, Z_final.x) - vec4(0, 2.1, 4.2, 0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — measurement collapse point: sharp, bright, white core
    // ========================================================================

    float focal_glow = smoothstep(0.5, 0.01, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 2.0);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Gem rim
    float focal_inner = smoothstep(0.35, 0.02, focal_trap);
    float gem_rim = focal - pow(max(focal_inner, 0.0), 1.5);
    gem_rim = max(gem_rim, 0.0);
    gem_rim = pow(gem_rim, 0.6) * 2.5;

    // Gem specular
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Internal brilliance — very slow pulse
    float gem_pulse = 0.85 + 0.15 * sin(iTime * 0.3);

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
    // DROP STATE — wave function collapse: sustained sharp mode
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

    // Collapse also triggers from single extreme z-scores (not just drops)
    float collapse = max(collapse_raw, drop);
    collapse = clamp(collapse, 0.0, 1.0);

    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — full spectrum cycling, deep blue-violet background
    // ========================================================================

    vec3 sexy_col = rainbow.rgb;

    // Background: deep blue-violet quantum void
    vec3 bg_quantum = vec3(0.015, 0.01, 0.03);

    // During collapse, background flashes slightly brighter
    bg_quantum = mix(bg_quantum, bg_quantum * 2.0, collapse * 0.3);

    vec3 col = mix(bg_quantum, sexy_col, lace);

    // ========================================================================
    // CHROMATIC ABERRATION on lace — slight R/G/B channel offset
    // ========================================================================

    // Compute lace at slightly offset UVs for R and B channels
    // This creates a prismatic fringe on the lace edges
    float chroma_mag = CHROMA_ABERRATION * (1.0 + collapse * 2.0);
    vec2 chroma_dir = normalize(uv + vec2(0.001));

    // Re-derive lace at offset positions for R and B
    // Use the primary fractal x/y traps with slight conceptual offset
    // For efficiency, approximate by shifting the lace value
    float lace_r_shift = max(lace_x * 1.05, lace_y * 0.95);
    float lace_b_shift = max(lace_x * 0.95, lace_y * 1.05);
    lace_r_shift = pow(max(lace_r_shift, 0.0), lace_sharp);
    lace_b_shift = pow(max(lace_b_shift, 0.0), lace_sharp);

    // Apply chromatic aberration to lace color
    vec3 lace_col_chroma;
    lace_col_chroma.r = mix(bg_quantum.r, sexy_col.r, lace_r_shift);
    lace_col_chroma.g = mix(bg_quantum.g, sexy_col.g, lace);
    lace_col_chroma.b = mix(bg_quantum.b, sexy_col.b, lace_b_shift);

    // Blend chromatic lace into the base color
    col = mix(col, lace_col_chroma, 0.5);

    // Filigree highlights — cool pearly tones for quantum feel
    vec3 fil_quantum = vec3(0.5, 0.5, 0.8);
    col += fil_quantum * lace_fine * 0.2;

    // Rim detection
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    // Rim color: slowly cycling through spectrum
    float rim_h = hue_rotation * 0.7;
    vec3 rim_col = vec3(
        0.3 + 0.3 * cos(rim_h),
        0.3 + 0.3 * cos(rim_h + 2.094),
        0.3 + 0.3 * cos(rim_h + 4.189)
    );

    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // GEM FOCAL — measurement point: sharp, bright, WHITE core
    // ========================================================================

    float glow_energy = clamp(energyNormalized + energyZScore * 0.2, 0.0, 1.0);

    // Gem color cycles through full spectrum with time
    float gem_h = hue_rotation;
    vec3 gem_base = vec3(
        0.5 + 0.4 * cos(gem_h),
        0.5 + 0.4 * cos(gem_h + 2.094),
        0.5 + 0.4 * cos(gem_h + 4.189)
    );
    gem_base = max(gem_base, vec3(0.1));

    vec3 gem_fire = vec3(
        0.6 + 0.3 * cos(gem_h),
        0.4 + 0.2 * cos(gem_h + 2.094),
        0.3 + 0.2 * cos(gem_h + 4.189)
    );

    // White core — measurement collapse point is pure white
    vec3 gem_white = vec3(1.0, 0.98, 1.0);

    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    // Higher baseline sparkle for the measurement point
    float sparkle_str = mix(0.6, 1.0, glow_energy);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Gem rim light — cycling colors
    vec3 rim_inner = vec3(0.9, 0.9, 1.0);
    vec3 rim_outer = vec3(0.4, 0.3, 0.9);
    vec3 gem_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.8, 1.2, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    // Strong white core on the measurement point
    gem_col += gem_white * pow(f_safe, 1.5) * 0.5 * GEM_BRILLIANCE;

    col = mix(col, gem_col, focal * 0.9);

    // Outer glow — soft quantum halo
    float glow_str = mix(0.06, 0.2, glow_energy);
    float outer_glow = smoothstep(0.8, 0.0, focal_trap) * (1.0 - focal);
    col += gem_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // COLLAPSE MODE — wave function collapse: everything snaps sharp
    // ========================================================================

    // During collapse: background dims, focal blazes
    float bg_dim = mix(1.0, 0.15, collapse);
    float focal_boost = mix(1.0, 3.0, collapse);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Hot rim during collapse
    vec3 rim_hot = vec3(0.8, 0.6, 1.0);
    col += rim_hot * rim * collapse * 0.25;

    // Focal blaze during collapse
    float blaze = focal * focal_boost * collapse * glow_energy;
    col += gem_fire * blaze * 0.4;
    col += gem_white * pow(f_safe, 2.0) * collapse * 0.5;
    col += gem_prism * vec3(0.5, 0.7, 1.0) * gem_rim * collapse * 0.3;

    // ========================================================================
    // FINISHING — quantum probability feel
    // ========================================================================

    if (beat) {
        col += vec3(0.05, 0.05, 0.12) * focal;
        col *= 1.03;
    }

    col *= PULSE;

    // ========================================================================
    // FEEDBACK — very high (0.5) for probability trail smearing
    // During collapse, feedback drops to near 0 — everything snaps sharp
    // ========================================================================

    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);

    // Collapse kills feedback — sharp snap, no smearing
    float fb_mix = mix(FEEDBACK_MIX, 0.0, collapse);
    col = mix(col, prev.rgb * 0.97, fb_mix);

    // Vignette
    float vign_power = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 1.2, 2.8);
    float vign_scale = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 0.5, 0.85);
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + collapse * 2.0), collapse);
    col *= max(vign, 0.02);

    // Brightness gating — prevent total darkness in non-feature areas
    float bright_allowed = max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7));
    col *= mix(0.12, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Gamma — slightly cooler tone for quantum feel
    col = pow(max(col, vec3(0.0)), vec3(0.92, 0.9, 0.85));

    P = vec4(col, drop_state);
}
