// @fullscreen: true
// @mobile: true
// @tags: chromadepth, nebula, cosmic, slow
// Nebula Birth — Stellar nursery variation of the clit fractal
// Gas filaments in warm pinks/oranges and cool blues. Newborn star focal gem.
// Slow cosmic breathing (30s cycle). Supernova flash on extreme z-scores.
// Based on Dom Mandy's complex power fractal

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — SLOW COSMIC DEFAULTS
// Designed for majestic silence. Only reacts on extreme z-scores (abs > 0.6)
// ============================================================================

// Shape complexity: slow cosmic breathing, 40s full cycle
// Only responds to extreme spectral centroid anomalies
#define EXTREME_CENTROID (abs(spectralCentroidZScore) > 0.6 ? spectralCentroidZScore * 0.08 : 0.0)
#define A (1.5 + 0.18 * sin(iTime * 0.025) + EXTREME_CENTROID)
// #define A 1.5

// Body offset: slow expansion/contraction, ~31s cycle, phase-offset from A
#define EXTREME_ENERGY (abs(energyZScore) > 0.6 ? energyZScore * 0.06 : 0.0)
#define B (0.55 + 0.1 * sin(iTime * 0.02 + 1.5) + EXTREME_ENERGY)
// #define B 0.55

// Drop detection: requires higher turbulence threshold (4.0)
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.0

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse: only on extreme bass
#define PULSE (1.0 + (abs(bassZScore) > 0.6 ? bassZScore * 0.04 : 0.0))
// #define PULSE 1.0

// Feedback — HIGH for gas cloud diffusion trails (0.4 base)
#define FEEDBACK_MIX (0.4 + energyNormalized * 0.05)
// #define FEEDBACK_MIX 0.4

// Rim lighting: gentle nebula edge glow, only treble extremes brighten
#define RIM_INTENSITY (0.3 + (abs(trebleZScore) > 0.6 ? trebleNormalized * 0.4 : 0.1))
// #define RIM_INTENSITY 0.4

// Rim color warmth: nebula gas warmth
#define RIM_WARMTH (0.5 + spectralRoughnessNormalized * 0.1)
// #define RIM_WARMTH 0.5

// Gem brilliance: newborn star — always brilliant, extreme crest boosts
#define GEM_BRILLIANCE (1.2 + (abs(spectralCrestZScore) > 0.6 ? spectralCrestNormalized * 0.3 : 0.0))
// #define GEM_BRILLIANCE 1.2

// Gem dispersion: tight white-blue, minimal prismatic spread
#define GEM_DISPERSION (0.15 + spectralSpreadNormalized * 0.15)
// #define GEM_DISPERSION 0.2

// Tendril curl: SLOW gas tendril rotation, 35s period
// No wing-like flap — smooth orbital drift
#define TENDRIL_CURL (sin(iTime * 0.0286) * 0.4 + sin(iTime * 0.0163) * 0.25)
// #define TENDRIL_CURL 0.0

// Cross-axis curl: slow perpendicular drift for 3D gas motion feel
#define TENDRIL_CROSS (sin(iTime * 0.022) * 0.35 + sin(iTime * 0.013 + 2.0) * 0.2)
// #define TENDRIL_CROSS 0.0

// Flow drift: very slow, cosmic-scale drift
#define FLOW_X (sin(iTime * 0.015) * 0.001)
// #define FLOW_X 0.0
#define FLOW_Y (cos(iTime * 0.012) * 0.0008)
// #define FLOW_Y 0.0

// Drop trigger: HIGHER threshold — requires turbulence > 4.0 for supernova
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
// #define ZSCORE_TURBULENCE 0.0

// Calm heuristic
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
// #define AUDIO_SETTLED 1.0

// Drop state ramp/decay — slower ramp, slower decay for sustained supernova
#define DROP_RAMP 0.06
#define DROP_DECAY_MIN 0.005
#define DROP_DECAY_MAX 0.03

// ============================================================================
// NEBULA PALETTE — warm pinks/oranges for dense gas, cool blues for thin
// ============================================================================

vec3 nebulaColor(float t) {
    // t=0: hot dense gas (warm pink/orange), t=1: thin gas (cool blue)
    t = clamp(t, 0.0, 1.0);

    // Warm dense gas core: pinks and oranges
    vec3 hot = vec3(0.85, 0.25, 0.15);    // warm orange
    vec3 warm = vec3(0.75, 0.15, 0.35);   // nebula pink
    vec3 mid = vec3(0.45, 0.12, 0.55);    // purple transition
    vec3 cool = vec3(0.12, 0.18, 0.65);   // cool blue
    vec3 cold = vec3(0.06, 0.08, 0.35);   // deep space blue

    vec3 col;
    if (t < 0.25) {
        col = mix(hot, warm, t * 4.0);
    } else if (t < 0.5) {
        col = mix(warm, mid, (t - 0.25) * 4.0);
    } else if (t < 0.75) {
        col = mix(mid, cool, (t - 0.5) * 4.0);
    } else {
        col = mix(cool, cold, (t - 0.75) * 4.0);
    }
    return col;
}

// ============================================================================
// STAR FIELD — scattered white dots for deep space background
// ============================================================================

float starField(vec2 uv) {
    float stars = 0.0;
    // Multiple layers at different scales for depth
    for (int i = 0; i < 3; i++) {
        float scale = 80.0 + float(i) * 60.0;
        vec2 grid = floor(uv * scale);
        float r = random(grid + float(i) * 137.0);
        float brightness = step(0.985, r);  // sparse stars
        // Twinkle based on time — very slow
        float twinkle = 0.5 + 0.5 * sin(r * 6.2832 + iTime * (0.3 + r * 0.2));
        stars += brightness * twinkle * (0.3 + 0.7 * r);
    }
    return stars;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    C.y += 0.0;

    // Slow cosmic rotation of the entire fractal field
    float angle = iTime * 0.008;
    float ca = cos(angle), sa = sin(angle);
    C = mat2(ca, -sa, sa, ca) * C;

    // Slow gas tendril drift
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit trap for focal point (newborn star)
    float focal_trap = 9.0;
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

        // Track orbit proximity to focal point
        float fd = length(V - focal_center);
        focal_trap = min(focal_trap, fd);
    }

    // Base fractal value
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));

    // Lace/filigree — SOFT and DIFFUSE for gas filaments (low sharpness)
    float lace_lo = -1.8;
    float lace_hi = -4.8;
    float lace_x = smoothstep(lace_lo, lace_hi, log(max(x, 1e-10)));
    float lace_y = smoothstep(lace_lo, lace_hi, log(max(y, 1e-10)));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    // Low sharpness = soft diffuse gas filaments
    float lace_sharp = 1.2;
    lace = pow(max(lace, 0.0), lace_sharp);

    // Fractal structure for nebula coloring
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT — newborn star: brilliant white-blue core
    // ========================================================================

    float focal_glow = smoothstep(0.5, 0.01, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 2.0);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // Star rim — bright ring at the star's edge
    float focal_inner = smoothstep(0.35, 0.02, focal_trap);
    float gem_rim = focal - pow(max(focal_inner, 0.0), 1.5);
    gem_rim = max(gem_rim, 0.0);
    gem_rim = pow(gem_rim, 0.6) * 2.5;

    // Star specular detail
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);

    // Internal brilliance — very slow stellar breathing
    float gem_pulse = 0.9 + 0.1 * sin(iTime * 0.3);

    // Minimal prismatic dispersion — newborn star is near-white
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(
        pow(f_safe, 1.9 - disp * 0.15),
        pow(f_safe, 2.0),
        pow(f_safe, 1.9 + disp * 0.15)
    );

    // Star depth shading
    float gem_depth_shade = mix(0.5, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));

    // ========================================================================
    // DROP STATE — SUPERNOVA: requires turbulence > 4.0
    // ========================================================================

    float drop_trigger = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    float turbulence = ZSCORE_TURBULENCE;
    // Higher threshold: turbulence must exceed 4.0 for supernova trigger
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

    // ========================================================================
    // COLOR — Nebula palette: gas filaments in pinks/oranges/blues
    // ========================================================================

    // Map fractal luminance to nebula gas density
    // Low luma = dense hot gas (pink/orange), high luma = thin cool gas (blue)
    float gas_density = 1.0 - luma;
    vec3 nebula_col = nebulaColor(1.0 - gas_density);

    // Blend original fractal rainbow into nebula tones for variety
    vec3 gas_col = mix(nebula_col, rainbow.rgb * vec3(0.8, 0.4, 0.6), 0.2);

    // Deep space background
    vec3 bg = vec3(0.005, 0.005, 0.015);

    // Star field in background
    float stars = starField(uv * 2.0 + vec2(iTime * 0.002, iTime * 0.001));
    bg += vec3(0.7, 0.75, 0.9) * stars * 0.3;

    vec3 col = mix(bg, gas_col, lace);

    // Gas filament highlights — soft warm wisps
    vec3 filament_warm = vec3(0.8, 0.45, 0.25);
    vec3 filament_cool = vec3(0.3, 0.4, 0.7);
    vec3 filament_col = mix(filament_cool, filament_warm, gas_density);
    col += filament_col * lace_fine * 0.2;

    // Rim detection — gas edges glow with nebula emission
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    // Nebula rim emission — pinks and blues at gas boundaries
    vec3 rim_pink = vec3(0.7, 0.2, 0.4);
    vec3 rim_blue = vec3(0.2, 0.3, 0.7);
    vec3 rim_col = mix(rim_blue, rim_pink, RIM_WARMTH);
    col += rim_col * rim * RIM_INTENSITY * 0.25;

    // ========================================================================
    // GEM FOCAL — NEWBORN STAR: brilliant white-blue core
    // ========================================================================

    float glow_energy = clamp(0.5 + (abs(energyZScore) > 0.6 ? energyZScore * 0.2 : 0.0), 0.0, 1.0);

    // Newborn star base: white-blue, not colored like a gem
    vec3 star_base = vec3(0.7, 0.8, 1.0);   // white-blue
    vec3 star_hot = vec3(0.9, 0.92, 1.0);    // near-white at peak
    vec3 star_white = vec3(1.0, 0.98, 1.0);  // pure stellar white

    vec3 star_interior = gem_prism * star_base * gem_pulse * gem_depth_shade;

    float sparkle_str = mix(0.5, 1.0, glow_energy);
    vec3 star_specular = star_white * gem_sparkle * sparkle_str * GEM_BRILLIANCE;

    // Star rim — blue-white ionization ring
    vec3 rim_inner = vec3(0.8, 0.85, 1.0);
    vec3 rim_outer = vec3(0.4, 0.5, 0.9);
    vec3 star_rim_col = mix(rim_outer, rim_inner, smoothstep(0.0, 1.0, gem_rim));
    vec3 star_rim_light = star_rim_col * gem_rim * GEM_BRILLIANCE;

    float star_energy_boost = mix(0.8, 1.2, glow_energy);
    vec3 star_col = star_interior * GEM_BRILLIANCE * star_energy_boost
                  + star_specular
                  + star_rim_light;

    col = mix(col, star_col, focal * 0.9);

    // Outer stellar glow — ionized gas around newborn star
    float glow_str = mix(0.1, 0.2, glow_energy);
    float outer_glow = smoothstep(0.8, 0.0, focal_trap) * (1.0 - focal);
    col += star_base * outer_glow * glow_str * GEM_BRILLIANCE;

    // ========================================================================
    // SUPERNOVA MODE — white expanding ring from center on extreme drop
    // ========================================================================

    // Supernova ring: expanding white circle on drop
    float ring_radius = drop * 1.5;  // expands outward
    float ring_dist = abs(length(uv) - ring_radius);
    float ring_width = 0.02 + drop * 0.06;
    float supernova_ring = smoothstep(ring_width, 0.0, ring_dist) * drop;

    // Central flash — brilliant white bloom
    float central_flash = exp(-length(uv) * 8.0) * drop * drop;

    // Apply supernova
    vec3 supernova_col = vec3(1.0, 0.95, 0.9);  // near-white with warmth
    col += supernova_col * supernova_ring * 0.8;
    col += supernova_col * central_flash * 2.0;

    // During supernova, gas brightens from the shockwave
    float shockwave = smoothstep(ring_radius + 0.1, ring_radius - 0.05, length(uv));
    col += nebula_col * shockwave * drop * 0.3 * lace;

    // Background dims slightly outside the ring during supernova
    float outside_ring = smoothstep(ring_radius - 0.1, ring_radius + 0.2, length(uv));
    col *= mix(1.0, mix(1.0, 0.6, drop), outside_ring * (1.0 - focal));

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat: very subtle — just a faint star pulse
    if (beat) {
        col += vec3(0.05, 0.05, 0.08) * focal;
    }

    col *= PULSE;

    // High feedback for gas cloud diffusion
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec2 flow_drift = vec2(FLOW_X, FLOW_Y);
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.97, FEEDBACK_MIX);

    // Soft wide vignette — vast cosmic view
    float vign = 1.0 - pow(length(uv) * 0.55, 1.5);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 1.5), drop);
    col *= max(vign, 0.03);

    // Brightness gating — gas and star structures allowed, darkness elsewhere
    float bright_allowed = max(max(lace * 0.8, rim * 0.4), max(focal, gem_rim * 0.6));
    // More permissive than clit/3 — gas clouds should glow faintly everywhere
    col *= mix(0.25, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.6));

    // Gamma — slightly warm cosmic tint
    col = pow(max(col, vec3(0.0)), vec3(0.9, 0.92, 0.88));

    P = vec4(col, drop_state);
}
