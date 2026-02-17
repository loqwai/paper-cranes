// @fullscreen: true
// @tags: fractal, nebula, space, ambient
// Void Bloom — Fractal-driven feedback nebula
// The fractal isn't drawn directly — it drives distortion and color evolution
// of the previous frame, like beat-trip but with fractal structure.
// Designed for powerful GPUs (150 iterations).

#define PI 3.14159265
#define TAU 6.28318530
#define PHI 1.61803398
#define SQRT2 1.41421356
#define SQRT3 1.73205080

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (8 independent features)
// ============================================================================

// 1. Bass (decorrelated) → Fractal power breathing
#define BASS_DEC (bassZScore - energyZScore)
#define POWER_MOD (BASS_DEC * 0.15)
// #define POWER_MOD 0.0

// 2. Mids (decorrelated) → Scale breathing
#define MIDS_DEC (midsZScore - energyZScore * 0.5)
#define SCALE_MOD (MIDS_DEC * 0.02)
// #define SCALE_MOD 0.0

// 3. Spectral Rolloff → Fractal offset shift
#define OFFSET_MOD (spectralRolloffNormalized * 0.03)
// #define OFFSET_MOD 0.015

// 4. Spectral Roughness → Distortion intensity
#define DISTORT_MOD (spectralRoughnessNormalized * 0.008)
// #define DISTORT_MOD 0.004

// 5. Spectral Crest → Color injection brightness
#define INJECT_BRIGHT (0.03 + spectralCrestNormalized * 0.04)
// #define INJECT_BRIGHT 0.05

// 6. Pitch Class → Hue rotation speed
#define HUE_ROT (pitchClassNormalized * 0.02)
// #define HUE_ROT 0.01

// 7. Spectral Entropy → Color warmth (order=warm, chaos=cool)
#define WARMTH (1.0 - spectralEntropyNormalized)
// #define WARMTH 0.5

// 8. Spectral Flux (decorrelated) → Feedback decay rate
#define FLUX_DEC (spectralFluxZScore - energyZScore * 0.5)
#define DECAY_RATE (0.006 + clamp(FLUX_DEC, -0.3, 0.5) * 0.004)
// #define DECAY_RATE 0.008

// Secondary
#define BUILD_DROP (energySlope * energyRSquared * 8.0)
#define IS_DROPPING clamp(-BUILD_DROP, 0.0, 1.0)

// ============================================================================
// 3D ORBIT — camera orbits through parameter space
// ============================================================================

#define ORBIT_A (time * 0.0047 * PHI)
#define ORBIT_B (time * 0.0031 * SQRT2)
#define ORBIT_C (time * 0.0023 * SQRT3)

#define ORB_X (sin(ORBIT_A) * cos(ORBIT_B) * 0.5 + sin(ORBIT_C * 0.7) * 0.2)
#define ORB_Y (cos(ORBIT_A) * sin(ORBIT_C) * 0.4 + cos(ORBIT_B * 1.3) * 0.2)
#define ORB_Z (sin(ORBIT_B) * cos(ORBIT_C) * 0.3)

#define CENTER_X (ORB_X)
#define CENTER_Y (ORB_Y)
#define VIEW_ROT (ORBIT_A * 0.4 + ORBIT_B * 0.3)
#define ZOOM_BASE (0.45 + ORB_Z * 0.15)
#define POWER_BASE (2.5 + sin(ORBIT_C * 1.1) * 0.4)
#define OFFSET_BASE (0.12 + sin(ORBIT_A * 0.8) * 0.02)

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Symmetric centered coordinates
    vec2 C = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

    // 3D orbit rotation
    float rot = VIEW_ROT;
    float cr = cos(rot), sr = sin(rot);
    C = mat2(cr, -sr, sr, cr) * C;

    // Drift through fractal space
    C += vec2(CENTER_X, CENTER_Y);

    // Scale
    float zoom = ZOOM_BASE + SCALE_MOD;
    vec2 V = C * zoom;

    // Fractal parameters
    float A = POWER_BASE + POWER_MOD;
    float B = OFFSET_BASE + OFFSET_MOD;

    // ========================================================================
    // DOM MANDY COMPLEX POWER FRACTAL — 150 iterations
    // Computed for structure data, NOT drawn directly
    // ========================================================================

    float ox = 9.0, oy = 9.0, oz = 9.0;
    vec2 Zt = V;

    for (int k = 0; k < 150; k++) {
        float a = atan(V.y, V.x);
        float d = dot(V, V) * A;
        float ld = log(max(d, 1e-8));
        float c = dot(V, vec2(a, ld * 0.5));
        V = exp(-a * V.y) * pow(max(d, 1e-8), V.x * 0.5) * vec2(cos(c), sin(c));
        V = vec2(V.x * V.x - V.y * V.y, dot(V, V.yx));
        V -= C * B;

        ox = min(ox, abs(V.x));
        oy = min(oy, abs(V.y));
        float vv = dot(V, V);
        if (vv < oz) { oz = vv; Zt = V; }
    }

    // Fractal structure values — used to DRIVE feedback, not drawn
    float z = 1.0 - smoothstep(1.0, -6.0, log(max(oy, 1e-8)))
                   * smoothstep(1.0, -6.0, log(max(ox, 1e-8)));
    float angle = atan(Zt.y, Zt.x);

    // ========================================================================
    // FEEDBACK-DRIVEN VISUALS (beat-trip / carpet style)
    // The fractal modulates how the previous frame is sampled and recolored.
    // Camera panning: orbit velocity offsets feedback UV so trails flow
    // across the screen like we're flying through the nebula.
    // ========================================================================

    // Orbit velocity — derivative of orbit position creates camera pan
    // cos/sin derivatives of the orbit, scaled to UV space
    float dt = 0.016; // ~1 frame at 60fps
    float panScale = 0.3; // How much orbit motion translates to screen pan
    vec2 orbitVel = vec2(
        cos(ORBIT_A) * cos(ORBIT_B) * 0.5 * 0.0047 * PHI
      - sin(ORBIT_A) * sin(ORBIT_B) * 0.5 * 0.0031 * SQRT2
      + cos(ORBIT_C * 0.7) * 0.2 * 0.0023 * SQRT3 * 0.7,
        -sin(ORBIT_A) * sin(ORBIT_C) * 0.4 * 0.0047 * PHI
      + cos(ORBIT_A) * cos(ORBIT_C) * 0.4 * 0.0023 * SQRT3
      - sin(ORBIT_B * 1.3) * 0.2 * 0.0031 * SQRT2 * 1.3
    );
    // Apply view rotation to velocity so pan direction matches visual rotation
    vec2 panVel = mat2(cr, -sr, sr, cr) * orbitVel * panScale;

    // Slow rotation like carpet: rotate feedback UV over time
    vec2 ctr = vec2(0.5);
    vec2 fbOff = uv - ctr;
    float fbRot = 0.001; // Slow spin of the feedback field
    float fbc = cos(fbRot), fbs = sin(fbRot);
    vec2 baseUv = ctr + mat2(fbc, -fbs, fbs, fbc) * fbOff;

    // Add camera pan + fractal-driven distortion
    float distort = 0.003 + DISTORT_MOD;
    float waveX = sin(uv.y * 15.0 + time * 0.5 + z * 8.0) * distort;
    float waveY = cos(uv.x * 15.0 + time * 0.7 + z * 8.0) * distort;

    // Fractal structure adds directional pull
    waveX += (z - 0.5) * 0.004;
    waveY += (angle / PI) * 0.002;

    if (beat) {
        waveX *= 2.5;
        waveY *= 2.5;
    }

    // Camera pan + rotation + fractal distortion combined
    vec2 distortedUv = baseUv + panVel + vec2(waveX, waveY);
    // Clamp to edges instead of wrapping (fract creates hard seams)
    distortedUv = clamp(distortedUv, 0.001, 0.999);

    // Sample previous frame
    vec4 prev = getLastFrameColor(distortedUv);

    // Diffusion kernel — airy softness
    float sp = 0.001;
    vec3 prevBlur = prev.rgb * 0.5
                  + getLastFrameColor(distortedUv + vec2(sp, 0.0)).rgb * 0.125
                  + getLastFrameColor(distortedUv - vec2(sp, 0.0)).rgb * 0.125
                  + getLastFrameColor(distortedUv + vec2(0.0, sp)).rgb * 0.125
                  + getLastFrameColor(distortedUv - vec2(0.0, sp)).rgb * 0.125;

    // ========================================================================
    // COLOR EVOLUTION in oklch — hue rotates, lightness breathes
    // ========================================================================

    vec3 lch = rgb2oklch(max(prevBlur, vec3(0.001)));

    // Hue rotation — fractal angle + time + pitchClass
    lch.z += HUE_ROT + angle * 0.003 + time * 0.005;

    // Warmth shifts the hue bias
    lch.z += mix(-0.003, 0.003, WARMTH);

    // Gentle lightness decay — prevents accumulation to white
    lch.x -= DECAY_RATE;

    // Chroma slowly decays — keeps pastels from oversaturating
    lch.y *= 0.995;

    // Drop: boost contrast by pushing lights lighter, darks darker
    lch.x = mix(lch.x, lch.x * (0.7 + lch.x * 0.6), IS_DROPPING * 0.3);

    vec3 col = clamp(oklch2rgb(lch), 0.0, 1.0);

    // ========================================================================
    // COLOR INJECTION — fractal seeds new color into the feedback loop
    // Without this, everything would fade to black
    // ========================================================================

    // Injection color from fractal structure — the "seed"
    float seed_hue = angle + time * 0.03 * PHI + mix(-0.5, 0.5, WARMTH);
    float seed_L = 0.6 + z * 0.2;
    float seed_C = 0.06 + (1.0 - z) * 0.06;
    vec3 seed_col = clamp(oklch2rgb(vec3(seed_L, seed_C, seed_hue)), 0.0, 1.0);

    // Inject where the fractal has structure AND previous frame is dark
    // This seeds new patterns without overwriting existing trails
    float prev_luma = dot(col, vec3(0.2, 0.7, 0.1));
    float inject = INJECT_BRIGHT * (1.0 - prev_luma);

    // Fractal edges get more injection — seeds the nebula filaments
    float edge = abs(dFdx(z)) + abs(dFdy(z));
    inject += smoothstep(0.0, 0.3, edge * 10.0) * 0.04;

    // Focal points get bright injection
    float focal = exp(-oz * 2.0);
    inject += focal * 0.06;

    col = mix(col, seed_col, clamp(inject, 0.0, 0.15));

    // Beat flash
    if (beat) col *= 1.04;

    // ========================================================================
    // FINISHING
    // ========================================================================

    // Gentle vignette
    float vign = 1.0 - pow(length(uv - 0.5) * 0.85, 2.2);
    col *= max(vign, 0.005);

    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
