// @fullscreen: true
// @mobile: true
// Ukiyo-wave aurora — wide overlapping ocean waves with edge god rays, oklab mixing
#define PI 3.14159265359

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
// MATERIALS — from dubstep-daddy-fur-coat.frag
// ============================================================================
#define HUE_BASE 0.78

vec3 matChrome() { return hsl2rgb(vec3(fract(HUE_BASE + 0.05), 1.0, 0.65)); }
vec3 matHot()    { return hsl2rgb(vec3(0.08, 1.0, 0.6)); }
vec3 matLeather(){ return hsl2rgb(vec3(HUE_BASE, 0.8, 0.10)); }
vec3 matSkin()   { return hsl2rgb(vec3(0.92, 0.45, 0.18)); }
vec3 matHair()   { return hsl2rgb(vec3(0.06, 0.7, 0.12)); }
vec3 matGleam()  { return vec3(0.15, 0.08, 0.18); }

// Fur — cycles white↔pink in oklab for perceptually smooth transitions
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
// SKY — synthwave day/night cycle with oklab gradients
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
    vec3 sky = oklabmix(bot, mid, g1);
    return oklabmix(sky, top, g2);
}

// Stars — chrome-tinted
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
// WAVE PATH — wide ocean-like curves with impossible distortions
// ============================================================================
float wavePath(float x, float y0, float amp, float freq, float phase) {
    float path = y0
        + sin(x * freq + DRIFT * 2.0 + phase) * amp
        + sin(x * freq * 0.6 + DRIFT * 1.1 + phase * 0.4) * amp * 0.5
        + sin(x * freq * 1.8 + DRIFT * 1.6 + phase * 0.8) * amp * 0.2;

    float swirl = pow(sin(time * 0.05 + phase * 0.4) * 0.5 + 0.5, 1.5);
    path += (fbm(vec2(x * 1.2 + DRIFT * 0.6, phase * 0.3 + time * 0.02)) - 0.5) * swirl * 0.22;

    float whorl_x = sin(time * 0.03 + phase * 1.3) * 0.6;
    float locality = exp(-pow((x - whorl_x) * 1.5, 2.0));
    path += sin(fbm(vec2(x * 2.5, time * 0.015 + phase)) * PI * 2.0) * locality * swirl * 0.10;

    float whorl_x2 = cos(time * 0.025 + phase * 0.7) * 0.5;
    float locality2 = exp(-pow((x - whorl_x2) * 1.5, 2.0));
    path += cos(fbm(vec2(x * 2.0, time * 0.012 + phase + 3.0)) * PI * 2.0) * locality2 * swirl * 0.07;

    return path;
}

// ============================================================================
// EDGE GOD RAYS — emanate along a ribbon's crest, not from a point
// ============================================================================
vec3 edgeGodRays(vec2 uv, float y0, float amp, float freq, float phase,
                 vec3 tint, float intensity) {
    float path = wavePath(uv.x, y0, amp, freq, phase);
    float d = uv.y - path;

    float above = smoothstep(0.0, 0.01, d);
    float dist = max(d, 0.0);
    float fall = exp(-dist * 4.0);

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

    // Global domain warp — everything swims together
    vec2 uv = raw_uv;
    float warp_str = 0.03 + 0.02 * sin(time * 0.07);
    vec2 warp_offset = vec2(
        fbm(uv * 2.5 + vec2(DRIFT * 0.8, 0.0)) - 0.5,
        fbm(uv * 2.5 + vec2(0.0, DRIFT * 0.6 + 5.0)) - 0.5
    ) * warp_str;
    uv += warp_offset;

    // ---- SKY ----
    vec3 col = getSky(uv);

    // Stars at night
    float sunElev = sin(DAY_CYCLE * 2.0 * PI);
    float nightness = smoothstep(0.05, -0.25, sunElev);
    col += oklabmix(vec3(0.85, 0.90, 1.00), matChrome() * 0.5, 0.3)
         * starField(vec2(uv.x * aspect, uv.y), nightness)
         * smoothstep(0.2, 0.27, uv.y);

    float grain = fbm(uv * 14.0 + DRIFT * 0.15);

    // Daylight factor
    float daylight = smoothstep(-0.15, 0.20, sunElev);
    float rb = mix(0.6, 1.0, daylight);

    // ---- WAVES — wide overlapping ukiyo-e ocean style ----
    // Each wave is a band: solid near crest, fading to transparent deeper.
    // Large amplitudes create dramatic overlap.

    // Wave 0 — deepest, leather-dark, huge sweep
    {
        float p = wavePath(uv.x, 0.10, 0.15, 0.2, 0.0);
        float d = uv.y - p;
        float fill = smoothstep(0.04, -0.02, d);
        float fade = exp(d * 3.0); // fades deeper into the fill
        float alpha = fill * clamp(fade, 0.2, 1.0);
        vec3 c = oklabmix(matLeather() * 4.0, matLeather() * 0.8, 1.0 - fade) * rb * 0.7;
        c += exp(-d * d / 0.001) * matChrome() * rb * 0.3;
        col = oklabmix(col, c, alpha);
    }

    // Wave 1 — hair, warm brown, big sweep
    {
        float p = wavePath(uv.x, 0.25, 0.18, 0.25, 1.5);
        float d = uv.y - p;
        float fill = smoothstep(0.04, -0.02, d);
        float fade = exp(d * 2.5);
        float alpha = fill * clamp(fade, 0.15, 1.0);
        vec3 c = oklabmix(matHair() * 2.0, matHair() * 0.4, 1.0 - fade) * rb * 0.9;
        c += exp(-d * d / 0.0008) * matChrome() * rb * 0.4;
        col = oklabmix(col, c, alpha * 0.85);
    }

    // Wave 2 — back fur, very wide
    {
        float p = wavePath(uv.x, 0.40, 0.22, 0.3, 2.8);
        float d = uv.y - p;
        float fill = smoothstep(0.04, -0.02, d);
        float fade = exp(d * 2.0);
        float alpha = fill * clamp(fade, 0.1, 1.0);
        vec3 fur = matFur(clamp(fade, 0.0, 1.0), 0.0);
        fur += (grain - 0.5) * 0.02 * vec3(1.0, 0.9, 0.95);
        fur += exp(-d * d / 0.004) * matGleam() * 0.7;
        float rim = exp(-d * d / 0.0005);
        vec3 c = fur * rb * 0.8;
        c += rim * matChrome() * rb * 0.8;
        col = oklabmix(col, c, alpha * 0.8);
    }

    // Hot energy crest on wave 2
    {
        float p = wavePath(uv.x, 0.40, 0.22, 0.3, 2.8);
        float d = uv.y - p;
        col += matHot() * (exp(-d * d / 0.0003) * rb * 0.5 + exp(-d * d / 0.005) * rb * 0.08);
    }

    // Wave 3 — skin, warm plum, sweeping
    {
        float p = wavePath(uv.x, 0.55, 0.20, 0.25, 4.0);
        float d = uv.y - p;
        float fill = smoothstep(0.04, -0.02, d);
        float fade = exp(d * 2.5);
        float alpha = fill * clamp(fade, 0.15, 1.0);
        vec3 c = oklabmix(matSkin() * 1.5, matSkin() * 0.4, 1.0 - fade) * rb * 0.85;
        c += exp(-d * d / 0.0008) * matChrome() * rb * 0.35;
        col = oklabmix(col, c, alpha * 0.75);
    }

    // Wave 4 — HERO fur wave, tallest crest
    {
        float p = wavePath(uv.x, 0.68, 0.25, 0.35, 5.5);
        float d = uv.y - p;
        float fill = smoothstep(0.05, -0.02, d);
        float fade = exp(d * 1.8);
        float alpha = fill * clamp(fade, 0.1, 1.0);
        vec3 fur = matFur(clamp(fade, 0.0, 1.0), 2.1);
        fur += (grain - 0.5) * 0.02 * vec3(1.0, 0.9, 0.95);
        fur += exp(-d * d / 0.005) * matGleam() * 1.0;
        float rim = exp(-d * d / 0.0005);
        float seam = exp(-pow(max(0.0, -d) * 8.0 - 1.5, 2.0)) * 0.12;
        vec3 c = fur * rb * 1.1;
        c += rim * matChrome() * rb * 1.4;
        c += seam * matChrome() * rb * 0.3;
        col = oklabmix(col, c, alpha * 0.85);
    }

    // Edge god rays along hero wave crest
    col += edgeGodRays(uv, 0.68, 0.25, 0.35, 5.5, matHot(), rb * 0.5);

    // Wave 5 — chrome energy crest
    {
        float p = wavePath(uv.x, 0.78, 0.15, 0.4, 7.0);
        float d = uv.y - p;
        col += matChrome() * (exp(-d * d / 0.0003) * rb * 0.5 + exp(-d * d / 0.005) * rb * 0.08);
    }

    // Wave 6 — upper fur wave, cresting high
    {
        float p = wavePath(uv.x, 0.86, 0.18, 0.3, 8.2);
        float d = uv.y - p;
        float fill = smoothstep(0.04, -0.02, d);
        float fade = exp(d * 2.2);
        float alpha = fill * clamp(fade, 0.12, 1.0);
        vec3 fur = matFur(clamp(fade, 0.0, 1.0), 4.2);
        fur += (grain - 0.5) * 0.02 * vec3(1.0, 0.9, 0.95);
        float rim = exp(-d * d / 0.0005);
        vec3 c = fur * rb * 0.75;
        c += rim * matChrome() * rb * 0.6;
        col = oklabmix(col, c, alpha * 0.7);
    }

    // Edge god rays along upper wave
    col += edgeGodRays(uv, 0.86, 0.18, 0.3, 8.2, matChrome() * 0.4, rb * 0.2);

    // Wave 7 — thin hot thread near top
    {
        float p = wavePath(uv.x, 0.93, 0.10, 0.35, 10.0);
        float d = uv.y - p;
        col += matHot() * (exp(-d * d / 0.0003) * rb * 0.3 + exp(-d * d / 0.005) * rb * 0.05);
    }

    // ---- FEEDBACK ----
    vec2 fbUV = raw_uv - vec2(0.0003, 0.0) + warp_offset * 0.3;
    vec3 prev = getLastFrameColor(clamp(fbUV, 0.001, 0.999)).rgb;
    col = oklabmix(prev * 0.91, col, 0.30);

    // Vignette
    vec2 vc = raw_uv - 0.5;
    col *= 1.0 - dot(vc, vc) * 0.36;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
