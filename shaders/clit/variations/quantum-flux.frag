// @fullscreen: true
// @mobile: true
// @tags: quantum, ethereal, flux, clit-variation
// Quantum Flux — Dense mesh detail, fast jitter, flux-driven color sweep

#define A (1.875 + spectralCentroidSlope * spectralCentroidRSquared * 0.44 + spectralCentroidZScore * 0.0825 + 0.028 * sin(iTime * 0.043))
#define B (0.47 + energySlope * energyRSquared * 0.325 + energyZScore * 0.039 + 0.03 * sin(iTime * 0.045))
#define DROP_INTENSITY clamp(-energySlope * energyRSquared * 15.0, 0.0, 1.0)
#define BUILD_INTENSITY clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0)
#define PULSE (1.0 + bassZScore * 0.06)
#define FEEDBACK_MIX (0.18 + energyNormalized * 0.1)
#define RIM_INTENSITY (0.4 + trebleNormalized * 0.5)
#define GEM_BRILLIANCE (0.8 + spectralCrestNormalized * 0.5)
#define GEM_DISPERSION (0.3 + spectralSpreadNormalized * 0.4)
#define FLAP_RATE 0.35
#define FLAP_AMP 0.25
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
         C = 0.6 * (Z - V - V).yx / Z.y;
    C.x += 0.82;
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
    float lace = max(lace_x * 0.8, lace_y * 0.8);
    float lace_fine = lace_x * lace_y;
    lace = pow(max(lace, 0.0), 3.0);
    // Rainbow with audio-driven color phase
    float color_phase = 1.0 + spectralFluxNormalized * 4.0;
    vec4 rainbow = sqrt(max(z + (z - z * z * z) * cos(atan(Z.y, Z.x) - vec4(0.0, 2.1, 4.2, 0.0) + color_phase), vec4(0.0)));
    float luma = dot(rainbow.rgb, vec3(0.299, 0.587, 0.114));
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
    float base_depth = mix(0.6, 0.95, 1.0 - luma);
    float detail_depth = mix(0.2, 0.5, luma);
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    base_depth = mix(base_depth, detail_depth, smoothstep(0.0, 0.5, edge * 30.0) * 0.6);
    float depth = mix(base_depth, 0.0, pow(max(focal, 0.0), 1.5));
    float drop_signal = clamp(DROP_INTENSITY * smoothstep(2.0, 4.0, ZSCORE_TURBULENCE), 0.0, 1.0);
    vec2 state_uv = gl_FragCoord.xy / iResolution.xy;
    float drop_state = getLastFrameColor(state_uv).a;
    drop_state = mix(drop_state, 1.0, drop_signal * DROP_RAMP);
    drop_state = mix(drop_state, 0.0, mix(DROP_DECAY_MIN, DROP_DECAY_MAX, AUDIO_SETTLED));
    drop_state = clamp(drop_state, 0.0, 1.0);
    float drop = animateEaseInOutCubic(drop_state);
    depth = mix(depth, depth * 0.7, BUILD_INTENSITY * 0.3);
    depth = mix(depth, depth * 1.3, drop * (1.0 - focal));
    depth = mix(depth, 0.0, drop * focal);
    depth = clamp(depth, 0.0, 1.0);
    vec3 sexy_col = rainbow.rgb;
    vec3 bg = vec3(0.01, 0.01, 0.04);
    vec3 col = mix(bg, sexy_col, lace);
    col += vec3(0.65, 0.68, 0.7) * lace_fine * 0.25;
    float rim = abs(dFdx(z)) + abs(dFdy(z));
    rim = smoothstep(0.1, 0.5, rim * 20.0);
    rim *= smoothstep(0.0, 0.15, abs(C.y));
    col += vec3(0.48, 0.5, 0.52) * rim * RIM_INTENSITY * 0.3;
    float glow_energy = clamp(energyNormalized + energyZScore * 0.3, 0.0, 1.0);
    vec3 gem_base = vec3(0.6, 0.8, 1.0);
    vec3 gem_fire = gem_base * 1.2;
    vec3 gem_white = vec3(1.0, 0.9, 0.95);
    vec3 gem_interior = gem_prism * gem_base * gem_pulse * gem_depth_shade;
    vec3 gem_specular = gem_white * gem_sparkle * mix(0.4, 0.9, glow_energy) * GEM_BRILLIANCE;
    vec3 gem_rim_col = mix(gem_base * 0.5, gem_base, smoothstep(0.0, 1.0, gem_rim));
    vec3 gem_col = gem_interior * GEM_BRILLIANCE * mix(0.7, 1.3, glow_energy) + gem_specular + gem_rim_col * gem_rim * GEM_BRILLIANCE;
    col = mix(col, gem_col, focal * 0.85);
    col += gem_base * smoothstep(0.8, 0.0, focal_trap) * (1.0 - focal) * mix(0.08, 0.25, glow_energy) * GEM_BRILLIANCE;
    col *= mix(mix(1.0, 0.2, drop), 1.0, focal);
    col += gem_base * 0.5 * rim * drop * 0.2;
    col += gem_fire * focal * mix(1.0, 2.5, drop) * drop * glow_energy * 0.5;
    col += gem_white * pow(f_safe, 2.5) * drop * glow_energy * 0.4;
    if (beat) { col += vec3(0.06, 0.08, 0.12) * focal; col *= 1.05; }
    col *= PULSE;
    vec4 prev = getLastFrameColor(gl_FragCoord.xy / iResolution.xy + vec2(FLOW_X, FLOW_Y));
    col = mix(col, prev.rgb * 0.95, FEEDBACK_MIX);
    float vign = 1.0 - pow(length(uv) * 0.65, 1.8);
    vign = mix(vign, pow(max(vign, 0.0), 1.0 + drop * 2.0), drop);
    col *= max(vign, 0.02);
    col *= mix(0.15, 1.0, max(max(lace, rim * 0.5), max(focal, gem_rim * 0.7)));
    col = col / (col + vec3(0.7));
    col = pow(max(col, vec3(0.0)), vec3(0.9, 0.89, 0.88));
    P = vec4(col, drop_state);
}
