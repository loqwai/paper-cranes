// @fullscreen: true
// @mobile: true
// @tags: aurora, ambient, northern-lights, clit-variation
// Aurora — Northern lights interpretation of the clit fractal series
// Lace filigree becomes shimmering curtains of green/teal/purple light
// Based on Dom Mandy's complex power fractal
// Default: SLOW curtains drifting like aurora borealis
// Fast reactions ONLY on very abnormal z-scores (abs > 0.6)
//
//https://visuals.beadfamous.com/?shader=clit/variations/aurora

// ============================================================================
// AURORA PALETTE — green/teal near, purple/pink far
// ============================================================================

vec3 auroraPalette(float t, float hue_shift) {
    // t=0: bright green/teal (near/foreground)
    // t=1: deep purple/pink (far/background)
    t = clamp(t, 0.0, 1.0);

    // Slowly shifting hue base
    float base_hue = hue_shift;

    // Green at t=0, teal at t=0.3, purple at t=0.7, pink at t=1.0
    float h = base_hue + t * 0.45 + 0.3; // 0.3 = green start in hue space
    float s = 0.7 + 0.2 * sin(t * 3.14159);
    float l = mix(0.55, 0.2, t); // brighter near, darker far

    return hsl2rgb(vec3(fract(h), s, l));
}

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — gated by z-score threshold
// Audio only kicks in on VERY abnormal z-scores (abs > 0.6)
// ============================================================================

// Z-score gate: returns 0 when normal, ramps up only past threshold
#define ZSCORE_GATE(zs, thresh) clamp((abs(zs) - thresh) / (1.0 - thresh), 0.0, 1.0)

// Shape complexity: slow sine drift as base, audio only on extreme z-scores
#define A_BASE (1.45 + 0.2 * sin(iTime * 0.022))
#define A_AUDIO (ZSCORE_GATE(spectralCentroidZScore, 0.6) * sign(spectralCentroidZScore) * 0.15)
#define A (A_BASE + A_AUDIO)
// #define A 1.45

// Body offset: gentle sine drift, audio gated
#define B_BASE (0.55 + 0.07 * sin(iTime * 0.03))
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

// Feedback — high for ghostly curtain trails (0.4 base)
#define FEEDBACK_MIX (0.4 + ZSCORE_GATE(energyZScore, 0.6) * 0.1)
// #define FEEDBACK_MIX 0.4

// Rim lighting: gentle glow from aurora curtain edges
#define RIM_INTENSITY (0.5 + ZSCORE_GATE(trebleZScore, 0.6) * 0.4)
// #define RIM_INTENSITY 0.5

// Gem brilliance: the bright star point
#define GEM_BRILLIANCE (0.9 + ZSCORE_GATE(spectralCrestZScore, 0.6) * 0.4)
// #define GEM_BRILLIANCE 0.9

// Gem dispersion: prismatic spread
#define GEM_DISPERSION (0.3 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * 0.3)
// #define GEM_DISPERSION 0.3

// Tendril curl: ultra-slow solar wind (period ~45s)
// Fast shimmer only on extreme z-scores
#define SOLAR_WIND_RATE 0.14  // ~45s period
#define SOLAR_WIND_AMP 0.35
#define SHIMMER_AUDIO (ZSCORE_GATE(spectralFluxZScore, 0.6) * spectralFluxZScore * 0.4)
#define TENDRIL_CURL (sin(iTime * SOLAR_WIND_RATE) * SOLAR_WIND_AMP + sin(iTime * SOLAR_WIND_RATE * 0.57) * SOLAR_WIND_AMP * 0.5 + SHIMMER_AUDIO)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent slow drift
#define TENDRIL_CROSS (sin(iTime * SOLAR_WIND_RATE * 0.77) * SOLAR_WIND_AMP * 0.7 + sin(iTime * SOLAR_WIND_RATE * 0.43 + 1.0) * SOLAR_WIND_AMP * 0.4 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadZScore * 0.2)
// #define TENDRIL_CROSS 0.0

// Flow drift: very slow atmospheric drift
#define FLOW_X (sin(iTime * 0.017) * 0.001 + ZSCORE_GATE(spectralCentroidZScore, 0.6) * spectralCentroidSlope * 0.002)
// #define FLOW_X 0.0
#define FLOW_Y (sin(iTime * 0.013) * 0.0008 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadSlope * 0.001)
// #define FLOW_Y 0.0

// Drop trigger: multiple z-scores spiking + confident energy drop = aurora storm
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Drop state ramp/decay speeds — slower decay for lingering storm
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.008
#define DROP_DECAY_MAX 0.04

// Aurora storm requires higher turbulence threshold (4.0)
#define STORM_THRESHOLD 4.0

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Slow curtain sway — vertical wave like aurora curtains in solar wind
    C.y += sin(C.x * 3.0 + iTime * 0.04) * 0.02;
    C.y += sin(C.x * 1.7 - iTime * 0.025) * 0.012;

    // Time-driven curl — ultra-slow solar wind drift
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulate smooth proximity for star-point gem
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

        // Soft accumulated proximity for star point
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
    // LACE = AURORA CURTAINS
    // Vertical streaking: lace_y weighted higher than lace_x
    // ========================================================================

    float lace_lo = -2.0;
    float lace_hi = -5.0;
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));

    // Vertical streaking: weight lace_y much higher for curtain-like vertical lines
    float lace = max(lace_x * 0.4, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 2.5);

    // Fractal structure for angular variation
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — bright star-like point (north star through aurora)
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Star rim — soft halo
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Star specular
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Gentle pulse like a distant star
    float star_pulse = 0.9 + 0.1 * sin(iTime * 0.4);

    // Prismatic dispersion for star point
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 star_prism = vec3(
        pow(f_safe, 1.8 - disp * 0.3),
        pow(f_safe, 2.0),
        pow(f_safe, 1.8 + disp * 0.3)
    );

    float star_depth_shade = mix(0.5, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // AURORA COLOR MAPPING
    // Replace chromadepth with aurora palette
    // ========================================================================

    // Slow hue shift through aurora spectrum over time
    float aurora_hue_shift = iTime * 0.01;

    // Depth mapping for aurora palette
    float base_depth = mix(0.4, 0.9, 1.0 - luma);
    float detail_depth = mix(0.1, 0.4, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — aurora storm: sustained mode change
    // Requires turbulence > 4.0 (higher threshold than base shader)
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    float drop_signal = clamp(drop_trigger * smoothstep(STORM_THRESHOLD - 1.0, STORM_THRESHOLD, turbulence), 0.0, 1.0);

    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float prev_drop_state = getLastFrameColor(state_uv).a;

    float settled = AUDIO_SETTLED;
    float decay_rate = mix(DROP_DECAY_MIN, DROP_DECAY_MAX, settled);

    float drop_state = prev_drop_state;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, decay_rate);
    drop_state = clamp(drop_state, 0.0, 1.0);

    float drop = animateEaseInOutCubic(drop_state);

    // Storm modifies depth mapping
    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — aurora curtain palette
    // ========================================================================

    // Aurora curtain color: green-teal-purple based on fractal depth
    vec3 curtain_col = auroraPalette(depth, aurora_hue_shift);

    // Add some variation from fractal structure
    float angle_var = atan(Z.y, Z.x) * 0.15915; // /TAU
    curtain_col = mix(curtain_col, auroraPalette(fract(depth + angle_var * 0.3), aurora_hue_shift), 0.3);

    // Background: deep midnight blue-black
    vec3 bg_midnight = vec3(0.01, 0.01, 0.04);

    // Very subtle midnight variation
    float bg_var = sin(uv.x * 2.0 + iTime * 0.008) * 0.003 + sin(uv.y * 3.0 - iTime * 0.006) * 0.002;
    bg_midnight += vec3(0.0, bg_var, bg_var * 1.5);
    bg_midnight = max(bg_midnight, vec3(0.0));

    // Curtains emerge from midnight background
    vec3 col = mix(bg_midnight, curtain_col, lace);

    // Filigree highlights — subtle green-white shimmer on fine curtain detail
    vec3 fil_aurora = vec3(0.5, 0.8, 0.6); // green-white
    col += fil_aurora * lace_fine * 0.15;

    // Rim detection — aurora curtain edges glow
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    // Rim color: teal-green aurora edge glow
    vec3 rim_col = auroraPalette(0.15 + sin(iTime * 0.015) * 0.1, aurora_hue_shift);
    col += rim_col * rim * RIM_INTENSITY * 0.25;

    // ========================================================================
    // STAR FOCAL POINT — bright white-green point like north star
    // ========================================================================

    float glow_energy = clamp(0.5 + ZSCORE_GATE(energyZScore, 0.6) * energyZScore * 0.3, 0.0, 1.0);

    // Star base color: white-green (like bright star through aurora)
    vec3 star_base = vec3(0.7, 1.0, 0.8);
    vec3 star_hot = vec3(0.9, 1.0, 0.95);
    vec3 star_white = vec3(1.0, 1.0, 0.95);

    vec3 star_interior = star_prism * star_base * star_pulse * star_depth_shade;

    float sparkle_str = mix(0.5, 0.9, glow_energy);
    vec3 star_specular = star_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Star halo — green-teal outer glow
    vec3 halo_inner = vec3(0.8, 1.0, 0.9);
    vec3 halo_outer = vec3(0.3, 0.7, 0.6);
    vec3 star_halo_col = mix(halo_outer, halo_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 star_halo_light = star_halo_col * gem_rim * GEM_BRILLIANCE;

    float star_energy_boost = mix(0.8, 1.2, glow_energy);
    vec3 star_col = star_interior * GEM_BRILLIANCE * star_energy_boost
                  + star_specular
                  + star_halo_light;

    col = mix(col, star_col, focal * 0.85);

    // Outer star glow — faint green halo
    float glow_str = mix(0.06, 0.2, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += star_base * outer_glow * glow_str * GEM_BRILLIANCE * 0.6;

    // ========================================================================
    // AURORA STORM (drop mode) — rapid hue cycling + brightness spike
    // ========================================================================

    // During storm: rapid hue cycling overlaid on aurora
    float storm_hue_speed = drop * 2.5; // rapid cycling during storm
    vec3 storm_curtain = auroraPalette(fract(depth + iTime * storm_hue_speed), aurora_hue_shift + iTime * 0.3 * drop);

    // Blend storm colors over normal aurora proportional to drop intensity
    col = mix(col, mix(bg_midnight, storm_curtain, lace) + star_col * focal * 0.85, drop * 0.6);

    // Storm brightness spike
    float storm_brightness = 1.0 + drop * 0.8;
    col *= storm_brightness;

    // Storm rim: bright white-green flare on edges
    vec3 storm_rim = vec3(0.6, 1.0, 0.7);
    col += storm_rim * rim * drop * 0.3;

    // Star blazes during storm
    float star_blaze = focal * mix(1.0, 2.0, drop) * drop * glow_energy;
    col += star_hot * star_blaze * 0.4;
    col += star_white * pow(f_safe, 2.5) * drop * glow_energy * 0.3;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat response — very subtle green flash, only during storm conditions
    if (beat) {
        float beat_strength = ZSCORE_GATE(energyZScore, 0.5) * 0.5;
        col += vec3(0.02, 0.08, 0.04) * focal * beat_strength;
        col *= 1.0 + 0.03 * beat_strength;
    }

    col *= PULSE;

    // Frame feedback — high feedback for ghostly curtain trails
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Vignette — soft, wide for open sky feel
    float vign = 1.0 - pow(length(uv) * 0.55, 1.5);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 1.5), drop);
    col *= max(vign, 0.03);

    // Brightness gating — allow curtains and star to shine, suppress dead zones
    float bright_allowed = max(max(lace, rim * 0.4), max(focal, gem_rim * 0.6));
    col *= mix(0.12, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Final gamma — slight green/teal push for aurora feel
    col = pow(max(col, vec3(0.0)), vec3(0.92, 0.86, 0.9));

    P = vec4(col, drop_state);
}
