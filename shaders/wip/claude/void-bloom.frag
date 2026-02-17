// @fullscreen: true
// @tags: fractal, nebula, space, ambient
// Void Bloom — sexy/2 fractal with Julia parallax warp, continuous zoom,
// and dreamy blurred feedback in dark regions.

#define PI 3.14159265
#define PHI 1.61803398
#define SQRT2 1.41421356
#define SQRT3 1.73205080

// ============================================================================
// AUDIO — mix of reactive (zScore/normalized) and stable (median/slope)
// ============================================================================

// Reactive: shape responds to the moment
#define A_MOD (bassNormalized * 0.5)
// #define A_MOD 0.25
#define B_MOD (spectralRolloffNormalized * 0.04)
// #define B_MOD 0.02

// Stable: parallax + zoom driven by musical character, not transients
#define PARALLAX_AUDIO (bassMedian * 0.06 + spectralCentroidMedian * 0.04)
#define TREND_PARALLAX (energySlope * energyRSquared * 0.4)
#define ZOOM_AUDIO (energyMedian * 0.1)

// Reactive color
#define HUE_ROT (pitchClassNormalized)
// #define HUE_ROT 0.0
#define COLOR_TEMP (spectralEntropyNormalized)
// #define COLOR_TEMP 0.5

// Reactive feedback
#define REFRACT_STRENGTH (0.02 + spectralRoughnessNormalized * 0.02)
// #define REFRACT_STRENGTH 0.03
#define BLUR_AMOUNT (2.0 + spectralCrestNormalized * 2.0)
// #define BLUR_AMOUNT 3.0

#define BUILD_DROP (energySlope * energyRSquared * 8.0)
#define IS_DROPPING clamp(-BUILD_DROP, 0.0, 1.0)

// ============================================================================
// TIME ORBITS
// ============================================================================

#define OA (time * 0.0047 * PHI)
#define OB (time * 0.0031 * SQRT2)
#define OC (time * 0.0023 * SQRT3)

// Fractal params — ranges that keep the fractal interesting
#define A_BASE (3.0 + sin(OC * 1.1) * 1.5)
#define B_BASE (0.12 + sin(OA * 0.8) * 0.03)
#define D_BASE (-0.55 + sin(OB * 0.9) * 0.15)

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 UV = fragCoord / iResolution.xy;
    vec2 res = iResolution.xy;

    // ========================================================================
    // NAVIGATION — continuous zoom + drift + rotation
    // ========================================================================

    // Sexy/2 coordinate base
    vec2 C = 0.6 * (res - fragCoord - fragCoord).yx / res.y;
    C.x += 0.77;

    // Drift through space
    C.x += cos(time * 0.03 * PHI) * 0.15 + sin(time * 0.017 * SQRT3) * 0.08;
    C.y += sin(time * 0.023 * SQRT2) * 0.12 + cos(time * 0.013) * 0.06;

    // CONTINUOUS ZOOM — always moving inward, breathing on top
    // The base zoom trends inward over time, with slow oscillation
    float zoomTime = time * 0.003; // Continuous inward progression
    float zoomBreath = sin(time * 0.008 * PHI) * 0.25 + sin(time * 0.005 * SQRT2) * 0.15;
    float zoom = exp(-fract(zoomTime) * 0.5) * (1.0 + zoomBreath) + ZOOM_AUDIO;
    C *= zoom;

    // Gentle rotation
    float vr = time * 0.004 * PHI;
    float cv = cos(vr), sv = sin(vr);
    vec2 pivot = vec2(0.77 * zoom, 0.0);
    C = pivot + mat2(cv, -sv, sv, cv) * (C - pivot);

    // ========================================================================
    // JULIA PARALLAX WARP — foreground layer at different depth
    // Strong enough to break all banding. Drifts independently for parallax.
    // Stable audio features (median/slope) control the depth separation.
    // ========================================================================

    // Julia c — evolves independently through interesting region near Mandelbrot boundary
    // Time orbits on their own incommensurate frequencies (never repeats)
    float jt1 = time * 0.0071 * PHI;
    float jt2 = time * 0.0053 * SQRT2;
    float jt3 = time * 0.0037 * SQRT3;
    // Base orbit traces a lissajous near the main cardioid/bulb boundary
    vec2 jc = vec2(
        -0.75 + sin(jt1) * 0.18 + sin(jt2 * 1.3) * 0.07,
         0.10 + cos(jt2) * 0.25 + cos(jt3 * 0.9) * 0.08
    );
    // Stable audio nudges c into different Julia families
    jc.x += spectralRoughnessMedian * 0.12 - 0.06;  // dissonance explores real axis
    jc.y += spectralKurtosisMedian * 0.10 - 0.05;    // peakedness explores imaginary axis
    // Slow trend-driven wander — confident energy trends push c further out
    jc += vec2(cos(jt3), sin(jt1)) * TREND_PARALLAX * 0.3;

    // Julia bailout evolves — tighter = more detail, looser = smoother
    float jBailout = 6.0 + sin(jt3 * 1.7) * 2.0 + spectralEntropyMedian * 2.0;

    // Parallax: Julia layer drifts at 1.8x rate — stable features set separation
    float parallax = 0.1 + PARALLAX_AUDIO + TREND_PARALLAX;
    vec2 juliaC = C + vec2(
        cos(time * 0.03 * PHI * 1.8) * parallax,
        sin(time * 0.023 * SQRT2 * 1.8) * parallax * 0.8
    );
    // Median-driven offset for audio depth shift
    juliaC += vec2(spectralSpreadMedian * 0.05 - 0.025, spectralFluxMedian * 0.04 - 0.02);

    // 8 Julia iterations — evolving bailout shapes the warp character
    vec2 jz = juliaC;
    for (int i = 0; i < 8; i++) {
        jz = vec2(jz.x * jz.x - jz.y * jz.y, 2.0 * jz.x * jz.y) + jc;
        if (dot(jz, jz) > jBailout) break;
    }

    // Strong warp — 12-18% — enough to fully break banding everywhere
    float warpStrength = 0.12 + energyRSquared * 0.06;
    C += (jz - juliaC) * warpStrength;

    // ========================================================================
    // DOM MANDY FRACTAL — 150 iterations with per-step micro-perturbation
    // ========================================================================

    float D = D_BASE;
    vec2 V = C * D;
    float A = A_BASE + A_MOD;
    float B = B_BASE + B_MOD;

    float v, ox, oy,
          z = oy = ox = 9.0;
    vec2 Zt = V;

    // Micro-perturbation seed from Julia — breaks residual banding inside the loop
    vec2 microSeed = jz * 0.001;

    for (int k = 0; k < 150; k++) {
        float a = atan(V.y, V.x);
        float d = dot(V, V) * A;
        float c = dot(V, vec2(a, log(max(d, 1e-8)) / 2.0));
        V = exp(-a * V.y) * pow(max(d, 1e-8), V.x / 2.0) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * B;

        // Tiny per-step Julia perturbation — breaks banding at its source
        V += microSeed * float(k % 7 == 0 ? 1 : 0);

        ox = min(ox, abs(V.x));
        oy = min(oy, abs(V.y));
        z > (v = dot(V, V)) ? z = v, Zt = V : Zt;
    }

    // Sexy/2 coloring
    z = 1.0 - smoothstep(1.0, -6.0, log(max(oy, 1e-8))) * smoothstep(1.0, -6.0, log(max(ox, 1e-8)));
    vec3 base = sqrt(max(
        z + (z - z * z * z) * cos(atan(Zt.y, Zt.x) - vec3(0.0, 2.1, 4.2)),
        vec3(0.0)
    ));

    // ========================================================================
    // REFRACTION — fractal gradient bends the blurred previous frame
    // ========================================================================

    float here = dot(base, vec3(0.3, 0.6, 0.1));
    vec2 n = vec2(dFdx(here), dFdy(here)) * REFRACT_STRENGTH;

    // Blur: dark areas = dreamy blur, bright areas = sharp
    float focus = mix(BLUR_AMOUNT, 0.5, here);
    vec3 prev = textureLod(prevFrame, UV + n, focus).rgb;

    // Age trails: hue drift in oklch
    vec3 plch = rgb2oklch(max(prev, vec3(0.001)));
    plch.z += 0.004;
    plch.x *= 0.995;
    prev = clamp(oklch2rgb(plch), 0.0, 1.0);

    // ========================================================================
    // PASTEL OKLCH TINT
    // ========================================================================

    vec3 lch = rgb2oklch(max(base, vec3(0.001)));
    lch.z += HUE_ROT * 0.5 + time * 0.01 * PHI + mix(-0.3, 0.3, COLOR_TEMP);
    lch.x = mix(lch.x, 0.7, 0.15);
    lch.y = mix(lch.y, 0.08, 0.15);
    vec3 fractal_col = clamp(oklch2rgb(lch), 0.0, 1.0);

    // ========================================================================
    // BLEND — fractal over dreamy refracted feedback
    // ========================================================================

    float fractal_presence = smoothstep(0.1, 0.6, here);
    vec3 col = mix(prev, fractal_col, fractal_presence);

    // Drop contrast + beat
    col = mix(col, pow(max(col, vec3(0.0)), vec3(1.3)), IS_DROPPING * 0.3);
    if (beat) col *= 1.04;

    // ========================================================================
    // FINISHING
    // ========================================================================

    vec3 hsl = rgb2hsl(col);
    hsl.y = clamp(hsl.y, 0.15, 0.85);
    hsl.z = clamp(hsl.z, 0.15, 0.75);
    col = hsl2rgb(hsl);

    float vign = 1.0 - pow(length(UV - 0.5) * 0.85, 2.2);
    col *= max(vign, 0.005);

    fragColor = vec4(col, 1.0);
}
