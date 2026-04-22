// @fullscreen: true
// @mobile: true
// the-coat-8: forked from the-coat-7 at iter 45. Confetti removed.
// Knob defaults captured: knob_2=-0.346, knob_7=0.98, knob_12=0.669, knob_15=0.46
// Use with controller=the-coat for sustained drop glow
uniform float drop_glow; // from the-coat controller — sustained drop with decay
#define PI 3.14159265

#define DEBUG_OUTLINES 0

// ============================================================================
// KNOB CONTROLS — knobs override baked defaults from the jam session
// knob_1: zoom (0=wide, 1=tight) — live-remapped
// knob_3: god ray intensity override
// knob_4: eye wash override
// knob_5: drop zoom override
// knob_6: camera tilt swagger
// knob_7: fur thickness
// knob_13: sustain decay (via controller)
// ============================================================================

// --- ZOOM ---
// Baked from knob_2=-0.346 session value
// knob_1: 0=wide, 1=tight — live-remapped from knob_2
#define BASE_ZOOM (mix(0.1, 2.5, knob_1) + energyNormalized * 0.4)

// --- COAT SHAPE ---
#define SHOULDER_Y      (-0.02 + max(bassZScore, 0.0) * 0.015)
#define SHOULDER_SPREAD (0.158 + bassNormalized * 0.02)
#define SLEEVE_RADIUS   (0.04 + max(trebleZScore, 0.0) * 0.015)
#define SHOULDER_CAP     0.042
#define CHEST_W_BASE    (0.12 + bassNormalized * 0.03)
#define CHEST_H_BASE    (0.065 + bassNormalized * 0.01)
// Fur puffs up with energy — thick on drops, lean on quiet
#define FUR_THICK       (0.06 + clamp(energyZScore, 0.0, 1.0) * 0.04)
// V-neck opens on energy spikes — reveals more chest on drops
#define VNECK_WIDTH     (0.10 + clamp(energyZScore, 0.0, 1.0) * 0.06)
#define VNECK_BOTTOM    (-0.013 - clamp(energyZScore, 0.0, 1.0) * 0.03)

// --- MOTION ---
// Heavy pump from bass — body bounces with the kick drum
#define PUMP (bassNormalized * 0.6 + clamp(bassSlope * bassRSquared, 0.0, 0.5) * 3.0)
#define BEAT_PHASE (time * 2.2)
// Treble drives snap gestures — hi-hats make hands twitch
#define SNAP (clamp(trebleZScore, 0.0, 1.5))
#define HIP_SWAY (sin(time * 1.1))
// Mids drive groove — melodic content makes the body sway
#define GROOVE (midsNormalized * 0.8 + spectralCentroidNormalized * 0.2)

// --- DROP DETECTION ---
// Confident energy build = drop approaching
#define BUILD (clamp(energySlope * energyRSquared * 10.0, 0.0, 1.0))
#define IS_DROP clamp(BUILD + smoothstep(0.6, 1.0, energyZScore) * 0.5, 0.0, 1.0)
#define DROP_TRIGGER_THRESH 0.8
#define SUSTAIN_GAIN 1.2

// --- DROP VISUALS ---
// Drop zoom punches in hard — learned from wooli-drop preset (knob_5=0.764)
#define DROP_ZOOM 0.9
// God rays — quiet below average energy, bloom above it
#define GODRAY_INTENSITY (clamp(energyZScore, 0.0, 1.5) * 2.5 + clamp(trebleZScore, 0.0, 1.0) * 1.0)
// Eye wash — kicks in above-average energy, scales up from there
#define EYE_WASH_STRENGTH (clamp(energyZScore, 0.0, 1.0) * 0.5 + clamp(bassZScore, 0.0, 1.0) * 0.2)
// Continuous zoom breathes with intensity
#define INTENSITY_ZOOM (energyNormalized * 0.3)

// --- COLOR ---
// Base hue shifts with pitch class — different notes = different colors
// VJ breathing rainbow — full cycle every ~60s, mids nudge the hue
#define HUE_BASE (fract(0.78 + time * 0.0167 + pitchClassNormalized * 0.15 + midsNormalized * 0.20))
// Drop shifts toward hot orange/yellow
#define HUE_DROP (fract(0.99 + spectralCentroidNormalized * 0.05))

// --- COAT SURFACE (the star of the show) ---
// Fluff bristles up on energy spikes AND spectral roughness
#define FLUFF_AGITATION (clamp(energyZScore, 0.0, 1.0) * 0.5 + spectralRoughnessNormalized * 0.5)
// Bass pulse drives color warmth — kicks make the coat glow
#define BASS_PULSE_AMT (clamp(bassZScore, 0.0, 1.0) * 0.8)
// Color shift driven by drops AND energy — more reactive than before
#define DROP_COLOR_AMT clamp(IS_DROP + clamp(energyZScore, 0.0, 1.0) * 0.4 + clamp(bassZScore, 0.0, 1.0) * 0.2, 0.0, 1.0)
// Shoulder gleam pulses with spectral flux — light catches on timbral changes
#define GLEAM_INTENSITY (0.15 + spectralFluxNormalized * 0.35)

// Fractal fur — THE signature feature (living-coat preset)
// Entropy (chaos) + roughness (grit) + kurtosis (peaked) trigger the fur fibers
// Lower threshold than before so it's visible more often
#define FUR_TRIGGER clamp(spectralEntropyNormalized * 0.7 + spectralRoughnessNormalized * 0.5 + clamp(spectralKurtosisZScore, 0.0, 1.0) * 0.2, 0.0, 1.0)
// Warp speed driven by centroid — brighter sounds = faster swirl
#define WARP_SPEED (spectralCentroidNormalized * 0.6 + spectralFluxNormalized * 0.2)
// Rim boost: flux + bass make the chrome edge blaze
#define RIM_BOOST (2.5 + spectralFluxNormalized * 2.0 + clamp(bassZScore, 0.0, 1.0) * 1.0)

// --- DERIVED ---
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
    P.bob = -abs(sin(beat_phase)) * 0.025 + groove * 0.005 - clamp(bassZScore, 0.0, 2.0) * 0.04;
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
    float neck = sdEllipse(np, vec2(0.035, 0.045));

    // Slimmer chest
    float chest_w = 0.23 + pump * 0.04;
    float chest_h = 0.17 + pump * 0.02;
    vec2 cp = p - vec2(P.hip * 0.7, -0.02);
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
    vec2 cp = p - vec2(P.hip * 0.7, 0.01);
    float chest = sdEllipse(cp, vec2(chest_w, chest_h));

    // Waist — narrower pinch at midsection
    vec2 wpn = p - vec2(P.hip * 0.8, -0.12);
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

    // --- DROP SUSTAIN ---
    // drop_glow is a controller-computed uniform with exponential decay.
    // It latches high on energy spikes and decays smoothly over ~1-2 seconds.
    // Falls back to instantaneous IS_DROP if no controller is loaded.
    float drop_spike = smoothstep(DROP_TRIGGER_THRESH, DROP_TRIGGER_THRESH + 0.5, BUILD);
    float sustain_signal = BUILD * SUSTAIN_GAIN;
    float drop_now = clamp(max(drop_spike, max(IS_DROP, sustain_signal)), 0.0, 1.0);
    drop_now = smoothstep(0.15, 0.5, drop_now);
    // drop_glow = controller-driven sustained drop glow (exponential decay)
    float drop_hit = max(drop_now, drop_glow);

    float intensity = max(PUMP, GROOVE);
    // Cubic ease-in: crushes twitchy low-end values, lets big moments punch through.
    // smoothstep(0.2, 0.9) maps to 0-1, then cube kills anything below ~0.5
    float zoom_intensity = smoothstep(0.2, 0.9, intensity);
    zoom_intensity = zoom_intensity * zoom_intensity * zoom_intensity;
    float zoomAmount = BASE_ZOOM + zoom_intensity * INTENSITY_ZOOM + drop_hit * DROP_ZOOM;
    vec2 zoomCenter = P.head_c;
    // VJ CAMERA DRIFT — slow lateral sway + flux nudge so the frame never sits locked
    vec2 cam_drift = vec2(
        sin(time * 0.12) * 0.015 + spectralFluxZScore * 0.012,
        sin(time * 0.09 + 1.3) * 0.010
    );
    zoomCenter += cam_drift;
    uv = (uv - zoomCenter) / zoomAmount + zoomCenter;

    // Camera tilt — knob_6 controls how much swagger
    float tilt_angle = (sin(time * 0.7) * 0.15
                     + (spectralCentroidNormalized - 0.5) * 0.2
                     + bassZScore * 0.075) * knob_6;
    float ca = cos(tilt_angle), sa = sin(tilt_angle);
    uv -= zoomCenter;
    uv = vec2(uv.x * ca - uv.y * sa, uv.x * sa + uv.y * ca);
    uv += zoomCenter;

    // ---- BACKDROP ----
    float bg_grad = smoothstep(-0.8, 0.8, uv.y);
    vec3 bg = mix(vec3(0.04, 0.02, 0.10), vec3(0.01, 0.00, 0.04), bg_grad);
    float spot = exp(-uv.x*uv.x * 4.0) * smoothstep(-0.3, -0.6, uv.y);
    bg += spot * vec3(0.5, 0.2, 0.6) * (0.5 + 0.5 * sin(BEAT_PHASE * 2.0)) * (0.8 + clamp(energyZScore, -0.5, 2.0) * 0.6);
    // VJ STARFIELD — sparkle crosses in the upper sky, twinkle faster on treble
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

    // VJ NEBULA FOG — slow drifting cosmic haze, no per-frame hashing
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
        // knob_2: nebula fog density (0 = clear, 1 = thick cosmic cloud) — auto-wired when twisted
        float fog_pulse = 1.0 + clamp(bassZScore, 0.0, 2.0) * 0.50;
        bg += nebula * fog * mix(0.04, 0.45, knob_2) * (0.7 + midsNormalized * 0.4) * fog_pulse;
    }
        // VJ AURORA VEILS — glowing green-teal curtains in dark/wonky phases (low centroid)
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
    // VJ ROTOR GEAR — stepped 8-spoke halo behind head, ticks on treble-heavy phases
    {
        float gear_on = clamp((spectralCentroidNormalized - 0.45) * 2.0, 0.0, 1.0);
        gear_on *= clamp(trebleNormalized - 0.3, 0.0, 1.0) * 1.8;
        if (gear_on > 0.02) {
            vec2 gear_p = uv - P.head_c;
            float gear_r = length(gear_p);
            float gear_a = atan(gear_p.y, gear_p.x);
            // Stepped rotation — 2Hz clock, 8 positions
            float step_rot = floor(time * 2.0) * (PI / 4.0);
            float rot_a = gear_a + step_rot;
            // 8 spokes
            float spoke = 0.5 + 0.5 * cos(rot_a * 8.0);
            spoke = smoothstep(0.72, 0.95, spoke);
            // Only within a ring band behind head
            float band = smoothstep(0.18, 0.21, gear_r) * smoothstep(0.33, 0.28, gear_r);
            float gear = spoke * band;
            // Masked outside the silhouette — radial falloff instead of silhouette ref (not defined yet here)
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

    // Fur "fluff" — perturb the coat distance with noise so its edge is shaggy
    // Noise coords wobble with beat so the fur looks alive
    vec2 fur_p = uv * 38.0 + vec2(0.0, sin(BEAT_PHASE) * 0.15);
    float fur_n = fbm(fur_p);
    // Fur edge gets much more agitated on drops/bass — bristles up
    float fluff_amp = 0.018 + pump * 0.015 + SNAP * 0.012 + FLUFF_AGITATION * 0.02;
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

    float chest_glow_d = length(uv - vec2(P.hip * 0.7, -0.02)) * 3.0;
    float chest_glow = exp(-chest_glow_d*chest_glow_d);
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
    float eye_wash = (wash_le + wash_re) * drop_hit * EYE_WASH_STRENGTH;

    // ---- COLOR ----
    float hue = mix(HUE_BASE, HUE_DROP, IS_DROP);
    vec3 leather = hsl2rgb(vec3(hue, 0.8, mix(0.06, 0.14, spectralCentroidNormalized)));
    // VJ prism rim — chrome cycles its own rainbow based on uv angle + time
    float chrome_hue = fract(atan(uv.y - P.head_c.y, uv.x) / 6.2831 + time * (0.10 + pitchClassNormalized * 0.25) + hue * 0.3);
    vec3 chrome  = hsl2rgb(vec3(chrome_hue, 1.0, 0.65));
    vec3 hair    = hsl2rgb(vec3(0.06, 0.7, 0.12));
    vec3 hot     = hsl2rgb(vec3(0.08, 1.0, 0.6));

    // Coat fill — audio-reactive color. Base is deep blue, but:
    // - Lightness pulses brighter on bass hits
    // - Hue shifts toward electric cyan on drops
    // - Saturation dips slightly on quiet passages (more white/pastel)
    float coat_grad = smoothstep(0.15, -0.4, uv.y);
    float bass_pulse = BASS_PULSE_AMT;
    float drop_color = DROP_COLOR_AMT;
    // Hue slides from deep blue (0.62) toward electric cyan (0.50) on drops
    float fur_hue_hi = mix(0.62, 0.50, drop_color * 0.6);
    float fur_hue_lo = mix(0.58, 0.48, drop_color * 0.5);
    // Lightness pumps up on bass
    float fur_l_hi = 0.65 + bass_pulse * 0.15;
    float fur_l_lo = 0.45 + bass_pulse * 0.10;
    vec3 fur_hi = hsl2rgb(vec3(fur_hue_hi, 0.95, clamp(fur_l_hi, 0.0, 0.95)));
    vec3 fur_lo = hsl2rgb(vec3(fur_hue_lo, 0.9, clamp(fur_l_lo, 0.0, 0.85)));
    vec3 fur_col = mix(fur_hi, fur_lo, coat_grad);
    // Shoulder gleam pulses with spectral flux — light catching the coat
    float shoulder_gleam_d = (uv.y - 0.08) * 10.0;
    float shoulder_gleam = exp(-shoulder_gleam_d*shoulder_gleam_d);
    float gleam_intensity = GLEAM_INTENSITY;
    fur_col += shoulder_gleam * vec3(gleam_intensity * 0.5, gleam_intensity * 0.8, gleam_intensity * 1.5);
    // ---- FRACTAL FUR FIBERS ----
    // Swirling domain-warped fractal that appears inside the coat when the
    // music is "interesting" — triggered by spectral entropy (chaos) and
    // spectral roughness (dissonance). These are independent from the
    // energy/bass features that drive the eyes, so the coat and eyes
    // react to DIFFERENT musical qualities.
    float fur_trigger = FUR_TRIGGER;
    // Only show when musically interesting (above baseline)
    float fur_fractal_amt = smoothstep(0.15, 0.55, fur_trigger);
    if (fur_fractal_amt > 0.01) {
        // Domain warp: swirl the coords with low-freq noise so the fibers
        // look like curling fur strands, not a static grid
        vec2 fp = uv * 18.0;
        float warp_t = time * 0.3 + WARP_SPEED;
        vec2 warp = vec2(
            fbm(fp + vec2(warp_t, 0.0)),
            fbm(fp + vec2(0.0, warp_t + 3.7))
        );
        // Second domain warp for deeper swirl
        vec2 fp2 = fp + warp * 3.5;
        float fibers = fbm(fp2 + vec2(
            fbm(fp2 + vec2(warp_t * 0.7, 1.3)),
            fbm(fp2 + vec2(2.1, warp_t * 0.5))
        ) * 1.5);
        // Shape the fibers: sharp ridges that look like individual strands
        float strand = pow(abs(sin(fibers * PI * (4.0 + spectralFluxZScore * 1.5))), 3.0);
        // Color the strands: lighter than the base coat, tinted toward
        // cyan/white so they read as light catching individual fur fibers
        vec3 strand_col = mix(fur_col * 1.5, vec3(0.7, 0.9, 1.0), 0.3 + strand * 0.4);
        // Blend into the coat color, gated by the trigger amount
        fur_col = mix(fur_col, strand_col, strand * fur_fractal_amt * 0.85);
    }

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
    // VJ SUB RING — expanding cone ring on bass spikes (gated by bassZScore)
    {
        float bass_hit = clamp(bassZScore, 0.0, 2.5);
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
    // VJ HEART PULSE — red glow from chest center, pulses on bass
    {
        vec2 heart_c = vec2(P.hip * 0.7, -0.08);
        float heart_d = length((uv - heart_c) * vec2(1.2, 1.0));
        // Heart-shape-ish falloff
        float heart = exp(-heart_d * 6.0);
        float heart_pulse = 0.3 + clamp(bassZScore, 0., 2.) * 1.2 + bassNormalized * 0.5 + midsNormalized * 0.4;
        vec3 heart_col = hsl2rgb(vec3(fract(0.92 + pitchClassNormalized * 0.10 + sin(time * 0.4) * 0.03), 1.0, 0.55));
        col += heart * heart_col * heart_pulse * coat * 0.6;
    }
    col += chest_glow * chrome * 0.8 * (1.0 - coat);
    // Coat rim — chrome edge hugs the shaggy outline (boosted for visibility)
    // Coat rim pulses with spectral flux — brighter on timbral changes
    float rim_boost = RIM_BOOST;
    col += coat_rim * chrome * rim_boost * (1.0 - curls);
    // Button seam glow — chrome line down the center
    col += seam_glow * coat * chrome * 0.25 * (1.0 - curls);
    col += eyes * hot * 2.2;
    // VJ WARM BREATH — slow amber chest glow breathing at 0.5Hz, gated on sustained mid-energy
    // Fills the 'warm dark instrumental' slot (iter 39 journal hypothesis).
    {
        float warm_on = clamp(midsNormalized - 0.15, 0.0, 1.0);
        warm_on *= smoothstep(0.8, 0.2, spectralCentroidNormalized);
        if (warm_on > 0.02) {
            float breath = 0.5 + 0.5 * sin(time * 3.14);
            vec3 chest_c_world = vec3(P.hip * 0.7, -0.05, 0.0);
            float chest_d = length(uv - chest_c_world.xy) * 1.4;
            float glow = exp(-chest_d * chest_d * 6.0);
            vec3 warm_col = vec3(1.0, 0.55, 0.25);
            col += warm_col * glow * warm_on * breath * 0.70;
        }
    }
    // VJ MOUTH GLOW — soft glow where the mouth would be, pulsing on mids (vocal presence)
    {
        float mouth_on = clamp(midsNormalized - 0.15, 0.0, 1.0);
        if (mouth_on > 0.02) {
            vec2 mouth_c = P.head_c + vec2(0.0, -0.06);
            float md = length((uv - mouth_c) * vec2(1.4, 2.0));
            float mouth_blob = exp(-md * md * 80.0);
            float pulse = 0.5 + 0.5 * sin(time * 4.0 + pitchClassNormalized * 6.28);
            vec3 mouth_col = hsl2rgb(vec3(fract(0.05 + pitchClassNormalized * 0.15), 0.9, 0.55));
            col += mouth_col * mouth_blob * mouth_on * pulse * 0.8;
        }
    }
    col = mix(col, col + hot * 0.6, eye_wash);
    col += eye_wash * hot * 0.4;
    vec3 ray_col = mix(hot, vec3(0.4, 0.85, 1.0), smoothstep(0.45, 0.85, spectralCentroidNormalized));
    col += god_rays * ray_col * GODRAY_INTENSITY;

    // ---- INFINITY MIRROR removed (spinning-tile repetition clashed with spacy ambient bg) ----

    // ---- FEEDBACK ----
    vec2 fb_uv = fragCoord / res;
    fb_uv.x -= P.hip * 0.01;
    fb_uv.y -= 0.002 + pump * 0.003;
    vec3 prev = getLastFrameColor(fb_uv).rgb * 0.88;
    float silhouette = max(body, coat);
    // knob_9: feedback/trails (0=crisp, 1=heavy smear)
    float feedback_amt = mix(mix(0.45, 0.05, knob_9), mix(0.15, 0.03, knob_9), silhouette);
    // VJ GHOST ECHO — bass spikes briefly raise feedback for a coat afterimage
    feedback_amt = mix(feedback_amt, 0.55, clamp(bassZScore - 0.4, 0.0, 1.0) * 0.5);
    if (beat) feedback_amt *= 0.6;
    if (frame < 30) feedback_amt = 0.0;
    col = mix(prev, col, feedback_amt);
    // VJ MERCURY FLOW — bass-heavy low-centroid phases turn the coat into flowing liquid metal
    {
        float flow_on = clamp(bassNormalized - 0.25, 0.0, 1.0);
        flow_on *= smoothstep(0.60, 0.25, spectralCentroidNormalized);
        if (flow_on > 0.02 && silhouette > 0.05) {
            float flow_t = time * (0.3 + bassNormalized * 0.8);
            // Mercury FLOW via fbm — no periodic lattice, no diamond artifacting.
            // Vertical bias: sample at uv.xy shifted by (low-freq horizontal wobble, fast downward drift).
            vec2 flow_p = uv * vec2(2.5, 3.5) + vec2(sin(flow_t * 0.7) * 0.4, flow_t * 1.1);
            float stripe = fbm(flow_p);
            stripe = smoothstep(0.40, 0.75, stripe);
            vec3 mercury_dark = vec3(0.05, 0.06, 0.1);
            vec3 mercury_hi = vec3(0.92, 0.94, 1.0);
            vec3 mercury = mix(mercury_dark, mercury_hi, stripe);
            col = mix(col, mercury, flow_on * silhouette * 0.75);
        }
    }


    // VJ TIME-ECHO — on energy surges, triple-expose previous frame around head
    {
        float echo = clamp(energyZScore - 0.5, 0.0, 1.0);
        if (echo > 0.05) {
            vec2 ec = P.head_c;
            vec3 e1 = getLastFrameColor(fb_uv + vec2( 0.020,  0.006)).rgb;
            vec3 e2 = getLastFrameColor(fb_uv + vec2(-0.024,  0.009)).rgb;
            vec3 e3 = getLastFrameColor(fb_uv + vec2( 0.004, -0.018)).rgb;
            vec3 echoed = (e1 * vec3(1.2, 0.7, 0.7) + e2 * vec3(0.7, 1.1, 0.9) + e3 * vec3(0.8, 0.9, 1.2)) * 0.34;
            col = mix(col, col + echoed * 0.5, echo * 0.9);
        }
    }
    // VJ BLACK HOLE — silhouette becomes a gravitational lens. Active on bassZ spikes.
    {
        float bh_strength = clamp(bassZScore - 0.3, 0.0, 1.5);
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


    // VJ COSMIC SHOCKWAVE — one-shot expanding ring on true beat flux spikes
    {
        float shock_trigger = float(beat) * clamp(spectralFluxZScore, 0.0, 1.0);
        // lock the start time at the beat moment using a hash keyed to coarse time
        float shock_phase = fract(time * 0.7);
        float shock_r = shock_phase * 1.4;
        float shock_d = length(uv) - shock_r;
        float shock_ring = exp(-shock_d * shock_d * 300.0);
        float shock_fade = (1.0 - shock_phase);
        shock_fade *= shock_fade;
        col += vec3(1.0, 1.0, 1.2) * shock_ring * shock_fade * shock_trigger * 1.4;
    }
    // VJ WATER POOL — bottom-third reflective pool ripples in dark/deep phases
    {
        float pool_on = smoothstep(0.25, 0.05, spectralCentroidNormalized);
        if (pool_on > 0.02 && uv.y < -0.15) {
            // Reflect uv: below waterline, sample mirrored above + gentle ripple
            float depth = clamp(-uv.y - 0.15, 0.0, 0.6);
            float ripple_x = sin(uv.x * 10.0 + time * 1.2) * 0.006 * (1.0 + bassNormalized);
            float ripple_y = sin(uv.x * 6.0 - time * 0.8) * 0.004;
            vec2 refl_uv = fb_uv;
            refl_uv.y = 0.5 - (fb_uv.y - 0.5) - 0.05;
            refl_uv.x += ripple_x;
            refl_uv.y += ripple_y;
            vec3 pool = getLastFrameColor(refl_uv).rgb;
            pool *= vec3(0.4, 0.7, 0.8); // teal tint
            float pool_fade = smoothstep(0.0, 0.45, depth);
            col = mix(col, pool, pool_on * pool_fade * 0.65);
        }
    }
    // VJ VOLUMETRIC BEAMS — light shafts radiating from upper backlight through silhouette gaps
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
    // VJ GROUND QUAKE — concentric amber rings from floor, bass-driven, multiple wavefronts
    {
        float quake_on = clamp(bassNormalized - 0.3, 0.0, 1.0);
        quake_on *= smoothstep(0.5, 0.15, spectralCentroidNormalized);
        if (quake_on > 0.02) {
            vec2 feet_c = vec2(0.0, -0.6);
            vec2 dvec = uv - feet_c;
            // Squash vertically so rings look like ground waves (elliptical)
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
    // VJ DISSOLUTION — character sheds drifting particles upward on bright high-treble phases
    {
        float dissolve = clamp(trebleNormalized - 0.3, 0.0, 1.0);
        dissolve *= clamp(spectralCentroidNormalized - 0.5, 0.0, 1.0) * 2.0;
        if (dissolve > 0.02) {
            vec2 pp = uv * vec2(12.0, 8.0) + vec2(sin(time * 0.3) * 0.3, time * -0.8);
            vec2 pcell = floor(pp);
            vec2 pfrac = fract(pp) - 0.5;
            float ph = hash(pcell);
            float alive = step(0.82, ph);
            float pd = length(pfrac * vec2(2.5, 1.2));
            float particle = exp(-pd * pd * 25.0) * alive;
            float near_sil = smoothstep(0.0, 0.15, silhouette) * (1.0 - silhouette);
            vec3 particle_col = mix(vec3(0.9, 0.95, 1.0), vec3(1.0, 0.85, 0.6), hash(pcell + vec2(1.1, 3.3)));
            col += particle_col * particle * near_sil * dissolve * 1.2;
        }
    }
    // VJ HYPERSPACE — radial streaks rushing outward from head on mid-high energy
    {
        float hyper_on = clamp(energyNormalized - 0.3, 0.0, 1.0);
        hyper_on *= clamp(trebleNormalized - 0.2, 0.0, 1.0) * 1.8;
        if (hyper_on > 0.02) {
            vec2 hp2 = uv - P.head_c;
            float hr = length(hp2);
            float ha = atan(hp2.y, hp2.x);
            // Streak density — high angular frequency for hyperspace feel
            float streaks = 0.5 + 0.5 * sin(ha * 48.0 + hash(vec2(floor(ha * 8.0), 0.0)) * 6.28);
            streaks = pow(streaks, 6.0);
            // Animate outward: faster toward center
            float flow = fract(hr * 2.0 - time * 1.2);
            float streak_life = 1.0 - flow;
            streak_life = streak_life * streak_life;
            // Mask: fade near the silhouette and at screen edge
            float mask = smoothstep(0.18, 0.35, hr) * (1.0 - smoothstep(0.9, 1.3, hr));
            vec3 streak_col = mix(vec3(0.6, 0.7, 1.0), vec3(1.0, 0.9, 0.7), trebleNormalized);
            col += streak_col * streaks * streak_life * mask * hyper_on * 0.55;
        }
    }
    // VJ SEARCHLIGHT — rotating police-style beam, red/blue alternating on bass
    {
        float search_on = clamp(midsNormalized - 0.2, 0.0, 1.0);
        if (search_on > 0.02) {
            // Beam anchored above the frame, sweeps angle
            vec2 origin = vec2(sin(time * 0.7) * 0.5, 1.1);
            vec2 to_pix = uv - origin;
            float beam_a = atan(to_pix.y, to_pix.x);
            // Beam target angle (rotates)
            float target_a = -PI * 0.5 + sin(time * 1.1) * 0.45;
            float beam_width = 0.12;
            float beam = smoothstep(beam_width, 0.0, abs(beam_a - target_a));
            beam *= smoothstep(0.0, 0.3, length(to_pix));
            beam *= 1.0 - smoothstep(0.8, 1.3, length(to_pix));
            // Alternate red/blue every half-cycle
            float flash = step(0.0, sin(time * 2.5 + clamp(bassZScore, 0.0, 2.0) * 4.0));
            vec3 beam_col = mix(vec3(0.2, 0.4, 1.0), vec3(1.0, 0.2, 0.3), flash);
            col += beam_col * beam * search_on * 0.7;
        }
    }
    col *= 1.0 - smoothstep(0.7, 1.4, length(uv * vec2(1.0, 0.85)));

#if DEBUG_OUTLINES
    col *= 0.25;
    float body_outline = smoothstep(0.003, 0.0, abs(d_body));
    float coat_outline = smoothstep(0.003, 0.0, abs(d_coat));
    col += body_outline * vec3(0.0, 1.0, 1.0);
    col += coat_outline * vec3(1.0, 1.0, 0.0);
#endif

    // VJ FLUX HUE DRIFT — sustained spectral flux slowly rotates overall hue
    {
        float drift = clamp(spectralFluxNormalized - 0.15, 0.0, 0.7) * 0.18;
        if (drift > 0.005) {
            vec3 hsl_col = rgb2hsl(col);
            hsl_col.x = fract(hsl_col.x + drift);
            col = hsl2rgb(hsl_col);
        }
    }
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
