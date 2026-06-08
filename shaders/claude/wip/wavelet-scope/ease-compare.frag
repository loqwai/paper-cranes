// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// EASE-COMPARE — compares easing STRATEGIES (from the wavelet-ease controller) on the
// same fast feature, so we can pick the best animation feel. The easing lives in the
// CONTROLLER (frame-persistent JS), not the shader — the shader just plots the uniforms.
//
// Load: ?shader=claude/wip/wavelet-scope/ease-compare&wavelet=true&controller=wavelet-ease
//
// Top 3 lanes: the SAME feature (band1 low-bass) through 3 strategies — compare smoothness.
//   lane 0  waveletBand1Normalized   RAW (sawtooth reference)         RED
//   lane 1  waveletBand1Ema          EMA (simple low-pass)            ORANGE
//   lane 2  waveletBand1Spring       SPRING (critically damped)       GREEN
//   lane 3  waveletBand1AttackRelease ATTACK/RELEASE (punch + smooth) CYAN
// Bottom 2: spring on two other features to check it generalizes.
//   lane 4  waveletCentroidSpring    brightness, sprung               GOLD
//   lane 5  energySpring             loudness, sprung                 MAGENTA

uniform float waveletBand1Normalized;
uniform float waveletBand1Ema;
uniform float waveletBand1Spring;
uniform float waveletBand1AttackRelease;
uniform float waveletCentroidSpring;
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
    r = lane(uv, waveletBand1Normalized,      LANE_Y(0.0), vec3(0.6,0.05,0.1), vec3(1.0,0.3,0.25)); col = mix(col, r.rgb, r.a); // red RAW
    r = lane(uv, waveletBand1Ema,             LANE_Y(1.0), vec3(0.6,0.3,0.0),  vec3(1.0,0.6,0.15)); col = mix(col, r.rgb, r.a); // orange EMA
    r = lane(uv, waveletBand1Spring,          LANE_Y(2.0), vec3(0.1,0.5,0.1),  vec3(0.4,1.0,0.35)); col = mix(col, r.rgb, r.a); // green SPRING
    r = lane(uv, waveletBand1AttackRelease,   LANE_Y(3.0), vec3(0.0,0.45,0.5), vec3(0.2,1.0,0.95)); col = mix(col, r.rgb, r.a); // cyan A/R
    r = lane(uv, waveletCentroidSpring,       LANE_Y(4.0), vec3(0.6,0.4,0.0),  vec3(1.0,0.9,0.2));  col = mix(col, r.rgb, r.a); // gold CENTROID spring
    r = lane(uv, energySpring,                LANE_Y(5.0), vec3(0.6,0.0,0.5),  vec3(1.0,0.3,1.0));  col = mix(col, r.rgb, r.a); // magenta ENERGY spring
    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
