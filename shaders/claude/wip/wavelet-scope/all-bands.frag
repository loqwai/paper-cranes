// @fullscreen: true
//https://visuals.beadfamous.com/?shader=claude/wip/wavelet-scope/all-bands&wavelet=true&fullscreen=true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// ALL BANDS — the full octave-band spectrum, band0 (deep bass) → band5 (treble), each as
// its own line. Shows how energy moves ACROSS the spectrum over time — the complete
// multiresolution picture, not the cherry-picked subset. Normalized variant (level).
//
//   lane 0  waveletBand0Normalized   43-86 Hz    deep bass     RED
//   lane 1  waveletBand1Normalized   86-172 Hz   low bass      ORANGE
//   lane 2  waveletBand2Normalized   172-345 Hz  low-mid       YELLOW
//   lane 3  waveletBand3Normalized   345-689 Hz  mid           GREEN
//   lane 4  waveletBand4Normalized   689-1378 Hz high-mid      CYAN
//   lane 5  waveletBand5Normalized   1.4-2.8 kHz treble        VIOLET
//
// Run with ?wavelet=true.

uniform float waveletBand0Normalized;
uniform float waveletBand1Normalized;
uniform float waveletBand2Normalized;
uniform float waveletBand3Normalized;
uniform float waveletBand4Normalized;
uniform float waveletBand5Normalized;

#define NUM_LANES 6.0
#define MARGIN 0.012
#define GAP 0.005
#define USABLE (1.0 - 2.0*MARGIN - GAP*(NUM_LANES-1.0))
#define LANE_H (USABLE / NUM_LANES)
#define LANE_Y(i) (1.0 - MARGIN - LANE_H*0.5 - (i)*(LANE_H + GAP))

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
    r = lane(uv, waveletBand0Normalized, LANE_Y(0.0), vec3(0.6,0.05,0.1), vec3(1.0,0.25,0.2));  col = mix(col, r.rgb, r.a); // red
    r = lane(uv, waveletBand1Normalized, LANE_Y(1.0), vec3(0.6,0.3,0.0),  vec3(1.0,0.6,0.15));  col = mix(col, r.rgb, r.a); // orange
    r = lane(uv, waveletBand2Normalized, LANE_Y(2.0), vec3(0.6,0.55,0.0), vec3(1.0,0.95,0.2));  col = mix(col, r.rgb, r.a); // yellow
    r = lane(uv, waveletBand3Normalized, LANE_Y(3.0), vec3(0.1,0.5,0.1),  vec3(0.4,1.0,0.35));  col = mix(col, r.rgb, r.a); // green
    r = lane(uv, waveletBand4Normalized, LANE_Y(4.0), vec3(0.0,0.45,0.5), vec3(0.2,1.0,0.95));  col = mix(col, r.rgb, r.a); // cyan
    r = lane(uv, waveletBand5Normalized, LANE_Y(5.0), vec3(0.4,0.1,0.6),  vec3(0.8,0.4,1.0));   col = mix(col, r.rgb, r.a); // violet
    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
