// @fullscreen: true
//https://visuals.beadfamous.com/?shader=claude/wip/wavelet-scope/3&wavelet=true&fullscreen=true
// @tags: diagnostic, wavelet, oscilloscope, graph, drop-detector, debug
//
// WAVELET BASS vs DROP-DETECTOR — scrolling oscilloscope that overlays our new wavelet
// bass-hit line against the ACTUAL drop-detector signal we've been using
// (graph/drop-detector/1.frag), so the difference is directly visible.
//
// The drop-detector doesn't use one feature — it counts how many spectral z-scores
// exceed a threshold (PROBE_B) at the same instant. A "drop" = >=2 of
// {energy, kurtosis, entropy, flux, rolloff} spiking together. We reproduce that exact
// logic here as its own line so it can be compared, not approximated.
//
//   CYAN     = wavelet_bassZ            (our new detector — continuous bass-hit strength)
//   WHITE col= wavelet_bassHit fired    (our drop trigger)
//   ORANGE   = drop-detector highZScores/5  (the signal we've been using, 0..1)
//   ORANGE col (top band) = drop-detector "drop" fired (>=2 z-scores over threshold)
//
//   Faint reference lines of the drop-detector's own inputs:
//   dim RED=energyZ  dim GREEN=kurtosisZ  dim YELLOW=entropyZ  dim TEAL=fluxZ  dim GRAY=rolloffZ
//
// Run with ?wavelet=true. PROBE_B matches the drop-detector default (0.95).

uniform float wavelet_bassZ;
uniform float wavelet_bassHit;
uniform float wavelet_bassEnergy;

#define PROBE_B 0.95           // drop-detector threshold (from graph/drop-detector/1.frag)
#define DROP_MIN 2             // >=2 simultaneous spikes = a "drop"
#define ULTRA_DROP_COUNT 5

// The exact features the drop-detector counts.
#define DD_RED    energyZScore
#define DD_GREEN  spectralKurtosisZScore
#define DD_YELLOW spectralEntropyZScore
#define DD_TEAL   spectralFluxZScore
#define DD_GRAY   spectralRolloffZScore

float zToY(float z) { return clamp((z + 2.5) / 5.0, 0.0, 1.0); }
bool onLine(vec2 fragCoord, float h01, float w) { return abs(fragCoord.y - h01 * resolution.y) < w; }

// Reproduce the drop-detector's core: count z-scores past the threshold.
int dropCount() {
    int n = 0;
    if (abs(DD_RED)    > PROBE_B) n++;
    if (abs(DD_GREEN)  > PROBE_B) n++;
    if (abs(DD_YELLOW) > PROBE_B) n++;
    if (abs(DD_TEAL)   > PROBE_B) n++;
    if (abs(DD_GRAY)   > PROBE_B) n++;
    return n;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // ---- SCROLL LEFT ----
    if (uv.x < 0.99) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x;
        fragColor = getLastFrameColor(prevUV);
        fragColor.rgb *= 0.992; // gentle trail fade
        if (abs(uv.y - 0.5) < 1.5 / resolution.y) fragColor.rgb = max(fragColor.rgb, vec3(0.12));
        return;
    }

    // ---- NEW SAMPLE COLUMN ----
    vec3 col = vec3(0.0);
    if (abs(uv.y - 0.5) < 1.5 / resolution.y) col = vec3(0.18); // z=0 baseline

    float lw = 3.0;

    // Faint drop-detector input lines (so you can see WHICH features it's reacting to).
    if (onLine(fragCoord, zToY(DD_RED),    lw)) col = max(col, vec3(0.35, 0.05, 0.05));
    if (onLine(fragCoord, zToY(DD_GREEN),  lw)) col = max(col, vec3(0.05, 0.30, 0.05));
    if (onLine(fragCoord, zToY(DD_YELLOW), lw)) col = max(col, vec3(0.30, 0.30, 0.05));
    if (onLine(fragCoord, zToY(DD_TEAL),   lw)) col = max(col, vec3(0.10, 0.18, 0.35));
    if (onLine(fragCoord, zToY(DD_GRAY),   lw)) col = max(col, vec3(0.22, 0.26, 0.22));

    // DROP-DETECTOR aggregate signal: highZScores / 5, drawn as a bold ORANGE line.
    // This IS the signal we've been using to fire drops. Plotted 0 (bottom) .. 1 (top).
    int dc = dropCount();
    float ddLevel = float(dc) / float(ULTRA_DROP_COUNT);
    if (onLine(fragCoord, ddLevel, lw + 1.0)) col = vec3(1.0, 0.55, 0.0); // orange

    // WAVELET bass line (cyan, on top).
    if (onLine(fragCoord, zToY(wavelet_bassZ), lw + 1.0)) col = vec3(0.0, 0.95, 1.0);

    // ---- EVENT FLASHES (two separate columns, stacked) ----
    // Top band: drop-detector "drop" fired (>=2 z-scores over threshold) — ORANGE.
    if (uv.y > 0.94 && dc >= DROP_MIN) {
        col = mix(col, vec3(1.0, 0.55, 0.0), 0.85);
    }
    // Full-column WHITE flash: our wavelet bass hit fired.
    float hit = smoothstep(0.02, 0.12, wavelet_bassHit);
    if (uv.y <= 0.94) col = mix(col, vec3(1.0), hit * 0.6);

    fragColor = vec4(col, 1.0);
}
