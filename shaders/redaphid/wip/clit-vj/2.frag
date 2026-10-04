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
// vj iter1: iteration-control params must be stable (Median/Normalized), never Z-score — Z here = whole-frame blackout on transients
#define A mapValue(spectralCentroidMedian, 0., 1., 1.2, 1.8) + 0.1
// #define A 1.5

// Body offset: energy shifts the form
#define B (0.55 + (energyNormalized - 0.5) * 0.15 * bDamp)
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

    // vj iter3: MANDELBROT ZOOM (user 22:33: "zoom in slowly into the complex fractal lace,
    // slowly panning in to the infinite fractal like a mandelbrot zoom").
    // Log-space triangle: ~3 min in to ~300x, ~3 min back out. Rate never below ~1.7%/s so the
    // motion is perceptible within 10 s. No audio anywhere in the zoom (no shiver).
    // vj iter5b: capped. Past ~10x the orbit-trap lace is chaotic at pixel scale (speckle wall,
    // seen at 20x and 45x). 2 min in to 10x, 2 min out; min rate ~1%/s.
    // iter5d: 8.9x was still a speckle wall; legible band is 1x-4.5x. Period 200 divides the
    // 1000 s `time` wrap exactly, so the wrap is phase-continuous.
    const float ZOOM_PERIOD = 200.0;
    const float ZOOM_LOGMAX = 1.5;
    float ztri = 1.0 - abs(2.0 * fract(time / ZOOM_PERIOD) - 1.0);
    float zoomLog = ZOOM_LOGMAX * mix(ztri, smoothstep(0.0, 1.0, ztri), 0.5);
    float zoom = exp(zoomLog);
    vec2 zoomTarget = vec2(1.0, 0.33);   // dense lace zone on the right wing
    C = zoomTarget + (C - zoomTarget) / zoom;
    // vj iter6: ORBIT — the zoom alone stalls near 1x (rate -> 0 at the turnaround), so the frame
    // sat still. Monotonic phase accumulator (never audio in the phase), 150 s per revolution,
    // radius shrinks with depth so it stays a drift, not a swing, when magnified.
    float orbPhase = time * 0.0419;
    float orbR = 0.085 / (1.0 + zoomLog * 1.5);
    C += orbR * vec2(cos(orbPhase), sin(orbPhase * 0.73));
    // Deep in, a tiny change in the body offset B moves structure across the whole screen —
    // damp its audio term with depth so the zoom stays glassy.
    float bDamp = 1.0 / sqrt(zoom);
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
    // Very tight thresholds: only the finest lines, not broad body mass
    // vj iter2: LACE BREATH — loud passages thicken the filigree, quiet thins it to hairline.
    // energyNormalized (smoothed level, not Z) shifts the log-threshold; 0.4 = original look.
    // vj iter4: LEGIBILITY AT DEPTH — at 10x the lace covered the whole frame (grey-mauve wall,
    // no dark floor). Tighten the threshold with log(zoom) so only the finest lines survive as we
    // go in; identical to before at zoom 1.
    float laceTop = -2.0 + clamp((energyNormalized - 0.4) * 2.0, -0.5, 1.0) - zoomLog * 0.6;
    float lx = log(x), ly = log(y);
    float lace_x = smoothstep(laceTop, laceTop - 3.0, lx);  // fine vertical-ish lines
    float lace_y = smoothstep(laceTop, laceTop - 3.0, ly);  // fine horizontal-ish lines
    // vj iter4b: SPECKLE KILL — deep in, the trap value jumps chaotically between neighbouring
    // pixels and thresholding it aliases into sparkle. Keep lace only where log-trap is coherent
    // across a pixel (smooth curves), fade it out where it is noise.
    // iter5c: gate only at depth — at 1x it cut dotted black seams along the atan branch cuts.
    float cohOn = smoothstep(0.6, 1.6, zoomLog);
    float coh_x = 1.0 - cohOn * smoothstep(1.5, 5.0, fwidth(lx));
    float coh_y = 1.0 - cohOn * smoothstep(1.5, 5.0, fwidth(ly));
    lace_x *= coh_x;
    lace_y *= coh_y;
    float lace = max(lace_x, lace_y);                // combined lace pattern
    float lace_fine = lace_x * lace_y;               // extra-fine intersection detail
    // Sharpen hard: make lace binary (on/off)
    lace = pow(lace, 3.0);

    // No spine masking — don't draw a line through the anatomy

    // Fractal structure for depth mapping
    vec4 rainbow = sqrt(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)));
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
    // vj iter5: FOCAL FADE WITH DEPTH — past ~3x every pixel's orbit grazes focal_center, so the
    // "one hot red spot" became dozens of red blobs plus a maroon ember wash that also disabled the
    // darkness enforcement (bright_allowed). Zoom 1: unchanged. Gone by ~12x; bg returns to purple.
    focal *= 1.0 - smoothstep(0.5, 2.5, zoomLog);

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

    // Rim detection — edges of body silhouette
    // Tighter threshold so only sharp edges glow, not broad gradients
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    // Rim fades near center to avoid "spinal column" look
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;
    vec3 rim_cool = vec3(0.3, 0.15, 0.65);   // violet
    vec3 rim_warm = vec3(0.8, 0.3, 0.5);     // pink
    vec3 rim_col = mix(rim_cool, rim_warm, RIM_WARMTH);

    // Add rim glow on top — soft party lights on legs/hips
    col += rim_col * rim * RIM_INTENSITY * 0.3;

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

    // Final darkness enforcement: only lace, rim, and focal get to be bright
    float bright_allowed = max(max(lace, rim * 0.5), focal);
    col *= mix(0.15, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Gamma — slightly warm
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    P = vec4(col, 1.0);
}
