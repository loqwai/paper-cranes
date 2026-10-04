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
// 2.frag: events come from the onset envelopes (docs/onset-detection.md) - kick punches and
// flash-charges the bear and flares the MOUTH, snare fires the wide shockwave, hats glint the
// rim and motes. Each has a z-score fallback underneath so the preset still moves when
// hypnosound < 2.1 leaves the onset uniforms at 0.
//
// PRESETS:
// Default
// https://visuals.beadfamous.com/?shader=claude/wip/bear/2&image=images/bear.png

#define PI 3.14159265
#define TAU 6.28318531
#define IMG_ASPECT (556.0 / 945.0)
#define LAYERS 170.0
#define MOUTH vec2(0.505, 0.867)   // open mouth in mask-image uv (y up)
#define BASE_SCALE 1.18            // >1 = smaller bear; bear fills 1/1.18 of the short axis

// ============================================================================
// AUDIO PARAMETERS
// ============================================================================

// Quiet gate: in silence everything audio settles to its resting value
#define MOTION smoothstep(0.12, 0.5, energyNormalized)

// EVENTS -> size / charge / rings. Onset envelopes are immediate AND smooth (one designed
// curve per hit: kick 220 ms, snare 150 ms, hat 90 ms). The max() with a z-score is the
// fallback for builds where the onset uniforms read 0.
// Fallback thresholds tuned to real music sampled 2026-09-11 (144 fps desk, tab audio):
// bassZScore peaks ~1.1, spectralFluxZScore ~0.45, trebleZScore ~0.47, energyZScore rarely > 0.1.
#define KICK (max(onsetKick, clamp(bassZScore, 0.0, 1.0) * 0.8) * MOTION)
#define KICK_HARD (onsetKick * onsetKickStrength * MOTION)          // 0 without onsets
#define SNARE (max(onsetSnare, smoothstep(0.15, 0.6, spectralFluxZScore) * 0.6) * MOTION)
#define HAT (max(onsetHat, smoothstep(0.1, 0.5, trebleZScore) * 0.7) * MOTION)
#define DROP (smoothstep(0.3, 0.8, energyZScore) * MOTION)
// energyMedian is a RAW level (~0.02 on real music), useless as a 0-1 weight; "how loud now"
#define LOUD smoothstep(0.3, 0.8, energyNormalized)
#define ROAR max(KICK, DROP)
#define BEAR_SCALE (BASE_SCALE - bassNormalized * 0.06 * MOTION - KICK * 0.10 - DROP * 0.08)

// The UV beam: sweep POSITION is a constant-rate clock (never audio-driven, no rocking),
// audio drives its POWER and WIDTH. TEXTURE family (flux) + mids feed the power.
#define BEAM_RATE (0.045 + seed4 * 0.025)                      // sweeps per second (ping-pong)
#define BEAM_WIDTH (0.06 + spectralSpreadNormalized * 0.05 * MOTION)
#define BEAM_POWER (0.07 + (0.25 + spectralFluxNormalized * 0.35 + midsNormalized * 0.2) * MOTION)  // per 1/60 s
#define ROAR_POWER 0.3                                          // per 1/60 s (body; the mouth gets 3x)

// Phosphor afterglow: fraction of charge left after ONE SECOND. Sustained loud music fades
// faster (stays responsive), a quiet room lingers.
#define CHARGE_KEEP_S (0.55 - LOUD * 0.25 - KICK * 0.1)

// PITCH family -> colour. Strontium aluminate green (#5df0a3 ~ oklch hue 158 deg = 2.76 rad),
// seeded per device toward yellow-green or aqua; centroid trend drifts it slowly.
#define PHOS_HUE (2.85 + (seed2 - 0.5) * 0.8 + spectralCentroidSlope * spectralCentroidRSquared * 0.5)
#define UV_HUE (5.15 + seed3 * 0.35)   // blacklight violet ~ 295-315 deg

// TEXTURE family -> sparkle; treble -> rim
#define SPARKLE ((spectralCrestNormalized * 0.6 + trebleNormalized * 0.4) * MOTION + HAT * 1.5)
#define RIM (0.40 + trebleNormalized * 0.30 * MOTION + ROAR * 0.5 + HAT * 0.35)

// Exterior roar rings: px per SECOND outward from the mouth, fraction left after one second
#define WAVE_SPEED (150.0 + ROAR * 90.0)
#define WAVE_KEEP_S (0.20 - LOUD * 0.08)

// ============================================================================
// MASK
// ============================================================================

vec2 screenToImg(vec2 uv, float scale) {
    float sa = iResolution.x / iResolution.y;
    vec2 c = (uv - 0.5) * scale;
    if (sa > IMG_ASPECT) c.x *= sa / IMG_ASPECT; else c.y *= IMG_ASPECT / sa;
    return c + 0.5;
}

float sampleMask(vec2 img) {
    if (img.x < 0.0 || img.x > 1.0 || img.y < 0.0 || img.y > 1.0) return 0.0;
    return 1.0 - getInitialFrameColor(img).r;
}

float getMask(vec2 uv, float scale) { return sampleMask(screenToImg(uv, scale)); }

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

    // the open mouth: a soft spot in mask-image space that takes the kick hardest, so the
    // roar is visibly where the sound comes from and its afterglow lingers there longest
    vec2 dMouthImg = (img - MOUTH) * vec2(IMG_ASPECT, 1.0);
    float mouth = exp(-sq(length(dMouthImg) / 0.055));

    // interior: charge accumulates under the beam, on kicks and at the mouth, decays like afterglow
    float chargeIn = min((beam * BEAM_POWER + ROAR * ROAR_POWER + mouth * KICK * 0.9) * k, 1.0);
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
    float srcMask = getMask(srcUv, scale);
    float wave = up * (1.0 - smoothstep(0.15, 0.6, srcMask)) * pow(max(WAVE_KEEP_S, 0.01), dt);
    float breath = pow(0.5 + 0.5 * sin(iTime * 0.7 + seed4 * TAU), 8.0) * 0.25;
    // two rings: the kick pours out of the mouth (0.15) through the gaps between head and
    // arms; the snare (or a drop) fires the wide shockwave (0.32) that clears the raised arms
    float ringMouth = exp(-sq((dM - 0.15) / 0.025));
    float ringWide = exp(-sq((dM - 0.32) / 0.03));
    float roarSrc = (ROAR * 0.95 + breath) * ringMouth + max(SNARE, DROP) * 0.85 * ringWide;
    wave = max(wave, roarSrc);

    float field = mix(wave, charge, inside);
    // +-0.5 LSB dither: an 8-bit feedback buffer with a slow decay otherwise stalls at the
    // value where decay*v rounds back to v (a permanent glow floor)
    field += (hash21(fragCoord + float(iFrame) * 0.37) - 0.5) / 255.0;

    // ---- INTERIOR COLOUR: phosphor, texture applied on the way OUT only ----
    float mottle = fbm(img * vec2(7.0, 11.0) + vec2(seed3 * 9.0, iTime * 0.015));
    float layers = 0.94 + 0.06 * cos(img.y * LAYERS * TAU);
    float c = clamp(charge, 0.0, 1.0);
    float pL = (0.20 + c * 0.70) * (0.78 + 0.32 * mottle) * layers;
    float pC = 0.07 + 0.18 * sin(c * PI) + 0.08 * c;          // hot phosphor goes whiter
    vec3 phos = oklch2rgb(vec3(pL, pC, PHOS_HUE));
    // the UV light itself, glancing off the surface as it passes
    phos += oklch2rgb(vec3(0.35, 0.12, UV_HUE)) * beam * 0.18 * (0.5 + 0.5 * mottle);
    // the mouth flares hot white-green on the kick; a hard hit goes whiter than a soft one
    phos += vec3(0.85, 1.0, 0.92) * mouth * (KICK * 0.55 + KICK_HARD * 0.6);

    // ---- EXTERIOR COLOUR: blacklight dark, roar rings in violet, dust motes ----
    vec3 dark = oklch2rgb(vec3(0.08 + 0.03 * fbm(uv * 3.0 + seed * 5.0), 0.02, PHOS_HUE));
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
    // hat ticks: brief white glints on the rim, 90 ms envelope so they read as ticks not a wash
    rim += vec3(0.9, 1.0, 0.95) * edge * HAT * 0.25;

    // ---- COMPOSITE ----
    vec3 col = mix(ext, phos, inside) + rim * (1.0 - inside);
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
