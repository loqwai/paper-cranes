// @fullscreen: true
// @tags: diagnostic, onset, graph
//
// Scrolling diagnostic for the onset detector vs the old `beat` boolean.
//   Top lane:    cyan = onsetFlux, orange = onsetThreshold (adaptive).
//                A green strobe marks each `onset` trigger frame.
//   Middle lane: magenta ticks = the old `beat` (level-triggered — watch it
//                smear across frames and double-fire where green fires once).
//   Bottom strip: onsetEnvelope(0.01, 0.25) scaled by onsetStrength — the
//                designed response. Smooth by construction: nothing noisy
//                remains in its path, yet it starts on the trigger frame.
//
// Tune live from the URL or edit-page sliders:
//   ?onset_sensitivity=3&onset_ratio=1.5&onset_refractory_ms=120&onset_low_hz=0&onset_high_hz=200
// knob_79 raises the vertical scale if the flux trace clips.

#define PLOT_BOTTOM 0.32
#define PLOT_TOP 0.97
#define BEAT_BOTTOM 0.17
#define BEAT_TOP 0.30
#define ENV_TOP 0.15
#define VMAX (40.0 * (1.0 + knob_79 * 4.0))

float traceY(float v) {
    return PLOT_BOTTOM + clamp(v / VMAX, 0.0, 1.0) * (PLOT_TOP - PLOT_BOTTOM);
}

float trace(vec2 uv, float v) {
    float d = abs(uv.y - traceY(v)) * resolution.y;
    return smoothstep(1.8, 0.4, d);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // Scroll history one pixel left per frame; draw new samples at the right edge
    if (uv.x < 0.99) {
        fragColor = getLastFrameColor(uv + vec2(1.0 / resolution.x, 0.0));
        return;
    }

    fragColor = vec4(0.0, 0.0, 0.0, 1.0);

    // Faint lane separators
    if (abs(uv.y - ENV_TOP) * resolution.y < 1.0 || abs(uv.y - (BEAT_TOP + 0.01)) * resolution.y < 1.0)
        fragColor.rgb = vec3(0.12);

    if (uv.y > PLOT_BOTTOM - 0.02) {
        fragColor.rgb += vec3(0.0, 0.9, 1.0) * trace(uv, onsetFlux);
        fragColor.rgb += vec3(1.0, 0.55, 0.0) * trace(uv, onsetThreshold);
        if (onset) fragColor.rgb = mix(fragColor.rgb, vec3(0.4, 1.0, 0.4), 0.85);
    } else if (uv.y > BEAT_BOTTOM && uv.y < BEAT_TOP) {
        if (beat) fragColor.rgb = vec3(1.0, 0.2, 0.8);
    } else if (uv.y < ENV_TOP) {
        float env = onsetEnvelope(0.01, 0.25) * (0.35 + 0.65 * onsetStrength);
        fragColor.rgb = vec3(1.0, 0.85, 0.5) * env;
    }
}
