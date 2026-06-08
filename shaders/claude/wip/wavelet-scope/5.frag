// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, drop-detector, debug
//
// SPLIT SCOPE — vertical split comparison, both halves scrolling independently.
//
//   TOP HALF    = NEW wavelet features
//     band0Z..band5Z octave z-scores (red=bass .. violet=treble), bass line thick/on top
//     white full-height tick at the top edge when wavelet_bassHit fires
//
//   BOTTOM HALF = OLD drop-detector features (graph/drop-detector/1.frag logic)
//     its five input z-scores (energy/kurtosis/entropy/flux/rolloff) + orange aggregate
//     orange tick at the bottom edge when its drop fires (>=2 z-scores over PROBE_B)
//
// Each half has its own z=0 baseline at its vertical center. Run with ?wavelet=true.

uniform float wavelet_band0Z;
uniform float wavelet_band1Z;
uniform float wavelet_band2Z;
uniform float wavelet_band3Z;
uniform float wavelet_band4Z;
uniform float wavelet_band5Z;
uniform float wavelet_bassHit;

#define PROBE_B 0.95
#define DROP_MIN 2
#define ULTRA 5.0
#define DD_RED    energyZScore
#define DD_GREEN  spectralKurtosisZScore
#define DD_YELLOW spectralEntropyZScore
#define DD_TEAL   spectralFluxZScore
#define DD_GRAY   spectralRolloffZScore

bool onLine(float fy, float h01, float w) { return abs(fy - h01 * resolution.y) < w; }
vec3 bandColor(float t) { return hsl2rgb(vec3(t * 0.78, 0.9, 0.55)); }

// Map z to a 0..1 position WITHIN a half: lo..hi are the half's screen bounds.
float zToHalf(float z, float lo, float hi) {
    float c = clamp((z + 2.5) / 5.0, 0.0, 1.0); // 0..1 of the half
    return mix(lo, hi, c);
}

int dropCount() {
    int n = 0;
    if (abs(DD_RED)>PROBE_B) n++; if (abs(DD_GREEN)>PROBE_B) n++; if (abs(DD_YELLOW)>PROBE_B) n++;
    if (abs(DD_TEAL)>PROBE_B) n++; if (abs(DD_GRAY)>PROBE_B) n++;
    return n;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    bool top = uv.y >= 0.5;
    // Per-half bounds (small margin off the divider/edges).
    float lo = top ? 0.52 : 0.02;
    float hi = top ? 0.98 : 0.48;
    float mid = (lo + hi) * 0.5; // this half's z=0 line

    // ---- SCROLL LEFT (sampling stays within this half, so halves don't bleed) ----
    if (uv.x < 0.99) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x;
        fragColor = getLastFrameColor(prevUV);
        fragColor.rgb *= 0.992;
        if (abs(uv.y - mid) < 1.5 / resolution.y) fragColor.rgb = max(fragColor.rgb, vec3(0.12));
        // hard divider line at y=0.5
        if (abs(uv.y - 0.5) < 2.0 / resolution.y) fragColor.rgb = vec3(0.3);
        return;
    }

    // ---- NEW SAMPLE COLUMN ----
    vec3 col = vec3(0.0);
    if (abs(uv.y - mid) < 1.5 / resolution.y) col = vec3(0.18); // this half's z=0 baseline
    if (abs(uv.y - 0.5) < 2.0 / resolution.y) { fragColor = vec4(0.3,0.3,0.3,1.0); return; } // divider

    float lw = 3.0;

    if (top) {
        // NEW: wavelet band z-scores (high first, bass last/on top)
        if (onLine(fragCoord.y, zToHalf(wavelet_band5Z, lo, hi), lw)) col = bandColor(1.00);
        if (onLine(fragCoord.y, zToHalf(wavelet_band4Z, lo, hi), lw)) col = bandColor(0.80);
        if (onLine(fragCoord.y, zToHalf(wavelet_band3Z, lo, hi), lw)) col = bandColor(0.60);
        if (onLine(fragCoord.y, zToHalf(wavelet_band2Z, lo, hi), lw)) col = bandColor(0.40);
        if (onLine(fragCoord.y, zToHalf(wavelet_band1Z, lo, hi), lw)) col = bandColor(0.20);
        if (onLine(fragCoord.y, zToHalf(wavelet_band0Z, lo, hi), lw + 1.0)) col = bandColor(0.0);
        // bass-hit tick at the very top edge
        float hit = smoothstep(0.02, 0.12, wavelet_bassHit);
        if (uv.y > 0.95) col = mix(col, vec3(1.0), hit * 0.85);
    } else {
        // OLD: drop-detector inputs + aggregate
        if (onLine(fragCoord.y, zToHalf(DD_GRAY,   lo, hi), lw)) col = vec3(0.5, 0.6, 0.5);
        if (onLine(fragCoord.y, zToHalf(DD_TEAL,   lo, hi), lw)) col = vec3(0.3, 0.4, 1.0);
        if (onLine(fragCoord.y, zToHalf(DD_YELLOW, lo, hi), lw)) col = vec3(1.0, 1.0, 0.0);
        if (onLine(fragCoord.y, zToHalf(DD_GREEN,  lo, hi), lw)) col = vec3(0.0, 1.0, 0.0);
        if (onLine(fragCoord.y, zToHalf(DD_RED,    lo, hi), lw)) col = vec3(1.0, 0.15, 0.1);
        // aggregate highZScores/5 as a 0(bottom)..1(top of half) orange line
        int dc = dropCount();
        float agg = float(dc) / ULTRA;
        if (onLine(fragCoord.y, mix(lo, hi, agg), lw + 1.0)) col = vec3(1.0, 0.55, 0.0);
        // drop-fired tick at the very bottom edge
        if (uv.y < 0.05 && dc >= DROP_MIN) col = vec3(1.0, 0.55, 0.0);
    }

    fragColor = vec4(col, 1.0);
}
