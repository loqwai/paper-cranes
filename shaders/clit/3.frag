// @fullscreen: true
// @mobile: true
// @tags: heart, hearts, pulse, dance
// Heart-pulse fractal — pulsing-heart pattern over a deep blue/violet field.
// Palette tuned to match the-coat-13's space-blue/cyan/gold-accent vibe.

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
// HEART HELPERS (from plasma.frag)
// ============================================================================

float dot2(vec2 v) { return dot(v, v); }

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// Inigo Quilez heart SDF (point-up). Negative inside.
float sdHeart(vec2 p) {
    p.x = abs(p.x);
    p.y += 0.6;
    if (p.y + p.x > 1.0)
        return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
    return sqrt(min(dot2(p - vec2(0.0, 1.0)),
                    dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

// Mandelbrot-driven path transform — yields curving lines of hearts
void mandelbrotTransform(float t, float lineIndex, out vec2 pos, out float scl, out float rotation) {
    const float LINE_COUNT_F = 4.0;
    const int MAX_ITER = 8;
    float angle = lineIndex * 6.28318 / LINE_COUNT_F + time * 0.1;
    vec2 c = vec2(cos(angle) * 0.4, sin(angle) * 0.4);
    vec2 z = vec2(0.0);
    float lastLength = 0.0;
    pos = vec2(0.0);
    scl = 0.5;
    rotation = 0.0;
    for (int i = 0; i < MAX_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (float(i) >= t * float(MAX_ITER)) {
            pos = z * 0.3;
            scl = (length(z) - lastLength) * 2.0 + 0.5;
            rotation = atan(z.y, z.x) * 2.0;
            break;
        }
        lastLength = length(z);
    }
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
    // Very tight thresholds: only the finest lines, not broad body mass
    float lace_x = smoothstep(-2.0, -5.0, log(x));  // fine vertical-ish lines
    float lace_y = smoothstep(-2.0, -5.0, log(y));  // fine horizontal-ish lines
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

    // iter 8: deep blue/violet bg from the-coat-13 palette
    float bg_grad = smoothstep(-0.5, 1.0, length(uv));
    vec3 bg_space = mix(vec3(0.04, 0.02, 0.10), vec3(0.01, 0.00, 0.04), bg_grad);

    // iter 9: lace nearly invisible — body silhouette must not read at a glance.
    // Kept just enough to feel like a faint nebula.
    float visibility = lace * 0.05;
    vec3 col = mix(bg_space, sexy_col, visibility);
    // Filigree off
    // col += vec3(0.45, 0.55, 0.85) * lace_fine * 0.04;

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

    // VJ WING-TRAVELER HEARTS (iter 8) — hearts travel along the same arcs the
    // wings/rim used to occupy. Echo of the old shader's silhouette without exposing it.
    // Heartbeat (lub-DUB) drives scale + brightness; plasma-style color cycling.
    float tHB_h = fract(time * 1.2);
    float lub_h = exp(-pow((tHB_h - 0.00) / 0.10, 2.0));
    float dub_h = exp(-pow((tHB_h - 0.20) / 0.08, 2.0)) * 0.75;
    float heart_pulse = lub_h + dub_h;

    // Two wing arcs (left + right). Each is a curve traced by an angle θ → (x,y).
    // Wing center is roughly above the focal point. The arc sweeps from θ=0 (near
    // center) up + outward to θ=1 (tip of wing). Mirror across x for the other side.
    // Audio-driven flutter: spectral-flux flutters the radius along the arc.
    float HEARTS_PER_WING = 5.0;
    for (int side = 0; side < 2; side++) {
        float sgn = side == 0 ? -1.0 : 1.0;
        for (float i = 0.0; i < 5.0; i += 1.0) {
            // t = position along wing arc, animated by time.
            // iter 10: speed scales with energy. Calm passages → hearts breathe slowly.
            // Active passages → hearts swarm. Floor at 0.04 so they never fully stop.
            float travel_speed = 0.04 + energyNormalized * 0.30 + bassNormalized * 0.10;
            float t = fract(i / HEARTS_PER_WING - time * travel_speed + float(side) * 0.07);

            // Parametric wing-arc — iter 11: arcs slowly morph so the path isn't a
            // fixed loop. arcShape oscillates over ~30s, reshaping the wing.
            float arcShape = 0.5 + 0.5 * sin(time * 0.21 + float(side) * 1.7);
            float arcWidth  = 0.55 + arcShape * 0.20;          // wing reach
            float arcHeight = 0.50 + arcShape * 0.18;          // wing height
            float arcCurl   = 0.18 + sin(time * 0.13) * 0.10;  // inward S-curve depth
            float arcX = sgn * (0.05 + t * arcWidth + sin(t * 3.14159) * arcCurl);
            float arcY = 0.05 + t * arcHeight - 0.18 * (t * t)
                       + sin(t * 6.28 + time * 0.5) * 0.04;     // small wave along Y
            // Audio flutter: radius gently breathes with flux
            arcX *= 1.0 + spectralFluxNormalized * 0.10 * sin(t * 6.28 + time * 0.7);
            vec2 hpos = vec2(arcX, arcY);

            // Per-heart rotation: hearts tilt along the arc direction
            // Rotation is the tangent angle of the curve, plus a small audio kick
            float rotation = atan(arcY - 0.05, abs(arcX)) * sgn + spectralCentroidZScore * 0.3;

            // Per-heart scale: pulse with heartbeat + small per-heart phase offset
            float perHeart = sin(i * 1.7 + time * 1.3 + float(side));
            float scl = 0.06 + 0.02 * perHeart + heart_pulse * 0.04 + bassNormalized * 0.02;

            // Render heart in this fragment's local frame
            vec2 heartUV = uv - hpos;
            heartUV = rot(rotation) * heartUV;
            heartUV /= scl;

            float d = sdHeart(heartUV);
            // Soft mask: solid inside, soft glow outside
            float fill = smoothstep(0.05, -0.05, d);
            float glow = exp(-max(d, 0.0) * 12.0) * 0.4;

            // Plasma-style color cycling — varies per side, per-heart, and over time.
            // Tuned to the-coat-13 deep-blue/cyan/magenta palette: bias hue away from green,
            // toward cyan/magenta/violet.
            vec3 col_cycle = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0)
                + i * 1.5 + t * 4.0 + time * 0.6 + spectralFluxNormalized * 2.0);
            // Bias toward magenta/blue (the-coat-13's space-blue palette)
            col_cycle = mix(col_cycle, vec3(0.9, 0.4, 0.8), 0.35);

            float bright = (0.55 + heart_pulse * 1.4 + bassNormalized * 0.4);
            col += col_cycle * (fill + glow) * bright;
        }
    }
    // Drop the base rim — wing-hearts carry the silhouette echo

    // iter 7: focal chromadepth pop OFF. The focal point should be invisible.
    // col = mix(col, chromadepth(depth) * 1.2, focal * 0.10);

    // ========================================================================
    // DROP SPOTLIGHT — dim bg, boost focal
    // ========================================================================

    float bg_dim = mix(1.0, 0.2, drop);
    float focal_boost = mix(1.0, 2.5, drop);

    // iter 7: spotlight DISABLED — it dimmed the bg around focal, revealing it.
    // float spotlight = mix(bg_dim, 1.0, focal);
    // col *= spotlight;

    // Hot focal glow — always a subtle ember, blazing on drops
    // VJ HEARTBEAT (iter 2) — DOMINANT pulse: 72bpm dual-thump drives ember + rim + bg dim.
    float tHB = fract(time * 1.2);
    float lub = exp(-pow((tHB - 0.00) / 0.10, 2.0));
    float dub = exp(-pow((tHB - 0.20) / 0.08, 2.0)) * 0.75;
    float beatShape = lub + dub;                                 // 0..~1.7
    // Floor on heart strength so it stays prominent on bassless/airy passages.
    // bass adds punch, treble keeps it alive when bass is dead.
    float heart_strength = 1.4 + bassNormalized * 0.6 + trebleNormalized * 0.5 + energyNormalized * 0.4;
    float heartbeat = 1.0 + beatShape * heart_strength;
    // Sharpen focal so heartbeat carves it out instead of washing
    float focal_sharp = pow(focal, 0.6);
    // iter 7: focal hot-spot OFF. Anatomy should not be detectable at a glance.
    // Keep a token whole-frame breathe so the bg subtly pulses with the heart-tiles.
    col = mix(col, col * vec3(1.04, 0.98, 1.0), beatShape * 0.025);
    vec3 hot_red = vec3(1.0, 0.12, 0.04);  // kept for compatibility with embers below
    float aura = 0.0;  // unused; declared so anything below referencing it still compiles
    float ember = 0.0;
    float blaze = 0.0;
    // (focal/blaze/breathe/white-hot-core all disabled this iter)

    // (heart embers removed iter 8 — replaced by wing-traveler hearts above)

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
