// @fullscreen: true
//https://visuals.beadfamous.com/?shader=claude/wip/wavelet-scope/combined&wavelet=true&fullscreen=true
// @tags: diagnostic, wavelet, fft, oscilloscope, graph, debug
//
// WAVELET × FFT COMBINED SCOPE — showcases cross-domain combined features next to the
// pure wavelet ones. The harness proved wavelet onsets are independent from ALL FFT
// features, so these blends (wavelet=WHEN, FFT=WHAT) add real information.
//
//   lane 0  waveletCentroid       pure wavelet brightness            ROSE
//   lane 1  waveletSpread         pure wavelet complexity            GOLD
//   lane 2  spectralCentroid      pure FFT brightness (precise)      GREEN
//   lane 3  wavelet_punch         COMBO: fast bass onset + accurate level   CYAN
//   lane 4  wavelet_confirmedDrop COMBO: drop cross-confirmed by both domains  BLUE
//   lane 5  wavelet_bassHit       pure wavelet trigger (for comparison)  MAGENTA
//
// Watch lane 5 (wavelet alone) vs lane 4 (cross-confirmed): lane 4 fires only when the
// FFT energy ALSO rises — fewer false drops. Run with ?wavelet=true.

uniform float waveletCentroid;
uniform float waveletSpread;
uniform float wavelet_punch;
uniform float wavelet_confirmedDrop;
uniform float wavelet_bassHit;
// NOTE: spectralCentroid is a known FFT feature — auto-declared by the wrapper, so we
// do NOT declare it here (redeclaration is a compile error). Just reference it.

#define NUM_LANES 6.0
#define MARGIN 0.012
#define GAP 0.004
#define USABLE (1.0 - 2.0*MARGIN - GAP*(NUM_LANES-1.0))
#define LANE_H (USABLE / NUM_LANES)
#define LANE_Y(i) (1.0 - MARGIN - LANE_H*0.5 - (i)*(LANE_H + GAP))

vec4 lane(vec2 uv, float v01, float centerY, vec3 cLo, vec3 cHi) {
    if (abs(uv.y - centerY) > LANE_H * 0.5) return vec4(0.0);
    float local = (uv.y - centerY) / LANE_H + 0.5;
    v01 = clamp(v01, 0.0, 1.0);
    vec3 lc = mix(cLo, cHi, v01);
    vec3 col = mix(cLo, cHi, local) * 0.05;
    float a = 0.10;
    if (abs(local - 0.5) < 1.5 / (LANE_H * iResolution.y)) col += cHi * 0.15;
    float dpx = abs(local - v01) * LANE_H * iResolution.y;
    float core = smoothstep(3.0, 0.0, dpx);
    float glow = smoothstep(22.0, 2.0, dpx);
    col += lc * core * 1.6 + lc * glow * 0.35;
    a = max(a, core + glow * 0.4);
    return vec4(col, clamp(a, 0.0, 1.0));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    if (floor(fragCoord.x) < floor(res.x) - 1.0) {
        vec2 p = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        fragColor = vec4(getLastFrameColor(p).rgb * 0.985, 1.0);
        return;
    }

    vec3 col = vec3(0.02, 0.02, 0.03);
    vec4 r;
    r = lane(uv, waveletCentroid,                       LANE_Y(0.0), vec3(0.6,0.05,0.25), vec3(1.0,0.35,0.45)); col = mix(col, r.rgb, r.a); // rose (wavelet bright)
    r = lane(uv, waveletSpread,                         LANE_Y(1.0), vec3(0.7,0.35,0.0),  vec3(1.0,0.85,0.2));  col = mix(col, r.rgb, r.a); // gold (wavelet complexity)
    r = lane(uv, clamp(spectralCentroid*0.7,0.0,1.0),   LANE_Y(2.0), vec3(0.2,0.5,0.05),  vec3(0.6,1.0,0.25));  col = mix(col, r.rgb, r.a); // green (FFT bright)
    r = lane(uv, clamp(wavelet_punch,0.0,1.0),          LANE_Y(3.0), vec3(0.0,0.5,0.55),  vec3(0.2,1.0,1.0));   col = mix(col, r.rgb, r.a); // cyan (COMBO punch)
    r = lane(uv, clamp(wavelet_confirmedDrop*0.3,0.0,1.0), LANE_Y(4.0), vec3(0.05,0.2,0.6), vec3(0.35,0.6,1.0)); col = mix(col, r.rgb, r.a); // blue (COMBO drop)
    r = lane(uv, clamp(wavelet_bassHit*0.15,0.0,1.0),   LANE_Y(5.0), vec3(0.6,0.0,0.5),   vec3(1.0,0.3,1.0));   col = mix(col, r.rgb, r.a); // magenta (wavelet trigger)
    float hit = smoothstep(0.05, 0.3, wavelet_bassHit);
    if (abs(uv.y - LANE_Y(5.0)) < LANE_H*0.5) col = mix(col, vec3(1.0,0.5,1.0), hit*0.6);

    fragColor = vec4(clamp(col, 0.0, 1.5), 1.0);
}
