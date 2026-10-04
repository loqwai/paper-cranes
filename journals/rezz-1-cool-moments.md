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
