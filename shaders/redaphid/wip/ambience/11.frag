// @fullscreen: true
// @mobile: true
// Fractal ocean aurora — ukiyo-e waves with kali fractal foam, oklab color
#define PI 3.14159265359

// ============================================================================
// TUNABLE PARAMETERS — swap constants for knob_N to dial in live
// ============================================================================

// Feedback: how much previous frame bleeds through (0=none, 1=frozen)
#define FEEDBACK_MIX 0.20
// #define FEEDBACK_MIX (knob_1)

// Feedback decay: how fast old trails fade (lower = faster fade)
#define FEEDBACK_DECAY 0.88
// #define FEEDBACK_DECAY (0.8 + knob_2 * 0.18)

// Edge softness: gaussian width of wave crest glow (higher = blurrier edges)
#define EDGE_SOFT 0.0003
// #define EDGE_SOFT (0.0001 + knob_3 * 0.002)

// Chrome rim brightness at wave edges
#define CHROME_BRIGHT 0.25
// #define CHROME_BRIGHT (knob_4)

// Hot accent brightness (energy crests, god rays)
#define HOT_BRIGHT 0.12
// #define HOT_BRIGHT (knob_5 * 0.3)

// God ray intensity
#define GODRAY_BRIGHT 0.15
// #define GODRAY_BRIGHT (knob_6 * 0.4)

// Swell: how much waves can grow (1.0 = no swell, 3.0 = dramatic)
#define SWELL_MAX 2.5
// #define SWELL_MAX (1.0 + knob_7 * 2.5)

// Swell distortion: how much swelling waves warp the previous frame
#define SWELL_WARP 0.015
// #define SWELL_WARP (knob_8 * 0.03)

// Fractal foam visibility (0 = none, 1 = heavy)
#define FOAM_BRIGHT 0.5
// #define FOAM_BRIGHT (knob_9)

// Domain warp strength (swimminess of everything)
#define WARP_STR 0.03
// #define WARP_STR (knob_10 * 0.08)

// ============================================================================

#define DAY_CYCLE fract(time * 0.0067)
#define DRIFT (time * 0.03)
#define PULSE (sin(time * 0.2) * 0.5 + 0.5)

// ============================================================================
// NOISE
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
    return sn(p)              * 0.500
         + sn(p * 2.1 + 1.73) * 0.250
         + sn(p * 4.3 + 3.51) * 0.125
         + sn(p * 8.7 + 7.13) * 0.125;
}

// ============================================================================
// KALI FRACTAL — organic foam/spray detail along wave crests
// ============================================================================
// Returns soft luminance for fractal detail. p is 2D sample point near crest.
// Low iteration count keeps it cheap and soft (not sharp woodblock lines).
float kaliFoam(vec2 pos, float phase) {
    vec3 p = vec3(pos * 2.0 + vec2(DRIFT * 0.4, phase * 0.3), sin(time * 0.02 + phase) * 0.3);
    vec3 param = vec3(
        0.42 + sin(time * 0.015 + phase) * 0.03,
        0.38 + cos(time * 0.012 + phase * 0.7) * 0.02,
        0.45
    );
    float accum = 0.0;
    for (int i = 0; i < 8; i++) {
        p = abs(p) / dot(p, p) - param;
        accum += exp(-length(p) * 6.0);
    }
    return accum / 8.0;
}

// ============================================================================
// MATERIALS — from dubstep-daddy-fur-coat.frag
// ============================================================================
#define HUE_BASE 0.78

vec3 matChrome() { return hsl2rgb(vec3(fract(HUE_BASE + 0.05), 1.0, 0.65)); }
vec3 matHot()    { return hsl2rgb(vec3(0.08, 1.0, 0.6)); }
vec3 matLeather(){ return hsl2rgb(vec3(HUE_BASE, 0.8, 0.10)); }
vec3 matSkin()   { return hsl2rgb(vec3(0.92, 0.45, 0.18)); }
vec3 matHair()   { return hsl2rgb(vec3(0.06, 0.7, 0.12)); }
vec3 matGleam()  { return vec3(0.15, 0.08, 0.18); }

vec3 matFur(float t, float phase) {
    float cycle = sin(time * 0.08 + phase) * 0.5 + 0.5;
    vec3 white_hi = hsl2rgb(vec3(0.93, 0.15, 0.85));
    vec3 white_lo = hsl2rgb(vec3(0.90, 0.10, 0.75));
    vec3 pink_hi  = hsl2rgb(vec3(0.93, 0.95, 0.72));
    vec3 pink_lo  = hsl2rgb(vec3(0.86, 0.9, 0.55));
    vec3 lo = oklabmix(white_lo, pink_lo, cycle);
    vec3 hi = oklabmix(white_hi, pink_hi, cycle);
    return oklabmix(lo, hi, t);
}

// ============================================================================
// SKY
// ============================================================================
vec3 interp4(vec3 a, vec3 b, vec3 d, vec3 e, float c) {
    if (c < 0.25) return oklabmix(a, b, smoothstep(0.0,  0.25, c));
    if (c < 0.50) return oklabmix(b, d, smoothstep(0.25, 0.50, c));
    if (c < 0.75) return oklabmix(d, e, smoothstep(0.50, 0.75, c));
    return oklabmix(e, a, smoothstep(0.75, 1.0, c));
}

vec3 getSky(vec2 uv) {
    float c = DAY_CYCLE;
    vec3 top = interp4(
        vec3(0.06, 0.02, 0.12), vec3(0.15, 0.05, 0.25),
        vec3(0.08, 0.02, 0.18), vec3(0.01, 0.01, 0.04), c);
    vec3 mid = interp4(
        vec3(0.20, 0.06, 0.30), vec3(0.25, 0.08, 0.35),
        vec3(0.18, 0.04, 0.25), vec3(0.02, 0.01, 0.08), c);
    vec3 bot = interp4(
        vec3(0.90, 0.40, 0.20), vec3(0.70, 0.30, 0.50),
        vec3(0.95, 0.25, 0.15), vec3(0.04, 0.02, 0.10), c);

    float g1 = pow(clamp(uv.y, 0.0, 1.0), 0.55);
    float g2 = smoothstep(0.22, 0.92, uv.y);
    return oklabmix(oklabmix(bot, mid, g1), top, g2);
}

float starField(vec2 uv, float nightness) {
    if (nightness < 0.01) return 0.0;
    vec2 g = fract(uv * 58.0);
    vec2 id = floor(uv * 58.0);
    float r = h2(id);
    if (r < 0.93) return 0.0;
    float twinkle = 0.55 + 0.45 * sin(time * (1.2 + r * 5.0) + r * 100.0);
    return smoothstep(0.14, 0.0, length(g - 0.5)) * twinkle * nightness;
}

// ============================================================================
// WAVE PATH — with time-varying swell (waves grow large sometimes)
// ============================================================================
float waveSwell(float phase) {
    // Each wave has its own slow swell cycle — occasionally grows 2-3x
    float s1 = pow(sin(time * 0.02 + phase * 1.7) * 0.5 + 0.5, 3.0);
    float s2 = pow(sin(time * 0.013 + phase * 0.9 + 2.0) * 0.5 + 0.5, 4.0);
    return 1.0 + (s1 * 1.5 + s2 * 0.8) * (SWELL_MAX - 1.0) / 2.3;
}

float wavePath(float x, float y0, float amp, float freq, float phase) {
    float swell = waveSwell(phase);
    float a = amp * swell;

    float path = y0
        + sin(x * freq + DRIFT * 2.0 + phase) * a
        + sin(x * freq * 0.6 + DRIFT * 1.1 + phase * 0.4) * a * 0.5
        + sin(x * freq * 1.8 + DRIFT * 1.6 + phase * 0.8) * a * 0.2;

    float swirl = pow(sin(time * 0.05 + phase * 0.4) * 0.5 + 0.5, 1.5);
    path += (fbm(vec2(x * 1.2 + DRIFT * 0.6, phase * 0.3 + time * 0.02)) - 0.5) * swirl * 0.22 * swell;

    float whorl_x = sin(time * 0.03 + phase * 1.3) * 0.6;
    float locality = exp(-pow((x - whorl_x) * 1.5, 2.0));
    path += sin(fbm(vec2(x * 2.5, time * 0.015 + phase)) * PI * 2.0) * locality * swirl * 0.10 * swell;

    float whorl_x2 = cos(time * 0.025 + phase * 0.7) * 0.5;
    float locality2 = exp(-pow((x - whorl_x2) * 1.5, 2.0));
    path += cos(fbm(vec2(x * 2.0, time * 0.012 + phase + 3.0)) * PI * 2.0) * locality2 * swirl * 0.07 * swell;

    return path;
}

// ============================================================================
// EDGE GOD RAYS — emanate along crest
// ============================================================================
vec3 edgeGodRays(vec2 uv, float y0, float amp, float freq, float phase,
                 vec3 tint, float intensity) {
    float path = wavePath(uv.x, y0, amp, freq, phase);
    float d = uv.y - path;

    float above = smoothstep(0.0, 0.01, d);
    float fall = exp(-max(d, 0.0) * 4.0);

    float noise_phase = fbm(vec2(uv.x * 3.0 + DRIFT * 0.3, phase * 0.5)) * PI * 2.0;
    float fan = pow(abs(cos(uv.x * 8.0 + noise_phase + time * 0.04)), 12.0);
    float fan2 = pow(abs(cos(uv.x * 5.0 - time * 0.03 + 2.0)), 10.0);

    float bloom = pow(sin(time * 0.03 + phase * 0.6) * 0.5 + 0.5, 4.0);

    float rays = (fan * 0.7 + fan2 * 0.3) * fall * above * bloom * intensity;
    rays += exp(-d * d / 0.008) * bloom * intensity * 0.3;

    return rays * tint;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 raw_uv = fragCoord.xy / iResolution.xy;
    float aspect = iResolution.x / iResolution.y;

    // Global domain warp
    vec2 uv = raw_uv;
    float warp_str = WARP_STR + 0.02 * sin(time * 0.07);
    vec2 warp_offset = vec2(
        fbm(uv * 2.5 + vec2(DRIFT * 0.8, 0.0)) - 0.5,
        fbm(uv * 2.5 + vec2(0.0, DRIFT * 0.6 + 5.0)) - 0.5
    ) * warp_str;
    uv += warp_offset;

    // ---- SKY ----
    vec3 col = getSky(uv);

    float sunElev = sin(DAY_CYCLE * 2.0 * PI);
    float nightness = smoothstep(0.05, -0.25, sunElev);
    col += oklabmix(vec3(0.85, 0.90, 1.00), matChrome() * 0.5, 0.3)
         * starField(vec2(uv.x * aspect, uv.y), nightness)
         * smoothstep(0.2, 0.27, uv.y);

    float grain = fbm(uv * 14.0 + DRIFT * 0.15);
    float daylight = smoothstep(-0.15, 0.20, sunElev);
    float rb = mix(0.6, 1.0, daylight);

    // ---- WAVES — wide overlapping, with fractal foam at crests ----

    // Wave 0 — deepest, leather-dark
    {
        float p = wavePath(uv.x, 0.10, 0.12, 0.2, 0.0);
        float d = uv.y - p;
        float fill = smoothstep(0.015, -0.005, d);
        float fade = exp(d * 3.0);
        float alpha = fill * clamp(fade, 0.2, 1.0);
        vec3 c = oklabmix(matLeather() * 4.0, matLeather() * 0.8, 1.0 - fade) * rb * 0.7;
        c += exp(-d * d / EDGE_SOFT) * matChrome() * rb * CHROME_BRIGHT * 0.5;
        float foam = kaliFoam(uv * 4.0, 0.0) * exp(-d * d / 0.005) * FOAM_BRIGHT * 0.8;
        c += foam * matChrome() * rb;
        col = oklabmix(col, c, alpha);
    }

    // Wave 1 — hair, warm brown
    {
        float p = wavePath(uv.x, 0.25, 0.14, 0.25, 1.5);
        float d = uv.y - p;
        float fill = smoothstep(0.015, -0.005, d);
        float fade = exp(d * 2.5);
        float alpha = fill * clamp(fade, 0.15, 1.0);
        vec3 c = oklabmix(matHair() * 2.0, matHair() * 0.4, 1.0 - fade) * rb * 0.9;
        c += exp(-d * d / EDGE_SOFT) * matChrome() * rb * CHROME_BRIGHT * 0.6;
        float foam = kaliFoam(uv * 5.0, 1.5) * exp(-d * d / 0.004) * FOAM_BRIGHT * 0.6;
        c += foam * matHot() * rb;
        col = oklabmix(col, c, alpha * 0.85);
    }

    // Wave 2 — back fur, wide
    {
        float p = wavePath(uv.x, 0.40, 0.18, 0.3, 2.8);
        float d = uv.y - p;
        float fill = smoothstep(0.015, -0.005, d);
        float fade = exp(d * 2.0);
        float alpha = fill * clamp(fade, 0.1, 1.0);
        vec3 fur = matFur(clamp(fade, 0.0, 1.0), 0.0);
        fur += (grain - 0.5) * 0.02 * vec3(1.0, 0.9, 0.95);
        fur += exp(-d * d / 0.004) * matGleam() * 0.7;
        float rim = exp(-d * d / EDGE_SOFT);
        vec3 c = fur * rb * 0.8;
        c += rim * matChrome() * rb * CHROME_BRIGHT;
        float foam = kaliFoam(uv * 6.0, 2.8) * exp(-d * d / 0.003) * FOAM_BRIGHT;
        c += foam * matFur(0.9, 0.0) * rb;
        col = oklabmix(col, c, alpha * 0.8);
    }

    // Hot energy crest on wave 2
    {
        float p = wavePath(uv.x, 0.40, 0.18, 0.3, 2.8);
        float d = uv.y - p;
        col += matHot() * (exp(-d * d / EDGE_SOFT) * rb * HOT_BRIGHT + exp(-d * d / 0.005) * rb * HOT_BRIGHT * 0.2);
    }

    // Wave 3 — skin, warm plum
    {
        float p = wavePath(uv.x, 0.55, 0.16, 0.25, 4.0);
        float d = uv.y - p;
        float fill = smoothstep(0.015, -0.005, d);
        float fade = exp(d * 2.5);
        float alpha = fill * clamp(fade, 0.15, 1.0);
        vec3 c = oklabmix(matSkin() * 1.5, matSkin() * 0.4, 1.0 - fade) * rb * 0.85;
        c += exp(-d * d / EDGE_SOFT) * matChrome() * rb * CHROME_BRIGHT * 0.5;
        float foam = kaliFoam(uv * 5.0, 4.0) * exp(-d * d / 0.004) * FOAM_BRIGHT * 0.7;
        c += foam * matChrome() * rb;
        col = oklabmix(col, c, alpha * 0.75);
    }

    // Wave 4 — HERO fur wave, tallest
    {
        float p = wavePath(uv.x, 0.68, 0.20, 0.35, 5.5);
        float d = uv.y - p;
        float fill = smoothstep(0.02, -0.005, d);
        float fade = exp(d * 1.8);
        float alpha = fill * clamp(fade, 0.1, 1.0);
        vec3 fur = matFur(clamp(fade, 0.0, 1.0), 2.1);
        fur += (grain - 0.5) * 0.02 * vec3(1.0, 0.9, 0.95);
        fur += exp(-d * d / 0.005) * matGleam() * 1.0;
        float rim = exp(-d * d / EDGE_SOFT);
        float seam = exp(-pow(max(0.0, -d) * 8.0 - 1.5, 2.0)) * 0.12;
        vec3 c = fur * rb * 1.0;
        c += rim * matChrome() * rb * CHROME_BRIGHT * 1.6;
        c += seam * matChrome() * rb * CHROME_BRIGHT * 0.6;
        float foam = kaliFoam(uv * 7.0, 5.5) * exp(-d * d / 0.004) * FOAM_BRIGHT * 1.2;
        c += foam * matFur(0.95, 2.1) * rb;
        col = oklabmix(col, c, alpha * 0.85);
    }

    // Edge god rays along hero crest
    col += edgeGodRays(uv, 0.68, 0.20, 0.35, 5.5, matHot(), rb * GODRAY_BRIGHT);

    // Wave 5 — chrome energy crest
    {
        float p = wavePath(uv.x, 0.78, 0.12, 0.4, 7.0);
        float d = uv.y - p;
        col += matChrome() * (exp(-d * d / EDGE_SOFT) * rb * CHROME_BRIGHT * 0.6 + exp(-d * d / 0.005) * rb * CHROME_BRIGHT * 0.12);
    }

    // Wave 6 — upper fur wave
    {
        float p = wavePath(uv.x, 0.86, 0.14, 0.3, 8.2);
        float d = uv.y - p;
        float fill = smoothstep(0.015, -0.005, d);
        float fade = exp(d * 2.2);
        float alpha = fill * clamp(fade, 0.12, 1.0);
        vec3 fur = matFur(clamp(fade, 0.0, 1.0), 4.2);
        fur += (grain - 0.5) * 0.02 * vec3(1.0, 0.9, 0.95);
        float rim = exp(-d * d / EDGE_SOFT);
        vec3 c = fur * rb * 0.75;
        c += rim * matChrome() * rb * CHROME_BRIGHT * 0.8;
        float foam = kaliFoam(uv * 5.0, 8.2) * exp(-d * d / 0.003) * FOAM_BRIGHT * 0.8;
        c += foam * matChrome() * rb;
        col = oklabmix(col, c, alpha * 0.7);
    }

    // Edge god rays along upper wave
    col += edgeGodRays(uv, 0.86, 0.14, 0.3, 8.2, matChrome() * 0.3, rb * GODRAY_BRIGHT * 0.6);

    // Wave 7 — thin hot thread near top
    {
        float p = wavePath(uv.x, 0.93, 0.08, 0.35, 10.0);
        float d = uv.y - p;
        col += matHot() * (exp(-d * d / EDGE_SOFT) * rb * HOT_BRIGHT + exp(-d * d / 0.005) * rb * HOT_BRIGHT * 0.2);
    }

    // ---- FEEDBACK with swell distortion ----
    // Near swelling wave crests, warp the feedback UV and hue-shift the previous frame
    vec2 fbUV = raw_uv - vec2(0.0003, 0.0) + warp_offset * 0.3;

    // Accumulate distortion from the two largest waves when they're swelling
    float totalWarp = 0.0;
    float totalHueShift = 0.0;
    {
        // Hero wave distortion field
        float swell4 = waveSwell(5.5);
        float swellExcess4 = max(swell4 - 1.3, 0.0); // only distort when swell is significant
        float p4 = wavePath(uv.x, 0.68, 0.20, 0.35, 5.5);
        float d4 = uv.y - p4;
        float proximity4 = exp(-d4 * d4 / 0.02);
        float warpStr4 = swellExcess4 * proximity4;

        // Swirl the feedback UV around the crest
        float angle4 = fbm(vec2(uv.x * 3.0 + time * 0.05, uv.y * 3.0)) * PI * 2.0;
        fbUV += vec2(cos(angle4), sin(angle4)) * warpStr4 * SWELL_WARP;
        totalHueShift += warpStr4 * 0.08;

        // Back fur wave distortion
        float swell2 = waveSwell(2.8);
        float swellExcess2 = max(swell2 - 1.3, 0.0);
        float p2 = wavePath(uv.x, 0.40, 0.18, 0.3, 2.8);
        float d2 = uv.y - p2;
        float proximity2 = exp(-d2 * d2 / 0.015);
        float warpStr2 = swellExcess2 * proximity2;

        float angle2 = fbm(vec2(uv.x * 2.5 - time * 0.04, uv.y * 2.5 + 3.0)) * PI * 2.0;
        fbUV += vec2(cos(angle2), sin(angle2)) * warpStr2 * SWELL_WARP * 0.8;
        totalHueShift += warpStr2 * 0.06;
    }

    vec3 prev = getLastFrameColor(clamp(fbUV, 0.001, 0.999)).rgb;

    // Hue-shift the previous frame near swelling crests (in oklch for perceptual rotation)
    if (totalHueShift > 0.001) {
        vec3 prevLch = rgb2oklch(prev);
        prevLch.z += totalHueShift; // rotate hue
        prevLch.y *= 1.0 + totalHueShift * 2.0; // boost chroma slightly
        prev = oklch2rgb(prevLch);
    }

    col = oklabmix(prev * FEEDBACK_DECAY, col, 1.0 - FEEDBACK_MIX);

    // Vignette
    vec2 vc = raw_uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.36;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
