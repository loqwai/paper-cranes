// http://localhost:6969/?shader=onset-envelope-demo
//
// Three rings, three onset envelopes, three timescales. See docs/onset-detection.md.
//
// Nothing here is smoothed and nothing is damped through frame feedback. Every
// animated value comes from an envelope that was SYNTHESIZED from a discrete
// trigger, so it cannot shudder — there is no audio left in its path — and it
// does not lag, because nothing is averaging it.
//
// Compare: swap any `onsetKick` below for `bassNormalized` and watch the ring
// both arrive late and jitter. That is the tradeoff this layer removes.

#define KICK  onsetKick    // 20-200Hz,  220ms tail — weight
#define SNARE onsetSnare   // 200-2000Hz, 150ms tail — the backbeat
#define HAT   onsetHat     // 4-12kHz,    90ms tail — dry ticks

// Mood layer: slow, laggy, and that is fine. Palette has no business being snappy.
#define MOOD spectralCentroidNormalized

vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

// A ring whose radius and thickness are driven by an envelope.
float ring(vec2 uv, float radius, float thickness) {
    return smoothstep(thickness, 0.0, abs(length(uv) - radius));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * resolution) / min(resolution.x, resolution.y);

    vec3 color = vec3(0.0);

    // KICK — the body. Envelope drives radius directly, no damping.
    // Peak height already carries how hard the hit was.
    color += palette(MOOD) * ring(uv, 0.18 + KICK * 0.16, 0.02 + KICK * 0.05) * (0.4 + KICK);

    // SNARE — a wider, dimmer ring on the backbeat, hue offset so the two
    // layers stay visually distinct instead of pulsing as one.
    color += palette(MOOD + 0.33) * ring(uv, 0.34 + SNARE * 0.10, 0.015) * (0.3 + SNARE * 1.2);

    // HAT — sparkle at the rim. Short decay reads as ticks, not a wash.
    float angle = atan(uv.y, uv.x);
    float sparkle = pow(abs(sin(angle * 24.0)), 8.0);
    color += palette(MOOD + 0.67) * sparkle * ring(uv, 0.46, 0.03) * HAT * 2.0;

    // Strength differentiates a hard hit from a loud one: hard kicks bloom white.
    color = mix(color, vec3(1.0), KICK * onsetKickStrength * 0.35);

    // A hard gate built from age, showing the roll-your-own-curve pattern:
    // a brief flash at the very centre for 60ms after each kick.
    color += vec3(step(onsetKickAge, 0.06)) * smoothstep(0.05, 0.0, length(uv)) * 0.6;

    // Resting glow so silence isn't black.
    color += palette(MOOD) * 0.04;

    fragColor = vec4(color, 1.0);
}
