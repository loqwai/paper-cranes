// @fullscreen: true
// @mobile: true
// @tags: silk, veil, monochrome, rose, gentle, ambient
// Silk Veil — translucent silk layers billowing in a gentle breeze
// Monochromatic rose/blush palette. Pearl focal glow. Very high feedback.
// Default = SLOW billowing. Fast reactions ONLY on extreme z-scores (abs > 0.6).
// Based on Dom Mandy's complex power fractal (clit series variation)

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Shape complexity: complex slow sine drift, only perturbed on extreme audio
#define STORM_FACTOR clamp((abs(energyZScore) - 0.6) * 2.5, 0.0, 1.0)
// #define STORM_FACTOR 0.0

#define A (1.5 + 0.12 * sin(iTime * 0.035) + 0.08 * sin(iTime * 0.019) + STORM_FACTOR * spectralCentroidZScore * 0.15)
// #define A 1.5

// Body offset: layered slow drift, storm perturbs
#define B (0.55 + 0.05 * sin(iTime * 0.028) + 0.03 * cos(iTime * 0.041) + STORM_FACTOR * energyZScore * 0.08)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.0

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse: very subtle, only noticeable on extremes
#define PULSE (1.0 + STORM_FACTOR * bassZScore * 0.04)
// #define PULSE 1.0

// Very high feedback for overlapping veil/ghost effect
#define FEEDBACK_MIX (0.55 + energyNormalized * 0.05 * STORM_FACTOR)
// #define FEEDBACK_MIX 0.55

// Rim lighting: very soft, rose tones
#define RIM_INTENSITY (0.25 + trebleNormalized * 0.2 * STORM_FACTOR)
// #define RIM_INTENSITY 0.25

// Pearl gem brilliance: gentle pulse
#define GEM_BRILLIANCE (0.6 + 0.15 * sin(iTime * 0.4) + spectralCrestNormalized * 0.15 * STORM_FACTOR)
// #define GEM_BRILLIANCE 0.7

// Tendril curl: 3 layered sine waves all very slow, only fast on extreme z-scores
#define SLOW_CURL_1 (sin(iTime * 0.314159) * 0.5)
#define SLOW_CURL_2 (sin(iTime * 0.179520) * 0.35)
#define SLOW_CURL_3 (sin(iTime * 0.125664) * 0.25)
#define STORM_CURL (spectralCentroidZScore * 0.8 + spectralFluxZScore * 0.5)
#define TENDRIL_CURL (SLOW_CURL_1 + SLOW_CURL_2 + SLOW_CURL_3 + STORM_FACTOR * STORM_CURL)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent slow drift
#define SLOW_CROSS_1 (cos(iTime * 0.257080) * 0.4)
#define SLOW_CROSS_2 (sin(iTime * 0.146608 + 2.0) * 0.3)
#define SLOW_CROSS_3 (cos(iTime * 0.100531 + 1.0) * 0.2)
#define STORM_CROSS (spectralSpreadZScore * 0.6 + bassZScore * 0.4)
#define TENDRIL_CROSS (SLOW_CROSS_1 + SLOW_CROSS_2 + SLOW_CROSS_3 + STORM_FACTOR * STORM_CROSS)
// #define TENDRIL_CROSS 0.0

// Flow drift: constant slow circular, storm adds chaos
#define FLOW_X (sin(iTime * 0.02) * 0.002 + STORM_FACTOR * spectralCentroidSlope * 0.004)
// #define FLOW_X 0.0
#define FLOW_Y (cos(iTime * 0.025) * 0.002 + STORM_FACTOR * spectralSpreadSlope * 0.003)
// #define FLOW_Y 0.0

// Drop trigger: requires very high turbulence (4.5+) for silk tear
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Drop state ramp/decay — slower ramp, faster decay for silk
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.015
#define DROP_DECAY_MAX 0.08

// ============================================================================
// MONOCHROMATIC ROSE PALETTE
// ============================================================================

// Rose/blush lace color
vec3 silkRose(float t) {
    // Deep burgundy to blush rose, monochromatic
    t = clamp(t, 0.0, 1.0);
    vec3 deep = vec3(0.25, 0.08, 0.12);     // deep burgundy
    vec3 mid  = vec3(0.55, 0.22, 0.32);      // dusty rose
    vec3 lite = vec3(0.85, 0.55, 0.65);      // blush
    vec3 pale = vec3(0.95, 0.82, 0.86);      // pale rose

    // 3-stop gradient
    vec3 col = mix(deep, mid, smoothstep(0.0, 0.35, t));
    col = mix(col, lite, smoothstep(0.35, 0.65, t));
    col = mix(col, pale, smoothstep(0.65, 1.0, t));
    return col;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Time-driven curl billows the silk — very gentle by default
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — soft accumulated proximity for pearl glow
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

        // Soft accumulated proximity for pearl focal glow
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree — softer sharpening (1.5 instead of 3.0) for silk texture
    float lace_lo = -2.0;
    float lace_hi = -5.0;
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 1.5);  // Softer than standard (1.5 vs 3.0)

    // Fractal structure for rose color mapping
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — soft pearl glow, not a hard gem
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Pearl rim — very soft organic edge
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float pearl_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    pearl_rim = max(pearl_rim, 0.0) * 1.5;  // Softer than gem_rim

    // Pearl specular — subtle, not sharp
    float pearl_detail = smoothstep(0.3, 0.8, z) * focal;
    float pearl_sparkle = pow(pearl_detail, 2.0);  // Lower power = softer sparkle

    // Internal pearl pulse — very slow breathing
    float pearl_pulse = 0.9 + 0.1 * sin(iTime * 0.3);

    // Pearl color: warm white with rose tint
    vec3 pearl_base = vec3(0.95, 0.9, 0.92);
    vec3 pearl_warm = vec3(0.98, 0.88, 0.91);

    float f_safe = max(focal, 0.0);

    // Soft pearl iridescence — very subtle color separation
    vec3 pearl_iris = vec3(
        pow(f_safe, 1.9),
        pow(f_safe, 2.0),
        pow(f_safe, 1.85)
    );

    // ========================================================================
    // DROP STATE — silk tears on extreme turbulence
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    // Higher threshold: requires turbulence > 4.5 for silk tear
    float drop_signal = clamp(drop_trigger * smoothstep(3.5, 4.5, turbulence), 0.0, 1.0);

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
    // COLOR — monochromatic rose throughout
    // ========================================================================

    // Map fractal luminance to rose palette
    vec3 silk_col = silkRose(luma);

    // Deep burgundy background
    vec3 bg = vec3(0.06, 0.015, 0.03);

    // Silk lace layer
    vec3 col = mix(bg, silk_col, lace);

    // Filigree highlights — pale rose
    col += vec3(0.9, 0.7, 0.78) * lace_fine * 0.15;

    // Rim detection — soft rose edges
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    vec3 rim_col = vec3(0.7, 0.3, 0.45);  // Dusty rose rim

    col += rim_col * rim * RIM_INTENSITY * 0.25;

    // ========================================================================
    // PEARL FOCAL — soft luminous glow
    // ========================================================================

    vec3 pearl_interior = pearl_iris * pearl_base * pearl_pulse;

    // Soft specular
    vec3 pearl_spec = pearl_warm * pearl_sparkle * 0.5 * GEM_BRILLIANCE;

    // Pearl rim glow
    vec3 pearl_rim_col = vec3(0.92, 0.8, 0.85) * pearl_rim * GEM_BRILLIANCE * 0.7;

    vec3 pearl_col = pearl_interior * GEM_BRILLIANCE
                   + pearl_spec
                   + pearl_rim_col;

    // Blend pearl into scene
    col = mix(col, pearl_col, focal * 0.7);

    // Outer glow — soft rose halo around pearl
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += vec3(0.85, 0.55, 0.65) * outer_glow * 0.08 * GEM_BRILLIANCE;

    // ========================================================================
    // DROP MODE — silk tears: sharp contrast spike
    // ========================================================================

    // On drop, increase contrast dramatically (silk tearing apart)
    float contrast_boost = mix(1.0, 2.5, drop);
    vec3 col_mid = vec3(0.35, 0.15, 0.22);  // Rose midpoint
    col = mix(col_mid, (col - col_mid) * contrast_boost + col_mid, 1.0);

    // Pearl blazes bright white during tear
    float blaze = focal * drop * 1.5;
    col += pearl_base * blaze * 0.4;
    col += vec3(1.0, 0.85, 0.9) * pow(f_safe, 2.5) * drop * 0.3;

    // Background dims dramatically
    float bg_dim = mix(1.0, 0.3, drop * (1.0 - focal));
    col *= bg_dim;

    // Rim burns brighter during tear
    col += vec3(0.9, 0.4, 0.55) * rim * drop * 0.15;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Very subtle beat response, only when storm is active
    if (beat) {
        col += vec3(0.08, 0.03, 0.04) * focal * STORM_FACTOR;
        col *= 1.0 + 0.02 * STORM_FACTOR;
    }

    col *= PULSE;

    // Very high feedback — ghostly overlapping veils
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.97, FEEDBACK_MIX);  // 0.97 decay = very slow fade

    // Vignette — very soft and wide
    float vign = 1.0 - pow(length(uv) * 0.4, 1.2);  // Wide and gentle
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 1.5), drop);
    col *= max(vign, 0.05);

    // Soft brightness gating — less aggressive than standard
    float bright_allowed = max(max(lace, rim * 0.3), max(focal, pearl_rim * 0.5));
    col *= mix(0.25, 1.0, bright_allowed);

    // Tone mapping — slightly warmer rolloff for rose palette
    col = col / (col + vec3(0.65, 0.7, 0.68));

    // Gamma — subtle rose shift in shadows
    col = pow(max(col, vec3(0.0)), vec3(0.9, 0.92, 0.93));

    P = vec4(col, drop_state);
}
