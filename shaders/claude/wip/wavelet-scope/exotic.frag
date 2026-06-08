// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// EXOTIC — the wavelet features we HAVEN'T visualized (derived shape + trend + combos),
// each SPRING-SMOOTHED via the wavelet-ease controller (best easing we found). A totally
// different view of the audio than the band levels.
//
// Run with: ?shader=claude/wip/wavelet-scope/exotic&wavelet=true&controller=wavelet-ease
//
//   lane 0  waveletTiltSpring          bass↔treble balance (sprung)              RED
//   lane 1  waveletSpreadSpring        spectral complexity (sprung)              ORANGE
//   lane 2  waveletCentroidSlopeSpring brightness trend rising/falling (sprung)  YELLOW
//   lane 3  waveletBassRSquaredSpring  bass trend confidence (sprung)            GREEN
//   lane 4  waveletPunchSpring         fast bass onset × FFT level combo (sprung) CYAN
//   lane 5  waveletConfirmedDropSpring cross-confirmed drop combo (sprung)       MAGENTA

uniform float waveletTiltSpring;
uniform float waveletSpreadSpring;
uniform float waveletCentroidSlopeSpring;
uniform float waveletBassRSquaredSpring;
uniform float waveletPunchSpring;
uniform float waveletConfirmedDropSpring;

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
    // tilt & slope are signed → center at 0.5; slope is tiny → big gain.
    r = lane(uv, clamp(waveletTiltSpring*0.5+0.5,0.0,1.0),          LANE_Y(0.0), vec3(0.6,0.05,0.1), vec3(1.0,0.25,0.2));  col = mix(col, r.rgb, r.a); // red TILT
    r = lane(uv, clamp(waveletSpreadSpring,0.0,1.0),               LANE_Y(1.0), vec3(0.6,0.3,0.0),  vec3(1.0,0.6,0.15));  col = mix(col, r.rgb, r.a); // orange SPREAD
    r = lane(uv, clamp(waveletCentroidSlopeSpring*300.0+0.5,0.0,1.0), LANE_Y(2.0), vec3(0.6,0.55,0.0), vec3(1.0,0.95,0.2)); col = mix(col, r.rgb, r.a); // yellow CENTROID SLOPE
    r = lane(uv, clamp(waveletBassRSquaredSpring,0.0,1.0),         LANE_Y(3.0), vec3(0.1,0.5,0.1),  vec3(0.4,1.0,0.35));  col = mix(col, r.rgb, r.a); // green BASS RSQUARED
    r = lane(uv, clamp(waveletPunchSpring,0.0,1.0),               LANE_Y(4.0), vec3(0.0,0.45,0.5), vec3(0.2,1.0,0.95));  col = mix(col, r.rgb, r.a); // cyan PUNCH
    r = lane(uv, clamp(waveletConfirmedDropSpring*0.3,0.0,1.0),   LANE_Y(5.0), vec3(0.6,0.0,0.5),  vec3(1.0,0.3,1.0));   col = mix(col, r.rgb, r.a); // magenta CONFIRMED DROP
    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
