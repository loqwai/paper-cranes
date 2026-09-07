// @fullscreen: true
//https://visuals.beadfamous.com/?shader=claude/wip/wavelet-scope/2&wavelet=true&fullscreen=true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// WAVELET BASS OSCILLOSCOPE — scrolling line comparison of the wavelet bass-hit
// detector vs the traditional FFT features, for the deep-bass-on-phone-mic use case.
//
// Scrolls left every frame (frame-feedback idiom from graph/line-z-score.frag) and
// plots a new sample in the rightmost column. Watch which line spikes cleanly on each
// bass hit and which smear / miss:
//
//   CYAN    = wavelet_bassZ        (our new detector — harmonic-weighted, self-calibrating)
//   RED     = bassZScore           (traditional FFT bass z-score)
//   YELLOW  = energyZScore         (traditional energy z-score)
//   MAGENTA = spectralFluxZScore   (the current de-facto drop signal)
//
// White full-height flash column = wavelet_bassHit fired this frame (a detected drop).
//
// Center line = z=0. Range mapped is roughly z ∈ [-2.5, +2.5].
// Run with ?wavelet=true so the wavelet uniforms are populated.

// Wavelet prototype uniforms (not in the known feature list — declare explicitly).
uniform float wavelet_bassZ;
uniform float wavelet_bassHit;
uniform float wavelet_bassEnergy;

// Map a z-score (~[-2.5,2.5]) to a 0..1 vertical screen position.
float zToY(float z) {
    return clamp((z + 2.5) / 5.0, 0.0, 1.0);
}

// Is the current row within `w` pixels of the plotted value at height `h01`?
bool onLine(vec2 fragCoord, float h01, float w) {
    return abs(fragCoord.y - h01 * resolution.y) < w;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // ---- SCROLL: shift everything left by sampling one pixel to the right ----
    if (uv.x < 0.99) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x;
        fragColor = getLastFrameColor(prevUV);
        // gently fade old trails so the graph doesn't smear to mush over time
        fragColor.rgb *= 0.992;
        // faint center baseline (z=0) drawn into the scrolled history too
        if (abs(uv.y - 0.5) < 1.5 / resolution.y) fragColor.rgb = max(fragColor.rgb, vec3(0.12));
        return;
    }

    // ---- NEW SAMPLE COLUMN (rightmost ~1%) ----
    vec3 col = vec3(0.0);

    // baseline at z=0
    if (abs(uv.y - 0.5) < 1.5 / resolution.y) col = vec3(0.18);

    float lw = 4.0; // line half-width in pixels

    // Plot order: draw traditional first, wavelet last so cyan sits on top.
    if (onLine(fragCoord, zToY(spectralFluxZScore), lw)) col = vec3(1.0, 0.0, 0.7); // magenta
    if (onLine(fragCoord, zToY(energyZScore),       lw)) col = vec3(1.0, 1.0, 0.0); // yellow
    if (onLine(fragCoord, zToY(bassZScore),         lw)) col = vec3(1.0, 0.15, 0.1); // red
    if (onLine(fragCoord, zToY(wavelet_bassZ),      lw + 1.0)) col = vec3(0.0, 0.95, 1.0); // cyan (ours, thicker)

    // HIT FLASH: when the wavelet bass-hit fires, paint the whole new column white-ish
    // so a detected drop is unmissable as a vertical strobe scrolling across.
    float hit = smoothstep(0.02, 0.12, wavelet_bassHit);
    col = mix(col, vec3(1.0), hit * 0.7);

    fragColor = vec4(col, 1.0);
}
