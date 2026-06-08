// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// INDEPENDENT ACTIVITY — animation lines that move INDEPENDENTLY (not in sync). The old
// version plotted 4 flavors of bass, which all spike together on a kick (live corr 0.7-0.9)
// — useless for driving distinct visuals. These lanes each measure a DIFFERENT axis
// (verified low cross-correlation live), so they animate independently:
//
//   lane 0  waveletBassNormalized    BASS level                                 RED
//   lane 1  waveletSpread            COMPLEXITY (corr 0.05 vs bass — independent) GOLD
//   lane 2  waveletCentroid          BRIGHTNESS (corr 0.21 vs bass)             GREEN
//   lane 3  waveletBand5Normalized   TREBLE level (corr 0.37 vs bass)           CYAN
//   lane 4  energyNormalized         LOUDNESS (FFT) — song dynamics             BLUE
//   lane 5  waveletBand3Normalized   MID level                                  MAGENTA
//
// History scrolls right->left, bright persistent lines. Features are EMA-smoothed in
// WaveletProcessor so they flow. Run with ?wavelet=true.

uniform float waveletBassNormalized;
uniform float waveletSpread;
uniform float waveletCentroid;
uniform float waveletBand5Normalized;
uniform float waveletBand3Normalized;
// energyNormalized is a known FFT feature — auto-declared by the wrapper, just referenced.

#define NUM_LANES 6.0
#define MARGIN 0.012
#define GAP 0.005
#define USABLE (1.0 - 2.0*MARGIN - GAP*(NUM_LANES-1.0))
#define LANE_H (USABLE / NUM_LANES)
#define LANE_Y(i) (1.0 - MARGIN - LANE_H*0.5 - (i)*(LANE_H + GAP))

// (Smoothing now happens in WaveletProcessor — the published features are already
// EMA-smoothed to match the FFT pipeline, so the shader just plots them directly.)

vec4 lane(vec2 uv, float v01, float cy, vec3 cLo, vec3 cHi) {
    if (abs(uv.y - cy) > LANE_H * 0.5) return vec4(0.0);
    float local = (uv.y - cy) / LANE_H + 0.5;
    v01 = clamp(v01, 0.0, 1.0);
    vec3 lc = mix(cLo, cHi, v01);
    vec3 col = mix(cLo, cHi, local) * 0.07;
    if (abs(local - 0.5) < 2.0 / (LANE_H * iResolution.y)) col += cHi * 0.18;
    float dpx = abs(local - v01) * LANE_H * iResolution.y;
    float core = smoothstep(4.0, 0.0, dpx);
    float glow = smoothstep(26.0, 3.0, dpx);
    col += lc * core * 2.2 + lc * glow * 0.5;
    return vec4(col, clamp(core + glow * 0.5 + 0.10, 0.0, 1.0));
}

float zMap(float z) { return clamp(z * 0.2 + 0.5, 0.0, 1.0); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    if (floor(fragCoord.x) < floor(res.x) - 1.0) {
        vec2 p = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        fragColor = vec4(getLastFrameColor(p).rgb * 0.999, 1.0);
        return;
    }

    vec3 col = vec3(0.02, 0.02, 0.03);
    vec4 r;
    r = lane(uv, waveletBassNormalized,           LANE_Y(0.0), vec3(0.6,0.05,0.1), vec3(1.0,0.3,0.25)); col = mix(col, r.rgb, r.a); // red   BASS
    r = lane(uv, waveletSpread,                   LANE_Y(1.0), vec3(0.6,0.4,0.0),  vec3(1.0,0.9,0.2));  col = mix(col, r.rgb, r.a); // gold  COMPLEXITY
    r = lane(uv, waveletCentroid,                 LANE_Y(2.0), vec3(0.1,0.5,0.1),  vec3(0.4,1.0,0.35)); col = mix(col, r.rgb, r.a); // green BRIGHTNESS
    r = lane(uv, waveletBand5Normalized,          LANE_Y(3.0), vec3(0.0,0.45,0.5), vec3(0.2,1.0,0.95)); col = mix(col, r.rgb, r.a); // cyan  TREBLE
    r = lane(uv, clamp(energyNormalized,0.0,1.0), LANE_Y(4.0), vec3(0.05,0.2,0.6), vec3(0.4,0.6,1.0));  col = mix(col, r.rgb, r.a); // blue  LOUDNESS
    r = lane(uv, waveletBand3Normalized,          LANE_Y(5.0), vec3(0.6,0.0,0.5),  vec3(1.0,0.3,1.0));  col = mix(col, r.rgb, r.a); // magenta MID

    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
