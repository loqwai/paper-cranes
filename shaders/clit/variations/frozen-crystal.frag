// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, ice, crystal, frozen, ambient
// Frozen Crystal — Ice/frost interpretation of the clit fractal series
// Lace becomes frost crystal patterns. Gem is a prismatic diamond.
// Nearly frozen — glacial drift with ice-crack reactions on extreme z-scores.
// Based on Dom Mandy's complex power fractal

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — nearly frozen, extreme z-score gated
// ============================================================================

// Fractal power A: glacially slow sine drift (~67s period), audio only on extreme z
#define EXTREME_GATE (smoothstep(0.6, 0.9, abs(spectralCentroidZScore)))
#define A (1.55 + 0.08 * sin(iTime * 0.015) + EXTREME_GATE * spectralCentroidZScore * 0.04)
// #define A 1.55

// Body offset B: barely perceptible drift (~83s period)
#define B (0.55 + 0.03 * sin(iTime * 0.012))
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.0

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very subtle, only on extreme z
#define BASS_EXTREME (smoothstep(0.6, 1.0, abs(bassZScore)))
#define PULSE (1.0 + bassZScore * 0.02 * BASS_EXTREME)
// #define PULSE 1.0

// Feedback — low for crisp crystalline look
#define FEEDBACK_MIX 0.15
// #define FEEDBACK_MIX 0.15

// Rim lighting: subtle icy glow, treble adds faint shimmer only on extremes
#define TREBLE_EXTREME (smoothstep(0.6, 1.0, abs(trebleZScore)))
#define RIM_INTENSITY (0.3 + trebleNormalized * 0.15 * TREBLE_EXTREME)
// #define RIM_INTENSITY 0.35

// Gem brilliance: faint default, spectral crest adds sparkle gated by z-score
#define CREST_EXTREME (smoothstep(0.5, 0.9, abs(spectralCrestZScore)))
#define GEM_BRILLIANCE (0.7 + spectralCrestNormalized * 0.3 * CREST_EXTREME)
// #define GEM_BRILLIANCE 0.8

// Gem dispersion: high for diamond-like prismatic rainbow splits
#define GEM_DISPERSION (0.6 + spectralSpreadNormalized * 0.3)
// #define GEM_DISPERSION 0.75

// Tendril curl: nearly zero — period ~70s, amplitude very small
// Only reacts on extreme z-scores
#define CURL_EXTREME (smoothstep(0.6, 1.0, abs(spectralCentroidZScore)))
#define TENDRIL_CURL (sin(iTime * 0.014) * 0.05 + CURL_EXTREME * spectralCentroidSlope * 0.08)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: similarly glacial
#define CROSS_EXTREME (smoothstep(0.6, 1.0, abs(spectralSpreadZScore)))
#define TENDRIL_CROSS (sin(iTime * 0.011 + 1.7) * 0.04 + CROSS_EXTREME * spectralSpreadSlope * 0.06)
// #define TENDRIL_CROSS 0.0

// Flow drift: almost zero — only on extremes
#define FLOW_X (spectralCentroidSlope * 0.0005 * CURL_EXTREME)
// #define FLOW_X 0.0
#define FLOW_Y (spectralSpreadSlope * 0.0004 * CROSS_EXTREME)
// #define FLOW_Y 0.0

// Drop trigger: multiple z-scores spiking + confident energy drop = drop event
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Drop state ramp/decay speeds — slower decay for sustained cracks
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.005
#define DROP_DECAY_MAX 0.03

// ============================================================================
// ICE CHROMADEPTH — blues and whites near, deep indigo far
// ============================================================================

vec3 iceChromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    // Near (t=0): bright ice white-blue → Far (t=1): deep indigo-black
    vec3 near_col = vec3(0.85, 0.92, 1.0);   // bright ice white
    vec3 mid_col  = vec3(0.3, 0.5, 0.85);    // medium blue
    vec3 far_col  = vec3(0.03, 0.02, 0.12);  // deep indigo-black

    vec3 col;
    if (t < 0.5) {
        col = mix(near_col, mid_col, t * 2.0);
    } else {
        col = mix(mid_col, far_col, (t - 0.5) * 2.0);
    }
    return col;
}

// ============================================================================
// FROST SPARKLE — random glints on lace intersections
// ============================================================================

float frostSparkle(vec2 p, float lace_val, float t) {
    // Hash-based sparkle positions that change very slowly
    float slow_phase = floor(t * 0.08);  // changes every ~12.5 seconds
    vec2 cell = floor(p * 40.0);
    float h = fract(sin(dot(cell + slow_phase, vec2(127.1, 311.7))) * 43758.5453);
    float h2 = fract(sin(dot(cell + slow_phase, vec2(269.5, 183.3))) * 76314.1289);

    // Only sparkle on lace intersections
    float sparkle_threshold = 0.92;  // rare sparkles
    float on_lace = smoothstep(0.3, 0.6, lace_val);
    float sparkle = step(sparkle_threshold, h) * on_lace;

    // Twinkle: each sparkle has its own phase
    float twinkle = pow(max(0.0, sin(t * 0.3 + h2 * 6.283)), 8.0);
    return sparkle * twinkle;
}

// ============================================================================
// ICE CRACK EFFECT — sharp white fracture lines on drop
// ============================================================================

float iceCrack(vec2 p, float drop_val, float lace_val) {
    if (drop_val < 0.01) return 0.0;

    // Generate crack lines from the lace structure
    // Use derivative discontinuities in the fractal as crack seeds
    float crack_seed = lace_val;

    // Sharp threshold for crack lines
    float crack_line = smoothstep(0.45, 0.5, crack_seed) * (1.0 - smoothstep(0.5, 0.55, crack_seed));
    crack_line += smoothstep(0.7, 0.73, crack_seed) * (1.0 - smoothstep(0.73, 0.76, crack_seed));

    // Additional crack pattern from coordinate hash
    vec2 cell = floor(p * 25.0);
    float h = fract(sin(dot(cell, vec2(41.3, 157.9))) * 28473.2945);
    float branch = step(0.7, h) * smoothstep(0.3, 0.35, lace_val);

    float cracks = (crack_line + branch * 0.6) * drop_val;
    return clamp(cracks, 0.0, 1.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Glacial curl — barely moves the crystal structure
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulated proximity for focal gem
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

        // Soft accumulated proximity for gem
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree — high sharpening (power 5.0) for sharp crystal edges
    float lace_lo = -2.0;
    float lace_hi = -5.0;
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 5.0);  // Very sharp crystal edges

    // Fractal structure for ice patterns
    vec4 ice_struct = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) - 1.2), vec4(0.0)));
    float luma = dot(ice_struct.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — diamond gem detection
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Diamond rim — sharp faceted edge
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Gem specular — fractal creates diamond facets
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Internal brilliance — very slow breathing (~9s cycle)
    float gem_pulse = 0.9 + 0.1 * sin(iTime * 0.11);

    // High prismatic dispersion for diamond rainbow
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 1.5 - disp * 0.5),   // red channel — wider dispersion
        pow(f_safe, 2.0),                  // green channel
        pow(f_safe, 1.5 + disp * 0.5)    // blue channel — wider dispersion
    );

    // Diamond depth shading
    float gem_depth_shade = mix(0.5, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // ICE CHROMADEPTH MAPPING
    // ========================================================================

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — ice crack mode, requires turbulence > 5.0
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    // Higher turbulence threshold (5.0) — only extreme audio triggers cracks
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

    depth = mix(depth, depth * 0.8, build * 0.2);
    depth = mix(depth, depth * 1.2, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — ice blue/white frost palette
    // ========================================================================

    // Lace color: white-blue frost crystal
    vec3 frost_lace = vec3(0.8, 0.85, 1.0);
    // Add subtle structure variation from the fractal
    frost_lace += ice_struct.rgb * 0.1 - 0.05;
    frost_lace = clamp(frost_lace, vec3(0.0), vec3(1.0));

    // Background: deep blue-black night sky
    vec3 bg_night = vec3(0.01, 0.015, 0.06);

    // Mix background and frost lace
    vec3 col = mix(bg_night, frost_lace, lace);

    // Filigree highlights — pearly ice white on fine intersections
    vec3 fil_ice = vec3(0.7, 0.75, 0.9);
    col += fil_ice * lace_fine * 0.2;

    // Rim detection — icy blue rims
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    vec3 rim_col = vec3(0.5, 0.7, 1.0);  // icy blue rim

    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // FROST SPARKLE — tiny glints on lace intersections
    // ========================================================================

    vec2 sparkle_uv = gl_FragCoord.xy / iResolution.y;
    float sparkle = frostSparkle(sparkle_uv, lace, iTime);
    col += vec3(0.9, 0.95, 1.0) * sparkle * 0.6;

    // ========================================================================
    // GEM FOCAL — diamond with high prismatic dispersion
    // ========================================================================

    float glow_energy = clamp(energyNormalized + energyZScore * 0.15 * smoothstep(0.5, 0.9, abs(energyZScore)), 0.0, 1.0);

    // Diamond base: clear/white with subtle blue tint
    vec3 gem_base = vec3(0.85, 0.9, 1.0);
    // Diamond fire: rainbow refraction colors
    vec3 gem_fire = vec3(1.0, 0.95, 0.85);
    vec3 gem_white = vec3(1.0, 0.98, 1.0);

    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    // Rainbow refraction inside diamond — high dispersion creates strong color splits
    float refract_angle = atan(Z.y, Z.x) * 3.0 + iTime * 0.02;
    vec3 rainbow_refract = vec3(
        0.5 + 0.5 * sin(refract_angle),
        0.5 + 0.5 * sin(refract_angle + 2.094),
        0.5 + 0.5 * sin(refract_angle + 4.189)
    );
    gem_interior += rainbow_refract * focal * 0.15 * GEM_BRILLIANCE;

    float sparkle_str = mix(0.3, 0.8, glow_energy);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Diamond rim — prismatic edge light
    vec3 rim_prism = vec3(
        0.6 + 0.4 * sin(refract_angle * 2.0),
        0.6 + 0.4 * sin(refract_angle * 2.0 + 2.094),
        0.6 + 0.4 * sin(refract_angle * 2.0 + 4.189)
    );
    vec3 gem_rim_light = rim_prism * gem_rim * GEM_BRILLIANCE * 0.8;

    float gem_energy_boost = mix(0.8, 1.1, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.85);

    // Subtle outer diamond glow — cool white
    float glow_str = mix(0.04, 0.12, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += vec3(0.7, 0.8, 1.0) * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // ICE CRACK MODE — bright white fracture lines on drop
    // ========================================================================

    float bg_dim = mix(1.0, 0.4, drop);
    float focal_boost = mix(1.0, 2.0, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Ice crack lines — sharp white light shining through fractures
    vec2 crack_uv = gl_FragCoord.xy / iResolution.y;
    float cracks = iceCrack(crack_uv, drop, lace);
    vec3 crack_light = vec3(0.95, 0.97, 1.0);  // bright white crack light
    col += crack_light * cracks * 1.5;

    // Bright rim on cracks — icy blue edge glow intensifies
    col += vec3(0.4, 0.6, 1.0) * rim * drop * 0.3;

    // Diamond blazes brighter during drop
    float blaze = focal * focal_boost * drop * glow_energy;
    col += gem_fire * blaze * 0.3;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.3;
    col += gem_prism * vec3(0.5, 0.7, 1.0) * gem_rim * drop * 0.2;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat response — very subtle icy flash, only on extreme z
    if (beat) {
        float beat_gate = smoothstep(0.5, 0.8, abs(energyZScore));
        col += vec3(0.05, 0.07, 0.12) * focal * beat_gate;
        col *= 1.0 + 0.02 * beat_gate;
    }

    col *= PULSE;

    // Low feedback for crisp crystalline clarity
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.97, FEEDBACK_MIX);

    // Vignette — subtle dark edges like peering through ice
    float vign = 1.0 - pow(length(uv) * 0.6, 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 1.5), drop);
    col *= max(vign, 0.02);

    // Brightness gating — dark background, bright frost and gem
    float bright_allowed = max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7));
    bright_allowed = max(bright_allowed, cracks * drop);  // cracks shine through
    col *= mix(0.12, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Final color grade — push toward cool blue
    col = pow(max(col, vec3(0.0)), vec3(0.95, 0.92, 0.88));

    P = vec4(col, drop_state);
}
