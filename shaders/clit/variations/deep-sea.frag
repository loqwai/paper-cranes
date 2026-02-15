// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, bioluminescent, deep-sea, ambient
// Deep Sea — Bioluminescent deep ocean creature
// Variation of clit/3 complex power fractal
// Slow dreamy undulation, fast reactions ONLY on extreme z-scores (abs > 0.6)
// Lace glows cyan/turquoise/green on deep navy-black, gem is jellyfish organ
//
//https://visuals.beadfamous.com/?shader=clit/variations/deep-sea&name=Abyss%20Jelly&wing_speed=0.2&glow_hue=0.55&warmth=0.1&lace_density=0.4&wing_span=0.3&trail_amount=0.8&complexity=0.4&vignette_size=0.6
//https://visuals.beadfamous.com/?shader=clit/variations/deep-sea&name=Phosphor%20Drift&wing_speed=0.1&glow_hue=0.45&warmth=0.2&lace_density=0.6&wing_span=0.5&trail_amount=0.9&complexity=0.5&vignette_size=0.5
//https://visuals.beadfamous.com/?shader=clit/variations/deep-sea&name=Hadal%20Bloom&wing_speed=0.4&glow_hue=0.35&warmth=0.3&lace_density=0.7&wing_span=0.6&trail_amount=0.7&complexity=0.7&vignette_size=0.4
//https://visuals.beadfamous.com/?shader=clit/variations/deep-sea&name=Lantern%20Ghost&wing_speed=0.05&glow_hue=0.6&warmth=0.05&lace_density=0.3&wing_span=0.2&trail_amount=0.95&complexity=0.3&vignette_size=0.7

// ============================================================================
// CREATURE TRAITS — independent URL params that make each instance unique
// Like pokemon stats: same species, different individual
// Usage: ?shader=clit/variations/deep-sea&wing_speed=0.2&glow_hue=0.55
// All default to 0.5 (neutral). Range 0.0-1.0.
// ============================================================================

// Current speed — lazy drifter (0) vs active swimmer (1)
// #define WING_SPEED wing_speed
#define WING_SPEED 0.3
// #define WING_SPEED knob_71

// Tendril span — tight subtle pulse (0) vs dramatic tentacle sweep (1)
// #define WING_SPAN wing_span
#define WING_SPAN 0.4
// #define WING_SPAN knob_72

// Bioluminescent hue — cyan(0.4) → turquoise(0.5) → blue(0.6) → green(0.3)
// #define GLOW_HUE glow_hue
#define GLOW_HUE 0.55
// #define GLOW_HUE knob_73

// Lace density — sparse gossamer threads (0) vs dense neural web (1)
// #define LACE_DENSITY lace_density
#define LACE_DENSITY 0.5
// #define LACE_DENSITY knob_74

// Vignette depth — wide open water (0) vs deep tunnel vision (1)
// #define VIGNETTE_SIZE vignette_size
#define VIGNETTE_SIZE 0.65
// #define VIGNETTE_SIZE knob_75

// Feedback/trails — crisp bioluminescence (0) vs deep ghosting (1)
// #define TRAIL_AMOUNT trail_amount
#define TRAIL_AMOUNT 0.7
// #define TRAIL_AMOUNT knob_76

// Water temperature — frigid deep blue (0) vs warmer green-cyan (1)
// #define WARMTH warmth
#define WARMTH 0.2
// #define WARMTH knob_77

// Fractal complexity — simple smooth jellyfish (0) vs intricate coral detail (1)
// #define COMPLEXITY complexity
#define COMPLEXITY 0.5
// #define COMPLEXITY knob_78

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// Deep sea mandate: slow undulation by default, fast only on abs(zScore) > 0.6
// ============================================================================

// Shape complexity: A oscillates SLOWLY, audio gated by extreme z-scores only
#define A_BASE (1.5 + 0.15 * sin(iTime * 0.02) + (COMPLEXITY - 0.5) * 0.3)
#define A_AUDIO_GATE step(0.6, abs(spectralCentroidZScore))
#define A (A_BASE + spectralCentroidZScore * 0.12 * A_AUDIO_GATE)
// #define A 1.5

// Body offset: drifts on ocean current, NOT audio-reactive by default
#define B (0.55 + 0.06 * sin(iTime * 0.018 + 2.0))
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very subtle, deep pressure wave
#define PULSE (1.0 + bassZScore * 0.03 * step(0.6, abs(bassZScore)))
// #define PULSE 1.0

// Feedback — high base for underwater trailing/ghosting (0.45 base)
#define FEEDBACK_MIX (mapValue(TRAIL_AMOUNT, 0.0, 1.0, 0.3, 0.6) + energyNormalized * 0.05)
// #define FEEDBACK_MIX 0.45

// Rim lighting: soft cyan glow, treble adds subtle shimmer
#define RIM_INTENSITY (0.3 + trebleNormalized * 0.3 * step(0.6, abs(trebleZScore)))
// #define RIM_INTENSITY 0.4

// Rim color: always cool cyan, warmth shifts slightly toward green
#define RIM_WARMTH (mapValue(WARMTH, 0.0, 1.0, 0.0, 0.3))
// #define RIM_WARMTH 0.1

// Gem brilliance: jellyfish organ pulses on slow 12-second cycle
#define GEM_BRILLIANCE (0.7 + 0.3 * sin(iTime * 0.5236) + spectralCrestNormalized * 0.2 * step(0.6, abs(spectralCrestZScore)))
// #define GEM_BRILLIANCE 0.9

// Gem dispersion: bioluminescent color separation
#define GEM_DISPERSION (0.4 + spectralSpreadNormalized * 0.2 * step(0.6, abs(spectralSpreadZScore)))
// #define GEM_DISPERSION 0.5

// Tendril curl: VERY slow (period ~40s), fast tentacle-whip only on extreme z-scores
#define FLAP_RATE mapValue(WING_SPEED, 0.0, 1.0, 0.025, 0.16)
#define FLAP_AMP mapValue(WING_SPAN, 0.0, 1.0, 0.1, 0.6)
#define TENTACLE_WHIP (spectralCentroidSlope * 0.5 * step(0.6, abs(spectralCentroidZScore)))
#define TENDRIL_CURL (sin(iTime * FLAP_RATE) * FLAP_AMP + sin(iTime * FLAP_RATE * 0.37) * FLAP_AMP * 0.4 + TENTACLE_WHIP)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: slow independent drift axis
#define CROSS_WHIP (spectralSpreadSlope * 0.3 * step(0.6, abs(spectralSpreadZScore)))
#define TENDRIL_CROSS (sin(iTime * FLAP_RATE * 0.53) * FLAP_AMP * 0.5 + sin(iTime * FLAP_RATE * 0.29 + 1.5) * FLAP_AMP * 0.3 + CROSS_WHIP)
// #define TENDRIL_CROSS 0.0

// Flow drift: slow current, not audio-driven
#define FLOW_X (sin(iTime * 0.01) * 0.001)
// #define FLOW_X 0.0
#define FLOW_Y (cos(iTime * 0.013) * 0.0008)
// #define FLOW_Y 0.0

// Drop trigger: higher threshold (4.5) for bioluminescent flash
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

// Drop state ramp/decay — slow ramp, very slow decay for underwater feel
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.005
#define DROP_DECAY_MAX 0.03

// ============================================================================
// BIOLUMINESCENT CHROMADEPTH — cyan closest, deep navy farthest
// ============================================================================

vec3 bioluminescent_depth(float t) {
    // t=0 is closest (bright cyan-white), t=1 is farthest (deep navy-black)
    t = clamp(t, 0.0, 1.0);

    // Hue: cyan (0.5) at close, deep blue (0.65) at far
    float hue = mix(0.50, 0.65, t);

    // Luminance: bright at close, very dark at far
    float L = mix(0.75, 0.12, t);

    // Chroma: vivid at mid-range, desaturated at extremes
    float chromaPeak = sin(t * 3.14159);
    float C = 0.2 * (0.3 + 0.7 * chromaPeak) * (1.0 - t * 0.4);

    float h = hue * 6.28318;
    vec3 lab = vec3(L, C * cos(h), C * sin(h));
    return clamp(oklab2rgb(lab), 0.0, 1.0);
}

vec3 deepSeaChromadepth(float depth, float warmth) {
    vec3 bio = bioluminescent_depth(depth);
    // Warmth shifts from pure cold blue toward green-cyan
    vec3 warm_tint = mix(
        vec3(0.05, 0.15, 0.3),   // cold: deep blue
        vec3(0.02, 0.08, 0.04),  // far warm: dark green-black
        depth
    );
    vec3 warm_close = mix(
        vec3(0.3, 0.9, 0.95),   // cold close: cyan
        vec3(0.2, 0.95, 0.6),   // warm close: green-cyan
        warmth
    );
    warm_tint = mix(warm_close, warm_tint, depth);
    return mix(bio, warm_tint, warmth * 0.4);
}

// ============================================================================
// CAUSTIC PATTERN — underwater light refraction
// ============================================================================

float caustic(vec2 p, float t) {
    float c1 = abs(sin(p.x * 8.0 + t * 0.05) * sin(p.y * 8.0 + t * 0.07));
    float c2 = abs(sin(p.x * 5.0 - t * 0.03 + 1.7) * sin(p.y * 6.0 + t * 0.04 + 0.9));
    float c3 = abs(sin(p.x * 12.0 + t * 0.02 + 3.1) * sin(p.y * 11.0 - t * 0.025 + 2.3));
    return (c1 * 0.5 + c2 * 0.35 + c3 * 0.15);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Slow lateral drift — whole UV sways like ocean current
    C += vec2(sin(iTime * 0.012) * 0.03, cos(iTime * 0.015) * 0.02);

    // Time-driven curl — slow tentacle drift
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulated proximity for soft focal
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

        // Soft accumulated proximity for focal detection
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree lines — bioluminescent neural web
    float lace_lo = mapValue(LACE_DENSITY, 0.0, 1.0, -1.5, -2.5);
    float lace_hi = mapValue(LACE_DENSITY, 0.0, 1.0, -4.5, -5.5);
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    float lace_sharp = mapValue(LACE_DENSITY, 0.0, 1.0, 2.0, 4.0);
    lace = pow(max(lace, 0.0), lace_sharp);

    // Fractal structure for color — phase shifted toward cool/bioluminescent
    float color_phase = 2.5 + (WARMTH - 0.5) * 0.8;
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT detection — jellyfish organ
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Gem rim — soft organic edge, jellyfish bell rim
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Gem specular — internal structure highlights
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Internal brilliance — slow 12-second jellyfish throb
    float gem_pulse = 0.8 + 0.2 * sin(iTime * 0.5236);

    // Prismatic dispersion — bioluminescent color separation
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 2.0 + disp * 0.3),    // red pushed deeper (less red)
        pow(f_safe, 1.6),                   // green prominent
        pow(f_safe, 1.4 - disp * 0.3)      // blue closest (bioluminescent)
    );

    // Gem depth shading
    float gem_depth_shade = mix(0.4, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // CHROMADEPTH MAPPING — bioluminescent palette
    // ========================================================================

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — bioluminescent flash on extreme turbulence (>4.5)
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    // Higher threshold: 4.5 instead of 2.0-4.0
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

    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — bioluminescent lace on deep ocean black
    // ========================================================================

    // Remap rainbow to bioluminescent palette: cyan/turquoise/green
    vec3 bio_lace = vec3(
        rainbow.b * 0.3,                                    // suppress red
        rainbow.g * 0.7 + rainbow.b * 0.3,                 // boost green-cyan
        rainbow.b * 0.9 + rainbow.g * 0.2                  // boost blue
    );
    // Add slow bioluminescent pulse to lace
    float bio_pulse = 0.85 + 0.15 * sin(iTime * 0.08 + luma * 3.0);
    bio_lace *= bio_pulse;

    // Background: deep ocean black
    vec3 bg_cold = vec3(0.01, 0.02, 0.05);
    vec3 bg_warm = vec3(0.01, 0.04, 0.03);
    vec3 bg_deep = mix(bg_cold, bg_warm, WARMTH);

    vec3 col = mix(bg_deep, bio_lace, lace);

    // Filigree highlights — pale cyan-white bioluminescent threads
    vec3 fil_cold = vec3(0.3, 0.7, 0.8);
    vec3 fil_warm = vec3(0.2, 0.8, 0.5);
    col += mix(fil_cold, fil_warm, WARMTH) * lace_fine * 0.2;

    // Rim detection — soft cyan glow instead of violet/pink
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y - cos(iTime * 0.015) * 0.02));
    rim *= center_fade;
    vec3 rim_cold = vec3(0.1, 0.5, 0.7);    // soft cyan
    vec3 rim_warm_col = vec3(0.1, 0.7, 0.4); // soft green-cyan
    vec3 rim_col = mix(rim_cold, rim_warm_col, RIM_WARMTH);

    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // CAUSTIC OVERLAY — underwater light refraction
    // ========================================================================

    vec2 caustic_uv = (gl_FragCoord.xy / iResolution.xy) * 2.0 - 1.0;
    caustic_uv.x *= iResolution.x / iResolution.y;
    float caustic_val = caustic(caustic_uv, iTime) * 0.12;
    // Caustics only visible on the lace/structure, not background
    float caustic_mask = lace * 0.7 + rim * 0.3;
    vec3 caustic_col = vec3(0.15, 0.5, 0.6) * caustic_val * caustic_mask;
    col += caustic_col;

    // ========================================================================
    // GEM FOCAL — bioluminescent jellyfish organ
    // ========================================================================

    float glow_energy = clamp(energyNormalized + energyZScore * 0.15, 0.0, 1.0);

    // Gem base color — bioluminescent blue-white, glow_hue shifts cyan-green-blue
    float gem_h = GLOW_HUE * 6.2832;
    vec3 gem_base = vec3(
        0.15 + 0.15 * cos(gem_h + 4.189),   // minimal red
        0.4 + 0.3 * cos(gem_h + 2.094),      // green-cyan
        0.5 + 0.3 * cos(gem_h)               // blue dominant
    );
    gem_base = max(gem_base, vec3(0.02));

    // Bioluminescent flash color (for drops)
    vec3 gem_flash = vec3(0.6, 0.9, 1.0);    // bright white-blue

    // Jellyfish organ pulse color
    vec3 gem_white = vec3(0.7, 0.95, 1.0);   // cool white-blue

    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    float sparkle_str = mix(0.3, 0.7, glow_energy);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Rim glow: cyan inner, deep blue outer
    vec3 rim_inner = vec3(0.3, 0.9, 1.0);    // bright cyan
    vec3 rim_outer = vec3(0.1, 0.3, 0.8);    // deep blue
    vec3 gem_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.7, 1.1, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.85);

    // Outer glow — soft bioluminescent halo
    float glow_str = mix(0.06, 0.18, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += gem_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // DROP MODE — bioluminescent FLASH (all lace goes bright white-blue)
    // ========================================================================

    float bg_dim = mix(1.0, 0.3, drop);
    float focal_boost = mix(1.0, 2.0, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Bioluminescent flash: lace and rim go bright white-cyan
    vec3 flash_col = vec3(0.5, 0.85, 1.0);
    col += flash_col * lace * drop * 0.6;
    col += flash_col * rim * drop * 0.3;

    // Gem blazes with bioluminescent flash
    float blaze = focal * focal_boost * drop * glow_energy;
    col += gem_flash * blaze * 0.5;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.4;
    col += gem_prism * vec3(0.2, 0.7, 1.0) * gem_rim * drop * 0.3;

    // Caustics intensify during drop
    col += vec3(0.1, 0.3, 0.4) * caustic_val * drop * 0.4;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat: very subtle deep pressure, only on beat
    if (beat) {
        col += vec3(0.02, 0.06, 0.08) * focal;
        col *= 1.02;
    }

    col *= PULSE;

    // High feedback for underwater trailing/ghosting
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Deep vignette — looking through dark water
    float vign_power = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 1.8, 3.5);
    float vign_scale = mapValue(VIGNETTE_SIZE, 0.0, 1.0, 0.55, 0.95);
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 1.5), drop);
    col *= max(vign, 0.01);

    // Brightness gating: only lace/rim/focal structures allowed to be bright
    float bright_allowed = max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7));
    col *= mix(0.08, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.6));

    // Final color grade — push toward blue-cyan
    col = pow(max(col, vec3(0.0)), vec3(1.05, 0.92, 0.88));

    P = vec4(col, drop_state);
}
