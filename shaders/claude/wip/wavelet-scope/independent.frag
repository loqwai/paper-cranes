// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// INDEPENDENT QUINTET — the maximally-independent wavelet features the headless
// harness picked (all pairwise |correlation| < 0.5 across 8 varied signals). These
// are the lines we want to ANIMATE with: lively, low-jitter, and mutually independent
// so they can drive distinct visual params without moving in lockstep.
//
//   lane 0  waveletBand0ZScore    43-86 Hz   deep bass        RED
//   lane 1  waveletBand1ZScore    86-172 Hz  low bass         ORANGE
//   lane 2  waveletBand2Normalized 172-345Hz low-mid          YELLOW
//   lane 3  waveletBand3ZScore    345-689 Hz mid              GREEN
//   lane 4  wavelet_bassHit       sharp deep-bass drop trigger CYAN (full-edge flash)
//
// History scrolls right->left, one thick smooth trace per lane. Run with ?wavelet=true.

uniform float waveletBand0ZScore;
uniform float waveletBand1ZScore;
uniform float waveletBand2Normalized;
uniform float waveletBand3ZScore;
uniform float wavelet_bassHit;

#define NUM_LANES 5.0
#define MARGIN 0.02
#define GAP 0.008
#define USABLE (1.0 - 2.0*MARGIN - GAP*(NUM_LANES-1.0))
#define LANE_H (USABLE / NUM_LANES)
#define LANE_Y(i) (1.0 - MARGIN - LANE_H*0.5 - (i)*(LANE_H + GAP))

// trace one value (already 0..1) into a lane; returns rgba
vec4 lane(vec2 uv, float v01, float centerY, vec3 color) {
    float halfH = LANE_H * 0.5;
    if (abs(uv.y - centerY) > halfH) return vec4(0.0);
    float local = (uv.y - centerY) / LANE_H + 0.5;       // 0..1 bottom→top of lane
    vec3 col = color * 0.06; float a = 0.06;
    // center reference
    if (abs(local - 0.5) < 1.0 / (LANE_H * iResolution.y)) { col = color * 0.22; a = 0.22; }
    float d = abs(local - clamp(v01, 0.0, 1.0)) * LANE_H * iResolution.y;
    float line = smoothstep(3.5, 0.5, d);
    col = mix(col, color * 1.3, line);
    a = max(a, line);
    return vec4(col, a);
}

// map a z-score (~[-2.5,2.5]) to 0..1
float zMap(float z) { return clamp(z * 0.2 + 0.5, 0.0, 1.0); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    // scroll
    if (floor(fragCoord.x) < floor(res.x) - 1.0) {
        vec2 p = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        vec3 prev = getLastFrameColor(p).rgb * 0.99;
        fragColor = vec4(prev, 1.0);
        return;
    }

    vec3 col = vec3(0.012);
    vec4 r;
    r = lane(uv, zMap(waveletBand0ZScore),   LANE_Y(0.0), vec3(1.0,0.25,0.20)); col = mix(col, r.rgb, r.a); // red
    r = lane(uv, zMap(waveletBand1ZScore),   LANE_Y(1.0), vec3(1.0,0.55,0.15)); col = mix(col, r.rgb, r.a); // orange
    r = lane(uv, waveletBand2Normalized,     LANE_Y(2.0), vec3(1.0,0.85,0.15)); col = mix(col, r.rgb, r.a); // yellow
    r = lane(uv, zMap(waveletBand3ZScore),   LANE_Y(3.0), vec3(0.25,0.95,0.35)); col = mix(col, r.rgb, r.a); // green
    // bassHit lane: trace + a bright flash across the lane when it fires
    r = lane(uv, clamp(wavelet_bassHit * 0.15, 0.0, 1.0), LANE_Y(4.0), vec3(0.1,0.9,1.0)); col = mix(col, r.rgb, r.a);
    float hit = smoothstep(0.05, 0.3, wavelet_bassHit);
    if (abs(uv.y - LANE_Y(4.0)) < LANE_H*0.5) col = mix(col, vec3(0.6,1.0,1.0), hit*0.4);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
