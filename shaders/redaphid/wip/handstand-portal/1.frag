// @fullscreen: true
// @mobile: false
// @tags: chromadepth, handstand, wavelet, portal, mask, redaphid, 3d
//
// HANDSTAND AURORA PORTAL — a dancer mid-handstand, rendered as a being of light
// suspended in a deep nebula. Built for ChromaDepth 3D glasses:
//   RED   = near  → the figure's interior + its rim glow pop forward
//   GREEN = mid   → the figure's thin extremities (legs, hands)
//   BLUE / VIOLET = far → the churning background field recedes
//
// The dancer silhouette comes from an image mask (black figure on white).
// A multi-tap "interior fill" turns the flat stencil into a 3D-ish depth bulge:
// deep body = reddest/nearest, thin limbs fade to green, the rim flares pure red.
//
// FEATURE MAPPING — wavelet (DWT) drives motion/energy, FFT spectral drives texture:
//   waveletBassSpring   → the body breathes (scale) + reddens (pulls nearer)
//   wavelet_bassHit /   → rim flares forward on each kick/drop
//   waveletBassZScore
//   waveletBand5Spring  → treble/air brightens + violet-shifts the far field
//   waveletCentroidSpring → overall brightness of the nebula
//   wubPulse / wubDepth → internal plasma wobble inside the figure
//   melodyFlow/flowPhase→ monotonic phases scroll the internal energy (no rocking back)
//   tonalStrength       → melodic passages saturate; noisy passages desaturate
//   spectralEntropy/    → far-field turbulence + filament chaos
//   spectralRoughness
//   quietGate           → mutes ALL reactivity in silence (no flashing in quiet passages)
//
// PRESET (wavelet + handstand mask):
// https://visuals.beadfamous.com/?shader=redaphid/wip/handstand-portal/1&wavelet=true&controller=wavelet-ease&image=images/handstand.png&fullscreen=true

#define PI 3.14159265
#define PHI 1.61803398
#define IMG_ASPECT (521.0 / 532.0)

// ============================================================================
// WAVELET + CONTROLLER UNIFORMS
// Controller outputs (wavelet-ease) and raw wavelet bands are declared here so
// the shader compiles whether or not ?wavelet / ?controller are present (the
// wrapper de-dupes auto-declared wavelet uniforms against these). Absent → 0.
// ============================================================================
uniform float waveletBassSpring;       // smooth deep-bass level (0..1)
uniform float waveletBand2Spring;      // low-mid body
uniform float waveletBand5Spring;      // treble / air
uniform float waveletCentroidSpring;   // wavelet brightness
uniform float energySpring;            // overall loudness, smoothed
uniform float quietGate;               // 1 = sound present, 0 = silence (anti-flash)
uniform float wubPulse;                // raw bass wobble throb (0.5 = center)
uniform float wubDepth;                // how hard the bass is wobbling (0..1)
uniform float tonalStrength;           // melodic (1) vs noisy (0)
uniform float melodyFlow;              // monotonic melodic phase
uniform float flowPhase;               // monotonic flow phase
uniform float morphPhase;              // monotonic morph phase
uniform float huePhase;                // monotonic hue-drift phase
uniform float waveletBassZScore;       // self-calibrating bass spike (kick), any gain
uniform float wavelet_bassHit;         // sharp kick/drop trigger
uniform float waveletBand5Normalized;  // treble band, normalized
uniform float waveletTiltNormalized;   // bass↔treble lean (0..1)

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern — comment audio, uncomment const)
// ============================================================================

// Monotonic motion phases. Always add a small iTime term so motion survives even
// with no controller (phases would be 0) — and stays strictly forward (no rock-back).
#define FLOW   (flowPhase  + iTime * 0.06)
#define MORPH  (morphPhase + iTime * 0.04)
#define HUEDR  (huePhase   + iTime * 0.02)

// Figure pulse — bass shrinks the zoom multiplier → the body zooms toward you.
// Smooth swell (waveletBassSpring) + punchy kick (waveletBassZScore / wavelet_bassHit).
#define FIGURE_ZOOM (1.22 - waveletBassSpring * 0.16 * quietGate - clamp(waveletBassZScore, 0.0, 1.0) * 0.12 * quietGate - clamp(wavelet_bassHit, 0.0, 1.0) * 0.06)
// #define FIGURE_ZOOM 1.22

// Rim flare — pure-red edge that pops forward on the kick.
#define RIM_WIDTH (0.010 + clamp(waveletBassZScore, 0.0, 1.0) * 0.012 * quietGate + clamp(wavelet_bassHit, 0.0, 1.0) * 0.010)
#define RIM_GAIN  (0.55 + waveletBassSpring * 0.6 * quietGate + clamp(wavelet_bassHit, 0.0, 1.0) * 0.5)

// Internal plasma inside the figure.
#define PLASMA_WOB ((wubPulse - 0.5) * 0.5 * quietGate)

// Far-field character.
#define FIELD_BRIGHT (0.10 + waveletCentroidSpring * 0.18 * quietGate + waveletBand5Spring * 0.14 * quietGate)
#define FIELD_TURB   (0.5 + spectralEntropyNormalized * 1.2 + spectralRoughnessNormalized * 0.6)
#define VIOLET_SHIFT (waveletBand5Spring * 0.10 * quietGate)  // treble pushes background toward violet (further)

// Feedback trail strength (background smear).
#define FB_BLEND (0.12)

// ============================================================================
// CHROMADEPTH COLOR — t: 0 = red (near) … 0.75 = violet (far). seed2 per-device tint.
// ============================================================================
vec3 chromadepth(float t, float sat, float lit) {
    t = clamp(t, 0.0, 1.0);
    float hue = fract(t * 0.75 + seed2 * 0.06);
    sat = clamp(sat, 0.0, 1.0);
    lit = clamp(lit, 0.03, 0.62);
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// FIGURE MASK — aspect-corrected sample of the handstand stencil.
// Black figure (r≈0) → 1.0 inside, white background (r≈1) → 0.0 outside.
// ============================================================================
float sampleMask(vec2 uv) {
    float screenAspect = iResolution.x / iResolution.y;
    vec2 c = (uv - 0.5) * FIGURE_ZOOM;
    if (screenAspect > IMG_ASPECT) c.x *= screenAspect / IMG_ASPECT;
    else c.y *= IMG_ASPECT / screenAspect;
    vec2 imgUV = c + 0.5;
    if (imgUV.x < 0.0 || imgUV.x > 1.0 || imgUV.y < 0.0 || imgUV.y > 1.0) return 0.0;
    return 1.0 - getInitialFrameColor(imgUV).r;
}

// Cheap 2-octave value-noise flow for plasma + nebula filaments.
float hash21(vec2 p) {
    p = fract(p * vec2(253.37, 471.53));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1, 0));
    float c = hash21(i + vec2(0, 1)), d = hash21(i + vec2(1, 1));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float flow2(vec2 p) {
    return vnoise(p) * 0.65 + vnoise(p * 2.03 + 7.1) * 0.35;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;
    float aspect = res.x / res.y;

    // ---- MASK + INTERIOR FILL + RIM (single 8-tap ring loop) ----
    float m = sampleMask(uv);
    float fill = 0.0;     // how "surrounded" → deep interior
    float rimOuter = 0.0; // figure presence just outside this pixel
    float rimW = RIM_WIDTH;
    for (int i = 0; i < 8; i++) {
        float a = float(i) * PI * 0.25;
        vec2 d = vec2(cos(a), sin(a));
        fill += sampleMask(uv + d * 0.035);
        rimOuter = max(rimOuter, sampleMask(uv + d * rimW));
    }
    fill /= 8.0;
    float rim = rimOuter * (1.0 - m);                 // glow lives just OUTSIDE the silhouette
    float figMask = smoothstep(0.30, 0.70, m * 0.6 + fill * 0.4);  // soft, anti-aliased coverage

    // ---- FAR-FIELD NEBULA (chromadepth blue→violet, recedes) ----
    vec2 fp = (uv - 0.5) * vec2(aspect, 1.0);
    // domain-warped flow, scrolled by monotonic phases + light turbulence
    vec2 warp = vec2(flow2(fp * 2.5 + FLOW * 0.3), flow2(fp * 2.5 - FLOW * 0.27 + 3.3)) - 0.5;
    float neb = flow2(fp * 3.0 * FIELD_TURB + warp * 1.4 + MORPH * 0.2);
    float filament = pow(neb, 2.2);
    // far depth band 0.55..0.95, brighter filaments sit a touch nearer (greener)
    float fieldT = 0.92 - filament * 0.30 + VIOLET_SHIFT;
    float fieldLit = FIELD_BRIGHT + filament * (0.22 + waveletBand5Spring * 0.25 * quietGate);
    float fieldSat = 0.90 - tonalStrength * 0.05;
    vec3 background = chromadepth(fieldT, fieldSat, fieldLit);

    // sparse twinkling stars (far → violet)
    vec2 sg = floor(uv * res / 3.0);
    float star = step(0.9985, hash21(sg));
    float tw = 0.5 + 0.5 * sin(FLOW * 6.0 + hash21(sg + 1.7) * 6.28);
    background += chromadepth(0.85, 0.7, 0.6) * star * tw * 0.7;

    // ---- FIGURE INTERIOR (chromadepth red→green, pops forward) ----
    // internal plasma churn: warm energy flowing through the body
    vec2 ip = (uv - 0.5) * vec2(aspect, 1.0) * 3.5;
    float plasma = flow2(ip + vec2(MORPH * 0.5, FLOW * 0.4) + PLASMA_WOB);
    plasma = mix(plasma, flow2(ip * 1.9 - melodyFlow * 0.6), 0.4);

    // deep interior (fill→1) = reddest/nearest; thin limbs (fill low) → green
    float figT = mix(0.34, 0.0, smoothstep(0.15, 1.0, fill));
    figT -= waveletBassSpring * 0.05 * quietGate;          // bass pulls the whole body nearer
    figT += (plasma - 0.5) * 0.10;                          // plasma ripples local depth
    float figSat = 0.92;
    float figLit = 0.32 + plasma * 0.22 + waveletBand2Spring * 0.10 * quietGate
                 + smoothstep(0.6, 1.0, fill) * 0.06;       // dense core glows a bit hotter
    vec3 figure = chromadepth(figT, figSat, figLit);

    // ---- COMPOSITE figure over field ----
    vec3 col = mix(background, figure, figMask);

    // ---- RIM GLOW — pure red, maximum chromadepth pop ----
    float rimPulse = 0.6 + 0.4 * sin(FLOW * 3.0 + uv.y * 6.0);
    vec3 rimCol = chromadepth(0.0, 0.96, 0.5);              // t=0 → reddest/nearest
    col += rimCol * rim * RIM_GAIN * rimPulse;

    // ---- FEEDBACK trail (subtle refraction, decays in HSL to avoid white-out) ----
    float lum = dot(col, vec3(0.3, 0.6, 0.1));
    vec2 refr = vec2(dFdx(lum), dFdy(lum)) * 0.006;
    vec3 prev = getLastFrameColor(uv + refr).rgb;
    vec3 prevHSL = rgb2hsl(max(prev, vec3(0.001)));
    prevHSL.z *= 0.985;                                     // always pull brightness down
    prevHSL.z = min(prevHSL.z, 0.55);
    prevHSL.x = fract(prevHSL.x + 0.0015);                 // age trails toward blue (recede)
    prev = hsl2rgb(prevHSL);
    col = mix(prev, col, 1.0 - FB_BLEND);

    // ---- BEAT — brightness pulse only (hue is reserved for depth) ----
    if (beat) {
        vec3 bHSL = rgb2hsl(max(col, vec3(0.001)));
        bHSL.z = min(bHSL.z * 1.06, 0.6);
        col = hsl2rgb(bHSL);
    }

    // ---- VIGNETTE — darken corners so the figure reads as the focal portal ----
    float vign = 1.0 - pow(length(uv - 0.5) * 1.05, 2.4);
    col *= clamp(vign, 0.05, 1.0);

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
