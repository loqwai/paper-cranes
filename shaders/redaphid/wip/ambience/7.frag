// @fullscreen: true
// @mobile: true
// Plush aurora — floating energy ribbons in deep synthwave space
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
// WAVE PATH — smooth base + slow impossible distortion
// ============================================================================
float wavePath(float x, float y0, float amp, float freq, float phase) {
    float path = y0
        + sin(x * freq + DRIFT * 2.0 + phase) * amp
        + sin(x * freq * 1.6 + DRIFT * 1.4 + phase * 0.6) * amp * 0.3;

    // Swirl distortion that fades in and out
    float swirl_cycle = pow(sin(time * 0.05 + phase * 0.4) * 0.5 + 0.5, 2.0);
    float warp = fbm(vec2(x * 1.5 + DRIFT * 0.6, phase * 0.3 + time * 0.02));
    path += (warp - 0.5) * swirl_cycle * 0.12;

    // Localized whorl
    float whorl_x = sin(time * 0.03 + phase * 1.3) * 0.5;
    float locality = exp(-pow((x - whorl_x) * 2.5, 2.0));
    path += sin(fbm(vec2(x * 3.0, time * 0.015 + phase)) * PI * 2.0) * locality * swirl_cycle * 0.05;

    return path;
}

// A single ribbon of energy — soft gaussian cross-section, not a filled region
// Returns: color contribution (additive)
vec3 energyRibbon(vec2 uv, float y0, float amp, float freq, float phase,
                  float width, vec3 tint, float brightness) {
    float path = wavePath(uv.x, y0, amp, freq, phase);
    float d = uv.y - path;

    // Soft gaussian profile — bright core, gentle falloff
    float core = exp(-d * d / (width * width * 0.3));
    float glow = exp(-d * d / (width * width * 2.0));

    return tint * (core * brightness + glow * brightness * 0.2);
}

// A fur-textured ribbon — wider, with material color and chrome edges
vec3 furRibbon(vec2 uv, float y0, float amp, float freq, float phase,
               float width, float fur_phase, float grain, float brightness) {
    float path = wavePath(uv.x, y0, amp, freq, phase);
    float d = uv.y - path;

    // Soft body — gaussian, wider than energy ribbons
    float body = exp(-d * d / (width * width));
    float edge = exp(-d * d / (width * width * 0.15));

    // Color gradient across the ribbon width
    float t = exp(-d * d / (width * width * 0.5));
    vec3 fur_col = matFur(t, fur_phase);

    // Subtle grain
    fur_col += (grain - 0.5) * 0.03 * vec3(1.0, 0.9, 0.95);

    // Gleam at the core
    fur_col += edge * matGleam() * 0.6;

    // Chrome edge highlight
    float rim_d = abs(abs(d) - width * 0.7);
    float rim = exp(-rim_d * rim_d / (width * width * 0.02)) * body;

    vec3 result = fur_col * body * brightness;
    result += rim * matChrome() * 1.0 * brightness;

    return result;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * res) / res.y;
    vec2 raw_uv01 = fragCoord / res;

    uv /= 1.0 + PULSE * 0.03;

    // ---- DEEP SKY BACKDROP ----
    // Rich gradient — not flat black, has depth like the minecraft sky
    float sky_t = smoothstep(-0.5, 0.5, uv.y);
    vec3 sky_lo = hsl2rgb(vec3(0.78, 0.5, 0.04));   // deep warm purple-black
    vec3 sky_mid = hsl2rgb(vec3(0.82, 0.4, 0.07));   // dark plum
    vec3 sky_hi = hsl2rgb(vec3(0.72, 0.3, 0.03));    // near-black indigo

    vec3 col = mix(sky_lo, sky_mid, smoothstep(-0.3, 0.1, uv.y));
    col = mix(col, sky_hi, smoothstep(0.1, 0.5, uv.y));

    // Soft ambient glow from center — like distant light source
    col += exp(-dot(uv * vec2(1.0, 1.5), uv * vec2(1.0, 1.5)) * 3.0)
         * vec3(0.06, 0.02, 0.08) * (0.6 + PULSE * 0.2);

    // Motes — sparse, drifting
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float px = hash(vec2(fi, 10.0)) * 2.0 - 1.0;
        float py = fract(hash(vec2(fi, 20.0)) + time * 0.002 * (0.15 + hash(vec2(fi, 30.0)))) * 1.0 - 0.5;
        float glow = exp(-length(uv - vec2(px, py)) / 0.0012) * 0.015;
        col += glow * vec3(1.0, 0.7, 0.9);
    }

    // Surface grain for fur bands
    float grain = fbm(uv * 14.0 + DRIFT * 0.15);

    // ---- RIBBONS — additive layers, back to front ----
    // Mostly space between them — each is a band of light, not a filled region

    // Deep background energy — very faint, wide
    col += energyRibbon(uv, -0.32, 0.05, 0.5, 0.0, 0.06, matChrome() * 0.15, 0.3);

    // Back fur ribbon
    col += furRibbon(uv, -0.15, 0.08, 0.6, 1.5, 0.05, 0.0, grain, 0.45);

    // Thin hot accent
    col += energyRibbon(uv, -0.02, 0.10, 0.45, 3.2, 0.012, matHot(), 0.5);

    // Hero fur ribbon — brightest, widest
    col += furRibbon(uv, 0.10, 0.08, 0.7, 4.8, 0.065, 2.1, grain, 0.8);

    // Chrome accent line
    col += energyRibbon(uv, 0.24, 0.05, 0.85, 6.5, 0.008, matChrome(), 0.35);

    // Upper fur ribbon
    col += furRibbon(uv, 0.34, 0.06, 0.8, 8.0, 0.04, 4.2, grain, 0.5);

    // Faint hot thread
    col += energyRibbon(uv, -0.08, 0.12, 0.35, 9.5, 0.006, matHot(), 0.25);

    // ---- GOD RAYS — fan pattern that blooms from a drifting point ----
    // Fades in and out slowly, like the eye glow from dubstep-daddy
    {
        // Source point drifts along the hero ribbon path
        float src_x = sin(time * 0.02) * 0.3;
        float src_y = wavePath(src_x, 0.10, 0.08, 0.7, 4.8);
        vec2 src = vec2(src_x, src_y);

        vec2 dp = uv - src;
        float r = length(dp);
        float ang = atan(dp.y, dp.x);

        // Fan pattern — slow rotation
        float fan = pow(abs(cos(ang * 6.0 + time * 0.06)), 14.0);
        float fan2 = pow(abs(cos(ang * 6.0 - time * 0.05 + 1.3)), 14.0);

        // Radial falloff
        float fall = exp(-r * 1.8);

        // Upward bias — rays bloom upward more than down
        float up = smoothstep(-0.8, 0.4, dp.y / max(r, 0.001));

        // Intensity fades in and out over ~40 seconds
        float bloom = pow(sin(time * 0.04) * 0.5 + 0.5, 3.0);

        float god_rays = (fan + fan2 * 0.5) * fall * up * bloom * 0.4;
        // Central glow
        god_rays += exp(-r * 8.0) * bloom * 0.5;

        col += god_rays * matHot();
    }

    // ---- FEEDBACK — gentle trailing drift ----
    vec2 fb_uv = raw_uv01;
    fb_uv.x += 0.0003;
    fb_uv.y -= 0.0001;
    vec3 prev = getLastFrameColor(clamp(fb_uv, 0.001, 0.999)).rgb * 0.94;
    if (frame < 30) prev = col;
    col = mix(prev, col, 0.28);

    // Gentle vignette
    vec2 vc = raw_uv01 - 0.5;
    col *= 1.0 - dot(vc * vec2(0.8, 1.2), vc * vec2(0.8, 1.2)) * 0.5;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
