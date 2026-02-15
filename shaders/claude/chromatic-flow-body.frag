// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, sexy
// Chromatic Flow (Body) — Chromadepth anatomy with drop-reactive focus
// Red = closest (clitoris pops out), Blue = farthest (background recedes)
// Based on Dom Mandy's complex power fractal

// ============================================================================
// AUDIO-REACTIVE PARAMETERS — smooth flow via slopes, subtle zScore accents
// ============================================================================

// Shape complexity: use slope for smooth drift, tiny zScore for sparkle
// Slope = trend direction, intercept = current baseline
#define A (1.5 + spectralCentroidSlope * 0.8 + spectralCentroidZScore * 0.05)
// #define A 1.5

// Body offset: smooth energy trend shifts the form slowly
#define B (0.55 + energySlope * 0.4 + energyZScore * 0.03)
// #define B 0.55

// Lace flow: spectral centroid slope gently shifts the fractal exploration
#define LACE_FLOW (spectralCentroidSlope * 0.3)
// #define LACE_FLOW 0.0

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse — gentler, slope-smoothed
#define PULSE (1.0 + bassSlope * 0.15 + bassZScore * 0.02)
// #define PULSE 1.0

// Feedback — slightly more for smoother trails
#define FEEDBACK_MIX (0.3 + energyNormalized * 0.1)
// #define FEEDBACK_MIX 0.35

// Pitch class for rim color modulation (0-1, which note is playing)
#define PITCH_HUE (pitchClassNormalized)
// #define PITCH_HUE 0.5

// ============================================================================
// CHROMADEPTH COLOR — red closest, blue farthest
// ============================================================================

vec3 chromadepth(float t) {
    // t=0 → red (closest), t=1 → blue/violet (farthest)
    t = clamp(t, 0.0, 1.0);
    float hue = t * 0.82;
    float chromaBoost = 1.0 + 0.2 * sin(t * 3.14159 * 2.0);
    // Darken significantly as depth increases — deep violet bg
    float L = 0.7 - t * 0.45;
    float C = 0.25 * chromaBoost * (1.0 - t * 0.3);
    float h = hue * 6.28318;
    vec3 lab = vec3(L, C * cos(h), C * sin(h));
    return clamp(oklab2rgb(lab), 0.0, 1.0);
}

// Warm chromadepth — deep dark violet background, hot reds up front
vec3 warmChromadepth(float depth, float warmth) {
    vec3 cd = chromadepth(depth);
    // Zorn-inspired: deep violet-black bg, warm ochre-red foreground
    vec3 warm_tint = mix(
        vec3(0.95, 0.3, 0.15),   // hot red-ochre for close
        vec3(0.04, 0.01, 0.06),  // near-black violet for far
        depth
    );
    return mix(cd, warm_tint, warmth);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.77;
    // Gentle flow offset — slopes create smooth drifting, not jumping
    V = C + vec2(LACE_FLOW * 0.02, LACE_FLOW * 0.015);

    float v, x, y,
          z = y = x = 9.;

    // Orbit trap for focal point
    float focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);

    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * A;
        float c = dot(V, vec2(a, log(d) / 2.));
        V = exp(-a * V.y) * pow(d, V.x / 2.) * vec2(cos(c), sin(c));
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
    z = 1. - smoothstep(1., -6., log(y)) * smoothstep(1., -6., log(x));

    // Lace detection using screen-space derivatives — only actual sharp edges glow
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float lace = smoothstep(0.02, 0.15, edge * 15.0);
    // Cross-reference with orbit traps for the finest filigree only
    float trap_detail = smoothstep(-4.0, -7.0, log(x)) * smoothstep(-4.0, -7.0, log(y));
    float lace_fine = trap_detail;

    // Fractal structure for depth mapping
    // Phase offset flows with spectral slope — colors drift through the lace
    float color_flow = spectralFluxSlope * 0.5;
    vec4 rainbow = sqrt(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0) + color_flow));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT detection
    // ========================================================================

    // Orbit trap glow — where the fractal naturally converges
    // Tight falloff so it's a small hot spot, not a broad wash
    float focal_glow = smoothstep(0.5, 0.01, focal_trap);
    focal_glow = pow(focal_glow, 3.0);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;

    float focal = focal_glow;

    // ========================================================================
    // CHROMADEPTH MAPPING — focal=red(close), background=blue(far)
    // ========================================================================

    // Depth: 0=closest(red), 1=farthest(blue)
    // Background → deep blue/violet, fractal detail → green/yellow, focal → red
    float base_depth = mix(0.6, 0.95, 1.0 - luma);  // bg maps to far blue/violet
    float detail_depth = mix(0.2, 0.5, luma);         // fractal ridges = mid (green/yellow)
    // Use fractal edge detection to show detail at mid-depth
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    // Focal override to pure red
    float focal_strength = pow(focal, 1.5);  // sharpen the focal falloff
    float depth = mix(base_depth, 0.0, focal_strength);

    // ========================================================================
    // DROP DETECTION — "finding the clitoris"
    // ========================================================================

    float drop = DROP_INTENSITY;
    float build = BUILD_INTENSITY;

    // During build: depth compresses (everything shifts greener/closer)
    depth = mix(depth, depth * 0.7, build * 0.3);

    // During drop: focal goes PURE RED, background goes DEEP BLUE
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));  // bg pushes further
    depth = mix(depth, 0.0, drop * focal);                    // focal pulls to red
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // SEXY/1 GENERATIVE COLOR — the magical panties palette
    // ========================================================================

    // This IS the magic — sexy/1's original output formula
    vec3 sexy_col = rainbow.rgb;  // sqrt(z + (z-z³)*cos(...))

    // Deep velvety purple background — cold warehouse party darkness
    vec3 bg_purple = vec3(0.04, 0.015, 0.08);

    // Lace lines are the ONLY thing that gets sexy/1's color
    // Everything else is deep purple darkness
    float visibility = lace;

    vec3 col = mix(bg_purple, sexy_col, visibility);

    // Pearly filigree highlights on the finest lace intersections
    col += vec3(0.7, 0.5, 0.65) * lace_fine * 0.25;

    // Rim lighting — pastel glow on body edges
    float rim = smoothstep(0.05, 0.3, edge * 15.0);

    // Pastel colors modulated by pitchClass — each note shifts the hue
    // Use HSL-style rotation: pitchClass rotates through pastel wheel
    float hue_base = PITCH_HUE * 6.28318;  // full rotation across pitch classes
    float rim_phase = atan(C.x, C.y);       // spatial variation
    vec3 rim_col = vec3(
        0.65 + 0.3 * sin(hue_base + rim_phase),
        0.55 + 0.3 * sin(hue_base + rim_phase + 2.094),  // +120°
        0.7  + 0.25 * sin(hue_base + rim_phase + 4.189)  // +240°
    );

    // Amplitude: smooth baseline from slope, subtle accent from zScore
    float rim_amp = 0.12 + clamp(energySlope * 2.0, 0.0, 0.3) + clamp(energyZScore, 0.0, 1.0) * 0.15;
    col += rim_col * rim * rim_amp * (1.0 - lace * 0.5);

    // Focal point — shifts toward red for chromadepth pop
    col = mix(col, chromadepth(depth) * 1.2, focal * 0.3);

    // ========================================================================
    // DROP SPOTLIGHT — dim bg, boost focal
    // ========================================================================

    float bg_dim = mix(1.0, 0.2, drop);
    float focal_boost = mix(1.0, 2.5, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Hot focal glow — always a subtle ember, blazing on drops
    vec3 hot_red = vec3(1.0, 0.15, 0.05);
    float ember = focal * 0.15;
    float blaze = focal * focal_boost * 0.5 * drop;
    col += hot_red * (ember + blaze);
    col += vec3(1.0, 0.7, 0.4) * pow(focal, 3.0) * drop * 0.6;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Beat flash
    if (beat) {
        col += vec3(0.15, 0.04, 0.02) * focal;
        col *= 1.05;
    }

    // Bass pulse
    col *= PULSE;

    // Frame feedback — flowing trails with slope-driven drift
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    // Gentle UV drift based on spectral slopes — creates flowing motion
    vec2 flow_drift = vec2(
        spectralCentroidSlope * 0.003,
        spectralSpreadSlope * 0.002
    );
    vec4 prev = getLastFrameColor(fbUv + flow_drift);
    col = mix(col, prev.rgb * 0.94, FEEDBACK_MIX);

    // Vignette — deep black/violet edges for clean chromadepth
    float vign = 1.0 - pow(length(uv) * 0.65, 1.8);
    // On drops, vignette gets tighter (more dramatic spotlight)
    vign = mix(vign, pow(vign, 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Final darkness enforcement: only lace and focal get to be bright
    // Rim adds soft edge glow but doesn't override darkness
    float bright_allowed = max(lace, focal);
    col *= mix(0.12, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Gamma — slightly warm
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    P = vec4(col, 1.0);
}
