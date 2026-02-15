// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, coral, underwater, ambient, organic
// Coral Polyp — Living coral organism with slowly waving tentacle-like lace
// Variation of clit/3 complex power fractal
// Slow organic pulsing/swaying like coral polyps in ocean current
// Fast reactions ONLY on extreme z-scores (abs > 0.6)
// Colors: warm coral pinks, oranges, yellows with deep blue water background
// Gem is a pearl forming inside the coral
// Based on Dom Mandy's complex power fractal
//
//https://visuals.beadfamous.com/?shader=clit/variations/coral-polyp&name=Living%20Reef
//https://visuals.beadfamous.com/?shader=clit/variations/coral-polyp&name=Fire%20Coral&wing_speed=0.4&warmth=0.9&lace_density=0.7&trail_amount=0.6&complexity=0.6
//https://visuals.beadfamous.com/?shader=clit/variations/coral-polyp&name=Brain%20Coral&wing_speed=0.1&warmth=0.4&lace_density=0.8&wing_span=0.3&trail_amount=0.8&complexity=0.8&vignette_size=0.6
//https://visuals.beadfamous.com/?shader=clit/variations/coral-polyp&name=Sea%20Fan&wing_speed=0.6&warmth=0.5&lace_density=0.3&wing_span=0.8&trail_amount=0.5&complexity=0.3&vignette_size=0.3

// ============================================================================
// CREATURE TRAITS — independent URL params that make each instance unique
// Like pokemon stats: same species, different individual
// Usage: ?shader=clit/variations/coral-polyp&wing_speed=0.3&warmth=0.7
// All default to 0.5 (neutral). Range 0.0-1.0.
// ============================================================================

// Polyp sway speed — slow reef drift (0) vs active feeding (1)
// #define WING_SPEED wing_speed
#define WING_SPEED 0.3
// #define WING_SPEED knob_71

// Tentacle reach — tight polyp buds (0) vs dramatic sea fan fronds (1)
// #define WING_SPAN wing_span
#define WING_SPAN 0.5
// #define WING_SPAN knob_72

// Pearl luster hue — ignored; pearl is always iridescent white-pink
// #define GLOW_HUE glow_hue
#define GLOW_HUE 0.0
// #define GLOW_HUE knob_73

// Lace density — sparse polyp threads (0) vs dense coral skeleton (1)
// #define LACE_DENSITY lace_density
#define LACE_DENSITY 0.5
// #define LACE_DENSITY knob_74

// Vignette tightness — wide reef view (0) vs intimate coral closeup (1)
// #define VIGNETTE_SIZE vignette_size
#define VIGNETTE_SIZE 0.5
// #define VIGNETTE_SIZE knob_75

// Feedback/trails — crisp coral (0) vs soft underwater haze (1)
// #define TRAIL_AMOUNT trail_amount
#define TRAIL_AMOUNT 0.65
// #define TRAIL_AMOUNT knob_76

// Water temperature — cool deep blue (0) vs warm tropical shallow (1)
// #define WARMTH warmth
#define WARMTH 0.6
// #define WARMTH knob_77

// Fractal complexity — simple smooth forms (0) vs intricate branching coral (1)
// #define COMPLEXITY complexity
#define COMPLEXITY 0.5
// #define COMPLEXITY knob_78

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — SLOW POLYP SWAY, FAST ONLY ON EXTREME Z-SCORES
// Coral mandate: organic multi-frequency undulation, retract on extremes
// ============================================================================

// Z-score gating: returns audio contribution only when |zScore| > 0.6
#define GATE(zs) step(0.6, abs(zs))

// Shape complexity: organic multi-frequency sway (3 sine waves with incommensurate periods)
// Audio gated: only extreme spectral centroid breaks through
#define A_SWAY (1.45 + 0.2 * sin(iTime * 0.03) + 0.1 * sin(iTime * 0.019 + 1.0) + 0.05 * sin(iTime * 0.011 + 3.7))
#define A_AUDIO (GATE(spectralCentroidZScore) * spectralCentroidZScore * 0.12)
#define A (A_SWAY + (COMPLEXITY - 0.5) * 0.3 + A_AUDIO)
// #define A 1.45

// Body offset: slow multi-frequency drift, not audio-reactive by default
#define B (0.55 + 0.07 * sin(iTime * 0.025) + 0.04 * cos(iTime * 0.037) + 0.02 * sin(iTime * 0.053 + 2.1))
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very gentle, only on extreme z-scores
#define PULSE (1.0 + GATE(bassZScore) * bassZScore * 0.03)
// #define PULSE 1.0

// Feedback — moderate-high (0.38 base) for underwater softness
#define FEEDBACK_MIX (mapValue(TRAIL_AMOUNT, 0.0, 1.0, 0.25, 0.55) + energyNormalized * 0.04)
// #define FEEDBACK_MIX 0.38

// Rim lighting: soft orange-pink coral edge, treble shimmer gated
#define RIM_INTENSITY (0.4 + 0.12 * sin(iTime * 0.06) + GATE(trebleZScore) * trebleNormalized * 0.3)
// #define RIM_INTENSITY 0.5

// Rim color warmth: always warm coral tones
#define RIM_WARMTH (mapValue(WARMTH, 0.0, 1.0, 0.5, 0.9) + spectralRoughnessNormalized * 0.1)
// #define RIM_WARMTH 0.7

// Pearl brilliance: slow 18-second luminous cycle, extreme crest adds flash
#define PEARL_BREATH (0.75 + 0.25 * sin(iTime * 0.349))
#define GEM_BRILLIANCE (PEARL_BREATH + GATE(spectralCrestZScore) * spectralCrestZScore * 0.25)
// #define GEM_BRILLIANCE 0.9

// Pearl dispersion: subtle iridescent separation
#define GEM_DISPERSION (0.25 + spectralSpreadNormalized * 0.15 * GATE(spectralSpreadZScore))
// #define GEM_DISPERSION 0.3

// Tendril curl: 3 sine waves with incommensurate periods (20s, 33s, 47s) for organic tentacle motion
// On extreme z-scores, tentacles whip
#define FLAP_RATE mapValue(WING_SPEED, 0.0, 1.0, 0.02, 0.14)
#define FLAP_AMP mapValue(WING_SPAN, 0.0, 1.0, 0.12, 0.65)
#define TENTACLE_WHIP (GATE(spectralCentroidZScore) * spectralCentroidSlope * 0.4)
#define TENDRIL_CURL (sin(iTime * 6.2832 / 20.0 * FLAP_RATE * 5.0) * FLAP_AMP + sin(iTime * 6.2832 / 33.0 * FLAP_RATE * 5.0) * FLAP_AMP * 0.6 + sin(iTime * 6.2832 / 47.0 * FLAP_RATE * 5.0) * FLAP_AMP * 0.35 + TENTACLE_WHIP)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent tentacle axis, different periods
#define CROSS_WHIP (GATE(spectralSpreadZScore) * spectralSpreadSlope * 0.3)
#define TENDRIL_CROSS (sin(iTime * 6.2832 / 25.0 * FLAP_RATE * 5.0) * FLAP_AMP * 0.7 + sin(iTime * 6.2832 / 41.0 * FLAP_RATE * 5.0) * FLAP_AMP * 0.4 + sin(iTime * 6.2832 / 59.0 * FLAP_RATE * 5.0 + 1.8) * FLAP_AMP * 0.25 + CROSS_WHIP)
// #define TENDRIL_CROSS 0.0

// Flow drift: slow lateral water current + very gentle sine drift
#define FLOW_EXTREME_X (GATE(spectralCentroidZScore) * spectralCentroidSlope * 0.002)
#define FLOW_X (sin(iTime * 0.015) * 0.001 + FLOW_EXTREME_X)
// #define FLOW_X 0.0
#define FLOW_EXTREME_Y (GATE(spectralSpreadZScore) * spectralSpreadSlope * 0.0015)
#define FLOW_Y (cos(iTime * 0.019 + 0.7) * 0.0007 + FLOW_EXTREME_Y)
// #define FLOW_Y 0.0

// Drop trigger: turbulence > 4.0 required — on drop, coral retracts
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

// Retraction on extreme z-scores: form contracts (C multiplier increases)
#define RETRACT_AMOUNT (step(0.6, ZSCORE_TURBULENCE / 5.0) * 0.1)

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

// Drop state ramp/decay — slow ramp, slow decay for organic re-bloom
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.006
#define DROP_DECAY_MAX 0.035

// ============================================================================
// CORAL PALETTE — warm pinks, oranges, yellows on deep ocean blue
// ============================================================================

// Coral depth: t=0 warm coral pink (closest), t=1 deep ocean blue (farthest)
vec3 coralPalette(float t) {
    t = clamp(t, 0.0, 1.0);

    if (t < 0.25) {
        float s = t / 0.25;
        // Bright coral pink to warm orange
        float L = mix(0.78, 0.68, s);
        float C = mix(0.18, 0.22, s);
        float h = mix(0.65, 0.85, s);  // pink to orange in oklab
        return clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    } else if (t < 0.5) {
        float s = (t - 0.25) / 0.25;
        // Warm orange to golden yellow
        float L = mix(0.68, 0.58, s);
        float C = mix(0.22, 0.18, s);
        float h = mix(0.85, 1.1, s);  // orange to yellow
        return clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    } else if (t < 0.75) {
        float s = (t - 0.5) / 0.25;
        // Golden yellow to muted teal
        float L = mix(0.58, 0.35, s);
        float C = mix(0.18, 0.1, s);
        float h = mix(1.1, 3.5, s);  // yellow through green to teal
        return clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    } else {
        float s = (t - 0.75) / 0.25;
        // Muted teal to deep ocean blue-black
        float L = mix(0.35, 0.08, s);
        float C = mix(0.1, 0.04, s);
        float h = mix(3.5, 4.0, s);  // teal to deep blue
        return clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    }
}

// Coral lace color — warm pink to orange tentacle tissue
vec3 coralLace(float intensity, float warmth) {
    // Coral pink base
    vec3 cool_coral = vec3(1.0, 0.5, 0.35);
    // Warm golden coral
    vec3 warm_coral = vec3(1.0, 0.8, 0.3);
    return mix(cool_coral, warm_coral, warmth) * intensity;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Slow lateral water current — whole scene drifts like ocean sway
    C += vec2(sin(iTime * 0.011) * 0.025, cos(iTime * 0.014) * 0.018);

    // Retraction: on extreme z-scores, C contracts (polyp pulls inward)
    C *= 1.0 + RETRACT_AMOUNT;

    // Time-driven curl — organic tentacle drift with 3 independent oscillations
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit trap for focal point (pearl formation site)
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

        // Soft accumulated proximity for focal detection (pearl)
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree lines — coral tentacle tissue (soft, organic look with sharpening 1.8)
    float lace_lo = mapValue(LACE_DENSITY, 0.0, 1.0, -1.5, -2.5);
    float lace_hi = mapValue(LACE_DENSITY, 0.0, 1.0, -4.5, -5.5);
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    // Soft sharpening (1.8) for organic tentacle look instead of crisp geometric
    float lace_sharp = mapValue(LACE_DENSITY, 0.0, 1.0, 1.5, 2.2);
    lace = pow(max(lace, 0.0), lace_sharp);

    // Fractal structure — used for depth + internal variation
    float color_phase = 0.5 + (WARMTH - 0.5) * 0.8;
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT detection — pearl forming inside coral
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Pearl rim — soft organic nacre edge
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Pearl specular — fractal structure creates natural luster
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Pearl internal glow — slow 18-second luminous cycle
    float gem_pulse = PEARL_BREATH;

    // Prismatic dispersion — subtle pearl iridescence
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    // Pearl: very subtle color separation, mostly white-pink
    vec3 gem_prism = vec3(
        pow(f_safe, 1.9 - disp * 0.15),
        pow(f_safe, 1.95),
        pow(f_safe, 1.9 + disp * 0.15)
    );

    // Pearl depth shading
    float gem_depth_shade = mix(0.5, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // CORAL DEPTH MAPPING
    // ========================================================================

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — coral retraction + slow re-bloom
    // Requires turbulence > 4.0 for retraction trigger
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    // High threshold: 4.0 — only extreme audio events cause retraction
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

    // During build: depth compresses (coral extends toward light)
    depth = mix(depth, depth * 0.7, build * 0.3);
    // During drop/retraction: background darkens, focal pearl brightens
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — warm coral lace on deep ocean blue background
    // ========================================================================

    // Remap rainbow to coral palette: warm pinks, oranges, yellows
    vec3 coral_lace = vec3(
        rainbow.r * 0.8 + rainbow.g * 0.2,          // warm red-orange
        rainbow.g * 0.5 + rainbow.r * 0.3,           // orange-golden
        rainbow.b * 0.2 + rainbow.r * 0.1             // suppress blue, keep hint
    );
    // Blend toward coral pink-orange tones based on warmth
    vec3 lace_warm = coralLace(luma, WARMTH);
    coral_lace = mix(coral_lace, lace_warm, 0.5);

    // Slow organic lace pulse — polyp breathing
    float lace_pulse = 0.88 + 0.12 * sin(iTime * 0.065 + luma * 2.5);
    coral_lace *= lace_pulse;

    // Background: deep ocean blue
    vec3 bg_cold = vec3(0.01, 0.03, 0.08);
    vec3 bg_warm = vec3(0.02, 0.04, 0.06);
    vec3 bg_ocean = mix(bg_cold, bg_warm, WARMTH);

    vec3 col = mix(bg_ocean, coral_lace, lace);

    // Filigree highlights — warm coral thread intersections
    vec3 fil_coral = mix(
        vec3(0.8, 0.45, 0.3),   // cool coral
        vec3(0.9, 0.7, 0.35),   // warm golden coral
        WARMTH
    );
    col += fil_coral * lace_fine * 0.22;

    // Rim detection — soft orange-pink coral edge glow
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y - cos(iTime * 0.014) * 0.015));
    rim *= center_fade;

    // Rim color: warm orange-pink (coral edge tissue)
    vec3 rim_cool = vec3(0.8, 0.35, 0.25);   // salmon pink
    vec3 rim_warm = vec3(0.9, 0.55, 0.2);     // warm orange
    vec3 rim_col = mix(rim_cool, rim_warm, RIM_WARMTH);

    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // PEARL FOCAL — iridescent white-pink forming inside coral
    // ========================================================================

    float glow_energy = clamp(0.5 + GATE(energyZScore) * energyZScore * 0.25, 0.0, 1.0);

    // Pearl base color — iridescent white-pink, very subtle hue shift
    vec3 pearl_base = vec3(0.95, 0.9, 0.95);     // white-pink nacre
    vec3 pearl_luster = vec3(0.9, 0.85, 0.98);   // cool iridescent shift
    // Gentle slow iridescence oscillation
    float nacre_shift = 0.5 + 0.5 * sin(iTime * 0.2 + focal_trap * 6.0);
    vec3 gem_base = mix(pearl_base, pearl_luster, nacre_shift * 0.3);

    // Pearl flash color (for drops) — bright warm white
    vec3 gem_fire = vec3(1.0, 0.92, 0.85);

    // Pearl white — pure nacre
    vec3 gem_white = vec3(1.0, 0.97, 0.98);

    // Pearl interior with slow breathing luster
    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    // Pearl sparkle — gentle luster, not aggressive
    float sparkle_str = mix(0.25, 0.6, glow_energy);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Pearl rim glow: pink inner, soft blue-white outer (nacre edge)
    vec3 rim_inner = vec3(0.95, 0.8, 0.85);      // warm pearl pink
    vec3 rim_outer = vec3(0.8, 0.85, 0.95);       // cool nacre blue
    vec3 gem_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.7, 1.15, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.85);

    // Outer pearl glow — subtle nacre halo
    float glow_str = mix(0.05, 0.15, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += gem_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // DROP MODE — coral retraction: everything contracts, pearl intensifies
    // Then slow re-bloom as coral re-extends tentacles
    // ========================================================================

    float bg_dim = mix(1.0, 0.25, drop);
    float focal_boost = mix(1.0, 2.0, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // On retraction: rim goes warm white (stress coloring)
    vec3 rim_stress = vec3(1.0, 0.75, 0.5);
    col += rim_stress * rim * drop * 0.25;

    // Coral lace dims slightly during retraction (polyps retracting)
    col *= mix(1.0, 0.8, drop * lace);

    // Pearl blazes during retraction (exposed, unprotected)
    float blaze = focal * focal_boost * drop * glow_energy;
    col += gem_fire * blaze * 0.4;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.35;
    col += gem_prism * vec3(0.95, 0.85, 0.9) * gem_rim * drop * 0.25;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat: very subtle coral pulse, only on beat
    if (beat) {
        col += vec3(0.08, 0.03, 0.02) * focal;
        col *= 1.02;
    }

    col *= PULSE;

    // Moderate-high feedback for underwater softness
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Vignette — looking through ocean water at coral
    float vign_power = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 1.4, 3.0);
    float vign_scale = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 0.5, 0.9);
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 1.8), drop);
    col *= max(vign, 0.01);

    // Brightness gating: only lace, rim, and focal structures allowed bright
    float bright_allowed = max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7));
    col *= mix(0.1, 1.0, bright_allowed);

    // Tone mapping — warmer than standard
    col = col / (col + vec3(0.65));

    // Final color grade — push toward warm coral tones
    col = pow(max(col, vec3(0.0)), vec3(0.86, 0.92, 1.0));

    P = vec4(col, drop_state);
}
