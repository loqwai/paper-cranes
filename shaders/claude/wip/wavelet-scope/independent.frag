// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// INDEPENDENT SET v2 — now plotting the variants that match what you HEAR. A steady
// frequency glide (sweep) shows up in the RAW centroid + its SLOPE, NOT in z-scores
// (z-score measures "unusual vs baseline", so it hides steady trends). So we mix:
//   • RAW level lanes  → "where is the frequency / how complex is it right now"
//   • SLOPE lanes      → "is it rising or falling" (the literal sloping-up signal)
//   • Z-SCORE lanes    → punchy reactive hits (bass kicks)
//
//   lane 0  waveletCentroid          RAW brightness (rises as freq glides up)  ORANGE
//   lane 1  waveletCentroidSlope     is brightness RISING(+)/FALLING(-)        AMBER
//   lane 2  waveletSpread            RAW spectral complexity                   GREEN
//   lane 3  waveletBass              RAW deep-bass level                       RED
//   lane 4  waveletBand0ZScore       deep-bass HITS (reactive)                 PINK
//   lane 5  waveletBand3Normalized   mid level                                 BLUE
//   lane 6  wavelet_bassHit          sharp drop trigger                        VIOLET
//
// History scrolls right->left, one thick smooth trace per lane. Run with ?wavelet=true.

uniform float waveletCentroid;
uniform float waveletCentroidSlope;
uniform float waveletSpread;
uniform float waveletBass;
uniform float waveletBand0ZScore;
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
// slope is small; amplify and center at 0.5 so rising=up, falling=down
float slopeMap(float s) { return clamp(s * 300.0 + 0.5, 0.0, 1.0); }

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
    r = lane(uv, waveletCentroid,            LANE_Y(0.0), vec3(1.0,0.55,0.12)); col = mix(col, r.rgb, r.a); // orange RAW brightness
    r = lane(uv, slopeMap(waveletCentroidSlope), LANE_Y(1.0), vec3(1.0,0.80,0.30)); col = mix(col, r.rgb, r.a); // amber SLOPE
    r = lane(uv, waveletSpread,              LANE_Y(2.0), vec3(0.25,0.95,0.30)); col = mix(col, r.rgb, r.a); // green complexity
    r = lane(uv, clamp(waveletBass*0.3,0.0,1.0), LANE_Y(3.0), vec3(1.0,0.25,0.20)); col = mix(col, r.rgb, r.a); // red RAW bass
    r = lane(uv, zMap(waveletBand0ZScore),   LANE_Y(4.0), vec3(1.0,0.35,0.70)); col = mix(col, r.rgb, r.a); // pink bass HITS
    r = lane(uv, waveletBand3Normalized,     LANE_Y(5.0), vec3(0.30,0.50,1.0)); col = mix(col, r.rgb, r.a); // blue mid
    // bassHit lane: trace + flash
    r = lane(uv, clamp(wavelet_bassHit*0.15,0.0,1.0), LANE_Y(6.0), vec3(0.7,0.4,1.0)); col = mix(col, r.rgb, r.a);
    float hit = smoothstep(0.05, 0.3, wavelet_bassHit);
    if (abs(uv.y - LANE_Y(6.0)) < LANE_H*0.5) col = mix(col, vec3(0.9,0.7,1.0), hit*0.45);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
