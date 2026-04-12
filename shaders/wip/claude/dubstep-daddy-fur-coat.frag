// @fullscreen: true
// @mobile: true
// inspiration: https://open.spotify.com/track/4iujYV1aY8bvFnynke7eN5?si=8f2220910e7f4de0
// Variant: slimmer frame + white fur collar/shoulder coat with bluish shadows
#define PI 3.14159265

// ============================================================================
// DEBUG — flip to 1 to render SDF outlines (body cyan, coat yellow) over a
// dimmed scene. Use when diagnosing coat/body alignment issues.
// ============================================================================
#define DEBUG_OUTLINES 0

// ============================================================================
// AUDIO
// ============================================================================

#define PUMP (bassNormalized * 0.5 + bassSlope * bassRSquared * 2.0)
#define BEAT_PHASE (time * 2.2)
#define SNAP (max(trebleZScore, 0.0))
#define HIP_SWAY (sin(time * 1.1))
#define GROOVE (midsNormalized)
#define BUILD (energySlope * energyRSquared * 8.0)
#define IS_DROP clamp(BUILD, 0.0, 1.0)
#define DROP_TRIGGER clamp(max(energyZScore, BUILD), 0.0, 1.0)

#define HUE_BASE 0.78
#define HUE_DROP 0.13

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

// Smooth value noise for fur texture
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
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        s += a * vnoise(p);
        p *= 2.03;
        a *= 0.5;
    }
    return s;
}

struct Pose {
    float bob;
    float tilt;
    float hip;
    vec2  head_c;
    vec2  l_hand;
    vec2  r_hand;
    float l_open;
    float r_open;
};

Pose makePose(float beat_phase, float hip_sway, float snap, float groove) {
    Pose P;
    P.bob = -abs(sin(beat_phase)) * 0.04 + groove * 0.01;
    P.tilt = hip_sway * 0.18 + sin(beat_phase * 0.5) * 0.05;
    P.hip = sign(hip_sway) * pow(abs(hip_sway), 0.6) * 0.05;
    P.head_c = vec2(P.hip * 0.6, 0.30 + P.bob);
    float l_gesture = snap * 1.2;
    float r_gesture = snap * 1.2;
    P.l_open = l_gesture;
    P.r_open = r_gesture;
    // Arms hang naturally at the sides, symmetric, proportional length.
    // Hands end just past the hips (y ≈ -0.38).
    P.l_hand = vec2(-0.30 - l_gesture * 0.15, -0.38 + l_gesture * 0.25);
    P.r_hand = vec2( 0.30 + r_gesture * 0.15, -0.38 + r_gesture * 0.25 + sin(beat_phase) * 0.01);
    return P;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// Slimmer daddy — smaller frame, no bulging biceps
float sdDaddy(vec2 p, float pump, Pose P) {
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 hp = p - P.head_c;
    hp = vec2(hp.x * ct - hp.y * st, hp.x * st + hp.y * ct);

    float head = sdEllipse(hp, vec2(0.13, 0.15));
    float jaw = sdEllipse(hp - vec2(0.0, -0.05), vec2(0.11, 0.09));
    head = smin(head, jaw, 0.04);

    vec2 np = p - vec2(P.hip * 0.7, 0.13);
    float neck = sdEllipse(np, vec2(0.055, 0.045));

    // Slimmer chest
    float chest_w = 0.23 + pump * 0.04;
    float chest_h = 0.17 + pump * 0.02;
    vec2 cp = p - vec2(P.hip * 0.8, -0.02);
    float chest = sdEllipse(cp, vec2(chest_w, chest_h));

    // Slimmer hips
    vec2 wp = p - vec2(P.hip * 1.4, -0.22);
    float hips = sdEllipse(wp, vec2(0.20, 0.09));

    // Shoulders sit at the OUTER edge of the coat so arms exit cleanly
    // from the sides of the fur. Fur thickness ≈ 0.055, matched in sdFurCoat.
    float coat_edge = chest_w * 0.95 + 0.055;
    vec2 ls = vec2(-coat_edge + P.hip * 0.4, 0.0);
    vec2 rs = vec2( coat_edge + P.hip * 0.4, 0.0);
    float lshoulder = sdCircle(p - ls, 0.055);
    float rshoulder = sdCircle(p - rs, 0.055);

    // Arms hang proportionally — elbow at the midpoint between shoulder and
    // hand, slightly biased inward so the lower arm curves toward the body
    vec2 l_mid = mix(ls, P.l_hand, 0.5);
    vec2 r_mid = mix(rs, P.r_hand, 0.5);
    vec2 l_elbow = l_mid + vec2(0.015, 0.0) + vec2(-0.02, 0.02) * P.l_open;
    vec2 r_elbow = r_mid + vec2(-0.015, 0.0) + vec2(0.02, 0.02) * P.r_open;
    float l_upper = sdCapsule(p, ls, l_elbow, 0.04);
    float l_lower = sdCapsule(p, l_elbow, P.l_hand, 0.035);
    float r_upper = sdCapsule(p, rs, r_elbow, 0.04);
    float r_lower = sdCapsule(p, r_elbow, P.r_hand, 0.035);

    float l_fist = sdCircle(p - P.l_hand, 0.035 + P.l_open * 0.008);
    float r_fist = sdCircle(p - P.r_hand, 0.035 + P.r_open * 0.008);

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

// Torso-only SDF: chest + shoulders + hips, NO head/neck/arms/hands.
// Used as the base shape the fur coat inflates from, so arms poke out.
// Chest is intentionally shorter than the body's chest so that when the coat
// inflates outward by fur_thickness, its top sits below the neck — no hard
// cut needed, no visible "back of collar" line.
float sdTorso(vec2 p, float pump, Pose P) {
    float chest_w = 0.23 + pump * 0.04;
    float chest_h = 0.12 + pump * 0.02;  // top at y=0.12, clears shoulders
    vec2 cp = p - vec2(P.hip * 0.8, 0.0);
    float chest = sdEllipse(cp, vec2(chest_w, chest_h));

    vec2 wp = p - vec2(P.hip * 1.4, -0.22);
    float hips = sdEllipse(wp, vec2(0.20, 0.09));

    // No separate shoulder bumps — the sleeves in sdFurCoat attach directly
    // to the shoulder positions and merge with this torso via smin, giving
    // a smooth chest→sleeve transition without flared shoulder wings.
    float d = chest;
    d = smin(d, hips, 0.06);
    return d;
}

// Fur coat: inflates the torso AND arms (long sleeves) by a fur thickness,
// caps at the neckline with a V, lets the hem run off-screen.
float sdFurCoat(vec2 p, Pose P, float pump) {
    float d_torso = sdTorso(p, pump, P);

    // Long sleeves — capsules from shoulder to wrist, radius wide enough to
    // fully encase the body arms + fists. Sleeve ends exactly at hand so
    // the hand emerges at the cuff.
    float chest_w = 0.23 + pump * 0.04;
    float coat_edge = chest_w * 0.95 + 0.055;
    vec2 ls = vec2(-coat_edge + P.hip * 0.4, 0.0);
    vec2 rs = vec2( coat_edge + P.hip * 0.4, 0.0);
    float l_sleeve = sdCapsule(p, ls, P.l_hand, 0.07);
    float r_sleeve = sdCapsule(p, rs, P.r_hand, 0.07);

    // Combine torso and sleeves with a wide smin so the chest→sleeve
    // transition is smooth instead of a step/flare.
    float coat_base = smin(d_torso, l_sleeve, 0.08);
    coat_base = smin(coat_base, r_sleeve, 0.08);

    // Looser, straighter fit (not form-fitting) — more fur thickness so the
    // coat hangs straight down rather than hugging every curve.
    float fur_thickness = 0.03 + pump * 0.005;
    float inflated = coat_base - fur_thickness;

    // Straight hem: a tall narrow rectangle-ish ellipse that gives the coat a
    // straight drop through the hips and off the bottom. Not wider than the
    // shoulders, so it reads as "long coat" not "ball gown."
    vec2 hem_c = vec2(P.hip * 1.0, -0.55);
    float hem = sdEllipse(p - hem_c, vec2(0.26, 0.45));
    inflated = smin(inflated, hem, 0.06);

    // V-neckline: opens from the sternum to the top of the coat. The V is
    // bounded so it only carves within its y-range — outside the range,
    // v_wedge stays positive so `-v_wedge` is negative and max() ignores it.
    float cx = P.hip * 0.7;
    float v_bottom = -0.02;
    float v_top = 0.14;
    float v_top_half = 0.06;
    float t_v = clamp((p.y - v_bottom) / (v_top - v_bottom), 0.0, 1.0);
    float v_half = t_v * v_top_half;
    float v_horiz = abs(p.x - cx) - v_half;
    float v_vert = max(v_bottom - p.y, p.y - v_top);
    float v_wedge = max(v_horiz, v_vert);

    float d = max(inflated, -v_wedge);

    // Hard top cap: coat never draws above this y, so no part of the coat
    // rises into the face region where it would read as "back of collar."
    float top_cap = 0.14;
    d = max(d, p.y - top_cap);
    return d;
}

float sdCurls(vec2 p, Pose P, float beat_phase, float pump) {
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
        float bounce = sin(beat_phase * 1.0 + ph) * 0.012 + pump * 0.008;
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

    float pump = PUMP;
    Pose P = makePose(BEAT_PHASE, HIP_SWAY, SNAP, GROOVE);

    vec2 raw_uv01 = fragCoord / res;

    float drop_hit = clamp(max(IS_DROP, energyZScore * 0.5), 0.0, 1.0);

    float intensity = max(
        mapValue(energyNormalized, 0.0, 1.0, 0.0, 1.0),
        bassNormalized
    );
    float zoomAmount = 1.0 + intensity * 0.6 + drop_hit * 0.9;
    vec2 zoomCenter = P.head_c;
    uv = (uv - zoomCenter) / zoomAmount + zoomCenter;

    // ---- BACKDROP ----
    float bg_grad = smoothstep(-0.8, 0.8, uv.y);
    vec3 bg = mix(vec3(0.08, 0.02, 0.12), vec3(0.02, 0.0, 0.05), bg_grad);
    float spot = exp(-pow(uv.x, 2.0) * 4.0) * smoothstep(-0.3, -0.6, uv.y);
    bg += spot * vec3(0.5, 0.2, 0.6) * (0.5 + 0.5 * sin(BEAT_PHASE * 2.0));
    float rays = pow(max(0.0, 1.0 - abs(uv.x) * 1.2), 4.0) * smoothstep(0.0, 1.0, uv.y);
    bg += rays * vec3(1.0, 0.7, 0.3) * IS_DROP * 0.6;

    // ---- DADDY ----
    float d_body  = sdDaddy(uv, pump, P);
    float d_curls = sdCurls(uv, P, BEAT_PHASE, pump);
    float d_coat  = sdFurCoat(uv, P, pump);

    // Fur "fluff" — perturb the coat distance with noise so its edge is shaggy
    // Noise coords wobble with beat so the fur looks alive
    vec2 fur_p = uv * 38.0 + vec2(0.0, sin(BEAT_PHASE) * 0.15);
    float fur_n = fbm(fur_p);
    float fluff_amp = 0.018 + pump * 0.008 + SNAP * 0.006;
    float d_coat_fluff = d_coat - (fur_n - 0.5) * fluff_amp;

    float d = min(d_body, d_curls);

    float body  = smoothstep(0.005, -0.005, d);
    float curls = smoothstep(0.005, -0.005, d_curls);
    float coat  = smoothstep(0.006, -0.006, d_coat_fluff);

    // Rim light — body
    float rim_w = 0.006 + IS_DROP * 0.012 + SNAP * 0.006;
    float rim = smoothstep(rim_w, 0.0, abs(d));
    float edge_gate = body * (1.0 - body) * 4.0;
    rim *= edge_gate;

    // Rim light — coat (same chrome treatment on the fluffy edge)
    float coat_rim = smoothstep(rim_w, 0.0, abs(d_coat_fluff));
    float coat_edge_gate = coat * (1.0 - coat) * 4.0;
    coat_rim *= coat_edge_gate;

    float chest_glow = exp(-pow(length(uv - vec2(P.hip * 0.8, -0.02)) * 3.0, 2.0));
    chest_glow *= smoothstep(0.005, -0.005, d_body) * (0.3 + pump * 0.7);

    // Eyes
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 le_local = vec2(-0.045, 0.02);
    vec2 re_local = vec2( 0.045, 0.02);
    vec2 le = P.head_c + vec2(le_local.x * ct + le_local.y * st, -le_local.x * st + le_local.y * ct);
    vec2 re = P.head_c + vec2(re_local.x * ct + re_local.y * st, -re_local.x * st + re_local.y * ct);

    float eyes = exp(-dot(uv - le, uv - le) * 2500.0) + exp(-dot(uv - re, uv - re) * 2500.0);
    eyes *= (0.25 + drop_hit * 1.8 + SNAP * 0.6);

    vec2 d_le2 = uv - le;
    vec2 d_re2 = uv - re;
    float r_le = length(d_le2);
    float r_re = length(d_re2);
    float a_le = atan(d_le2.y, d_le2.x);
    float a_re = atan(d_re2.y, d_re2.x);
    float fan_le = pow(abs(cos(a_le * 6.0 + time * 0.8)), 14.0);
    float fan_re = pow(abs(cos(a_re * 6.0 - time * 0.7 + 1.3)), 14.0);
    float fall_le = exp(-r_le * 1.2);
    float fall_re = exp(-r_re * 1.2);
    float up_le = smoothstep(-1.0, 0.3, d_le2.y / max(r_le, 0.001));
    float up_re = smoothstep(-1.0, 0.3, d_re2.y / max(r_re, 0.001));
    float god_rays = (fan_le * fall_le * up_le + fan_re * fall_re * up_re) * drop_hit;
    god_rays += (exp(-r_le * 10.0) + exp(-r_re * 10.0)) * drop_hit * 0.6;

    float wash_le = exp(-r_le * 0.8);
    float wash_re = exp(-r_re * 0.8);
    float eye_wash = (wash_le + wash_re) * drop_hit * 0.5;

    // ---- COLOR ----
    float hue = mix(HUE_BASE, HUE_DROP, IS_DROP);
    vec3 leather = hsl2rgb(vec3(hue, 0.8, 0.10));
    vec3 chrome  = hsl2rgb(vec3(fract(hue + 0.05), 1.0, 0.65));
    vec3 hair    = hsl2rgb(vec3(0.06, 0.7, 0.12));
    vec3 hot     = hsl2rgb(vec3(0.08, 1.0, 0.6));

    // Coat fill — saturated synthwave pink/magenta with a vertical gradient
    // from hot pink at the shoulders to cooler magenta at the hem. Keeps
    // the flat aesthetic but reads as neon instead of dusty gray.
    float coat_grad = smoothstep(0.15, -0.4, uv.y);
    vec3 fur_hi = hsl2rgb(vec3(0.93, 0.95, 0.72));  // hot pink highlight
    vec3 fur_lo = hsl2rgb(vec3(0.86, 0.9, 0.55));   // magenta shadow
    vec3 fur_col = mix(fur_hi, fur_lo, coat_grad);
    // Seam strength computed here; chrome glow added after compositing
    // so it matches the rim-light aesthetic. Thin + subtle.
    float seam_x_pos = P.hip * 0.7;
    float seam_dx = uv.x - seam_x_pos;
    float seam_glow = exp(-seam_dx * seam_dx * 20000.0);
    seam_glow *= smoothstep(-0.02, -0.10, uv.y);

    vec3 col = bg;
    // Body silhouette — warm plum skin that reads against the dark background
    // and complements the pink coat
    vec3 skin = hsl2rgb(vec3(0.92, 0.45, 0.18));
    col = mix(col, skin, body);
    // Coat sits OVER the body but UNDER the hair (so curls still fall)
    col = mix(col, fur_col, coat * (1.0 - curls));
    col = mix(col, hair, curls);
    col += rim * chrome * 1.3 * (1.0 - coat);
    col += chest_glow * chrome * 0.8 * (1.0 - coat);
    // Coat rim — chrome edge hugs the shaggy outline (pops hard on drop)
    col += coat_rim * chrome * 1.8 * (1.0 - curls);
    // Button seam glow — chrome line down the center, same aesthetic as the rim
    col += seam_glow * coat * chrome * 0.4 * (1.0 - curls);
    col += eyes * hot * 2.2;
    col = mix(col, col + hot * 0.6, eye_wash);
    col += eye_wash * hot * 0.4;
    col += god_rays * hot * 2.5;

    // ---- INFINITY MIRROR ----
    {
        float minRes = min(res.x, res.y);
        vec2 head_uv01 = vec2(0.5) + P.head_c * vec2(minRes / res.x, minRes / res.y);
        float mirrorZoom = mix(1.3, 2.4, drop_hit);
        float rot = time * 0.5 + drop_hit * sin(BEAT_PHASE) * 0.6;
        float ca2 = cos(rot), sa2 = sin(rot);
        vec2 mirror_uv = raw_uv01 - head_uv01;
        mirror_uv = vec2(mirror_uv.x * ca2 - mirror_uv.y * sa2,
                         mirror_uv.x * sa2 + mirror_uv.y * ca2);
        mirror_uv += head_uv01;
        int mirrorSteps = int(2.0 + drop_hit * 5.0);
        for (int i = 0; i < 8; i++) {
            if (i >= mirrorSteps) break;
            mirror_uv = (mirror_uv - head_uv01) * mirrorZoom + head_uv01;
            mirror_uv = fract(mirror_uv);
        }
        vec3 mirror = getLastFrameColor(mirror_uv).rgb;
        vec3 mh = rgb2hsl(mirror);
        mh.y = clamp(mh.y * 1.6 + 0.2, 0.0, 1.0);
        mh.x = fract(mh.x + drop_hit * 0.1);
        mirror = hsl2rgb(mh);
        float silhouette = max(body, coat);
        col = mix(col, mirror, drop_hit * (1.0 - silhouette) * 0.55);
    }

    // ---- FEEDBACK ----
    vec2 fb_uv = fragCoord / res;
    fb_uv.x -= P.hip * 0.01;
    fb_uv.y -= 0.002 + pump * 0.003;
    vec3 prev = getLastFrameColor(fb_uv).rgb * 0.88;
    float silhouette = max(body, coat);
    float feedback_amt = mix(0.45, 0.15, silhouette);
    if (beat) feedback_amt *= 0.6;
    if (frame < 30) feedback_amt = 0.0;
    col = mix(prev, col, feedback_amt);

    col *= 1.0 - smoothstep(0.7, 1.4, length(uv * vec2(1.0, 0.85)));

#if DEBUG_OUTLINES
    col *= 0.25;
    float body_outline = smoothstep(0.003, 0.0, abs(d_body));
    float coat_outline = smoothstep(0.003, 0.0, abs(d_coat));
    col += body_outline * vec3(0.0, 1.0, 1.0);
    col += coat_outline * vec3(1.0, 1.0, 0.0);
#endif

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
