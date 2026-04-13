// @fullscreen: true
// @mobile: true
// Plush flow — PS4-style smooth light ribbons with fur-textured bands
#define PI 3.14159265

#define DRIFT (time * 0.03)
#define PULSE (sin(time * 0.2) * 0.5 + 0.5)
#define BREATH (sin(time * 0.15) * 0.5 + 0.5)

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
// MATERIALS — extracted verbatim from dubstep-daddy-fur-coat.frag
// ============================================================================

// Base hue for the synthwave palette
#define HUE_BASE 0.78

// Chrome highlight — full-saturation edge light
vec3 matChrome() {
    return hsl2rgb(vec3(fract(HUE_BASE + 0.05), 1.0, 0.65));
}

// Hot accent — warm orange glow (eyes, god rays, core highlights)
vec3 matHot() {
    return hsl2rgb(vec3(0.08, 1.0, 0.6));
}

// Leather body — dark base tone
vec3 matLeather() {
    return hsl2rgb(vec3(HUE_BASE, 0.8, 0.10));
}

// Skin — warm plum silhouette fill
vec3 matSkin() {
    return hsl2rgb(vec3(0.92, 0.45, 0.18));
}

// Hair — dark warm brown
vec3 matHair() {
    return hsl2rgb(vec3(0.06, 0.7, 0.12));
}

// Fur coat color — cycles between off-white plush and intense pink/magenta
// t = gradient across the band (0-1), phase = per-band time offset
vec3 matFur(float t, float phase) {
    // Slow cycle: off-white → hot pink → deep magenta → off-white
    float cycle = sin(time * 0.08 + phase) * 0.5 + 0.5;

    // Off-white plush (low saturation, high lightness)
    vec3 white_hi = hsl2rgb(vec3(0.93, 0.15, 0.85));
    vec3 white_lo = hsl2rgb(vec3(0.90, 0.10, 0.75));

    // Original intense coat colors
    vec3 pink_hi = hsl2rgb(vec3(0.93, 0.95, 0.72));
    vec3 pink_lo = hsl2rgb(vec3(0.86, 0.9, 0.55));

    vec3 hi = mix(white_hi, pink_hi, cycle);
    vec3 lo = mix(white_lo, pink_lo, cycle);
    return mix(lo, hi, t);
}

// Shoulder gleam tint — additive highlight on fur
vec3 matGleam() {
    return vec3(0.15, 0.08, 0.18);
}

// Fur noise texture — call once, pass to fur bands
// Returns fur_n (large scale fluff) and fur_fine (grain detail)
struct FurTex {
    float fluff;  // large-scale edge displacement
    float grain;  // fine surface detail
};

FurTex sampleFur(vec2 uv) {
    // Low-frequency noise for large gentle edge undulation
    vec2 fur_p = uv * 8.0 + vec2(DRIFT * 0.5, sin(DRIFT) * 0.3);
    FurTex f;
    f.fluff = fbm(fur_p);
    // Subtle surface grain — much lower intensity than before
    f.grain = fbm(uv * 14.0 + DRIFT * 0.15);
    return f;
}

// Apply fur material to a ribbon. d = signed distance to ribbon center,
// thick = ribbon half-width, fur = texture sample, depth = 0-1 brightness
void applyFurBand(inout vec3 col, float d, float thick, FurTex fur, float depth, float phase) {
    // Gentle edge undulation — large, smooth, not cloudy
    float fluff = (fur.fluff - 0.5) * 0.008;
    float df = abs(d) - fluff;
    float alpha = smoothstep(thick, thick * 0.05, df);
    float rim = smoothstep(0.008 + PULSE * 0.003, 0.0, abs(df - thick * 0.9)) * alpha;
    float core = exp(-d * d / (thick * thick * 0.15)) * alpha;

    float grad = smoothstep(-thick, thick, d);
    vec3 fur_col = matFur(grad, phase);
    // Very subtle grain — just enough to not be flat
    fur_col += (fur.grain - 0.5) * 0.04 * vec3(1.0, 0.9, 0.95);

    float gleam = exp(-pow(d * 8.0, 2.0)) * 0.1;
    fur_col += gleam * matGleam();

    float seam = exp(-d * d * 40000.0) * 0.2;

    col = mix(col, fur_col * depth, alpha * 0.95);
    col += rim * matChrome() * 2.0 * depth;
    col += core * matHot() * 0.08 * depth;
    col += seam * matChrome() * 0.2 * alpha * depth;
}

// Apply a clean light ribbon. d = signed distance, thick = half-width
void applyLightRibbon(inout vec3 col, float d, float thick, vec3 tint, float brightness) {
    float alpha = smoothstep(thick, thick * 0.1, abs(d));
    float core = exp(-d * d / (thick * thick * 0.12));
    col += alpha * tint * brightness + core * tint * brightness * 0.6;
}

// ============================================================================
// SMOOTH RIBBON PATH — wide waves with periodic swirl distortion
// ============================================================================
float ribbon(vec2 uv, float y0, float amp1, float freq1, float amp2, float freq2, float phase) {
    // Time-driven swirl that fades in and out
    float swirl_intensity = pow(sin(time * 0.06 + phase * 0.3) * 0.5 + 0.5, 2.0) * 0.08;
    float swirl = fbm(uv * 3.0 + vec2(DRIFT, phase)) * swirl_intensity;

    float path = y0
        + sin(uv.x * freq1 + DRIFT * 2.0 + phase) * amp1
        + sin(uv.x * freq2 + DRIFT * 1.3 + phase * 0.7) * amp2
        + swirl;
    return uv.y - path;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * res) / res.y;
    vec2 raw_uv01 = fragCoord / res;

    uv /= 1.0 + PULSE * 0.03;

    // ---- BACKDROP — deep synthwave dark ----
    vec3 bg = mix(vec3(0.04, 0.008, 0.06), vec3(0.015, 0.004, 0.035), smoothstep(-0.5, 0.5, uv.y));
    bg += exp(-dot(uv, uv) * 4.0) * vec3(0.08, 0.03, 0.1) * (0.5 + PULSE * 0.2);

    // Motes
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float px = hash(vec2(fi, 10.0)) * 2.0 - 1.0;
        float py = fract(hash(vec2(fi, 20.0)) + time * 0.003 * (0.2 + hash(vec2(fi, 30.0)))) * 1.0 - 0.5;
        float glow = exp(-length(uv - vec2(px, py)) / 0.0015) * 0.02;
        bg += glow * matHot() * 0.5;
    }

    vec3 col = bg;
    FurTex fur = sampleFur(uv);

    // ---- RIBBONS — back to front ----

    // 1. Back clean — dim, wide
    {
        float d = ribbon(uv, -0.32, 0.08, 0.8, 0.03, 2.0, 0.0);
        applyLightRibbon(col, d, 0.04, matLeather() * 3.0, 0.3);
    }

    // 2. Back fur band — wide wave
    {
        float d = ribbon(uv, -0.14, 0.10, 0.6, 0.04, 1.5, 1.5);
        applyFurBand(col, d, 0.10, fur, 0.6, 0.0);
    }

    // 3. Mid clean — bright accent line
    {
        float d = ribbon(uv, 0.0, 0.12, 0.5, 0.05, 1.3, 3.0);
        applyLightRibbon(col, d, 0.015, matHot(), 0.4);
    }

    // 4. Hero fur band — widest, full intensity
    {
        float d = ribbon(uv, 0.10, 0.09, 0.7, 0.04, 1.8, 4.8);
        applyFurBand(col, d, 0.12, fur, 1.0, 2.1);
    }

    // 5. Upper clean — thin chrome accent
    {
        float d = ribbon(uv, 0.26, 0.06, 0.9, 0.03, 2.2, 6.2);
        applyLightRibbon(col, d, 0.012, matChrome(), 0.35);
    }

    // 6. Top fur band — wide, slightly receded
    {
        float d = ribbon(uv, 0.36, 0.07, 1.0, 0.03, 1.9, 7.5);
        applyFurBand(col, d, 0.08, fur, 0.75, 4.2);
    }

    // 7. Front accent — thin, hot
    {
        float d = ribbon(uv, -0.06, 0.14, 0.4, 0.06, 1.1, 9.0);
        float core = exp(-d * d / (0.006 * 0.006 * 0.1));
        col += core * matHot() * 0.35;
    }

    // Soft center wash
    float center_wash = exp(-dot(uv, uv) * 3.0);
    col += center_wash * matGleam() * PULSE * 0.3;

    // ---- DEPTH ECHO — horizontal, no rotation ----
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
        col = mix(col, echo, 0.12);
    }

    // ---- FEEDBACK ----
    vec2 fb_uv = raw_uv01;
    fb_uv.x += 0.0004;
    fb_uv.y -= 0.0002;
    vec3 prev = getLastFrameColor(fb_uv).rgb * 0.96;
    if (frame < 30) prev = col;
    col = mix(col, prev, 0.35);

    // Wide desktop vignette
    col *= 1.0 - smoothstep(0.55, 1.2, length(uv * vec2(0.6, 1.0)));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
