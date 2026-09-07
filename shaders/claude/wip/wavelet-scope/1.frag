// @fullscreen: true
//https://visuals.beadfamous.com/?shader=claude/wip/wavelet-scope/1&wavelet=true&fullscreen=true
// @tags: diagnostic, wavelet, debug
//
// WAVELET SCOPE — diagnostic for the DWT prototype (?wavelet=true).
// Left  : 6 octave-band meters (low→high) from the wavelet transform.
//         Each band's height = its z-score (spiking vs its own baseline).
// Right : the FFT spectralFlux z-score, for side-by-side onset comparison.
// Top strip: WAVELET onset (cyan) vs FFT spectralFlux z (magenta) — the key A/B.
//   Watch a kick: the cyan bar should snap up and back FASTER/TIGHTER than magenta
//   if the wavelet onset really localizes transients better than the 85ms FFT window.
//
// Requires ?wavelet=true so window.cranes.waveletFeatures is populated.
// wavelet_band0..5, wavelet_band0Z..5Z, wavelet_onset, wavelet_onsetSmooth,
// wavelet_bass are injected as uniforms automatically (do NOT redeclare).

#define BANDS 6

// Wavelet prototype uniforms — these come from window.cranes.waveletFeatures, which
// is NOT in the known hypnosound feature list, so they must be declared explicitly.
// twgl binds them from the features map; if ?wavelet=true is absent they read 0.
uniform float wavelet_band0;
uniform float wavelet_band1;
uniform float wavelet_band2;
uniform float wavelet_band3;
uniform float wavelet_band4;
uniform float wavelet_band5;
uniform float wavelet_band0Z;
uniform float wavelet_band1Z;
uniform float wavelet_band2Z;
uniform float wavelet_band3Z;
uniform float wavelet_band4Z;
uniform float wavelet_band5Z;
uniform float wavelet_onset;
uniform float wavelet_onsetSmooth;
uniform float wavelet_bass;

// Draw a filled bar from y=0 up to `h` within an [x0,x1] column. Returns coverage 0/1.
float bar(vec2 uv, float x0, float x1, float h) {
    if (uv.x < x0 || uv.x > x1) return 0.0;
    return step(uv.y, h);
}

float waveletBandZ(int i) {
    if (i == 0) return wavelet_band0Z;
    if (i == 1) return wavelet_band1Z;
    if (i == 2) return wavelet_band2Z;
    if (i == 3) return wavelet_band3Z;
    if (i == 4) return wavelet_band4Z;
    return wavelet_band5Z;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy; // 0..1, y up

    vec3 col = vec3(0.02, 0.02, 0.04); // near-black background

    // ---- TOP STRIP: onset A/B comparison (top 18% of screen) ----
    if (uv.y > 0.82) {
        float t = (uv.y - 0.82) / 0.18; // 0..1 within strip
        // Wavelet onset on the left third's worth of width, full-width split L/R
        float wOnset = clamp(wavelet_onset * 6.0, 0.0, 1.0);      // raw, sharp
        float fFlux  = clamp(spectralFluxZScore, 0.0, 1.0);       // FFT comparison
        // Left half = wavelet (cyan), right half = FFT flux (magenta)
        if (uv.x < 0.5) {
            float h = wOnset;
            col = mix(col, vec3(0.0, 0.9, 1.0), step(t, h));
        } else {
            float h = fFlux;
            col = mix(col, vec3(1.0, 0.0, 0.7), step(t, h));
        }
        // center divider
        col = mix(col, vec3(0.3), step(abs(uv.x - 0.5), 0.002));
        fragColor = vec4(col, 1.0);
        return;
    }

    // ---- MAIN AREA: meters (bottom 82%) ----
    float meterY = uv.y / 0.82; // remap so meters use the lower region

    // RIGHT 30%: FFT spectralFlux z-score reference meter
    if (uv.x > 0.7) {
        float h = clamp(spectralFluxZScore * 0.5 + 0.5, 0.0, 1.0);
        float fill = step(meterY, h);
        col = mix(col, vec3(1.0, 0.2, 0.6), fill);
        // baseline at 0.5 (z=0)
        col = mix(col, vec3(0.4), step(abs(meterY - 0.5), 0.004));
        fragColor = vec4(col, 1.0);
        return;
    }

    // LEFT 70%: six wavelet octave-band z-score meters
    float region = 0.7;
    float colW = region / float(BANDS);
    int idx = int(uv.x / colW);
    idx = clamp(idx, 0, BANDS - 1);
    float z = waveletBandZ(idx);
    float h = clamp(z * 0.5 + 0.5, 0.0, 1.0); // z=0 → mid height

    float x0 = float(idx) * colW + 0.005;
    float x1 = float(idx + 1) * colW - 0.005;
    float fill = bar(vec2(uv.x, meterY), x0, x1, h);

    // Hue per band: low bands warm (red/orange), high bands cool (blue/violet) —
    // mirrors chromadepth depth ordering so you can read frequency at a glance.
    float hue = float(idx) / float(BANDS - 1) * 0.7; // 0=red .. 0.7=violet
    vec3 bandCol = hsl2rgb(vec3(hue, 0.85, 0.55));
    col = mix(col, bandCol, fill);

    // onset flash: when wavelet_onset fires, flash a white horizontal line across
    // the whole left meter area — this is the "did the kick land sharply" tell.
    float flash = smoothstep(0.08, 0.25, wavelet_onset);
    col = mix(col, vec3(1.0), flash * step(abs(meterY - 0.95), 0.02));

    // baseline at z=0
    col = mix(col, vec3(0.25), step(abs(meterY - 0.5), 0.003));

    fragColor = vec4(col, 1.0);
}
