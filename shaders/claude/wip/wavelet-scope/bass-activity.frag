// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// BASS ACTIVITY — animation lines tuned for a LAPTOP MIC environment, where deep bass
// is attenuated so the sharp bass-HIT trigger barely fires. Instead of the trigger, this
// plots bass ENERGY LEVELS (which the mic captures fine and swing plenty) as bright
// flowing lines. These are the bass-reactive signals that actually work here.
//
//   lane 0  waveletBassNormalized    harmonic-weighted bass LEVEL (0..1)        RED
//   lane 1  waveletBand0Normalized   deep bass 43-86Hz level                    ORANGE
//   lane 2  waveletBand1Normalized   low bass 86-172Hz (survives mic best)      GOLD
//   lane 3  waveletBassZScore        bass anomaly — spikes on bass swells       GREEN
//   lane 4  energyNormalized         overall loudness (FFT) for reference       CYAN
//   lane 5  waveletBass              raw bass energy, scaled — biggest mover     MAGENTA
//
// History scrolls right->left, bright persistent lines. Run with ?wavelet=true.

uniform float waveletBassNormalized;
uniform float waveletBand0Normalized;
uniform float waveletBand1Normalized;
uniform float waveletBassZScore;
uniform float waveletBass;
// energyNormalized is a known FFT feature — auto-declared by the wrapper, just referenced.

#define NUM_LANES 6.0
#define MARGIN 0.012
#define GAP 0.005
#define USABLE (1.0 - 2.0*MARGIN - GAP*(NUM_LANES-1.0))
#define LANE_H (USABLE / NUM_LANES)
#define LANE_Y(i) (1.0 - MARGIN - LANE_H*0.5 - (i)*(LANE_H + GAP))

// EMA-smooth toward the previous column's plotted height so lines flow.
float smoothLane(float v01, float cy) {
    float prevLocal = 0.5, best = 0.0;
    for (int i = 0; i < 48; i++) {
        float local = float(i) / 47.0;
        float y = cy + (local - 0.5) * LANE_H;
        vec3 pc = getLastFrameColor(vec2(1.0 - 1.5 / iResolution.x, y)).rgb;
        float b = pc.r + pc.g + pc.b;
        if (b > best) { best = b; prevLocal = local; }
    }
    return (best > 0.3) ? mix(prevLocal, clamp(v01, 0.0, 1.0), 0.35) : clamp(v01, 0.0, 1.0);
}

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
    r = lane(uv, smoothLane(waveletBassNormalized,  LANE_Y(0.0)), LANE_Y(0.0), vec3(0.6,0.05,0.1), vec3(1.0,0.3,0.25)); col = mix(col, r.rgb, r.a); // red
    r = lane(uv, smoothLane(waveletBand0Normalized, LANE_Y(1.0)), LANE_Y(1.0), vec3(0.6,0.25,0.0), vec3(1.0,0.6,0.15)); col = mix(col, r.rgb, r.a); // orange
    r = lane(uv, smoothLane(waveletBand1Normalized, LANE_Y(2.0)), LANE_Y(2.0), vec3(0.6,0.5,0.0),  vec3(1.0,0.9,0.2));  col = mix(col, r.rgb, r.a); // gold
    r = lane(uv, zMap(waveletBassZScore),                         LANE_Y(3.0), vec3(0.1,0.5,0.1),  vec3(0.4,1.0,0.35)); col = mix(col, r.rgb, r.a); // green (reactive)
    r = lane(uv, smoothLane(clamp(energyNormalized,0.0,1.0), LANE_Y(4.0)), LANE_Y(4.0), vec3(0.0,0.45,0.5), vec3(0.2,1.0,0.95)); col = mix(col, r.rgb, r.a); // cyan
    r = lane(uv, smoothLane(clamp(waveletBass*0.4,0.0,1.0), LANE_Y(5.0)), LANE_Y(5.0), vec3(0.6,0.0,0.5), vec3(1.0,0.3,1.0)); col = mix(col, r.rgb, r.a); // magenta

    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
