// @fullscreen: true
// @mobile: true
// Ambient fur coat silhouette — synthwave desktop wallpaper
// Inspired by dubstep-daddy-fur-coat.frag, slowed to a meditative drift
#define PI 3.14159265

// ============================================================================
// SILHOUETTE SHAPE
// ============================================================================
#define SHOULDER_Y      -0.02
#define SHOULDER_SPREAD  0.158
#define SLEEVE_RADIUS    0.04
#define SHOULDER_CAP     0.042
#define CHEST_W_BASE     0.12
#define CHEST_H_BASE     0.065
#define FUR_THICK        0.08
#define VNECK_WIDTH      0.142
#define VNECK_BOTTOM    -0.013

// ============================================================================
// PACE — everything crawls
// ============================================================================
#define DRIFT (time * 0.08)
#define SWAY  (sin(time * 0.15))
#define PULSE (sin(time * 0.3) * 0.5 + 0.5)
#define BREATH (sin(time * 0.25) * 0.012)

// ============================================================================
// SDFs
// ============================================================================
float sdCircle(vec2 p, float r) { return length(p) - r; }

float sdEllipse(vec2 p, vec2 r) {
    float k1 = length(p / r);
    float k2 = length(p / (r * r));
    return k1 * (k1 - 1.0) / max(k2, 1e-4);
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

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
    for (int i = 0; i < 4; i++) {
        s += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return s;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// ============================================================================
// POSE — glacially slow sway
// ============================================================================
struct Pose {
    float bob;
    float tilt;
    float hip;
    vec2  head_c;
    vec2  l_hand;
    vec2  r_hand;
};

Pose makePose() {
    Pose P;
    P.bob = BREATH;
    P.tilt = SWAY * 0.06;
    P.hip = SWAY * 0.015;
    P.head_c = vec2(P.hip * 0.6, 0.30 + P.bob);
    P.l_hand = vec2(-0.30, -0.38);
    P.r_hand = vec2( 0.30, -0.38 + sin(time * 0.12) * 0.005);
    return P;
}

// ============================================================================
// BODY SDF
// ============================================================================
float sdDaddy(vec2 p, Pose P) {
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 hp = p - P.head_c;
    hp = vec2(hp.x * ct - hp.y * st, hp.x * st + hp.y * ct);

    float head = sdEllipse(hp, vec2(0.13, 0.15));
    float jaw = sdEllipse(hp - vec2(0.0, -0.05), vec2(0.11, 0.09));
    head = smin(head, jaw, 0.04);

    vec2 np = p - vec2(P.hip * 0.7, 0.13);
    float neck = sdEllipse(np, vec2(0.055, 0.045));

    float chest_w = 0.23 + BREATH * 2.0;
    float chest_h = 0.17 + BREATH;
    vec2 cp = p - vec2(P.hip * 0.8, -0.02);
    float chest = sdEllipse(cp, vec2(chest_w, chest_h));

    vec2 wp = p - vec2(P.hip * 1.4, -0.22);
    float hips = sdEllipse(wp, vec2(0.20, 0.09));

    float coat_edge = SHOULDER_SPREAD;
    vec2 ls = vec2(-coat_edge + P.hip * 0.4, SHOULDER_Y);
    vec2 rs = vec2( coat_edge + P.hip * 0.4, SHOULDER_Y);
    float lshoulder = sdCircle(p - ls, SHOULDER_CAP);
    float rshoulder = sdCircle(p - rs, SHOULDER_CAP);

    vec2 l_mid = mix(ls, P.l_hand, 0.5);
    vec2 r_mid = mix(rs, P.r_hand, 0.5);
    vec2 l_elbow = l_mid + vec2(0.015, 0.0);
    vec2 r_elbow = r_mid + vec2(-0.015, 0.0);
    float l_upper = sdCapsule(p, ls, l_elbow, 0.04);
    float l_lower = sdCapsule(p, l_elbow, P.l_hand, 0.035);
    float r_upper = sdCapsule(p, rs, r_elbow, 0.04);
    float r_lower = sdCapsule(p, r_elbow, P.r_hand, 0.035);
    float l_fist = sdCircle(p - P.l_hand, 0.055);
    float r_fist = sdCircle(p - P.r_hand, 0.055);

    float d = head;
    d = smin(d, neck, 0.035);
    d = smin(d, chest, 0.05);
    d = smin(d, hips, 0.05);
    d = smin(d, lshoulder, 0.04);
    d = smin(d, rshoulder, 0.04);
    d = smin(d, l_upper, 0.035);
    d = smin(d, l_lower, 0.035);
    d = smin(d, r_upper, 0.035);
    d = smin(d, r_lower, 0.035);
    d = smin(d, l_fist, 0.025);
    d = smin(d, r_fist, 0.025);
    return d;
}

// ============================================================================
// TORSO (coat base)
// ============================================================================
float sdTorso(vec2 p, Pose P) {
    float chest_w = CHEST_W_BASE + BREATH * 2.0;
    float chest_h = CHEST_H_BASE + BREATH;
    vec2 cp = p - vec2(P.hip * 0.8, 0.01);
    float chest = sdEllipse(cp, vec2(chest_w, chest_h));

    vec2 wpn = p - vec2(P.hip * 1.0, -0.12);
    float waist = sdEllipse(wpn, vec2(0.16, 0.08));

    vec2 wp = p - vec2(P.hip * 1.4, -0.24);
    float hips = sdEllipse(wp, vec2(0.17, 0.09));

    float d = chest;
    d = smin(d, waist, 0.08);
    d = smin(d, hips, 0.08);
    return d;
}

// ============================================================================
// FUR COAT
// ============================================================================
float sdFurCoat(vec2 p, Pose P) {
    float d_torso = sdTorso(p, P);

    float coat_edge = SHOULDER_SPREAD;
    vec2 ls = vec2(-coat_edge + P.hip * 0.4, SHOULDER_Y);
    vec2 rs = vec2( coat_edge + P.hip * 0.4, SHOULDER_Y);
    vec2 l_wrist = mix(ls, P.l_hand, 0.55);
    vec2 r_wrist = mix(rs, P.r_hand, 0.55);
    float l_sleeve = sdCapsule(p, ls, l_wrist, SLEEVE_RADIUS);
    float r_sleeve = sdCapsule(p, rs, r_wrist, SLEEVE_RADIUS);

    float l_cap = sdCircle(p - ls, SHOULDER_CAP);
    float r_cap = sdCircle(p - rs, SHOULDER_CAP);
    float coat_base = min(d_torso, l_sleeve);
    coat_base = min(coat_base, r_sleeve);
    coat_base = smin(coat_base, l_cap, 0.04);
    coat_base = smin(coat_base, r_cap, 0.04);

    float fur_thickness = FUR_THICK + BREATH * 0.3;
    float inflated = coat_base - fur_thickness;

    vec2 hem_c = vec2(P.hip * 1.0, -0.55);
    float hem = sdEllipse(p - hem_c, vec2(0.26, 0.45));
    inflated = smin(inflated, hem, 0.06);

    float cx = P.hip * 0.7;
    float v_bottom = VNECK_BOTTOM;
    float v_half_at_top = VNECK_WIDTH;
    float v_slope = v_half_at_top / 0.17;
    float v_half = max(0.0, (p.y - v_bottom)) * v_slope;
    float v_horiz = abs(p.x - cx) - v_half;
    float v_vert = v_bottom - p.y;
    float v_wedge = max(v_horiz, v_vert);

    float d = -smin(-inflated, v_wedge, 0.015);
    return d;
}

// ============================================================================
// CURLS
// ============================================================================
float sdCurls(vec2 p, Pose P) {
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 hp = p - P.head_c;
    hp = vec2(hp.x * ct - hp.y * st, hp.x * st + hp.y * ct);

    float d = 1e6;
    for (int i = 0; i < 14; i++) {
        float fi = float(i);
        float t = fi / 13.0;
        float ang = mix(PI * 1.05, PI * -0.05, t);
        float radius = 0.155;
        float jx = hash(vec2(fi, 1.0)) - 0.5;
        float jy = hash(vec2(fi, 2.0)) - 0.5;
        vec2 c = vec2(cos(ang), sin(ang)) * radius + vec2(jx, jy) * 0.025;
        float crown_bias = sin(t * PI);
        float r = 0.045 + crown_bias * 0.015 + hash(vec2(fi, 3.0)) * 0.01;
        float ph = hash(vec2(fi, 4.0)) * 6.28;
        float bounce = sin(DRIFT * 1.5 + ph) * 0.004;
        c.y += bounce;
        d = smin(d, sdCircle(hp - c, r), 0.025);
    }
    return d;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * res) / min(res.x, res.y);

    Pose P = makePose();

    // Gentle zoom that breathes
    float zoomAmount = 1.0 + PULSE * 0.15;
    vec2 zoomCenter = P.head_c;
    uv = (uv - zoomCenter) / zoomAmount + zoomCenter;

    // ---- BACKDROP — deep synthwave gradient ----
    float bg_grad = smoothstep(-0.8, 0.8, uv.y);
    vec3 bg = mix(vec3(0.08, 0.02, 0.12), vec3(0.02, 0.0, 0.05), bg_grad);

    // Slow-pulsing spotlight behind the figure
    float spot = exp(-pow(uv.x, 2.0) * 4.0) * smoothstep(-0.3, -0.6, uv.y);
    bg += spot * vec3(0.5, 0.2, 0.6) * (0.4 + 0.2 * sin(DRIFT * 2.0));

    // Gentle god-rays drifting upward
    float rays = pow(max(0.0, 1.0 - abs(uv.x) * 1.2), 4.0) * smoothstep(0.0, 1.0, uv.y);
    bg += rays * vec3(0.8, 0.5, 0.2) * PULSE * 0.15;

    // Ambient particles — tiny floating motes
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float px = hash(vec2(fi, 10.0)) * 1.6 - 0.8;
        float py = fract(hash(vec2(fi, 20.0)) + time * 0.01 * (0.5 + hash(vec2(fi, 30.0)))) * 1.6 - 0.8;
        float sz = hash(vec2(fi, 40.0)) * 0.003 + 0.001;
        float glow = exp(-length(uv - vec2(px, py)) / sz) * 0.08;
        bg += glow * vec3(1.0, 0.6, 0.9);
    }

    // ---- FIGURE ----
    float d_body  = sdDaddy(uv, P);
    float d_curls = sdCurls(uv, P);
    float d_coat  = sdFurCoat(uv, P);

    // Fur fluff — slow undulation
    vec2 fur_p = uv * 38.0 + vec2(0.0, sin(DRIFT) * 0.1);
    float fur_n = fbm(fur_p);
    float fluff_amp = 0.016 + BREATH * 0.3;
    float d_coat_fluff = d_coat - (fur_n - 0.5) * fluff_amp;

    float d = min(d_body, d_curls);

    float body  = smoothstep(0.005, -0.005, d);
    float curls = smoothstep(0.005, -0.005, d_curls);
    float coat  = smoothstep(0.006, -0.006, d_coat_fluff);

    // Soft rim light — gentle chrome edge
    float rim_w = 0.008 + PULSE * 0.004;
    float rim = smoothstep(rim_w, 0.0, abs(d));
    float edge_gate = body * (1.0 - body) * 4.0;
    rim *= edge_gate;

    float coat_rim = smoothstep(rim_w, 0.0, abs(d_coat_fluff));
    float coat_edge_gate = coat * (1.0 - coat) * 4.0;
    coat_rim *= coat_edge_gate;

    // Soft chest glow
    float chest_glow = exp(-pow(length(uv - vec2(P.hip * 0.8, -0.02)) * 3.0, 2.0));
    chest_glow *= smoothstep(0.005, -0.005, d_body) * (0.2 + PULSE * 0.3);

    // Eyes — soft warm embers, not blazing
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 le_local = vec2(-0.045, 0.02);
    vec2 re_local = vec2( 0.045, 0.02);
    vec2 le = P.head_c + vec2(le_local.x * ct + le_local.y * st, -le_local.x * st + le_local.y * ct);
    vec2 re = P.head_c + vec2(re_local.x * ct + re_local.y * st, -re_local.x * st + re_local.y * ct);

    float eyes = exp(-dot(uv - le, uv - le) * 2500.0) + exp(-dot(uv - re, uv - re) * 2500.0);
    eyes *= 0.4 + PULSE * 0.3;

    // Soft eye wash — warm glow around the face
    float wash_le = exp(-length(uv - le) * 1.5);
    float wash_re = exp(-length(uv - re) * 1.5);
    float eye_wash = (wash_le + wash_re) * 0.08;

    // ---- COLOR PALETTE — same synthwave pinks, muted for calm ----
    float hue = 0.78;
    vec3 skin   = hsl2rgb(vec3(0.92, 0.45, 0.18));
    vec3 chrome  = hsl2rgb(vec3(fract(hue + 0.05), 0.8, 0.55));
    vec3 hair    = hsl2rgb(vec3(0.06, 0.7, 0.12));
    vec3 hot     = hsl2rgb(vec3(0.08, 0.8, 0.5));

    // Coat — same pink gradient, slightly softer
    float coat_grad = smoothstep(0.15, -0.4, uv.y);
    vec3 fur_hi = hsl2rgb(vec3(0.93, 0.85, 0.65));
    vec3 fur_lo = hsl2rgb(vec3(0.86, 0.80, 0.48));
    vec3 fur_col = mix(fur_hi, fur_lo, coat_grad);

    // Shoulder gleam
    float shoulder_gleam = exp(-pow((uv.y - 0.08) * 10.0, 2.0));
    fur_col += shoulder_gleam * vec3(0.10, 0.06, 0.14);

    // Center seam
    float seam_x_pos = P.hip * 0.7;
    float seam_dx = uv.x - seam_x_pos;
    float seam_glow = exp(-seam_dx * seam_dx * 40000.0);
    seam_glow *= smoothstep(-0.02, -0.10, uv.y) * 0.2;

    // ---- COMPOSITE ----
    vec3 col = bg;
    col = mix(col, skin, body);
    col = mix(col, fur_col, coat * (1.0 - curls));
    col = mix(col, hair, curls);
    col += rim * chrome * 0.8 * (1.0 - coat);
    col += chest_glow * chrome * 0.5 * (1.0 - coat);
    col += coat_rim * chrome * 1.4 * (1.0 - curls);
    col += seam_glow * coat * chrome * 0.15 * (1.0 - curls);
    // Eye god rays — slow fan patterns radiating upward
    vec2 d_le2 = uv - le;
    vec2 d_re2 = uv - re;
    float r_le = length(d_le2);
    float r_re = length(d_re2);
    float a_le = atan(d_le2.y, d_le2.x);
    float a_re = atan(d_re2.y, d_re2.x);
    float fan_le = pow(abs(cos(a_le * 6.0 + time * 0.08)), 14.0);
    float fan_re = pow(abs(cos(a_re * 6.0 - time * 0.07 + 1.3)), 14.0);
    float fall_le = exp(-r_le * 1.2);
    float fall_re = exp(-r_re * 1.2);
    float up_le = smoothstep(-1.0, 0.3, d_le2.y / max(r_le, 0.001));
    float up_re = smoothstep(-1.0, 0.3, d_re2.y / max(r_re, 0.001));
    float god_rays = (fan_le * fall_le * up_le + fan_re * fall_re * up_re) * PULSE;
    god_rays += (exp(-r_le * 10.0) + exp(-r_re * 10.0)) * PULSE * 0.4;

    col += eyes * hot * 1.2;
    col = mix(col, col + hot * 0.3, eye_wash);
    col += eye_wash * hot * 0.2;
    col += god_rays * hot * 1.2;

    // ---- INFINITY MIRROR — slow hypnotic recursion ----
    {
        float minRes = min(res.x, res.y);
        vec2 head_uv01 = vec2(0.5) + P.head_c * vec2(minRes / res.x, minRes / res.y);
        float mirrorZoom = mix(1.3, 1.8, PULSE);
        float rot = time * 0.05 + sin(DRIFT) * 0.3;
        float ca2 = cos(rot), sa2 = sin(rot);
        vec2 raw_uv01 = fragCoord / res;
        vec2 mirror_uv = raw_uv01 - head_uv01;
        mirror_uv = vec2(mirror_uv.x * ca2 - mirror_uv.y * sa2,
                         mirror_uv.x * sa2 + mirror_uv.y * ca2);
        mirror_uv += head_uv01;
        int mirrorSteps = int(2.0 + PULSE * 4.0);
        for (int i = 0; i < 8; i++) {
            if (i >= mirrorSteps) break;
            mirror_uv = (mirror_uv - head_uv01) * mirrorZoom + head_uv01;
            mirror_uv = fract(mirror_uv);
        }
        vec3 mirror = getLastFrameColor(mirror_uv).rgb;
        vec3 mh = rgb2hsl(mirror);
        mh.y = clamp(mh.y * 1.6 + 0.2, 0.0, 1.0);
        mh.x = fract(mh.x + PULSE * 0.05);
        mirror = hsl2rgb(mh);
        float silhouette_m = max(body, coat);
        col = mix(col, mirror, (1.0 - silhouette_m) * 0.35);
    }

    // ---- SLOW FEEDBACK — dreamy trails ----
    vec2 fb_uv = fragCoord / res;
    fb_uv.y -= 0.001;
    fb_uv.x -= P.hip * 0.003;
    vec3 prev = getLastFrameColor(fb_uv).rgb * 0.92;
    float silhouette = max(body, coat);
    float feedback_amt = mix(0.55, 0.25, silhouette);
    if (frame < 30) feedback_amt = 0.0;
    col = mix(col, prev, feedback_amt);

    // Vignette
    col *= 1.0 - smoothstep(0.7, 1.4, length(uv * vec2(1.0, 0.85)));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
