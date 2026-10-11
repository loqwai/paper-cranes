// @fullscreen: true
// @mobile: true
// @tags: space, starfield, ship, kids, imagination, knobs
// STARSHIP — imagination-game space flight. The knobs ARE the ship's controls.
//
// ============================ SHIP CONTROL PANEL ============================
//   knob_1 = WARP SPEED    (push it up — the stars streak past!)
//   knob_2 = STEER <-->    (0.5 = straight ahead; ship banks when you turn)
//   knob_3 = STEER UP/DOWN (0.5 = level flight)
//   knob_4 = HYPERDRIVE    (rainbow tunnel — use with warp for full jump)
//   knob_5 = SHIELDS       (blue energy bubble around the ship)
//   knob_6 = NEBULA        (space clouds ahead)
//   knob_7 = ENGINE COLOR  (what color the drive burns)
//   knob_8 = TRACTOR BEAM  (green capture beam below the ship)
//   knob_9 = RADAR PING    (scanning rings sweep out from the ship)
//   knob_10 = AFTERBURNERS (orange booster flames + extra rumble)
//   knob_11 = GALAXY RIBBON (aurora river across deep space)
//   knob_12 = SEARCHLIGHT  (sweeping beam from the ship's nose)
//   knob_14 = ASTEROID FIELD (tumbling space rocks drift past)
//   knob_15 = WORMHOLE     (a swirling portal opens off to starboard)
//   knob_16 = COMET STORM  (comets streak past the windshield)
//   SCENERY: gas giant ~70s; space whale ~130s; an ALIEN BEACON blinks faster when the pilot's mind lights up
//
//   MIND LINK (Muse EEG bridge drives these — see public/muse-bridge.html):
//   knob_17 = MIND GLOW  (arousal → psychic veil over the sky)
//   knob_18 = MIND SPIN  (AF7 → slow roll of the whole starfield)
//   knob_19 = MIND COLOR (frontal asymmetry → veil hue)
//   knob_20 = MIND GAZE X, knob_21 = MIND GAZE Y (gentle drift of the flight path)
//   knob_22 = DREAM MIST (AF8 → summons nebula even with knob_6 down)
// ============================================================================

#define WARP        (knob_1)
#define STEER_X     ((knob_2 - 0.5) * 1.1)
#define STEER_Y     ((knob_3 - 0.5) * 0.7)
#define HYPER       (knob_4)
#define SHIELDS     (knob_5)
#define NEBULA      (knob_6)
#define ENGINE_HUE  (knob_7)
#define TRACTOR     (knob_8)
#define RADAR       (knob_9)
#define BOOSTERS    (knob_10)
#define GALAXY      (knob_11)
#define SEARCHLIGHT (knob_12)
#define ASTEROIDS   (knob_14)
#define WORMHOLE    (knob_15)
#define COMETS      (knob_16)
#define MIND_GLOW   (knob_17)
#define MIND_SPIN   ((knob_18 - 0.5) * 0.6)
#define MIND_HUE    (knob_19)
#define MIND_GAZE_X ((knob_20 - 0.5) * 0.3)
#define MIND_GAZE_Y ((knob_21 - 0.5) * 0.2)
#define MIND_MIST   (knob_22)

// audio = the ship's engine responding to the room
#define RUMBLE      (clamp(bassZScore, 0.0, 1.0))
#define SPARKLE     (clamp(trebleZScore, 0.0, 1.0))

#define SS_TAU 6.28318530718

mat2 ssRot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float ssHash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float ssNoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = ssHash21(i);
    float b = ssHash21(i + vec2(1.0, 0.0));
    float c = ssHash21(i + vec2(0.0, 1.0));
    float d = ssHash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float ssFbm(vec2 p){
    float v = 0.0, amp = 0.5;
    for (int i = 0; i < 4; i++){
        v += amp * ssNoise(p);
        p *= 2.03;
        amp *= 0.5;
    }
    return v;
}

vec3 ssStarLayer(vec2 uv, float layerSeed, float t){
    vec3 col = vec3(0.0);
    vec2 gv = fract(uv) - 0.5;
    vec2 id = floor(uv);
    float h = ssHash21(id + layerSeed);
    if (h < 0.70) return col;
    vec2 sp = (vec2(ssHash21(id + layerSeed + 1.0), ssHash21(id + layerSeed + 2.0)) - 0.5) * 0.8;
    float d = length(gv - sp);
    float tw = 0.75 + 0.25 * sin(t * (2.0 + h * 5.0) + h * 40.0);
    tw += SPARKLE * 0.4 * sin(t * 14.0 + h * 90.0);
    float star = smoothstep(0.13, 0.0, d) * tw * 2.2;
    star += smoothstep(0.35, 0.0, d) * 0.25; // soft halo
    float hue = fract(0.55 + (h - 0.70) * 2.0 + ENGINE_HUE * 0.3);
    vec3 tint = hsl2rgb(vec3(hue, 0.5, 0.85));
    return star * tint * ((h - 0.70) / 0.30);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec2 screenUv = fragCoord / iResolution.xy;
    float t = iTime;

    // steering moves the vanishing point; ship banks into the turn
    vec2 center = vec2(STEER_X + MIND_GAZE_X, STEER_Y + MIND_GAZE_Y);
    vec2 p = uv - center;
    p *= ssRot(-STEER_X * 0.4 + MIND_SPIN);

    // engine rumble + afterburners shake the hull
    p += (RUMBLE * 0.004 + BOOSTERS * 0.0025) * vec2(sin(t * 37.0), cos(t * 29.0));

    // warp compresses the view forward (FOV zoom — continuous, never pops)
    p /= (1.0 + WARP * 0.55 + HYPER * 0.3);

    // --- nebula clouds ---
    float neb = ssFbm(p * 2.2 + vec2(t * 0.012, 3.7));
    float neb2 = ssFbm(p * 3.1 - vec2(t * 0.008, 9.2));
    float nebHue = fract(ENGINE_HUE + neb2 * 0.45 + 0.55);
    vec3 nebCol = hsl2rgb(vec3(nebHue, 0.75, 0.38)) * smoothstep(0.40, 0.95, neb) * (NEBULA * 0.7 + MIND_MIST * 0.35);

    // --- mind link: psychic veil across the sky (Muse EEG, knobs 17..22) ---
    float veil = ssFbm(p * 1.6 + vec2(t * 0.02, -t * 0.015));
    vec3 veilCol = hsl2rgb(vec3(fract(MIND_HUE + veil * 0.25), 0.8, 0.5)) * smoothstep(0.35, 0.9, veil) * MIND_GLOW * 0.45;

    // --- galaxy ribbon: an aurora river winding through deep space ---
    float ribY = p.y - 0.15 * sin(p.x * 2.5 + t * 0.05) - 0.10 * sin(p.x * 1.3 - t * 0.03);
    float rib = smoothstep(0.20, 0.0, abs(ribY - 0.12));
    float ribGlow = smoothstep(0.45, 0.0, abs(ribY - 0.12)) * 0.3;
    vec3 ribCol = hsl2rgb(vec3(fract(p.x * 0.15 + t * 0.01 + ENGINE_HUE), 0.75, 0.45)) * (rib + ribGlow) * GALAXY * 0.4;

    // --- comet storm: icy visitors streaking across the windshield ---
    vec3 cometCol = vec3(0.0);
    for (float ci = 0.0; ci < 3.0; ci++){
        float cph = fract(t * 0.13 + ci * 0.37);
        vec2 cs = vec2(-0.9 - ci * 0.2, 0.5 - ci * 0.35);
        vec2 cd = normalize(vec2(1.0, -0.35 + ci * 0.2));
        vec2 cp = cs + cd * cph * 2.2;
        vec2 rel = p - cp;
        float along = dot(rel, cd);
        float perp = abs(dot(rel, vec2(-cd.y, cd.x)));
        float head = smoothstep(0.035, 0.0, length(rel));
        float tail = smoothstep(0.02, 0.0, perp) * smoothstep(-0.35, 0.0, along) * (1.0 - step(0.0, along)) * 0.5;
        float vis = smoothstep(0.0, 0.1, cph) * smoothstep(1.0, 0.9, cph);
        cometCol += (head * vec3(0.9, 0.95, 1.0) + tail * vec3(0.5, 0.7, 1.0)) * vis;
    }

    // --- ringed gas giant: drifts by every ~70 seconds ---
    float orbT = fract(t / 70.0);
    float orbVis = smoothstep(0.0, 0.05, orbT) * smoothstep(1.0, 0.95, orbT);
    vec2 pp = p - vec2(mix(1.5, -1.5, orbT), 0.26 + 0.08 * sin(orbT * SS_TAU));
    float pRad = 0.20 * (1.0 + RUMBLE * 0.04);
    float pd = length(pp);
    float planetMask = smoothstep(pRad, pRad - 0.015, pd) * orbVis;
    float bands = ssFbm(vec2(pp.y * 10.0 + 5.0, pp.x * 2.5));
    float shade = clamp(0.55 - pp.x / max(pRad, 0.001) * 0.30, 0.2, 1.0);
    float planetHue = fract(0.06 + ENGINE_HUE * 0.15 + bands * 0.06);
    vec3 planetCol = hsl2rgb(vec3(planetHue, 0.6, 0.38 + bands * 0.20)) * shade * planetMask;
    vec2 rv = vec2(pp.x, pp.y * 3.4);
    float ringR = length(rv);
    float ringsMask = smoothstep(0.26, 0.29, ringR) * smoothstep(0.44, 0.41, ringR);
    ringsMask *= 0.6 + 0.4 * sin(ringR * 80.0);
    float ringVis = max(step(pRad, pd), step(0.0, -pp.y));
    vec3 ringCol = hsl2rgb(vec3(fract(planetHue + 0.06), 0.45, 0.62)) * ringsMask * ringVis * orbVis * 0.45;
    vec3 glowCol = hsl2rgb(vec3(planetHue, 0.7, 0.5)) * smoothstep(pRad * 2.0, pRad, pd) * orbVis * 0.10;

    // --- space whale: a gentle giant sings past every ~130 seconds ---
    float whaleT = fract(t / 130.0);
    float whaleVis = smoothstep(0.0, 0.04, whaleT) * smoothstep(1.0, 0.96, whaleT);
    vec2 q = p - vec2(mix(-1.3, 1.3, whaleT), 0.30 + 0.06 * sin(whaleT * SS_TAU * 2.0));
    q.y += 0.025 * sin(q.x * 9.0 - t * 2.5);
    float wBody = length(vec2(q.x, q.y * 2.6)) - 0.14;
    vec2 qf = q - vec2(-0.17, 0.0);
    float wFluke = min(
        length(vec2(qf.x * 1.8, qf.y * 1.1 - qf.x * 1.2)) - 0.045,
        length(vec2(qf.x * 1.8, qf.y * 1.1 + qf.x * 1.2)) - 0.045);
    float wFin = length((q - vec2(0.02, -0.05)) * vec2(2.5, 1.6)) - 0.05;
    float wsd = min(wBody, min(wFluke, wFin));
    float wCore = smoothstep(0.015, -0.01, wsd);
    float wGlow = smoothstep(0.12, 0.0, wsd) * 0.45;
    float shimmer = 0.5 + SPARKLE * 0.25 * sin(t * 9.0 + q.x * 22.0);
    vec3 whaleCol = hsl2rgb(vec3(0.53, 0.75, shimmer)) * (wCore * 0.8 + wGlow) * whaleVis;
    vec2 sq = q - vec2(0.16, 0.02);
    float songT = fract(t * 0.25);
    float song = smoothstep(0.015, 0.0, abs(length(sq) - songT * 0.35)) * (1.0 - songT);
    whaleCol += hsl2rgb(vec3(0.60, 0.8, 0.6)) * song * whaleVis * 0.5;

    // --- asteroid field: tumbling rocks with sunlit rims ---
    vec3 astCol = vec3(0.0);
    for (float ai = 0.0; ai < 4.0; ai++){
        float aph = fract(t * 0.05 + ai * 0.26);
        vec2 apos = vec2(mix(1.2, -1.2, aph), sin(ai * 2.4 + aph * 6.0) * 0.35 - 0.05);
        vec2 av = p - apos;
        av *= ssRot(t * (0.3 + ai * 0.1));
        float asz = 0.035 + 0.02 * ssHash21(vec2(ai, 7.0));
        float ad = length(av * vec2(1.0, 1.2)) - asz * (0.8 + 0.3 * ssNoise(av * 30.0 + vec2(ai)));
        float rock = smoothstep(0.008, -0.004, ad);
        float rim = smoothstep(0.015, 0.0, abs(ad)) * 0.6;
        float avis = smoothstep(0.0, 0.08, aph) * smoothstep(1.0, 0.92, aph);
        astCol += (vec3(0.35, 0.30, 0.26) * rock + vec3(0.9, 0.75, 0.55) * rim) * avis;
    }

    // --- wormhole: a swirling portal off to starboard ---
    vec2 wp = p - vec2(0.45, -0.10);
    float wr = length(wp);
    float wa = atan(wp.y, wp.x);
    float spiral = sin(wa * 3.0 + wr * 25.0 - t * 2.0);
    float portal = smoothstep(0.28, 0.05, wr) * (0.5 + 0.5 * spiral);
    vec3 wormCol = hsl2rgb(vec3(fract(0.75 + wr * 0.5 - t * 0.02), 0.85, 0.5)) * portal * WORMHOLE * 0.8;
    wormCol += hsl2rgb(vec3(0.8, 0.6, 0.75)) * smoothstep(0.06, 0.0, wr) * WORMHOLE;

    // --- alien beacon: a signal star that hears the pilot's mind ---
    vec2 bcn = p - vec2(-0.55, 0.32);
    float bd = length(bcn);
    float blink = 0.55 + 0.45 * sin(t * (1.5 + MIND_GLOW * 6.0));
    float bcnCore = smoothstep(0.025, 0.0, bd) * blink;
    float bcnHalo = smoothstep(0.16 + MIND_GLOW * 0.12, 0.0, bd) * 0.30 * blink * (0.5 + MIND_GLOW);
    float bAng = atan(bcn.y, bcn.x);
    float rays = pow(abs(sin(bAng * 3.0 + t * 0.7)), 8.0) * smoothstep(0.30, 0.05, bd) * 0.35 * MIND_GLOW;
    vec3 bcnCol = hsl2rgb(vec3(fract(0.35 + MIND_HUE * 0.3), 0.9, 0.6)) * (bcnCore + bcnHalo + rays);

    // --- starfield fly-through (constant speed; warp feel comes from zoom + trails) ---
    vec3 stars = vec3(0.0);
    for (float i = 0.0; i < 1.0; i += 0.25){
        float depth = fract(i + t * 0.02);
        float scale = mix(16.0, 1.0, depth);
        float fade = depth * smoothstep(1.0, 0.85, depth);
        stars += ssStarLayer(p * scale + i * 453.2 - center * depth * 1.5, i * 97.0, t) * fade;
    }
    stars *= 1.0 + RUMBLE * 0.5 + (beat ? 0.3 : 0.0);

    vec3 col = (nebCol + veilCol + ribCol + stars) * (1.0 - planetMask) + cometCol * COMETS;
    col += planetCol + ringCol + glowCol + whaleCol + astCol * ASTEROIDS + wormCol + bcnCol;

    // --- warp trails: pull last frame toward the vanishing point ---
    vec2 screenCenter = vec2(0.5) + center * vec2(iResolution.y / iResolution.x, 1.0);
    float pull = 0.004 + WARP * 0.035 + HYPER * 0.06;
    vec2 puv = mix(screenUv, screenCenter, pull);
    vec3 prev = getLastFrameColor(puv).rgb;
    vec3 ph = rgb2hsl(prev);
    ph.x = fract(ph.x + HYPER * 0.03); // hyperdrive spins the trail colors into rainbow
    prev = hsl2rgb(ph);
    float persist = 0.80 + WARP * 0.12 + HYPER * 0.04;
    col = max(col, prev * persist);

    // --- shields: energy bubble around the ship ---
    float rr = length(uv);
    float ripple = RUMBLE * 0.035 * sin(rr * 40.0 - t * 6.0);
    float ring = smoothstep(0.10, 0.0, abs(rr - 0.62 + ripple));
    float dome = smoothstep(0.40, 0.75, rr) * 0.12;
    vec3 shieldCol = hsl2rgb(vec3(0.52, 0.9, 0.55)) * (ring * 0.8 + dome) * SHIELDS;
    shieldCol *= 0.8 + 0.2 * sin(t * 3.0 + rr * 12.0);
    col += shieldCol;

    // --- radar ping: scan rings sweeping out from the ship ---
    float pingT = fract(t * 0.45);
    float pingR = pingT * 0.85;
    float radar = smoothstep(0.035, 0.0, abs(rr - pingR)) * (1.0 - pingT);
    radar += smoothstep(0.02, 0.0, abs(rr - fract(pingT + 0.5) * 0.85)) * (1.0 - fract(pingT + 0.5)) * 0.5;
    col += hsl2rgb(vec3(0.33, 0.9, 0.6)) * radar * RADAR * 0.7;

    // --- tractor beam: green capture cone reaching down from the ship ---
    float beamY = smoothstep(0.05, -0.45, uv.y);
    float cone = smoothstep(0.06 + 0.30 * max(-uv.y, 0.0), 0.0, abs(uv.x));
    float beamPulse = 0.6 + 0.25 * sin(t * 5.0 - uv.y * 18.0);
    col += hsl2rgb(vec3(0.36, 0.9, 0.55)) * beamY * cone * beamPulse * TRACTOR * 0.8;

    // --- searchlight: sweeping beam from the ship's nose ---
    float swAng = sin(t * 0.5) * 0.6;
    vec2 sdir = normalize(vec2(sin(swAng), cos(swAng) * 0.9));
    vec2 su = uv - vec2(0.0, -0.48);
    float alongS = dot(su, sdir);
    float perpS = abs(dot(su, vec2(-sdir.y, sdir.x)));
    float beamS = smoothstep(0.04 + alongS * 0.22, 0.0, perpS) * smoothstep(1.1, 0.15, alongS) * step(0.0, alongS);
    col += vec3(1.0, 0.98, 0.85) * beamS * SEARCHLIGHT * 0.35;

    // --- afterburners: booster flames licking up from the bottom edge ---
    float burn = smoothstep(-0.24, -0.50, uv.y);
    float flick = 0.7 + 0.3 * sin(t * 22.0 + uv.x * 35.0) * sin(t * 17.0 - uv.x * 21.0);
    float burnHue = fract(0.05 + ssNoise(vec2(uv.x * 8.0, t * 3.0)) * 0.06);
    col += hsl2rgb(vec3(burnHue, 0.95, 0.5)) * burn * flick * BOOSTERS * (0.7 + RUMBLE * 0.5);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
