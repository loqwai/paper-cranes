// @fullscreen: true
// @mobile: false
// @tags: urchin, blackhole, sun, lattice, psychedelic, vangogh, claude
// preset: https://visuals.beadfamous.com/?shader=claude/wip/black-sun/sun-1&controller=black-sun&wavelet=true
// BLACK SUN — SUN VARIANT (sun-1.frag): 1.frag with the rays in sun colours — molten pale gold at the
// eye cooling through saffron/amber/orange to ember-red tips — against the blue Van Gogh sky.
// Everything below is 1.frag's design; only the palette table differs.
// wip/urchin is the backbone: its spherized field of tube-spines radiates
// from a black hole (wip/black-hole) whose accretion is a psychedelic sun. Behind it, the Van Gogh
// tile sky from wip/sunflowers with the hex mirror-fold lattice from redaphid/lattice-interactive/3
// spiralling into the hole forever; a sunflower field along the bottom. Everything is lensed.
//   GEOMETRY: controller clocks only (bs_time + phase accumulators) (lens, urchin clock, perpetual log-polar lattice zoom, disk spin, drift).
//   LIGHT:    all the audio (corona glow, flares, rim punch, lattice sparkle, sky glow).
//   COLOR:    slow medians/means only.
// Needs ?controller=black-sun (controllers/black-sun.js) for all frame-persistent state.

#define TAU 6.28318530718
#define PI  3.14159265359
#define PAL(t, a, b, c, d) ( a + b*cos( TAU*(c*t+d) ) )

#define smoothing 0.006
#define lineSize  0.01

// ============================================================================
// AUDIO-REACTIVE PARAMETERS (swap constants for audio uniforms)
// ============================================================================
#define GATE (smoothstep(0.003, 0.015, energyMean) * bs_presence * REACT)   // × K9 REACT; QUIET-SAFE: × presence (raw energy now) — a quiet gap relaxes every audio term instead of letting hiss z-scores brighten the scene
// AUDIO-5X: the BlackHole feed sits at energyMean ≈ 0.015–0.08; the old 0.01–0.06 gate held everything at ~25%
// #define GATE 0.0

// ============================================================================
// AUDIO MAP (sun-1-show) — every fast audio term in the body reads from this table, nothing else.
// One musical element → one visual verb on its own layer. THE SUN DOES NOT PULSE TO THE BEAT
// (user, 2026-10-09): it only breathes with sustained bass. Liveliness from
// .claude/vj-tools/census-2322.tsv (live = std/(|median|+std), r = |corr with energy|).
//   EFFECT        feature (controller env)              layer                 envelope
// ============================================================================
#define FADE_T0     248.183   // FADE-IN: re-baked to the page's bs_time at every hot-swap that adds a layer · RELOAD-REBAKE
#define FADE_IN     (smoothstep(FADE_T0, FADE_T0 + 75.0, bs_time))
#define FADE_T1     248.183   // FADE-IN 2: Julia detail, giant cap, no-pulse — re-baked at swap · RELOAD-REBAKE
#define FADE_IN2    (smoothstep(FADE_T1, FADE_T1 + 75.0, bs_time))
#define FADE_T2     1100.436   // SHIVER-2 re-anchor time (bs_time at swap)
#define GAL_T2      57.1587   // bs_galPh at swap
#define FADE_IN3    (smoothstep(FADE_T2, FADE_T2 + 75.0, bs_time))
#define FADE_T4     248.183   // BUDS + cool gas, re-baked at swap · RELOAD-REBAKE
#define FADE_IN4    (smoothstep(FADE_T4, FADE_T4 + 75.0, bs_time))
#define FADE_T5     248.183   // DARK-FLOOR unit, re-baked at swap · RELOAD-REBAKE
#define FADE_IN5    (smoothstep(FADE_T5, FADE_T5 + 60.0, bs_time))
#define FADE_T6     248.183   // PINWHEEL: re-baked to bs_time at swap · RELOAD-REBAKE
#define FADE_IN6    (smoothstep(FADE_T6, FADE_T6 + 30.0, bs_time))
#define FADE_T7     248.183   // GIANT: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN7    (smoothstep(FADE_T7, FADE_T7 + 60.0, bs_time))
#define FADE_T8     248.183   // GIANT-2: bs_time at swap (baked) · RELOAD-REBAKE
#define GAL_T8      57.1587   // GIANT-2: bs_galPh at swap (baked) · RELOAD-REBAKE
#define FADE_IN8    (smoothstep(FADE_T8, FADE_T8 + 30.0, bs_time))
#define EASE8       (30.0 * (clamp((bs_time - FADE_T8) / 30.0, 0.0, 1.0) - pow(clamp((bs_time - FADE_T8) / 30.0, 0.0, 1.0), 3.0) + 0.5 * pow(clamp((bs_time - FADE_T8) / 30.0, 0.0, 1.0), 4.0)))   // ∫(1 − smoothstep): a clock that glides to a stop
#define FADE_T9     248.183   // GIANT-3: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN9    (smoothstep(FADE_T9, FADE_T9 + 30.0, bs_time))
#define FADE_T10    248.183   // GIANT-4: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN10   (smoothstep(FADE_T10, FADE_T10 + 30.0, bs_time))
#define FADE_T11    248.183   // GIANT-5: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN11   (smoothstep(FADE_T11, FADE_T11 + 30.0, bs_time))
#define FADE_T12    248.183   // SURFACE-3D: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN12   (smoothstep(FADE_T12, FADE_T12 + 40.0, bs_time))
#define FADE_T13    248.183   // EMBER-LIMB: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN13   (smoothstep(FADE_T13, FADE_T13 + 40.0, bs_time))
#define FADE_T14    248.183   // FAN-FILL: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN14   (smoothstep(FADE_T14, FADE_T14 + 40.0, bs_time))
#define FADE_T15    248.183   // PLASMA-ARCH: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN15   (smoothstep(FADE_T15, FADE_T15 + 30.0, bs_time))
#define BUD0        207.992   // PLASMA-ARCH: bs_budPh at swap (baked) · RELOAD-REBAKE
#define FADE_T16    248.183   // LIMB-LAW: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN16   (smoothstep(FADE_T16, FADE_T16 + 30.0, bs_time))
#define FADE_T17    248.183   // FANLIFT: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN17   (smoothstep(FADE_T17, FADE_T17 + 30.0, bs_time))
#define BUD1        207.992   // FANLIFT: bs_budPh at swap (baked, so the sky turn starts from zero) · RELOAD-REBAKE
#define SKY_ROT     (max(BUD_PH - BUD1, 0.0) * 0.014 * FADE_IN17)   // FANLIFT: the tile sky turns about its centre on the bass-rated forward clock (product of non-decreasing terms, never reverses)
#define FADE_T18    248.183   // AUDIO-PASS: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN18   (smoothstep(FADE_T18, FADE_T18 + 30.0, bs_time))
#define BUD2        207.992   // AUDIO-PASS: bs_budPh at swap (baked) · RELOAD-REBAKE
#define FLX2        60.917   // AUDIO-PASS: bs_fluxPh at swap (baked) · RELOAD-REBAKE
#define BUD_D2      (max(BUD_PH - BUD2, 0.0) * FADE_IN18)       // AUDIO-PASS: bass-rated forward clock since the swap (never reverses)
#define FLX_D2      (max(bs_fluxPh - FLX2, 0.0) * FADE_IN18)    // AUDIO-PASS: flux-rated forward clock since the swap
#define FLARE_HIT   (bs_fAmp * exp(-4.5 * bs_fAge) * GATE)      // AUDIO-PASS: flux onset, instant attack, ~400 ms decay
#define FADE_T19    248.183   // KNOB-MAP: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN19   (smoothstep(FADE_T19, FADE_T19 + 8.0, bs_time))
#define T_S         (7616.1585 + (bs_spT - 7616.1585))     // K7 SPEED: the giant's turn clock, rate = SPEED dial (offsets baked at swap, so no jump)
#define BUD_S       (5903.8370 + (bs_spB - 5903.8370))     // K7 SPEED: bass-rated boil clock × SPEED
#define FADE_T20    248.183   // MOTION: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN20   (smoothstep(FADE_T20, FADE_T20 + 20.0, bs_time))
#define FLOW0       103.402   // MOTION: bs_flowPh at swap, baked a little ahead so nothing jumps
#define FLOW_D      max(bs_flowPh - FLOW0, 0.0)   // MOTION: bass + loudness rated forward clock since the swap (controller FLOW-CLOCK)
#define C_FLUX0     60.917   // FAN-FOLLOW: bs_fluxPh at swap (baked, so c does not jump) · RELOAD-REBAKE
#define FADE_T21    248.183   // PAINT-FLOW: bs_time at swap (baked) · RELOAD-REBAKE
#define FADE_IN21   (smoothstep(FADE_T21, FADE_T21 + 20.0, bs_time))
#define FADE_T22    811.2981666666841   // FAN-ROOT: bs_time at swap (baked)
#define FADE_IN22   (smoothstep(FADE_T22, FADE_T22 + 60.0, bs_time))
#define FADE_T23    2056.725   // AUDIO-WEB: bs_time at swap (baked)
#define FADE_IN23   (smoothstep(FADE_T23, FADE_T23 + 75.0, bs_time))
#define FADE_T24    2448.561   // ROOT-HUE: bs_time at swap (baked)
#define FADE_IN24   (smoothstep(FADE_T24, FADE_T24 + 25.0, bs_time))
#define FADE_T25    2587.724   // OG-SKY: bs_time at swap (baked)
#define OG_X        (clamp((bs_time - FADE_T25) / 240.0, 0.0, 1.0))
#define OG_SKY      (OG_X * OG_X * OG_X * (OG_X * (OG_X * 6.0 - 15.0) + 10.0))   // OG-SKY (user, 02:3x: "lets slowly go to the og sky"): smootherstep over 4 min to the Van Gogh tile sky
// AUDIO-WEB (user, 2026-10-10 02:17: "I need more, subtle features affected by the audio uniforms. many different ones").
// One feature → one small verb on its own element. Light/amplitude only, presence-gated, about ±10–25% of that element.
#define AW_G        (clamp(GATE, 0.0, 1.2) * 0.4 * FADE_IN23)   // AUDIO-WEB-2: ×0.4 — the first pass peaked at ±36–54% of each element; subtle is ±~15%
#define AWS(x, c, s) clamp(((x) - (c)) / (s), -1.0, 1.0)
#define AW_LANE  (0.30 * AWS(bs_f8, 0.5, 0.15) * AW_G)          // AUDIO-WEB: waveletBand0Norm (sub-bass) → giant granule lanes deepen
// #define AW_LANE 0.0
#define AW_FAC   (0.50 * AWS(bs_f20, 0.55, 0.08) * AW_G)        // AUDIO-WEB: spectralSkewZ → faculae near the limb brighten
// #define AW_FAC 0.0
#define AW_UMB   (0.04 * AWS(bs_f32, 0.29, 0.08) * AW_G)        // AUDIO-WEB: flux volatility (slow) → sunspot umbrae deepen in volatile sections
// #define AW_UMB 0.0
#define AW_PFIL  (0.50 * AWS(bs_f33, 0.34, 0.08) * AW_G)        // AUDIO-WEB: roughness volatility (slow) → penumbra filaments sharpen
// #define AW_PFIL 0.0
#define AW_CORF  (0.35 * AWS(bs_f10, 0.45, 0.12) * AW_G)        // AUDIO-WEB: waveletBand2Norm (low mids) → fine coronal rays brighten
// #define AW_CORF 0.0
#define AW_HELM  (0.22 * clamp(sign(bassSlope) * bassRSquared * 12.0, -1.0, 1.0) * AW_G)   // AUDIO-WEB: bass slope × R² → helmet streamers lift on a steady build, dim on a fade
// #define AW_HELM 0.0
#define AW_CHROM (0.30 * AWS(bs_f22, 0.55, 0.06) * AW_G)        // AUDIO-WEB: spectralCentroidZ → the gold chromosphere line brightens
// #define AW_CHROM 0.0
#define AW_SPIC  (0.35 * AWS(bs_f11, 0.48, 0.12) * AW_G)        // AUDIO-WEB: waveletBand3Norm → the spicule forest glints
// #define AW_SPIC 0.0
#define AW_PROM  (0.20 * AWS(bs_f9, 0.43, 0.14) * AW_G)         // AUDIO-WEB: waveletBand1Norm (bass) → prominence tubes glow
// #define AW_PROM 0.0
#define AW_BEAD  (0.45 * AWS(bs_f4, 0.19, 0.06) * AW_G)         // AUDIO-WEB: spectralFluxNorm → Julia orbit-trap beads glint
// #define AW_BEAD 0.0
#define AW_CURL  (0.35 * AWS(bs_f19, 0.56, 0.05) * AW_G)        // AUDIO-WEB: spectralSpreadZ → Julia curls glow
// #define AW_CURL 0.0
#define AW_FIL   (0.30 * AWS(bs_f15, 0.76, 0.08) * AW_G)        // AUDIO-WEB: spectralRolloffNorm → Julia filaments shimmer
// #define AW_FIL 0.0
#define AW_GAS   (0.20 * AWS(bs_f18, 0.55, 0.06) * AW_G)        // AUDIO-WEB: spectralEntropyZ → deep-space gas veils thicken
// #define AW_GAS 0.0
#define AW_STAR  (0.20 * AWS(bs_f36, 0.54, 0.06) * AW_G)        // AUDIO-WEB: spectralKurtosisNorm (slow) → the starfield brightens on peaked spectra
// #define AW_STAR 0.0
#define AW_HATS  (clamp((bs_f17 - 0.5) * 2.0, 0.0, 1.0) * clamp(GATE, 0.0, 1.2) * FADE_IN23) // AUDIO-WEB: trebleZ → the brighter stars twinkle on the hats
// #define AW_HATS 0.0
#define AW_TILT  (8.0 * AWS(bs_moodTilt, 0.5, 0.15) * FADE_IN23)  // AUDIO-WEB colour: skew mean (~15 s) → gas filaments lean cobalt ↔ violet (±8°)
// #define AW_TILT 0.0
#define AW_AIRH  (3.0 * AWS(bs_moodAir, 0.7, 0.15) * FADE_IN23)   // AUDIO-WEB colour: rolloff mean (~15 s) → the giant's gold runs a touch warmer or paler (±3°)
// #define AW_AIRH 0.0
#define GIANT_C     vec2(1.35 + (knob_15 - 0.53) * 0.9, -1.35 + (knob_16 - 0.35) * 0.9)   // GIANT: K15/K16 rebased — today's dials put the body lower right, centre off-screen
#define GIANT_R     (mix(1.05 + 0.35 * knob_4, 0.75 + 0.85 * knob_4, FADE_IN19))   // K4 ZOOM — giant radius 0.75..1.60 half-heights
#define SKY_C       (mix(SUN, GIANT_C, FADE_IN7))           // GIANT: the sky's spiral + lattice centre glides to the giant
#define FLUX0       60.917   // PINWHEEL: bs_fluxPh at swap, so the added turn starts from zero · RELOAD-REBAKE
#define SPIN_LOUD   (0.04 * max(bs_fluxPh - FLUX0, 0.0) * FADE_IN6)   // PINWHEEL: extra arm turn on the flux clock (forward-only) — ~3× faster on loud passages
#define RIM_KICK    (1.0 + 0.4 * bs_kick * GATE * FADE_IN6)          // RIM-KICK: kick lightens only the arms' cyan rim, ~350 ms ease from the controller
#define BUD_PH      (bs_budPh)    // BUD-CLOCK: forward clock whose rate follows bass sustain (controller; seeded from bs_diskPh, so no jump)
#define FLARE       (clamp(spectralCrestZScore, 0.0, 1.0) * GATE)   // spectralCrestZScore | corona reach        | raw z, clamped
#define SUN_BREATH  (bs_bassSus * GATE)          // bassNormalized          | sun ball + corona light | AR 1.2 s / 2.5 s (slow only)
#define CLOUD_KICK  (bs_kick * GATE)             // wavelet_bassHit onset   | LSD cloud bands flash   | instant, cubic ease 0.25–0.45 s
#define GROUND_GLOW (bs_f25 * GATE)              // waveletSpreadZ (r .27)  | tile gaps / ground glow | 250 ms / 1.2 s
#define SKY_TILT    ((bs_f26 - 0.5) * 2.0 * GATE)// waveletTiltZ   (r .15)  | tile sky brightness ±   | 250 ms / 1.2 s
#define LAT_FOCUS   (bs_f21 * GATE)              // spectralKurtosisZ (r .09)| lattice glint strength | 250 ms / 1.2 s
#define LAT_DROP    (bs_dropEnv)                 // wavelet_confirmedDrop   | lattice + clouds surge  | 150 ms / ~3 s, 8 s refractory
#define RAY_TIMBRE  (bs_f24)                     // waveletCentroidZ (r .03)| ray light roots ↔ tips  | 250 ms / 1.2 s
#define RAY_SWAY    (bs_midsS)                   // midsZScore              | tendril sway amplitude  | 350 ms
#define RAY_HATS    (bs_treb * GATE)             // waveletBand5ZScore      | ray tip glints, stars   | fast AR
#define RAY_SNARE   (bs_snAmp)                   // waveletBand3/4 onsets   | spark ring out the rays | 0.9 s ride
#define RAY_FLARE   (bs_fAmp)                    // spectralFluxZScore onset| plasma blob rides a ray | 1.8 s ride
#define RAY_ROUGH   (bs_rough * GATE)            // spectralRoughnessZScore | ray grain crackle       | 200 ms
#define MELODY      (bs_f12 * GATE)              // waveletBand4Norm (r .30)| companion light + size  | 80 ms / 500 ms
#define BIG_WAVE    (bs_wAmp * GATE)             // energy/bass z jumps     | prev-frame lens front   | 6 s life, 8 s refractory
#define CORONA_GLOW (0.70 + 1.6 * SUN_BREATH)
#define SPARK (RAY_HATS)
#define LATTICE_LIT (0.40 + 1.10 * LAT_FOCUS + 0.6 * LAT_DROP)
#define SKY_GLOW (0.92 + 0.30 * SKY_TILT + 0.05 * BRIGHTEN)

// COLOR: only the slowest music — key median + brightness mean
#define HUE_BASE (pitchClassMedian * 0.35 + spectralCentroidMean * 0.15)
// #define HUE_BASE 0.0

// ── SLOW / LONG-TERM: section character over the ~8 s history window. One feature → one verb, all
// subtle, all amounts (never phases or positions), so the picture evolves across a set hands-off and
// none of it can flash. Ratios where the raw level depends on input gain. Quiet-safe: slow gate.
#define SLOW_GATE (smoothstep(0.003, 0.015, energyMean))
#define BAND_SUM  (max(bassMedian + midsMedian + trebleMedian, 1e-3))

// LIGHT: airy sections (treble share of the band medians) → the lattice glints more (deep space: stars brighten)
#define AIR (smoothstep(0.15, 0.40, trebleMedian / BAND_SUM) * SLOW_GATE)
// #define AIR 0.0

// SHAPE: full-bodied sections (mids share) → the gold cloud bands spread further (deep space: arms widen)
#define BODY (smoothstep(0.30, 0.65, midsMedian / BAND_SUM) * SLOW_GATE)
// #define BODY 0.0

// COLOR: tonal sections (crest median — clear notes vs noise) → the whole frame gets more vivid
#define TONAL (smoothstep(0.35, 1.2, spectralCrestMedian) * SLOW_GATE)
// #define TONAL 0.0

// SHAPE: gritty / dissonant sections (roughness median) → the sun's granulation boils harder
#define GRIT (smoothstep(0.04, 0.16, spectralRoughnessMedian) * SLOW_GATE)
// #define GRIT 0.0

// LIGHT: dynamic music (energy std / mean — drops and builds vs a flat wall) → a deeper dark floor (deep space: wider gaps)
#define DYN (smoothstep(0.25, 0.9, energyStandardDeviation / max(energyMean, 0.004)) * SLOW_GATE)
// #define DYN 0.0

// SHAPE: punchy low end (bass std / mean) → the corona reaches further
#define PUNCH (smoothstep(0.2, 0.7, bassStandardDeviation / max(bassMean, 0.01)) * SLOW_GATE)
// #define PUNCH 0.0

// LIGHT: a confident brightening trend (centroid slope × R²) → the sky lifts a touch; ±, clamped
#define BRIGHTEN (clamp(spectralCentroidSlope * spectralCentroidRSquared * 4000.0, -1.0, 1.0) * SLOW_GATE)
// #define BRIGHTEN 0.0

// Ray shape (slow stats), motion clocks (audio sets the rate) and light envelopes now come from
// controllers/black-sun.js as bs_* uniforms — see the CONTROLLER block below.

// ============================================================================
// KNOBS knob_1..knob_16 (MIDI). KNOB-MAP (2026-10-10): every dial drives the giant scene.
// knob_1 (TRIP), knob_5 (STORY), knob_7 (SPEED rate) and knob_15/16 (giant + sun place) are also read by controllers/black-sun.js.
// @knob: 1 TRIP
// @knob: 2 HUE SPIN
// @knob: 3 FAN
// @knob: 4 ZOOM
// @knob: 5 STORY
// @knob: 6 REACH
// @knob: 7 SPEED
// @knob: 8 SKY SWAP
// @knob: 9 REACT
// @knob: 10 PAINT
// @knob: 11 WARMTH
// @knob: 12 SPARKLE
// @knob: 13 GLOW
// @knob: 14 DARK
// @knob: 15 SUN X
// @knob: 16 SUN Y
// ============================================================================
#define ZOOM        (0.55 * exp(knob_4 * 1.0033))   // K4 ZOOM — eye/sun/rays/lens scale about the centre, 0.55×..1.5× on an exp curve (0 = eye ~28% of screen height)
// #define ZOOM 0.55
// BOOT: before the controller's first frame every bs_* is 0 — size 0 would hide the sun until it ran.
#define BS_SIZE (bs_time > 0.0 ? bs_size : 1.0)
#define BS_SCALE (bs_time > 0.0 ? bs_irisScale : 1.0)
float gSwell = 1.0;   // KICK-SWELL: the whole main star (ball, corona, ray roots, lens) swells on each kick
#define HOLE_R      (hrCap((0.16 + 0.0 * 0.10) * BS_SCALE * ZOOM * BS_SIZE))   // K1 HOLE SIZE × section-change shutter size (controller) × K4 ZOOM
// #define HOLE_R (0.16 * BS_SCALE * ZOOM * BS_SIZE * gSwell)
#define HUE_SPIN    0.0                       // old sky-only spin retired; K2 turns the finished frame (HUE_ROT)
#define HUE_ROT     (knob_2 * 6.2831853)      // K2 HUE SPIN — rotates the whole finished palette one full turn (1 = 0), magenta guarded
// #define HUE_SPIN 0.0
#define LATTICE_AMT 0.8                       // sky lattice fixed; K3 is the FAN now
#define FAN_AMT     (mix(1.0, 0.15 + 1.25 * knob_3, FADE_IN19))   // K3 FAN — cyan Julia fan brightness 0.15×..1.4×
#define FAN_S       (mix(0.60 + 0.35 * knob_6, 0.40 + 0.62 * knob_3, FADE_IN19))   // K3 FAN — fan reach (was on K6)
// #define LATTICE_AMT 0.55
#define CLOUD_CALM  0.0
#define SPACE_MIX   (knob_8 * FADE_IN19)      // K8 SKY SWAP — flips the story's backdrop (day tiles ↔ deep space) and clears the nebula veil
// #define CLOUD_CALM 0.0
#define REACT       (1.0 + knob_9 * 2.5)      // K9 REACT — scales every audio term through GATE, 1×..2.5× (the end-of-frame knee still guards white)
// #define REACT 1.0
#define FADE        1.0                       // never a master fade (it blacked the wall, 2026-10-09)
#define PAINT_AMT   (knob_10 * FADE_IN19)     // K10 PAINT — irregular brush dabs + broken colour over surface and sky
// #define FADE 1.0
#define WARMTH      (knob_11 * 0.9)          // K11 WARMTH — pulls the giant, corona and arches toward sun gold (scoped by rhoG; the sky and backdrop stay blue at any WARMTH)
// #define WARMTH 0.0
#define SPARKLE     (1.0 + knob_12 * 3.0)     // K12 SPARKLE — stars, glints, fan filaments, spicules 1×..4×
// #define SPARKLE 1.0
#define GLOW        (mix(1.0 + knob_13 * 1.5, 0.4 + 3.0 * knob_13, FADE_IN19))   // K13 GLOW — corona + chromosphere 0.4×..3.4×
// #define GLOW 1.0
#define DARK_FLOOR  (knob_14)                 // K14 DARK — sinks the darks toward black, brights untouched
// #define DARK_FLOOR 0.0

#define SUN vec2(bs_sunX, bs_sunY)   // SKY-PATH: the controller drifts the sun slowly (story acts set the rate; dying sinks it)

float gPhase;   // slow colour phase (HUE_BASE + set clock + knob)
float gH0;      // ONE-PALETTE key hue (turns) — every colour in the frame is an offset of this

// ── CONTROLLER (controllers/black-sun.js): frame-persistent state lives in JS, not the framebuffer.
// Seconds-based and double precision, so it survives hot-swaps, canvas resizes and the iTime wrap.
// Without ?controller=black-sun every bs_* is 0 and the shader sits on the black hole.
uniform float bs_time, bs_eye, bs_presence;
uniform float bs_spT, bs_spB, bs_flowPh;
uniform float bs_bass, bs_mids, bs_treb, bs_energy, bs_entropy, bs_centroid, bs_pump, bs_drop;
uniform float bs_flux, bs_rough, bs_crest, bs_roll, bs_kick;
uniform float bs_curl, bs_dir, bs_flex, bs_wave, bs_len, bs_thick;
uniform float bs_flow, bs_twist, bs_flexPh, bs_pal, bs_kAge, bs_kAmp;
uniform float bs_irisScale, bs_shutter, bs_shutterAng, bs_diskPh;
uniform float bs_fAge, bs_fId, bs_fAmp;
float gBass, gMids, gTreb, gEnergy, gEntropy, gCentroid, gPump, gDrop, gFlow;
float gCurl, gDir, gFlex, gWave, gLen, gThick, gTwist, gFlexPh, gFlux, gRough;
float gKick, gKAge, gKAmp, gCrest, gPal, gRoll;
uniform float bs_wAge, bs_wAmp;
// STORY (controllers/black-sun.js ACTS): see docs/storylines.md
uniform float bs_sunX, bs_sunY, bs_night, bs_galPh, bs_wind, bs_fluxPh, bs_reach;
uniform float bs_billow, bs_bassS, bs_kickS;
// LEGIBLE: one musical element → one visual verb (see sun.md 'Legible channels')
uniform float bs_snAge, bs_snAmp, bs_pitchMove, bs_build, bs_bassSus, bs_midsS;   // background-rate envelopes (attack ~80 ms, release ~600 ms)
// bs_billow — NO-SHIVER: slow (~4 s) eased warp amplitude — the only audio that may scale a background warp
uniform float bs_cX, bs_cY, bs_cOn, bs_kiss, bs_waveX, bs_waveY;
float gHeatOv = -1.0;              // COMPANION: >= 0 overrides the story heat in sunLch (the companion is always dark red)
float gBendDir = 0.0, gBendAmt = 0.0;   // COMPANION: rays bend toward the other star
float gR0;   // ray root radius (set in urchin) — FAR-REACH measures ray length from it
uniform float bs_trip, bs_julia, bs_jR, bs_jTurn, bs_descend, bs_dive, bs_fractal, bs_tripHue, bs_budPh;   // TRIP-HOOKS: K1 trip story (controller)
uniform float bs_heat, bs_size, bs_power, bs_dark, bs_abstract, bs_chaos, bs_pull, bs_nova, bs_shell, bs_act, bs_actT;
uniform float bs_f12, bs_f21, bs_f24, bs_f25, bs_f26, bs_dropEnv;
uniform float bs_f4, bs_f8, bs_f9, bs_f10, bs_f11, bs_f15, bs_f17, bs_f18, bs_f19, bs_f20, bs_f22, bs_f32, bs_f33, bs_f36, bs_moodTilt, bs_moodAir;   // AUDIO-WEB: controller feature bank + slow moods
// GIANT-CAP: the eye-phase ball (≈ 3.04 × HOLE_R) soft-limits at ~0.8 of the half-height, so ZOOM 1 on a
// red giant still leaves dark space around it. Eased in on FADE_IN2.
float hrCap(float R) {
    float b = R * 3.04;
    float bc = b < 0.5 ? b : 0.5 + 0.3 * (1.0 - exp(-(b - 0.5) / 0.3));
    return mix(R, bc / 3.04, FADE_IN2);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec2 rotate2D(vec2 st, float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)) * st; }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float st(float a, float b, float s) { return smoothstep(a - s, a + s, b); }

float noise(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3. - 2. * f);
    return mix(mix(dot(hash22(i + vec2(0, 0)), f - vec2(0, 0)),
                   dot(hash22(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
               mix(dot(hash22(i + vec2(0, 1)), f - vec2(0, 1)),
                   dot(hash22(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}

float s_noise(vec2 p) { return noise(p) * 0.5 + 0.5; }

float fbm(vec2 p) {
    float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 4; ++i) { v += a * s_noise(p); p = rot * p * 2.0 + shift; a *= 0.5; }
    return v;
}

// OKLCH-PALETTE: h = hue turns (0..1), l = brightness 0..~0.6 (kept the old HSL-ish scale so call
// sites read the same). Chroma fades at the dark and bright ends so nothing clips to white.
vec3 psyC(float h, float l, float cs) {
    float L = clamp(l * 1.35, 0.0, 0.88);
    float C = 0.17 * cs * smoothstep(0.0, 0.30, l) * (1.0 - smoothstep(0.70, 0.95, L));
    vec3 lin = clamp(oklch2rgb(vec3(L, C, fract(h) * TAU)), 0.0, 1.0);
    return pow(lin, vec3(1.0 / 2.2));
}
vec3 psy(float h, float l) { return psyC(h, l, 1.0); }

// MIAMI-PALETTE — a designed palette (OKLCH L, C, hue°) with fixed offsets between colours, not one
// hue ± a bit. The whole table rotates together on gPal (bs_pal, a slow controller clock that starts at 0 on load),
// so the set opens on Miami beach and drifts into other psychedelic palettes over ~25 min.
const vec3 MIAMI[15] = vec3[15](
    vec3(0.80, 0.075, 78.0),   // 0  SAND            ┐
    vec3(0.70, 0.160, 30.0),   // 1  CORAL           │
    vec3(0.78, 0.125, 192.0),  // 2  AQUA/turquoise  │ the eye: Miami jewel
    vec3(0.60, 0.190, 35.0),   // 3  EMBER GLOW      │ (SUN-PALETTE: pupil glow + fibres at the pupil)
    vec3(0.74, 0.165, 58.0),   // 4  SUNSET ORANGE   │
    vec3(0.48, 0.105, 222.0),  // 5  DEEP OCEAN      │
    vec3(0.30, 0.110, 28.0),   // 6  DEEP EMBER      ┘ (SUN-PALETTE: pupil glow at rest)
    vec3(0.88, 0.130, 90.0),   // 7  PALE GOLD       ┐ SUN-PALETTE rays: hottest at the base
    vec3(0.81, 0.160, 76.0),   // 8  SAFFRON         │ tendrils: warm roots →
    vec3(0.74, 0.170, 62.0),   // 9  AMBER           │ cool tips
    vec3(0.65, 0.180, 46.0),   // 10 DEEP ORANGE     │
    vec3(0.55, 0.185, 30.0),   // 11 EMBER RED       ┘ cooling to the fading tips
    vec3(0.60, 0.120, 245.0),  // 12 VAN GOGH SKY    ┐ background
    vec3(0.38, 0.120, 262.0),  // 13 DEEP BLUE       ┘
    vec3(0.92, 0.100, 96.0)    // 14 PALE GOLD sparkle — glints, collarette, stars
);
// HUE-LOCK: only the sky (12, 13) rides the full slow palette rotation; the eye, tendrils and gold
// sway at most ±20° around their designed hues, so tendrils stay raspberry→violet and never drift
// into the gold of the sky strokes. K2 HUE SPIN still turns everything.
// GAMUT-MAP: shrink chroma at constant L/hue until the colour fits sRGB — clamping RGB instead
// flattened out-of-gamut hues (the neon-plastic teal) into saturated channels. Linear RGB out.
vec3 gamutLch(vec3 lch) {
    // GAMUT-FAST: one conversion, closed form, continuous. An out-of-gamut colour is pulled toward its
    // own-lightness grey just far enough that every channel fits — at constant L and (≈) hue. Continuous
    // in the input, so smooth gradients stay smooth: the old discrete L-step search terraced the
    // plasma, and its 9 conversions per call were most of the frame-time regression.
    vec3 c = oklch2rgb(lch);
    float g = lch.x * lch.x * lch.x;
    float t = 1.0;
    for (int i = 0; i < 3; i++) {
        float ci = c[i], di = ci - g;
        if (ci > 1.0) t = min(t, (1.0 - g) / di);
        if (ci < 0.0) t = min(t, g / (g - ci));
    }
    return clamp(vec3(g) + (c - vec3(g)) * max(t, 0.0), 0.0, 1.0);
}

// LSD-CLOUDS: 1960s poster-art contour bands for the cloud masses. Adjacent bands are near-
// complements at matched lightness (op-art vibration); the sequence opens on the sun's gold and
// walks warm → hot → psychedelic. Degrees; the whole set turns slowly on gPal.
const float LSD_HUES[8] = float[8](90.0, 265.0, 55.0, 295.0, 28.0, 190.0, 150.0, 215.0);   // NO-MAGENTA   // no lime: pairs that sing against the blue ground + gold sun
vec3 lsdBand(float k, float lit) {
    int i = int(mod(k, 8.0));
    float L = (mod(k, 2.0) < 0.5 ? 0.74 : 0.70) * lit;
    return pow(gamutLch(vec3(L, 0.17, radians(LSD_HUES[i]) + gPal * TAU * 0.5)), vec3(1.0 / 2.2));
}

// SOFT-BANDS: neighbouring LSD bands blend across the whole band width (smoothstep over fract),
// mixed in OKLab so the hue travels instead of stepping. The band sequence stays; the stair-steps go.
// GAS-HUE: the gas's colour is a CONTINUOUS function of its field — hue sweeps the wheel with the
// field value (no floor/fract band index anywhere), so the psychedelic multi-hue look comes from the
// gas's own variation and nothing can step. Anchored to the sun gold; turns slowly with the palette.
vec3 gasHue(float v, float L) {
    float hh = 250.0 + 35.0 * (0.5 + 0.5 * sin(v * 5.2 + gPal * TAU * 0.5)) + 8.0 * sin(gPal * TAU);   // GAS-BLUE (user rule: the sky stays blue, never brown or maroon): indigo ↔ cobalt, was rust → amber
    vec3 warm = gamutLch(vec3(min(L * 1.05, 0.80), 0.12, radians(hh)));
    vec3 cool = gamutLch(vec3(min(L * 1.10, 0.84), 0.14, radians(215.0 + 25.0 * sin(v * 3.1 + gPal * TAU))));   // GAS-COOL: teal → indigo
    float w = smoothstep(0.50, 0.72, 0.5 + 0.5 * sin(v * 2.3 + 1.7 + gPal * TAU)) * FADE_IN4;   // ~40% of the gas swings cool; narrow blend, no grey band
    return pow(mix(warm, cool, w), vec3(1.0 / 2.2));
}

// NO-GREY: blended in OKLCH, not OKLab — adjacent bands are near-complementary, so a straight OKLab
// mix passes through grey mid-way, and that grey laid a flat veil over the night sky. Hue travels the
// short way round the wheel and chroma never dips.
vec3 bandBlend(float k, float lit) {
    float f = fract(k);
    f = f * f * (3.0 - 2.0 * f);
    vec3 a = rgb2oklch(pow(lsdBand(floor(k), lit), vec3(2.2)));
    vec3 b = rgb2oklch(pow(lsdBand(floor(k) + 1.0, lit), vec3(2.2)));
    float dh = mod(b.z - a.z + PI, TAU) - PI;
    return pow(gamutLch(vec3(mix(a.x, b.x, f), max(a.y, b.y), a.z + dh * f)), vec3(1.0 / 2.2));
}

vec3 miamiLinR(int i, float lit, float cMul, bool sway) {
    vec3 e = MIAMI[i];
    float L = min(e.x * lit, 0.86);
    float C = e.y * cMul * (0.55 + 0.45 * smoothstep(0.05, 0.35, L)) * (1.0 - smoothstep(0.82, 0.92, L));
    float rot = (sway ? radians(i >= 12 && i <= 13 ? 15.0 : 20.0) * sin(gPal * TAU) : gPal * TAU) + HUE_SPIN * TAU;
    return gamutLch(vec3(L, C, radians(e.z) + rot));
}
vec3 miamiLin(int i, float lit) { return miamiLinR(i, lit, 1.0, true); }   // SKY-LOCK: every table colour sways at most ±20° (sky ±15°) — the ground stays Van Gogh blue; only the LSD cloud bands and plasma veins ride the full palette clock
// idx may be fractional: blends neighbouring palette entries (gradients along a tendril)
vec3 mc(float idx, float lit) {
    idx = clamp(idx, 0.0, 14.0);
    int i0 = int(floor(idx)); int i1 = min(i0 + 1, 14);
    return pow(mix(miamiLin(i0, lit), miamiLin(i1, lit), fract(idx)), vec3(1.0 / 2.2));
}
// SKY-COBALT: the tile sky stays in the Van Gogh cobalt/teal family. HUE SPIN may lean it ±20° and the
// palette clock sways it ±15° at a quarter of the old speed; it never rotates round to umber or maroon.
vec3 skyLin(int i, float lit) {
    vec3 e = MIAMI[i];
    float L = min(e.x * lit, 0.86);
    float C = e.y * (0.55 + 0.45 * smoothstep(0.05, 0.35, L)) * (1.0 - smoothstep(0.82, 0.92, L));
    float rot = radians(15.0) * sin(gPal * TAU * 0.25) + radians(20.0) * sin(HUE_SPIN * TAU);
    return gamutLch(vec3(L, C, radians(e.z) + rot));
}
vec3 mcSky(float idx, float lit) {
    idx = clamp(idx, 12.0, 14.0);
    int i0 = int(floor(idx)); int i1 = min(i0 + 1, 14);
    return pow(mix(skyLin(i0, lit), skyLin(i1, lit), fract(idx)), vec3(1.0 / 2.2));
}
vec3 skyBand(float k, float lit) {   // SKY-COBALT: cloud contour bands in cobalt ↔ deep blue, with rare gold accents
    vec3 blue = mcSky(12.0 + 0.45 * mod(k, 3.0), lit);
    return mix(blue, mcSky(14.0, lit * 0.85), step(0.86, hash12(vec2(k, 3.1))));
}


// ============================================================================
// LATTICE (hex mirror-fold, from redaphid/lattice-interactive/3)
// ============================================================================
float hexDist(vec2 p) {
    float dx = abs(p.x), dy = abs(p.y);
    return max(dx + dy * (1.0 / tan(PI / 3.0)), max(dx, dy * (1.0 / sin(PI / 3.0))));
}

// returns (lit, field, alpha)
vec3 lattice(vec2 p, float t) {
    float scale = 1.0, aliasBase = 1.0 / iResolution.y;
    float alpha = 0.0, lumAcc = 0.0, fieldAcc = 0.0;
    for (int i = 0; i < 9; i++) {
        p = 1.0 - abs(2.0 * fract(p - 0.5) - 1.0);
        float theta = float(i) * PI * 0.125 + t * 0.006 * (0.4 + float(i) * 0.05) + (seed3 - 0.5) * float(i) * 0.6;
        p *= rot2(theta);
        scale *= 2.0;
        if (i < 4) continue;
        vec2 uv = abs(p);
        float m = min(abs((hexDist(uv) - 0.60) - 0.1), min(length(uv) - 0.20, min(uv.x, uv.y)));
        float alias = aliasBase * 0.5 * scale;
        float f = smoothstep(0.10 + alias, 0.10, m) * 0.4 + smoothstep(0.22, 0.11, m) * 0.6;
        float ld = float(i - 4) / 4.0;
        float swirl = 0.5 + 0.5 * sin(atan(p.y, p.x) * 2.0 + length(p) * 3.0 + float(i) + seed4 * TAU);
        float lit = smoothstep(0.06 + alias, 0.06, m) * 0.5 + 0.2;
        float w = (1.0 - alpha) * f;
        lumAcc += w * lit;
        fieldAcc += w * (ld * 0.55 + swirl * 0.45);
        alpha += w;
    }
    return vec3(lumAcc, fieldAcc / max(alpha, 1e-3), alpha);
}

// ============================================================================
// SKY — Van Gogh tile rings around the black sun, lattice spiralling in
// ============================================================================
vec3 sky(vec2 uv, float t, float sm) {
    // STARRY-FLOW: the tile rows follow a slow swirl field (Starry Night flow) instead of perfect
    // circles around the sun — breaks the concentric-ring read; the field drifts forward on galPh
    float tW = t < FADE_T8 ? FADE_T2 * .25 + max(t - FADE_T2, 0.0) * .06 : FADE_T2 * .25 + max(FADE_T8 - FADE_T2, 0.0) * .06 + 0.06 * EASE8;   // SHIVER-4: a moving clock inside noise() rocked the rows; it glides to a stop               // SHIVER-2: the warp clock re-anchored at swap, 4× slower — no jump, far less rocking
    vec2 sw = uv * 0.6 + vec2(t < FADE_T8 ? GAL_T2 * 0.04 + max(bs_galPh - GAL_T2, 0.0) * 0.015 : GAL_T2 * 0.04 + (GAL_T8 - GAL_T2) * 0.015 + 0.0008 * EASE8, 0.0);   // SHIVER-4: the scrolling offset displaced the rings in and out; it glides to a stop
    vec2 u = rotate2D(uv - SKY_C, noise(uv + tW) * .3 + SKY_ROT) + vec2(noise(sw), noise(sw + 5.3)) * 0.7;
    float yd = 60.;
    vec2 id = vec2((length(u) + .01) * yd, 0.);
    float xd = max(floor(id.x) * .09, .09);
    float h = (hash12(floor(id.xx)) * .5 + .25) * ((t + 10.) * .25 + FLOW_D * 0.15);   // MOTION: tile rings turn faster on bass
    vec2 tt = rotate2D(u, h);
    id.y = atan(tt.y, tt.x) * xd;
    vec2 lc = fract(id);
    id -= lc;
    vec2 cc = vec2(cos((id.y + .5) / xd), sin((id.y + .5) / xd)) * (id.x + .5) / yd;
    cc = rotate2D(cc, -h) + SKY_C;
    float clN = noise(cc * vec2(.5, 1) - vec2(t * .2 + FLOW_D * 0.3, 0));   // MOTION: clouds sweep faster on bass               // CLOUD-PRESENCE: clouds may sweep the whole frame, not just the upper part
    float clT = 0.012 - 0.006 * BODY;   // NO-SHIVER: the band edge no longer rides the energy envelope   // TILE-DANCE: the band's ragged edge advances with the energy envelope; BODY: mids-heavy sections spread it
    float cl = smoothstep(clT - 0.0015, clT + 0.0015, clN);
    lc += noise(lc * vec2(1, 4) + id) * vec2(.7, .2);
    // TILE-DANCE: every brush tile answers the music — the gold band leads, the blue tiles follow at a
    // quarter strength. Envelopes only (controller); per-tile hashed phases on a monotonic clock.
    float kT = mix(0.25, 1.0, cl);
    float hT = hash12(id + 7.3);
    float edgeN = 1.0 - smoothstep(0.0, 0.012, abs(clN - clT));          // tiles near the band edge
    float trebLit = 0.0;   // NO-SHIVER: treble brightens edge tiles (was a back-and-forth position jitter)
    float thX = 0.40;   // NO-SHIVER-3: tiles no longer thin with bass (the gaps breathed in and out)                         // bass: tiles thin, the dark gaps between them breathe open
    float thY = 0.45;            // mids: tiles stretch along their stroke
    float Lc = length(cc - vec2(bs_waveX, bs_waveY));
    float Rk = HOLE_R * 3.3 * 1.05 + bs_wAge * 1.5;                      // the distortion wavefront (same front as BIG-WAVES)
    float kFlash = exp(-pow((Lc - Rk) / 0.07, 2.0)) * bs_wAmp * exp(-bs_wAge * 1.5) * GATE;

    float L = length(uv - SKY_C);
    float ph = gPhase + 0.35 / (L + 0.35);                  // hue bends harder near the sun
    vec3 base = mcSky(12.0 + 0.8 * (0.5 + 0.5 * sin(sin(L - .1) + ph)), 0.55);   // VANGOGH-SKY: sky blue ↔ deep blue
    float bandK = floor(max(clN - clT, 0.0) / 0.022);                    // LSD-CLOUDS: contour band index from depth inside the cloud
    // SKY-CALM: the patchwork sits ~40% calmer by default, most of all around the sun so the sun owns the
    // centre — bands fade back toward the blue brush tiles (a hue move, never toward grey) and dim a touch.
    // K8 CLOUD CALM adds on top.
    float calmR = 0.40 * mix(1.0, 0.55, smoothstep(0.3, 1.5, L));
    float calm = clamp(calmR + CLOUD_CALM, 0.0, 0.92);
    vec3 tile = mix(mcSky(12.0 + 0.9 * hash12(id), 0.85), skyBand(bandK, 0.9 + 0.1 * hT), cl * (1.0 - calm));
    tile *= 1.0 - 0.5 * calmR * (1.0 - smoothstep(0.3, 1.2, L));   // blue brush-tiles; psychedelic contour-banded clouds
    tile *= 1.0 + (1.4 * kFlash * (1.0 - FADE_IN15) + 0.35 * bs_bassSus * GATE) * kT;
    tile *= 1.0 + FADE_IN18 * 0.45 * clamp(RAY_HATS * 1.5, 0.0, 1.0) * (0.5 + 0.5 * sin(length(cc - SKY_C) * 16.0 - FLX_D2 * 6.0 - bs_galPh * 2.0));   // AUDIO-PASS: treble shimmer ripples outward through the tiles   // NO-STROKE: the front no longer paints a lit ring on the tiles — pure refraction only
    vec3 f = mix(base * mix(0.45, 0.16, bs_night) * (0.85 - 0.3 * DYN), tile,   // DAY-BLUE: lit gaps by day, dark floor at night; DYN: dynamic music digs it deeper
                 st(abs(lc.x - .5), thX, sm * yd) * st(abs(lc.y - .5), thY, sm * xd));   // DARK-FLOOR3: the gaps between tiles are the dark floor
    f *= SKY_GLOW;

    // LATTICE: log-polar → it zooms into the hole forever (self-similar, monotonic), spiral arms
    vec2 d = uv - SKY_C;
    float ang = atan(d.y, d.x);
    vec2 q = vec2(ang / TAU * 6.0, log(max(L, 1e-3)) * 0.95 - t * 0.045);
    q.x += q.y * 0.5;
    vec3 lat = lattice(q, t);
    float vis = smoothstep(1.7, 0.30, L) * LATTICE_AMT;
    vec3 latCol = mc(14.0, 0.55 + 0.3 * lat.y) * lat.x * LATTICE_LIT * (1.0 + SPARK * 0.8 + 0.3 * AIR) * 1.6 * SPARKLE;   // + AIR: airy sections glint
    f = mix(f, f * 0.55 + latCol, clamp(lat.z, 0.0, 1.0) * vis);

    // sunlight scattered into the sky — hue-cycling bloom around the hole
    f *= 1.0 + (0.3 + 1.2 * bs_bassSus * GATE) * 0.8 / (1.0 + L * 6.0);   // SURGE-MULT: sunlight brightens the tiles already there (×), it never lays a flat peach layer over them   // sun-glow on the sand, swells with bass
    f *= mix(1.0, 0.75 + 0.5 * smoothstep(0.2, 1.6, L), gRoll * GATE);         // rolloff pushes light to the outer field
    return f * mix(1.0, mix(mix(0.80, 0.95, OG_SKY), mix(0.42, 0.66, OG_SKY), smoothstep(0.35, 1.5, L)), FADE_IN5);   // OG-SKY: the halo falloff eases back toward the bright patchwork   // SKY-HALO: radial falloff to a deep field (PERF: no per-pixel OKLCH round trip)
}
// FIBRE-COIL: one shear field for tendrils AND iris fibres. sl = log(r / root radius): > 0 out along
// the tendrils, < 0 inward through the iris toward the pupil — the same formula continued, so each
// fibre coils into its tendril as one strand with no seam at the root.
float fieldShear(float sl, float layer) {
    float curl = mix(0.20, 1.0, gCurl) * mix(-1.0, 1.0, gDir) * (1.0 - 0.35 * layer);   // SUN-RAYS: corona-streamer sway, gentler than the old snakes
    float wave = mix(1.2, 4.0, gWave);
    float flexA = mix(0.03, 0.16, gFlex) * (1.0 + 0.8 * bs_chaos) * (0.5 + 2.2 * bs_midsS);   // LEGIBLE mids/vocals: the tendrils sway
    float swayPh = gFlexPh * TAU * (layer < 0.5 ? 1.0 : 2.0);           // integer multiples → wrap-safe
    return gTwist * TAU * (layer < 0.5 ? 1.0 : -1.0)                  // whole field turns (rate-driven)
         + curl * sl                                                  // curl: shear grows along the strand
         + flexA * sl * sin(sl * wave - swayPh);                      // flex: travelling sway, root pinned
}


// ============================================================================
// BLACK SUN — horizon + photon ring + turbulent psychedelic corona + tilted disk
// ============================================================================
// EYE-PLASMA: plasma-family interference (Ether's nested sin-fold, as in plasma.frag and
// redaphid/wip/plasma-event-horizon) laid into the iris body, in polar coords around the pupil.
// Only integer multiples of the angle (no seam) and of the monotonic flow clock (wrap-safe); the
// log-radius term moves inward as the clock advances, so the plasma spirals down into the pupil like
// matter falling into the hole. Audio never enters a phase — it scales brightness at the call site.
float eyePlasma(float a, float lr, float flowA) {
    float v = sin(3.0 * a + 2.6 * lr + 2.0 * flowA
            + 1.3 * sin(2.0 * a - 3.1 * lr + flowA
            + 0.9 * sin(5.0 * a + 4.2 * lr + 3.0 * flowA)));
    return 0.5 + 0.5 * v;
}

// SUN-DISC: the centre is no longer black — a luminous plasma sun. Plasma-family nested sin-folds
// (plasma.frag / clean-plasma / plasma-event-horizon) in disc-local coords, differentially rotated
// (inner faster) on the unwrapped controller orbit clock; granulation cells; fine bright filament
// loops (treble); slow-palette magenta/violet veins along the plasma seams; limb-darkened. Audio:
// bass → brightness + turbulence amplitude, mids → flow rate (via bs_diskPh), kick → surface flare.
vec3 sunDisc(vec2 d, float R) {
    vec2 p = d / R;
    float x = length(p);
    float G = GATE;
    // NO-WINDING: differential rotation as two RIGIDLY rotating layers (inner fast, outer slow)
    // blended by radius — a single radius-dependent spin winds tighter forever into rings.
    float amp = 0.9 + 0.9 * gBass * G;                                       // bass: turbulence amplitude
    vec2 pi_ = rot2(bs_diskPh * 0.55) * p, po = rot2(bs_diskPh * 0.25) * p;
    float vi = sin(pi_.x * 3.1 + bs_diskPh * 0.7 + amp * sin(pi_.y * 4.3 - bs_diskPh * 0.5 + amp * 0.8 * sin(length(pi_) * 6.0 - bs_diskPh * 0.9 + pi_.x * 2.0)));
    float vo = sin(po.x * 3.1 + bs_diskPh * 0.7 + amp * sin(po.y * 4.3 - bs_diskPh * 0.5 + amp * 0.8 * sin(length(po) * 6.0 - bs_diskPh * 0.9 + po.x * 2.0)));
    float v = mix(vi, vo, smoothstep(0.25, 0.85, x));
    p = mix(pi_, po, smoothstep(0.25, 0.85, x));
    float v01 = 0.5 + 0.5 * v;
    float gran = noise(p * 9.0 + vec2(bs_diskPh * 0.15, -bs_diskPh * 0.1));   // convection cells
    float fil = pow(1.0 - abs(sin(v * 3.0 + p.y * 2.0)), 14.0);              // filament loops
    float mu = sqrt(max(1.0 - x * x, 0.0));                                  // limb darkening
    float T = clamp(0.25 + 0.5 * v01 + 0.3 * gran, 0.0, 1.0);
    vec3 c = mc(mix(11.0, 7.0, T), 0.6 + 0.4 * T) * (0.5 + 0.7 * mu);   // SUN-DISC2: brighter photosphere
    float seam = exp(-v * v / 0.02) * (0.5 + 0.5 * mu);
    c = mix(c, psyC(0.88 + 0.06 * sin(gPal * TAU), 0.42, 1.0), seam * 0.55);   // magenta/violet veins (slow palette)
    c += mc(14.0, 1.0) * fil * mu * (0.15 + 1.6 * gTreb * G);               // treble: filament glints
    c *= 0.7 + 1.1 * SUN_BREATH;                                            // NO-BEAT: only sustained bass breathes the sun
    float cM = max(max(c.r, c.g), max(c.b, 1e-4));
    float cK = cM < 0.55 ? cM : 0.55 + 0.33 * (1.0 - exp(-(cM - 0.55) / 0.33));
    return c * (cK / cM);
}

// STORY-HEAT: every sun colour runs through the story's temperature. Below 1 it cools toward red
// and ember and dims; above 1 it goes pale yellow (chroma falls as L rises — never white).
// NIGHT-SPACE: what the day sky turns into — indigo-black depth, a star field (soft, slow twinkle,
// dimmed where gas is dense) and nebula gas: the LSD contour bands as glowing filaments. Read in
// lensed coordinates, so the stars bend around the sun.
vec3 deepSpace(vec2 uv) {
    // GALAXY-AUDIO: the gas lies in spiral arms around the sun, and every part of it answers the
    // music — light and rate only. bass/kick: arm brightness + width breathe and the gas billows
    // (warp strength); mids: arm flow speed (bs_galPh, a rate); flux: a brightness wave running
    // outward along the arms (bs_fluxPh); treble: glints on the arm crests + star twinkle depth;
    // roughness/entropy: turbulence; drops/sections/supernova: the spiral winds tighter (bs_wind).
    float G = GATE;
    uv = SKY_C + rot2(-FLOW_D * 0.035) * (uv - SKY_C);   // MOTION: the whole sky turns round the giant on the bass-rated clock (we orbit it); forward only
    vec3 c = pow(gamutLch(vec3(0.21, 0.09, radians(268.0))), vec3(1.0 / 2.2));   // NIGHT-FLOOR: +0.05 L — moody, not off   // NIGHT-NAVY: a true navy-black floor (L 0.25 read as a grey veil); the gas carries the brightness
    vec2 dS = uv - SKY_C;
    float rS = max(length(dS), 1e-3), aS = atan(dS.y, dS.x), lr = log(rS);
    float arm = 0.5 + 0.5 * cos(2.0 * aS - 3.2 * lr + bs_galPh + FLOW_D * 0.5);   // MOTION: arms stream outward faster on bass   // integer angle multiple → no seam
    float armM = pow(arm, mix(3.5 - 0.8 * BODY, 1.2, clamp(bs_bassSus * G * 1.3, 0.0, 1.0)));   // LEGIBLE bass sustain: the arms widen and breathe   // bass/kick: arms widen
    float turb = 1.0 + 1.2 * bs_billow + 0.5 * bs_chaos;                                    // NO-SHIVER: warp amplitude eases slowly (bs_billow), never per-beat
    vec2 q = uv * 1.1 + vec2(1.0, 0.35) * (bs_galPh * 0.12 + FLOW_D * 0.04);                 // FORWARD: the gas streams one way on the monotonic flow clock
    float dens = smoothstep(mix(0.22, 0.36, FADE_IN5), mix(0.62, 0.74, FADE_IN5), s_noise(q * 0.7) * 0.6 + s_noise(q * 1.6 + 4.1) * 0.4);   // GAS-LIFT: more veil, still gapped
    vec2 w = q + vec2(noise(q * 1.3), noise(q * 1.3 + 7.7)) * turb;            // FORWARD: no clock inside the warp
    float v = 0.5 + 0.5 * sin(w.x * 2.2 + sin(w.y * 2.7));
    float fil = exp(-pow(sin(w.x * 3.3 + w.y * 1.4), 2.0) / 0.03);
    vec3 gasCool = pow(gamutLch(vec3(0.68, 0.13, radians(250.0 + AW_TILT + 15.0 * sin(gPal * TAU)))), vec3(1.0 / 2.2));   // SPLIT-COMP: indigo filaments against the warm veils
    vec3 gas = mix(gasHue(v + 0.3 * fil, 0.62), gasCool, smoothstep(0.25, 0.85, fil) * 0.8);
    float fwave = exp(-pow(fract(lr * 0.35 - bs_fluxPh * 0.25) - 0.5, 2.0) / 0.006) * 0.0;
    float gasLit = (0.4 + 1.6 * armM) * (0.6 + 1.8 * bs_bassSus * G);   // LEGIBLE bass sustain: big slow swell of the gas   // BUDGET: the surge lands on the arms (contrast), not the whole field
    float veil = dens * (0.4 + 0.6 * fil) * (1.0 - 0.3 * DYN) * (1.0 + AW_GAS);   // DYN: dynamic music opens wider gaps of empty space                       // TRANSLUCENT: thin veils, wide clear gaps of open space
    c += gas * veil * gasLit * mix(1.7, 1.1, FADE_IN5);   // DARK-FLOOR-2: veils back to ×1.1, wider gaps   // NIGHT-FLOOR: veils ×2.5
    float crest = smoothstep(0.8, 1.0, arm) * pow(max(0.0, sin(w.x * 9.0 + w.y * 5.0)), 18.0);
    c += pow(gamutLch(vec3(0.85, 0.08, radians(85.0))), vec3(1.0 / 2.2)) * crest * 0.0;          // treble glints on the crests
    vec2 sg = uv * 34.0;
    vec2 cid = floor(sg);
    float hs = hash12(cid);
    vec2 sp = fract(sg) - 0.5 - (hash22(cid + 3.1) - 0.5) * 0.3;   // ROUND-STARS: centre stays ≥ 0.35 from the cell edge
    // STAR-AUDIO: stars carry the fast music. treble: ±60% twinkle on per-star hashed slow phases (the
    // envelope is smoothed, so no flicker); kicks swell the brightest stars to 2–3 px
    float tw = max(1.0 + (0.85 + 0.9 * FADE_IN18) * clamp(gTreb * 1.8, 0.0, 1.0) * G * sin(bs_time * 1.3 + hs * 40.0) - 0.2, 0.0);   // AUDIO-PASS: harder twinkle   // LEGIBLE hats: the star field twinkles
    float big = step(0.975, hs);
    float star = step(0.9 - 0.02 * (SPARKLE - 1.0), hs) * exp(-dot(sp, sp) / (0.012 * (1.0 + big * 3.0 * clamp(gTreb * 1.5, 0.0, 1.0) * G))) * smoothstep(0.34, 0.18, length(sp)) * tw;   // ROUND-STARS: windowed inside the cell; SPARKLE adds count, not radius
    c += mix(vec3(0.75, 0.8, 1.0), vec3(1.0, 0.85, 0.7), hash12(cid + 9.0)) * star * 1.6 * min(SPARKLE, 2.5) * (0.85 + 0.35 * AIR) * (1.0 - 0.6 * dens) * smoothstep(0.4, 0.8, bs_night) * (1.0 - FADE_IN23);   // AUDIO-WEB: the stars move to starLayer()
    float cM = max(max(c.r, c.g), max(c.b, 1e-4));
    float cK = cM < 0.7 ? cM : 0.7 + 0.2 * (1.0 - exp(-(cM - 0.7) / 0.2));
    return c * (cK / cM);
}

// AUDIO-WEB/STARS (critic #69): the starfield left with the 02:16 act change. deepSpace() gates its stars on
// bs_night and is not drawn at all on day backdrops, so the stars are their own layer now, over every backdrop:
// small round stars; the brighter tier twinkles on the hats (trebleZ); kurtosis lifts the field a touch.
vec3 starLayer(vec2 uv) {
    uv = SKY_C + rot2(-FLOW_D * 0.035) * (uv - SKY_C);   // turns with the sky round the giant
    vec2 sg = uv * 34.0;
    vec2 cid = floor(sg);
    float hs = hash12(cid);
    vec2 sp = fract(sg) - 0.5 - (hash22(cid + 3.1) - 0.5) * 0.3;
    float big = step(0.965, hs);
    float tw = 1.0 + 0.25 * clamp(gTreb * 1.8, 0.0, 1.0) * GATE * sin(bs_time * 1.3 + hs * 40.0);
    tw += big * 0.8 * AW_HATS * (0.5 + 0.5 * sin(bs_time * 2.3 + hs * 57.0));
    float star = step(0.9 - 0.02 * (SPARKLE - 1.0), hs) * exp(-dot(sp, sp) / (0.012 * (1.0 + big * 1.5))) * smoothstep(0.34, 0.18, length(sp)) * max(tw, 0.0);
    vec3 sc = mix(vec3(0.75, 0.8, 1.0), vec3(1.0, 0.85, 0.7), hash12(cid + 9.0)) * star * 0.9 * min(SPARKLE, 2.5) * (0.85 + 0.35 * AIR) * (1.0 + AW_STAR);
    float m = max(max(sc.r, sc.g), max(sc.b, 1e-4));
    return sc * ((m < 0.55 ? m : 0.55 + 0.3 * (1.0 - exp(-(m - 0.55) / 0.3))) / m);
}

vec3 sunLchK(float L, float C, float hDeg, float keepL) {
    float hc = clamp(gHeatOv >= 0.0 ? gHeatOv : bs_heat, 0.0, 1.6);
    if (hc < 1.0) {   // NO-MAGENTA: cooling stops at crimson
        hDeg = max(hDeg - (1.0 - hc) * 62.0, 22.0); L *= mix(0.45 + 0.55 * hc, 0.85 + 0.15 * hc, keepL); C *= 0.85 + 0.15 * hc; }
    else { L = min(L + (hc - 1.0) * 0.22, 0.88); C *= 1.0 - (hc - 1.0) * 0.6; hDeg += (hc - 1.0) * 12.0; }
    return pow(gamutLch(vec3(L, C, radians(hDeg))), vec3(1.0 / 2.2));
}
vec3 sunLch(float L, float C, float hDeg) { return sunLchK(L, C, hDeg, 0.0); }

// STORY-NEBULA: the scene dissolving into pure plasma (bs_abstract) — domain-warped flow through the
// LSD band palette, drifting on the orbit clock. Dim enough to sit under the sun.
vec3 nebula(vec2 p) {
    // NEBULA-AUDIO: this layer dominates NEBULA/REBIRTH, so it must answer the music from across the
    // room. bass: warp displacement (the gas bulges) + brightness; kick: a surge ×1.5 that billows
    // outward from the sun; mids: flow speed rides bs_galPh; flux: a brightness wave out along the
    // filaments; treble: glints on the filaments. Light/amplitude/rate only.
    float G = GATE;
    p = SKY_C + rot2(-FLOW_D * 0.035) * (p - SKY_C);   // MOTION: the veils turn round the giant with the sky
    vec2 dS = p - SKY_C;
    float rS = length(dS);
    // FORWARD: the field TRANSLATES with the monotonic flow clock (it streams one way), and the warp
    // terms carry no clock — a clock inside sin() moves the field back and forth, which read as shiver.
    vec2 q = p * 1.2 + vec2(1.0, 0.35) * (bs_galPh * 0.15 + FLOW_D * 0.05);   // MOTION: veils stream on bass
    q += normalize(dS + 1e-4) * 0.3 * bs_billow * exp(-rS * 0.6);                     // NO-SHIVER: the bulge eases in over seconds, it never pumps per beat
    q += vec2(noise(q * 0.9), noise(q * 0.9 + 3.7)) * (1.4 + 0.8 * bs_chaos + 0.6 * bs_billow);
    for (float i = 1.0; i < 4.0; i++) q += sin(q.yx * (1.1 * i) + vec2(1.3, 2.1) * i) / i * 0.5;
    float v = 0.5 + 0.5 * sin(q.x * 1.7 + sin(q.y * 2.1));
    vec3 c = gasHue(v, 0.55);
    float fil = exp(-pow(sin(q.x * 3.0 + q.y), 2.0) / 0.02);
    float surge = 0.0;   // kick: the bright gas flares (patches, not a painted ring)
    float fwave = 0.0;  // flux wave along the filaments
    float lit = (0.4 + 0.35 * v) * (0.6 + (0.4 + 1.6 * smoothstep(0.45, 0.95, v)) * bs_bassSus * G) * (1.0 + 0.5 * surge);   // BUDGET: only the bright veils surge
    float dn = smoothstep(0.25, 0.85, s_noise(q * 0.45 + 2.3));             // TRANSLUCENT: density with clear gaps
    vec3 o = (c * lit + c * fil * (0.3 + 0.8 * fwave)) * dn;
    o += pow(gamutLch(vec3(0.86, 0.08, radians(85.0))), vec3(1.0 / 2.2)) * fil * 0.0 * 0.6;
    float oM = max(max(o.r, o.g), max(o.b, 1e-4));
    return o * ((oM < 0.65 ? oM : 0.65 + 0.2 * (1.0 - exp(-(oM - 0.65) / 0.2))) / oM);
}

vec3 plasmaBall(vec3 col, vec2 d, float R, float m) {
    float G = GATE;
    // SMALL-PULSE: a small or distant star pulses harder — swell and brightness scale inversely with
    // its radius (tiny DYING/REBIRTH sun or the companion: big kick swell; red giant: subtle)
    float pk = clamp(0.22 / max(R, 0.02), 0.6, 2.6);
    vec2 p = d / R;
    float x = length(p);
    float z = sqrt(max(1.0 - x * x, 0.0));                                   // sphere bulge
    vec2 q = p * (1.0 + 0.55 * (1.0 - z));                                   // texture compresses toward the limb → reads as a ball
    float swirl = 0.7 + 0.6 * bs_chaos;                  // bass: turbulence amplitude; story chaos
    // two rigidly rotating layers (inner fast, outer slow), blended by radius — no winding into rings
    vec2 qi = rot2(bs_diskPh * 0.45) * q, qo = rot2(bs_diskPh * 0.2) * q;
    vec2 qq = mix(qi, qo, smoothstep(0.2, 0.9, x));
    vec2 w = vec2(noise(qq * 1.7 + vec2(bs_diskPh * 0.21, 0.0)), noise(qq * 1.7 + vec2(5.2, -bs_diskPh * 0.17)));
    qq += w * 1.1 * swirl;                                                   // domain warp → curling, never straight
    for (float i = 1.0; i < 4.0; i++) qq += sin(qq.yx * (1.3 * i) + vec2(bs_diskPh * 0.35, -bs_diskPh * 0.27) * i) / i * 0.45 * swirl;
    float v = sin(qq.x * 2.6 + sin(qq.y * 3.1));
    // PLASMA-RICH: large swirl + two finer boiling octaves (granulation), all forward-flowing
    float gran = noise(qq * 7.0 + bs_diskPh * 0.1) * 0.6 + noise(qq * 15.0 - bs_diskPh * 0.17) * 0.4;
    float T = clamp(0.5 + 0.34 * v + 0.42 * gran + 0.35 * GRIT * (gran - 0.5), 0.0, 1.0);   // GRIT: rough sections boil harder (contrast only, mean kept)
    // magnetic arcs: thin bright curves where the warped field crosses zero; width floored by the
    // pixel footprint so they never alias into flicker
    float hot = 1.0 * (1.0 + 1.4 * bs_nova);   // CORE-HOT2: rest at 0.9, not 0.6 — the 0.6 rest was why the core sat below its corona   // bass core swell + kick surge; the supernova flash (knee-limited below)
    // PLASMA-RICH: a designed hot ramp, continuous — deep magenta/crimson lanes (chroma kept high at
    // low L, so they never read as mud) → red-orange → gold → pale-gold core. Spherical shading on top.
    float L = mix(0.80, 0.60, x * x) * mix(0.50, 1.0, T) + 0.06 * z;   // GIANT-SURFACE: deeper granulation lanes + limb darkening   // BLEND: the limb ends at the corona's own lightness — no dark rim to read as a circle   // BALL-BOIL: stronger cell contrast now the line work is gone
    L += 0.0;       // CORE-PULSE: the core breathes ±~25% with bass/kick   // BALL-HOT: hot yellow-gold core, the brightest thing on screen
    float Tr = clamp(T * (1.0 - 0.35 * x * x), 0.0, 1.0);
    float hue = Tr < 0.5 ? mix(24.0, 48.0, Tr * 2.0) : mix(48.0, 92.0, Tr * 2.0 - 1.0);   // NO-MAGENTA: lanes are deep crimson, not magenta
    vec3 ball = sunLchK(clamp(L, 0.36, 0.90), mix(0.21, 0.15, Tr), hue, 1.0 - x * x) * hot;   // VIVID: richer chroma   // CORE-HOT: a cool act shifts the core's hue but barely dims it — the core stays brighter than corona and rays in every act; only the limb takes the full cooling
    // NO-OUTLINE2: no line work on the surface at all — any thin bright curve over the cell pattern read
    // as an outline around the dark lanes. Treble now makes the hottest granules sparkle instead.
    ball += sunLch(0.86, 0.12, 84.0) * pow(smoothstep(0.55, 1.0, gran), 4.0) * z * 0.15;
    float bM = max(max(ball.r, ball.g), max(ball.b, 1e-4));
    float bK = bM < 0.7 ? bM : 0.7 + 0.22 * (1.0 - exp(-(bM - 0.7) / 0.22));
    ball *= bK / bM;
    float inside = 1.0 - smoothstep(0.62, 1.12, x);                         // SOFT-LIMB/BLEND: the ball dissolves into corona + ray roots over its outer ~40% — no edge to point at
    // corona boiling off the limb, red-orange, bleeding into the ray roots; flux throws flares
    float ang = atan(p.y, p.x);
    float boil = noise(vec2(ang * 3.0 / TAU * 6.0, x * 2.0 - bs_diskPh * 0.4)) * 0.5 + 0.5;
    float flare = 0.0;
    float cor = exp(-max(x - 0.75, 0.0) * mix(7.0, 3.5, boil * 0.6 + flare)) * (1.0 - 0.5 * inside) * 0.55;   // BLEND: corona overlaps the limb on both sides   // HAZE-CUT: steeper corona falloff
    vec3 corona = sunLch(0.66, 0.16, mix(34.0, 52.0, boil)) * cor;   // same hue band as the limb and the ray roots
    col = col * (1.0 - 0.6 * clamp(cor * 1.8, 0.0, 1.0)) + corona;   // NO-GREY-HALO: the glow occludes the blue under it (L down first) instead of adding orange onto blue → grey
    return mix(col, ball, inside);
}

vec3 blackSun(vec3 col, vec2 d, float t, float m) {   // m = EYE morph 0..1 (one-way)
    float RH = HOLE_R;
    float r = max(length(d), 1e-4);
    float a = atan(d.y, d.x);

    // turbulent log-polar corona (integer angular multiples → seamless)
    vec2 q = vec2(a * 3.0, log(r / RH) * 2.6 - t * 0.35);
    for (float i = 1.0; i < 6.0; i++) q += sin(q.yx * i + vec2(t * 0.5, -t * 0.3) + i * 1.7) / i * 0.55;
    float rays = 0.5 + 0.5 * cos(q.x * 2.0 + q.y * 0.6);
    float reach = RH * (0.55 + 0.9 * rays + FLARE * 0.9 + 1.8 * gFlux * GATE) * (0.9 + 0.25 * PUNCH);   // PUNCH: a punchy low end reaches further   // AUDIO-5X: flux throws flares
    float env = exp(-max(r - RH, 0.0) / reach);
    vec3 corona = mc(14.0, 0.75 + 0.2 * rays) * env * (0.55 + 0.75 * rays) * CORONA_GLOW * GLOW * (1.0 + 2.0 * gFlux * GATE);   // orange ↔ coral flares

    // photon ring
    float pr = exp(-pow((r - RH * 1.06) / (RH * 0.05), 2.0));
    vec3 ring = mc(14.0, 0.8) * pr * 0.35 * (1.0 - m);   // KICK-WAVES: faint photon ring on the black hole only; gone once the eye forms, no kick slam

    float outside = smoothstep(RH * 0.98, RH * 1.03, r);
    col = mix(sunDisc(d, RH), col, outside);   // NO-BEAT: the disc no longer swells per kick   // SUN-DISC replaces the black horizon
    vec3 cAdd = (corona * (1.0 - 0.55 * m) + ring) * outside;
    col = col * (1.0 - 0.5 * clamp(max(cAdd.r, max(cAdd.g, cAdd.b)) * 1.5, 0.0, 1.0)) + cAdd;   // NO-GREY-HALO: occlude, don't stack orange on blue

    // PLASMA-BALL: the eye is one powerful glowing plasma sphere — no black, no straight spokes. The
    // sun disc swells into it as the morph runs. Domain-warped plasma with curling magnetic arcs over a
    // bulged (spherical) surface, bright volumetric core, limb glow, and a corona boiling off the edge
    // into the ray roots. Audio, all light/rate: bass swells the ball and its core, mids spin the
    // surface (bs_diskPh rate), treble crackles the arcs, flux throws limb flares, kicks surge it.
    float G = GATE;
    float RI = HOLE_R * 3.3;
    float pupR = RH * (1.0 - 0.16 * gPump * G * m);           // the shutter closes down to this
    float RB = mix(RH, RI * 0.92, m);
    col = plasmaBall(col, d, RB, m);

    // SHUTTER: on a section change the eye resizes behind a camera aperture — N overlapping blades
    // swing in (spiral edges) and out again while bs_shutterAng turns them. Cover is 0 between events.
    if (bs_shutter > 0.001) {
        float N = 8.0, seg = TAU / N;
        float ang = a - bs_shutterAng * TAU - 0.9 * log(r / RH);           // spiral blade edges
        float local = mod(ang, seg) - 0.5 * seg;
        float apR = mix(RI, pupR * 0.9, bs_shutter);                       // aperture closes to the pupil and reopens
        float poly = r * cos(local) / cos(0.5 * seg);                      // N-gon distance
        float blade = smoothstep(apR - 0.004, apR + 0.004, poly) * (1.0 - smoothstep(RI * 1.0, RI * 1.06, r));
        float edge = exp(-pow((poly - apR) / (RH * 0.04), 2.0)) + 0.6 * exp(-pow(local / 0.02, 2.0)) * step(apR, poly);
        vec3 bladeC = mc(10.0, 0.45 + 0.25 * (0.5 + 0.5 * cos(local * N))) + mc(8.0, 0.9) * edge * 0.8;
        col = mix(col, bladeC, blade * smoothstep(0.0, 0.25, bs_shutter));
    }

    // GARGANTUA: tilted accretion disk around the shadow (black-hole phase; a ghost of it stays as the
    // eye forms). Analytic 2D lensing: the near side crosses in front of the shadow, the far side is
    // lensed UP and over the top (and faintly under) as a ring hugging the shadow; thin photon ring;
    // Doppler beaming — the approaching side hot pale gold, the receding side ember. Turbulence turns
    // on the monotonic controller clock bs_diskPh, inner orbits faster than outer.
    float G2 = GATE;
    float diskAmp = (0.45 + 1.6 * gBass * G2 + 0.8 * gKick * G2) * (1.0 - m);   // NO-HAT: the disk belongs to the black-hole phase; a ghost of it over the ball read as a dome     // AUDIO-5X: bass + kick flare
    vec3 diskSum = vec3(0.0);
    vec2 dd = rot2(-0.12) * d;
    float incl = 0.20;                                                     // edge-on squash
    vec2 de = vec2(dd.x, dd.y / incl);
    float er = length(de);
    float ea = atan(de.y, de.x);
    float rin = RH * 1.45, rout = RH * 5.5;
    float bandP = smoothstep(rin, rin * 1.12, er) * (1.0 - smoothstep(rout * 0.7, rout, er));
    // NO-WINDING: inner and outer disk rotate rigidly at different speeds and blend by radius
    // (a radius-dependent orbit phase winds into ever-tighter rings).
    float turbI, turbO;
    {
        vec2 qd = vec2(ea * 4.0 + bs_diskPh * 4.0, log(er / RH) * 2.4);
        for (float i = 1.0; i < 4.0; i++) qd += sin(qd.yx * i + i * 1.3) / i * (0.45 + 0.5 * gMids * G2);   // mids: turbulence
        turbI = 0.5 + 0.5 * sin(qd.x + qd.y * 0.5);
        qd = vec2(ea * 4.0 + bs_diskPh * 1.6, log(er / RH) * 2.4);
        for (float i = 1.0; i < 4.0; i++) qd += sin(qd.yx * i + i * 1.3) / i * (0.45 + 0.5 * gMids * G2);
        turbO = 0.5 + 0.5 * sin(qd.x + qd.y * 0.5);
    }
    float turb = mix(turbI, turbO, smoothstep(rin, rout * 0.7, er));
    turb = mix(0.5, turb, 0.7 + 0.6 * gMids * G2);
    float dop = 0.5 + 0.5 * cos(ea);                                       // approaching side = +x
    float glint = pow(turb, 10.0) * clamp(gTreb * 2.5, 0.0, 1.0) * G2;    // treble hot spots
    vec3 diskC = sunLch(0.55 + 0.2 * turb, 0.19, mix(24.0, 40.0, dop)) * (0.35 + 1.1 * dop * dop);   // DISK-MAGENTA: hot magenta/red so it separates from the gold ball
    diskC += mc(14.0, 1.0) * glint * 1.5;
    // near (front) half of the primary image: drawn over the shadow
    float front = step(dd.y, 0.0);
    diskSum += diskC * bandP * diskAmp * mix(outside, 1.0, front) * (0.5 + 0.5 * turb);
    // lensed far side: a ring hugging the shadow, bright over the top, faint underneath
    float sa = atan(dd.y, dd.x);
    float halo = exp(-pow((r - RH * 1.42) / (RH * 0.26), 2.0)) * outside;
    float over = mix(0.30, 1.0, smoothstep(-0.4, 0.7, sin(sa)));
    vec2 q2 = vec2(sa * 4.0 + bs_diskPh * 2.4, log(r / RH) * 2.4);
    for (float i = 1.0; i < 3.0; i++) q2 += sin(q2.yx * i + i * 2.1) / i * 0.5;
    float turb2 = 0.5 + 0.5 * sin(q2.x + q2.y * 0.5);
    float dop2 = 0.5 + 0.5 * cos(sa);
    diskSum += sunLch(0.55 + 0.15 * turb2, 0.18, mix(24.0, 40.0, dop2)) * halo * over * (0.4 + 0.6 * turb2) * (0.3 + 0.9 * dop2) * diskAmp * 0.9;
    // photon ring: thin, hugging the shadow, swells with the bass
    float prW = RH * (0.018 + 0.03 * gBass * G2);
    float pr2 = exp(-pow((r - RH * 1.04) / prW, 2.0));
    diskSum += mc(mix(9.0, 7.0, dop2), 0.95) * pr2 * (0.5 + 1.6 * gBass * G2 + 0.8 * gKick * G2) * (1.0 - m);   // photon ring only in the black-hole phase — no gold outline on the ball
    float dM = max(max(diskSum.r, diskSum.g), max(diskSum.b, 1e-4));
    float dK = dM < 0.5 ? dM : 0.5 + 0.35 * (1.0 - exp(-(dM - 0.5) / 0.35));
    col = col * (1.0 - 0.5 * clamp(dM, 0.0, 1.0)) + diskSum * (dK / dM);   // GARGANTUA: knee-limited, and the disk occludes what's behind it
    return col;
}

// ============================================================================
// TENDRILS (TENDRILS-CONT) — the urchin, rebuilt as continuous curves rooted on the limbal ring and
// running out past the frame edge. Log-polar around the eye: the whole field shares one curl
// (shear in log-radius) + one sway, so each pixel only checks its own tendril and its neighbours.
// Shape ← slow stats (controller-smoothed); motion ← monotonic phases whose RATE audio sets; light ←
// smoothed envelopes. Nothing audio-driven touches an angle directly.
// ============================================================================
vec4 tendrilLayer(float a, float sl, float N, float layer, float m) {
    float wave = mix(1.2, 4.0, gWave);
    float swayPh = gFlexPh * TAU * (layer < 0.5 ? 1.0 : 2.0);
    float shear = fieldShear(sl, layer);
    shear += gBendAmt * min(sl, 2.5) * sin(gBendDir - a);           // COMPANION: rays lean toward the other star (gravity / magnetic pull)
    float x = (a - shear) / TAU * N;
    vec3 acc = vec3(0.0); float cov = 0.0;
    for (float k = -1.0; k <= 1.0; k++) {
        float id = floor(x) + k;
        float h = hash12(vec2(id - N * floor(id / N), layer * 7.31 + 3.0));
        float own = 0.10 * sl * sin(sl * wave * 0.7 - swayPh + h * TAU);   // per-ray sway (< half a cell)
        float dx = x - (id + 0.5 + own / TAU * N);
        // SUN-RAYS: a few long dominant rays among many short thin ones; wide glowing base at the eye,
        // tapering to a fine fading tip; soft volumetric falloff across the ray, no tube rim.
        float major = step(0.68, h);
        float reachA = (0.8 + 0.7 * bs_build) * sqrt(max(bs_power, 0.05));   // LEGIBLE build: rays lengthen as the energy builds   // story power: reach   // AUDIO-5X: ray reach pumps with bass/energy envelopes
        float len = reachA * (major > 0.5 ? mix(1.6, 2.6, gLen) * (0.9 + 0.3 * fract(h * 7.13))
                                : mix(0.45, 1.3, gLen) * (0.55 + 0.9 * fract(h * 3.71)));   // reach in log-radius (edge ≈ 1.7)
        // FAR-REACH: in reach mode (bs_reach) a ray's length is set in SCREEN distance, not relative to
        // the ball — a tiny sun throws rays past the frame edges. Bass/energy still pump it (reachA).
        float far = log(max(reachA * (major > 0.5 ? mix(2.6, 3.4, fract(h * 5.3)) : mix(1.0, 2.2, fract(h * 2.9))) / max(gR0, 1e-3), 1.2));
        len = mix(len, max(len, far), bs_reach);
        float u = sl / len;                                              // 0 base → 1 tip
        if (u >= 1.0) continue;
        float w = mix(0.36, 0.66, gThick) * (major > 0.5 ? 1.0 : 0.5)   /* SUN-RAYS2: glowing bases — DARK-FLOOR: slimmer so the blue ground survives */ * (1.0 - 0.45 * layer)
                * (1.0 - 0.82 * u) / (1.0 + 0.45 * sl);
        w = max(w, 0.02) * 0.75;                  // HAZE-CUT: slimmer at rest; HAZE-CAP: half the bass width pump (loud frames flooded the sky pink)                  // bass: glow width pumps with the brightness
        float e = exp(-pow(dx / w, 2.0));                                // body glow
        float halo = exp(-abs(dx) / (w * 2.4));                          // light thrown onto the sky
        float core = exp(-pow(dx / (w * 0.30), 2.0));                    // hot filament
        float I = smoothstep(-0.05, 0.3, sl) * pow(1.0 - u, 1.2)   /* NO-SPOKES: roots fade up just outside the ball body, so bright rays never show as straight spokes across it */ * (major > 0.5 ? 1.0 : 0.7) * bs_power   // fades with distance from the eye; story power: brightness
                * 0.75;   /* SURGE-GAIN: the big bass/kick surge is applied after compositing as a gain on what's there (see SURGE-GAIN below) */   /* CALM-1: lower rest + softer kick — lum was 0.5, flicker 0.68 */                    // AUDIO-5X: bass + kick pump the rays (rest lower → headroom to pump into)
        float G = GATE;
        float flux = 0.0;   // flux pulses run outward
        float grain = 1.0 - 0.8 * gRough * G * (0.5 + 0.5 * cos(sl * 38.0 + h * 40.0));                  // roughness crackle
        float grad = mix(1.45 - 0.9 * u, 0.55 + 0.9 * u, gCentroid);                                       // centroid: bright bases ↔ bright tips
        float rootBoost = 1.0;                                   // bass floods the bases
        float lit = grad * grain;   // SUN-RAYS3: rays read as light even in a quiet passage
        float rHue = mix(88.0, 24.0, pow(u, 0.8))   /* NO-MAGENTA: tips end crimson */ + 15.0 * (h - 0.5) * 2.0 - (layer > 0.5 ? 18.0 : 0.0);   // RAY-GRADE: yellow root → amber → ember → red-magenta tip, ±15° per ray
        vec3 rayC = sunLch(mix(0.80, 0.62, u) * (0.75 + 0.25 * core), 0.16, rHue);
        vec3 c = rayC * (1.3 * e + 0.07 * halo + 0.7 * core) * lit * I;
        float tipSpark = pow(max(0.0, cos(sl * 14.0 - gFlow * TAU * 4.0 + h * TAU)), mix(18.0, 6.0, clamp(gTreb * 1.5, 0.0, 1.0))) * smoothstep(0.25, 0.9, u);   // treble: sparks thicken and race out; low spatial freq so they don't shimmer
        c += mc(14.0, 1.0) * tipSpark * core * clamp(gTreb * 3.0, 0.0, 1.0) * G * 3.2 * smoothstep(1.0, 0.8, u);   // LEGIBLE hats: glints race out at the tips
        // LEGIBLE snare: one bright spark ring bursts out along every ray per mid-band hit — countable
        float snF = exp(-pow((u - bs_snAge * 1.15) / 0.04, 2.0)) * bs_snAmp * pow(1.0 - bs_snAge, 2.0) * (layer < 0.5 ? 1.0 : 0.5);   // eased fade as the ring flies out
        c += pow(gamutLch(vec3(0.86, 0.12, radians(95.0))), vec3(1.0 / 2.2)) * snF * (0.6 * e + 1.2 * core) * 2.2;   // AUDIO-5X   // treble: gold glints race out along the rays
        if (layer < 0.5 && abs(mod(id, N) - floor(bs_fId * N)) < 0.5) {      // FLUX-FLARE: a plasma blob breaks off the limb and rides one ray out
            float fb = exp(-pow((u - bs_fAge * 1.1) / 0.07, 2.0)) * (1.0 - bs_fAge) * bs_fAmp;
            c += sunLch(0.82, 0.14, 70.0) * fb * e * 2.2;
        }
        acc += c;                                                        // rays EMIT: light adds, the final soft-limit keeps it off white
        cov = max(cov, e * I);
    }
    return vec4(acc, cov);
}

// returns (colour, cover); q = position relative to the eye
vec4 urchin(vec2 q, float m) {
    float r = max(length(q), 1e-4);
    float a = atan(q.y, q.x);
    float r0 = mix(HOLE_R * 1.4, HOLE_R * 3.3 * 0.86, m);              // roots start inside the iris and grow out of its fibres
    gR0 = r0;
    float sl = log(r / r0);
    if (sl < -0.12) return vec4(0.0);                                  // SOFT-LIMB: roots start inside the limb and fade up through the glow
    vec4 back = tendrilLayer(a, sl, 41.0, 1.0, m);                    // thin, counter-turning
    vec4 front = tendrilLayer(a, sl, 26.0, 0.0, m);                   // fat, the main field
    vec4 o;
    o.rgb = front.rgb + back.rgb * 0.6;   // SUN-RAYS: light from both layers adds
    o.a = max(front.a, back.a * 0.8);
    return o;
}

// JULIA-ARMS (moody-octopus family): the sun's tendrils are the escape field of a Julia set centred
// on the core. c rides the 0.7885 circle on the mids-rated gas clock (one-way drift, never audio in
// phase); the field turns on the orbit clock so the arms curl. Audio: brightness, reach, glints.
vec4 juliaArms(vec2 d, float m) {
    float RBj = mix(HOLE_R, HOLE_R * 3.3 * 0.92, m);
    float r = max(length(d), 1e-4);
    float a0 = atan(d.y, d.x);
    float a = a0 + BUD_PH * 0.03 + SPIN_LOUD + FLOW_D * 0.03 + 0.25 * sin(a0 + BUD_PH * 0.004) + 0.12 * sin(2.0 * a0 + 1.7);   // LIVING: uneven arm spacing, drifting forward
    float th = 4.97;   // NO-SINE-C: c circles its seahorse point on a forward phase instead of swinging
    float thT = 4.97 + 0.30 * sin(6.2831853 * bs_jTurn);   // TRIP: c wanders the connected band on a forward clock
    float cPh = bs_galPh * 0.05 + max(bs_fluxPh - C_FLUX0, 0.0) * 0.03 + FLX_D2 * 0.08 + FLOW_D * 0.25;   // MOTION: c travels faster on bass, the arms' detail churns   // AUDIO-PASS: c drifts faster on flux   // FAN-FOLLOW: c's forward circle speeds up on busy mids + flux (~3-4x), never reverses
    vec2 c = mix(0.7885 * vec2(sin(th), cos(th)) + 0.018 * vec2(cos(cPh), sin(cPh)), bs_jR * vec2(sin(thT), cos(thT)), bs_trip);
    // OCTO-ARMS: z0 = (r/S)^0.7 · e^{3ia}. Cubing the angle turns the set's 2-fold symmetry into six
    // arms; the soft radial power stretches the boundary band into long arms reaching ~S·2 out.
    float S = FAN_S * (1.0 + 0.22 * sin(a0 + 2.1) + 0.12 * sin(3.0 * a0 + 0.4)) * (1.0 + 0.6 * bs_julia * bs_trip);   // K6 REACH adds length; uneven arm lengths
    if (r > S * 2.6 || r < RBj * 0.6) return vec4(0.0);   // PERF: no iterations outside the arm annulus
    float rr0 = pow(r / S, 0.7);
    a += 0.52 * log(max(r / S, 0.05));   // CURL: ~30° of twist along each arm (turns with BUD_PH above)
    vec2 z = rr0 * vec2(cos(3.0 * a), sin(3.0 * a));
    vec2 dz = vec2(1.0, 0.0);
    float n = 0.0, tPt = 1e3, tLn = 1e3, tCi = 1e3;
    vec2 P = 0.32 * vec2(cos(BUD_PH * 0.05 + FLOW_D * 0.1), sin(BUD_PH * 0.05 + FLOW_D * 0.1));
    for (int i = 0; i < 32; i++) {
        dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x);
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        tPt = min(tPt, length(z - P));
        tLn = min(tLn, abs(z.y - 0.15 * z.x));
        tCi = min(tCi, abs(length(z) - 0.62));
        if (dot(z, z) > 256.0) break;
        n += 1.0;
    }
    float zz = max(dot(z, z), 1.0001);
    float sn = n + 1.0 - log2(max(log2(zz) * 0.5, 1e-4));
    float k = clamp(sn / 16.0, 0.0, 1.0);
    float de = 0.5 * sqrt(zz) * log(zz) * 0.5 / max(length(dz), 1e-6);
    float px = 2.0 / iResolution.y / S;
    float edge = 1.0 - smoothstep(0.0, px * 2.5, de);
    float glow = exp(-de / (px * 18.0));
    float out0 = smoothstep(RBj * 0.6, RBj * 1.05, r) * smoothstep(S * 2.6, S * 1.6, r);
    float aw = 1.5 * fwidth(sn) + 1e-3;
    float interior = mix(step(31.5, n), smoothstep(31.5 - aw, 31.5 + aw, sn), FADE_IN18);   // AUDIO-PASS: antialiased interior edge                                           // NO-WASH: the filled set is not painted — only its boundary band
    float body = exp(-de * 22.0) * (1.0 - interior) * out0 * 0.85;          // NO-WASH: arms = distance-estimate glow around the dendrite, not the slow-escape field
    float curls = exp(-tCi * 22.0) * body;
    float beads = exp(-tPt * 30.0) * body;
    float fils = exp(-tLn * 60.0) * (0.4 * glow + edge) * out0 * exp(-de * 10.0) * (1.0 - interior);   // NO-WASH2: filaments only near the dendrite
    float tip = smoothstep(S * 0.7, S * 2.0, r);                                  // gold tips, teal/indigo bodies
    vec3 teal = gamutLch(vec3(0.56 + 0.22 * k, 0.15, radians(mix(250.0, 200.0, k) + 15.0 * sin(gPal * TAU))));
    vec3 gold = gamutLch(vec3(0.74, 0.16, radians(80.0)));
    vec3 bodyC = pow(mix(teal, gold, tip), vec3(1.0 / 2.2));
    vec3 col = bodyC * body * (0.6 + 0.9 * SUN_BREATH) * RIM_KICK
             + sunLch(0.70, 0.16, 58.0) * curls * (0.4 + 1.4 * RAY_SWAY) * (1.0 + AW_CURL)
             + pow(gamutLch(vec3(0.72, 0.14, radians(225.0))), vec3(1.0 / 2.2)) * fils * (0.35 + 1.6 * RAY_HATS) * (1.0 + AW_FIL) * SPARKLE * RIM_KICK
             + sunLch(0.76, 0.15, 84.0) * beads * (0.3 + 1.5 * RAY_HATS) * (1.0 + AW_BEAD);
    float inFill = interior * out0 * (0.55 + 0.45 * exp(-tCi * 6.0)) * (1.0 - 0.5 * tip) * FADE_IN14;   // FAN-FILL: the set's interior glows dim teal, no burn holes in the arms
    col += pow(gamutLch(vec3(mix(0.44, 0.54, FADE_IN18), mix(0.10, 0.13, FADE_IN18), radians(mix(212.0, 200.0, FADE_IN18)))), vec3(1.0 / 2.2)) * inFill * 0.55;   // AUDIO-PASS: interior fades toward the cyan glow
    col *= 1.0 + (0.4 * FADE_IN17 + 0.5 * FADE_IN18) * (0.35 + 0.65 * clamp(SUN_BREATH * 1.5, 0.0, 1.0));   // FANLIFT: the fan is the frame's bright anchor, +40% at full bass sustain (soft-kneed downstream)
    col *= 1.0 + 0.6 * FADE_IN11 * clamp(SUN_BREATH * 1.5, 0.0, 1.0);   // GIANT-5: the eruption fan is the luminous anchor — bass sustain lifts it up to +60%
    // FAN-ROOT (critic #63): near the root the dendrites were dim teal over the bright limb glow, so the
    // premultiplied over darkened it into a black starburst. There the fan's own light is floored to hot
    // emission (gold at the limb → cyan outward); bass sustain lifts the whole fan a further +30%.
    // ROOT-HUE (critics #59/#70/#71): the floor no longer paints the set's interior flat — dendrites keep
    // it, the interior takes it only through granulation, and it falls from gold-white to cyan.
    float rootGr = 0.45 + 0.55 * s_noise(vec2(a * 9.0, r * 34.0) + vec2(BUD_PH * 0.02, FLOW_D * 0.03));
    float aRoot = mix(max(max(body, fils), 0.5 * inFill), max(max(body, fils), 0.3 * inFill * rootGr * rootGr), FADE_IN24);
    float rootT = smoothstep(RBj, S * 0.9, r);
    float rootW = (1.0 - smoothstep(RBj * 1.1, S * 1.1, r)) * FADE_IN22;
    vec3 hotC = pow(gamutLch(vec3(mix(mix(0.86, 0.80, rootT), mix(0.90, 0.68, rootT), FADE_IN24), mix(0.14, mix(0.09, 0.15, rootT), FADE_IN24), radians(mix(80.0, 205.0, rootT)))), vec3(1.0 / 2.2));
    col = max(col, hotC * aRoot * rootW * (0.8 + 0.35 * clamp(SUN_BREATH * 1.5, 0.0, 1.0)));
    col *= 1.0 + 0.3 * FADE_IN22 * clamp(SUN_BREATH * 1.5, 0.0, 1.0);
    return vec4(col * 1.1 * max(bs_power, 0.6) * FADE_IN2 * FAN_AMT, max(max(body, fils), 0.5 * inFill) * FADE_IN2);
}

// TRIP-GARDEN: a self-similar Julia sky about the screen centre (never anchored to the sun). Two
// octaves at scales 2^(o - fract(dive)) cross-fade so the dive wraps without a pop; colour is one OKLCH
// analogous family on bs_tripHue, with a counter-hue folded to stay at or below 300° (no magenta).
vec3 tripGarden(vec2 uv) {
    float thT = 4.97 + 0.30 * sin(6.2831853 * bs_jTurn);
    vec2 c = bs_jR * vec2(sin(thT), cos(thT));
    float h = bs_tripHue * 360.0;
    float hc = h < 150.0 ? h + 150.0 : h - 150.0;
    float fd = fract(bs_dive);
    vec3 acc = vec3(0.0);
    for (int o = 0; o < 2; o++) {
        vec2 z = uv * 1.6 * exp2(float(o) - fd);
        float n = 0.0;
        for (int i = 0; i < 28; i++) {
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            if (dot(z, z) > 64.0) break;
            n += 1.0;
        }
        float k = n / 28.0;
        vec3 col = mix(gamutLch(vec3(0.30 + 0.35 * k, 0.12, radians(h + 25.0 * (k - 0.5)))),
                       gamutLch(vec3(0.45, 0.10, radians(hc))), smoothstep(0.85, 1.0, k));
        acc += pow(col, vec3(1.0 / 2.2)) * (o == 0 ? 1.0 - fd : fd);
    }
    return acc;
}

// GIANT (user, 2026-10-10): "this close, large, celestial body we're orbiting … in the lower right".
// The centre sits off-screen; we see a vast curved limb. The surface turns past us on a forward clock;
// audio drives light and rates only, never size and never a beat pulse.
vec3 vor2(vec2 x, float t) {   // cellular field: F1, F2−F1 (lane distance), cell hash
    vec2 n = floor(x), fx = fract(x);
    float f1 = 8.0, f2 = 8.0, id = 0.0;
    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
        vec2 gg = vec2(float(i), float(j));
        vec2 h = hash22(n + gg);
        vec2 o = 0.5 + 0.38 * sin(t + 6.2831 * h);
        float dd = length(gg + o - fx);
        if (dd < f1) { f2 = f1; f1 = dd; id = h.x; } else if (dd < f2) { f2 = dd; }
    }
    return vec3(f1, f2 - f1, id);
}

vec4 spotField(vec2 x) {   // nearest active-region site: distance, unit direction, spot radius (0 = quiet cell)
    vec2 n = floor(x), fx = fract(x);
    float best = 8.0, rad = 0.0;
    vec2 bd = vec2(1.0, 0.0);
    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
        vec2 gg = vec2(float(i), float(j));
        vec2 h = hash22(n + gg + 17.3);
        vec2 dv = gg + 0.25 + 0.5 * h - fx;
        float dd = length(dv);
        if (dd < best) { best = dd; bd = dv / max(dd, 1e-4); rad = h.y > 0.5 ? 0.12 + 0.2 * hash12(n + gg + 5.1) : 0.0; }
    }
    return vec4(best, bd, rad);
}

// SURFACE-3D (user, 2026-10-10: "impossibly interesting celestial detail as if we are a small moon
// orbiting"): the texture lives on the 3D sphere, so granules foreshorten and shrink toward the limb on
// their own and no pole pinches on screen. Granule lanes are noise iso-contours (closed, uneven cells);
// spot groups sit fixed in the turning frame so they ride past with the surface.
float hash31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float n3(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), f.x), mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x), mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
vec3 spinAxis(vec3 v, vec3 A, float a) { return v * cos(a) + cross(A, v) * sin(a) + A * dot(A, v) * (1.0 - cos(a)); }

vec3 giantSurface(vec2 p, float z, float rot, float boil, float G) {
    vec3 A = normalize(vec3(-0.28, 0.93, 0.24));
    vec3 N = spinAxis(vec3(p, z), A, rot);
    vec3 X = N * 2.2;
    float bz = boil * 0.06;
    float wx = n3(X * 1.7 + vec3(0.0, bz, 0.0)) - 0.5;
    vec2 w = vec2(wx, -wx);
    X += normalize(cross(N, A) + 1e-4) * wx * 0.8 + N * wx * 0.2;               // SURF-3: one-field zonal flow warp (perf)
    float dfine = smoothstep(0.03, 0.3, z);
    float sgN = n3(X * 3.1 + bz * 2.0);
    float net = smoothstep(0.82, 0.97, 1.0 - abs(2.0 * sgN - 1.0));            // supergranule network
    float g1 = n3(mat3(0.80, 0.36, -0.48, -0.60, 0.48, -0.64, 0.0, 0.80, 0.60) * X * 17.0 + vec3(0.0, 0.0, boil * 0.35) + w.xyx * 2.0);
    float g2 = dfine > 0.02 ? n3(mat3(0.36, -0.48, 0.80, 0.80, 0.60, 0.0, -0.48, 0.64, 0.60) * X * 41.0 - vec3(boil * 0.5, 0.0, 0.0)) : g1;   // SURF-2: rotated lattices, no grid-aligned streaks
    float Gm = mix(g1 * 0.62 + g2 * 0.38, g1, 1.0 - dfine);
    float core = smoothstep(0.42, 0.66, Gm);                                     // bright granules
    float laneA = 1.0 - smoothstep(0.26, 0.42, Gm);                              // soft dark lanes between them
    float laneB = 0.0;
    vec3 e1 = normalize(cross(A, vec3(0.0, 0.0, 1.0))), e2 = cross(A, e1);
    float umb = 0.0, pen = 0.0, moat = 0.0, plage = 0.0, rib = 0.0, pfil = 0.0, ribW = 0.0;
    for (int k = 0; k < 4; k++) {   // SURF-4: two spot groups (perf)
        float gk = floor(float(k) * 0.5);
        float lk = gk * 2.1 + 0.4 + 0.11 * mod(float(k), 2.0), bk = (hash12(vec2(gk, 3.3)) - 0.5) * 0.7 + 0.04 * mod(float(k), 2.0);
        vec3 Ck = (e1 * cos(lk) + e2 * sin(lk)) * cos(bk) + A * sin(bk);
        float rP = (mod(float(k), 2.0) < 0.5 ? 0.075 : 0.045) * (0.8 + 0.4 * hash12(vec2(gk, 9.1)));
        float d = length(N - Ck) * (1.0 + 0.3 * (g1 - 0.5));
        if (d > rP * 3.5) continue;
        vec3 v = N - Ck * dot(N, Ck);
        vec3 t1 = normalize(cross(Ck, A)), t2 = cross(Ck, t1);
        float ang = atan(dot(v, t2), dot(v, t1));
        umb = max(umb, 1.0 - smoothstep(rP * 0.32, rP * 0.5, d));
        pen = max(pen, 1.0 - smoothstep(rP * 0.8, rP * 1.15, d));
        moat = max(moat, 1.0 - smoothstep(rP * 1.15, rP * 2.2, d));
        plage = max(plage, 1.0 - smoothstep(rP * 1.4, rP * 3.4, d));
        if (d < rP * 1.2) pfil = max(pfil, (1.0 - smoothstep(rP * 0.8, rP * 1.15, d)) * s_noise(vec2(ang * 11.0, d * 70.0)));
        float ac = dot(v, t2), al = dot(v, t1);
        rib += exp(-pow((abs(ac) - rP * 1.35) / 0.008, 2.0)) * smoothstep(rP * 1.7, rP * 0.3, abs(al)) * pow(s_noise(vec2(al * 90.0, float(k))), 2.0);
        ribW += exp(-pow((abs(ac) - rP * 1.35) / 0.03, 2.0)) * smoothstep(rP * 2.2, rP * 0.2, abs(al));   // AUDIO-PASS: wide flare glow
    }
    float fil = (1.0 - smoothstep(0.0, 0.010, abs(wx - 0.08))) * smoothstep(0.35, 0.6, sgN) * smoothstep(0.02, 0.15, z);   // dark sinuous filaments
    float ld = mix(0.58, 1.0, pow(z, 0.55));                                       // limb darkening: ~40% down at the limb
    float fac = net * smoothstep(0.42, 0.06, z) * smoothstep(0.0, 0.03, z);        // faculae just inside the limb
    float L = 0.58 + 0.12 * core - 0.14 * (1.0 + AW_LANE) * laneA * (1.0 - 0.6 * moat) + 0.06 * net;   // SURF-2
    L += 0.06 * SUN_BREATH * core;                                                 // bass sustain: convection brightens
    L += 0.10 * plage * net + 0.18 * fac;
    // LIMB-LAW: solar limb darkening I(μ) = 1 - 0.6(1-μ) - 0.2(1-μ²), μ = z on the true sphere. The visible
    // arc is mostly the outer disc, so the falloff has to be steep there; floor keeps the limb ember, never black.
    float Imu = 1.0 - 0.6 * (1.0 - z) - 0.2 * (1.0 - z * z);
    float ldLaw = 0.25 + 0.75 * Imu;
    ld = mix(ld, ldLaw, FADE_IN16);
    L = mix(L, L - 0.18 * fac + 0.06 * z, FADE_IN16);                              // faculae move after the darkening; centre a touch paler
    L *= ld;
    L += 0.11 * (1.0 + AW_FAC) * fac * FADE_IN16;                                                   // faint bright faculae streaks survive just inside the limb
    float hcL = clamp(gHeatOv >= 0.0 ? gHeatOv : bs_heat, 0.0, 1.6);
    L -= max(hcL - 1.0, 0.0) * 0.22 * (1.0 - ld) * FADE_IN16;                      // hot acts add a flat lift in sunLchK; pre-subtract so the darkening ratio survives it
    L -= 0.15 * fil * ld * (1.0 - FADE_IN18);   // AUDIO-PASS: hairline filament contours removed (read as drawn lines)
    L *= mix(1.0, 0.78 + 0.62 * clamp(SUN_BREATH * 1.6, 0.0, 1.0), FADE_IN18);   // AUDIO-PASS: convection surges on bass sustain (quiet sinks, loud lifts)
    L = mix(L, L * (0.56 + 0.16 * (1.0 + AW_PFIL) * pfil), pen);
    L = mix(L, 0.27 - AW_UMB, umb);                                                         // umbra: deep ember, never black
    float C = mix(0.20, 0.12, z) * (1.0 - 0.25 * umb) + 0.02 * core;
    float hotX = max(hcL - 1.0, 0.0);   // NO-GREY: pre-compensate the hot-act lift so hot cells land pale gold (L ≤ 0.85, C ≥ 0.12), never grey
    C = mix(C, max(C, 0.12 / max(1.0 - hotX * 0.6, 0.4)), FADE_IN19);
    L = mix(L, min(L, 0.85 - hotX * 0.22), FADE_IN19);
    float hue = mix(40.0, 76.0, pow(z, 0.7)) + AW_AIRH + 6.0 * (core - 0.5) + 8.0 * (plage * net + fac) - 10.0 * pen;
    return sunLchK(L, C, hue, 0.8) + sunLch(0.82, 0.10, 82.0) * min(rib, 1.0) * (0.04 + 1.6 * RAY_FLARE * G)
         + sunLch(0.84, 0.12, 80.0) * (min(rib, 1.0) * 2.5 + min(ribW, 1.0) * 0.9) * FLARE_HIT * FADE_IN18;   // AUDIO-PASS: flux onsets flash the active regions   // flux onsets light the ribbons
}

vec3 giantStar(vec3 f, vec2 uv0, float fi) {
    vec2 p = (uv0 - GIANT_C) / GIANT_R;
    float rho = length(p);
    if (rho > 2.4 || fi < 0.002) return f;
    float G = GATE;
    float hov = gHeatOv;
    gHeatOv = mix(gHeatOv, clamp(bs_heat, 0.85, 1.6), FADE_IN13);   // EMBER-LIMB: cool acts may not drag the giant's limb toward crimson/pink
    vec2 toC = normalize(-GIANT_C);
    vec2 q = vec2(dot(p, toC), dot(p, vec2(-toC.y, toC.x)));
    float phi = atan(q.y, q.x);                        // 0 = limb point nearest the screen centre; the seam faces off-screen
    float hgt = (rho - 1.0) * GIANT_R;                 // height above the limb, screen units
    float budS = BUD_S;   // K7 SPEED: bass-rated clock × SPEED (continuous at swap)
    float budD = max(budS - BUD0, 0.0) * FADE_IN15;   // PLASMA-ARCH: bass-rated forward clock since the swap (product of two non-decreasing terms, so never reverses)
    float bd2 = max(budS - BUD2, 0.0) * FADE_IN18;
    float rot = T_S * 0.0035 + budD * 0.003 + bd2 * 0.006;   // AUDIO-PASS: surface turns up to ~3x faster on sustained bass       // ORBIT: the surface turns past us, forward only — faster on sustained bass
    float boil = budS * 0.35 + budD * 0.15 + bd2 * 0.5;          // bass sustain sets the boil rate (forward clock)
    vec3 add = vec3(0.0);
    if (rho > 0.97) {
        float h = max(hgt, 0.0);
        // CORONA: helmet streamers ride the rotation, fine rays stream outward on the flux clock;
        // lightness rides bass sustain (deep at rest, full on loud bass); GLOW soft-limited
        float helm = 0.35 + 0.65 * pow(s_noise(vec2(phi * 2.3 + rot * 3.0, 1.7)), 2.0);
        helm *= 1.0 + AW_HELM;
        float fine = pow(s_noise(vec2(phi * 38.0 + rot * 40.0, h * 1.2 - bs_fluxPh * 0.08)), 3.0);
        float cor = helm * exp(-h * mix(2.4, 1.7, FADE_IN8)) * (0.55 + 0.45 * (1.0 + AW_CORF) * fine) * (0.35 + 1.3 * SUN_BREATH) * GLOW;
        cor = cor / (1.0 + cor);
        cor *= 1.0 - 0.5 * smoothstep(1.4, 1.8, rho) * FADE_IN21;   // FAN-OVER (critic #58): the outer corona halves beyond ~1.6 R so it frames the fan
        add += sunLch(0.66, 0.10, 72.0) * cor * mix(0.55, 0.8, FADE_IN8);
        // CHROMOSPHERE + SPICULES: a hot rim and a forest of hairs along the limb; hats glint them
        float chrom = exp(-h / mix(0.014, 0.022, FADE_IN8)) * step(-0.01, hgt) * mix(1.0, 1.5, FADE_IN8);
        float spic = pow(s_noise(vec2(phi * GIANT_R * 120.0, h * 9.0 - boil * 0.6)), 5.0) * exp(-h / 0.045) * (1.0 + AW_SPIC);
        add += sunLch(0.62, 0.17, mix(34.0, 58.0, FADE_IN13)) * chrom * 0.9 * mix(1.0, 0.6 + 0.4 * GLOW, FADE_IN19) + sunLch(0.78, 0.13, mix(50.0, 66.0, FADE_IN13)) * spic * (0.6 + (1.8 + 3.0 * FADE_IN18) * RAY_HATS) * 1.4 * mix(1.0, 0.6 + 0.4 * SPARKLE, FADE_IN19);   // AUDIO-PASS: hats glint the spicule forest hard
        add += sunLch(0.84, 0.12, 86.0) * exp(-abs(hgt) / 0.0035) * 0.7 * (1.0 + AW_CHROM) * FADE_IN13;   // EMBER-LIMB: thin bright gold chromosphere line
        // PROMINENCES: four filamentary arches on forward life clocks — they rise, never sink; mids glow them
        float reach = mix(0.6 + 0.8 * knob_6, 0.4 + 1.4 * knob_6, FADE_IN19);   // K6 REACH — prominence height
        for (int i = 0; i < 4; i++) {
            float lc = BUD_PH * 0.012 + float(i) * 0.25;
            float cyc = fract(lc), id = floor(lc) + float(i) * 7.0;
            float c0 = (hash12(vec2(id, 3.1)) - 0.5) * 1.6;
            float span = (0.05 + 0.07 * hash12(vec2(id, 8.7))) * GIANT_R;
            float H = (0.06 + 0.16 * hash12(vec2(id, 1.3))) * reach * smoothstep(0.0, 0.45, cyc) + 1e-3;
            float life = smoothstep(0.0, 0.12, cyc) * smoothstep(1.0, 0.7, cyc);
            float sa = (phi - c0) * GIANT_R;
            float e = length(vec2(sa / span, h / H)) - 1.0;
            float ns = noise(vec2(sa * 40.0, h * 30.0 - boil));
            float k = min(span, H);
            float strand = exp(-pow((e + 0.05 * ns) * k / 0.011, 2.0)) + 0.6 * exp(-pow((e + 0.1 + 0.06 * ns) * k / 0.007, 2.0)) + 0.3 * FADE_IN8 * exp(-abs(e * k) / 0.03);
            float tw = 0.032 * (0.75 + 0.5 * ns);                                        // EMBER-ARCH: a filled plasma tube, wispy edge
            float tube = exp(-pow(e * k / tw, 2.0)) * (0.55 + 0.45 * s_noise(vec2(sa * 60.0, h * 45.0 + boil * 0.3)));
            float hotC = exp(-pow(e * k / (tw * 0.3), 2.0));
            vec3 archC = sunLch(0.62, 0.17, 54.0) * tube * 0.8 + sunLch(0.80, 0.13, 74.0) * hotC * 0.6;
            // PLASMA-ARCH: a thick feathered tube, no thin hot core line; ember at the feet → gold at the crown,
            // with brightness knots flowing along the loop on the bass-rated forward clock
            float tw2 = 0.05 * (0.8 + 0.4 * ns);
            float body2 = exp(-pow(e * k / tw2, 2.0));
            float crown = clamp(h / H, 0.0, 1.0);
            float along = atan(h / H, sa / span);
            float flow = 0.6 + 0.4 * s_noise(vec2(along * 2.5 - BUD_PH * 0.25 - FLX_D2 * 2.0 - BUD_D2 * 0.3, float(i) * 3.7 + id));   // AUDIO-PASS: knots stream faster on busy passages
            vec3 arch2 = mix(sunLch(0.56, 0.17, 46.0), sunLch(0.78, 0.14, 76.0), crown) * body2 * flow
                       * (0.6 + 0.4 * s_noise(vec2(sa * 50.0, h * 40.0 + boil * 0.3))) * 1.05;
            add += mix(mix(sunLch(0.66, 0.18, mix(32.0, 44.0, FADE_IN10)) * strand, archC, FADE_IN13), arch2, FADE_IN15) * life * step(-0.02, hgt) * (0.5 + (1.8 + 2.2 * FADE_IN18) * RAY_SWAY) * (1.0 + AW_PROM);   // AUDIO-PASS: mids glow the arches
        }
        // CME: a confirmed drop launches one turbulent plume off the limb (one-way, eased by the drop envelope)
        if (bs_dropEnv > 0.0005) {   // SMEAR-LOCAL: runs the ~4 s tail out
            float env = bs_dropEnv;
            float envT = smoothstep(0.0, 1.0, pow(env, 0.4));   // SMEAR-LOCAL: eases out over ~4 s
            float Rb = 0.15 + (1.0 - env) * 1.1;
            float dP = length(uv0 - (GIANT_C + toC * GIANT_R));
            float plume = smoothstep(Rb, Rb * 0.55, dP) * smoothstep(0.0, 0.05, hgt) * fbm(uv0 * 3.0 - toC * (1.0 - env) * 2.0);
            add += sunLch(0.70, 0.16, mix(40.0, 56.0, FADE_IN13)) * plume * mix(env * env * 0.9, 0.35 * envT * (1.0 - smoothstep(1.15, 1.3, rho)), FADE_IN20);   // SMEAR-LOCAL: corona band only (≤ 1.3 R), ≤ 35%
        }
    }
    vec3 body = vec3(0.0);
    float cov = 0.0;
    if (rho < 1.0) {
        float z = sqrt(max(1.0 - rho * rho, 0.0));
        if (FADE_IN12 < 0.999) {
        float lon = atan(p.x, z) + rot;
        float lat = asin(clamp(p.y, -1.0, 1.0));
        vec2 S = vec2(lon, lat);
        S += 0.035 * FADE_IN8 * vec2(noise(S * 11.0 + boil * 0.08), noise(S * 11.0 + 5.3 - boil * 0.08));   // GIANT-2: plasma boils, cells are not tiles
        float dfine = smoothstep(0.02, 0.25, z);        // fine detail fades where the limb foreshortens it
        vec3 sg = vor2(S * 7.0, boil * 0.25);           // supergranulation
        vec3 gr = vor2(S * 34.0 + sg.xy * 0.6, boil);   // granules inside it
        float gran = smoothstep(0.0, mix(mix(0.18, 0.32, FADE_IN8), 0.5, FADE_IN9), gr.y) * (1.0 - 0.5 * gr.x) * mix(1.0, 0.7 + 0.5 * gr.z, FADE_IN9);   // GIANT-3: soft lanes, each cell its own heat
        float net = 1.0 - smoothstep(0.0, 0.06, sg.y);
        float boilT = s_noise(S * 90.0 + boil * 0.5) * dfine;
        vec4 sp = spotField(S * 2.4);                   // sunspots: umbra + filamented penumbra, flare ribbons round them
        float rs = sp.w;
        float sx = sp.x * (1.0 + 0.4 * FADE_IN8 * noise(sp.yz * 2.5 + floor(S * 2.4) * 3.1));   // GIANT-2: ragged spot outlines
        rs *= mix(1.0, step(0.35, hash12(floor(S * 2.4) + 2.2)) * 0.8, FADE_IN8);           // fewer, smaller spot groups
        float umb = rs > 0.0 ? 1.0 - smoothstep(rs * 0.36, rs * 0.5, sx) : 0.0;
        float pen = rs > 0.0 ? 1.0 - smoothstep(mix(rs * 0.75, rs * 0.45, FADE_IN9), mix(rs, rs * 1.15, FADE_IN9), sx) : 0.0;   // GIANT-3: penumbra melts into the granulation
        float filam = 0.5 + 0.5 * noise(sp.yz * 9.0 + sp.x * 6.0);
        vec2 rl = sp.yz * sp.x; vec2 rn = normalize(hash22(floor(S * 2.4) + 9.1) - 0.5 + 1e-3);   // GIANT-3: flare ribbons are twin streaks either side of the spot, not a rim
        float rib2 = exp(-pow((abs(dot(rl, rn)) - rs * 0.55) / 0.025, 2.0)) * smoothstep(rs * 1.3, rs * 0.6, abs(dot(rl, vec2(-rn.y, rn.x)))) * pow(s_noise(rl * 30.0 + boil * 0.3), 2.0);
        float rib = rs > 0.0 ? exp(-pow((sx - rs * 1.25) / 0.03, 2.0)) * (1.0 - FADE_IN9) * mix(s_noise(sp.yz * 5.0 + boil * 0.2), pow(s_noise(sp.yz * 3.0 + boil * 0.2), 4.0), FADE_IN8) : 0.0;   // GIANT-2: broken arcs, not rings
        float ld = 1.0 - 0.62 * (1.0 - pow(z, 0.8));                     // limb darkening
        float fac = net * smoothstep(0.45, 0.08, z) * dfine;              // faculae near the limb
        float L = mix(0.44, 0.52, FADE_IN8) + 0.12 * FADE_IN9 + mix(0.14, 0.17, FADE_IN8) * gran * dfine + 0.04 * boilT - mix(0.06, 0.03, FADE_IN9) * net * (1.0 - fac) + 0.10 * fac;
        L += 0.06 * SUN_BREATH * gran;                                     // bass sustain: convection brightens
        L *= ld;
        L = mix(L, L * mix(0.55, 0.68, FADE_IN9), pen * (0.7 + 0.3 * filam));
        L = mix(L, mix(mix(0.10, 0.22, FADE_IN8), 0.30, FADE_IN9), umb * mix(1.0, 0.8, FADE_IN9));   // GIANT-2: umbra is deep ember, never a black hole
        float C = mix(0.17, 0.19, FADE_IN8) * (0.8 + 0.2 * gran) * (1.0 - mix(0.4, 0.1, FADE_IN8) * umb);
        float hue = 62.0 - 26.0 * (1.0 - z) + 10.0 * gran - 18.0 * pen;   // gold centre → ember limb
        body = sunLchK(L, C, hue, 0.6 * FADE_IN10) + sunLch(0.80, 0.12, 78.0) * (rib + (rs > 0.0 ? rib2 * FADE_IN9 : 0.0)) * (mix(0.15, 0.0, FADE_IN8) + 1.6 * RAY_FLARE * G);   // ribbons flicker with flux onsets
        }
        if (FADE_IN12 > 0.001) body = mix(body, giantSurface(p, z, rot, boil, G), FADE_IN12);   // SURFACE-3D crossfade
        cov = smoothstep(1.0, 0.985, rho);
    }
    gHeatOv = hov;
    return mix(f, mix(f + add, body, cov), fi);
}

void mainImage(out vec4 O, in vec2 g) {
    vec2 r = iResolution.xy;
    float ar = r.x / r.y;
    vec2 uv0 = (g + g - r) / r.y;
    float t = bs_time;                                        // monotonic, no 1000 s wrap (controller)
    float sm = 3. / r.y;
    gPhase = HUE_BASE + t * 0.006 + HUE_SPIN + seed;
    // controller state first — sky() and everything after reads it
    float m = smoothstep(0.0, 1.0, bs_eye);                  // one-way black-hole → eye morph
    gBass = bs_bass; gMids = bs_mids; gTreb = bs_treb; gEnergy = bs_energy; gEntropy = bs_entropy;
    gCentroid = bs_centroid; gPump = bs_pump; gDrop = bs_drop; gFlow = bs_flow;
    gCurl = bs_curl; gDir = bs_dir; gFlex = bs_flex; gWave = bs_wave; gLen = bs_len; gThick = bs_thick;
    gTwist = bs_twist; gFlexPh = bs_flexPh; gFlux = bs_flux; gRough = bs_rough;
    gSwell = 1.0;   // NO-BEAT (user, 2026-10-09): the sun does not pulse to the beat   // LEGIBLE kick: the main star punches ~13% bigger on each kick   // ~+10% on a kick (kick envelope: ~3 frame attack, ~400 ms release)
    gKick = bs_kick; gKAge = bs_kAge; gKAmp = bs_kAmp; gCrest = bs_crest; gPal = bs_pal; gRoll = bs_roll;

    // ── gravitational lens: everything bends around the hole (flips inside the Einstein ring)
    vec2 d0 = uv0 - SUN;
    float rr = max(length(d0), 1e-4);
    float fi7 = FADE_IN7;
    float rhoG = length(uv0 - GIANT_C) / GIANT_R;
    bool hid = fi7 > 0.999 && rhoG < 0.975;                  // GIANT: nothing behind the opaque body is drawn
    vec2 limbP = GIANT_C + normalize(-GIANT_C) * GIANT_R * 1.02;
    float RE = HOLE_R * 1.6 * (1.0 + 1.6 * bs_pull) * (1.0 - fi7);           // story pull: the collapse bends space harder
    vec2 uv = SUN + d0 * (1.0 - RE * RE / (rr * rr));

    // backdrop: Van Gogh tile sky + lattice spiralling into the hole, kept dim behind the urchin
    float wSp = mix(mix(smoothstep(0.0, 0.7, bs_night), 1.0 - smoothstep(0.0, 0.7, bs_night), SPACE_MIX), SPACE_MIX, OG_SKY);   // OG-SKY: every act settles on the tile sky; K8 SKY SWAP still flips it to deep space
    vec3 bg = vec3(0.0);
    if (!hid) {   // PERF-SKY: only the backdrop the act shows is drawn (uniform weight, coherent branch)
        if (wSp < 0.001) bg = sky(uv, t, sm);
        else if (wSp > 0.999) bg = deepSpace(uv);
        else bg = mix(sky(uv, t, sm), deepSpace(uv), wSp);
        bg *= 1.0 - 0.35 * bs_dark;
        if (FADE_IN23 > 0.001) bg += starLayer(uv) * FADE_IN23 * (1.0 - OG_SKY * smoothstep(0.06, 0.22, dot(bg, vec3(0.299, 0.587, 0.114))));   // OG-SKY: stars stay in the dark gaps, not over opaque tiles   // AUDIO-WEB/STARS: the starfield over every backdrop
    }   // NIGHT-FLOOR: dark acts dim the sky less (night acts sat at lum 0.03)   // NIGHT-LIFT: dark acts stay readable on a projector (0.8 left DYING at lum 0.03)   // story night: Van Gogh day → deep space; dark dims
    float gW = clamp(bs_fractal * bs_trip, 0.0, 1.0);
    if (gW > 0.003 && !hid) bg = mix(bg, tripGarden(uv0) * (0.75 + 0.5 * bs_bassSus * GATE), gW * 0.8);   // TRIP-GARDEN: bass sustain breathes its light


    // the urchin radiates from the eye: same centre, unlensed, roots on the limbal ring
    gBendDir = atan(bs_cY - SUN.y, bs_cX - SUN.x); gBendAmt = 0.3 * bs_cOn * smoothstep(1.6, 0.4, length(vec2(bs_cX, bs_cY) - SUN));
    float fadeIn = FADE_IN;
    vec2 dArm = fi7 < 0.5 ? d0 : uv0 - limbP;                 // GIANT: the Julia arms fade out at the old sun, then erupt from the giant's limb
    float wArm = fi7 < 0.5 ? 1.0 - smoothstep(0.0, 0.5, fi7) : smoothstep(0.5, 1.0, fi7);
    vec4 urc = hid ? vec4(0.0) : mix(fadeIn < 1.0 ? urchin(d0, m) : vec4(0.0), juliaArms(dArm, m), fadeIn) * wArm;   // JULIA-ARMS crossfade from the old urchin
    gBendAmt = 0.0;
    float rayM = max(max(urc.r, urc.g), max(urc.b, 1e-4));
    float rayK = rayM < 0.55 ? rayM : 0.55 + 0.25 * (1.0 - exp(-(rayM - 0.55) / 0.25));   // rays peak (≤ 0.80) below the ball core (≤ 0.92)
    vec3 rays = urc.rgb * (rayK / rayM);   // SUN-RAYS: hue-preserving knee — linear up to 0.55 so pumps read, soft above
    // HAZE-CAP: summed ray light may not swamp the sky — beyond twice the sky's own brightness the
    // glow is soft-limited (hue-preserving), so the ground keeps its colour even on the loudest frame
    vec3 sky0 = bg * 0.8;                                        // NIGHT-FLOOR: deep space is already dark; scaling it again crushed night to black                // DAY-BLUE: the cobalt tile sky is back by day; night keeps the deep floor
    float skyL = max(dot(sky0, vec3(0.2126, 0.7152, 0.0722)), 0.03);
    float rayL = dot(rays, vec3(0.2126, 0.7152, 0.0722));
    float capL = mix(0.08 + 1.4 * skyL, 0.9, smoothstep(0.5, 1.0, fi7));   // SKY-COBALT: the giant's cyan fan composites over the tiles at full strength                             // SURGE-MULT: ray light capped relative to the sky it sits on, so ≥ a third of the frame keeps its blue base on a peak
    rays *= rayL > capL ? (capL + 0.25 * (rayL - capL)) / rayL : 1.0;
    vec3 f = sky0 + rays * (1.0 - FADE_IN21);   // FAN-OVER: the fan moves to the end of the composite
    // SURGE-GAIN: the beat surge multiplies the tiles + rays already under the ray field (brighter and
    // more saturated where there is content), instead of adding peach light. Rides the background-rate
    // envelopes so a whole-region gain can't strobe; ray-free sky keeps its base.
    float sg = 1.0;
    f *= sg;   // CLEAN-HALO: rays only add light onto the sky, never darken beside themselves   // DARK-FLOOR2: deeper ground so the frame has a dark floor

    // PERF-NOFLOWERS: sunflower field removed (user: too slow) — urchin + sky fill the frame

    f -= fbm(uv0 * 100.0) * 0.05;                           // canvas grain (unlensed — it's the canvas)
    f = max(f, vec3(0.0));

    // ── the black sun at the urchin's heart, drawn in screen space over the lensed world
    float abK = clamp(bs_abstract, 0.0, 1.0) * (1.0 - 0.75 * SPACE_MIX);   // K8 SKY SWAP clears the nebula veil
    f = f * (1.0 - 0.45 * abK) + nebula(uv0) * abK * 0.55;   // story abstract: translucent plasma veils over a darkened scene — stars and sky show through
    // BINARY: the companion's rays (bending toward the main star) go in before the main star is drawn
    vec2 C = vec2(bs_cX, bs_cY);
    vec2 dC = uv0 - C;
    float compR = 0.16 * 3.3 * 0.92 * ZOOM * 0.42;
    float sepV = length(C - SUN);
    if (bs_cOn > 0.01) {
        float sb = gBass, sk = gKick;
        gKick = 0.0;   // LEGIBLE melody: the companion answers pitch movement (bs_pitchMove), nothing else
        gHeatOv = 0.32;
        gBendDir = atan(SUN.y - C.y, SUN.x - C.x); gBendAmt = 0.55 * smoothstep(1.6, 0.4, sepV);
        float rC = max(length(dC), 1e-4), r0C = compR * 0.85;
        gR0 = r0C;
        float slC = log(rC / r0C);
        if (slC > -0.12 && rC < 1.3) {   // PERF: companion rays only within reach
            vec4 cr = tendrilLayer(atan(dC.y, dC.x), slC, 14.0, 0.0, 1.0);
            f += cr.rgb * (0.4 + 1.3 * bs_pitchMove) * bs_cOn;
            // RAY-CROSS: where a main-star ray and a companion ray overlap, the touch shows in a stark
            // contrasting colour — the gold/crimson rays' complement (electric cyan → violet, swaying on
            // the slow palette clock), brightest where both are strong, flaring on kicks/treble and kisses
            float xr = urc.a * cr.a * bs_cOn;
            float xAmp = xr * 0.9 * (1.0 + 1.5 * bs_kiss + smoothstep(1.2, 0.4, sepV));
            f += pow(gamutLch(vec3(0.78, 0.15, radians(200.0 + 25.0 * sin(gPal * TAU)))), vec3(1.0 / 2.2)) * xAmp * 1.4;
            f += pow(gamutLch(vec3(0.88, 0.07, radians(215.0))), vec3(1.0 / 2.2)) * pow(xr, 3.0) * 1.2;   // sparkle at the crossing points
        }
        gBass = sb; gKick = sk; gHeatOv = -1.0; gBendAmt = 0.0;
    }
    if (fi7 < 0.999) f = mix(blackSun(f, d0, t, m), f, fi7);   // GIANT: the old sun fades out
    f = giantStar(f, uv0, fi7);
    if (bs_cOn > 0.01) {
        // BRIDGE: when the stars are close a plasma bridge arcs between them; a kiss flares it.
        // Turbulent glow along a bowed path, flowing on the orbit clock; hue runs gold → crimson.
        vec2 ab = C - SUN;
        float L2 = max(dot(ab, ab), 1e-4);
        float tB = clamp(dot(uv0 - SUN, ab) / L2, 0.0, 1.0);
        vec2 nrm = vec2(-ab.y, ab.x) / sqrt(L2);
        vec2 onB = SUN + ab * tB + nrm * sin(3.14159 * tB) * (0.12 + 0.08 * sin(bs_diskPh * 0.3));
        float dB = length(uv0 - onB);
        float bAmt = bs_cOn * (0.45 * smoothstep(1.4, 0.45, sepV) + 1.4 * bs_kiss) * (1.0 - fi7);
        float flow = 0.5 + 0.5 * sin(tB * 14.0 - bs_diskPh * 2.0 + noise(uv0 * 3.0) * 3.0);
        float wB = 0.025 + 0.03 * bs_kiss + 0.02 * flow;
        gHeatOv = mix(1.0, 0.32, tB);
        f += sunLch(0.78, 0.15, 60.0) * exp(-dB * dB / (wB * wB)) * bAmt * (0.5 + 0.7 * flow) * smoothstep(0.0, 0.08, tB) * smoothstep(1.0, 0.92, tB);
        // the companion itself: small dark-red plasma ball, same rendering language as the main star
        float sb = gBass, sk = gKick;
        gKick = 0.0;
        gHeatOv = 0.32;
        if (length(dC) < compR * 3.0) {   // PERF: the companion ball + corona only near it
            vec3 withC = plasmaBall(f, dC, compR * (1.0 + 0.12 * bs_pitchMove + 0.15 * bs_kiss), 1.0);
            // NO-DISC: the melody gain rides the ball + corona only and is 1.0 well inside the PERF cutoff —
            // scaling the whole 3×compR circle (sky included) drew a hard-edged pale/dark disc round the companion
            float cGain = mix(1.0, 0.7 + 0.7 * bs_pitchMove, 1.0 - smoothstep(compR * 0.9, compR * 2.0, length(dC)));
            f = mix(f, withC * cGain, bs_cOn);
        }
        gBass = sb; gKick = sk; gHeatOv = -1.0;
    }

    // STORY-SUPERNOVA: no painted shell. The shock is a distortion front (below, in the previous-frame
    // warp); here it only LIGHTS what it has crossed — everything inside the expanding front glows in
    // the gas hues, wall to wall within ~6 s, fading with the flash. Brightness stays in the frame budget.
    float Rs = bs_shell * 0.35;
    float lit = smoothstep(Rs + 0.25, Rs - 0.35, rr) * bs_nova;
    float shN = s_noise(uv0 * 1.3 + bs_galPh * 0.1);
    f += gasHue(shN + rr * 0.4, 0.6) * lit * (0.25 + 0.35 * shN);

    // KICK-WAVES (replaces the painted ripple): the eye keeps the black hole's gravity, and every kick
    // launches a gravitational wavefront. It is pure DISTORTION — the previous frame is refracted
    // through a travelling lens bump; nothing on the wavefront is painted or brightened. Radius grows
    // monotonically with the controller kick-age (0→1 over 3 s, reset only by a new kick); audio sets
    // only the amplitude. Between kicks a slow inward swirl keeps the gravity well alive.
    vec2 sUV = g / r;
    float RIg = HOLE_R * 3.3;
    float fallG = smoothstep(RIg * 1.02, RIg * 1.35, rr) * exp(-max(rr - RIg, 0.0) * 0.9) * (1.0 - fi7);
    float outG = smoothstep(RIg * 1.0, RIg * 1.3, rr);
    float Rk = RIg * 1.05 + bs_wAge * 1.5;                     // BIG-WAVES: one front per LARGE audio change (controller), ~0.25/s over a 6 s life — crosses the frame
    float wW = 0.035 + 0.03 * bs_wAge;                          // thin front, spreads a little as it travels
    vec2 dW = uv0 - mix(vec2(bs_waveX, bs_waveY), limbP, fi7);   // GIANT: fronts launch from the giant's limb
    float rw = max(length(dW), 1e-4);
    float xk = (rw - Rk) / wW;                                 // BINARY: fronts expand from where they were fired (sun, or the kiss point)
    float envK = bs_wAmp * exp(-bs_wAge * 1.5) * GATE;
    float lens = -xk * exp(-xk * xk) * 1.6487;                  // derivative-of-gaussian bump, peak ±1
    float ampK = 1.3 * envK * outG;   // BIG-WAVES: ~2.4× the lensing of the old kick fronts   // KICK-BEND: fronts bend the rays ~2.5× harder     // KICK-WAVES2: thin + intense lensing line  // kick front + a little bass breathing
    float xs = (rr - bs_shell * 0.35) / 0.06;
    vec2 pS = rot2(0.006 * fallG) * d0 * (1.0 - 0.003 * fallG) +   /* LEGIBLE kick: a short lensing thump around the sun */ dW / rw * lens * ampK - d0 / rr * xs * exp(-xs * xs) * 1.6487 * 0.35 * bs_nova;   // + the supernova shock front
    vec2 uvS = ((pS + SUN) * r.y + r) / (2.0 * r);
    vec3 prevG = getLastFrameColor(uvS).rgb;
    float eyeZone = m * (1.0 - smoothstep(HOLE_R * 3.3, HOLE_R * 3.6, rr));
    eyeZone = max(eyeZone, bs_cOn * (1.0 - smoothstep(compR * 1.6, compR * 2.2, length(uv0 - vec2(bs_cX, bs_cY)))));   // the companion renders fresh too — no 8-bit feedback over it
    eyeZone = max(eyeZone, fi7 * (1.0 - smoothstep(0.97, 1.0, rhoG)));   // GIANT: the body renders fresh, no 8-bit feedback terraces
    float waveW = exp(-xk * xk * 0.5) * clamp(envK * 3.0, 0.0, 1.0) * outG;   // let the refracted frame show through on the front
    float waveM = mix(1.0, 1.0 - smoothstep(1.15, 1.3, rhoG), FADE_IN20);   // SMEAR-LOCAL: the refracted front stays in the corona band
    f = mix(f, prevG * 0.96, clamp(0.12 * fallG + min(0.45 * waveW * waveM, mix(0.8, 0.35, FADE_IN20)), 0.0, 0.8) * (1.0 - eyeZone));   // SMEAR-LOCAL: ≤ 35%   // NO-ECHO-RINGS: 0.42 feedback in the swirl zone stacked the sun's edge into concentric rings
    // FAN-OVER (critics #52/#57/#58): the Julia fan goes OVER the corona and the drop smear at full strength
    // (premultiplied over: gold corona + cyan fan summed was the grey blot at the root), and the root gets a
    // luminous source, gold where it leaves the limb → hot cyan out along the eruption. Bass lights it.
    float aF = clamp(urc.a * min(FAN_AMT, 1.0), 0.0, 1.0) * FADE_IN21;
    f = f * (1.0 - aF) + rays * FADE_IN21;
    float RBr = mix(HOLE_R, HOLE_R * 3.3 * 0.92, m);
    vec2 dR = uv0 - limbP;
    float gC = smoothstep(-0.1, 0.5, dot(dR, normalize(-GIANT_C)) / RBr);
    vec3 emC = pow(gamutLch(vec3(mix(0.78, 0.84, gC), 0.13, radians(mix(78.0, 200.0, gC)))), vec3(1.0 / 2.2));
    float aE = exp(-dot(dR, dR) / (RBr * RBr * 0.25)) * (0.55 + 0.3 * clamp(SUN_BREATH * 1.6, 0.0, 1.0)) * (0.5 + 0.5 * smoothstep(0.96, 1.02, rhoG));
    aE = max(aE, exp(-dot(dR, dR) / (max(RBr * RBr, 0.06) * 0.9)) * (0.3 + 0.2 * clamp(SUN_BREATH * 1.6, 0.0, 1.0)) * smoothstep(0.96, 1.04, rhoG) * FADE_IN22);   // FAN-ROOT: a soft halo covers the whole root, no disc edge
    // ROOT-HUE: the opaque mix to one colour was the flat peach slab. Now the root is light ADDED over the
    // fan and limb: hot gold-white at the contact, falling to cyan over ~0.3 giant radii, broken by
    // granulation so the eruption grows out of the surface.
    float rq = length(dR) / (0.3 * GIANT_R);
    float rGr = 0.4 + 0.6 * s_noise(dR / GIANT_R * 46.0 + vec2(BUD_PH * 0.02, FLOW_D * 0.02)) * (0.6 + 0.4 * s_noise(dR / GIANT_R * 17.0 - vec2(FLOW_D * 0.015, 0.0)));
    vec3 emR = pow(gamutLch(vec3(mix(0.92, 0.66, smoothstep(0.0, 1.1, rq)), mix(0.07, 0.14, smoothstep(0.0, 0.9, rq)), radians(mix(85.0, 200.0, smoothstep(0.15, 1.1, rq) * (0.4 + 0.6 * gC))))), vec3(1.0 / 2.2));
    float aR = exp(-rq * rq * 2.2) * (0.45 + 0.3 * clamp(SUN_BREATH * 1.6, 0.0, 1.0)) * rGr * smoothstep(0.90, 1.0, rhoG) * smoothstep(0.5, 1.0, fi7) * FADE_IN21;
    f = mix(mix(f, emC, aE * smoothstep(0.5, 1.0, fi7) * FADE_IN21), f + emR * aR * (1.0 - 0.5 * max(max(f.r, f.g), f.b)), FADE_IN24);
    // NO-TERRACE: the old EYE-LOWPASS mixed 35% of the previous frame back into the ball every frame.
    // The framebuffer is 8-bit, so that feedback snapped slow gradients to flat steps — the terraces
    // in the sun's interior. The fibres it was smoothing are long gone; the ball renders fresh.

    f = max(f, vec3(0.0));
    // BUDGET: one hue-preserving soft knee on the FINISHED frame, in OKLab L (chroma kept), instead of
    // per-layer limiters that still stacked into whole-frame washes on loud moments. Below L 0.6 nothing
    // changes, so surges still read as local contrast; above it everything converges toward ~0.82.
    // GAMMA: f is sRGB-encoded (every colour is built in linear OKLCH and encoded once), so decode
    // before OKLab and re-encode after. The knee only ever lowers L; chroma is kept and lifted 15%
    // (VIVID — additive layers of different hues average toward grey), then gamut-mapped in OKLCH.
    // Nothing is ever mixed toward grey.
    vec3 lchB = rgb2oklch(pow(max(f, vec3(0.0)), vec3(2.2)));
    lchB.x *= mix(1.0, pow(smoothstep(0.03, 0.62, lchB.x), 1.4), DARK_FLOOR);   // K14 DARK: L below 0.62 sinks, harder
    lchB.z += HUE_ROT;                                                // K2 HUE SPIN: the whole palette turns
    float dWarm = atan(sin(1.31 - lchB.z), cos(1.31 - lchB.z));
    float warmM = 1.0 - smoothstep(1.3, 1.65, rhoG) * fi7;   // WARM-SCOPE (user rule: the sky stays blue): WARMTH acts on the giant, corona and arches only
    lchB.z += dWarm * WARMTH * warmM * smoothstep(2.0, 0.8, abs(dWarm));   // WARM-WINDOW: only hues within ~115° of gold lean in; navy no longer swings through red to maroon   // K11: 1.31 rad ≈ OKLCH sun gold
    float cob = smoothstep(0.6, 0.25, abs(atan(sin(lchB.z - 4.55), cos(lchB.z - 4.55)))) * fi7 * smoothstep(0.98, 1.02, rhoG);   // COBALT: deep chromatic blue space so the ember body pops
    lchB.x *= 1.0 - 0.15 * cob; lchB.y *= 1.0 + 0.4 * cob;
    float pkO = PAINT_AMT * (1.0 - FADE_IN21);   // PAINT-FLOW: the orbit-row dabs crossfade out (skipped once the fade completes)
    if (pkO > 0.002) {   // K10 PAINT: irregular, overlapping dabs that run along the orbit; broken colour, bristle streaks, dark seams
        vec2 pd = uv0 - GIANT_C;
        float pr = length(pd);
        vec2 pq = vec2(atan(pd.y, pd.x) * pr * 9.0 + bs_galPh * 0.02, pr * 26.0);
        pq += vec2(noise(uv0 * 3.1), noise(uv0 * 3.1 + 4.7)) * 1.6;
        vec2 pc = floor(pq), pf = fract(pq) - 0.5;
        vec2 pc2 = floor(pq + 0.5), pf2 = fract(pq + 0.5) - 0.5;
        float hA = hash12(pc), hB = hash12(pc + 17.3), hC = hash12(pc2 + 5.1);
        float dab = smoothstep(0.5, 0.15 + 0.2 * hA, length(pf * vec2(0.55, 1.0)));
        float dab2 = smoothstep(0.5, 0.15 + 0.2 * hC, length(pf2 * vec2(0.55, 1.0)));
        float bristle = noise(vec2(pq.x * 1.5, pq.y * 14.0));
        float jl = mix(hA - 0.5, hC - 0.5, dab2 / max(dab + dab2, 1e-3));
        float pk = pkO;
        lchB.x *= (1.0 + pk * (0.45 * jl + 0.22 * (bristle - 0.5))) * (1.0 - pk * 0.18 * (1.0 - max(dab, dab2)));
        lchB.y *= 1.0 + pk * 0.5 * (hB - 0.5);
        lchB.z += pk * 0.5 * (hB - 0.5) * max(dab, dab2);
    }
    float pkN = PAINT_AMT * FADE_IN21;
    if (pkN > 0.002) {   // PAINT-FLOW (critic #57; user rule: no painted rings): dabs on a square lattice, each laid along a wandering flow field, never the orbit. On the giant the lattice lives on the sphere (arc-length remap), so dabs foreshorten toward the limb.
        vec2 pd = uv0 - GIANT_C;
        float rhoP = max(length(pd) / GIANT_R, 1e-4);
        float sr = rhoP < 1.0 ? asin(rhoP * 0.96) / 0.96 : asin(0.96) / 0.96 + rhoP - 1.0;
        vec2 pq = rot2(bs_galPh * 0.002) * pd * (sr / rhoP) / GIANT_R * 16.0;
        pq += vec2(noise(uv0 * 3.1), noise(uv0 * 3.1 + 4.7)) * 1.6;
        vec2 pc = floor(pq), pc2 = floor(pq + 0.5);
        float hA = hash12(pc), hB = hash12(pc + 17.3), hC = hash12(pc2 + 5.1);
        float fl = bs_galPh * 0.004 + FLOW_D * 0.01;   // the flow field turns the dabs slowly, faster when the music is loud
        vec2 pf = rot2(9.0 * noise((pc + 0.5) * 0.09 + fl) + (hA - 0.5) * 0.6) * (fract(pq) - 0.5);
        vec2 pf2 = rot2(9.0 * noise(pc2 * 0.09 + fl) + (hC - 0.5) * 0.6) * (fract(pq + 0.5) - 0.5);
        float dab = smoothstep(0.48, 0.12 + 0.18 * hA, length(pf * vec2(1.0, 1.8)));
        float dab2 = smoothstep(0.48, 0.12 + 0.18 * hC, length(pf2 * vec2(1.0, 1.8)));
        float dm = max(dab, dab2);
        vec2 bq = dab >= dab2 ? pf + hA * 37.0 : pf2 + hC * 37.0;
        float bristle = s_noise(vec2(bq.x * 3.0, bq.y * 24.0));
        float jl = mix(hA - 0.5, hC - 0.5, dab2 / max(dab + dab2, 1e-3));
        lchB.x *= (1.0 + pkN * (0.40 * jl + 0.25 * (bristle - 0.5) * dm - 0.11)) * (1.0 - pkN * 0.18 * (1.0 - dm));
        lchB.y *= 1.0 + pkN * 0.35 * hB * dm;   // broken colour only ever adds chroma — a desaturated dab reads salmon/grey
        lchB.z += pkN * 0.5 * (hB - 0.5) * dm;
    }
    // EMBER (critic #57): warm tones on and round the giant hold chroma and split by lightness — dark →
    // saturated ember, light → pale gold — so salmon (light, reddish, mid-chroma) has nowhere to land.
    float wE = fi7 * (1.0 - smoothstep(1.5, 1.8, rhoG)) * smoothstep(0.8, 0.45, abs(atan(sin(lchB.z - 0.70), cos(lchB.z - 0.70)))) * FADE_IN21;
    lchB.z += atan(sin(1.31 - lchB.z), cos(1.31 - lchB.z)) * smoothstep(0.62, 0.80, lchB.x) * wE;
    lchB.y = mix(lchB.y, max(lchB.y, 0.15), wE);
    // ROOT-HUE (critics #65/#68/#69/#71, user rule: no hot magenta, ever): round the companion, every
    // violet → magenta → raspberry hue (≈270°..30°) lands on ember gold (h 30–60). The lilac halo was
    // crimson rays + the cyan ray-cross summed; the raspberry core was the heat-0.32 crimson floor (22°).
    // Cyan (200°) and the indigo sky (≤ 265°, dark) are left alone. Applied after HUE SPIN and WARMTH.
    float cmM = bs_cOn * (1.0 - smoothstep(compR * 1.8, compR * 3.4, length(uv0 - C))) * FADE_IN24;
    float dRb = atan(sin(lchB.z - 5.78), cos(lchB.z - 5.78));
    float cmW = cmM * smoothstep(1.05, 0.70, abs(dRb)) * smoothstep(0.12, 0.30, lchB.x);
    float cmS = smoothstep(-0.25, 0.1, dRb);   // 1 = the raspberry side (rotates up through red), 0 = the violet side (fades out)
    float cmT = 0.524 + 0.524 * smoothstep(0.2, 0.75, lchB.x);   // dark → ember h 30°, light → gold h 60°
    lchB.z += atan(sin(cmT - lchB.z), cos(cmT - lchB.z)) * cmW * cmS;
    lchB.y = mix(lchB.y, clamp(lchB.y, 0.14, 0.19), cmW * cmS);
    lchB.z += atan(sin(4.61 - lchB.z), cos(4.61 - lchB.z)) * cmW * (1.0 - cmS);   // ROOT-HUE2: the violet side turns DOWN to the sky indigo (h 264°), never through magenta and never grey
    float mg = smoothstep(0.45, 0.15, abs(atan(sin(lchB.z - 5.72), cos(lchB.z - 5.72))));   // NO-MAGENTA: hues near 328° lose most of their chroma
    lchB.y *= 1.0 - 0.8 * mg;
    float LB = lchB.x < 0.6 ? lchB.x : 0.6 + 0.22 * (1.0 - exp(-(lchB.x - 0.6) / 0.22));
    f = pow(gamutLch(vec3(LB, lchB.y * (1.15 + 0.12 * TONAL), lchB.z)), vec3(1.0 / 2.2));
    f *= min(1.0, 0.93 / max(max(f.r, f.g), max(f.b, 1e-4)));   // NEVER-WHITE: scale, don't clip — hue survives
    f *= FADE;   // K10: after the knee, so fading never shifts hue; the feedback zone reads it back and dims a touch faster
    f += (hash12(g + fract(bs_time) * 61.0) - 0.5) / 255.0;   // SOFT-BANDS: 1-LSB dither against 8-bit stepping in dark gas
    f = clamp(f, 0.0, 1.0);   // NO-OVERFLOW: never an out-of-range value into the framebuffer (the feedback reads it back). NOT isnan/isinf: on this GPU (ANGLE/Metal, fast-math) that blacked the whole wall
    O = vec4(f, 1.0);
}
