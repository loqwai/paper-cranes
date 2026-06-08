// @fullscreen: true
//https://visuals.beadfamous.com/?shader=claude/wip/wavelet-scope/wavelet-vs-spectral&wavelet=true&controller=wavelet-ease&fullscreen=true
// @tags: diagnostic, wavelet, fft, spectral, oscilloscope, graph, debug
//
// WAVELET vs SPECTRAL — the most important features for this song from BOTH domains, split.
// Tuned for melodic + vocal content (horn, voice). Top = WAVELET (octave energy + brightness
// + melody contour); bottom = SPECTRAL/FFT (timbre shape: tonal-ness, brightness, width,
// grit). The two domains read the same audio differently — wavelet = WHERE the energy is,
// spectral = the SHAPE/CHARACTER of the spectrum.
//
// Run: ?shader=claude/wip/wavelet-scope/wavelet-vs-spectral&wavelet=true&controller=wavelet-ease
//
//   TOP — WAVELET (warm)
//   lane 0  waveletBand5Spring        treble/air (horn harmonics, vocal sibilance)  RED
//   lane 1  waveletBand3Spring        mid (vocal/horn body)                         ORANGE
//   lane 2  waveletCentroidSpring     brightness (where energy sits)                GOLD
//   lane 3  melodyFlow                MELODY contour (the sung/played line)         YELLOW
//   TOP/BOTTOM divider
//   BOTTOM — SPECTRAL/FFT (cool)
//   lane 4  spectralCrestNormalized   TONAL-NESS (sustained note vs breathy/noisy)  CYAN
//   lane 5  spectralCentroidNormalized brightness (FFT view)                        BLUE
//   lane 6  spectralSpreadNormalized  spectral WIDTH (full vs sparse)               INDIGO
//   lane 7  spectralRoughnessNormalized GRIT/dissonance (vocal rasp, horn buzz)     VIOLET
//
// Spectral features are FFT (already smoothed by the pipeline); wavelet ones spring-eased.

uniform float waveletBand5Spring;
uniform float waveletBand3Spring;
uniform float waveletCentroidSpring;
uniform float melodyFlow;
// spectral* features are FFT — auto-declared by the wrapper, just referenced.

#define NUM_LANES 8.0
#define MARGIN 0.012
#define GAP 0.004
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
    float core = smoothstep(3.5, 0.0, dpx);
    float glow = smoothstep(22.0, 2.0, dpx);
    col += lc * core * 2.2 + lc * glow * 0.5;
    return vec4(col, clamp(core + glow * 0.5 + 0.10, 0.0, 1.0));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    if (floor(fragCoord.x) < floor(res.x) - 1.0) {
        vec2 p = vec2((fragCoord.x + 1.0) / res.x, uv.y);
        vec3 prev = getLastFrameColor(p).rgb * 0.999;
        // keep the domain divider crisp in history
        if (abs(uv.y - 0.5) < 1.5/res.y) prev = vec3(0.3);
        fragColor = vec4(prev, 1.0);
        return;
    }

    vec3 col = vec3(0.02, 0.02, 0.03);
    if (abs(uv.y - 0.5) < 1.5/res.y) { fragColor = vec4(0.3,0.3,0.3,1.0); return; } // divider

    vec4 r;
    // TOP — WAVELET (warm)
    r = lane(uv, waveletBand5Spring,                       LANE_Y(0.0), vec3(0.6,0.05,0.1), vec3(1.0,0.25,0.2));  col = mix(col, r.rgb, r.a); // red TREBLE
    r = lane(uv, waveletBand3Spring,                       LANE_Y(1.0), vec3(0.6,0.3,0.0),  vec3(1.0,0.6,0.15));  col = mix(col, r.rgb, r.a); // orange MID
    r = lane(uv, clamp(waveletCentroidSpring,0.0,1.0),     LANE_Y(2.0), vec3(0.6,0.55,0.0), vec3(1.0,0.95,0.2));  col = mix(col, r.rgb, r.a); // gold W-BRIGHTNESS
    r = lane(uv, clamp(melodyFlow,0.0,1.0),                LANE_Y(3.0), vec3(0.7,0.7,0.0),  vec3(1.0,1.0,0.4));   col = mix(col, r.rgb, r.a); // yellow MELODY
    // BOTTOM — SPECTRAL (cool)
    r = lane(uv, clamp(spectralCrestNormalized,0.0,1.0),     LANE_Y(4.0), vec3(0.0,0.45,0.5), vec3(0.2,1.0,0.95)); col = mix(col, r.rgb, r.a); // cyan TONAL
    r = lane(uv, clamp(spectralCentroidNormalized,0.0,1.0),  LANE_Y(5.0), vec3(0.05,0.3,0.6), vec3(0.3,0.7,1.0));  col = mix(col, r.rgb, r.a); // blue S-BRIGHTNESS
    r = lane(uv, clamp(spectralSpreadNormalized,0.0,1.0),    LANE_Y(6.0), vec3(0.2,0.15,0.6), vec3(0.5,0.4,1.0));  col = mix(col, r.rgb, r.a); // indigo WIDTH
    r = lane(uv, clamp(spectralRoughnessNormalized,0.0,1.0), LANE_Y(7.0), vec3(0.4,0.1,0.6),  vec3(0.8,0.4,1.0));  col = mix(col, r.rgb, r.a); // violet GRIT
    fragColor = vec4(clamp(col, 0.0, 1.6), 1.0);
}
