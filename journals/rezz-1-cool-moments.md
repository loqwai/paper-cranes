# moody-octopus/rezz-1 — Session Journal

## Status
Iter 5 of /vibej2 run. **Mic input (USB Audio CODEC — the app picks audioInputs[0])** (no Spotify). Forked from `shaders/redaphid/wip/moody-octopus2.frag`.
Brief (user, 2026-10-03): "vibe off of moody-octopus-2, but with a dark, rezz-like color scheme. dark reds. blacks. purples."

## History of changes
- **iter0/1: fork + REZZ grade.** Kept the moody-octopus2 Julia/feedback structure untouched and added a
  final grade: hue = triangle walk over (source hue + finalDist + slow time) folded into red (1.0) ->
  violet (0.76) so there is no wrap seam; lightness = `pow(smoothstep(0.12, 0.55, L), 1.6) * 0.36`,
  then multiplied by `pow(1 - walk, 1.8)` so the purple end of the walk sinks into black.
- **First attempt was a black frame.** Floor 0.30 / power 2.2 crushed everything: the source's HSL
  lightness sits ~0.35, and the feedback loop then reads its own black. Lesson: measure source L before
  choosing a floor.
- **Second attempt was a magenta wall** (0% black). Lightness had no structural term. The walk-based
  shadow fixed it: 58% true black, mean luma 0.018, peak 0.10.
- Added `@fullscreen: true`.
- **iter2: HYPNOTIC SPIRAL + PROWL DRIVE.** User (2026-10-03): *"more spiral, make it hypnotic. We're playing
  like a dark, brooding synthwave. So maybe something that feels a little like we're driving a car. prowling."*
  A first pass of faint log-spiral bands (contrast 0.35-0.8) was invisible under the fractal tiles. Replaced
  with a dominant 4-arm log spiral: `fract(log(r)*1.6 + angle*4 - time*0.22)` so the arms stream OUTWARD from
  the centre like road lines (driving forward), plus a 0.015 turns/s spin. Gaps between arms 94% black, fractal
  shows only inside the arms, each arm has a hot red leading-edge rim (L 0.30 * (0.5+0.5*bassNormalized) —
  the engine growl, amplitude only). Centre recedes to black (`depth = smoothstep(0.02, 0.75, r)`) = vanishing
  point. All phases time-only. Probe: true-black 0.62-0.68, mean 0.015, peak 0.10-0.115.

- **iter3: Julia PROJECTED onto the spiral arms.** User: "The julia set should look projected so that it
  'textures' the spiral arms." The Julia set is now evaluated in arm space, not screen space: u = along-arm
  coordinate `log(r)*ARMS/2PI - TIGHT*theta` and the across-arm `spiral` phase are the log-spiral's
  *conformal* pair, so the texture rides each ribbon undistorted and shrinks toward the vanishing point
  for free (perspective). u jumps by TIGHT*2PI at the atan seam, so it is tiled by that/8 and mirrored,
  which keeps the seam clean. Julia c walks the 0.7885 circle on time only (ARM_JULIA_MORPH 0.02).
  ARM_TEX_MIX 0.85 keeps 15% of the old screen fractal underneath.
- **iter3 gotcha: the first pass was invisible** (91% black, only rims showing). On the 0.7885 circle the
  Julia set is mostly dust, so almost every arm pixel escapes in 2-5 iterations. A smooth count /24 reads as
  near-black. Fix: ARM_TEX_GAIN 6 + pow 0.55 + smoothstep(0.04, 0.8). Result: black 0.64, mean 0.024, peak 0.10.

- **iter4: all 4 rims + filigree.** Ray probe (luma along E/N/W/S from centre) showed the 4-fold symmetry
  was intact — the "only 2 of 4 rims" read came from each rim floating ALONE in the gap: the across-arm Julia
  coord put fast-escaping exterior (dark) at the leading edge, so ribbons read "texture, bare line, texture".
  Fix: mirror the across coord at the ribbon centre, add a dimmer trailing rim (ARM_TRAIL_RIM 0.6) so each
  ribbon is framed both sides. Blobs came from ARM_TEX_GAIN 6 saturating every slow-escaping point into flat
  pink; replaced with distance-estimate filaments (ARM_FILAMENT_WIDTH 2.5 px, via fwidth of arm coords) over a
  dim escape glow (ARM_GLOW_FLOOR 0.45, GAIN 16). Probe: black 0.61, mean 0.029, peak 0.138.


- **iter11: Rezz eye + budget trim.** FINAL_L_CAP 0.29 -> 0.275 (iter10 live peak 0.164 was over the 0.16
  budget). Added a focal iris built FROM the spiral, in log-radius space (not a screen-space disc, which the
  guardrails veto): a thin pure-red ring at EYE_R 0.065 (~3px wide), the lead rims visibly streaming out of
  it (EYE_EMERGE 0.13), and a true-black pupil. Ring breathes with slow bassMedian (MEDZ), gated by
  QUIET_GATE so silence rests at 0.75 of full. Probe taken while the audio was SILENT (energy ~0): mean 0.021,
  peak 0.121, black 0.59, jitter 0.0061 — live peak and the bass breath are unverified.
  Process fix: the edit was staged to a served path and GL-validated in the page BEFORE /__save-shader
  (iter10 had written to disk unvalidated).

## Cool moments
- **iter18 RATCHET: flicker gone, confirmed by the user live** (2026-10-03): *"Not anymore no flicker."*
  The per-pixel A/B couldn't see it, but the user's eye could. Moving every arm-texture coordinate and
  fold parameter onto rezz-ratchet's monotonic accumulators (audio = rate only) plus attack/release
  envelopes fixed the arm-fractal flicker. **Approved and protected from here on:** fractal-first arms
  (iter17 hex fold) and the centre flex on the beat (iter16). Design hypothesis: **every texture/fold motion
  goes through a monotonic accumulator.** If a coordinate can be pushed backwards by audio, it will flicker.

## Todo
- [ ] Ribbon fill lost again by iter9 (sparse curl glyphs): keep Julia c inside the connected region — clamp the time orbit / section morph, or pick ARM_JULIA_RADIUS/c rest so drift can't leave it.
- [ ] Mic read FLAT again at iter4 start (energy 0, all Normalized 0.5) — audio may be dropping intermittently; check permissions/console.
- [x] Rezz motif: hypnotic spiral (iter2). Standing requirement now — never remove, tune only.
- [ ] Prowl: optional low horizon / vanishing-point hint; keep spiral first.
- [ ] Mic read flat at iter2 (energy 0, all Normalized 0.5) — check the mic is live before tuning audio terms.
- [ ] Nothing in the grade is audio-reactive yet; give the hue walk / shadow depth slow mic-safe drivers.
- [ ] Original still uses `beat` (ripple) and raw z-scores in UV offsets — candidates for removal if shivery.

## Forks
- `rezz-1 ← moody-octopus2` (iter 0). Sibling of `moody-octopus/dark-1` (see `journals/dark-1-cool-moments.md`).

## Design hypotheses for v(next)
- A palette grade at the end of an existing shader is a cheap way to re-skin it — but the lightness map
  needs a structural term (here: position on the hue walk), or a narrow source L range becomes a flat wall.

## Iteration 5 — audio analysis + wiring (2026-10-03)
USER: "We don't have audio running right now... Use this opportunity to analyze and wire up the audio
features." Then, once music arrived: "Get the textures animating. Wire in lots of audio features."

### Input findings
- **Device:** the app takes `audioInputs[0]` = **USB Audio CODEC**, not the MacBook mic. Permission granted,
  track live/unmuted; an independent probe read RMS 0.048 / peak 0.11 on it.
- **"Silence" is actually the not-yet-connected state:** every raw feature 0, every Normalized **0.5**, every
  ZScore **1.0** (an all-zero history). Earlier ticks that saw "energy 0, features at rest" were in this
  state. Any driver built on Normalized or Z alone would sit at mid/max here — so **everything is gated on
  raw `energy`**.
- **Live synthwave on this input (5 s):** energy 0.011–0.030 (mean 0.015, dips to ~0.006); bassN 0.10–0.66;
  midsN 0.21–0.97 (mean 0.78 — mids dominate this genre); trebleN 0.05–0.81; centroidN 0.04–0.80;
  fluxZ idles −0.14…0.08 and spikes to 0.91 on hits; entropyN 0.08–0.88; roughnessN 0.05–0.76; crestZ −0.83…0.44.

### Audio mapping (one feature per visible role, all amplitude/offset — no audio inside a time phase)
| Visual role | Feature | Why | Rest value | Gated by |
|---|---|---|---|---|
| Master gate | `energy` (raw) `smoothstep(0.003, 0.008)` | the only feature that is truly 0 before connect | 0 | — |
| Lead rim glow + thickness ("engine") | `bassNormalized` `ss(0.20, 0.65)` | the kick/sub is the drive | growl 0.70, rim 0.13 | gate |
| Arm texture body brightness | `midsNormalized` `ss(0.45, 0.95)` | synthwave pads live in the mids | ×0.80 | gate |
| Violet trailing rim strength + tint | `trebleNormalized` `ss(0.15, 0.60)` | hats/air = the cold edge | 0.6, red | gate |
| Texture flash | `spectralFluxZScore` `ss(0.30, 1.0)` (dead-zone) | snares/hits only | 0 | gate |
| Julia c real offset (shape morph) | `spectralCentroidNormalized − 0.5` ×0.045 | brightness reshapes the fractal | 0 | gate |
| Julia c imag offset | `spectralSpreadNormalized − 0.5` ×0.045 | harmonic width, independent of centroid | 0 | gate |
| Julia zoom (texture scale) | `spectralKurtosisNormalized` `ss(0.2, 0.9)` ×0.35 | peaky vs diffuse spectrum | 1× | gate |
| Filament line width | `spectralCrestNormalized` `ss(0.2, 0.9)` +1.6px | spiky vs smooth | 2.5px | gate |
| Glow floor under filaments | `spectralRoughnessNormalized` `ss(0.12, 0.60)` +0.22 | grit fills the ribbon | 0.45 | gate |
| Texture slides across the arm | `spectralEntropyNormalized − 0.5` ×0.6 | chaos shifts the pattern | 0 | gate |
| Arm hue red → violet tilt | `spectralRolloffNormalized` `ss(0.15, 0.60)` −0.07 | where the highs die = colour temperature | red | gate |

Time-only animation raised so the texture visibly moves even with no audio: `ARM_TEX_FLOW` 0.04→0.12,
`ARM_JULIA_MORPH` 0.02→0.07.

### Removed (legacy moody-octopus2 audio)
`bassZScore` in the phase `t` (it also fed the Rezz hue walks), raw Z-scores in UV offsets
(centroid/spread/kurtosis/treble/bass), Z hue/sat/lightness jitter (centroid/flux/crest/kurtosis/rolloff),
`beat` ripple, skew/rolloff in the legacy Julia c, spreadMedian UV drift. None of it was visible under the
arm texture, but `t` was — through the hue walks.

### Probes
| State | mean luma | peak | true black |
|---|---|---|---|
| rest (gate shut) | 0.014 | 0.104 | 0.76 |
| all drivers maxed (first pass) | 0.056 | **0.221** | **0.43** ✗ |
| all drivers maxed (after FINAL_L_CAP 0.31, smaller boosts) | 0.028 | 0.158 | 0.685 |
| live synthwave (final) | 0.035 | 0.159 | 0.56 |

Live driver activity (fraction of frames > 0.05): gate 100%, bass 95%, mids 78%, air 45%, grit 40%,
rolloff 27%, flux hit ~5% (correct for a transient). First pass had the gate open only ~40% of the time
(threshold 0.005–0.012 sat inside the energy range) and air/grit/rolloff at 3–10% — thresholds lowered.

## Dead features on this input (do not build on these)
- Every Normalized reads 0.5 and every ZScore reads 1.0 before audio connects — never use them ungated.
- `pitchClass*` — not wired; dark-1 found it dead on mic, unverified here.
- `beat` — vetoed by user preference.

- **iter6: RIBBON FILL.** User looked at iter5 screenshots; the arm texture read as isolated red clumps
  strung along each ribbon (Julia at |c| 0.7885 is mostly dust, and the filled interior was rendered
  black). Now the filled interior is a dim surface (`ARM_BODY 0.34`, breathing with mids) and every
  ribbon carries a faint continuous base (`ARM_RIBBON_BASE 0.16`, strongest at ribbon centre), so the
  pattern reads as printed ACROSS the ribbon. `FINAL_L_CAP` 0.31 -> 0.29 to keep peak in budget.
  Live: mean 0.041, peak 0.151, true-black 0.56. Shot: `.playwright-mcp/rezz-1-iter6.jpeg`.

### iter7: de-jitter the texture-moving drivers
- **Measured:** with the four position drivers live (centroid/spread → Julia c, kurtosis → zoom, entropy → across-arm
  slide), frame-to-frame lit-pixel luma change averaged **0.0119 with spikes to 0.0165**; with them zeroed it held
  **0.0084**. Kurtosis Normalized was the jumpiest input (0.0127/frame).
- **Fix:** those drivers now read a median-filtered z, `MEDZ = clamp((Median - Mean) / (2*SD) * 2, -1, 1)`.
  Median rejects the per-frame spikes; the drift still reads over seconds. After: **0.0071 steady** (vs 0.0054 zeroed),
  live re-check 0.0083–0.0099, no spikes.
- **Regression caught + fixed in-tick:** dropping Normalized also dropped the static c offset it had been providing
  (Normalized sat ~0.05 on this input → `-0.45`), and the Julia went back to disconnected dust. Restored as
  `JULIA_C_REST -0.45`. Lesson: a "dead" Normalized driver can be silently load-bearing as a constant.
- **GLSL gotcha:** `##` token pasting does NOT compile in WebGL GLSL ES — `MEDZ(f)` with `f##Median` broke the save for
  a few seconds before the explicit-argument version replaced it. Write the three uniforms out.
- Gate open 100% of frames on the live music (energy 0.010–0.025).

## Instrumentation recipes
- **Jitter probe (texture twitch):** 160x90 canvas readback once per rAF for ~20 frames; per consecutive pair, mean
  |ΔLuma| over pixels lit (> 0.02) in either frame. Run 4× alternating A/B against a variant with the suspect drivers
  `#define`d to 0.0 (validate, then swap `window.cranes.shader`, restore after). Music varies a lot between runs, so
  only alternating A/B means anything — single runs gave contradictory answers.

- **iter8: SECTION COIL.** Geometry now follows slow music: the spiral's tightness breathes with
  section energy — `spTight = SPIRAL_TIGHT * (1 + 0.16 * DRIVE_COIL)` where
  `DRIVE_COIL = SECTION_GATE * MEDZ(energyMedian, energyMean, energySD)`, so builds coil tighter and
  breakdowns relax over tens of seconds. The coil is gated on `energyMedian` (not raw energy) so a
  flickering raw gate can never jump the bands, and it pivots at log-radius `COIL_ANCHOR -0.7` so bands
  breathe in place instead of sliding.
  - **Lesson (A/B-measured):** the first version also fed `spTight` into the arm-texture tiling
    (`armU` / `armTile`). That rescaled every texture tile on every tiny coil change and tripled
    frame-to-frame jitter (0.006 → 0.016–0.022). With the texture pinned to the rest coil, jitter equals
    coil-off (0.0055–0.0066). Live after the fix: jitter 0.0084, mean 0.038, peak 0.150, black 0.553.
  - **Rule:** a slowly-varying geometry parameter must not rescale a high-frequency texture. Keep
    the texture's coordinate frame fixed and let only the low-frequency structure breathe.

- **iter9: SECTION MOOD — colour follows slow music only.** Audit found three fast hue drivers:
  `DRIVE_ROLL` (per-frame `spectralRolloffNormalized` on the red→violet tilt — deleted), the trailing-rim
  hue mixed by `DRIVE_AIR` (per-frame treble — treble now only brightens that rim), and `texWalk` derived
  from `armTex`, whose brightness carries fast mids/roughness, so loud frames also shifted the texture's hue
  (now keyed to `armTexShape`, the structure without audio amplitude). Replaced with `SECTION_MOOD` =
  gated `0.5·MEDZ(energy) + 0.5·MEDZ(bass) − 0.5·MEDZ(centroid) − 0.5·MEDZ(rolloff)`: intense sections mix the
  arm hue toward red (×0.5), calm/airy sections tilt it −0.08 toward violet. Applied after unwrapping hue to
  [0.5, 1.5) so red sits mid-range and the lean can't wrap through green. Live mood ≈ +0.15 (slightly hot).
  A/B, three alternating rounds, per-pixel hue change on pixels lit in consecutive frames:
  old 0.0183/0.0133/0.0186 → new 0.0111/0.0145/0.0122 (−25%). Brightness unchanged (black 0.63, peak 0.154).
- **Observed, not yet fixed:** by iter9 the ribbons had gone back to sparse curl-shaped Julia fragments with
  the body nearly black (iter6's connected fill lost). Old and new measured the same in the A/B, so it's the
  Julia c wandering (time orbit + section morph) out of the connected region, not the hue change.

## Instrumentation recipes
- **Frame-mean hue is the wrong colour-flicker metric** (iter9): it moves with the music and with which pixels
  happen to be lit, and old/new A/B rounds overlapped completely. Use **per-pixel hue change on pixels lit in
  both consecutive frames** (circular diff, lit = max channel ≥ 0.08 and chroma ≥ 0.04), averaged over ~24 rAF
  frames, alternating old/new shader swaps 2–3 times on the same live audio.
- **Jitter** (iter7): mean |Δluma| between consecutive 160×90 readbacks, lit pixels only; ≤ ~0.010 is calm.

## History of changes (iter10)
- **iter10: connected Julia path.** The ribbon fill from iter6 kept getting lost because Julia c orbited the
  |c| = 0.7885 circle, which spends most of its time OUTSIDE the Mandelbrot set (disconnected dust Julia sets →
  sparse curl fragments). c now rides `k·(e^{iθ}/2 − e^{2iθ}/4)` with k = 0.96, a curve just inside the main
  cardioid, so every set on the path is connected and the arms carry solid cloud bodies with filigree edges.
  θ walks with time (0.07 rad/s); spread MEDZ nudges θ (±0.35 rad); centroid MEDZ nudges k toward the boundary
  (±0.025). Removed the dead ARM_JULIA_RADIUS / JULIA_C_REST / DRIVE_CENT / DRIVE_SPRD.
  Probe (30 s, 1 Hz): lit fraction min 0.240 / mean 0.393 (was 0.276 / 0.401 — the metric is rim-dominated, so it
  doesn't see the change; the screenshot does), true-black mean 0.53, peak 0.164, jitter 0.0064.
- [x] Todo: ribbon fill lost to Julia c drift — fixed by the cardioid path.
- Design hypothesis: for a Julia texture that must always "fill", constrain c to the interior of the main
  cardioid; a circle of |c| ≈ 0.79 only touches the connected locus briefly.
- **tick12 (no edit):** audio silent - USB Audio CODEC track live and unmuted but the input itself sits at the noise floor (independent getUserMedia probe: peak 0.00016, ~-76 dBFS). Music stopped / mixer feed silent, not a page bug. Skipped tuning (blind). iter11 live peak + eye breathing still to verify when music returns.

- **iter12: eye made legible.** The iter11 iris was swallowed by the converging coil. Carved a black
  moat (1.25–2.4× EYE_R) around the ring, moved the emerging rims to start beyond the moat, thickened
  the ring (EYE_W 0.11→0.18, ~4.5px) and raised it to EYE_L 0.25 (still under the 0.275 cap), and
  made the pupil edge crisp. It now reads as a distinct red ring around a black pupil, with arms
  streaming out beyond the moat. Measured at rest (audio silent): black 0.60, peak 0.104, jitter
  0.0047. Bass breathing still unverified. (Process slip: edited on disk before validating;
  it compiled.)

- **iter13 (2026-10-03 session 2, claude-in-chrome, user projecting the jam tab): PROWL WAVE.** Audio
  SILENT for tuning purposes: the app's input `audioInputs[0]` is now listed as "PCM2902 Audio Codec"
  (same Burr-Brown USB codec) and raw `energy` sits at 4e-8 to 1.5e-6, about 10^4 below last session's live
  music (0.011-0.030), so QUIET_GATE stays shut. `bassNormalized` and `spectralFluxZScore` still wander on
  that noise floor, so **don't read them as music**. The laptop's "Built-in Audio Analog Stereo" input is
  loud and clipping, but it isn't the input the app uses. Time-only move: a soft band of light rolls
  OUTWARD along the arms every 9 s (`PROWL_PERIOD 9`, `PROWL_DENS 0.42` waves per e-fold, `PROWL_DIM 0.5`
  outside the band). It multiplies lightness before the eye, so the eye stays steady. Radial luma
  probe, 2 s apart: peak bin 4 -> 5 -> 6 -> 7 (~2x contrast against the dimmed rest), mean 0.011-0.016,
  peak 0.12, black 0.63-0.74. The road now reads as moving toward you. Process: edited on disk, then
  GL-validated the served file in the same tick (ok).
- **iter14: SPIN SURGE.** Still SILENT. One 0.018 energy spike showed up in a 2 s read, but 40 more
  samples over 6 s were all 0 with the gate shut, so it was a pop, not music. Time-only move: the rotation
  RATE now breathes, SPIN_SPEED*(1 + 0.8*sin(2pi t/48)), so it eases off to 0.2x and leans into the
  throttle at 1.8x over a 48 s cycle (the prowl). The phase is the closed-form integral of that rate, so it
  stays monotonic (no reversal, no audio in the phase). It feeds `spA`, so the arm texture turns with the
  arms. **Rejected a 2-min red<->violet hue drift:** any swing big enough to see breaks the
  ≤0.03/min hue rule. The colour stays on SECTION_MOOD (slow music) only. Live frame: dark, peak in
  budget, prowl wave intact. The rate change wasn't isolated with a probe (a ring cross-correlation can't
  separate spin from the outward drive). Judge it by eye over a minute.
- **iter15: BASS KICK on the eye + lead rims. AUDIO LIVE on the USB codec.** 3 s ranges: energy
  0.033-0.134 (about **4x louder than last session's 0.011-0.030**), bassN 0.05-0.77 (median ~0.43),
  midsN 0.19-0.99, trebleN 0.09-0.85, fluxZ -0.14 to 0.77. QUIET_GATE (0.003-0.008) is **fully open
  100%** at this level. Diagnosis: the eye's only audio term was the slow bass-median breath (0.40-0.64)
  scaling 0.75-1.0, so about 6% brightness change, invisible. The lead rims rode DRIVE_BASS, which
  sat around 0.5 (no contrast) and also widened the rim per frame (fast signal on geometry). Fix:
  `BASS_KICK = D_(smoothstep(0.40, 0.75, bassNormalized))`, dead-zoned above the median. Eye ring L =
  EYE_L*(0.40 + 0.60*kick)*(0.85 + 0.15*breath). Lead rim brightness = ARM_RIM*(0.50 + 0.50*kick).
  **Removed** the bass-driven rim width (fixed 0.13). Process fixed: built the edit in the page, compiled
  it with __vjValidate, THEN POSTed /__save-shader. Probe (30 frames): iris-ring red 0.088-0.132
  (1.5x swing), **corr with bassN 0.53**, mean 0.012-0.022, peak 0.08-0.12, black 0.55-0.64.
  Watch next tick: in this window bassN maxed ~0.54, so the dead-zone held the kick mostly low and the
  eye sat dim (~0.10 L). If the eye stops being the focal point, raise EYE_REST or drop the dead-zone to
  0.35.
- **iter16: CENTRE FLEX.** User: *"the center spiral itself should flex in and out with the beat."* Lens
  warp on radius only: `spR = exp(log(spR) - FLEX_AMT * pow(BASS_KICK, 1.5) * flexW)`. flexW is 1 inside
  FLEX_R0 0.06 and fades to 0 at FLEX_R1 0.55 in log-radius, so the centre bulges outward on a kick and
  springs back while the outer arms stay put. It's applied right after `spR`, so spiral, armU/armAcross,
  depth, prowl, eye and rims all ride it. spA and the armTile/SPIRAL_TIGHT texture frame are untouched.
  FLEX_AMT 0.12. AUDIO LIVE. Built in the page, validated, then /__save-shader.
  **Measured:** eye-ring radius (full-res centre crop, red radial argmax) 0.0645 -> 0.0735 uv = **14% flex**
  on kicks (model max 12.7% plus pixel quantisation). It sits at rest (env < 0.01) in 9/36 frames, so it
  returns to zero between kicks. **Jitter A/B** (alternating window.cranes.shader swaps, 3 rounds x 20
  consecutive rAF frames): no-flex 0.0044/0.0057/0.0067 vs flex 0.0033/0.0061/0.0047, so the flex adds
  **no jitter** (all ≤ 0.010). A single run spaced 60 ms apart read 0.016. Frame spacing inflates that
  metric, so **only compare jitter at the same sampling cadence**. Kept FLEX_AMT 0.12.
- Design hypothesis: "flex with the beat" is a radius-only lens warp in log-space, masked to the
  centre. It reads as the spiral breathing, and the outer frame stays steady, so it doesn't shiver.
- **iter17: LATTICE TRANSPLANT. The fractal is the star.** User: *"focus more on the fractals"* using
  lattice-interactive/3. Replaced the whole arm-space Julia (jz setup, cardioid c path, 48-iter loop,
  DE filaments, escGlow, armTexShape) with lattice-interactive/3's hex mirror-fold `fractal()`, ported as
  a controller-free `hxFold()`. It is evaluated in arm space `(armU, spiral) * hxK` with
  `hxK = HX_SEAM_N / (SPIRAL_TIGHT*2pi)`, so the atan seam jump is an integer number of fold periods
  (no seam ray). armU keeps the REST coil (iter8 rule). Uses an analytic pixel footprint (not fwidth) for
  the `res` sub-pixel gate, so fine levels vanish toward the eye instead of hazing. Hue walk comes from the
  fold's depth field: coarse outlines hot red, fine levels violet and into shadow. Slow audio only: kurtosis
  MEDZ -> hex size, bass-median breath -> ring radius, crest -> rim width (widening only, never a reducer).
  ARM_TEX_MIX 0.85 -> 1.0 (dropped the screen-space Julia underlay). Eye, iter15 kick rims, iter16 centre
  flex and iter13 prowl band are all untouched. Dead defines (ARM_JULIA_MORPH, ARM_TEX_GAIN,
  ARM_FILAMENT_WIDTH, ARM_GLOW_FLOOR, ARM_BODY, CARDIOID_*, JULIA_AUDIO_ZOOM, TEX_ACROSS_SLIDE, DRIVE_CHAOS,
  DRIVE_GRIT) are left in place, unused. Plan: scratchpad `lattice3-transplant.md`.
  **Measured** (320x180, 20 consecutive rAF frames, live audio, energy ~0.04):
  before peak 0.097 / black 0.637 / lit(>0.04) 0.080 / mean 0.0126 / jitter 0.0040;
  after peak 0.112 / black 0.648 / **lit 0.162 (2x)** / mean 0.0155 / jitter 0.012-0.016.
  **Jitter A/B** (fold audio terms zeroed vs live, 2 rounds): 0.0132/0.0163 vs 0.0165/0.0160. The fold's
  audio drivers add nothing. The rise comes from crisp 1-2 px lines streaming (DRIVE_SPEED + ARM_TEX_FLOW
  + spin): moving thin lines change every pixel they cross. The Julia's soft clouds didn't. **Rule:** a
  line-art texture has a higher jitter floor on this metric, so re-baseline instead of comparing to Julia-era
  numbers. If it reads as shimmer on the projector, slow ARM_TEX_FLOW (0.12) first, not the audio.
  Screenshot: red hex/ring/cross outlines with violet fine detail printed along all 4 ribbons, black gaps,
  eye intact, no seam ray, no white.

- **iter18: RATCHET CONTROLLER. Texture coords and fractal params now only move forward.** USER: *"The
  fractals on the arms are flickering, in this way we absolutely have documented in the past. We need a
  controller that ratchets so it always moves forwards."* It's the documented failure from
  lattice-interactive/3 (iter11: raw per-frame `liveGate` on ring radius / line width / spin -> shiver;
  iter16: melodyFlow in the spin ANGLE -> "it rocked back") and advanced-shader-techniques §1-2. New
  chainable controller **`controllers/rezz-ratchet.js`** (jam URL now `...&controller=rezz-ratchet`).
  Phases `rezzFlow / rezzDrive / rezzSpin / rezzMorph` with `phase += (floor + k*smoothedAudio)*dt`, floor
  > 0 so they strictly increase. Envelopes `rezzKick` (attack 30 ms / release 220 ms), `rezzMids`
  (tau 350 ms), `rezzHit` (20 / 300 ms), `rezzGate` (tau 400 ms).
  **Audit -> replaced:**
  | Term | Was (back and forth) | Now |
  |---|---|---|
  | hxFold rim width | raw per-frame `DRIVE_CREST` (lines pulsed) | fixed `HX_BORDER` |
  | hxFold hex size | kurtosis MEDZ | `0.05*sin(rezzMorph*2pi)`, a smooth cycle on a ratchet clock |
  | hxFold ring radius | bass-median breath | `0.03*sin(rezzMorph*3.88+1)` |
  | hxFold spin | `time*HX_SPIN` | `rezzSpin` (bass speeds it, never reverses it) |
  | armU flow | `time*ARM_TEX_FLOW` | `rezzFlow` (energy speeds it) |
  | spiral drive (= fold y coord) | `time*DRIVE_SPEED` | `rezzDrive` |
  | coil breath | energy MEDZ rescaled `spiral`, the fold y coord | **OFF** (`COIL_BREATH 0`) |
  | texture brightness | raw per-frame mids + flux z | `rezzMids` / `rezzHit` envelopes |
  | flex / kick rims / eye kick | raw per-frame `bassNormalized` | `rezzKick` envelope |

  Left alone: the iter14 spin surge (closed-form integral, already monotonic), the prowl band (time only),
  SECTION_MOOD hue (slow medians, colour lane), EYE_BREATH (eye brightness only).
  **A/B** (3 alternating rounds x 16 consecutive rAF frames, 240x135, live audio, energy ~0.04):
  old jit 0.0235 / back-and-forth 0.0066 / brightness pump 0.30e-3 / peak 0.144 / black 0.65;
  new jit 0.0237 / back-and-forth 0.0072 / **pump 0.24e-3 (-20%)** / **peak 0.132** / black 0.67.
  The per-pixel metrics didn't move, because they're dominated by thin lines streaming across pixels,
  so they **cannot see** a slow audio rock under that motion. The fix is structural (no audio term can
  pull a coordinate backwards any more). The user's eye on the projector is the verification for this one.
  Process: built and GL-validated in-page, then /__save-shader. A long single-call A/B detached the
  debugger mid-script; it still saved. **Run A/B in short calls** (one round per evaluate).
  Screenshot: dense red line-lattice on all 4 ribbons, violet rims, black gaps, eye intact, no white.
- **Next suspect if the user still sees flicker: temporal aliasing (wagon-wheel).** Fine fold levels move
  `rate * hxK * 2^(level+1)` periods/s. With flow ~0.15/s at level 9 that's ~0.2-0.4 periods per frame,
  close to the 0.5 Nyquist limit, so those lines can look like they step backwards even with a perfectly
  monotonic clock. Fix: a motion term in the `res` gate (fade a level when its per-frame displacement
  exceeds ~0.25 of its period), or lower HX_LEVELS / raise HX_FIRST. Don't slow the ratchet floors first.
- Design hypothesis: **texture coords and fractal params move only via monotonic accumulators.** Audio
  changes a phase's RATE (≥ a positive floor) or an envelope's AMPLITUDE, never a coordinate's value.
  Anything that has to go back and forth (shape cycles) is `sin(ratchetPhase)`, smooth and slow, not a
  feature.

## Forks
- `rezz-1 ⇐ lattice-interactive/3` (iter17): fractal transplant, not a fork. rezz-1's arm texture is now
  lattice-interactive/3's hex mirror-fold (`fractal()` lines 161-214), controller/wavelet uniforms dropped.

## Fast-tick log (live show mode, 2026-10-03: one visible tweak per minute)
- **iter19: BUILD REVEAL.** New `rezzBuild` in rezz-ratchet (3 s raw-energy envelope vs its 45 s average,
  smoothstep 1.0-1.5, eased over 1.5 s). The shader lifts the fine-level shadow by `0.7*rezzBuild`, so the
  deep violet lattice lights up on builds (brightness only). The shader-side build signal, an energyMedian
  MEDZ, read 0 all the time because the median sits below the mean on this feed, so it's useless as a
  build detector here. **Controller bugs found:** (1) after the Chrome relaunch the page ran a STALE
  controller module with no rezzBuild key. Fixed by re-importing through `loadControllers(..., {bust:true})`
  and `window._hotController`. That hot-swap restarts every phase at 0, so the texture jumps once.
  (2) The long-term average was seeded from a near-silent first reading, which pinned build at 1.0. Now it
  seeds only when the gate is above 0.9. Rest frame: peak 0.159-0.166, black 0.63. Will read 0 until a real
  build.
- **iter20: AUTOPILOT.** The user wants the picture to keep evolving between edits. New `rezzScene` in
  rezz-ratchet: a monotonic clock, 70 s per scene (35 s at full build), starting at a random scene each
  load. The shader hashes a preset per scene index (hex size 0.45-0.75, ring radius 0.10-0.24, violet lean
  0-0.08, headlight-sweep depth 0.35-0.80) and crossfades to the next with smootherstep over the last 45% of
  each scene. Shape/brightness/palette only, no coordinate offsets. The controller save didn't auto
  hot-swap. A manual `loadControllers(bust)` did (scene 43 at first read). Frame: violet-leaning scene,
  lattice dense, eye intact.
- **iter21:** FLEX_AMT 0.12 -> 0.17. The approved centre flex is punchier, about 19% bulge on full kicks (model). Still radius-only and envelope-driven.
- **iter22: BASS ZOOM RATCHET.** User: *"Need more zooming with the bass too. Use the ratcheting mechanism,
  so we are always moving forward."* `rezzZoom` is forward-only: rate 0.045 + 0.95*kick envelope, in log r.
  The shader subtracts it from log(spR) in `spiral` and from armU (as `rezzZoomTex`) **after** the iter16
  flex, so the flex still rides on top. The eye, depth, prowl and hxPix stay on screen radius, so the eye
  stays fixed. **Seamless wrap:** the spiral period is 0.625 and the arm-fold period is 1.6π² = 15.791, with
  no exact common period, so the wrap is at 101 spiral periods (63.125) and the texture shift is scaled by
  1.000641, giving exactly 4 fold periods (and 4·2^i at finer levels) per wrap. Checked in node: 101 / 4.
  The fold is periodic in its input, so a whole-period jump is bit-identical apart from float error (~0.005
  period at level 9). Live: zoom 0.16 -> 1.24 in 1.75 s while kick 0.3-0.9 (about 2x per second on kicks),
  energy 0.05. **The wrap pop hasn't been seen live** (first wrap ~5-20 min in). The controller hot-swap reset
  every phase once. Watch: kick surges move about 0.013 log-r per frame, which is 0.43 of a level-9 fold
  period, near wagon-wheel. Those levels are mostly res-gated at that radius. Add the speed-based LOD if
  fine detail strobes on kicks.
- **iter23: FINE-DETAIL CRAWL.** From level 3 down, each fold level is shifted along x by `fract(rezzDetail * 1.35^(i-3))` BEFORE it folds. The fold repeats every 1 unit, so the wrap is invisible, and the crawl only goes forward. Deeper levels crawl faster in their own cell units. There is also a per-level twist `rezzDetailSpin*0.6*(i-2)`, plus a speed LOD that fades any level moving more than 1/4 of its period per frame (wagon-wheel guard). rezzDetail rate is 0.25 base, + 0.9 on flux hits. The detailSpin rate leans with the centroid slope*rSquared trend. Live: detail 27.3, rate 0.26, spin 3.9.
- **iter24: ADVANCED AUDIO -> FINE LATTICE** (controller envelopes, amplitude only, one feature per domain):
  | Feature | Role | How |
  |---|---|---|
  | spectralEntropy (eased 2 s) | fold depth reveal | levels with ld > 0.35+0.65*depth fade out: calm music = coarse lattice, chaotic = full depth |
  | spectralRoughness (eased 0.8 s) | fine-line grit | per-level gain 1 + 0.7*grit*ld |
  | spectralCrest (eased 1 s) | rim contrast | halo *(1 - 0.7*sharp), crisper rims, never width |
  | treble (env 50/400 ms) | violet sparkle | +0.9*air on the finest levels (ld > 0.6) |
  | spectralFlux z (env 20/300 ms) | crawl surge | rezzDetail rate 0.25 + 0.9*hit (iter23) |
  | centroid slope x rSquared | twist lean | rezzDetailSpin rate 0.05 + 0.035*trend, floor 0.01 (iter23) |
  Live: grit 0.33, depth 0.43, sharp 0.04, air 0.26, trend 0.30. Frame peak 0.08, black 0.70 (dimmer
  because depth 0.43 hides the deep levels).
- **iter25: ZOOM STEADY + ARM SPIN RATCHET.** User: *"Don't speed up the actual zooming by the bass. I need the spirals moving."* rezzZoom is now a constant 0.06 log-r/s (bass removed; the seamless wrap is kept). New `rezzArmSpin` (turns, % 1; one turn equals one atan-seam jump, so the wrap is seamless) replaces the iter14 time-only surge (0.015 turns/s). Rate is max(0.03, 0.055 + 0.06*flux-hit + 0.035*centroid trend), no bass. Live: 0.075 turns/s (27 deg/s), zoom 0.06/s.
- **iter26: DARKWAVE GRADE.** User: *"go more darkwave stuff. Make those lattices more evil."* At the end of the pipeline, the hue is pushed hard (smoothstep 0.38-0.72 on the red/violet position, a spatial field so it can't flash in time) to oxblood 0.988 or bruise violet 0.745, with no magenta middle. The violet side runs at 0.55x lightness, then a contrast curve (gamma 1.45) and cap 0.25 (EVIL_CAP; was 0.275). Saturation is 0.97. Live: peak 0.115, black 0.82 (was ~0.65), magenta share of lit pixels 0.11. Read: thin hot-red wire lattice on black. The eye went too dim under the gamma; that's next.
- **iter27: ARMS SPIN ON bear-move eyeSpin.** User: *"I thought we had a controller for the rezz shader that actually gave us continuous rotation."* That is `controllers/bear-move.js` (bear/1 rezz eyes, 33c4fd3). Its eyeSpin rate is 1.15 + 1.6*energyN + 5.5*kick-lift rad/s, a monotonic accumulator wrapped at 2pi. Chained: jam URL is now `&controller=rezz-ratchet&controller=bear-move` (no uniform-name clash). The shader uses `spinPhase = eyeSpin/2pi`. One wrap is one full turn, which is seamless for both the spiral (4 arms) and the fold (1 period per turn). **Do not scale it by k<1:** a fractional turn at the wrap pops the texture. Live: 2.69 rad/s (~0.43 turns/s) at energy 0.057. Faster than the darkwave "slower" ask, but this is the rotation the user remembered. rezzArmSpin (iter25) is still exported, unused.
- **iter28: SINISTER EYE.** The pupil disc is now a dim blood-red iris (EYE_IRIS_L 0.11, brighter on
  kicks, glowing from the slit outward) with a vertical lens-shaped cat **slit** of pure black. Eye-local
  coords follow the flexed radius, so the slit breathes with the iter16 flex. The eye ring and iris are
  spared from the iter26 darkwave gamma (`mix(gammaL, L, eyeKeep)`), so the eye stays the focal point.
- **iter29: ARM SPIN SLOWED.** User: *"Too fast."* (bear-move eyeSpin ran ~0.43 turns/s.) Back to
  `rezzArmSpin`, now with eyeSpin's shape at low coefficients: 0.07 + 0.09*energyEnv + 0.02*kick +
  0.015*flux, floor 0.04 turns/s, about 0.07 at rest and ~0.18 at peak. % 1 is still seamless.
  Live: 0.070 turns/s (energy 0 at the read). bear-move is still chained in the URL but nothing uses it,
  so drop it on the next natural reload.
- **iter30: EVIL GEOMETRY.** Fold rim is now a star (hex ∪ hex rotated 30°, 12 spikes), the cross axes are thorns `min(a.x*(1+4a.y), a.y*(1+4a.x))` that taper away from the cell centre, and the ring is narrower (EVIL_RING 0.65). Shape only; widths and clocks are untouched. Reads as red cracks and veins on black. Live, with audio silent (energy 0, so the entropy reveal is at its minimum): peak 0.114, **black 0.88**. Sparse in silence; should fill in when music returns.
