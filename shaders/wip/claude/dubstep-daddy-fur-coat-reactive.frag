// @fullscreen: true
// @mobile: true
// inspiration: https://open.spotify.com/track/4iujYV1aY8bvFnynke7eN5?si=8f2220910e7f4de0
// Variant: slimmer frame + pink fur coat with synthwave aesthetic
// preset: ?knob_4=0.031&knob_6=0.276&knob_7=0&knob_8=0.039&knob_9=1&knob_10=0.937&knob_11=0.543
#define PI 3.14159265

// ============================================================================
// DEBUG — flip to 1 to render SDF outlines (body cyan, coat yellow) over a
// dimmed scene. Use when diagnosing coat/body alignment issues.
// ============================================================================
#define DEBUG_OUTLINES 0

// ============================================================================
// COAT SHAPE — audio-reactive variant
// The coat breathes, bristles, and pulses with the music.
// ============================================================================

// Shoulders shrug up on beat, relax between hits
#define SHOULDER_Y      (-0.02 + max(bassZScore, 0.0) * 0.015)

// Coat widens slightly on bass swells — breathing
#define SHOULDER_SPREAD (0.158 + bassNormalized * 0.02)

// Sleeves flare outward on snare/treble hits
#define SLEEVE_RADIUS   (0.04 + max(trebleZScore, 0.0) * 0.015)

#define SHOULDER_CAP     0.042

// Chest pumps with bass — the coat breathes
#define CHEST_W_BASE    (0.12 + bassNormalized * 0.03)
#define CHEST_H_BASE    (0.065 + bassNormalized * 0.01)

// Fur bristles up on energy spikes — thicker on drops
#define FUR_THICK       (0.06 + max(energyZScore, 0.0) * 0.04)

// V-neck opens wider on high energy — coat being pulled apart
#define VNECK_WIDTH     (0.10 + max(energyZScore, 0.0) * 0.06)
#define VNECK_BOTTOM    (-0.013 - max(energyZScore, 0.0) * 0.03)

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
    P.bob = -abs(sin(beat_phase)) * 0.025 + groove * 0.005;
    P.tilt = hip_sway * 0.18 + sin(beat_phase * 0.5) * 0.05;
    P.hip = sign(hip_sway) * pow(abs(hip_sway), 0.6) * 0.05;
    P.head_c = vec2(P.hip * 0.6, 0.24 + P.bob);
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

    vec2 np = p - vec2(P.hip * 0.7, 0.11);
    float neck = sdEllipse(np, vec2(0.055, 0.045));

    // Slimmer chest
    float chest_w = 0.23 + pump * 0.04;
    float chest_h = 0.17 + pump * 0.02;
    vec2 cp = p - vec2(P.hip * 0.8, -0.02);
    float chest = sdEllipse(cp, vec2(chest_w, chest_h));

    // Slimmer hips
    vec2 wp = p - vec2(P.hip * 1.4, -0.22);
    float hips = sdEllipse(wp, vec2(0.20, 0.09));

    // Shoulders at the natural resting line — not raised (no shrugging)
    float coat_edge = SHOULDER_SPREAD;
    vec2 ls = vec2(-coat_edge + P.hip * 0.4, SHOULDER_Y);
    vec2 rs = vec2( coat_edge + P.hip * 0.4, SHOULDER_Y);
    float lshoulder = sdCircle(p - ls, SHOULDER_CAP);
    float rshoulder = sdCircle(p - rs, SHOULDER_CAP);

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

    float l_fist = sdCircle(p - P.l_hand, 0.055 + P.l_open * 0.01);
    float r_fist = sdCircle(p - P.r_hand, 0.055 + P.r_open * 0.01);

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
    // Tailored torso: narrower chest, pinched waist, slight hip flare so
    // the coat silhouette reads as a fitted garment instead of a sack.
    float chest_w = CHEST_W_BASE + pump * 0.04;
    float chest_h = CHEST_H_BASE + pump * 0.02;
    vec2 cp = p - vec2(P.hip * 0.8, 0.01);
    float chest = sdEllipse(cp, vec2(chest_w, chest_h));

    // Waist — narrower pinch at midsection
    vec2 wpn = p - vec2(P.hip * 1.0, -0.12);
    float waist = sdEllipse(wpn, vec2(0.16, 0.08));

    vec2 wp = p - vec2(P.hip * 1.4, -0.24);
    float hips = sdEllipse(wp, vec2(0.17, 0.09));

    float d = chest;
    d = smin(d, waist, 0.08);
    d = smin(d, hips, 0.08);
    return d;
}

// Fur coat: inflates the torso AND arms (long sleeves) by a fur thickness,
// caps at the neckline with a V, lets the hem run off-screen.
float sdFurCoat(vec2 p, Pose P, float pump) {
    float d_torso = sdTorso(p, pump, P);

    // Long sleeves — capsules from shoulder to WRIST (not hand), so the
    // fists poke out of the cuffs. Wrist = 80% of the way from shoulder to hand.
    float coat_edge = SHOULDER_SPREAD;
    vec2 ls = vec2(-coat_edge + P.hip * 0.4, SHOULDER_Y);
    vec2 rs = vec2( coat_edge + P.hip * 0.4, SHOULDER_Y);
    vec2 l_wrist = mix(ls, P.l_hand, 0.55);
    vec2 r_wrist = mix(rs, P.r_hand, 0.55);
    float l_sleeve = sdCapsule(p, ls, l_wrist, SLEEVE_RADIUS);
    float r_sleeve = sdCapsule(p, rs, r_wrist, SLEEVE_RADIUS);

    // Shoulder caps smin'd with both torso and sleeves
    float l_cap = sdCircle(p - ls, SHOULDER_CAP);
    float r_cap = sdCircle(p - rs, SHOULDER_CAP);
    float coat_base = min(d_torso, l_sleeve);
    coat_base = min(coat_base, r_sleeve);
    coat_base = smin(coat_base, l_cap, 0.04);
    coat_base = smin(coat_base, r_cap, 0.04);

    // Looser, straighter fit (not form-fitting) — more fur thickness so the
    // coat hangs straight down rather than hugging every curve.
    float fur_thickness = FUR_THICK + pump * 0.005;
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
    // V-neck carved with a smooth subtraction. Wedge is unbounded at the top
    // so its sides continue upward past the coat top — this means the wedge
    // has NO visible "top corners" inside the coat, so rim lighting can't
    // trace a phantom collar back-edge at the top of the V.
    float cx = P.hip * 0.7;
    float v_bottom = VNECK_BOTTOM;
    float v_half_at_top = VNECK_WIDTH;
    // Slope of the V: widens as y increases, no upper bound
    float v_slope = v_half_at_top / 0.17;  // reaches 0.07 at y=0.15
    float v_half = max(0.0, (p.y - v_bottom)) * v_slope;
    float v_horiz = abs(p.x - cx) - v_half;
    float v_vert = v_bottom - p.y;  // only the bottom is a hard wall
    float v_wedge = max(v_horiz, v_vert);

    // Smooth subtraction (smooth max via -smin)
    float d = -smin(-inflated, v_wedge, 0.015);
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
    // Fur edge gets much more agitated on drops/bass — bristles up
    float fluff_amp = 0.018 + pump * 0.015 + SNAP * 0.012 + max(energyZScore, 0.0) * 0.02;
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

    // Coat fill — audio-reactive color. Base is synthwave pink, but:
    // - Lightness pulses brighter on bass hits
    // - Hue shifts toward hot yellow/white on drops
    // - Saturation dips slightly on quiet passages (more white/pastel)
    float coat_grad = smoothstep(0.15, -0.4, uv.y);
    float bass_pulse = max(bassZScore, 0.0);
    float drop_color = clamp(IS_DROP + max(energyZScore, 0.0) * 0.3, 0.0, 1.0);
    // Hue slides from pink (0.93) toward warm peach (0.05) on drops
    float fur_hue_hi = mix(0.93, 0.05, drop_color * 0.5);
    float fur_hue_lo = mix(0.86, 0.08, drop_color * 0.4);
    // Lightness pumps up on bass
    float fur_l_hi = 0.72 + bass_pulse * 0.12;
    float fur_l_lo = 0.55 + bass_pulse * 0.08;
    vec3 fur_hi = hsl2rgb(vec3(fur_hue_hi, 0.95, clamp(fur_l_hi, 0.0, 0.95)));
    vec3 fur_lo = hsl2rgb(vec3(fur_hue_lo, 0.9, clamp(fur_l_lo, 0.0, 0.85)));
    vec3 fur_col = mix(fur_hi, fur_lo, coat_grad);
    // Shoulder gleam pulses with spectral flux — light catching the coat
    float shoulder_gleam = exp(-pow((uv.y - 0.08) * 10.0, 2.0));
    float gleam_intensity = 0.15 + spectralFluxNormalized * 0.25;
    fur_col += shoulder_gleam * vec3(gleam_intensity, gleam_intensity * 0.6, gleam_intensity * 1.2);
    // Seam strength computed here; chrome glow added after compositing
    // so it matches the rim-light aesthetic. Thin + subtle.
    float seam_x_pos = P.hip * 0.7;
    float seam_dx = uv.x - seam_x_pos;
    float seam_glow = exp(-seam_dx * seam_dx * 40000.0);
    seam_glow *= smoothstep(-0.02, -0.10, uv.y) * 0.3;

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
    // Coat rim — chrome edge hugs the shaggy outline (boosted for visibility)
    // Coat rim pulses with spectral flux — brighter on timbral changes
    float rim_boost = 2.2 + spectralFluxNormalized * 1.5 + max(bassZScore, 0.0) * 0.8;
    col += coat_rim * chrome * rim_boost * (1.0 - curls);
    // Button seam glow — chrome line down the center
    col += seam_glow * coat * chrome * 0.25 * (1.0 - curls);
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
