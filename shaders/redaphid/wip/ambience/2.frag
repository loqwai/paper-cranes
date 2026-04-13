// @fullscreen: true
// @mobile: true
// Abstract synthwave fur — same pink coat aesthetic, no figure
// Iteration 2: replaced silhouette with organic blooming shapes
#define PI 3.14159265

#define DRIFT (time * 0.08)
#define SWAY  (sin(time * 0.15))
#define PULSE (sin(time * 0.3) * 0.5 + 0.5)
#define BREATH (sin(time * 0.25) * 0.5 + 0.5)

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

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Organic blob field — several smooth metaball-ish circles that drift
float sdBlobs(vec2 p) {
    float d = 1e6;
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float ang = fi * PI * 2.0 / 6.0 + DRIFT * (0.3 + fi * 0.1);
        float r_orbit = 0.12 + 0.06 * sin(DRIFT * 0.7 + fi * 1.3);
        vec2 c = vec2(cos(ang), sin(ang)) * r_orbit;
        c.y -= 0.05;
        float sz = 0.08 + 0.03 * sin(time * 0.2 + fi * 2.0);
        float blob = length(p - c) - sz;
        d = smin(d, blob, 0.12);
    }
    // Central mass
    float core = length(p - vec2(0.0, -0.05)) - (0.14 + BREATH * 0.03);
    d = smin(d, core, 0.15);
    return d;
}

// Outer halo — a larger, looser ring of shapes (the "coat")
float sdCoat(vec2 p) {
    float inner = sdBlobs(p);
    // Inflate outward like the fur coat
    float inflated = inner - (0.1 + BREATH * 0.015);

    // Add flowing tendrils that drape downward
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float x = (fi - 1.5) * 0.14;
        vec2 tendril_top = vec2(x + SWAY * 0.02, -0.1);
        vec2 tendril_bot = vec2(x + SWAY * 0.04 + sin(DRIFT + fi) * 0.03, -0.55);
        vec2 pa = p - tendril_top;
        vec2 ba = tendril_bot - tendril_top;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        float tendril = length(pa - ba * h) - (0.04 + 0.02 * sin(time * 0.18 + fi));
        inflated = smin(inflated, tendril, 0.08);
    }

    return inflated;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * res) / min(res.x, res.y);
    vec2 raw_uv01 = fragCoord / res;

    // Gentle breathing zoom
    float zoomAmount = 1.0 + PULSE * 0.12;
    vec2 center = vec2(0.0, 0.0);
    uv = (uv - center) / zoomAmount + center;

    // ---- BACKDROP ----
    float bg_grad = smoothstep(-0.8, 0.8, uv.y);
    vec3 bg = mix(vec3(0.08, 0.02, 0.12), vec3(0.02, 0.0, 0.05), bg_grad);

    float spot = exp(-dot(uv, uv) * 3.0);
    bg += spot * vec3(0.4, 0.15, 0.5) * (0.3 + 0.2 * sin(DRIFT * 2.0));

    // Ambient rays from center
    float ray_ang = atan(uv.y, uv.x);
    float rays = pow(abs(sin(ray_ang * 4.0 + time * 0.06)), 12.0);
    rays *= exp(-length(uv) * 0.8) * smoothstep(0.0, 0.3, length(uv));
    bg += rays * vec3(0.8, 0.4, 0.2) * PULSE * 0.12;

    // Floating motes
    for (int i = 0; i < 10; i++) {
        float fi = float(i);
        float px = hash(vec2(fi, 10.0)) * 1.8 - 0.9;
        float py = fract(hash(vec2(fi, 20.0)) + time * 0.008 * (0.3 + hash(vec2(fi, 30.0)))) * 1.8 - 0.9;
        float sz = hash(vec2(fi, 40.0)) * 0.003 + 0.001;
        float glow = exp(-length(uv - vec2(px, py)) / sz) * 0.06;
        bg += glow * vec3(1.0, 0.6, 0.9);
    }

    // ---- SHAPES ----
    float d_inner = sdBlobs(uv);
    float d_coat = sdCoat(uv);

    // Fur fluff on the coat edge
    vec2 fur_p = uv * 40.0 + vec2(sin(DRIFT) * 0.2, cos(DRIFT * 0.7) * 0.15);
    float fur_n = fbm(fur_p);
    float fluff_amp = 0.02 + BREATH * 0.008;
    float d_coat_fluff = d_coat - (fur_n - 0.5) * fluff_amp;

    float inner = smoothstep(0.005, -0.005, d_inner);
    float coat = smoothstep(0.006, -0.006, d_coat_fluff);

    // Rim lights
    float rim_w = 0.007 + PULSE * 0.004;
    float inner_rim = smoothstep(rim_w, 0.0, abs(d_inner));
    inner_rim *= inner * (1.0 - inner) * 4.0;

    float coat_rim = smoothstep(rim_w, 0.0, abs(d_coat_fluff));
    coat_rim *= coat * (1.0 - coat) * 4.0;

    // Core glow
    float core_glow = exp(-dot(uv + vec2(0.0, 0.05), uv + vec2(0.0, 0.05)) * 8.0);
    core_glow *= inner * (0.3 + PULSE * 0.4);

    // Eye-like focal points — two warm embers inside the form
    vec2 le = vec2(-0.045, 0.04);
    vec2 re = vec2( 0.045, 0.04);
    float eyes = exp(-dot(uv - le, uv - le) * 3000.0) + exp(-dot(uv - re, uv - re) * 3000.0);
    eyes *= 0.35 + PULSE * 0.3;

    // God rays from focal points
    vec2 d_le = uv - le;
    vec2 d_re = uv - re;
    float r_le = length(d_le);
    float r_re = length(d_re);
    float a_le = atan(d_le.y, d_le.x);
    float a_re = atan(d_re.y, d_re.x);
    float fan_le = pow(abs(cos(a_le * 6.0 + time * 0.08)), 14.0);
    float fan_re = pow(abs(cos(a_re * 6.0 - time * 0.07 + 1.3)), 14.0);
    float fall_le = exp(-r_le * 1.5);
    float fall_re = exp(-r_re * 1.5);
    float up_le = smoothstep(-1.0, 0.3, d_le.y / max(r_le, 0.001));
    float up_re = smoothstep(-1.0, 0.3, d_re.y / max(r_re, 0.001));
    float god_rays = (fan_le * fall_le * up_le + fan_re * fall_re * up_re) * PULSE;
    god_rays += (exp(-r_le * 12.0) + exp(-r_re * 12.0)) * PULSE * 0.4;

    float wash = (exp(-r_le * 1.2) + exp(-r_re * 1.2)) * 0.06;

    // ---- COLORS ----
    float hue = 0.78;
    vec3 chrome = hsl2rgb(vec3(fract(hue + 0.05), 0.8, 0.55));
    vec3 hot = hsl2rgb(vec3(0.08, 0.8, 0.5));

    // Inner form — warm plum
    vec3 inner_col = hsl2rgb(vec3(0.92, 0.5, 0.2));

    // Coat — pink gradient like the fur coat
    float coat_grad = smoothstep(0.1, -0.4, uv.y);
    vec3 fur_hi = hsl2rgb(vec3(0.93, 0.85, 0.65));
    vec3 fur_lo = hsl2rgb(vec3(0.86, 0.80, 0.48));
    vec3 fur_col = mix(fur_hi, fur_lo, coat_grad);

    // Gleam band
    float gleam = exp(-pow((uv.y - 0.05) * 8.0, 2.0));
    fur_col += gleam * vec3(0.10, 0.06, 0.14);

    // ---- COMPOSITE ----
    vec3 col = bg;
    col = mix(col, fur_col, coat);
    col = mix(col, inner_col, inner);
    col += inner_rim * chrome * 0.8;
    col += coat_rim * chrome * 1.6;
    col += core_glow * chrome * 0.6;
    col += eyes * hot * 1.4;
    col = mix(col, col + hot * 0.3, wash);
    col += god_rays * hot * 1.0;

    // ---- INFINITY MIRROR ----
    {
        float minRes = min(res.x, res.y);
        vec2 center01 = vec2(0.5, 0.5);
        float mirrorZoom = mix(1.3, 1.8, PULSE);
        float rot = time * 0.05 + sin(DRIFT) * 0.3;
        float ca = cos(rot), sa = sin(rot);
        vec2 mirror_uv = raw_uv01 - center01;
        mirror_uv = vec2(mirror_uv.x * ca - mirror_uv.y * sa,
                         mirror_uv.x * sa + mirror_uv.y * ca);
        mirror_uv += center01;
        int mirrorSteps = int(2.0 + PULSE * 4.0);
        for (int i = 0; i < 8; i++) {
            if (i >= mirrorSteps) break;
            mirror_uv = (mirror_uv - center01) * mirrorZoom + center01;
            mirror_uv = fract(mirror_uv);
        }
        vec3 mirror = getLastFrameColor(mirror_uv).rgb;
        vec3 mh = rgb2hsl(mirror);
        mh.y = clamp(mh.y * 1.6 + 0.2, 0.0, 1.0);
        mh.x = fract(mh.x + PULSE * 0.05);
        mirror = hsl2rgb(mh);
        float sil = max(inner, coat);
        col = mix(col, mirror, (1.0 - sil) * 0.35);
    }

    // ---- FEEDBACK ----
    vec2 fb_uv = raw_uv01;
    fb_uv.y -= 0.001;
    fb_uv.x += SWAY * 0.002;
    vec3 prev = getLastFrameColor(fb_uv).rgb * 0.92;
    float sil = max(inner, coat);
    float feedback_amt = mix(0.55, 0.2, sil);
    if (frame < 30) feedback_amt = 0.0;
    col = mix(col, prev, feedback_amt);

    // Vignette
    col *= 1.0 - smoothstep(0.7, 1.4, length(uv * vec2(1.0, 0.85)));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
