// @fullscreen: true
// @mobile: true
// @tags: aurora, northern-lights, curtain, clit-variation
// Aurora — Wide curtain spread, y-dominant vertical lace, slow glacial drift

#define A (1.6 + spectralCentroidSlope * spectralCentroidRSquared * 0.48 + spectralCentroidZScore * 0.09 + 0.012 * sin(iTime * 0.027))
#define B (0.55 + energySlope * energyRSquared * 0.25 + energyZScore * 0.03 + 0.018 * sin(iTime * 0.0342))
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
#define PULSE (1.0 + bassZScore * 0.06)
#define FEEDBACK_MIX (0.42 + energyNormalized * 0.1)
#define RIM_INTENSITY (0.4 + trebleNormalized * 0.5)
#define GEM_BRILLIANCE (0.8 + spectralCrestNormalized * 0.5)
#define GEM_DISPERSION (0.3 + spectralSpreadNormalized * 0.4)
#define FLAP_RATE 0.05
#define FLAP_AMP 0.5
#define TENDRIL_CURL (sin(iTime * FLAP_RATE) * FLAP_AMP + sin(iTime * FLAP_RATE * 0.57) * FLAP_AMP * 0.5 + spectralCentroidSlope * spectralCentroidRSquared * 0.8 + spectralCentroidZScore * 0.05)
#define TENDRIL_CROSS (sin(iTime * FLAP_RATE * 0.77) * FLAP_AMP * 0.7 + sin(iTime * FLAP_RATE * 0.43 + 1.0) * FLAP_AMP * 0.4 + spectralSpreadSlope * spectralSpreadRSquared * 0.6 + spectralSpreadZScore * 0.04)
#define FLOW_X (spectralCentroidSlope * 0.003)
#define FLOW_Y (spectralSpreadSlope * 0.002)
#define ZSCORE_TURBULENCE (abs(bassZScore) + abs(trebleZScore) + abs(spectralCentroidZScore) + abs(spectralFluxZScore) + abs(spectralEntropyZScore))
#define ZSCORE_CALM mix(1.0, 0.0, clamp(ZSCORE_TURBULENCE / 3.0, 0.0, 1.0))
#define SLOPE_CALM mix(1.0, 0.0, clamp((abs(energySlope) + abs(bassSlope) + abs(spectralFluxSlope)) * 5.0, 0.0, 1.0))
#define TREND_CALM mix(1.0, 0.0, clamp((energyRSquared + bassRSquared + spectralFluxRSquared) / 1.5, 0.0, 1.0))
#define AUDIO_SETTLED (ZSCORE_CALM * SLOPE_CALM * TREND_CALM)
#define DROP_RAMP 0.08
#define DROP_DECAY_MIN 0.01
#define DROP_DECAY_MAX 0.06


void mainImage(out vec4 P, vec2 V) {
    vec2 Z = iResolution.xy,
         C = 0.58 * (Z - V - V).yx / Z.y;
    C.x += 0.74;
    C.y += 0.0;
    V = C + vec2(TENDRIL_CURL * 0.02, TENDRIL_CROSS * 0.015);
    float v, x, y, z = y = x = 9.;
    float focal_trap = 9.0;
    vec2 focal_center = vec2(0.0, 0.12);
    for (int k = 0; k < 50; k++) {
        float a = atan(V.y, V.x), d = dot(V, V) * A;
        float c = dot(V, vec2(a, log(max(d, 1e-10)) / 2.));
        V = exp(-a * V.y) * pow(max(d, 1e-10), V.x / 2.) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * B;
        x = min(x, abs(V.x)); y = min(y, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Z = V : Z;
        focal_trap = min(focal_trap, length(V - focal_center));
    }
    z = 1. - smoothstep(1., -6., log(max(y, 1e-10))) * smoothstep(1., -6., log(max(x, 1e-10)));
    float lace_x = smoothstep(-2.0, -5.0, log(max(x, 1e-10)));
    float lace_y = smoothstep(-2.0, -5.0, log(max(y, 1e-10)));
    float lace = max(lace_x * 0.4, lace_y);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 2.5);

    // Raw rainbow from fractal — no color_phase baked in
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0.0, 2.1, 4.2, 0.0)), vec4(0.0)));

    // Audio-driven hue rotation in oklch — perceptually uniform
    float hue_shift = spectralCentroidNormalized * 3.5 + iTime * 0.025;
    vec3 lch = rgb2oklch(rainbow.rgb);
    // Boost chroma and lightness so the rainbow stays vivid through the pipeline
    lch.x = max(lch.x, 0.3); // floor lightness — don't let it go black
    lch.y = max(lch.y * 1.6, 0.08); // vivid chroma
    // Rotate hue
    lch.z += hue_shift;
    vec3 sexy_col = oklch2rgb(lch);

    float luma = lch.x;

    float focal_glow = smoothstep(0.5, 0.01, focal_trap);
    focal_glow = pow(max(focal_glow, 0.0), 2.0);
    vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    float focal = focal_glow;
    float focal_inner = smoothstep(0.35, 0.02, focal_trap);
    float gem_rim = max(focal - pow(max(focal_inner, 0.0), 1.5), 0.0);
    gem_rim = pow(gem_rim, 0.6) * 2.5;
    float gem_detail = smoothstep(0.3, 0.8, z) * focal;
    float gem_sparkle = pow(gem_detail, 3.0);
    float gem_pulse = 0.85 + 0.15 * sin(iTime * 0.7);
    float disp = GEM_DISPERSION;
    float f_safe = max(focal, 0.0);
    vec3 gem_prism = vec3(pow(f_safe, 1.8 - disp * 0.3), pow(f_safe, 2.0), pow(f_safe, 1.8 + disp * 0.3));
    float gem_depth_shade = mix(0.4, 1.0, smoothstep(0.0, 0.7, gem_rim + gem_sparkle * 0.3));
    float drop_signal = clamp(DROP_INTENSITY * smoothstep(2.0, 4.0, ZSCORE_TURBULENCE), 0.0, 1.0);
    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float drop_state = getLastFrameColor(state_uv).a;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, mix(DROP_DECAY_MIN, DROP_DECAY_MAX, AUDIO_SETTLED));
    drop_state = clamp(drop_state, 0.0, 1.0);
    float drop = animateEaseInOutCubic(drop_state);

    // Background — deep dark violet
    vec3 bg = oklch2rgb(vec3(0.05, 0.04, 4.7));
    // Lace is a visibility mask — RGB mix is fine here
    vec3 col = mix(bg, sexy_col, lace);

    // Filigree highlights — boost lightness of existing color, not additive grey
    vec3 fil_lch = rgb2oklch(col);
    fil_lch.x += lace_fine * 0.15;
    fil_lch.y += lace_fine * 0.03; // slight chroma boost at intersections
    col = mix(col, oklch2rgb(fil_lch), step(0.001, lace_fine));

    // Rim in oklch — violet hue, added as lightness+chroma boost
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    rim *= smoothstep(0.0, 0.15, abs(C.y));
    vec3 rim_col = oklch2rgb(vec3(0.45, 0.12, 5.0)); // violet rim
    col = oklchmix(col, rim_col, rim * RIM_INTENSITY * 0.3);

    // Gem — use the rainbow's own hue shifted brighter, not a fixed color
    float glow_energy = clamp(energyNormalized + energyZScore * 0.3, 0.0, 1.0);
    vec3 gem_lch = lch;
    gem_lch.x = 0.75; // bright
    gem_lch.y = 0.15; // vivid
    vec3 gem_base = oklch2rgb(gem_lch);
    vec3 gem_fire = gem_base * 1.2;
    vec3 gem_white = vec3(1.0, 0.9, 0.95);
    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;
    vec3 gem_specular = gem_white * gem_sparkle * mix(0.4, 0.9, glow_energy) * GEM_BRILLIANCE;
    vec3 gem_rim_col = mix(gem_base * 0.5, gem_base, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * mix(0.7, 1.3, glow_energy) + gem_specular + gem_rim_col * gem_rim * GEM_BRILLIANCE;
    col = oklchmix(col, gem_col, focal * 0.85);
    col += gem_base * smoothstep(0.8, 0.0, focal_trap) * (1.0 - focal) * mix(0.08, 0.25, glow_energy) * GEM_BRILLIANCE;

    // Drop spotlight
    col *= mix(mix(1.0, 0.2, drop), 1.0, focal);
    col += gem_base * 0.5 * rim * drop * 0.2;
    col += gem_fire * focal * mix(1.0, 2.5, drop) * drop * glow_energy * 0.5;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.4;

    if (beat) { col += vec3(0.04, 0.1, 0.08) * focal; col *= 1.05; }
    col *= PULSE;

    vec4 prev = getLastFrameColor(gl_FragCoord.xy / iResolution.xy + vec2(FLOW_X, FLOW_Y));
    col = oklchmix(col, prev.rgb * 0.95, FEEDBACK_MIX);

    float vign = 1.0 - pow(length(uv) * 0.65, 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);

    // Brightness enforcement — gentle, just prevent noise in empty areas
    float bright = max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7));
    col *= mix(0.4, 1.0, bright);

    // Tone map — standard Reinhardt, then flat gamma
    col = col / (col + vec3(0.7));
    col = pow(max(col, vec3(0.0)), vec3(0.9));

    P = vec4(col, drop_state);
}
