// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// WAVELET VJ SCOPE — the curated maximally-independent feature set the harness picked
// across 20 signals (all pairwise |corr| <= 0.37), each tuned to its best variant.
// A blend of CHARACTER (what kind of sound) + REACTIVE (what's happening) + TRIGGER.
//
//   lane 0  waveletCentroid        brightness  (rises as freq glides up)   ROSE→RED
//   lane 1  waveletSpread          complexity  (flat noise vs pure tone)   AMBER→GOLD
//   lane 2  waveletBand3           raw mid energy                          LIME→GREEN
//   lane 3  waveletBand0ZScore     deep-bass HITS (reactive)               CYAN
//   lane 4  waveletBand5ZScore     treble HITS (reactive)                  AZURE→BLUE
//   lane 5  wavelet_bassHit        deep-bass DROP trigger                  MAGENTA→VIOLET
//
// History scrolls right->left, glowing traces on tinted lanes. Run with ?wavelet=true.

uniform float waveletCentroid;
uniform float waveletSpread;
uniform float waveletBand3;
uniform float waveletBand0ZScore;
uniform float waveletBand5ZScore;
uniform float wavelet_bassHit;

#define NUM_LANES 6.0
#define MARGIN 0.012
#define GAP 0.004
#define USABLE (1.0 - 2.0*MARGIN - GAP*(NUM_LANES-1.0))
#define LANE_H (USABLE / NUM_LANES)
#define LANE_Y(i) (1.0 - MARGIN - LANE_H*0.5 - (i)*(LANE_H + GAP))

// A glowing trace at height v01 within a lane, with a two-color gradient (cLo→cHi by
// height) and a soft bloom so it reads bright on a recording.
vec4 lane(vec2 uv, float v01, float centerY, vec3 cLo, vec3 cHi) {
    if (abs(uv.y - centerY) > LANE_H * 0.5) return vec4(0.0);
    float local = (uv.y - centerY) / LANE_H + 0.5;       // 0..1 bottom→top
    v01 = clamp(v01, 0.0, 1.0);
    vec3 lc = mix(cLo, cHi, v01); // trace color shifts with its own value

    // tinted lane background (subtle, so lanes are visually separated even when quiet)
    vec3 col = mix(cLo, cHi, local) * 0.05;
    float a = 0.10;
    // center reference line
    if (abs(local - 0.5) < 1.5 / (LANE_H * iResolution.y)) { col += cHi * 0.15; }

    float dpx = abs(local - v01) * LANE_H * iResolution.y;
    float core = smoothstep(3.0, 0.0, dpx);       // bright core
    float glow = smoothstep(22.0, 2.0, dpx);      // soft bloom
    col += lc * core * 1.6 + lc * glow * 0.35;
    a = max(a, core + glow * 0.4);
    return vec4(col, clamp(a, 0.0, 1.0));
}

float zMap(float z) { return clamp(z * 0.2 + 0.5, 0.0, 1.0); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    // scroll left with a faint trail
    if (floor(fragCoord.x) < floor(res.x) - 1.0) {
        vec2 p = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        fragColor = vec4(getLastFrameColor(p).rgb * 0.985, 1.0);
        return;
    }

    vec3 col = vec3(0.02, 0.02, 0.03);
    vec4 r;
    // CHARACTER lanes — warm spectrum
    r = lane(uv, waveletCentroid,          LANE_Y(0.0), vec3(0.6,0.05,0.25), vec3(1.0,0.35,0.45)); col = mix(col, r.rgb, r.a); // rose→red
    r = lane(uv, waveletSpread,            LANE_Y(1.0), vec3(0.7,0.35,0.0),  vec3(1.0,0.85,0.2));  col = mix(col, r.rgb, r.a); // amber→gold
    r = lane(uv, clamp(waveletBand3*0.4,0.0,1.0), LANE_Y(2.0), vec3(0.2,0.5,0.05), vec3(0.6,1.0,0.25)); col = mix(col, r.rgb, r.a); // lime→green
    // REACTIVE lanes — cool spectrum
    r = lane(uv, zMap(waveletBand0ZScore), LANE_Y(3.0), vec3(0.0,0.5,0.55),  vec3(0.2,1.0,1.0));  col = mix(col, r.rgb, r.a); // cyan
    r = lane(uv, zMap(waveletBand5ZScore), LANE_Y(4.0), vec3(0.05,0.2,0.6),  vec3(0.35,0.6,1.0)); col = mix(col, r.rgb, r.a); // azure→blue
    // TRIGGER lane — vivid magenta with a full-lane flash on fire
    r = lane(uv, clamp(wavelet_bassHit*0.15,0.0,1.0), LANE_Y(5.0), vec3(0.6,0.0,0.5), vec3(1.0,0.3,1.0)); col = mix(col, r.rgb, r.a);
    float hit = smoothstep(0.05, 0.3, wavelet_bassHit);
    if (abs(uv.y - LANE_Y(5.0)) < LANE_H*0.5) col = mix(col, vec3(1.0,0.5,1.0), hit*0.6);

    fragColor = vec4(clamp(col, 0.0, 1.5), 1.0);
}
