// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// BASSLINE — a FLOWING line that follows the BASSLINE NOTES (which low note is playing),
// not just low-end energy. bassNoteFlow (from wavelet-ease controller) is an energy-weighted
// "bass centroid" across the low bands: low note → bottom, higher bass note → top, eased so
// it flows. Gated by bass presence so it holds when the bass is silent.
//
// Run: ?shader=claude/wip/wavelet-scope/bassline&wavelet=true&controller=wavelet-ease
//
//   lane 0  bassNoteFlow         BASSLINE NOTE — follows the bass melody/groove   RED
//            → verify: bass plays a higher note → line rises; lower note → falls
//   lane 1  waveletBassSpring    BASS ENERGY — how MUCH low end (for comparison)  ORANGE
//   lane 2  wavelet_bassHit      KICK — the downbeat                              YELLOW
//   lane 3  waveletBand0Spring   deep bass (43-86Hz) level                        GREEN
//   lane 4  waveletBand1Spring   low bass (86-172Hz) level                        CYAN
//   lane 5  energySpring         loudness                                         MAGENTA

uniform float bassNoteFlow;
uniform float waveletBassSpring;
uniform float wavelet_bassHit;
uniform float waveletBand0Spring;
uniform float waveletBand1Spring;
uniform float energySpring;

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
    r = lane(uv, clamp(bassNoteFlow,0.0,1.0),         LANE_Y(0.0), vec3(0.6,0.05,0.1), vec3(1.0,0.25,0.2)); col = mix(col, r.rgb, r.a); // red BASSLINE NOTE
    r = lane(uv, clamp(waveletBassSpring*2.0,0.0,1.0),LANE_Y(1.0), vec3(0.6,0.3,0.0),  vec3(1.0,0.6,0.15)); col = mix(col, r.rgb, r.a); // orange BASS ENERGY
    r = beatLane(uv, wavelet_bassHit,                 LANE_Y(2.0), vec3(1.0,0.9,0.2));                      col = mix(col, r.rgb, r.a); // yellow KICK
    r = lane(uv, clamp(waveletBand0Spring,0.0,1.0),   LANE_Y(3.0), vec3(0.1,0.5,0.1),  vec3(0.4,1.0,0.35)); col = mix(col, r.rgb, r.a); // green BAND0
    r = lane(uv, clamp(waveletBand1Spring,0.0,1.0),   LANE_Y(4.0), vec3(0.0,0.45,0.5), vec3(0.2,1.0,0.95)); col = mix(col, r.rgb, r.a); // cyan BAND1
    r = lane(uv, energySpring,                        LANE_Y(5.0), vec3(0.6,0.0,0.5),  vec3(1.0,0.3,1.0));  col = mix(col, r.rgb, r.a); // magenta LOUDNESS
    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
