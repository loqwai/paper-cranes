// @fullscreen: true
// @mobile: true
// @tags: smoke, incense, ritual, ambient, hypnotic
// Smoke Ritual — Incense smoke interpretation of the clit fractal series
// Lace becomes smoke tendrils — soft, diffuse, slowly rising
// Smoky grays, warm ambers, deep purples like incense catching colored light
// Gem focal is a deep ember — orange glow with slow breathing pulse
// Default = SLOW wisps curling lazily. Fast reactions ONLY on extreme z-scores (abs > 0.6)
// Based on Dom Mandy's complex power fractal

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — smoke ritual: languid by default, gusts on extremes
// ============================================================================

// Shape complexity: slowly drifts on its own, only audio-reactive on extreme z-scores
// Gate: spectralCentroidZScore only contributes when abs > 0.6
#define CENTROID_GATED (abs(spectralCentroidZScore) > 0.6 ? spectralCentroidZScore * 0.08 : 0.0)
#define A (1.45 + 0.12 * sin(iTime * 0.03) + CENTROID_GATED)
// #define A 1.45

// Body offset: slow autonomous drift, minimal audio
#define ENERGY_GATED (abs(energyZScore) > 0.6 ? energyZScore * 0.06 : 0.0)
#define B (0.55 + 0.06 * sin(iTime * 0.022) + ENERGY_GATED)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.0

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — very subtle, smoke doesn't jump
#define PULSE (1.0 + (abs(bassZScore) > 0.6 ? bassZScore * 0.04 : 0.0))
// #define PULSE 1.0

// Feedback — very high for smoke trails (0.55 base)
#define FEEDBACK_MIX (0.55 + energyNormalized * 0.05)
// #define FEEDBACK_MIX 0.55

// Rim lighting: subtle warm glow on edges, like light catching smoke
#define RIM_INTENSITY (0.25 + trebleNormalized * 0.25)
// #define RIM_INTENSITY 0.35

// Rim color warmth: warm amber always
#define RIM_WARMTH (0.65 + spectralRoughnessNormalized * 0.15)
// #define RIM_WARMTH 0.7

// Gem brilliance: the ember — steady glow
#define GEM_BRILLIANCE (0.6 + spectralCrestNormalized * 0.3)
// #define GEM_BRILLIANCE 0.75

// Gem dispersion: minimal — ember is monochromatic deep orange
#define GEM_DISPERSION (0.15 + spectralSpreadNormalized * 0.15)
// #define GEM_DISPERSION 0.2

// Tendril curl: slow lazy curls (period ~25s), sharp gust on z > 0.7
#define CURL_GUST_X (abs(spectralCentroidZScore) > 0.7 ? spectralCentroidZScore * 0.8 : 0.0)
#define CURL_GUST_Y (abs(spectralSpreadZScore) > 0.7 ? spectralSpreadZScore * 0.6 : 0.0)
#define TENDRIL_CURL (sin(iTime * 0.04) * 0.3 + sin(iTime * 0.027) * 0.2 + CURL_GUST_X)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: independent lazy drift
#define TENDRIL_CROSS (sin(iTime * 0.033) * 0.25 + sin(iTime * 0.019 + 1.5) * 0.15 + CURL_GUST_Y)
// #define TENDRIL_CROSS 0.0

// Flow drift: constant upward component (smoke rises) + audio gated spread
#define FLOW_X (spectralCentroidSlope * 0.002)
// #define FLOW_X 0.0
#define FLOW_Y (0.001 + spectralSpreadSlope * 0.001)
// #define FLOW_Y 0.001

// Drop trigger: multiple z-scores spiking + confident energy drop = gust event
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Drop state ramp/decay — slow decay for lingering smoke gust
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.005
#define DROP_DECAY_MAX 0.03

// ============================================================================
// SMOKE COLOR PALETTE
// ============================================================================

// Smoky warm gray-amber for lace/smoke tendrils
vec3 smokeColor(vec3 rainbow) {
    return mix(rainbow, vec3(0.7, 0.6, 0.5), 0.4);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Time-driven curl — lazy smoke tendrils
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    // Turbulent displacement — smoke never flows in straight lines
    V += vec2(
        sin(V.y * 5.0 + iTime * 0.03),
        cos(V.x * 5.0 + iTime * 0.04)
    ) * 0.005;

    float v, x, y,
          z = y = x = 9.;

    // Orbit traps — accumulated soft proximity for focal ember
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

        // Soft accumulated proximity for ember glow
        float fd = length(V - focal_center);
        float prox = exp(-fd * 3.0);
        float iter_fade = 1.0 - float(k) / 50.0;
        focal_trap += prox * iter_fade;
        focal_weight += iter_fade;
    }
    focal_trap /= max(focal_weight, 1.0);

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace as smoke — very soft, diffuse (sharpening power 1.0)
    float lace_lo = -1.8;
    float lace_hi = -4.8;
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    // Soft smoke — power 1.0 means no sharpening, fully diffuse
    lace = pow(max(lace, 0.0), 1.0);

    // Fractal structure for color — shift toward warm amber phase
    float color_phase = 0.8;
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — ember glow
    // ========================================================================

    float focal_glow = smoothstep(0.05, 0.4, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 1.5);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Ember rim — soft organic edge
    float focal_inner = smoothstep(0.08, 0.5, focal_trap);
    float gem_rim = focal * (1.0 - pow(max(focal_inner, 0.0), 2.0));
    gem_rim = max(gem_rim, 0.0) * 2.0;

    // Ember detail from fractal structure
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Slow breathing pulse — ember breathes
    float gem_pulse = 0.8 + 0.2 * sin(iTime * 0.4);

    // Minimal prismatic dispersion — ember is mostly monochromatic
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 1.8 - disp * 0.3),
        pow(f_safe, 2.0),
        pow(f_safe, 1.8 + disp * 0.3)
    );

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
    // GUST STATE — smoke gust on drop (turbulence > 4.5)
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    // Higher turbulence threshold for smoke gust (4.5 instead of 2.0-4.0)
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
    // COLOR — smoky palette
    // ========================================================================

    // Smoke tendrils: warm gray-amber tinted rainbow
    vec3 smoke_col = smokeColor(rainbow.rgb);

    // Background: deep charcoal-purple
    vec3 bg = vec3(0.03, 0.02, 0.04);

    // Lace as smoke — soft diffuse tendrils against dark background
    vec3 col = mix(bg, smoke_col, lace);

    // Filigree highlights — muted warm amber wisps
    col += vec3(0.5, 0.4, 0.3) * lace_fine * 0.15;

    // Rim detection — subtle warm edge glow like light catching smoke
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    vec3 rim_col = vec3(0.6, 0.35, 0.2); // warm amber rim

    col += rim_col * rim * RIM_INTENSITY * 0.25;

    // ========================================================================
    // EMBER FOCAL — deep orange glow with slow breathing
    // ========================================================================

    float glow_energy = clamp(energyNormalized + (abs(energyZScore) > 0.6 ? energyZScore * 0.2 : 0.0), 0.0, 1.0);

    // Ember base color: deep orange
    vec3 ember_base = vec3(0.9, 0.4, 0.1);
    // Ember hot core: brighter orange-yellow
    vec3 ember_hot = vec3(1.0, 0.6, 0.15);
    // Ember white-hot center
    vec3 ember_white = vec3(1.0, 0.9, 0.7);

    vec3 gem_interior = gem_prism * ember_base * gem_pulse * gem_depth_shade;

    float sparkle_str = mix(0.3, 0.7, glow_energy);
    vec3 gem_specular = ember_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Ember rim: warm orange gradient
    vec3 rim_inner = vec3(1.0, 0.5, 0.15);
    vec3 rim_outer = vec3(0.6, 0.2, 0.05);
    vec3 gem_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_rim_light = gem_rim_col * gem_rim * GEM_BRILLIANCE;

    float gem_energy_boost = mix(0.6, 1.1, glow_energy);
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * gem_energy_boost
                 + gem_specular
                 + gem_rim_light;

    col = mix(col, gem_col, focal * 0.8);

    // Outer ember glow — warm orange halo
    float glow_str = mix(0.06, 0.18, glow_energy);
    float outer_glow = smoothstep(0.02, 0.25, focal_trap) * (1.0 - focal);
    col += ember_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // GUST MODE — smoke gust: directional flow spike, not spotlight
    // ========================================================================

    // On gust: smoke dims slightly and swirls violently
    float bg_dim = mix(1.0, 0.6, drop);
    float focal_boost = mix(1.0, 1.8, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Gust makes ember flare
    vec3 gust_hot = vec3(1.0, 0.55, 0.15);
    col += gust_hot * rim * drop * 0.15;

    float blaze = focal * focal_boost * drop * glow_energy;
    col += ember_hot * blaze * 0.4;
    col += ember_white * pow(f_safe, 2.5) * drop * glow_energy * 0.3;

    // ========================================================================
    // FINISHING — smoke atmosphere
    // ========================================================================

    // No beat flash — smoke doesn't pulse with beats, it's languid
    // Only respond to extreme beats
    if (beat && turbulence > 3.0) {
        col += vec3(0.08, 0.04, 0.01) * focal;
        col *= 1.02;
    }

    col *= PULSE;

    // High feedback for long trailing smoke paths
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    // Flow drift with constant upward component + gust directional spike
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    // On gust: amplify directional flow for smoke whoosh
    flow_drift += vec2(
        (abs(spectralFluxZScore) > 0.7 ? spectralFluxZScore * 0.004 : 0.0),
        drop * 0.003
    );
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.97, FEEDBACK_MIX);

    // Vignette — soft, wide, atmospheric
    float vign_power = 1.5;
    float vign_scale = 0.55;
    float vign = 1.0 - pow(length(uv) * vign_scale, vign_power);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 1.5), drop);
    col *= max(vign, 0.03);

    // Smoke brightness — allow more ambient light through (less aggressive darkening)
    float bright_allowed = max(max(lace * 0.8, rim * 0.3), max(focal, gem_rim * 0.5));
    col *= mix(0.25, 1.0, bright_allowed);

    // Soft tone mapping — keep it muted and smoky
    col = col / (col + vec3(0.6));

    // Gamma: slightly warm, slightly desaturated for smoke feel
    col = pow(max(col, vec3(0.0)), vec3(0.92, 0.9, 0.88));

    // Subtle desaturation for smokiness
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(gray), col, 0.75);

    P = vec4(col, drop_state);
}
