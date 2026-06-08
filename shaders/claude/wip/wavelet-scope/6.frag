// @fullscreen: true
// @tags: diagnostic, wavelet, meters, graph, drop-detector, debug
//
// SPLIT METERS (live-debug) — vertical split, filled bar meters instead of thin
// confetti-prone lines so the comparison is legible on noisy live tab audio.
//
//   TOP HALF    = NEW wavelet features
//     6 stacked horizontal bars, one per octave band (red=deep bass .. violet=treble),
//     each fills left->right by its z-score. Big white flash across the top edge when
//     wavelet_bassHit fires (the deep-bass drop trigger).
//
//   BOTTOM HALF = OLD drop-detector features (graph/drop-detector/1.frag logic)
//     5 stacked bars for its z-score inputs (energy/kurtosis/entropy/flux/rolloff),
//     each turns BRIGHT when it crosses PROBE_B. A wide aggregate bar shows
//     dropCount/5. Big orange flash across the bottom when a drop fires (>=2 over threshold).
//
// Bars grow from screen center outward to both sides so a spike reads as a symmetric
// pulse. Run with ?wavelet=true  (and ?audio=tab for live Spotify).

uniform float wavelet_band0Z;
uniform float wavelet_band1Z;
uniform float wavelet_band2Z;
uniform float wavelet_band3Z;
uniform float wavelet_band4Z;
uniform float wavelet_band5Z;
uniform float wavelet_bassHit;
uniform float wavelet_bassZ;

#define PROBE_B 0.95
#define DROP_MIN 2
#define DD_RED    energyZScore
#define DD_GREEN  spectralKurtosisZScore
#define DD_YELLOW spectralEntropyZScore
#define DD_TEAL   spectralFluxZScore
#define DD_GRAY   spectralRolloffZScore

vec3 bandColor(float t) { return hsl2rgb(vec3(t * 0.78, 0.9, 0.55)); }

// A centered horizontal bar in a horizontal slot [y0,y1]. `val01` in 0..1 sets how far
// it fills from center (x=0.5) toward both edges. Returns intensity 0..1 for this pixel.
float bar(vec2 uv, float y0, float y1, float val01) {
    if (uv.y < y0 || uv.y >= y1) return 0.0;
    float reach = clamp(val01, 0.0, 1.0) * 0.5;
    float distFromCenter = abs(uv.x - 0.5);
    // soft edge
    return 1.0 - smoothstep(reach - 0.004, reach + 0.004, distFromCenter);
}

// map a z-score to 0..1 fill (|z| so spikes either direction fill the bar)
float zFill(float z) { return clamp(abs(z) / 2.0, 0.0, 1.0); }

int dropCount() {
    int n = 0;
    if (abs(DD_RED)>PROBE_B) n++; if (abs(DD_GREEN)>PROBE_B) n++; if (abs(DD_YELLOW)>PROBE_B) n++;
    if (abs(DD_TEAL)>PROBE_B) n++; if (abs(DD_GRAY)>PROBE_B) n++;
    return n;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;
    vec3 col = vec3(0.015);

    // center vertical reference + divider
    if (abs(uv.x - 0.5) < 1.0 / resolution.x) col = vec3(0.15);
    if (abs(uv.y - 0.5) < 2.0 / resolution.y) { fragColor = vec4(0.3,0.3,0.3,1.0); return; }

    if (uv.y > 0.5) {
        // ===== TOP: NEW wavelet octave bands =====
        // 6 bands stacked in [0.52, 0.98]; band0 (bass) at the BOTTOM of the top half
        // (nearest the divider) so bass sits in the middle of the screen.
        float zs[6];
        zs[0]=wavelet_band0Z; zs[1]=wavelet_band1Z; zs[2]=wavelet_band2Z;
        zs[3]=wavelet_band3Z; zs[4]=wavelet_band4Z; zs[5]=wavelet_band5Z;
        float lo = 0.52, hi = 0.97, slot = (hi - lo) / 6.0;
        for (int i = 0; i < 6; i++) {
            float y0 = lo + float(i) * slot + 0.004;
            float y1 = lo + float(i+1) * slot - 0.004;
            float b = bar(uv, y0, y1, zFill(zs[i]));
            col = mix(col, bandColor(float(i) / 5.0), b);
        }
        // bass-hit flash strip along the very top
        float hit = smoothstep(0.02, 0.12, wavelet_bassHit);
        if (uv.y > 0.975) col = mix(col, vec3(1.0), hit);
    } else {
        // ===== BOTTOM: OLD drop-detector inputs =====
        float zs[5];
        zs[0]=DD_RED; zs[1]=DD_GREEN; zs[2]=DD_YELLOW; zs[3]=DD_TEAL; zs[4]=DD_GRAY;
        vec3 cols[5];
        cols[0]=vec3(1.0,0.15,0.1); cols[1]=vec3(0.1,1.0,0.2); cols[2]=vec3(1.0,0.9,0.1);
        cols[3]=vec3(0.3,0.5,1.0); cols[4]=vec3(0.6,0.7,0.6);
        float lo = 0.06, hi = 0.48, slot = (hi - lo) / 5.0;
        for (int i = 0; i < 5; i++) {
            float y0 = lo + float(i) * slot + 0.004;
            float y1 = lo + float(i+1) * slot - 0.004;
            float b = bar(uv, y0, y1, zFill(zs[i]));
            // brighten when this z-score is past the drop threshold
            float over = step(PROBE_B, abs(zs[i]));
            vec3 c = mix(cols[i] * 0.5, cols[i], over);
            col = mix(col, c, b);
        }
        // aggregate dropCount/5 as a wide bar just under the divider
        int dc = dropCount();
        float agg = bar(uv, 0.485, 0.5, float(dc) / 5.0);
        col = mix(col, vec3(1.0, 0.55, 0.0), agg);
        // drop-fired flash strip along the very bottom
        if (uv.y < 0.025 && dc >= DROP_MIN) col = vec3(1.0, 0.55, 0.0);
    }

    fragColor = vec4(col, 1.0);
}
