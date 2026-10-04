# moody-octopus/dark-1 — Session Journal

## Status
Iter 15 of /vibej run. Live mic input (no Spotify). Forked from `shaders/redaphid/wip/moody-octopus2.frag`.

**HARD CONSTRAINT — DARK TENT.** The user is projecting in a dark tent and does not want to blind
the room. Every edit this session must respect:
- Outlines only. No flood-fill, no full-frame color washes.
- Mostly black. Black is the default state of any pixel.
- Line lightness ceiling ~0.42-0.45 in HSL. Never approach white.
- Absolute output clamp at 0.72. Do not raise it.
- Feedback is multiply-decay + `max()`, never additive — additive feedback blows out to white.

## History of changes
- **Fork from moody-octopus2 (iter 1).** The original flood-filled the frame at HSL lightness ~0.55
  with a palette-driven wash — far too bright for a tent. Replaced the fill with contour extraction:
  the Julia escape field is sampled with finite differences, banded into level curves, and only the
  band edges + the silhouette gradient spike get ink. Everything else is hard black via a
  `smoothstep(0.02, 0.10, maxChannel)` floor.
- **Band density reduced (iter 1).** `bands` 1.0+spread*3.0 → 0.55+spread*1.6. The dense version
  moiréd badly in the tight fractal regions.

## History of changes (cont.)
- **Sparseness gate + treble filigree (iter 2).** Added `DENSITY = 0.30 + energyNormalized * 0.85`
  multiplying the contour band count, so quiet passages thin to a few strands instead of holding
  full density. Added `FILIGREE` — a second much finer contour set (`fract(f * 3.1)`) gated on
  positive `trebleZScore`, so airy bright passages get fine shimmer riding the same arms.

- **Hue drift + perceptual luma compensation (iter 3).** Music went flat (all z-scores ~0,
  energySlope 0.000, R^2 0.02) and exposed two problems. (a) `pitchClassNormalized` reads 0.00 on
  this live mic, so `HUE_BASE` was pinned to the teal-violet band forever — added
  `HUE_DRIFT = time * 0.006` plus a `spectralCentroidNormalized` term so hue keeps walking.
  (b) Steady grooves froze the geometry — added a `calm` gate (inverse of |energyZScore|) that
  fades in a slow autonomous swell only when the music has no dynamics of its own.
- **Luma-weighted lightness (iter 3).** The hue drift walked into green and the frame visibly
  brightened at IDENTICAL HSL lightness, because green sits at the luminance peak. Added
  `lumaRisk = exp(-((fract(hue+0.75)-0.5)*3.4)^2)` pulling lightness 0.42 -> 0.28 near green/yellow.
  Without this, hue drift silently violates the dark-tent constraint.

- **Sub-bass presence + transient snap + FEEDBACK FIX (iter 4).** Deep groove hit
  (bass 0.74 avg peaking 0.97, treble 0.06, centroid collapsed to 0.09, crestZ range 1.08).
  Three changes:
  (a) `PRESENCE = max(energyNormalized, bassNormalized * 0.42)` drives DENSITY — a sub-bass
      passage reads LOW on energyNormalized, so the old energy-only gate was thinning the
      linework to nothing exactly at the heaviest moment in the room. Bass now supplies a floor.
  (b) `deep` gate (centroid < 0.30 AND bass > 0.35) drives an inward `swell` — deep material
      displaces the arms by pressure rather than lighting them up.
  (c) transients: `spectralCrestZScore` now SUBTRACTS from LINE_WIDTH (floored at 0.35 so the
      smoothstep can't collapse), so kicks snap the linework taut instead of flashing brightness.
- **FEEDBACK_DECAY 0.87 -> 0.62 (iter 4) — the big one.** After (a) the frame measured
  meanLuma 0.095 (2.6x over baseline). Pulling DENSITY back barely moved it (0.095 -> 0.094),
  which proved density was NOT the cause. Instrumented the actual uniform values live and found
  DENSITY was only 0.36 with the deep gate fully OFF — so the brightness was entirely the
  feedback trail. With `max(col, prev*decay)`, decay 0.87 keeps a pixel lit ~15 frames, so
  trails accumulate across the whole frame. Dropping to 0.62 restored meanLuma 0.045.

- **Flux contour phase-shift (iter 5).** `spectralFluxZScore` drove nothing until now. It's the
  best transition signal available (and per user preference we do NOT use the `beat` uniform).
  Now shoves the contour phase: `level = fract(f*0.5*bands + phase)` where
  `phase = max(fluxZ,0)*0.55 + time*0.02`. Timbral hits visibly reconfigure the whole linework
  and it costs ZERO brightness — it moves line, it doesn't add line.
- **FILIGREE re-keyed off treble (iter 5) — it was dead code.** Instrumented it rather than
  guessing: over 20 frames, `trebleZScore` peaked at 0.21, giving max ink contribution **0.04**
  (of 0-1) active in **1/20 frames**. It had never been visible since being added at iter 2.
  On this mic treble sits at 0.05 avg so the z-score almost never clears zero. Re-keyed to
  `roughness x entropy` (both carry real range here): max ink **0.285**, active **11/20 frames**.
- **DENSITY floor 0.30 -> 0.62, swell softened (iter 5).** After the phase shift the frame
  measured meanLuma **0.009** with lit fraction 5.5% — a near-EMPTY projection, the opposite
  failure from iter 4. The phase scroll means fewer pixels sit on a band edge at any instant.
  Also softened the `deep` swell (0.10+bz*0.12 -> 0.04+bz*0.07) because it was hollowing out the
  centre of the frame and pushing all structure to the edges. Result: meanLuma 0.050, lit 22.6%.

- **Nyquist ceiling on band density (iter 6) — fixes the moiré flagged at iter 1.**
  Bright chaotic passage (centroid 0.66, entropy 0.77, spread 0.70, roughness 0.62) drove
  `bands` to **1.63**, the highest of the session. Frame measured meanLuma 0.0088 AND
  peakLuma collapsed **0.643 -> 0.216**. Peak collapsing is the tell: above ~1 band per pixel
  the level curves alias into each other, the smoothstep averages toward mid-grey, and NO pixel
  reaches full line brightness. The frame goes dim and mushy — not bright, which is the
  counter-intuitive part. Fix: `bands = min(rawBands, 0.5 / max(grad, 0.02))`. `grad` is the
  field's change per pixel, so `bands * grad` ~ bands-per-pixel; hold it under 0.5 (Nyquist).
  Also faded FILIGREE out in high-gradient regions (`1 - smoothstep(0.10, 0.30, grad)`) since at
  3.1x finer it aliases first. Result: peakLuma **0.673**, meanLuma **0.035**.

- **Treble tremble (iter 7).** Treble became the DOMINANT band (0.65 avg, peak 0.95, trebZ range
  1.41 — widest swing of any feature). It was only trimming LINE_WIDTH, wasting the strongest
  signal in the room. Added a high-frequency shiver on the arms:
  `uv += vec2(sin(uv.y*34 + time*21), cos(uv.x*31 + time*18)) * trem` where
  `trem = smoothstep(0.30,0.75,trebleNormalized) * (0.004 + max(trebZ,0)*0.006)`.
  Displacement ONLY — moves line, never adds light. Measured firing in 11/16 frames.
- **PRESENCE now takes the max across all three bands (iter 7).** With bass at 0.33 and energy
  0.38, a bright treble-forward passage produced presence 0.38 and the frame fell to meanLuma
  **0.0218**, under the 0.025 darkness floor. Added `trebleNormalized * 0.38` to the max.
  PRESENCE has now been widened twice for the same underlying reason (iter 4 for bass, iter 7
  for treble): **any single band under-reports how much the room is doing.**
  Result: meanLuma 0.048, and the per-frame minimum 0.032 now stays above the floor too.

- **Mids drive saturation (iter 8).** Mids collapsed to 0.24 (lowest of the session) while
  treble stayed at 0.62 — a scooped mid-range. `midsNormalized` was the ONLY band driving
  nothing. Now: `sat = mix(0.30, 0.95, smoothstep(0.15, 0.60, midsNormalized))`. Scooped mids
  desaturate toward near-monochrome line, full mids push rich colour.
- **TRUE luma normalisation replaces the hue gaussian (iter 8) — the iter-3 fix was insufficient.**
  I assumed saturation was brightness-neutral. It is NOT. Measured Rec.709 luma of `hsl2rgb` at
  fixed lightness 0.35, sat 0.30 vs 0.95:
      hue 0.17 (yellow): 0.440 -> 0.634   desaturating LOWERS luma by 0.195
      hue 0.67 (blue):   0.260 -> 0.066   desaturating RAISES luma by 0.195
  Opposite signs, up to +/-0.2. The iter-3 hue-only gaussian could not correct a two-axis
  problem — measured spread across the hue x sat grid was **0.673**. First attempt (scaling the
  gaussian by satFactor) did not help either: still 0.673.
  Replaced the whole heuristic with the real quantity: build the colour at lightness 0.5, measure
  its ACTUAL luma, rescale to a fixed `TARGET_LUMA = 0.34`, clamp channels at 0.80.
  Spread **0.673 -> 0.198** (residual is just the channel clamp on saturated primaries).
  Frame peakLuma dropped 0.689 -> 0.406 because no hue runs hot any more.

- **ALL *Slope / *RSquared features are dead on this input (iter 9).** Measured directly:
  `energySlope`, `spectralCentroidSlope`, `bassSlope`, `trebleSlope` all read **0.0000** with
  R^2 **0.00-0.01**. Do NOT build build-up/drop detection on them — it would be dead code.
  Use `energyZScore` (range 1.27, peaks +1.04) instead. Saved building a whole drop-detector
  that would never have fired.
- **SURGE stretch (iter 9).** `SURGE = smoothstep(0.05, 0.65, energyZScore)` drives a radial
  swirl + inward pull that increases with distance from centre — the creature elongates and
  unwinds on an energy spike. Geometry only, no light.
- **Stacked gates multiply their selectivity (iter 9).** First attempt gated at
  `smoothstep(0.25,1.00,energyZ) * smoothstep(0.45,0.85,centroid)` and fired **2/18 frames**.
  Two individually reasonable gates compose into an unreachable one. Fix: loosen the primary
  gate and BLEND the secondary condition (`mix(0.45, 1.0, highAndThin)`) so it biases strength
  rather than vetoing. Always measure frames-active after ANDing two conditions.
- **AUTO-EXPOSURE (iter 9) — the big structural change.** Brightness had drifted out of band
  five times across iters 4-9 in both directions, because density, hue, saturation and feedback
  all move with the music and hand-tuned constants only hold for the passage they were tuned on.
  The shader now estimates its own contribution to frame mean luma
  (`pixelLuma * coverage`, where coverage blends local `ink` with the density term) and scales
  toward `TARGET_MEAN = 0.042`, clamped [0.55, 1.45].
- **Coverage-dependent black floor + hard band cap (iter 9).** Auto-exposure alone kept emitted
  light legal but looked WRONG — a dense passage rendered as a mottled grey field, not outlines
  (true-black fraction only 0.44). Two additions fixed it:
   (a) black-floor threshold RISES with coverage (`smoothstep(0.02..0.16, 0.10..0.34)`) so the
       dim tail of the linework is crushed instead of being lifted into visibility by dimming;
   (b) a hard aesthetic cap `bands <= 1.05` on top of the Nyquist limit — a busy passage must
       render as FEWER lines, not many dim ones.
  True-black fraction 0.44 -> **0.73**, and the outlines-on-black character returned.

- **Auto-exposure validated across a passage change (iter 10).** First tick of the session
  needing NO brightness intervention: on arrival the frame measured meanLuma 0.029, 11/16 in
  band, true black 0.65, with no edit from me. The iter-9 mechanism holds on its own.
- **Structure-driven hue (iter 10).** The frame had gone MONOCHROME — every line the same
  violet — because hue varied only with `f * 0.012`, far too small a coefficient to separate
  anything. Now hue also shifts with local gradient, so smooth sweeping arms and dense fractal
  sucker-pods take different hues. Measured: occupied hue bins 1 -> **7 of 12**, and
  **20/20 frames still in band with 0 over** — hue variety is FREE now, exactly as the iter-8
  luma normalisation predicted. That earlier work is what makes this safe.
- **`grad` needs a smooth compressor before driving colour (iter 10).** First version used
  `smoothstep(0.05, 0.60, grad)` and painted hard RECTANGULAR BLOCKS along the frame edges.
  Cause: `grad` is a finite difference over an iteration COUNT, so it jumps discontinuously at
  escape-band boundaries, and a smoothstep's knees turn those jumps into visible seams.
  Fix: `structure = grad / (grad + 0.45)` — a saturating curve with no knees. Seam rate
  (adjacent pixels, similar luma, large RGB jump) fell to **0.031**, true black recovered
  0.52 -> **0.70**, hue variety preserved at 7 bins.

- **Iter 11 was mostly a NET LOSS — read this before repeating it.** Dense passage (entropy 0.84
  session high, roughness 0.68, spread 0.69, crestZ -0.35 = smooth sustained wash, no transients).
  Hue bins had fallen 7 -> 3, i.e. monochrome again one tick after the iter-10 fix.
  Two attempted fixes, BOTH reverted:
   1. `structure = smoothstep(0.12, 0.88, structure)` to separate the gradient populations ->
      meanLuma **0.004**, true black 0.93. Frame essentially empty.
   2. spread-adaptive `gradScale = mix(0.45, 0.95..1.30, spread)` -> recovered to 0.016 but still
      under the darkness floor, and **hue bins stayed at 3**, so it did not fix the target problem.
  Reverted `structure` to the iter-10 constant `grad / (grad + 0.45)`.
  **Kept:** coverage penalty now engages earlier — `dense = smoothstep(0.06, 0.30, coverage)`
  (was 0.10..0.45). Measured on dense material: true black **0.43 -> 0.67**, lit fraction
  **0.475 -> 0.271**. This is the one real improvement from the tick.
  Also tried TARGET_MEAN 0.042 -> 0.034; the music dropped out during that measurement
  (lit fraction 0.271 -> 0.048) so the result was uninterpretable. Restored 0.042.
- **Diagnosis recorded, fix deferred: the monochrome-on-dense problem is DISTRIBUTIONAL.**
  The hue swing is healthy (measured 0.242 of the wheel). What collapses is the GRADIENT
  histogram: on a uniformly-busy field almost every pixel lands in the same `structure` bucket.
  Rescaling or reshaping that one axis cannot fix it — both attempts failed. A real fix needs a
  SECOND, gradient-independent hue axis (e.g. field value `f` at a much larger coefficient, or
  angular position) so colour separates even when gradients are uniform.

- **SECOND HUE AXIS (iter 12) — the iter-11 deferred fix, now done.** Waited for a verified
  STABLE passage before attempting it (measured lit-drift ratio 1.15 across the window, and every
  audio feature near-identical between halves), so results were finally attributable.
  The fix was already half-present: `f * 0.012` was in the hue sum, but `f` spans 0..48, so that
  covered only ~0.58 of the wheel across the ENTIRE fractal — locally adjacent regions came out
  nearly identical. Replaced with `escapeBand = fract(f * 0.11)` at a real coefficient, so colour
  cycles with escape-time BANDS, which are independent of gradient magnitude.
  **Hue bins 3 -> 6, then 7. Seam rate 0.008** — the `fract` wrap does NOT produce visible seams
  at this scale, which was the risk worth checking.
- **Aesthetic band cap 1.05 -> 1.45 (iter 12) — an iter-9 constant that was too tight.**
  The frame had been sitting at meanLuma 0.016 with 16/18 frames UNDER the floor. Instrumented
  the live values: `rawBands` was 1.13 on perfectly ordinary material, so the 1.05 cap was the
  BINDING constraint essentially all the time, not just on dense passages as intended. It had
  been set during an unusually busy passage. Raised to 1.45 so it engages only when genuinely
  needed. meanLuma **0.016 -> 0.034**, 18/20 frames in band.
  Lesson: a limit calibrated during an extreme passage becomes a permanent handicap. Check what
  a cap's input actually reads under TYPICAL conditions before trusting it.

- **Band cap 1.45 -> 1.20 (iter 13) — fixing my own iter-12 regression.** Frame arrived at
  meanLuma **0.105** with **24/24 frames OVER** the ceiling, true black down to 0.41: the
  brightest of the session. Instrumented it: `rawBands` averaged **1.345**, so the old 1.05 cap
  would have clipped to 1.05 while my new 1.45 cap let 1.31 through — ~25% more line. Both caps
  were wrong in opposite directions; 1.20 sits between two MEASURED failures rather than being
  guessed. meanLuma 0.105 -> 0.058.
- **Coverage penalty: 3.2/2.4 -> 4.6/2.6 -> 3.6/2.5 -> back to 3.2/2.4 (iter 13).**
  4.6/2.6 collapsed the frame (20/20 under, lit fraction 0.35 -> 0.04) on a stable input
  (drift 1.05), so that was purely my change — this term is very sensitive.
  3.6/2.5 then produced the **best brightness numbers of the whole session: 22/22 frames in
  band, 0 over, 0 under, mean 0.036** — and I reverted it anyway, because seam rate hit
  **0.075** (2x threshold) and the screenshot showed the linework broken into SPECKLED STIPPLE.
  Crushing the dim tail of each line fragments it into dots.
  **This is the clearest case of the session where perfect metrics meant a worse picture.**
  Continuous line matters more than a perfect luma histogram; the brightness is adequately
  handled by the 1.20 band cap plus auto-exposure.

- **FILIGREE was the stipple (iter 14) — root cause found.** Stable mid-dominant passage
  (mids 0.67 session high, drift 1.04) arrived with meanLuma **0.094 (22/22 over)** AND seam rate
  **0.11** (~3x threshold, worst of session). Instrumented the gates: filigree averaged **0.35 and
  pegged at its 0.55 ceiling** while `bands` was simultaneously at the cap. A contour set 3.1x
  finer than the main bands, stacked on ALREADY-SATURATED coarse bands, is what produces stipple.
  Fix: fade filigree on a SECOND axis — main-band headroom, not just gradient:
  `bandsHeadroom = 1 - smoothstep(0.85, 1.20, bands)`.
  Seam rate **0.11 -> 0.030**. This closes the iter-13 stipple Todo at its source rather than by
  more global dimming, which is exactly what that Todo predicted.
- **Band cap 1.20 -> 1.10 (iter 14).** The filigree fix cured the stipple but barely moved
  brightness (0.094 -> 0.086, still 18/20 over) — so filigree was the STIPPLE cause, not the
  brightness cause. `rawBands` averaged 1.31 against the 1.20 cap. Stepped to 1.10 (deliberately
  NOT back to 1.05, measured too tight at iter 12 — bisecting between two known failures).
  Result on stable input: meanLuma **0.030, 19/22 in band, 0 over**, true black **0.42 -> 0.80**.

- **Iter 15: the band cap was NOT the problem — checked before lowering it a 4th time.**
  Extreme material (entropy **0.93** session high, roughness 0.79, spread 0.81) arrived at
  meanLuma 0.080, 22/22 over. Instrumented first: `rawBands` averaged **0.905** and the 1.10 cap
  **never bound** (0/10 samples). Lowering it again would have done nothing and darkened every
  other passage. Worth the extra probe.
- **Core/halo split — a new diagnostic.** Separated frame luma into line CORES (l >= 0.10) vs
  dim HALO (0.012-0.10). Result: cores carried **68% of luma from 7.4% of pixels**; the halo was
  minor. So on chaotic material the overshoot is **per-line brightness, not line count** — a
  different failure mode from iters 13/14 despite identical symptoms.
- **FAILED: widening exposure authority. Reverted.** Lower bound 0.40 -> 0.26 gave 22/22 UNDER;
  -> 0.33 gave 23/24 OVER with **seam rate 0.174 (worst of session)** and a screenshot showing
  magenta flooding the frame plus corner block artifacts. `exposure` is a per-frame reaction with
  NO memory, so widening its authority makes it chase a moving input harder in BOTH directions
  instead of tracking it. Restored 0.40 and wrote the finding into the shader.
- **KEPT: entropy-gated INK_GAIN.** The fix the diagnosis actually pointed to —
  `INK_GAIN *= 1 - smoothstep(0.60, 0.92, entropy) * 0.22`. Chaotic passages already put a lot of
  line on screen, so each line gives back some gain. First tried 0.40, which gutted the frame when
  a quiet passage coincided (near-empty screenshot); 0.22 holds.
  Result: meanLuma 0.080 -> **0.035, 18/22 in band, 0 over**, true black 0.73, seams 0.174 -> 0.084.

## Measured brightness
Sampled off the live canvas (160x90 downsample, Rec.709 luma).
**Target band: meanLuma 0.025 - 0.055.** There is a FLOOR as well as a ceiling — too dark reads
as a broken/off projector, which is its own failure.
- iter 3: meanLuma 0.037, peak 0.439, lit 0.208
- iter 4 (after PRESENCE, before feedback fix): meanLuma **0.095**, lit 0.394 — VIOLATION
- iter 4 (after FEEDBACK_DECAY 0.62): meanLuma **0.045**, peak 0.619, lit 0.183 — OK
- iter 5 (after flux phase shift): meanLuma **0.009**, lit 0.055 — TOO DARK, near-empty frame
- iter 5 (after DENSITY floor 0.62 + softer swell): meanLuma **0.050**, peak 0.643, lit 0.226 — OK
- iter 6 (bright chaotic passage, bands 1.63): meanLuma **0.009**, peak **0.216** — ALIASED
- iter 6 (after Nyquist ceiling): meanLuma **0.035**, peak **0.673**, lit 0.147 — OK
- iter 7 (bright treble passage, before PRESENCE widen): meanLuma **0.022**, peak 0.687 — UNDER FLOOR
- iter 7 (after PRESENCE widen): meanLuma **0.048** (per-frame min 0.032), peak 0.689, lit 0.163 — OK
- iter 8 (after true luma normalisation): meanLuma **0.040** (min 0.033, max 0.047), peak
  **0.406**, lit 0.181 — OK, and now hue-INDEPENDENT. Peak fell because runaway-bright hues are
  normalised down to the same emission as everything else.
- iter 9 tuning sequence (30-frame windows, input drifting throughout):
    target 0.042 clamp [0.55,1.45] -> 18/26 in band
    target 0.038 clamp [0.42,1.45] -> 0/30 in band, ALL under (lower target + wider darkening
      clamp COMPOUNDED — do not tighten both together)
    clamp lower 0.28 -> 0 over, but 23/30 under
    clamp lower 0.40 -> 28/30 OVER (but lit fraction had risen 0.13 -> 0.72; different music)
    + coverage floor & penalty -> **24/24 in band, 0 over**, true black 0.44
    + hard band cap 1.05 -> true black **0.73**, outlines restored
  **Caution:** windows taken minutes apart are NOT comparable — the input's own lit fraction
  ranged 0.13-0.72 within this single tick. Never bisect a constant against a moving input;
  prefer a structural guarantee (coverage penalty, band cap) over a tuned coefficient.

Track the per-frame MINIMUM mean, not just the average — an average inside the band can still
have frames dipping under the floor.

**Watch peakLuma, not just meanLuma.** A collapsing peak with a low mean means ALIASING (bands
too fine to resolve), which needs a density ceiling. A low mean with a healthy peak means the
frame is genuinely too empty, which needs a density floor. Opposite fixes, same meanLuma symptom.

**Measure every tick that touches** INK_GAIN, GLOW_AMOUNT, FEEDBACK_DECAY, DENSITY/PRESENCE,
lightness, or the black-floor smoothstep. Sample over ~8 frames, not one — trails mean a single
frame under-reports. **FEEDBACK_DECAY is the dominant lever**, not density: check it FIRST when
mean luma climbs.

## Cool moments
- **Iter 1** — `bass 0.60 / entropy 0.76 / centroid 0.58` (room tone + music). Contour bands read as
  flowing tentacle linework: deep teal-blue sweeping curves with magenta fractal bud clusters where
  the Julia set's self-similar structure crowds together. Exactly the octopus-ink look on black.
  - **What worked:** the escape-field contours naturally produce long sweeping strands (the "arms")
    plus dense knotted clusters (the "suckers"). Free structure, no explicit geometry needed.
  - **Design hypothesis:** contour-of-a-scalar-field is a much better dark-venue primitive than
    palette-fill. Brightness scales with line *density*, not line *value*, so it stays dark.

- **Iter 2** — `bass 0.29 / bassZ -0.74 / trebZ +1.00 / centroid 0.71 / energy 0.11 / spread 0.82`
  (sparse bright breakdown, bass dropped out). The new DENSITY gate transformed the frame: huge
  black voids, a handful of sweeping violet arms, magenta sucker-clusters concentrated into
  discrete pods. Reads unmistakably as an octopus rather than a texture field.
  - **What worked:** tying band *count* (not band brightness) to energy. The frame gets darker
    when the music thins out because there is simply less line, which is exactly the dark-venue
    behavior we want — quiet music literally emits fewer photons.
  - **What was missed:** trebZ was pinned at +1.00 and the filigree is subtle at 0.55 weight;
    hard to see whether it fired. Watch it on the next bright passage.
  - **Design hypothesis:** modulate line COUNT with energy, line COLOR with pitch/centroid, and
    never modulate line BRIGHTNESS. Keeps the brightness budget fixed while staying reactive.

- **Iter 3** — `bass 0.58 / mids 0.51 / energy 0.57, ALL z-scores ~0.0, R^2 0.02` (flat steady
  groove, no dynamics). Hue had drifted to deep bioluminescent green with cyan sucker-clusters on
  black. Long green arms sweeping the edges, dense cyan fractal buds in the pods.
  - **What worked:** the `calm` gate. A flat groove used to freeze the frame; now it gets a slow
    autonomous swell that reads as the creature breathing rather than as a stalled animation.
  - **What was missed:** nothing visually, but this tick surfaced the perceptual-brightness bug —
    equal HSL lightness is NOT equal apparent brightness across hue. Caught it before the room did.
  - **Design hypothesis:** any shader with a drifting hue in a dark venue needs luma compensation,
    or the brightness constraint holds only for the hues you happened to test.

- **Iter 4** — `bass 0.74 (peak 0.97) / treble 0.06 / centroid 0.09 / energy 0.10 / crestZ range 1.08`
  (deep sub-bass groove, nothing above the low end). After the fixes: pure black voids with a
  crisp filigreed boundary in magenta/cyan and green arms sweeping the frame edges. The tighter
  feedback made the linework read as actual LINE rather than smear — a real quality gain, not
  just a brightness one.
  - **What worked:** separating "presence" from "energy". A deep groove is loud in the room but
    quiet on `energyNormalized`; keying visual density to energy alone drops the visual out
    exactly when the music is heaviest.
  - **What was missed:** nothing musically. Methodologically: I changed density and re-measured
    density, when the actual culprit was feedback. Instrumenting the live uniform values (rather
    than reasoning about the code) found it in one step.
  - **Design hypothesis:** in a feedback shader, trail decay dominates mean brightness far more
    than anything that draws. Budget the decay first, then spend what's left on linework.

- **Iter 5** — `energy 0.61 / bassZ rng 0.89 / fluxZ rng 1.12 (spike +0.78) / entropy 0.48 /
  roughness 0.23 / centroid 0.17` (active bass-forward passage, lots of timbral motion).
  Best frame of the session: dense magenta/cyan filigree lacework running through the body,
  green arms sweeping around it, deep black elsewhere.
  - **What worked:** the re-keyed filigree is what makes this frame. Detail at two scales at once
    (coarse contour + fine lacework) is what sells "creature" over "abstract curve".
  - **What was missed:** nothing this tick. Both failures were caught by measurement, not by eye.
  - **Design hypothesis:** effects must be keyed to features that are ALIVE on the actual input
    device. A textbook-correct mapping (shimmer <- treble) is worthless if that feature never
    moves on a live mic. Instrument the gate, don't assume it fires.

- **Iter 6** — `centroid 0.66 / entropy 0.77 / spread 0.70 / roughness 0.62 / treble 0.49,
  every z-score swinging ~1.0` (bright, full-spectrum, chaotic). After the Nyquist fix:
  chartreuse/olive arms with bright green sucker-pods on deep black, lines crisp with real
  contrast instead of averaging to grey.
  - **What worked:** the density ceiling. Counter-intuitively the busiest music needs FEWER
    bands, because the field's own gradient is already supplying the visual complexity.
  - **What was missed:** treble is 0.49 here vs 0.05 at iter 5 — so the iter-5 conclusion
    ("treble is dead on this mic") was PASSAGE-specific, not a property of the device. The
    roughness x entropy re-key is still the better choice, but the reasoning was over-general.
  - **Design hypothesis:** contour shaders need both a floor AND a Nyquist ceiling on band
    density. Between them is the only range where lines read as lines.

- **Iter 7** — `treble 0.65 (peak 0.95, trebZ rng 1.41) / bass 0.33 / centroid 0.61 /
  entropy 0.72 / roughness 0.57` (bright, airy, hi-hat/cymbal-forward). Magenta-violet arms with
  orange-and-chartreuse coral clusters in the pods — the most convincingly "deep-sea creature"
  frame so far.
  - **What worked:** treble as DISPLACEMENT rather than illumination. The tremble reads as the
    creature reacting to the cymbals without spending any brightness budget. This is the general
    dark-venue move: high-frequency content should shake the geometry, not light it.
  - **What was missed:** the darkness floor was hit for the second time in three ticks, both
    times because PRESENCE didn't count the band that was actually carrying the music.
  - **Design hypothesis:** a "presence" driver must be a max across bands, not any single one.
    Bass-only misses airy passages; energy-only misses sub-bass; either alone drops the visual
    exactly when that band is carrying the track.

- **Iter 8** — `mids 0.24 (session low) / treble 0.62 / centroid 0.61 / bass 0.27` (scooped
  mid-range, hollow middle). Deep crimson/magenta arms with olive-gold clusters, visibly calmer
  and more even than previous ticks because no hue is running hot.
  - **What worked:** normalising to measured luma instead of correcting with a hue heuristic.
    Brightness is now genuinely independent of where the hue drift sits, which is the property a
    dark venue actually needs — not "dark for the hues I tested".
  - **What was missed:** I asserted "saturation doesn't move luma much at fixed lightness" in the
    code comment BEFORE measuring. It moves it by +/-0.2 with hue-dependent sign. Measuring the
    claim immediately after writing it caught a wrong assumption that would otherwise have
    shipped as a comment justifying a bug.
  - **Design hypothesis:** when a constraint is about a measurable output quantity (emitted
    light), compute that quantity and normalise to it. Heuristic corrections on the inputs
    (hue curves, lightness curves) will always leave a residual on the axes you didn't model.

- **Iter 9** — `energyZ +0.45 avg (peak +1.04, rng 1.27) / centroid 0.83 (session high) /
  bass 0.16 / mids 0.16`. Looked like a build-up; the slope features proved there was no
  confirmed trend, only z-score spikes.
  - **What worked:** making brightness a STRUCTURAL property (coverage penalty + band cap +
    coverage-dependent black floor) rather than a tuned constant. Five ticks of manual
    re-tuning collapsed into one self-regulating mechanism.
  - **What was missed:** I spent several rounds bisecting exposure constants against an input
    whose density was itself changing by 5x. Should have recognised sooner that a moving target
    can't be tuned against and gone structural immediately.
  - **Design hypothesis:** in a live-input shader, any constraint on OUTPUT (brightness,
    coverage, contrast) must be enforced by a mechanism that reads the output, not by
    coefficients chosen while watching one passage.

- **Iter 10** — `treble 0.59 / centroid 0.69 / bass 0.27 / mids 0.27` (stable bright passage,
  nothing dramatic). Two frames worth keeping: violet ribbon arms on true black with fine sucker
  detail at the tips (pre-edit), then magenta/violet fractal frond body with GREEN contour lines
  sweeping around it (post-edit).
  - **What worked:** splitting hue by local gradient. Arms and pods now read as different
    materials, which is what made the iter 5 / iter 7 frames feel like a creature rather than a
    pattern. Colour separation is a structural cue, not decoration.
  - **What was missed:** nothing musically — this was a free tick spent on look rather than
    constraint, the first of the session.
  - **Design hypothesis:** derive hue from what a pixel IS (its local structure), not only from
    where it is. And never feed a raw iteration-count derivative into colour without a smooth
    compressor — discontinuities that are invisible in a luma mask become hard seams in hue.

- **Iter 11** — `entropy 0.84 (session high) / roughness 0.68 / spread 0.69 / centroid 0.74 /
  crestZ -0.35` (dense sustained wash, no transients). Final frame: magenta fractal body with
  green sucker-rosettes and cyan contour arms on black — good, and multi-hue.
  - **What worked:** the earlier-engaging coverage penalty. Also worth noting hue bins recovered
    7 on their own once density fell, which CONFIRMS the distributional diagnosis rather than a
    palette-range one.
  - **What was missed:** I burned a whole tick oscillating. Three separate measurements landed
    on materially different music (lit fraction 0.475, then 0.271, then 0.048), so most of the
    comparisons were invalid. I also wrote a code comment asserting `structure` was consumed by
    more than hue, then grepped and found it feeds hue ONLY — the assertion was wrong and I
    corrected it in the file.
  - **Design hypothesis:** when the input is drifting faster than you can measure, STOP tuning.
    Revert to the last known-good state, record the diagnosis, and defer the fix to a tick where
    the input is stable enough to attribute cause. A tick that ends with an accurate written
    diagnosis and no regression beats one that ships an unverified change.

- **Iter 12** — `bass 0.40 / treble 0.55 / mids 0.41 / energy 0.50 / entropy 0.75 /
  centroid 0.65 / spread 0.63` (stable mid-density passage, drift ratio 1.15). **Best frame of
  the session:** magenta and violet ribbon arms flowing across true black, rust-orange coral
  clusters in the pods, amber at the edges. Genuine multi-hue separation, clean lines, deep black.
  - **What worked:** deferring the fix to a stable passage. Iter 11 failed twice on the same
    problem because every measurement landed on different music; here one attempt succeeded and
    was verifiable. Waiting was the highest-value decision, not a delay.
  - **What was missed:** nothing this tick. Both problems were correctly attributed before edit.
  - **Design hypothesis:** hue needs at least two INDEPENDENT drivers. One axis (gradient) can
    have its distribution collapse under some inputs; a second axis on an unrelated quantity
    (escape-time band) keeps colour separated when the first degenerates.

- **Iter 13** — `bass 0.37->0.54 / treble 0.65->0.38 / mids 0.35->0.59 / entropy 0.85->0.72`
  (input drifting hard, ratio 1.72 then 1.96 — a genuine transition, not a stable passage).
  Final frame: flowing magenta ribbon arms with orange accents and rust pods on black; some
  stipple remains in the dense interior but strands read as strands.
  - **What worked:** bracketing a constant between two MEASURED failures instead of guessing.
    Both the band cap (1.05 too tight / 1.45 too loose -> 1.20) and the coverage penalty were
    resolved this way.
  - **What was missed:** I introduced this tick's main problem myself at iter 12 by raising the
    cap 1.05 -> 1.45 in one jump. A 38% move on a constant I had just discovered was
    load-bearing was too large; 1.20 was available and would have avoided the regression.
  - **Design hypothesis:** when a metric is perfect and the picture is worse, TRUST THE PICTURE.
    Brightness metrics measure how much light leaves the screen, not whether it forms an image.
    Every constraint needs at least one structural counter-metric (here: seam rate) that fails
    when the constraint is satisfied by destroying the content.

- **Iter 14** — `mids 0.67 (session high) / bass 0.45 / treble 0.40 / entropy 0.80 /
  spread 0.67 / centroid 0.47` (stable MID-DOMINANT passage, drift 1.04). Amber/orange ribbon
  arms sweeping around a dark green fractal interior, magenta at the frame edges, deep black.
  Arms read as continuous ribbons; the green interior is real fractal texture, not noise.
  - **What worked:** separating two failures that arrived together. Filigree fixed the seams,
    the band cap fixed the brightness; assuming one cause would have over-corrected one and
    left the other. Instrumenting the individual GATES (not just the frame) is what separated them.
  - **What was missed:** nothing this tick — and notably the iter-13 Todo correctly predicted
    the fix would be a continuity/structure change rather than more dimming.
  - **Design hypothesis:** a multi-scale line shader needs each finer scale gated on the
    HEADROOM LEFT by the coarser scale, not only on its own resolvability. Detail levels that
    each look reasonable alone will stack into mush.

- **Iter 15** — `entropy 0.93 (session high) / roughness 0.79 / spread 0.81 / centroid 0.81 /
  treble 0.66` (extreme bright chaos). No keeper frame this tick — the good outcome was
  identifying that this failure mode differs from the previous two.
  - **What worked:** probing whether the obvious lever (band cap) was even engaged BEFORE pulling
    it. It wasn't. Three ticks of history pointed at that cap and it would have been wrong.
  - **What was missed:** I then spent two attempts widening exposure authority, which produced
    the session's worst seam rate and a visibly flooded frame. The core/halo measurement had
    already told me the problem was per-line brightness; I should have gone straight to INK_GAIN
    instead of trying the exposure lever twice.
  - **Design hypothesis:** identical symptoms (frame over the ceiling) can have distinct causes —
    too many lines, or lines too bright. Split the luma budget by pixel population (core vs halo)
    to tell them apart, because the fixes are different and applying the wrong one makes it worse.

## Todo
- [ ] Watch for moiré in dense regions when `spectralSpreadNormalized` runs high — band count may
      still need a ceiling.
- [x] Verify FILIGREE actually fires (iter 5) — it did NOT. Measured 0.04 max ink, 1/20 frames:
      dead code for 4 ticks. Re-keyed to roughness x entropy; now 0.285 max ink, 11/20 frames.
- [x] Feedback trail decay tested (iter 4) — it DID smear. Root-caused as the dominant brightness
      lever and dropped 0.87 -> 0.62. Predicted ~0.80 in the iter-1 note; the real safe value was
      well below that.

## Dead features on this input (do not build on these)
Measured directly, iter 9. Re-check before relying on any of them:
- `energySlope`, `spectralCentroidSlope`, `bassSlope`, `trebleSlope`: all **0.0000**, R^2 ~0.00.
- `pitchClassNormalized`: **0.00** (iter 3).
- `beat`: not used by user preference; build from continuous z-scores instead.
Live and reliable: `energyZScore`, `bassZScore`, `trebleZScore`, `spectralFluxZScore`,
`spectralCentroidNormalized`, `spectralEntropyNormalized`, `spectralRoughnessNormalized`,
`spectralSpreadNormalized`, `spectralCrestZScore`.

## Instrumentation recipes (reusable)
0. **Core/halo luma split** — bucket pixels into black (<0.012), halo (0.012-0.10) and core
   (>=0.10), and report each bucket's SHARE OF TOTAL LUMA alongside its pixel fraction.
   Distinguishes "too many lines" (halo-heavy, fix density) from "lines too bright"
   (core-heavy, fix INK_GAIN/lightness). Added iter 15 after these two failure modes produced
   identical frame-level symptoms.
Two probes that caught real bugs this session. Run them from the jam page via `evaluate_script`:
1. **Luma probe** — downsample the canvas to 160x90, Rec.709 luma, average over ~8 frames.
   Reports meanLuma / peakLuma / litFraction. Sample over frames, never one: feedback trails
   mean a single frame under-reports.
2. **Gate probe** — recompute an effect's gate in JS from `window.cranes.flattenFeatures()` over
   ~20 frames and report max value + frames-active. This is how the dead filigree was found.
   Use it on any effect you cannot clearly SEE firing, and ALWAYS after ANDing two conditions.
3. **Seam probe** — count horizontally-adjacent pixel pairs with SIMILAR luma but a large RGB
   difference. That combination is the signature of a colour-space seam artifact rather than a
   genuine edge (a real edge changes luma too). Caught the iter-10 hue blocking. Healthy < ~0.04.
4. **Hue-histogram probe** — bin the hue of lit pixels into 12 buckets and count occupied bins.
   Distinguishes "monochrome frame" from "varied palette", which no luma metric can see.
5. **True-black probe** — count pixels with luma < 0.012. This is the "outlines on black"
   check that mean luma alone misses: a frame can sit perfectly in the brightness band and
   still look like mottled mud. Healthy for this shader is >= ~0.6.

## Design hypotheses for v(next)
- Dark-venue shaders should emit light only at *edges*. Treat brightness as a budget spent on line
  count, never on fill area.
- `max(col, prev*decay)` feedback keeps trails from accumulating — safe alternative to `mix()` for
  venues where blowout is unacceptable.
