// @fullscreen: true
// @mobile: true
// @tags: iridescent, butterfly, morpho, thin-film, ambient, clit-variation
// Morpho Wing — Structural color / thin-film interference variation of clit fractal
// Lace filigree shimmers with angle-dependent iridescent colors like butterfly wings
// or oil on water. Dominant blues and greens shift to purple/gold at edges.
// Gem = compound eye (multifaceted). Slow angular rotation changes visible colors.
// Default = SLOW iridescent color shifting. Fast reactions ONLY on abs(z-score) > 0.6.
// Based on Dom Mandy's complex power fractal (clit series)
//
//https://visuals.beadfamous.com/?shader=clit/variations/morpho-wing

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — gated by z-score threshold
// Audio only kicks in on VERY abnormal z-scores (abs > 0.6)
// ============================================================================

// Z-score gate: returns 0 when normal, ramps up only past threshold
#define ZSCORE_GATE(zs, thresh) clamp((abs(zs) - thresh) / (1.0 - thresh), 0.0, 1.0)

// Shape complexity: slow sine drift, audio only on extreme z-scores
#define A_BASE (1.5 + 0.12 * sin(iTime * 0.02))
#define A_AUDIO (ZSCORE_GATE(spectralCentroidZScore, 0.6) * sign(spectralCentroidZScore) * 0.15)
#define A (A_BASE + A_AUDIO)
// #define A 1.5

// Body offset: gentle sine drift, audio gated
#define B_BASE (0.55 + 0.05 * sin(iTime * 0.027))
#define B_AUDIO (ZSCORE_GATE(energyZScore, 0.6) * energyZScore * 0.08)
#define B (B_BASE + B_AUDIO)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.0

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very subtle, gated
#define PULSE_AUDIO (ZSCORE_GATE(bassZScore, 0.6) * bassZScore * 0.04)
#define PULSE (1.0 + PULSE_AUDIO)
// #define PULSE 1.0

// Feedback — moderate (0.3 base) for shimmer trails
#define FEEDBACK_MIX (0.3 + ZSCORE_GATE(energyZScore, 0.6) * 0.1)
// #define FEEDBACK_MIX 0.3

// Rim lighting: gentle iridescent edge glow
#define RIM_INTENSITY (0.45 + ZSCORE_GATE(trebleZScore, 0.6) * 0.4)
// #define RIM_INTENSITY 0.45

// Gem brilliance: compound eye facets
#define GEM_BRILLIANCE (0.85 + ZSCORE_GATE(spectralCrestZScore, 0.6) * 0.4)
// #define GEM_BRILLIANCE 0.85

// Gem dispersion: prismatic spread for compound eye facets
#define GEM_DISPERSION (0.35 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * 0.35)
// #define GEM_DISPERSION 0.35

// Tendril curl: slow wing beat (period ~25s), fast flutter on z > 0.6
#define WING_BEAT_RATE 0.2513  // 2*PI / 25s
#define WING_BEAT_AMP 0.35
#define FLUTTER_AUDIO (ZSCORE_GATE(spectralFluxZScore, 0.6) * spectralFluxZScore * 0.5)
#define TENDRIL_CURL (sin(iTime * WING_BEAT_RATE) * WING_BEAT_AMP + sin(iTime * WING_BEAT_RATE * 0.57) * WING_BEAT_AMP * 0.5 + FLUTTER_AUDIO)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent slow drift
#define TENDRIL_CROSS (sin(iTime * WING_BEAT_RATE * 0.77) * WING_BEAT_AMP * 0.7 + sin(iTime * WING_BEAT_RATE * 0.43 + 1.0) * WING_BEAT_AMP * 0.4 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadZScore * 0.25)
// #define TENDRIL_CROSS 0.0

// Flow drift: very slow iridescent shimmer drift
#define FLOW_X (sin(iTime * 0.015) * 0.001 + ZSCORE_GATE(spectralCentroidZScore, 0.6) * spectralCentroidSlope * 0.002)
// #define FLOW_X 0.0
#define FLOW_Y (sin(iTime * 0.012) * 0.0008 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadSlope * 0.0015)
// #define FLOW_Y 0.0

// Drop trigger: multiple z-scores spiking + confident energy drop = flash display
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Drop state ramp/decay — slower decay for lingering flash
#define DROP_RAMP 0.07
#define DROP_DECAY_MIN 0.01
#define DROP_DECAY_MAX 0.05

// Flash display requires high turbulence
#define FLASH_THRESHOLD 4.0

// Slow angular rotation for iridescence shift
#define IRID_SHIFT (iTime * 0.008)

// ============================================================================
// STRUCTURAL COLOR — thin-film interference / morpho butterfly palette
// ============================================================================

// Structural iridescent color based on viewing angle
// Cycles through blues, greens, purples like butterfly wing scales
vec3 structuralColor(float angle, float shift) {
    // cos with 120-degree offsets = RGB structural color
    // Phase 0 = blue dominant, shifting through green to purple
    float phase = angle + shift;
    return cos(phase * 3.0 + vec3(0.0, 2.094, 4.189)) * 0.5 + 0.5;
}

// Morpho palette: maps depth to iridescent blue-green spectrum
// t=0: bright morpho blue (near), t=1: deep navy (far)
vec3 morphoPalette(float t, float angle, float shift) {
    t = clamp(t, 0.0, 1.0);

    // Base structural color from viewing angle
    vec3 irid = structuralColor(angle, shift);

    // Bias toward morpho blue-green spectrum
    // Suppress red channel, boost blue and green
    irid.r *= 0.3 + 0.15 * sin(angle * 2.0 + shift);
    irid.g *= 0.7 + 0.3 * cos(angle * 1.5 + shift * 0.7);
    irid.b *= 0.9 + 0.1 * sin(angle * 0.8 + shift * 1.3);

    // Brightness falls off with depth
    float brightness = mix(0.7, 0.08, t);

    // Saturation peaks in midtones
    float sat_boost = 1.0 + 0.3 * sin(t * 3.14159);

    vec3 col = irid * brightness * sat_boost;
    return clamp(col, 0.0, 1.0);
}

// Complementary color for rim (gold/amber when main is blue)
vec3 complementaryIrid(float angle, float shift) {
    // Offset by PI for complementary hue
    float comp_angle = angle + 3.14159;
    vec3 comp = structuralColor(comp_angle, shift);
    // Warm bias for complementary: gold/amber/copper
    comp.r *= 1.0;
    comp.g *= 0.65;
    comp.b *= 0.3;
    return clamp(comp, 0.0, 1.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Time-driven curl — slow wing beat
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulate smooth proximity for compound eye gem
    float focal_trap = 0.0;
    float focal_weight = 0.0;
    vec2 focal_center = vec2(0.0, 0.12);

    // Accumulate angle data for iridescence
    float angle_accum = 0.0;

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

        // Accumulate angle for iridescence variation across fractal
        angle_accum += a * (1.0 - float(k) / 50.0);

        // Soft accumulated proximity for compound eye
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
    // LACE = WING SCALES — moderate sharpness (2.5) for scale-like texture
    // ========================================================================

    float lace_lo = -2.0;
    float lace_hi = -5.0;
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 2.5);  // Wing-scale sharpness

    // Fractal structure for angle-based iridescence
    float frac_angle = atan(Z.y, Z.x);
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(frac_angle - vec4(0, 2.1, 4.2, 0)), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // IRIDESCENCE — angle-dependent structural color
    // Color depends on fractal angle + slow temporal rotation
    // ========================================================================

    // Per-pixel viewing angle from fractal geometry
    float irid_angle = frac_angle + angle_accum * 0.1;
    float irid_time = IRID_SHIFT;

    // ========================================================================
    // FOCAL POINT — compound eye: multifaceted with multiple color highlights
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Compound eye rim — multifaceted edge
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float eye_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    eye_rim = max(eye_rim, 0.0) * 2.0;

    // Compound eye facets — fractal structure creates natural faceting
    float facet_detail = smoothstep(0.3, 0.8, z) * focal;
    float facet_sparkle = pow(facet_detail, 3.0);

    // Facet angle — each facet shows a different iridescent color
    float facet_angle = frac_angle * 6.0 + angle_accum * 0.3;

    // Internal pulse — slow compound eye shimmer
    float eye_pulse = 0.88 + 0.12 * sin(iTime * 0.5);

    // Prismatic dispersion across facets
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 eye_prism = vec3(
        pow(f_safe, 1.8 - disp * 0.3),
        pow(f_safe, 2.0),
        pow(f_safe, 1.8 + disp * 0.3)
    );

    float eye_depth_shade = mix(0.5, 1.0, smoothstep(0.0, 0.7, eye_rim + facet_sparkle * 0.3));

    // ========================================================================
    // DEPTH MAPPING
    // ========================================================================

    float base_depth = mix(0.4, 0.9, 1.0 - luma);
    float detail_depth = mix(0.1, 0.4, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — iridescent flash: all colors at max brightness
    // Requires turbulence > FLASH_THRESHOLD
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    float drop_signal = clamp(drop_trigger * smoothstep(FLASH_THRESHOLD - 1.0, FLASH_THRESHOLD, turbulence), 0.0, 1.0);

    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float prev_drop_state = getLastFrameColor(state_uv).a;

    float settled = AUDIO_SETTLED;
    float decay_rate = mix(DROP_DECAY_MIN, DROP_DECAY_MAX, settled);

    float drop_state = prev_drop_state;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, decay_rate);
    drop_state = clamp(drop_state, 0.0, 1.0);

    float drop = animateEaseInOutCubic(drop_state);

    // Storm modifies depth
    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — iridescent wing scales
    // Lace color depends on viewing angle + slow rotation
    // ========================================================================

    // Wing scale iridescent color
    vec3 scale_col = morphoPalette(depth, irid_angle, irid_time);

    // Add variation from fractal structure — different scales show different hues
    float angle_var = frac_angle * 0.15915; // /TAU
    vec3 scale_var = morphoPalette(fract(depth + angle_var * 0.3), irid_angle + 1.0, irid_time);
    scale_col = mix(scale_col, scale_var, 0.25);

    // Background: deep navy
    vec3 bg_navy = vec3(0.01, 0.01, 0.04);

    // Very subtle navy variation — like deep ocean at night
    float bg_var = sin(uv.x * 2.0 + iTime * 0.006) * 0.004 + sin(uv.y * 3.0 - iTime * 0.005) * 0.003;
    bg_navy += vec3(0.0, 0.0, bg_var);
    bg_navy = max(bg_navy, vec3(0.0));

    // Wing scales emerge from navy background
    vec3 col = mix(bg_navy, scale_col, lace);

    // Filigree highlights — iridescent shimmer on fine scale detail
    vec3 fil_irid = structuralColor(irid_angle * 2.0 + 0.5, irid_time * 1.3);
    fil_irid *= vec3(0.4, 0.7, 0.9); // Blue-green bias
    col += fil_irid * lace_fine * 0.18;

    // Rim detection — edges glow with complementary iridescence
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    // Rim color: complementary to main iridescence (gold/amber when blue)
    vec3 rim_col = complementaryIrid(irid_angle, irid_time);
    col += rim_col * rim * RIM_INTENSITY * 0.25;

    // ========================================================================
    // COMPOUND EYE FOCAL — multifaceted with different iridescent highlights
    // ========================================================================

    float glow_energy = clamp(0.5 + ZSCORE_GATE(energyZScore, 0.6) * energyZScore * 0.3, 0.0, 1.0);

    // Compound eye base: each facet shows a different iridescent color
    // Use multiple angles to create faceted appearance
    vec3 facet_col_1 = structuralColor(facet_angle, irid_time);
    vec3 facet_col_2 = structuralColor(facet_angle + 2.094, irid_time + 0.5);
    vec3 facet_col_3 = structuralColor(facet_angle + 4.189, irid_time + 1.0);

    // Blend facets based on fractal structure for multifaceted look
    float facet_blend = fract(frac_angle * 3.0 + z * 5.0);
    vec3 eye_base = mix(facet_col_1, facet_col_2, smoothstep(0.3, 0.7, facet_blend));
    eye_base = mix(eye_base, facet_col_3, smoothstep(0.6, 0.9, facet_blend));

    // Boost blue-green dominance
    eye_base = eye_base * vec3(0.6, 0.85, 1.0);
    eye_base = max(eye_base, vec3(0.05));

    vec3 eye_white = vec3(0.95, 0.98, 1.0); // Slightly blue-white
    vec3 eye_hot = vec3(0.7, 0.9, 1.0);     // Cool bright for flash

    vec3 eye_interior = eye_prism * eye_base * eye_pulse * eye_depth_shade;

    float sparkle_str = mix(0.4, 0.9, glow_energy);
    vec3 eye_specular = eye_white * facet_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Compound eye rim — iridescent ring
    vec3 halo_inner = structuralColor(facet_angle + 1.0, irid_time + 0.3) * vec3(0.7, 0.9, 1.0);
    vec3 halo_outer = structuralColor(facet_angle - 1.0, irid_time - 0.3) * vec3(0.3, 0.6, 0.8);
    vec3 eye_halo_col = mix(halo_outer, halo_inner, smoothstep(0.0, 1.0, eye_rim));
    vec3 eye_halo_light = eye_halo_col * eye_rim * GEM_BRILLIANCE;

    float eye_energy_boost = mix(0.8, 1.2, glow_energy);
    vec3 eye_col = eye_interior * GEM_BRILLIANCE * eye_energy_boost
                 + eye_specular
                 + eye_halo_light;

    col = mix(col, eye_col, focal * 0.85);

    // Outer glow — faint iridescent halo
    float glow_str = mix(0.05, 0.18, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    vec3 outer_irid = structuralColor(irid_angle, irid_time) * vec3(0.4, 0.6, 0.9);
    col += outer_irid * outer_glow * glow_str * GEM_BRILLIANCE * 0.6;

    // ========================================================================
    // FLASH DISPLAY (drop mode) — all iridescent colors at max brightness
    // Like a morpho butterfly flashing all wing scales simultaneously
    // ========================================================================

    // During flash: rapid iridescent cycling — all colors visible at once
    float flash_hue_speed = drop * 3.0;
    vec3 flash_scales = structuralColor(irid_angle + iTime * flash_hue_speed, irid_time + iTime * 0.4 * drop);

    // Full spectrum flash — all iridescent colors at max
    vec3 flash_full = cos(irid_angle * 5.0 + iTime * drop * 2.0 + vec3(0.0, 2.094, 4.189)) * 0.5 + 0.5;
    flash_full = max(flash_full, vec3(0.3)); // No color goes dark during flash

    // Blend flash over normal color
    vec3 flash_col = mix(bg_navy, flash_full * 0.9, lace) + eye_col * focal * 0.85;
    col = mix(col, flash_col, drop * 0.65);

    // Flash brightness spike
    float flash_brightness = 1.0 + drop * 0.7;
    col *= flash_brightness;

    // Flash rim: bright complementary flare
    vec3 flash_rim = complementaryIrid(irid_angle + iTime * drop, irid_time) * 1.2;
    col += flash_rim * rim * drop * 0.25;

    // Compound eye blazes during flash — all facets fire
    float eye_blaze = focal * mix(1.0, 2.0, drop) * drop * glow_energy;
    col += eye_hot * eye_blaze * 0.4;
    col += eye_white * pow(f_safe, 2.5) * drop * glow_energy * 0.3;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat response — very subtle iridescent pulse, only during extreme z-scores
    if (beat) {
        float beat_strength = ZSCORE_GATE(energyZScore, 0.5) * 0.5;
        vec3 beat_irid = structuralColor(irid_angle + 0.5, irid_time + 1.0) * vec3(0.3, 0.5, 0.7);
        col += beat_irid * 0.08 * focal * beat_strength;
        col *= 1.0 + 0.03 * beat_strength;
    }

    col *= PULSE;

    // Frame feedback — moderate for shimmer trails
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Vignette — soft and wide for wing expanse
    float vign = 1.0 - pow(length(uv) * 0.55, 1.5);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 1.5), drop);
    col *= max(vign, 0.03);

    // Brightness gating — allow wing scales and compound eye to shine
    float bright_allowed = max(max(lace, rim * 0.4), max(focal, eye_rim * 0.6));
    col *= mix(0.12, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Final gamma — blue push for morpho butterfly dominance
    col = pow(max(col, vec3(0.0)), vec3(0.95, 0.9, 0.84));

    P = vec4(col, drop_state);
}
