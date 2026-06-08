// @fullscreen: true
//https://visuals.beadfamous.com/?shader=claude/wip/wavelet-scope/independent&wavelet=true&fullscreen=true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// WAVELET TAPESTRY — iter: top animation features + per-lane EMA smoothing. Headless
// analysis showed a light EMA (a=0.3) lifts smoothness (autocorr 0.6->0.97) while
// keeping motion — turning choppy lines into silky flowing animation curves.
// Each new sample is EMA-blended with the previous column's plotted height (read back
// from the scrolled image), so the traces flow. Bright persistent history.
//
//   lane 0  waveletCentroid          BRIGHTNESS — smoothest line (autocorr 0.97)   ROSE
//   lane 1  waveletSpread            COMPLEXITY — 2nd smoothest (0.88)             GOLD
//   lane 2  waveletBassNormalized    BASS level — full-range coverage             GREEN
//   lane 3  waveletBand3Normalized   MID level                                    TEAL
//   lane 4  waveletBand5Normalized   TREBLE level (shows freq glides)             AZURE
//   lane 5  wavelet_bassHit          DROP trigger (reactive flash)                MAGENTA
//
// Run with ?wavelet=true (+ audio_file= or audio=tab).

uniform float waveletCentroid;
uniform float waveletSpread;
uniform float waveletBassNormalized;
uniform float waveletBand3Normalized;
uniform float waveletBand5Normalized;
uniform float wavelet_bassHit;

#define NUM_LANES 6.0
#define MARGIN 0.012
#define GAP 0.005
#define USABLE (1.0 - 2.0*MARGIN - GAP*(NUM_LANES-1.0))
#define LANE_H (USABLE / NUM_LANES)
#define LANE_Y(i) (1.0 - MARGIN - LANE_H*0.5 - (i)*(LANE_H + GAP))

// EMA-smooth the value toward where the line was one column back, so traces flow.
// Reads the previous column's brightest row within this lane = the old line height.
float smoothLane(float v01, float cy) {
    float prevLocal = 0.5, best = 0.0;
    for (int i = 0; i < 48; i++) {
        float local = float(i) / 47.0;
        float y = cy + (local - 0.5) * LANE_H;
        float b = getLastFrameColor(vec2(1.0 - 1.5 / iResolution.x, y)).r
                + getLastFrameColor(vec2(1.0 - 1.5 / iResolution.x, y)).g
                + getLastFrameColor(vec2(1.0 - 1.5 / iResolution.x, y)).b;
        if (b > best) { best = b; prevLocal = local; }
    }
    // blend toward target (a=0.3): smooth flow but still responsive
    return (best > 0.3) ? mix(prevLocal, clamp(v01, 0.0, 1.0), 0.3) : clamp(v01, 0.0, 1.0);
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

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    // scroll left, history stays bright (no fade)
    if (floor(fragCoord.x) < floor(res.x) - 1.0) {
        vec2 p = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        fragColor = vec4(getLastFrameColor(p).rgb * 0.999, 1.0);
        return;
    }

    vec3 col = vec3(0.02, 0.02, 0.03);
    vec4 r;
    r = lane(uv, smoothLane(waveletCentroid,        LANE_Y(0.0)), LANE_Y(0.0), vec3(0.6,0.05,0.25), vec3(1.0,0.40,0.50)); col = mix(col, r.rgb, r.a); // rose
    r = lane(uv, smoothLane(waveletSpread,          LANE_Y(1.0)), LANE_Y(1.0), vec3(0.7,0.35,0.0),  vec3(1.0,0.88,0.25)); col = mix(col, r.rgb, r.a); // gold
    r = lane(uv, smoothLane(waveletBassNormalized,  LANE_Y(2.0)), LANE_Y(2.0), vec3(0.1,0.45,0.1),  vec3(0.45,1.0,0.35)); col = mix(col, r.rgb, r.a); // green
    r = lane(uv, smoothLane(waveletBand3Normalized, LANE_Y(3.0)), LANE_Y(3.0), vec3(0.0,0.45,0.5),  vec3(0.2,1.0,0.95));  col = mix(col, r.rgb, r.a); // teal
    r = lane(uv, smoothLane(waveletBand5Normalized, LANE_Y(4.0)), LANE_Y(4.0), vec3(0.05,0.2,0.6),  vec3(0.4,0.65,1.0));  col = mix(col, r.rgb, r.a); // azure
    // trigger lane stays UN-smoothed — sharpness is the point
    r = lane(uv, clamp(wavelet_bassHit*0.15,0.0,1.0), LANE_Y(5.0), vec3(0.6,0.0,0.5), vec3(1.0,0.35,1.0)); col = mix(col, r.rgb, r.a);
    float hit = smoothstep(0.05, 0.3, wavelet_bassHit);
    if (abs(uv.y - LANE_Y(5.0)) < LANE_H*0.5) col = mix(col, vec3(1.0,0.5,1.0), hit*0.6);

    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
