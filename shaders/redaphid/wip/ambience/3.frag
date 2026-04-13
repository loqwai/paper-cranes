// @fullscreen: true
// @mobile: true
// Plush synthwave — horizontal flowing fur ribbons with chrome and pink
#define PI 3.14159265

#define DRIFT (time * 0.06)
#define PULSE (sin(time * 0.3) * 0.5 + 0.5)
#define BREATH (sin(time * 0.25) * 0.5 + 0.5)

// ============================================================================
// NOISE
// ============================================================================
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
        s += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return s;
}

// Domain warping — gives the horizontal lines their organic whorls
vec2 warp(vec2 p) {
    float n1 = fbm(p + vec2(DRIFT * 0.7, 0.0));
    float n2 = fbm(p + vec2(3.7, DRIFT * 0.5));
    return p + vec2(n1, n2) * 0.6;
}

// ============================================================================
// RIBBON FIELD — horizontal bands with turbulence
// ============================================================================
float ribbonField(vec2 p) {
    // Warp the space — this creates the whorls and twists
    vec2 wp = warp(p * 1.8);

    // Stack of horizontal ribbons at different y-offsets
    float d = 1e6;
    for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float y_center = (fi - 3.0) * 0.18 + sin(DRIFT * (0.3 + fi * 0.08) + fi * 1.7) * 0.06;
        float thickness = 0.04 + 0.02 * sin(time * 0.15 + fi * 2.3);

        // Ribbon as warped horizontal band
        float band = abs(wp.y - y_center) - thickness;

        // Taper at the edges so ribbons fade horizontally
        float taper = smoothstep(1.2, 0.4, abs(wp.x + sin(fi * 1.1) * 0.3));
        band /= max(taper, 0.01);

        d = min(d, band);
    }
    return d;
}

// Secondary layer — wider, softer shapes underneath (the "blanket")
float blanketField(vec2 p) {
    vec2 wp = warp(p * 1.2 + vec2(1.5, 0.8));

    float d = 1e6;
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float y_center = (fi - 1.5) * 0.28 + sin(DRIFT * 0.2 + fi * 2.5) * 0.08;
        float thickness = 0.08 + 0.03 * sin(time * 0.12 + fi * 3.1);
        float band = abs(wp.y - y_center) - thickness;
        float taper = smoothstep(1.4, 0.3, abs(wp.x + cos(fi * 0.9) * 0.2));
        band /= max(taper, 0.01);
        d = min(d, band);
    }
    return d;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    float aspect = res.x / res.y;
    vec2 uv = (fragCoord - 0.5 * res) / res.y;
    vec2 raw_uv01 = fragCoord / res;

    // Gentle breathing zoom
    float zoom = 1.0 + PULSE * 0.08;
    uv /= zoom;

    // ---- BACKDROP — deep synthwave ----
    float bg_grad = smoothstep(-0.5, 0.5, uv.y);
    vec3 bg = mix(vec3(0.07, 0.015, 0.10), vec3(0.02, 0.005, 0.06), bg_grad);

    // Soft horizontal glow band
    float horizon = exp(-uv.y * uv.y * 12.0);
    bg += horizon * vec3(0.3, 0.1, 0.35) * (0.3 + PULSE * 0.15);

    // Slow radial rays from center
    float ray_ang = atan(uv.y, uv.x);
    float rays = pow(abs(sin(ray_ang * 5.0 + time * 0.04)), 16.0);
    rays *= exp(-length(uv) * 1.5) * smoothstep(0.0, 0.2, length(uv));
    bg += rays * vec3(0.6, 0.3, 0.15) * PULSE * 0.08;

    // Floating motes
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float px = hash(vec2(fi, 10.0)) * aspect * 1.2 - aspect * 0.6;
        float py = fract(hash(vec2(fi, 20.0)) + time * 0.006 * (0.3 + hash(vec2(fi, 30.0)))) * 1.2 - 0.6;
        float sz = hash(vec2(fi, 40.0)) * 0.002 + 0.0008;
        float glow = exp(-length(uv - vec2(px, py)) / sz) * 0.04;
        bg += glow * vec3(1.0, 0.7, 0.9);
    }

    // ---- RIBBON SHAPES ----
    float d_ribbon = ribbonField(uv);
    float d_blanket = blanketField(uv);

    // Fur texture on ribbon edges — shaggy, plush
    vec2 fur_p = uv * 45.0 + vec2(sin(DRIFT * 0.8) * 0.3, cos(DRIFT * 0.6) * 0.2);
    float fur_n = fbm(fur_p);
    float fluff = (fur_n - 0.5) * (0.025 + BREATH * 0.008);
    float d_ribbon_fur = d_ribbon - fluff;
    float d_blanket_fur = d_blanket - fluff * 1.5;

    float ribbon = smoothstep(0.005, -0.005, d_ribbon_fur);
    float blanket = smoothstep(0.008, -0.008, d_blanket_fur);

    // Chrome rim on ribbons
    float rim_w = 0.006 + PULSE * 0.003;
    float ribbon_rim = smoothstep(rim_w, 0.0, abs(d_ribbon_fur));
    ribbon_rim *= ribbon * (1.0 - ribbon) * 4.0;

    float blanket_rim = smoothstep(rim_w * 1.5, 0.0, abs(d_blanket_fur));
    blanket_rim *= blanket * (1.0 - blanket) * 4.0;

    // Inner glow along ribbon centers
    float ribbon_core = exp(-d_ribbon * d_ribbon * 800.0) * ribbon;
    ribbon_core *= 0.3 + PULSE * 0.3;

    // ---- COLORS — synthwave pink fur palette ----
    float hue = 0.78;
    vec3 chrome = hsl2rgb(vec3(fract(hue + 0.05), 0.85, 0.6));
    vec3 hot = hsl2rgb(vec3(0.08, 0.8, 0.55));

    // Ribbon color — rich pink with vertical gradient
    float ribbon_grad = smoothstep(-0.3, 0.3, uv.y);
    vec3 ribbon_hi = hsl2rgb(vec3(0.94, 0.9, 0.72));
    vec3 ribbon_lo = hsl2rgb(vec3(0.87, 0.85, 0.52));
    vec3 ribbon_col = mix(ribbon_lo, ribbon_hi, ribbon_grad);

    // Fur texture tint — lighter on the "peaks" of the noise
    ribbon_col += fur_n * 0.12 * vec3(1.0, 0.9, 0.95);

    // Blanket color — deeper, warmer plush
    vec3 blanket_hi = hsl2rgb(vec3(0.91, 0.7, 0.55));
    vec3 blanket_lo = hsl2rgb(vec3(0.84, 0.65, 0.38));
    vec3 blanket_col = mix(blanket_lo, blanket_hi, ribbon_grad);
    blanket_col += fur_n * 0.08 * vec3(0.9, 0.8, 1.0);

    // Gleam band — horizontal shimmer
    float gleam = exp(-pow(uv.y * 8.0, 2.0)) * 0.15;

    // ---- COMPOSITE ----
    vec3 col = bg;

    // Blanket layer (behind ribbons)
    col = mix(col, blanket_col, blanket * 0.85);
    col += blanket_rim * chrome * 0.8;
    col += blanket * gleam * vec3(0.12, 0.06, 0.15);

    // Ribbon layer (on top)
    col = mix(col, ribbon_col, ribbon);
    col += ribbon_rim * chrome * 1.8;
    col += ribbon_core * hot * 0.6;
    col += ribbon * gleam * vec3(0.15, 0.08, 0.18);

    // God rays from the center — soft, wide
    float center_dist = length(uv);
    float center_ang = atan(uv.y, uv.x);
    float god_fan = pow(abs(cos(center_ang * 5.0 + time * 0.05)), 18.0);
    float god_fall = exp(-center_dist * 2.0);
    float god_rays = god_fan * god_fall * PULSE * 0.5;
    god_rays += exp(-center_dist * 6.0) * PULSE * 0.2;
    col += god_rays * hot * 0.7;

    // ---- INFINITY MIRROR ----
    {
        vec2 center01 = vec2(0.5);
        float mirrorZoom = mix(1.4, 2.0, PULSE);
        float rot = time * 0.04 + sin(DRIFT) * 0.25;
        float ca = cos(rot), sa = sin(rot);
        vec2 mirror_uv = raw_uv01 - center01;
        mirror_uv = vec2(mirror_uv.x * ca - mirror_uv.y * sa,
                         mirror_uv.x * sa + mirror_uv.y * ca);
        mirror_uv += center01;
        int steps = int(2.0 + PULSE * 4.0);
        for (int i = 0; i < 8; i++) {
            if (i >= steps) break;
            mirror_uv = (mirror_uv - center01) * mirrorZoom + center01;
            mirror_uv = fract(mirror_uv);
        }
        vec3 mirror = getLastFrameColor(mirror_uv).rgb;
        vec3 mh = rgb2hsl(mirror);
        mh.y = clamp(mh.y * 1.5 + 0.15, 0.0, 1.0);
        mh.x = fract(mh.x + PULSE * 0.04);
        mirror = hsl2rgb(mh);
        float sil = max(ribbon, blanket);
        col = mix(col, mirror, (1.0 - sil) * 0.3);
    }

    // ---- FEEDBACK ----
    vec2 fb_uv = raw_uv01;
    fb_uv.x += sin(time * 0.15) * 0.001;
    fb_uv.y -= 0.0008;
    vec3 prev = getLastFrameColor(fb_uv).rgb * 0.93;
    float sil = max(ribbon, blanket);
    float fb = mix(0.5, 0.2, sil);
    if (frame < 30) fb = 0.0;
    col = mix(col, prev, fb);

    // Vignette — wider for desktop
    col *= 1.0 - smoothstep(0.65, 1.3, length(uv * vec2(0.8, 1.0)));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
