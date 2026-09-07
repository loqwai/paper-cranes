// @fullscreen: true
//https://visuals.beadfamous.com/?shader=claude/wip/wavelet-scope/bass-activity&wavelet=true&fullscreen=true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// INDEPENDENT ACTIVITY — animation lines that move INDEPENDENTLY (not in sync). The old
// version plotted 4 flavors of bass, which all spike together on a kick (live corr 0.7-0.9)
// — useless for driving distinct visuals. These lanes each measure a DIFFERENT axis
// (verified low cross-correlation live), so they animate independently:
//
// MIC-TUNED (live /loop): SMOOTH flowing lines for continuous animation + clean TRIGGERS
// for hits — no noisy z-score lines. Measured in-room: these 4 smooth movers are lively
// (sd>0.08) AND smooth (jitter<0.1) AND independent (pairwise |corr|<0.58). The 2 trigger
// lanes are z-scores rendered as THRESHOLDED pulses (clean bars, not jittery lines).
//
//   SMOOTH LINES (drive continuous visual params):
//   lane 0  energyNormalized         LOUDNESS — song dynamics       BLUE
//   lane 1  waveletBand5Normalized   TREBLE level                   CYAN
//   lane 2  waveletBand3Normalized   MID level                      GREEN
//   lane 3  waveletBand1Normalized   LOW-BASS level                 ORANGE
//
//   TRIGGERS (drive discrete events — flash bars when they fire):
//   lane 4  waveletBand5ZScore       TREBLE hit                     YELLOW
//   lane 5  waveletBassZScore        BASS hit                       MAGENTA
//
// History scrolls right->left. Smooth features are EMA-smoothed in WaveletProcessor.
// Run with ?wavelet=true.

uniform float waveletBand5Normalized;
uniform float waveletBand3Normalized;
uniform float waveletBand1Normalized;
uniform float waveletBand5ZScore;
uniform float waveletBassZScore;
// energyNormalized is a known FFT feature — auto-declared by the wrapper, just referenced.

#define Z_FIRE 0.8 // raw z-score above which a trigger fires (a genuine positive spike)

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

// Trigger lane: flashes when the RAW z-score spikes POSITIVE (a real hit), not on the
// baseline. Bug fix: previously fired on zMap(z)>0.4, but zMap(0)=0.5 so it was on ~99%
// of the time. Now fires only when z > Z_FIRE (a genuine positive anomaly).
vec4 triggerLane(vec2 uv, float z, float cy, vec3 color) {
    if (abs(uv.y - cy) > LANE_H * 0.5) return vec4(0.0);
    float fire = smoothstep(Z_FIRE, Z_FIRE + 0.5, z); // fires on positive z-spikes only
    vec3 col = color * 0.05;                          // dim lane background
    col += color * fire * 2.0;                        // bright flash on a real hit
    return vec4(col, clamp(0.06 + fire, 0.0, 1.0));
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
    // SMOOTH independent lines (continuous animation)
    r = lane(uv, clamp(energyNormalized,0.0,1.0), LANE_Y(0.0), vec3(0.05,0.2,0.6), vec3(0.4,0.6,1.0));  col = mix(col, r.rgb, r.a); // blue  LOUDNESS
    r = lane(uv, waveletBand5Normalized,          LANE_Y(1.0), vec3(0.0,0.45,0.5), vec3(0.2,1.0,0.95)); col = mix(col, r.rgb, r.a); // cyan  TREBLE
    r = lane(uv, waveletBand3Normalized,          LANE_Y(2.0), vec3(0.1,0.5,0.1),  vec3(0.4,1.0,0.35)); col = mix(col, r.rgb, r.a); // green MID
    r = lane(uv, waveletBand1Normalized,          LANE_Y(3.0), vec3(0.6,0.3,0.0),  vec3(1.0,0.6,0.15)); col = mix(col, r.rgb, r.a); // orange LOW
    // TRIGGERS (fire only on real positive z-spikes — energyZ has the best hit structure)
    r = triggerLane(uv, waveletBand5ZScore,       LANE_Y(4.0), vec3(1.0,0.9,0.2));  col = mix(col, r.rgb, r.a); // yellow TREBLE hit
    r = triggerLane(uv, energyZScore,             LANE_Y(5.0), vec3(1.0,0.3,1.0));  col = mix(col, r.rgb, r.a); // magenta ENERGY hit

    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
