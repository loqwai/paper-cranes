// @fullscreen: true
// @mobile: true
// @tags: golden-ratio, fractal, spiral, gold, ambient
// Golden Ratio — Complex power fractal with phi-proportioned slow spiral
// Warm gold/amber/bronze palette. Silence = meditative golden angle drift.
// Fast reactions ONLY on extreme z-scores (abs > 0.6)
// Based on Dom Mandy's complex power fractal

// ============================================================================
// GOLDEN RATIO CONSTANTS
// ============================================================================

#define PHI 1.6180339887
#define GOLDEN_ANGLE 2.39996323     // 137.5 degrees in radians
#define TAU 6.28318530718

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — gated to extreme z-scores only
// ============================================================================

// A: centered on golden ratio! Slow sine drift. Audio only on extreme z-scores.
#define EXTREME_CENTROID (step(0.6, abs(spectralCentroidZScore)) * spectralCentroidZScore)
#define A (PHI + 0.1 * sin(iTime * 0.02) + EXTREME_CENTROID * 0.12)
// #define A 1.618

// B: phi-proportioned slow drift
#define EXTREME_ENERGY (step(0.6, abs(energyZScore)) * energyZScore)
#define B (0.55 + 0.05 * sin(iTime * 0.025 * PHI) + EXTREME_ENERGY * 0.08)
// #define B 0.55

// Golden angle rotation: slow meditative spiral, accelerates on extremes
#define ZSCORE_EXTREME max(max(abs(bassZScore), abs(trebleZScore)), max(abs(spectralCentroidZScore), abs(spectralFluxZScore)))
#define EXTREME_GATE step(0.6, ZSCORE_EXTREME)
#define ROT_SPEED_BASE 0.01
#define ROT_SPEED_BOOST (EXTREME_GATE * ZSCORE_EXTREME * PHI * 0.04)
#define PHI_ROT (iTime * (ROT_SPEED_BASE + ROT_SPEED_BOOST))

// Drop detection: only on truly extreme audio events
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0 * EXTREME_GATE, 0.0, 1.0)
// #define DROP_INTENSITY 0.0

// Build detection: gated to extreme
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0 * EXTREME_GATE, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very subtle, gated
#define EXTREME_BASS (step(0.6, abs(bassZScore)) * bassZScore)
#define PULSE (1.0 + EXTREME_BASS * 0.04)
// #define PULSE 1.0

// Feedback — moderate golden trail (0.3 base)
#define FEEDBACK_MIX (0.3 + EXTREME_GATE * 0.1)
// #define FEEDBACK_MIX 0.3

// Rim lighting: warm amber-gold, treble-reactive only on extremes
#define EXTREME_TREBLE (step(0.6, abs(trebleZScore)) * trebleNormalized)
#define RIM_INTENSITY (0.5 + EXTREME_TREBLE * 0.4)
// #define RIM_INTENSITY 0.5

// Gem brilliance: golden orb glow
#define GEM_BRILLIANCE (0.9 + step(0.6, abs(spectralCrestZScore)) * spectralCrestNormalized * 0.4)
// #define GEM_BRILLIANCE 1.0

// Gem dispersion: golden prismatic separation
#define GEM_DISPERSION (0.25 + step(0.6, abs(spectralSpreadZScore)) * spectralSpreadNormalized * 0.3)
// #define GEM_DISPERSION 0.3

// Tendril curl: slow golden spiral (period ~30s), phi multiplier
#define SPIRAL_RATE (TAU / 30.0)
#define TENDRIL_CURL (sin(iTime * SPIRAL_RATE) * 0.4 + sin(iTime * SPIRAL_RATE / PHI) * 0.25 + EXTREME_GATE * spectralCentroidSlope * 0.2)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: golden ratio phase offset for asymmetric spiral
#define TENDRIL_CROSS (sin(iTime * SPIRAL_RATE * 0.618) * 0.35 + sin(iTime * SPIRAL_RATE * 0.382 + GOLDEN_ANGLE) * 0.2 + EXTREME_GATE * spectralSpreadSlope * 0.15)
// #define TENDRIL_CROSS 0.0

// Flow drift: very slow spiral drift, boosted on extremes
#define FLOW_X (sin(iTime * 0.03) * 0.001 + EXTREME_GATE * spectralCentroidSlope * 0.002)
// #define FLOW_X 0.0
#define FLOW_Y (cos(iTime * 0.03 * PHI) * 0.001 + EXTREME_GATE * spectralSpreadSlope * 0.0015)
// #define FLOW_Y 0.0

// Turbulence — only counts extreme z-scores
#define ZSCORE_TURBULENCE (step(0.6, abs(bassZScore)) * abs(bassZScore) + step(0.6, abs(trebleZScore)) * abs(trebleZScore) + step(0.6, abs(spectralCentroidZScore)) * abs(spectralCentroidZScore) + step(0.6, abs(spectralFluxZScore)) * abs(spectralFluxZScore) + step(0.6, abs(spectralEntropyZScore)) * abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Lace sharpening — moderate (2.5)
#define LACE_SHARPNESS 2.5

// Drop state ramp/decay speeds — slower for golden variation
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.008
#define DROP_DECAY_MAX 0.04

// ============================================================================
// GOLD PALETTE — near=bright gold, mid=bronze, far=dark brown-black
// ============================================================================

vec3 goldPalette(float t) {
    t = clamp(t, 0.0, 1.0);
    // near (t=0): bright warm gold
    vec3 near_col = vec3(1.0, 0.85, 0.35);
    // mid (t=0.5): rich bronze
    vec3 mid_col = vec3(0.65, 0.42, 0.12);
    // far (t=1): deep brown-black
    vec3 far_col = vec3(0.08, 0.04, 0.02);

    // Two-segment lerp for richer gradient
    vec3 col = t < 0.5
        ? mix(near_col, mid_col, t * 2.0)
        : mix(mid_col, far_col, (t - 0.5) * 2.0);

    // Subtle golden sheen variation
    float sheen = 0.1 * sin(t * 3.14159 * 3.0);
    col.r += sheen * 0.5;
    col.g += sheen * 0.3;

    return max(col, vec3(0.0));
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Golden angle rotation applied to the complex plane
    float cr = cos(PHI_ROT), sr = sin(PHI_ROT);
    C = mat2(cr, -sr, sr, cr) * C;

    // Time-driven curl — slow golden spiral
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulated proximity for soft gem glow
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

        // Soft accumulated proximity for golden orb
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree — warm golden threads emphasizing spiral structure
    float lace_x = smoothstep(-1.8, -4.8, log(max(x, 1e-10)));
    float lace_y = smoothstep(-1.8, -4.8, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), LACE_SHARPNESS);

    // Fractal structure — golden-shifted phase
    float golden_phase = iTime * 0.005 * PHI;  // very slow golden hue rotation
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + golden_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — golden orb
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Gem rim — soft organic edge
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Gem specular — fractal highlights
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Internal brilliance — slow golden pulse at phi rate
    float gem_pulse = 0.85 + 0.15 * sin(iTime * 0.7 / PHI);

    // Prismatic dispersion — golden warm shift
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 1.8 - disp * 0.2),
        pow(f_safe, 2.0),
        pow(f_safe, 2.2 + disp * 0.1)
    );

    // Gem depth shading
    float gem_depth_shade = mix(0.4, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // GOLD DEPTH MAPPING — bright gold near, dark brown far
    // ========================================================================

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — sustained mode change, gated to extremes
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    float drop_signal = clamp(drop_trigger * smoothstep(2.0, 4.0, turbulence), 0.0, 1.0);

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
    // COLOR — warm gold/amber/bronze palette
    // ========================================================================

    // Tint the rainbow fractal structure toward gold
    vec3 gold_tint = vec3(1.0, 0.82, 0.45);
    vec3 bronze_tint = vec3(0.72, 0.48, 0.2);
    vec3 fractal_col = rainbow.rgb * mix(gold_tint, bronze_tint, 0.5 - luma * 0.5);

    // Background: deep bronze-black
    vec3 bg_col = vec3(0.04, 0.025, 0.01);

    // Lace gets warm golden coloring
    vec3 col = mix(bg_col, fractal_col, lace);

    // Filigree highlights — bright gold threads
    vec3 fil_gold = vec3(0.9, 0.72, 0.3);
    col += fil_gold * lace_fine * 0.3;

    // Rim detection — warm amber-gold
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    vec3 rim_col = vec3(0.85, 0.6, 0.2);  // warm amber-gold rim

    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // GOLDEN ORB FOCAL — warm golden gem
    // ========================================================================

    float glow_energy = clamp(0.5 + EXTREME_GATE * energyNormalized * 0.5, 0.0, 1.0);

    // Golden orb base color
    vec3 gem_base = vec3(1.0, 0.85, 0.4);    // warm gold
    vec3 gem_fire = vec3(1.0, 0.7, 0.2);     // hot amber
    vec3 gem_white = vec3(1.0, 0.95, 0.8);   // warm white

    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    float sparkle_str = mix(0.5, 0.9, glow_energy);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Golden orb rim — amber to bright gold
    vec3 rim_inner = vec3(1.0, 0.9, 0.5);
    vec3 rim_outer = vec3(0.7, 0.45, 0.1);
    vec3 gem_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.8, 1.2, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.85);

    // Outer golden glow halo
    float glow_str = mix(0.1, 0.2, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += gem_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // DROP MODE — golden blaze, not color replacement
    // ========================================================================

    float bg_dim = mix(1.0, 0.3, drop);
    float focal_boost = mix(1.0, 2.0, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Hot golden rim on drops
    vec3 rim_hot = vec3(1.0, 0.8, 0.3);
    col += rim_hot * rim * drop * 0.2;

    // Golden blaze on focal during drops
    float blaze = focal * focal_boost * drop * glow_energy;
    col += gem_fire * blaze * 0.4;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.3;
    col += gem_prism * vec3(1.0, 0.85, 0.4) * gem_rim * drop * 0.25;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat flash — very subtle golden pulse, only on extremes
    if (beat) {
        col += vec3(0.1, 0.07, 0.02) * focal * EXTREME_GATE;
        col *= 1.0 + 0.03 * EXTREME_GATE;
    }

    col *= PULSE;

    // Frame feedback — moderate golden trails (0.3)
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Vignette — warm golden-dark edges
    float vign = 1.0 - pow(length(uv) * 0.6, 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Brightness gating — only structured elements get to be bright
    float bright_allowed = max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7));
    col *= mix(0.15, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Gamma — warm golden shift
    col = pow(max(col, vec3(0.0)), vec3(0.85, 0.88, 0.95));

    P = vec4(col, drop_state);
}
