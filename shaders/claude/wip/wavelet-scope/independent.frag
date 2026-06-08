// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// INDEPENDENT SET — the 7 maximally-independent, lively wavelet features the headless
// harness picked across 8 varied signals (all pairwise |correlation| < 0.45). These are
// the lines to ANIMATE with: each can drive a distinct visual param without lockstep.
//
//   lane 0  waveletBand0ZScore     43-86 Hz deep bass        RED
//   lane 1  waveletCentroid        spectral brightness       ORANGE   (derived)
//   lane 2  waveletBand1ZScore     86-172 Hz low bass        YELLOW
//   lane 3  waveletSpread          spectral complexity       GREEN    (derived)
//   lane 4  waveletBand2ZScore     172-345 Hz low-mid        TEAL
//   lane 5  waveletBand3Normalized 345-689 Hz mid level      BLUE
//   lane 6  wavelet_bassHit        sharp deep-bass trigger   VIOLET (full-lane flash)
//
// History scrolls right->left, one thick smooth trace per lane. Run with ?wavelet=true.

uniform float waveletBand0ZScore;
uniform float waveletCentroid;
uniform float waveletBand1ZScore;
uniform float waveletSpread;
uniform float waveletBand2ZScore;
uniform float waveletBand3Normalized;
uniform float wavelet_bassHit;

#define NUM_LANES 7.0
#define MARGIN 0.015
#define GAP 0.006
#define USABLE (1.0 - 2.0*MARGIN - GAP*(NUM_LANES-1.0))
#define LANE_H (USABLE / NUM_LANES)
#define LANE_Y(i) (1.0 - MARGIN - LANE_H*0.5 - (i)*(LANE_H + GAP))

vec4 lane(vec2 uv, float v01, float centerY, vec3 color) {
    if (abs(uv.y - centerY) > LANE_H * 0.5) return vec4(0.0);
    float local = (uv.y - centerY) / LANE_H + 0.5;       // 0..1 bottom→top
    vec3 col = color * 0.06; float a = 0.06;
    if (abs(local - 0.5) < 1.0 / (LANE_H * iResolution.y)) { col = color * 0.22; a = 0.22; }
    float d = abs(local - clamp(v01, 0.0, 1.0)) * LANE_H * iResolution.y;
    float line = smoothstep(3.5, 0.5, d);
    col = mix(col, color * 1.3, line);
    a = max(a, line);
    return vec4(col, a);
}

float zMap(float z) { return clamp(z * 0.2 + 0.5, 0.0, 1.0); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    if (floor(fragCoord.x) < floor(res.x) - 1.0) {
        vec2 p = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        fragColor = vec4(getLastFrameColor(p).rgb * 0.99, 1.0);
        return;
    }

    vec3 col = vec3(0.012);
    vec4 r;
    r = lane(uv, zMap(waveletBand0ZScore),     LANE_Y(0.0), vec3(1.0,0.22,0.18)); col = mix(col, r.rgb, r.a); // red
    r = lane(uv, waveletCentroid,              LANE_Y(1.0), vec3(1.0,0.55,0.12)); col = mix(col, r.rgb, r.a); // orange
    r = lane(uv, zMap(waveletBand1ZScore),     LANE_Y(2.0), vec3(1.0,0.85,0.12)); col = mix(col, r.rgb, r.a); // yellow
    r = lane(uv, waveletSpread,                LANE_Y(3.0), vec3(0.25,0.95,0.30)); col = mix(col, r.rgb, r.a); // green
    r = lane(uv, zMap(waveletBand2ZScore),     LANE_Y(4.0), vec3(0.15,0.85,0.85)); col = mix(col, r.rgb, r.a); // teal
    r = lane(uv, waveletBand3Normalized,       LANE_Y(5.0), vec3(0.30,0.50,1.0));  col = mix(col, r.rgb, r.a); // blue
    // bassHit lane: trace + bright flash when it fires
    r = lane(uv, clamp(wavelet_bassHit*0.15,0.0,1.0), LANE_Y(6.0), vec3(0.7,0.4,1.0)); col = mix(col, r.rgb, r.a);
    float hit = smoothstep(0.05, 0.3, wavelet_bassHit);
    if (abs(uv.y - LANE_Y(6.0)) < LANE_H*0.5) col = mix(col, vec3(0.9,0.7,1.0), hit*0.45);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
