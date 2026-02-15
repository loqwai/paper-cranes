// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, heartbeat, crimson
// Heartbeat — Complex power fractal that pulses like a living heart
// Lub-dub rhythm at ~60 BPM. Deep crimson palette. Lace = veins/arteries.
// On extreme z-scores (>0.6), the heart races — beat doubles, intensity spikes.
// Based on the clit shader series (Dom Mandy's complex power fractal)

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Z-score turbulence — sum of absolute z-scores across frequency domains
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 3.0

// Heart rate multiplier — races on extreme z-scores
// Normal: 0.5 Hz (60 BPM). Extreme: 1.0 Hz (120 BPM)
#define HEART_RATE_MULT (0.5 + step(0.6, ZSCORE_TURBULENCE / 5.0) * 0.5)
// #define HEART_RATE_MULT 0.5

// Heartbeat phase — drives the lub-dub pattern
#define HB_PHASE (iTime * 3.14159 * HEART_RATE_MULT)

// Heartbeat function — lub-dub: sharp primary beat + softer secondary beat
#define HEARTBEAT (pow(max(sin(HB_PHASE), 0.0), 12.0) + 0.3 * pow(max(sin(HB_PHASE + 0.3), 0.0), 8.0))
// #define HEARTBEAT 0.0

// Shape complexity: heartbeat pulses the fractal power
#define A (1.5 + HEARTBEAT * 0.15)
// #define A 1.5

// Body offset: heartbeat contracts the form
#define B (0.55 + HEARTBEAT * 0.08)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — subtle, heartbeat dominates
#define PULSE (1.0 + bassZScore * 0.03 + HEARTBEAT * 0.06)
// #define PULSE 1.0

// Feedback — moderate for pulse trails
#define FEEDBACK_MIX (0.3 + energyNormalized * 0.05)
// #define FEEDBACK_MIX 0.3

// Rim lighting: treble adds to the warm red-pink rim
#define RIM_INTENSITY (0.4 + trebleNormalized * 0.4 + HEARTBEAT * 0.2)
// #define RIM_INTENSITY 0.7

// Gem brilliance: heartbeat drives the crimson gem glow
#define GEM_BRILLIANCE (0.7 + HEARTBEAT * 0.5 + spectralCrestNormalized * 0.3)
// #define GEM_BRILLIANCE 1.0

// Gem dispersion: subtle prismatic separation
#define GEM_DISPERSION (0.2 + spectralSpreadNormalized * 0.3)
// #define GEM_DISPERSION 0.3

// Tendril curl: slow organic pulse, not wing-flap
#define TENDRIL_CURL (sin(iTime * 0.15) * 0.3 + HEARTBEAT * 0.15 + spectralCentroidSlope * 0.2)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: secondary organic motion
#define TENDRIL_CROSS (sin(iTime * 0.11 + 1.0) * 0.25 + HEARTBEAT * 0.1 + spectralSpreadSlope * 0.15)
// #define TENDRIL_CROSS 0.0

// Flow drift: subtle outward pulse with heartbeat
#define FLOW_X (HEARTBEAT * 0.001 + spectralCentroidSlope * 0.002)
// #define FLOW_X 0.0
#define FLOW_Y (HEARTBEAT * 0.0008 + spectralSpreadSlope * 0.001)
// #define FLOW_Y 0.0

// Calm heuristic: how "normal" is the audio right now?
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 0.0

// Drop state ramp/decay speeds
#define DROP_RAMP 0.08
#define DROP_DECAY_MIN 0.01
#define DROP_DECAY_MAX 0.06

// ============================================================================
// CRIMSON PALETTE — veins, arteries, heart-blood
// ============================================================================

vec3 heartdepth(float t) {
    // t=0 -> bright crimson (closest), t=1 -> near-black maroon (farthest)
    t = clamp(t, 0.0, 1.0);
    // Deep crimson to dark maroon gradient
    vec3 close = vec3(0.85, 0.08, 0.05);   // arterial crimson
    vec3 mid   = vec3(0.45, 0.02, 0.06);   // venous dark red
    vec3 far   = vec3(0.08, 0.01, 0.03);   // near-black maroon
    vec3 col = mix(close, mid, smoothstep(0.0, 0.5, t));
    col = mix(col, far, smoothstep(0.4, 1.0, t));
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

    // Heartbeat scales the whole form — contracts/expands with lub-dub
    C *= 1.0 + HEARTBEAT * 0.03;

    // Time-driven curl — slow organic throb, not wing-flap
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulated soft proximity for focal glow
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

        // Soft accumulated proximity — each close pass adds glow
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree lines — veins and arteries
    float lace_x = smoothstep(-1.8, -5.0, log(max(x, 1e-10)));
    float lace_y = smoothstep(-1.8, -5.0, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 3.0);

    // Fractal structure for color mapping
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — the heart's core
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Gem rim — soft organic edge
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Gem specular — fractal-driven highlight variation
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Internal brilliance — heartbeat-driven pulse (not slow sine)
    float gem_pulse = 0.75 + 0.25 * HEARTBEAT;

    // Prismatic dispersion — warm reds only
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 1.6 - disp * 0.2),   // red channel closest
        pow(f_safe, 2.2),                  // green suppressed
        pow(f_safe, 2.4 + disp * 0.2)     // blue most suppressed
    );

    // Gem depth shading
    float gem_depth_shade = mix(0.4, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // DEPTH MAPPING
    // ========================================================================

    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(max(focal, 0.0), 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP STATE — sustained mode change triggered by turbulence > 4.5
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    float drop_signal = clamp(drop_trigger * smoothstep(3.0, 4.5, turbulence), 0.0, 1.0);

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
    // COLOR — deep crimson/maroon palette, veins are blood-red
    // ========================================================================

    // Vein color: use rainbow structure but tint deep crimson
    vec3 vein_color = rainbow.rgb;
    // Tint toward deep blood-red: suppress green/blue, boost red
    vein_color = vec3(
        vein_color.r * 0.9 + 0.1,
        vein_color.g * 0.15,
        vein_color.b * 0.12
    );
    // Heartbeat brightens the veins
    vein_color *= (0.85 + HEARTBEAT * 0.25);

    // Background: dark maroon-black, pulses faintly with heartbeat
    vec3 bg_dark = vec3(0.04, 0.008, 0.015);
    vec3 bg_pulse = vec3(0.08, 0.015, 0.025);
    vec3 bg = mix(bg_dark, bg_pulse, HEARTBEAT * 0.4);

    // Lace (veins) get the blood-red color
    vec3 col = mix(bg, vein_color, lace);

    // Fine filigree highlights — capillary shimmer
    vec3 capillary = vec3(0.7, 0.12, 0.08);
    col += capillary * lace_fine * 0.2;

    // Rim detection — warm red-pink edges
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    vec3 rim_col = vec3(0.75, 0.2, 0.35); // warm red-pink
    rim_col *= (0.8 + HEARTBEAT * 0.3);    // pulses with heartbeat

    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // ========================================================================
    // GEM FOCAL — deep crimson heart-glow with white-hot center on beat
    // ========================================================================

    float glow_energy = clamp(energyNormalized + energyZScore * 0.2, 0.0, 1.0);

    // Gem colors — deep crimson, no hue rotation (this is a heart)
    vec3 gem_base = vec3(0.85, 0.06, 0.04);     // deep arterial red
    vec3 gem_fire = vec3(1.0, 0.15, 0.05);      // bright crimson fire
    vec3 gem_white = vec3(1.0, 0.85, 0.8);      // warm white-hot

    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;

    // Sparkle — white-hot center on heartbeat peaks
    float sparkle_str = mix(0.3, 1.0, HEARTBEAT);
    vec3 gem_specular = gem_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Rim glow — crimson edge
    vec3 gem_rim_inner = vec3(1.0, 0.15, 0.1);
    vec3 gem_rim_outer = vec3(0.5, 0.03, 0.08);
    vec3 gem_rim_col = mix(gem_rim_outer, gem_rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.6, 1.2, HEARTBEAT);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.85);

    // Outer glow — warm crimson aura
    float glow_str = mix(0.06, 0.2, HEARTBEAT);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += gem_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // DROP MODE — heart attack: everything blazes crimson
    // ========================================================================

    float bg_dim = mix(1.0, 0.15, drop);
    float focal_boost = mix(1.0, 3.0, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Hot rim on drop
    vec3 rim_hot = vec3(1.0, 0.3, 0.1);
    col += rim_hot * rim * drop * 0.25;

    // Blazing focal
    float blaze = focal * focal_boost * drop * max(glow_energy, HEARTBEAT);
    col += gem_fire * blaze * 0.6;
    col += gem_white * pow(f_safe, 2.5) * drop * 0.5;
    col += gem_prism * vec3(1.0, 0.2, 0.1) * gem_rim * drop * 0.3;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat flash — subtle, heartbeat handles the main rhythm
    if (beat) {
        col += vec3(0.12, 0.02, 0.01) * focal;
        col *= 1.03;
    }

    // Overall pulse
    col *= PULSE;

    // Frame feedback — moderate trails for pulse afterimages
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.94, FEEDBACK_MIX);

    // Vignette — pulses with heartbeat (tighter on beat = spotlight throb)
    float vign_power = 1.8 + HEARTBEAT * 0.6;
    float vign_scale = 0.65 + HEARTBEAT * 0.08;
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Darkness enforcement — only veins, rim, and focal get to be bright
    float bright_allowed = max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7));
    col *= mix(0.12, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.65));

    // Gamma — warm crimson bias
    col = pow(max(col, vec3(0.0)), vec3(0.85, 0.95, 0.98));

    P = vec4(col, drop_state);
}
