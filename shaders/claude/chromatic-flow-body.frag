// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, sexy
// Chromatic Flow (Body) — Chromadepth anatomy with drop-reactive focus
// Red = closest (clitoris pops out), Blue = farthest (background recedes)
// Based on Dom Mandy's complex power fractal

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Shape complexity: centroid controls fractal power
#define A mapValue(spectralCentroidZScore, 0., 1., 1.2, 1.8) + 0.1
// #define A 1.5

// Body offset: energy shifts the form
#define B (0.55 + energyZScore * 0.15)
// #define B 0.55

// Drop detection: confident energy drop = negative slope + high rSquared
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
// #define DROP_INTENSITY 0.8

// Build detection: confident energy rise
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
// #define BUILD_INTENSITY 0.0

// Bass pulse
#define PULSE (1.0 + bassZScore * 0.06)
// #define PULSE 1.0

// Feedback
#define FEEDBACK_MIX (0.25 + energyNormalized * 0.1)
// #define FEEDBACK_MIX 0.3

// Rim lighting: treble drives the body edge glow
#define RIM_INTENSITY (0.4 + trebleNormalized * 0.6)
// #define RIM_INTENSITY 0.7

// Rim color warmth: spectral roughness shifts rim from cool violet to warm pink
#define RIM_WARMTH (0.3 + spectralRoughnessNormalized * 0.4)
// #define RIM_WARMTH 0.5

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
    V = C;

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

    // Lace/filigree lines from orbit traps — this is the fairy-like patterning
    float lace_x = smoothstep(0.0, -4.0, log(x));  // fine vertical-ish lines
    float lace_y = smoothstep(0.0, -4.0, log(y));  // fine horizontal-ish lines
    float lace = max(lace_x, lace_y);               // combined lace pattern
    float lace_fine = lace_x * lace_y;              // extra-fine intersection detail

    // Fractal structure for depth mapping
    vec4 rainbow = sqrt(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // ========================================================================
    // FOCAL POINT detection
    // ========================================================================

    // Orbit trap glow — where the fractal naturally converges
    float focal_glow = smoothstep(1.5, 0.01, focal_trap);
    focal_glow = pow(focal_glow, 1.5);

    // Screen-space focal — tight spot at the anatomical center (top of V)
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    vec2 focal_pos = vec2(0.0, 0.18);
    float screen_focal_dist = length(uv - focal_pos);
    // Tight inner core + softer outer halo
    float focal_core = smoothstep(0.06, 0.0, screen_focal_dist);
    float focal_halo = smoothstep(0.18, 0.02, screen_focal_dist) * 0.4;

    float focal = max(focal_glow * 0.6, focal_core + focal_halo);

    // ========================================================================
    // CHROMADEPTH MAPPING — focal=red(close), background=blue(far)
    // ========================================================================

    // Depth: 0=closest(red), 1=farthest(blue)
    // Background → deep blue/violet, fractal detail → green/yellow, focal → red
    float base_depth = mix(0.6, 0.95, 1.0 - luma);  // bg maps to far blue/violet
    float detail_depth = mix(0.2, 0.5, luma);         // fractal ridges = mid (green/yellow)
    // Use fractal edge detection to show detail at mid-depth
    float edge = abs(dFdx(z)) + abs(dFdy(z));
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

    // Background: cold deep purple
    vec3 bg_col = vec3(0.05, 0.02, 0.10);

    // Lace: sexy/1's original rainbow coloring — the pastel bands
    vec3 lace_col = rainbow.rgb;

    // How much fractal structure is here? Invert z so 1=detail, 0=empty
    float structure = 1.0 - z;

    // Blend: deep purple everywhere, rainbow ONLY on lace lines
    vec3 col = bg_col;
    col = mix(col, bg_col * 1.5, structure * 0.3);     // body mass — barely lighter purple
    col = mix(col, lace_col, lace * 0.85);             // lace lines — full sexy rainbow
    col += vec3(0.85, 0.65, 0.8) * lace_fine * 0.35;  // pearly filigree highlights

    // Crush smooth areas to dark — only lace and focal survive bright
    col *= 0.3 + lace * 0.7 + focal * 0.6;

    // Focal point shifts toward red for chromadepth pop
    col = mix(col, chromadepth(depth) * 1.3, focal * 0.6);

    // ========================================================================
    // DROP SPOTLIGHT — dim bg, boost focal
    // ========================================================================

    float bg_dim = mix(1.0, 0.2, drop);
    float focal_boost = mix(1.0, 2.5, drop);

    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Hot focal glow — always a subtle ember, blazing on drops
    vec3 hot_red = vec3(1.0, 0.15, 0.05);
    float ember = focal * 0.2;                          // always glowing faintly
    float blaze = focal * focal_boost * 0.5 * drop;    // blazing on drops
    col += hot_red * (ember + blaze);
    // Extra white-hot core on drops
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

    // Frame feedback — subtle trails
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec4 prev = getLastFrameColor(fbUv);
    col = mix(col, prev.rgb * 0.95, FEEDBACK_MIX);

    // Vignette — deep black/violet edges for clean chromadepth
    float vign = 1.0 - pow(length(uv) * 0.65, 1.8);
    // On drops, vignette gets tighter (more dramatic spotlight)
    vign = mix(vign, pow(vign, 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Gamma — slightly warm
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    P = vec4(col, 1.0);
}
