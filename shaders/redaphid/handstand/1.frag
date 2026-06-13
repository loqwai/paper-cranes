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
// AMPLITUDE CRANKED (user: "the zoom needs more amplitude with the bass"). Coefficients ~2× and
// clamp ranges widened to 1.5 so strong hits push further — the figure PUMPS much bigger on the kick.
// Base 1.22 → as low as ~0.45 on a hard slam (was ~0.85). Smooth swell rides under the punchy spikes.
#define FIGURE_ZOOM (1.22 - waveletBassSpring * 0.20 * quietGate \
                          - clamp(waveletBassZScore, 0.0, 1.5) * 0.40 * max(quietGate, 0.4) \
                          - clamp(wavelet_bassHit, 0.0, 1.5) * 0.28 * max(quietGate, 0.4) \
                          - clamp(bassZScore, 0.0, 1.5) * 0.20)
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
    // CHAOS RECEDE (iter11, extended iter14) — the busier the nebula gets, the HARDER it recedes:
    // drop the brightness cap so an active far field sinks back instead of competing with the figure.
    // iter14: extended the trigger from entropy-only to ALSO high centroid (brightness) — measured the
    // background sitting at ~25% in bright-but-not-chaotic passages (centroid 0.75), where the field's
    // PRISM/STEP glow was lifting it. Now bright OR chaotic both push it back. Cap 0.26 → 0.16 at peak.
    float chaosRecede = max(smoothstep(0.55, 0.95, spectralEntropyNormalized),
                            smoothstep(0.55, 0.85, spectralCentroidNormalized)) * quietGate;
    fieldLit = min(fieldLit, mix(0.26, 0.16, chaosRecede));              // hard cap: far field stays DARK, darker on activity
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
    // iter18: floor quietGate (mids-heavy warm passages read mic-quiet too — same quietGate under-read
    // as the solo-bass case in iter15). Caught live at mids 0.93 / centroid 0.16 / quietGate 0.00 — the
    // warm-dark corner the figure's MID WARMTH was built for but never fired because quietGate zeroed it.
    float warmth = clamp(midsNormalized - spectralCentroidNormalized, 0.0, 1.0) * max(quietGate, 0.45);
    // QUIET BREATH — in breakdowns/silence (quietGate low) the figure isn't frozen: a slow
    // time-driven swell makes it gently "breathe" so the dancer stays alive between sections.
    // Gated by (1-quietGate) so it fades out the moment the music kicks back in. Slow → no flash.
    float breath = (0.5 + 0.5 * sin(iTime * 0.8)) * (1.0 - quietGate) * 0.08;
    // MELODIC BREATH (iter12 refinement) — in breakdowns the music is often melodic (pitch swings
    // wide). Let the note gently shift the figure's DEPTH so the quiet sections feel musical, not just
    // a fixed sine: the body drifts a touch nearer/further with the melody. Pure figT (hue band) nudge,
    // tiny (±0.03), gated to quiet passages only → chromadepth-correct, no lightness/white risk.
    figT += (pitchClassNormalized - 0.5) * 0.06 * (1.0 - quietGate);
    figT = clamp(figT, 0.0, 0.45);
    float figLit = 0.32 + plasma * 0.22 + waveletBand2Spring * 0.10 * quietGate
                 + smoothstep(0.6, 1.0, fill) * 0.06        // dense core glows a bit hotter
                 + warmth * 0.14                             // mid-dominant warm body swell
                 + breath;                                   // slow alive-breath in quiet passages
    vec3 figure = chromadepth(figT, figSat, figLit);

    // ---- TREBLE SHIMMER on the green extremities ----
    // Airy/bright passages (treble + roughness) make the thin limbs (low fill = the
    // green mid-depth band) twinkle with fine high-freq sparkle. Brightness-only,
    // confined to the figure's extremities → green=mid chromadepth read deepens.
    // ENERGY-LIFT (iter13 refinement) — sustained bright high-energy passages (this corner: energy
    // 0.85, treble 0.79, bass quiet) left the figure feeling static since its big moves are bass-gated.
    // Now overall energy intensifies the limb shimmer so the extremities CRACKLE when the track is
    // driving but bass-light. Energy term added on top of the treble/roughness gate.
    float airy = clamp(trebleNormalized * 0.7 + spectralRoughnessNormalized * 0.5
                     + smoothstep(0.55, 0.9, energyNormalized) * 0.4, 0.0, 1.3) * quietGate;
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

    // ---- FUR FIBERS (ported from the-coat) — interior DEPTH strands, NOT light ----
    // The coat's headline effect: double domain-warped flow shaped into sharp ridges that
    // read as individual fur strands. CHROMADEPTH FIX (user: "the water-like effect washes out
    // the inside of the handstand — colors less vibrant, lowers the chromadepth"): the strands
    // used to ADD lightness, and raising HSL-L past ~0.5 desaturates toward white = the wash-out.
    // Now the strands carve DEPTH + SATURATION instead of brightness: each strand pulls figT
    // toward RED (nearer) and BOOSTS figSat, so the body gets vibrant near-red fiber detail that
    // DEEPENS the 3D read rather than bleaching it. Brightness barely moves (tiny dark-biased ripple).
    float fiberTrig = clamp(spectralEntropyNormalized * 0.8 + spectralRoughnessNormalized * 0.6, 0.0, 1.0) * quietGate;
    float fiberAmt = smoothstep(0.45, 0.85, fiberTrig);
    if (fiberAmt > 0.01) {
        vec2 fp = (uv - 0.5) * vec2(aspect, 1.0) * 16.0;
        float warpT = FLOW * 0.6 + spectralCentroidNormalized * 1.5;   // pitch-aware swirl rate (coat trick)
        vec2 fwarp = vec2(flow2(fp + vec2(warpT, 0.0)), flow2(fp + vec2(0.0, warpT + 3.7))) - 0.5;
        vec2 fp2 = fp + fwarp * 3.5;                                    // second domain warp = deeper swirl
        float fibers = flow2(fp2 + (vec2(flow2(fp2 + vec2(warpT * 0.7, 1.3)),
                                         flow2(fp2 + vec2(2.1, warpT * 0.5))) - 0.5) * 1.5);
        float strand = pow(abs(sin(fibers * PI * (4.0 + clamp(spectralFluxZScore, 0.0, 2.0) * 1.5))), 3.0);
        float strandM = figMask * strand * fiberAmt;
        // BULLETPROOF (user: "the water effect can still make the inside greyish — make sure this
        // can't happen"). Greyish = desaturated. So the fibers now ONLY pull toward red (depth) and
        // ONLY ADD saturation — they contribute ZERO lightness. With no lightness term and figSat that
        // can only RISE, the interior is mathematically incapable of going grey/washed from this effect.
        figT -= strandM * 0.10;                                        // toward red (nearer) → 3D pops
        figT = max(figT, 0.0);
        figSat = clamp(figSat + strandM * 0.10, figSat, 1.0);          // strictly MORE vibrant, never less
        // (no figLit term — lightness add is what greyed it; removed entirely)
    }

    // ---- SIGIL SWIRL (ported from the-coat) — iridescent body spiral ----
    // Radial spiral wave on the figure surface, hue cycling with angle + time. The coat
    // used full hue; here we keep it a SUBTLE warm-tint brightness boost so the figure's
    // red→green chromadepth read isn't overwritten — the swirl shows as a glinting spiral
    // of light, brightest on mid-dominant groove passages + harmony-ish pitch motion.
    {
        vec2 sc = (uv - vec2(0.5, 0.5)) * vec2(aspect, 1.0);
        float sr = length(sc);
        float sa = atan(sc.y, sc.x);
        float spiral = sin(sa * 5.0 + sr * 14.0 - FLOW * 1.4 + midsNormalized * 3.0);
        float swirlBand = smoothstep(0.02, 0.18, sr) * smoothstep(0.42, 0.20, sr);
        float swirl = pow(0.5 + 0.5 * spiral, 3.0) * swirlBand;
        float swirlGain = (0.3 + midsNormalized * 0.7 + clamp(bassZScore, 0.0, 1.5) * 0.4) * quietGate;
        // Same bulletproof rule as FUR FIBERS: ZERO lightness, saturation can only rise → can't grey out.
        float swirlM = figMask * swirl * swirlGain;
        figSat = clamp(figSat + swirlM * 0.08, figSat, 1.0);           // strictly more vibrant
        figT -= swirlM * 0.05;                                         // toward red (nearer)
        figT = max(figT, 0.0);
        // (no figLit term)
    }
    figLit = min(figLit, 0.62);                                        // keep within chromadepth lightness band
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
    // ---- PRISM RIM (ported from the-coat) — iridescent edge on bright/airy passages ----
    // The coat's chrome rim cycled a FULL rainbow by uv-angle + time. On chromadepth a full
    // rainbow rim is forbidden (blue rim = far = contradicts "edge pops forward"). So the hue
    // cycle is CLAMPED to the NEAR band only (t 0.0→0.14 = red→orange→yellow): the edge
    // shimmers with prismatic motion while every hue still reads as "near". Gated by the bright
    // corner (treble + centroid) so it appears on airy/screechy passages like the coat intended.
    float prismGate = clamp(trebleNormalized * smoothstep(0.45, 0.80, spectralCentroidNormalized), 0.0, 1.0) * quietGate;
    float prismAngle = atan(uv.y - 0.5, (uv.x - 0.5) * aspect);       // edge position around the figure
    float prismT = fract(prismAngle / 6.2831853 + FLOW * 0.4 + pitchClassNormalized * 0.2) * 0.14;  // cycle, NEAR band only
    rimCol = mix(rimCol, chromadepth(prismT, 0.98, 0.52), prismGate);
    // RISER — build-up tension. flux + energy rising together (the climb before a drop)
    // pumps a fast-flickering charge into the rim, so the figure visibly "charges up"
    // before the DROP PUNCH releases it. Near-band red flicker → chromadepth safe.
    float riser = clamp(spectralFluxZScore * 0.6 + clamp(energyZScore, 0.0, 1.0) * 0.6, 0.0, 1.0) * quietGate;
    float riserFlick = 0.5 + 0.5 * sin(iTime * (24.0 + riser * 40.0));   // flicker speeds up as it builds
    col += rimCol * rim * riser * riserFlick * 0.9;

    // RIM GRIT — the outline frays into ORGANIC, blobby fragments (not a hard pixel lattice).
    // Driven by GNARLINESS alone (entropy+roughness) so it isn't strangled by quietGate; entropy
    // is ~0 in true silence so it's its own quiet guard. The texture comes from smooth value-
    // noise (flow2) with SOFT thresholds → irregular chunky blobs that crawl, not 1px dots.
    // GATE RAISED (user: "grit outline should happen less frequently") — now needs genuinely
    // gnarly passages: high entropy AND high roughness both required, threshold pushed up so it
    // fires only on the truly chaotic moments instead of most of the track.
    float grit = clamp(spectralEntropyNormalized * 1.3 + spectralRoughnessNormalized * 0.7, 0.0, 1.0)
               * smoothstep(0.55, 0.80, spectralEntropyNormalized)
               * smoothstep(0.40, 0.70, spectralRoughnessNormalized);
    // organic noise field: low spatial freq (~big blobs) scrolling/boiling over time
    vec2 gp = uv * vec2(aspect, 1.0) * 14.0;
    float gN = flow2(gp + vec2(iTime * 1.7, -iTime * 1.3));
    float gN2 = flow2(gp * 2.1 - vec2(iTime * 2.3, iTime * 1.9));   // second octave, boils faster
    float fray = smoothstep(0.45, 0.75, gN * 0.6 + gN2 * 0.4);       // soft → blobby fragments, not dots
    col += rimCol * rim * grit * fray * 1.5;
    // CHEW the edge: knock soft dark bites out of the outline (organic, anti-correlated noise) so
    // it reads as crumbling/fraying rather than a clean glowing line.
    float chew = smoothstep(0.55, 0.85, flow2(gp * 1.6 + vec2(-iTime * 1.1, iTime * 2.0)));
    col *= 1.0 - rim * grit * chew * 0.5;

    // ---- BASS BLOOM — kick-gated red halo from the core, only in DARK passages ----
    // High bass + low centroid (the skill's classic pairing): a near-field (red) radial
    // glow blooms out of the figure on each kick, then it's gone. Reinforces red=near.
    // iter15: floor the quietGate (like FIGURE_ZOOM/HEART PULSE already do) + FFT bassZ fallback, so a
    // deep SOLO-BASS intro (bass 0.96 but quietGate ~0 because the mix is otherwise empty) still blooms
    // the red core. Observed live: sparse bassy passages were leaving the bloom fully muted by quietGate.
    float kick = clamp(max(waveletBassZScore, bassZScore * 0.7), 0.0, 1.0) * max(quietGate, 0.4);
    float darkness = 1.0 - smoothstep(0.10, 0.40, spectralCentroidNormalized);
    float bloomR = length((uv - 0.5) * vec2(aspect, 1.0));
    float bloom = exp(-bloomR * bloomR * 9.0) * kick * darkness;
    col += chromadepth(0.0, 0.95, 0.5) * bloom * 0.45;

    // ---- HEART PULSE (ported from the-coat) — pure-red core glow pulsing on bass ----
    // The coat pulsed a red glow from the chest center on bass. Here it beats from the figure's
    // CORE (center of mass) in the PUREST red (t=0 = nearest), so on a bass hit the dancer's
    // center throbs forward — the single strongest chromadepth pop. Bass-gated with a floor
    // (mic reads bass passages as quiet, so don't fully trust quietGate) like FIGURE_ZOOM does.
    {
        vec2 heartC = vec2(0.5, 0.46);                              // a touch above center = chest/core
        float heartD = length((uv - heartC) * vec2(aspect, 1.0) * vec2(1.2, 1.0));
        float heart = exp(-heartD * heartD * 16.0);                // tight core falloff
        float heartPulse = (clamp(bassZScore, 0.0, 2.0) * 0.6 + waveletBassSpring * 0.5 + bassNormalized * 0.3)
                         * max(quietGate, 0.35);
        // confine to the figure so it reads as the dancer's heart, pure red = near
        col += chromadepth(0.0, 1.0, 0.5) * heart * heartPulse * figMask * 0.5;
    }

    // ---- EMBER RISE (ported from the-coat) — sparks drifting up the far-field ----
    // 6 deterministic embers rising through the lower nebula on the warm-low corner
    // (mids-dominant + low centroid). The coat used pure amber; here the embers ride the
    // chromadepth FAR band (violet/blue) so they read as distant glints receding behind
    // the dancer rather than warm fire in front. Masked outside the figure, lower half only.
    {
        float emberGate = smoothstep(0.45, 0.75, midsNormalized)
                        * smoothstep(0.30, 0.10, spectralCentroidNormalized) * quietGate;
        if (emberGate > 0.02) {
            float emberEmit = 0.0;
            for (int i = 0; i < 6; i++) {
                float fi = float(i);
                float ex = (fract(fi * 0.31) - 0.5) * 1.6 + sin(iTime * 1.7 + fi * 1.3) * 0.04;
                float speed = 0.16 + fract(fi * 0.13) * 0.18;
                float phase = fract(FLOW * speed * 4.0 + fi * 0.27);
                float ey = -0.5 + phase * 1.0;
                vec2 dE = (uv - 0.5) * vec2(aspect, 1.0) - vec2(ex * 0.5, ey);
                emberEmit += exp(-dot(dE, dE) * 700.0) * pow(1.0 - phase, 1.5);
            }
            float lowerMask = smoothstep(0.6, 0.1, uv.y);
            // far-field violet glint (chromadepth far) so embers recede behind the figure
            col += chromadepth(0.88, 0.8, 0.6) * emberEmit * emberGate * lowerMask * (1.0 - figMask) * 0.9;
        }
    }

    // ---- WARM HEARTH (ported from the-coat) — near-red glow radiating from the silhouette ----
    // The coat's signature mid-dominant move: a slow amber glow blooming OUTWARD from the figure
    // on warm-dark-instrumental passages (mids dominant, low centroid, moderate energy). On
    // chromadepth we keep it firmly in the NEAR red/orange band (t≈0.05) so the halo reads as the
    // figure's own warmth pushing toward the viewer — never white, never blue. The outward glow
    // uses the rim's outer presence (already a dilation of the silhouette) as its falloff.
    {
        float warmGate = smoothstep(0.40, 0.70, midsNormalized)
                       * smoothstep(0.55, 0.25, spectralCentroidNormalized)
                       * smoothstep(0.70, 0.20, energyNormalized) * max(quietGate, 0.45);  // iter18: floor (mids-heavy reads mic-quiet)
        if (warmGate > 0.02) {
            // soft outward halo: sample the mask in a wider ring than the rim to get a glow band
            float halo = 0.0;
            for (int i = 0; i < 8; i++) {
                float a = float(i) * PI * 0.25;
                vec2 d = vec2(cos(a), sin(a));
                halo = max(halo, sampleMask(uv + d * 0.05) );
                halo = max(halo, sampleMask(uv + d * 0.10) * 0.6);
            }
            halo *= (1.0 - figMask);                                   // only OUTSIDE the silhouette
            float breathe = 0.85 + 0.15 * sin(iTime * 0.4);            // slow alive breathing
            // near red-orange band → pops toward viewer, stays vibrant (sat 0.95), capped lightness
            col += chromadepth(0.05, 0.95, 0.42) * halo * warmGate * breathe * 0.5;
        }
    }

    // ---- GROUND QUAKE (ported from the-coat) — concentric floor rings on bass+low-centroid ----
    // The coat rumbled amber wavefronts up from the floor on bass drops. Here they're recast as
    // far-VIOLET elliptical rings expanding from below the figure — a deep-bass shockwave receding
    // into the background (chromadepth far). Gated by bass × low-centroid (sub territory) so it only
    // fires on real low-end. Masked outside the figure + lower-biased so it never washes the red core.
    {
        float quakeGate = clamp(bassNormalized - 0.25, 0.0, 1.0)
                        * smoothstep(0.55, 0.15, spectralCentroidNormalized)
                        * max(quietGate, 0.35);
        quakeGate += clamp(waveletBassZScore, 0.0, 1.0) * smoothstep(0.55, 0.15, spectralCentroidNormalized) * 0.5;
        if (quakeGate > 0.02) {
            vec2 feetC = vec2(0.5, 0.92);                              // below the figure (screen-bottom)
            vec2 dvec = (uv - feetC) * vec2(aspect, 1.0);
            dvec.y *= 2.0;                                            // squash → ground-wave ellipse
            float r = length(dvec);
            float wavefronts = 0.0;
            for (int wi = 0; wi < 3; wi++) {
                float ringR = fract(FLOW * 2.4 + float(wi) * 0.33) * 1.2;
                float dr = r - ringR;
                wavefronts += exp(-dr * dr * 90.0) * (1.0 - ringR / 1.2);
            }
            // far violet band so the shockwave recedes; never touches the figure's near red
            col += chromadepth(0.84, 0.85, 0.55) * wavefronts * quakeGate * (1.0 - figMask) * 0.7;
        }
    }

    // ---- SUB RING (ported from the-coat) — single drop shockwave from the figure base ----
    // The coat fired an expanding cone ring on bass spikes, but gated it to REAL drops so it didn't
    // drown the figure on every ambient bass bump — same discipline here. This is the last distinct
    // coat motif; it's deliberately gated TIGHT (energyZ × bassZ = a genuine drop) so it does NOT
    // stack with the per-kick HEART PULSE / GROUND QUAKE / BASS BLOOM (the skill's bass-stacking
    // pitfall). One clean far-violet ring sweeps out from the figure's base on the big moments only.
    {
        float dropHit = clamp(energyZScore, 0.0, 1.5) * clamp(waveletBassZScore + clamp(bassZScore,0.0,1.5)*0.5, 0.0, 1.5) * quietGate;
        if (dropHit > 0.3) {
            vec2 baseC = vec2(0.5, 0.75);                             // figure base
            float sd = length((uv - baseC) * vec2(aspect, 1.0));
            float ringSpeed = 1.2 + clamp(energyZScore, 0.0, 1.5) * 0.6;
            float ringRadius = 0.15 + fract(FLOW * ringSpeed * 2.0) * 0.6;
            float ringD = sd - ringRadius;
            float ring = exp(-ringD * ringD * 350.0);
            float ringFade = 1.0 - fract(FLOW * ringSpeed * 2.0);     // fades as it expands
            col += chromadepth(0.84, 0.85, 0.55) * ring * dropHit * ringFade * (1.0 - figMask) * 0.6;
        }
    }

    // ---- STEP RIPPLE (ported from the-coat) — lateral energy wave in the far field ----
    // The coat radiated a horizontal beat-wave from the chest (a "1,2-step" dance move). Here it
    // becomes a pair of vertical bands sweeping OUTWARD from the figure's centerline through the
    // nebula — energy rippling away from the dancer into space. Gated by the BRIGHT corner
    // (treble × centroid × energy) since that's where this airy passage lives. Tinted in the FAR
    // violet band + masked outside the figure, so it reads as receding background motion (chromadepth-safe).
    {
        float stepGate = clamp(trebleNormalized * smoothstep(0.45, 0.80, spectralCentroidNormalized), 0.0, 1.0)
                       * smoothstep(0.35, 0.75, energyNormalized) * quietGate;
        if (stepGate > 0.02) {
            float sweep = abs((uv.x - 0.5) * aspect);                  // distance from the figure's vertical axis
            float wave = sin(sweep * 16.0 - FLOW * 5.0 + energyNormalized * 4.0);
            wave = pow(0.5 + 0.5 * wave, 4.0);                         // sharp crests, dark troughs
            float outward = smoothstep(0.05, 0.7, sweep) * smoothstep(1.1, 0.6, sweep);  // ring out, fade at edges
            // far violet band so the ripple recedes behind the figure
            col += chromadepth(0.86, 0.85, 0.55) * wave * outward * stepGate * (1.0 - figMask) * 0.5;
        }
    }

    // ---- FEEDBACK trail (subtle refraction, decays in HSL to avoid white-out) ----
    float lum = dot(col, vec3(0.3, 0.6, 0.1));
    vec2 refr = vec2(dFdx(lum), dFdy(lum)) * 0.006;
    vec3 prev = getLastFrameColor(uv + refr).rgb;
    vec3 prevHSL = rgb2hsl(max(prev, vec3(0.001)));
    prevHSL.z *= 0.985;                                     // always pull brightness down
    prevHSL.z = min(prevHSL.z, 0.55);
    prevHSL.x = fract(prevHSL.x + 0.0015);                 // age trails toward blue (recede)
    prev = hsl2rgb(prevHSL);
    // GHOST ECHO (ported from the-coat) — a bass spike briefly retains MORE of the previous frame,
    // leaving an afterimage of the figure that lingers and trails. The coat raised feedback on bass;
    // here it rides the same idea but stays chromadepth-correct for free: the feedback path already
    // ages trails toward BLUE + dims them, so the echo recedes into the far band as it fades — a
    // ghost peeling off the dancer into the distance, not a bright smear. Gated with a quietGate floor
    // (mic reads bass as quiet) so it fires on the real kick.
    float ghost = clamp(bassZScore - 0.3, 0.0, 1.0) * max(quietGate, 0.35)
                + clamp(waveletBassZScore, 0.0, 1.0) * max(quietGate, 0.35);
    float fbBlend = mix(FB_BLEND, 0.42, clamp(ghost, 0.0, 1.0));    // up to ~0.42 retained on a kick
    col = mix(prev, col, 1.0 - fbBlend);

    // ---- BEAT — brightness pulse only (hue is reserved for depth) ----
    if (beat) {
        vec3 bHSL = rgb2hsl(max(col, vec3(0.001)));
        bHSL.z = min(bHSL.z * 1.06, 0.6);
        col = hsl2rgb(bHSL);
    }

    // ---- GROOVE BREATH (ported from the-coat) — slow full-frame breath on calm-groove ----
    // The coat added a slow brightness breath during mid-energy groove passages. On chromadepth
    // an ADDITIVE white breath would wash, so this is MULTIPLICATIVE (col *= 1+tiny*breath) — it
    // scales existing colors up/down, preserving hue + saturation perfectly = zero white risk.
    // Bell-curve energy gate (peaks ~0.45, the groove pocket) + mids presence; suppressed on builds.
    {
        float grooveGate = smoothstep(0.20, 0.45, energyNormalized)
                         * smoothstep(0.70, 0.45, energyNormalized)      // bell curve, peaks mid-energy
                         * smoothstep(0.30, 0.55, midsNormalized)
                         * smoothstep(0.6, 0.2, max(energyZScore, 0.0)) * quietGate;  // not during surges
        float breathOsc = 0.5 + 0.5 * sin(iTime * 1.6);
        col *= 1.0 + grooveGate * breathOsc * 0.10;                       // ±10% multiplicative, hue-safe
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
