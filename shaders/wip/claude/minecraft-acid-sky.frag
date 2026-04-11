// @fullscreen: true
// @mobile: false
// @tags: minecraft, psychedelic, acid, trippy, feedback, warp, portal, rave
// @favorite: true

#define PI  3.14159265359
#define TAU 6.28318530718

// ============================================================================
// AUDIO-REACTIVE PARAMETERS
// ============================================================================

// Warp field amplitude — always noticeable, audio pushes it further
#define WARP_AMT    (0.018 + spectralFluxMean * 0.030)
// #define WARP_AMT 0.020

// Warp spatial frequency — chaotic music = higher freq ripples
#define WARP_FREQ   (5.5 + spectralEntropyNormalized * 9.0)
// #define WARP_FREQ 8.0

// Vortex per-frame twist — always spinning, energy speeds it up
#define VORTEX_TWIST (0.028 + energyNormalized * 0.055)
// #define VORTEX_TWIST 0.032

// Hue rotation per frame in radians — pitch drives rainbow cycling
// A full cycle (TAU) at 60fps with base: ~3.5 seconds / full spectrum rev
#define HUE_RAD     (0.010 + pitchClassNormalized * 0.020 + spectralCentroidMean * 0.008)
// #define HUE_RAD  0.014

// Minimum chroma floor in Oklch — keeps everything vivid, prevents gray
// Raising this makes the image more neon; lower = more natural
#define CHROMA_FLOOR 0.12
// #define CHROMA_FLOOR 0.12

// Chroma boost per feedback frame — pumps saturation over time
#define CHROMA_BOOST 1.035
// #define CHROMA_BOOST 1.035

// Feedback persistence — how much of last frame survives
#define PERSISTENCE  (0.90 + spectralFluxMean * 0.05)
// #define PERSISTENCE 0.92

// How much current sky bleeds through (builds increase bleed)
#define CURRENT_WEIGHT (0.22 + max(energySlope * energyRSquared * 4.0, 0.0))
// #define CURRENT_WEIGHT 0.22

// Treble: high-freq ripple on warp field
#define RIPPLE  (trebleNormalized * 0.010)
// #define RIPPLE 0.004

// Beat: radial burst
#define BEAT_BURST (beat ? 0.06 : 0.0)
// #define BEAT_BURST 0.0

// Bass: cloud plane morph
#define CLOUD_MORPH (bassZScore * 0.06)
// #define CLOUD_MORPH 0.0

// Original sky params
#define CLOUD_COVERAGE  (0.44 + bassMedian * 0.16)
#define DRIFT_SPEED     (0.014 + energyMean * 0.018)
#define CLOUD_BRIGHT    (0.92 + trebleMedian * 0.10)
#define DAY_CYCLE       fract(iTime * 0.0067 + spectralCentroidMean * 0.08)
#define SKY_HUE_SHIFT   (pitchClassNormalized * 0.14)
#define SKY_GLOW        (energyNormalized * 0.12)
#define STORM_DARK      (spectralRoughnessNormalized * 0.16)
#define BEAT_POP        (beat ? 1.08 : 1.0)
#define SHIMMER_AMT     (spectralFluxMean * 0.07)
#define CLOUD_SCALE     (0.14 + spectralEntropyMedian * 0.10)
#define HORIZON_Y       0.20

// ============================================================================
// HASH / NOISE
// ============================================================================

float h2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float sn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x),
               mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
}

float fbm(vec2 p) {
    return sn(p)               * 0.500
         + sn(p * 2.1 + 1.73) * 0.250
         + sn(p * 4.3 + 3.51) * 0.125
         + sn(p * 8.7 + 7.13) * 0.125;
}

// ============================================================================
// CLOUDS — pixelated minecraft blocks
// ============================================================================

float cloudDensity(vec2 wp, float res, float coverage, float scale) {
    vec2 bid = floor(wp * res);
    float n  = fbm(bid * scale);
    return smoothstep(1.0 - coverage, 1.0 - coverage + 0.10, n);
}

vec2 cloudWorldPos(vec2 uv, float H, float aspect, float HORIZ) {
    float ty   = uv.y - HORIZ;
    float dist = H / max(ty, 0.0015);
    return vec2((uv.x - 0.5) * dist * aspect, dist);
}

vec4 perspClouds(vec2 uv, float aspect) {
    float HORIZ  = HORIZON_Y;
    float H_BASE = 0.38;

    float ty = uv.y - HORIZ;
    if (ty < 0.003) return vec4(0.0);

    vec2 morphedUV = uv + vec2(
        sin(uv.y * 11.0 + iTime * 0.45) * CLOUD_MORPH,
        cos(uv.x * 9.0  + iTime * 0.38) * CLOUD_MORPH * 0.6
    );

    vec2 wp = cloudWorldPos(morphedUV, H_BASE, aspect, HORIZ);
    wp.x += iTime * DRIFT_SPEED;

    float d = cloudDensity(wp, 4.0, CLOUD_COVERAGE, CLOUD_SCALE);
    if (d < 0.5) return vec4(0.0);

    float eps    = max(ty * 0.09, 0.004);
    vec2 wpAbove = cloudWorldPos(vec2(morphedUV.x, morphedUV.y + eps), H_BASE, aspect, HORIZ);
    wpAbove.x   += iTime * DRIFT_SPEED;
    bool topFace = cloudDensity(wpAbove, 4.0, CLOUD_COVERAGE, CLOUD_SCALE) < 0.5;

    float sunElev  = sin(DAY_CYCLE * 2.0 * PI);
    float daylight = smoothstep(-0.15, 0.20, sunElev);

    vec3 topDay   = vec3(CLOUD_BRIGHT) * mix(vec3(1.0), vec3(0.88, 0.92, 0.98), 0.18);
    vec3 botDay   = mix(vec3(0.74, 0.77, 0.83), vec3(0.40, 0.42, 0.50), STORM_DARK);
    vec3 topNight = vec3(0.14, 0.17, 0.28);
    vec3 botNight = vec3(0.07, 0.08, 0.16);

    vec3 col = mix(
        topFace ? topNight : botNight,
        topFace ? topDay   : botDay,
        daylight
    );

    float shimmer = 1.0 + SHIMMER_AMT * sin(wp.x * 4.5 + iTime * 1.8);
    if (topFace) col *= shimmer;

    float fog = exp(-max(H_BASE / max(ty, 0.0015) - 0.7, 0.0) * 0.28);
    return vec4(col, d * fog);
}

// ============================================================================
// SKY GRADIENT — 4-keyframe day/night cycle
// ============================================================================

vec3 interp4(vec3 a, vec3 b, vec3 d, vec3 e, float c) {
    if (c < 0.25) return mix(a, b, smoothstep(0.0,  0.25, c));
    if (c < 0.50) return mix(b, d, smoothstep(0.25, 0.50, c));
    if (c < 0.75) return mix(d, e, smoothstep(0.50, 0.75, c));
    return mix(e, a, smoothstep(0.75, 1.0, c));
}

vec3 getSky(vec2 uv) {
    float c = DAY_CYCLE;
    vec3 bot = interp4(
        vec3(1.00, 0.65, 0.22), vec3(0.58, 0.78, 1.00),
        vec3(1.00, 0.38, 0.04), vec3(0.03, 0.04, 0.16), c);
    vec3 mid = interp4(
        vec3(0.18, 0.16, 0.50), vec3(0.36, 0.62, 0.96),
        vec3(0.24, 0.08, 0.22), vec3(0.02, 0.03, 0.13), c);
    vec3 top = interp4(
        vec3(0.04, 0.06, 0.22), vec3(0.22, 0.50, 0.90),
        vec3(0.07, 0.04, 0.20), vec3(0.01, 0.01, 0.07), c);

    vec3 sky = mix(bot, mid, pow(clamp(uv.y, 0.0, 1.0), 0.55));
    sky = mix(sky, top, smoothstep(0.22, 0.92, uv.y));

    // Hue shift via HSL only for the sky seed color
    vec3 hsl = rgb2hsl(sky);
    hsl.x = fract(hsl.x + SKY_HUE_SHIFT);
    sky = hsl2rgb(hsl);

    sky *= 1.0 + SKY_GLOW;
    sky  = mix(sky, vec3(0.22, 0.24, 0.28), STORM_DARK * 0.85);
    return sky;
}

// ============================================================================
// SUN
// ============================================================================

vec3 drawSun(vec2 uv, vec2 pos, float vis) {
    float aspect = iResolution.x / iResolution.y;
    float halfSz = 0.050;
    vec2  diff   = (uv - pos) * vec2(aspect, 1.0);
    float nd     = length(diff) / halfSz;

    float horiz    = pow(max(0.0, 1.0 - pos.y * 2.0), 2.0);
    vec3  innerCol = mix(vec3(1.00, 0.98, 0.90), vec3(1.00, 0.80, 0.30), horiz);
    vec3  glowCol  = mix(vec3(1.00, 0.75, 0.20), vec3(0.95, 0.35, 0.05), horiz);

    vec2  sunUV = diff / (halfSz * 2.0) + 0.5;
    float inSq  = (sunUV.x > 0.0 && sunUV.x < 1.0 &&
                   sunUV.y > 0.0 && sunUV.y < 1.0) ? 1.0 : 0.0;

    return innerCol * inSq * vis
         + glowCol * (exp(-nd*1.2)*0.55 + exp(-nd*3.5)*0.30 + exp(-nd*0.4)*0.18) * vis;
}

vec3 getCelestial(vec2 uv) {
    float c    = DAY_CYCLE;
    float arcH = 1.0 - HORIZON_Y - 0.06;
    float ang  = c * PI;
    vec2  pos  = vec2(0.5 + cos(ang) * 0.38, HORIZON_Y + sin(ang) * arcH);
    float vis  = smoothstep(0.0, 0.06, c) * (1.0 - smoothstep(0.44, 0.50, c));
    return drawSun(uv, pos, vis * (1.0 - STORM_DARK * 0.85));
}

// Stars — visible at night, also feed color into the feedback loop
float starField(vec2 uv, float nightness) {
    if (nightness < 0.01) return 0.0;
    float aspect = iResolution.x / iResolution.y;
    vec2 g  = fract(uv * vec2(aspect * 58.0, 58.0));
    vec2 id = floor(uv * vec2(aspect * 58.0, 58.0));
    float r = h2(id);
    if (r < 0.91) return 0.0;
    float twinkle = 0.55 + 0.45 * sin(iTime * (1.2 + r * 5.0) + r * 100.0);
    return smoothstep(0.14, 0.0, length(g - 0.5)) * twinkle * nightness;
}

// ============================================================================
// PSYCHEDELIC WARP FIELD
// ============================================================================

vec2 getWarpUV(vec2 uv) {
    vec2  centered = uv - 0.5;
    float dist     = length(centered);
    float angle    = atan(centered.y, centered.x);

    // Vortex: stronger toward center
    float twist  = VORTEX_TWIST * (1.0 - smoothstep(0.0, 0.5, dist));
    vec2  spun   = vec2(cos(angle + twist), sin(angle + twist)) * dist + 0.5;

    // Two-frequency curl warp
    float f  = WARP_FREQ;
    float wx = sin(uv.y * f       + iTime * 0.38) * WARP_AMT
             + sin(uv.y * f * 1.7 + iTime * 0.67) * WARP_AMT * 0.50;
    float wy = cos(uv.x * f       + iTime * 0.31) * WARP_AMT
             + cos(uv.x * f * 1.7 + iTime * 0.56) * WARP_AMT * 0.50;

    // Treble ripple
    wx += sin(uv.y * 42.0 + iTime * 4.5) * RIPPLE;
    wy += cos(uv.x * 42.0 + iTime * 3.9) * RIPPLE;

    // Beat burst
    vec2 radial = normalize(centered + vec2(0.001)) * BEAT_BURST;

    return clamp(spun + vec2(wx, wy) + radial, 0.001, 0.999);
}

// ============================================================================
// OKLCH FEEDBACK COLOR TREATMENT
// ============================================================================

// Takes a sampled prev frame color, applies:
//   - hue rotation (creates rainbow cycling as music plays)
//   - chroma floor (prevents gray convergence — the main fix)
//   - lightness anchoring (prevents blowout/blackout)
vec3 feedbackColor(vec3 c) {
    vec3 lch = rgb2oklch(c);

    // Rotate hue each frame in Oklch's perceptually-uniform color wheel
    lch.z += HUE_RAD;

    // CHROMA FLOOR: any pixel drifting toward gray gets pushed back to color.
    // This is what prevents the "boring gray" issue — desaturated pixels are
    // forcibly re-saturated, then carry the hue-rotated color forward.
    lch.y = max(lch.y, CHROMA_FLOOR);
    lch.y = min(lch.y * CHROMA_BOOST, 0.40); // cap to prevent neon clipping

    // Keep lightness alive in the mid-bright zone
    lch.x = clamp(lch.x, 0.04, 0.90);
    lch.x = mix(lch.x, 0.52, 0.014);

    return oklch2rgb(lch);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2  uv     = fragCoord.xy / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    // ---- CURRENT SKY FRAME ----
    vec3 current = getSky(uv);
    current += getCelestial(uv);

    // Stars seed vivid color into night feedback
    float sunElev   = sin(DAY_CYCLE * 2.0 * PI);
    float nightness = smoothstep(0.05, -0.25, sunElev)
                    * smoothstep(HORIZON_Y, HORIZON_Y + 0.07, uv.y);
    current += vec3(0.85, 0.90, 1.00) * starField(uv, nightness);

    vec4 cloud = perspClouds(uv, aspect);
    if (cloud.a > 0.01) current = mix(current, cloud.rgb, cloud.a * 0.96);
    current *= BEAT_POP;

    // ---- PSYCHEDELIC FEEDBACK LOOP ----

    // 1. Sample previous frame through the warp field
    vec2 warpUV = getWarpUV(uv);
    vec3 prev   = getLastFrameColor(warpUV).rgb;

    // 2. Color-treat the previous frame in Oklch:
    //    hue rotation + chroma floor = vivid rainbow cycling, never gray
    prev = feedbackColor(prev);

    // 3. Blend in OKLAB SPACE — this is the other half of the fix.
    //    Mixing complementary colors in Oklab gives vivid intermediates.
    //    Mixing in RGB gives muddy gray (the old bug).
    float cw = clamp(CURRENT_WEIGHT, 0.18, 0.48);

    vec3 prevOk    = rgb2oklab(prev)    * PERSISTENCE;
    vec3 currentOk = rgb2oklab(current);
    vec3 blendedOk = mix(prevOk, currentOk, cw);
    vec3 col       = oklab2rgb(blendedOk);

    // ---- VIGNETTE — softer than before ----
    vec2 vc = uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.28;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
