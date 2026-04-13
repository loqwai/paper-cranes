// @fullscreen: true
// @mobile: true
// Layered energy waves — stacked like terrain, flowing with impossible swirls
#define PI 3.14159265

#define DRIFT (time * 0.03)
#define PULSE (sin(time * 0.2) * 0.5 + 0.5)

// ============================================================================
// NOISE
// ============================================================================
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
        s += a * vnoise(p);
        p *= 1.97;
        a *= 0.5;
    }
    return s;
}

// ============================================================================
// MATERIALS — from dubstep-daddy-fur-coat.frag
// ============================================================================
#define HUE_BASE 0.78

vec3 matChrome() { return hsl2rgb(vec3(fract(HUE_BASE + 0.05), 1.0, 0.65)); }
vec3 matHot()    { return hsl2rgb(vec3(0.08, 1.0, 0.6)); }
vec3 matGleam()  { return vec3(0.15, 0.08, 0.18); }

vec3 matFur(float t, float phase) {
    float cycle = sin(time * 0.08 + phase) * 0.5 + 0.5;
    vec3 white_hi = hsl2rgb(vec3(0.93, 0.15, 0.85));
    vec3 white_lo = hsl2rgb(vec3(0.90, 0.10, 0.75));
    vec3 pink_hi  = hsl2rgb(vec3(0.93, 0.95, 0.72));
    vec3 pink_lo  = hsl2rgb(vec3(0.86, 0.9, 0.55));
    vec3 hi = mix(white_hi, pink_hi, cycle);
    vec3 lo = mix(white_lo, pink_lo, cycle);
    return mix(lo, hi, t);
}

// ============================================================================
// WAVE PATH — smooth base + time-varying impossible distortion
// ============================================================================
float wavePath(vec2 uv, float y0, float amp, float freq, float phase) {
    // Base smooth wave
    float path = y0 + sin(uv.x * freq + DRIFT * 2.0 + phase) * amp;
    path += sin(uv.x * freq * 1.7 + DRIFT * 1.4 + phase * 0.6) * amp * 0.3;

    // Swirl distortion — fades in and out over time
    float swirl_cycle = sin(time * 0.05 + phase * 0.4) * 0.5 + 0.5;
    float swirl_str = swirl_cycle * swirl_cycle * 0.15;

    // Domain-warped noise creates impossible curves
    vec2 warp_p = uv * 2.0 + vec2(DRIFT * 0.8 + phase, sin(time * 0.04 + phase));
    float warp_n = fbm(warp_p);
    path += (warp_n - 0.5) * swirl_str;

    // Occasional localized whorl — a tighter swirl at a drifting x position
    float whorl_x = sin(time * 0.03 + phase * 1.3) * 0.5;
    float whorl_locality = exp(-pow((uv.x - whorl_x) * 3.0, 2.0));
    float whorl_angle = fbm(uv * 4.0 + time * 0.02 + phase) * PI * 2.0;
    float whorl_str = swirl_cycle * whorl_locality * 0.06;
    path += sin(whorl_angle) * whorl_str;

    return path;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * res) / res.y;
    vec2 raw_uv01 = fragCoord / res;

    uv /= 1.0 + PULSE * 0.03;

    // ---- BACKDROP ----
    vec3 bg = mix(vec3(0.04, 0.008, 0.06), vec3(0.015, 0.004, 0.035), smoothstep(-0.5, 0.5, uv.y));
    bg += exp(-dot(uv, uv) * 4.0) * vec3(0.06, 0.02, 0.08) * (0.5 + PULSE * 0.2);

    // Motes
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float px = hash(vec2(fi, 10.0)) * 2.0 - 1.0;
        float py = fract(hash(vec2(fi, 20.0)) + time * 0.003 * (0.2 + hash(vec2(fi, 30.0)))) * 1.0 - 0.5;
        float glow = exp(-length(uv - vec2(px, py)) / 0.0015) * 0.02;
        bg += glow * matHot() * 0.4;
    }

    vec3 col = bg;

    // Subtle surface grain for fur bands
    float grain = fbm(uv * 14.0 + DRIFT * 0.15);

    // ---- 6 STACKED WAVE LAYERS — back to front ----
    // Each wave: everything below the wave line is filled.
    // Layered so front waves cover back waves.

    // Wave 0 — deepest back, subtle dark fill
    {
        float path = wavePath(uv, -0.35, 0.06, 0.5, 0.0);
        float fill = smoothstep(0.01, -0.01, uv.y - path);
        vec3 c = hsl2rgb(vec3(HUE_BASE, 0.6, 0.08));
        col = mix(col, c, fill * 0.5);
        float edge = smoothstep(0.015, 0.0, abs(uv.y - path));
        col += edge * matChrome() * 0.3;
    }

    // Wave 1 — back fur wave
    {
        float path = wavePath(uv, -0.18, 0.08, 0.6, 1.5);
        float fill = smoothstep(0.008, -0.008, uv.y - path);
        float dist_from_edge = max(0.0, path - uv.y);
        float t = smoothstep(0.0, 0.25, dist_from_edge);
        vec3 fur_col = matFur(1.0 - t, 0.0);
        fur_col += (grain - 0.5) * 0.03 * vec3(1.0, 0.9, 0.95);
        fur_col += exp(-pow((uv.y - path) * 8.0, 2.0)) * matGleam() * 0.5;
        col = mix(col, fur_col * 0.55, fill);
        float edge = smoothstep(0.012, 0.0, abs(uv.y - path));
        col += edge * matChrome() * 0.9;
    }

    // Wave 2 — clean energy line
    {
        float path = wavePath(uv, -0.04, 0.10, 0.5, 3.2);
        float edge = exp(-pow((uv.y - path) * 80.0, 2.0));
        float glow = exp(-pow((uv.y - path) * 20.0, 2.0));
        col += edge * matHot() * 0.8;
        col += glow * matHot() * 0.15;
    }

    // Wave 3 — hero fur wave, widest, brightest
    {
        float path = wavePath(uv, 0.08, 0.09, 0.7, 4.8);
        float fill = smoothstep(0.008, -0.008, uv.y - path);
        float dist_from_edge = max(0.0, path - uv.y);
        float t = smoothstep(0.0, 0.3, dist_from_edge);
        vec3 fur_col = matFur(1.0 - t, 2.1);
        fur_col += (grain - 0.5) * 0.03 * vec3(1.0, 0.9, 0.95);
        fur_col += exp(-pow((uv.y - path) * 6.0, 2.0)) * matGleam() * 0.8;
        // Seam — faint chrome line within the fill
        float seam = exp(-pow(dist_from_edge * 30.0 - 1.5, 2.0)) * 0.15;
        col = mix(col, fur_col, fill);
        col += seam * matChrome() * fill * 0.4;
        float edge = smoothstep(0.01, 0.0, abs(uv.y - path));
        col += edge * matChrome() * 2.0;
    }

    // Wave 4 — clean chrome accent
    {
        float path = wavePath(uv, 0.22, 0.06, 0.9, 6.5);
        float edge = exp(-pow((uv.y - path) * 90.0, 2.0));
        float glow = exp(-pow((uv.y - path) * 25.0, 2.0));
        col += edge * matChrome() * 0.6;
        col += glow * matChrome() * 0.1;
    }

    // Wave 5 — front fur wave
    {
        float path = wavePath(uv, 0.32, 0.07, 0.8, 8.0);
        float fill = smoothstep(0.008, -0.008, uv.y - path);
        float dist_from_edge = max(0.0, path - uv.y);
        float t = smoothstep(0.0, 0.2, dist_from_edge);
        vec3 fur_col = matFur(1.0 - t, 4.2);
        fur_col += (grain - 0.5) * 0.03 * vec3(1.0, 0.9, 0.95);
        fur_col += exp(-pow((uv.y - path) * 8.0, 2.0)) * matGleam() * 0.6;
        col = mix(col, fur_col * 0.7, fill);
        float edge = smoothstep(0.01, 0.0, abs(uv.y - path));
        col += edge * matChrome() * 1.4;
    }

    // ---- DEPTH ECHO ----
    {
        vec2 c01 = vec2(0.5);
        float mz = mix(1.3, 1.6, PULSE);
        vec2 muv = raw_uv01;
        int steps = int(2.0 + PULSE * 3.0);
        for (int i = 0; i < 6; i++) {
            if (i >= steps) break;
            muv = (muv - c01) * mz + c01;
            muv.y += 0.002;
            muv = fract(muv);
        }
        vec3 echo = getLastFrameColor(muv).rgb;
        vec3 eh = rgb2hsl(echo);
        eh.y = clamp(eh.y * 1.2 + 0.08, 0.0, 1.0);
        eh.x = fract(eh.x + PULSE * 0.015);
        echo = hsl2rgb(eh);
        col = mix(col, echo, 0.1);
    }

    // ---- FEEDBACK ----
    vec2 fb_uv = raw_uv01;
    fb_uv.x += 0.0003;
    fb_uv.y -= 0.0002;
    vec3 prev = getLastFrameColor(fb_uv).rgb * 0.96;
    if (frame < 30) prev = col;
    col = mix(col, prev, 0.3);

    // Desktop vignette
    col *= 1.0 - smoothstep(0.55, 1.2, length(uv * vec2(0.6, 1.0)));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
