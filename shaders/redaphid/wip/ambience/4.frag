// @fullscreen: true
// @mobile: true
// Plush aurora — wide silky ribbons with soft fur texture
#define PI 3.14159265

#define DRIFT (time * 0.04)
#define PULSE (sin(time * 0.2) * 0.5 + 0.5)
#define BREATH (sin(time * 0.15) * 0.5 + 0.5)

// ============================================================================
// NOISE — smooth, large-scale
// ============================================================================
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // quintic interpolation
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

// Gentle domain warp — large, slow curves
vec2 warp(vec2 p) {
    float n1 = fbm(p * 0.7 + vec2(DRIFT, 0.0));
    float n2 = fbm(p * 0.7 + vec2(5.2, DRIFT * 0.8));
    return p + vec2(n1, n2) * 0.45;
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// ============================================================================
// RIBBON FIELD — wide, flowing, few
// ============================================================================
float ribbonSDF(vec2 uv, float y_center, float thickness, float phase) {
    vec2 wp = warp(uv * 0.8 + vec2(phase * 0.3, 0.0));
    return abs(wp.y - y_center) - thickness;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * res) / res.y;
    vec2 raw_uv01 = fragCoord / res;

    // Slow breathing zoom
    uv /= 1.0 + PULSE * 0.05;

    // ---- BACKDROP ----
    float bg_grad = smoothstep(-0.5, 0.5, uv.y);
    vec3 bg = mix(vec3(0.06, 0.012, 0.09), vec3(0.02, 0.005, 0.05), bg_grad);

    // Soft horizontal glow
    float horizon = exp(-uv.y * uv.y * 6.0);
    bg += horizon * vec3(0.2, 0.08, 0.25) * (0.25 + PULSE * 0.1);

    // Very soft radial rays
    float ray_ang = atan(uv.y, uv.x);
    float rays = pow(abs(sin(ray_ang * 3.0 + time * 0.02)), 20.0);
    rays *= exp(-length(uv) * 2.0);
    bg += rays * vec3(0.4, 0.2, 0.1) * PULSE * 0.05;

    // Motes
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float px = hash(vec2(fi, 10.0)) * 1.8 - 0.9;
        float py = fract(hash(vec2(fi, 20.0)) + time * 0.004 * (0.2 + hash(vec2(fi, 30.0)))) * 1.0 - 0.5;
        float glow = exp(-length(uv - vec2(px, py)) / 0.002) * 0.03;
        bg += glow * vec3(1.0, 0.7, 0.9);
    }

    // ---- 4 WIDE RIBBONS ----
    // Each ribbon: y position, thickness, phase offset
    float y_pos[4]  = float[4](-0.22, -0.04, 0.14, 0.30);
    float thick[4]  = float[4]( 0.07,  0.09,  0.08, 0.065);
    float phase[4]  = float[4]( 0.0,   1.7,   3.4,  5.1);
    // Depth ordering — back ribbons are dimmer/cooler
    float depth[4]  = float[4]( 0.5,   1.0,   0.8,  0.6);

    // Fur texture — low frequency, soft
    vec2 fur_p = uv * 12.0 + vec2(sin(DRIFT) * 0.4, cos(DRIFT * 0.7) * 0.3);
    float fur_n = fbm(fur_p);

    // Fine fur grain overlay
    float fur_fine = fbm(uv * 28.0 + DRIFT * 0.5);

    vec3 col = bg;

    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float y = y_pos[i] + sin(time * 0.1 + phase[i]) * 0.03;
        float th = thick[i] + BREATH * 0.01;

        float d = ribbonSDF(uv, y, th, phase[i]);

        // Soft fur edge — large scale fluff
        float fluff = (fur_n - 0.5) * 0.04;
        d -= fluff;

        // Wide soft edge transition
        float ribbon = smoothstep(0.02, -0.02, d);

        // Chrome rim — soft, wide
        float rim = smoothstep(0.015 + PULSE * 0.005, 0.0, abs(d));
        rim *= ribbon * (1.0 - ribbon) * 4.0;

        // Inner luminosity — brighter at the center of each ribbon
        float center_bright = exp(-d * d * 200.0) * ribbon;

        // Color — gradient across ribbons, lighter on top
        float t = (fi + 0.5) / 4.0;
        vec3 ribbon_col_hi = hsl2rgb(vec3(0.93 + t * 0.03, 0.8, 0.68 - t * 0.1));
        vec3 ribbon_col_lo = hsl2rgb(vec3(0.87 + t * 0.02, 0.75, 0.45));
        float grad = smoothstep(y - th, y + th, uv.y);
        vec3 ribbon_col = mix(ribbon_col_lo, ribbon_col_hi, grad);

        // Fur texture tint — subtle light/dark variation like real fur
        ribbon_col += (fur_fine - 0.5) * 0.08 * vec3(1.0, 0.9, 0.95);

        // Apply depth
        float d_factor = depth[i];
        vec3 chrome = hsl2rgb(vec3(0.83, 0.85, 0.6));
        vec3 hot = hsl2rgb(vec3(0.08, 0.7, 0.5));

        col = mix(col, ribbon_col * d_factor, ribbon * 0.9);
        col += rim * chrome * 1.2 * d_factor;
        col += center_bright * hot * 0.15 * d_factor;
    }

    // Soft center glow over everything
    float center_wash = exp(-dot(uv, uv) * 3.0);
    col += center_wash * vec3(0.15, 0.06, 0.18) * PULSE * 0.3;

    // ---- INFINITY MIRROR ----
    {
        vec2 c01 = vec2(0.5);
        float mz = mix(1.5, 2.2, PULSE);
        float rot = time * 0.03 + sin(DRIFT) * 0.2;
        float ca = cos(rot), sa = sin(rot);
        vec2 muv = raw_uv01 - c01;
        muv = vec2(muv.x * ca - muv.y * sa, muv.x * sa + muv.y * ca);
        muv += c01;
        int steps = int(2.0 + PULSE * 3.0);
        for (int i = 0; i < 6; i++) {
            if (i >= steps) break;
            muv = (muv - c01) * mz + c01;
            muv = fract(muv);
        }
        vec3 mirror = getLastFrameColor(muv).rgb;
        vec3 mh = rgb2hsl(mirror);
        mh.y = clamp(mh.y * 1.4 + 0.1, 0.0, 1.0);
        mh.x = fract(mh.x + PULSE * 0.03);
        mirror = hsl2rgb(mh);
        col = mix(col, mirror, 0.2);
    }

    // ---- FEEDBACK ----
    vec2 fb_uv = raw_uv01;
    fb_uv.x += sin(time * 0.1) * 0.0008;
    fb_uv.y -= 0.0005;
    vec3 prev = getLastFrameColor(fb_uv).rgb * 0.94;
    float fb = 0.45;
    if (frame < 30) fb = 0.0;
    col = mix(col, prev, fb);

    // Wide vignette for desktop
    col *= 1.0 - smoothstep(0.6, 1.3, length(uv * vec2(0.7, 1.0)));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
