// @fullscreen: true
// @mobile: false
// @tags: chromadepth, handstand, wavelet, portal, mask, redaphid, 3d
//
// HANDSTAND AURORA PORTAL — a dancer mid-handstand, rendered as a being of light
// suspended in a deep nebula. Built for ChromaDepth 3D glasses:
//   RED   = near  → the figure's interior + its rim glow pop forward
//   GREEN = mid   → the figure's thin extremities (legs, hands)
//   BLUE / VIOLET = far → the churning background field recedes
//
// The dancer silhouette comes from an image mask (black figure on white).
// A multi-tap "interior fill" turns the flat stencil into a 3D-ish depth bulge:
// deep body = reddest/nearest, thin limbs fade to green, the rim flares pure red.
//
// FEATURE MAPPING — wavelet (DWT) drives motion/energy, FFT spectral drives texture.
// Tuned for a Subdocta (heavy dubstep) show. Every effect stays in its chromadepth
// depth band so the 3D read sharpens with the music instead of muddying.
//   BASS → red/near (the headline):
//     BASS POP        — drives the figure's depth t→0 = it punches OUT of the screen
//     FIGURE_BOUNCE   — kick lifts the silhouette (a hop)
//     FIGURE_WOBBLE   — wubPulse×wubDepth sways the body side-to-side (wobble bass)
//     FIGURE_SHAKE    — convulsive rotation on kicks/wub/roughness
//     bassSurge       — bass scrolls the interior plasma upward
//     BASS BLOOM      — kick-gated red core halo, dark passages only
//     DROP PUNCH      — energy surge + kick zooms the whole frame IN (figure lunges)
//   BUILD: RISER      — flux+energy rising charges a flicker into the rim → DROP PUNCH
//   MIDS:  MID WARMTH — mids-over-centroid swells a warm interior glow
//   TREBLE → green limbs / sparkle:
//     TREBLE SHIMMER  — airy passages twinkle the thin extremities
//     SCOOP HEAT      — scooped screech leads heat the rim red→red-orange
//     SCAN SWEEP      — bright treble races an electric band up the figure
//     star sparkle    — far-field stars twinkle faster/brighter with treble
//   TEXTURE/FAR-FIELD: ENTROPY FRACTURE (crystalline filaments), RIM GRIT (gnarly
//     buzz), HIGH-END SURGE (bright peaks energize the nebula), CALM RECEDE (quiet
//     tonal → violet/dim), pitchTint (note nudges the whole palette, depth order held)
//   QUIET BREATH      — in silence the figure gently breathes so it's never frozen
//   SAFETY: PEAK ROLLOFF soft-knees hot pixels on big drops (no white-out); the figure
//     coverage tracks the real silhouette with a tight fwidth edge (always reads crisp);
//     DROP-TIGHTEN vignette closes in on drops to pull focus to the figure.
//   quietGate           → mutes reactivity in silence (no flashing in quiet passages)
//
// PRESET (wavelet + handstand mask):
// https://visuals.beadfamous.com/?shader=redaphid/handstand/1&wavelet=true&controller=wavelet-ease&image=images/handstand.png&fullscreen=true

#define PI 3.14159265
#define PHI 1.61803398
#define IMG_ASPECT (521.0 / 532.0)

// ============================================================================
// WAVELET + CONTROLLER UNIFORMS
// Controller outputs (wavelet-ease) and raw wavelet bands are declared here so
// the shader compiles whether or not ?wavelet / ?controller are present (the
// wrapper de-dupes auto-declared wavelet uniforms against these). Absent → 0.
// ============================================================================
uniform float waveletBassSpring;       // smooth deep-bass level (0..1)
uniform float waveletBand2Spring;      // low-mid body
uniform float waveletBand5Spring;      // treble / air
uniform float waveletCentroidSpring;   // wavelet brightness
uniform float energySpring;            // overall loudness, smoothed
uniform float quietGate;               // 1 = sound present, 0 = silence (anti-flash)
uniform float wubPulse;                // raw bass wobble throb (0.5 = center)
uniform float wubDepth;                // how hard the bass is wobbling (0..1)
uniform float tonalStrength;           // melodic (1) vs noisy (0)
uniform float melodyFlow;              // monotonic melodic phase
uniform float flowPhase;               // monotonic flow phase
uniform float morphPhase;              // monotonic morph phase
uniform float huePhase;                // monotonic hue-drift phase
uniform float waveletBassZScore;       // self-calibrating bass spike (kick), any gain
uniform float wavelet_bassHit;         // sharp kick/drop trigger
uniform float waveletBand5Normalized;  // treble band, normalized
uniform float waveletTiltNormalized;   // bass↔treble lean (0..1)

// LONG-TERM EVOLUTION (wavelet-ease, minutes-scale) — the look drifts over a whole set.
uniform float evoPhase;    // monotonic, ~1 unit / few min (energy-weighted) — slow motion morph
uniform float evoFlow;     // 0..1 slowly-wandering flow/scroll direction bias
uniform float evoWarp;     // 0..1 slowly-wandering domain-warp character
uniform float evoPlasma;   // 0..1 slowly-wandering internal plasma speed
uniform float sectionMode; // discrete visual-mode index (advances on breakdown→drop); wrap with mod
uniform float sectionMix;  // 0→1 crossfade after a mode change (~4s ease-in)
uniform float energyLong;  // minutes-long energy average (set intensity)

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (#define swap pattern — comment audio, uncomment const)
// ============================================================================

// Monotonic motion phases. Always add a small iTime term so motion survives even
// with no controller (phases would be 0) — and stays strictly forward (no rock-back).
#define FLOW   (flowPhase  + iTime * 0.06)
#define MORPH  (morphPhase + iTime * 0.04)
#define HUEDR  (huePhase   + iTime * 0.02)

// LONG-TERM EVOLUTION macros — drift the CHARACTER of motion over minutes (evo* from the
// controller wander slowly; evoPhase is a slow monotonic clock). Defaults (evo*≈0.5) reproduce
// the original look, so the shader still works with no controller.
#define EVO_FLOWDIR  (evoFlow * 6.2831853)              // slow-wandering scroll direction (radians)
#define EVO_WARPAMT  (1.0 + (evoWarp - 0.5) * 1.2)      // domain-warp scale drifts ~0.4..1.6×
#define EVO_PLASMA_SP (0.6 + evoPlasma * 1.2)           // internal plasma speed drifts 0.6..1.8×
#define EVO_DRIFT    (vec2(cos(EVO_FLOWDIR), sin(EVO_FLOWDIR)) * evoPhase * 0.15)  // slow nebula glide

// Figure PUMP — the "bounce" is a ZOOM toward you on the beat, NOT a vertical move. Bass
// shrinks the zoom multiplier → the body scales up / lunges at the viewer. CRANKED: the kick
// terms (zScore/hit = the BEAT) dominate and only floor-gate at 0.4 (not full quietGate, which
// reads shy through a mic), plus an FFT bassZScore fallback, so the figure visibly PUMPS bigger
// on every beat. Smooth swell rides under it. (1.22 base → as low as ~0.85 on a hard hit.)
#define FIGURE_ZOOM (1.22 - waveletBassSpring * 0.10 * quietGate \
                          - clamp(waveletBassZScore, 0.0, 1.0) * 0.20 * max(quietGate, 0.4) \
                          - clamp(wavelet_bassHit, 0.0, 1.0) * 0.14 * max(quietGate, 0.4) \
                          - clamp(bassZScore, 0.0, 1.0) * 0.10)
// #define FIGURE_ZOOM 1.22

// Figure BOUNCE — kept SMALL: a tiny vertical lift so the pump isn't perfectly centered, but
// the figure should NOT visibly travel up the screen (user: "bounce = zoom, not move").
#define FIGURE_BOUNCE ((waveletBassSpring * 0.02 + clamp(waveletBassZScore, 0.0, 1.0) * 0.03) * quietGate)
// #define FIGURE_BOUNCE 0.0

// Figure WOBBLE — THE dubstep signature. wubPulse (0.5=center) sways the silhouette
// side-to-side; wubDepth scales how hard it throbs. A bit of base depth so even a faint
// wub reads on a Subdocta wobble. Pure horizontal geometry → chromadepth untouched.
#define FIGURE_WOBBLE ((wubPulse - 0.5) * (0.04 + wubDepth * 0.10) * quietGate)
// #define FIGURE_WOBBLE 0.0

// Figure SHAKE — the body convulses (slight rotation) on the gnarly bits. Kick spikes
// (waveletBassZScore / wavelet_bassHit) snap a hard tilt; the wub adds a sway-rock; high
// roughness adds a fast fine tremor. ±~0.09 rad max. Pure rotation about center → chromadepth safe.
#define FIGURE_SHAKE (( (wubPulse - 0.5) * 0.12 \
                      + clamp(waveletBassZScore, 0.0, 1.0) * sin(iTime * 30.0) * 0.06 \
                      + clamp(wavelet_bassHit, 0.0, 1.0) * 0.05 \
                      + spectralRoughnessNormalized * sin(iTime * 47.0) * 0.03 ) * quietGate)
// #define FIGURE_SHAKE 0.0

// Rim flare — pure-red edge that pops forward on the kick.
#define RIM_WIDTH (0.010 + clamp(waveletBassZScore, 0.0, 1.0) * 0.012 * quietGate + clamp(wavelet_bassHit, 0.0, 1.0) * 0.010)
#define RIM_GAIN  (0.55 + waveletBassSpring * 0.6 * quietGate + clamp(wavelet_bassHit, 0.0, 1.0) * 0.5)

// Internal plasma inside the figure.
#define PLASMA_WOB ((wubPulse - 0.5) * 0.5 * quietGate)

// Far-field character. DARK is the whole point for chromadepth: a bright background reads as
// "present" and kills the pop. Kept dim (base 0.05, gentle audio lift) so the field RECEDES.
#define FIELD_BRIGHT (0.05 + waveletCentroidSpring * 0.08 * quietGate + waveletBand5Spring * 0.06 * quietGate)
#define FIELD_TURB   (0.5 + spectralEntropyNormalized * 1.2 + spectralRoughnessNormalized * 0.6)
#define VIOLET_SHIFT (waveletBand5Spring * 0.10 * quietGate)  // treble pushes background toward violet (further)

// Feedback trail strength (background smear).
#define FB_BLEND (0.12)

// ============================================================================
// CHROMADEPTH COLOR — t: 0 = red (near) … 0.75 = violet (far). seed2 per-device tint.
// ============================================================================
vec3 chromadepth(float t, float sat, float lit) {
    t = clamp(t, 0.0, 1.0);
    // pitch tint — the note nudges the WHOLE palette (±0.035, still well under one depth
    // band of the 0.75 gradient) so the melody reads in the color while red=near/violet=far
    // holds. Widened from ±0.02 — pitch is expressive on this set, give it more room.
    float pitchTint = (pitchClassNormalized - 0.5) * 0.07 * quietGate;
    float hue = fract(t * 0.75 + seed2 * 0.06 + pitchTint);
    sat = clamp(sat, 0.0, 1.0);
    lit = clamp(lit, 0.03, 0.62);
    return hsl2rgb(vec3(hue, sat, lit));
}

// ============================================================================
// FIGURE MASK — aspect-corrected sample of the handstand stencil.
// Black figure (r≈0) → 1.0 inside, white background (r≈1) → 0.0 outside.
// ============================================================================
float sampleMask(vec2 uv) {
    float screenAspect = iResolution.x / iResolution.y;
    vec2 c = (uv - 0.5) * FIGURE_ZOOM;
    if (screenAspect > IMG_ASPECT) c.x *= screenAspect / IMG_ASPECT;
    else c.y *= IMG_ASPECT / screenAspect;
    // shake — convulsive rotation about the figure center on the gnarly bits
    float sa = FIGURE_SHAKE;
    c = mat2(cos(sa), -sin(sa), sin(sa), cos(sa)) * c;
    // bass bounce lifts the center; wub wobble sways it side-to-side (dubstep signature)
    vec2 imgUV = c + vec2(0.5 + FIGURE_WOBBLE, 0.5 - FIGURE_BOUNCE);
    if (imgUV.x < 0.0 || imgUV.x > 1.0 || imgUV.y < 0.0 || imgUV.y > 1.0) return 0.0;
    return 1.0 - getInitialFrameColor(imgUV).r;
}

// Cheap 2-octave value-noise flow for plasma + nebula filaments.
float hash21(vec2 p) {
    p = fract(p * vec2(253.37, 471.53));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}
float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1, 0));
    float c = hash21(i + vec2(0, 1)), d = hash21(i + vec2(1, 1));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float flow2(vec2 p) {
    return vnoise(p) * 0.65 + vnoise(p * 2.03 + 7.1) * 0.35;
}

// ============================================================================
// MAIN
// ============================================================================
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy;
    vec2 uv = fragCoord / res;
    float aspect = res.x / res.y;

    // ---- DROP PUNCH — the whole frame lunges IN on a drop (Subdocta payoff) ----
    // Drop = energy surging up + a bass kick. Push the entire composition toward the
    // viewer (zoom in about center) so the figure lunges forward — reinforces red=near.
    float drop = clamp(energyZScore, 0.0, 1.0) * (0.4 + clamp(waveletBassZScore, 0.0, 1.0) + clamp(wavelet_bassHit, 0.0, 1.0));
    drop = clamp(drop, 0.0, 1.0) * quietGate;
    uv = (uv - 0.5) * (1.0 - drop * 0.10) + 0.5;            // up to 10% push-in on a hard drop

    // ---- MASK + INTERIOR FILL + RIM (single 8-tap ring loop) ----
    float m = sampleMask(uv);
    float fill = 0.0;     // how "surrounded" → deep interior
    float rimOuter = 0.0; // figure presence just outside this pixel
    float rimW = RIM_WIDTH;
    for (int i = 0; i < 8; i++) {
        float a = float(i) * PI * 0.25;
        vec2 d = vec2(cos(a), sin(a));
        fill += sampleMask(uv + d * 0.035);
        rimOuter = max(rimOuter, sampleMask(uv + d * rimW));
    }
    fill /= 8.0;
    float rim = rimOuter * (1.0 - m);                 // glow lives just OUTSIDE the silhouette
    // FIGURE COVERAGE — must ALWAYS read crisply as "girl doing a handstand". Base the edge
    // on the REAL silhouette m (the stencil) with a tight ~1px anti-alias band — the blurry
    // 8-tap `fill` dilation is for interior depth ONLY, never coverage (it smeared the
    // outline). A whisper of entropy tightening keeps it sharp against a busy nebula too.
    float edgeTight = spectralEntropyNormalized * 0.06 * quietGate;
    float aa = fwidth(m) + 0.02;                        // resolution-aware anti-alias width
    float figMask = smoothstep(0.5 - aa - edgeTight, 0.5 + aa, m);

    // ---- FAR-FIELD NEBULA (chromadepth blue→violet, recedes) ----
    // EVO_DRIFT slowly glides the whole field over minutes; EVO_WARPAMT drifts how turbulent
    // the domain-warp reads — so the nebula's motion-character is never the same across a set.
    vec2 fp = (uv - 0.5) * vec2(aspect, 1.0) + EVO_DRIFT;
    // domain-warped flow, scrolled by monotonic phases + light turbulence
    vec2 warp = vec2(flow2(fp * 2.5 + FLOW * 0.3), flow2(fp * 2.5 - FLOW * 0.27 + 3.3)) - 0.5;
    float neb = flow2(fp * 3.0 * FIELD_TURB + warp * (1.4 * EVO_WARPAMT) + MORPH * 0.2);
    // ENTROPY FRACTURE — high entropy sharpens the nebula into finer, more crystalline
    // filaments (exponent 2.2 → up to ~4.0); ordered passages stay soft haze. Stays in
    // the far blue/violet band, no hue change — just texture detail riding chaos.
    float nebExp = 2.2 + spectralEntropyNormalized * 1.8 * quietGate;
    float filament = pow(neb, nebExp);
    // CALM RECEDE — in quiet, tonal passages (low energy, ordered) the nebula breathes
    // DEEPER: push further toward violet + dim slightly, so the figure reads as the
    // focal portal against a receding field. Pure depth/brightness, palette unchanged.
    float calm = (1.0 - smoothstep(0.05, 0.45, energyNormalized)) * (1.0 - spectralEntropyNormalized);
    // far depth band — pinned to DEEP VIOLET (t≈0.85-0.95), the true "far" chromadepth hue, so
    // the background sits maximally far behind the figure. Filaments barely vary it; floor 0.82.
    float fieldT = 0.95 - filament * 0.12 + VIOLET_SHIFT + calm * 0.04;
    fieldT = max(fieldT, 0.82);                                          // hard floor: deep violet, never blue-bright
    // HIGH-END SURGE — bright chaotic peaks energize the field's filaments, but GENTLY now and
    // capped, so it shimmers without washing out. The figure stays the focal point.
    float highEnd = clamp(spectralCentroidNormalized * clamp(energyNormalized, 0.0, 1.0), 0.0, 1.0) * quietGate;
    float fieldLit = FIELD_BRIGHT + filament * (0.12 + waveletBand5Spring * 0.10 * quietGate + highEnd * 0.10) - calm * 0.04;
    fieldLit = min(fieldLit, 0.26);                                      // hard cap: far field stays DARK so it recedes
    // SECTION MODE shifts the field's saturation character per section (cool-band only → no warm wash).
    float fieldSat = clamp(0.92 - tonalStrength * 0.05 + sin(sectionMode * 1.7) * 0.06 * sectionMix, 0.6, 1.0);
    vec3 background = chromadepth(fieldT, fieldSat, fieldLit);

    // sparse twinkling stars (far → violet) — treble makes them sparkle FASTER + brighter;
    // high entropy spawns MORE of them (denser glitter) even at low energy, so bright-but-
    // sparse chaotic passages shimmer where the energy-gated effects stay quiet.
    float trebAir = trebleNormalized * quietGate;
    float starfield = (spectralEntropyNormalized * 0.6 + trebAir * 0.4) * quietGate;
    vec2 sg = floor(uv * res / 3.0);
    float star = step(0.9985 - starfield * 0.0020, hash21(sg));   // entropy lowers threshold → more stars
    float twSpeed = 6.0 + trebAir * 10.0;                  // bright passages = fast twinkle
    float tw = 0.5 + 0.5 * sin(FLOW * twSpeed + hash21(sg + 1.7) * 6.28);
    background += chromadepth(0.85, 0.7, 0.6) * star * tw * (0.7 + trebAir * 0.6);

    // ---- FIGURE INTERIOR (chromadepth red→green, pops forward) ----
    // internal plasma churn: warm energy flowing through the body
    // SECTION MODE changes the interior TEXTURE per section so the figure looks genuinely
    // different across the set: the plasma scale cycles smooth→fine→coarse→… on each
    // breakdown→drop, crossfaded by sectionMix. Texture/brightness only → chromadepth intact.
    float modeScale = mix(2.4, 5.0, 0.5 + 0.5 * sin(sectionMode * 2.39959));   // per-section spatial freq
    float ipScale = mix(3.5, modeScale, sectionMix);
    vec2 ip = (uv - 0.5) * vec2(aspect, 1.0) * ipScale;
    // bass surges the internal plasma upward — warm energy pumps THROUGH the body
    // with each kick (rides the same bass that bounces the silhouette). Pure light,
    // no hue shift, so the chromadepth red→green interior read stays intact.
    float bassSurge = (waveletBassSpring * 0.8 + clamp(waveletBassZScore, 0.0, 1.0) * 0.6) * quietGate;
    // EVO_PLASMA_SP slowly drifts the internal flow speed over minutes (idle churn evolves).
    float plasma = flow2(ip + vec2(MORPH * 0.5, (FLOW * 0.4 + bassSurge) * EVO_PLASMA_SP) + PLASMA_WOB);
    plasma = mix(plasma, flow2(ip * 1.9 - melodyFlow * 0.6 * EVO_PLASMA_SP), 0.4);

    // deep interior (fill→1) = reddest/nearest; thin limbs (fill low) → green. Widened the
    // range (0.40→0.0) and steepened so the dense CORE reads pure red (nearest) while only the
    // thin extremities go green — more chromadepth depth across the body, redder core = pops more.
    float figT = mix(0.40, 0.0, smoothstep(0.10, 0.85, fill));
    // BASS POP — the whole figure LUNGES toward RED (chromadepth near) on bass, so through
    // 3D glasses the dancer punches out of the screen. Strong smooth swell + hard kick snap
    // + bass-hit slam, all driving t toward 0 (reddest = nearest). Clamped so it pins at red.
    float bassPop = (waveletBassSpring * 0.18
                   + clamp(waveletBassZScore, 0.0, 1.0) * 0.22
                   + clamp(wavelet_bassHit, 0.0, 1.0) * 0.16) * quietGate;
    figT -= bassPop;                                        // toward red → pops forward
    figT += (plasma - 0.5) * 0.10;                          // plasma ripples local depth
    figT = max(figT, 0.0);                                  // can't go past pure red
    float figSat = 0.92;
    // MID WARMTH — when mids dominate over brightness (warm, bodied passage, not screechy)
    // the whole interior swells with a soft inner glow. Fills the mid feature-gap; pure
    // lightness on the figure's red→green band → chromadepth read holds.
    float warmth = clamp(midsNormalized - spectralCentroidNormalized, 0.0, 1.0) * quietGate;
    // QUIET BREATH — in breakdowns/silence (quietGate low) the figure isn't frozen: a slow
    // time-driven swell makes it gently "breathe" so the dancer stays alive between sections.
    // Gated by (1-quietGate) so it fades out the moment the music kicks back in. Slow → no flash.
    float breath = (0.5 + 0.5 * sin(iTime * 0.8)) * (1.0 - quietGate) * 0.08;
    float figLit = 0.32 + plasma * 0.22 + waveletBand2Spring * 0.10 * quietGate
                 + smoothstep(0.6, 1.0, fill) * 0.06        // dense core glows a bit hotter
                 + warmth * 0.14                             // mid-dominant warm body swell
                 + breath;                                   // slow alive-breath in quiet passages
    vec3 figure = chromadepth(figT, figSat, figLit);

    // ---- TREBLE SHIMMER on the green extremities ----
    // Airy/bright passages (treble + roughness) make the thin limbs (low fill = the
    // green mid-depth band) twinkle with fine high-freq sparkle. Brightness-only,
    // confined to the figure's extremities → green=mid chromadepth read deepens.
    float airy = clamp(trebleNormalized * 0.7 + spectralRoughnessNormalized * 0.5, 0.0, 1.0) * quietGate;
    float limb = figMask * (1.0 - smoothstep(0.15, 0.55, fill));   // thin extremities only
    float spark = flow2(ip * 6.0 + vec2(FLOW * 2.0, -melodyFlow));
    spark = pow(spark, 3.0) * (0.5 + 0.5 * sin(FLOW * 9.0 + uv.x * 24.0));
    figLit += limb * airy * spark * 0.25;
    // SCAN SWEEP — bright treble passages race a thin electric band UP through the figure,
    // like the body's energy is being scanned. Confined to figMask, brightness-only on the
    // existing figT depth → chromadepth read untouched. Faster sweep when treble is hotter.
    float scanBright = clamp(trebleNormalized * smoothstep(0.4, 0.8, spectralCentroidNormalized), 0.0, 1.0) * quietGate;
    float scanY = fract(uv.y * 1.5 - iTime * (0.6 + scanBright * 1.2));
    float scanBand = smoothstep(0.96, 1.0, scanY) * scanBright;
    figLit += figMask * scanBand * 0.3;
    figure = chromadepth(figT, figSat, figLit);

    // ---- COMPOSITE figure over field ----
    vec3 col = mix(background, figure, figMask);

    // ---- RIM GLOW — pure red, maximum chromadepth pop ----
    // SCOOP HEAT — on screechy dubstep leads (high treble + scooped/hollow mids) the rim
    // runs HOTTER: t nudges 0→0.06 (red → red-orange, still firmly in the near band) and
    // gain spikes, so gnarly high-end gives the edge a sharper bite. Stays red=near.
    float scoop = clamp(trebleNormalized * (1.0 - midsNormalized), 0.0, 1.0) * quietGate;
    float rimPulse = 0.6 + 0.4 * sin(FLOW * 3.0 + uv.y * 6.0);
    vec3 rimCol = chromadepth(scoop * 0.06, 0.96, 0.5);     // t≈0 → reddest, heats to red-orange
    // RISER — build-up tension. flux + energy rising together (the climb before a drop)
    // pumps a fast-flickering charge into the rim, so the figure visibly "charges up"
    // before the DROP PUNCH releases it. Near-band red flicker → chromadepth safe.
    float riser = clamp(spectralFluxZScore * 0.6 + clamp(energyZScore, 0.0, 1.0) * 0.6, 0.0, 1.0) * quietGate;
    float riserFlick = 0.5 + 0.5 * sin(iTime * (24.0 + riser * 40.0));   // flicker speeds up as it builds
    col += rimCol * rim * riser * riserFlick * 0.9;

    // RIM GRIT — the outline BREAKS APART into jagged, buzzing fragments. Cranked for
    // mobile: bigger ~5px cells (read on a phone), fires on roughness OR entropy (not
    // both), ~60% of cells lit, strong gain. Brightness-only on the red rim (no channel
    // split → chromadepth order stays clean). This is the headline "fuzzing" of the edge.
    // gated by energy too: the edge frays HARD when the track drives, stays clean on mellow
    // grooves — so the prominent mobile fuzz reads on the gnarly bits without a permanently
    // dirty outline during calm sections.
    float gritEnergy = smoothstep(0.30, 0.70, energyNormalized);
    // gate LEADS with entropy (the gnarliness signal) so ordered/warm passages keep a clean
    // edge; roughness only adds on top. Was max(roughness,entropy) which let loud-but-ordered
    // moments speckle. Genuinely gnarly (high-entropy) bits still fray hard on mobile.
    float gritGnarl = clamp(spectralEntropyNormalized * 1.7 + spectralRoughnessNormalized * 0.5, 0.0, 1.0);
    gritGnarl *= smoothstep(0.35, 0.65, spectralEntropyNormalized);   // hard floor: ordered = no grit
    float grit = gritGnarl * quietGate * gritEnergy;
    float gritN = hash21(floor(uv * res / 5.0) + floor(iTime * 38.0));   // chunkier, phone-visible buzz
    col += rimCol * rim * grit * step(0.4, gritN) * 1.6;
    // also CHEW the silhouette edge itself — knock jagged dark bites out near the outline so
    // the edge visibly frays (not just glowing dots outside it). Scaled by grit, edge-only.
    col *= 1.0 - rim * grit * step(0.62, hash21(floor(uv * res / 5.0) + floor(iTime * 31.0) + 9.0)) * 0.55;

    // ---- BASS BLOOM — kick-gated red halo from the core, only in DARK passages ----
    // High bass + low centroid (the skill's classic pairing): a near-field (red) radial
    // glow blooms out of the figure on each kick, then it's gone. Reinforces red=near.
    float kick = clamp(waveletBassZScore, 0.0, 1.0) * quietGate;
    float darkness = 1.0 - smoothstep(0.10, 0.40, spectralCentroidNormalized);
    float bloomR = length((uv - 0.5) * vec2(aspect, 1.0));
    float bloom = exp(-bloomR * bloomR * 9.0) * kick * darkness;
    col += chromadepth(0.0, 0.95, 0.5) * bloom * 0.45;

    // ---- FEEDBACK trail (subtle refraction, decays in HSL to avoid white-out) ----
    float lum = dot(col, vec3(0.3, 0.6, 0.1));
    vec2 refr = vec2(dFdx(lum), dFdy(lum)) * 0.006;
    vec3 prev = getLastFrameColor(uv + refr).rgb;
    vec3 prevHSL = rgb2hsl(max(prev, vec3(0.001)));
    prevHSL.z *= 0.985;                                     // always pull brightness down
    prevHSL.z = min(prevHSL.z, 0.55);
    prevHSL.x = fract(prevHSL.x + 0.0015);                 // age trails toward blue (recede)
    prev = hsl2rgb(prevHSL);
    col = mix(prev, col, 1.0 - FB_BLEND);

    // ---- BEAT — brightness pulse only (hue is reserved for depth) ----
    if (beat) {
        vec3 bHSL = rgb2hsl(max(col, vec3(0.001)));
        bHSL.z = min(bHSL.z * 1.06, 0.6);
        col = hsl2rgb(bHSL);
    }

    // ---- VIGNETTE — darken corners so the figure reads as the focal portal ----
    // DROP-TIGHTEN — on a drop the vignette closes IN (corners darken harder), pulling all
    // focus to the figure as it lunges forward with DROP PUNCH. Relaxes back between hits.
    float vigDrop = clamp(clamp(energyZScore, 0.0, 1.0) * 0.5 + clamp(waveletBassZScore, 0.0, 1.0) * 0.5, 0.0, 1.0) * quietGate;
    float vign = 1.0 - pow(length(uv - 0.5) * (1.05 + vigDrop * 0.35), 2.4);
    col *= clamp(vign, 0.05, 1.0);

    // ---- PEAK ROLLOFF — on big chaotic peaks (energyZ + entropy high) all the additive
    // effects can pile up toward white. Soft-knee the brightest channels so color + the
    // chromadepth depth read survive the drop instead of clipping to flat white. ----
    float peak = clamp(clamp(energyZScore, 0.0, 1.0) * 0.6 + spectralEntropyNormalized * 0.4, 0.0, 1.0) * quietGate;
    float mx = max(col.r, max(col.g, col.b));
    float knee = mix(1.0, 0.86, peak * smoothstep(0.7, 1.0, mx));   // only rolls off the hot pixels
    col *= knee;

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
