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
// 3.frag uses public/images/bear-face.png (same R, byte-identical to bear.png) which also carries
//   G = RELIEF: the reference photo's luminance inside the bear, p2..p98 stretched (128 outside)
//   B = FEATURES: darkness below the local mean - eyes, nose, mouth, inner ears, fur clumps
// With plain bear.png, G = B = R, so the bear loses its face but still renders.
// 4.frag is the same shader pointed at public/images/bear-model.png, a render of the PRINTED mesh.
//
// Frame-rate independence: the previous frame's iTime is stored in the bottom-left pixel
// (16 bits across r,g) so every decay and advection speed is per SECOND, not per frame.
// A 60 Hz phone and a 144 Hz monitor fade at the same speed.
//
// 3.frag: /vibej2 live scratch copy of 2.frag (2026-09-11). 2.frag is FROZEN.
// 2.frag: events come from the onset envelopes (docs/onset-detection.md) - kick punches and
// flash-charges the bear and flares the MOUTH, snare fires the wide shockwave, hats glint the
// rim and motes. Each has a z-score fallback underneath so the preset still moves when
// hypnosound < 2.1 leaves the onset uniforms at 0.
//
// PRESETS:
// Default
// https://visuals.beadfamous.com/?shader=claude/wip/bear/3&image=images/bear-face.png&wavelet=true&controller=wavelet-ease

#define PI 3.14159265
#define TAU 6.28318531
#define IMG_ASPECT (556.0 / 945.0)   // bear-face.png / bear.png
#define LAYERS 170.0
#define MOUTH vec2(0.505, 0.867)   // open mouth in mask-image uv (y up)
#define EYE_L vec2(0.446, 0.917)   // measured on the source render with a uv grid (vibej2 beat 12)
#define EYE_R vec2(0.559, 0.918)
#define BASE_SCALE 1.18            // >1 = smaller bear; bear fills 1/1.18 of the short axis

// iris discipline (vibej2 beat 4, 2026-09-11): everything CONTINUOUS is driven by the
// wavelet-ease controller's critically-damped springs (?wavelet=true&controller=wavelet-ease);
// raw z-scores stay ONLY in the event terms. Measured live: energySpring 0.07-0.96 mean 0.51,
// jitter 0.0031/frame (energyNormalized 0.0108); waveletBassSpring 0.21-0.73, jitter 0.0028
// (bassZScore 0.0283). Without the controller these read 0 and the bear rests.
uniform float energySpring;
uniform float waveletBassSpring;
uniform float waveletBand2Spring;
uniform float waveletBand5Spring;
uniform float waveletCentroidSpring;
uniform float energyLong;
uniform float melodyFlow;
uniform float spectralCrestSmooth;
uniform float spinPhase;            // monotonic, ~0.06 rad/s quiet, faster loud (rate-not-angle)
uniform float spectralRoughnessSmooth;
uniform float spectralEntropySmooth;

// ============================================================================
// AUDIO PARAMETERS
// ============================================================================

// Quiet gate: in silence everything audio settles to its resting value
#define MOTION smoothstep(0.12, 0.5, energySpring)

// EVENTS -> size / charge / rings. Onset envelopes are immediate AND smooth (one designed
// curve per hit: kick 220 ms, snare 150 ms, hat 90 ms). The max() with a z-score is the
// fallback for builds where the onset uniforms read 0.
// Fallback thresholds tuned to real music sampled 2026-09-11 (144 fps desk, tab audio):
// bassZScore peaks ~1.1, spectralFluxZScore ~0.45, trebleZScore ~0.47, energyZScore rarely > 0.1.
// vibej2 beat 9 (SHUTTER FIX): KICK and DROP used raw z-scores as CONTINUOUS drivers of whole-bear
// charge, edge width, mouth flare and afterglow - bassZScore jitters 0.028/frame and the meter sat
// at flicker 0.75. Onsets are off (user: "avoid onset for now"), so both now come from springs:
// KICK = the bass spring's top ~10% (live p90 0.648, p99 0.722), DROP = energy far above its own
// long-term average (lift p90 0.32, p99 0.49). Critically damped, so a kick still punches.
#define KICK (smoothstep(0.55, 0.72, waveletBassSpring) * MOTION)
#define KICK_HARD (onsetKick * onsetKickStrength * MOTION)          // 0 without onsets
#define SNARE (max(onsetSnare, smoothstep(0.15, 0.6, spectralFluxZScore) * 0.6) * MOTION)
#define HAT (max(onsetHat, smoothstep(0.1, 0.5, trebleZScore) * 0.7) * MOTION)
#define DROP (smoothstep(0.22, 0.45, energySpring - energyLong) * MOTION)
// energyMedian is a RAW level (~0.02 on real music), useless as a 0-1 weight; "how loud now"
#define LOUD smoothstep(0.3, 0.8, energySpring)
#define ROAR max(KICK, DROP)
// GEOMETRY from springs only (no z-score on scale - that is the shutter): the bass spring
// still punches on every kick, critically damped
#define BEAR_SCALE (BASE_SCALE - waveletBassSpring * 0.10 * MOTION - smoothstep(0.5, 0.9, energySpring) * 0.06)

// The UV beam: sweep POSITION is a constant-rate clock (never audio-driven, no rocking),
// audio drives its POWER and WIDTH. TEXTURE family (flux) + mids feed the power.
#define BEAM_RATE (0.045 + seed4 * 0.025)                      // sweeps per second (ping-pong)
#define BEAM_WIDTH (0.06 + spectralSpreadNormalized * 0.05 * MOTION)
#define BEAM_POWER (0.07 + (0.25 + spectralFluxNormalized * 0.35 + waveletBand2Spring * 0.2) * MOTION)  // per 1/60 s
#define ROAR_POWER 0.3                                          // per 1/60 s (body; the mouth gets 3x)

// Phosphor afterglow: fraction of charge left after ONE SECOND. Sustained loud music fades
// faster (stays responsive), a quiet room lingers.
#define CHARGE_KEEP_S (0.55 - LOUD * 0.25 - KICK * 0.1)

// PITCH family -> colour. Strontium aluminate green (#5df0a3 ~ oklch hue 158 deg = 2.76 rad),
// seeded per device toward yellow-green or aqua; centroid trend drifts it slowly.
// colour follows the slowest music: melodyFlow is a slew-limited circular pitch contour, so
// sin() of it is seamless across the wrap - the phosphor leans aqua/yellow-green with the melody
#define PHOS_HUE (2.85 + (seed2 - 0.5) * 0.8 + sin(melodyFlow * TAU) * 0.25)
#define UV_HUE (5.15 + seed3 * 0.35)   // blacklight violet ~ 295-315 deg

// TEXTURE family -> sparkle; treble -> rim
#define SPARKLE ((spectralCrestSmooth * 0.6 + waveletBand5Spring * 0.4) * MOTION + HAT * 1.5)
#define RIM (0.40 + waveletBand5Spring * 0.30 * MOTION + ROAR * 0.5 + HAT * 0.35)

// FEATURE-SPACE CORNERS (the-coat lineage): distinct musical situations get distinct looks.
// Each corner is a PRODUCT of smooth gates on springs, so it is 0 almost everywhere and comes
// up only in its own kind of passage. Live ranges 2026-09-11: waveletBand2Spring 0.24-0.83
// (mean 0.45), waveletCentroidSpring 0.31-0.59 (mean 0.42), energySpring 0.07-0.96.
// WARM: mids-dominant, low centroid, low-to-mid energy - a vocal / pad passage
// beat 9 retune: duty was 0.5% (max 0.29) - band2 p90 is only 0.58 and centroid p05 0.22, so
// the old 0.75 / 0.25 ends were almost never reached. Now fitted to the live distribution.
#define WARM_GATE (smoothstep(0.40, 0.60, waveletBand2Spring) * smoothstep(0.45, 0.28, waveletCentroidSpring) * smoothstep(0.60, 0.25, energySpring))
// BRIGHT: loud AND bright - the sustained drop / lead section (opposite corner to WARM)
#define BRIGHT_GATE (smoothstep(0.55, 0.85, energySpring) * smoothstep(0.40, 0.56, waveletCentroidSpring))
// ROUGH-LOUD: loud, bassy AND gritty - the subtronics-eye shake corner. The original gate was a
// hard ternary (bassN + energyN > 1.2) on raw features; here the same corner is a product of
// smoothsteps on SPRINGS, so the shake fades in and out instead of switching.
// USER 2026-09-11: "only do that in extreme cases". Three smooth conditions must ALL be near
// their ceilings: very loud+bassy, very rough, AND energy far above its own long-term average
// (a genuine peak, not a merely loud track). Live duty should be ~0 outside the biggest drops.
// beat 9 retune: the first extreme gate still opened 6.4% of a 30 s live window (energy and
// roughness correlate r=0.76 here, so the rough term added little). Thresholds now sit at the
// live p99s: bass+energy p99 1.58, roughness p99 0.94, lift p99 0.49. Target duty ~1%.
#define SHAKE_GATE (smoothstep(1.42, 1.62, waveletBassSpring + energySpring) * smoothstep(0.78, 0.95, spectralRoughnessSmooth) * smoothstep(0.38, 0.52, energySpring - energyLong))
#define SHAKE_AMP (SHAKE_GATE * 0.007 + KICK * SHAKE_GATE * 0.004)   // uv units; subtronics max was 0.01

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

// full texture: r = inverted mask, g = relief, b = features. Outside the image: no bear, flat
// relief, no features.
vec3 sampleTex(vec2 img) {
    if (img.x < 0.0 || img.x > 1.0 || img.y < 0.0 || img.y > 1.0) return vec3(1.0, 0.5, 0.0);
    return getInitialFrameColor(img).rgb;
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

// hash12: Hoskins integer-lattice-safe hash. hash21 on floor() cells drew the motes as a
// regular grid (fract(n * 253.37) is periodic on integers) - verified 1:1 on 2026-09-11.
float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
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

    // ---- CAMERA SHAKE (subtronics-eye, vibej2 beat 8): the whole charm jolts in the rough-loud
    // corner. Direction is smooth value noise at ~11 Hz, NOT a per-frame fract(sin(iTime)) hash,
    // so it is a shudder rather than white jitter. Only the GEOMETRY lookup moves: the stored
    // field and the feedback reads stay on the unshaken pixel grid, so the phosphor charge
    // trails the jolt as a short afterglow smear instead of being torn.
    vec2 shake = (vec2(vnoise(vec2(iTime * 11.0, seed * 40.0)), vnoise(vec2(seed2 * 40.0, iTime * 13.0))) * 2.0 - 1.0) * SHAKE_AMP;
    shake.x *= res.y / res.x;                        // equal distance on both axes
    vec2 uvS = uv + shake;

    float scale = BEAR_SCALE;
    vec2 img = screenToImg(uvS, scale);
    vec3 tex = sampleTex(img);
    float mask = 1.0 - tex.r;
    float relief = tex.g;
    float features = tex.b;
    float inside = smoothstep(0.15, 0.6, mask);
    float edge = getEdgeGlow(uvS, scale, mask, 0.010 + ROAR * 0.014);

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
    // LIFT (vibej2 beat 7): energy sitting above its long-term average = a build. The print's
    // layer lines sharpen with the tension (0.06 -> 0.24 contrast); the drop's flash-charge
    // then smooths them because hot phosphor (c -> 1) washes the striations out.
    float lift = smoothstep(0.06, 0.22, energySpring - energyLong);
    float layerDepth = mix(0.06 + 0.18 * lift, 0.04, clamp(prev.a, 0.0, 1.0));
    float layers = 1.0 - layerDepth * (0.5 - 0.5 * cos(img.y * LAYERS * TAU));
    float c = clamp(charge, 0.0, 1.0);
    // FACE (vibej2 beat 12, user: "more recognizably a bear"): the sculpt's own relief is the
    // shading - thicker plastic glows brighter, as real glow filament does - and the dark detail
    // (eyes, nose, mouth, ears) is engraved OUT of the glow, so it stays legible at full charge.
    // Light/shading only: no audio touches relief or features. Mottle backs off to let the fur show.
    float pL = (0.20 + c * 0.70) * (0.88 + 0.16 * mottle) * layers;
    pL *= mix(0.55, 1.2, relief);
    pL *= 1.0 - features * 0.6;
    float pC = 0.07 + 0.18 * sin(c * PI) + 0.08 * c;          // hot phosphor goes whiter
    vec3 phos = oklch2rgb(vec3(pL, pC, PHOS_HUE));
    // the UV light itself, glancing off the surface as it passes
    // the UV beam RAKES the relief: surfaces facing away from the beam's travel catch it, so the
    // face and fur form sweep across the bear as the light passes (one extra texture tap)
    float rake = clamp((relief - sampleTex(img + dir * 0.004).g) * 14.0 + 0.5, 0.0, 1.0);
    phos += oklch2rgb(vec3(0.35, 0.12, UV_HUE)) * beam * 0.18 * (0.3 + 1.4 * rake) * (0.7 + 0.3 * mottle);
    // the mouth flares hot white-green on the kick; a hard hit goes whiter than a soft one
    phos += vec3(0.85, 1.0, 0.92) * mouth * (KICK * 0.55 + KICK_HARD * 0.6);
    // ---- MOUTH LAMP (the-coat-23 :558-562, vibej2 beat 10): the mouth is lit by WHICH KIND of
    // passage is playing, not only by hits. Three near-exclusive corners, each its own colour, so
    // a pad, a drop and a noisy breakdown each look different from across the room. Emission
    // only - it is NOT fed into the stored charge, so nothing here persists or compounds.
    // beat 12: radius 0.085 -> 0.04. At 0.085 the loud-bright lamp bloomed over the whole muzzle
    // and swallowed the eyes and nose at room distance; 0.04 keeps it inside the open mouth.
    float mouthGlow = exp(-sq(length(dMouthImg) / 0.04));
    float chaos = smoothstep(0.55, 0.85, spectralEntropySmooth) * smoothstep(0.40, 0.55, waveletCentroidSpring) * MOTION;
    vec3 lamp = oklch2rgb(vec3(0.80, 0.10, 3.6)) * BRIGHT_GATE * 0.55    // cyan-white: loud and bright
              + oklch2rgb(vec3(0.62, 0.15, 1.25)) * WARM_GATE * 0.60     // amber ember: calm vocal / pad
              + oklch2rgb(vec3(0.55, 0.20, UV_HUE)) * chaos * 0.50;      // violet: bright and chaotic
    phos += min(lamp, vec3(0.6)) * mouthGlow;

    // ---- EYES (vibej2 beat 12): the strongest bear cue. A small hot core inside the engraved
    // (dark) socket plus a soft violet halo, always faintly lit so the face reads at rest, and
    // brighter on the bass spring's kick and in the loud-bright corner. Springs only, no z-scores.
    vec2 eAsp = vec2(IMG_ASPECT, 1.0);
    float dEL = length((img - EYE_L) * eAsp), dER = length((img - EYE_R) * eAsp);
    float eyeCore = exp(-sq(dEL / 0.0065)) + exp(-sq(dER / 0.0065));
    float eyeHalo = exp(-sq(dEL / 0.022)) + exp(-sq(dER / 0.022));
    float eyeDrive = 0.45 + 0.35 * KICK + 0.45 * BRIGHT_GATE;
    phos += (vec3(0.92, 1.0, 0.96) * eyeCore * 0.9 + oklch2rgb(vec3(0.55, 0.16, UV_HUE)) * eyeHalo * 0.35) * eyeDrive;

    // ---- EXTERIOR COLOUR: blacklight dark, roar rings in violet, dust motes ----
    vec3 dark = oklch2rgb(vec3(0.08 + 0.03 * fbm(uv * 3.0 + seed * 5.0), 0.02, PHOS_HUE));
    float w = clamp(wave, 0.0, 1.0);
    vec3 waveCol = oklch2rgb(vec3(w * 0.75, 0.06 + 0.18 * sin(w * PI), UV_HUE)) * smoothstep(0.0, 0.08, w);
    float beamAir = beam * 0.16 * (0.6 + 0.4 * hash12(floor(uv * res / 2.0)));
    vec3 uvAir = oklch2rgb(vec3(0.30, 0.10, UV_HUE)) * beamAir;
    // motes twinkle: a fixed set of cells, each fading in and out on its own slow phase. The
    // old field hard re-rolled at 6 Hz, which the meter read as whole-frame flicker (beat 3)
    vec2 cell = floor(uv * res / 2.0);
    float moteSeed = hash12(cell + seed3 * 17.0);
    float twinkle = 0.5 - 0.5 * cos((iTime * (0.35 + moteSeed * 0.5) + moteSeed * 9.0) * TAU);
    float mote = step(1.0 - 0.0025 * (0.3 + SPARKLE), hash12(cell * 1.7 + 3.1)) * twinkle * twinkle;
    vec3 motes = oklch2rgb(vec3(0.75, 0.10, UV_HUE + 0.3)) * mote;
    vec3 ext = dark + waveCol + uvAir + motes;

    // ---- WARM HEARTH (from the-coat-23 :661-684, vibej2 beat 5): an amber light behind the
    // charm that only comes up in the WARM corner. Elliptical falloff from the body in mask
    // space (no extra texture taps), slow 0.4 Hz breath, masked to the exterior by the composite
    vec2 eH = (img - vec2(0.5, 0.48)) / vec2(0.46, 0.52);
    float hearth = exp(-max(length(eH) - 1.0, 0.0) * 3.5) * WARM_GATE * (0.85 + 0.15 * sin(iTime * 0.4 * TAU + seed2 * TAU));
    // hearth retune: L 0.42 read as brown at room distance; amber needs L ~0.6 and more chroma
    ext += oklch2rgb(vec3(0.60 * hearth, 0.16 * hearth, 1.25)) * smoothstep(0.0, 0.05, hearth);

    // ---- GOD RAYS (the-coat-23 :564-577, vibej2 beat 6): a lobed fan out of the MOUTH in the
    // BRIGHT corner, biased upward into the dark above the head, spinning on the controller's
    // monotonic spinPhase (audio sets the RATE, never the angle), brighter on a drop. Colour
    // slides from phosphor toward cyan as the centroid rises. Exterior only via the composite.
    float rA = atan(dImg.y, dImg.x);
    float rays = pow(abs(cos(rA * 6.0 + spinPhase * 4.0)), 14.0) * exp(-dM * 3.0)
               * smoothstep(-1.0, 0.3, dImg.y / max(dM, 1e-4)) * smoothstep(0.05, 0.15, dM);
    float raysAmp = BRIGHT_GATE * (0.35 + 0.65 * DROP);
    ext += oklch2rgb(vec3(0.70, 0.14, mix(PHOS_HUE, 3.6, waveletCentroidSpring))) * rays * raysAmp;

    // ---- RIM: the silhouette glows phosphor-green just outside the bear ----
    vec3 rimCol = oklch2rgb(vec3(0.72, 0.19, PHOS_HUE));
    vec3 rim = rimCol * edge * RIM * (0.55 + 0.45 * waveletBassSpring * MOTION);
    // hat ticks: brief white glints on the rim, 90 ms envelope so they read as ticks not a wash
    rim += vec3(0.9, 1.0, 0.95) * edge * HAT * 0.25;

    // ---- COMPOSITE ----
    // RIM MOAT FIX (vibej2 beat 11): rim * (1 - inside) faded the rim out across the same soft
    // mask transition where the phosphor was only half mixed in, leaving a 1-2 px BLACK hairline
    // between body and glow (seen 1:1, and doubled into an outline under camera shake). The rim now
    // holds full strength until the pixel is more than half inside.
    vec3 col = mix(ext, phos, inside) + rim * (1.0 - smoothstep(0.5, 1.0, inside));
    // no global beat multiplier: brightness never lives in the global multiplier (strobe
    // channel); `beat` fires on hats at ~280 BPM and read as flicker (vibej2 beat 2, 2026-09-11)
    // ?knob_199=1 paints the stored field (alpha) so persistence can be verified in a still
    if (knob_199 > 0.5) col = vec3(prev.a, field, 0.25 + inside * 0.5);   // K199 DEBUG FIELD

    // guard rails: no white-out, no NaN
    vec3 lch = rgb2oklch(max(col, vec3(0.001)));
    lch.x = clamp(lch.x, 0.0, 0.88);
    lch.y = min(lch.y, 0.30);
    col = oklch2rgb(lch);
    // GAMUT GUARD (vibej2 beat 13): hot phosphor at L 0.88 with chroma 0.30 is outside sRGB, so the
    // green channel clamped at 1.0 - the monitor measured 0.26% of pixels with a channel > 0.98.
    // Pull CHROMA down (hue and lightness kept) until every channel fits. No-op for in-gamut pixels.
    for (int gi = 0; gi < 4; gi++) {
        if (max(col.r, max(col.g, col.b)) <= 0.97) break;
        lch.y *= 0.75;
        col = oklch2rgb(lch);
    }

    fragColor = vec4(clamp(col, 0.0, 1.0), clamp(field, 0.0, 1.0));
}
