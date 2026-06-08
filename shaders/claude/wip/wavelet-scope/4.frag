// @fullscreen: true
// @tags: diagnostic, wavelet, oscilloscope, graph, debug
//
// WAVELET FULL-BAND OSCILLOSCOPE — scrolls all six octave-band z-scores as separate
// lines so you can see the whole multiresolution picture the DWT produces, low->high.
// Each band is colored by frequency (red=low/bass -> violet=high/treble), mirroring
// chromadepth depth order, so you can read which octaves are active at a glance.
//
//   band0Z  43-86 Hz    deep bass     RED
//   band1Z  86-172 Hz   low bass      ORANGE
//   band2Z  172-345 Hz  low-mid       YELLOW/GREEN
//   band3Z  345-689 Hz  mid           GREEN
//   band4Z  689-1378 Hz high-mid      CYAN/BLUE
//   band5Z  1.4-2.8 kHz treble        VIOLET
//
//   White full-height column = wavelet_bassHit fired (the deep-bass drop trigger).
//
// Center line = z=0, range mapped ~ z in [-2.5, +2.5]. Run with ?wavelet=true.

uniform float wavelet_band0Z;
uniform float wavelet_band1Z;
uniform float wavelet_band2Z;
uniform float wavelet_band3Z;
uniform float wavelet_band4Z;
uniform float wavelet_band5Z;
uniform float wavelet_bassHit;

float zToY(float z) { return clamp((z + 2.5) / 5.0, 0.0, 1.0); }
bool onLine(vec2 fragCoord, float h01, float w) { return abs(fragCoord.y - h01 * resolution.y) < w; }

// frequency t in [0,1] -> chromadepth-ordered hue (0=red .. ~0.78=violet)
vec3 bandColor(float t) { return hsl2rgb(vec3(t * 0.78, 0.9, 0.55)); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / resolution.xy;

    // ---- SCROLL LEFT ----
    if (uv.x < 0.99) {
        vec2 prevUV = uv;
        prevUV.x += 1.0 / resolution.x;
        fragColor = getLastFrameColor(prevUV);
        fragColor.rgb *= 0.992; // gentle trail fade
        if (abs(uv.y - 0.5) < 1.5 / resolution.y) fragColor.rgb = max(fragColor.rgb, vec3(0.12));
        return;
    }

    // ---- NEW SAMPLE COLUMN ----
    vec3 col = vec3(0.0);
    if (abs(uv.y - 0.5) < 1.5 / resolution.y) col = vec3(0.18); // z=0 baseline

    float lw = 3.0;
    // Plot high bands first, low (bass) last so the bass line sits on top.
    if (onLine(fragCoord, zToY(wavelet_band5Z), lw)) col = bandColor(1.00);
    if (onLine(fragCoord, zToY(wavelet_band4Z), lw)) col = bandColor(0.80);
    if (onLine(fragCoord, zToY(wavelet_band3Z), lw)) col = bandColor(0.60);
    if (onLine(fragCoord, zToY(wavelet_band2Z), lw)) col = bandColor(0.40);
    if (onLine(fragCoord, zToY(wavelet_band1Z), lw)) col = bandColor(0.20);
    if (onLine(fragCoord, zToY(wavelet_band0Z), lw + 1.0)) col = bandColor(0.0); // bass, thicker, on top

    // bass-hit flash column
    float hit = smoothstep(0.02, 0.12, wavelet_bassHit);
    col = mix(col, vec3(1.0), hit * 0.6);

    fragColor = vec4(col, 1.0);
}
