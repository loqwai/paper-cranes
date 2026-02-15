// @fullscreen: true
// @mobile: true
// @tags: eclipse, solar, corona, clit-variation, slow
// Eclipse — Solar eclipse cycle variation of the clit fractal series
// Slow 30-second eclipse cycle: full sun washes everything white-hot,
// totality reveals blazing corona (lace filigree). Gem = sun being eclipsed.
// Colors: white-hot center, red-orange corona, deep space black background.
// Solar flare eruption on extreme z-scores (turbulence > 4.0).
// Based on Dom Mandy's complex power fractal
//
//https://visuals.beadfamous.com/?shader=clit/variations/eclipse

// ============================================================================
// ECLIPSE CYCLE — the core slow modulation driving everything
// 0 = totality (corona blazes, sun hidden), 1 = full sun (everything washes white)
// ============================================================================

#define ECLIPSE_PHASE (0.5 + 0.5 * cos(iTime * 0.2094))

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — gated by z-score threshold (abs > 0.6)
// Default = SLOW eclipse cycle. Fast reactions ONLY on very abnormal z-scores.
// ============================================================================

// Z-score gate: returns 0 when normal, ramps up only past threshold
#define ZSCORE_GATE(zs, thresh) clamp((abs(zs) - thresh) / (1.0 - thresh), 0.0, 1.0)

// Shape complexity: slow corona shift (period ~50s), audio only on extremes
#define A_BASE (1.5 + 0.15 * sin(iTime * 0.02))
#define A_AUDIO (ZSCORE_GATE(spectralCentroidZScore, 0.6) * sign(spectralCentroidZScore) * 0.1)
#define A (A_BASE + A_AUDIO)
// #define A 1.5

// Body offset: shifts subtly with eclipse phase
#define B_BASE (0.55 + ECLIPSE_PHASE * 0.05)
#define B_AUDIO (ZSCORE_GATE(energyZScore, 0.6) * energyZScore * 0.06)
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

// Feedback — moderate (0.3) for corona streaming trails
#define FEEDBACK_MIX (0.3 + ZSCORE_GATE(energyZScore, 0.6) * 0.08)
// #define FEEDBACK_MIX 0.3

// Rim lighting: corona edge glow — brighter near totality, dimmer at full sun
#define RIM_BASE (mix(0.6, 0.15, ECLIPSE_PHASE))
#define RIM_INTENSITY (RIM_BASE + ZSCORE_GATE(trebleZScore, 0.6) * 0.4)
// #define RIM_INTENSITY 0.5

// Gem brilliance: INVERSELY tied to eclipse — dim at totality, bright at full sun
#define GEM_BRILLIANCE_BASE (mix(0.3, 1.4, ECLIPSE_PHASE))
#define GEM_BRILLIANCE (GEM_BRILLIANCE_BASE + ZSCORE_GATE(spectralCrestZScore, 0.6) * 0.3)
// #define GEM_BRILLIANCE 1.0

// Gem dispersion: tight at full sun (whiteout), prismatic near totality
#define GEM_DISPERSION (mix(0.5, 0.15, ECLIPSE_PHASE) + ZSCORE_GATE(spectralSpreadZScore, 0.6) * 0.2)
// #define GEM_DISPERSION 0.3

// Tendril curl: slow solar wind (period ~35s), flare jitter on extreme z-scores
#define SOLAR_WIND_RATE 0.18
#define SOLAR_WIND_AMP 0.3
#define FLARE_JITTER (ZSCORE_GATE(spectralFluxZScore, 0.6) * spectralFluxZScore * 0.5)
#define TENDRIL_CURL (sin(iTime * SOLAR_WIND_RATE) * SOLAR_WIND_AMP + sin(iTime * SOLAR_WIND_RATE * 0.57) * SOLAR_WIND_AMP * 0.45 + FLARE_JITTER)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent slow drift
#define TENDRIL_CROSS (sin(iTime * SOLAR_WIND_RATE * 0.77) * SOLAR_WIND_AMP * 0.6 + sin(iTime * SOLAR_WIND_RATE * 0.43 + 1.0) * SOLAR_WIND_AMP * 0.35 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadZScore * 0.2)
// #define TENDRIL_CROSS 0.0

// Flow drift: slow solar wind streaming
#define FLOW_X (sin(iTime * 0.015) * 0.001 + ZSCORE_GATE(spectralCentroidZScore, 0.6) * spectralCentroidSlope * 0.002)
// #define FLOW_X 0.0
#define FLOW_Y (cos(iTime * 0.012) * 0.0008 + ZSCORE_GATE(spectralSpreadZScore, 0.6) * spectralSpreadSlope * 0.001)
// #define FLOW_Y 0.0

// Drop trigger: multiple z-scores spiking = solar flare
// Requires turbulence > 4.0 for flare event
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Drop state ramp/decay — slow ramp, slow decay for sustained flare
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.006
#define DROP_DECAY_MAX 0.035

// Flare requires very high turbulence
#define FLARE_THRESHOLD 4.0

// ============================================================================
// SOLAR PALETTE — white-hot center, red-orange corona, deep space
// ============================================================================

vec3 coronaPalette(float t) {
    // t=0: white-hot core, t=0.3: yellow-orange, t=0.6: deep red, t=1.0: space black
    t = clamp(t, 0.0, 1.0);

    // Perceptually smooth solar transitions via oklab
    vec3 col;
    if (t < 0.2) {
        // White-hot to bright yellow
        float s = t / 0.2;
        float L = mix(0.97, 0.85, s);
        float C = mix(0.03, 0.15, s);
        float h = mix(1.3, 1.1, s);
        col = clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    } else if (t < 0.45) {
        // Bright yellow to orange
        float s = (t - 0.2) / 0.25;
        float L = mix(0.85, 0.65, s);
        float C = mix(0.15, 0.22, s);
        float h = mix(1.1, 0.8, s);
        col = clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    } else if (t < 0.7) {
        // Orange to deep red
        float s = (t - 0.45) / 0.25;
        float L = mix(0.65, 0.3, s);
        float C = mix(0.22, 0.16, s);
        float h = mix(0.8, 0.5, s);
        col = clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    } else {
        // Deep red to space black
        float s = (t - 0.7) / 0.3;
        float L = mix(0.3, 0.02, s);
        float C = mix(0.16, 0.01, s);
        float h = mix(0.5, 0.4, s);
        col = clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
    }
    return col;
}

// Corona emission color for lace filigree
vec3 coronaEmission(float intensity, float phase) {
    // phase allows slow color drift in the corona
    float h = 0.06 + phase * 0.04; // orange-red hue range
    float L = mix(0.2, 0.8, intensity);
    float C = mix(0.05, 0.2, intensity);
    return clamp(oklab2rgb(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    float eclipse = ECLIPSE_PHASE;

    // Time-driven curl — slow solar wind drift
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulated proximity for sun/gem focal point
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

        // Soft accumulated proximity for sun focal point
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
    // LACE = CORONA STREAMERS
    // Visible during totality, washed out during full sun
    // ========================================================================

    float lace_lo = -1.8;
    float lace_hi = -5.0;
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 2.0);

    // Corona visibility: blazes during totality, invisible during full sun
    // eclipse < 0.3 = totality: corona visible
    // eclipse > 0.7 = full sun: corona washed out
    float corona_visibility = smoothstep(0.7, 0.15, eclipse);

    // Fractal structure for angular variation
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — the sun being eclipsed
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Sun rim — bright ring (most visible during partial eclipse)
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Sun surface detail from fractal
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Solar pulse — very slow breathing
    float sun_pulse = 0.9 + 0.1 * sin(iTime * 0.25);

    // Prismatic dispersion
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 sun_prism = vec3(
        pow(f_safe, 1.8 - disp * 0.3),
        pow(f_safe, 2.0),
        pow(f_safe, 1.8 + disp * 0.3)
    );

    float sun_depth_shade = mix(0.5, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // DEPTH MAPPING — solar distance scale
    // ========================================================================

    float base_depth = mix(0.5, 0.95, 1.0 - luma);
    float detail_depth = mix(0.15, 0.45, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — SOLAR FLARE: requires turbulence > 4.0
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    float drop_signal = clamp(drop_trigger * smoothstep(FLARE_THRESHOLD - 1.0, FLARE_THRESHOLD + 1.0, turbulence), 0.0, 1.0);

    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float prev_drop_state = getLastFrameColor(state_uv).a;

    float settled = AUDIO_SETTLED;
    float decay_rate = mix(DROP_DECAY_MIN, DROP_DECAY_MAX, settled);

    float drop_state = prev_drop_state;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, decay_rate);
    drop_state = clamp(drop_state, 0.0, 1.0);

    float drop = animateEaseInOutCubic(drop_state);

    // Flare modifies depth
    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // COLOR — Solar eclipse palette
    // ========================================================================

    // Corona color from depth — red/orange corona streamers
    float corona_phase = sin(iTime * 0.012) * 0.5;
    vec3 corona_col = coronaPalette(depth);

    // Mix in angular variation for streamer structure
    float angle_var = atan(Z.y, Z.x) * 0.15915;
    corona_col = mix(corona_col, coronaPalette(fract(depth + angle_var * 0.25)), 0.25);

    // Deep space background — true black
    vec3 bg_space = vec3(0.003, 0.003, 0.008);

    // Corona streamers visible during totality, hidden during full sun
    float effective_lace = lace * corona_visibility;
    vec3 col = mix(bg_space, corona_col, effective_lace);

    // Corona filigree highlights — orange-white wisps at fine intersections
    vec3 fil_corona = coronaEmission(0.8, corona_phase);
    col += fil_corona * lace_fine * 0.2 * corona_visibility;

    // Rim detection — corona edges glow
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    // Corona rim emission — red-orange, brighter during totality
    vec3 rim_col = coronaEmission(0.6, corona_phase);
    col += rim_col * rim * RIM_INTENSITY * 0.3 * corona_visibility;

    // ========================================================================
    // ECLIPSE WASH — full sun washes everything toward white
    // At full sun (eclipse > 0.7), everything brightens and desaturates
    // ========================================================================

    // Full sun wash: blend everything toward white-hot
    float sun_wash = smoothstep(0.5, 0.95, eclipse);
    vec3 white_hot = vec3(1.0, 0.97, 0.9);

    // The wash affects non-focal areas (corona gets bleached by sunlight)
    col = mix(col, white_hot * 0.15, sun_wash * (1.0 - focal) * 0.7);

    // Overall scene brightness follows eclipse cycle
    // Bright at full sun, dark at totality (except corona)
    float scene_brightness = mix(0.25, 1.0, eclipse);
    // But corona regions resist dimming during totality
    float corona_resist = effective_lace * corona_visibility;
    float local_brightness = mix(scene_brightness, max(scene_brightness, 0.8), corona_resist);
    col *= local_brightness;

    // ========================================================================
    // SUN FOCAL — white-hot solar disc
    // Bright during full sun, eclipsed (dim) during totality
    // ========================================================================

    float glow_energy = clamp(0.5 + ZSCORE_GATE(energyZScore, 0.6) * energyZScore * 0.3, 0.0, 1.0);

    // Sun base colors — white-hot to yellow-orange
    vec3 sun_base = vec3(1.0, 0.95, 0.8);
    vec3 sun_fire = vec3(1.0, 0.7, 0.25);
    vec3 sun_white = vec3(1.0, 0.99, 0.95);

    vec3 sun_interior = sun_prism * sun_base * sun_pulse * sun_depth_shade;

    float sparkle_str = mix(0.4, 0.9, glow_energy);
    vec3 sun_specular = sun_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Sun rim — yellow-white to orange
    vec3 rim_inner = vec3(1.0, 0.95, 0.7);
    vec3 rim_outer = vec3(0.9, 0.5, 0.15);
    vec3 sun_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 sun_rim_light = sun_rim_col * gem_rim * GEM_BRILLIANCE;

    float sun_energy_boost = mix(0.8, 1.2, glow_energy);
    vec3 sun_col = sun_interior * GEM_BRILLIANCE * sun_energy_boost
                 + sun_specular
                 + sun_rim_light;

    // Sun gem brightness follows eclipse inversely: bright at full sun, dim at totality
    col = mix(col, sun_col, focal * 0.85);

    // Outer sun glow — diffuse halo, strongest at full sun
    float glow_str = mix(0.04, 0.2, glow_energy) * mix(0.2, 1.0, eclipse);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += sun_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // Diamond ring effect: during partial eclipse (0.2 < eclipse < 0.5),
    // the gem rim gets an extra brilliant white spike
    float diamond_ring = smoothstep(0.15, 0.3, eclipse) * smoothstep(0.55, 0.35, eclipse);
    col += sun_white * gem_rim * diamond_ring * 1.5;

    // ========================================================================
    // SOLAR FLARE (drop mode) — eruption arc from corona
    // ========================================================================

    // Flare arc: bright eruption sweeping outward
    float flare_radius = drop * 1.2;
    float flare_dist = abs(length(uv) - flare_radius);
    float flare_width = 0.03 + drop * 0.08;
    float flare_arc = smoothstep(flare_width, 0.0, flare_dist) * drop;

    // Angular selection: flare erupts from one side (not a full ring)
    float flare_angle = atan(uv.y, uv.x);
    float flare_dir = sin(iTime * 0.07) * 3.14159; // slowly rotating flare direction
    float flare_spread = smoothstep(1.5, 0.0, abs(flare_angle - flare_dir));
    flare_arc *= flare_spread;

    // Central flash — brilliant white bloom at flare origin
    float central_flash = exp(-length(uv) * 6.0) * drop * drop * 0.6;

    // Flare colors: white-hot to orange
    vec3 flare_col = mix(sun_fire, sun_white, 0.5 + 0.5 * drop);
    col += flare_col * flare_arc * 0.9;
    col += sun_white * central_flash * 1.5;

    // During flare, corona blazes brighter regardless of eclipse phase
    col += corona_col * lace * drop * 0.4;

    // Flare rims go incandescent
    vec3 flare_rim = vec3(1.0, 0.8, 0.3);
    col += flare_rim * rim * drop * 0.3;

    // Sun blazes on flare
    float blaze = focal * mix(1.0, 2.0, drop) * drop * glow_energy;
    col += sun_fire * blaze * 0.4;
    col += sun_white * pow(f_safe, 2.5) * drop * glow_energy * 0.3;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat response — very subtle solar pulse, only during extreme conditions
    if (beat) {
        float beat_strength = ZSCORE_GATE(energyZScore, 0.5) * 0.5;
        col += vec3(0.06, 0.03, 0.01) * focal * beat_strength;
        col *= 1.0 + 0.02 * beat_strength;
    }

    col *= PULSE;

    // Frame feedback — moderate for corona streaming
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.96, FEEDBACK_MIX);

    // Vignette — VERY DEEP during totality (spotlight on corona), wide at full sun
    float vign_power = mix(3.0, 1.3, eclipse); // tighter at totality
    float vign_scale = mix(0.9, 0.5, eclipse); // narrower at totality
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    // Drop (flare) tightens vignette further for dramatic spotlight
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Brightness gating — corona, rim, and sun focal allowed to be bright
    float bright_allowed = max(max(effective_lace, rim * 0.4 * corona_visibility), max(focal, gem_rim * 0.6));
    // During full sun, allow more general brightness (wash effect)
    float gate_floor = mix(0.08, 0.35, sun_wash);
    col *= mix(gate_floor, 1.0, bright_allowed);

    // Tone mapping — solar warmth
    col = col / (col + vec3(0.65));

    // Final gamma — warm solar bias (reds/oranges slightly boosted)
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.92, 0.98));

    P = vec4(col, drop_state);
}
