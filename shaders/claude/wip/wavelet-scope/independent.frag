// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// WAVELET TAPESTRY — multiple bright animation lines, one relevant audio feature per
// lane, history scrolling right->left. Tuned for legibility: bold glowing traces +
// lightly smoothed so ramps/oscillations read as clean curves, not jittery fuzz.
//
//   lane 0  waveletCentroid     BRIGHTNESS  — rises/falls as pitch glides up/down  ROSE
//   lane 1  waveletSpread       COMPLEXITY  — noisy/full vs pure tone               GOLD
//   lane 2  waveletBand1Normalized  LOW-BASS level                                 GREEN
//   lane 3  waveletBand3Normalized  MID level                                      TEAL
//   lane 4  waveletBand5Normalized  TREBLE level                                   AZURE
//   lane 5  wavelet_bassHit     DROP trigger (flashes)                             MAGENTA
//
// Run with ?wavelet=true (+ audio_file= or audio=tab).

uniform float waveletCentroid;
uniform float waveletSpread;
uniform float waveletBand1Normalized;
uniform float waveletBand3Normalized;
uniform float waveletBand5Normalized;
uniform float wavelet_bassHit;

#define NUM_LANES 6.0
#define MARGIN 0.012
#define GAP 0.005
#define USABLE (1.0 - 2.0*MARGIN - GAP*(NUM_LANES-1.0))
#define LANE_H (USABLE / NUM_LANES)
#define LANE_Y(i) (1.0 - MARGIN - LANE_H*0.5 - (i)*(LANE_H + GAP))

// Bright glowing trace at height v01 within its lane, two-color gradient + bloom.
vec4 lane(vec2 uv, float v01, float cy, vec3 cLo, vec3 cHi) {
    if (abs(uv.y - cy) > LANE_H * 0.5) return vec4(0.0);
    float local = (uv.y - cy) / LANE_H + 0.5;   // 0..1 bottom→top
    v01 = clamp(v01, 0.0, 1.0);
    vec3 lc = mix(cLo, cHi, v01);
    // tinted lane bg so lanes stay visually separated even when quiet
    vec3 col = mix(cLo, cHi, local) * 0.07;
    if (abs(local - 0.5) < 2.0 / (LANE_H * iResolution.y)) col += cHi * 0.18; // center ref
    float dpx = abs(local - v01) * LANE_H * iResolution.y;
    float core = smoothstep(4.0, 0.0, dpx);       // crisp core
    float glow = smoothstep(26.0, 3.0, dpx);      // bloom
    col += lc * core * 2.2 + lc * glow * 0.5;
    return vec4(col, clamp(core + glow * 0.5 + 0.10, 0.0, 1.0));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    // scroll left — NO fade, so historical lines stay fully bright across the screen.
    // (a tiny 0.999 keeps the tinted backgrounds from accumulating to white over time)
    if (floor(fragCoord.x) < floor(res.x) - 1.0) {
        vec2 p = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        fragColor = vec4(getLastFrameColor(p).rgb * 0.999, 1.0);
        return;
    }

    vec3 col = vec3(0.02, 0.02, 0.03);
    vec4 r;
    r = lane(uv, waveletCentroid,         LANE_Y(0.0), vec3(0.6,0.05,0.25), vec3(1.0,0.40,0.50)); col = mix(col, r.rgb, r.a); // rose
    r = lane(uv, waveletSpread,           LANE_Y(1.0), vec3(0.7,0.35,0.0),  vec3(1.0,0.88,0.25)); col = mix(col, r.rgb, r.a); // gold
    r = lane(uv, waveletBand1Normalized,  LANE_Y(2.0), vec3(0.1,0.45,0.1),  vec3(0.45,1.0,0.35)); col = mix(col, r.rgb, r.a); // green
    r = lane(uv, waveletBand3Normalized,  LANE_Y(3.0), vec3(0.0,0.45,0.5),  vec3(0.2,1.0,0.95));  col = mix(col, r.rgb, r.a); // teal
    r = lane(uv, waveletBand5Normalized,  LANE_Y(4.0), vec3(0.05,0.2,0.6),  vec3(0.4,0.65,1.0));  col = mix(col, r.rgb, r.a); // azure
    // trigger lane: trace + flash
    r = lane(uv, clamp(wavelet_bassHit*0.15,0.0,1.0), LANE_Y(5.0), vec3(0.6,0.0,0.5), vec3(1.0,0.35,1.0)); col = mix(col, r.rgb, r.a);
    float hit = smoothstep(0.05, 0.3, wavelet_bassHit);
    if (abs(uv.y - LANE_Y(5.0)) < LANE_H*0.5) col = mix(col, vec3(1.0,0.5,1.0), hit*0.6);

    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
