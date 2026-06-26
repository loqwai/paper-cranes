// @fullscreen: true
//https://visuals.beadfamous.com/?shader=claude/wip/wavelet-scope/8&wavelet=true&fullscreen=true
// @tags: diagnostic, wavelet, oscilloscope, graph, analytics, debug
//
// PAIRED TAPESTRY — signal-tapestry-style lane scope (one feature per horizontal lane,
// history scrolls right->left). Each WAVELET feature sits directly above its matched
// FFT feature so you can read the pair's behavior over time, side by side.
//
//   TOP GROUP (wavelet)        BOTTOM GROUP (FFT, the method we use now)
//   ─────────────────────      ─────────────────────────────────────────
//   0  waveletBassZScore       3  bassZScore         (bass dynamics)
//   1  waveletBand2ZScore      4  midsZScore         (low-mid / body)
//   2  waveletBand5ZScore      5  trebleZScore       (treble / air)
//
// (wavelet bands are first-class features now; old wavelet_bandNZ names were renamed
//  to the FFT convention waveletBandNZScore — this shader was updated to match.)
//
// Lane = a horizontal band. A bright line traces the feature's z-score within its lane
// (center = z0, up = positive). Each lane is color-coded; the wavelet group runs warm
// (reds/oranges), the FFT group runs cool (blues/violets), so the two methods are
// instantly distinguishable. A thin divider separates the groups.
//
// Run with ?wavelet=true (+ ?audio=tab for live Spotify).

uniform float waveletBassZScore;
uniform float waveletBand2ZScore;
uniform float waveletBand5ZScore;

#define NUM_LANES 6.0
#define MARGIN 0.02
#define GAP 0.006
#define USABLE (1.0 - 2.0*MARGIN - GAP*(NUM_LANES-1.0))
#define LANE_H (USABLE / NUM_LANES)
// lane 0 at TOP of screen, lane 5 at bottom (so wavelet group is on top)
#define LANE_Y(i) (1.0 - MARGIN - LANE_H*0.5 - (i)*(LANE_H + GAP))

// Draw one feature's z-score line into its lane. Returns rgba contribution.
vec4 lane(vec2 uv, float z, float centerY, vec3 color) {
    float halfH = LANE_H * 0.5;
    if (abs(uv.y - centerY) > halfH) return vec4(0.0);

    // local position -0.5..0.5 within the lane; z maps to vertical displacement.
    float local = (uv.y - centerY) / LANE_H;       // -0.5..0.5
    float zPos = clamp(z * 0.35, -0.45, 0.45);      // z -> displacement within lane

    // faint lane background + center (z=0) reference line
    vec3 col = color * 0.06;
    float a = 0.06;
    if (abs(local) < 1.2 / (LANE_H * iResolution.y)) { col = color * 0.25; a = 0.25; }

    // the z-score trace line
    float d = abs(local - zPos) * LANE_H * iResolution.y; // px distance to the line
    float line = smoothstep(3.5, 0.5, d);
    col = mix(col, color * (1.2 + abs(z) * 0.3), line);
    a = max(a, line);

    return vec4(col, a);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    // ---- SCROLL right -> left ----
    if (floor(fragCoord.x) < floor(res.x) - 1.0) {
        vec2 p = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        vec4 prev = getLastFrameColor(p);
        prev.rgb *= 0.99;  // gentle trail fade
        // keep the group divider crisp in history
        if (abs(uv.y - 0.5) < 1.5/res.y) prev.rgb = vec3(0.25);
        fragColor = vec4(prev.rgb, 1.0);
        return;
    }

    // ---- NEW COLUMN ----
    vec3 bg = vec3(0.01);
    fragColor = vec4(bg, 1.0);

    // group divider between wavelet (top 3) and FFT (bottom 3)
    if (abs(uv.y - 0.5) < 1.5/res.y) { fragColor = vec4(0.25,0.25,0.25,1.0); return; }

    // WAVELET group — warm hues (lanes 0..2)
    vec4 r;
    r = lane(uv, waveletBassZScore,  LANE_Y(0.0), vec3(1.0, 0.30, 0.20)); fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a); // red
    r = lane(uv, waveletBand2ZScore, LANE_Y(1.0), vec3(1.0, 0.65, 0.15)); fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a); // orange
    r = lane(uv, waveletBand5ZScore, LANE_Y(2.0), vec3(1.0, 0.85, 0.30)); fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a); // gold

    // FFT group — cool hues (lanes 3..5)
    r = lane(uv, bassZScore,   LANE_Y(3.0), vec3(0.25, 0.55, 1.0)); fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a); // blue
    r = lane(uv, midsZScore,   LANE_Y(4.0), vec3(0.45, 0.40, 1.0)); fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a); // indigo
    r = lane(uv, trebleZScore, LANE_Y(5.0), vec3(0.70, 0.40, 1.0)); fragColor.rgb = mix(fragColor.rgb, r.rgb, r.a); // violet

    fragColor.rgb = clamp(fragColor.rgb, 0.0, 1.0);
    fragColor.a = 1.0;
}
