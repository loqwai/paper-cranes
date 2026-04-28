// @fullscreen: true
// @mobile: true
// the-coat-15 — live-show fork forked from the-coat-14 (twister-fighter branch).
// Every tunable rides on a single 16-knob layout designed for the MIDI Fighter
// Twister. Each high-level macro is `mix(knob_N, audio_feature, knob_N_mode)`,
// so clicking a knob crossfades that aspect between manual and audio.
//
// Use with `?controller=the-coat&midi=true` so drop_glow flows in.

uniform float drop_glow;        // controller=the-coat sustained drop signal

// Per-knob mode bits (0 = manual, 1 = audio-tracking, blended by the click tween).
uniform float knob_1_mode;
uniform float knob_2_mode;
uniform float knob_3_mode;
uniform float knob_4_mode;
uniform float knob_5_mode;
uniform float knob_6_mode;
uniform float knob_7_mode;
uniform float knob_8_mode;
uniform float knob_9_mode;
uniform float knob_10_mode;
uniform float knob_11_mode;
uniform float knob_12_mode;
uniform float knob_13_mode;
uniform float knob_14_mode;
uniform float knob_15_mode;
uniform float knob_16_mode;

#define PI 3.14159265
#define DEBUG_OUTLINES 0

// ============================================================================
// HIGH-LEVEL KNOB CONTROLS — each row of the Twister
// ----------------------------------------------------------------------------
//   Row 1  SCENE / FRAME       1=ZOOM  2=BG MOOD   3=PALETTE  4=TILT
//   Row 2  TEXTURE / SURFACE   5=FUR   6=GLEAM     7=SMEAR    8=CHAOS
//   Row 3  PAYOFF / DRAMA      9=RAYS  10=DROP     11=CLIMAX  12=EYE WASH
//   Row 4  VJ THEATRICS        13=BEAT 14=SWIRL    15=DRIP    16=SURPRISE
//
// LED colour at runtime mirrors the audio feature each knob is paired with —
// see src/midi.js colorForAudioFeature(). Click a knob to toggle.
// ============================================================================

// Row 1 — SCENE / FRAME
#define K_ZOOM     mix(knob_1, energyNormalized,           knob_1_mode)
#define K_BG_MOOD  mix(knob_2, spectralEntropyNormalized,  knob_2_mode)
#define K_PALETTE  mix(knob_3, pitchClassNormalized,       knob_3_mode)
#define K_TILT     mix(knob_4, bassNormalized,             knob_4_mode)

// Row 2 — TEXTURE / SURFACE
#define K_FUR_PEAK mix(knob_5, spectralRoughnessNormalized, knob_5_mode)
#define K_GLEAM    mix(knob_6, spectralFluxNormalized,      knob_6_mode)
#define K_SMEAR    mix(knob_7, energyNormalized,            knob_7_mode)
#define K_CHAOS    mix(knob_8, spectralEntropyNormalized,   knob_8_mode)

// Row 3 — PAYOFF / DRAMA
//   knob_10 audio-mode is `drop_glow` — the controller's sustained drop signal.
//   Clicking knob_10 to manual + leaving it at 0 silences the controller.
#define K_GOD_RAYS    mix(knob_9,  trebleNormalized,    knob_9_mode)
#define K_DROP_SUSTAIN mix(knob_10, drop_glow,          knob_10_mode)
#define K_CLIMAX      mix(knob_11, energyNormalized,    knob_11_mode)
#define K_EYE_WASH    mix(knob_12, energyNormalized,    knob_12_mode)

// Row 4 — VJ THEATRICS  (manual = constant gate; audio = auto-fire by feature)
#define K_BEAT_STROBE mix(knob_13, midsNormalized,              knob_13_mode)
#define K_SIGIL_SWIRL mix(knob_14, spectralRoughnessNormalized, knob_14_mode)
#define K_DRIP        mix(knob_15, bassNormalized,              knob_15_mode)
//   knob_16 long-press fires `cranes:vj-bump` on window — picked up by /vj.
#define K_SURPRISE    mix(knob_16, spectralFluxNormalized,      knob_16_mode)

// ============================================================================
// COAT SHAPE (audio-driven, untouched by knobs — these breathe with the music)
// ============================================================================

#define SHOULDER_Y      (-0.02 + max(bassZScore, 0.0) * 0.015)
#define SHOULDER_SPREAD (0.158 + bassNormalized * 0.02)
#define SLEEVE_RADIUS   (0.04 + max(trebleZScore, 0.0) * 0.015)
#define SHOULDER_CAP     0.042
#define CHEST_W_BASE    (0.12 + bassNormalized * 0.03)
#define CHEST_H_BASE    (0.065 + bassNormalized * 0.01)
#define FUR_THICK       (0.06 + clamp(energyZScore, 0.0, 1.0) * 0.04)
#define VNECK_WIDTH     (0.10 + clamp(energyZScore, 0.0, 1.0) * 0.06)
#define VNECK_BOTTOM    (-0.013 - clamp(energyZScore, 0.0, 1.0) * 0.03)

#define PUMP (bassNormalized * 0.6 + clamp(bassSlope * bassRSquared, 0.0, 0.5) * 3.0)
#define BEAT_PHASE (time * 2.2)
#define SNAP (clamp(trebleZScore, 0.0, 1.5))
#define HIP_SWAY (sin(time * 1.1))
#define GROOVE (midsNormalized * 0.8 + spectralCentroidNormalized * 0.2)

#define BUILD (clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0))
#define IS_DROP clamp(BUILD + smoothstep(0.35, 0.85, energyZScore) * 0.75, 0.0, 1.0)
#define DROP_TRIGGER_THRESH 0.8
#define SUSTAIN_GAIN 1.2

// Drop zoom punch + intensity zoom — both ride the high-level K_ZOOM.
#define DROP_ZOOM 0.9
#define INTENSITY_ZOOM (energyNormalized * 0.55 + max(trebleZScore, 0.0) * 0.2)

#define HUE_BASE (fract(0.78 + time * 0.003 + pitchClassNormalized * 0.08 + midsNormalized * 0.10 + K_PALETTE))
#define HUE_DROP (fract(0.99 + spectralCentroidNormalized * 0.05 + K_PALETTE))

// Surface — knob-multiplied where it makes high-level sense.
#define FLUFF_AGITATION ((clamp(energyZScore, 0.0, 1.0) * 0.5 + spectralRoughnessNormalized * 0.5) * (0.5 + K_CHAOS))
#define BASS_PULSE_AMT (clamp(bassZScore, 0.0, 1.0) * 0.8)
#define DROP_COLOR_AMT clamp(IS_DROP + clamp(energyZScore, 0.0, 1.0) * 0.4 + clamp(bassZScore, 0.0, 1.0) * 0.2, 0.0, 1.0)
#define GLEAM_INTENSITY (0.15 + K_GLEAM * 0.45)

#define FUR_TRIGGER clamp(spectralEntropyNormalized * 0.7 + spectralRoughnessNormalized * 0.5 + clamp(spectralKurtosisZScore, 0.0, 1.0) * 0.2, 0.0, 1.0)
#define WARP_SPEED (spectralCentroidNormalized * 0.6 + spectralFluxNormalized * 0.2)
#define RIM_BOOST ((2.5 + spectralFluxNormalized * 2.0 + clamp(bassZScore, 0.0, 1.0) * 1.0) * (1.0 + K_SURPRISE * 0.6))

#define DROP_TRIGGER clamp(max(energyZScore, BUILD), 0.0, 1.0)

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
    P.l_hand = vec2(-0.30 - l_gesture * 0.15, -0.38 + l_gesture * 0.25);
    P.r_hand = vec2( 0.30 + r_gesture * 0.15, -0.38 + r_gesture * 0.25 + sin(beat_phase) * 0.01);
    return P;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

float sdDaddy(vec2 p, float pump, Pose P) {
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 hp = p - P.head_c;
    hp = vec2(hp.x * ct - hp.y * st, hp.x * st + hp.y * ct);

    float head = sdEllipse(hp, vec2(0.13, 0.15));
    float jaw = sdEllipse(hp - vec2(0.0, -0.05), vec2(0.11, 0.09));
    head = smin(head, jaw, 0.04);

    vec2 np = p - vec2(P.hip * 0.7, 0.11);
    float neck = sdEllipse(np, vec2(0.035, 0.045));

    float chest_w = 0.23 + pump * 0.04;
    float chest_h = 0.17 + pump * 0.02;
    vec2 cp = p - vec2(P.hip * 0.7, -0.02);
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

float sdTorso(vec2 p, float pump, Pose P) {
    float chest_w = CHEST_W_BASE + pump * 0.04;
    float chest_h = CHEST_H_BASE + pump * 0.02;
    vec2 cp = p - vec2(P.hip * 0.7, 0.01);
    float chest = sdEllipse(cp, vec2(chest_w, chest_h));

    vec2 wpn = p - vec2(P.hip * 0.8, -0.12);
    float waist = sdEllipse(wpn, vec2(0.16, 0.08));

    vec2 wp = p - vec2(P.hip * 1.4, -0.24);
    float hips = sdEllipse(wp, vec2(0.17, 0.09));

    float d = chest;
    d = smin(d, waist, 0.08);
    d = smin(d, hips, 0.08);
    return d;
}

float sdFurCoat(vec2 p, Pose P, float pump) {
    float d_torso = sdTorso(p, pump, P);

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

    float fur_thickness = FUR_THICK + pump * 0.005;
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

float sdCurls(vec2 p, Pose P, float beat_phase, float pump) {
    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 hp = p - P.head_c;
    hp = vec2(hp.x * ct - hp.y * st, hp.x * st + hp.y * ct);

    float d = 1e6;
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float t = fi / 7.0;
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

    // ---- DROP SUSTAIN ----
    // K_DROP_SUSTAIN = drop_glow in audio mode, knob_10 in manual.
    // Click knob_10 to mute the controller (set to manual + leave at 0).
    float drop_spike = smoothstep(DROP_TRIGGER_THRESH, DROP_TRIGGER_THRESH + 0.5, BUILD);
    float sustain_signal = BUILD * SUSTAIN_GAIN;
    float drop_now = clamp(max(drop_spike, max(IS_DROP, sustain_signal)), 0.0, 1.0);
    drop_now = smoothstep(0.15, 0.5, drop_now);
    float drop_hit = max(drop_now, K_DROP_SUSTAIN);

    float intensity = max(PUMP, GROOVE);
    float zoom_intensity = smoothstep(0.2, 0.9, intensity);
    zoom_intensity = zoom_intensity * zoom_intensity * zoom_intensity;
    // Base zoom maps K_ZOOM 0..1 → 0.1..2.5 (wide..tight). Audio adds intensity zoom on top.
    float zoomAmount = mix(0.1, 2.5, K_ZOOM) + zoom_intensity * INTENSITY_ZOOM + drop_hit * DROP_ZOOM;
    vec2 zoomCenter = P.head_c;
    vec2 cam_drift = vec2(
        sin(time * 0.12) * 0.015 + spectralFluxZScore * 0.012,
        sin(time * 0.09 + 1.3) * 0.010
    );
    zoomCenter += cam_drift;
    uv = (uv - zoomCenter) / zoomAmount + zoomCenter;

    // Camera tilt — K_TILT scales the whole sway.
    float tilt_angle = (sin(time * 0.7) * 0.15
                     + (spectralCentroidNormalized - 0.5) * 0.2
                     + bassZScore * 0.075) * K_TILT;
    float ca = cos(tilt_angle), sa = sin(tilt_angle);
    uv -= zoomCenter;
    uv = vec2(uv.x * ca - uv.y * sa, uv.x * sa + uv.y * ca);
    uv += zoomCenter;

    // ---- BACKDROP ----
    float bg_grad = smoothstep(-0.8, 0.8, uv.y);
    vec3 bg = mix(vec3(0.04, 0.02, 0.10), vec3(0.01, 0.00, 0.04), bg_grad);
    float spot = exp(-uv.x*uv.x * 4.0) * smoothstep(-0.3, -0.6, uv.y);
    bg += spot * vec3(0.5, 0.2, 0.6) * (0.5 + 0.5 * sin(BEAT_PHASE * 2.0)) * (0.8 + clamp(energyZScore, -0.5, 2.0) * 0.6);

    // VJ STARFIELD
    {
        vec2 sp = uv * 14.0;
        vec2 scell = floor(sp);
        vec2 scf = fract(sp) - 0.5;
        float sr = hash(scell);
        float sr2 = hash(scell + vec2(3.7, 1.3));
        float star_active = step(0.80, sr);
        vec2 spos = (vec2(sr2, hash(scell + vec2(2.1, 5.9))) - 0.5) * 0.4;
        vec2 delta = scf - spos;
        float sd = length(delta);
        float cross_h = exp(-delta.y*delta.y * 2500.0) * exp(-abs(delta.x) * 15.0);
        float cross_v = exp(-delta.x*delta.x * 2500.0) * exp(-abs(delta.y) * 15.0);
        float core = exp(-sd * sd * 800.0);
        float tw_s = 0.5 + 0.5 * sin(time * (2.0 + sr * 4.0 + trebleNormalized * 6.0 + max(trebleZScore, 0.0) * 5.0) + sr * 30.0);
        float twinkle = 0.35 + 0.65 * tw_s * tw_s;
        float star = (core + (cross_h + cross_v) * 0.6) * star_active * twinkle;
        float sky_mask = smoothstep(-0.2, 0.3, uv.y);
        bg += vec3(1.0, 0.95, 0.85) * star * sky_mask * (1.3 + clamp(trebleZScore, 0.0, 2.5) * 0.8);
    }

    // VJ NEBULA FOG — density rides K_BG_MOOD (0=clear, 1=thick).
    {
        float t = time * 0.05 + trebleNormalized * 0.08;
        vec2 np = uv * 1.3;
        float n1 = sin(np.x * 1.7 + t * 1.3) * sin(np.y * 2.1 - t * 0.9);
        float n2 = sin(np.x * 3.1 - t * 0.7) * sin(np.y * 2.7 + t * 1.1);
        float n3 = sin((np.x + np.y) * 0.9 + t * 0.6);
        float fog = (n1 + n2 * 0.6 + n3 * 0.4) * 0.25 + 0.5;
        fog = smoothstep(0.25, 0.95, fog);
        vec3 nebula_a = vec3(0.35, 0.15, 0.55);
        vec3 nebula_b = vec3(0.10, 0.35, 0.70);
        vec3 nebula = mix(nebula_a, nebula_b, sin(np.x * 0.7 + t) * 0.5 + 0.5);
        float fog_pulse = 1.0 + clamp(bassZScore, 0.0, 2.0) * 0.35;
        bg += nebula * fog * mix(0.04, 0.45, K_BG_MOOD) * (0.7 + midsNormalized * 0.4) * fog_pulse;
    }
    // VJ AURORA VEILS
    {
        float aurora_on = smoothstep(0.35, 0.10, spectralCentroidNormalized);
        if (aurora_on > 0.02) {
            float t = time * 0.35;
            float v1 = sin(uv.x * 2.3 + t) * 0.5 + sin(uv.x * 1.1 - t * 0.7) * 0.25;
            float v2 = sin(uv.x * 3.7 - t * 0.6) * 0.35;
            float curtain1 = exp(-pow(uv.y - 0.35 - v1 * 0.25, 2.0) * 14.0);
            float curtain2 = exp(-pow(uv.y - 0.20 - v2 * 0.3, 2.0) * 10.0);
            float intensity = aurora_on * (0.5 + bassNormalized * 0.6);
            bg += vec3(0.25, 0.85, 0.55) * curtain1 * intensity * 0.7;
            bg += vec3(0.15, 0.55, 0.95) * curtain2 * intensity * 0.5;
        }
    }
    // VJ ROTOR GEAR
    {
        float gear_on = clamp((spectralCentroidNormalized - 0.45) * 2.0, 0.0, 1.0);
        gear_on *= clamp(trebleNormalized - 0.3, 0.0, 1.0) * 1.8;
        if (gear_on > 0.02) {
            vec2 gear_p = uv - P.head_c;
            float gear_r = length(gear_p);
            float gear_a = atan(gear_p.y, gear_p.x);
            float step_rot = floor(time * 2.0) * (PI / 4.0);
            float rot_a = gear_a + step_rot;
            float spoke = 0.5 + 0.5 * cos(rot_a * 8.0);
            spoke = smoothstep(0.72, 0.95, spoke);
            float band = smoothstep(0.18, 0.21, gear_r) * smoothstep(0.33, 0.28, gear_r);
            float gear = spoke * band;
            gear *= smoothstep(0.17, 0.20, gear_r);
            bg += vec3(0.95, 0.75, 0.25) * gear * gear_on * 1.2;
        }
    }
    float rays = pow(max(0.0, 1.0 - abs(uv.x) * 1.2), 4.0) * smoothstep(0.0, 1.0, uv.y);
    bg += rays * vec3(1.0, 0.7, 0.3) * IS_DROP * 0.6;

    // ---- DADDY ----
    float d_body  = sdDaddy(uv, pump, P);
    float d_curls = sdCurls(uv, P, BEAT_PHASE, pump);
    float d_coat  = sdFurCoat(uv, P, pump);

    vec2 fur_p = uv * 38.0 + vec2(0.0, sin(BEAT_PHASE) * 0.15);
    float fur_n = fbm(fur_p);
    float fluff_amp = 0.018 + pump * 0.015 + SNAP * 0.012 + FLUFF_AGITATION * 0.02;
    float d_coat_fluff = d_coat - (fur_n - 0.5) * fluff_amp;

    float d = min(d_body, d_curls);

    float body  = smoothstep(0.005, -0.005, d);
    float curls = smoothstep(0.005, -0.005, d_curls);
    float coat  = smoothstep(0.006, -0.006, d_coat_fluff);

    float rim_w = 0.006 + IS_DROP * 0.012 + SNAP * 0.006;
    float rim = smoothstep(rim_w, 0.0, abs(d));
    float edge_gate = body * (1.0 - body) * 4.0;
    rim *= edge_gate;

    float coat_rim = smoothstep(rim_w, 0.0, abs(d_coat_fluff));
    float coat_edge_gate = coat * (1.0 - coat) * 4.0;
    coat_rim *= coat_edge_gate;

    float chest_glow_d = length(uv - vec2(P.hip * 0.7, -0.02)) * 3.0;
    float chest_glow = exp(-chest_glow_d*chest_glow_d);
    chest_glow *= smoothstep(0.005, -0.005, d_body) * (0.3 + pump * 0.7);

    float ct = cos(P.tilt), st = sin(P.tilt);
    vec2 le_local = vec2(-0.045, 0.02);
    vec2 re_local = vec2( 0.045, 0.02);
    vec2 le = P.head_c + vec2(le_local.x * ct + le_local.y * st, -le_local.x * st + le_local.y * ct);
    vec2 re = P.head_c + vec2(re_local.x * ct + re_local.y * st, -re_local.x * st + re_local.y * ct);

    float eyes = exp(-dot(uv - le, uv - le) * 2500.0) + exp(-dot(uv - re, uv - re) * 2500.0);
    eyes *= (0.25 + drop_hit * 1.8 + SNAP * 0.6 + smoothstep(0.5, 0.85, energyNormalized) * smoothstep(0.4, 0.8, spectralCentroidNormalized) * 0.9);

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
    // K_EYE_WASH directly scales the eye-wash bloom.
    float eye_wash = (wash_le + wash_re) * drop_hit * (0.2 + K_EYE_WASH * 1.0);

    // ---- COLOR ----
    float hue = mix(HUE_BASE, HUE_DROP, IS_DROP);
    vec3 leather = hsl2rgb(vec3(hue, 0.8, mix(0.06, 0.14, spectralCentroidNormalized)));
    float chrome_hue = fract(atan(uv.y - P.head_c.y, uv.x) / 6.2831 + time * (0.10 + pitchClassNormalized * 0.25) + hue * 0.3);
    vec3 chrome  = hsl2rgb(vec3(chrome_hue, 1.0, 0.65));
    vec3 hair    = hsl2rgb(vec3(0.06, 0.7, 0.12));
    vec3 hot     = hsl2rgb(vec3(0.08, 1.0, 0.6));

    float coat_grad = smoothstep(0.15, -0.4, uv.y);
    float bass_pulse = BASS_PULSE_AMT;
    float drop_color = DROP_COLOR_AMT;
    float fur_hue_hi = mix(0.62, 0.50, drop_color * 0.6);
    float fur_hue_lo = mix(0.58, 0.48, drop_color * 0.5);
    float fur_l_hi = 0.65 + bass_pulse * 0.15;
    float fur_l_lo = 0.45 + bass_pulse * 0.10;
    vec3 fur_hi = hsl2rgb(vec3(fur_hue_hi, 0.95, clamp(fur_l_hi, 0.0, 0.95)));
    vec3 fur_lo = hsl2rgb(vec3(fur_hue_lo, 0.9, clamp(fur_l_lo, 0.0, 0.85)));
    vec3 fur_col = mix(fur_hi, fur_lo, coat_grad);
    float shoulder_gleam_d = (uv.y - 0.08) * 10.0;
    float shoulder_gleam = exp(-shoulder_gleam_d*shoulder_gleam_d);
    float gleam_intensity = GLEAM_INTENSITY;
    fur_col += shoulder_gleam * vec3(gleam_intensity * 0.5, gleam_intensity * 0.8, gleam_intensity * 1.5);

    // ---- FRACTAL FUR FIBERS ----
    // K_FUR_PEAK lowers the trigger floor → fibers visible earlier; K_CHAOS scales their blend.
    float fur_trigger = FUR_TRIGGER;
    float fur_floor = mix(0.55, 0.10, K_FUR_PEAK);
    float fur_ceil  = mix(0.90, 0.35, K_FUR_PEAK);
    float fur_fractal_amt = smoothstep(fur_floor, fur_ceil, fur_trigger);
    if (fur_fractal_amt > 0.01) {
        vec2 fp = uv * 18.0;
        float warp_t = time * 0.3 + WARP_SPEED;
        vec2 warp = vec2(
            fbm(fp + vec2(warp_t, 0.0)),
            fbm(fp + vec2(0.0, warp_t + 3.7))
        );
        vec2 fp2 = fp + warp * 3.5;
        float fibers = fbm(fp2 + vec2(
            fbm(fp2 + vec2(warp_t * 0.7, 1.3)),
            fbm(fp2 + vec2(2.1, warp_t * 0.5))
        ) * 1.5);
        float strand = pow(abs(sin(fibers * PI * (4.0 + spectralFluxZScore * 1.5))), 3.0);
        vec3 strand_col = mix(fur_col * 1.5, vec3(0.7, 0.9, 1.0), 0.3 + strand * 0.4);
        float strand_blend = mix(0.3, 0.85, K_CHAOS);
        fur_col = mix(fur_col, strand_col, strand * fur_fractal_amt * strand_blend);
    }

    float seam_x_pos = P.hip * 0.7;
    float seam_dx = uv.x - seam_x_pos;
    float seam_glow = exp(-seam_dx * seam_dx * 40000.0);
    seam_glow *= smoothstep(-0.02, -0.10, uv.y) * 0.3;

    vec3 col = bg;
    vec3 skin = hsl2rgb(vec3(0.92, 0.45, 0.18));
    col = mix(col, skin, body);
    col = mix(col, fur_col, coat * (1.0 - curls));
    col = mix(col, hair, curls);

    // VJ WARM HEARTH
    {
        float warm_gate = smoothstep(0.45, 0.75, midsNormalized)
                        * smoothstep(0.50, 0.25, spectralCentroidNormalized)
                        * smoothstep(0.50, 0.20, energyNormalized);
        if (warm_gate > 0.02) {
            float hearth = exp(-max(d, 0.0) * 8.0);
            float breath = 0.85 + 0.15 * sin(time * 0.4);
            float hearth_hue = fract(0.08 + pitchClassNormalized * 0.04);
            vec3 hearth_col = hsl2rgb(vec3(hearth_hue, 0.85, 0.45));
            col += hearth_col * hearth * warm_gate * breath * 0.55;
        }
    }
    // VJ SIGIL SWIRL — gated by K_SIGIL_SWIRL
    if (K_SIGIL_SWIRL > 0.01) {
        vec2 sc = uv - vec2(P.hip * 0.7, -0.05);
        float sr = length(sc);
        float sa = atan(sc.y, sc.x);
        float spiral = sin(sa * 5.0 + sr * 14.0 - time * 1.2 + midsNormalized * 3.0);
        float swirl_band = smoothstep(0.05, 0.22, sr) * smoothstep(0.45, 0.28, sr);
        float swirl = pow(0.5 + 0.5 * spiral, 3.0) * swirl_band;
        float swirl_hue = fract(0.7 + sa / 6.28 + time * 0.08 + pitchClassNormalized * 0.25);
        vec3 swirl_col = hsl2rgb(vec3(swirl_hue, 0.85, 0.55));
        float mids_gain = 0.4 + midsNormalized * 0.8;
        col += swirl_col * swirl * coat * (1.0 - curls) * mids_gain * K_SIGIL_SWIRL * 1.2;
    }
    col += rim * chrome * 1.3 * (1.0 - coat);

    // VJ SUB RING
    {
        float bass_hit = clamp(bassZScore, 0.0, 2.5) * drop_hit;
        if (bass_hit > 0.3) {
            vec2 sub_c = vec2(0.0, -0.15);
            float sd = length(uv - sub_c);
            float ring_speed = 1.2 + clamp(energyZScore, -0.5, 1.5) * 0.6;
            float ring_radius = 0.2 + fract(time * ring_speed) * 0.5;
            float ring_d = sd - ring_radius;
            float ring = exp(-ring_d*ring_d * 400.0);
            float ring_fade = 1.0 - fract(time * ring_speed);
            col += vec3(1.0, 0.3, 0.1) * ring * bass_hit * ring_fade * 0.7;
        }
    }
    // VJ HEART PULSE
    {
        vec2 heart_c = vec2(P.hip * 0.7, -0.08);
        float heart_d = length((uv - heart_c) * vec2(1.2, 1.0));
        float heart = exp(-heart_d * 6.0);
        float heart_pulse = 0.3 + clamp(bassZScore, 0., 2.) * 1.2 + bassNormalized * 0.5 + midsNormalized * 0.4;
        vec3 heart_col = hsl2rgb(vec3(fract(0.92 + pitchClassNormalized * 0.10 + sin(time * 0.4) * 0.03), 1.0, 0.55));
        col += heart * heart_col * heart_pulse * coat * 0.6;
    }
    // VJ DRIP — gated by K_DRIP
    if (K_DRIP > 0.01) {
        vec2 drip_src = vec2(P.hip * 0.7, -0.02);
        float bass_hit = clamp(bassZScore, 0.0, 2.0);
        float drip_phase = fract(time * 0.6);
        float drip_y = drip_src.y - drip_phase * 0.55;
        vec2 dp = uv - vec2(drip_src.x, drip_y);
        float drip_r = 0.022 + bass_hit * 0.01;
        float tail_y = max(0.0, uv.y - drip_y) * 2.5;
        float drop_sd = length(vec2(dp.x, dp.y + tail_y * 0.15)) - drip_r;
        float drop_glow_local = exp(-max(drop_sd, 0.0) * 80.0);
        float trail_dist = abs(uv.x - drip_src.x);
        float trail_mask = smoothstep(drip_src.y, drip_y, uv.y) * smoothstep(drip_y - 0.02, drip_y, uv.y);
        float trail = exp(-trail_dist * trail_dist * 3000.0) * trail_mask * (0.4 + bass_hit * 0.6);
        vec3 drip_col = hsl2rgb(vec3(fract(0.58 + pitchClassNormalized * 0.15), 0.85, 0.6));
        col += drip_col * (drop_glow_local + trail * 0.5) * (0.4 + bass_hit * 0.8) * K_DRIP * 1.3;
    }
    // VJ DRIP POOL
    if (K_DRIP > 0.01) {
        vec2 pool_c = vec2(P.hip * 0.7, -0.72);
        vec2 pd = uv - pool_c;
        float pool_d = length(pd * vec2(1.0, 2.4));
        float pool_edge = smoothstep(0.28, 0.06, pool_d);
        float pool_mask = smoothstep(-0.55, -0.70, uv.y);
        float ripple_speed = 1.8 + clamp(bassZScore, 0.0, 2.0) * 1.2;
        float ripple = 0.5 + 0.5 * sin(pool_d * 28.0 - time * ripple_speed);
        ripple = pow(ripple, 3.0);
        float ripple_falloff = exp(-pool_d * 6.0);
        vec3 pool_col = hsl2rgb(vec3(fract(0.58 + pitchClassNormalized * 0.15), 0.75, 0.45));
        vec3 ripple_col = hsl2rgb(vec3(fract(0.58 + pitchClassNormalized * 0.15 + 0.08), 0.9, 0.65));
        col += pool_col * pool_edge * pool_mask * K_DRIP * 0.6;
        col += ripple_col * ripple * ripple_falloff * pool_mask * pool_edge * K_DRIP * 0.8;
    }
    col += chest_glow * chrome * 0.8 * (1.0 - coat);
    float rim_boost = RIM_BOOST;
    col += coat_rim * chrome * rim_boost * (1.0 - curls);

    col += seam_glow * coat * chrome * 0.25 * (1.0 - curls);
    col += eyes * hot * 2.2;
    col = mix(col, col + hot * 0.6, eye_wash);
    col += eye_wash * hot * 0.4;
    vec3 ray_col = mix(hot, vec3(0.4, 0.85, 1.0), smoothstep(0.45, 0.85, spectralCentroidNormalized));
    // K_GOD_RAYS scales the entire ray pass — manual mode gives a hard ceiling.
    float godray_amt = (clamp(energyZScore, 0.0, 1.5) * 2.5 + clamp(trebleZScore, 0.0, 1.0) * 1.0) * (0.2 + K_GOD_RAYS * 1.4);
    col += god_rays * ray_col * godray_amt;

    // ---- FEEDBACK ---- (K_SMEAR replaces the old knob_9)
    vec2 fb_uv = fragCoord / res;
    fb_uv.x -= P.hip * 0.01;
    fb_uv.y -= 0.002 + pump * 0.003;
    vec3 prev = getLastFrameColor(fb_uv).rgb * 0.88;
    float silhouette = max(body, coat);
    float feedback_amt = mix(mix(0.45, 0.05, K_SMEAR), mix(0.15, 0.03, K_SMEAR), silhouette);
    feedback_amt = mix(feedback_amt, 0.35, clamp(bassZScore - 0.4, 0.0, 1.0) * 0.5);
    if (beat) feedback_amt *= 0.6;
    if (frame < 30) feedback_amt = 0.0;
    col = mix(prev, col, feedback_amt);

    // VJ TIME-ECHO
    {
        float echo = clamp(energyZScore - 0.5, 0.0, 1.0);
        if (echo > 0.05) {
            vec3 e1 = getLastFrameColor(fb_uv + vec2( 0.020,  0.006)).rgb;
            vec3 e2 = getLastFrameColor(fb_uv + vec2(-0.024,  0.009)).rgb;
            vec3 e3 = getLastFrameColor(fb_uv + vec2( 0.004, -0.018)).rgb;
            vec3 echoed = (e1 * vec3(1.2, 0.7, 0.7) + e2 * vec3(0.7, 1.1, 0.9) + e3 * vec3(0.8, 0.9, 1.2)) * 0.34;
            col = mix(col, col + echoed * 0.5, echo * 0.9);
        }
    }
    // VJ BLACK HOLE
    {
        float bh_strength = clamp(bassZScore - 0.3, 0.0, 1.5) * drop_hit;
        if (bh_strength > 0.05 && silhouette > 0.0) {
            vec2 bh_center = P.head_c + vec2(0.0, -0.05);
            vec2 to_center = bh_center - uv;
            float bh_d = length(to_center);
            vec2 dir_lens = to_center / max(bh_d, 0.001);
            float lens_strength = bh_strength * 0.08 / max(bh_d * bh_d + 0.04, 0.04);
            vec2 lens_uv = fb_uv + dir_lens * lens_strength * vec2(res.y / res.x, 1.0);
            vec3 lensed = getLastFrameColor(lens_uv).rgb;
            col = mix(col, lensed, bh_strength * (1.0 - silhouette) * 0.8);
            col = mix(col, vec3(0.0), silhouette * bh_strength * 0.85);
        }
    }
    // VJ WATER POOL
    {
        float pool_on = smoothstep(0.25, 0.05, spectralCentroidNormalized);
        if (pool_on > 0.02 && uv.y < -0.15) {
            float depth = clamp(-uv.y - 0.15, 0.0, 0.6);
            float ripple_x = sin(uv.x * 10.0 + time * 1.2) * 0.006 * (1.0 + bassNormalized);
            float ripple_y = sin(uv.x * 6.0 - time * 0.8) * 0.004;
            vec2 refl_uv = fb_uv;
            refl_uv.y = 0.5 - (fb_uv.y - 0.5) - 0.05;
            refl_uv.x += ripple_x;
            refl_uv.y += ripple_y;
            vec3 pool = getLastFrameColor(refl_uv).rgb;
            pool *= vec3(0.4, 0.7, 0.8);
            float pool_fade = smoothstep(0.0, 0.45, depth);
            col = mix(col, pool, pool_on * pool_fade * 0.65);
        }
    }
    // VJ VOLUMETRIC BEAMS
    {
        float beams_on = clamp((spectralCentroidNormalized - 0.4) * 2.0, 0.0, 1.0);
        beams_on *= clamp(energyNormalized * 1.5, 0.0, 1.0);
        if (beams_on > 0.02) {
            vec2 light_origin = vec2(0.3, 0.9);
            vec2 to_origin = light_origin - uv;
            float beam_a = atan(to_origin.y, to_origin.x);
            float beam = 0.5 + 0.5 * sin(beam_a * 30.0 + time * 0.3);
            beam = pow(beam, 8.0);
            float dist_fade = 1.0 - smoothstep(0.2, 1.4, length(to_origin));
            float sil_mask = 1.0 - silhouette;
            vec3 beam_col = vec3(0.95, 0.85, 0.55);
            col += beam_col * beam * dist_fade * sil_mask * beams_on * 0.45;
        }
    }
    // VJ GROUND QUAKE
    {
        float quake_on = clamp(bassNormalized - 0.3, 0.0, 1.0) * drop_hit;
        quake_on *= smoothstep(0.5, 0.15, spectralCentroidNormalized);
        if (quake_on > 0.02) {
            vec2 feet_c = vec2(0.0, -0.6);
            vec2 dvec = uv - feet_c;
            dvec.y *= 2.0;
            float r = length(dvec);
            float wavefronts = 0.0;
            for (int wi = 0; wi < 3; wi++) {
                float wf = float(wi);
                float ring_r = fract(time * 0.6 + wf * 0.33) * 1.2;
                float dr = r - ring_r;
                float w = exp(-dr * dr * 90.0);
                float fade = 1.0 - ring_r / 1.2;
                wavefronts += w * fade;
            }
            vec3 quake_col = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.75, 0.3), bassNormalized);
            col += quake_col * wavefronts * quake_on * 0.55;
        }
    }
    // VJ BEAT STROBE — gated by K_BEAT_STROBE
    if (K_BEAT_STROBE > 0.01) {
        float beat_pulse = pow(1.0 - clamp(BEAT_PHASE, 0.0, 1.0), 3.0);
        float beat_boost = beat_pulse * (0.8 + clamp(bassZScore, 0.0, 1.5) * 0.5);
        vec3 pulse_col = vec3(1.0, 0.85, 0.65);
        col += pulse_col * beat_boost * K_BEAT_STROBE * 0.25;
    }
    // VJ INKY BG — folded into K_BG_MOOD: 0=clear, 1=inky outside silhouette.
    {
        float inky_amt = smoothstep(0.45, 1.0, K_BG_MOOD);
        if (inky_amt > 0.01) {
            float entropy_sharpen = 0.5 + 0.5 * spectralEntropyNormalized;
            float bg_mask = 1.0 - silhouette;
            float dim_amt = inky_amt * entropy_sharpen * bg_mask;
            vec3 lab = rgb2oklab(col);
            lab.x *= mix(1.0, 0.35, dim_amt);
            lab.yz *= mix(1.0, 0.45, dim_amt);
            col = oklab2rgb(lab);
        }
    }

    // ---- CLIMAX CAP ---- master gain (K_CLIMAX 0..1 → 0.4x..1.3x)
    col *= mix(0.4, 1.3, K_CLIMAX);

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
