// @fullscreen: true
// @tags: diagnostic, onset, comparison
//
// Old vs new, same music, side by side.
//   Left (blue):    the old way — a smoothed continuous feature drives the
//                   circle's size directly. One signal is both measurement and
//                   animation, so it jitters with the signal and lags the hit.
//   Right (orange): onset event + designed response. The detector fires a
//                   discrete trigger; onsetEnvelope shapes the motion. Nothing
//                   noisy remains in the animation path, and nothing smoothed
//                   delays the attack.
//
// knob_71: envelope attack  (seconds = knob * 0.1, default ~8ms)
// knob_72: envelope release (seconds = knob * 0.5, default ~220ms)
// Detector tuning: ?onset_sensitivity=3&onset_refractory_ms=120&onset_high_hz=200 (kick-focused)

#define ATTACK max(knob_71 * 0.1, 0.008)
#define RELEASE max(knob_72 * 0.5, 0.22)

float circle(vec2 p, float r) {
    return smoothstep(0.008, -0.008, length(p) - r);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    float aspect = resolution.x / resolution.y;

    bool oldSide = uv.x < 0.5;
    vec2 p = uv - (oldSide ? vec2(0.25, 0.5) : vec2(0.75, 0.5));
    p.x *= aspect;

    float radius;
    vec3 color;
    if (oldSide) {
        // OLD: measurement drives animation directly
        radius = 0.12 + 0.10 * energyNormalized + 0.05 * spectralFluxZScore;
        color = vec3(0.35, 0.5, 1.0);
    } else {
        // NEW: event triggers a designed one-shot; strength scales the punch
        float env = onsetEnvelope(ATTACK, RELEASE);
        radius = 0.12 + 0.15 * env * (0.4 + 0.6 * onsetStrength);
        color = vec3(1.0, 0.6, 0.2);
        if (onset) color = vec3(1.0); // single-frame trigger flash
    }
    radius = clamp(radius, 0.02, 0.45);

    vec3 bg = vec3(0.03, 0.03, 0.05) + (oldSide ? vec3(0.0) : vec3(0.02, 0.01, 0.0));
    fragColor = vec4(mix(bg, color, circle(p, radius)), 1.0);

    if (abs(uv.x - 0.5) * resolution.x < 1.0) fragColor.rgb = vec3(0.25);
}
