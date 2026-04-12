// @fullscreen: true
// @mobile: true
// inspiration: https://open.spotify.com/track/4iujYV1aY8bvFnynke7eN5?si=8f2220910e7f4de0
#define PI 3.14159265

// ============================================================================
// AUDIO
// ============================================================================

// Chest pump — slow, confident bass swell
#define PUMP (bassNormalized * 0.5 + bassSlope * bassRSquared * 2.0)
// #define PUMP 0.4

// Beat clock — drives the head nod / hip pop / curl bounce
#define BEAT_PHASE (time * 2.2)

// Snare snap = hands flick out, grin flashes
#define SNAP (max(trebleZScore, 0.0))
// #define SNAP 0.0

// Hip pop — slow weight-shift sway (alternates sides)
#define HIP_SWAY (sin(time * 1.1))

// Mids drive a smaller secondary groove
#define GROOVE (midsNormalized)

// Drop = the moment he locks eyes with you
#define BUILD (energySlope * energyRSquared * 8.0)
#define IS_DROP clamp(BUILD, 0.0, 1.0)

// Raw drop trigger for the accumulator — fires on energy spike OR confident build
#define DROP_TRIGGER clamp(max(energyZScore, BUILD), 0.0, 1.0)

// Color: deep plum → chrome gold on the drop
#define HUE_BASE 0.78
#define HUE_DROP 0.13

// ============================================================================
// SDFs — the daddy himself
// ============================================================================

float sdCircle(vec2 p, float r) { return length(p) - r; }

float sdEllipse(vec2 p, vec2 r) {
    return (length(p / r) - 1.0) * min(r.x, r.y);
}

// Smooth union — for stitching body parts together like a real chunky boi
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// hash for the curl scatter
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Short king pose anchors. Centralized so head, hair, grin, eyes all move together.
struct Pose {
    float bob;       // vertical head nod
    float tilt;      // head tilt angle
    float hip;       // hip pop offset (lateral)
    vec2  head_c;    // head center
    vec2  l_hand;    // left hand position
    vec2  r_hand;    // right hand position
    float l_open;    // left hand "open gesture" amount
    float r_open;
};

Pose makePose(float beat_phase, float hip_sway, float snap, float groove) {
    Pose P;
    // Head nod — drops on the down-beat, recovers on the up
    P.bob = -abs(sin(beat_phase)) * 0.04 + groove * 0.01;
    // Head tilt — leans into the hip pop
    P.tilt = hip_sway * 0.18 + sin(beat_phase * 0.5) * 0.05;
    // Hip pop — alternates sides, sharper than smooth sin
    P.hip = sign(hip_sway) * pow(abs(hip_sway), 0.6) * 0.05;

    // SHORT KING — head sits low. Total figure ~0.65 tall (vs 1.0 for tall daddy).
    P.head_c = vec2(P.hip * 0.6, 0.30 + P.bob);

    // Hands gesture out on the snare; otherwise hang in resting "DJ stance"
    float l_gesture = snap * 1.2;
    float r_gesture = snap * 1.2;
    P.l_open = l_gesture;
    P.r_open = r_gesture;
    // Left hand: rest near hip, snap up-out
    P.l_hand = vec2(-0.32 - l_gesture * 0.12, -0.28 + l_gesture * 0.30);
    // Right hand: rest near chest, flick out wider
    P.r_hand = vec2( 0.30 + r_gesture * 0.18, -0.10 + r_gesture * 0.20 + sin(beat_phase) * 0.02);
    return P;
}

// Capsule SDF for arms (line segment with thickness)
float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// The Daddy silhouette — SHORT, with body language
float sdDaddy(vec2 p, float pump, Pose P) {
    // Apply head tilt around the head center
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 hp = p - P.head_c;
    hp = vec2(hp.x * ct - hp.y * st, hp.x * st + hp.y * ct);

    // ---- HEAD (rounder, smaller) ----
    float head = sdEllipse(hp, vec2(0.13, 0.15));
    // Soft jaw / cheeks — friendly chin, not chiseled
    float jaw = sdEllipse(hp - vec2(0.0, -0.05), vec2(0.11, 0.09));
    head = smin(head, jaw, 0.04);

    // ---- NECK (short, thick) ----
    vec2 np = p - vec2(P.hip * 0.7, 0.13);
    float neck = sdEllipse(np, vec2(0.07, 0.05));

    // ---- TORSO (short and chunky — width nearly equals height) ----
    float chest_w = 0.32 + pump * 0.07;
    float chest_h = 0.18 + pump * 0.03;
    vec2 cp = p - vec2(P.hip * 0.8, -0.02);
    float chest = sdEllipse(cp, vec2(chest_w, chest_h));

    // ---- HIPS (popped to one side) ----
    vec2 wp = p - vec2(P.hip * 1.4, -0.22);
    float hips = sdEllipse(wp, vec2(0.26, 0.10));

    // ---- SHOULDERS ----
    vec2 ls = vec2(-chest_w * 0.95 + P.hip * 0.4, 0.05);
    vec2 rs = vec2( chest_w * 0.95 + P.hip * 0.4, 0.05);
    float lshoulder = sdCircle(p - ls, 0.10);
    float rshoulder = sdCircle(p - rs, 0.10);

    // ---- ARMS — capsules from shoulder to hand. Bend with gesture amount. ----
    // Left elbow biases inward when resting, swings out on snap
    vec2 l_elbow = mix(vec2(-chest_w - 0.04, -0.10), vec2(-chest_w - 0.10, -0.05), P.l_open);
    vec2 r_elbow = mix(vec2( chest_w + 0.04, -0.10), vec2( chest_w + 0.12,  0.00), P.r_open);
    float l_upper = sdCapsule(p, ls, l_elbow, 0.055);
    float l_lower = sdCapsule(p, l_elbow, P.l_hand, 0.045);
    float r_upper = sdCapsule(p, rs, r_elbow, 0.055);
    float r_lower = sdCapsule(p, r_elbow, P.r_hand, 0.045);

    // ---- HANDS ----
    float l_fist = sdCircle(p - P.l_hand, 0.045 + P.l_open * 0.01);
    float r_fist = sdCircle(p - P.r_hand, 0.045 + P.r_open * 0.01);

    // Stitch
    float d = head;
    d = smin(d, neck, 0.04);
    d = smin(d, chest, 0.06);
    d = smin(d, hips, 0.06);
    d = smin(d, lshoulder, 0.05);
    d = smin(d, rshoulder, 0.05);
    d = smin(d, l_upper, 0.04);
    d = smin(d, l_lower, 0.04);
    d = smin(d, r_upper, 0.04);
    d = smin(d, r_lower, 0.04);
    d = smin(d, l_fist, 0.03);
    d = smin(d, r_fist, 0.03);
    return d;
}

// CURLY HAIR — a halo of overlapping circles around the top of the head.
// Each curl has its own bounce phase so the mop wobbles with the beat.
float sdCurls(vec2 p, Pose P, float beat_phase, float pump) {
    // Hair sits in head-local space (so it tilts with the head)
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 hp = p - P.head_c;
    hp = vec2(hp.x * ct - hp.y * st, hp.x * st + hp.y * ct);

    // 14 curls arranged in a crown around the upper head
    float d = 1e6;
    for (int i = 0; i < 14; i++) {
        float fi = float(i);
        // Spread curls from one ear, over the top, to the other ear
        float t = fi / 13.0;
        float ang = mix(PI * 1.05, PI * -0.05, t);  // left side → right side, over the top
        float radius = 0.155;
        // Random per-curl jitter so it's not a perfect ring
        float jx = hash(vec2(fi, 1.0)) - 0.5;
        float jy = hash(vec2(fi, 2.0)) - 0.5;
        vec2 c = vec2(cos(ang), sin(ang)) * radius + vec2(jx, jy) * 0.025;
        // Curl size varies — bigger curls on the crown, smaller at the edges
        float crown_bias = sin(t * PI);
        float r = 0.045 + crown_bias * 0.015 + hash(vec2(fi, 3.0)) * 0.01;
        // Bounce — each curl bobs on the beat with its own phase
        float ph = hash(vec2(fi, 4.0)) * 6.28;
        float bounce = sin(beat_phase * 1.0 + ph) * 0.012 + pump * 0.008;
        c.y += bounce;
        d = smin(d, sdCircle(hp - c, r), 0.025);
    }
    return d;
}

// The grin — curved arc; lives in head-local space
float sdGrin(vec2 p, Pose P) {
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 gp = p - (P.head_c + vec2(0.0, -0.04));
    gp = vec2(gp.x * ct - gp.y * st, gp.x * st + gp.y * ct);
    float curve = gp.y + gp.x * gp.x * 2.5;
    float along = smoothstep(0.07, 0.0, abs(gp.x));
    return abs(curve) - 0.007 * along;
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * res) / min(res.x, res.y);

    float pump = PUMP;
    Pose P = makePose(BEAT_PHASE, HIP_SWAY, SNAP, GROOVE);

    // Raw UVs for effects sampled in screen space
    vec2 raw_uv01 = fragCoord / res;

    // Drop level — purely immediate, no accumulator. (Accumulator was reading
    // stale alpha from the initial framebuffer texture and pinning the state
    // high, washing out idle.)
    float drop_hit = clamp(max(IS_DROP, energyZScore * 0.5), 0.0, 1.0);

    // ---- INTENSITY ZOOM (subtronics-eye2 style) ----
    // Drive a pre-zoom off raw energy + drop. The whole scene pushes IN
    // toward the daddy's head on intense passages.
    float intensity = max(
        mapValue(energyNormalized, 0.0, 1.0, 0.0, 1.0),
        bassNormalized
    );
    float zoomAmount = 1.0 + intensity * 0.6 + drop_hit * 0.9;
    vec2 zoomCenter = P.head_c;  // push toward the daddy's face
    uv = (uv - zoomCenter) / zoomAmount + zoomCenter;

    // ---- BACKDROP: smoky club with strobing floor ----
    float bg_grad = smoothstep(-0.8, 0.8, uv.y);
    vec3 bg = mix(vec3(0.08, 0.02, 0.12), vec3(0.02, 0.0, 0.05), bg_grad);

    // Floor strobe — the spotlight base
    float spot = exp(-pow(uv.x, 2.0) * 4.0) * smoothstep(-0.3, -0.6, uv.y);
    bg += spot * vec3(0.5, 0.2, 0.6) * (0.5 + 0.5 * sin(BEAT_PHASE * 2.0));

    // God-rays from above on the drop
    float rays = pow(max(0.0, 1.0 - abs(uv.x) * 1.2), 4.0) * smoothstep(0.0, 1.0, uv.y);
    bg += rays * vec3(1.0, 0.7, 0.3) * IS_DROP * 0.6;

    // ---- DADDY ----
    float d_body  = sdDaddy(uv, pump, P);
    float d_curls = sdCurls(uv, P, BEAT_PHASE, pump);
    float d = min(d_body, d_curls);

    // Silhouette
    float body  = smoothstep(0.005, -0.005, d);
    float curls = smoothstep(0.005, -0.005, d_curls);

    // Rim light — chrome edge thickens on the drop
    float rim_w = 0.012 + IS_DROP * 0.02 + SNAP * 0.01;
    float rim = smoothstep(rim_w, 0.0, abs(d));
    rim *= 1.0 - body * 0.7;

    // Chest gleam pulses with bass — anchored to torso center
    float chest_glow = exp(-pow(length(uv - vec2(P.hip * 0.8, -0.02)) * 3.0, 2.0));
    chest_glow *= smoothstep(0.005, -0.005, d_body) * (0.3 + pump * 0.7);

    // Grin (head-local — moves with tilt and bob)
    float grin_d = sdGrin(uv, P);
    float grin = smoothstep(0.006, 0.0, grin_d) * smoothstep(-0.05, -0.02, d_body);
    grin *= 0.3 + SNAP * 1.5 + IS_DROP * 0.8;

    // Eyes — solid hot dots. On the drop they shoot GOD RAYS out into the scene.
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 le_local = vec2(-0.045, 0.02);
    vec2 re_local = vec2( 0.045, 0.02);
    vec2 le = P.head_c + vec2(le_local.x * ct + le_local.y * st, -le_local.x * st + le_local.y * ct);
    vec2 re = P.head_c + vec2(re_local.x * ct + re_local.y * st, -re_local.x * st + re_local.y * ct);

    // Solid eye cores — tight pinpoints at idle, hot blasts on drop.
    // Tight falloff (2500) so there's no halo bleeding at rest.
    float eyes = exp(-dot(uv - le, uv - le) * 2500.0) + exp(-dot(uv - re, uv - re) * 2500.0);
    // Low base intensity so idle eyes read as two pinpoints, not headlights
    eyes *= (0.25 + drop_hit * 1.8 + SNAP * 0.6);

    // ---- GOD RAYS ----
    // For each eye, compute a directional beam that shoots OUTWARD from the
    // eye in a fan. We use the angle from the eye toward the pixel, and
    // fall off with distance. Multiple narrow lobes give "ray" structure.
    vec2 d_le2 = uv - le;
    vec2 d_re2 = uv - re;
    float r_le = length(d_le2);
    float r_re = length(d_re2);

    // Angles from each eye toward the pixel (eye -> scene)
    float a_le = atan(d_le2.y, d_le2.x);
    float a_re = atan(d_re2.y, d_re2.x);

    // Ray fans — narrow lobes via high-power cos. Wider fan (6 lobes instead
    // of 4) and slightly softer power so rays reach further across the scene.
    float fan_le = pow(abs(cos(a_le * 6.0 + time * 0.8)), 14.0);
    float fan_re = pow(abs(cos(a_re * 6.0 - time * 0.7 + 1.3)), 14.0);

    // Radial falloff — long reach so rays cross the whole scene
    float fall_le = exp(-r_le * 1.2);
    float fall_re = exp(-r_re * 1.2);

    // Bias rays to shoot upward/outward (not downward into the chest)
    float up_le = smoothstep(-1.0, 0.3, d_le2.y / max(r_le, 0.001));
    float up_re = smoothstep(-1.0, 0.3, d_re2.y / max(r_re, 0.001));

    // Narrow beams (fan + falloff)
    float god_rays = (fan_le * fall_le * up_le + fan_re * fall_re * up_re) * drop_hit;
    // Eye bloom — soft glow around each eye socket
    god_rays += (exp(-r_le * 10.0) + exp(-r_re * 10.0)) * drop_hit * 0.6;

    // Scene-wide eye wash — a much softer, much wider radial glow that tints
    // the entire frame with hot light during drops. This is the "the room is
    // glowing because his eyes are blasting" effect.
    float wash_le = exp(-r_le * 0.8);
    float wash_re = exp(-r_re * 0.8);
    float eye_wash = (wash_le + wash_re) * drop_hit * 0.5;

    // ---- COLOR ----
    float hue = mix(HUE_BASE, HUE_DROP, IS_DROP);
    vec3 leather = hsl2rgb(vec3(hue, 0.8, 0.10));
    vec3 chrome  = hsl2rgb(vec3(fract(hue + 0.05), 1.0, 0.65));
    vec3 hair    = hsl2rgb(vec3(0.06, 0.7, 0.12));   // dark warm brown curls
    vec3 hot     = hsl2rgb(vec3(0.08, 1.0, 0.6));

    vec3 col = bg;
    col = mix(col, leather, body);
    col = mix(col, hair, curls);  // hair overrides body where curls live
    col += rim * chrome * 1.3;
    col += chest_glow * chrome * 0.8;
    col += grin * vec3(1.0, 0.95, 0.85) * 1.5;

    // ---- EYES + GOD RAYS ----
    // Solid hot yellowish dots for the eyes
    col += eyes * hot * 2.2;
    // Scene-wide eye wash — tints the whole frame hot during drops
    col = mix(col, col + hot * 0.6, eye_wash);
    col += eye_wash * hot * 0.4;
    // Additive god-ray beams — narrow beams shooting into the scene
    col += god_rays * hot * 2.5;

    // ---- INFINITY MIRROR (subtronics-eye2 style) ----
    // Recursive zoom into the previous frame, centered on the daddy's head.
    // Blended in on drops so his own image nests inside the scene behind him.
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
        // Hyper-saturate so the mirror doesn't wash out
        vec3 mh = rgb2hsl(mirror);
        mh.y = clamp(mh.y * 1.6 + 0.2, 0.0, 1.0);
        mh.x = fract(mh.x + drop_hit * 0.1);
        mirror = hsl2rgb(mh);
        // Only blend into the BACKGROUND (not the body) so the daddy stays crisp
        col = mix(col, mirror, drop_hit * (1.0 - body) * 0.55);
    }

    // ---- FEEDBACK: motion smear from the body language ----
    vec2 fb_uv = fragCoord / res;
    fb_uv.x -= P.hip * 0.01;             // smear opposite the hip pop
    fb_uv.y -= 0.002 + pump * 0.003;
    vec3 prev = getLastFrameColor(fb_uv).rgb * 0.88;

    float feedback_amt = mix(0.45, 0.15, body);
    if (beat) feedback_amt *= 0.6;
    // Cold start: first frames show the pure composition so the feedback
    // buffer doesn't carry stale brightness from a previous load.
    if (frame < 30) feedback_amt = 0.0;
    col = mix(prev, col, feedback_amt);

    // Vignette — keep the daddy framed
    col *= 1.0 - smoothstep(0.7, 1.4, length(uv * vec2(1.0, 0.85)));

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
