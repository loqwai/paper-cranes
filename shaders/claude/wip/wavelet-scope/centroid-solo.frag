// @fullscreen: true
//https://visuals.beadfamous.com/?shader=claude/wip/wavelet-scope/centroid-solo&wavelet=true&fullscreen=true
// @tags: diagnostic, wavelet, oscilloscope, debug
//
// CENTROID SOLO — one feature, full screen, BRIGHT and SMOOTHED so a frequency
// ramp/oscillation reads as a clean rising/falling line. Plots waveletCentroid
// (spectral brightness): up = pitch higher, down = pitch lower. Run with ?wavelet=true.
//
// The value is smoothed against the previous frame's plotted height (read back from the
// scrolled image) so fast jitter becomes a clean curve instead of fuzz.

uniform float waveletCentroid;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    // ---- SCROLL (and decode previous height from the rightmost-but-one column) ----
    if (floor(fragCoord.x) < floor(res.x) - 1.0) {
        vec2 p = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        fragColor = vec4(getLastFrameColor(p).rgb * 0.95, 1.0);
        return;
    }

    // Read where the line was one column back (its brightness peak height), to smooth.
    // Sample a vertical strip of the previous column and find the brightest row.
    float prevH = 0.5, best = 0.0;
    for (int i = 0; i < 64; i++) {
        float y = float(i) / 63.0;
        float b = getLastFrameColor(vec2(1.0 - 1.5 / res.x, y)).g; // green channel ~ line
        if (b > best) { best = b; prevH = y; }
    }
    float target = clamp(waveletCentroid, 0.0, 1.0);
    // smooth toward target so the trace is a clean curve (0.25 = responsive but smooth)
    float v = (best > 0.1) ? mix(prevH, target, 0.25) : target;

    // ---- DRAW the bright line ----
    float dpx = abs(uv.y - v) * res.y;
    float core = smoothstep(5.0, 0.0, dpx);    // crisp bright core
    float glow = smoothstep(70.0, 5.0, dpx);   // wide bloom

    // color sweeps with height: red(bass/low) → yellow → cyan(treble/high)
    vec3 c = v < 0.5
        ? mix(vec3(1.0, 0.25, 0.15), vec3(1.0, 0.9, 0.2), v * 2.0)
        : mix(vec3(1.0, 0.9, 0.2), vec3(0.2, 0.95, 1.0), (v - 0.5) * 2.0);

    // reference gridlines
    float grid = 0.0;
    grid += smoothstep(1.5, 0.0, abs(uv.y - 0.25) * res.y);
    grid += smoothstep(1.5, 0.0, abs(uv.y - 0.50) * res.y);
    grid += smoothstep(1.5, 0.0, abs(uv.y - 0.75) * res.y);

    vec3 col = vec3(0.03, 0.03, 0.06) + vec3(0.10, 0.10, 0.14) * grid;
    col += c * core * 2.2 + c * glow * 0.6;   // bright

    fragColor = vec4(clamp(col, 0.0, 2.0), 1.0);
}
