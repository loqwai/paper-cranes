// @fullscreen: true
// @mobile: true
// @tags: bear, phosphor, charm, glow, blacklight, goldrush
//
// PHOSPHOR BEAR - music visuals for the bear charm (3d-bear round-4 `b`, the 34 mm
// NFC keychain cut from the Goldrush totem). The charm is printed in strontium-aluminate
// glow filament and lit by blacklight, so the visual is that physics:
//   - a UV beam sweeps across the bear and CHARGES its phosphor
//   - the charge persists in the frame buffer (alpha channel) and fades like real afterglow
//   - bass kicks flash-charge the whole bear; drops make it ROAR - violet rings advect
//     outward from the head into the blacklight dark
//   - fine horizontal stripes inside are the layer lines of the print (34 mm at 0.2 mm = 170)
//
// Mask: public/images/bear.png - black bear on white, from the rembg cutout of the
// reference image that generated the mesh. mask = 1 - .r  (1 inside the bear).
//
// Frame-rate independence: the previous frame's iTime is stored in the bottom-left pixel
// (16 bits across r,g) so every decay and advection speed is per SECOND, not per frame.
// A 60 Hz phone and a 144 Hz monitor fade at the same speed.
//
// PRESETS:
// Outline
// https://visuals.beadfamous.com/?shader=bear/1&image=images/bear.png&wavelet=true&controller=bear-move
// Photo
// https://visuals.beadfamous.com/?shader=bear/1&image=images/bear-face.png&relief_amt=1&img_aspect=0.5884&wavelet=true&controller=bear-move
// 3D Model
// https://visuals.beadfamous.com/?shader=bear/1&image=images/bear-model.png&relief_amt=1&img_aspect=0.5958&wavelet=true&controller=bear-move

#define PI 3.14159265
#define TAU 6.28318531
// Three source images are supported, all sharing mask = 1 - r (verified by sampling them):
//   images/bear.png       556x945  black bear on white, NO relief   (outline)
//   images/bear-face.png  556x945  photo cutout, relief in GREEN    (the real charm)
//   images/bear-model.png 563x945  printed-mesh render, relief in GREEN (the 3d model)
// bear-model is a different width, so the aspect is overridable per preset via ?img_aspect=.
uniform float img_aspect;   // 0 = use the default below
uniform float relief_amt;   // 0 = flat silhouette, 1 = use the image's green-channel relief
#define IMG_ASPECT (img_aspect > 0.01 ? img_aspect : (556.0 / 945.0))
#define LAYERS 170.0
#define MOUTH vec2(0.505, 0.867)   // open mouth in mask-image uv (y up)
// >1 = smaller bear. Measured 2026-09-11: at 1.18 the silhouette already filled the frame
// height (top row clipped in 50% of frames), so the punch had nowhere to grow and simply
// pushed the head off-screen. Resting smaller gives the zoom somewhere to GO.
#define BASE_SCALE 1.72
#define PIVOT vec2(0.5, 0.22)      // the bear rocks about its base, not its middle

// ---- controller uniforms (controllers/bear-move.js, chain it with ?controller=bear-move) ----
// The controller holds what GLSL cannot: a damped spring and monotonic rotation accumulators.
uniform float bearPunch;   // 0..1.4 damped beat punch -> in/out scale
uniform float bearBreath;  // 0..1 continuous bass level -> always-on in/out
uniform float bearLift;    // 0..1 raw bass transient
uniform float bearSpin;    // radians, monotonic, never reverses
uniform float eyeSpin;     // radians, monotonic, faster - the rezz spiral eyes
uniform float bearTilt;    // radians, slow body sway
uniform float bearGate;    // 0..1 quiet gate
uniform float eyeOpen;     // 0..1 intensity RATCHET - spirals only in intense sections

// ============================================================================
// AUDIO PARAMETERS
// ============================================================================

// Quiet gate: in silence everything audio settles to its resting value
#define MOTION smoothstep(0.12, 0.5, energyNormalized)

// LEVEL family -> size / charge
#define KICK (clamp(bassZScore, 0.0, 1.0) * MOTION)
#define DROP (smoothstep(0.45, 0.9, energyZScore) * MOTION)
#define ROAR max(KICK, DROP)

// IN/OUT: the punch is the headline move - the bear surges toward the room on every beat.
// It is the CONTROLLER's damped spring, never a raw feature, so it swells (~90 ms) instead
// of snapping. Smaller scale = bigger bear.
#define PUNCH_DEPTH (0.55 + knob_101 * 0.35)   // K101 ZOOM PUNCH (0.55 .. 0.90)
#define BREATH_DEPTH 0.22
// punch = the EVENT (bass transient, surges on every kick). breath = the SLOW swell of overall
// energy. Two different features on two different timescales, so they never stack into one blob.
// Smaller scale = bigger bear. The floor is a hard stop so no knob can degenerate the geometry.
// Hard zoom ceiling. Measured: at scale ~1.18 the silhouette already fills the frame height,
// so anything below ~1.22 clips the ears. Strong beats now SATURATE against this instead of
// pushing the head off-screen, which reads as a punch landing rather than a framing error.
#define BEAR_SCALE_MIN 1.22
#define BEAR_SCALE max(BASE_SCALE - bearBreath * BREATH_DEPTH - bearPunch * PUNCH_DEPTH - DROP * 0.10, BEAR_SCALE_MIN)
// BEAR_SCALE_MIN above is also the bear's LARGEST possible extent. Every tap that hands state
// across the silhouette must be gated against it, never against the current scale: the alpha
// channel means CHARGE inside the bear and RING FIELD outside, and a shrinking bear drags
// charged pixels into the exterior, where they advect outward as stripes.
// (journal beat 19c - now critical, the punch is far deeper than the 0.10 it was written for.)

// BODY ROTATION: a slow sway about the base. The phase is a pure clock from the controller
// (geometry only ever EVOLVES); audio sets only its amplitude.
#define BODY_ROT (bearTilt)

// The UV beam: sweep POSITION is a constant-rate clock (never audio-driven, no rocking),
// audio drives its POWER and WIDTH. TEXTURE family (flux) + mids feed the power.
#define BEAM_RATE (0.045 + seed4 * 0.025)                      // sweeps per second (ping-pong)
#define BEAM_WIDTH (0.06 + spectralSpreadNormalized * 0.05 * MOTION)
#define BEAM_POWER (0.07 + (0.25 + spectralFluxNormalized * 0.35 + midsNormalized * 0.2) * MOTION)  // per 1/60 s
#define ROAR_POWER 0.6                                          // per 1/60 s

// Phosphor afterglow: fraction of charge left after ONE SECOND. Sustained loud music fades
// faster (stays responsive), a quiet room lingers.
#define CHARGE_KEEP_S (0.55 - energyMedian * 0.25 * MOTION - KICK * 0.1)

// PITCH family -> colour. Strontium aluminate green (#5df0a3 ~ oklch hue 158 deg = 2.76 rad),
// seeded per device toward yellow-green or aqua; centroid trend drifts it slowly.
#define PHOS_HUE (2.85 + (seed2 - 0.5) * 0.8 + spectralCentroidSlope * spectralCentroidRSquared * 0.5)
#define UV_HUE (5.15 + seed3 * 0.35)   // blacklight violet ~ 295-315 deg

// TEXTURE family -> sparkle; treble -> rim
#define SPARKLE ((spectralCrestNormalized * 0.6 + trebleNormalized * 0.4) * MOTION)
#define RIM (0.40 + trebleNormalized * 0.30 * MOTION + ROAR * 0.5)

// Exterior roar rings: px per SECOND outward from the mouth, fraction left after one second
#define WAVE_SPEED (150.0 + ROAR * 90.0)
#define WAVE_KEEP_S (0.20 - energyMedian * 0.08)

// ============================================================================
// MASK
// ============================================================================

vec2 rot2(vec2 p, float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c) * p; }

vec2 screenToImg(vec2 uv, float scale) {
    float sa = iResolution.x / iResolution.y;
    vec2 c = (uv - 0.5) * scale;
    if (sa > IMG_ASPECT) c.x *= sa / IMG_ASPECT; else c.y *= IMG_ASPECT / sa;
    c += 0.5;
    // rock about the base. Rotate in SQUARE space (x scaled by IMG_ASPECT) or the bear
    // shears instead of turning.
    vec2 p = (c - PIVOT) * vec2(IMG_ASPECT, 1.0);
    p = rot2(p, BODY_ROT);
    return p / vec2(IMG_ASPECT, 1.0) + PIVOT;
}

float sampleMask(vec2 img) {
    if (img.x < 0.0 || img.x > 1.0 || img.y < 0.0 || img.y > 1.0) return 0.0;
    return 1.0 - getInitialFrameColor(img).r;
}

float getMask(vec2 uv, float scale) { return sampleMask(screenToImg(uv, scale)); }

// Surface relief from the image's GREEN channel. bear-face/bear-model carry lambert shading
// there; the plain outline has g == 0 inside, which is why this is opt-in per preset rather
// than auto-detected - a flat silhouette would otherwise render uniformly dark.
float sampleRelief(vec2 img) {
    if (relief_amt < 0.01) return 1.0;
    if (img.x < 0.0 || img.x > 1.0 || img.y < 0.0 || img.y > 1.0) return 1.0;
    float g = getInitialFrameColor(img).g;
    return mix(1.0, 0.42 + 1.15 * g, clamp(relief_amt, 0.0, 1.0));
}

// Glow just outside the silhouette: a tight bright line plus a faint wide halo (16 taps)
float getEdgeGlow(vec2 uv, float scale, float mask, float width) {
    float tight = 0.0, wide = 0.0;
    for (int i = 0; i < 8; i++) {
        float a = float(i) * PI * 0.25;
        vec2 d = vec2(cos(a), sin(a));
        tight = max(tight, getMask(uv + d * width * 0.4, scale));
        wide = max(wide, getMask(uv + d * width, scale));
    }
    return (tight * 0.7 + wide * 0.3) * (1.0 - mask);
}

// ============================================================================
// NOISE
// ============================================================================

// pow(x, 2.0) is UNDEFINED for x < 0 in GLSL (NaN on many GPUs) - never use it for squaring
float sq(float x) { return x * x; }

float hash21(vec2 p) {
    p = fract(p * vec2(253.37, 471.53));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
               mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; }
    return v;
}

// ============================================================================
// REZZ SPIRAL EYES
// ============================================================================
// A logarithmic spiral: the phase is ARMS*angle + TIGHT*log(radius), so the arms stay
// self-similar all the way in and the centre never turns into a moire rosette.
// It spins by SUBTRACTING a monotonic accumulator (eyeSpin) from the phase - rate, not angle,
// so the spin can never jump backwards when a feature dips.
#define EYE_ARMS 5.0
#define EYE_TIGHT 7.0
// Measured off bear-face.png on a labelled uv grid (y up): the eyes sit at (0.438, 0.919)
// and (0.550, 0.919) and are only ~0.018 uv across. EYE_RAD is a goggle, deliberately a bit
// larger than the eye itself - but 0.052 was ~2x too big and sprawled across the whole brow.
#define EYE_RAD 0.030
#define EYE_L vec2(0.438, 0.919)
#define EYE_R vec2(0.550, 0.919)

// One eye. Returns 0..1 spiral coverage, already anti-aliased and masked to a disc.
float spiralEye(vec2 img, vec2 centre, float spin, float open) {
    vec2 p = (img - centre) * vec2(IMG_ASPECT, 1.0);   // square space, so the eye is round
    // the goggle GROWS as the ratchet fills, so an intense section is legible from across the
    // room rather than being a detail you have to walk up to
    float r = length(p) / (EYE_RAD * (0.70 + 0.55 * open));
    if (r > 1.25) return 0.0;
    float a = atan(p.y, p.x);
    float phase = EYE_ARMS * a + EYE_TIGHT * log(max(r, 0.04)) - spin;
    float s = sin(phase);
    // fwidth anti-aliasing: the spiral's arms get thin near the rim, and without this they
    // alias into crawling dots at a distance - the opposite of legible.
    float aa = max(fwidth(phase), 0.6);
    float line = smoothstep(-aa, aa, s);
    float disc = 1.0 - smoothstep(0.82, 1.05, r);       // soft rim
    float core = smoothstep(0.30, 0.0, r);              // solid pupil so the centre reads
    return clamp(max(line * disc, core * 0.9), 0.0, 1.0);
}

// ============================================================================
// MAIN
// ============================================================================

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;

    // ---- CLOCK PIXEL: bottom-left stores fract(iTime/4) as 16 bits -> real dt ----
    float x = fract(iTime / 4.0);
    if (fragCoord.x < 1.0 && fragCoord.y < 1.0) {
        float hi = floor(x * 255.0);
        float lo = floor(fract(x * 255.0) * 255.0);
        fragColor = vec4(hi / 255.0, lo / 255.0, 0.0, 0.0);
        return;
    }
    vec4 clk = getLastFrameColor(vec2(0.5) / res);
    float prevX = (floor(clk.r * 255.0 + 0.5) + floor(clk.g * 255.0 + 0.5) / 255.0) / 255.0;
    float dt = clamp(fract(x - prevX + 1.0) * 4.0, 1.0 / 240.0, 1.0 / 20.0);
    float k = dt * 60.0;                            // "per 1/60 s" rates -> this frame

    float scale = BEAR_SCALE;
    vec2 img = screenToImg(uv, scale);
    float mask = sampleMask(img);
    float inside = smoothstep(0.15, 0.6, mask);
    float edge = getEdgeGlow(uv, scale, mask, 0.010 + ROAR * 0.014);

    // ---- BLACKLIGHT BEAM: per-device direction, ping-pong sweep (never teleports) ----
    float ang = seed * TAU;
    vec2 dir = vec2(cos(ang), sin(ang));
    float proj = dot(img - 0.5, dir);
    float pos = (abs(fract(iTime * BEAM_RATE + seed4) * 2.0 - 1.0) - 0.5) * 1.15;
    float beam = exp(-sq((proj - pos) / BEAM_WIDTH));

    // ---- FIELD (stored in alpha): interior = phosphor charge, exterior = roar wave ----
    vec4 prev = getLastFrameColor(uv);

    // interior: charge accumulates under the beam and on kicks, decays like afterglow
    float chargeIn = min((beam * BEAM_POWER + ROAR * ROAR_POWER) * k, 1.0);
    float charge = prev.a * pow(max(CHARGE_KEEP_S, 0.01), dt) + chargeIn * (1.0 - prev.a);

    // exterior: advect outward from the mouth (distances in mask-image units, y = 1, so a
    // ring stays a circle on screen); a roar seeds a ring just outside the head, a slow
    // breath seeds a faint one in silence. Two side taps soften the radial streaking.
    vec2 dImg = (screenToImg(uv, BASE_SCALE) - MOUTH) * vec2(IMG_ASPECT, 1.0);
    float dM = length(dImg);
    vec2 outward = dImg / max(dM, 1e-4);              // unit direction, same in screen px
    vec2 perp = vec2(-outward.y, outward.x) / res;
    float stepPx = max(WAVE_SPEED * dt, 1.0);         // NEAREST sampling: never under 1 px
    vec2 srcUv = uv - outward * stepPx / res;
    float up = (getLastFrameColor(srcUv).a * 2.0 + getLastFrameColor(srcUv + perp).a + getLastFrameColor(srcUv - perp).a) * 0.25;
    float srcMask = getMask(srcUv, BEAR_SCALE_MIN);   // MOVE1 largest extent, not current scale
    float wave = up * (1.0 - smoothstep(0.0, 0.12, srcMask)) * pow(max(WAVE_KEEP_S, 0.01), dt);
    float breath = pow(0.5 + 0.5 * sin(iTime * 0.7 + seed4 * TAU), 8.0) * 0.25;
    // two rings: 0.15 pours out of the mouth through the gaps between head and arms,
    // 0.32 clears the raised arms and reads as a shockwave off the whole bear
    float ring = exp(-sq((dM - 0.15) / 0.025)) + exp(-sq((dM - 0.32) / 0.03)) * 0.8;
    float roarSrc = (ROAR * 0.95 + breath) * ring;
    wave = max(wave, roarSrc);

    float field = mix(wave, charge, inside);
    // +-0.5 LSB dither: an 8-bit feedback buffer with a slow decay otherwise stalls at the
    // value where decay*v rounds back to v (a permanent glow floor)
    field += (hash21(fragCoord + float(iFrame) * 0.37) - 0.5) / 255.0;

    // ---- INTERIOR COLOUR: phosphor, texture applied on the way OUT only ----
    float mottle = fbm(img * vec2(7.0, 11.0) + vec2(seed3 * 9.0, iTime * 0.015));
    float layers = 0.94 + 0.06 * cos(img.y * LAYERS * TAU);
    float c = clamp(charge, 0.0, 1.0);
    // relief multiplies the phosphor LIGHTNESS only - it is shading, so by the channel
    // hierarchy it belongs to light, never to geometry or to the global multiplier.
    float pL = (0.20 + c * 0.70) * (0.78 + 0.32 * mottle) * layers * sampleRelief(img);
    float pC = 0.07 + 0.18 * sin(c * PI) + 0.08 * c;          // hot phosphor goes whiter
    vec3 phos = oklch2rgb(vec3(pL, pC, PHOS_HUE));
    // the UV light itself, glancing off the surface as it passes
    phos += oklch2rgb(vec3(0.35, 0.12, UV_HUE)) * beam * 0.18 * (0.5 + 0.5 * mottle);

    // ---- EXTERIOR COLOUR: blacklight dark, roar rings in violet, dust motes ----
    // BLACKLIGHT STAGE, not a black void. Measured on the bear-face preset: mean frame
    // luminance p50 0.017 / min 0.004, against the house projector-legibility floor of 0.10
    // (journals/lattice-vj-2: judge lumMin, never the mean; a lit field is what carries across
    // a room). A broad violet pool behind the bear lifts the floor without touching the bear
    // itself, so the silhouette keeps its contrast. Deliberately still a dark room.
    vec2 stageD = (uv - vec2(0.5, 0.42)) * vec2(iResolution.x / iResolution.y, 1.0);
    float stage = exp(-dot(stageD, stageD) * 2.6);
    float floorL = 0.17 + 0.13 * stage + 0.035 * fbm(uv * 3.0 + seed * 5.0);
    vec3 dark = oklch2rgb(vec3(floorL, 0.055 + 0.035 * stage, UV_HUE));
    float w = clamp(wave, 0.0, 1.0);
    vec3 waveCol = oklch2rgb(vec3(w * 0.75, 0.06 + 0.18 * sin(w * PI), UV_HUE)) * smoothstep(0.0, 0.08, w);
    float beamAir = beam * 0.16 * (0.6 + 0.4 * hash21(floor(uv * res / 2.0)));
    vec3 uvAir = oklch2rgb(vec3(0.30, 0.10, UV_HUE)) * beamAir;
    float mote = step(1.0 - 0.0025 * (0.3 + SPARKLE), hash21(floor(uv * res / 2.0) + floor(iTime * 6.0 + seed3)));
    vec3 motes = oklch2rgb(vec3(0.75, 0.10, UV_HUE + 0.3)) * mote;
    vec3 ext = dark + waveCol + uvAir + motes;

    // ---- RIM: the silhouette glows phosphor-green just outside the bear ----
    vec3 rimCol = oklch2rgb(vec3(0.72, 0.19, PHOS_HUE));
    vec3 rim = rimCol * edge * RIM * (0.55 + 0.45 * bassNormalized * MOTION);

    // ---- COMPOSITE ----
    vec3 col = mix(ext, phos, inside) + rim * (1.0 - inside);

    // ---- REZZ EYES: hypnotic green spirals, gated by the intensity ratchet ----
    // They ride ON the bear (multiplied by `inside`), so they read as part of the sculpt
    // rather than as an overlay floating in front of it.
    if (eyeOpen > 0.01) {
        float eyes = max(spiralEye(img, EYE_L, eyeSpin, eyeOpen), spiralEye(img, EYE_R, eyeSpin, eyeOpen));
        float e = eyes * eyeOpen * inside;
        // brighter and slightly whiter-green than the body so they separate from it, but
        // still inside the phosphor family - never white, never a global multiplier.
        vec3 eyeCol = oklch2rgb(vec3(0.62 + 0.22 * eyeOpen, 0.20, PHOS_HUE + 0.10));
        col = mix(col, eyeCol, e * 0.92);
    }

    if (beat) col *= 1.06;
    // ?knob_199=1 paints the stored field (alpha) so persistence can be verified in a still
    if (knob_199 > 0.5) col = vec3(prev.a, field, 0.25 + inside * 0.5);   // K199 DEBUG FIELD

    // guard rails: no white-out, no NaN
    vec3 lch = rgb2oklch(max(col, vec3(0.001)));
    lch.x = clamp(lch.x, 0.0, 0.88);
    lch.y = min(lch.y, 0.30);
    col = oklch2rgb(lch);

    fragColor = vec4(clamp(col, 0.0, 1.0), clamp(field, 0.0, 1.0));
}
