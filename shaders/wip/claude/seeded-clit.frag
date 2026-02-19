// @fullscreen: true
// @mobile: true
// @tags: chromadepth, 3d, body, sexy, seeded

// Seeded variant of clit/2 — each device gets unique color palette & texture
// Focal point (anatomical hotspot) stays fixed; seeds control palette, lace, rim

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

#define A mapValue(spectralCentroidZScore, 0., 1., 1.2, 1.8) + 0.1
#define B (0.55 + energyZScore * 0.15)
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
#define PULSE (1.0 + bassZScore * 0.06)
#define FEEDBACK_MIX (0.25 + energyNormalized * 0.1)
#define RIM_INTENSITY (0.4 + trebleNormalized * 0.6)
#define RIM_WARMTH (0.3 + spectralRoughnessNormalized * 0.4)

// ============================================================================
// SEED-BASED PALETTE — oklch for perceptual uniformity
// seed: lace color hue, seed2: rim hue, seed3: background hue, seed4: focal warmth
// ============================================================================

vec3 seededChromadepth(float t) {
    t = clamp(t, 0.0, 1.0);
    // seed3 rotates the entire chromadepth hue wheel
    float hueBase = seed3 * 6.2831853;
    float hue = hueBase + t * 0.82 * 6.28318;
    float chromaBoost = 1.0 + 0.2 * sin(t * 3.14159 * 2.0);
    float L = 0.7 - t * 0.45;
    float C = 0.25 * chromaBoost * (1.0 - t * 0.3);
    return clamp(oklch2rgb(vec3(L, C, hue)), 0.0, 1.0);
}

vec3 seededWarmChromadepth(float depth, float warmth) {
    vec3 cd = seededChromadepth(depth);
    // seed4 controls focal point color temperature
    // low seed4 = cool magenta focal, high seed4 = hot orange focal
    float focalHue = mix(5.5, 0.8, seed4);  // magenta → red-orange in oklch hue
    vec3 close_col = clamp(oklch2rgb(vec3(0.65, 0.22, focalHue)), 0.0, 1.0);
    // Background always deep & dark, seed3 tints it
    float bgHue = seed3 * 6.2831853 + 4.5;  // shifted toward violet/blue
    vec3 far_col = clamp(oklch2rgb(vec3(0.06, 0.04, bgHue)), 0.0, 1.0);
    vec3 warm_tint = mix(close_col, far_col, depth);
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

    // Orbit trap — focal point stays anatomically fixed
    float focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);

    // seed2 rotates the orbit trap axes — different lace patterns per device
    float trapAngle = seed2 * 3.14159;
    float trapCos = cos(trapAngle);
    float trapSin = sin(trapAngle);

    // seed also blends between axis-aligned and radial traps
    float radialMix = seed * 0.6;  // 0-0.6: how much radial trap vs axis trap

    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x),
        d = dot(V, V) * A;
        float c = dot(V, vec2(a, log(d) / 2.));
        V = exp(-a * V.y) * pow(d, V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * B;

        // Rotated orbit trap axes — creates different lace line orientations
        vec2 rotV = vec2(V.x * trapCos - V.y * trapSin,
                         V.x * trapSin + V.y * trapCos);
        // Blend between rotated axis trap and radial trap
        float trapX = mix(abs(rotV.x), length(V) - 0.5, radialMix);
        float trapY = mix(abs(rotV.y), abs(atan(V.y, V.x) / 3.14159), radialMix);

        x = min(x, max(trapX, 0.0001));
        y = min(y, max(trapY, 0.0001));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;

        float fd = length(V - focal_center);
        focal_trap = min(focal_trap, fd);
    }

    z = 1. - smoothstep(1., -6., log(y)) * smoothstep(1., -6., log(x));

    // Lace/filigree — seed2 also controls density
    float laceThresh = -2.5 + fract(seed2 * 3.7) * 1.5;
    float lace_x = smoothstep(laceThresh, laceThresh - 3.0, log(x));
    float lace_y = smoothstep(laceThresh, laceThresh - 3.0, log(y));
    float lace = max(lace_x, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(lace, 3.0);

    vec4 rainbow = sqrt(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0, 2.1, 4.2, 0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));

    // Focal point detection
    float focal_glow = smoothstep(0.5, 0.01, focal_trap);
    focal_glow = pow(focal_glow, 3.0);

    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    float focal = focal_glow;

    // Chromadepth mapping — same depth logic, seeded colors
    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    float is_detail = smoothstep(0.0, 0.5, edge * 30.0);
    base_depth = mix(base_depth, detail_depth, is_detail * 0.6);
    float focal_strength = pow(focal, 1.5);
    float depth = mix(base_depth, 0.0, focal_strength);

    // Drop/build
    float drop = DROP_INTENSITY;
    float build = BUILD_INTENSITY;
    depth = mix(depth, depth * 0.7, build * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);

    // ========================================================================
    // SEEDED COLOR — lace gets seed-tinted rainbow, bg is seed-tinted dark
    // ========================================================================

    // Tint the rainbow lace color with seed hue
    vec3 sexy_col = rainbow.rgb;
    vec3 laceOklch = rgb2oklch(sexy_col);
    laceOklch.z += seed * 6.2831853;  // seed rotates lace hue
    laceOklch.y = clamp(laceOklch.y + 0.02, 0.0, 0.2);
    sexy_col = clamp(oklch2rgb(laceOklch), 0.0, 1.0);

    // Background — deep & dark, seed3 tints
    float bgHue = seed3 * 6.2831853 + 4.5;
    vec3 bg_deep = clamp(oklch2rgb(vec3(0.07, 0.05, bgHue)), 0.0, 1.0);

    float visibility = lace;
    vec3 col = mix(bg_deep, sexy_col, visibility);

    // Pearly filigree — seed shifts the pearl tint
    float pearlHue = seed * 6.2831853 + 1.0;
    vec3 pearl = clamp(oklch2rgb(vec3(0.8, 0.06, pearlHue)), 0.0, 1.0);
    col += pearl * lace_fine * 0.25;

    // Rim lighting — seed2 controls rim hue
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    float center_fade = smoothstep(0.0, 0.15, abs(C.y));
    rim *= center_fade;

    float rimHue1 = seed2 * 6.2831853 + 4.0;  // cool side
    float rimHue2 = seed2 * 6.2831853 + 0.5;  // warm side
    vec3 rim_cool = clamp(oklch2rgb(vec3(0.45, 0.15, rimHue1)), 0.0, 1.0);
    vec3 rim_warm = clamp(oklch2rgb(vec3(0.6, 0.18, rimHue2)), 0.0, 1.0);
    vec3 rim_col = mix(rim_cool, rim_warm, RIM_WARMTH);

    col += rim_col * rim * RIM_INTENSITY * 0.3;

    // Focal point — seeded chromadepth
    col = mix(col, seededChromadepth(depth) * 1.2, focal * 0.3);

    // ========================================================================
    // DROP SPOTLIGHT
    // ========================================================================

    float bg_dim = mix(1.0, 0.2, drop);
    float focal_boost = mix(1.0, 2.5, drop);
    float spotlight = mix(bg_dim, 1.0, focal);
    col *= spotlight;

    // Focal glow — seed4 controls warmth (cool magenta → hot orange)
    float focalHue = mix(5.5, 0.8, seed4);
    vec3 hot_col = clamp(oklch2rgb(vec3(0.6, 0.25, focalHue)), 0.0, 1.0);
    float ember = focal * 0.2;
    float blaze = focal * focal_boost * 0.5 * drop;
    col += hot_col * (ember + blaze);
    // White-hot core on drops
    col += vec3(1.0, 0.7, 0.4) * pow(focal, 3.0) * drop * 0.6;

    // ========================================================================
    // FINISHING
    // ========================================================================

    if (beat) {
        col += hot_col * 0.15 * focal;
        col *= 1.05;
    }

    col *= PULSE;

    // Frame feedback
    vec2 fbUv = gl_FragCoord.xy / iResolution.xy;
    vec4 prev = getLastFrameColor(fbUv);
    col = mix(col, prev.rgb * 0.95, FEEDBACK_MIX);

    // Vignette
    float vign = 1.0 - pow(length(uv) * 0.65, 1.8);
    vign = mix(vign, pow(vign, 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Brightness gating
    float bright_allowed = max(max(lace, rim * 0.5), focal);
    col *= mix(0.15, 1.0, bright_allowed);

    // Tone mapping
    col = col / (col + vec3(0.7));

    // Gamma
    col = pow(max(col, vec3(0.0)), vec3(0.88, 0.9, 0.95));

    P = vec4(col, 1.0);
}
