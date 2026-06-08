// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// MELODY — a FLOWING line that tracks the synth melody/key (not jumpy raw pitch). The
// melodyFlow signal (from wavelet-ease controller) eases around the pitch CIRCLE toward
// the current note, gated by tonal confidence, so it glides between sustained notes — a
// smooth contour you can match to the melody by ear. Shown vs raw pitch + anchors.
//
// Run: ?shader=claude/wip/wavelet-scope/melody&wavelet=true&controller=wavelet-ease
//
//   lane 0  melodyFlow            FLOWING MELODY — glides with the synth notes   YELLOW
//            → verify: synth riff goes up → line rises; sustained note → line holds
//   lane 1  pitchClassNormalized  raw pitch (jumpy reference, for comparison)    DIM GRAY
//   lane 2  tonalStrength         HOW MELODIC — tonal (synth/chord) vs noisy      GREEN
//            → verify: clear synth/melody → high; drums/noise → low
//   lane 3  waveletBassSpring     BASS anchor (so you can orient)                RED
//   lane 4  wavelet_bassHit       KICK anchor (beat reference)                   ORANGE
//   lane 5  energySpring          LOUDNESS                                       MAGENTA

uniform float melodyFlow;
uniform float tonalStrength;
uniform float waveletBassSpring;
uniform float wavelet_bassHit;
uniform float energySpring;
// pitchClassNormalized auto-declared (FFT feature).

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

vec4 beatLane(vec2 uv, float hit, float cy, vec3 color) {
    if (abs(uv.y - cy) > LANE_H * 0.5) return vec4(0.0);
    float fire = smoothstep(0.04, 0.12, hit);
    return vec4(color * 0.05 + color * fire * 2.2, clamp(0.06 + fire, 0.0, 1.0));
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
    r = lane(uv, clamp(melodyFlow,0.0,1.0),           LANE_Y(0.0), vec3(0.6,0.55,0.0), vec3(1.0,0.95,0.2)); col = mix(col, r.rgb, r.a); // yellow MELODY FLOW
    r = lane(uv, clamp(pitchClassNormalized,0.0,1.0), LANE_Y(1.0), vec3(0.2,0.2,0.2),  vec3(0.5,0.5,0.5));  col = mix(col, r.rgb, r.a); // gray raw pitch
    r = lane(uv, clamp(tonalStrength*1.5,0.0,1.0),    LANE_Y(2.0), vec3(0.1,0.5,0.1),  vec3(0.4,1.0,0.35)); col = mix(col, r.rgb, r.a); // green TONAL
    r = lane(uv, clamp(waveletBassSpring*2.0,0.0,1.0),LANE_Y(3.0), vec3(0.6,0.05,0.1), vec3(1.0,0.25,0.2)); col = mix(col, r.rgb, r.a); // red BASS
    r = beatLane(uv, wavelet_bassHit,                 LANE_Y(4.0), vec3(1.0,0.55,0.1));                     col = mix(col, r.rgb, r.a); // orange KICK
    r = lane(uv, energySpring,                        LANE_Y(5.0), vec3(0.6,0.0,0.5),  vec3(1.0,0.3,1.0));  col = mix(col, r.rgb, r.a); // magenta LOUDNESS
    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
