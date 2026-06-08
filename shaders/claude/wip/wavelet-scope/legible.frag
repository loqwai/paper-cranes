// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// LEGIBLE — animation lines you can MAP to what you HEAR. Independence matters, but a
// line is only useful for animation if you can tell what it's doing relative to the music.
// So these are the MUSICALLY INTERPRETABLE features (not abstract tilt/spread/z-scores):
//
// Run: ?shader=claude/wip/wavelet-scope/legible&wavelet=true&controller=wavelet-ease
//
//   lane 0  waveletBassSpring     BASS — follows the bassline/low thump      RED
//            → verify: hear the bass, watch it rise/fall with the low end
//   lane 1  wavelet_bassHit       KICK/BEAT — flashes on each kick           ORANGE
//            → verify: hear the kick drum, see the bar flash in time
//   lane 2  energySpring          LOUDNESS — overall intensity               YELLOW
//            → verify: quiet section → low, drop/chorus → high
//   lane 3  waveletCentroidSpring BRIGHTNESS — bright (cymbals) vs muddy      GREEN
//            → verify: hi-hats/cymbals → rises; bass-only → falls
//   lane 4  waveletBand5Spring    TREBLE/AIR — the high-end shimmer          CYAN
//            → verify: hi-hats and "air" → moves
//   lane 5  waveletBand2Spring    LOW-MID — vocal/instrument body            MAGENTA
//            → verify: vocals/melody body → moves
//
// Smooth lines = spring-eased. Each maps to a thing you can point to in the music.

uniform float waveletBassSpring;
uniform float wavelet_bassHit;
uniform float energySpring;
uniform float waveletCentroidSpring;
uniform float waveletBand5Spring;
uniform float waveletBand2Spring;

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
    r = lane(uv, clamp(waveletBassSpring*2.0,0.0,1.0),     LANE_Y(0.0), vec3(0.6,0.05,0.1), vec3(1.0,0.25,0.2));  col = mix(col, r.rgb, r.a); // red BASS
    r = beatLane(uv, wavelet_bassHit,                      LANE_Y(1.0), vec3(1.0,0.55,0.1));                      col = mix(col, r.rgb, r.a); // orange KICK
    r = lane(uv, energySpring,                             LANE_Y(2.0), vec3(0.6,0.55,0.0), vec3(1.0,0.95,0.2));  col = mix(col, r.rgb, r.a); // yellow LOUDNESS
    r = lane(uv, clamp(waveletCentroidSpring,0.0,1.0),     LANE_Y(3.0), vec3(0.1,0.5,0.1),  vec3(0.4,1.0,0.35));  col = mix(col, r.rgb, r.a); // green BRIGHTNESS
    r = lane(uv, waveletBand5Spring,                       LANE_Y(4.0), vec3(0.0,0.45,0.5), vec3(0.2,1.0,0.95));  col = mix(col, r.rgb, r.a); // cyan TREBLE
    r = lane(uv, waveletBand2Spring,                       LANE_Y(5.0), vec3(0.6,0.0,0.5),  vec3(1.0,0.3,1.0));   col = mix(col, r.rgb, r.a); // magenta LOW-MID
    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
